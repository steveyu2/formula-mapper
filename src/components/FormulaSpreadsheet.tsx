'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { FormulaGroup, Formula } from '@/lib/types';
import { Minus, Plus, RotateCcw } from 'lucide-react';

interface SpreadsheetRow {
  id: string;
  formulaId: string;
  formula: Formula;
  englishFormula: string;
  chineseFormula: string;
  description: string;
  groupId: string;
  // 6 个分组列
  level1Group?: string;
  level2Group?: string;
  level3Group?: string;
  level4Group?: string;
  level5Group?: string;
  level6Group?: string;
}

interface FormulaSpreadsheetProps {
  groups: FormulaGroup[];
  activeGroupId: string | null;
  onRowClick: (formula: Formula) => void;
  onUpdateFormula: (formulaId: string, updates: Partial<Formula>) => void;
  // 批量更新接口
  onUpdateFormulas?: (formulaIds: string[], updates: Partial<Formula>) => void;
  onAddFormula: () => void;
  onDeleteFormula: (formulaId: string) => void;
  onOpenSortModal: () => void;
  isPreviewMode?: boolean;
  columnHeaders?: {
    level1?: string;
    level2?: string;
    level3?: string;
    level4?: string;
    level5?: string;
    level6?: string;
    formula?: string;
  };
}

