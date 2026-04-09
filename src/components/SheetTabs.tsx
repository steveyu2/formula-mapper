'use client';

import { useState, useMemo } from 'react';
import { FormulaGroup } from '@/lib/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SheetTabsProps {
  groups: FormulaGroup[];
  activeGroupId: string | null;
  onSwitchSheet: (groupId: string) => void;
  onCreateSheet: () => void;
  onDeleteSheet: (groupId: string) => void;
  onRenameSheet: (groupId: string, newName: string) => void;
  onReorderSheets: (groups: FormulaGroup[]) => void;
}

export function SheetTabs({
  groups,
  activeGroupId,
  onSwitchSheet,
  onCreateSheet,
  onDeleteSheet,
  onRenameSheet,
  onReorderSheets,
}: SheetTabsProps) {
  // 只获取一级分组（parentId 为 null）
  const rootGroups = groups.filter(g => g.parentId === null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = rootGroups.findIndex(g => g.id === active.id);
      const newIndex = rootGroups.findIndex(g => g.id === over.id);

      const newOrder = arrayMove(rootGroups, oldIndex, newIndex);
      
      // 需要更新完整 groups 数组中的顺序
      const nonRootGroups = groups.filter(g => g.parentId !== null);
      onReorderSheets([...newOrder, ...nonRootGroups]);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="flex items-center gap-1 bg-gray-100 border-b border-gray-200 px-2 py-1 overflow-x-auto">
        <SortableContext
          items={rootGroups.map(g => g.id)}
          strategy={horizontalListSortingStrategy}
        >
          {rootGroups.map((group) => (
            <SortableSheetTab
              key={group.id}
              group={group}
              isActive={group.id === activeGroupId}
              onClick={() => onSwitchSheet(group.id)}
              onDelete={() => onDeleteSheet(group.id)}
              onRename={(name) => onRenameSheet(group.id, name)}
            />
          ))}
        </SortableContext>
        
        <button
          onClick={onCreateSheet}
          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-t-lg transition-colors flex items-center gap-1"
          title="添加新分组"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </DndContext>
  );
}

interface SheetTabProps {
  group: FormulaGroup;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  dragAttributes?: Record<string, any>;
  dragListeners?: Record<string, any>;
}

// 可拖拽的 Sheet Tab 组件
function SortableSheetTab({ group, isActive, onClick, onDelete, onRename }: SheetTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <SheetTab
        group={group}
        isActive={isActive}
        onClick={onClick}
        onDelete={onDelete}
        onRename={onRename}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  );
}

function SheetTab({ group, isActive, onClick, onDelete, onRename, dragAttributes, dragListeners }: SheetTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      if (editName.trim()) {
        onRename(editName.trim());
      }
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(group.name);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editName.trim()) {
      onRename(editName.trim());
    } else {
      setEditName(group.name);
    }
  };

  return (
    <div
      className={`group relative px-4 py-1.5 text-sm cursor-pointer transition-all border-r border-gray-200 ${
        isActive
          ? 'bg-white text-blue-700 font-medium border-t-2 border-t-blue-500'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-t-2 border-t-transparent'
      }`}
      onClick={onClick}
      {...dragListeners}
      {...dragAttributes}
    >
      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="w-32 px-1 py-0.5 text-sm border border-blue-500 rounded outline-none"
          autoFocus
        />
      ) : (
        <div className="flex items-center gap-2" onDoubleClick={handleDoubleClick}>
          {/* 拖拽句柄图标 */}
          <svg 
            className="w-3 h-3 text-gray-400 flex-shrink-0 cursor-grab active:cursor-grabbing" 
            fill="currentColor" 
            viewBox="0 0 24 24"
            {...dragListeners}
            {...dragAttributes}
          >
            <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
          </svg>
          <span className="truncate max-w-[150px]">{group.name}</span>
          <span className="text-xs text-gray-400">({group.formulas?.length || 0})</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`确定删除分组“${group.name}”及其所有公式吗？`)) {
                onDelete();
              }
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 rounded transition-all"
            title="删除分组"
          >
            <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
