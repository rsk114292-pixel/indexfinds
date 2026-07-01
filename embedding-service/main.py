"""
多模态特征提取服务 (Embedding Service)

功能：
- 图片向量：从图片中提取 512 维特征向量（CLIP 模型）
- 文本向量：从文本中提取 384 维特征向量（MiniLM 模型）
- 健康检查端点
- 自动重试和恢复机制

技术栈：
- FastAPI: Web 框架
- sentence-transformers: CLIP/MiniLM 模型封装
- PIL: 图片处理
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from PIL import Image
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import io
import os
import logging
import time
import asyncio
import socket
import ipaddress
from urllib.parse import urlparse
from typing import Optional
import requests

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 速率限制配置（可通过环境变量调整）
RATE_LIMIT_SINGLE = os.environ.get("RATE_LIMIT_SINGLE", "30/minute")
RATE_LIMIT_BATCH = os.environ.get("RATE_LIMIT_BATCH", "10/minute")

limiter = Limiter(key_func=get_remote_address)

# 创建 FastAPI 应用
app = FastAPI(
    title="Embedding Service",
    description="Multi-modal embedding service for visual and semantic search",
    version="2.0.0"
)
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": f"Rate limit exceeded: {exc.detail}"},
    )


# 配置 CORS（仅允许已知后端服务调用）
ALLOWED_ORIGINS = os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:4101,http://localhost:3101").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局模型实例
image_model: Optional[SentenceTransformer] = None
text_model: Optional[SentenceTransformer] = None

# 将阻塞型下载/解码/推理移出事件循环，避免 /health 被长任务饿死
TEXT_ENCODE_CONCURRENCY = max(1, int(os.environ.get("TEXT_ENCODE_CONCURRENCY", "2")))
IMAGE_ENCODE_CONCURRENCY = max(1, int(os.environ.get("IMAGE_ENCODE_CONCURRENCY", "1")))
text_encode_semaphore = asyncio.Semaphore(TEXT_ENCODE_CONCURRENCY)
image_encode_semaphore = asyncio.Semaphore(IMAGE_ENCODE_CONCURRENCY)
ALLOWED_IMAGE_HOSTS = [
    host.strip().lower()
    for host in os.environ.get("SSRF_ALLOWED_IMAGE_HOSTS", "si.geilicdn.com").split(",")
    if host.strip()
]


# 请求体模型
class TextEmbeddingRequest(BaseModel):
    text: str


class BatchTextEmbeddingRequest(BaseModel):
    texts: list[str]


# 模型配置
MODEL_CONFIG = {
    'image': {
        'name': 'clip-ViT-B-32',
        'dimensions': 512,
        'env_path': 'IMAGE_MODEL_PATH',
    },
    'text': {
        'name': 'all-MiniLM-L6-v2',
        'dimensions': 384,
        'env_path': 'TEXT_MODEL_PATH',
    },
}


def validate_url_for_ssrf(url: str) -> None:
    """
    SSRF 防护: 校验 URL 安全性

    1. 仅允许 http/https 协议
    2. DNS 解析后检查 IP 是否为私有/保留地址
    3. 阻止对内网资源的访问

    Args:
        url: 待校验的 URL

    Raises:
        HTTPException: URL 不安全时抛出 400
    """
    try:
        parsed = urlparse(url)
    except Exception:
        raise HTTPException(400, f"Invalid URL format: {url}")

    if parsed.scheme not in ("http", "https"):
        raise HTTPException(400, f"Blocked URL: only http/https allowed, got {parsed.scheme}")

    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(400, f"Blocked URL: no hostname in URL")

    normalized_hostname = hostname.lower()
    if any(
        normalized_hostname == allowed_host
        or normalized_hostname.endswith(f".{allowed_host}")
        for allowed_host in ALLOWED_IMAGE_HOSTS
    ):
        return

    try:
        addr_info = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
    except socket.gaierror as e:
        raise HTTPException(400, f"DNS resolution failed for {hostname}: {e}")

    for family, _, _, _, sockaddr in addr_info:
        ip_str = sockaddr[0]
        try:
            ip = ipaddress.ip_address(ip_str)
            if ip.is_private or ip.is_reserved or ip.is_loopback or ip.is_link_local:
                logger.warning(f"SSRF blocked: {hostname} resolved to {ip_str}, URL: {url}")
                raise HTTPException(400, f"Blocked URL: resolves to private/reserved IP")
        except ValueError:
            raise HTTPException(400, f"Blocked URL: invalid resolved IP {ip_str}")


def get_model_path(model_type: str) -> str:
    """
    获取模型路径，支持本地路径或远程下载

    优先级：
    1. 环境变量指定的本地路径
    2. 默认模型名称（从 HuggingFace 下载）
    """
    config = MODEL_CONFIG.get(model_type)
    if not config:
        raise ValueError(f"Unknown model type: {model_type}")

    # 检查环境变量是否指定了本地路径
    local_path = os.environ.get(config['env_path'])
    if local_path and os.path.exists(local_path):
        logger.info(f"Using local model path for {model_type}: {local_path}")
        return local_path

    # 使用默认模型名称
    return config['name']


def load_model_with_retry(model_name: str, max_retries: int = 3) -> Optional[SentenceTransformer]:
    """带重试的模型加载"""
    for attempt in range(max_retries):
        try:
            logger.info(f"Loading {model_name} (attempt {attempt + 1}/{max_retries})...")
            start_time = time.time()
            model = SentenceTransformer(model_name)
            elapsed = time.time() - start_time
            logger.info(f"{model_name} loaded in {elapsed:.2f}s")
            return model
        except Exception as e:
            logger.warning(f"Attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                wait_time = 5 * (attempt + 1)  # 递增等待时间
                logger.info(f"Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
    logger.error(f"Failed to load {model_name} after {max_retries} attempts")
    return None


def decode_image_bytes(image_bytes: bytes) -> Image.Image:
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


def download_image_bytes(url: str) -> bytes:
    response = requests.get(
        url,
        timeout=15,
        allow_redirects=False,
        headers={"User-Agent": "Mozilla/5.0 (compatible; ImageBot/1.0)"},
    )
    response.raise_for_status()
    return response.content


async def encode_text_async(text: str):
    async with text_encode_semaphore:
        return await asyncio.to_thread(text_model.encode, text)


async def encode_texts_async(texts: list[str]):
    async with text_encode_semaphore:
        return await asyncio.to_thread(text_model.encode, texts)


async def decode_image_async(image_bytes: bytes) -> Image.Image:
    return await asyncio.to_thread(decode_image_bytes, image_bytes)


async def encode_image_async(image: Image.Image):
    async with image_encode_semaphore:
        return await asyncio.to_thread(image_model.encode, image)


async def download_image_async(url: str) -> bytes:
    return await asyncio.to_thread(download_image_bytes, url)


@app.on_event("startup")
async def load_models():
    """启动时加载模型"""
    global image_model, text_model

    logger.info("=" * 50)
    logger.info("Starting model loading...")
    logger.info(f"HF_ENDPOINT: {os.environ.get('HF_ENDPOINT', 'default')}")
    logger.info("=" * 50)

    # 加载图片向量模型 (CLIP)
    image_model_path = get_model_path('image')
    image_model = load_model_with_retry(image_model_path, max_retries=2)

    # 加载文本向量模型 (MiniLM)
    text_model_path = get_model_path('text')
    text_model = load_model_with_retry(text_model_path, max_retries=3)

    # 输出加载结果
    logger.info("=" * 50)
    logger.info(f"Model loading complete:")
    logger.info(f"  - Image model (CLIP): {'OK' if image_model else 'FAILED'}")
    logger.info(f"  - Text model (MiniLM): {'OK' if text_model else 'FAILED'}")
    logger.info("=" * 50)


@app.post("/reload-text-model")
async def reload_text_model():
    """手动重新加载文本模型（用于下载失败后重试）"""
    global text_model
    text_model = load_model_with_retry('all-MiniLM-L6-v2', max_retries=5)
    if text_model:
        return {"success": True, "message": "Text model loaded successfully"}
    else:
        return {"success": False, "message": "Failed to load text model"}


@app.get("/health")
async def health_check():
    """
    健康检查端点

    Returns:
        服务状态和模型信息
    """
    return {
        "status": "ok" if (image_model and text_model) else "partial",
        "models": {
            "image": {
                "name": "clip-ViT-B-32",
                "dimensions": 512,
                "loaded": image_model is not None,
            },
            "text": {
                "name": "all-MiniLM-L6-v2",
                "dimensions": 384,
                "loaded": text_model is not None,
            },
        },
    }


# ==================== 文本向量端点 ====================

@app.post("/embed/text")
@limiter.limit(RATE_LIMIT_SINGLE)
async def get_text_embedding(request: Request, body: TextEmbeddingRequest):
    """
    从文本中提取特征向量（用于语义搜索）

    Args:
        text: 要处理的文本

    Returns:
        embedding: 384 维特征向量
        dimensions: 向量维度
        processing_time_ms: 处理时间（毫秒）
    """
    if text_model is None:
        raise HTTPException(503, "Text model is still loading, please retry later")

    if not body.text or not body.text.strip():
        raise HTTPException(400, "Text cannot be empty")

    start_time = time.time()

    try:
        # 提取特征向量
        embedding = await encode_text_async(body.text)

        processing_time = (time.time() - start_time) * 1000

        logger.info(f"Processed text in {processing_time:.1f}ms: {body.text[:50]}...")

        return {
            "embedding": embedding.tolist(),
            "dimensions": len(embedding),
            "processing_time_ms": round(processing_time, 1),
        }

    except Exception as e:
        logger.error(f"Error processing text: {e}")
        raise HTTPException(500, f"Failed to process text: {str(e)}")


@app.post("/embed/text/batch")
@limiter.limit(RATE_LIMIT_BATCH)
async def get_text_embeddings_batch(request: Request, body: BatchTextEmbeddingRequest):
    """
    批量从文本提取特征向量

    Args:
        texts: 文本列表（最多 50 个）

    Returns:
        embeddings: 向量列表
        dimensions: 向量维度
        processing_time_ms: 处理时间（毫秒）
    """
    if text_model is None:
        raise HTTPException(503, "Text model is still loading, please retry later")

    if len(body.texts) > 50:
        raise HTTPException(400, "Maximum 50 texts allowed per batch")

    start_time = time.time()

    try:
        # 批量提取特征向量
        embeddings = await encode_texts_async(body.texts)

        processing_time = (time.time() - start_time) * 1000

        logger.info(f"Batch processed {len(body.texts)} texts in {processing_time:.1f}ms")

        return {
            "embeddings": [e.tolist() for e in embeddings],
            "dimensions": len(embeddings[0]) if len(embeddings) > 0 else 384,
            "count": len(body.texts),
            "processing_time_ms": round(processing_time, 1),
        }

    except Exception as e:
        logger.error(f"Error processing text batch: {e}")
        raise HTTPException(500, f"Failed to process texts: {str(e)}")


# ==================== 图片向量端点 ====================

@app.post("/embedding")
@limiter.limit(RATE_LIMIT_SINGLE)
async def get_embedding_from_file(request: Request, file: UploadFile = File(...)):
    """
    从上传的图片文件中提取特征向量

    Args:
        file: 上传的图片文件 (支持 JPEG, PNG, WebP, GIF)

    Returns:
        embedding: 512 维特征向量
        dimensions: 向量维度
        processing_time_ms: 处理时间（毫秒）
    """
    if image_model is None:
        raise HTTPException(503, "Image model is still loading, please retry later")

    # 验证文件类型
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, f"Invalid file type: {file.content_type}. Expected image/*")

    start_time = time.time()

    try:
        # 读取并处理图片
        contents = await file.read()
        image = await decode_image_async(contents)

        # 提取特征向量
        embedding = await encode_image_async(image)

        processing_time = (time.time() - start_time) * 1000

        logger.info(f"Processed uploaded image in {processing_time:.1f}ms")

        return {
            "embedding": embedding.tolist(),
            "dimensions": len(embedding),
            "processing_time_ms": round(processing_time, 1),
        }

    except Exception as e:
        logger.error(f"Error processing uploaded image: {e}")
        raise HTTPException(500, f"Failed to process image: {str(e)}")


@app.post("/embedding/url")
@limiter.limit(RATE_LIMIT_SINGLE)
async def get_embedding_from_url(request: Request, url: str = Query(..., description="Image URL to process")):
    """
    从图片 URL 提取特征向量（用于批量处理商品图片）

    Args:
        url: 图片 URL

    Returns:
        embedding: 512 维特征向量
        dimensions: 向量维度
        processing_time_ms: 处理时间（毫秒）
    """
    if image_model is None:
        raise HTTPException(503, "Image model is still loading, please retry later")

    # SSRF 防护: 校验 URL 协议 + DNS 解析后验证 IP
    validate_url_for_ssrf(url)

    start_time = time.time()

    try:
        # 下载图片（禁用重定向防止绕过）
        image_bytes = await download_image_async(url)

        # 处理图片
        image = await decode_image_async(image_bytes)

        # 提取特征向量
        embedding = await encode_image_async(image)

        processing_time = (time.time() - start_time) * 1000

        logger.info(f"Processed image from URL in {processing_time:.1f}ms: {url[:50]}...")

        return {
            "embedding": embedding.tolist(),
            "dimensions": len(embedding),
            "processing_time_ms": round(processing_time, 1),
        }

    except requests.exceptions.Timeout:
        raise HTTPException(408, f"Timeout fetching image from URL: {url}")
    except requests.exceptions.RequestException as e:
        raise HTTPException(400, f"Failed to fetch image from URL: {str(e)}")
    except Exception as e:
        logger.error(f"Error processing image from URL: {e}")
        raise HTTPException(500, f"Failed to process image: {str(e)}")


@app.post("/embedding/batch")
@limiter.limit(RATE_LIMIT_BATCH)
async def get_embeddings_batch(request: Request, urls: list[str]):
    """
    批量从图片 URL 提取特征向量

    Args:
        urls: 图片 URL 列表（最多 10 个）

    Returns:
        results: 包含每个 URL 的处理结果
    """
    if image_model is None:
        raise HTTPException(503, "Image model is still loading, please retry later")

    if len(urls) > 10:
        raise HTTPException(400, "Maximum 10 URLs allowed per batch")

    results = []

    for url in urls:
        try:
            # SSRF 防护: 校验每个 URL
            validate_url_for_ssrf(url)

            image_bytes = await asyncio.to_thread(
                download_image_bytes,
                url,
            )
            image = await decode_image_async(image_bytes)
            embedding = await encode_image_async(image)

            results.append({
                "url": url,
                "success": True,
                "embedding": embedding.tolist(),
            })

        except Exception as e:
            results.append({
                "url": url,
                "success": False,
                "error": str(e),
            })

    success_count = sum(1 for r in results if r["success"])
    logger.info(f"Batch processed {success_count}/{len(urls)} images")

    return {
        "total": len(urls),
        "success_count": success_count,
        "results": results,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
