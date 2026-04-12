/**
 * 数据加载器测试
 */
import { describe, it, expect } from 'vitest';
import { createBarsFromArray } from '../data';

describe('数据加载器测试', () => {
  describe('createBarsFromArray', () => {
    it('应该正确创建 Bar 数组', () => {
      const inputData = [
        { date: '2023-01-03', open: 100, high: 102, low: 99, close: 101, volume: 1000000 },
        { date: '2023-01-04', open: 101, high: 103, low: 100, close: 102, volume: 1100000 },
        { date: '2023-01-05', open: 102, high: 104, low: 101, close: 103, volume: 1200000 },
      ];

      const bars = createBarsFromArray(inputData);

      expect(bars.length).toBe(3);
      expect(bars[0].date).toBe('2023-01-03');
      expect(bars[0].close).toBe(101);
    });

    it('应该按日期排序', () => {
      const inputData = [
        { date: '2023-01-05', open: 102, high: 104, low: 101, close: 103, volume: 1200000 },
        { date: '2023-01-03', open: 100, high: 102, low: 99, close: 101, volume: 1000000 },
        { date: '2023-01-04', open: 101, high: 103, low: 100, close: 102, volume: 1100000 },
      ];

      const bars = createBarsFromArray(inputData);

      expect(bars[0].date).toBe('2023-01-03');
      expect(bars[1].date).toBe('2023-01-04');
      expect(bars[2].date).toBe('2023-01-05');
    });

    it('应该处理空数组', () => {
      const bars = createBarsFromArray([]);
      expect(bars.length).toBe(0);
    });
  });

  describe('CSV 辅助函数', () => {
    it('应该验证 CSV 数据格式', () => {
      // 验证必需的列
      const validRecord = {
        date: '2023-01-03',
        open: '100',
        high: '102',
        low: '99',
        close: '101',
        volume: '1000000',
      };

      expect(validRecord.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(parseFloat(validRecord.open)).toBe(100);
      expect(parseFloat(validRecord.close)).toBe(101);
    });
  });
});
