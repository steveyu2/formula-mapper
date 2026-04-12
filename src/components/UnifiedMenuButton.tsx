'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { FormulaGroup } from '@/lib/types';
import { saveData } from '@/lib/storage';
import { VersionHistoryModal } from './VersionHistoryModal';
import { CloudSyncModal } from './CloudSyncModal';

interface UnifiedMenuButtonProps {
  groups: FormulaGroup[];
  setGroups: (groups: FormulaGroup[]) => void;
  setSelectedGroupId: (id: string | null) => void;
  setSelectedFormulaId: (id: string | null) => void;
  onExport: () => void;
  onImport: () => void;
  onUrlImport: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function UnifiedMenuButton({
  groups,
  setGroups,
  setSelectedGroupId,
  setSelectedFormulaId,
  onExport,
  onImport,
  onUrlImport,
  fileInputRef,
}: UnifiedMenuButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCloudConfig, setHasCloudConfig] = useState(false);
  const [cloudConfig, setCloudConfig] = useState<{
    endpoint: string;
    apiKey?: string;
    namespaceId?: string;
  } | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showCloudSyncModal, setShowCloudSyncModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 读取云端配置
  const loadCloudConfig = () => {
    const saved = localStorage.getItem('formulaMapper_cloudConfig');
    if (saved) {
      setCloudConfig(JSON.parse(saved));
      setHasCloudConfig(true);
    } else {
      setCloudConfig(null);
      setHasCloudConfig(false);
    }
  };

  useEffect(() => {
    loadCloudConfig();
  }, []);

  // 监听 storage 变化
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'formulaMapper_cloudConfig') {
        loadCloudConfig();
      }
    };

    const handleConfigChange = () => {
      loadCloudConfig();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('cloudConfigChanged', handleConfigChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cloudConfigChanged', handleConfigChange);
    };
  }, []);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSaveToCloud = async (writePassword?: string) => {
    if (!cloudConfig) return;
    
    setIsSaving(true);
    try {
      const { CloudflareStorageProvider, StorageProviderType } = await import('@/lib/cloud');
      const provider = new CloudflareStorageProvider({
        type: StorageProviderType.CLOUDFLARE,
        endpoint: cloudConfig.endpoint,
        apiKey: cloudConfig.apiKey,
        namespaceId: cloudConfig.namespaceId,
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
        setShowPasswordDialog(false);
      } else {
        toast.error(result.error || '保存失败');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWithPassword = () => {
    setShowPasswordDialog(true);
  };

  const handleLoadFromCloud = async () => {
    if (!cloudConfig) return;
    
    setIsLoading(true);
    try {
      const { CloudflareStorageProvider, StorageProviderType } = await import('@/lib/cloud');
      const provider = new CloudflareStorageProvider({
        type: StorageProviderType.CLOUDFLARE,
        endpoint: cloudConfig.endpoint,
        apiKey: cloudConfig.apiKey,
        namespaceId: cloudConfig.namespaceId,
      });

      const result = await provider.load('formula-data');
      if (result.success && result.data) {
        setGroups(result.data.groups);
        saveData(result.data.groups);
        
        if (result.data.groups.length > 0) {
          setSelectedGroupId(result.data.groups[0].id);
        } else {
          setSelectedGroupId(null);
        }
        
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

  const handleDataAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all flex items-center gap-2 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-xl shadow-lg py-2 min-w-[200px] z-[150]">
            {/* 数据管理 */}
            <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">数据管理</div>
            <button
              onClick={() => handleDataAction(onExport)}
              className="w-full px-4 py-2.5 text-left hover:bg-blue-50 flex items-center gap-3 transition-colors"
            >
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              导出数据
            </button>
            <button
              onClick={() => handleDataAction(() => fileInputRef.current?.click())}
              className="w-full px-4 py-2.5 text-left hover:bg-blue-50 flex items-center gap-3 transition-colors"
            >
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              导入数据
            </button>
            <button
              onClick={() => handleDataAction(onUrlImport)}
              className="w-full px-4 py-2.5 text-left hover:bg-blue-50 flex items-center gap-3 transition-colors"
            >
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              从 URL 导入
            </button>

            {/* 云端同步 */}
            {hasCloudConfig && (
              <>
                <div className="border-t border-gray-100 my-2"></div>
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">云端同步</div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleSaveWithPassword();
                  }}
                  disabled={isSaving}
                  className="w-full px-4 py-2.5 text-left hover:bg-blue-50 flex items-center gap-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  onClick={() => {
                    setIsOpen(false);
                    handleLoadFromCloud();
                  }}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 text-left hover:bg-blue-50 flex items-center gap-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  onClick={() => {
                    setIsOpen(false);
                    setShowVersionHistory(true);
                  }}
                  className="w-full px-4 py-2.5 text-left hover:bg-blue-50 flex items-center gap-3 transition-colors"
                >
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  版本历史
                </button>
              </>
            )}

            {/* 云同步配置 */}
            <div className="border-t border-gray-100 my-2"></div>
            <button
              onClick={() => {
                setIsOpen(false);
                setShowCloudSyncModal(true);
              }}
              className="w-full px-4 py-2.5 text-left hover:bg-blue-50 flex items-center gap-3 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {hasCloudConfig ? '云同步设置' : '配置云同步'}
            </button>
          </div>
        )}
      </div>

      {/* 密码输入对话框 */}
      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]" onClick={() => setShowPasswordDialog(false)}>
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">输入写入密码</h3>
            <input
              type="password"
              placeholder="请输入密码"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveToCloud((e.target as HTMLInputElement).value);
                }
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowPasswordDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={(e) => {
                  const input = (e.target as HTMLElement).previousElementSibling?.previousElementSibling as HTMLInputElement;
                  handleSaveToCloud(input?.value);
                }}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                确认保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 版本历史弹窗 */}
      {showVersionHistory && (
        <VersionHistoryModal
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          config={cloudConfig}
          onLoadVersion={(loadedGroups) => {
            setGroups(loadedGroups);
            saveData(loadedGroups);
            
            if (loadedGroups.length > 0) {
              setSelectedGroupId(loadedGroups[0].id);
            } else {
              setSelectedGroupId(null);
            }
            
            setSelectedFormulaId(null);
            setShowVersionHistory(false);
          }}
        />
      )}

      {/* 云同步配置弹窗 */}
      {showCloudSyncModal && (
        <CloudSyncModal
          isOpen={showCloudSyncModal}
          onClose={() => setShowCloudSyncModal(false)}
          groups={groups}
          onLoadData={(loadedGroups) => {
            setGroups(loadedGroups);
            saveData(loadedGroups);
            
            if (loadedGroups.length > 0) {
              setSelectedGroupId(loadedGroups[0].id);
            } else {
              setSelectedGroupId(null);
            }
            
            setSelectedFormulaId(null);
          }}
        />
      )}
    </>
  );
}
