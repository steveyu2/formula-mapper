'use client';

import { useMemo } from 'react';
import { FormulaGroup, SubFormula } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FormulaReferenceSelectorProps {
  groups: FormulaGroup[];
  variableFormulaMapping: Record<string, string>;
  onChange: (_mapping: Record<string, string>) => void;
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
    if (formulaId && formulaId !== '_none_') {
      newMapping[variable] = formulaId;
    } else {
      delete newMapping[variable];
    }
    onChange(newMapping);
  };

  const getSelectedLabel = (formulaId: string | undefined) => {
    if (!formulaId) return '不引用公式';
    if (formulaId.startsWith('sub_')) {
      const sub = subFormulas.find(sf => sf.id === formulaId.substring(4));
      return sub ? sub.name : '不引用公式';
    }
    const formula = allFormulas.find(f => f.id === formulaId);
    return formula ? formula.name : '不引用公式';
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

          return (
            <div key={variable} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm font-mono font-medium">
                  {variable}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>

              <Select
                value={selectedFormulaId || '_none_'}
                onValueChange={(value) => handleSelectFormula(variable, value)}
              >
                <SelectTrigger className="flex-1 h-9 bg-white border-gray-200 hover:border-blue-300 transition-colors">
                  <SelectValue placeholder="选择引用的公式">
                    {getSelectedLabel(selectedFormulaId)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="_none_" className="text-gray-500">
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      不引用公式
                    </span>
                  </SelectItem>

                  {/* 子公式选项 */}
                  {subFormulas.length > 0 && (
                    <SelectGroup>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        子公式
                      </div>
                      {subFormulas.map(subFormula => (
                        <SelectItem key={`sub_${subFormula.id}`} value={`sub_${subFormula.id}`}>
                          <span className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            {subFormula.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}

                  {/* 外部公式选项 */}
                  {groups.map(group => (
                    <SelectGroup key={group.id}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {group.name}
                      </div>
                      {group.formulas.map(formula => (
                        <SelectItem key={formula.id} value={formula.id}>
                          <span className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            {formula.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>

              {/* 显示选中的公式/子公式预览 */}
              {selectedFormulaId && (
                <div className="shrink-0 max-w-[200px] px-2 py-1 bg-gray-50 rounded text-xs text-gray-600 truncate border border-gray-100">
                  {selectedFormulaId.startsWith('sub_')
                    ? subFormulas.find(sf => sf.id === selectedFormulaId.substring(4))?.englishFormula
                    : selectedFormula?.englishFormula
                  }
                </div>
              )}
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
