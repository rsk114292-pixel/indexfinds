"""
模型预下载脚本

在 Docker 镜像构建时预先下载模型，避免运行时首次启动等待。
模型会被缓存到 /root/.cache/huggingface 目录。
"""

import os
import sys
import time
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 模型列表
MODELS = [
    {
        'name': 'clip-ViT-B-32',
        'description': 'CLIP image embedding model (512 dimensions)',
    },
    {
        'name': 'all-MiniLM-L6-v2',
        'description': 'MiniLM text embedding model (384 dimensions)',
    },
]


def download_model(model_name: str, description: str, max_retries: int = 3) -> bool:
    """
    下载并缓存模型

    Args:
        model_name: 模型名称
        description: 模型描述
        max_retries: 最大重试次数

    Returns:
        是否下载成功
    """
    from sentence_transformers import SentenceTransformer

    for attempt in range(max_retries):
        try:
            logger.info(f"Downloading {model_name} ({description}) - attempt {attempt + 1}/{max_retries}")
            start_time = time.time()

            # 加载模型（会自动下载并缓存）
            model = SentenceTransformer(model_name)

            elapsed = time.time() - start_time
            logger.info(f"Successfully downloaded {model_name} in {elapsed:.2f}s")

            # 验证模型可用
            if model_name == 'all-MiniLM-L6-v2':
                # 测试文本编码
                test_embedding = model.encode("test text")
                logger.info(f"  - Text embedding dimensions: {len(test_embedding)}")
            elif model_name == 'clip-ViT-B-32':
                # 测试文本编码（CLIP 也支持文本）
                test_embedding = model.encode("test image description")
                logger.info(f"  - Image embedding dimensions: {len(test_embedding)}")

            return True

        except Exception as e:
            logger.warning(f"Attempt {attempt + 1} failed for {model_name}: {e}")
            if attempt < max_retries - 1:
                wait_time = 5 * (attempt + 1)
                logger.info(f"Waiting {wait_time}s before retry...")
                time.sleep(wait_time)

    logger.error(f"Failed to download {model_name} after {max_retries} attempts")
    return False


def main():
    """主函数"""
    logger.info("=" * 50)
    logger.info("Starting model preload...")
    logger.info(f"HF_ENDPOINT: {os.environ.get('HF_ENDPOINT', 'default')}")
    logger.info("=" * 50)

    success_count = 0
    total_count = len(MODELS)

    for model_info in MODELS:
        if download_model(model_info['name'], model_info['description']):
            success_count += 1

    logger.info("=" * 50)
    logger.info(f"Preload complete: {success_count}/{total_count} models downloaded")
    logger.info("=" * 50)

    if success_count < total_count:
        logger.warning("Some models failed to download. Service may have limited functionality.")
        sys.exit(1)

    logger.info("All models downloaded successfully!")
    sys.exit(0)


if __name__ == "__main__":
    main()
