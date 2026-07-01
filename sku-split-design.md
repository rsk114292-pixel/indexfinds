# SKU 智能拆分上架功能 - 技术设计文档

> 📅 创建时间：2026-03-14
> 📌 状态：方案讨论中

---

## 一、背景与问题

### 1.1 现状

MixFittio 的微店产品大量使用**聚合链接**——一个微店链接内包含最多 40 个不同款式/配色的 SKU。这种做法可以节省微店链接配额（每店限 3000 个商品），但在本站造成了严重问题：

| 问题 | 影响 |
|------|------|
| **搜索不精准** | 用户搜"黑白 Uptempo"找不到，因为系统只存了一个 `colorMain` |
| **AI 搭配不准** | 推荐搭配基于单一颜色属性，40 个配色只用了 1 个 |
| **向量搜索失效** | embedding 只基于主图，其余 39 个 SKU 的视觉特征丢失 |
| **SEO 浪费** | 40 个潜在搜索入口只有 1 个页面 |

### 1.2 当前上架流程

```
1 个微店聚合链接 → 1 个 Product 记录
  ├── title: 只有一个标题
  ├── imageUrl: 只有主图
  ├── colorMain: 只存一个颜色
  └── embedding: 只基于主图生成
```

### 1.3 目标

将 1 个微店聚合链接按**颜色/配色维度**拆分为 N 个独立 Product 记录，每个 Product 拥有：
- 独立的标题（含具体配色名）
- 独立的颜色属性（精准的 `colorMain`）
- 独立的产品图片（SKU 专属图）
- 独立的 embedding 向量（独立的视觉搜索入口）
- **全部指向同一个微店购买链接**

### 1.4 约束

- **不修改现有批量上架功能**，作为独立的新功能模块
- 拆分后的产品在微店端仍然是同一个商品，不影响微店的 3000 商品配额

---

## 二、方案概览

```
微店聚合链接 (1 个 weidianId, 40 个 SKU)
         │
         ▼
┌──────────────────────────────┐
│  步骤一：预览分析              │
│  - 解析微店 SKU 数据           │
│  - 检测颜色维度               │
│  - 按颜色去重分组             │
│  - 展示拆分预览给用户         │
└──────────────────────────────┘
         │ 用户确认
         ▼
┌──────────────────────────────────┐
│  步骤二：AI 共享属性生成          │
│  - 用第一个 SKU 图调用 1 次完整 AI │
│  - 得到品牌/系列/分类等共享属性    │
│  ⚠️ 不使用微店商品主图            │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│  步骤三：逐变体处理               │
│  - 每个变体用自己的 SKU 图做 AI   │
│  - 有 SKU 图 → 完整 AI 调用       │
│  - 无 SKU 图 → 颜色名映射         │
│  - 产品主图 = SKU 图              │
│  - 创建独立 Product 记录          │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  40 个独立 Product 记录                    │
│                                          │
│  Product 1: 白深红 Uptempo                │
│  ├── imageUrl: SKU 专属图片               │
│  ├── colorMain: "Red"                    │
│  ├── parentGroupId: "xxx" (同组关联)      │
│  └── sourceUrl: 同一微店链接              │
│                                          │
│  Product 2: 熊猫 Uptempo                  │
│  ├── imageUrl: 熊猫配色图片               │
│  ├── colorMain: "Black"                  │
│  ├── parentGroupId: "xxx" (同组关联)      │
│  └── sourceUrl: 同一微店链接              │
│                                          │
│  ... (共 40 个)                           │
└──────────────────────────────────────────┘
```

---

## 三、数据库设计

### 3.1 Product 实体新增字段

| 字段 | 类型 | 索引 | 说明 |
|------|------|------|------|
| `parentGroupId` | `varchar`, nullable | ✅ | 同源产品组 ID（UUID），拆分出的产品共享此值 |
| `skuVariantKey` | `varchar`, nullable | — | SKU 变体标识，如 `颜色=白深红` |
| `splitSourceWeidianId` | `varchar`, nullable | ✅ | 拆分来源的原始微店 ID |

