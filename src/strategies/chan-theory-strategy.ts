/**
 * 缠论策略实现
 *
 * 基于缠论买卖点的交易策略：
 * - 一类买点：趋势底背离时买入
 * - 二类买点：回踩不破前低时买入
 * - 三类买点：突破中枢回踩不进入时买入
 * - 卖点：反向操作
 */

import type { Strategy, StrategyContext, Bar, ChanTheoryResult } from '../../packages/types';
import { analyzeChanTheory } from '../indicators/chan-theory';

/** 缠论策略配置 */
export interface ChanTheoryStrategyConfig {
  // 买卖点启用配置
  enableBuy1: boolean;
  enableBuy2: boolean;
  enableBuy3: boolean;
  enableSell1: boolean;
  enableSell2: boolean;
  enableSell3: boolean;

  // 仓位配置
  positionPercent: number; // 单笔仓位百分比（默认 80%）

  // 风控配置
  stopLossPercent: number; // 止损百分比
  takeProfitPercent: number; // 止盈百分比

  // 最小 K 线数量要求
  minBarsForAnalysis: number; // 最少需要多少根 K 线才能开始分析（默认 30）
}

const DEFAULT_CONFIG: ChanTheoryStrategyConfig = {
  enableBuy1: true,
  enableBuy2: true,
  enableBuy3: true,
  enableSell1: true,
  enableSell2: false,
  enableSell3: false,
  positionPercent: 0.8,
  stopLossPercent: 0.05,
  takeProfitPercent: 0.15,
  minBarsForAnalysis: 30,
};

/**
 * 创建缠论策略
 */
export function createChanTheoryStrategy(
  config: Partial<ChanTheoryStrategyConfig> = {}
): Strategy {
  const cfg: ChanTheoryStrategyConfig = { ...DEFAULT_CONFIG, ...config };

  return {
    name: `Chan Theory Strategy (B1:${cfg.enableBuy1 ? 'Y' : 'N'} B2:${cfg.enableBuy2 ? 'Y' : 'N'} B3:${cfg.enableBuy3 ? 'Y' : 'N'})`,

    init(ctx: StrategyContext) {
      // 初始化逻辑
    },

    onBar(ctx: StrategyContext) {
      const symbol = Array.from(ctx.positions.keys())[0] || ctx.currentDate;
      const bars = ctx.getBars(symbol);

      // 数据不足时跳过
      if (bars.length < cfg.minBarsForAnalysis) return;

      // 执行缠论分析
      const chanResult = analyzeChanTheory(bars);

      // 如果没有买卖点，返回
      if (chanResult.buySellPoints.length === 0) return;

      // 获取最新的买卖点
      const latestBar = bars[bars.length - 1];
      const latestPoints = chanResult.buySellPoints.filter(
        bp => bp.date === latestBar.date
      );

      if (latestPoints.length === 0) return;

      const position = ctx.positions.get(symbol);

      // 处理买入信号
      for (const point of latestPoints) {
        if (point.type.startsWith('buy') && !position) {
          // 检查是否启用该类型买点
          if (
            (point.type === 'buy1' && cfg.enableBuy1) ||
            (point.type === 'buy2' && cfg.enableBuy2) ||
            (point.type === 'buy3' && cfg.enableBuy3)
          ) {
            const qty = Math.floor((ctx.cash * cfg.positionPercent) / latestBar.close);
            if (qty > 0) {
              ctx.buy(symbol, qty);
              // 设置止损止盈
              ctx.setStopLoss(symbol, latestBar.close * (1 - cfg.stopLossPercent));
              ctx.setTakeProfit(symbol, latestBar.close * (1 + cfg.takeProfitPercent));
            }
          }
        }
      }

      // 处理卖出信号
      for (const point of latestPoints) {
        if (point.type.startsWith('sell') && position) {
          // 检查是否启用该类型卖点
          if (
            (point.type === 'sell1' && cfg.enableSell1) ||
            (point.type === 'sell2' && cfg.enableSell2) ||
            (point.type === 'sell3' && cfg.enableSell3)
          ) {
            ctx.sell(symbol, position.quantity);
          }
        }
      }
    },
  };
}

/**
 * 获取缠论分析结果（用于可视化）
 * 这个函数可以在服务器端调用，返回缠论结构数据
 */
export function getChanTheoryAnalysis(bars: Bar[]): ChanTheoryResult {
  return analyzeChanTheory(bars);
}
