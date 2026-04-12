'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Formula, FormulaGroup } from '@/lib/types';
import { FormulaParser } from '@/lib/parser';
import { VariableMapper } from '@/lib/mapper';
import { ASTTree } from '@/components/ASTTree';
import { FormulaRenderer } from '@/components/FormulaRenderer';
import { SubFormulaModal } from '@/components/SubFormulaModal';
import { FormulaPreviewModal } from '@/components/FormulaPreviewModal';
import { loadData, loadColumnHeaders } from '@/lib/storage';

export default function FormulaPreviewPage() {
  const params = useParams();
  const formulaId = params.formulaId as string;
  
  const [formula, setFormula] = useState<Formula | null>(null);
  const [ast, setAst] = useState<any>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>('');
  const [groups, setGroups] = useState<FormulaGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subFormulaModal, setSubFormulaModal] = useState<any>(null);
  const [previewFormula, setPreviewFormula] = useState<Formula | null>(null);

  useEffect(() => {
    // 加载数据
    const savedGroups = loadData();
    const savedHeaders = loadColumnHeaders();
    setGroups(savedGroups);

    // 查找公式
    if (formulaId) {
      for (const group of savedGroups) {
        const found = group.formulas.find(f => f.id === formulaId);
        if (found) {
          setFormula(found);
          parseFormula(found);
          break;
        }
      }
    }
    
    setIsLoading(false);
  }, [formulaId]);

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
      setError(err instanceof Error ? err.message : '解析失败');
    }
  };

  if (isLoading || !formula) {
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
      {/* 顶部工具栏 */}
      <div className="bg-white border-b border-gray-200 flex items-center justify-between flex-shrink-0 shadow-sm" style={{ padding: '10px' }}>
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-900">{(formula as any).level4Group || formula.name || '未命名公式'}</h1>
          <span className="text-sm text-gray-500">预览模式</span>
        </div>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          关闭窗口
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '10px' }}>
        <div className="max-w-5xl mx-auto">
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
                    formula={formula.chineseFormula}
                    mapping={mapping}
                    formulaReferences={Object.entries(formula.variableFormulaMapping || {}).reduce((acc, [variable, refFormulaId]) => {
                      // 检查是否是子公式
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
                    onFormulaReferenceClick={(clickedFormula) => {
                      // 判断是否是子公式
                      const isSubFormula = 'id' in clickedFormula && clickedFormula.id.startsWith('sub_');
                      
                      if (isSubFormula) {
                        // 子公式：显示美观的弹窗
                        setSubFormulaModal(clickedFormula);
                      } else if ('id' in clickedFormula && clickedFormula.id) {
                        // 外部公式：打开页面内预览弹窗
                        const refFormula = groups.flatMap(g => g.formulas).find(f => f.id === clickedFormula.id);
                        if (refFormula) {
                          setPreviewFormula(refFormula);
                        }
                      }
                    }}
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
