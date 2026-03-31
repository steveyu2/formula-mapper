import {
  CloudStorageProvider,
  StorageProviderType,
  StorageResult,
  CloudStorageData,
  StorageError,
  StorageConfig,
} from '../types';

/**
 * 存储提供者抽象基类
 * 所有具体的存储提供者都应继承此类
 */
export abstract class BaseStorageProvider implements CloudStorageProvider {
  abstract readonly type: StorageProviderType;
  abstract readonly name: string;

  protected config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
  }

  /**
   * 子类必须实现的抽象方法
   */
  abstract save(key: string, data: CloudStorageData): Promise<StorageResult<void>>;
  abstract load(key: string): Promise<StorageResult<CloudStorageData>>;
  abstract delete(key: string): Promise<StorageResult<void>>;
  abstract list(): Promise<StorageResult<string[]>>;
  abstract testConnection(): Promise<StorageResult<void>>;

  /**
   * 带重试的请求包装器
   * @param operation 要执行的操作
   * @param retries 重试次数
   * @param delay 重试延迟（毫秒）
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // 如果是最后一次尝试，抛出错误
        if (i === retries - 1) {
          throw lastError;
        }

        // 等待后重试
        await this.sleep(delay * Math.pow(2, i)); // 指数退避
      }
    }

    throw lastError;
  }

  /**
   * 延迟函数
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 统一处理 HTTP 错误
   */
  protected handleHttpError(response: Response): never {
    let code: StorageError['code'] = 'UNKNOWN';
    
    switch (response.status) {
      case 401:
      case 403:
        code = 'AUTH_ERROR';
        break;
      case 404:
        code = 'NOT_FOUND';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        code = 'SERVER_ERROR';
        break;
      default:
        code = 'NETWORK_ERROR';
    }

    throw new StorageError(
      `HTTP ${response.status}: ${response.statusText}`,
      code
    );
  }

  /**
   * 创建成功的结果对象
   */
  protected createSuccessResult<T>(data?: T): StorageResult<T> {
    return {
      success: true,
      data,
    };
  }

  /**
   * 创建失败的结果对象
   */
  protected createErrorResult(error: string): StorageResult<never> {
    return {
      success: false,
      error,
    };
  }

  /**
   * 包装异步操作，统一处理错误
   */
  protected async wrapOperation<T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<StorageResult<T>> {
    try {
      const result = await operation();
      return this.createSuccessResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${errorMessage}:`, error);
      return this.createErrorResult(`${errorMessage}: ${message}`);
    }
  }
}
