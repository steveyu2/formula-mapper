'use client';

import { useState, useEffect } from 'react';
import { FormulaGroup } from '@/lib/types';
import { ConfirmDialog } from './ConfirmDialog';

interface GroupListProps {
  groups: FormulaGroup[];
  selectedGroupId: string | null;
  onSelectGroup: (_groupId: string | null) => void;
  onCreateGroup: (_parentId: string | null) => void;
  onDeleteGroup: (_groupId: string) => void;
  onEditGroup: (_groupId: string, _newName: string) => void;
}

export function GroupList({
  groups,
  selectedGroupId,
  onSelectGroup,
  onCreateGroup,
  onDeleteGroup,
  onEditGroup,
}: GroupListProps) {
  const [editingGroup, setEditingGroup] = useState<FormulaGroup | null>(null);
  const [editName, setEditName] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; group: FormulaGroup | null }>({
    open: false,
    group: null,
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // 构建树形结构
  const rootGroups = groups.filter(g => !g.parentId);
  const groupChildren = new Map<string, FormulaGroup[]>();
  groups.filter(g => g.parentId).forEach(g => {
    if (!groupChildren.has(g.parentId!)) {
      groupChildren.set(g.parentId!, []);
    }
    groupChildren.get(g.parentId!)!.push(g);
  });

  // 计算公式数量（包括子分组）
  const countFormulas = (group: FormulaGroup): number => {
    let count = group.formulas.length;
    const children = groupChildren.get(group.id);
    if (children) {
      children.forEach(child => {
        count += countFormulas(child);
      });
    }
    return count;
  };

  const totalFormulaCount = rootGroups.reduce((sum, g) => sum + countFormulas(g), 0);

  const handleEdit = (group: FormulaGroup) => {
    setEditName(group.name);
    setEditingGroup(group);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingGroup && editName.trim()) {
      onEditGroup(editingGroup.id, editName.trim());
      setIsEditModalOpen(false);
      setEditingGroup(null);
      setEditName('');
    }
  };

  const handleDelete = (group: FormulaGroup) => {
    setDeleteConfirm({ open: true, group });
  };

  const confirmDelete = () => {
    if (deleteConfirm.group) {
      onDeleteGroup(deleteConfirm.group.id);
    }
    setDeleteConfirm({ open: false, group: null });
  };

  const toggleExpanded = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  // 当选中的分组变化时，自动展开其所有父分组
  useEffect(() => {
    if (selectedGroupId) {
      const toExpand: string[] = [];
      let current = groups.find(g => g.id === selectedGroupId);
      while (current && current.parentId) {
        toExpand.push(current.parentId);
        const parentId: string = current.parentId;
        current = groups.find(g => g.id === parentId);
      }
      if (toExpand.length > 0) {
        setExpandedGroups(prev => {
          const newExpanded = new Set(prev);
          toExpand.forEach(id => newExpanded.add(id));
          return newExpanded;
        });
      }
    }
  }, [selectedGroupId, groups]);

  // 渲染分组树
  const renderGroupTree = (group: FormulaGroup, level: number = 0) => {
    const formulaCount = countFormulas(group);
    const children = groupChildren.get(group.id);
    const hasChildren = children && children.length > 0;
    const expanded = expandedGroups.has(group.id);

    return (
      <div key={group.id} style={{ marginLeft: `${level * 12}px` }}>
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors group cursor-pointer ${
            selectedGroupId === group.id
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'hover:bg-gray-50'
          }`}
          onClick={() => onSelectGroup(group.id)}
        >
          <div className="flex-1 text-left flex items-center gap-1">
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(group.id);
                }}
                className="p-0.5 text-gray-400 hover:text-gray-600 shrink-0"
              >
                <svg
                  className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
            <span className="truncate">{group.name}</span>
            <span className="text-xs text-gray-400 ml-auto shrink-0">{formulaCount}</span>
          </div>
          <div className="flex items-center gap-0.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateGroup(group.id);
              }}
              className="p-1 text-gray-400 hover:text-green-500"
              title="添加子分组"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(group);
              }}
              className="p-1 text-gray-400 hover:text-blue-500"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(group);
              }}
              className="p-1 text-gray-400 hover:text-red-500"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        {hasChildren && expanded && (
          <div className="mt-0.5">
            {children!.map(child => renderGroupTree(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-medium">公式分组</h2>
        <button
          onClick={() => onCreateGroup(null)}
          className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建
        </button>
      </div>

      <div className="p-3 max-h-96 overflow-y-auto">
        {/* 全部公式 */}
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors cursor-pointer mb-1 ${
            selectedGroupId === null
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'hover:bg-gray-50'
          }`}
          onClick={() => onSelectGroup(null)}
        >
          <span>全部公式</span>
          <span className="text-xs text-gray-400">{totalFormulaCount}</span>
        </div>

        {/* 分组树 */}
        {rootGroups.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            暂无分组
          </div>
        ) : (
          <div className="space-y-0.5">
            {rootGroups.map(group => renderGroupTree(group))}
          </div>
        )}
      </div>

      {/* 编辑分组名称模态框 */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">编辑分组名称</h3>
            </div>
            <div className="p-6">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    handleSaveEdit();
                  }
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        title="删除分组"
        message={`确定删除分组"${deleteConfirm.group?.name}"吗？该分组及其所有子分组内的公式都将被删除。`}
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, group: null })}
      />
    </div>
  );
}
