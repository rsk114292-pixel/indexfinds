import { runScriptMain, withScriptDataSource } from './lib/script-support';

async function debugBatchItems() {
  await withScriptDataSource(async (dataSource) => {
    console.log('Database connected');

    const items = await dataSource.query(`
    SELECT
      id,
      status,
      "sourceUrl",
      "weidianItemId",
      ("sourceData"->>'title') as source_title,
      ("sourceData"->'images') as source_images_json,
      ("sourceData"->>'mainImage') as main_image,
      jsonb_array_length(COALESCE("sourceData"->'images', '[]'::jsonb)) as images_count,
      ("aiGeneratedData"->>'title') as ai_title,
      ("aiGeneratedData"->>'confidence') as ai_confidence,
      ("finalData"->>'title') as final_title,
      "createdAt"
    FROM batch_job_items
    WHERE status IN ('review', 'approved')
    ORDER BY "createdAt" DESC
    LIMIT 5
  `);

  console.log('\n=== Recent Batch Job Items ===');
  items.forEach((item: any, index: number) => {
    console.log(`\n[${index + 1}] Item ID: ${item.id}`);
    console.log(`Status: ${item.status}`);
    console.log(`Source URL: ${item.sourceUrl}`);
    console.log(`Weidian Item ID: ${item.weidianItemId}`);
    console.log(`Source Title: ${item.source_title || 'NULL'}`);
    console.log(`Main Image: ${item.main_image || 'NULL'}`);
    console.log(`Images Count: ${item.images_count || 0}`);
    console.log(`AI Title: ${item.ai_title || 'NULL'}`);
    console.log(`AI Confidence: ${item.ai_confidence || 'NULL'}`);
    console.log(`Final Title: ${item.final_title || 'NULL'}`);

    if (item.source_images_json) {
      const images = item.source_images_json;
      if (Array.isArray(images) && images.length > 0) {
        console.log(`Images array: ${JSON.stringify(images.slice(0, 2))}`);
      } else {
        console.log(
          `Images array is empty or not an array: ${JSON.stringify(images)}`,
        );
      }
    }
  });
  });
}

void runScriptMain('批处理项目调试', debugBatchItems);
