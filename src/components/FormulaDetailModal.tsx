'use client';

import { useState, useEffect } from 'react';
import { Formula } from '@/lib/types';
import { FormulaParser } from '@/lib/parser';
import { VariableMapper } from '@/lib/mapper';
import { ASTTree } from './ASTTree';
import { FormulaRenderer } from './FormulaRenderer';
import { SubFormulaManager } from './SubFormulaManager';
import { GroupSelector } from './GroupSelector';
import { FormulaReferenceSelector } from './FormulaReferenceSelector';
import { AutocompleteInput } from './AutocompleteInput';

interface FormulaDetailModalProps {
  formula: Formula | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (formula: Formula) => void;
  allFormulas?: Record<string, Formula>;
  groups?: any[];
  isPreviewMode?: boolean; // 预览模式：只显示预览界面，隐藏编辑UI
}

export function FormulaDetailModal({
  formula,
  isOpen,
  onClose,
  onSave,
  allFormulas = {},
  groups = [],
  isPreviewMode = false,
}: FormulaDetailModalProps) {
  const [editFormula, setEditFormula] = useState<Formula | null>(null);
  const [ast, setAst] = useState<any>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>(isPreviewMode ? 'preview' : 'edit');

  useEffect(() => {
    if (formula && isOpen) {
      setEditFormula({ ...formula });
      parseFormula(formula);
    }
  }, [formula, isOpen]);

  const parseFormula = (f: Formula) => {
    try {
      const mappingResult = VariableMapper.createMapping(
        f.englishFormula,
        f.chineseFormula
      );
      setMapping(mappingResult.mapping);
      const parsedAst = FormulaParser.parse(f.englishFormula);
      setAst(parsedAst);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '解析错误');
      setAst(null);
      setMapping({});
    }
  };

  const handleSave = () => {
    if (editFormula) {
      onSave(editFormula);
      onClose();
    }
  };

  if (!isOpen || !formula || !editFormula) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">{isPreviewMode ? '公式详情' : '编辑公式'}</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab 切换 - 预览模式下隐藏 */}
        {!isPreviewMode && (
          <div className="px-6 border-b">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('edit')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'edit'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  编辑
                </div>
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'preview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  预览
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 内容区 */}
        <div className="p-2.5 space-y-2.5 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* 编辑 Tab - 预览模式下隐藏 */}
          {activeTab === 'edit' && !isPreviewMode && (
            <>
              {/* 分组字段 */}
              <div className="grid grid-cols-2 gap-2.5">
            <AutocompleteInput
              label="模块"
              value={(editFormula as any).level1Group || ''}
              onChange={(value) => setEditFormula({ ...editFormula, level1Group: value } as any)}
              options={Array.from(new Set(
                groups.flatMap(g => g.formulas)
                  .map((f: any) => f.level1Group)
                  .filter(Boolean)
              ))}
              placeholder="例如：公共参数"
            />
            <AutocompleteInput
              label="代码"
              value={(editFormula as any).level2Group || ''}
              onChange={(value) => setEditFormula({ ...editFormula, level2Group: value } as any)}
              options={Array.from(new Set(
                groups.flatMap(g => g.formulas)
                  .map((f: any) => f.level2Group)
                  .filter(Boolean)
              ))}
              placeholder="例如：PARAM"
            />
            <AutocompleteInput
              label="全称"
              value={(editFormula as any).level3Group || ''}
              onChange={(value) => setEditFormula({ ...editFormula, level3Group: value } as any)}
              options={Array.from(new Set(
                groups.flatMap(g => g.formulas)
                  .map((f: any) => f.level3Group)
                  .filter(Boolean)
              ))}
              placeholder="例如：参数名称"
            />
            <AutocompleteInput
              label="名称"
              value={(editFormula as any).level4Group || ''}
              onChange={(value) => setEditFormula({ ...editFormula, level4Group: value } as any)}
              options={Array.from(new Set(
                groups.flatMap(g => g.formulas)
                  .map((f: any) => f.level4Group)
                  .filter(Boolean)
              ))}
              placeholder="例如：参数"
            />
            <AutocompleteInput
              label="条件"
              value={(editFormula as any).level5Group || ''}
              onChange={(value) => setEditFormula({ ...editFormula, level5Group: value } as any)}
              options={Array.from(new Set(
                groups.flatMap(g => g.formulas)
                  .map((f: any) => f.level5Group)
                  .filter(Boolean)
              ))}
              placeholder="例如：无"
            />
            <AutocompleteInput
              label="计算方"
              value={(editFormula as any).level6Group || ''}
              onChange={(value) => setEditFormula({ ...editFormula, level6Group: value } as any)}
              options={Array.from(new Set(
                groups.flatMap(g => g.formulas)
                  .map((f: any) => f.level6Group)
                  .filter(Boolean)
              ))}
              placeholder="例如：系统"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">英文公式</label>
            <input
              type="text"
              placeholder="例如：a+b+c*d"
              value={editFormula.englishFormula}
              onChange={(e) => {
                const updated = { ...editFormula, englishFormula: e.target.value };
                setEditFormula(updated);
                parseFormula(updated);
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">中文公式</label>
            <input
              type="text"
              placeholder="例如：变量1+变量2+变量3*变量4"
              value={editFormula.chineseFormula}
              onChange={(e) => {
                const updated = { ...editFormula, chineseFormula: e.target.value };
                setEditFormula(updated);
                parseFormula(updated);
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">说明（可选）</label>
            <textarea
              placeholder="添加公式的详细说明、使用说明或备注..."
              value={editFormula.description || ''}
              onChange={(e) => setEditFormula({ ...editFormula, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {/* 变量引用公式选择器 */}
          <FormulaReferenceSelector
            groups={groups}
            variableFormulaMapping={editFormula.variableFormulaMapping || {}}
            onChange={(mapping) => setEditFormula({ ...editFormula, variableFormulaMapping: mapping })}
            englishFormula={editFormula.englishFormula}
            subFormulas={editFormula.subFormulas || []}
          />

          {/* 子公式管理 */}
          <SubFormulaManager
            subFormulas={editFormula.subFormulas || []}
            onChange={(subFormulas) => setEditFormula({ ...editFormula, subFormulas })}
          />
            </>
          )}

          {/* 预览 Tab */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              {/* 公式渲染视图 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">公式渲染</label>
                <div className="border border-gray-300 rounded-lg p-4 bg-white min-h-[100px]">
                  <FormulaRenderer
                    formula={editFormula.englishFormula}
                    mapping={mapping}
                  />
                </div>
              </div>

              {/* 公式信息 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">{editFormula.name}</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">英文公式：</span>
                    <span className="font-mono">{editFormula.englishFormula}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">中文公式：</span>
                    <span>{editFormula.chineseFormula}</span>
                  </div>
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

              {/* 错误提示 */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  <p className="text-sm font-medium">公式解析错误</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              )}

              {/* 分组信息 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">分组信息</label>
                <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">模块：</span>
                      <span className="font-medium">{(editFormula as any).level1Group || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">代码：</span>
                      <span className="font-medium">{(editFormula as any).level2Group || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">全称：</span>
                      <span className="font-medium">{(editFormula as any).level3Group || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">名称：</span>
                      <span className="font-medium">{(editFormula as any).level4Group || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">条件：</span>
                      <span className="font-medium">{(editFormula as any).level5Group || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">计算方：</span>
                      <span className="font-medium">{(editFormula as any).level6Group || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 - 预览模式下只显示关闭 */}
        <div className="px-6 py-4 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isPreviewMode ? '关闭' : '取消'}
          </button>
          {!isPreviewMode && (
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              更新
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
