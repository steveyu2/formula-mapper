/**
 * 公式查看器组件
 * 
 * 显示公式的可视化信息（AST、变量映射等）
 */

'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FormulaCellData } from '@/lib/types';

interface FormulaViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formulaData: FormulaCellData | null;
}

export function FormulaViewer({ open, onOpenChange, formulaData }: FormulaViewerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>公式详情</DialogTitle>
        </DialogHeader>

        {!formulaData ? (
          <div className="text-center text-gray-500 py-8">无公式数据</div>
        ) : (
        <div className="space-y-6">
          {/* 公式说明 */}
          {formulaData.description && (
            <div>
              <h3 className="text-lg font-semibold mb-2">说明</h3>
              <p className="text-gray-600">{formulaData.description}</p>
            </div>
          )}

          {/* 英文公式 */}
          <div>
            <h3 className="text-lg font-semibold mb-2">英文公式</h3>
            <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
              {formulaData.englishFormula}
            </div>
          </div>

          {/* 中文公式 */}
          <div>
            <h3 className="text-lg font-semibold mb-2">中文公式</h3>
            <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
              {formulaData.chineseFormula}
            </div>
          </div>

          {/* 变量映射 */}
          {Object.keys(formulaData.variableMapping).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">变量映射</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(formulaData.variableMapping).map(([en, zh]) => (
                  <div key={en} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                    <span className="font-mono text-sm font-semibold text-blue-700">{en}</span>
                    <span className="text-gray-500">→</span>
                    <span className="font-mono text-sm text-green-700">{zh}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 子公式 */}
          {formulaData.subFormulas.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">子公式 ({formulaData.subFormulas.length})</h3>
              <div className="space-y-2">
                {formulaData.subFormulas.map(sub => (
                  <div key={sub.id} className="p-3 border rounded-lg">
                    <div className="font-semibold mb-1">{sub.name}</div>
                    <div className="text-sm text-gray-600">
                      <div>英文: {sub.englishFormula}</div>
                      <div>中文: {sub.chineseFormula}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 元数据 */}
          <div className="text-xs text-gray-500 border-t pt-4">
            <div>创建时间: {new Date(formulaData.createdAt).toLocaleString()}</div>
            <div>更新时间: {new Date(formulaData.updatedAt).toLocaleString()}</div>
            <div>ID: {formulaData.id}</div>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
