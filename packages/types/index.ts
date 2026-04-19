/**
 * 共享类型定义
 * 前后端共用的类型系统
 */

// ============================================
// 核心回测类型
// ============================================

/** K 线数据 */
export interface Bar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  /** 可选的额外字段，如换手率、市值等 */
  [key: string]: string | number | undefined;
}

/** 订单方向 */
export type OrderSide = 'buy' | 'sell';

/** 订单类型 */
export type OrderType = 'market' | 'limit';

/** 订单状态 */
export type OrderStatus = 'pending' | 'filled' | 'cancelled';

/** 止损/止盈订单类型 */
export type RiskOrderType = 'stop-loss' | 'take-profit' | 'trailing-stop';

/** 订单 */
export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  status: OrderStatus;
  filledPrice?: number;
  filledQuantity?: number;
  filledAt?: string;
  createdAt: string;
  commission: number;
  /** 关联的止损/止盈订单 ID */
  riskOrderId?: string;
}

/** 止损/止盈订单 */
export interface RiskOrder {
  id: string;
  symbol: string;
  type: RiskOrderType;
  /** 止损/止盈触发价格（固定值） */
  triggerPrice?: number;
  /** 追踪止损的触发差价 */
  triggerDelta?: number;
  /** 卖出数量，默认为全部 */
  quantity?: number;
  /** 创建时的参考价格 */
  referencePrice: number;
  /** 最高价（用于追踪止损） */
  highestPrice?: number;
  status: OrderStatus;
  triggeredAt?: string;
}

/** 持仓 */
export interface Position {
  symbol: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
}

/** 投资组合快照 */
export interface PortfolioSnapshot {
  date: string;
  totalValue: number;
  cash: number;
  positionsValue: number;
  positions: Position[];
  dailyReturn: number;
}

/** 回测配置 */
export interface BacktestConfig {
  /** 初始资金 */
  initialCapital: number;
  /** 手续费率 */
  commissionRate: number;
  /** 印花税率 */
  stampDutyRate: number;
  /** 滑点 */
  slippage: number;
  /** 起始日期 */
  startDate: string;
  /** 结束日期 */
  endDate: string;
  /** 基准代码 */
  benchmark?: string;
  /** 风险控制配置 */
  riskControl?: {
    /** 全局止损：买入价下跌百分比触发 */
    stopLossPercent?: number;
    /** 全局止盈：买入价上涨百分比触发 */
    takeProfitPercent?: number;
    /** 追踪止损：从最高点下跌百分比触发 */
    trailingStopPercent?: number;
  };
}

/** 交易记录 */
export interface Trade {
  id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  price: number;
  commission: number;
  date: string;
  pnl?: number;
}

/** 策略上下文 */
export interface StrategyContext {
  currentDate: string;
  positions: Map<string, Position>;
  cash: number;
  totalValue: number;
  getBars(symbol: string): Bar[];
  getCurrentBar(symbol: string): Bar | undefined;
  buy(symbol: string, quantity: number, price?: number): void;
  sell(symbol: string, quantity: number, price?: number): void;
  targetPercent(symbol: string, percent: number): void;
  liquidate(symbol: string): void;
  /** 设置止损：为指定持仓设置止损价格 */
  setStopLoss(symbol: string, triggerPrice: number, quantity?: number): void;
  /** 设置止盈：为指定持仓设置止盈价格 */
  setTakeProfit(symbol: string, triggerPrice: number, quantity?: number): void;
  /** 设置追踪止损：从最高点下跌指定百分比或差价时触发 */
  setTrailingStop(symbol: string, deltaPercent: number, quantity?: number): void;
  /** 取消指定股票的所有止损止盈订单 */
  cancelRiskOrders(symbol: string): void;
}

/** 策略接口 */
export interface Strategy {
  name: string;
  init?(ctx: StrategyContext): void;
  onBar(ctx: StrategyContext): void;
  onFinish?(ctx: StrategyContext): void;
}

/** 绩效指标 */
export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownDays: number;
  winRate: number;
  profitLossRatio: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgDailyReturn: number;
  dailyReturnStd: number;
  annualizedVolatility: number;
  calmarRatio: number;
  sortinoRatio: number;
  /** 基准收益率 */
  benchmarkReturn?: number;
  /** 超额收益 */
  excessReturn?: number;
  /** 信息比率 */
  informationRatio?: number;
  /** 跟踪误差 */
  trackingError?: number;
  /** 基准胜率 */
  benchmarkWinRate?: number;
}

