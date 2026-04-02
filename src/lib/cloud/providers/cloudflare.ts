import { BaseStorageProvider } from './base';
import {
  StorageProviderType,
  CloudStorageData,
  StorageResult,
  CloudflareConfig,
  VersionHistoryItem,
} from '../types';

/**
 * Cloudflare KV 存储提供者
 * 通过 Cloudflare Workers API 与 KV 存储交互
 */
export class CloudflareStorageProvider extends BaseStorageProvider {
  readonly type = StorageProviderType.CLOUDFLARE;
  readonly name = 'Cloudflare KV';

  private cloudflareConfig: CloudflareConfig;

  constructor(config: CloudflareConfig) {
    super(config);
    this.cloudflareConfig = config;
  }

  /**
   * 保存数据到 Cloudflare KV
   */
  async save(key: string, data: CloudStorageData, comment?: string): Promise<StorageResult<void>> {
    return this.wrapOperation(async () => {
      await this.withRetry(async () => {
        const url = `${this.cloudflareConfig.endpoint}/save`;
        console.log('[Cloudflare] Saving to:', url);
        
        // 只包含定义的字段，避免 undefined 导致 JSON 格式错误
        const requestBody: any = { key, data };
        if (comment !== undefined) requestBody.comment = comment;
        if (this.cloudflareConfig.namespaceId !== undefined) {
          requestBody.namespaceId = this.cloudflareConfig.namespaceId;
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.cloudflareConfig.apiKey && {
              'Authorization': `Bearer ${this.cloudflareConfig.apiKey}`,
            }),
            // 如果提供了写入密码，添加到请求头
            ...(this.cloudflareConfig.writePassword && {
              'X-Write-Password': this.cloudflareConfig.writePassword,
            }),
          },
          body: JSON.stringify(requestBody),
        });

        console.log('[Cloudflare] Response status:', response.status);

        if (!response.ok) {
          const text = await response.text();
          console.error('[Cloudflare] Error response:', text);
          this.handleHttpError(response);
        }
      });
    }, '保存到 Cloudflare KV 失败');
  }

  /**
   * 从 Cloudflare KV 加载数据
   */
  async load(key: string): Promise<StorageResult<CloudStorageData>> {
    return this.wrapOperation(async () => {
      const result = await this.withRetry(async () => {
        const url = new URL(`${this.cloudflareConfig.endpoint}/load`);
        url.searchParams.set('key', key);
        if (this.cloudflareConfig.namespaceId) {
          url.searchParams.set('namespaceId', this.cloudflareConfig.namespaceId);
        }

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            ...(this.cloudflareConfig.apiKey && {
              'Authorization': `Bearer ${this.cloudflareConfig.apiKey}`,
            }),
          },
        });

        if (!response.ok) {
          this.handleHttpError(response);
        }

        const data = await response.json();
        return data.data as CloudStorageData;
      });
      return result;
    }, '从 Cloudflare KV 加载失败');
  }

  /**
   * 加载指定版本的数据
   */
  async loadVersion(key: string, versionId: string): Promise<StorageResult<CloudStorageData>> {
    return this.wrapOperation(async () => {
      const result = await this.withRetry(async () => {
        const url = new URL(`${this.cloudflareConfig.endpoint}/load-version`);
        url.searchParams.set('key', key);
        url.searchParams.set('versionId', versionId);
        if (this.cloudflareConfig.namespaceId) {
          url.searchParams.set('namespaceId', this.cloudflareConfig.namespaceId);
        }

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            ...(this.cloudflareConfig.apiKey && {
              'Authorization': `Bearer ${this.cloudflareConfig.apiKey}`,
            }),
          },
        });

        if (!response.ok) {
          this.handleHttpError(response);
        }

        const data = await response.json();
        return data.data as CloudStorageData;
      });
      return result;
    }, '加载指定版本失败');
  }

  /**
   * 获取版本历史列表
   */
  async getVersions(key: string): Promise<StorageResult<VersionHistoryItem[]>> {
    return this.wrapOperation(async () => {
      const result = await this.withRetry(async () => {
        const url = new URL(`${this.cloudflareConfig.endpoint}/versions`);
        url.searchParams.set('key', key);
        if (this.cloudflareConfig.namespaceId) {
          url.searchParams.set('namespaceId', this.cloudflareConfig.namespaceId);
        }

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            ...(this.cloudflareConfig.apiKey && {
              'Authorization': `Bearer ${this.cloudflareConfig.apiKey}`,
            }),
          },
        });

        if (!response.ok) {
          this.handleHttpError(response);
        }

        const data = await response.json();
        return data.versions as VersionHistoryItem[];
      });
      return result;
    }, '获取版本历史失败');
  }

  /**
   * 删除 Cloudflare KV 中的数据
   */
  async delete(key: string): Promise<StorageResult<void>> {
    return this.wrapOperation(async () => {
      await this.withRetry(async () => {
        const url = new URL(`${this.cloudflareConfig.endpoint}/delete`);
        url.searchParams.set('key', key);
        if (this.cloudflareConfig.namespaceId) {
          url.searchParams.set('namespaceId', this.cloudflareConfig.namespaceId);
        }

        const response = await fetch(url.toString(), {
          method: 'DELETE',
          headers: {
            ...(this.cloudflareConfig.apiKey && {
              'Authorization': `Bearer ${this.cloudflareConfig.apiKey}`,
            }),
          },
        });

        if (!response.ok) {
          this.handleHttpError(response);
        }
      });
    }, '删除 Cloudflare KV 数据失败');
  }

  /**
   * 列出 Cloudflare KV 中的所有键
   */
  async list(): Promise<StorageResult<string[]>> {
    return this.wrapOperation(async () => {
      return await this.withRetry(async () => {
        const url = new URL(`${this.cloudflareConfig.endpoint}/list`);
        if (this.cloudflareConfig.namespaceId) {
          url.searchParams.set('namespaceId', this.cloudflareConfig.namespaceId);
        }

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            ...(this.cloudflareConfig.apiKey && {
              'Authorization': `Bearer ${this.cloudflareConfig.apiKey}`,
            }),
          },
        });

        if (!response.ok) {
          this.handleHttpError(response);
        }

        const result = await response.json();
        return result.keys as string[];
      });
    }, '列出 Cloudflare KV 键失败');
  }

  /**
   * 测试 Cloudflare KV 连接
   */
  async testConnection(): Promise<StorageResult<void>> {
    return this.wrapOperation(async () => {
      await this.withRetry(async () => {
        const response = await fetch(`${this.cloudflareConfig.endpoint}/health`, {
          method: 'GET',
          headers: {
            ...(this.cloudflareConfig.apiKey && {
              'Authorization': `Bearer ${this.cloudflareConfig.apiKey}`,
            }),
          },
        });

        if (!response.ok) {
          this.handleHttpError(response);
        }
      });
    }, '连接 Cloudflare KV 失败');
  }
}
