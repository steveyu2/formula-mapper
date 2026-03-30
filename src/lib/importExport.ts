import { FormulaGroup } from './types';

export interface ExportData {
  version: string;
  exportDate: string;
  groups: FormulaGroup[];
}

/**
 * 导出数据为 JSON
 */
export function exportData(groups: FormulaGroup[]): string {
  const data: ExportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    groups,
  };

  return JSON.stringify(data, null, 2);
}

/**
 * 导出数据并下载为文件
 */
export function downloadExportData(groups: FormulaGroup[], filename?: string): void {
  const json = exportData(groups);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `formula-mapper-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * 从 JSON 导入数据
 */
export function importData(json: string): FormulaGroup[] {
  try {
    const data: ExportData = JSON.parse(json);

    // 验证数据格式
    if (!data.version || !Array.isArray(data.groups)) {
      throw new Error('无效的数据格式');
    }

    // 验证每个分组的数据结构
    data.groups.forEach((group, index) => {
      if (!group.id || !group.name || !Array.isArray(group.formulas)) {
        throw new Error(`第 ${index + 1} 个分组的数据格式不正确`);
      }

      // 验证公式数据结构
      group.formulas.forEach((formula, formulaIndex) => {
        if (!formula.id || !formula.name || !formula.englishFormula || !formula.chineseFormula) {
          throw new Error(
            `第 ${index + 1} 个分组中第 ${formulaIndex + 1} 个公式的数据格式不正确`
          );
        }
      });
    });

    return data.groups;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('JSON 格式错误，请检查文件内容');
    }
    throw error;
  }
}

/**
 * 从文件导入数据
 */
export async function importFromFile(file: File): Promise<FormulaGroup[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const groups = importData(content);
        resolve(groups);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };

    reader.readAsText(file);
  });
}
