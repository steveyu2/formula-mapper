'use client';

import { useState, useEffect } from 'react';
import { FormulaGroup } from '@/lib/types';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortModalProps {
  groups: FormulaGroup[];
  activeGroupId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (sortedGroups: string[][]) => void;
}

interface TreeNode {
  id: string;
  name: string;
  level: number;
  children: TreeNode[];
  formula?: any; // 如果是公式节点，存储公式数据
}

// 可排序的树节点组件
function SortableTreeNode({ 
  node, 
  isDragging 
}: { 
  node: TreeNode; 
  isDragging: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
    marginLeft: node.level > 1 ? '6px' : '0px',
  };

  const levelColors = [
    { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-300' },
    { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200' },
    { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
    { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
    { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
    { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
    { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' }, // 公式节点
  ];

  const colors = levelColors[node.level - 1] || levelColors[0];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 mb-1 border rounded cursor-move transition-all ${
        isSortableDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-blue-300'
      }`}
      {...attributes}
      {...listeners}
    >
      {/* 拖拽图标 */}
      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="9" cy="6" r="1.5"/>
        <circle cx="15" cy="6" r="1.5"/>
        <circle cx="9" cy="12" r="1.5"/>
        <circle cx="15" cy="12" r="1.5"/>
        <circle cx="9" cy="18" r="1.5"/>
        <circle cx="15" cy="18" r="1.5"/>
      </svg>

      {/* 节点名称 */}
      <span className="flex-1 text-sm font-medium">
        {node.formula ? `📝 ${node.name}` : node.name}
      </span>

      {/* 层级和数量标识 */}
      <div className="flex items-center gap-1.5">
        {node.formula ? (
          <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
            公式
          </span>
        ) : (
          <>
            <span className="text-xs text-gray-500">
              L{node.level}
            </span>
            {node.children.length > 0 && (
              <span className="text-xs text-gray-400">
                {node.children.length}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function SortModal({ groups, activeGroupId, isOpen, onClose, onSave }: SortModalProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // 构建树形结构
  useEffect(() => {
    if (!isOpen || !activeGroupId) return;

    const currentGroup = groups.find(g => g.id === activeGroupId);
    if (!currentGroup) return;

    const nodeMap = new Map<string, TreeNode>();

    currentGroup.formulas.forEach(formula => {
      const fAny = formula as any;
      const levels = [
        fAny.level1Group || '',
        fAny.level2Group || '',
        fAny.level3Group || '',
        fAny.level4Group || '',
        fAny.level5Group || '',
        fAny.level6Group || '',
        fAny.level7Group || '',
      ].filter(Boolean);

      let parentId = null;
      for (let i = 0; i < levels.length; i++) {
        const id = levels.slice(0, i + 1).join(' | ');
        
        if (!nodeMap.has(id)) {
          nodeMap.set(id, {
            id,
            name: levels[i],
            level: i + 1,
            children: [],
          });
        }
        
        if (parentId && nodeMap.has(parentId)) {
          const parentNode = nodeMap.get(parentId)!;
          if (!parentNode.children.find(c => c.id === id)) {
            parentNode.children.push(nodeMap.get(id)!);
          }
        }
        
        parentId = id;
      }
      
      // 将公式作为叶子节点添加到树中
      if (parentId && nodeMap.has(parentId)) {
        const formulaId = `formula-${formula.id}`;
        const parentNode = nodeMap.get(parentId)!;
        
        // 检查是否已经添加过这个公式
        if (!parentNode.children.find(c => c.id === formulaId)) {
          // 使用 level4Group（名称字段）作为显示名称
          const displayName = fAny.level4Group || formula.englishFormula || '未命名公式';
          
          nodeMap.set(formulaId, {
            id: formulaId,
            name: displayName,
            level: levels.length + 1,
            children: [],
            formula: formula,
          });
          parentNode.children.push(nodeMap.get(formulaId)!);
        }
      }
    });

    const rootNodes = Array.from(nodeMap.values())
      .filter(node => node.level === 1);

    setTree(rootNodes);
    
    // 默认全部收起（不设置任何展开节点）
    setExpandedNodes(new Set());
  }, [isOpen, activeGroupId, groups]);

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string);
  };

  const handleDragOver = ({ over }: DragOverEvent) => {
    setOverId(over?.id as string | null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    setOverId(null);

    if (!over || active.id === over.id) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    // 找到活动节点和目标节点
    const findNode = (nodes: TreeNode[], id: string): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node;
        const found = findNode(node.children, id);
        if (found) return found;
      }
      return null;
    };

    const findParent = (nodes: TreeNode[], id: string): TreeNode[] | null => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) return nodes;
        const found = findParent(nodes[i].children, id);
        if (found) return found;
      }
      return null;
    };

    const activeNode = findNode(tree, activeIdStr);
    const overNode = findNode(tree, overIdStr);

    if (!activeNode || !overNode) return;

    // 不允许将父节点拖到自己的子节点
    if (overIdStr.startsWith(activeIdStr + ' | ')) return;

    const activeParent = findParent(tree, activeIdStr);
    const overParent = findParent(tree, overIdStr);

    if (!activeParent || !overParent) return;

    // 在同一父节点内重新排序
    if (activeParent === overParent) {
      const oldIndex = activeParent.findIndex(n => n.id === activeIdStr);
      const newIndex = activeParent.findIndex(n => n.id === overIdStr);
      const newParent = arrayMove(activeParent, oldIndex, newIndex);
      
      const newTree = updateParentInTree(tree, activeParent, newParent);
      setTree(newTree);
    } else {
      // 跨父节点移动
      const activeIndex = activeParent.findIndex(n => n.id === activeIdStr);
      const overIndex = overParent.findIndex(n => n.id === overIdStr);

      const [movedNode] = activeParent.splice(activeIndex, 1);
      overParent.splice(overIndex, 0, movedNode);

      setTree([...tree]);
    }
  };

  const updateParentInTree = (
    tree: TreeNode[],
    oldParent: TreeNode[],
    newParent: TreeNode[]
  ): TreeNode[] => {
    return tree.map(node => {
      if (node.children === oldParent) {
        return { ...node, children: newParent };
      }
      return { ...node, children: updateParentInTree(node.children, oldParent, newParent) };
    });
  };

  // 切换展开/折叠
  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // 展开/收起所有节点
  const toggleAll = () => {
    const allNodeIds = new Set<string>();
    const collectIds = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        if (node.children.length > 0) {
          allNodeIds.add(node.id);
          collectIds(node.children);
        }
      });
    };
    collectIds(tree);

    // 如果所有节点都已展开，则收起所有；否则展开所有
    const allExpanded = Array.from(allNodeIds).every(id => expandedNodes.has(id));
    if (allExpanded) {
      setExpandedNodes(new Set());
    } else {
      setExpandedNodes(allNodeIds);
    }
  };

  // 渲染树
  const renderTree = (nodes: TreeNode[]) => {
    const ids = nodes.map(n => n.id);

    return (
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {nodes.map(node => (
          <div key={node.id}>
            <div className="flex items-center gap-1">
              {node.children.length > 0 ? (
                <>
                  <button
                    onClick={() => toggleExpand(node.id)}
                    className="w-4 h-4 flex items-center justify-center flex-shrink-0 rounded hover:bg-gray-200 text-gray-500 transition-colors"
                  >
                    <svg 
                      className={`w-3 h-3 transition-transform ${expandedNodes.has(node.id) ? 'rotate-90' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // 展开/收起当前节点及其所有子节点
                      const nodeIds = new Set<string>();
                      const collectIds = (n: TreeNode[]) => {
                        n.forEach(child => {
                          nodeIds.add(child.id);
                          collectIds(child.children);
                        });
                      };
                      collectIds([node]);
                      
                      const isExpanded = expandedNodes.has(node.id);
                      const newExpanded = new Set(expandedNodes);
                      if (isExpanded) {
                        nodeIds.forEach(id => newExpanded.delete(id));
                      } else {
                        nodeIds.forEach(id => newExpanded.add(id));
                      }
                      setExpandedNodes(newExpanded);
                    }}
                    className="w-4 h-4 flex items-center justify-center flex-shrink-0 rounded hover:bg-gray-200 text-gray-400 transition-colors"
                    title={expandedNodes.has(node.id) ? '收起所有子节点' : '展开所有子节点'}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {expandedNodes.has(node.id) ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      )}
                    </svg>
                  </button>
                </>
              ) : (
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="2" />
                </svg>
              )}
              <div className="flex-1">
                <SortableTreeNode 
                  node={node} 
                  isDragging={activeId === node.id}
                />
              </div>
            </div>
            
            {expandedNodes.has(node.id) && node.children.length > 0 && (
              <div className="ml-1.5 border-l border-gray-200 pl-1.5 mt-1">
                {renderTree(node.children)}
              </div>
            )}
          </div>
        ))}
      </SortableContext>
    );
  };

  // 从树中提取排序结果
  const extractOrder = (): string[][] => {
    const sortedGroups: string[][] = [];
    
    // 提取所有层级的排序
    const extractLevelOrder = (nodes: TreeNode[], level: number) => {
      if (nodes.length === 0) return;
      
      // 确保数组有足够的长度
      while (sortedGroups.length <= level) {
        sortedGroups.push([]);
      }
      
      // 添加当前层级的名称
      nodes.forEach(node => {
        if (!node.formula) { // 只添加分组节点，不添加公式叶子节点
          sortedGroups[level].push(node.name);
        }
      });
      
      // 递归处理子节点
      nodes.forEach(node => {
        if (node.children.length > 0) {
          extractLevelOrder(node.children, level + 1);
        }
      });
    };
    
    extractLevelOrder(tree, 0);
    
    return sortedGroups;
  };

  const handleSave = () => {
    const sortedGroups = extractOrder();
    onSave(sortedGroups);
  };

  if (!isOpen) return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/30" />
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h3 className="text-base font-semibold">分组排序</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 提示 */}
          <div className="px-4 py-2 bg-blue-50 border-b">
            <p className="text-xs text-blue-700">
              💡 拖拽节点调整顺序
            </p>
          </div>

          {/* 内容区 */}
          <div className="flex-1 overflow-y-auto p-4">
            {tree.length > 0 ? (
              renderTree(tree)
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">暂无分组数据</p>
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="px-4 py-3 border-t flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            >
              保存排序
            </button>
          </div>
        </div>
      </div>

      {/* 拖拽覆盖层 */}
      <DragOverlay>
        {activeId ? (
          <div className="px-3 py-2 bg-blue-500 text-white text-sm rounded shadow-lg opacity-90">
            拖拽中...
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
