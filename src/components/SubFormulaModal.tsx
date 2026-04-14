'use client';

import { useState, useEffect, useMemo } from 'react';
import { SubFormula } from '@/lib/types';
import { FormulaParser } from '@/lib/parser';
import { VariableMapper } from '@/lib/mapper';
import { ASTTree } from '@/components/ASTTree';
import { FormulaRenderer } from '@/components/FormulaRenderer';

interface SubFormulaModalProps {
  subFormula: SubFormula;
  onClose: () => void;
}

export function SubFormulaModal({ subFormula, onClose }: SubFormulaModalProps) {
  const [ast, setAst] = useState<any>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>('');

  // 解析公式
  useEffect(() => {
    try {
      console.log('=== SubFormula 数据 ===');
      console.log('英文公式:', subFormula.englishFormula);
      console.log('中文公式:', subFormula.chineseFormula);
      
      const mappingResult = VariableMapper.createMapping(
        subFormula.englishFormula,
        subFormula.chineseFormula
      );
      console.log('变量映射:', mappingResult.mapping);
      
      setMapping(mappingResult.mapping);
      const parsedAst = FormulaParser.parse(subFormula.englishFormula);
      console.log('AST:', parsedAst);
      setAst(parsedAst);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析失败');
    }
  }, [subFormula]);

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

  console.log('SubFormulaModal 渲染, mapping:', mapping);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* 弹窗内容 */}
      <div 
        className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">子公式详情</h3>
              <p className="text-xs text-gray-500">{subFormula.name}</p>
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
        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 140px)' }}>
          {/* 英文公式 */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              英文公式
            </label>
            <div className="px-4 py-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
              <code className="text-sm font-mono text-blue-900">{subFormula.englishFormula}</code>
            </div>
          </div>

          {/* 中文公式 */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              中文公式
            </label>
            <div className="px-4 py-3 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg">
              <span className="text-sm text-green-900">{subFormula.chineseFormula}</span>
            </div>
          </div>

          {/* 公式渲染视图 */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              公式渲染视图
            </label>
            <div className="border border-gray-300 rounded-lg p-4 bg-white">
              <FormulaRenderer
                formula={subFormula.englishFormula}
                mapping={mapping}
                formulaReferences={{}}
              />
            </div>
          </div>

          {/* AST 可视化 */}
          {ast ? (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                公式结构
              </label>
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 max-h-64 overflow-auto">
                <ASTTree ast={ast} mapping={mapping} />
              </div>
            </div>
          ) : error ? (
            <div className="mb-4 text-center py-4 text-gray-500 text-sm">
              公式解析失败：{error}
            </div>
          ) : null}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
