# Python 多模态特征提取服务
# 基于 CLIP 模型提取 512 维图片特征向量
# 基于 MiniLM 模型提取 384 维文本特征向量

FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖 (curl 用于健康检查)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 CPU-only PyTorch，避免 CPU VPS 下载 CUDA 运行时依赖
RUN pip install --no-cache-dir \
    --index-url https://download.pytorch.org/whl/cpu \
    --trusted-host download.pytorch.org \
    torch==2.2.2+cpu

# 安装 Python 依赖（使用清华镜像加速）
RUN pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple \
    --trusted-host pypi.tuna.tsinghua.edu.cn \
    -r requirements.txt

# 设置 HuggingFace 下载端点
ENV HF_ENDPOINT=https://huggingface.co

# 复制预下载脚本
COPY preload_models.py .

# 尝试预下载模型到镜像中（构建时下载，约 500MB）
# 本地网络或镜像源不可用时不阻塞镜像构建；容器启动后仍会重试加载模型。
RUN python preload_models.py || echo "WARNING: model preload failed; continuing build so runtime can retry"

# 复制应用代码
COPY main.py .

# 暴露端口
EXPOSE 8001

# 健康检查（要求两个模型都加载成功，partial 不能标记为 healthy）
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
    CMD python -c "import json,sys,urllib.request; sys.exit(0 if json.load(urllib.request.urlopen('http://localhost:8001/health', timeout=5)).get('status') == 'ok' else 1)"

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
