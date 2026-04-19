/**
 * 缠论 (Chan Theory) 核心算法实现
 *
 * 包含：
 * 1. K 线包含处理
 * 2. 分型识别
 * 3. 笔的构建
 * 4. 线段构建
 * 5. 中枢构建
 * 6. 买卖点识别
 */

import type {
  Bar,
  ProcessedBar,
  Fractal,
  Stroke,
  Segment,
  Pivot,
  BuySellPoint,
  ChanTheoryResult,
  StrokeDirection,
  SegmentDirection,
} from '../../packages/types';

/**
 * 判断两根 K 线是否存在包含关系
 */
function hasInclude(bar1: Bar, bar2: Bar): boolean {
  return (
    (bar2.high <= bar1.high && bar2.low >= bar1.low) ||
    (bar1.high <= bar2.high && bar1.low >= bar2.low)
  );
}

/**
 * 处理包含 K 线
 * 方向：1=向上（当前趋势向上），-1=向下（当前趋势向下）
 */
function mergeBars(
  bars: Bar[],
  direction: 1 | -1
): ProcessedBar[] {
  const result: ProcessedBar[] = [];

  if (bars.length === 0) return result;

  // 初始化第一根 K 线
  let current: ProcessedBar = {
    date: bars[0].date,
    high: bars[0].high,
    low: bars[0].low,
    direction: 0,
    originalBars: [bars[0]],
  };

  for (let i = 1; i < bars.length; i++) {
    const bar = bars[i];

    // 判断趋势方向
    if (bar.high > current.high) {
      current.direction = 1;
    } else if (bar.low < current.low) {
      current.direction = -1;
    }

    // 检查包含关系
    if (hasInclude({ high: current.high, low: current.low, date: '', open: 0, close: 0, volume: 0 }, bar)) {
      // 存在包含，合并 K 线
      if (current.direction === 1) {
        // 向上趋势：取两者高点的高者，低点的低者
        current.high = Math.max(current.high, bar.high);
        current.low = Math.min(current.low, bar.low);
      } else if (current.direction === -1) {
        // 向下趋势：取两者高点的低者，低点的高者
        current.high = Math.min(current.high, bar.high);
        current.low = Math.max(current.low, bar.low);
      } else {
        // 方向未定，使用默认规则（向上处理）
        current.high = Math.max(current.high, bar.high);
        current.low = Math.min(current.low, bar.low);
      }
      current.originalBars.push(bar);
      current.date = bar.date;
    } else {
      // 无包含，保存当前 K 线并开始新的
      result.push(current);
      current = {
        date: bar.date,
        high: bar.high,
        low: bar.low,
        direction: current.direction,
        originalBars: [bar],
      };
    }
  }

  // 添加最后一根
  result.push(current);

  // 重新计算方向
  for (let i = 1; i < result.length; i++) {
    if (result[i].high > result[i - 1].high) {
      result[i].direction = 1;
    } else if (result[i].low < result[i - 1].low) {
      result[i].direction = -1;
    } else {
      result[i].direction = result[i - 1].direction;
    }
  }

  return result;
}

/**
 * 识别分型（顶分型和底分型）
 */
function identifyFractals(processedBars: ProcessedBar[]): Fractal[] {
  const fractals: Fractal[] = [];

  if (processedBars.length < 3) return fractals;

  for (let i = 1; i < processedBars.length - 1; i++) {
    const prev = processedBars[i - 1];
    const curr = processedBars[i];
    const next = processedBars[i + 1];

    // 顶分型：中间 K 线高点最高
    if (curr.high > prev.high && curr.high > next.high) {
      const firstBar = curr.originalBars[0];
      fractals.push({
        index: fractals.length,
        date: curr.date,
        price: curr.high,
        type: 'top',
        barIndex: firstBar ? barsIndexOf(firstBar, processedBars) : 0,
      });
    }

    // 底分型：中间 K 线低点最低
    if (curr.low < prev.low && curr.low < next.low) {
      const firstBar = curr.originalBars[0];
      fractals.push({
        index: fractals.length,
        date: curr.date,
        price: curr.low,
        type: 'bottom',
        barIndex: firstBar ? barsIndexOf(firstBar, processedBars) : 0,
      });
    }
  }

  // 过滤相邻同类型分型，只保留极值
  return filterFractals(fractals);
}

/**
 * 辅助函数：获取原始 K 线索引
 */
function barsIndexOf(bar: Bar, allProcessed: ProcessedBar[]): number {
  let idx = 0;
  for (const pb of allProcessed) {
    for (const ob of pb.originalBars) {
      if (ob === bar || ob.date === bar.date) return idx;
      idx++;
    }
  }
  return 0;
}

/**
 * 过滤相邻的同类型分型
 */
