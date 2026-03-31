'use client';

import { useState, useEffect } from 'react';
import { VersionHistoryItem } from '@/lib/cloud/types';
import { FormulaGroup } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: {
    endpoint: string;
    apiKey?: string;
    namespaceId?: string;
  } | null;
  onLoadVersion: (groups: FormulaGroup[]) => void;
}

export function VersionHistoryModal({ isOpen, onClose, config, onLoadVersion }: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<VersionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingVersion, setIsLoadingVersion] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && config) {
      loadVersions();
    }
  }, [isOpen, config]);

  const loadVersions = async () => {
    if (!config) return;
    
    setIsLoading(true);
    try {
      const { CloudflareStorageProvider, StorageProviderType } = await import('@/lib/cloud');
      const provider = new CloudflareStorageProvider({
        type: StorageProviderType.CLOUDFLARE,
        endpoint: config.endpoint,
        apiKey: config.apiKey,
        namespaceId: config.namespaceId,
      });

      const result = await provider.getVersions('formula-data');
      if (result.success && result.data) {
        setVersions(result.data);
      } else {
        toast.error(result.error || '获取版本历史失败');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '获取版本历史失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadVersion = async (versionId: string) => {
    if (!config) return;
    
    setIsLoadingVersion(versionId);
    try {
      const { CloudflareStorageProvider, StorageProviderType } = await import('@/lib/cloud');
      const provider = new CloudflareStorageProvider({
        type: StorageProviderType.CLOUDFLARE,
        endpoint: config.endpoint,
        apiKey: config.apiKey,
        namespaceId: config.namespaceId,
      });

      const result = await provider.loadVersion('formula-data', versionId);
      if (result.success && result.data) {
        onLoadVersion(result.data.groups);
        toast.success('版本已加载');
        onClose();
      } else {
        toast.error(result.error || '加载版本失败');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载版本失败');
    } finally {
      setIsLoadingVersion(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy年MM月dd日 HH:mm:ss', { locale: zhCN });
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            版本历史
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>暂无版本历史</p>
            <p className="text-sm mt-1">保存数据后将自动创建版本</p>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {versions.map((version, index) => (
              <div
                key={version.versionId}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-blue-600">
                      {versions.length - index}
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(version.savedAt)}
                    </span>
                    {index === 0 && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                        最新
                      </span>
                    )}
                  </div>
                  {version.comment && (
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      {version.comment}
                    </p>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLoadVersion(version.versionId)}
                  disabled={isLoadingVersion === version.versionId}
                >
                  {isLoadingVersion === version.versionId ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      加载中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      恢复此版本
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
          <p className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            最多保留 100 个版本历史，旧版本会自动清理
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
