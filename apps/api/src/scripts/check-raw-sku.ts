import { DataSource } from 'typeorm';

async function checkRawSku() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'lolobuyspreadsheets_dev',
  });

  await dataSource.initialize();
  console.log('Database connected');

  // 查询一个商品的 sourceData.rawSkuInfo
  const items = await dataSource.query(`
    SELECT
      id,
      "weidianItemId",
      ("sourceData"->'rawSkuInfo'->'result'->>'itemTitle') as item_title,
      ("sourceData"->'rawSkuInfo'->'result'->>'itemMainPic') as item_main_pic,
      jsonb_array_length(COALESCE("sourceData"->'rawSkuInfo'->'result'->'attrList', '[]'::jsonb)) as attr_list_length,
      jsonb_array_length(COALESCE("sourceData"->'rawSkuInfo'->'result'->'skuInfos', '[]'::jsonb)) as sku_infos_length,
      ("sourceData"->'rawSkuInfo'->'result'->'attrList'->0) as first_attr,
      ("sourceData"->'rawSkuInfo'->'result'->'skuInfos'->0) as first_sku
    FROM batch_job_items
    WHERE "weidianItemId" = '7545462565'
    LIMIT 1
  `);

  console.log('\n=== Raw SKU Info ===');
  const item = items[0];
  if (item) {
    console.log(`Item ID: ${item.id}`);
    console.log(`Weidian Item ID: ${item.weidianItemId}`);
    console.log(`Item Title: ${item.item_title}`);
    console.log(`Item Main Pic: ${item.item_main_pic}`);
    console.log(`AttrList Length: ${item.attr_list_length}`);
    console.log(`SkuInfos Length: ${item.sku_infos_length}`);
    console.log(`\nFirst Attr:`, JSON.stringify(item.first_attr, null, 2));
    console.log(`\nFirst SKU:`, JSON.stringify(item.first_sku, null, 2));
  } else {
    console.log('No item found');
  }

  await dataSource.destroy();
}

checkRawSku().catch(console.error);