**设计要点**：

1. **`parentGroupId`** — 自生成的 UUID（非外键），组内产品平等，没有"父产品"概念
2. **`weidianId`** — 拆分后所有子产品保持原始值不变（都指向同一个微店商品）
3. **`sourceUrl`** — 同样相同（都跳转同一个购买页面）
4. **去重键** — 用 `splitSourceWeidianId + skuVariantKey` 组合做精确去重，避免重复拆分

### 3.2 新增 SkuSplitJob 实体

拆分任务记录，独立于现有 BatchJob。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uuid PK | — |
| `status` | enum | `pending` / `analyzing` / `processing` / `completed` / `partial_failed` / `failed` |
| `shopId` | varchar, nullable | 目标店铺 |
| `createdBy` | varchar, nullable | 创建者 |
| `weidianId` | varchar | 原始微店 ID |
| `weidianTitle` | varchar, nullable | 微店原始标题（仅管理员参考，⚠️ 不用于产品命名） |
| `splitDimension` | varchar | 拆分维度名，如 "颜色" |
| `totalSkuCount` | int, default 0 | 拆分出的变体数 |
| `processedCount` | int, default 0 | — |
| `successCount` | int, default 0 | — |
| `failedCount` | int, default 0 | — |
| `duplicateCount` | int, default 0 | — |
| `parentGroupId` | uuid | 本次拆分生成的组 ID |
| `createdAt` | timestamp | — |
| `updatedAt` | timestamp | — |

> `analyzing` 是新增状态，表示正在分析微店数据和生成 AI 共享属性。

### 3.3 新增 SkuSplitItem 实体

每个变体的处理记录。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uuid PK | — |
| `jobId` | uuid FK → SkuSplitJob | — |
| `skuId` | varchar, nullable | 微店原始 SKU ID |
| `skuKey` | varchar | 如 `颜色=白深红` |
| `variantValue` | varchar | 变体值，如 `白深红` |
| `imageUrl` | varchar, nullable | SKU 独立图片 |
| `price` | decimal(10,2), nullable | SKU 独立价格 |
| `status` | enum | `pending` / `processing` / `success` / `failed` / `duplicate_review` |
| `productId` | uuid, nullable | 创建成功后的产品 ID |
| `errorLog` | text, nullable | 用户可见错误 |
| `internalErrorLog` | text, nullable | 内部调试错误 |
| `duplicateReviewId` | uuid, nullable | — |
| `createdAt` | timestamp | — |
| `updatedAt` | timestamp | — |

### 3.4 迁移文件

```
api/database/migrations/033_sku-split-system.sql
```

---

## 四、后端服务架构

### 4.1 新增文件清单

```
api/src/products/
├── services/
│   ├── sku-split-analyzer.service.ts   ← 分析拆分方案
│   ├── sku-split.service.ts            ← 任务 CRUD
│   └── sku-split.processor.ts          ← 异步处理器
├── entities/
│   ├── sku-split-job.entity.ts         ← Job 实体
│   └── sku-split-item.entity.ts        ← Item 实体
├── dto/
│   └── sku-split.dto.ts                ← 请求/响应 DTO
└── sku-split.controller.ts             ← API 控制器
```

### 4.2 SkuSplitAnalyzerService — 拆分分析

**职责**：分析微店 SKU 数据，决定拆分维度和方案。

