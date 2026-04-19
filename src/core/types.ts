/**
 * 核心类型定义 - 股票量化回测系统
 *
 * 注意：所有类型已从 packages/types 包重新导出
 * 新代码请直接使用：import type { xxx } from '../../packages/types'
 */

// 重新导出共享类型（向后兼容）
export type {
  Bar,
  OrderSide,
  OrderType,
  OrderStatus,
  Order,
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
  StrategyType,
  StrategyParam,
  StrategyOption,
  DataSourceConfig,
  BacktestRequest,
  RiskOrder,
  RiskOrderType,
} from '../../packages/types';

// 本地扩展类型（如有）可以在这里添加
