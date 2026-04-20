# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 快速命令

```bash
# 构建
npm run build

# 运行测试
npm test           # 监视模式
npm run test:run   # 单次运行

# 启动后端 API 服务器
npm run server

# 运行示例策略
npm run example:ma      # 双均线交叉
npm run example:factor  # 多因子选股

# 类型检查
npm run lint
```

**Web UI 开发**:
```bash
cd web && npm run dev
```

## 架构概览

本项目是 **QuantX 股票量化回测系统**，采用前后端分离架构：

```
stock-backtest/
├── src/
│   ├── core/           # 回测引擎核心 (engine.ts, types.ts)
│   ├── indicators/     # 技术指标库 (SMA, EMA, MACD, RSI, 布林带，ATR, KDJ, 缠论)
│   ├── factors/        # 因子选股 (动量、波动率、多因子打分)
│   ├── strategies/     # 策略实现 (缠论策略等)
│   ├── data/           # 数据加载器 (CSV, 在线 API)
│   ├── server/         # Express REST API
│   └── visualization/  # HTML 报告生成
├── web/                # React + Vite + TypeScript 前端
│   └── src/components/ # Dashboard, Sidebar, ChartGrid, MetricsCards
└── examples/           # 命令行示例脚本
```

### 数据流

1. **数据源** → `src/data/` (CSV 加载器 / 在线 API 加载器)
2. **策略逻辑** → `src/strategies/` (调用 `src/indicators/` 或 `src/factors/`)
3. **回测引擎** → `src/core/engine.ts` (撮合交易、计算绩效)
4. **API 服务** → `src/server/index.ts` (暴露 REST 接口给前端)
5. **前端展示** → `web/src/components/Dashboard.tsx` (ECharts 可视化)

### 核心类型定义

所有核心类型定义在 `src/core/types.ts`:
- `Bar` - K 线数据结构
- `BacktestConfig` - 回测配置
- `BacktestResult` - 回测结果
- `Strategy` / `StrategyContext` - 策略接口

### 策略开发

添加新策略的步骤:
1. 在 `src/server/index.ts` 创建策略工厂函数
2. 在 `web/src/types/backtest.ts` 的 `STRATEGY_OPTIONS` 添加配置
3. 在 `src/server/index.ts` 的 `handleBacktest` 添加路由

### 数据源

系统支持 4 种数据源:
- 模拟数据 (随机生成)
- CSV 单文件
- CSV 目录 (批量加载)
- 在线获取 (东方财富/新浪财经/Tushare API)
