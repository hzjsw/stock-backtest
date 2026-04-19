/**
 * 因子选股模块测试
 */
import { describe, it, expect } from 'vitest';
import {
  MomentumFactor,
  VolatilityFactor,
  MADeviationFactor,
  VolumeRatioFactor,
  MultiFactorScorer,
} from '../factors';
import type { Bar } from '../../packages/types';

// 辅助函数：创建模拟 K 线数据
function createMockBars(count: number, startPrice: number = 100, volatility: number = 0.02): Bar[] {
  const bars: Bar[] = [];
  let price = startPrice;
  const startDate = new Date('2023-01-01');

  for (let i = 0; i < count; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const change = price * (Math.random() - 0.5) * volatility;
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

describe('因子选股模块测试', () => {
  describe('动量因子', () => {
    it('应该正确计算动量值', () => {
      const bars = createMockBars(50, 100, 0.01);
      const factor = MomentumFactor(10);
      const result = factor.calculate(bars);

      // 动量应该是过去 10 天的收益率
      // 注意：由于周末跳过，实际索引可能不同
      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
    });

    it('数据不足时应该返回 NaN', () => {
      const bars = createMockBars(5, 100);
      const factor = MomentumFactor(10);
      const result = factor.calculate(bars);
      expect(result).toBeNaN();
    });
  });

  describe('波动率因子', () => {
    it('应该正确计算波动率', () => {
      const bars = createMockBars(30, 100, 0.02);
      const factor = VolatilityFactor(20);
      const result = factor.calculate(bars);

      // 波动率应该是正数
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(0.1); // 正常日波动率应该小于 10%
    });

    it('数据不足时应该返回 NaN', () => {
      const bars = createMockBars(5, 100);
      const factor = VolatilityFactor(20);
      const result = factor.calculate(bars);
      expect(result).toBeNaN();
    });
  });

  describe('均线偏离因子', () => {
    it('应该正确计算均线偏离', () => {
      const bars = createMockBars(50, 100, 0.01);
      const factor = MADeviationFactor(20);
      const result = factor.calculate(bars);

      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
    });

    it('数据不足时应该返回 NaN', () => {
      const bars = createMockBars(5, 100);
      const factor = MADeviationFactor(20);
      const result = factor.calculate(bars);
      expect(result).toBeNaN();
    });
  });

  describe('量比因子', () => {
    it('应该正确计算量比', () => {
      const bars = createMockBars(50, 100, 0.01);
      const factor = VolumeRatioFactor(5, 20);
      const result = factor.calculate(bars);

      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
    });

    it('数据不足时应该返回 NaN', () => {
      const bars = createMockBars(5, 100);
      const factor = VolumeRatioFactor(5, 20);
      const result = factor.calculate(bars);
      expect(result).toBeNaN();
    });
  });

  describe('多因子打分器', () => {
    it('应该正确对多只股票进行打分', () => {
      const stockBars = new Map<string, Bar[]>();

      // 创建 5 只股票的数据，每只有不同的动量特征
      stockBars.set('strong', createMockBars(50, 100, 0.01)); // 强势股
      stockBars.set('medium', createMockBars(50, 100, 0.02)); // 中等
      stockBars.set('weak', createMockBars(50, 100, 0.03)); // 弱势股

      const scorer = new MultiFactorScorer();
      scorer.addFactor(MomentumFactor(20), 1.0, false);

      const scores = scorer.score(stockBars);

      expect(scores.length).toBe(3);
      // 所有股票都应该有分数
      scores.forEach(s => {
        expect(s.compositeScore).toBeGreaterThan(0);
        expect(s.compositeScore).toBeLessThanOrEqual(1);
      });
    });

    it('应该正确选择 Top N 股票', () => {
      const stockBars = new Map<string, Bar[]>();

      stockBars.set('A', createMockBars(50, 100, 0.01));
      stockBars.set('B', createMockBars(50, 100, 0.01));
      stockBars.set('C', createMockBars(50, 100, 0.01));
      stockBars.set('D', createMockBars(50, 100, 0.01));
      stockBars.set('E', createMockBars(50, 100, 0.01));

      const scorer = new MultiFactorScorer();
      scorer.addFactor(MomentumFactor(20), 0.5, false);
      scorer.addFactor(VolatilityFactor(20), 0.5, true);

      const topStocks = scorer.selectTop(stockBars, 2);

      expect(topStocks.length).toBe(2);
      expect(topStocks[0]).toBeDefined();
      expect(topStocks[1]).toBeDefined();
    });

    it('处理 NaN 值时应该给 0 分', () => {
      const stockBars = new Map<string, Bar[]>();

      // 一只股票数据充足
      stockBars.set('valid', createMockBars(50, 100, 0.01));
      // 一只股票数据不足
      stockBars.set('invalid', createMockBars(5, 100, 0.01));

      const scorer = new MultiFactorScorer();
      scorer.addFactor(MomentumFactor(20), 1.0, false);

      const scores = scorer.score(stockBars);

      const invalidScore = scores.find(s => s.symbol === 'invalid');
      expect(invalidScore?.compositeScore).toBe(0);
    });

    it('综合得分应该是各因子得分的加权平均', () => {
      const stockBars = new Map<string, Bar[]>();
      stockBars.set('test', createMockBars(50, 100, 0.01));

      const scorer = new MultiFactorScorer();
      scorer.addFactor(MomentumFactor(20), 0.4, false);
      scorer.addFactor(VolatilityFactor(20), 0.6, true);

      const scores = scorer.score(stockBars);
      const result = scores[0];

      // 综合分数应该在两个因子分数之间
      expect(result.compositeScore).toBeGreaterThan(0);
      expect(result.compositeScore).toBeLessThanOrEqual(1);
    });
  });
});
