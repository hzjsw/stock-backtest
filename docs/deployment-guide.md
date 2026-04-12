# 前端项目免费部署完整指南

本文档介绍如何将 React + Node.js 全栈项目免费部署到 GitHub Pages + Render。

## 适用场景

- 前端：React/Vite 项目
- 后端：Node.js/Express API 服务
- 需求：完全免费部署，无需服务器

## 架构图

```
┌─────────────────┐     API 请求      ┌─────────────────┐
│  GitHub Pages   │ ────────────────→ │   Render        │
│  (静态前端)     │                   │  (后端 API)     │
│  免费托管       │ ←──────────────── │  免费 750 小时/月  │
└─────────────────┘    JSON 响应      └─────────────────┘
```

---

## 第一部分：准备工作

### 1.1 项目结构要求

确保你的项目包含以下结构：

```
my-project/
├── web/                    # 前端目录
│   ├── src/
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.production    # 生产环境变量
├── package.json           # 后端依赖
├── render.yaml            # Render 部署配置
└── .github/workflows/
    └── deploy-pages.yml   # GitHub Actions 部署
```

### 1.2 前置条件

- GitHub 账号
- Render 账号（可用 GitHub 登录）
- 项目已推送到 GitHub

---

## 第二部分：前端配置

### 2.1 配置 Vite base 路径

编辑 `web/vite.config.ts`，添加 `base` 配置：

```typescript
export default defineConfig({
  base: '/your-repo-name/',  // GitHub 仓库名
  plugins: [react()],
  // ...其他配置
})
```

**原因**：GitHub Pages 部署在子路径下，需要设置正确的 base 路径。

### 2.2 创建 API 配置模块

创建 `web/src/lib/api.ts`：

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
export const API_BASE = API_BASE_URL.replace(/\/$/, '')

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`
}
```

### 2.3 修改前端 API 调用

将所有硬编码的 API 地址替换为 `apiUrl()` 函数：

```typescript
// 修改前
fetch('http://localhost:3001/api/backtest', { ... })

// 修改后
fetch(apiUrl('/api/backtest'), { ... })
```

### 2.4 创建环境变量文件

**web/.env.example**（示例文件）：
```bash
VITE_API_BASE_URL=http://localhost:3001
```

**web/.env.production**（生产环境，部署前更新）：
```bash
VITE_API_BASE_URL=https://your-app.onrender.com
```

---

## 第三部分：GitHub Actions 配置

### 3.1 创建部署 Workflow

创建 `.github/workflows/deploy-pages.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: web/package-lock.json

      - name: Install dependencies
        run: cd web && npm ci

      - name: Build
        run: cd web && npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./web/dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 3.2 创建数据更新 Workflow（可选）

如果需要定时更新数据，创建 `.github/workflows/update-data.yml`：

```yaml
name: Update Stock Data

on:
  schedule:
    - cron: '0 16 * * 1-5'  # 每个工作日 UTC 16:00
  workflow_dispatch:
    inputs:
      sector:
        description: '选择要更新的板块'
        required: false
        default: 'all'

permissions:
  contents: write

jobs:
  update-data:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Download stock data
        run: npm run download:all

      - name: Commit and push
        run: |
          git config --local user.email "github-actions[bot]@users.noreply.github.com"
          git config --local user.name "github-actions[bot]"
          git add data/
          git diff --quiet || git commit -m "chore: auto-update data"
          git push
```

---

## 第四部分：后端配置

### 4.1 配置 CORS

确保后端允许跨域访问：

```typescript
// src/server/index.ts
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }
  // ...其他逻辑
})
```

### 4.2 创建 Render 配置文件

创建 `render.yaml`：

```yaml
services:
  - type: web
    name: your-app-name
    env: node
    buildCommand: npm install
    startCommand: npm run server
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
    healthCheckPath: /api/health
    numInstances: 1
```

### 4.3 添加健康检查端点

确保后端有健康检查接口：

```typescript
if (req.method === 'GET' && req.url === '/api/health') {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ status: 'ok' }))
  return
}
```

---

## 第五部分：部署步骤

### 5.1 推送代码到 GitHub

```bash
git add -A
git commit -m "chore: 配置部署"
git push origin master
```

### 5.2 启用 GitHub Pages

1. 访问：https://github.com/your-username/your-repo/settings/pages
2. 在 **Source** 部分，选择 **GitHub Actions**
3. 等待 Actions 自动部署（约 1-2 分钟）

### 5.3 部署到 Render

1. 访问：https://render.com 并登录
2. 点击 **New +** → **Web Service**
3. 连接 GitHub 仓库
4. 填写配置：
   - **Name**: `your-app-name`
   - **Region**: `Singapore`（推荐）
   - **Build Command**: `npm install`
   - **Start Command**: `npm run server`
   - **Instance Type**: `Free`
5. 点击 **Create Web Service**
6. 等待部署完成（约 2-5 分钟）

### 5.4 更新 API 地址

获取 Render 分配的 URL（如 `https://your-app.onrender.com`），然后：

