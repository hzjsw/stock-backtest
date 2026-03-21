/**
 * 可视化报告生成器
 * 生成带有 ECharts 图表的 HTML 回测报告
 */
import * as fs from 'fs';
import * as path from 'path';
import { BacktestResult, PerformanceMetrics } from '../core/types';

/**
 * 生成 HTML 回测报告
 */
export function generateReport(result: BacktestResult, outputPath?: string): string {
  const html = buildHtml(result);
  const filePath = outputPath || path.resolve(`backtest_report_${Date.now()}.html`);
  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`回测报告已生成: ${filePath}`);
  return filePath;
}

function formatPercent(value: number): string {
  return (value * 100).toFixed(2) + '%';
}

function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

function formatMoney(value: number): string {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildMetricsTable(metrics: PerformanceMetrics, config: BacktestResult['config']): string {
  return `
    <div class="metrics-grid">
      <div class="metric-card highlight">
        <div class="metric-label">总收益率</div>
        <div class="metric-value ${metrics.totalReturn >= 0 ? 'positive' : 'negative'}">${formatPercent(metrics.totalReturn)}</div>
      </div>
      <div class="metric-card highlight">
        <div class="metric-label">年化收益率</div>
        <div class="metric-value ${metrics.annualizedReturn >= 0 ? 'positive' : 'negative'}">${formatPercent(metrics.annualizedReturn)}</div>
      </div>
      <div class="metric-card highlight">
        <div class="metric-label">夏普比率</div>
        <div class="metric-value">${formatNumber(metrics.sharpeRatio)}</div>
      </div>
      <div class="metric-card highlight">
        <div class="metric-label">最大回撤</div>
        <div class="metric-value negative">${formatPercent(metrics.maxDrawdown)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">初始资金</div>
        <div class="metric-value">${formatMoney(config.initialCapital)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">最终资产</div>
        <div class="metric-value">${formatMoney(config.initialCapital * (1 + metrics.totalReturn))}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">年化波动率</div>
        <div class="metric-value">${formatPercent(metrics.annualizedVolatility)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Calmar比率</div>
        <div class="metric-value">${formatNumber(metrics.calmarRatio)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Sortino比率</div>
        <div class="metric-value">${formatNumber(metrics.sortinoRatio)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">最大回撤天数</div>
        <div class="metric-value">${metrics.maxDrawdownDays}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">胜率</div>
        <div class="metric-value">${formatPercent(metrics.winRate)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">盈亏比</div>
        <div class="metric-value">${formatNumber(metrics.profitLossRatio)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">总交易次数</div>
        <div class="metric-value">${metrics.totalTrades}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">盈利交易</div>
        <div class="metric-value positive">${metrics.winningTrades}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">亏损交易</div>
        <div class="metric-value negative">${metrics.losingTrades}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">日均收益率</div>
        <div class="metric-value">${formatPercent(metrics.avgDailyReturn)}</div>
      </div>
    </div>
  `;
}

function buildHtml(result: BacktestResult): string {
  const { portfolioHistory, trades, metrics, config } = result;

  const dates = portfolioHistory.map(h => h.date);
  const totalValues = portfolioHistory.map(h => h.totalValue);
  const dailyReturns = portfolioHistory.map(h => h.dailyReturn);
  const cashValues = portfolioHistory.map(h => h.cash);
  const positionValues = portfolioHistory.map(h => h.positionsValue);

  // 计算累计收益率
  const cumulativeReturns = portfolioHistory.map(h =>
    (h.totalValue - config.initialCapital) / config.initialCapital * 100
  );

  // 计算回撤
  const drawdowns: number[] = [];
  let peak = totalValues[0];
  for (const val of totalValues) {
    if (val > peak) peak = val;
    drawdowns.push(-((peak - val) / peak) * 100);
  }

  // 交易记录表格
  const tradesTableRows = trades.slice(-100).map(t => `
    <tr>
      <td>${t.date}</td>
      <td>${t.symbol}</td>
      <td class="${t.side === 'buy' ? 'positive' : 'negative'}">${t.side === 'buy' ? '买入' : '卖出'}</td>
      <td>${t.quantity}</td>
      <td>${formatNumber(t.price)}</td>
      <td>${formatNumber(t.commission)}</td>
      <td class="${(t.pnl || 0) >= 0 ? 'positive' : 'negative'}">${t.pnl !== undefined ? formatNumber(t.pnl) : '-'}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>回测报告 - ${result.strategyName}</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; color: #333; }
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    h1 { text-align: center; padding: 30px 0 10px; font-size: 28px; color: #1a1a2e; }
    .subtitle { text-align: center; color: #666; margin-bottom: 30px; font-size: 14px; }
    .section { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .section-title { font-size: 18px; font-weight: 600; margin-bottom: 16px; color: #1a1a2e; border-left: 4px solid #4361ee; padding-left: 12px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
    .metric-card { background: #f8f9fc; border-radius: 8px; padding: 16px; text-align: center; }
    .metric-card.highlight { background: #eef0ff; }
    .metric-label { font-size: 13px; color: #666; margin-bottom: 6px; }
    .metric-value { font-size: 20px; font-weight: 700; }
    .positive { color: #e74c3c; }
    .negative { color: #27ae60; }
    .chart-container { width: 100%; height: 400px; }
    .chart-container.tall { height: 300px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 10px 12px; text-align: right; border-bottom: 1px solid #eee; }
    th { background: #f8f9fc; font-weight: 600; color: #555; position: sticky; top: 0; }
    td:first-child, th:first-child { text-align: left; }
    .table-wrapper { max-height: 400px; overflow-y: auto; }
    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    @media (max-width: 768px) { .charts-row { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="container">
    <h1>${result.strategyName} - 回测报告</h1>
    <div class="subtitle">
      回测区间: ${config.startDate || dates[0]} ~ ${config.endDate || dates[dates.length - 1]}
      &nbsp;|&nbsp; 初始资金: ${formatMoney(config.initialCapital)}
      &nbsp;|&nbsp; 手续费率: ${formatPercent(config.commissionRate)}
      &nbsp;|&nbsp; 印花税率: ${formatPercent(config.stampDutyRate)}
    </div>

    <div class="section">
      <div class="section-title">绩效概览</div>
      ${buildMetricsTable(metrics, config)}
    </div>

    <div class="section">
      <div class="section-title">资产净值曲线</div>
      <div id="chart-equity" class="chart-container"></div>
    </div>

    <div class="charts-row">
      <div class="section">
        <div class="section-title">累计收益率 & 回撤</div>
        <div id="chart-return-dd" class="chart-container"></div>
      </div>
      <div class="section">
        <div class="section-title">资产配置</div>
        <div id="chart-allocation" class="chart-container"></div>
      </div>
    </div>

    <div class="charts-row">
      <div class="section">
        <div class="section-title">日收益率分布</div>
        <div id="chart-return-dist" class="chart-container tall"></div>
      </div>
      <div class="section">
        <div class="section-title">月度收益热力图</div>
        <div id="chart-monthly" class="chart-container tall"></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">交易记录 (最近100条)</div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>日期</th><th>代码</th><th>方向</th><th>数量</th><th>价格</th><th>手续费</th><th>盈亏</th>
            </tr>
          </thead>
          <tbody>${tradesTableRows}</tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    const dates = ${JSON.stringify(dates)};
    const totalValues = ${JSON.stringify(totalValues)};
    const cumulativeReturns = ${JSON.stringify(cumulativeReturns)};
    const drawdowns = ${JSON.stringify(drawdowns)};
    const dailyReturns = ${JSON.stringify(dailyReturns)};
    const cashValues = ${JSON.stringify(cashValues)};
    const positionValues = ${JSON.stringify(positionValues)};

    // 资产净值曲线
    echarts.init(document.getElementById('chart-equity')).setOption({
      tooltip: { trigger: 'axis', formatter: function(p) { return p[0].axisValue + '<br/>净值: ' + p[0].value.toLocaleString('zh-CN', {minimumFractionDigits:2}); } },
      xAxis: { type: 'category', data: dates, axisLabel: { rotate: 30 } },
      yAxis: { type: 'value', scale: true, axisLabel: { formatter: function(v) { return (v/10000).toFixed(0) + '万'; } } },
      series: [{ type: 'line', data: totalValues, smooth: true, lineStyle: { width: 2, color: '#4361ee' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{offset: 0, color: 'rgba(67,97,238,0.3)'}, {offset: 1, color: 'rgba(67,97,238,0.02)'}] } }, symbol: 'none' }],
      grid: { left: 80, right: 30, top: 20, bottom: 60 },
      dataZoom: [{ type: 'inside' }, { type: 'slider' }]
    });

    // 累计收益 & 回撤
    echarts.init(document.getElementById('chart-return-dd')).setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['累计收益率', '回撤'], bottom: 30 },
      xAxis: { type: 'category', data: dates, axisLabel: { rotate: 30 } },
      yAxis: [
        { type: 'value', axisLabel: { formatter: '{value}%' }, position: 'left' },
        { type: 'value', axisLabel: { formatter: '{value}%' }, position: 'right' }
      ],
      series: [
        { name: '累计收益率', type: 'line', data: cumulativeReturns.map(v => +v.toFixed(2)), smooth: true, lineStyle: { color: '#e74c3c' }, symbol: 'none' },
        { name: '回撤', type: 'line', yAxisIndex: 1, data: drawdowns.map(v => +v.toFixed(2)), smooth: true, lineStyle: { color: '#27ae60' }, areaStyle: { color: 'rgba(39,174,96,0.15)' }, symbol: 'none' }
      ],
      grid: { left: 60, right: 60, top: 20, bottom: 80 },
      dataZoom: [{ type: 'inside' }, { type: 'slider' }]
    });

    // 资产配置
    echarts.init(document.getElementById('chart-allocation')).setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      legend: { data: ['现金', '持仓市值'], bottom: 30 },
      xAxis: { type: 'category', data: dates, axisLabel: { rotate: 30 } },
      yAxis: { type: 'value', axisLabel: { formatter: function(v) { return (v/10000).toFixed(0) + '万'; } } },
      series: [
        { name: '现金', type: 'line', stack: 'total', areaStyle: { color: 'rgba(67,97,238,0.3)' }, lineStyle: { width: 0 }, data: cashValues, symbol: 'none' },
        { name: '持仓市值', type: 'line', stack: 'total', areaStyle: { color: 'rgba(231,76,60,0.3)' }, lineStyle: { width: 0 }, data: positionValues, symbol: 'none' }
      ],
      grid: { left: 80, right: 30, top: 20, bottom: 80 },
      dataZoom: [{ type: 'inside' }, { type: 'slider' }]
    });

    // 日收益率分布
    (function() {
      const bins = {};
      const step = 0.005;
      dailyReturns.forEach(r => {
        const binKey = (Math.round(r / step) * step).toFixed(3);
        bins[binKey] = (bins[binKey] || 0) + 1;
      });
      const sortedKeys = Object.keys(bins).sort((a,b) => parseFloat(a) - parseFloat(b));
      echarts.init(document.getElementById('chart-return-dist')).setOption({
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: sortedKeys.map(k => (parseFloat(k)*100).toFixed(1)+'%'), axisLabel: { rotate: 45 } },
        yAxis: { type: 'value', name: '天数' },
        series: [{ type: 'bar', data: sortedKeys.map(k => ({ value: bins[k], itemStyle: { color: parseFloat(k) >= 0 ? '#e74c3c' : '#27ae60' } })) }],
        grid: { left: 50, right: 20, top: 30, bottom: 60 }
      });
    })();

    // 月度收益热力图
    (function() {
      const monthly = {};
      for (let i = 0; i < dates.length; i++) {
        const ym = dates[i].substring(0, 7);
        if (!monthly[ym]) monthly[ym] = { start: totalValues[i], end: totalValues[i] };
        monthly[ym].end = totalValues[i];
      }
      const years = [...new Set(Object.keys(monthly).map(k => k.substring(0,4)))].sort();
      const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
      const data = [];
      for (const ym of Object.keys(monthly)) {
        const y = years.indexOf(ym.substring(0,4));
        const m = months.indexOf(ym.substring(5,7));
        const ret = ((monthly[ym].end - monthly[ym].start) / monthly[ym].start * 100);
        data.push([m, y, +ret.toFixed(2)]);
      }
      echarts.init(document.getElementById('chart-monthly')).setOption({
        tooltip: { formatter: function(p) { return years[p.value[1]] + '-' + months[p.value[0]] + ': ' + p.value[2] + '%'; } },
        xAxis: { type: 'category', data: months.map(m => m + '月'), splitArea: { show: true } },
        yAxis: { type: 'category', data: years, splitArea: { show: true } },
        visualMap: { min: -10, max: 10, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: ['#27ae60', '#f5f5f5', '#e74c3c'] } },
        series: [{ type: 'heatmap', data: data, label: { show: true, formatter: function(p) { return p.value[2] + '%'; }, fontSize: 10 } }],
        grid: { left: 50, right: 20, top: 10, bottom: 60 }
      });
    })();

    // 响应窗口大小变化
    window.addEventListener('resize', function() {
      document.querySelectorAll('.chart-container').forEach(function(el) {
        var chart = echarts.getInstanceByDom(el);
        if (chart) chart.resize();
      });
    });
  </script>
</body>
</html>`;
}

/**
 * 在控制台打印绩效摘要
 */
export function printSummary(result: BacktestResult): void {
  const { metrics, config, trades, portfolioHistory } = result;
  const finalValue = portfolioHistory.length > 0
    ? portfolioHistory[portfolioHistory.length - 1].totalValue
    : config.initialCapital;

  console.log('\n' + '='.repeat(60));
  console.log(`  策略: ${result.strategyName}`);
  console.log('='.repeat(60));
  console.log(`  回测区间:       ${config.startDate || portfolioHistory[0]?.date || '-'} ~ ${config.endDate || portfolioHistory[portfolioHistory.length - 1]?.date || '-'}`);
  console.log(`  初始资金:       ${formatMoney(config.initialCapital)}`);
  console.log(`  最终资产:       ${formatMoney(finalValue)}`);
  console.log('-'.repeat(60));
  console.log(`  总收益率:       ${formatPercent(metrics.totalReturn)}`);
  console.log(`  年化收益率:     ${formatPercent(metrics.annualizedReturn)}`);
  console.log(`  夏普比率:       ${formatNumber(metrics.sharpeRatio)}`);
  console.log(`  最大回撤:       ${formatPercent(metrics.maxDrawdown)}`);
  console.log(`  最大回撤天数:   ${metrics.maxDrawdownDays}`);
  console.log(`  年化波动率:     ${formatPercent(metrics.annualizedVolatility)}`);
  console.log(`  Calmar比率:     ${formatNumber(metrics.calmarRatio)}`);
  console.log(`  Sortino比率:    ${formatNumber(metrics.sortinoRatio)}`);
  console.log('-'.repeat(60));
  console.log(`  总交易次数:     ${metrics.totalTrades}`);
  console.log(`  胜率:           ${formatPercent(metrics.winRate)}`);
  console.log(`  盈亏比:         ${formatNumber(metrics.profitLossRatio)}`);
  console.log(`  盈利交易:       ${metrics.winningTrades}`);
  console.log(`  亏损交易:       ${metrics.losingTrades}`);
  console.log('='.repeat(60) + '\n');
}
