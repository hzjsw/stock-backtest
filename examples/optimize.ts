/**
 * 策略优化脚本 - 找到收益最高的策略
 */
import { loadFromCsv, loadMultipleFromCsv, loadFromDirectory, createBarsFromArray } from '../src';
import { logger } from '../src/lib/logger';
import { compareStrategies, gridSearch, printComparison, type BacktestSummary } from '../src/optimizer';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 生成模拟数据
 */
function generateMockData(symbol: string, days: number = 500): ReturnType<typeof createBarsFromArray> {
  const bars = [];
  let price = 5 + Math.random() * 45;
  const volatility = 0.015 + Math.random() * 0.025;
  const drift = (Math.random() - 0.4) * 0.0008;
  const startDate = new Date('2022-01-04');

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const change = price * (drift + volatility * (Math.random() - 0.5));
    const open = price + change;
    const close = open + price * (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * price * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * price * volatility * 0.5;
    const volume = Math.floor(1000000 + Math.random() * 9000000);

    bars.push({
      date: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    });

    price = close;
  }

  return bars;
}

async function runOptimization() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 股票策略优化系统');
  console.log('='.repeat(60));

  // 加载数据
  let data = new Map<string, ReturnType<typeof createBarsFromArray>>();
  const dataDir = path.join(process.cwd(), 'data');

  if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.csv'));
    if (files.length > 0) {
      console.log(`\n📂 从 data/ 目录加载 ${files.length} 个 CSV 文件...`);
      for (const file of files.slice(0, 10)) { // 最多加载 10 只股票
        const symbol = path.basename(file, '.csv');
        const bars = loadFromCsv(path.join(dataDir, file));
        if (bars.length > 30) {
          data.set(symbol, bars);
          console.log(`   ✓ ${symbol}: ${bars.length} 条数据`);
        }
      }
    }
  }

  if (data.size === 0) {
    console.log('\n⚠️ 未找到 CSV 数据，使用模拟数据...');
    const symbols = ['600000', '600036', '000001', '000002', '601318'];
    for (const sym of symbols) {
      data.set(sym, generateMockData(sym, 500));
    }
    console.log(`   ✓ 生成 ${symbols.length} 只股票的模拟数据`);
  }

  const firstSymbol = Array.from(data.keys())[0];
  console.log(`\n📊 使用股票：${firstSymbol} 进行策略优化`);

  // ========== 第一步：策略对比 ==========
  console.log('\n' + '='.repeat(60));
  console.log('📈 第一步：策略对比 (默认参数)');
  console.log('='.repeat(60));

  const defaultConfigs = [
    { type: 'ma-crossover', params: { shortPeriod: 5, longPeriod: 20 } } as { type: string; params: Record<string, number> },
    { type: 'ma-crossover', params: { shortPeriod: 10, longPeriod: 30 } } as { type: string; params: Record<string, number> },
    { type: 'macd', params: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 } } as { type: string; params: Record<string, number> },
    { type: 'rsi', params: { period: 14, overbought: 70, oversold: 30 } } as { type: string; params: Record<string, number> },
    { type: 'bollinger', params: { period: 20, stdDev: 2 } } as { type: string; params: Record<string, number> },
    { type: 'dual-thrust', params: { k1: 0.5, k2: 0.5, lookback: 1 } } as { type: string; params: Record<string, number> },
    { type: 'parabolic-sar', params: { afStart: 0.02, afIncrement: 0.02, afMax: 0.2 } } as { type: string; params: Record<string, number> },
  ];

  const comparisonResults = await compareStrategies(data, defaultConfigs, 1000000);
  printComparison(comparisonResults);

  // ========== 第二步：对最佳策略进行参数网格搜索 ==========
  console.log('\n' + '='.repeat(60));
  console.log('🔬 第二步：参数优化 (网格搜索)');
  console.log('='.repeat(60));

  // 对 MA 策略进行参数优化
  console.log('\n优化 MA 交叉策略参数...');
  const maGridResults = await gridSearch(
    data,
    'ma-crossover',
    {
      shortPeriod: [3, 5, 10, 15, 20],
      longPeriod: [15, 20, 30, 50, 60],
    },
    1000000
  );
  console.log('\nMA 策略最优参数:');
  printComparison(maGridResults.slice(0, 10));

  // 对 RSI 策略进行参数优化
  console.log('\n优化 RSI 策略参数...');
  const rsiGridResults = await gridSearch(
    data,
    'rsi',
    {
      period: [7, 10, 14, 21],
      oversold: [20, 25, 30],
      overbought: [70, 75, 80],
    },
    1000000
  );
  console.log('\nRSI 策略最优参数:');
  printComparison(rsiGridResults.slice(0, 10));

  // 对 Dual Thrust 策略进行参数优化
  console.log('\n优化 Dual Thrust 策略参数...');
  const dualGridResults = await gridSearch(
    data,
    'dual-thrust',
    {
      k1: [0.3, 0.5, 0.7, 1.0],
      k2: [0.3, 0.5, 0.7, 1.0],
      lookback: [1, 2, 3],
    },
    1000000
  );
  console.log('\nDual Thrust 策略最优参数:');
  printComparison(dualGridResults.slice(0, 10));

  // ========== 第三步：汇总所有结果 ==========
  console.log('\n' + '='.repeat(60));
  console.log('🏆 最终汇总 - 所有策略最优参数对比');
  console.log('='.repeat(60));

  const allBestResults = [
    ...maGridResults.slice(0, 3).map((r: BacktestSummary) => ({ ...r, strategyName: `MA ${JSON.stringify(r.params)}` })),
    ...rsiGridResults.slice(0, 3).map((r: BacktestSummary) => ({ ...r, strategyName: `RSI ${JSON.stringify(r.params)}` })),
    ...dualGridResults.slice(0, 3).map((r: BacktestSummary) => ({ ...r, strategyName: `Dual ${JSON.stringify(r.params)}` })),
  ];

  allBestResults.sort((a, b) => b.totalReturn - a.totalReturn);
  allBestResults.forEach((r, i) => r.rank = i + 1);

  printComparison(allBestResults);

  // ========== 输出最佳策略 ==========
  const bestOverall = allBestResults[0];
  console.log('\n' + '🎯 '.repeat(20));
  console.log(`\n✨ 最佳策略配置 ✨`);
  console.log('='.repeat(60));
  console.log(`策略类型：${bestOverall.strategyName.split(' ')[0]}`);
  console.log(`最优参数：${JSON.stringify(bestOverall.params, null, 2)}`);
  console.log(`预期总收益率：${(bestOverall.totalReturn * 100).toFixed(2)}%`);
  console.log(`预期年化收益：${(bestOverall.annualizedReturn * 100).toFixed(2)}%`);
  console.log(`夏普比率：${bestOverall.sharpeRatio.toFixed(2)}`);
  console.log(`最大回撤：${(bestOverall.maxDrawdown * 100).toFixed(2)}%`);
  console.log('='.repeat(60));
  console.log('\n💡 提示：可以使用此参数在 Web 界面中进行验证\n');
}

// 运行优化
runOptimization().catch(err => {
  logger.error('优化失败', err);
  process.exit(1);
});
