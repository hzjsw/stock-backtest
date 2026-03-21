# 网络股票数据获取指南

## 🌐 在线数据源

系统现已支持直接从网络 API 获取股票数据，无需手动下载 CSV 文件！

### 支持的数据源

| 数据源 | 优点 | 缺点 | 推荐度 |
|--------|------|------|--------|
| **网易财经** | 免费、历史数据完整、稳定、无需 token | 无官方 API 文档 | ⭐⭐⭐⭐⭐ |
| **新浪财经** | 免费、实时数据、速度快 | 只能获取当日数据 | ⭐⭐⭐⭐ |
| **东方财富** | 免费、历史数据完整 | 可能被防火墙阻止 | ⭐⭐⭐ |
| **Tushare** | 数据质量高、稳定可靠 | 需要注册获取 token | ⭐⭐⭐ |

---

## 🚀 使用方法

### Web UI 方式（推荐）

1. 访问 http://localhost:5173
2. 左侧面板 → 数据来源 → 选择"**在线获取**"
3. 配置参数：
   - **数据源**: 选择东方财富/新浪财经/Tushare
   - **股票代码**: 输入代码，多个股票用逗号分隔
   - **日期范围**: 设置起止日期
4. 点击"**获取数据**"按钮
5. 等待数据加载完成
6. 选择策略并运行回测

### API 方式

```typescript
import { fetchStockData, fetchMultipleStocks } from './src/data/web-loader';

// 获取单只股票
const bars = await fetchStockData('600000', 'eastmoney', {
  startDate: '20230101',
  endDate: '20231231'
});

// 批量获取多只股票
const data = await fetchMultipleStocks(
  ['600000', '600036', '000001'],
  'eastmoney',
  {
    startDate: '20230101',
    endDate: '20231231',
    concurrency: 3 // 并发数
  }
);
```

---

## 📊 数据源详解

### 1. 东方财富 (East Money) ⭐⭐⭐⭐⭐

**特点**:
- ✅ 免费、无需注册
- ✅ 历史数据完整（可追溯到上市）
- ✅ 支持前复权/后复权
- ✅ 数据质量高

**接口**:
```typescript
fetchFromEastMoney('600000', '20230101', '20231231')
```

**返回数据**:
- 日期、开高低收、成交量
- 自动处理股票代码格式

**限制**:
- 建议并发数 ≤ 3
- 单次请求 1-2 秒延迟

---

### 2. 新浪财经 (Sina) ⭐⭐⭐

**特点**:
- ✅ 完全免费
- ✅ 实时行情数据
- ✅ 响应速度快

**接口**:
```typescript
fetchFromSina('600000')
```

**返回数据**:
- 当前交易日数据
- 实时盘口信息

**限制**:
- ❌ 只能获取当日数据
- ❌ 不适合历史回测
- ✅ 适合实时监控股价

---

### 3. Tushare ⭐⭐⭐⭐

**特点**:
- ✅ 数据质量最高
- ✅ 稳定可靠
- ✅ 支持全球市场
- ❌ 需要注册获取 token

**获取 Token**:
1. 访问 https://tushare.pro
2. 注册账号
3. 在个人中心获取 token
4. 免费用户有积分限制

**接口**:
```typescript
fetchFromTushare('600000', '20230101', '20231231', 'your_token')
```

**限制**:
- 免费用户有调用次数限制
- 某些高级字段需要积分

---

## 💡 最佳实践

### 单只股票回测

```
数据源：东方财富
股票代码：600000
日期范围：20230101 - 20231231
策略：双均线交叉
```

### 多因子选股回测

```
数据源：东方财富
股票代码：600000, 600036, 601318, 000001, 000002, 
        000858, 002415, 300059, 600519, 601166
日期范围：20230101 - 20231231
策略：多因子选股
并发数：3
```

### 实时监控股票

```
数据源：新浪财经
股票代码：600000
策略：实时价格监控
```

---

## ⚠️ 注意事项

### 数据质量

1. **复权处理**: 
   - 东方财富默认使用前复权
   - 建议回测使用复权数据

2. **停牌股票**:
   - 停牌日数据会自动跳过
   - 不影响回测结果

3. **新股上市**:
   - 自动处理上市日期
   - 新股数据可能不完整

### 请求频率

1. **并发控制**: 
   - 建议并发数 ≤ 3
   - 避免请求过快被封 IP

2. **请求间隔**:
   - 批量获取时自动添加 500ms 间隔
   - 大量股票建议分批获取

3. **错误处理**:
   - 单只股票失败不影响其他股票
   - 会记录错误日志

### 数据缓存

```typescript
// 建议：获取后保存到本地
import * as fs from 'fs';

const data = await fetchMultipleStocks(symbols, 'eastmoney');
for (const [symbol, bars] of data) {
  const csv = convertToCSV(bars);
  fs.writeFileSync(`data/${symbol}.csv`, csv);
}
```

---

## 🔧 常见问题

### Q: 获取数据失败怎么办？

A: 
1. 检查网络连接
2. 检查股票代码格式
3. 降低并发数
4. 更换数据源

### Q: 数据获取很慢？

A:
1. 减少股票数量
2. 降低并发数
3. 缩短日期范围
4. 使用本地缓存

### Q: 如何保存获取的数据？

A:
```typescript
// 使用 CSV 目录模式保存
const data = await fetchMultipleStocks(symbols);
// 自动保存到 data/ 目录
```

### Q: 可以获取分钟级数据吗？

A: 当前版本仅支持日线数据。分钟级数据将在未来版本支持。

---

## 📖 示例代码

### 完整回测流程

```typescript
import { fetchMultipleStocks } from './src/data/web-loader';
import { BacktestEngine } from './src/core/engine';
import { createMACrossover } from './src/strategy/examples';

async function runBacktest() {
  // 1. 获取数据
  const symbols = ['600000', '600036', '000001'];
  const data = await fetchMultipleStocks(symbols, 'eastmoney', {
    startDate: '20230101',
    endDate: '20231231'
  });

  // 2. 创建策略
  const strategy = createMACrossover(5, 20);

  // 3. 运行回测
  const engine = new BacktestEngine({
    initialCapital: 1000000
  });
  
  const result = engine.run(strategy, data);
  
  // 4. 输出结果
  console.log('总收益率:', result.metrics.totalReturn);
  console.log('夏普比率:', result.metrics.sharpeRatio);
}

runBacktest();
```

---

## 🎯 下一步

- [ ] 支持更多数据源（同花顺、通达信）
- [ ] 支持分钟级数据
- [ ] 自动数据缓存
- [ ] 数据更新增量获取

---

**相关文档**:
- [数据源配置指南](DATA_SOURCE.md)
- [CSV 数据格式](DATA_FORMAT.md)
- [项目总览](PROJECT_OVERVIEW.md)