function filterFractals(fractals: Fractal[]): Fractal[] {
  if (fractals.length === 0) return fractals;

  const filtered: Fractal[] = [fractals[0]];

  for (let i = 1; i < fractals.length; i++) {
    const curr = fractals[i];
    const prev = filtered[filtered.length - 1];

    if (curr.type === prev.type) {
      // 同类型分型，保留极值
      if (curr.type === 'top' && curr.price > prev.price) {
        filtered[filtered.length - 1] = curr;
      } else if (curr.type === 'bottom' && curr.price < prev.price) {
        filtered[filtered.length - 1] = curr;
      }
      // 否则保留前一个，跳过当前
    } else {
      // 不同类型，直接添加
      filtered.push(curr);
    }
  }

  return filtered;
}

/**
 * 构建笔
 * 规则：
 * 1. 顶分型和底分型之间至少有 1 根独立 K 线
 * 2. 顶底分型交替出现
 * 3. 向上笔：底→顶；向下笔：顶→底
 */
function buildStrokes(fractals: Fractal[], bars: Bar[]): Stroke[] {
  const strokes: Stroke[] = [];

  if (fractals.length < 2) return strokes;

  // 确保第一个分型是底分型（向上笔起点）或顶分型（向下笔起点）
  let startIndex = 0;

  // 如果前两个分型类型相同，找到第一个不同的
  for (let i = 0; i < fractals.length - 1; i++) {
    if (fractals[i].type !== fractals[i + 1].type) {
      startIndex = i;
      break;
    }
  }

  for (let i = startIndex; i < fractals.length - 1; i++) {
    const startFractal = fractals[i];
    const endFractal = fractals[i + 1];

    // 检查是否是有效的笔（顶底交替）
    if (startFractal.type === endFractal.type) continue;

    // 检查 K 线索引间隔（至少 1 根独立 K 线）
    const indexDiff = Math.abs(endFractal.barIndex - startFractal.barIndex);
    if (indexDiff < 2) continue;

    // 确定方向
    const direction: StrokeDirection = startFractal.type === 'bottom' ? 1 : -1;

    // 验证价格有效性
    if (direction === 1 && endFractal.price <= startFractal.price) continue;
    if (direction === -1 && endFractal.price >= startFractal.price) continue;

    // 获取笔覆盖的 K 线
    const startIdx = Math.min(startFractal.barIndex, endFractal.barIndex);
    const endIdx = Math.max(startFractal.barIndex, endFractal.barIndex);
    const strokeBars = bars.slice(startIdx, endIdx + 1);

    strokes.push({
      id: `stroke_${strokes.length}`,
      startFractal,
      endFractal,
      direction,
      bars: strokeBars,
      startDate: startFractal.date,
      endDate: endFractal.date,
      startPoint: startFractal.price,
      endPoint: endFractal.price,
    });
  }

  return strokes;
}

/**
 * 构建线段
 * 规则：至少 3 笔构成线段
 */
function buildSegments(strokes: Stroke[]): Segment[] {
  const segments: Segment[] = [];

  if (strokes.length < 3) return segments;

  // 每 3 笔尝试构成线段
  let i = 0;
  while (i < strokes.length - 2) {
    const strokeGroup = strokes.slice(i, i + 3);

    // 检查方向是否一致（第一笔和第三笔同向）
    if (strokeGroup[0].direction === strokeGroup[2].direction) {
      const direction: SegmentDirection = strokeGroup[0].direction;

      segments.push({
        id: `segment_${segments.length}`,
        strokes: strokeGroup,
        direction,
        startDate: strokeGroup[0].startDate,
        endDate: strokeGroup[2].endDate,
        startPoint: strokeGroup[0].startPoint,
        endPoint: strokeGroup[2].endPoint,
      });

      i += 3;
    } else {
      i++;
    }
  }

  return segments;
}

/**
 * 构建中枢
 * 规则：至少 3 个重叠的次级别走势（线段）
 * 中枢区间 = [所有线段低点的最大值，所有线段高点的最小值]
 */
function buildPivots(segments: Segment[]): Pivot[] {
  const pivots: Pivot[] = [];

  if (segments.length < 3) return pivots;

  // 滑动窗口，检查 3 个连续线段是否有重叠
  for (let i = 0; i < segments.length - 2; i++) {
    const segGroup = segments.slice(i, i + 3);

    // 计算重叠区间
    // 向上线段：高点为 endPoint，低点为 startPoint
    // 向下线段：高点为 startPoint，低点为 endPoint
    let maxLow = -Infinity;
    let minHigh = Infinity;

    for (const seg of segGroup) {
      const high = seg.direction === 1 ? seg.endPoint : seg.startPoint;
      const low = seg.direction === 1 ? seg.startPoint : seg.endPoint;

      maxLow = Math.max(maxLow, low);
      minHigh = Math.min(minHigh, high);
    }

    // 检查是否有重叠
    if (maxLow < minHigh) {
      // 有效中枢
      pivots.push({
        id: `pivot_${pivots.length}`,
        segments: segGroup,
        high: minHigh,
        low: maxLow,
        startDate: segGroup[0].startDate,
        endDate: segGroup[segGroup.length - 1].endDate,
      });
    }
  }

  return pivots;
}

/**
 * 识别买卖点
 *
 * 一类买点：趋势底背离，价格创新低但力度减弱
 * 二类买点：一类买点后回踩不破前低
 * 三类买点：突破中枢后回踩不进入中枢
 *
 * 一类卖点：趋势顶背离
 * 二类卖点：一类卖点后反弹不过前高
 * 三类卖点：跌破中枢后反弹不进入中枢
 */