```typescript
interface SkuSplitPlan {
  splitDimension: string;      // 拆分维度名，如 "颜色"
  weidianId: string;           // 微店 ID
  weidianTitle?: string;       // 微店原始标题（仅管理员参考，⚠️ 不用于产品命名）
  variants: SkuVariant[];      // 每个变体
}

interface SkuVariant {
  skuId: string;               // 代表 SKU 的 ID（该款式下第一个尺码的 skuInfo.id）
  attrId: number;              // 款式维度的 attrId，用于关联 skuInfos
  skuKey: string;              // "Color=White Black DD1391-100"
  variantValue: string;        // "White Black DD1391-100"
  imageUrl: string;            // 款式图（来自 attrValues[].img）
  price: number;               // 该款式的最低价（同款式不同尺码可能价格不同）
  priceRange?: string;         // 如 "160-180"（当同款式存在价差时）
  skuCount: number;            // 该款式下有多少个尺码 SKU
}
```

**核心逻辑**：

1. **款式维度检测（基于 `img` 字段，非 `attrTitle`）**

   微店 API 返回的 `attrList` 结构中，`attrTitle` 不可信（商家可能乱写），但**有 `img` 字段的属性维度一定是款式/配色维度**，因为微店系统只对需要展示款式图的属性附带图片。

   ```
   attrList 对比：

   Size 属性（无 img）：
   { "attrId": 9602960522, "attrValue": "US 4/UK3.5/Euro 36", "isShowHotTag": false }

   Color/款式属性（有 img）：
   { "attrId": 9602911215, "attrValue": "White Black DD1391-100",
     "img": "https://si.geilicdn.com/...", "isShowHotTag": false }
   ```

   **检测规则**：遍历 `attrList`，找到 `attrValues` 中**任意一个元素包含 `img` 字段**的那个属性维度，即为款式维度。

   ```typescript
   private detectStyleDimension(attrList): {
     dimensionName: string;          // attrTitle（仅记录用）
     variants: { attrId, attrValue, img }[];  // 每个款式变体
   } | null {
     for (const attr of attrList) {
       const hasImg = attr.attrValues.some(v => v.img);
       if (hasImg) {
         return {
           dimensionName: attr.attrTitle,
           variants: attr.attrValues.filter(v => v.img),
         };
       }
     }
     return null;  // 没有任何维度有图片 → 不可拆分
   }
   ```

2. **数据来源选择**

   有两个地方可以获取款式图片，它们是**同一张图**：
   - `attrList[].attrValues[].img` — 属性层级（每个款式一张图）
   - `skuInfos[].skuInfo.img` — SKU 层级（同款式多尺码共享同一张图）

   **推荐从 `attrList` 获取**，因为它已经按款式去重了（一个颜色一条记录），而 `skuInfos` 是尺码×颜色的笛卡尔积。

   > ⚠️ 当前 `WeidianThorParserService.normalizeThorResult()` 解析 `attrList` 时**丢弃了 `img` 字段**（第 78-79 行只保存了 `attrValue` 文本）。拆分功能需要**直接访问 Thor API 原始 `attrList`** 或改造规范化层保留 `img`。

3. **按款式分组 + 价格提取**

   每个有 `img` 的 attrValue = 一个独立变体。通过 `attrId` 关联到 `skuInfos` 提取该款式的真实价格：

   ```
   attrValues[0] = { attrId: 9602911215, attrValue: "White Black DD1391-100", img: "..." }
                              ↓ attrId 关联
   skuInfos 中所有包含 attrId=9602911215 的 SKU:
     - Size US4 + White Black → discountPrice: 16000 (¥160)
     - Size US5 + White Black → discountPrice: 16000 (¥160)
     - ... (17个尺码)
   → 取最低价 ¥160，priceRange: 同价则 "160"，有差异则 "160-180"
   ```

   同一款式下可能有多个尺码 SKU 且**价格可能不同**（如某些尺码更贵），所以：
   - `price` = 该款式所有尺码中的**最低价**
   - `priceRange` = 如果有价差则记录范围（如 `"160-180"`）

4. **不可拆分判断** — 返回 `null` 的条件：
   - 没有任何属性维度包含 `img` 字段
   - 有 `img` 的变体只有 1 个
   - 没有 SKU 数据