1. 编辑 `web/.env.production`：
   ```bash
   VITE_API_BASE_URL=https://your-app.onrender.com
   ```

2. 提交并推送：
   ```bash
   git add web/.env.production
   git commit -m "chore: 更新生产环境 API 地址"
   git push origin master
   ```

---

## 第六部分：验证部署

### 6.1 检查后端 API

```bash
curl https://your-app.onrender.com/api/health
# 预期输出：{"status":"ok"}
```

### 6.2 访问前端

打开浏览器访问：
```
https://your-username.github.io/your-repo/
```

### 6.3 测试完整流程

1. 打开前端页面
2. 选择数据源/策略
3. 运行回测
4. 检查结果展示

---

## 第七部分：常见问题

### Q1: GitHub Pages 404 错误

**原因**：base 路径配置错误

**解决**：检查 `vite.config.ts` 中的 `base` 是否与仓库名一致

### Q2: API 请求失败

**原因 1**：CORS 未配置

**解决**：确保后端设置了 `Access-Control-Allow-Origin`

**原因 2**：API 地址错误

**解决**：检查 `.env.production` 中的 URL 是否正确

### Q3: Render 首次访问慢

**原因**：免费实例空闲 15 分钟后休眠

**解决**：正常现象，首次访问会自动唤醒（30-60 秒）

### Q4: GitHub Actions 部署失败

**检查项**：
1. `web/package.json` 是否存在
2. `npm run build` 是否能本地运行
3. 查看 Actions 日志获取详细错误

### Q5: 数据持久化问题

**问题**：Render 免费实例重启后数据丢失

**解决**：
- 将数据存储在 GitHub 仓库中
- 使用定时 Actions 更新数据
- 或使用外部数据库（如 Render PostgreSQL）

---

## 第八部分：成本说明

| 服务 | 免费额度 | 超出后 |
|------|---------|-------|
| GitHub Pages | 无限 | - |
| GitHub Actions | 2000 分钟/月 | 需付费 |
| Render | 750 小时/月 | 服务暂停 |

**注**：750 小时 = 24/7 运行一个月。如果超过，服务会暂停直到下月。

---

## 第九部分：优化建议

### 9.1 性能优化

- 启用 Vite 代码分割
- 压缩静态资源
- 使用 CDN 加速

### 9.2 安全建议

- 不要提交 `.env` 文件到 Git
- 使用 `.gitignore` 忽略敏感文件
- API 密钥使用 Render 环境变量

### 9.3 监控建议

- 配置 Render 告警通知
- 使用 GitHub Pages 环境设置
- 定期检查 Actions 部署日志

---

## 第十部分：相关文件清单

部署完成后，确保以下文件存在：

```
├── .github/workflows/
│   ├── deploy-pages.yml      # 前端部署
│   └── update-data.yml       # 数据更新（可选）
├── web/
│   ├── vite.config.ts        # Vite 配置（含 base 路径）
│   ├── src/lib/api.ts        # API 地址配置
│   └── .env.production       # 生产环境变量
├── render.yaml               # Render 部署配置
└── docs/
    ├── github-pages-deploy.md
    └── deploy-render.md
```

---

## 快速检查清单

部署前确认：

- [ ] Vite base 路径已设置
- [ ] API 调用使用 `apiUrl()` 函数
- [ ] `.env.production` 已创建
- [ ] GitHub Actions workflow 已创建
- [ ] Render 配置已创建
- [ ] CORS 已配置
- [ ] 健康检查端点已添加

部署后验证：

- [ ] GitHub Pages 可访问
- [ ] Render API 响应正常
- [ ] 前端能成功调用后端 API
- [ ] 前端功能正常工作

---

## 参考资料

- [GitHub Pages 文档](https://docs.github.com/en/pages)
- [Render 文档](https://render.com/docs)
- [Vite 部署指南](https://vitejs.dev/guide/static-deploy.html)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
