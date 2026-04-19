/**
 * 测试 API 请求
 */
import { handleBacktest } from './src/server/index';

// 模拟前端发送的请求
const request = {
  strategy: 'ma-crossover' as const,
  strategyParams: { shortPeriod: 5, longPeriod: 20 },
  dataSource: { type: 'mock' as const },
  config: {
    initialCapital: 1000000,
    commissionRate: 0.0003,
    stampDutyRate: 0.001,
    slippage: 0.001,
    riskControl: {
      stopLossPercent: 0.05,
      takeProfitPercent: 0.15,
      trailingStopPercent: 0.08,
    }
  }
};

console.log('测试请求:', JSON.stringify(request, null, 2));
console.log('\n开始回测...\n');

try {
  const result = handleBacktest(request);
  console.log('\n===== 回测结果 =====');
  console.log('策略名称:', result.strategyName);
  console.log('总收益率:', (result.metrics.totalReturn * 100).toFixed(2) + '%');
  console.log('交易次数:', result.trades.length);
  console.log('交易详情:');
  result.trades.forEach(t => {
    const pnlPercent = t.pnl !== undefined ? ((t.pnl / (t.price * t.quantity)) * 100).toFixed(2) + '%' : 'N/A';
    console.log(`  ${t.date} ${t.side} ${t.quantity} 股 @ ${t.price.toFixed(2)} ${t.pnl !== undefined ? '盈亏:' + pnlPercent : ''}`);
  });
} catch (error) {
  console.error('回测失败:', error);
}
