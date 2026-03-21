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