### 4.3 SkuSplitService — 任务管理

**职责**：创建/查询拆分任务（对标 `BatchService`）。

| 方法 | 说明 |
|------|------|
| `previewSplit(weidianId)` | 预览拆分方案，不创建任务，不消耗 AI |
| `createSplitJob(weidianId, shopId, createdBy, selectedVariants?)` | 创建任务并开始处理 |
| `getJobStatus(id, createdBy?)` | 查询任务详情（含 Items） |
| `listJobs(limit?, createdBy?)` | 列出最近任务 |

`selectedVariants` 参数允许用户在预览后选择性地拆分部分变体。

### 4.4 SkuSplitProcessor — 异步处理器

**职责**：异步处理拆分任务（对标 `BatchProcessor`）。

复用模式：BullMQ 队列 `sku-split-jobs` + `p-limit` 并发控制 + Redis 降级策略。

#### 设计原则

> **⚠️ 关键区别：聚合链接里的款式可能是完全不同的品牌/分类。**
>
> 例如一个微店链接可能同时包含 Nike Dunk、Adidas Yeezy、New Balance 530。
> 因此**没有"共享属性"的概念**——每个款式必须独立调用 AI 做完整分析。
>
> - 不使用微店商品主图（只用 SKU 款式图）
> - 不使用微店标题（商家乱取名，如 `"2024 D**K www.yupooz.com"`）
> - 每个变体 = 1 次完整独立的 AI 调用（品牌、系列、分类、颜色全部独立识别）

#### 核心流程 — processJob

```
1. job.status = ANALYZING
2. 获取微店数据 → WeidianService.getWeidianInfo(weidianId)
   ⚠️ 微店标题仅存入 job.weidianTitle 供管理员参考，不用于产品命名
3. 分析拆分方案 → SkuSplitAnalyzerService.analyzeSplitPlan()
   ├── 检测有 img 的属性维度
   └── 按款式分组，提取每个变体的图片和价格
4. 生成 parentGroupId (UUID v4)
5. 创建 SkuSplitItem 记录（每个变体一条）
6. job.status = PROCESSING
7. 并发处理每个变体 → processVariant()（p-limit 控制并发）
8. finalizeJob → 确定最终状态
```

#### 变体处理 — processVariant

```
1. item.status = PROCESSING
2. ★ 每个变体独立做一次完整 AI 调用：
   ├── 调用 AiListingService.generateProductListing(skuImageUrl, categories)
   ├── AI 基于 SKU 款式图独立识别：品牌、系列、分类、颜色、材质、标签等全部属性
   ├── 再通过 BrandsService.normalizeBrand() 处理品牌
   ├── 再通过 SeriesService.findOrCreate() 处理系列
   └── 得到完整的 AIProductListing（和普通上架单个产品的 AI 调用完全一致）
3. 构造 CreateProductDto：
   ├── title: AI 生成（如 "Nike Air More Uptempo White Red"）
   ├── imageUrl: ★ SKU 款式图（即产品主图）
   ├── images: []（拆分模式不继承微店商品图库）
   ├── weidianId: 原始 weidianId（不变，指向同一购买链接）
   ├── sourceUrl: 同一个微店 URL（不变）
   ├── parentGroupId: job.parentGroupId
   ├── skuVariantKey: 如 "Color=White Black DD1391-100"
   ├── splitSourceWeidianId: 原始 weidianId
   ├── price: 该款式的 SKU 价格
   ├── 品牌/系列/分类/颜色/材质/标签等: 全部来自该变体自己的 AI 分析
   └── ⚠️ 无任何"继承"——每个变体的所有属性都是独立的
4. 去重检测（专用逻辑）：
   ├── splitSourceWeidianId + skuVariantKey 组合精确去重
   └── 不使用现有 DuplicateCheckService（避免 weidianId 相同触发 L1 告警）
5. ProductsService.create(dto, { skipDuplicateCheck: true })
```

