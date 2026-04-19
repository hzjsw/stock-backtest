# Changelog

All notable changes to this project will be documented in this file.

## [2.1.0] - 2026-04-19

### New Features

#### Multi-Factor Strategy
- **New Multi-Factor Scorer**: Supports weighted scoring with multiple factors
- **Momentum Factor**: 20-day price momentum calculation
- **Volatility Factor**: 20-day volatility measurement for risk control
- **MA Deviation Factor**: Measures deviation from moving average
- **Volume Ratio Factor**: Compares short-term vs long-term volume patterns
- Configurable factor weights and rebalance interval (default 20 trading days)

#### Stop Loss & Take Profit
- Stop loss support (default 5% below entry price)
- Take profit support (default 15% above entry price)
- Fixed bug where stop loss/take profit was incorrectly triggered on entry day

#### Documentation
- Moved documentation to `doc/` directory for better organization
- New stop loss & take profit feature documentation (`doc/STOP_LOSS_PROFIT.md`)

#### Testing
- Added factor calculation tests (`src/__tests__/factors.test.ts`)
- Added risk control tests (`test-risk-control.ts`)
- Added global risk analysis tests (`test-global-risk.ts`)

#### Data
- Added new stock data file `data/600017.csv`

### Improvements

#### Code Quality
- Refactored core types to re-export from `packages/types`
- Better type definitions for strategy context and bars

#### Backend API
- Enhanced health check endpoint
- Improved data file listing functionality

#### Frontend
- Updated `DataSourcePanel` with better UX
- Enhanced `Sidebar` component
- Improved `TradeTable` display
- Updated type definitions in `web/src/types/backtest.ts`

### Bug Fixes
- Fixed stop loss/take profit being triggered on the same day as entry
- Fixed type definition issues in core modules

### Technical Details
- Backend: Port 3001
- Frontend: Port 5173 (Vite dev server)
- 27 files changed, 2,568 insertions(+), 846 deletions(-)

## [1.0.0] - 2026-03-21

### Features

#### Core Backtest Engine
- Complete backtesting engine with order matching and position management
- Support for multiple data sources: CSV files, CSV directory, mock data, online APIs
- Technical indicators: MA, EMA, MACD, RSI, Bollinger Bands
- Multiple strategies: MA Crossover, MACD, RSI, Bollinger Bands, Multi-Factor

#### Data Management
- Online stock data fetching from multiple sources (NetEase, Sina, East Money, Tushare)
- Auto-save fetched data to local CSV files
- Data directory browser with file selection
- Date range filtering for backtests

#### Web UI
- Dark financial theme with professional design
- Strategy selection and parameter configuration
- Real-time backtest results visualization
- Performance metrics dashboard
- Trade history display
- Portfolio equity curve chart

### Technical Details
- Backend: TypeScript + Express HTTP Server (Port 3001)
- Frontend: React 18 + Vite + Tailwind CSS (Port 5175)
- Data format: CSV with columns: date, open, high, low, close, volume

### Bug Fixes
- Fixed indicator NaN value handling for correct signal generation
- Fixed stock code mapping for CSV directory selection
- Fixed date range filtering in backtest handler
- Fixed Chinese character encoding issues in server

### Known Limitations
- Multi-factor strategy uses simplified implementation
- Online data fetching may be blocked by some data sources
- Single currency support (CNY)