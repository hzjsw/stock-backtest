# QuantX - 股票量化策略回测系统 Web UI

## 快速启动

### 方式一：分别启动（推荐）

**1. 启动后端 API 服务器**
```bash
cd stock-backtest
npm run server
# 后端运行在 http://localhost:3001
```

**2. 启动前端 Web 界面**
```bash
cd stock-backtest/web
npm run dev
# 前端运行在 http://localhost:5173
```

### 方式二：一键启动脚本

**Windows (创建 `start-web.bat`)**:
```batch
@echo off
start cmd /k "cd stock-backtest && npm run server"
timeout /t 2 /nobreak >nul
start cmd /k "cd stock-backtest\web && npm run dev"
```

**Linux/Mac (创建 `start-web.sh`)**:
```bash
#!/bin/bash
gnome-terminal -- bash -c "cd stock-backtest && npm run server; exec bash"
sleep 2
gnome-terminal -- bash -c "cd stock-backtest/web && npm run dev; exec bash"
```

## 功能特性

### 📊 策略库
- **双均线交叉策略** - 短期均线上穿长期均线买入，下穿卖出
- **MACD 策略** - MACD 金叉买入，死叉卖出
- **RSI 策略** - RSI 超卖买入，超买卖出
- **布林带策略** - 价格触及下轨买入，触及上轨卖出
- **多因子选股策略** - 动量 + 波动率 + 均线偏离 + 量比多因子打分

### 🎨 深色金融主题
- 深蓝/黑色背景 + 金色点缀
- 红绿涨跌配色
- 专业金融数据可视化风格
- 流畅的动画过渡效果

### 📈 可视化分析
- **资产净值曲线** - 交互式图表，支持缩放
- **累计收益率 & 回撤** - 双轴显示
- **资产配置面积图** - 现金 vs 持仓
- **日收益率分布** - 直方图统计
- **月度收益热力图** - 直观展示月度表现

### ⚙️ 参数配置
- 策略参数滑块调节（实时预览数值）
- 回测参数设置：初始资金、手续费率、印花税率、滑点
- 一键运行回测

## 技术架构

```
stock-backtest/
├── src/
│   ├── core/           # 回测引擎核心
│   ├── indicators/     # 技术指标库
│   ├── factors/        # 因子选股模块
│   ├── server/         # Express API 服务器
│   └── index.ts        # 库导出入口
├── web/                # React 前端
│   ├── src/
│   │   ├── components/ # UI 组件
│   │   ├── types/      # TypeScript 类型
│   │   └── App.tsx     # 主应用
│   └── package.json
└── examples/           # 命令行示例
```

## API 接口

### POST /api/backtest

请求体：
```json
{
  "strategy": "ma-crossover",
  "strategyParams": {
    "shortPeriod": 5,
    "longPeriod": 20
  },
  "config": {
    "initialCapital": 1000000,
    "commissionRate": 0.0003,
    "stampDutyRate": 0.001,
    "slippage": 0.001
  }
}
```

响应：`BacktestResult` 对象，包含：
- `strategyName` - 策略名称
- `metrics` - 绩效指标（收益率、夏普、回撤等）
- `portfolioHistory` - 每日投资组合快照
- `trades` - 交易记录

## 开发说明

### 添加新策略

1. 在 `src/server/index.ts` 中创建策略工厂函数
2. 在 `web/src/types/backtest.ts` 的 `STRATEGY_OPTIONS` 中添加策略配置
3. 在 `src/server/index.ts` 的 `handleBacktest` 中添加路由

### 自定义主题

编辑 `web/src/index.css` 中的 CSS 变量：
```css
:root {
  --background: 225 50% 4%;      /* 背景色 */
  --primary: 43 80% 55%;         /* 金色主色 */
  --profit: 0 84% 60%;           /* 盈利红色 */
  --loss: 152 69% 40%;           /* 亏损绿色 */
}
```

### 修改图表配置

编辑 `web/src/components/ChartGrid.tsx` 中的 ECharts option 对象。

## 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 注意事项

1. 前端开发服务器需要后端 API 运行在 `http://localhost:3001`
2. Vite 代理已配置，自动转发 `/api` 请求到后端
3. 生产环境部署需要分别 build 前后端项目
4. 模拟数据为随机生成，实际使用可接入真实数据源

## 许可证

MIT
