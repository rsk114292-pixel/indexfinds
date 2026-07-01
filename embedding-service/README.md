# 图片特征提取服务 (Embedding Service)

基于 CLIP 模型的图片特征提取服务，用于以图搜图功能。

## 功能

- 从上传的图片提取 512 维特征向量
- 从图片 URL 提取特征向量
- 批量处理图片 URL

## 快速开始

### 方式一：Docker Compose（推荐）

```bash
# 在项目根目录
docker-compose up -d embedding-service

# 查看日志
docker-compose logs -f embedding-service
```

### 方式二：本地开发

```bash
cd embedding-service

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

## API 端点

### 健康检查

```bash
curl http://localhost:8001/health
```

响应：
```json
{
  "status": "ok",
  "model": "clip-ViT-B-32",
  "dimensions": 512
}
```

### 从上传图片提取特征

```bash
curl -X POST http://localhost:8001/embedding \
  -F "file=@image.jpg"
```

响应：
```json
{
  "embedding": [0.123, -0.456, ...],  // 512 维向量
  "dimensions": 512,
  "processing_time_ms": 45.2
}
```

### 从 URL 提取特征

```bash
curl -X POST "http://localhost:8001/embedding/url?url=https://example.com/image.jpg"
```

### 批量处理

```bash
curl -X POST http://localhost:8001/embedding/batch \
  -H "Content-Type: application/json" \
  -d '["https://example.com/1.jpg", "https://example.com/2.jpg"]'
```

## 配置

| 环境变量 | 默认值 | 说明 |
|---------|-------|------|
| PORT | 8001 | 服务端口 |

## 性能

- 模型加载时间：约 5-10 秒（首次启动）
- 单张图片处理：约 30-50ms (CPU) / 5-10ms (GPU)
- 内存占用：约 500MB-1GB

## 注意事项

1. 首次构建 Docker 镜像需要下载 CLIP 模型（约 500MB）
2. 建议至少分配 2GB 内存给容器
3. GPU 加速需要额外配置 nvidia-docker