### 4.5 AI 调用方式

**不需要新增 AI 方法**。每个变体直接复用现有的完整 AI 流程：

```
每个变体的 AI 流程（和普通单品上架完全一致）：
  AiListingService.generateProductListing(skuImageUrl, categories)
    → 输出完整的 AIProductListing：
      品牌、系列、分类、标题、颜色、材质、版型、图案、
      风格标签、场合标签、SEO、多语言翻译 等全部字段
```

这意味着：
- ~~`generateVariantAttributes()`~~ → **不需要新增**，直接用现有 `generateProductListing()`
- ~~共享属性~~ → **不存在**，每个变体完全独立
- ~~颜色映射 fallback~~ → **不需要**，款式维度必然有图

### 4.6 重复检测策略

**不修改现有 `DuplicateCheckService.check()` 方法**。

SkuSplitProcessor 内部实现专用的去重逻辑：

```typescript
// 精确去重：相同来源 + 相同变体 = 重复
private async checkVariantDuplicate(
  splitSourceWeidianId: string,
  skuVariantKey: string,
  shopId: string,
): Promise<DuplicateCheckResult | null> {
  const existing = await this.productRepository.findOne({
    where: {
      splitSourceWeidianId,
      skuVariantKey,
      deletedAt: IsNull(),
    },
    select: ['id', 'shopId'],
  });
  // ...
}
```

### 4.8 API 端点

```
POST   /products/sku-split/preview    预览拆分方案（不执行）
POST   /products/sku-split            确认并执行拆分
GET    /products/sku-split            列出拆分任务
GET    /products/sku-split/:id        查询任务详情
```

### 4.9 Module 注册

- `products.module.ts` — TypeOrmModule.forFeature 添加 2 个新实体，providers 添加 3 个新服务，controllers 添加新控制器
- `app.module.ts` — entities 数组添加 2 个新实体

---

## 五、AI 调用策略

### 5.1 核心原则

> **每个款式变体 = 1 次完整独立的 AI 调用。没有共享属性、没有轻量调用。**
>
> 原因：聚合链接里的款式可能是**完全不同的品牌和分类**，不能假设它们有共同属性。

### 5.2 调用方式

| 调用方法 | 输入 | 输出 | 次数 |
|----------|------|------|------|
| `AiListingService.generateProductListing(skuImageUrl, categories)` | SKU 款式图 | 完整 AIProductListing | **每变体 1 次** |

- 29 个款式 → **29 次** AI 调用
- 40 个款式 → **40 次** AI 调用
- 和普通上架调用的是**同一个方法**，不需要新增 AI 方法

### 5.3 与普通上架的对比

| | 普通上架 | 拆分上架 |
|---|---------|---------|
| **AI 分析图片** | 微店商品主图 | SKU 款式图 |
| **AI 调用次数** | 1 次/链接 | N 次/链接（N = 款式数） |
| **产品主图** | 微店商品主图 | SKU 款式图 |
| **产品图库** | 微店所有图片 | 不继承 |
| **标题来源** | AI + 微店标题 fallback | 纯 AI（不用微店标题） |
| **品牌/分类** | 按链接共享 | 每款式独立识别 |
| **产品数量** | 1 个/链接 | N 个/链接 |

---

## 六、前端设计

### 6.1 新页面

| 路由 | 说明 |
|------|------|
| `/admin/products/sku-split` | 智能拆分主页面 |
| `/admin/products/sku-split/[id]` | 拆分任务详情页 |

### 6.2 主页面交互流程