function identifyBuySellPoints(
  strokes: Stroke[],
  pivots: Pivot[]
): BuySellPoint[] {
  const buySellPoints: BuySellPoint[] = [];

  if (strokes.length < 2) return buySellPoints;

  // 识别一类买点（底背离）
  for (let i = 2; i < strokes.length; i += 2) {
    const prevStroke = strokes[i - 2];
    const currStroke = strokes[i];

    // 都是向上笔
    if (prevStroke.direction === 1 && currStroke.direction === 1) {
      // 价格创新低
      if (currStroke.startPoint < prevStroke.startPoint) {
        // 简化：假设力度减弱（实际需要用 MACD 等指标判断）
        buySellPoints.push({
          type: 'buy1',
          date: currStroke.startDate,
          price: currStroke.startPoint,
          fractal: currStroke.startFractal,
        });
      }
    }

    // 识别一类卖点（顶背离）
    if (prevStroke.direction === -1 && currStroke.direction === -1) {
      if (currStroke.startPoint > prevStroke.startPoint) {
        buySellPoints.push({
          type: 'sell1',
          date: currStroke.startDate,
          price: currStroke.startPoint,
          fractal: currStroke.startFractal,
        });
      }
    }
  }

  // 识别二类买点（回踩不破前低）
  for (let i = 1; i < strokes.length; i++) {
    const stroke = strokes[i];
    const prevStroke = strokes[i - 1];

    // 向下笔回踩
    if (stroke.direction === -1 && prevStroke.direction === 1) {
      // 检查是否在前一类买点之上
      const buy1 = buySellPoints.find(bp => bp.type === 'buy1');
      if (buy1 && stroke.endPoint > buy1.price) {
        buySellPoints.push({
          type: 'buy2',
          date: stroke.endDate,
          price: stroke.endPoint,
          fractal: stroke.endFractal,
        });
      }
    }
  }

  // 识别二类卖点（反弹不过前高）
  for (let i = 1; i < strokes.length; i++) {
    const stroke = strokes[i];
    const prevStroke = strokes[i - 1];

    // 向上笔反弹
    if (stroke.direction === 1 && prevStroke.direction === -1) {
      const sell1 = buySellPoints.find(bp => bp.type === 'sell1');
      if (sell1 && stroke.endPoint < sell1.price) {
        buySellPoints.push({
          type: 'sell2',
          date: stroke.endDate,
          price: stroke.endPoint,
          fractal: stroke.endFractal,
        });
      }
    }
  }

  // 识别三类买卖点（中枢突破回踩）
  for (const pivot of pivots) {
    // 找到中枢后的第一个向上/向下笔
    const pivotEndDate = pivot.endDate;

    for (let i = 0; i < strokes.length; i++) {
      const stroke = strokes[i];

      // 中枢后的笔
      if (stroke.startDate > pivotEndDate) {
        // 三类买点：向上突破后，向下回踩不进入中枢
        if (stroke.direction === 1 && stroke.startPoint > pivot.high) {
          // 检查后续是否有回踩
          const nextStroke = strokes[i + 1];
          if (nextStroke && nextStroke.direction === -1 && nextStroke.endPoint > pivot.high) {
            buySellPoints.push({
              type: 'buy3',
              date: nextStroke.endDate,
              price: nextStroke.endPoint,
              fractal: nextStroke.endFractal,
              pivot,
            });
          }
          break;
        }

        // 三类卖点：向下突破后，向上回踩不进入中枢
        if (stroke.direction === -1 && stroke.startPoint < pivot.low) {
          const nextStroke = strokes[i + 1];
          if (nextStroke && nextStroke.direction === 1 && nextStroke.endPoint < pivot.low) {
            buySellPoints.push({
              type: 'sell3',
              date: nextStroke.endDate,
              price: nextStroke.endPoint,
              fractal: nextStroke.endFractal,
              pivot,
            });
          }
          break;
        }
      }
    }
  }

  return buySellPoints;
}

/**
 * 主函数：执行完整的缠论分析
 */
export function analyzeChanTheory(bars: Bar[]): ChanTheoryResult {
  // 1. K 线包含处理
  const processedBars = mergeBars(bars, 1);

  // 2. 识别分型
  const fractals = identifyFractals(processedBars);

  // 3. 构建笔
  const strokes = buildStrokes(fractals, bars);

  // 4. 构建线段
  const segments = buildSegments(strokes);

  // 5. 构建中枢
  const pivots = buildPivots(segments);

  // 6. 识别买卖点
  const buySellPoints = identifyBuySellPoints(strokes, pivots);

  return {
    processedBars,
    fractals,
    strokes,
    segments,
    pivots,
    buySellPoints,
  };
}

// 导出辅助函数供测试使用
export {
  mergeBars,
  identifyFractals,
  buildStrokes,
  buildSegments,
  buildPivots,
  identifyBuySellPoints,
  filterFractals,
};
