'use client';

import { useState, useEffect, useMemo } from 'react';
import { Formula, SubFormula, FormulaGroup } from '@/lib/types';
import { FormulaParser } from '@/lib/parser';
import { VariableMapper } from '@/lib/mapper';
import { ASTTree } from '@/components/ASTTree';
import { FormulaRenderer } from '@/components/FormulaRenderer';
import { SubFormulaModal } from './SubFormulaModal';

interface FormulaPreviewModalProps {
  formula: Formula;
  groups: FormulaGroup[];
  onClose: () => void;
}

export function FormulaPreviewModal({ formula, groups, onClose }: FormulaPreviewModalProps) {
  const [ast, setAst] = useState<any>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>('');
  const [subFormulaModal, setSubFormulaModal] = useState<SubFormula | null>(null);

  // 解析公式
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
      setError(err instanceof Error ? err.message : '解析失败');
    }
  }, [formula]);

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 点击变量打开对应公式
  const handleFormulaReferenceClick = (clickedFormula: Formula | SubFormula) => {
    const isSubFormula = 'id' in clickedFormula && clickedFormula.id.startsWith('sub_');
    
    if (isSubFormula) {
      setSubFormulaModal(clickedFormula as SubFormula);
    } else if ('id' in clickedFormula && clickedFormula.id) {
      // 查找外部公式
      const refFormula = groups.flatMap(g => g.formulas).find(f => f.id === clickedFormula.id);
      if (refFormula) {
        // 这里可以递归打开新的预览弹窗，但为了避免复杂性，暂时只打开子公式弹窗
        // 如果需要递归，需要更复杂的状态管理
        setSubFormulaModal({
          id: refFormula.id,
          name: refFormula.name || '未命名',
          englishFormula: refFormula.englishFormula,
          chineseFormula: refFormula.chineseFormula,
        } as SubFormula);
      }
    }
  };

  // 构建公式引用映射
  const formulaReferences = useMemo(() => {
    return Object.entries(formula.variableFormulaMapping || {}).reduce((acc, [variable, refFormulaId]) => {
      if (refFormulaId.startsWith('sub_')) {
        const subFormulaId = refFormulaId.substring(4);
        const subFormula = (formula as any).subFormulas?.find((sf: any) => sf.id === subFormulaId);
        if (subFormula) {
          acc[variable] = {
            name: subFormula.name,
            englishFormula: subFormula.englishFormula,
            chineseFormula: subFormula.chineseFormula,
            id: subFormula.id,
            isSubFormula: true
          };
        }
      } else {
        const refFormula = groups.flatMap(g => g.formulas).find(f => f.id === refFormulaId);
        if (refFormula) {
          acc[variable] = {
            name: refFormula.name || '',
            englishFormula: refFormula.englishFormula,
            chineseFormula: refFormula.chineseFormula,
            id: refFormula.id,
            isSubFormula: false
          };
        }
      }
      return acc;
    }, {} as Record<string, { name: string; englishFormula: string; chineseFormula: string; id?: string; isSubFormula?: boolean }>);
  }, [formula, groups]);

  const level4Name = (formula as any).level4Group || formula.name || '未命名公式';

  return (
    <>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
        {/* 背景遮罩 */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        
        {/* 弹窗内容 */}
        <div 
          className="relative bg-gray-50 rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 顶部标题栏 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{level4Name}</h3>
                <p className="text-xs text-gray-500">公式预览</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/60 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 内容区 */}
          <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
            <div className="space-y-4">
              {/* 公式信息卡片 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">英文公式：</span>
                    <span className="font-mono">{formula.englishFormula}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">中文公式：</span>
                    <span>{formula.chineseFormula}</span>
                  </div>
                </div>
              </div>

              {/* 可交互公式视图 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">公式渲染视图</label>
                <div className="border border-gray-300 rounded-lg p-4 bg-white">
                  <FormulaRenderer
                    formula={formula.chineseFormula}
                    mapping={mapping}
                    formulaReferences={formulaReferences}
                    onFormulaReferenceClick={handleFormulaReferenceClick}
                  />
                </div>
              </div>

              {/* AST 可视化 */}
              {ast ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">公式结构</label>
                  <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 max-h-96 overflow-auto">
                    <ASTTree ast={ast} mapping={mapping} />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>公式解析失败，无法显示可视化</p>
                </div>
              )}

              {/* 变量映射 */}
              {Object.keys(mapping).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">变量映射</label>
                  <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <div className="space-y-2">
                      {Object.entries(mapping).map(([eng, chi]) => (
                        <div key={eng} className="flex items-center gap-2 text-sm">
                          <span className="font-mono font-semibold text-blue-600">{eng}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-gray-700">{chi}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 子公式详情弹窗 */}
      {subFormulaModal && (
        <SubFormulaModal
          subFormula={subFormulaModal}
          onClose={() => setSubFormulaModal(null)}
        />
      )}
    </>
  );
}