```
┌───────────────────────────────────────────────────┐
│  🔀 SKU 智能拆分上架                               │
│                                                   │
│  ┌───────────────────────────────────────────┐    │
│  │ 微店链接或ID:  [________________________] │    │
│  │                                 [🔍 分析]  │    │
│  └───────────────────────────────────────────┘    │
│                                                   │
│  ─── 分析结果 ───────────────────────────────     │
│  原始标题: Nike Air More Uptempo Sneakers         │
│  拆分维度: 颜色 (40 个变体)                        │
│  选择目标店铺: [ 下拉选择 ▼ ]                      │
│                                                   │
│  ┌────────────────────────────────────────────┐   │
│  │ ☑  白深红    [🖼️ img]   ¥299               │   │
│  │ ☑  熊猫      [🖼️ img]   ¥299               │   │
│  │ ☑  迷彩      [🖼️ img]   ¥319               │   │
│  │ ☐  蛇皮纹    [🖼️ img]   ¥329  ← 手动取消   │   │
│  │ ☑  白天蓝    [🖼️ img]   ¥299               │   │
│  │ ...                                        │   │
│  └────────────────────────────────────────────┘   │
│                                                   │
│  已选 39 / 40 个变体                               │
│  [ 全选 ] [ 全不选 ]                               │
│                        [ ▶️ 开始拆分上架 ]          │
│                                                   │
│  ─── 最近拆分任务 ───────────────────────────     │
│  ┌────────────────────────────────────────────┐   │
│  │ Nike Uptempo     39/40 成功    ✅ 已完成    │   │
│  │ Adidas Yeezy     25/25 成功    ✅ 已完成    │   │
│  │ NB 530           处理中...     ⏳ 60%      │   │
│  └────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────┘
```

**交互步骤**：
1. 用户粘贴微店链接或 ID → 点击"分析"
2. 系统调用 `POST /sku-split/preview` → 返回拆分方案
3. 用户查看变体预览（图片、颜色名、价格），可取消勾选不需要的
4. 选择目标店铺 → 点击"开始拆分上架"
5. 跳转到任务详情页，实时显示进度

### 6.3 任务详情页

复用现有 batch 详情页的布局风格：
- 任务元信息卡片（状态、进度、创建时间）
- 统计卡片（总数 / 成功 / 失败 / 重复）
- 进度条
- 变体列表（每行：图片缩略图 + 颜色名 + 状态 + 操作链接）

### 6.4 产品详情页 — 同款配色组件

当产品有 `parentGroupId` 时：
- 查询同组其他产品 `WHERE parentGroupId = ? AND id != ?`
- 展示为可点击的**颜色缩略图切换条**
- 点击切换到同款其他配色的产品详情

### 6.5 API 封装

```typescript
// web/lib/api/products.ts
skuSplit: {
  preview(weidianId: string): Promise<SkuSplitPlan>;
  create(data: {
    weidianId: string;
    shopId: string;
    selectedVariants?: string[];
  }): Promise<SkuSplitJob>;
  getStatus(jobId: string): Promise<SkuSplitJob>;
  list(limit?: number): Promise<SkuSplitJob[]>;
}
```

---

## 七、实施计划

### 阶段 1：数据库 + 实体

| # | 文件 | 操作 |
|---|------|------|
| 1 | `api/database/migrations/033_sku-split-system.sql` | 新建 |
| 2 | `api/src/products/product.entity.ts` | 添加 3 个字段 |
| 3 | `api/src/products/entities/sku-split-job.entity.ts` | 新建 |
| 4 | `api/src/products/entities/sku-split-item.entity.ts` | 新建 |
| 5 | `api/src/products/dto/create-product.dto.ts` | 添加 3 个可选字段 |
| 6 | `api/src/app.module.ts` | entities 数组添加 2 个新实体 |

### 阶段 2：核心后端服务

| # | 文件 | 操作 |
|---|------|------|
| 1 | `api/src/products/services/sku-split-analyzer.service.ts` | 新建 |
| 2 | `api/src/products/services/sku-split.service.ts` | 新建 |
| 3 | `api/src/products/services/sku-split.processor.ts` | 新建 |
| 4 | `api/src/products/products.module.ts` | 注册新 provider 和实体 |

