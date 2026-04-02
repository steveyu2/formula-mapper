'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { FormulaGroup } from '@/lib/types';
import { saveData } from '@/lib/storage';
import { VersionHistoryModal } from './VersionHistoryModal';

interface CloudSyncButtonProps {
  groups: FormulaGroup[];
  setGroups: (groups: FormulaGroup[]) => void;
  setSelectedGroupId: (id: string | null) => void;
  setSelectedFormulaId: (id: string | null) => void;
  setShowCloudSyncModal: (show: boolean) => void;
}

export function CloudSyncButton({
  groups,
  setGroups,
  setSelectedGroupId,
  setSelectedFormulaId,
  setShowCloudSyncModal,
}: CloudSyncButtonProps) {
  const [hasConfig, setHasConfig] = useState(false);
  const [config, setConfig] = useState<{
    endpoint: string;
    apiKey?: string;
    namespaceId?: string;
  } | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('formulaMapper_cloudConfig');
    if (saved) {
      setConfig(JSON.parse(saved));
      setHasConfig(true);
    }
  }, []);

  const handleSaveToCloud = async (writePassword?: string) => {
    if (!config) return;
    
    setIsSaving(true);
    try {
      const { CloudflareStorageProvider, StorageProviderType } = await import('@/lib/cloud');
      const provider = new CloudflareStorageProvider({
        type: StorageProviderType.CLOUDFLARE,
        endpoint: config.endpoint,
        apiKey: config.apiKey,
        namespaceId: config.namespaceId,
        writePassword,
      });
      
      const result = await provider.save('formula-data', {
        version: '1.0',
        timestamp: Date.now(),
        groups,
        metadata: { deviceId: navigator.userAgent },
      });
      
      if (result.success) {
        toast.success('数据已保存到云端');
      } else {
        toast.error(result.error || '保存失败');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWithPassword = async () => {
    if (!config) return;
    
    console.log('[CloudSync] 检查是否需要密码...');
    
    try {
      // 先检查 Worker 是否需要密码
      const response = await fetch(`${config.endpoint}/need-password`);
      const result = await response.json();
      
      console.log('[CloudSync] needPassword 结果:', result);
      
      if (result.needPassword) {
        // 需要密码，弹出输入框
        console.log('[CloudSync] 弹出密码输入框');
        setShowPasswordDialog(true);
      } else {
        // 不需要密码，直接保存
        console.log('[CloudSync] 不需要密码，直接保存');
        handleSaveToCloud();
      }
    } catch (error) {
      // 如果检测失败，仍然弹出密码框
      console.log('[CloudSync] 检测失败，弹出密码框:', error);
      setShowPasswordDialog(true);
    }
  };

  const handlePasswordSubmit = (password: string) => {
    setShowPasswordDialog(false);
    handleSaveToCloud(password || undefined);
  };

  const handleLoadFromCloud = async () => {
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
      
      const result = await provider.load('formula-data');
      
      if (result.success && result.data) {
        setGroups(result.data.groups);
        saveData(result.data.groups);
        setSelectedGroupId(null);
        setSelectedFormulaId(null);
        toast.success('数据已从云端加载');
      } else {
        toast.error(result.error || '加载失败');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadVersion = (loadedGroups: FormulaGroup[]) => {
    setGroups(loadedGroups);
    saveData(loadedGroups);
    setSelectedGroupId(null);
    setSelectedFormulaId(null);
  };

  if (!hasConfig) {
    return (
      <button
        onClick={() => setShowCloudSyncModal(true)}
        className="px-5 py-2.5 bg-white border border-blue-200 text-blue-700 rounded-xl font-medium hover:bg-blue-50 transition-all flex items-center gap-2 shadow-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
        云同步
      </button>
    );
  }

  return (
    <>
      <div className="relative group">
        <button className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-2 shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
          云端同步
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-xl shadow-lg py-2 min-w-[160px] z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
          <button
            onClick={handleSaveWithPassword}
            disabled={isSaving}
            className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center gap-3 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <svg className="animate-spin h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
            {isSaving ? '保存中...' : '保存到云端'}
          </button>
          <button
            onClick={handleLoadFromCloud}
            disabled={isLoading}
            className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center gap-3 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
            {isLoading ? '加载中...' : '从云端加载'}
          </button>
          <button
            onClick={() => setShowVersionHistory(true)}
            className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center gap-3 transition-colors text-sm"
          >
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            版本历史
          </button>
          <div className="border-t border-gray-100 my-1"></div>
          <button
            onClick={() => setShowCloudSyncModal(true)}
            className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center gap-3 transition-colors text-sm text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            配置
          </button>
        </div>
      </div>

      <VersionHistoryModal
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        config={config}
        onLoadVersion={handleLoadVersion}
      />

      {/* 密码输入对话框 */}
      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">输入写入密码</h3>
            <p className="text-sm text-gray-600 mb-4">
              保存到云端需要输入写入密码
            </p>
            <input
              type="password"
              placeholder="请输入写入密码"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handlePasswordSubmit((e.target as HTMLInputElement).value);
                }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowPasswordDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const input = document.querySelector('input[type="password"]') as HTMLInputElement;
                  handlePasswordSubmit(input?.value || '');
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                确认保存
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
