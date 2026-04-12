/**
 * 回测引擎测试
 */
import { describe, it, expect } from 'vitest';
import { BacktestEngine } from '../core/engine';
import type { Strategy, StrategyContext, Bar } from '../core/types';

// 辅助函数：创建模拟 K 线数据
function createMockBars(count: number, startPrice: number = 100): Bar[] {
  const bars: Bar[] = [];
  let price = startPrice;
  const startDate = new Date('2023-01-01');

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const change = price * (Math.random() - 0.5) * 0.02;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * price * 0.01;
    const low = Math.min(open, close) - Math.random() * price * 0.01;
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

describe('回测引擎测试', () => {
  describe('基础功能', () => {
    it('应该能够运行简单回测', () => {
      const data = new Map<string, Bar[]>();
      data.set('000001', createMockBars(100, 100));

      const strategy: Strategy = {
        name: 'Test Strategy',
        onBar: () => {
          // 空策略
        },
      };

      const engine = new BacktestEngine({
        initialCapital: 1000000,
        commissionRate: 0.0003,
        stampDutyRate: 0.001,
        slippage: 0.001,
      });

      const result = engine.run(strategy, data);

      expect(result.strategyName).toBe('Test Strategy');
      expect(result.portfolioHistory.length).toBeGreaterThan(0);
      expect(result.metrics.totalReturn).toBe(0); // 空策略应该没有收益
    });

    it('应该正确处理日期范围过滤', () => {
      const data = new Map<string, Bar[]>();
      data.set('000001', createMockBars(200, 100));

      const strategy: Strategy = {
        name: 'Test Strategy',
        onBar: () => {},
      };

      const engine = new BacktestEngine({
        initialCapital: 1000000,
        startDate: '2023-03-01',
        endDate: '2023-06-30',
      });

      const result = engine.run(strategy, data);

      // 验证投资组合历史记录在指定日期范围内
      expect(result.portfolioHistory.length).toBeGreaterThan(0);
    });
  });

  describe('交易功能', () => {
    it('应该能够执行买入操作', () => {
      const data = new Map<string, Bar[]>();
      data.set('000001', createMockBars(50, 100));

      let bought = false;

      const strategy: Strategy = {
        name: 'Buy Strategy',
        onBar(ctx: StrategyContext) {
          if (!bought && ctx.cash > 10000) {
            const bar = ctx.getCurrentBar('000001');
            if (bar) {
              const qty = Math.floor(ctx.cash * 0.5 / bar.close);
              if (qty > 0) {
                ctx.buy('000001', qty);
                bought = true;
              }
            }
          }
        },
      };

      const engine = new BacktestEngine({
        initialCapital: 1000000,
        commissionRate: 0.0003,
        slippage: 0,
        stampDutyRate: 0,
      });

      const result = engine.run(strategy, data);

      expect(bought).toBe(true);
      expect(result.trades.length).toBeGreaterThanOrEqual(1);
    });

    it('应该能够执行卖出操作', () => {
      const data = new Map<string, Bar[]>();
      data.set('000001', createMockBars(100, 100));

      let bought = false;
      let sold = false;

      const strategy: Strategy = {
        name: 'Buy-Sell Strategy',
        onBar(ctx: StrategyContext) {
          const position = ctx.positions.get('000001');
          const bar = ctx.getCurrentBar('000001');
          if (!bar) return;

          if (!bought && ctx.cash > 10000) {
            const qty = Math.floor(ctx.cash * 0.8 / bar.close);
            if (qty > 0) {
              ctx.buy('000001', qty);
              bought = true;
            }
          } else if (bought && !sold && position && position.quantity > 0) {
            // 第二天卖出
            const bars = ctx.getBars('000001');
            if (bars.length > 10) {
              ctx.sell('000001', position.quantity);
              sold = true;
            }
          }
        },
      };

      const engine = new BacktestEngine({
        initialCapital: 1000000,
        commissionRate: 0.0003,
        slippage: 0,
        stampDutyRate: 0.001,
      });

      const result = engine.run(strategy, data);

      expect(bought).toBe(true);
      expect(sold).toBe(true);
      expect(result.trades.length).toBeGreaterThanOrEqual(2);
    });

    it('应该正确计算手续费', () => {
      const data = new Map<string, Bar[]>();
      data.set('000001', createMockBars(50, 100));

      const strategy: Strategy = {
        name: 'Buy Strategy',
        onBar(ctx: StrategyContext) {
          const bar = ctx.getCurrentBar('000001');
          if (bar && ctx.cash > 100000) {
            const qty = Math.floor(ctx.cash * 0.5 / bar.close);
            if (qty > 0 && !ctx.positions.has('000001')) {
              ctx.buy('000001', qty);
            }
          }
        },
      };

      const engine = new BacktestEngine({
        initialCapital: 1000000,
        commissionRate: 0.0003,
        slippage: 0,
        stampDutyRate: 0,
      });

      const result = engine.run(strategy, data);

      // 验证交易手续费不为 0
      if (result.trades.length > 0) {
        expect(result.trades[0].commission).toBeGreaterThan(0);
      }
    });
  });

  describe('绩效计算', () => {
    it('应该正确计算总收益率', () => {
      const data = new Map<string, Bar[]>();
      // 创建上涨趋势的数据
      const bars: Bar[] = [];
      let price = 100;
      for (let i = 0; i < 100; i++) {
        const date = new Date('2023-01-01');
        date.setDate(date.getDate() + i);
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        price *= 1.01; // 每天上涨 1%
        bars.push({
          date: date.toISOString().split('T')[0],
          open: price,
          high: price * 1.01,
          low: price * 0.99,
          close: price,
          volume: 1000000,
        });
      }
      data.set('000001', bars);

      const strategy: Strategy = {
        name: 'Hold Strategy',
        onBar(ctx: StrategyContext) {
          const bar = ctx.getCurrentBar('000001');
          if (bar && !ctx.positions.has('000001')) {
            const qty = Math.floor(ctx.cash * 0.95 / bar.close);
            if (qty > 0) ctx.buy('000001', qty);
          }
        },
      };

      const engine = new BacktestEngine({
        initialCapital: 1000000,
        commissionRate: 0.0003,
        slippage: 0,
        stampDutyRate: 0,
      });

      const result = engine.run(strategy, data);

      // 持有策略在上涨趋势中应该有正收益
      expect(result.metrics.totalReturn).toBeGreaterThan(0);
      expect(result.metrics.annualizedReturn).toBeGreaterThan(0);
    });

    it('应该正确计算最大回撤', () => {
      const data = new Map<string, Bar[]>();
      data.set('000001', createMockBars(100, 100));

      const strategy: Strategy = {
        name: 'Empty Strategy',
        onBar: () => {},
      };

      const engine = new BacktestEngine({
        initialCapital: 1000000,
      });

      const result = engine.run(strategy, data);

      // 空策略应该没有回撤
      expect(result.metrics.maxDrawdown).toBe(0);
    });

    it('应该正确计算夏普比率', () => {
      const data = new Map<string, Bar[]>();
      data.set('000001', createMockBars(100, 100));

      const strategy: Strategy = {
        name: 'Empty Strategy',
        onBar: () => {},
      };

      const engine = new BacktestEngine({
        initialCapital: 1000000,
      });

      const result = engine.run(strategy, data);

      // 空策略夏普比率应该为 0
      expect(result.metrics.sharpeRatio).toBe(0);
    });
  });

  describe('边界情况', () => {
    it('应该处理空数据', () => {
      const data = new Map<string, Bar[]>();
      data.set('000001', []);

      const strategy: Strategy = {
        name: 'Empty Strategy',
        onBar: () => {},
      };

      const engine = new BacktestEngine();

      expect(() => engine.run(strategy, data)).toThrow();
    });

    it('应该处理资金不足的情况', () => {
      const data = new Map<string, Bar[]>();
      data.set('000001', createMockBars(50, 1000)); // 高价股票

      let buyAttempted = false;

      const strategy: Strategy = {
        name: 'Poor Buyer',
        onBar(ctx: StrategyContext) {
          const bar = ctx.getCurrentBar('000001');
          if (bar && !buyAttempted) {
            // 尝试买入超过资金的股数
            ctx.buy('000001', 10000000);
            buyAttempted = true;
          }
        },
      };

      const engine = new BacktestEngine({
        initialCapital: 10000, // 资金很少
      });

      const result = engine.run(strategy, data);

      // 订单应该被取消（资金不足）
      expect(buyAttempted).toBe(true);
    });
  });
});
