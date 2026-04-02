'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  CloudConfigManager,
  StorageProviderFactory,
  CloudflareStorageProvider,
  StorageProviderType,
  SavedCloudConfig,
} from '@/lib/cloud';
import { FormulaGroup } from '@/lib/types';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: FormulaGroup[];
  onLoadData: (groups: FormulaGroup[]) => void;
}

// 支持的云存储选项
const PROVIDER_OPTIONS = [
  {
    type: StorageProviderType.CLOUDFLARE,
    name: 'Cloudflare KV',
    description: '通过 Cloudflare Workers 存储数据',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
    ),
  },
];

export function CloudSyncModal({ isOpen, onClose, groups, onLoadData }: CloudSyncModalProps) {
  const [selectedProvider, setSelectedProvider] = useState<StorageProviderType>(StorageProviderType.CLOUDFLARE);
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [namespaceId, setNamespaceId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [hasConfig, setHasConfig] = useState(false);
  const [showProviderSelector, setShowProviderSelector] = useState(true);

  // 加载已保存的配置
  useEffect(() => {
    if (isOpen) {
      const config = CloudConfigManager.load();
      if (config) {
        setSelectedProvider(config.type);
        setEndpoint(config.endpoint || '');
        setApiKey(config.apiKey || '');
        setNamespaceId(config.namespaceId || '');
        setHasConfig(true);
        setShowProviderSelector(false);
      } else {
        setHasConfig(false);
        setShowProviderSelector(true);
      }
    }
  }, [isOpen]);

  const showMessage = (msg: string, type: 'success' | 'error') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const getProviderConfig = (): SavedCloudConfig => {
    switch (selectedProvider) {
      case StorageProviderType.CLOUDFLARE:
        return {
          type: StorageProviderType.CLOUDFLARE,
          endpoint: endpoint.trim(),
          apiKey: apiKey.trim() || undefined,
          namespaceId: namespaceId.trim() || undefined,
        };
      default:
        throw new Error(`不支持的存储类型: ${selectedProvider}`);
    }
  };

  const createProvider = () => {
    const config = getProviderConfig();
    switch (config.type) {
      case StorageProviderType.CLOUDFLARE:
        return new CloudflareStorageProvider({
          type: StorageProviderType.CLOUDFLARE,
          endpoint: config.endpoint,
          apiKey: config.apiKey,
          namespaceId: config.namespaceId,
        });
      default:
        throw new Error(`不支持的存储类型: ${config.type}`);
    }
  };

  const saveConfig = () => {
    if (!endpoint.trim()) {
      showMessage('请输入服务端点 URL', 'error');
      return;
    }

    try {
      const config = getProviderConfig();
      CloudConfigManager.save(config);
      setHasConfig(true);
      showMessage('配置已保存', 'success');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '保存配置失败', 'error');
    }
  };

  const testConnection = async () => {
    if (!endpoint.trim()) {
      showMessage('请先输入服务端点 URL', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const provider = createProvider();
      const result = await provider.testConnection();

      if (result.success) {
        showMessage('连接成功', 'success');
      } else {
        showMessage(result.error || '连接失败', 'error');
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '连接失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const saveToCloud = async () => {
    if (!endpoint.trim()) {
      showMessage('请先输入服务端点 URL', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const provider = createProvider();
      const result = await provider.save('formula-data', {
        version: '1.0',
        timestamp: Date.now(),
        groups,
        metadata: {
          deviceId: navigator.userAgent,
          userAgent: navigator.userAgent,
        },
      });

      if (result.success) {
        const config = getProviderConfig();
        CloudConfigManager.save(config);
        setHasConfig(true);
        showMessage('数据已保存到云端', 'success');
      } else {
        showMessage(result.error || '保存失败', 'error');
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '保存失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromCloud = async () => {
    if (!endpoint.trim()) {
      showMessage('请先输入服务端点 URL', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const provider = createProvider();
      const result = await provider.load('formula-data');

      if (result.success && result.data) {
        onLoadData(result.data.groups);
        const config = getProviderConfig();
        CloudConfigManager.save(config);
        setHasConfig(true);
        showMessage('数据已从云端加载', 'success');
        onClose();
      } else {
        showMessage(result.error || '加载失败', 'error');
      }
    } catch (error) {
      showMessage(error instanceof Error ? error.message : '加载失败', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const clearConfig = () => {
    CloudConfigManager.clear();
    setEndpoint('');
    setApiKey('');
    setNamespaceId('');
    setHasConfig(false);
    setShowProviderSelector(true);
    showMessage('配置已清除', 'success');
  };

  const switchProvider = () => {
    setShowProviderSelector(true);
    setHasConfig(false);
    setEndpoint('');
    setApiKey('');
    setNamespaceId('');
  };

  // 渲染提供者选择界面
  if (showProviderSelector) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>选择云存储服务</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {PROVIDER_OPTIONS.map((provider) => (
              <button
                key={provider.type}
                onClick={() => {
                  setSelectedProvider(provider.type);
                  setShowProviderSelector(false);
                }}
                className="w-full p-4 border rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left flex items-center gap-4"
              >
                <div className="text-blue-600">{provider.icon}</div>
                <div>
                  <div className="font-medium">{provider.name}</div>
                  <div className="text-sm text-gray-500">{provider.description}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-400 text-center">
            更多存储选项即将推出...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const currentProvider = PROVIDER_OPTIONS.find(p => p.type === selectedProvider);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentProvider?.icon}
            {currentProvider?.name} 设置
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {hasConfig && (
            <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm">
              已保存配置，可直接同步数据
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {selectedProvider === StorageProviderType.CLOUDFLARE ? 'Cloudflare Workers URL' : '服务端点 URL'}
            </label>
            <Input
              placeholder={selectedProvider === StorageProviderType.CLOUDFLARE 
                ? 'https://your-worker.your-subdomain.workers.dev'
                : 'https://your-endpoint.com/api'
              }
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              {selectedProvider === StorageProviderType.CLOUDFLARE 
                ? '输入你的 Cloudflare Workers 部署地址'
                : '输入你的服务端点地址'
              }
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">API Key (可选)</label>
            <Input
              type="password"
              placeholder="用于身份验证的 API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          {selectedProvider === StorageProviderType.CLOUDFLARE && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Namespace ID (可选)</label>
              <Input
                placeholder="KV Namespace ID"
                value={namespaceId}
                onChange={(e) => setNamespaceId(e.target.value)}
              />
            </div>
          )}

          {message && (
            <div
              className={`px-3 py-2 rounded-lg text-sm ${
                messageType === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {message}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={isLoading}
              size="sm"
            >
              {isLoading ? '测试中...' : '测试连接'}
            </Button>
            <Button
              variant="outline"
              onClick={saveConfig}
              disabled={isLoading}
              size="sm"
            >
              保存配置
            </Button>
            <Button
              variant="outline"
              onClick={switchProvider}
              disabled={isLoading}
              size="sm"
            >
              切换服务
            </Button>
            {hasConfig && (
              <Button
                variant="outline"
                onClick={clearConfig}
                disabled={isLoading}
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                清除配置
              </Button>
            )}
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex gap-2">
              <Button
                onClick={saveToCloud}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? '保存中...' : '保存到云端'}
              </Button>
              <Button
                onClick={loadFromCloud}
                disabled={isLoading}
                variant="secondary"
                className="flex-1"
              >
                {isLoading ? '加载中...' : '从云端加载'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
