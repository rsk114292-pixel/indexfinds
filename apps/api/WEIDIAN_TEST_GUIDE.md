# 微店爬虫测试指南

本文档介绍如何测试微店爬虫功能。

## 目录

- [单元测试](#单元测试)
- [集成测试](#集成测试)
- [API 接口测试](#api-接口测试)
- [测试商品 ID](#测试商品-id)

## 单元测试

### 运行单元测试

```bash
cd apps/api
npm test -- weidian.service.spec
```

### 测试覆盖内容

单元测试覆盖以下功能：

1. **提取 itemId**
   - 从标准微店 URL 提取
   - 从带参数的 URL 提取
   - 从简化格式提取
   - 大小写兼容性

2. **商品信息抓取**
   - 成功抓取并缓存
   - 使用缓存数据
   - 强制刷新缓存
   - 错误处理（网络错误、API 错误）

3. **缓存功能**
   - 缓存有效期验证
   - 过期缓存处理

## 集成测试

集成测试脚本允许您使用真实的微店商品 ID 测试爬虫功能。

### 前置条件

1. 启动后端服务：
```bash
cd apps/api
npm run start:dev
```

2. 确保服务运行在 `http://localhost:3101`

### 使用方法

#### 方法 1: 交互式模式（推荐）

```bash
npx ts-node apps/api/test-weidian-scraper.ts
```

这将启动交互式菜单，您可以：
- 选择预设的测试商品 ID
- 输入自定义的商品 ID
- 输入完整的微店 URL
- 测试所有预设商品

#### 方法 2: 命令行模式

使用商品 ID：
```bash
npx ts-node apps/api/test-weidian-scraper.ts 7569577612
```

使用完整 URL：
```bash
npx ts-node apps/api/test-weidian-scraper.ts "https://weidian.com/item.html?itemID=7569577612"
```

### 测试输出示例

```
📋 测试 1: 提取 itemId
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
URL: https://weidian.com/item.html?itemID=7569577612
✅ 提取成功!
Item ID: 7569577612

📦 测试 2: 抓取商品信息
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Item ID: 7569577612
强制刷新: 否
✅ 抓取成功! (耗时: 1523ms)

📊 商品信息:
──────────────────────────────────────────────────
标题: [商品标题]
店铺: [店铺名称] (ID: [店铺ID])
价格: ¥99.00 - ¥199.00
商品图片: 5 张
详情图片: 10 张

属性列表:
  - 颜色: 黑色, 白色, 红色
  - 尺码: S, M, L, XL

SKU 列表: (共 12 个)
  1. 颜色=黑色, 尺码=S
     价格: ¥99, 库存: 100
  2. 颜色=黑色, 尺码=M
     价格: ¥99, 库存: 150
  ...
```

## API 接口测试

### 1. 提取 itemId 接口

**端点**: `GET /weidian/extract-id`

**参数**:
- `url` (必需): 微店商品 URL

**示例**:
```bash
curl "http://localhost:3101/weidian/extract-id?url=https://weidian.com/item.html?itemID=7569577612"
```

**响应**:
```json
{
  "success": true,
  "itemId": "7569577612"
}
```

### 2. 抓取商品信息接口

**端点**: `GET /weidian/scrape`

**参数**:
- `itemId` (可选): 商品 ID
- `url` (可选): 商品 URL（与 itemId 二选一）
- `wdtoken` (可选): 微店 token
- `forceRefresh` (可选): 是否强制刷新缓存，默认 false

**示例**:

使用 itemId:
```bash
curl "http://localhost:3101/weidian/scrape?itemId=7569577612"
```

使用 URL:
```bash
curl "http://localhost:3101/weidian/scrape?url=https://weidian.com/item.html?itemID=7569577612"
```

强制刷新:
```bash
curl "http://localhost:3101/weidian/scrape?itemId=7569577612&forceRefresh=true"
```

**响应**:
```json
{
  "success": true,
  "data": {
    "itemId": "7569577612",
    "title": "商品标题",
    "mainImage": "https://...",
    "images": ["https://...", "https://..."],
    "detailImages": ["https://...", "https://..."],
    "attributes": [
      {
        "name": "颜色",
        "values": [
          {"id": 1, "value": "黑色", "image": "https://..."}
        ]
      }
    ],
    "skus": [
      {
        "weidianSkuId": "sku123",
        "attrIds": [1, 3],
        "attributes": {"颜色": "黑色", "尺码": "M"},
        "skuKey": "尺码=M;颜色=黑色",
        "price": 99.00,
        "stock": 100,
        "image": "https://..."
      }
    ],
    "priceMin": 99.00,
    "priceMax": 199.00,
    "shopId": "shop123",
    "shopName": "店铺名称",
    "rawSkuInfo": {...},
    "rawDetailDesc": {...}
  }
}
```

## 测试商品 ID

以下是可用于测试的商品 ID（来自参考文档）：

1. `7569577612`
2. `7613410521`
3. `7561117168`
4. `7590995411`
5. `7571681173`

这些商品 ID 在参考文档中有对应的示例数据。

## 测试检查清单

在完成开发后，请确保以下测试通过：

- [ ] 单元测试全部通过
- [ ] 能够从各种格式的 URL 中提取 itemId
- [ ] 能够成功抓取商品基本信息（标题、图片、价格）
- [ ] 能够解析商品属性（颜色、尺码等）
- [ ] 能够解析所有 SKU 信息
- [ ] 缓存功能正常工作
- [ ] 缓存过期后能自动刷新
- [ ] 强制刷新功能正常
- [ ] API 错误能够优雅处理
- [ ] 网络错误能够优雅处理

## 常见问题

### Q: 测试时提示无法连接到后端服务？
**A**: 确保后端服务正在运行：`cd apps/api && npm run start:dev`

### Q: 某些商品 ID 抓取失败？
**A**: 可能的原因：
1. 商品已下架
2. 需要登录才能访问（需要提供 wdtoken）
3. 网络问题
4. API 限流

### Q: 如何获取 wdtoken？
**A**:
1. 在浏览器中登录微店
2. 打开开发者工具 (F12)
3. 访问任意商品页面
4. 在网络请求中查找 `wdtoken` 参数

### Q: 缓存数据存储在哪里？
**A**: 缓存数据存储在数据库的 `weidian_cache` 表中，默认有效期为 48 小时。

## 性能基准

- 首次抓取（无缓存）：约 1-2 秒
- 缓存读取：约 50-100 毫秒
- 并发抓取 SKU + 详情：约 1-1.5 秒

## 后续改进

- [ ] 添加批量抓取功能
- [ ] 支持商品变化监控
- [ ] 增加更多错误重试机制
- [ ] 支持代理配置
- [ ] 添加 wdtoken 自动管理
