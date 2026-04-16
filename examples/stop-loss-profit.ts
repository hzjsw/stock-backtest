/**
 * 止损止盈策略示例
 *
 * 演示如何使用回测引擎的止损止盈功能：
 * 1. 固定止损：买入价下跌一定百分比后卖出
 * 2. 固定止盈：买入价上涨一定百分比后卖出
 * 3. 追踪止损：从最高点下跌一定百分比后卖出
 * 4. 全局止损止盈：配置级别的风险控制
 */

import { BacktestEngine } from '../src/core/engine';
import type { Strategy, StrategyContext, Bar } from '../src/core/types';
import { SMA } from '../src/indicators';

// ============================================
// 策略 1: 双均线交叉 + 止损止盈
// ============================================
function createMAStrategyWithStopLoss(shortPeriod: number, longPeriod: number): Strategy {
  return {
    name: `MA Crossover + StopLoss/Profit (MA${shortPeriod}/MA${longPeriod})`,
    onBar(ctx: StrategyContext) {
      const symbol = '000001';
      const bars = ctx.getBars(symbol);

      if (bars.length < longPeriod + 5) return;

      const smaShort = SMA(bars, shortPeriod);
      const smaLong = SMA(bars, longPeriod);
      const idx = bars.length - 1;
      const prev = idx - 1;

      const currentShort = smaShort[idx];
      const currentLong = smaLong[idx];
      const prevShort = smaShort[prev];
      const prevLong = smaLong[prev];

      if (isNaN(currentShort) || isNaN(currentLong) || isNaN(prevShort) || isNaN(prevLong)) return;

      const bar = ctx.getCurrentBar(symbol);
      if (!bar) return;

      const position = ctx.positions.get(symbol);

      // 金叉买入
      if (prevShort <= prevLong && currentShort > currentLong && !position) {
        const qty = Math.floor((ctx.cash * 0.8) / bar.close);
        if (qty > 0) {
          ctx.buy(symbol, qty);
          // 设置止损：买入价下跌 5% 触发
          ctx.setStopLoss(symbol, bar.close * 0.95);
          // 设置止盈：买入价上涨 15% 触发
          ctx.setTakeProfit(symbol, bar.close * 1.15);
          console.log(`[买入] ${ctx.currentDate} ${symbol} @ ${bar.close.toFixed(2)} - 止损：${(bar.close * 0.95).toFixed(2)}, 止盈：${(bar.close * 1.15).toFixed(2)}`);
        }
      }

      // 死叉卖出
      if (prevShort >= prevLong && currentShort < currentLong && position && position.quantity > 0) {
        ctx.sell(symbol, position.quantity);
        console.log(`[卖出] ${ctx.currentDate} ${symbol} @ ${bar.close.toFixed(2)} - 盈亏：${((bar.close - position.avgCost) / position.avgCost * 100).toFixed(2)}%`);
      }
    },
  };
}

// ============================================
// 策略 2: 追踪止损策略
// ============================================
function createTrailingStopStrategy(): Strategy {
  return {
    name: 'Trailing Stop Strategy',
    onBar(ctx: StrategyContext) {
      const symbol = '000001';
      const bars = ctx.getBars(symbol);

      if (bars.length < 20) return;

      const sma20 = SMA(bars, 20);
      const currentSMA = sma20[bars.length - 1];

      if (isNaN(currentSMA)) return;

      const bar = ctx.getCurrentBar(symbol);
      if (!bar) return;

      const position = ctx.positions.get(symbol);

      // 价格站上 20 日均线买入
      if (bar.close > currentSMA && !position) {
        const qty = Math.floor((ctx.cash * 0.8) / bar.close);
        if (qty > 0) {
          ctx.buy(symbol, qty);
          // 设置追踪止损：从最高点下跌 8% 触发
          ctx.setTrailingStop(symbol, 0.08);
          console.log(`[买入] ${ctx.currentDate} ${symbol} @ ${bar.close.toFixed(2)} - 追踪止损：8%`);
        }
      }

      // 价格跌破 20 日均线卖出
      if (bar.close < currentSMA && position && position.quantity > 0) {
        ctx.sell(symbol, position.quantity);
        console.log(`[卖出] ${ctx.currentDate} ${symbol} @ ${bar.close.toFixed(2)} - 盈亏：${((bar.close - position.avgCost) / position.avgCost * 100).toFixed(2)}%`);
      }
    },
  };
}

