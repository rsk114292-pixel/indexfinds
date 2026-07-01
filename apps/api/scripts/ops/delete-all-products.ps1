# 删除所有产品的 PowerShell 脚本

Write-Host "🧹 开始删除所有产品..." -ForegroundColor Yellow
Write-Host ""

# 获取所有产品
$response = Invoke-RestMethod -Uri "http://localhost:4100/products?limit=100" -Method Get

$products = $response.data
$totalProducts = $products.Count

Write-Host "📊 找到 $totalProducts 个产品" -ForegroundColor Cyan
Write-Host ""

if ($totalProducts -eq 0) {
    Write-Host "ℹ️  没有产品需要删除" -ForegroundColor Green
    exit 0
}

# 删除每个产品
$successCount = 0
$failCount = 0

foreach ($product in $products) {
    $productId = $product.id
    $productTitle = $product.title

    try {
        Write-Host "🗑️  删除产品: $productTitle (ID: $productId)" -ForegroundColor Gray

        Invoke-RestMethod -Uri "http://localhost:4100/products/$productId" -Method Delete | Out-Null

        $successCount++
        Write-Host "   ✅ 删除成功" -ForegroundColor Green
    }
    catch {
        $failCount++
        Write-Host "   ❌ 删除失败: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ 删除完成！" -ForegroundColor Green
Write-Host "📊 统计:" -ForegroundColor Cyan
Write-Host "   - 成功: $successCount" -ForegroundColor Green
Write-Host "   - 失败: $failCount" -ForegroundColor Red
Write-Host ""

# 验证
$verifyResponse = Invoke-RestMethod -Uri "http://localhost:4100/products?limit=1" -Method Get
$remainingCount = $verifyResponse.data.Count

if ($remainingCount -eq 0) {
    Write-Host "🎉 所有产品已清空，可以重新导入了！" -ForegroundColor Green
} else {
    Write-Host "⚠️  还有 $remainingCount 个产品未删除" -ForegroundColor Yellow
}
