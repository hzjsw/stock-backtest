import { BacktestEngine } from './src/core/engine';

// 测试全局止损功能
const data = new Map();
const bars = [];
let price = 100;
for (let i = 0; i < 30; i++) {
  const date = new Date('2023-01-01');
  date.setDate(date.getDate() + i);
  if (date.getDay() === 0 || date.getDay() === 6) continue;
  price *= 0.97; // 每天跌 3%
  bars.push({
    date: date.toISOString().split('T')[0],
    open: price,
    high: price * 1.01,
    low: price * 0.96,
    close: price,
    volume: 1000000,
  });
}
data.set('000001', bars);

console.log('数据范围:', bars[0].date, '-', bars[bars.length - 1].date);
console.log('第一天数据:', bars[0]);
console.log('第二天数据:', bars[1]);

const strategy = {
  name: 'Test',
  onBar(ctx: any) {
    const bar = ctx.getCurrentBar('000001');
    const pos = ctx.positions.get('000001');
    console.log(`[策略] ${ctx.currentDate} 持仓：${pos ? pos.quantity : 0}, 价格：${bar?.close.toFixed(2)}`);
    if (!pos && bar) {
      const qty = Math.floor(ctx.cash * 0.9 / bar.close);
      if (qty > 0) {
        console.log(`  -> 买入 ${qty} 股 @ ${bar.close.toFixed(2)}`);
        ctx.buy('000001', qty);
      }
    }
  }
};

const engine = new BacktestEngine({
  initialCapital: 1000000,
  riskControl: {
    stopLossPercent: 0.05,
  }
});

const result = engine.run(strategy, data);
console.log('\n===== 结果 =====');
console.log('交易次数:', result.trades.length);
console.log('总收益率:', (result.metrics.totalReturn * 100).toFixed(2) + '%');
console.log('交易详情:');
result.trades.forEach((t: any) => {
  const pnlPercent = t.pnl !== undefined ? ((t.pnl / (t.price * t.quantity)) * 100).toFixed(2) + '%' : 'N/A';
  console.log('  ', t.date, t.side, t.quantity, '股', '@', t.price.toFixed(2), t.pnl !== undefined ? '盈亏:' + pnlPercent : '');
});
