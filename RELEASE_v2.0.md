# QuantX 股票量化策略回测系统 v2.0

## 版本说明

**发布日期**: 2026-04-12  
**GitHub**: https://github.com/hzjsw/stock-backtest/releases/tag/v2.0

---

## 新增功能

### 1. 策略优化工具 🎯
- **网格搜索** - 自动搜索最优参数组合
- **策略对比** - 同时运行多个策略并对比绩效
- **排名系统** - 按收益率自动排序

使用方式:
```bash
npm run example:optimize
```

### 2. 单元测试框架 🧪
- 35 个测试用例
- 覆盖技术指标、回测引擎、数据加载器、日志模块
- 运行命令:
```bash
npm run test:run
```

### 3. 日志和错误处理系统 📝
- 结构化日志输出
- 自定义错误类型 (ValidationError, NotFoundError, DataError)
- API 端点增强的错误响应

### 4. 参数范围扩展 ⚙️
- MA 策略：长期均线最高支持 300 日
- RSI 策略：超卖阈值最低支持 5
- MACD 策略：慢线周期最高支持 150

---

## 最佳策略发现 (基于 600000 浦发银行数据)

### 🏆 冠军策略：MA 均线交叉
```json
{
  "strategy": "ma-crossover",
  "params": {
    "shortPeriod": 3,
    "longPeriod": 60
  }
}
```
| 指标 | 数值 |
|------|------|
| 总收益率 | **185.84%** |
| 年化收益 | **4.23%** |
| 夏普比率 | 0.06 |
| 最大回撤 | 48.29% |
| 交易次数 | 216 |

### 🥈 亚军策略：RSI 超卖超买
```json
{
  "strategy": "rsi",
  "params": {
    "period": 21,
    "oversold": 25,
    "overbought": 70
  }
}
```
| 指标 | 数值 |
|------|------|
| 总收益率 | **159.10%** |
| 年化收益 | **3.83%** |
| 夏普比率 | **0.07** |
| 最大回撤 | **28.75%** |
| 交易次数 | 16 |

### 🥉 季军策略：MA 均线交叉 (10/50)
- 总收益率：169.20%
- 年化收益：3.98%
- 最大回撤：52.03%

---

## 技术改进

### 代码质量
- ✅ 统一类型定义 - 消除 5 处重复代码
- ✅ 整理导入路径 - 从主入口统一导出
- ✅ 增强类型安全 - TypeScript 严格模式

### API 改进
- ✅ 新增日志输出 - 所有 API 调用记录
- ✅ 错误验证 - 请求参数验证
- ✅ 结构化错误响应

### 测试覆盖
| 模块 | 测试数 | 状态 |
|------|--------|------|
| 技术指标 | 10 | ✅ |
| 回测引擎 | 10 | ✅ |
| 数据加载 | 4 | ✅ |
| 日志模块 | 11 | ✅ |

---

## 使用方式

### 运行回测
```bash
# 启动后端
npm run server

# 启动前端 (新终端)
cd web && npm run dev
```

### 策略优化
```bash
# 运行策略优化，找到最优参数
npm run example:optimize
```

### 运行测试
```bash
# 运行所有测试
npm run test:run
```

---

## 文件变更

### 新增文件
- `src/optimizer.ts` - 策略优化核心
- `src/lib/logger.ts` - 日志系统
- `src/__tests__/*.test.ts` - 测试文件 (4 个)
- `examples/optimize.ts` - 优化脚本
- `examples/analyze-rsi.ts` - RSI 分析脚本
- `vitest.config.ts` - 测试配置

### 修改文件
- `src/core/types.ts` - 添加通用类型
- `src/index.ts` - 统一导出
- `src/server/index.ts` - 日志和错误处理
- `web/src/types/backtest.ts` - 参数范围扩展
- `package.json` - 添加测试脚本和依赖

---

## 已知问题

### RSI 策略信号稀少
**现象**: 600718 在 2024-10 后无交易信号  
**原因**: RSI 一直在 25-70 之间震荡，未触发买卖条件  
**解决**: 放宽阈值 (超卖 35/超买 65) 或缩短周期 (14 日)

---

## 下一步计划

- [ ] 策略对比可视化图表
- [ ] 参数敏感性热力图
- [ ] 数据缓存层
- [ ] 导出 PDF/Excel 报告
- [ ] 实时数据接入

---

## 许可证

MIT License

---

**开发团队**: QuantX  
**技术支持**: https://github.com/hzjsw/stock-backtest/issues
