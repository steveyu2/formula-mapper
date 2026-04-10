/**
 * Excel 导入导出
 * 
 * 使用 ExcelJS 处理 .xlsx 文件
 */

import { SheetData, FormulaCellData, SheetRow } from '@/lib/types';

/**
 * Excel 原始单元格数据
 */
export interface ExcelCellData {
  value: any;
  style?: any;
  row: number;
  column: number;
}

/**
 * Excel 原始行数据
 */
export interface ExcelRowData {
  rowIndex: number;
  cells: ExcelCellData[];
  height?: number;
}

/**
 * Excel 完整 Sheet 数据
 */
export interface ExcelSheetData {
  name: string;
  headers: string[];
  rows: ExcelRowData[];
  merges: string[];
  columnCount: number;
  rowCount: number;
}

/**
 * 从 Excel 导入数据（完整保留原始结构和内容）
 */
export async function importFromExcel(file: File): Promise<SheetData[]> {
  // 动态导入 ExcelJS（减少初始包大小）
  const ExcelJS = await import('exceljs');
  
  const workbook = new ExcelJS.default.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);
  
  const sheets: SheetData[] = [];
  
  workbook.eachSheet((worksheet: any) => {
    const sheetData = parseCompleteWorksheet(worksheet);
    sheets.push(sheetData);
  });
  
  return sheets;
}

/**
 * 解析完整的工作表数据
 */
function parseCompleteWorksheet(worksheet: any): SheetData {
  const sheet: SheetData = {
    name: worksheet.name,
    rows: [],
  };
  
  // 获取合并单元格信息
  const merges: string[] = [];
  if (worksheet.model.merges) {
    worksheet.model.merges.forEach((merge: string) => {
      merges.push(merge);
    });
  }
  
  // 解析每一行
  worksheet.eachRow({ includeEmpty: true }, (row: any, rowNumber: number) => {
    const rowData = parseCompleteRow(row, rowNumber, worksheet);
    if (rowData) {
      sheet.rows.push(rowData);
    }
  });
  
  return sheet;
}

/**
 * 解析完整的行数据（保留所有列和合并单元格信息）
 */
function parseCompleteRow(row: any, rowNumber: number, worksheet: any): SheetRow | null {
  const cellValues: any[] = [];
  
  // 获取所有单元格的值（包括空单元格）
  row.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
    cellValues[colNumber - 1] = cell.value;
  });
  
  // 如果整行都为空，跳过
  const hasData = cellValues.some((val: any) => val !== undefined && val !== null && val !== '');
  if (!hasData) {
    return null;
  }
  
  // 第一行作为表头，不加入数据行
  if (rowNumber === 1) {
    return null;
  }
  
  // 根据 swapdata.xlsx 的实际结构解析
  // A=模块(0), B=代码(1), C=全称(2), D=名称(3), E=条件(4), 
  // F=计算方(5), G=计算公式(6), H=计算依据(7), I=说明(8), J=数据规范(9)
  const module_ = String(cellValues[0] || '');
  const code = String(cellValues[1] || '');
  const fullName = String(cellValues[2] || '');
  const name = String(cellValues[3] || '');
  const condition = String(cellValues[4] || '');
  const calculator = String(cellValues[5] || '');
  const formula = String(cellValues[6] || '');
  const basis = parseCellValue(cellValues[7]);  // 解析 RichText
  const description = parseCellValue(cellValues[8]);  // 解析 RichText
  const dataSpec = parseCellValue(cellValues[9]);  // 解析 RichText
  
  // 如果模块和代码都为空，跳过
  if (!module_ && !code) {
    return null;
  }
  
  // 创建公式单元格（完整保留所有信息）
  const englishFormula: FormulaCellData = {
    id: `formula-${rowNumber}-${code || name || Date.now()}`,
    englishFormula: formula,
    chineseFormula: description,
    description: `${module_} - ${name || fullName}`,
    variableMapping: {
      '模块': module_,
      '代码': code,
      '全称': fullName,
      '名称': name,
      '条件': condition,
      '计算方': calculator,
      '计算依据': basis,
      '数据规范': dataSpec,
    },
    subFormulas: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  const chineseFormula: FormulaCellData = {
    ...englishFormula,
    id: `formula-cn-${rowNumber}-${code || name || Date.now()}`,
  };
  
  return {
    level1Group: module_,
    level2Group: code,
    level3Group: name,
    level4Group: condition || undefined,
    level5Group: calculator || undefined,
    level6Group: basis || undefined,
    englishFormula,
    chineseFormula,
  };
}

/**
 * 解析单元格值（支持 RichText 富文本）
 */
function parseCellValue(value: any): string {
  if (!value) return '';
  
  // 如果是字符串，直接返回
  if (typeof value === 'string') {
    return value;
  }
  
  // 如果是 RichText 对象
  if (typeof value === 'object' && value.richText && Array.isArray(value.richText)) {
    return value.richText
      .map((item: any) => item.text || '')
      .join('')
      .trim();
  }
  
  // 其他类型转为字符串
  return String(value);
}



/**
 * 导出数据到 Excel
 */
export async function exportToExcel(sheets: SheetData[]): Promise<Blob> {
  // 动态导入 ExcelJS
  const ExcelJS = await import('exceljs');
  
  const workbook = new ExcelJS.default.Workbook();
  
  sheets.forEach(sheet => {
    const worksheet = workbook.addWorksheet(sheet.name);
    
    // 添加表头
    worksheet.addRow([
      '分组1',
      '分组2',
      '分组3',
      '英文公式',
      '中文公式',
    ]);
    
    // 设置表头样式
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E7FF' },
    };
    
    // 添加数据行
    sheet.rows.forEach(row => {
      const excelRow = worksheet.addRow([
        row.level1Group,
        row.level2Group,
        row.level3Group,
        JSON.stringify(row.englishFormula),  // 序列化为 JSON
        JSON.stringify(row.chineseFormula),  // 序列化为 JSON
      ]);
      
      // 设置单元格样式
      excelRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        cell.alignment = { vertical: 'middle', wrapText: true };
      });
    });
    
    // 设置列宽
    worksheet.getColumn(1).width = 15;
    worksheet.getColumn(2).width = 15;
    worksheet.getColumn(3).width = 15;
    worksheet.getColumn(4).width = 40;
    worksheet.getColumn(5).width = 40;
  });
  
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * 导出 Excel 并下载
 */
export async function downloadExcelExport(sheets: SheetData[], filename?: string): Promise<void> {
  const blob = await exportToExcel(sheets);
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `formula-mapper-${Date.now()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
