/**
 * Univer 完整演示页面
 * 
 * 集成所有功能：表格、导入导出、查看器
 */

'use client';

import { useState, useCallback } from 'react';
import { UniverSheet } from '@/components/spreadsheet/UniverSheet';
import { SheetData, FormulaCellData } from '@/lib/types';
import { downloadExcelExport, importFromExcel } from '@/lib/excel/excel';
import { downloadJsonExport, importFromJson } from '@/lib/json/json';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function UniverDemoPage() {
  const router = useRouter();
  const [sheetData, setSheetData] = useState<SheetData[]>([
    {
      name: 'Sheet1',
      rows: generateTestData(),
    },
  ]);

  /**
   * 处理 Excel 导入
   */
  const handleImportExcel = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const sheets = await importFromExcel(file);
        setSheetData(sheets);
        toast.success(`成功导入 ${sheets.length} 个 Sheet，共 ${sheets.reduce((sum, s) => sum + s.rows.length, 0)} 行`);
      } catch (error: any) {
        toast.error(`导入失败: ${error.message}`);
      }
    };

    input.click();
  }, []);

  /**
   * 处理 JSON 导入
   */
  const handleImportJson = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const result = await importFromJson(file);
        setSheetData(result.sheets);
        toast.success(`成功导入 ${result.sheets.length} 个 Sheet，共 ${result.rowCount} 行`);
      } catch (error: any) {
        toast.error(`导入失败: ${error.message}`);
      }
    };

    input.click();
  }, []);

  /**
   * 处理 Excel 导出
   */
  const handleExportExcel = useCallback(async () => {
    try {
      await downloadExcelExport(sheetData, `formula-mapper-${Date.now()}.xlsx`);
      toast.success('Excel 导出成功');
    } catch (error: any) {
      toast.error(`导出失败: ${error.message}`);
    }
  }, [sheetData]);

  /**
   * 处理 JSON 导出
   */
  const handleExportJson = useCallback(() => {
    try {
      downloadJsonExport(sheetData, `formula-mapper-v2-${Date.now()}.json`);
      toast.success('JSON 导出成功');
    } catch (error: any) {
      toast.error(`导出失败: ${error.message}`);
    }
  }, [sheetData]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部工具栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Formula Mapper v2.0</h1>
            <p className="text-sm text-gray-600 mt-1">
              基于 Univer 的电子表格 | 支持 Excel 和 JSON 导入导出
            </p>
          </div>

          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ← 返回旧版
          </button>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-3">
          {/* 导入 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">导入:</span>
            <button
              onClick={handleImportExcel}
              className="px-3 py-1.5 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              📥 Excel
            </button>
            <button
              onClick={handleImportJson}
              className="px-3 py-1.5 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              📥 JSON
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300"></div>

          {/* 导出 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">导出:</span>
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              📤 Excel
            </button>
            <button
              onClick={handleExportJson}
              className="px-3 py-1.5 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              📤 JSON
            </button>
          </div>

          <div className="w-px h-6 bg-gray-300"></div>

          {/* 统计信息 */}
          <div className="text-sm text-gray-600">
            {sheetData.length} 个 Sheet | {sheetData.reduce((sum, s) => sum + s.rows.length, 0)} 行
          </div>
        </div>
      </div>

      {/* 表格区域 */}
      <div className="p-6">
        <div 
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          style={{ height: 'calc(100vh - 180px)', minHeight: '600px' }}
        >
          <UniverSheet 
            data={sheetData} 
            onDataChange={setSheetData}
          />
        </div>
      </div>

      {/* 使用说明 */}
      <div className="px-6 pb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 使用说明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 表格支持 Excel 和 JSON 两种格式的导入导出</li>
            <li>• 公式数据以 JSON 格式存储，保留完整的复合数据结构</li>
            <li>• Excel 导出会将公式数据序列化为 JSON 字符串</li>
            <li>• 支持 V1 和 V2 格式的 JSON 文件导入（自动兼容旧版本）</li>
            <li>• 点击"返回旧版"可以切换回原来的界面</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * 生成测试数据
 */
function generateTestData() {
  const createFormulaCell = (english: string, chinese: string): FormulaCellData => ({
    id: `formula-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    englishFormula: english,
    chineseFormula: chinese,
    description: '',
    variableMapping: extractVariables(english, chinese),
    subFormulas: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return [
    {
      level1Group: '导数',
      level2Group: '基本公式',
      level3Group: '幂函数',
      englishFormula: createFormulaCell(
        'f(x) = x^n, f\'(x) = n*x^(n-1)',
        'f(x) = x的n次方, f\'(x) = n*x的(n-1)次方'
      ),
      chineseFormula: createFormulaCell(
        'f(x) = x^n, f\'(x) = n*x^(n-1)',
        'f(x) = x的n次方, f\'(x) = n*x的(n-1)次方'
      ),
    },
    {
      level1Group: '导数',
      level2Group: '基本公式',
      level3Group: '三角函数',
      englishFormula: createFormulaCell(
        'f(x) = sin(x), f\'(x) = cos(x)',
        'f(x) = 正弦函数, f\'(x) = 余弦函数'
      ),
      chineseFormula: createFormulaCell(
        'f(x) = sin(x), f\'(x) = cos(x)',
        'f(x) = 正弦函数, f\'(x) = 余弦函数'
      ),
    },
    {
      level1Group: '导数',
      level2Group: '运算法则',
      level3Group: '乘法法则',
      englishFormula: createFormulaCell(
        '(uv)\' = u\'v + uv\'',
        '(uv)\' = u\'v + uv\''
      ),
      chineseFormula: createFormulaCell(
        '(uv)\' = u\'v + uv\'',
        '(uv)\' = u\'v + uv\''
      ),
    },
    {
      level1Group: '积分',
      level2Group: '基本公式',
      level3Group: '幂函数',
      englishFormula: createFormulaCell(
        '∫x^n dx = x^(n+1)/(n+1) + C',
        '∫x的n次方 dx = x的(n+1)次方/(n+1) + C'
      ),
      chineseFormula: createFormulaCell(
        '∫x^n dx = x^(n+1)/(n+1) + C',
        '∫x的n次方 dx = x的(n+1)次方/(n+1) + C'
      ),
    },
    {
      level1Group: '积分',
      level2Group: '基本公式',
      level3Group: '三角函数',
      englishFormula: createFormulaCell(
        '∫sin(x) dx = -cos(x) + C',
        '∫正弦函数 dx = -余弦函数 + C'
      ),
      chineseFormula: createFormulaCell(
        '∫sin(x) dx = -cos(x) + C',
        '∫正弦函数 dx = -余弦函数 + C'
      ),
    },
  ];
}

/**
 * 提取变量映射（简化版）
 */
function extractVariables(english: string, chinese: string): Record<string, string> {
  // 这里应该实现完整的变量提取逻辑
  return {};
}
