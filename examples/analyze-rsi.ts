/**
 * RSI 策略分析脚本 - 分析为什么没有交易信号
 */
import { loadFromCsv } from '../src';
import { RSI, getIndicatorValue } from '../src';
import * as path from 'path';

function analyzeRSI(symbol: string, filePath: string) {
  console.log(`\n分析 ${symbol} 的 RSI 信号...`);

  const bars = loadFromCsv(filePath);
  console.log(`数据范围：${bars[0].date} ~ ${bars[bars.length-1].date}`);
  console.log(`总数据量：${bars.length} 条`);

  // 计算 RSI
  const rsi21 = RSI(bars, 21);

  // 分析 2024-10 之后的数据
  const cutoffDate = '2024-10-01';
  const barsAfter = bars.filter(b => b.date >= cutoffDate);
  const rsiAfter = rsi21.slice(bars.length - barsAfter.length);

  console.log(`\n2024-10 之后的数据：${barsAfter.length} 条`);

  // 统计 RSI 分布
  let countBelow25 = 0;
  let countAbove70 = 0;
  let countBetween = 0;
  let minRSI = 100;
  let maxRSI = 0;

  for (const rsi of rsiAfter) {
    if (rsi === undefined || isNaN(rsi)) continue;

    if (rsi < 25) countBelow25++;
    else if (rsi > 70) countAbove70++;
    else countBetween++;

    minRSI = Math.min(minRSI, rsi);
    maxRSI = Math.max(maxRSI, rsi);
  }

  console.log('\nRSI 分布统计:');
  console.log(`  RSI < 25 (买入信号): ${countBelow25} 天 (${(countBelow25/barsAfter.length*100).toFixed(1)}%)`);
  console.log(`  RSI > 70 (卖出信号): ${countAbove70} 天 (${(countAbove70/barsAfter.length*100).toFixed(1)}%)`);
  console.log(`  RSI 25-70 (无信号):  ${countBetween} 天 (${(countBetween/barsAfter.length*100).toFixed(1)}%)`);
  console.log(`  RSI 最小值：${minRSI.toFixed(2)}`);
  console.log(`  RSI 最大值：${maxRSI.toFixed(2)}`);

  // 找出 RSI 极值日期
  let firstBuySignal = '';
  let firstSellSignal = '';

  for (let i = 0; i < barsAfter.length; i++) {
    const rsi = rsiAfter[i];
    if (rsi === undefined) continue;

    if (rsi < 25 && !firstBuySignal) {
      firstBuySignal = barsAfter[i].date;
    }
    if (rsi > 70 && !firstSellSignal) {
      firstSellSignal = barsAfter[i].date;
    }
  }

  console.log('\n最后信号:');
  console.log(`  最后买入信号日期：${firstBuySignal || '无'}`);
  console.log(`  最后卖出信号日期：${firstSellSignal || '无'}`);

  // 分析股价走势
  const startPrice = barsAfter[0]?.close;
  const endPrice = barsAfter[barsAfter.length-1]?.close;
  const priceChange = ((endPrice - startPrice) / startPrice * 100).toFixed(2);

  console.log('\n股价走势:');
  console.log(`  2024-10 开盘：${startPrice}`);
  console.log(`  最新收盘：${endPrice}`);
  console.log(`  涨跌幅：${priceChange}%`);
}

// 分析 600718
const dataPath = path.join(process.cwd(), 'data', '600718.csv');
analyzeRSI('600718', dataPath);

// 也分析 600000 做对比
const dataPath2 = path.join(process.cwd(), 'data', '600000.csv');
analyzeRSI('600000', dataPath2);
