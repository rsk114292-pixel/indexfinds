# lolobuyspreadsheets.com 新本地产品域导入执行报告

> 执行日期：2026-06-30  
> 范围：新项目本地数据库与新项目本地 uploads  
> 旧生产数据库：未连接  
> 旧项目 migration/seed/reset/cleanup/delete：未运行

## 1. 输入文件

- Dump：`/Volumes/1T/lolobuyspreadsheets.com/migration-artifacts/product-domain-import/dumps/lolobuy-product-domain-data.sql`
- 导出报告：`/Volumes/1T/lolobuyspreadsheets.com/Docs/03-Planning/lolobuyspreadsheets-product-domain-export-report.md`
- Uploads 包：`/Volumes/1T/lolobuyspreadsheets.com/migration-artifacts/uploads-referenced/referenced-uploads.tar`

导出报告记录：

- size：`5.2G`
- lines：`6,170,787`
- COPY sections：`17`
- SHA-256：`0a101e647abab0f860d6ba5b90e6e43fc499e30fff684b159933c4c962b89c51`

## 2. Baseline 状态

`migration:show` 结果只显示新站 baseline 已应用：

```text
[X] 3 LoloBuyInitialSchemaBaseline1790000000000
```

未发现旧历史 migration 被 TypeORM migration glob 选中。

导入前核心表为空：

| 表 | 导入前行数 |
| --- | ---: |
| `products` | 0 |
| `skus` | 0 |
| `product_image_embeddings` | 0 |
| `product_text_embeddings` | 0 |
| `settings` | 0 |

## 3. 数据导入结果

使用新项目本地 Postgres 容器内 `psql` 导入：

```bash
docker exec -i lolobuyspreadsheets_postgres \
  psql -U postgres -d lolobuyspreadsheets_dev -v ON_ERROR_STOP=1 \
  < migration-artifacts/product-domain-import/dumps/lolobuy-product-domain-data.sql
```

普通导入成功，没有触发 `brands` / `category` 循环 FK 顺序失败分支。

COPY 完成计数：

| 表 | 行数 |
| --- | ---: |
| `attributes` | 5 |
| `colors` | 19 |
| `attribute_values` | 45 |
| `brands` | 3,259 |
| `brand_aliases` | 22 |
| `brand_relations` | 10 |
| `category` | 203 |
| `category_closure` | 551 |
| `platforms` | 11 |
| `products` | 331,776 |
| `product_attribute_values` | 3,341,521 |
| `product_brand_facts` | 155,992 |
| `product_image_embeddings` | 331,776 |
| `product_qc_media` | 297 |
| `product_secondary_categories` | 653 |
| `product_text_embeddings` | 331,776 |
| `skus` | 1,672,709 |

## 4. Uploads 导入与 URL 重写

uploads 包清单数量：

- tar 内文件：881
- 旧报告引用路径：885
- 旧报告缺失品牌 Logo：4

已解压到：

```text
/Volumes/1T/lolobuyspreadsheets.com/apps/api/uploads
```

URL 重写脚本：

```bash
docker exec -i lolobuyspreadsheets_postgres \
  psql -U postgres -d lolobuyspreadsheets_dev \
  -v ON_ERROR_STOP=1 \
  -v new_upload_base='http://localhost:4101/uploads/' \
  < migration-artifacts/product-domain-import/sql/10-rewrite-upload-urls.sql
```

重写只覆盖旧 `api.findsindex.com/uploads/` URL。普通外部商品图片 URL 未重写。

实际更新：

| 字段 | 更新行数 |
| --- | ---: |
| `products.mainImage` | 0 |
| `products.images` | 1 |
| `products.detailImages` | 0 |
| `skus.image` | 0 |
| `product_qc_media.url` | 297 |
| `product_qc_media.poster_url` | 0 |
| `brands.logoUrl` | 574 |
| `platforms.logoUrl` | 11 |

旧 uploads URL 残留：0。

## 5. 导入后校验结果

`20-post-import-validation.sql` 通过：

- 20 个表计数全部匹配。
- `settings` 行数保持 0。
- `brand_candidates` / `brand_candidate_items` 行数保持 0。
- 用户、收藏、浏览、referral、session、traffic、search/click、points、jobs 等排除表未出现。
- SKU、二级分类、属性值、QC media、brand facts、image/text embeddings orphan 检查均为 0。
- `product_brand_facts.candidateId` 非空数量为 0。
- old uploads URL 残留为 0。

Embedding 校验：

| 表 | 字段 | 类型 | 行数 | 非空 embedding | 空 embedding |
| --- | --- | --- | ---: | ---: | ---: |
| `product_image_embeddings` | `embedding` | `vector(512)` | 331,776 | 331,775 | 1 |
| `product_text_embeddings` | `embedding` | `vector(384)` | 331,776 | 331,776 | 0 |
| `products` | `embedding` | `vector(512)` | - | - | - |

image embedding 的 1 条空值与旧生产只读 inventory 中记录的 `http_404` 失败一致。

## 6. API 启动验证

新项目 API 使用导入后的本地 DB 启动成功：

```text
Nest application successfully started
API服务器运行在 http://localhost:4101
```

健康检查：

```json
{"status":"ok","database":"ok"}
```

启动时观察到的非阻断问题：

- `BM25RankingService.refreshStats` 在全量 331,776 商品上触发 statement timeout。
- embedding service 未启动时，视觉搜索服务提示 image embedding service 不可用；但 `product_image_embeddings` 表已就绪。

## 7. 当前状态

已完成：

- 新本地产品域 dump 导入。
- referenced uploads 解压。
- 旧 uploads URL 重写。
- 导入后 SQL 校验。
- migration 状态复查。
- API 使用导入库启动与 `/health` 校验。

未完成但应在部署前处理：

- 4 个缺失品牌 Logo：恢复、替换或清空。
- Meilisearch 全量重建与搜索结果 smoke test。
- embedding service 启动后做视觉搜索 smoke test。
- 选择性重建安全 `settings` key，不做旧 settings bulk copy。
- 处理或延后 BM25 全量统计刷新超时，避免启动后后台错误影响搜索体验。
