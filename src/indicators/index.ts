/**
 * 技术指标库
 */
import { Bar } from '../core/types';

/**
 * 简单移动平均线 (SMA)
 */
export function SMA(bars: Bar[], period: number, field: keyof Bar = 'close'): number[] {
  const values = bars.map(b => Number(b[field]));
  const result: number[] = new Array(values.length).fill(NaN);

  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += values[i - j];
    }
    result[i] = sum / period;
  }
  return result;
}

/**
 * 指数移动平均线 (EMA)
 */
export function EMA(bars: Bar[], period: number, field: keyof Bar = 'close'): number[] {
  const values = bars.map(b => Number(b[field]));
  const result: number[] = new Array(values.length).fill(NaN);
  const multiplier = 2 / (period + 1);

  // 先用SMA作为第一个EMA值
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  result[period - 1] = sum / period;

  for (let i = period; i < values.length; i++) {
    result[i] = (values[i] - result[i - 1]) * multiplier + result[i - 1];
  }
  return result;
}

/**
 * MACD (Moving Average Convergence Divergence)
 * 返回 { macd, signal, histogram }
 */
export function MACD(
  bars: Bar[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
  const fastEma = EMA(bars, fastPeriod);
  const slowEma = EMA(bars, slowPeriod);

  const macdLine: number[] = new Array(bars.length).fill(NaN);
  for (let i = 0; i < bars.length; i++) {
    if (!isNaN(fastEma[i]) && !isNaN(slowEma[i])) {
      macdLine[i] = fastEma[i] - slowEma[i];
    }
  }

  // 计算 MACD 信号线 (MACD 的 EMA)
  const validMacd = macdLine.filter(v => !isNaN(v));
  const signalLine: number[] = new Array(bars.length).fill(NaN);
  const macdMultiplier = 2 / (signalPeriod + 1);

  let firstValidIndex = macdLine.findIndex(v => !isNaN(v));
  if (firstValidIndex >= 0 && validMacd.length >= signalPeriod) {
    let signalSum = 0;
    for (let i = 0; i < signalPeriod; i++) {
      signalSum += validMacd[i];
    }
    const signalStartIndex = firstValidIndex + signalPeriod - 1;
    signalLine[signalStartIndex] = signalSum / signalPeriod;

    for (let i = signalStartIndex + 1; i < bars.length; i++) {
      if (!isNaN(macdLine[i])) {
        signalLine[i] = (macdLine[i] - signalLine[i - 1]) * macdMultiplier + signalLine[i - 1];
      }
    }
  }

  // 柱状图
  const histogram: number[] = new Array(bars.length).fill(NaN);
  for (let i = 0; i < bars.length; i++) {
    if (!isNaN(macdLine[i]) && !isNaN(signalLine[i])) {
      histogram[i] = (macdLine[i] - signalLine[i]) * 2;
    }
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

/**
 * RSI (Relative Strength Index)
 */
export function RSI(bars: Bar[], period: number = 14): number[] {
  const closes = bars.map(b => b.close);
  const result: number[] = new Array(bars.length).fill(NaN);

  if (closes.length < period + 1) return result;

  // 计算价格变化
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  // 初始平均涨跌幅
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  result[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

  // 后续使用平滑方法
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i + 1] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }

  return result;
}

/**
 * 布林带 (Bollinger Bands)
 * 返回 { upper, middle, lower }
 */
export function BollingerBands(
  bars: Bar[],
  period: number = 20,
  stdDev: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = SMA(bars, period);
  const closes = bars.map(b => b.close);
  const upper: number[] = new Array(bars.length).fill(NaN);
  const lower: number[] = new Array(bars.length).fill(NaN);

  for (let i = period - 1; i < bars.length; i++) {
    if (isNaN(middle[i])) continue;
    let variance = 0;
    for (let j = 0; j < period; j++) {
      variance += Math.pow(closes[i - j] - middle[i], 2);
    }
    const std = Math.sqrt(variance / period);
    upper[i] = middle[i] + stdDev * std;
    lower[i] = middle[i] - stdDev * std;
  }

  return { upper, middle, lower };
}

/**
 * ATR (Average True Range)
 */
export function ATR(bars: Bar[], period: number = 14): number[] {
  const result: number[] = new Array(bars.length).fill(NaN);
  if (bars.length < 2) return result;

  const trueRanges: number[] = [bars[0].high - bars[0].low];
  for (let i = 1; i < bars.length; i++) {
    const tr = Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - bars[i - 1].close),
      Math.abs(bars[i].low - bars[i - 1].close)
    );
    trueRanges.push(tr);
  }

  // 初始 ATR 为 简单平均
  let atr = 0;
  for (let i = 0; i < period; i++) {
    atr += trueRanges[i];
  }
  atr /= period;
  result[period - 1] = atr;

  // 平滑
  for (let i = period; i < bars.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
    result[i] = atr;
  }

  return result;
}

/**
 * KDJ 指标
 */
export function KDJ(
  bars: Bar[],
  period: number = 9,
  kSmooth: number = 3,
  dSmooth: number = 3
): { k: number[]; d: number[]; j: number[] } {
  const kResult: number[] = new Array(bars.length).fill(NaN);
  const dResult: number[] = new Array(bars.length).fill(NaN);
  const jResult: number[] = new Array(bars.length).fill(NaN);

  if (bars.length < period) return { k: kResult, d: dResult, j: jResult };

  let prevK = 50;
  let prevD = 50;

  for (let i = period - 1; i < bars.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = 0; j < period; j++) {
      highest = Math.max(highest, bars[i - j].high);
      lowest = Math.min(lowest, bars[i - j].low);
    }

    const rsv = highest === lowest ? 50 : ((bars[i].close - lowest) / (highest - lowest)) * 100;
    const k = (2 / kSmooth) * rsv + (1 - 2 / kSmooth) * prevK;
    const d = (2 / dSmooth) * k + (1 - 2 / dSmooth) * prevD;
    const j = 3 * k - 2 * d;

    kResult[i] = k;
    dResult[i] = d;
    jResult[i] = j;

    prevK = k;
    prevD = d;
  }

  return { k: kResult, d: dResult, j: jResult };
}

