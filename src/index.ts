/**
 * 股票量化策略回测系统 - 主入口
 */

// 核心模块
export { BacktestEngine } from './core/engine';
export type {
  Bar,
  Order,
  OrderSide,
  OrderType,
  OrderStatus,
  Position,
  PortfolioSnapshot,
  BacktestConfig,
  Trade,
  StrategyContext,
  Strategy,
  PerformanceMetrics,
  BacktestResult,
  FactorData,
  Factor,
  RiskOrder,
  RiskOrderType,
} from './core/types';

// 数据加载
export { loadFromCsv, loadMultipleFromCsv, loadFromDirectory, ApiLoader, createBarsFromArray } from './data';
export type { CsvLoadOptions, ApiConfig, ApiLoadOptions, ApiFieldMapping } from './data';

// 技术指标
export {
  SMA,
  EMA,
  MACD,
  RSI,
  BollingerBands,
  ATR,
  KDJ,
  VWAP,
  ParabolicSAR,
  DualThrustRange,
  getIndicatorValue,
} from './indicators';

// 因子选股
export {
  MomentumFactor,
  VolatilityFactor,
  TurnoverFactor,
  MarketCapFactor,
  PEFactor,
  PBFactor,
  MADeviationFactor,
  VolumeRatioFactor,
  MultiFactorScorer,
} from './factors';
export type { FactorScore } from './factors';

// 可视化
export { generateReport, printSummary } from './visualization';

// 工具模块
export { logger, Logger, AppError, ValidationError, NotFoundError, DataError, tryCatch } from './lib/logger';
export type { LoggerConfig, LogLevel } from './lib/logger';

// 策略优化
export { compareStrategies, gridSearch, printComparison } from './optimizer';
export type { BacktestSummary } from './optimizer';

// 缠论策略
export { createChanTheoryStrategy, getChanTheoryAnalysis, analyzeChanTheory } from './strategies/chan-theory-strategy';
export type { ChanTheoryStrategyConfig } from './strategies/chan-theory-strategy';

// 缠论类型
export type {
  ProcessedBar,
  Fractal,
  Stroke,
  Segment,
  Pivot,
  BuySellPoint,
  ChanTheoryResult,
} from '../packages/types';
