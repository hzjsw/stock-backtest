import { useState, useCallback, useEffect } from 'react'
import { Upload, FileText, Database, Trash2, CheckCircle2, AlertCircle, CloudDownload, Loader2, RefreshCw, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface DataFile {
  filename: string
  symbol: string
  size: number
  bars: number
  startDate: string
  endDate: string
  modified: string
}

interface DataSourceConfig {
  type: 'csv-file' | 'csv-directory' | 'mock' | 'online'
  filePath?: string
  symbols?: string[]
  onlineConfig?: {
    source: 'netease' | 'eastmoney' | 'sina' | 'tushare'
    symbolsStr: string
    startDate: string
    endDate: string
    token?: string
  }
}

interface DataSourceProps {
  config: DataSourceConfig
  onChange: (config: DataSourceConfig) => void
}

export function DataSourcePanel({ config, onChange }: DataSourceProps) {
  const [dragOver, setDragOver] = useState(false)

  const handleFileUpload = useCallback((files: FileList) => {
    const file = files[0]
    if (!file || !file.name.endsWith('.csv')) {
      alert('请上传 CSV 文件')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      // 简单验证 CSV 格式
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) {
        alert('CSV 文件格式不正确')
        return
      }

      // 提取股票代码（文件名去掉扩展名）
      const symbol = file.name.replace('.csv', '')
      
      onChange({
        type: 'csv-file',
        filePath: file.name,
        symbols: [symbol],
      })
    }
    reader.readAsText(file)
  }, [onChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileUpload(e.dataTransfer.files)
  }, [handleFileUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleDirectorySelect = useCallback(async () => {
    // Use data directory and show file list
    onChange({
      type: 'csv-directory',
      filePath: 'data',
    })
  }, [onChange])

  const handleUseMock = useCallback(() => {
    onChange({ type: 'mock' })
  }, [onChange])

  const handleClear = useCallback(() => {
    onChange({ type: 'mock' })
  }, [onChange])

  // Data files state
  const [dataFiles, setDataFiles] = useState<DataFile[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())

  // Load data files when csv-directory is selected
  const loadDataFiles = useCallback(async () => {
    setIsLoadingFiles(true)
    try {
      const response = await fetch('http://localhost:3001/api/list-data-files')
      const result = await response.json()
      if (result.success) {
        setDataFiles(result.files)
      }
    } catch (err) {
      console.error('Failed to load data files:', err)
    } finally {
      setIsLoadingFiles(false)
    }
  }, [])

  // Load files when switching to csv-directory mode
  useEffect(() => {
    if (config.type === 'csv-directory') {
      loadDataFiles()
    }
  }, [config.type, loadDataFiles])

  // Handle file selection
  const toggleFileSelection = useCallback((symbol: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev)
      if (next.has(symbol)) {
        next.delete(symbol)
      } else {
        next.add(symbol)
      }
      return next
    })
  }, [])

  // Confirm selection
  const confirmSelection = useCallback(() => {
    const symbols = Array.from(selectedFiles)
    if (symbols.length > 0) {
      onChange({
        type: 'csv-directory',
        filePath: 'data',
        symbols,
      })
    }
  }, [selectedFiles, onChange])

  // Select all files
  const selectAllFiles = useCallback(() => {
    setSelectedFiles(new Set(dataFiles.map(f => f.symbol)))
  }, [dataFiles])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set())
  }, [])

  const [isFetching, setIsFetching] = useState(false)
  const [onlineSymbols, setOnlineSymbols] = useState('600000, 600036, 000001')
  const [startDate, setStartDate] = useState('20230101')
  const [endDate, setEndDate] = useState('20231231')
  const [dataSource, setDataSource] = useState<'netease' | 'eastmoney' | 'sina' | 'tushare'>('netease')
  const [autoSave, setAutoSave] = useState(true)

  const handleFetchOnline = useCallback(async () => {
    const symbols = onlineSymbols.split(/[,,\s]+/).filter(s => s.trim().length > 0)
    if (symbols.length === 0) {
      alert('请输入股票代码')
      return
    }

    setIsFetching(true)
    try {
      console.log('开始获取数据...', { symbols, source: dataSource, startDate, endDate, autoSave })
      
      const response = await fetch('http://localhost:3001/api/fetch-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols,
          source: dataSource,
          startDate,
          endDate,
          autoSave,
        }),
      })

      const result = await response.json()
      console.log('获取结果:', result)
      
      if (!result.success) {
        throw new Error(result.message)
      }

      onChange({
        type: 'online',
        symbols: result.data.map((d: any) => d.symbol),
        onlineConfig: {
          source: dataSource,
          symbolsStr: onlineSymbols,
          startDate,
          endDate,
        },
      })
      
      let message = `✓ 成功获取 ${result.data.length} 只股票的数据`
      if (result.savedTo) {
        message += `\n✓ 数据已保存到 ${result.savedTo} 目录`
      }
      alert(message)
    } catch (err) {
      console.error('获取数据失败:', err)
      alert(`获取数据失败：${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setIsFetching(false)
    }
  }, [onlineSymbols, startDate, endDate, dataSource, autoSave, onChange])

  return (
    <div className="space-y-3">
      <div>
        <label className="sidebar-label flex items-center gap-1.5">
          <Database className="w-3 h-3" /> 数据来源
        </label>
        
        {/* 数据源选择 */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <button
            onClick={() => onChange({ type: 'mock' })}
            className={`px-2 py-2 text-xs rounded-md border transition-all ${
              config.type === 'mock'
                ? 'border-primary bg-secondary text-foreground'
                : 'border-border text-muted-foreground hover:bg-secondary/50'
            }`}
          >
            模拟数据
          </button>
          <button
            onClick={handleDirectorySelect}
            className={`px-2 py-2 text-xs rounded-md border transition-all ${
              config.type === 'csv-directory'
                ? 'border-primary bg-secondary text-foreground'
                : 'border-border text-muted-foreground hover:bg-secondary/50'
            }`}
          >
            CSV 目录
          </button>
          <button
            onClick={() => document.getElementById('csv-upload')?.click()}
            className={`px-2 py-2 text-xs rounded-md border transition-all ${
              config.type === 'csv-file'
                ? 'border-primary bg-secondary text-foreground'
                : 'border-border text-muted-foreground hover:bg-secondary/50'
            }`}
          >
            单文件
          </button>
          <button
            onClick={() => onChange({ type: 'online' })}
            className={`px-2 py-2 text-xs rounded-md border transition-all flex items-center justify-center gap-1 ${
              config.type === 'online'
                ? 'border-primary bg-secondary text-foreground'
                : 'border-border text-muted-foreground hover:bg-secondary/50'
            }`}
          >
            <CloudDownload className="w-3 h-3" />
            在线获取
          </button>
        </div>

        {/* 文件上传区域 */}
        {config.type === 'csv-file' && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={(e) => handleFileUpload(e.target.files!)}
              className="hidden"
            />
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-xs text-muted-foreground mb-1">
              拖拽 CSV 文件到此处，或点击选择
            </p>
            {config.filePath && (
              <div className="flex items-center justify-center gap-1 mt-2 text-xs text-foreground">
                <FileText className="w-3 h-3" />
                <span className="truncate max-w-[200px]">{config.filePath}</span>
              </div>
            )}
          </div>
        )}

        {/* CSV 目录文件列表 */}
        {config.type === 'csv-directory' && (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium">data/ 目录文件</span>
                </div>
                <button
                  onClick={loadDataFiles}
                  className="p-1 hover:bg-secondary rounded"
                  title="刷新"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isLoadingFiles ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {isLoadingFiles ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-xs text-muted-foreground">加载中...</span>
                </div>
              ) : dataFiles.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">
                  <AlertCircle className="w-4 h-4 mx-auto mb-1" />
                  <p>data/ 目录中没有 CSV 文件</p>
                  <p className="mt-1">请先通过"在线获取"下载数据</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={selectAllFiles}
                      className="text-xs text-primary hover:underline"
                    >
                      全选
                    </button>
                    <span className="text-xs text-muted-foreground">|</span>
                    <button
                      onClick={clearSelection}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      清除
                    </button>
                    <span className="text-xs text-muted-foreground ml-auto">
                      已选 {selectedFiles.size}/{dataFiles.length}
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-1">
                    {dataFiles.map(file => (
                      <label
                        key={file.filename}
                        className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${
                          selectedFiles.has(file.symbol) ? 'bg-primary/10' : 'hover:bg-secondary'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.symbol)}
                          onChange={() => toggleFileSelection(file.symbol)}
                          className="rounded border-border"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <FileText className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs font-medium">{file.symbol}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {file.bars} 条 | {file.startDate} ~ {file.endDate}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <Button
                    variant="gold"
                    size="sm"
                    className="w-full mt-2"
                    onClick={confirmSelection}
                    disabled={selectedFiles.size === 0}
                  >
                    确认选择 ({selectedFiles.size} 只股票)
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* 模拟数据提示 */}
        {config.type === 'mock' && (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <p className="text-xs text-muted-foreground">
                  使用随机生成的模拟数据进行回测
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 在线获取数据配置 */}
        {config.type === 'online' && (
          <Card>
            <CardContent className="p-3 space-y-3">
              <div>
                <label className="sidebar-label">数据源</label>
                <select
                  className="select-field text-xs"
                  value={dataSource}
                  onChange={e => setDataSource(e.target.value as any)}
                >
                  <option value="netease">网易财经 (推荐)</option>
                  <option value="eastmoney">东方财富</option>
                  <option value="sina">新浪财经</option>
                  <option value="tushare">Tushare (需 Token)</option>
                </select>
              </div>
              <div>
                <label className="sidebar-label">股票代码 (逗号分隔)</label>
                <input
                  type="text"
                  className="input-field text-xs"
                  value={onlineSymbols}
                  onChange={e => setOnlineSymbols(e.target.value)}
                  placeholder="600000, 600036, 000001"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="sidebar-label">开始日期</label>
                  <input
                    type="text"
                    className="input-field text-xs"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    placeholder="20230101"
                  />
                </div>
                <div>
                  <label className="sidebar-label">结束日期</label>
                  <input
                    type="text"
                    className="input-field text-xs"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    placeholder="20231231"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto-save"
                  checked={autoSave}
                  onChange={e => setAutoSave(e.target.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="auto-save" className="text-xs text-muted-foreground">
                  自动保存到 data/ 目录
                </label>
              </div>
              <Button
                variant="gold"
                size="sm"
                className="w-full gap-2"
                onClick={handleFetchOnline}
                disabled={isFetching}
              >
                {isFetching ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 获取中...</>
                ) : (
                  <><CloudDownload className="w-3.5 h-3.5" /> 获取数据</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 已加载数据预览 */}
        {config.symbols && config.symbols.length > 0 && (
          <div className="mt-3">
            <label className="sidebar-label">已加载股票</label>
            <div className="flex flex-wrap gap-1.5">
              {config.symbols.map(sym => (
                <span
                  key={sym}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-secondary border border-border"
                >
                  <FileText className="w-3 h-3" />
                  {sym}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 清除按钮 */}
        {config.type !== 'mock' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="w-full mt-2 gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清除数据
          </Button>
        )}
      </div>
    </div>
  )
}
