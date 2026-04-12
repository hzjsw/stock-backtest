# 股票板块数据下载工具

## 功能说明

本工具支持按板块批量下载股票历史数据，自动添加板块标识，方便后续分析使用。

## 可用板块

| 板块代码 | 板块名称 | 股票数量 |
|---------|---------|---------|
| `bank` | 银行 | 20 |
| `securities` | 证券 | 22 |
| `insurance` | 保险 | 4 |
| `realestate` | 房地产 | 12 |
| `tech` | 科技 | 20 |
| `consumer` | 消费 | 18 |
| `pharma` | 医药 | 22 |
| `manufacturing` | 制造 | 153 |

## 使用方法

### 1. 查看板块列表

```bash
npm run download:list
```

### 2. 下载单个板块

```bash
# 下载银行板块数据
npm run download:sector -- bank

# 下载科技板块数据
npm run download:sector -- tech
```

### 3. 下载多个板块

```bash
# 下载银行和证券板块
npm run download:sector -- bank securities

# 下载多个板块
npm run download:sector -- bank securities insurance tech
```

### 4. 下载所有板块

```bash
npm run download:all
```

## 输出文件

### CSV 数据文件

文件名格式：`{板块标识}_{股票代码}.csv`

例如：
- `bank_600000.csv` - 浦发银行（银行板块）
- `tech_000063.csv` - 中兴通讯（科技板块）

CSV 列：
- `date` - 日期
- `open` - 开盘价
- `high` - 最高价
- `low` - 最低价
- `close` - 收盘价
- `volume` - 成交量

### 元数据文件

每个板块会生成一个元数据文件：`metadata_{板块代码}.json`

包含：
- `sectorCode` - 板块代码
- `sectorName` - 板块名称
- `symbol` - 股票代码
- `downloadDate` - 下载日期
- `dataStartDate` - 数据起始日期
- `dataEndDate` - 数据结束日期
- `dataCount` - 数据条数

## 配置说明

### 修改下载参数

编辑 `examples/download-by-sector.ts` 文件中的 `options` 对象：

```typescript
const options: DownloadOptions = {
  outputDir: path.join(process.cwd(), 'data'),  // 输出目录
  startDate: '20200101',                        // 数据起始日期
  endDate: '20991231',                          // 数据结束日期
  source: 'netease',                            // 数据源：netease | eastmoney | sina
  addSectorLabel: true,                         // 是否在文件名中添加板块标识
};
```

### 数据源说明

| 数据源 | 优点 | 缺点 |
|-------|------|------|
| `netease` (推荐) | 免费、无需 token、历史数据完整 | 需要网络连接 |
| `eastmoney` | 免费、数据质量好 | 可能被防火墙拦截 |
| `sina` | 免费、简单 | 只有当天数据 |

## 添加新板块

编辑 `sectors/index.ts` 文件，在 `SECTORS` 数组中添加新的板块配置：

```typescript
{
  name: '新能源',
  code: 'newenergy',
  symbols: [
    '300750', // 宁德时代
    '601012', // 隆基绿能
    // ... 更多股票
  ],
}
```

## 注意事项

1. **网络请求频率**：工具已内置请求间隔（300ms），避免触发频率限制
2. **数据质量**：下载完成后建议检查数据条数，确保数据完整
3. **文件名标识**：带有板块标识的文件名方便批量筛选和分析
4. **元数据**：每个板块的 metadata 文件记录了详细的下载信息

## 示例：在回测中使用

```typescript
import { loadFromCsv } from '../src';
import * as path from 'path';

// 加载银行板块所有股票数据
const bankDir = path.join(process.cwd(), 'data');
const bankFiles = fs.readdirSync(bankDir).filter(f => f.startsWith('bank_'));

for (const file of bankFiles) {
  const symbol = file.replace('bank_', '').replace('.csv', '');
  const bars = loadFromCsv(path.join(bankDir, file));
  console.log(`${symbol}: ${bars.length} 条数据`);
}
```

## 许可证

MIT License
