import {
  CloudStorageProvider,
  StorageProviderType,
  StorageConfig,
  CloudflareConfig,
} from './types';
import { CloudflareStorageProvider } from './providers/cloudflare';

/**
 * 存储提供者工厂类
 * 用于创建和管理不同的存储提供者实例
 */
export class StorageProviderFactory {
  private static providers: Map<StorageProviderType, new (config: StorageConfig) => CloudStorageProvider> = new Map();

  /**
   * 初始化默认提供者
   */
  private static initializeProviders(): void {
    if (this.providers.size === 0) {
      this.providers.set(StorageProviderType.CLOUDFLARE, CloudflareStorageProvider);
      // 后续可注册其他提供者
      // this.providers.set(StorageProviderType.AWS, AWSStorageProvider);
      // this.providers.set(StorageProviderType.ALIYUN, AliyunStorageProvider);
    }
  }

  /**
   * 注册新的存储提供者
   * @param type 提供者类型
   * @param providerClass 提供者类
   */
  static register(
    type: StorageProviderType,
    providerClass: new (config: StorageConfig) => CloudStorageProvider
  ): void {
    this.providers.set(type, providerClass);
  }

  /**
   * 创建存储提供者实例
   * @param config 存储配置
   * @returns 存储提供者实例
   */
  static create(config: StorageConfig): CloudStorageProvider {
    this.initializeProviders();
    
    const ProviderClass = this.providers.get(config.type);
    
    if (!ProviderClass) {
      throw new Error(`不支持的存储提供者类型: ${config.type}`);
    }

    return new ProviderClass(config);
  }

  /**
   * 检查是否支持某种存储类型
   * @param type 存储类型
   */
  static isSupported(type: StorageProviderType): boolean {
    this.initializeProviders();
    return this.providers.has(type);
  }

  /**
   * 获取所有支持的存储类型
   */
  static getSupportedTypes(): StorageProviderType[] {
    this.initializeProviders();
    return Array.from(this.providers.keys());
  }

  /**
   * 获取存储类型的显示名称
   * @param type 存储类型
   */
  static getTypeName(type: StorageProviderType): string {
    switch (type) {
      case StorageProviderType.CLOUDFLARE:
        return 'Cloudflare KV';
      default:
        return type;
    }
  }
}

/**
 * 云存储配置管理
 * 用于保存和加载用户的云存储配置
 */
const CLOUD_CONFIG_KEY = 'formulaMapper_cloudConfig';

export interface SavedCloudConfig {
  type: StorageProviderType;
  endpoint: string;
  apiKey?: string;
  namespaceId?: string;
  // 不保存敏感信息，如需要可以扩展
}

export class CloudConfigManager {
  /**
   * 保存云存储配置到 localStorage
   * @param config 配置对象
   */
  static save(config: SavedCloudConfig): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('保存云存储配置失败:', error);
    }
  }

  /**
   * 从 localStorage 加载云存储配置
   * @returns 配置对象，如果没有则返回 null
   */
  static load(): SavedCloudConfig | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const data = localStorage.getItem(CLOUD_CONFIG_KEY);
      if (!data) return null;
      
      const config = JSON.parse(data) as SavedCloudConfig;
      
      // 验证配置是否有效
      if (!config.type || !config.endpoint) {
        return null;
      }
      
      return config;
    } catch (error) {
      console.error('加载云存储配置失败:', error);
      return null;
    }
  }

  /**
   * 清除保存的云存储配置
   */
  static clear(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(CLOUD_CONFIG_KEY);
    } catch (error) {
      console.error('清除云存储配置失败:', error);
    }
  }

  /**
   * 检查是否有保存的配置
   */
  static hasConfig(): boolean {
    return this.load() !== null;
  }

  /**
   * 将保存的配置转换为完整的存储配置
   * @param savedConfig 保存的配置
   */
  static toFullConfig(savedConfig: SavedCloudConfig): StorageConfig {
    switch (savedConfig.type) {
      case StorageProviderType.CLOUDFLARE:
        return {
          type: StorageProviderType.CLOUDFLARE,
          endpoint: savedConfig.endpoint,
          apiKey: savedConfig.apiKey,
          namespaceId: savedConfig.namespaceId,
        } as CloudflareConfig;
      default:
        throw new Error(`不支持的存储类型: ${savedConfig.type}`);
    }
  }
}
