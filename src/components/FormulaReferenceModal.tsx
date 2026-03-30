'use client';

import { Formula, SubFormula } from '@/lib/types';
import { FormulaRenderer } from './FormulaRenderer';
import { FormulaParser } from '@/lib/parser';
import { VariableMapper } from '@/lib/mapper';
import { ASTTree } from './ASTTree';
import { useState, useEffect } from 'react';

interface FormulaReferenceModalProps {
  formula: Formula | SubFormula;
  onClose: () => void;
  allFormulas?: Record<string, Formula>;
  subFormulas?: SubFormula[]; // 添加子公式支持
  onNestedReference?: (_formula: Formula | SubFormula) => void;
}

export function FormulaReferenceModal({
  formula,
  onClose,
  allFormulas = {},
  subFormulas = [],
}: FormulaReferenceModalProps) {
  const [ast, setAst] = useState<any>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>('');
  const [nestedReferenceFormula, setNestedReferenceFormula] = useState<Formula | SubFormula | null>(null);

  // 解析公式 - 使用 useEffect 避免在渲染期间调用 setState
  useEffect(() => {
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
  }, [formula.englishFormula, formula.chineseFormula]);

  const mappingItems = Object.entries(mapping);

  // 构建公式引用映射（支持外部公式和子公式）
  const formulaReferences: Record<string, { name: string; englishFormula: string; chineseFormula: string; id: string; isSubFormula: boolean }> = {};

  // 只有 Formula 有 variableFormulaMapping，SubFormula 没有
  if ('variableFormulaMapping' in formula && formula.variableFormulaMapping) {
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

  // 处理公式引用点击
  const handleFormulaReferenceClick = (refFormula: Formula | SubFormula) => {
    setNestedReferenceFormula(refFormula as any);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">{formula.name}</h3>
            <p className="text-sm text-gray-500 mt-1 font-mono">{formula.englishFormula}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-6">
          {/* 变量映射 */}
          {mappingItems.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-3">变量映射</h4>
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
              <h4 className="text-sm font-medium text-gray-600 mb-3">公式展示</h4>
              <div className="bg-slate-50 rounded-lg p-6">
                <FormulaRenderer
                  formula={formula.englishFormula}
                  mapping={mapping}
                  formulaReferences={formulaReferences}
                  onFormulaReferenceClick={handleFormulaReferenceClick}
                />
              </div>
            </div>
          )}

          {/* AST 树 */}
          {ast && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-3">公式结构树</h4>
              <div className="bg-slate-50 rounded-lg p-6">
                <ASTTree
                  ast={ast}
                  mapping={mapping}
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

        {/* 嵌套引用模态框 */}
        {nestedReferenceFormula && (
          <FormulaReferenceModal
            formula={nestedReferenceFormula}
            allFormulas={allFormulas}
            onClose={() => setNestedReferenceFormula(null)}
            onNestedReference={handleFormulaReferenceClick}
          />
        )}
      </div>
    </div>
  );
}
