/**
 * Univer 测试页面
 * 
 * 用于测试 Univer 基础功能
 */

'use client';

import { useState } from 'react';
import { UniverSheet } from '@/components/spreadsheet/UniverSheet';
import { SheetData, FormulaCellData } from '@/lib/types';

export default function UniverTestPage() {
  const [sheetData] = useState<SheetData[]>([
    {
      name: 'Sheet1',
      rows: generateTestData(),
    },
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Univer 测试页面</h1>
            <p className="text-sm text-gray-600 mt-1">
              Formula Mapper v2.0 - 基于 Univer 的电子表格
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              返回旧版
            </button>
          </div>
        </div>
      </div>

      {/* 表格区域 */}
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200" style={{ height: 'calc(100vh - 120px)' }}>
          <UniverSheet data={sheetData} />
        </div>
      </div>
    </div>
  );
}

/**
 * 生成测试数据
 */
function generateTestData() {
  const rows: Array<SheetData['rows'][number]> = [];

  // 创建示例公式单元格数据
  const createFormulaCell = (english: string, chinese: string): FormulaCellData => ({
    id: `formula-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    englishFormula: english,
    chineseFormula: chinese,
    variableMapping: extractVariables(english, chinese),
    subFormulas: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // 测试数据
  rows.push({
    level1Group: '导数',
    level2Group: '基本公式',
    level3Group: '幂函数',
    englishFormula: createFormulaCell('d/dx(x^n) = n * x^(n-1)', 'd/dx(x^n) = n × x^(n-1)'),
    chineseFormula: createFormulaCell('d/dx(x^n) = n * x^(n-1)', 'd/dx(x^n) = n × x^(n-1)'),
  });

  rows.push({
    level1Group: '导数',
    level2Group: '基本公式',
    level3Group: '三角函数',
    englishFormula: createFormulaCell('d/dx(sin(x)) = cos(x)', 'd/dx(sin(x)) = cos(x)'),
    chineseFormula: createFormulaCell('d/dx(sin(x)) = cos(x)', 'd/dx(sin(x)) = cos(x)'),
  });

  rows.push({
    level1Group: '导数',
    level2Group: '运算法则',
    level3Group: '乘法法则',
    englishFormula: createFormulaCell('(f * g)\' = f\' * g + f * g\'', '(f × g)\' = f\' × g + f × g\''),
    chineseFormula: createFormulaCell('(f * g)\' = f\' * g + f * g\'', '(f × g)\' = f\' × g + f × g\''),
  });

  rows.push({
    level1Group: '积分',
    level2Group: '基本公式',
    level3Group: '幂函数',
    englishFormula: createFormulaCell('∫ x^n dx = x^(n+1) / (n+1) + C', '∫ x^n dx = x^(n+1) / (n+1) + C'),
    chineseFormula: createFormulaCell('∫ x^n dx = x^(n+1) / (n+1) + C', '∫ x^n dx = x^(n+1) / (n+1) + C'),
  });

  rows.push({
    level1Group: '积分',
    level2Group: '基本公式',
    level3Group: '三角函数',
    englishFormula: createFormulaCell('∫ sin(x) dx = -cos(x) + C', '∫ sin(x) dx = -cos(x) + C'),
    chineseFormula: createFormulaCell('∫ sin(x) dx = -cos(x) + C', '∫ sin(x) dx = -cos(x) + C'),
  });

  return rows;
}

/**
 * 从公式中提取变量映射
 */
function extractVariables(english: string, chinese: string): Record<string, string> {
  const mapping: Record<string, string> = {};
  
  // 简单示例：提取英文变量和中文变量的映射
  const englishVars = english.match(/[a-zA-Z]+/g) || [];
  const chineseVars = chinese.match(/[\u4e00-\u9fa5]+/g) || [];
  
  // 这里只是一个示例，实际应该有更复杂的逻辑
  englishVars.forEach((enVar, index) => {
    if (chineseVars[index]) {
      mapping[enVar] = chineseVars[index];
    }
  });
  
  return mapping;
}
