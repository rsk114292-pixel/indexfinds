import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { WeidianService } from '../weidian/weidian.service';

async function testScrape() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'debug', 'error', 'warn'],
  });

  const weidianService = app.get(WeidianService);

  console.log('\n=== Testing Weidian Scrape ===\n');

  const itemId = '7545462565';
  console.log(`Scraping item: ${itemId}`);

  const result = await weidianService.scrapeItem({
    itemId,
    forceRefresh: true,
  });

  console.log('\n=== Result ===');
  console.log(`Title: ${result.title}`);
  console.log(`Main Image: ${result.mainImage}`);
  console.log(`Images count: ${result.images?.length || 0}`);
  console.log(`Images:`, JSON.stringify(result.images?.slice(0, 3), null, 2));

  await app.close();
}

testScrape().catch(console.error);
