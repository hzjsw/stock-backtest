# 部署到 Render 指南

本文档介绍如何将后端 API 部署到 Render 的免费服务上。

## 前置准备

1. 注册 [Render](https://render.com) 账号（可以使用 GitHub 登录）
2. 免费额度：每月 750 小时（足够 24/7 运行一个服务）

## 部署步骤

### 1. 创建 Web Service

1. 登录 Render 控制台
2. 点击 **New +** → **Web Service**
3. 选择 **Connect a repository**
4. 选择你的 GitHub 仓库：`hzjsw/stock-backtest`

### 2. 配置服务

填写以下配置：

| 配置项 | 值 |
|--------|-----|
| Name | `stock-backtest-api` |
| Region | `Singapore` (新加坡，离中国最近) |
| Root Directory | (留空) |
| Runtime | `Node` |
| Build Command | `npm install` |
| Start Command | `npm run server` |
| Instance Type | `Free` |

### 3. 环境变量

如果需要，添加以下环境变量：

```
NODE_ENV=production
PORT=10000
```

### 4. 自动部署

- Render 默认会在每次 push 到 `master` 分支时自动部署
- 可以在 **Settings** → **Auto-Deploy** 中调整

### 5. 获取 API 地址

部署完成后，你会获得一个类似这样的 URL：
```
https://stock-backtest-api-xyz.onrender.com
```

## 前端配置

获得 Render API 地址后，需要修改前端代码中的 API 地址。

创建 `.env` 文件（或修改构建配置）：

```bash
# web/.env.production
VITE_API_BASE_URL=https://your-app.onrender.com
```

或者在代码中配置：

```typescript
// web/src/lib/api.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
```

## 跨域配置

确保后端允许跨域访问。Render 会自动处理 CORS，但你需要在代码中配置：

```typescript
// src/server/index.ts
app.use(cors({
  origin: ['https://hzjsw.github.io', 'http://localhost:5173']
}))
```

## 免费额度说明

- Render 免费实例每月 750 小时
- 如果超过额度，服务会暂停直到下个月
- 可以通过 **Settings** → **Suspend** 手动暂停/恢复

## 数据持久化

Render 免费实例的文件系统是临时的，重启后数据会丢失。

**解决方案**：
1. 股票数据存储在 GitHub 仓库中（通过 Actions 更新）
2. 需要持久化的数据使用外部数据库（Render 也提供免费 PostgreSQL）

## 监控和日志

- 查看日志：Render 控制台 → **Logs**
- 查看指标：**Metrics** 标签页
- 设置告警：**Settings** → **Notifications**

## 故障排查

### 部署失败
- 检查 `npm install` 和 `npm run server` 是否能本地运行
- 查看 **Events** 标签页的部署日志

### 服务无法访问
- 检查是否超过免费额度被暂停
- 查看日志是否有报错

### CORS 错误
- 确保后端配置了正确的 `origin`
- 检查前端请求的域名是否正确

## 相关资源

- [Render 官方文档](https://render.com/docs)
- [免费额度说明](https://render.com/pricing)
- [Node.js 部署指南](https://render.com/docs/deploy-node-express-app)
