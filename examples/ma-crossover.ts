/**
 * 示例：双均线交叉策略
 *
 * 策略逻辑：
 * - 短期均线上穿长期均线时买入
 * - 短期均线下穿长期均线时卖出
 */
import { BacktestEngine, Strategy, StrategyContext, SMA, getIndicatorValue, createBarsFromArray, printSummary, generateReport } from '../src';

// ===== 生成模拟数据 =====
function generateSampleData(): ReturnType<typeof createBarsFromArray> {
  const bars = [];
  let price = 10;
  const startDate = new Date('2022-01-04');

  for (let i = 0; i < 500; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    // 跳过周末
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    // 模拟股价走势：带趋势的随机游走
    const trend = Math.sin(i / 60) * 0.003; // 周期性趋势
    const noise = (Math.random() - 0.48) * 0.04; // 略微正偏的随机波动
    price *= (1 + trend + noise);
    price = Math.max(price, 1); // 确保价格为正

    const high = price * (1 + Math.random() * 0.02);
    const low = price * (1 - Math.random() * 0.02);
    const open = low + Math.random() * (high - low);
    const volume = Math.floor(1000000 + Math.random() * 5000000);

    const dateStr = date.toISOString().split('T')[0];
    bars.push({
      date: dateStr,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +price.toFixed(2),
      volume,
    });
  }

  return createBarsFromArray(bars);
}

// ===== 定义策略 =====
const maCrossoverStrategy: Strategy = {
  name: '双均线交叉策略 (MA5/MA20)',

  onBar(ctx: StrategyContext) {
    const symbol = '000001'; // 模拟股票代码
    const bars = ctx.getBars(symbol);

    if (bars.length < 25) return; // 数据不足

    const sma5 = SMA(bars, 5);
    const sma20 = SMA(bars, 20);

    const currentIdx = bars.length - 1;
    const prevIdx = currentIdx - 1;

    const currentShort = getIndicatorValue(sma5, currentIdx);
    const currentLong = getIndicatorValue(sma20, currentIdx);
    const prevShort = getIndicatorValue(sma5, prevIdx);
    const prevLong = getIndicatorValue(sma20, prevIdx);

    if (currentShort === undefined || currentLong === undefined ||
        prevShort === undefined || prevLong === undefined) return;

    const position = ctx.positions.get(symbol);
    const currentBar = ctx.getCurrentBar(symbol);
    if (!currentBar) return;

    // 金叉买入：短期均线上穿长期均线
    if (prevShort <= prevLong && currentShort > currentLong) {
      if (!position) {
        // 用 80% 的资金买入
        const quantity = Math.floor((ctx.cash * 0.8) / currentBar.close);
        if (quantity > 0) {
          ctx.buy(symbol, quantity);
        }
      }
    }

    // 死叉卖出：短期均线下穿长期均线
    if (prevShort >= prevLong && currentShort < currentLong) {
      if (position && position.quantity > 0) {
        ctx.sell(symbol, position.quantity);
      }
    }
  },
};

// ===== 运行回测 =====
console.log('正在生成模拟数据...');
const sampleBars = generateSampleData();

const data = new Map<string, typeof sampleBars>();
data.set('000001', sampleBars);

console.log(`数据量: ${sampleBars.length} 条K线`);
console.log(`日期范围: ${sampleBars[0].date} ~ ${sampleBars[sampleBars.length - 1].date}`);

const engine = new BacktestEngine({
  initialCapital: 1000000,
  commissionRate: 0.0003,
  stampDutyRate: 0.001,
  slippage: 0.001,
});

console.log('\n正在运行回测...');
const result = engine.run(maCrossoverStrategy, data);

// 打印绩效摘要
printSummary(result);

// 生成可视化报告
const reportPath = generateReport(result, 'backtest_report_ma_crossover.html');
console.log(`\n打开浏览器查看报告: ${reportPath}`);
