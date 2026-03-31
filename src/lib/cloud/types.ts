import { FormulaGroup } from '../types';

/**
 * 存储提供者类型枚举
 */
export enum StorageProviderType {
  CLOUDFLARE = 'cloudflare',
  // 后续可扩展: AWS = 'aws', ALIYUN = 'aliyun', etc.
}

/**
 * 存储配置基类
 */
export interface StorageConfig {
  type: StorageProviderType;
  endpoint: string;
  apiKey?: string;
}

/**
 * Cloudflare 存储配置
 */
export interface CloudflareConfig extends StorageConfig {
  type: StorageProviderType.CLOUDFLARE;
  endpoint: string;
  namespaceId?: string;
}

/**
 * 存储的数据格式
 */
export interface CloudStorageData {
  version: string;
  timestamp: number;
  groups: FormulaGroup[];
  metadata?: {
    deviceId?: string;
    userAgent?: string;
  };
}

/**
 * 存储操作结果
 */
export interface StorageResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 云存储提供者接口
 * 所有存储后端都需要实现此接口
 */
export interface CloudStorageProvider {
  /**
   * 提供者类型
   */
  readonly type: StorageProviderType;

  /**
   * 提供者名称（用于UI显示）
   */
  readonly name: string;

  /**
   * 保存数据到云端
   * @param key 数据键名
   * @param data 要保存的数据
   */
  save(key: string, data: CloudStorageData): Promise<StorageResult<void>>;

  /**
   * 从云端加载数据
   * @param key 数据键名
   */
  load(key: string): Promise<StorageResult<CloudStorageData>>;

  /**
   * 删除云端数据
   * @param key 数据键名
   */
  delete(key: string): Promise<StorageResult<void>>;

  /**
   * 列出云端所有数据键
   */
  list(): Promise<StorageResult<string[]>>;

  /**
   * 测试连接是否可用
   */
  testConnection(): Promise<StorageResult<void>>;
}

/**
 * 存储错误类型
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: 'NETWORK_ERROR' | 'AUTH_ERROR' | 'NOT_FOUND' | 'SERVER_ERROR' | 'UNKNOWN'
  ) {
    super(message);
    this.name = 'StorageError';
  }
}
