/**
 * 核心类型定义 - 股票量化回测系统
 */

/** K线数据 */
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

/** 订单 */
export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number; // limit order 时指定
  status: OrderStatus;
  filledPrice?: number;
  filledQuantity?: number;
  filledAt?: string;
  createdAt: string;
  commission: number;
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
  /** 手续费率 (如 0.001 = 0.1%) */
  commissionRate: number;
  /** 印花税率 (卖出时收取, 如 0.001 = 0.1%) */
  stampDutyRate: number;
  /** 滑点 (如 0.001 = 0.1%) */
  slippage: number;
  /** 起始日期 */
  startDate: string;
  /** 结束日期 */
  endDate: string;
  /** 基准代码 (用于比较) */
  benchmark?: string;
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
  pnl?: number; // 平仓时的盈亏
}

/** 策略上下文 - 策略在每个bar可以访问的信息 */
export interface StrategyContext {
  /** 当前日期 */
  currentDate: string;
  /** 当前持仓 */
  positions: Map<string, Position>;
  /** 当前现金 */
  cash: number;
  /** 投资组合总值 */
  totalValue: number;
  /** 获取指定股票的历史数据 */
  getBars(symbol: string): Bar[];
  /** 获取指定股票当前bar */
  getCurrentBar(symbol: string): Bar | undefined;
  /** 买入 */
  buy(symbol: string, quantity: number, price?: number): void;
  /** 卖出 */
  sell(symbol: string, quantity: number, price?: number): void;
  /** 按目标权重调仓 */
  targetPercent(symbol: string, percent: number): void;
  /** 全部平仓 */
  liquidate(symbol: string): void;
}

/** 策略接口 */
export interface Strategy {
  /** 策略名称 */
  name: string;
  /** 策略初始化，在回测开始时调用 */
  init?(ctx: StrategyContext): void;
  /** 每个交易日调用 */
  onBar(ctx: StrategyContext): void;
  /** 回测结束时调用 */
  onFinish?(ctx: StrategyContext): void;
}

/** 绩效指标 */
export interface PerformanceMetrics {
  /** 总收益率 */
  totalReturn: number;
  /** 年化收益率 */
  annualizedReturn: number;
  /** 夏普比率 (假设无风险利率3%) */
  sharpeRatio: number;
  /** 最大回撤 */
  maxDrawdown: number;
  /** 最大回撤持续天数 */
  maxDrawdownDays: number;
  /** 胜率 */
  winRate: number;
  /** 盈亏比 */
  profitLossRatio: number;
  /** 总交易次数 */
  totalTrades: number;
  /** 盈利交易次数 */
  winningTrades: number;
  /** 亏损交易次数 */
  losingTrades: number;
  /** 日均收益率 */
  avgDailyReturn: number;
  /** 收益率标准差 */
  dailyReturnStd: number;
  /** 年化波动率 */
  annualizedVolatility: number;
  /** Calmar比率 */
  calmarRatio: number;
  /** Sortino比率 */
  sortinoRatio: number;
}

/** 回测结果 */
export interface BacktestResult {
  /** 策略名称 */
  strategyName: string;
  /** 回测配置 */
  config: BacktestConfig;
  /** 绩效指标 */
  metrics: PerformanceMetrics;
  /** 每日投资组合快照 */
  portfolioHistory: PortfolioSnapshot[];
  /** 交易记录 */
  trades: Trade[];
  /** 基准每日收益 (如有) */
  benchmarkHistory?: { date: string; value: number }[];
}

/** 因子数据 */
export interface FactorData {
  symbol: string;
  date: string;
  value: number;
}

/** 因子定义 */
export interface Factor {
  /** 因子名称 */
  name: string;
  /** 计算因子值 */
  calculate(bars: Bar[]): number;
}

// ============================================
// API 和前端通用类型
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
  };
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
}

/** 绩效指标（与 PerformanceMetrics 相同，为了前端兼容） */
export type PerformanceMetricsResult = PerformanceMetrics;
