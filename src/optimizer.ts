/**
 * 策略对比工具 - 同时运行多个策略并对比绩效
 */
import { BacktestEngine } from './core/engine';
import type { Strategy, Bar } from './core/types';
import {
  SMA, EMA, MACD, RSI, BollingerBands,
  ParabolicSAR, DualThrustRange, getIndicatorValue,
} from './index';
import { logger } from './lib/logger';

/**
 * 策略配置
 */
interface StrategyConfig {
  name: string;
  type: string;
  params: Record<string, number>;
  createStrategy: (params: Record<string, number>, symbol: string) => Strategy;
}

/**
 * 回测结果摘要
 */
export interface BacktestSummary {
  rank: number;
  strategyName: string;
  params: Record<string, number>;
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  totalTrades: number;
  winRate: number;
}

/**
 * 创建所有策略工厂函数
 */
function createStrategyFactory(type: string, params: Record<string, number>, symbol: string): Strategy {
  switch (type) {
    case 'ma-crossover':
      return {
        name: `MA Crossover (${params.shortPeriod}/${params.longPeriod})`,
        onBar(ctx) {
          const bars = ctx.getBars(symbol);
          if (bars.length < (params.longPeriod || 20) + 5) return;
          const smaShort = SMA(bars, params.shortPeriod || 5);
          const smaLong = SMA(bars, params.longPeriod || 20);
          const idx = bars.length - 1;
          const prev = idx - 1;
          const cs = getIndicatorValue(smaShort, idx);
          const cl = getIndicatorValue(smaLong, idx);
          const ps = getIndicatorValue(smaShort, prev);
          const pl = getIndicatorValue(smaLong, prev);
          if (!cs || !cl || !ps || !pl) return;
          const bar = ctx.getCurrentBar(symbol);
          if (!bar) return;
          const pos = ctx.positions.get(symbol);
          if (ps <= pl && cs > cl && !pos) {
            const qty = Math.floor((ctx.cash * 0.8) / bar.close);
            if (qty > 0) ctx.buy(symbol, qty);
          }
          if (ps >= pl && cs < cl && pos && pos.quantity > 0) {
            ctx.sell(symbol, pos.quantity);
          }
        },
      };

    case 'macd':
      return {
        name: `MACD (${params.fastPeriod || 12}/${params.slowPeriod || 26}/${params.signalPeriod || 9})`,
        onBar(ctx) {
          const bars = ctx.getBars(symbol);
          if (bars.length < 40) return;
          const { histogram } = MACD(bars, params.fastPeriod || 12, params.slowPeriod || 26, params.signalPeriod || 9);
          const idx = bars.length - 1;
          const prev = idx - 1;
          const ch = getIndicatorValue(histogram, idx);
          const ph = getIndicatorValue(histogram, prev);
          if (ch === undefined || ph === undefined) return;
          const bar = ctx.getCurrentBar(symbol);
          if (!bar) return;
          const pos = ctx.positions.get(symbol);
          if (ph <= 0 && ch > 0 && !pos) {
            const qty = Math.floor((ctx.cash * 0.8) / bar.close);
            if (qty > 0) ctx.buy(symbol, qty);
          }
          if (ph >= 0 && ch < 0 && pos && pos.quantity > 0) {
            ctx.sell(symbol, pos.quantity);
          }
        },
      };

    case 'rsi':
      return {
        name: `RSI (${params.period || 14})`,
        onBar(ctx) {
          const bars = ctx.getBars(symbol);
          if (bars.length < (params.period || 14) + 5) return;
          const rsi = RSI(bars, params.period || 14);
          const idx = bars.length - 1;
          const rsiVal = getIndicatorValue(rsi, idx);
          if (rsiVal === undefined) return;
          const bar = ctx.getCurrentBar(symbol);
          if (!bar) return;
          const pos = ctx.positions.get(symbol);
          if (rsiVal < (params.oversold || 30) && !pos) {
            const qty = Math.floor((ctx.cash * 0.8) / bar.close);
            if (qty > 0) ctx.buy(symbol, qty);
          }
          if (rsiVal > (params.overbought || 70) && pos && pos.quantity > 0) {
            ctx.sell(symbol, pos.quantity);
          }
        },
      };

    case 'bollinger':
      return {
        name: `Bollinger (${params.period || 20}, ${params.stdDev || 2}σ)`,
        onBar(ctx) {
          const bars = ctx.getBars(symbol);
          if (bars.length < (params.period || 20) + 5) return;
          const { upper, lower } = BollingerBands(bars, params.period || 20, params.stdDev || 2);
          const idx = bars.length - 1;
          const u = getIndicatorValue(upper, idx);
          const l = getIndicatorValue(lower, idx);
          if (u === undefined || l === undefined) return;
          const bar = ctx.getCurrentBar(symbol);
          if (!bar) return;
          const pos = ctx.positions.get(symbol);
          if (bar.close <= l && !pos) {
            const qty = Math.floor((ctx.cash * 0.8) / bar.close);
            if (qty > 0) ctx.buy(symbol, qty);
          }
          if (bar.close >= u && pos && pos.quantity > 0) {
            ctx.sell(symbol, pos.quantity);
          }
        },
      };

    case 'dual-thrust':
      return {
        name: `Dual Thrust (K1=${params.k1 || 0.5}, K2=${params.k2 || 0.5})`,
        onBar(ctx) {
          const bars = ctx.getBars(symbol);
          if (bars.length < (params.lookback || 1) + 1) return;
          const { upper, lower } = DualThrustRange(bars, params.k1 || 0.5, params.k2 || 0.5, params.lookback || 1);
          const idx = bars.length - 1;
          const upperBand = upper[idx];
          const lowerBand = lower[idx];
          if (isNaN(upperBand) || isNaN(lowerBand)) return;
          const bar = ctx.getCurrentBar(symbol);
          if (!bar) return;
          const pos = ctx.positions.get(symbol);
          if (bar.close > upperBand && !pos) {
            const qty = Math.floor((ctx.cash * 0.8) / bar.close);
            if (qty > 0) ctx.buy(symbol, qty);
          }
          if (bar.close < lowerBand && pos && pos.quantity > 0) {
            ctx.sell(symbol, pos.quantity);
          }
        },
      };

    case 'parabolic-sar':
      return {
        name: `Parabolic SAR (AF=${params.afStart || 0.02}-${params.afMax || 0.2})`,
        onBar(ctx) {
          const bars = ctx.getBars(symbol);
          if (bars.length < 3) return;
          const { sar, trend } = ParabolicSAR(bars, params.afStart || 0.02, params.afIncrement || 0.02, params.afMax || 0.2);
          const idx = bars.length - 1;
          const prev = idx - 1;
          const currentSAR = sar[idx];
          const currentTrend = trend[idx];
          const prevTrend = trend[prev];
          if (isNaN(currentSAR) || isNaN(currentTrend)) return;
          const bar = ctx.getCurrentBar(symbol);
          if (!bar) return;
          const pos = ctx.positions.get(symbol);
          if (prevTrend !== currentTrend) {
            if (currentTrend === 1 && !pos) {
              const qty = Math.floor((ctx.cash * 0.8) / bar.close);
              if (qty > 0) ctx.buy(symbol, qty);
            }
            if (currentTrend === -1 && pos && pos.quantity > 0) {
              ctx.sell(symbol, pos.quantity);
            }
          }
        },
      };

    default:
      throw new Error(`Unknown strategy type: ${type}`);
  }
}

