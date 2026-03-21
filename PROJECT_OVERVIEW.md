# QuantX 股票量化策略回测系统 - 项目总览

## 🎯 项目结构

```
stock-backtest/
├── 📦 核心回测引擎 (TypeScript)
│   ├── src/core/          - 回测引擎、类型定义
│   ├── src/indicators/    - 技术指标 (SMA, EMA, MACD, RSI, 布林带等)
│   ├── src/factors/       - 因子选股 (动量、波动率、多因子打分)
│   ├── src/data/          - 数据加载 (CSV, API)
│   └── src/visualization/ - HTML 报告生成
│
├── 🌐 Web UI (React + Vite)
│   ├── web/
│   │   ├── src/components/
│   │   │   ├── Sidebar.tsx        - 策略配置面板
│   │   │   ├── Dashboard.tsx      - 主仪表盘
│   │   │   ├── MetricsCards.tsx   - 绩效卡片
│   │   │   ├── ChartGrid.tsx      - ECharts 图表组
│   │   │   └── TradeTable.tsx     - 交易记录表格
│   │   ├── src/types/             - TypeScript 类型定义
│   │   └── src/index.css          - 深色金融主题 Design System
│   │
│   └── 🎨 设计特色
│       ├── 深蓝/黑色背景 + 金色点缀
│       ├── 红涨绿跌配色
│       ├── 流畅动画过渡
│       └── 专业金融可视化
│
├── 🔌 API 服务器 (Express)
│   └── src/server/index.ts  - RESTful API，连接前后端
│
└── 📚 示例策略
    ├── examples/ma-crossover.ts     - 双均线策略
    └── examples/factor-selection.ts - 多因子选股
```

## 🚀 快速开始

### 方式 1: 命令行运行（仅回测引擎）
```bash
# 双均线策略示例
npm run example:ma

# 多因子选股示例
npm run example:factor
```

### 方式 2: Web 界面（推荐）
```bash
# Windows 一键启动
start-web.bat

# 或手动启动
npm run server    # 终端 1: 后端 API
cd web && npm dev # 终端 2: 前端 UI
```

访问 http://localhost:5173

### 方式 3: 在线获取数据（新功能）

在 Web 界面中：
1. 左侧面板 → 数据来源 → 选择"**在线获取**"
2. 选择数据源：东方财富（推荐）/ 新浪财经 / Tushare
3. 输入股票代码：`600000, 600036, 000001`
4. 设置日期范围：`20230101` - `20231231`
5. 点击"**获取数据**"按钮
6. 等待数据加载完成
7. 运行回测

## 📊 支持策略

| 策略类型 | 名称 | 参数 |
|---------|------|------|
| **技术指标** | 双均线交叉 | 短期周期、长期周期 |
| | MACD | 快线、慢线、信号线周期 |
| | RSI | 周期、超买/超卖阈值 |
| | 布林带 | 均线周期、标准差倍数 |
| **因子选股** | 多因子打分 | 动量/波动率/均线偏离/量比权重、持仓数量 |

## 📈 绩效指标

系统计算并展示以下指标：

- **收益类**: 总收益率、年化收益率、日均收益率
- **风险类**: 最大回撤、回撤天数、年化波动率
- **风险调整收益**: 夏普比率、Sortino 比率、Calmar 比率
- **交易统计**: 总交易次数、胜率、盈亏比

## 🎨 可视化图表

1. **资产净值曲线** - 交互式折线图，支持缩放
2. **累计收益率 & 回撤** - 双轴对比图
3. **资产配置** - 现金 vs 持仓市值面积图
4. **日收益率分布** - 直方图统计
5. **月度收益热力图** - 12 个月 × 年份热力图

## ⚙️ 技术栈

| 组件 | 技术 |
|------|------|
| 回测引擎 | TypeScript + Node.js |
| Web 前端 | React 18 + Vite + TypeScript |
| 图表库 | ECharts 5 |
| UI 框架 | Tailwind CSS + shadcn/ui |
| API 服务 | Express (内置 HTTP) |
| 设计系统 | 自定义 CSS 变量 + HSL 色彩空间 |

## 🔧 配置说明

### 回测参数
- **初始资金**: 默认 1,000,000
- **手续费率**: 默认 0.03% (万分之三)
- **印花税率**: 默认 0.1% (卖出收取)
- **滑点**: 默认 0.1%

### 数据源
当前使用模拟数据生成器，可替换为：
- CSV 文件导入 (`loadFromCsv`)
- 在线 API (tushare, akshare 等)
- 数据库查询

## 🛠️ 开发指南

### 添加新策略

**步骤 1**: 在 `src/server/index.ts` 创建策略函数
```typescript
function createMyStrategy(params: Record<string, number>): Strategy {
  return {
    name: '我的策略',
    onBar(ctx: StrategyContext) {
      // 策略逻辑
    }
  }
}
```

**步骤 2**: 在 `web/src/types/backtest.ts` 添加配置
```typescript
{
  type: 'my-strategy',
  name: '我的策略',
  description: '策略说明',
  params: [
    { key: 'param1', label: '参数 1', value: 10, min: 1, max: 100, step: 1 }
  ]
}
```

**步骤 3**: 在 `handleBacktest` 添加路由

### 自定义主题

编辑 `web/src/index.css`:
```css
:root {
  --background: 225 50% 4%;      /* 背景色相/饱和度/亮度 */
  --primary: 43 80% 55%;         /* 金色 */
  --profit: 0 84% 60%;           /* 红色 */
  --loss: 152 69% 40%;           /* 绿色 */
}
```

## 📝 API 接口

### POST /api/backtest

**请求**:
```json
{
  "strategy": "ma-crossover",
  "strategyParams": { "shortPeriod": 5, "longPeriod": 20 },
  "config": {
    "initialCapital": 1000000,
    "commissionRate": 0.0003,
    "stampDutyRate": 0.001,
    "slippage": 0.001
  }
}
```

**响应**: `BacktestResult` 对象

### GET /api/health
健康检查接口

## 🎯 下一步优化方向

1. **真实数据接入** - 对接 tushare/akshare API
2. **策略回测对比** - 同时运行多个策略对比
3. **参数优化** - 网格搜索最优参数
4. **风险控制** - 添加止损、仓位限制
5. **导出功能** - 导出交易记录、绩效报告
6. **用户系统** - 保存策略配置和历史回测

## 📄 许可证

MIT License

---

**开发时间**: 2026-03-20  
**技术栈版本**: TypeScript 5.6, React 18, Node.js 24, Vite 6
