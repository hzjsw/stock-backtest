/**
 * 测试在线股票数据获取 - 测试网易财经 API
 */
import { fetchStockData, fetchMultipleStocks } from './src/data/web-loader';

async function testSingleStock() {
  console.log('\n=== 测试单只股票数据获取 ===\n');
  
  // 测试网易数据源
  try {
    console.log('1. 测试网易财经数据源 (600000 - 浦发银行)');
    const neteaseData = await fetchStockData('600000', 'netease', {
      startDate: '20230101',
      endDate: '20231231'
    });
    console.log(`   ✓ 成功获取 ${neteaseData.length} 条数据`);
    if (neteaseData.length > 0) {
      console.log(`   首条数据：${neteaseData[0].date} O:${neteaseData[0].open} H:${neteaseData[0].high} L:${neteaseData[0].low} C:${neteaseData[0].close}`);
      console.log(`   末条数据：${neteaseData[neteaseData.length - 1].date} O:${neteaseData[neteaseData.length - 1].open} H:${neteaseData[neteaseData.length - 1].high} L:${neteaseData[neteaseData.length - 1].low} C:${neteaseData[neteaseData.length - 1].close}\n`);
    }
  } catch (err) {
    console.error(`   ✗ 网易财经数据获取失败：${err instanceof Error ? err.message : '未知错误'}\n`);
  }

  // 测试新浪数据源
  try {
    console.log('2. 测试新浪财经数据源 (600000 - 浦发银行)');
    const sinaData = await fetchStockData('600000', 'sina');
    console.log(`   ✓ 成功获取 ${sinaData.length} 条数据`);
    console.log(`   数据：${sinaData[0].date} O:${sinaData[0].open} H:${sinaData[0].high} L:${sinaData[0].low} C:${sinaData[0].close}\n`);
  } catch (err) {
    console.error(`   ✗ 新浪财经数据获取失败：${err instanceof Error ? err.message : '未知错误'}\n`);
  }
}

async function testMultipleStocks() {
  console.log('\n=== 测试批量股票数据获取 ===\n');
  
  try {
    const symbols = ['600000', '600036', '000001'];
    console.log(`获取股票：${symbols.join(', ')} (使用网易财经)`);
    
    const result = await fetchMultipleStocks(symbols, 'netease', {
      startDate: '20230101',
      endDate: '20231231',
      concurrency: 3
    });
    
    console.log(`\n✓ 成功获取 ${result.size} 只股票数据:\n`);
    for (const [symbol, bars] of result.entries()) {
      console.log(`  ${symbol}: ${bars.length} 条数据`);
      console.log(`    首条：${bars[0].date} C:${bars[0].close}`);
      console.log(`    末条：${bars[bars.length - 1].date} C:${bars[bars.length - 1].close}\n`);
    }
  } catch (err) {
    console.error(`✗ 批量获取失败：${err instanceof Error ? err.message : '未知错误'}\n`);
  }
}

async function main() {
  console.log('\n🚀 开始测试在线股票数据获取功能...\n');
  
  await testSingleStock();
  await testMultipleStocks();
  
  console.log('\n✅ 测试完成!\n');
}

main().catch(console.error);
