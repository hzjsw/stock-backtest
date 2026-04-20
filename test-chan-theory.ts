/**
 * 缠论性能测试脚本
 */
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { analyzeChanTheory, mergeBars, identifyFractals, buildStrokes, filterFractals } from './src/indicators/chan-theory';
import type { Bar } from './src/core/types';

console.log('加载 CSV 数据...');
const content = readFileSync('data/600036.csv', 'utf-8');
const records = parse(content, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
}) as Record<string, string>[];

const bars: Bar[] = records.map(record => ({
  date: record['date'] || '',
  open: parseFloat(record['open']) || 0,
  high: parseFloat(record['high']) || 0,
  low: parseFloat(record['low']) || 0,
  close: parseFloat(record['close']) || 0,
  volume: parseFloat(record['volume']) || 0,
})).sort((a, b) => a.date.localeCompare(b.date));

console.log(`加载了 ${bars.length} 条 K 线数据`);
console.log(`日期范围：${bars[0].date} - ${bars[bars.length - 1].date}`);

console.log('\n[1/6] 开始 K 线包含处理...');
const t1 = Date.now();
const processedBars = mergeBars(bars, 1);
const t2 = Date.now();
console.log(`  完成！处理后：${processedBars.length} 根 K 线，耗时：${t2 - t1}ms`);

console.log('\n[2/6] 开始识别分型...');
const t3 = Date.now();
const fractals = identifyFractals(processedBars);
const t4 = Date.now();
console.log(`  完成！识别到 ${fractals.length} 个分型，耗时：${t4 - t3}ms`);

console.log('\n[3/6] 开始构建笔...');
const t5 = Date.now();
const strokes = buildStrokes(fractals, bars);
const t6 = Date.now();
console.log(`  完成！构建 ${strokes.length} 笔，耗时：${t6 - t5}ms`);

console.log('\n[4/6] 开始完整缠论分析...');
const t7 = Date.now();
try {
  const result = analyzeChanTheory(bars);
  const t8 = Date.now();
  console.log(`  完成！总耗时：${t8 - t7}ms`);
  console.log(`  - 分型：${result.fractals.length}`);
  console.log(`  - 笔：${result.strokes.length}`);
  console.log(`  - 线段：${result.segments.length}`);
  console.log(`  - 中枢：${result.pivots.length}`);
  console.log(`  - 买卖点：${result.buySellPoints.length}`);
} catch (err) {
  const t8 = Date.now();
  console.log(`  失败！耗时：${t8 - t7}ms`);
  console.error(err);
}