export function FormulaSpreadsheet({
  groups,
  activeGroupId,
  onRowClick,
  onUpdateFormula,
  onUpdateFormulas,
  onAddFormula,
  onDeleteFormula,
  onOpenSortModal,
  isPreviewMode = false,
  columnHeaders,
}: FormulaSpreadsheetProps) {
  // 从本地存储读取缩放值
  const [zoom, setZoom] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('formula-spreadsheet-zoom');
      return saved ? parseInt(saved, 10) : 50;
    }
    return 50;
  });

  // 保存缩放值到本地存储
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('formula-spreadsheet-zoom', zoom.toString());
    }
  }, [zoom]);

  // 列宽调整
  const [columnSizes, setColumnSizes] = useState<Record<string, number>>({});
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

  // 固定列状态
  const [pinnedColumns, setPinnedColumns] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('formula-spreadsheet-pinned-columns');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });

  // 保存固定列状态到本地存储
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('formula-spreadsheet-pinned-columns', JSON.stringify(Array.from(pinnedColumns)));
    }
  }, [pinnedColumns]);

  // 切换列固定状态
  const togglePinColumn = (columnId: string) => {
    setPinnedColumns(prev => {
      const newPinned = new Set(prev);
      if (newPinned.has(columnId)) {
        newPinned.delete(columnId);
      } else {
        newPinned.add(columnId);
      }
      return newPinned;
    });
  };

  const lastTouchDistance = React.useRef<number | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // 转换数据为表格行
  const rowData = useMemo<SpreadsheetRow[]>(() => {
    if (!activeGroupId) return [];
    
    const group = groups.find(g => g.id === activeGroupId);
    if (!group) return [];

    // 保持公式在数组中的原始顺序（由用户排序决定）
    // 不再按分组字段自动排序

    return group.formulas.map(formula => ({
      id: formula.id,
      formulaId: formula.id,
      formula,
      englishFormula: formula.englishFormula,
      chineseFormula: formula.chineseFormula,
      description: formula.description || '',
      groupId: group.id,
      level1Group: formula.level1Group || '',
      level2Group: formula.level2Group || '',
      level3Group: formula.level3Group || '',
      level4Group: formula.level4Group || '',
      level5Group: formula.level5Group || '',
      level6Group: formula.level6Group || '',
    }));
  }, [groups, activeGroupId]);

  // 预计算所有 rowSpan 值（O(n) 复杂度）
  const rowSpanCache = useMemo(() => {
    const cache: Record<string, number> = {};
    const fields: (keyof SpreadsheetRow)[] = [
      'level1Group', 'level2Group', 'level3Group', 
      'level4Group', 'level5Group', 'level6Group'
    ];

    fields.forEach(field => {
      let spanStart = 0;
      let spanCount = 1;

      for (let i = 1; i <= rowData.length; i++) {
        const currentVal = (rowData[i]?.[field] as string) || '';
        const prevVal = (rowData[i - 1]?.[field] as string) || '';

        if (i === rowData.length || currentVal !== prevVal) {
          // 记录起始行的 span 值
          cache[`${spanStart}-${field}`] = spanCount;
          // 其他行标记为 0（不渲染）
          for (let j = spanStart + 1; j < i; j++) {
            cache[`${j}-${field}`] = 0;
          }
          spanStart = i;
          spanCount = 1;
        } else {
          spanCount++;
        }
      }
    });

    return cache;
  }, [rowData]);

  // 获取 rowSpan（O(1) 查表）
  const getRowSpan = useCallback((field: keyof SpreadsheetRow, rowIndex: number): number => {
    const key = `${rowIndex}-${field}`;
    return rowSpanCache[key] || 1;
  }, [rowSpanCache]);

  // 判断是否应该显示单元格（合并的第一行）
  const shouldShowCell = useCallback((field: keyof SpreadsheetRow, rowIndex: number): boolean => {
    if (rowIndex === 0) return true;
    const currentVal = rowData[rowIndex]?.[field] || '';
    const prevVal = rowData[rowIndex - 1]?.[field] || '';
    return currentVal !== prevVal;
  }, [rowData]);

  // 列定义
  const columnDefs = useMemo<ColumnDef<SpreadsheetRow>[]>(() => {
    return [
      {
        header: columnHeaders?.level1 || '分组1',
        accessorKey: 'level1Group',
        size: 100,
        meta: {
          rowSpanField: 'level1Group',
        },
      },
      {
        header: columnHeaders?.level2 || '分组2',
        accessorKey: 'level2Group',
        size: 100,
        meta: {
          rowSpanField: 'level2Group',
        },
      },
      {
        header: columnHeaders?.level3 || '分组3',
        accessorKey: 'level3Group',
        size: 100,
        meta: {
          rowSpanField: 'level3Group',
        },
      },
      {
        header: columnHeaders?.level4 || '分组4',
        accessorKey: 'level4Group',
        size: 100,
        meta: {
          rowSpanField: 'level4Group',
        },
      },
      {
        header: columnHeaders?.level5 || '分组5',
        accessorKey: 'level5Group',
        size: 150,
        meta: {
          rowSpanField: 'level5Group',
        },
      },
      {
        header: columnHeaders?.level6 || '分组6',
        accessorKey: 'level6Group',
        size: 150,
        meta: {
          rowSpanField: 'level6Group',
        },
      },
      {
        header: '英文公式',
        accessorKey: 'englishFormula',
        size: 400,
        cell: ({ row, getValue }) => {
          // 使用 row.original.formulaId 而不是 row.id
          const isEditing = editingCell?.rowId === row.original.formulaId && editingCell?.field === 'englishFormula';
          const value = getValue() as string;
          
          if (isEditing && !isPreviewMode) {
            return (
              <div className="px-2 py-1.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={(e) => {
                    // 检查相关目标是否在编辑区域内，避免点击其他按钮时触发保存
                    const relatedTarget = e.relatedTarget as Node | null;
                    if (relatedTarget && e.currentTarget.contains(relatedTarget)) {
                      return;
                    }
                    // 直接从 DOM 获取最新值，避免闭包问题
                    const currentValue = (e.target as HTMLInputElement).value;
                    handleSaveEdit(currentValue);
                  }}
                  onKeyDown={handleEditKeyDown}
                  className="w-full px-2 py-1 text-sm font-mono border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                  style={{ background: '#fffbeb' }}
                />
              </div>
            );
          }
          
          return (
            <div 
              className="px-3 py-2.5 whitespace-normal break-words font-mono text-sm cursor-pointer hover:bg-blue-50 transition-colors"
              onDoubleClick={() => !isPreviewMode && handleStartEdit(row.original.formulaId, 'englishFormula', value)}
              title="双击编辑"
            >
              {value}
            </div>
          );
        },
      },
      {
        header: '中文公式',
        accessorKey: 'chineseFormula',
        size: 500,
        cell: ({ row, getValue }) => {
          // 使用 row.original.formulaId 而不是 row.id
          const isEditing = editingCell?.rowId === row.original.formulaId && editingCell?.field === 'chineseFormula';
          const value = getValue() as string;
          
          if (isEditing && !isPreviewMode) {
            return (
              <div className="px-2 py-1.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={(e) => {
                    // 检查相关目标是否在编辑区域内，避免点击其他按钮时触发保存
                    const relatedTarget = e.relatedTarget as Node | null;
                    if (relatedTarget && e.currentTarget.contains(relatedTarget)) {
                      return;
                    }
                    // 直接从 DOM 获取最新值，避免闭包问题
                    const currentValue = (e.target as HTMLInputElement).value;
                    handleSaveEdit(currentValue);
                  }}
                  onKeyDown={handleEditKeyDown}
                  className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                  style={{ background: '#fffbeb' }}
                />
              </div>
            );
          }
          
          return (
            <div 
              className="px-3 py-2.5 whitespace-normal break-words cursor-pointer hover:bg-purple-50 transition-colors"
              onDoubleClick={() => !isPreviewMode && handleStartEdit(row.original.formulaId, 'chineseFormula', value)}
              title="双击编辑"
            >
              {value}
            </div>
          );
        },
      },
      {
        header: '说明',
        accessorKey: 'description',
        size: 350,
        cell: ({ getValue }) => (
          <div className="px-3 py-2.5 whitespace-normal break-words" style={{ minWidth: '200px' }}>
            {getValue() as string}
          </div>
        ),
      },
      {
        header: '操作',
        accessorKey: 'id',
        size: 120,
        meta: {
          sticky: 'right',
        },
        cellClassName: 'sticky-cell',
        cell: ({ row }) => (
          <div className="flex items-center gap-1 px-3 py-2.5 whitespace-nowrap">
            {isPreviewMode ? (
              <button
                onClick={() => onRowClick(row.original.formula)}
                className="text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 text-xs transition-colors whitespace-nowrap"
                title="预览公式"
              >
                预览
              </button>
            ) : (
              <>
                <button
                  onClick={() => onRowClick(row.original.formula)}
                  className="text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 text-xs transition-colors whitespace-nowrap"
                  title="编辑"
                >
                  编辑
                </button>
                <button
                  onClick={() => onDeleteFormula(row.original.formulaId)}
                  className="text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 text-xs transition-colors whitespace-nowrap"
                  title="删除"
                >
                  删除
                </button>
              </>
            )}
          </div>
        ),
      },
    ];
  }, [columnHeaders, getRowSpan, shouldShowCell, onRowClick, onDeleteFormula]);

  // 创建表格实例
  const table = useReactTable({
    data: rowData,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    defaultColumn: {
      minSize: 100,
      maxSize: 2000,
    },
  });

  // 缩放控制
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 30));
  const handleZoomReset = () => setZoom(100);
  
  // 触摸板手势支持
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 双指触摸开始
      e.preventDefault(); // 阻止浏览器默认缩放
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      lastTouchDistance.current = distance;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance.current) {
      // 双指移动
      e.preventDefault(); // 阻止浏览器默认缩放
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      const delta = distance - lastTouchDistance.current;
      const zoomDelta = Math.round(delta / 3); // 提高灵敏度
      
      setZoom(prev => {
        const newZoom = prev + zoomDelta;
        return Math.max(30, Math.min(200, newZoom));
      });
      
      lastTouchDistance.current = distance;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      lastTouchDistance.current = null;
    }
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + 加号：放大
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
      }
      // Ctrl/Cmd + 减号：缩小
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      }
      // Ctrl/Cmd + 0：重置
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault();
        handleZoomReset();
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // 双击开始编辑
  const handleStartEdit = (rowId: string, field: string, value: string) => {
    setEditingCell({ rowId, field });
    setEditingValue(value);
    // 下一帧聚焦输入框
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  
  // 保存编辑 - 使用参数而不是闭包状态
  const handleSaveEdit = useCallback((forceValue?: string) => {
    if (!editingCell) return;
      
    // 使用传入的值或当前状态值
    const valueToSave = forceValue !== undefined ? forceValue : editingValue;
    
    // 更新公式
    const updates: Partial<Formula> = {};
    if (editingCell.field === 'formulaName') {
      updates.name = valueToSave;
    } else if (editingCell.field === 'englishFormula') {
      updates.englishFormula = valueToSave;
    } else if (editingCell.field === 'chineseFormula') {
      updates.chineseFormula = valueToSave;
    } else if (editingCell.field === 'description') {
      updates.description = valueToSave;
    } else if (editingCell.field.startsWith('level')) {
      // 分组字段保存为公式的扩展属性
      (updates as any)[editingCell.field] = valueToSave;
    }
  
    if (Object.keys(updates).length > 0) {
      // 如果是分组字段，需要批量更新所有被合并的行
      if (editingCell.field.startsWith('level')) {
        const field = editingCell.field as keyof SpreadsheetRow;
        const currentRowIndex = rowData.findIndex(r => r.formulaId === editingCell.rowId);
        
        if (currentRowIndex >= 0) {
          // 找到这个单元格合并的所有行
          const currentValue = rowData[currentRowIndex][field] as string;
          const rowsToUpdate: string[] = [];
          
          // 向前查找
          let startIndex = currentRowIndex;
          for (let i = currentRowIndex; i >= 0; i--) {
            const val = rowData[i][field] as string;
            if (val === currentValue) {
              startIndex = i;
            } else {
              break;
            }
          }
          
          // 向后查找
          for (let i = startIndex; i < rowData.length; i++) {
            const val = rowData[i][field] as string;
            if (val === currentValue) {
              rowsToUpdate.push(rowData[i].formulaId);
            } else {
              break;
            }
          }
          
          // 批量更新所有被合并的行
          if (onUpdateFormulas && rowsToUpdate.length > 1) {
            onUpdateFormulas(rowsToUpdate, updates);
          } else {
            rowsToUpdate.forEach(formulaId => {
              onUpdateFormula(formulaId, updates);
            });
          }
        } else {
          onUpdateFormula(editingCell.rowId, updates);
        }
      } else {
        onUpdateFormula(editingCell.rowId, updates);
      }
    }
  
    setEditingCell(null);
    setEditingValue('');
  }, [editingCell, editingValue, rowData, onUpdateFormula]);
  
  // 取消编辑
  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditingValue('');
  };
  
  // 处理键盘事件
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  // 阻止浏览器的双指缩放手势
  useEffect(() => {
    const container = document.querySelector('.touch-container');
    if (!container) return;

    const preventZoom = (e: Event) => {
      const touchEvent = e as TouchEvent;
      if (touchEvent.touches && touchEvent.touches.length === 2) {
        e.preventDefault();
      }
    };

    container.addEventListener('touchstart', preventZoom, { passive: false });
    container.addEventListener('touchmove', preventZoom, { passive: false });

    return () => {
      container.removeEventListener('touchstart', preventZoom);
      container.removeEventListener('touchmove', preventZoom);
    };
  }, []);

  // 鼠标滚轮 + Cmd/Ctrl 缩放
  useEffect(() => {
    const container = document.querySelector('.touch-container');
    if (!container) return;

    const handleWheel = (e: Event) => {
      const wheelEvent = e as WheelEvent;
      // Cmd (Mac) 或 Ctrl (Windows/Linux) + 滚轮
      if (wheelEvent.metaKey || wheelEvent.ctrlKey) {
        e.preventDefault();
        
        const delta = -wheelEvent.deltaY; // 向上滚动为正
        const zoomDelta = Math.round(delta / 50); // 灵敏度
        
        setZoom(prev => {
          const newZoom = prev + zoomDelta;
          return Math.max(30, Math.min(200, newZoom));
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // 列宽调整处理
  const handleResizeStart = (columnId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnId);
    setResizeStartX(e.clientX);
    
    const column = columnDefs.find(col => {
      const colAny = col as any;
      return colAny.id === columnId || colAny.accessorKey === columnId;
    });
    const currentWidth = (column as any)?.size || 100;
    setResizeStartWidth(currentWidth);
  };

  useEffect(() => {
    if (!resizingColumn) return;

    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      // 使用 requestAnimationFrame 优化性能
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      animationFrameId = requestAnimationFrame(() => {
        const deltaX = e.clientX - resizeStartX;
        const newWidth = Math.max(100, resizeStartWidth + deltaX);
        
        setColumnSizes(prev => ({
          ...prev,
          [resizingColumn]: newWidth,
        }));
      });
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingColumn, resizeStartX, resizeStartWidth, columnSizes, columnDefs]);

  if (!activeGroupId) {
    const hasGroups = groups.length > 0;
    
    return (
      <div className="flex-1 flex items-center justify-center bg-white rounded-lg border border-gray-200">
        <div className="text-center text-gray-500">
          {hasGroups ? (
            <>
              <p className="text-lg mb-2">请选择一个 Sheet</p>
              <p className="text-sm">点击上方 Sheet 标签页选择要查看的内容</p>
            </>
          ) : (
            <>
              <p className="text-lg mb-2">暂无 Sheet</p>
              <p className="text-sm">点击上方 + 按钮创建第一个 Sheet</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white rounded-lg border border-gray-200 h-[calc(100vh-100px)] w-full max-w-full">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* 新增公式按钮 */}
          {!isPreviewMode && (
            <button
              onClick={onAddFormula}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新增公式
            </button>
          )}

          {/* 排序按钮 */}
          {!isPreviewMode && (
            <button
              onClick={onOpenSortModal}
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              排序
            </button>
          )}

          {/* 缩放进度条 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 30}
              className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="缩小"
            >
              <Minus className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-2 w-48">
              <input
                type="range"
                min="30"
                max="200"
                value={zoom}
                onChange={(e) => setZoom(parseInt(e.target.value, 10))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((zoom - 30) / 170) * 100}%, #e5e7eb ${((zoom - 30) / 170) * 100}%, #e5e7eb 100%)`,
                }}
              />
            </div>
            
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 200}
              className="p-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="放大"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* 缩放百分比 */}
          <button
            onClick={handleZoomReset}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors text-gray-600 font-medium"
            title="重置为100%"
          >
            {zoom}%
          </button>
          
          <span className="text-sm text-gray-400">共 {rowData.length} 条</span>
        </div>
      </div>

      {/* 表格容器 */}
      <div 
        className="flex-1 overflow-auto touch-container relative"
        style={{ minHeight: 0, overflowX: 'auto', overflowY: 'auto' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div style={{ zoom: `${zoom}%` }}>
          <table className="border-collapse" style={{ tableLayout: 'auto' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 50 }}>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, headerIndex) => {
                    const isSticky = (header.column.columnDef as any).meta?.sticky;
                    const isPinned = pinnedColumns.has(header.column.id);
                    const columnSize = columnSizes[header.column.id] || header.getSize();
                    
                    // 计算固定列的 left 位置
                    let pinnedLeft: number | undefined = undefined;
                    if (isPinned) {
                      pinnedLeft = 0;
                      // 累加前面所有固定列的宽度
                      for (let i = 0; i < headerIndex; i++) {
                        const prevHeader = headerGroup.headers[i];
                        if (pinnedColumns.has(prevHeader.id)) {
                          const prevSize = columnSizes[prevHeader.id] || prevHeader.getSize();
                          pinnedLeft += prevSize;
                        }
                      }
                    }
                    
                    return (
                      <th
                        key={header.id}
                        className={`px-3 py-2 text-left text-sm font-semibold text-gray-700 border-b border-gray-300 select-none relative`}
                        style={{ 
                          width: (() => {
                            if (header.column.id === 'level1Group' || header.column.id === 'level2Group' || 
                                header.column.id === 'level3Group' || header.column.id === 'level4Group') return '100px';
                            return undefined;
                          })(),
                          minWidth: (() => {
                            if (isSticky === 'right') return `${columnSize}px`;
                            if (header.column.id === 'englishFormula' || header.column.id === 'chineseFormula') return `${300 / (zoom / 100)}px`;
                            if (header.column.id === 'level1Group' || header.column.id === 'level2Group' || 
                                header.column.id === 'level3Group' || header.column.id === 'level4Group') return '100px';
                            return `${200 / (zoom / 100)}px`;
                          })(),
                          maxWidth: (() => {
                            if (header.column.id === 'level1Group' || header.column.id === 'level2Group' || 
                                header.column.id === 'level3Group' || header.column.id === 'level4Group') return '100px';
                            return undefined;
                          })(),
                          position: isSticky === 'right' || isPinned ? 'sticky' : undefined,
                          left: isPinned ? `${pinnedLeft}px` : undefined,
                          right: isSticky === 'right' ? 0 : undefined,
                          top: 0,
                          zIndex: isPinned ? 60 : (isSticky === 'right' ? 58 : 55),
                          overflowWrap: 'break-word',
                          wordBreak: 'break-word',
                          backgroundColor: isPinned || isSticky === 'right' ? '#f3f4f6' : '#f3f4f6',
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span className="flex-1">{flexRender(header.column.columnDef.header, header.getContext())}</span>
                          
                          {/* 固定/取消固定按钮 */}
                          {header.column.id !== 'id' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinColumn(header.column.id);
                              }}
                              className={`p-1 rounded transition-colors flex-shrink-0 ${
                                isPinned 
                                  ? 'text-blue-600 hover:bg-blue-100' 
                                  : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                              }`}
                              title={isPinned ? '取消固定列' : '固定列'}
                            >
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                              </svg>
                            </button>
                          )}
                        </div>
                        
                        {/* 拖拽手柄 */}
                        {!isSticky && (
                          <div
                            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
                            onMouseDown={(e) => handleResizeStart(header.column.id, e)}
                            style={{ zIndex: 50 }}
                          />
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, rowIndex) => (
                <tr key={row.id} className="group hover:bg-blue-50 transition-colors">
                  {row.getVisibleCells().map((cell, cellIndex) => {
                    const rowSpanField = (cell.column.columnDef as any).meta?.rowSpanField;
                    const isSticky = (cell.column.columnDef as any).meta?.sticky;
                    const isPinned = pinnedColumns.has(cell.column.id);
                    const columnSize = columnSizes[cell.column.id] || cell.column.getSize();
                    
                    // 计算固定列的 left 位置
                    let pinnedLeft: number | undefined = undefined;
                    if (isPinned) {
                      pinnedLeft = 0;
                      // 累加前面所有固定列的宽度
                      for (let i = 0; i < cellIndex; i++) {
                        const prevCell = row.getVisibleCells()[i];
                        if (pinnedColumns.has(prevCell.column.id)) {
                          const prevSize = columnSizes[prevCell.column.id] || prevCell.column.getSize();
                          pinnedLeft += prevSize;
                        }
                      }
                    }
                    
                    // 如果是分组列，处理 rowSpan
                    if (rowSpanField) {
                      const field = rowSpanField as keyof SpreadsheetRow;
                      const rowSpan = getRowSpan(field, rowIndex);
                      const showCell = shouldShowCell(field, rowIndex);
                      
                      if (!showCell) {
                        return null;
                      }
                      
                      const value = cell.getValue() as string;
                      const isLevel1or2 = rowSpanField === 'level1Group' || rowSpanField === 'level2Group';
                      const isLevel3or4 = rowSpanField === 'level3Group' || rowSpanField === 'level4Group';
                      const isEditing = editingCell?.rowId === row.original.formulaId && editingCell?.field === rowSpanField;
                      
                      return (
                        <td
                          key={cell.id}
                          rowSpan={rowSpan > 1 ? rowSpan : 1}
                          className={`text-sm font-bold align-middle text-center cursor-cell ${
                            isLevel1or2 ? 'bg-sky-100' : isLevel3or4 ? 'bg-sky-50' : isPinned ? 'bg-gray-50' : 'bg-gray-50'
                          }`}
                          style={{ 
                            width: (() => {
                              if (cell.column.id === 'level1Group' || cell.column.id === 'level2Group' || 
                                  cell.column.id === 'level3Group' || cell.column.id === 'level4Group') return '100px';
                              return undefined;
                            })(),
                            minWidth: (() => {
                              if (isSticky === 'right') return `${columnSize}px`;
                              if (cell.column.id === 'englishFormula' || cell.column.id === 'chineseFormula') return `${300 / (zoom / 100)}px`;
                              if (cell.column.id === 'level1Group' || cell.column.id === 'level2Group' || 
                                  cell.column.id === 'level3Group' || cell.column.id === 'level4Group') return '100px';
                              return `${200 / (zoom / 100)}px`;
                            })(),
                            maxWidth: (() => {
                              if (cell.column.id === 'level1Group' || cell.column.id === 'level2Group' || 
                                  cell.column.id === 'level3Group' || cell.column.id === 'level4Group') return '100px';
                              return undefined;
                            })(),
                            height: rowSpan > 1 ? `${rowSpan * 48}px` : '48px',
                            position: isSticky === 'right' || isPinned ? 'sticky' : undefined,
                            left: isPinned ? `${pinnedLeft}px` : undefined,
                            right: isSticky === 'right' ? 0 : undefined,
                            zIndex: (() => {
                              if (isPinned) return 15; // 左侧固定列
                              if (isSticky === 'right') return 13; // 右侧固定列
                              return 5; // 普通数据单元格
                            })(),
                            overflowWrap: 'break-word',
                            wordBreak: 'break-word',
                          }}
                          onDoubleClick={() => handleStartEdit(row.original.formulaId, rowSpanField as string, value)}
                        >
                          {isEditing ? (
                            <input
                              ref={inputRef}
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={(e) => {
                                const relatedTarget = e.relatedTarget as Node | null;
                                if (relatedTarget && e.currentTarget.contains(relatedTarget)) {
                                  return;
                                }
                                // 直接从 DOM 获取最新值，避免闭包问题
                                const currentValue = (e.target as HTMLInputElement).value;
                                handleSaveEdit(currentValue);
                              }}
                              onKeyDown={handleEditKeyDown}
                              className="w-full px-2 py-1 text-sm font-bold text-center border-2 border-blue-500 rounded outline-none bg-white"
                              style={{ height: '32px' }}
                            />
                          ) : (
                            value
                          )}
                        </td>
                      );
                    }
                    
                    // 普通列
                    const cellValue = cell.getValue() as string;
                    const isEditing = editingCell?.rowId === row.original.formulaId && editingCell?.field === cell.column.id;
                    
                    return (
                      <td
                        key={cell.id}
                        className={`text-sm text-gray-700 cursor-cell ${
                          isSticky === 'right' || isPinned ? 'bg-white group-hover:bg-blue-50' : ''
                        }`}
                        style={{ 
                          width: (() => {
                            if (cell.column.id === 'level1Group' || cell.column.id === 'level2Group' || 
                                cell.column.id === 'level3Group' || cell.column.id === 'level4Group') return '100px';
                            return undefined;
                          })(),
                          minWidth: (() => {
                            if (isSticky === 'right') return `${columnSize}px`;
                            if (cell.column.id === 'englishFormula' || cell.column.id === 'chineseFormula') return `${300 / (zoom / 100)}px`;
                            if (cell.column.id === 'level1Group' || cell.column.id === 'level2Group' || 
                                cell.column.id === 'level3Group' || cell.column.id === 'level4Group') return '100px';
                            return `${200 / (zoom / 100)}px`;
                          })(),
                          maxWidth: (() => {
                            if (cell.column.id === 'level1Group' || cell.column.id === 'level2Group' || 
                                cell.column.id === 'level3Group' || cell.column.id === 'level4Group') return '100px';
                            return undefined;
                          })(),
                          position: isSticky === 'right' || isPinned ? 'sticky' : undefined,
                          left: isPinned ? `${pinnedLeft}px` : undefined,
                          right: isSticky === 'right' ? 0 : undefined,
                          zIndex: (() => {
                            if (isPinned) return 15; // 左侧固定列
                            if (isSticky === 'right') return 13; // 右侧固定列
                            return 5; // 普通数据单元格
                          })(),
                          overflowWrap: 'break-word',
                          wordBreak: 'break-word',
                        }}
                        onDoubleClick={() => handleStartEdit(row.original.formulaId, cell.column.id, cellValue)}
                      >
                        {isEditing ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={(e) => {
                              const relatedTarget = e.relatedTarget as Node | null;
                              if (relatedTarget && e.currentTarget.contains(relatedTarget)) {
                                return;
                              }
                              // 直接从 DOM 获取最新值，避免闭包问题
                              const currentValue = (e.target as HTMLInputElement).value;
                              handleSaveEdit(currentValue);
                            }}
                            onKeyDown={handleEditKeyDown}
                            className="w-full px-2 py-1 text-sm border-2 border-blue-500 rounded outline-none bg-white"
                          />
                        ) : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
