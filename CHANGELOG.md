# Changelog

All notable changes to this project will be documented in this file.

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