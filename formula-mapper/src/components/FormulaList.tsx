'use client';

import { useState, useEffect } from 'react';
import { Formula, FormulaGroup, SubFormula } from '@/lib/types';
import { FormulaRenderer } from './FormulaRenderer';
import { ASTTree } from './ASTTree';
import { FormulaParser } from '@/lib/parser';
import { VariableMapper } from '@/lib/mapper';
import { FormulaReferenceModal } from './FormulaReferenceModal';
import { ConfirmDialog } from './ConfirmDialog';

interface FormulaListProps {
  groups: FormulaGroup[];
  selectedGroupId: string | null;
  selectedFormulaId: string | null;
  onSelectFormula: (formulaId: string | null) => void;
  onDeleteFormula: (formulaId: string) => void;
  onEditFormula: (formula: Formula) => void;
}

export function FormulaList({
  groups,
  selectedGroupId,
  selectedFormulaId,
  onSelectFormula,
  onDeleteFormula,
  onEditFormula,
}: FormulaListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // 构建分组路径函数
  const getGroupPath = (groupId: string): string => {
    const path: string[] = [];
    let currentGroup: FormulaGroup | null = groups.find(g => g.id === groupId) || null;
    while (currentGroup) {
      path.unshift(currentGroup.name);
      if (currentGroup.parentId) {
        const parent = groups.find(g => g.id === currentGroup!.parentId);
        currentGroup = parent || null;
      } else {
        currentGroup = null;
      }
    }
    return path.join('/');
  };

  // 获取所有公式并标记分组路径
  const allFormulasWithGroup = groups.flatMap(group =>
    group.formulas.map(formula => ({
      ...formula,
      groupId: group.id,
      groupName: getGroupPath(group.id),
    }))
  );

  // 获取某个分组的所有后代分组 ID（包括自己）
  const getDescendantGroupIds = (groupId: string): string[] => {
    const descendants: string[] = [groupId];
    const children = groups.filter(g => g.parentId === groupId);
    children.forEach(child => {
      descendants.push(...getDescendantGroupIds(child.id));
    });
    return descendants;
  };

  // 根据选择的分组过滤公式
  const formulasWithGroup = selectedGroupId
    ? allFormulasWithGroup.filter(f => {
        // 显示选中分组及其所有后代分组的公式
        return getDescendantGroupIds(selectedGroupId).includes(f.groupId);
      })
    : allFormulasWithGroup;

  // 过滤公式
  const filteredFormulas = searchQuery.trim()
    ? formulasWithGroup.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : formulasWithGroup;

  // 构建公式名称到公式的映射（使用所有公式）
  const formulaMap: Record<string, Formula> = {};
  allFormulasWithGroup.forEach(f => {
    formulaMap[f.id] = f;
    formulaMap[f.name] = f;
  });

  return (
    <div className="space-y-3">
      {/* 搜索框 */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="搜索公式名称..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {filteredFormulas.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>{searchQuery ? '未找到匹配的公式' : '暂无公式'}</p>
          <p className="text-sm mt-1">{searchQuery ? '尝试其他关键词' : '点击"新建公式"开始添加'}</p>
        </div>
      ) : (
        filteredFormulas.map((formula) => (
          <FormulaItem
            key={formula.id}
            groupName={formula.groupName}
            formula={formula}
            allFormulas={formulaMap}
            isExpanded={selectedFormulaId === formula.id}
            onToggle={() =>
              onSelectFormula(
                selectedFormulaId === formula.id ? null : formula.id
              )
            }
            onDelete={() => onDeleteFormula(formula.id)}
            onEdit={() => onEditFormula(formula)}
          />
        ))
      )}
    </div>
  );
}

interface FormulaItemProps {
  formula: Formula;
  groupName: string;
  allFormulas: Record<string, Formula>;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

function FormulaItem({
  formula,
  groupName,
  allFormulas,
  isExpanded,
  onToggle,
  onDelete,
  onEdit,
}: FormulaItemProps) {
  const [ast, setAst] = useState<any>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>('');
  const [referencedFormula, setReferencedFormula] = useState<Formula | SubFormula | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; formula: Formula | null }>({
    open: false,
    formula: null,
  });