/**
 * 运行策略对比
 */
export async function compareStrategies(
  data: Map<string, Bar[]>,
  configs: Array<{
    type: string;
    params: Record<string, number>;
  }>,
  initialCapital: number = 1000000
): Promise<BacktestSummary[]> {
  const results: BacktestSummary[] = [];
  const symbol = data.size > 0 ? Array.from(data.keys())[0] : '000001';

  for (const config of configs) {
    try {
      const strategy = createStrategyFactory(config.type, config.params, symbol);
      const engine = new BacktestEngine({ initialCapital });
      const result = engine.run(strategy, data);

      results.push({
        rank: 0,
        strategyName: `${config.type} (${JSON.stringify(config.params)})`,
        params: config.params,
        totalReturn: result.metrics.totalReturn,
        annualizedReturn: result.metrics.annualizedReturn,
        sharpeRatio: result.metrics.sharpeRatio,
        maxDrawdown: result.metrics.maxDrawdown,
        totalTrades: result.metrics.totalTrades,
        winRate: result.metrics.winRate,
      });
    } catch (err) {
      logger.warn(`Strategy ${config.type} failed:`, err instanceof Error ? err.message : err);
    }
  }

  // 按总收益率排序
  results.sort((a, b) => b.totalReturn - a.totalReturn);
  results.forEach((r, i) => r.rank = i + 1);

  return results;
}

