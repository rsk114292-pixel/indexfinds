import { runScriptMain, withScriptDataSource } from './lib/script-support';

async function checkDatabase() {
  await withScriptDataSource(
    async (dataSource) => {
    console.log('✅ Database connected\n');

    const categories = await dataSource.query('SELECT COUNT(*) FROM category');
    console.log(`📂 Categories: ${categories[0].count}`);

    const brands = await dataSource.query('SELECT COUNT(*) FROM brands');
    console.log(`🏷️  Brands: ${brands[0].count}`);

    const products = await dataSource.query(
      "SELECT COUNT(*) FROM products WHERE status = 'active'",
    );
    console.log(`📦 Active Products: ${products[0].count}`);

    const reviewItems = await dataSource.query(
      "SELECT COUNT(*) FROM batch_job_items WHERE status = 'review'",
    );
    console.log(`⚠️  Items Pending Review: ${reviewItems[0].count}`);

    console.log('\n✅ Database is ready for batch import!');
    },
    {
      entities: ['src/**/*.entity.ts'],
    },
  );
}

void runScriptMain('数据库就绪检查', checkDatabase);
