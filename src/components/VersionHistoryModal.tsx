'use client';

import { useState, useEffect, Fragment } from 'react';
import { VersionHistoryItem } from '@/lib/cloud/types';
import { FormulaGroup } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { VersionPreviewWindow } from './VersionPreviewWindow';
import { Input } from '@/components/ui/input';
import { Tooltip } from '@/components/Tooltip';

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
  const [previewData, setPreviewData] = useState<{ versionId: string; savedAt: string; groups: FormulaGroup[] } | null>(null);
  const [editingComment, setEditingComment] = useState<{ versionId: string; comment: string } | null>(null);
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [activeTab, setActiveTab] = useState<'fixed' | 'auto'>('fixed'); // 默认显示固定版本

  useEffect(() => {
    if (isOpen && config) {
      loadVersions();
      setActiveTab('fixed'); // 每次打开时默认显示固定版本
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

  const handlePreviewVersion = async (versionId: string) => {
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
        // 从版本列表中找到对应的 savedAt
        const versionInfo = versions.find(v => v.versionId === versionId);
        const savedAt = versionInfo?.savedAt || new Date().toISOString();
        setPreviewData({ versionId, savedAt, groups: result.data.groups });
      } else {
        toast.error(result.error || '预览版本失败');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '预览版本失败');
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

  const handleEditComment = async (versionId: string, newComment: string) => {
    if (!config) return;
    
    setIsSavingComment(true);
    try {
      const { CloudflareStorageProvider, StorageProviderType } = await import('@/lib/cloud');
      const provider = new CloudflareStorageProvider({
        type: StorageProviderType.CLOUDFLARE,
        endpoint: config.endpoint,
        apiKey: config.apiKey,
        namespaceId: config.namespaceId,
      });

      // 先加载版本数据
      const result = await provider.loadVersion('formula-data', versionId);
      if (result.success && result.data) {
        // 重新保存，更新备注
        const saveResult = await provider.save('formula-data', result.data, newComment);
        if (saveResult.success) {
          toast.success('备注已更新');
          setEditingComment(null);
          loadVersions(); // 刷新版本列表
        } else {
          toast.error(saveResult.error || '更新备注失败');
        }
      } else {
        toast.error(result.error || '加载版本失败');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '更新备注失败');
    } finally {
      setIsSavingComment(false);
    }
  };

  return (
    <Fragment>
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
          <div className="mt-4">
            {/* Tab 切换 */}
            <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('fixed')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'fixed'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📌 固定版本
                <span className="ml-2 text-xs opacity-75">
                  ({versions.filter(v => v.versionType === 'fixed').length}/100)
                </span>
              </button>
              <button
                onClick={() => setActiveTab('auto')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'auto'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📅 自动版本
                <span className="ml-2 text-xs opacity-75">
                  ({versions.filter(v => v.versionType === 'auto' || !v.versionType).length}/100)
                </span>
              </button>
            </div>

            {/* 固定版本列表 */}
            {activeTab === 'fixed' && (
              <div>
                {versions.filter(v => v.versionType === 'fixed').length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p>暂无固定版本</p>
                    <p className="text-sm mt-1">每次保存将自动创建固定版本</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {versions.filter(v => v.versionType === 'fixed').map((version, index) => (
                      <VersionItem
                        key={version.versionId}
                        version={version}
                        index={index}
                        versions={versions.filter(v => v.versionType === 'fixed')}
                        formatDate={formatDate}
                        isLoadingVersion={isLoadingVersion}
                        handlePreviewVersion={handlePreviewVersion}
                        handleLoadVersion={handleLoadVersion}
                        editingComment={editingComment}
                        setEditingComment={setEditingComment}
                        handleEditComment={handleEditComment}
                        isSavingComment={isSavingComment}
                        showEditComment={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 自动版本列表 */}
            {activeTab === 'auto' && (
              <div>
                {versions.filter(v => v.versionType === 'auto' || !v.versionType).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p>暂无自动版本</p>
                    <p className="text-sm mt-1">每次保存将自动创建自动版本</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {versions.filter(v => v.versionType === 'auto' || !v.versionType).map((version, index) => (
                      <VersionItem
                        key={version.versionId}
                        version={version}
                        index={index}
                        versions={versions.filter(v => v.versionType === 'auto' || !v.versionType)}
                        formatDate={formatDate}
                        isLoadingVersion={isLoadingVersion}
                        handlePreviewVersion={handlePreviewVersion}
                        handleLoadVersion={handleLoadVersion}
                        editingComment={editingComment}
                        setEditingComment={setEditingComment}
                        handleEditComment={handleEditComment}
                        isSavingComment={isSavingComment}
                        showEditComment={false}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
          <p className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            固定版本和自动版本各最多保留 100 个，旧版本会自动清理
          </p>
        </div>
      </DialogContent>
    </Dialog>
    
    {/* 版本预览窗口 */}
    {previewData && (
      <VersionPreviewWindow
        versionId={previewData.versionId}
        savedAt={previewData.savedAt}
        groups={previewData.groups}
        config={config!}
        onClose={() => setPreviewData(null)}
      />
    )}
    </Fragment>
  );
}

// 版本项组件
interface VersionItemProps {
  version: VersionHistoryItem;
  index: number;
  versions: VersionHistoryItem[];
  formatDate: (dateString: string) => string;
  isLoadingVersion: string | null;
  handlePreviewVersion: (versionId: string) => void;
  handleLoadVersion: (versionId: string) => void;
  editingComment: { versionId: string; comment: string } | null;
  setEditingComment: (value: { versionId: string; comment: string } | null) => void;
  handleEditComment: (versionId: string, newComment: string) => void;
  isSavingComment: boolean;
  showEditComment?: boolean;  // 是否显示编辑备注功能
}

function VersionItem({
  version,
  index,
  versions,
  formatDate,
  isLoadingVersion,
  handlePreviewVersion,
  handleLoadVersion,
  editingComment,
  setEditingComment,
  handleEditComment,
  isSavingComment,
  showEditComment = true,
}: VersionItemProps) {
  const isEditing = editingComment?.versionId === version.versionId;
  const isLatest = index === 0;

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
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
          {isLatest && (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
              最新
            </span>
          )}
          {version.versionType === 'fixed' && (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
              固定
            </span>
          )}
        </div>
        
        {isEditing ? (
          <div className="mt-2 flex gap-2">
            <Input
              value={editingComment.comment}
              onChange={(e) => setEditingComment({ versionId: version.versionId, comment: e.target.value })}
              placeholder="输入备注..."
              className="flex-1 h-8 text-sm"
              disabled={isSavingComment}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleEditComment(version.versionId, editingComment.comment);
                } else if (e.key === 'Escape') {
                  setEditingComment(null);
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => handleEditComment(version.versionId, editingComment.comment)}
              disabled={isSavingComment}
              className="h-8 px-3 text-xs"
            >
              {isSavingComment ? '保存中...' : '保存'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditingComment(null)}
              disabled={isSavingComment}
              className="h-8 px-3 text-xs"
            >
              取消
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-1">
            {version.comment ? (
              <p className="text-sm text-gray-500 truncate">
                {version.comment}
              </p>
            ) : (
              <p className="text-sm text-gray-400 italic">无备注</p>
            )}
            {showEditComment && version.versionType === 'fixed' && (
              <button
                onClick={() => setEditingComment({ versionId: version.versionId, comment: version.comment || '' })}
                className="text-xs text-blue-500 hover:text-blue-700 flex-shrink-0"
                title="编辑备注"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePreviewVersion(version.versionId)}
          disabled={isLoadingVersion === version.versionId}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          预览
        </Button>
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
              恢复
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
