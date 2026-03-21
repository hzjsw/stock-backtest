# CSV 数据格式指南

## 文件格式要求

### 基本结构

CSV 文件必须包含以下列：

| 列名 | 说明 | 类型 | 示例 |
|------|------|------|------|
| `date` | 交易日期 | string | `2023-01-03` |
| `open` | 开盘价 | number | `13.08` |
| `high` | 最高价 | number | `13.22` |
| `low` | 最低价 | number | `13.01` |
| `close` | 收盘价 | number | `13.18` |
| `volume` | 成交量 | number | `98560000` |

### 文件命名

- **单文件模式**: 文件名即为股票代码，如 `600000.csv`、`000001.csv`
- **目录模式**: 目录下所有 `.csv` 文件，文件名作为股票代码

### 日期格式

- 格式：`YYYY-MM-DD`
- 示例：`2023-01-03`
- 建议：按日期升序排列

### 可选列

可以添加以下额外列（用于多因子选股）：

| 列名 | 说明 | 类型 |
|------|------|------|
| `turnover` | 换手率 | number |
| `market_cap` | 总市值 | number |
| `pe` | 市盈率 | number |
| `pb` | 市净率 | number |

## 示例数据

### 最小可用示例

```csv
date,open,high,low,close,volume
2023-01-03,13.08,13.22,13.01,13.18,98560000
2023-01-04,13.20,13.35,13.15,13.30,102340000
```

### 完整示例

```csv
date,open,high,low,close,volume,turnover,market_cap,pe,pb
2023-01-03,13.08,13.22,13.01,13.18,98560000,0.025,125000000000,8.5,1.2
2023-01-04,13.20,13.35,13.15,13.30,102340000,0.028,126000000000,8.6,1.21
```

## 数据验证

系统会自动验证：

1. ✅ 文件存在且可读
2. ✅ 包含必需的列（date, open, high, low, close, volume）
3. ✅ 至少有一行数据
4. ✅ 日期格式正确
5. ✅ 数值列可解析为数字

## 获取真实数据

### 方式 1: Tushare (推荐)

```python
import tushare as ts
import pandas as pd

# 初始化
pro = ts.pro_api('your_token')

# 获取日线数据
df = pro.daily(ts_code='600000.SH', start_date='20230101', end_date='20231231')

# 转换为需要的格式
df = df.rename(columns={
    'trade_date': 'date',
    'open': 'open',
    'high': 'high',
    'low': 'low',
    'close': 'close',
    'vol': 'volume'
})

# 格式化日期
df['date'] = pd.to_datetime(df['date']).dt.strftime('%Y-%m-%d')

# 保存 CSV
df[['date', 'open', 'high', 'low', 'close', 'volume']].to_csv('600000.csv', index=False)
```

### 方式 2: AKShare

```python
import akshare as ak
import pandas as pd

# 获取日线数据
df = ak.stock_zh_a_hist(symbol="600000", period="daily", start_date="20230101", end_date="20231231")

# 重命名列
df = df.rename(columns={
    '日期': 'date',
    '开盘': 'open',
    '最高': 'high',
    '最低': 'low',
    '收盘': 'close',
    '成交量': 'volume'
})

# 格式化日期
df['date'] = pd.to_datetime(df['date']).dt.strftime('%Y-%m-%d')

# 保存 CSV
df[['date', 'open', 'high', 'low', 'close', 'volume']].to_csv('600000.csv', index=False)
```

### 方式 3: 同花顺 iFinD

```python
from WindPy import w
import pandas as pd

w.start()

# 获取日线数据
data = w.wsd("600000.SH", "open,high,low,close,volume", "2023-01-01", "2023-12-31")

# 转换为 DataFrame
df = pd.DataFrame(data.Data, columns=data.Times, index=data.Fields)
df = df.T.reset_index()
df.columns = ['date', 'open', 'high', 'low', 'close', 'volume']

# 保存 CSV
df.to_csv('600000.csv', index=False)
```

## 使用示例

### 单文件回测

1. 准备 CSV 文件：`600000.csv`
2. 在 Web UI 中选择"单文件"模式
3. 上传文件或拖拽到上传区域
4. 选择策略和参数
5. 点击"运行回测"

### 目录批量回测

1. 创建目录，如 `data/`
2. 放入多个 CSV 文件：
   ```
   data/
   ├── 600000.csv
   ├── 600036.csv
   ├── 000001.csv
   └── 000002.csv
   ```
3. 在 Web UI 中选择"CSV 目录"模式
4. 输入目录路径：`data/`
5. 选择多因子选股策略
6. 点击"运行回测"

## 常见问题

### Q: 数据量需要多大？

A: 建议至少 60 个交易日数据（约 3 个月），以便计算技术指标。

### Q: 支持分钟级数据吗？

A: 当前版本仅支持日线数据。分钟级数据回测将在未来版本支持。

### Q: 停牌股票如何处理？

A: 停牌日可以跳过或保持前一日价格。建议跳过停牌日。

### Q: 复权数据如何处理？

A: 建议使用复权后的数据（前复权或后复权均可），以保证价格连续性。

## 样本数据

系统自带样本数据位于 `examples/` 目录：

- `examples/600000.csv` - 浦发银行 50 日数据
- `examples/sample-data.csv` - 示例格式文件

可以直接使用这些文件测试系统功能。
