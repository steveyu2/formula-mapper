'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FormulaSpreadsheet } from '@/components/FormulaSpreadsheet';
import { FormulaGroup, Formula } from '@/lib/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

function VersionPreviewContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [groups, setGroups] = useState<FormulaGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string>('');

  useEffect(() => {
    // 从 URL 参数中获取版本 ID
    const versionId = searchParams.get('id');
    if (!versionId) {
      toast.error('缺少版本 ID');
      router.push('/');
      return;
    }

    try {
      // 从 localStorage 读取数据
      const storageKey = `version_preview_${versionId}`;
      const dataString = localStorage.getItem(storageKey);
      
      if (!dataString) {
        toast.error('找不到预览数据');
        router.push('/');
        return;
      }

      const parsedData = JSON.parse(dataString);
      
      if (parsedData.groups && Array.isArray(parsedData.groups)) {
        setGroups(parsedData.groups);
        // 保存版本日期
        if (parsedData.savedAt) {
          setSavedAt(parsedData.savedAt);
        }
        // 默认选中第一个分组
        if (parsedData.groups.length > 0) {
          setSelectedGroupId(parsedData.groups[0].id);
        }
      } else {
        toast.error('版本数据格式错误');
        router.push('/');
      }
    } catch (error) {
      console.error('解析版本数据失败:', error);
      toast.error('解析版本数据失败');
      router.push('/');
    }
  }, [searchParams, router]);

  const handleRowClick = (formula: Formula) => {
    // 预览模式下不允许编辑
    toast.info('预览模式：无法编辑');
  };

  const handleUpdateFormula = (formulaId: string, updates: Partial<Formula>) => {
    // 预览模式下不允许更新
    toast.info('预览模式：无法编辑');
  };

  const handleAddFormula = () => {
    // 预览模式下不允许添加
    toast.info('预览模式：无法添加');
  };

  const handleDeleteFormula = (formulaId: string) => {
    // 预览模式下不允许删除
    toast.info('预览模式：无法删除');
  };

  const handleOpenSortModal = () => {
    // 预览模式下不允许排序
    toast.info('预览模式：无法排序');
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy年MM月dd日 HH:mm:ss', { locale: zhCN });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-[1800px] mx-auto">
        {/* 顶部信息栏 */}
        <div className="mb-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-4 text-white shadow-lg">
          <h1 className="text-2xl font-bold mb-2">📋 历史版本预览</h1>
          <div className="flex gap-6 text-sm opacity-90">
            {savedAt && (
              <span>📅 版本日期: {formatDate(savedAt)}</span>
            )}
            <span>📊 分组数: {groups.length}</span>
            <span>📝 公式总数: {groups.reduce((sum, g) => sum + g.formulas.length, 0)}</span>
            <span className="text-yellow-200">⚠️ 预览模式 - 只读</span>
          </div>
        </div>

        {/* 表格组件 */}
        <FormulaSpreadsheet
          groups={groups}
          activeGroupId={selectedGroupId}
          onRowClick={handleRowClick}
          onUpdateFormula={handleUpdateFormula}
          onAddFormula={handleAddFormula}
          onDeleteFormula={handleDeleteFormula}
          onOpenSortModal={handleOpenSortModal}
          isPreviewMode={true}
        />
      </div>
    </div>
  );
}

export default function VersionPreviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    }>
      <VersionPreviewContent />
    </Suspense>
  );
}