/**
 * 参数网格搜索
 */
export async function gridSearch(
  data: Map<string, Bar[]>,
  strategyType: string,
  paramGrid: Record<string, number[]>,
  initialCapital: number = 1000000
): Promise<BacktestSummary[]> {
  const symbol = data.size > 0 ? Array.from(data.keys())[0] : '000001';
  const results: BacktestSummary[] = [];

  // 生成所有参数组合
  const keys = Object.keys(paramGrid);
  const values = Object.values(paramGrid);

  function cartesianProduct(arrays: number[][]): number[][] {
    return arrays.reduce<number[][]>(
      (a, b) => a.flatMap(d => b.map(e => [...d, e])),
      [[]]
    );
  }

  const combinations = cartesianProduct(values);

  logger.info(`Grid search: ${combinations.length} combinations for ${strategyType}`);

  for (const combination of combinations) {
    const params: Record<string, number> = {};
    keys.forEach((key, i) => {
      params[key] = combination[i];
    });

    try {
      const strategy = createStrategyFactory(strategyType, params, symbol);
      const engine = new BacktestEngine({ initialCapital });
      const result = engine.run(strategy, data);

      results.push({
        rank: 0,
        strategyName: `${strategyType} (${JSON.stringify(params)})`,
        params,
        totalReturn: result.metrics.totalReturn,
        annualizedReturn: result.metrics.annualizedReturn,
        sharpeRatio: result.metrics.sharpeRatio,
        maxDrawdown: result.metrics.maxDrawdown,
        totalTrades: result.metrics.totalTrades,
        winRate: result.metrics.winRate,
      });
    } catch (err) {
      // 跳过失败的参数组合
    }
  }

  // 按总收益率排序
  results.sort((a, b) => b.totalReturn - a.totalReturn);
  results.forEach((r, i) => r.rank = i + 1);

  return results;
}

/**
 * 打印对比结果
 */
export function printComparison(results: BacktestSummary[]): void {
  console.log('\n' + '='.repeat(100));
  console.log('策略对比结果 (按总收益率排序)');
  console.log('='.repeat(100));
  console.table(
    results.slice(0, 20).map(r => ({
      排名: r.rank,
      策略: r.strategyName,
      总收益率: `${(r.totalReturn * 100).toFixed(2)}%`,
      年化收益: `${(r.annualizedReturn * 100).toFixed(2)}%`,
      夏普比率: r.sharpeRatio.toFixed(2),
      最大回撤: `${(r.maxDrawdown * 100).toFixed(2)}%`,
      交易次数: r.totalTrades,
      胜率: `${(r.winRate * 100).toFixed(1)}%`,
    }))
  );

  if (results.length > 0) {
    const best = results[0];
    console.log('\n🏆 最佳策略:');
    console.log(`   策略：${best.strategyName}`);
    console.log(`   总收益率：${(best.totalReturn * 100).toFixed(2)}%`);
    console.log(`   年化收益：${(best.annualizedReturn * 100).toFixed(2)}%`);
    console.log(`   夏普比率：${best.sharpeRatio.toFixed(2)}`);
    console.log(`   最大回撤：${(best.maxDrawdown * 100).toFixed(2)}%`);
  }
  console.log('='.repeat(100) + '\n');
}
