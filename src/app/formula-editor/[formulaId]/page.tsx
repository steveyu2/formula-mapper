'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Formula, FormulaGroup, SubFormula } from '@/lib/types';
import { FormulaParser } from '@/lib/parser';
import { VariableMapper } from '@/lib/mapper';
import { ASTTree } from '@/components/ASTTree';
import { SubFormulaManager } from '@/components/SubFormulaManager';
import { FormulaReferenceSelector } from '@/components/FormulaReferenceSelector';
import { FormulaRenderer } from '@/components/FormulaRenderer';
import { SubFormulaModal } from '@/components/SubFormulaModal';
import { FormulaPreviewModal } from '@/components/FormulaPreviewModal';
import { loadData, saveData, loadColumnHeaders } from '@/lib/storage';

export default function FormulaEditorPage() {
  const params = useParams();
  const formulaId = params.formulaId as string;
  
  const [formula, setFormula] = useState<Formula | null>(null);
  const [editFormula, setEditFormula] = useState<Formula | null>(null);
  const [ast, setAst] = useState<any>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [groups, setGroups] = useState<FormulaGroup[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [columnHeaders, setColumnHeaders] = useState<{
    level1?: string;
    level2?: string;
    level3?: string;
    level4?: string;
    level5?: string;
    level6?: string;
    formula?: string;
  }>({});
  const [subFormulaModal, setSubFormulaModal] = useState<SubFormula | null>(null);
  const [previewFormula, setPreviewFormula] = useState<Formula | null>(null);
  
  // 防抖定时器
  const parseTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 加载数据
    const savedGroups = loadData();
    const savedHeaders = loadColumnHeaders();
    setGroups(savedGroups);
    if (savedHeaders) {
      setColumnHeaders(savedHeaders);
    }

    // 查找公式
    if (formulaId) {
      for (const group of savedGroups) {
        const found = group.formulas.find(f => f.id === formulaId);
        if (found) {
          setFormula(found);
          setEditFormula({ ...found });
          parseFormula(found);
          break;
        }
      }
    }
    
    setIsLoading(false);
  }, [formulaId]);

  const parseFormula = useCallback((f: Formula) => {
    // 清除之前的定时器
    if (parseTimerRef.current) {
      clearTimeout(parseTimerRef.current);
    }
    
    // 防抖：300ms 后才解析
    parseTimerRef.current = setTimeout(() => {
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
        setError(err instanceof Error ? err.message : '解析失败');
      }
    }, 300);
  }, []);

  // 点击变量打开对应公式（纯预览模式）
  const handleFormulaReferenceClick = useCallback((clickedFormula: Formula | SubFormula) => {
    // 判断是否是子公式
    const isSubFormula = 'id' in clickedFormula && clickedFormula.id.startsWith('sub_');
    
    if (isSubFormula) {
      // 子公式：显示美观的弹窗
      setSubFormulaModal(clickedFormula as SubFormula);
    } else if ('id' in clickedFormula && clickedFormula.id) {
      // 外部公式：打开页面内预览弹窗
      const refFormula = groups.flatMap(g => g.formulas).find(f => f.id === clickedFormula.id);
      if (refFormula) {
        setPreviewFormula(refFormula);
      }
    }
  }, [groups]);

  const handleSave = async () => {
    if (!editFormula) return;

    setIsSaving(true);
    try {
      // 更新公式
      const updatedGroups = groups.map(group => ({
        ...group,
        formulas: group.formulas.map(f => 
          f.id === editFormula.id ? editFormula : f
        ),
      }));

      setGroups(updatedGroups);
      saveData(updatedGroups);
      
      // 通知原窗口更新
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({
          type: 'FORMULA_UPDATED',
          formulaId: editFormula.id,
          updatedFormula: editFormula,
          groups: updatedGroups
        }, '*');
      }

      // 关闭当前窗口
      window.close();
    } catch (err) {
      alert('保存失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !formula || !editFormula) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部工具栏 - 固定 */}
      <div className="bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0 shadow-sm" style={{ padding: '10px' }}>
        <div className="flex items-center gap-1">
          {/* Tab 导航 */}
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                activeTab === 'edit'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                编辑
              </div>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                activeTab === 'preview'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                预览
              </div>
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.close()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            关闭窗口
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* 内容区 - 可滚动 */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '10px' }}>
        <div className="max-w-5xl mx-auto">
          {/* 编辑 Tab */}
          <div className={activeTab === 'edit' ? 'block' : 'hidden'}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200" style={{ padding: '10px' }}>
            <div className="space-y-4">
              {/* 英文公式 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  英文公式
                </label>
                <textarea
                  value={editFormula.englishFormula || ''}
                  onChange={(e) => {
                    const updated = { ...editFormula, englishFormula: e.target.value };
                    setEditFormula(updated);
                    parseFormula(updated);
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={5}
                  placeholder="输入英文公式"
                />
              </div>

              {/* 中文公式 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  中文公式
                </label>
                <textarea
                  value={editFormula.chineseFormula || ''}
                  onChange={(e) => {
                    const updated = { ...editFormula, chineseFormula: e.target.value };
                    setEditFormula(updated);
                    parseFormula(updated);
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={5}
                  placeholder="输入中文公式"
                />
              </div>

              {/* 分组字段 */}
              <div className="grid grid-cols-2 gap-4">
                {([
                  { key: 'level1Group', defaultLabel: 'L1' },
                  { key: 'level2Group', defaultLabel: 'L2' },
                  { key: 'level3Group', defaultLabel: 'L3' },
                  { key: 'level4Group', defaultLabel: 'L4' },
                  { key: 'level5Group', defaultLabel: 'L5' },
                  { key: 'level6Group', defaultLabel: 'L6' },
                ] as const).map(({ key, defaultLabel }) => {
                  const headerKey = key.replace('Group', '') as keyof typeof columnHeaders;
                  const label = columnHeaders[headerKey] || defaultLabel;
                  return (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {label}
                      </label>
                      <input
                        type="text"
                        value={(editFormula as any)[key] || ''}
                        onChange={(e) => setEditFormula({ ...editFormula, [key]: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`输入${label}`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* 说明 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  说明
                </label>
                <textarea
                  value={editFormula.description || ''}
                  onChange={(e) => setEditFormula({ ...editFormula, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="输入公式说明"
                />
              </div>

              {/* 变量引用公式选择器 */}
              <div>
                <FormulaReferenceSelector
                  groups={groups}
                  variableFormulaMapping={editFormula.variableFormulaMapping || {}}
                  onChange={(mapping) => setEditFormula({ ...editFormula, variableFormulaMapping: mapping })}
                  englishFormula={editFormula.englishFormula}
                  subFormulas={editFormula.subFormulas || []}
                />
              </div>

              {/* 子公式管理 */}
              <div>
                <SubFormulaManager
                  subFormulas={editFormula.subFormulas || []}
                  onChange={(subFormulas) => setEditFormula({ ...editFormula, subFormulas })}
                />
              </div>
            </div>
          </div>
          </div>

          {/* 预览 Tab */}
          <div className={activeTab === 'preview' ? 'block' : 'hidden'}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200" style={{ padding: '10px' }}>
              <div className="space-y-4">
              {/* 公式信息卡片 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">{(formula as any).level4Group || formula.name || '未命名公式'}</h4>
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
                    formula={editFormula.chineseFormula}
                    mapping={mapping}
                    formulaReferences={Object.entries(editFormula.variableFormulaMapping || {}).reduce((acc, [variable, refFormulaId]) => {
                      // 检查是否是子公式
                      if (refFormulaId.startsWith('sub_')) {
                        const subFormulaId = refFormulaId.substring(4);
                        const subFormula = editFormula.subFormulas?.find(sf => sf.id === subFormulaId);
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
                        // 外部公式引用
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
                    }, {} as Record<string, { name: string; englishFormula: string; chineseFormula: string; id?: string; isSubFormula?: boolean }>)}
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
      </div>

      {/* 子公式详情弹窗 */}
      {subFormulaModal && (
        <SubFormulaModal
          subFormula={subFormulaModal}
          onClose={() => setSubFormulaModal(null)}
        />
      )}

      {/* 公式预览弹窗 */}
      {previewFormula && (
        <FormulaPreviewModal
          formula={previewFormula}
          groups={groups}
          onClose={() => setPreviewFormula(null)}
        />
      )}
    </div>
  );
}
