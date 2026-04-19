# 止损止盈风险控制功能

## 📋 概述

回测引擎现已支持完整的止损止盈风险控制功能，包括：

- **固定止损**: 价格跌破指定触发价时自动卖出
- **固定止盈**: 价格涨破指定触发价时自动卖出
- **追踪止损**: 从最高点下跌指定百分比时自动卖出
- **全局止损止盈**: 配置级别的风险控制，自动应用于所有持仓

---

## 🚀 使用方法

### 1. 固定止损 (Stop Loss)

```typescript
import { BacktestEngine } from './src/core/engine';

const strategy: Strategy = {
  name: 'MA Crossover + Stop Loss',
  onBar(ctx: StrategyContext) {
    const bar = ctx.getCurrentBar('000001');
    const position = ctx.positions.get('000001');

    // 买入
    if (!position && bar) {
      const qty = Math.floor(ctx.cash / bar.close);
      ctx.buy('000001', qty);

      // 设置止损：买入价下跌 5% 触发
      ctx.setStopLoss('000001', bar.close * 0.95);
    }
  },
};
```

### 2. 固定止盈 (Take Profit)

```typescript
// 买入时设置止盈
ctx.buy('000001', qty);

// 设置止盈：买入价上涨 20% 触发
ctx.setTakeProfit('000001', bar.close * 1.20);
```

### 3. 追踪止损 (Trailing Stop)

```typescript
// 买入时设置追踪止损
ctx.buy('000001', qty);

// 设置追踪止损：从最高点下跌 8% 触发
ctx.setTrailingStop('000001', 0.08);
```

追踪止损会自动跟踪持仓期间的最高价，当价格从最高点下跌指定百分比时触发卖出。

### 4. 全局止损止盈配置

```typescript
const engine = new BacktestEngine({
  initialCapital: 1000000,
  riskControl: {
    stopLossPercent: 0.05,      // 全局 5% 止损
    takeProfitPercent: 0.15,    // 全局 15% 止盈
    trailingStopPercent: 0.08,  // 全局 8% 追踪止损
  },
});
```

全局配置会自动应用于所有持仓，无需在策略中单独设置。

---

## 📊 API 详解

### StrategyContext 新增方法

| 方法 | 参数 | 说明 |
|------|------|------|
| `setStopLoss(symbol, triggerPrice, quantity?)` | symbol: 股票代码<br>triggerPrice: 触发价格<br>quantity: 可选，卖出数量 | 设置固定止损订单 |
| `setTakeProfit(symbol, triggerPrice, quantity?)` | symbol: 股票代码<br>triggerPrice: 触发价格<br>quantity: 可选，卖出数量 | 设置固定止盈订单 |
| `setTrailingStop(symbol, deltaPercent, quantity?)` | symbol: 股票代码<br>deltaPercent: 从最高点下跌的百分比<br>quantity: 可选，卖出数量 | 设置追踪止损订单 |
| `cancelRiskOrders(symbol)` | symbol: 股票代码 | 取消指定股票的所有止损止盈订单 |

### BacktestConfig 新增配置

```typescript
interface BacktestConfig {
  // ... 原有配置

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
```

---

## 💡 策略示例

### 示例 1: 双均线交叉 + 止损止盈

```typescript
function createMAStrategy(shortPeriod: number, longPeriod: number): Strategy {
  return {
    name: `MA Crossover + Risk Control`,
    onBar(ctx: StrategyContext) {
      const bars = ctx.getBars('000001');
      // ... 计算均线

      // 金叉买入
      if (goldenCross && !position) {
        ctx.buy('000001', qty);
        // 设置 5% 止损，15% 止盈
        ctx.setStopLoss('000001', bar.close * 0.95);
        ctx.setTakeProfit('000001', bar.close * 1.15);
      }

      // 死叉卖出
      if (deathCross && position) {
        ctx.sell('000001', position.quantity);
      }
    },
  };
}
```

### 示例 2: 追踪止损趋势策略