// ============================================
// 辅助函数：创建模拟数据
// ============================================
function createMockBars(count: number, startPrice: number = 100, trend: 'up' | 'down' | 'volatile' = 'volatile'): Bar[] {
  const bars: Bar[] = [];
  let price = startPrice;
  const startDate = new Date('2023-01-01');

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    let change: number;
    if (trend === 'up') {
      change = price * 0.015; // 稳步上涨
    } else if (trend === 'down') {
      change = price * -0.01; // 缓慢下跌
    } else {
      change = price * (Math.random() - 0.48) * 0.03; // 震荡
    }

    const open = price;
    const close = price + change;
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);
    const volume = Math.floor(1000000 + Math.random() * 5000000);

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

// ============================================
// 运行示例
// ============================================
async function runExamples() {
  console.log('='.repeat(60));
  console.log('止损止盈策略示例');
  console.log('='.repeat(60));

  // 示例 1: 双均线 + 止损止盈
  console.log('\n【示例 1】双均线交叉 + 固定止损止盈');
  console.log('-'.repeat(40));

  const data1 = new Map<string, Bar[]>();
  data1.set('000001', createMockBars(200, 100, 'volatile'));

  const strategy1 = createMAStrategyWithStopLoss(5, 20);

  const engine1 = new BacktestEngine({
    initialCapital: 1000000,
    commissionRate: 0.0003,
    stampDutyRate: 0.001,
    slippage: 0.001,
  });

  const result1 = engine1.run(strategy1, data1);

  console.log('\n回测结果:');
  console.log(`  总收益率：${(result1.metrics.totalReturn * 100).toFixed(2)}%`);
  console.log(`  年化收益率：${(result1.metrics.annualizedReturn * 100).toFixed(2)}%`);
  console.log(`  夏普比率：${result1.metrics.sharpeRatio.toFixed(2)}`);
  console.log(`  最大回撤：${(result1.metrics.maxDrawdown * 100).toFixed(2)}%`);
  console.log(`  交易次数：${result1.trades.length}`);

  // 示例 2: 追踪止损策略
  console.log('\n【示例 2】追踪止损策略');
  console.log('-'.repeat(40));

  const data2 = new Map<string, Bar[]>();
  data2.set('000001', createMockBars(200, 100, 'up'));

  const strategy2 = createTrailingStopStrategy();

  const engine2 = new BacktestEngine({
    initialCapital: 1000000,
    commissionRate: 0.0003,
    stampDutyRate: 0.001,
    slippage: 0.001,
  });

  const result2 = engine2.run(strategy2, data2);

  console.log('\n回测结果:');
  console.log(`  总收益率：${(result2.metrics.totalReturn * 100).toFixed(2)}%`);
  console.log(`  年化收益率：${(result2.metrics.annualizedReturn * 100).toFixed(2)}%`);
  console.log(`  夏普比率：${result2.metrics.sharpeRatio.toFixed(2)}`);
  console.log(`  最大回撤：${(result2.metrics.maxDrawdown * 100).toFixed(2)}%`);
  console.log(`  交易次数：${result2.trades.length}`);

  // 示例 3: 全局止损配置
  console.log('\n【示例 3】全局止损配置');
  console.log('-'.repeat(40));

  const data3 = new Map<string, Bar[]>();
  data3.set('000001', createMockBars(100, 100, 'down'));

  const strategy3: Strategy = {
    name: 'Buy and Hold + Global StopLoss',
    onBar(ctx: StrategyContext) {
      const symbol = '000001';
      const bar = ctx.getCurrentBar(symbol);
      const position = ctx.positions.get(symbol);

      // 第一天买入后持有
      if (!position && bar) {
        const qty = Math.floor((ctx.cash * 0.9) / bar.close);
        if (qty > 0) {
          ctx.buy(symbol, qty);
          console.log(`[买入] ${ctx.currentDate} ${symbol} @ ${bar.close.toFixed(2)}`);
        }
      }
    },
  };

  // 配置全局止损 5%
  const engine3 = new BacktestEngine({
    initialCapital: 1000000,
    commissionRate: 0.0003,
    stampDutyRate: 0.001,
    slippage: 0.001,
    riskControl: {
      stopLossPercent: 0.05, // 全局 5% 止损
    },
  });

  const result3 = engine3.run(strategy3, data3);

  console.log('\n回测结果 (全局止损 5%):');
  console.log(`  总收益率：${(result3.metrics.totalReturn * 100).toFixed(2)}%`);
  console.log(`  最大回撤：${(result3.metrics.maxDrawdown * 100).toFixed(2)}%`);
  console.log(`  交易次数：${result3.trades.length}`);

  console.log('\n' + '='.repeat(60));
  console.log('示例运行完成');
  console.log('='.repeat(60));
}

// 运行示例
runExamples().catch(console.error);
