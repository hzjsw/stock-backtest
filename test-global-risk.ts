/**
 * 测试全局风险控制功能
 */
import { BacktestEngine } from './src/core/engine';

// 创建模拟数据：先涨后跌
const data = new Map<string, any[]>();
const bars: any[] = [];
let price = 100;

// 生成 60 天的数据：前 10 天上涨，后 50 天下跌
for (let i = 0; i < 60; i++) {
  const date = new Date('2023-01-01');
  date.setDate(date.getDate() + i);
  if (date.getDay() === 0 || date.getDay() === 6) continue;

  // 前 10 天上涨，之后下跌
  if (i < 10) {
    price *= 1.02; // 上涨 2%
  } else {
    price *= 0.97; // 下跌 3%
  }

  bars.push({
    date: date.toISOString().split('T')[0],
    open: price,
    high: price * 1.02,
    low: price * 0.96,
    close: price,
    volume: 1000000,
  });
}
data.set('000001', bars);

console.log('数据范围:', bars[0].date, '-', bars[bars.length - 1].date);
console.log('价格范围:', bars[0].close.toFixed(2), '-', bars[bars.length - 1].close.toFixed(2));

// 简单策略：第一天买入并持有
const strategy = {
  name: 'Buy and Hold',
  onBar(ctx: any) {
    const symbol = '000001';
    const bar = ctx.getCurrentBar(symbol);
    const pos = ctx.positions.get(symbol);

    if (!pos && bar) {
      const qty = Math.floor(ctx.cash * 0.9 / bar.close);
      if (qty > 0) {
        console.log(`[策略] ${ctx.currentDate} 买入 ${qty} 股 @ ${bar.close.toFixed(2)}`);
        ctx.buy(symbol, qty);
      }
    } else if (pos) {
      console.log(`[策略] ${ctx.currentDate} 持有 ${pos.quantity} 股，当前价 ${bar?.close.toFixed(2)}, 成本 ${pos.avgCost.toFixed(2)}`);
    }
  }
};

console.log('\n===== 测试 1: 无风险控制 =====');
const engine1 = new BacktestEngine({
  initialCapital: 1000000,
});
const result1 = engine1.run(strategy, data);
console.log('总收益率:', (result1.metrics.totalReturn * 100).toFixed(2) + '%');
console.log('最大回撤:', (result1.metrics.maxDrawdown * 100).toFixed(2) + '%');
console.log('交易次数:', result1.trades.length);

console.log('\n===== 测试 2: 全局止损 5% =====');
const engine2 = new BacktestEngine({
  initialCapital: 1000000,
  riskControl: {
    stopLossPercent: 0.05, // 5% 止损
  }
});
const result2 = engine2.run(strategy, data);
console.log('总收益率:', (result2.metrics.totalReturn * 100).toFixed(2) + '%');
console.log('最大回撤:', (result2.metrics.maxDrawdown * 100).toFixed(2) + '%');
console.log('交易次数:', result2.trades.length);
console.log('交易详情:');
result2.trades.forEach(t => {
  console.log(`  ${t.date} ${t.side} ${t.quantity} 股 @ ${t.price.toFixed(2)}`);
});

console.log('\n===== 测试 3: 全局止盈 10% =====');
const engine3 = new BacktestEngine({
  initialCapital: 1000000,
  riskControl: {
    takeProfitPercent: 0.10, // 10% 止盈
  }
});
const result3 = engine3.run(strategy, data);
console.log('总收益率:', (result3.metrics.totalReturn * 100).toFixed(2) + '%');
console.log('最大回撤:', (result3.metrics.maxDrawdown * 100).toFixed(2) + '%');
console.log('交易次数:', result3.trades.length);
console.log('交易详情:');
result3.trades.forEach(t => {
  console.log(`  ${t.date} ${t.side} ${t.quantity} 股 @ ${t.price.toFixed(2)}`);
});

console.log('\n===== 测试 4: 追踪止损 8% =====');
const engine4 = new BacktestEngine({
  initialCapital: 1000000,
  riskControl: {
    trailingStopPercent: 0.08, // 8% 追踪止损
  }
});
const result4 = engine4.run(strategy, data);
console.log('总收益率:', (result4.metrics.totalReturn * 100).toFixed(2) + '%');
console.log('最大回撤:', (result4.metrics.maxDrawdown * 100).toFixed(2) + '%');
console.log('交易次数:', result4.trades.length);
console.log('交易详情:');
result4.trades.forEach(t => {
  console.log(`  ${t.date} ${t.side} ${t.quantity} 股 @ ${t.price.toFixed(2)}`);
});