```typescript
function createTrendFollowingStrategy(): Strategy {
  return {
    name: 'Trend Following with Trailing Stop',
    onBar(ctx: StrategyContext) {
      const bar = ctx.getCurrentBar('000001');
      const position = ctx.positions.get('000001');

      // 突破买入
      if (breakout && !position) {
        ctx.buy('000001', qty);
        // 设置 10% 追踪止损，让利润奔跑
        ctx.setTrailingStop('000001', 0.10);
      }

      // 趋势反转卖出
      if (trendReversal && position) {
        ctx.sell('000001', position.quantity);
      }
    },
  };
}
```

### 示例 3: 全局风险控制

```typescript
// 配置严格的风险控制
const engine = new BacktestEngine({
  initialCapital: 1000000,
  commissionRate: 0.0003,
  slippage: 0.001,
  riskControl: {
    stopLossPercent: 0.05,      // 任何持仓亏损 5% 自动止损
    takeProfitPercent: 0.20,    // 任何持仓盈利 20% 自动止盈
  },
});

// 策略只需关注买入信号，风险控制自动执行
const strategy: Strategy = {
  name: 'Simple Long',
  onBar(ctx: StrategyContext) {
    if (buySignal && !ctx.positions.has('000001')) {
      ctx.buy('000001', qty);
      // 无需手动设置止损，全局配置会自动处理
    }
  },
};
```

---

## ⚠️ 注意事项

### 1. 触发时机

- 止损止盈订单在每日的 `low` 和 `high` 之间检查
- 如果当日价格区间穿过触发价，订单会在当日执行
- 执行价格为触发价（理想情况），实际可能略有滑点

### 2. 订单优先级

当同时存在多个止损止盈订单时：

1. 全局止损止盈优先检查
2. 策略设置的止损止盈随后检查
3. 同一股票的多个订单会合并处理

### 3. 清仓处理

当持仓被全部卖出时：

- 相关的止损止盈订单自动取消
- 成本价记录自动清除

### 4. 追踪止损特性

- 追踪止损只会向上调整（对于多头持仓）
- 一旦最高价更新，触发价不会下调
- 适合趋势跟踪策略

---

## 📈 测试用例

运行测试验证功能：

```bash
npm run test:run
```

测试覆盖：

- ✅ 固定止损触发
- ✅ 固定止盈触发
- ✅ 追踪止损触发
- ✅ 全局止损配置
- ✅ 全局止盈配置
- ✅ 边界情况处理

---

## 📁 示例代码

运行完整示例：

```bash
npx ts-node examples/stop-loss-profit.ts
```

示例包含：

1. 双均线交叉 + 固定止损止盈
2. 追踪止损趋势策略
3. 全局止损配置演示

---

## 🔧 技术实现

### 核心文件修改

| 文件 | 修改内容 |
|------|----------|
| `packages/types/index.ts` | 新增 `RiskOrder`、`RiskOrderType` 类型，扩展 `StrategyContext` 和 `BacktestConfig` |
| `src/core/engine.ts` | 实现止损止盈订单处理和全局风险控制逻辑 |
| `src/core/types.ts` | 重新导出新增类型 |
| `src/server/index.ts` | 更新策略示例，演示止损止盈用法 |
| `src/__tests__/engine.test.ts` | 添加止损止盈功能测试 |

### 订单类型

```typescript
type RiskOrderType = 'stop-loss' | 'take-profit' | 'trailing-stop';

interface RiskOrder {
  id: string;
  symbol: string;
  type: RiskOrderType;
  triggerPrice?: number;      // 触发价格（固定止损/止盈）
  triggerDelta?: number;      // 触发差价（追踪止损）
  quantity?: number;          // 卖出数量
  referencePrice: number;     // 参考价格
  highestPrice?: number;      // 最高价（追踪止损用）
  status: OrderStatus;
  triggeredAt?: string;
}
```

---

## 🎯 最佳实践

1. **合理设置止损幅度**: 根据股票波动率调整，过小容易频繁触发，过大失去保护意义
2. **结合技术指标**: 在支撑位下方设置止损，阻力位下方设置止盈
3. **追踪止损适合趋势**: 在强势上涨趋势中，使用追踪止损让利润奔跑
4. **全局 + 个别结合**: 可以同時使用全局配置和策略级别的止损止盈

---

## 📖 相关文档

- [项目总览](PROJECT_OVERVIEW.md)
- [回测引擎详解](ENGINE.md)
- [策略开发指南](STRATEGY_GUIDE.md)