/**
 * 成交量加权平均价格 (VWAP)
 */
export function VWAP(bars: Bar[]): number[] {
  const result: number[] = new Array(bars.length).fill(NaN);
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < bars.length; i++) {
    const typicalPrice = (bars[i].high + bars[i].low + bars[i].close) / 3;
    cumulativeTPV += typicalPrice * bars[i].volume;
    cumulativeVolume += bars[i].volume;
    result[i] = cumulativeVolume === 0 ? NaN : cumulativeTPV / cumulativeVolume;
  }

  return result;
}

/**
 * 获取指定 bar 位置的指标值 (辅助函数)
 */
export function getIndicatorValue(values: number[], index: number): number | undefined {
  if (index < 0 || index >= values.length || isNaN(values[index])) {
    return undefined;
  }
  return values[index];
}

/**
 * Parabolic SAR (抛物线转向指标)
 * 返回 SAR 值数组和趋势方向
 */
export function ParabolicSAR(
  bars: Bar[],
  afStart: number = 0.02,
  afIncrement: number = 0.02,
  afMax: number = 0.2
): { sar: number[]; trend: number[] } {  // trend: 1 = uptrend, -1 = downtrend
  const sar: number[] = new Array(bars.length).fill(NaN);
  const trend: number[] = new Array(bars.length).fill(0);

  if (bars.length < 2) return { sar, trend };

  // Initialize with first two bars
  let currentTrend = bars[1].close > bars[0].close ? 1 : -1;
  let currentSAR = currentTrend === 1 ? bars[0].low : bars[0].high;
  let extremePrice = currentTrend === 1 ? bars[1].high : bars[1].low;
  let af = afStart;

  sar[1] = currentSAR;
  trend[1] = currentTrend;

  for (let i = 2; i < bars.length; i++) {
    // Check for trend reversal
    if (currentTrend === 1) {
      // Uptrend - check if price breaks below SAR
      if (bars[i].low < currentSAR) {
        // Reversal to downtrend
        currentTrend = -1;
        currentSAR = extremePrice;  // Set SAR to highest high of uptrend
        extremePrice = bars[i].low;
        af = afStart;
      } else {
        // Continue uptrend
        currentSAR = currentSAR + af * (extremePrice - currentSAR);
        // SAR should not exceed the low of previous two bars
        currentSAR = Math.min(currentSAR, bars[i - 1].low, bars[i - 2].low);

        // Check for new extreme (new high)
        if (bars[i].high > extremePrice) {
          extremePrice = bars[i].high;
          af = Math.min(af + afIncrement, afMax);
        }
      }
    } else {
      // Downtrend - check if price breaks above SAR
      if (bars[i].high > currentSAR) {
        // Reversal to uptrend
        currentTrend = 1;
        currentSAR = extremePrice;  // Set SAR to lowest low of downtrend
        extremePrice = bars[i].high;
        af = afStart;
      } else {
        // Continue downtrend
        currentSAR = currentSAR + af * (extremePrice - currentSAR);
        // SAR should not be below the high of previous two bars
        currentSAR = Math.max(currentSAR, bars[i - 1].high, bars[i - 2].high);

        // Check for new extreme (new low)
        if (bars[i].low < extremePrice) {
          extremePrice = bars[i].low;
          af = Math.min(af + afIncrement, afMax);
        }
      }
    }

    sar[i] = currentSAR;
    trend[i] = currentTrend;
  }

  return { sar, trend };
}

/**
 * Dual Thrust Range Calculator
 * 计算每日的突破上下轨
 * 返回 { upper: 上轨, lower: 下轨, range: 波动范围 }
 */
export function DualThrustRange(
  bars: Bar[],
  k1: number = 0.5,
  k2: number = 0.5,
  lookback: number = 1  // 回看天数
): { upper: number[]; lower: number[]; range: number[] } {
  const upper: number[] = new Array(bars.length).fill(NaN);
  const lower: number[] = new Array(bars.length).fill(NaN);
  const range: number[] = new Array(bars.length).fill(NaN);

  if (bars.length < lookback + 1) return { upper, lower, range };

  for (let i = lookback; i < bars.length; i++) {
    // Find highest high and lowest low from previous lookback days
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    let highestClose = -Infinity;
    let lowestClose = Infinity;

    for (let j = 1; j <= lookback; j++) {
      highestHigh = Math.max(highestHigh, bars[i - j].high);
      lowestLow = Math.min(lowestLow, bars[i - j].low);
      highestClose = Math.max(highestClose, bars[i - j].close);
      lowestClose = Math.min(lowestClose, bars[i - j].close);
    }

    // Calculate range
    const r1 = highestHigh - lowestLow;  // High - Low
    const r2 = highestHigh - highestClose;  // High - Close
    const r3 = lowestClose - lowestLow;  // Close - Low
    const rangeValue = Math.max(r1, r2, r3);

    // Calculate upper and lower bands
    const openPrice = bars[i].open;
    upper[i] = openPrice + k1 * rangeValue;
    lower[i] = openPrice - k2 * rangeValue;
    range[i] = rangeValue;
  }

  return { upper, lower, range };
}

// Chan Theory exports
export { analyzeChanTheory } from './chan-theory';
export type { ProcessedBar, Fractal, Stroke, Segment, Pivot, BuySellPoint, ChanTheoryResult } from '../../packages/types';
