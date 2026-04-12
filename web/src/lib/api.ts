/** API 配置 */

// 从环境变量获取 API 地址，如果没有则使用默认值
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

// 移除末尾的斜杠
export const API_BASE = API_BASE_URL.replace(/\/$/, '')

/**
 * 构建完整的 API URL
 */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`
}

/**
 * API 请求配置
 */
export const API_CONFIG = {
  headers: {
    'Content-Type': 'application/json',
  },
}
