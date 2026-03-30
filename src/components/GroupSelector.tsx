'use client';

import { useState, useMemo, useEffect } from 'react';
import { FormulaGroup } from '@/lib/types';

interface GroupSelectorProps {
  groups: FormulaGroup[];
  groupId: string | null;
  onChange: (_parentGroupId: string | null, _groupId: string | null) => void;
}

interface TreeNode {
  group: FormulaGroup;
  children: TreeNode[];
}

export function GroupSelector({ groups, groupId, onChange }: GroupSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState<string[]>([]);

  // 当 groups 变化时重置 currentPath
  useEffect(() => {
    setCurrentPath([]);
  }, [groups]);

  // 构建分组树
  const tree = useMemo(() => {
    const buildTree = (parentId: string | null): TreeNode[] => {
      return groups
        .filter(g => (parentId === null && !g.parentId) || g.parentId === parentId)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(g => ({ group: g, children: buildTree(g.id) }));
    };
    return buildTree(null);
  }, [groups]);

  // 获取当前级别的节点
  const currentLevel = useMemo(() => {
    if (currentPath.length === 0) return tree;
    let nodes = tree;
    for (const id of currentPath) {
      const node = nodes.find(n => n.group.id === id);
      if (node) nodes = node.children;
      else return [];
    }
    return nodes;
  }, [tree, currentPath]);

  // 构建显示文本
  const displayText = useMemo(() => {
    if (!groupId) return '请选择分组';
    const path: string[] = [];
    let current = groups.find(g => g.id === groupId);
    while (current) {
      path.unshift(current.name);
      const parentId: string | null = current.parentId;
      current = parentId ? groups.find(g => g.id === parentId) : undefined;
    }
    return path.join(' / ');
  }, [groupId, groups]);

  // 面包屑
  const breadcrumbs = useMemo(() => {
    return currentPath.map(id => {
      const g = groups.find(grp => grp.id === id);
      return { id, name: g?.name || '' };
    });
  }, [currentPath, groups]);

  // 选择分组
  const handleSelect = (node: TreeNode) => {
    if (node.children.length > 0) {
      // 有子分组，展开
      setCurrentPath([...currentPath, node.group.id]);
    } else {
      // 没有子分组，选中
      const ids = [...currentPath, node.group.id];
      onChange(ids[0] || null, node.group.id);
      setIsOpen(false);
      setCurrentPath([]);
    }
  };

  // 直���选择当前分组（不继续展开）
  const handleDirectSelect = (node: TreeNode) => {
    const ids = [...currentPath, node.group.id];
    onChange(ids[0] || null, node.group.id);
    setIsOpen(false);
    setCurrentPath([]);
  };

  // 返回上级
  const handleBack = () => {
    setCurrentPath(prev => prev.slice(0, -1));
  };

  // 重置并打开
  const handleOpen = () => {
    setIsOpen(true);
    setCurrentPath([]);
  };

  // 关闭
  const handleClose = () => {
    setIsOpen(false);
    setCurrentPath([]);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">所属分组</label>
      <button
        type="button"
        onClick={handleOpen}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
      >
        <span className={groupId ? 'text-gray-900' : 'text-gray-400'}>
          {displayText}
        </span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col">
            {/* 面包屑 */}
            {breadcrumbs.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50 text-sm">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  返回
                </button>
                <span className="text-gray-400">/</span>
                {breadcrumbs.map((crumb, i) => (
                  <span key={crumb.id} className="text-gray-600">
                    {crumb.name}
                    {i < breadcrumbs.length - 1 && <span className="mx-1">/</span>}
                  </span>
                ))}
              </div>
            )}

            {/* 选项列表 */}
            <div className="overflow-y-auto flex-1 py-1">
              {currentLevel.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  {groups.length === 0 ? '请先在左侧创建分组' : '暂无子分组'}
                </div>
              ) : (
                currentLevel.map(node => (
                  <div key={node.group.id} className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => handleSelect(node)}
                      className={`flex-1 px-4 py-2.5 text-left hover:bg-blue-50 transition-colors ${
                        groupId === node.group.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      <span>{node.group.name}</span>
                    </button>
                    {node.children.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleDirectSelect(node)}
                        className="px-3 py-2.5 text-blue-600 hover:bg-blue-100 text-sm font-medium transition-colors border-l border-gray-200"
                        title="直接选择此分组"
                      >
                        选择
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 遮罩 */}
          <div className="fixed inset-0 z-40" onClick={handleClose} />
        </>
      )}
    </div>
  );
}
