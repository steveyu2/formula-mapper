'use client';

import { useMemo } from 'react';
import { FormulaGroup, SubFormula } from '@/lib/types';

interface FormulaReferenceSelectorProps {
  groups: FormulaGroup[];
  variableFormulaMapping: Record<string, string>;
  onChange: (mapping: Record<string, string>) => void;
  englishFormula: string;
  subFormulas?: SubFormula[]; // 添加子公式支持
}

export function FormulaReferenceSelector({
  groups,
  variableFormulaMapping,
  onChange,
  englishFormula,
  subFormulas = [],
}: FormulaReferenceSelectorProps) {
  // 使用 useMemo 缓存变量提取，避免重复计算
  const variables = useMemo(() => extractVariables(englishFormula), [englishFormula]);


  // 使用 useMemo 缓存公式列表
  const allFormulas = useMemo(() =>
    groups.flatMap(g =>
      g.formulas.map(f => ({
        ...f,
        groupName: g.name,
      }))
    ),
    [groups]
  );

  if (variables.length === 0) {
    return null;
  }
  const handleSelectFormula = (variable: string, formulaId: string) => {
    const newMapping = { ...variableFormulaMapping };
    if (formulaId) {
      newMapping[variable] = formulaId;
    } else {
      delete newMapping[variable];
    }
    onChange(newMapping);
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <h4 className="text-sm font-medium text-gray-700 mb-3">
        变量引用公式映射（可选）
      </h4>
      <p className="text-xs text-gray-500 mb-3">
        选择变量引用的公式，选中后会在公式展示中显示引用链接
      </p>
      <div className="space-y-3">
        {variables.map(variable => {
          const selectedFormulaId = variableFormulaMapping[variable];
          const selectedFormula = allFormulas.find(f => f.id === selectedFormulaId);

          return (
            <div key={variable} className="flex items-center gap-3">
              <span className="w-24 text-sm font-medium text-gray-700 shrink-0">
                {variable}
              </span>
              <span className="text-gray-400">→</span>
              <select
                value={selectedFormulaId || ''}
                onChange={(e) => handleSelectFormula(variable, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
              >
                <option value="">不引用公式</option>

                {/* 子公式选项 */}
                {subFormulas.length > 0 && (
                  <optgroup key="subformulas" label="子公式">
                    {subFormulas.map(subFormula => (
                      <option key={`sub_${subFormula.id}`} value={`sub_${subFormula.id}`}>
                        {subFormula.name}
                      </option>
                    ))}
                  </optgroup>
                )}

                {/* 外部公式选项 */}
                {groups.map(group => (
                  <optgroup key={group.id} label={group.name}>
                    {group.formulas.map(formula => (
                      <option key={formula.id} value={formula.id}>
                        {formula.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {/* 显示选中的公式/子公式 */}
              {selectedFormulaId && (
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {selectedFormulaId.startsWith('sub_')
                    ? subFormulas.find(sf => sf.id === selectedFormulaId.substring(4))?.englishFormula
                    : selectedFormula?.englishFormula
                  }
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function extractVariables(formula: string): string[] {
  const regex = /\b[A-Za-z][A-Za-z0-9]*\b/g;
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
