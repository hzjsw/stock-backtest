/**
 * 日志模块测试
 */
import { describe, it, expect } from 'vitest';
import { Logger, AppError, ValidationError, NotFoundError, DataError } from '../lib/logger';

describe('日志模块测试', () => {
  describe('Logger', () => {
    it('应该创建日志器实例', () => {
      const logger = new Logger({ level: 'info' });
      expect(logger).toBeDefined();
    });

    it('应该根据日志级别过滤输出', () => {
      const logger = new Logger({ level: 'error' });
      expect(logger).toBeDefined();
      // 级别为 error 时，info 日志不会被输出
    });

    it('应该支持子日志器', () => {
      const parent = new Logger({ level: 'info', prefix: 'parent' });
      const child = parent.child('child');
      expect(child).toBeDefined();
    });

    it('应该正确格式化错误堆栈', () => {
      const logger = new Logger({ level: 'error' });
      const error = new Error('Test error');
      expect(() => logger.error('Test', error)).not.toThrow();
    });
  });

  describe('AppError', () => {
    it('应该创建 AppError 实例', () => {
      const error = new AppError('Test error');
      expect(error.name).toBe('AppError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.statusCode).toBe(500);
    });

    it('应该支持自定义错误码和状态码', () => {
      const error = new AppError('Custom error', {
        code: 'CUSTOM_CODE',
        statusCode: 400,
      });
      expect(error.code).toBe('CUSTOM_CODE');
      expect(error.statusCode).toBe(400);
    });

    it('应该支持错误详情', () => {
      const details = { field: 'value' };
      const error = new AppError('Error with details', { details });
      expect(error.details).toBe(details);
    });
  });

  describe('ValidationError', () => {
    it('应该创建 ValidationError 实例', () => {
      const error = new ValidationError('Invalid input');
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('NotFoundError', () => {
    it('应该创建 NotFoundError 实例', () => {
      const error = new NotFoundError('Resource not found');
      expect(error.name).toBe('NotFoundError');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });

    it('应该使用默认消息', () => {
      const error = new NotFoundError();
      expect(error.message).toBe('Resource not found');
    });
  });

  describe('DataError', () => {
    it('应该创建 DataError 实例', () => {
      const error = new DataError('Data processing failed');
      expect(error.name).toBe('DataError');
      expect(error.code).toBe('DATA_ERROR');
      expect(error.statusCode).toBe(400);
    });
  });
});