  // 当 formula 变化或展开状态变化时，重新解析
  useEffect(() => {
    if (isExpanded) {
      try {
        const mappingResult = VariableMapper.createMapping(
          formula.englishFormula,
          formula.chineseFormula
        );
        setMapping(mappingResult.mapping);
        const parsedAst = FormulaParser.parse(formula.englishFormula);
        setAst(parsedAst);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : '解析错误');
        setAst(null);
        setMapping({});
      }
    } else {
      // 收起时清空状态
      setAst(null);
      setMapping({});
      setError('');
    }
  }, [formula.id, formula.englishFormula, formula.chineseFormula, isExpanded]);

  // 构建公式引用映射（支持外部公式和子公式）
  const formulaReferences: Record<string, { name: string; englishFormula: string; chineseFormula: string; id: string; isSubFormula: boolean }> = {};
  const subFormulas = formula.subFormulas || [];

  // 使用保存的变量到公式的映射
  if (formula.variableFormulaMapping) {
    Object.entries(formula.variableFormulaMapping).forEach(([variable, formulaId]) => {
      // 检查是否是子公式引用（以 sub_ 开头）
      if (formulaId.startsWith('sub_')) {
        const subFormulaId = formulaId.substring(4); // 移除 sub_ 前缀
        const subFormula = subFormulas.find(sf => sf.id === subFormulaId);
        if (subFormula) {
          formulaReferences[variable] = {
            id: subFormula.id,
            name: subFormula.name,
            englishFormula: subFormula.englishFormula,
            chineseFormula: subFormula.chineseFormula,
            isSubFormula: true,
          };
        }
      } else {
        // 外部公式引用
        const referencedFormula = Object.values(allFormulas).find(f => f.id === formulaId);
        if (referencedFormula) {
          formulaReferences[variable] = {
            id: referencedFormula.id,
            name: referencedFormula.name,
            englishFormula: referencedFormula.englishFormula,
            chineseFormula: referencedFormula.chineseFormula,
            isSubFormula: false,
          };
        }
      }
    });
  }

  const mappingItems = Object.entries(mapping);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 公式头部 */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-800">{formula.name}</h3>
            {groupName && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                {groupName}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1 font-mono">
            {formula.englishFormula}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirm({ open: true, formula });
            }}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* 公式详情 */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-6 space-y-6">
          {/* 变量映射 */}
          {mappingItems.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-3">
                变量映射
              </h4>
              <div className="flex flex-wrap gap-2">
                {mappingItems.map(([english, chinese]) => (
                  <div
                    key={english}
                    className="px-3 py-1.5 bg-slate-100 text-gray-700 rounded-md text-sm"
                  >
                    <span>{english}</span>
                    <span className="mx-1.5 text-gray-400">→</span>
                    <span>{chinese}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 公式展示 */}
          {mappingItems.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-3">
                公式展示
              </h4>
              <div className="bg-slate-50 rounded-lg p-6">
                <FormulaRenderer
                  formula={formula.englishFormula}
                  mapping={mapping}
                  formulaReferences={formulaReferences}
                  onFormulaReferenceClick={(refFormula) => {
                    // 直接使用引用结果，让 FormulaReferenceModal 处理显示
                    setReferencedFormula(refFormula as any);
                  }}
                />
              </div>
            </div>
          )}

          {/* AST 树 */}
          {ast && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-3">
                公式结构树
              </h4>
              <div className="bg-slate-50 rounded-lg p-6">
                <ASTTree
                  ast={ast}
                  mapping={mapping}
                  englishFormula={formula.englishFormula}
                  chineseFormula={formula.chineseFormula}
                />
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <p className="text-red-700 font-medium text-sm">解析错误</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* 引用公式模态框 */}
      {referencedFormula && (
        <FormulaReferenceModal
          formula={referencedFormula}
          allFormulas={allFormulas}
          subFormulas={subFormulas}
          onClose={() => setReferencedFormula(null)}
        />
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        title="删除公式"
        message={`确定删除公式"${deleteConfirm.formula?.name}"吗？`}
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        onConfirm={() => {
          onDelete();
          setDeleteConfirm({ open: false, formula: null });
        }}
        onCancel={() => setDeleteConfirm({ open: false, formula: null })}
      />
    </div>
  );
}
