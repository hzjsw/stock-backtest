/**
 * 示例：多因子选股策略
 *
 * 策略逻辑：
 * - 每月初对股票池进行因子打分
 * - 选取综合得分最高的 N 只股票等权买入
 * - 每月调仓一次
 */
import {
  BacktestEngine,
  Strategy,
  StrategyContext,
  createBarsFromArray,
  MomentumFactor,
  VolatilityFactor,
  MADeviationFactor,
  VolumeRatioFactor,
  MultiFactorScorer,
  printSummary,
  generateReport,
  Bar,
} from '../src';

// ===== 生成多只股票的模拟数据 =====
function generateMultiStockData(symbols: string[]): Map<string, Bar[]> {
  const data = new Map<string, Bar[]>();

  for (const symbol of symbols) {
    const bars: Bar[] = [];
    // 每只股票有不同的初始价格和波动特征
    let price = 5 + Math.random() * 45; // 5-50之间的初始价格
    const volatility = 0.02 + Math.random() * 0.03; // 不同的波动率
    const drift = (Math.random() - 0.4) * 0.001; // 不同的趋势
    const startDate = new Date('2022-01-04');

    for (let i = 0; i < 500; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const noise = (Math.random() - 0.5) * volatility * 2;
      const cycleTrend = Math.sin(i / (40 + Math.random() * 40)) * 0.002;
      price *= (1 + drift + noise + cycleTrend);
      price = Math.max(price, 0.5);

      const high = price * (1 + Math.random() * 0.02);
      const low = price * (1 - Math.random() * 0.02);
      const open = low + Math.random() * (high - low);
      const volume = Math.floor(500000 + Math.random() * 10000000);

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

    data.set(symbol, createBarsFromArray(bars));
  }

  return data;
}

// ===== 定义策略 =====
const factorStrategy: Strategy = {
  name: '多因子选股策略 (动量+波动率+均线偏离)',

  onBar(ctx: StrategyContext) {
    const currentDate = ctx.currentDate;

    // 每月第一个交易日调仓
    const day = currentDate.substring(8, 10);
    if (day > '03') return; // 简单判断月初(前3天)

    // 检查是否本月已调仓 (防止重复调仓)
    const currentMonth = currentDate.substring(0, 7);
    const lastTradeMonth = (factorStrategy as any)._lastRebalanceMonth;
    if (lastTradeMonth === currentMonth) return;
    (factorStrategy as any)._lastRebalanceMonth = currentMonth;

    // 收集所有股票的历史数据
    const symbols = ['600000', '600036', '601318', '000001', '000002',
                     '000858', '002415', '300059', '600519', '601166'];
    const stockBars = new Map<string, Bar[]>();

    for (const symbol of symbols) {
      const bars = ctx.getBars(symbol);
      if (bars.length >= 30) {
        stockBars.set(symbol, bars);
      }
    }

    if (stockBars.size < 3) return;

    // 多因子打分
    const scorer = new MultiFactorScorer();
    scorer
      .addFactor(MomentumFactor(20), 0.3, false)   // 动量因子，值越大越好
      .addFactor(VolatilityFactor(20), 0.2, true)   // 波动率因子，值越小越好
      .addFactor(MADeviationFactor(20), 0.25, false) // 均线偏离因子
      .addFactor(VolumeRatioFactor(5, 20), 0.25, false); // 放量因子

    // 选出得分最高的3只股票
    const topStocks = scorer.selectTop(stockBars, 3);

    // 先清仓不在目标池中的股票
    for (const [symbol] of ctx.positions) {
      if (!topStocks.includes(symbol)) {
        ctx.liquidate(symbol);
      }
    }

    // 等权买入目标股票
    if (topStocks.length > 0) {
      const targetPercent = 0.9 / topStocks.length; // 每只股票的目标仓位
      for (const symbol of topStocks) {
        ctx.targetPercent(symbol, targetPercent);
      }
    }
  },
};

// ===== 运行回测 =====
const symbols = ['600000', '600036', '601318', '000001', '000002',
                 '000858', '002415', '300059', '600519', '601166'];

console.log('正在生成模拟数据...');
console.log(`股票池: ${symbols.join(', ')}`);

const data = generateMultiStockData(symbols);
for (const [symbol, bars] of data) {
  console.log(`  ${symbol}: ${bars.length} 条K线, 价格区间 ${Math.min(...bars.map(b => b.low)).toFixed(2)} ~ ${Math.max(...bars.map(b => b.high)).toFixed(2)}`);
}

const engine = new BacktestEngine({
  initialCapital: 1000000,
  commissionRate: 0.0003,
  stampDutyRate: 0.001,
  slippage: 0.002,
});

console.log('\n正在运行回测...');
const result = engine.run(factorStrategy, data);

// 打印绩效摘要
printSummary(result);

// 生成可视化报告
const reportPath = generateReport(result, 'backtest_report_factor.html');
console.log(`\n打开浏览器查看报告: ${reportPath}`);