/** 回测结果 */
export interface BacktestResult {
  strategyName: string;
  config: BacktestConfig;
  metrics: PerformanceMetrics;
  portfolioHistory: PortfolioSnapshot[];
  trades: Trade[];
  benchmarkHistory?: { date: string; value: number }[];
}

// ============================================
// 策略类型定义
// ============================================

/** 策略类型 */
export type StrategyType =
  | 'ma-crossover'
  | 'macd'
  | 'rsi'
  | 'bollinger'
  | 'multi-factor'
  | 'dual-thrust'
  | 'parabolic-sar';

/** 策略参数配置 */
export interface StrategyParam {
  key: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

/** 策略选项 */
export interface StrategyOption {
  type: StrategyType;
  name: string;
  description: string;
  params: StrategyParam[];
}

// ============================================
// 数据源类型定义
// ============================================

/** 数据源配置 */
export interface DataSourceConfig {
  type: 'csv-file' | 'csv-directory' | 'mock' | 'online' | 'sector';
  filePath?: string;
  symbols?: string[];
  onlineConfig?: {
    source: 'netease' | 'eastmoney' | 'sina' | 'tushare';
    symbolsStr: string;
    startDate: string;
    endDate: string;
    token?: string;
  };
}

/** 回测请求参数 */
export interface BacktestRequest {
  strategy: StrategyType;
  strategyParams: Record<string, number>;
  dataSource: DataSourceConfig;
  config: {
    initialCapital: number;
    commissionRate: number;
    stampDutyRate: number;
    slippage: number;
    /** 风险控制配置 */
    riskControl?: {
      stopLossPercent?: number;
      takeProfitPercent?: number;
      trailingStopPercent?: number;
    };
  };
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
}

// ============================================
// 因子类型定义
// ============================================

/** 因子数据 */
export interface FactorData {
  symbol: string;
  date: string;
  value: number;
}

/** 因子定义 */
export interface Factor {
  name: string;
  calculate(bars: Bar[]): number;
}

/** 因子打分结果 */
export interface FactorScore {
  symbol: string;
  scores: Record<string, number>;
  compositeScore: number;
}

// ============================================
// 板块类型定义
// ============================================

/** 板块信息 */
export interface SectorInfo {
  code: string;
  name: string;
  symbolCount: number;
  symbols: string[];
}

// ============================================
// 缠论类型定义
// ============================================

/** 处理后的 K 线（包含处理后） */
export interface ProcessedBar {
  date: string;
  high: number;
  low: number;
  direction: 1 | -1 | 0; // 1=上涨，-1=下跌，0=中性
  originalBars: Bar[]; // 包含的原始 K 线
}

/** 分型类型 */
export type FractalType = 'top' | 'bottom';

/** 分型 */
export interface Fractal {
  index: number;
  date: string;
  price: number;
  type: FractalType;
  barIndex: number; // 在原始 bars 中的索引
}

/** 笔的方向 */
export type StrokeDirection = 1 | -1; // 1=向上笔，-1=向下笔

/** 笔 */
export interface Stroke {
  id: string;
  startFractal: Fractal;
  endFractal: Fractal;
  direction: StrokeDirection;
  bars: Bar[]; // 笔覆盖的原始 K 线
  startDate: string;
  endDate: string;
  startPoint: number;
  endPoint: number;
}

/** 线段方向 */
export type SegmentDirection = 1 | -1;

/** 线段 */
export interface Segment {
  id: string;
  strokes: Stroke[];
  direction: SegmentDirection;
  startDate: string;
  endDate: string;
  startPoint: number;
  endPoint: number;
}

/** 中枢 */
export interface Pivot {
  id: string;
  segments: Segment[];
  high: number; // 中枢上沿（所有线段低点的最大值）
  low: number;  // 中枢下沿（所有线段高点的最小值）
  startDate: string;
  endDate: string;
}

/** 买卖点类型 */
export type BuySellPointType = 'buy1' | 'buy2' | 'buy3' | 'sell1' | 'sell2' | 'sell3';

/** 买卖点 */
export interface BuySellPoint {
  type: BuySellPointType;
  date: string;
  price: number;
  fractal: Fractal; // 关联的分型
  pivot?: Pivot; // 关联的中枢
}

/** 缠论分析结果 */
export interface ChanTheoryResult {
  processedBars: ProcessedBar[];
  fractals: Fractal[];
  strokes: Stroke[];
  segments: Segment[];
  pivots: Pivot[];
  buySellPoints: BuySellPoint[];
}
