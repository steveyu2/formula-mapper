'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { FormulaGroup, SubFormula, Formula } from '@/lib/types';

interface FormulaReferenceSelectorProps {
  groups: FormulaGroup[];
  variableFormulaMapping: Record<string, string>;
  onChange: (mapping: Record<string, string>) => void;
  englishFormula: string;
  subFormulas?: SubFormula[];
}

export function FormulaReferenceSelector({
  groups,
  variableFormulaMapping,
  onChange,
  englishFormula,
  subFormulas = [],
}: FormulaReferenceSelectorProps) {
  const variables = useMemo(() => extractVariables(englishFormula), [englishFormula]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // 构建带层级路径的公式列表
  const allFormulas = useMemo(() => {
    const formulasWithPaths: (Formula & { groupName: string; level3?: string; level4?: string; displayName: string })[] = [];
    
    groups.forEach(group => {
      group.formulas.forEach(formula => {
        const level3 = (formula as any).level3Group || '';
        const level4 = (formula as any).level4Group || formula.name;
        const displayName = level3 ? `${level3}/${level4}` : level4;
        
        formulasWithPaths.push({
          ...formula,
          groupName: group.name,
          level3,
          level4,
          displayName,
        });
      });
    });
    
    return formulasWithPaths;
  }, [groups]);

  // 获取某个变量的搜索词
  const getSearchTerm = (variable: string) => searchTerms[variable] || '';
  
  // 设置某个变量的搜索词
  const setSearchTerm = (variable: string, term: string) => {
    setSearchTerms(prev => ({ ...prev, [variable]: term }));
  };

  // 过滤公式（支持搜索）
  const getFilteredFormulas = (variable: string) => {
    const searchTerm = getSearchTerm(variable);
    if (!searchTerm.trim()) return allFormulas;
    
    const term = searchTerm.toLowerCase().trim();
    return allFormulas.filter(f => 
      f.displayName.toLowerCase().includes(term) ||
      f.englishFormula.toLowerCase().includes(term) ||
      f.chineseFormula.toLowerCase().includes(term) ||
      f.level3?.toLowerCase().includes(term) ||
      f.level4?.toLowerCase().includes(term)
    );
  };

  // 按分组组织过滤后的公式
  const getGroupedFormulas = (variable: string) => {
    const filtered = getFilteredFormulas(variable);
    const grouped: Record<string, typeof allFormulas> = {};
    filtered.forEach(formula => {
      if (!grouped[formula.groupName]) {
        grouped[formula.groupName] = [];
      }
      grouped[formula.groupName].push(formula);
    });
    return grouped;
  };

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const ref = dropdownRefs.current[openDropdown];
        const triggerRef = triggerRefs.current[openDropdown];
        if (ref && !ref.contains(event.target as Node) && triggerRef && !triggerRef.contains(event.target as Node)) {
          setOpenDropdown(null);
          setDropdownPosition(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // 打开下拉框时计算位置
  const handleOpenDropdown = (variable: string) => {
    if (openDropdown === variable) {
      setOpenDropdown(null);
      setDropdownPosition(null);
    } else {
      setOpenDropdown(variable);
      const trigger = triggerRefs.current[variable];
      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }
    }
  };

  if (variables.length === 0) {
    return null;
  }

  const handleSelectFormula = (variable: string, formulaId: string) => {
    const newMapping = { ...variableFormulaMapping };
    if (formulaId && formulaId !== '_none_') {
      newMapping[variable] = formulaId;
    } else {
      delete newMapping[variable];
    }
    onChange(newMapping);
    setOpenDropdown(null);
  };

  const getSelectedLabel = (formulaId: string | undefined) => {
    if (!formulaId) return '不引用公式';
    if (formulaId.startsWith('sub_')) {
      const sub = subFormulas.find(sf => sf.id === formulaId.substring(4));
      return sub ? sub.name : '不引用公式';
    }
    const formula = allFormulas.find(f => f.id === formulaId);
    return formula ? formula.displayName : '不引用公式';
  };

  return (
    <div className="mt-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        变量引用公式映射
      </h4>
      <p className="text-xs text-gray-500 mb-4">
        选择变量引用的公式，选中后会在公式展示中显示引用链接
      </p>
      <div className="space-y-3">
        {variables.map(variable => {
          const selectedFormulaId = variableFormulaMapping[variable];
          const selectedFormula = allFormulas.find(f => f.id === selectedFormulaId);
          const isOpen = openDropdown === variable;
          const groupedFormulas = getGroupedFormulas(variable);
          const filteredCount = getFilteredFormulas(variable).length;

          return (
            <div key={variable} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm" ref={(el) => { dropdownRefs.current[variable] = el; }}>
              <div className="flex items-center gap-2 shrink-0 pt-1">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-mono font-medium">
                  {variable}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>

              <div className="flex-1 space-y-2">
                {/* 自定义下拉触发器 */}
                <button
                  type="button"
                  ref={(el) => { triggerRefs.current[variable] = el; }}
                  onClick={() => handleOpenDropdown(variable)}
                  className="w-full h-9 px-3 text-left bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors flex items-center justify-between"
                >
                  <span className="text-sm">{getSelectedLabel(selectedFormulaId)}</span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* 下拉内容 - 使用 fixed 定位 */}
                {isOpen && dropdownPosition && (
                  <div 
                    ref={(el) => { dropdownRefs.current[variable] = el; }}
                    className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg" 
                    style={{ 
                      top: `${dropdownPosition.top}px`, 
                      left: `${dropdownPosition.left}px`, 
                      width: `${dropdownPosition.width}px`,
                      maxHeight: '24rem',
                    }}
                  >
                    {/* 搜索框 */}
                    <div className="p-2 border-b border-gray-200">
                      <input
                        type="text"
                        placeholder="搜索公式..."
                        value={getSearchTerm(variable)}
                        onChange={(e) => setSearchTerm(variable, e.target.value)}
                        className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    </div>

                    {/* 选项列表 */}
                    <div className="overflow-y-auto" style={{ maxHeight: 'calc(24rem - 3rem)' }}>
                      {/* 不引用公式 */}
                      <button
                        type="button"
                        onClick={() => handleSelectFormula(variable, '_none_')}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        不引用公式
                      </button>

                      {/* 子公式选项 */}
                      {subFormulas.length > 0 && (
                        <div>
                          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                            子公式
                          </div>
                          {subFormulas.map(subFormula => (
                            <button
                              key={`sub_${subFormula.id}`}
                              type="button"
                              onClick={() => handleSelectFormula(variable, `sub_${subFormula.id}`)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
                            >
                              <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              {subFormula.name}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* 外部公式选项 */}
                      {Object.entries(groupedFormulas).map(([groupName, formulas]) => (
                        <div key={groupName}>
                          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                            {groupName}
                          </div>
                          {formulas.map((formula) => (
                            <button
                              key={formula.id}
                              type="button"
                              onClick={() => handleSelectFormula(variable, formula.id)}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2"
                            >
                              <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <span className="flex-1 truncate">{formula.displayName}</span>
                            </button>
                          ))}
                        </div>
                      ))}

                      {/* 无结果提示 */}
                      {getSearchTerm(variable) && filteredCount === 0 && (
                        <div className="px-4 py-8 text-center text-sm text-gray-500">
                          没有找到匹配的公式
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 显示选中的公式/子公式预览 */}
                {selectedFormulaId && (
                  <div className="px-2 py-1 bg-gray-50 rounded text-xs text-gray-600 truncate border border-gray-100">
                    {selectedFormulaId.startsWith('sub_')
                      ? subFormulas.find(sf => sf.id === selectedFormulaId.substring(4))?.englishFormula
                      : selectedFormula?.englishFormula
                    }
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function extractVariables(formula: string): string[] {
  const regex = /\b[A-Za-z][A-Za-z0-9_]*\b/g;
  const matches = formula.match(regex);
  if (!matches) return [];

  const seen = new Set<string>();
  const variables: string[] = [];

  for (const match of matches) {
    if (!seen.has(match)) {
      seen.add(match);
      variables.push(match);
    }
  }

  return variables;
}