**复用现有服务（无需修改）**：
- `WeidianService.getWeidianInfo()` — 微店数据获取（含缓存）
- `AiListingService.generateProductListing()` — 每个变体独立的完整 AI 调用
- `BrandsService.normalizeBrand()` — 品牌标准化
- `SeriesService.findOrCreate()` — 系列查找/创建
- `ProductsService.create()` — 产品创建

### 阶段 3：控制器 + API

| # | 文件 | 操作 |
|---|------|------|
| 1 | `api/src/products/dto/sku-split.dto.ts` | 新建 |
| 2 | `api/src/products/sku-split.controller.ts` | 新建 |
| 3 | `api/src/products/products.module.ts` | 注册控制器 |

### 阶段 4：前端

| # | 文件 | 操作 |
|---|------|------|
| 1 | `web/app/[locale]/admin/products/sku-split/page.tsx` | 新建 |
| 2 | `web/app/[locale]/admin/products/sku-split/[id]/page.tsx` | 新建 |
| 3 | `web/lib/api/products.ts` | 添加 skuSplit API 方法 |
| 4 | 产品详情页 | 添加同款配色组件 |

---

## 八、边界情况处理

| 场景 | 处理方式 |
|------|----------|
| SKU 无独立图片 | 从 SKU 属性名映射标准颜色，无图片则标记 failed（不使用商品主图） |
| 仅 1 个 SKU | 不拆分，提示用户使用普通批量导入 |
| 无颜色维度 | 返回 null，前端提示"此链接不适合拆分" |
| 部分变体处理失败 | 标记 job 为 `partial_failed`，已成功的不回滚 |
| 重复提交同一链接 | `splitSourceWeidianId + skuVariantKey` 精确去重 |
| SKU 属性解析失败 | 跳过该变体，标记为 failed |

---

## 九、已确认的设计决策

| 决策 | 结论 |
|------|------|
| **图片来源** | ✅ 拆分模式**完全不使用微店商品主图**，所有场景（AI 分析、产品主图、embedding）均使用 SKU 款式图 |
| **标题来源** | ✅ **完全不使用微店标题**（商家为规避风险乱取名，如 `"2024 D**K www.yupooz.com"`，无参考价值）。产品标题 100% 由 AI 基于 SKU 图片 + 识别出的品牌/系列生成 |
| **款式维度检测** | ✅ **通过 `attrValues[].img` 字段判断**，而非 `attrTitle` 关键词匹配。有 `img` 的属性维度 = 款式维度（微店系统级行为，比文本匹配可靠） |
| **AI 调用策略** | ✅ **每个款式独立做 1 次完整 AI 调用**，不共享属性。原因：聚合链接里的款式可能是完全不同的品牌/分类，不能假设有共同属性。直接复用现有 `generateProductListing()`，不需要新增 AI 方法 |
| **旧产品处理** | ✅ 不管旧产品。同一链接之前用普通批量导入创建的产品不做任何处理 |
| **同款配色组件** | ✅ 第一版就做，产品详情页展示同 `parentGroupId` 的其他配色 |
| **批量拆分** | ✅ 第一版只做单链接拆分，不支持一次性提交多个链接 |

## 十、待讨论问题

> 以下问题需要进一步确认后再开始实施：

1. ~~**拆分维度选择**~~ → ✅ 已解决：通过 `attrValues[].img` 字段自动检测，不依赖 `attrTitle`
2. ~~**已有产品的处理**~~ → ✅ 已解决：不管旧产品，不自动停用/标记
3. ~~**前端产品详情页**~~ → ✅ 已解决：同款配色切换组件第一版就做
4. ~~**AI 调用成本控制**~~ → ✅ 已解决：不考虑成本，每款式独立完整调用
5. ~~**批量拆分**~~ → ✅ 已解决：第一版只做单链接拆分
