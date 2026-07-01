import {
  buildMergePreviewReport,
  createBulkMergeConfig,
  createDataSource,
  previewUsage,
  printPreviewSummary,
  writeJsonReport,
} from './lib/bulk-brand-merge';

async function main() {
  const { config, options } = createBulkMergeConfig(process.argv.slice(2));

  if (options.help) {
    console.log(previewUsage('npm run brands:merge:preview --'));
    return;
  }

  const dataSource = createDataSource();

  try {
    await dataSource.initialize();
    const report = await buildMergePreviewReport(dataSource, config);

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printPreviewSummary(report, options.limit);
    }

    if (options.outputPath) {
      writeJsonReport(options.outputPath, report);
    }
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

main().catch((error) => {
  console.error('品牌批量合并预览失败:', error);
  process.exit(1);
});
