/**
 * 因子选股模块
 */
import { Bar, Factor } from '../core/types';

/**
 * 动量因子 - 过去N天的收益率
 */
export function MomentumFactor(period: number = 20): Factor {
  return {
    name: `momentum_${period}`,
    calculate(bars: Bar[]): number {
      if (bars.length < period + 1) return NaN;
      const current = bars[bars.length - 1].close;
      const past = bars[bars.length - 1 - period].close;
      return (current - past) / past;
    },
  };
}

/**
 * 波动率因子 - 过去N天收益率的标准差
 */
export function VolatilityFactor(period: number = 20): Factor {
  return {
    name: `volatility_${period}`,
    calculate(bars: Bar[]): number {
      if (bars.length < period + 1) return NaN;
      const returns: number[] = [];
      for (let i = bars.length - period; i < bars.length; i++) {
        returns.push((bars[i].close - bars[i - 1].close) / bars[i - 1].close);
      }
      const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
      const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / returns.length;
      return Math.sqrt(variance);
    },
  };
}

/**
 * 换手率因子 - 过去N天的平均换手率
 */
export function TurnoverFactor(period: number = 20, turnoverField: string = 'turnover'): Factor {
  return {
    name: `turnover_${period}`,
    calculate(bars: Bar[]): number {
      if (bars.length < period) return NaN;
      let sum = 0;
      for (let i = bars.length - period; i < bars.length; i++) {
        sum += Number(bars[i][turnoverField] || 0);
      }
      return sum / period;
    },
  };
}

/**
 * 市值因子 (需要数据中包含市值字段)
 */
export function MarketCapFactor(capField: string = 'market_cap'): Factor {
  return {
    name: 'market_cap',
    calculate(bars: Bar[]): number {
      if (bars.length === 0) return NaN;
      return Number(bars[bars.length - 1][capField] || NaN);
    },
  };
}

/**
 * 市盈率因子 (PE)
 */
export function PEFactor(peField: string = 'pe'): Factor {
  return {
    name: 'pe',
    calculate(bars: Bar[]): number {
      if (bars.length === 0) return NaN;
      return Number(bars[bars.length - 1][peField] || NaN);
    },
  };
}

/**
 * 市净率因子 (PB)
 */
export function PBFactor(pbField: string = 'pb'): Factor {
  return {
    name: 'pb',
    calculate(bars: Bar[]): number {
      if (bars.length === 0) return NaN;
      return Number(bars[bars.length - 1][pbField] || NaN);
    },
  };
}

/**
 * 均线偏离因子 - 当前价格偏离N日均线的程度
 */
export function MADeviationFactor(period: number = 20): Factor {
  return {
    name: `ma_deviation_${period}`,
    calculate(bars: Bar[]): number {
      if (bars.length < period) return NaN;
      let sum = 0;
      for (let i = bars.length - period; i < bars.length; i++) {
        sum += bars[i].close;
      }
      const ma = sum / period;
      return (bars[bars.length - 1].close - ma) / ma;
    },
  };
}

/**
 * 成交量比率因子 - 近期成交量与长期成交量的比
 */
export function VolumeRatioFactor(shortPeriod: number = 5, longPeriod: number = 20): Factor {
  return {
    name: `volume_ratio_${shortPeriod}_${longPeriod}`,
    calculate(bars: Bar[]): number {
      if (bars.length < longPeriod) return NaN;
      let shortSum = 0;
      let longSum = 0;
      for (let i = bars.length - longPeriod; i < bars.length; i++) {
        longSum += bars[i].volume;
        if (i >= bars.length - shortPeriod) {
          shortSum += bars[i].volume;
        }
      }
      const shortAvg = shortSum / shortPeriod;
      const longAvg = longSum / longPeriod;
      return longAvg === 0 ? NaN : shortAvg / longAvg;
    },
  };
}

/** 因子打分结果 */
export interface FactorScore {
  symbol: string;
  scores: Record<string, number>;
  compositeScore: number;
}

/**
 * 多因子打分系统
 */
export class MultiFactorScorer {
  private factors: Array<{ factor: Factor; weight: number; ascending: boolean }> = [];

  /**
   * 添加因子
   * @param factor 因子
   * @param weight 权重
   * @param ascending true表示值越小越好(如PE), false表示值越大越好(如动量)
   */
  addFactor(factor: Factor, weight: number = 1, ascending: boolean = false): this {
    this.factors.push({ factor, weight, ascending });
    return this;
  }

  /**
   * 对多只股票进行因子打分
   */
  score(stockBars: Map<string, Bar[]>): FactorScore[] {
    const symbols = Array.from(stockBars.keys());

    // 计算每只股票的每个因子原始值
    const rawScores: Record<string, Record<string, number>> = {};
    for (const symbol of symbols) {
      const bars = stockBars.get(symbol)!;
      rawScores[symbol] = {};
      for (const { factor } of this.factors) {
        rawScores[symbol][factor.name] = factor.calculate(bars);
      }
    }

    // 对每个因子进行排名打分 (百分位排名)
    const normalizedScores: Record<string, Record<string, number>> = {};
    for (const symbol of symbols) {
      normalizedScores[symbol] = {};
    }

    for (const { factor, ascending } of this.factors) {
      // 过滤掉 NaN
      const validSymbols = symbols.filter(s => !isNaN(rawScores[s][factor.name]));
      const sorted = [...validSymbols].sort((a, b) => {
        const diff = rawScores[a][factor.name] - rawScores[b][factor.name];
        return ascending ? diff : -diff;
      });

      for (let i = 0; i < sorted.length; i++) {
        normalizedScores[sorted[i]][factor.name] = (sorted.length - i) / sorted.length;
      }

      // NaN 的给 0 分
      for (const s of symbols) {
        if (isNaN(rawScores[s][factor.name])) {
          normalizedScores[s][factor.name] = 0;
        }
      }
    }

    // 计算综合得分
    const results: FactorScore[] = symbols.map(symbol => {
      let compositeScore = 0;
      let totalWeight = 0;
      for (const { factor, weight } of this.factors) {
        compositeScore += (normalizedScores[symbol][factor.name] || 0) * weight;
        totalWeight += weight;
      }
      compositeScore = totalWeight > 0 ? compositeScore / totalWeight : 0;

      return {
        symbol,
        scores: normalizedScores[symbol],
        compositeScore,
      };
    });

    // 按综合得分降序排列
    results.sort((a, b) => b.compositeScore - a.compositeScore);
    return results;
  }

  /**
   * 选择得分最高的 N 只股票
   */
  selectTop(stockBars: Map<string, Bar[]>, topN: number): string[] {
    const scores = this.score(stockBars);
    return scores.slice(0, topN).map(s => s.symbol);
  }
}
