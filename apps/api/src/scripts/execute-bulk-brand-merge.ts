import {
  assertDangerousBrandMaintenanceAllowed,
  buildMergePreviewReport,
  clearBrandCache,
  createBulkMergeConfig,
  createDataSource,
  executeUsage,
  mergeBrandIntoTarget,
  printPreviewSummary,
  writeJsonReport,
} from './lib/bulk-brand-merge';

async function main() {
  const { config, options } = createBulkMergeConfig(process.argv.slice(2));

  if (options.help) {
    console.log(executeUsage('npm run brands:merge:execute --'));
    return;
  }

  const dataSource = createDataSource();

  try {
    await dataSource.initialize();
    const report = await buildMergePreviewReport(dataSource, config);

    printPreviewSummary(report, options.limit);

    if (!options.apply) {
      console.log(
        '\n当前为 dry-run。要真正执行批量合并，请追加参数 --apply。',
      );
      return;
    }

    assertDangerousBrandMaintenanceAllowed('品牌批量合并');

    if (report.candidates.length === 0) {
      console.log('\n没有候选品牌，未执行任何写入。');
      return;
    }

    const runAt = new Date().toISOString();
    const results: Array<{
      sourceBrandName: string;
      movedProductCount: number;
      movedChildBrandCount: number;
    }> = [];
    const failures: Array<{ sourceBrandName: string; error: string }> = [];
    const candidates = options.limit
      ? report.candidates.slice(0, options.limit)
      : report.candidates;

    console.log(`\n开始执行合并，共 ${candidates.length} 个品牌。`);

    for (const candidate of candidates) {
      try {
        const result = await mergeBrandIntoTarget(
          dataSource,
          candidate.id,
          report.targetBrand.id,
        );

        results.push({
          sourceBrandName: result.sourceBrandName,
          movedProductCount: result.movedProductCount,
          movedChildBrandCount: result.movedChildBrandCount,
        });

        console.log(
          `已合并 ${result.sourceBrandName} -> ${result.targetBrandName}，迁移商品 ${result.movedProductCount} 个，迁移子品牌 ${result.movedChildBrandCount} 个。`,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        failures.push({
          sourceBrandName: candidate.name,
          error: message,
        });
        console.error(`合并失败 ${candidate.name}: ${message}`);

        if (!options.continueOnError) {
          break;
        }
      }
    }

    let clearedKeys = 0;
    if (options.clearCache && results.length > 0) {
      try {
        clearedKeys = await clearBrandCache();
        console.log(`\n已清理品牌缓存键 ${clearedKeys} 个。`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.warn(`\n品牌缓存清理失败: ${message}`);
      }
    }

    const runReport = {
      runAt,
      targetBrand: report.targetBrand,
      config,
      attemptedCount: candidates.length,
      succeededCount: results.length,
      failedCount: failures.length,
      clearedBrandCacheKeys: clearedKeys,
      results,
      failures,
    };

    console.log('\n执行结果汇总:');
    console.table(
      results.map((item) => ({
        name: item.sourceBrandName,
        movedProducts: item.movedProductCount,
        movedChildren: item.movedChildBrandCount,
      })),
    );

    if (failures.length > 0) {
      console.log('\n失败列表:');
      console.table(failures);
    }

    if (options.outputPath) {
      writeJsonReport(options.outputPath, runReport);
    }

    if (failures.length > 0 && !options.continueOnError) {
      process.exitCode = 1;
    }
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

main().catch((error) => {
  console.error('品牌批量合并执行失败:', error);
  process.exit(1);
});
