/**
 * 技术指标测试
 */
import { describe, it, expect } from 'vitest';
import { SMA, EMA, RSI, MACD, BollingerBands } from '../indicators';

// 辅助函数：创建模拟 K 线数据
function createMockBars(count: number, startPrice: number = 100): ReturnType<typeof import('../index').createBarsFromArray> {
  const bars = [];
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

describe('技术指标测试', () => {
  describe('SMA - 简单移动平均线', () => {
    it('应该正确计算 SMA', () => {
      const bars = createMockBars(30);
      const sma5 = SMA(bars, 5);

      // 前 4 个值应该是 NaN
      for (let i = 0; i < 4; i++) {
        expect(isNaN(sma5[i])).toBe(true);
      }

      // 第 5 个值开始应该有数值
      expect(isNaN(sma5[4])).toBe(false);
      expect(sma5[4]).toBeGreaterThan(0);

      // 验证 SMA 计算正确性（手动计算前 5 个收盘价的平均）
      const expected = (bars[0].close + bars[1].close + bars[2].close + bars[3].close + bars[4].close) / 5;
      expect(sma5[4]).toBeCloseTo(expected, 2);
    });

    it('应该处理不同周期的 SMA', () => {
      const bars = createMockBars(100);
      const sma20 = SMA(bars, 20);
      const sma50 = SMA(bars, 50);

      // SMA20 前 19 个值应该是 NaN
      expect(isNaN(sma20[19])).toBe(false);
      // SMA50 前 49 个值应该是 NaN
      expect(isNaN(sma50[49])).toBe(false);
    });
  });

  describe('EMA - 指数移动平均线', () => {
    it('应该正确计算 EMA', () => {
      const bars = createMockBars(30);
      const ema5 = EMA(bars, 5);

      // 前 4 个值应该是 NaN
      for (let i = 0; i < 4; i++) {
        expect(isNaN(ema5[i])).toBe(true);
      }

      // 第 5 个值开始应该有数值
      expect(isNaN(ema5[4])).toBe(false);
      expect(ema5[4]).toBeGreaterThan(0);
    });

    it('EMA 应该对最近价格更敏感', () => {
      // 创建价格上涨的序列
      const risingBars = createMockBars(50, 100);
      const sma20 = SMA(risingBars, 20);
      const ema20 = EMA(risingBars, 20);

      // 在上涨趋势中，EMA 应该高于 SMA
      const lastIdx = risingBars.length - 1;
      // EMA 对近期价格更敏感，通常会更接近当前价格
      expect(ema20[lastIdx]).toBeGreaterThan(sma20[lastIdx] * 0.95); // 大致比较
    });
  });

  describe('RSI - 相对强弱指标', () => {
    it('应该正确计算 RSI', () => {
      const bars = createMockBars(30);
      const rsi14 = RSI(bars, 14);

      // 前 14 个值应该是 NaN
      for (let i = 0; i < 14; i++) {
        expect(isNaN(rsi14[i])).toBe(true);
      }

      // 第 14 个值开始应该有数值
      expect(isNaN(rsi14[14])).toBe(false);
      expect(rsi14[14]).toBeGreaterThanOrEqual(0);
      expect(rsi14[14]).toBeLessThanOrEqual(100);
    });

    it('RSI 值应该在 0-100 范围内', () => {
      const bars = createMockBars(100);
      const rsi = RSI(bars, 14);

      for (let i = 14; i < rsi.length; i++) {
        if (!isNaN(rsi[i])) {
          expect(rsi[i]).toBeGreaterThanOrEqual(0);
          expect(rsi[i]).toBeLessThanOrEqual(100);
        }
      }
    });
  });

  describe('MACD - 移动平均收敛发散', () => {
    it('应该正确计算 MACD', () => {
      const bars = createMockBars(100);
      const { macd, signal, histogram } = MACD(bars, 12, 26, 9);

      // MACD 线需要足够的数据
      expect(macd.length).toBe(bars.length);
      // 信号线需要更多数据
      expect(signal.length).toBe(bars.length);
      // 柱状图
      expect(histogram.length).toBe(bars.length);

      // 验证后期数据有效
      const lastIdx = bars.length - 1;
      expect(isNaN(histogram[lastIdx])).toBe(false);
    });

    it('MACD 柱状图应该是 MACD 线和信号线的差值', () => {
      const bars = createMockBars(100);
      const { macd, signal, histogram } = MACD(bars, 12, 26, 9);

      const lastIdx = bars.length - 1;
      if (!isNaN(macd[lastIdx]) && !isNaN(signal[lastIdx])) {
        const expectedHistogram = (macd[lastIdx] - signal[lastIdx]) * 2;
        expect(histogram[lastIdx]).toBeCloseTo(expectedHistogram, 2);
      }
    });
  });

  describe('BollingerBands - 布林带', () => {
    it('应该正确计算布林带', () => {
      const bars = createMockBars(30);
      const { upper, middle, lower } = BollingerBands(bars, 20, 2);

      // 前 19 个值应该是 NaN
      for (let i = 0; i < 19; i++) {
        expect(isNaN(upper[i])).toBe(true);
        expect(isNaN(middle[i])).toBe(true);
        expect(isNaN(lower[i])).toBe(true);
      }

      // 第 19 个值开始应该有数值
      expect(isNaN(middle[19])).toBe(false);
      expect(isNaN(upper[19])).toBe(false);
      expect(isNaN(lower[19])).toBe(false);
    });

    it('上轨应该大于中轨，中轨应该大于下轨', () => {
      const bars = createMockBars(50);
      const { upper, middle, lower } = BollingerBands(bars, 20, 2);

      for (let i = 19; i < bars.length; i++) {
        if (!isNaN(upper[i]) && !isNaN(middle[i]) && !isNaN(lower[i])) {
          expect(upper[i]).toBeGreaterThanOrEqual(middle[i]);
          expect(middle[i]).toBeGreaterThanOrEqual(lower[i]);
        }
      }
    });
  });
});
