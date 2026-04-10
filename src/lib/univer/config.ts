/**
 * Univer 基础配置
 * 
 * 创建和配置 Univer 实例
 */

import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import UniverPresetSheetsCoreZhCN from '@univerjs/preset-sheets-core/locales/zh-CN';

import '@univerjs/preset-sheets-core/lib/index.css';

/**
 * Univer 实例配置
 */
export interface UniverConfig {
  container: HTMLElement | null;
  locale?: LocaleType;
  data?: any;  // 初始数据
}

/**
 * 创建 Univer 实例
 */
export function createUniverInstance(config: UniverConfig) {
  const { container, locale = LocaleType.ZH_CN, data } = config;

  if (!container) {
    throw new Error('Univer container is required');
  }

  // 创建 Univer 实例
  const { univerAPI } = createUniver({
    locale,
    locales: {
      [LocaleType.ZH_CN]: mergeLocales(UniverPresetSheetsCoreZhCN),
    },
    presets: [
      UniverSheetsCorePreset({
        container,
      }),
    ],
  });

  // 创建 Workbook
  const workbook = univerAPI.createUniverSheet(data || {
    id: 'formula-mapper',
    name: 'Formula Mapper',
    sheetOrder: ['Sheet1'],
    styles: {},
    sheets: {
      Sheet1: {
        id: 'Sheet1',
        name: 'Sheet1',
        rowCount: 100,
        columnCount: 26,
        freeze: {
          xSplit: 0,  // 冻结行（表头）
          ySplit: 0,  // 冻结列
        },
        rowData: {},
        columnData: {},
        cellData: {},
      },
    },
  });

  return { univerAPI, workbook };
}

/**
 * 配置固定列（表头和右侧操作列）
 */
export function setupFreeze(workbook: any, options: {
  freezeRows?: number;      // 冻结的行数（表头）
  freezeCols?: number;      // 冻结的列数（左侧）
  freezeRightCols?: number; // 冻结的右侧列数（操作列）
} = {}) {
  const { freezeRows = 1, freezeCols = 0, freezeRightCols = 0 } = options;

  const sheet = workbook.getActiveSheet();
  
  // 使用新的 API 设置冻结
  if (freezeRows > 0) {
    sheet.setFrozenRows(0, freezeRows);
  }
  
  if (freezeCols > 0) {
    sheet.setFrozenColumns(0, freezeCols);
  }
  
  return sheet;
}

/**
 * 配置列宽
 */
export function setupColumnWidths(workbook: any, columns: Array<{
  index: number;
  width: number;
}>) {
  const sheet = workbook.getActiveSheet();
  
  columns.forEach(({ index, width }) => {
    sheet.setColumnWidth(index, width);
  });
}
