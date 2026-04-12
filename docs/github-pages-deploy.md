# GitHub Pages 部署指南

## 快速开始

本项目已配置自动部署到 GitHub Pages。每次 push 到 `master` 分支时，GitHub Actions 会自动构建并部署前端。

## 启用 GitHub Pages

1. 访问仓库设置：**Settings** → **Pages**
2. 在 **Source** 部分，确保选择 **GitHub Actions**
3. GitHub 会自动使用 `.github/workflows/deploy-pages.yml` 进行部署

## 访问地址

部署完成后，前端应用将在以下地址可访问：

```
https://hzjsw.github.io/stock-backtest/
```

## 工作流程

部署流程由 `.github/workflows/deploy-pages.yml` 定义：

1. **Checkout** - 拉取代码
2. **Setup Node** - 配置 Node.js 环境
3. **Install** - 安装前端依赖
4. **Build** - 构建生产版本
5. **Upload** - 上传构建产物
6. **Deploy** - 部署到 GitHub Pages

## 手动触发部署

如果需要手动触发部署：

1. 访问 **Actions** 标签页
2. 选择 **Deploy to GitHub Pages** 工作流
3. 点击 **Run workflow**
4. 选择 `master` 分支
5. 点击 **Run workflow**

## 查看部署状态

- **Actions** 标签页查看部署进度
- **Environments** → **github-pages** 查看部署历史和 URL

## 前端配置

### API 地址配置

前端通过环境变量配置 API 地址：

```bash
# web/.env.production
VITE_API_BASE_URL=https://your-app.onrender.com
```

### Vite 配置

`base` 路径已设置为 `/stock-backtest/` 以适配 GitHub Pages：

```typescript
// web/vite.config.ts
export default defineConfig({
  base: '/stock-backtest/',
  // ...
})
```

## 故障排查

### 404 错误

- 检查 `vite.config.ts` 中的 `base` 路径是否正确
- 确认 GitHub Pages 的 Source 设置为 GitHub Actions

### 构建失败

- 检查 `web/package.json` 中的脚本是否正确
- 查看 Actions 日志获取详细错误信息

### API 请求失败

- 确保后端 API 已部署（参考 [deploy-render.md](./deploy-render.md)）
- 检查 `.env.production` 中的 API 地址是否正确
- 确认 CORS 已正确配置

## 相关文件

- `.github/workflows/deploy-pages.yml` - 部署工作流
- `web/vite.config.ts` - Vite 配置
- `web/.env.production` - 生产环境变量
- `web/src/lib/api.ts` - API 地址配置
