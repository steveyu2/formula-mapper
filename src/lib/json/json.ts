/**
 * JSON 导入导出
 * 
 * 处理 .json 文件的导入和导出
 */

import { SheetData, ExportDataV2, JsonImportResult, ExportDataV1 } from '@/lib/types';

/**
 * 导出为 JSON
 */
export function exportToJson(
  sheets: SheetData[],
  options: { pretty?: boolean; includeMetadata?: boolean } = {}
): string {
  const { pretty = true, includeMetadata = true } = options;

  const exportData: ExportDataV2 = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    columnHeaders: {
      level1: '分组1',
      level2: '分组2',
      level3: '分组3',
      englishFormula: '英文公式',
      chineseFormula: '中文公式',
    },
    sheets: sheets.map(sheet => ({
      name: sheet.name,
      rows: sheet.rows.map(row => {
        const rowData: any = {
          level1Group: row.level1Group,
          level2Group: row.level2Group,
          level3Group: row.level3Group,
        };

        // 可选字段
        if (row.level4Group) rowData.level4Group = row.level4Group;
        if (row.level5Group) rowData.level5Group = row.level5Group;
        if (row.level6Group) rowData.level6Group = row.level6Group;

        // 公式列
        if (includeMetadata) {
          rowData.englishFormula = row.englishFormula;
          rowData.chineseFormula = row.chineseFormula;
        } else {
          // 简化模式：只保留公式字符串
          rowData.englishFormula = row.englishFormula.englishFormula;
          rowData.chineseFormula = row.chineseFormula.chineseFormula;
        }

        return rowData;
      }),
    })),
  };

  return pretty ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
}

/**
 * 导出 JSON 并下载
 */
export function downloadJsonExport(sheets: SheetData[], filename?: string): void {
  const json = exportToJson(sheets, { pretty: true });
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `formula-mapper-v2-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * 从 JSON 导入
 */
export async function importFromJson(file: File): Promise<JsonImportResult> {
  const text = await file.text();

  let rawData: any;
  try {
    rawData = JSON.parse(text);
  } catch {
    throw new Error('无效的 JSON 文件格式');
  }

  // 检测版本
  const version = rawData.version || '1.0';

  // 根据版本解析数据
  if (version === '1.0') {
    return importFromV1(rawData as ExportDataV1);
  } else if (version === '2.0') {
    return importFromV2(rawData as ExportDataV2);
  } else {
    throw new Error(`不支持的版本：${version}`);
  }
}

/**
 * 导入 V2 格式
 */
function importFromV2(data: ExportDataV2): JsonImportResult {
  const sheets: SheetData[] = data.sheets.map(sheet => {
    const rows: SheetData['rows'] = sheet.rows.map((row: any) => {
      // 确保公式数据是完整的 FormulaCellData 对象
      const englishFormula = typeof row.englishFormula === 'string'
        ? {
            id: generateId(),
            englishFormula: row.englishFormula,
            chineseFormula: row.chineseFormula || row.englishFormula,
            variableMapping: {},
            subFormulas: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
        : row.englishFormula;

      const chineseFormula = typeof row.chineseFormula === 'string'
        ? {
            id: generateId(),
            englishFormula: (row.englishFormula as any)?.englishFormula || row.chineseFormula,
            chineseFormula: row.chineseFormula,
            variableMapping: {},
            subFormulas: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
        : row.chineseFormula;

      return {
        level1Group: row.level1Group || '',
        level2Group: row.level2Group || '',
        level3Group: row.level3Group || '',
        level4Group: row.level4Group,
        level5Group: row.level5Group,
        level6Group: row.level6Group,
        englishFormula,
        chineseFormula,
      };
    });
    
    return {
      name: sheet.name,
      rows,
    };
  });

  return {
    sheets,
    version: data.version,
    exportDate: data.exportDate,
    rowCount: sheets.reduce((sum, s) => sum + s.rows.length, 0),
  };
}

/**
 * 导入 V1 格式（旧版本兼容）
 */
function importFromV1(data: ExportDataV1): JsonImportResult {
  const oldGroups = data.groups;
  const rows: SheetData['rows'] = oldGroups.flatMap((group: any) =>
    group.formulas.map((formula: any) => ({
      level1Group: group.level1 || '',
      level2Group: group.level2 || '',
      level3Group: group.level3 || '',
      englishFormula: {
        id: formula.id || generateId(),
        englishFormula: formula.englishFormula || '',
        chineseFormula: formula.chineseFormula || '',
        variableMapping: formula.variableFormulaMapping || {},
        subFormulas: formula.subFormulas || [],
        createdAt: formula.createdAt || Date.now(),
        updatedAt: Date.now(),
      },
      chineseFormula: {
        id: formula.id || generateId(),
        englishFormula: formula.englishFormula || '',
        chineseFormula: formula.chineseFormula || '',
        variableMapping: formula.variableFormulaMapping || {},
        subFormulas: formula.subFormulas || [],
        createdAt: formula.createdAt || Date.now(),
        updatedAt: Date.now(),
      },
    }))
  );

  return {
    sheets: [{ name: 'Sheet1', rows }],
    version: '1.0',
    exportDate: data.exportDate,
    rowCount: rows.length,
  };
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
