/**
 * 简单日志模块
 * 提供结构化日志输出和错误处理
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
  enableTimestamp?: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private level: LogLevel;
  private prefix: string;
  private enableTimestamp: boolean;

  constructor(config: LoggerConfig = { level: 'info', prefix: '', enableTimestamp: true }) {
    this.level = config.level;
    this.prefix = config.prefix ? `[${config.prefix}]` : '';
    this.enableTimestamp = config.enableTimestamp ?? true;
  }

  private getTimestamp(): string {
    return new Date().toISOString().replace('T', ' ').slice(0, -5);
  }

  private formatLevel(level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
    };
    const reset = '\x1b[0m';
    return `${colors[level]}[${level.toUpperCase()}]${reset}`;
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = this.enableTimestamp ? `[${this.getTimestamp()}]` : '';
    const levelStr = this.formatLevel(level);
    const prefix = this.prefix;
    const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : '';
    return `${timestamp}${levelStr}${prefix} ${message}${dataStr}`;
  }

  debug(message: string, data?: unknown): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.debug) {
      console.log(this.formatMessage('debug', message, data));
    }
  }

  info(message: string, data?: unknown): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.info) {
      console.log(this.formatMessage('info', message, data));
    }
  }

  warn(message: string, data?: unknown): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.warn) {
      console.warn(this.formatMessage('warn', message, data));
    }
  }

  error(message: string, error?: unknown): void {
    if (LOG_LEVELS[this.level] <= LOG_LEVELS.error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      console.error(this.formatMessage('error', `${message} - ${errMessage}`));
      if (stack) {
        console.error(stack);
      }
    }
  }

  /**
   * 创建子日志器（带额外前缀）
   */
  child(prefix: string): Logger {
    return new Logger({
      level: this.level,
      prefix: this.prefix ? `${this.prefix}:${prefix}` : prefix,
      enableTimestamp: this.enableTimestamp,
    });
  }
}

/**
 * 默认日志器
 */
export const logger = new Logger({ level: 'info' });

/**
 * 错误处理辅助类
 */
export class AppError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(message: string, options: { code?: string; statusCode?: number; details?: unknown } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = options.code ?? 'INTERNAL_ERROR';
    this.statusCode = options.statusCode ?? 500;
    this.details = options.details;
  }
}

/**
 * 常见错误类型
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { code: 'VALIDATION_ERROR', statusCode: 400, details });
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, { code: 'NOT_FOUND', statusCode: 404 });
    this.name = 'NotFoundError';
  }
}

export class DataError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, { code: 'DATA_ERROR', statusCode: 400, details });
    this.name = 'DataError';
  }
}

/**
 * 异步函数错误处理包装器
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  logger: Logger,
  errorMessage: string
): Promise<{ data: T; error: null } | { data: null; error: AppError }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (err) {
    const error = err instanceof AppError ? err : new AppError(err instanceof Error ? err.message : 'Unknown error');
    logger.error(errorMessage, error);
    return { data: null, error };
  }
}
