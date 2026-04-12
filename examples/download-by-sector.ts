/**
 * 按板块批量下载股票数据
 *
 * 使用方法：
 * 1. 下载单个板块：npm run download:sector -- bank
 * 2. 下载多个板块：npm run download:sector -- bank securities
 * 3. 下载所有板块：npm run download:all
 * 4. 查看板块列表：npm run download:list
 */

import { fetchStockData } from '../src/data/web-loader';
import { getAllSectors, getSymbolsBySector, type SectorConfig } from '../sectors';
import * as fs from 'fs';
import * as path from 'path';
import { stringify } from 'csv-stringify/sync';

interface DownloadOptions {
  outputDir: string;
  startDate: string;
  endDate: string;
  source: 'netease' | 'eastmoney' | 'sina';
  addSectorLabel: boolean;
}

interface SectorMetadata {
  sectorCode: string;
  sectorName: string;
  symbol: string;
  downloadDate: string;
  dataStartDate: string;
  dataEndDate: string;
  dataCount: number;
}

/**
 * 保存股票数据到 CSV 文件
 */
function saveToCSV(
  data: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }>,
  symbol: string,
  outputDir: string,
  sectorLabel?: string
): string {
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 文件名格式：{板块标识_}股票代码.csv
  const filename = sectorLabel ? `${sectorLabel}_${symbol}.csv` : `${symbol}.csv`;
  const filePath = path.join(outputDir, filename);

  // 转换为 CSV 格式
  const csvData = data.map(bar => ({
    date: bar.date,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  }));

  const csvString = stringify(csvData, {
    header: true,
    columns: ['date', 'open', 'high', 'low', 'close', 'volume'],
  });

  fs.writeFileSync(filePath, csvString);
  return filePath;
}

/**
 * 保存元数据
 */
function saveMetadata(
  metadata: SectorMetadata[],
  outputDir: string,
  sectorCode: string
) {
  const metadataPath = path.join(outputDir, `metadata_${sectorCode}.json`);
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
}

/**
 * 下载单个板块的数据
 */
async function downloadSector(
  sector: SectorConfig,
  options: DownloadOptions
): Promise<{ success: number; failed: number }> {
  console.log(`\n[${sector.name}] 开始下载，共 ${sector.symbols.length} 只股票...`);

  const result = { success: 0, failed: 0 };
  const metadata: SectorMetadata[] = [];

  for (let i = 0; i < sector.symbols.length; i++) {
    const symbol = sector.symbols[i];
    const progress = `[${i + 1}/${sector.symbols.length}]`;

    try {
      process.stdout.write(`\r${progress} 正在下载 ${symbol}...`);

      const data = await fetchStockData(symbol, options.source, {
        startDate: options.startDate,
        endDate: options.endDate,
      });

      if (data.length === 0) {
        console.log(`\n  ⚠️  ${symbol}: 无数据`);
        result.failed++;
        continue;
      }

      // 保存 CSV 文件
      const label = options.addSectorLabel ? sector.code : undefined;
      const filePath = saveToCSV(data, symbol, options.outputDir, label);

      // 记录元数据
      metadata.push({
        sectorCode: sector.code,
        sectorName: sector.name,
        symbol,
        downloadDate: new Date().toISOString().split('T')[0],
        dataStartDate: data[0]?.date || '',
        dataEndDate: data[data.length - 1]?.date || '',
        dataCount: data.length,
      });

      console.log(`\n  ✓  ${symbol}: ${data.length} 条数据`);
      result.success++;
    } catch (err) {
      console.log(`\n  ✗  ${symbol}: ${err instanceof Error ? err.message : '下载失败'}`);
      result.failed++;

      // 请求失败后稍作等待
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 请求间隔，避免频率限制
    if (i < sector.symbols.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // 保存元数据
  if (metadata.length > 0) {
    saveMetadata(metadata, options.outputDir, sector.code);
  }

  console.log(`\n[${sector.name}] 下载完成：成功 ${result.success} 只，失败 ${result.failed} 只`);
  return result;
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);

  // 配置
  const options: DownloadOptions = {
    outputDir: path.join(process.cwd(), 'data'),
    startDate: '20200101',
    endDate: '20991231',
    source: 'netease', // 推荐使用网易数据源
    addSectorLabel: true,
  };

  // 确保输出目录存在
  if (!fs.existsSync(options.outputDir)) {
    fs.mkdirSync(options.outputDir, { recursive: true });
  }

  // 查看板块列表
  if (args.includes('list') || args.includes('--help') || args.includes('-h')) {
    console.log('\n可用板块列表：\n');
    const sectors = getAllSectors();
    console.log('板块代码\t\t板块名称\t\t股票数量');
    console.log('-'.repeat(60));
    for (const sector of sectors) {
      console.log(`${sector.code.padEnd(16)}\t${sector.name.padEnd(12)}\t${sector.symbols.length}`);
    }
    console.log('\n使用方法:');
    console.log('  npm run download:sector -- <板块代码>     下载单个板块');
    console.log('  npm run download:sector -- <板块 1> <板块 2>  下载多个板块');
    console.log('  npm run download:all                      下载所有板块');
    return;
  }

  // 下载所有板块
  if (args.includes('all')) {
    console.log('开始下载所有板块数据...');
    const sectors = getAllSectors();
    const totalResult = { success: 0, failed: 0 };

    for (const sector of sectors) {
      const result = await downloadSector(sector, options);
      totalResult.success += result.success;
      totalResult.failed += result.failed;

      // 板块之间等待更长时间
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n' + '='.repeat(60));
    console.log('所有板块下载完成!');
    console.log(`总计：成功 ${totalResult.success} 只，失败 ${totalResult.failed} 只`);
    console.log('='.repeat(60));
    return;
  }

  // 下载指定板块
  if (args.length === 0) {
    console.log('❌ 请指定要下载的板块代码');
    console.log('使用 --help 查看可用板块列表\n');
    return;
  }

  const sectorCodes = args.filter(arg => !arg.startsWith('-'));
  const sectors = getAllSectors();
  const totalResult = { success: 0, failed: 0 };

  for (const code of sectorCodes) {
    const sector = sectors.find(s => s.code === code);
    if (!sector) {
      console.log(`⚠️  未找到板块 "${code}"，使用 --help 查看可用板块`);
      continue;
    }

    const result = await downloadSector(sector, options);
    totalResult.success += result.success;
    totalResult.failed += result.failed;

    // 板块之间等待
    if (sectorCodes.indexOf(code) < sectorCodes.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('下载完成!');
  console.log(`总计：成功 ${totalResult.success} 只，失败 ${totalResult.failed} 只`);
  console.log('='.repeat(60));
}

// 运行
main().catch(err => {
  console.error('下载失败:', err);
  process.exit(1);
});
