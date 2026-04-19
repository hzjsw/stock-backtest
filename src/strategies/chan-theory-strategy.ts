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
import { analyzeChanTheory as analyzeChanTheoryCore } from '../indicators/chan-theory';

// 重新导出 analyzeChanTheory
export const analyzeChanTheory = analyzeChanTheoryCore;

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

  // 股票代码（可选，用于单只股票回测）
  symbol?: string;

  // 买卖点确认延迟（允许交易过去 N 天内的买卖点）
  // 因为缠论买卖点需要后续 K 线确认，所以允许回溯交易
  lookbackDays: number; // 默认 5 天
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
  symbol: '000001',
  lookbackDays: 5,
};

/**
 * 创建缠论策略
 */
export function createChanTheoryStrategy(
  config: Partial<ChanTheoryStrategyConfig> = {}
): Strategy {
  const cfg: ChanTheoryStrategyConfig = { ...DEFAULT_CONFIG, ...config };

  // 记录已交易的买卖点，避免重复交易
  const tradedPoints = new Set<string>();

  return {
    name: `Chan Theory Strategy (B1:${cfg.enableBuy1 ? 'Y' : 'N'} B2:${cfg.enableBuy2 ? 'Y' : 'N'} B3:${cfg.enableBuy3 ? 'Y' : 'N'})`,

    init(ctx: StrategyContext) {
      // 存储 symbol 到上下文（如果未指定）
      if (!cfg.symbol && ctx.positions.size > 0) {
        // 理论上缠论策略应该配置 symbol
      }
    },

    onBar(ctx: StrategyContext) {
      // 获取 symbol：优先使用配置的，其次使用持仓中的，最后使用默认值
      const symbol = cfg.symbol || Array.from(ctx.positions.keys())[0] || '000001';
      const bars = ctx.getBars(symbol);

      // 数据不足时跳过
      if (bars.length < cfg.minBarsForAnalysis) return;

      // 执行缠论分析
      const chanResult = analyzeChanTheoryCore(bars);

      // 调试：输出分析结果
      if (chanResult.buySellPoints.length > 0 && ctx.currentDate > '1997-01-01' && ctx.currentDate < '1998-01-01') {
        console.log(`[ChanTheory] ${ctx.currentDate}: ${symbol}, Bars: ${bars.length}, Strokes: ${chanResult.strokes.length}, BSP: ${chanResult.buySellPoints.length}`);
      }

      // 如果没有买卖点，返回
      if (chanResult.buySellPoints.length === 0) return;

      // 获取最新的买卖点（允许 lookback 天内的）
      const latestBar = bars[bars.length - 1];
      const latestBarDate = latestBar.date.toString();

      // 计算 lookback 日期范围内的买卖点
      const lookbackDate = bars[Math.max(0, bars.length - 1 - cfg.lookbackDays)]?.date || '';
      const recentPoints = chanResult.buySellPoints.filter(bp => {
        const bpDate = bp.date.toString();
        return bpDate >= lookbackDate && bpDate <= latestBarDate;
      });

      if (recentPoints.length === 0) return;

      // 按日期排序，取最新的
      recentPoints.sort((a, b) => b.date.localeCompare(a.date));
      const latestPoint = recentPoints[0];

      // 检查是否已经交易过这个买卖点（避免重复交易）
      // 简单处理：如果已有持仓，不再买入；如果没有持仓，不再卖出
      const position = ctx.positions.get(symbol);

      // 处理买入信号
      const buyPoint = recentPoints.find(p => {
        const key = `${p.type}-${p.date}-${p.price}`;
        return p.type.startsWith('buy') && !position && !tradedPoints.has(key);
      });
      if (buyPoint) {
        // 检查是否启用该类型买点
        const enabled =
          (buyPoint.type === 'buy1' && cfg.enableBuy1) ||
          (buyPoint.type === 'buy2' && cfg.enableBuy2) ||
          (buyPoint.type === 'buy3' && cfg.enableBuy3);

        if (enabled) {
          const qty = Math.floor((ctx.cash * cfg.positionPercent) / latestBar.close);
          if (qty > 0) {
            ctx.buy(symbol, qty);
            // 标记为已交易
            tradedPoints.add(`${buyPoint.type}-${buyPoint.date}-${buyPoint.price}`);
            // 设置止损止盈
            ctx.setStopLoss(symbol, latestBar.close * (1 - cfg.stopLossPercent));
            ctx.setTakeProfit(symbol, latestBar.close * (1 + cfg.takeProfitPercent));
          }
        }
      }

      // 处理卖出信号
      const sellPoint = recentPoints.find(p => {
        const key = `${p.type}-${p.date}-${p.price}`;
        return p.type.startsWith('sell') && position && !tradedPoints.has(key);
      });
      if (sellPoint && position) {
        const enabled =
          (sellPoint.type === 'sell1' && cfg.enableSell1) ||
          (sellPoint.type === 'sell2' && cfg.enableSell2) ||
          (sellPoint.type === 'sell3' && cfg.enableSell3);

        if (enabled) {
          ctx.sell(symbol, position.quantity);
          // 标记为已交易
          tradedPoints.add(`${sellPoint.type}-${sellPoint.date}-${sellPoint.price}`);
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
