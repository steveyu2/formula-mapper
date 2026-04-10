/**
 * UniverSheet 组件
 * 
 * 主要的表格组件，使用 Univer 渲染
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createUniverInstance } from '@/lib/univer/config';
import { SheetData, FormulaCellData, FormulaGroup, Formula, SheetRow } from '@/lib/types';
import { FormulaViewer } from '@/components/formula/FormulaViewer';
import { formulaCache } from '@/lib/formula/cache';
import { saveData, loadData } from '@/lib/storage';
import { toast } from 'sonner';

/**
 * 估算文本在给定宽度下需要多少行
 */
function estimateLines(text: string, widthPx: number): number {
  if (!text || widthPx <= 0) return 1;
  
  let chineseCount = 0;
  let englishCount = 0;
  
  for (const char of text) {
    if (char === '\n') continue;
    if (/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(char)) {
      chineseCount++;
    } else {
      englishCount++;
    }
  }
  
  const totalWidth = chineseCount * 12 + englishCount * 7;
  const lines = Math.ceil(totalWidth / widthPx);
  
  return Math.max(1, lines);
}

/**
 * 计算最优列宽（基于内容）
 */
function calculateOptimalWidth(text: string): number {
  if (!text) return 80;
  
  let chineseCount = 0;
  let englishCount = 0;
  
  for (const char of text) {
    if (/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(char)) {
      chineseCount++;
    } else {
      englishCount++;
    }
  }
  
  const pixelWidth = chineseCount * 12 + englishCount * 7;
  const univerWidth = Math.max(80, Math.min(400, pixelWidth * 0.15 + 20));
  
  return Math.ceil(univerWidth);
}

/**
 * 将 SheetData 转换为 FormulaGroup 格式（用于保存到 localStorage）
 */
function convertSheetDataToGroups(sheetData: SheetData[]): FormulaGroup[] {
  const groups: FormulaGroup[] = [];
  
  sheetData.forEach((sheet) => {
    const level1Map = new Map<string, Map<string, Map<string, Formula[]>>>();
    
    sheet.rows.forEach((row) => {
      const level1 = row.level1Group || '未分类';
      const level2 = row.level2Group || '未分类';
      const level3 = row.level3Group || '未分类';
      
      if (!level1Map.has(level1)) {
        level1Map.set(level1, new Map());
      }
      const level2Map = level1Map.get(level1)!;
      
      if (!level2Map.has(level2)) {
        level2Map.set(level2, new Map());
      }
      const level3Map = level2Map.get(level2)!;
      
      if (!level3Map.has(level3)) {
        level3Map.set(level3, []);
      }
      
      const formula: Formula = {
        id: row.englishFormula.id,
        name: row.level3Group,
        englishFormula: row.englishFormula.englishFormula,
        chineseFormula: row.englishFormula.chineseFormula,
        variableMapping: row.englishFormula.variableMapping,
        subFormulas: row.englishFormula.subFormulas,
        createdAt: row.englishFormula.createdAt,
        updatedAt: row.englishFormula.updatedAt,
      };
      
      level3Map.get(level3)!.push(formula);
    });
    
    level1Map.forEach((level2Map, level1Name) => {
      const subGroups: FormulaGroup[] = [];
      
      level2Map.forEach((level3Map, level2Name) => {
        level3Map.forEach((formulas, level3Name) => {
          subGroups.push({
            id: `group-${level1Name}-${level2Name}-${level3Name}`,
            name: level3Name,
            formulas,
            subGroups: [],
          });
        });
      });
      
      groups.push({
        id: `group-${level1Name}`,
        name: level1Name,
        formulas: [],
        subGroups,
      });
    });
  });
  
  return groups;
}

/**
 * 将 FormulaGroup 转换为 SheetData 格式（用于从 localStorage 加载）
 */
function convertGroupsToSheetData(groups: FormulaGroup[]): SheetData[] {
  const sheet: SheetData = {
    name: 'Sheet1',
    rows: [],
  };
  
  function processGroup(group: FormulaGroup, level1: string, level2: string) {
    group.formulas.forEach((formula) => {
      const row: SheetRow = {
        level1Group: level1,
        level2Group: level2,
        level3Group: group.name,
        englishFormula: {
          id: formula.id,
          englishFormula: formula.englishFormula,
          chineseFormula: formula.chineseFormula,
          variableMapping: formula.variableMapping || {},
          subFormulas: formula.subFormulas || [],
          createdAt: formula.createdAt,
          updatedAt: formula.updatedAt,
        },
        chineseFormula: {
          id: formula.id,
          englishFormula: formula.englishFormula,
          chineseFormula: formula.chineseFormula,
          variableMapping: formula.variableMapping || {},
          subFormulas: formula.subFormulas || [],
          createdAt: formula.createdAt,
          updatedAt: formula.updatedAt,
        },
      };
      sheet.rows.push(row);
    });
    
    group.subGroups.forEach((subGroup) => {
      processGroup(subGroup, level1, level2);
    });
  }
  
  groups.forEach((group) => {
    const level1 = group.name;
    group.subGroups.forEach((subGroup) => {
      const level2 = subGroup.name;
      processGroup(subGroup, level1, level2);
    });
  });
  
  return [sheet];
}

interface UniverSheetProps {
  data?: SheetData[];
  onDataChange?: (data: SheetData[]) => void;
  className?: string;
}

export function UniverSheet({ data, onDataChange, className }: UniverSheetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const univerRef = useRef<{ univerAPI: any; workbook: any } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState<FormulaCellData | null>(null);

  /**
   * 加载数据到 Univer（核心函数）
   */
  const loadDataToUniver = useCallback((sheetData: SheetData[]) => {
    if (!univerRef.current || sheetData.length === 0) {
      console.log('No data or Univer not ready');
      return;
    }

    const { univerAPI, workbook } = univerRef.current;
    
    try {
      console.log('Loading data to Univer:', sheetData.length, 'sheets');
      
      const sheet = sheetData[0];
      const headers = ['模块', '代码', '全称', '名称', '条件', '计算方', '计算公式', '计算依据', '说明', '数据规范'];
      
      // 1. 设置表头
      headers.forEach((header, colIndex) => {
        univerAPI.executeCommand('sheet.command.set-range-values', {
          value: { 
            v: header,
            s: {
              bl: 1,
              bg: { rgb: '04B49C' },
              cl: { rgb: '000000' },
              ht: 2,
              vt: 2,
            },
          },
          range: { startRow: 0, startColumn: colIndex, endRow: 0, endColumn: colIndex },
        });
      });
      
      // 2. 计算列宽
      const columnWidths = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      
      sheet.rows.forEach((row) => {
        const values = [
          row.level1Group,
          row.level2Group,
          row.englishFormula.variableMapping?.['全称'] || '',
          row.level3Group,
          row.level4Group || '',
          row.level5Group || '',
          row.englishFormula.englishFormula || '',
          row.englishFormula.variableMapping?.['计算依据'] || '',  // H列：计算依据
          row.englishFormula.chineseFormula || '',
          row.englishFormula.variableMapping?.['数据规范'] || '',
        ];
        
        values.forEach((value, colIndex) => {
          if (value) {
            const width = calculateOptimalWidth(value);
            columnWidths[colIndex] = Math.max(columnWidths[colIndex], width);
            
            // 调试：打印H列（索引7）的内容长度
            if (colIndex === 7 && value.length > 50) {
              console.log(`[UniverSheet] H列长文本检测: ${value.length} 字符, 计算宽度: ${width}`);
            }
          }
        });
      });
      
      // 3. 应用列宽 - 使用命令系统
      console.log('[UniverSheet] Applying column widths:', columnWidths);
      columnWidths.forEach((width, colIndex) => {
        const finalWidth = Math.max(100, width); // 最小 100
        
        // 使用 executeCommand 设置列宽
        univerAPI.executeCommand('sheet.command.set-col-width', {
          startColumn: colIndex,
          endColumn: colIndex,
          width: finalWidth,
        });
        
        console.log(`[UniverSheet] Column ${colIndex} width set to: ${finalWidth}`);
      });
      
      // 4. 设置数据行
      sheet.rows.forEach((row, rowIndex) => {
        const r = rowIndex + 1;
        
        const cellStyleWithWrap = { ht: 0, vt: 2, tb: 2 };
        const cellStyleCenter = { ht: 2, vt: 2, tb: 1 };
        
        // 设置 10 列数据
        univerAPI.executeCommand('sheet.command.set-range-values', {
          value: { v: row.level1Group, s: cellStyleCenter },
          range: { startRow: r, startColumn: 0, endRow: r, endColumn: 0 },
        });
        univerAPI.executeCommand('sheet.command.set-range-values', {
          value: { v: row.level2Group, s: cellStyleCenter },
          range: { startRow: r, startColumn: 1, endRow: r, endColumn: 1 },
        });
        univerAPI.executeCommand('sheet.command.set-range-values', {
          value: { v: row.englishFormula.variableMapping?.['全称'] || '', s: cellStyleWithWrap },
          range: { startRow: r, startColumn: 2, endRow: r, endColumn: 2 },
        });
        univerAPI.executeCommand('sheet.command.set-range-values', {
          value: { v: row.level3Group, s: cellStyleWithWrap },
          range: { startRow: r, startColumn: 3, endRow: r, endColumn: 3 },
        });
        univerAPI.executeCommand('sheet.command.set-range-values', {
          value: { v: row.level4Group || '', s: cellStyleCenter },
          range: { startRow: r, startColumn: 4, endRow: r, endColumn: 4 },
        });
        univerAPI.executeCommand('sheet.command.set-range-values', {
          value: { v: row.level5Group || '', s: cellStyleCenter },
          range: { startRow: r, startColumn: 5, endRow: r, endColumn: 5 },
        });
        univerAPI.executeCommand('sheet.command.set-range-values', {
          value: { v: row.englishFormula.englishFormula || '', s: cellStyleWithWrap },
          range: { startRow: r, startColumn: 6, endRow: r, endColumn: 6 },
        });
        univerAPI.executeCommand('sheet.command.set-range-values', {
          value: { v: row.englishFormula.variableMapping?.['计算依据'] || '', s: cellStyleWithWrap },
          range: { startRow: r, startColumn: 7, endRow: r, endColumn: 7 },
        });
        univerAPI.executeCommand('sheet.command.set-range-values', {
          value: { v: row.englishFormula.chineseFormula || '', s: cellStyleWithWrap },
          range: { startRow: r, startColumn: 8, endRow: r, endColumn: 8 },
        });
        univerAPI.executeCommand('sheet.command.set-range-values', {
          value: { v: row.englishFormula.variableMapping?.['数据规范'] || '', s: cellStyleWithWrap },
          range: { startRow: r, startColumn: 9, endRow: r, endColumn: 9 },
        });
        
        // 5. 计算并设置行高
        const values = [
          row.level1Group,
          row.level2Group,
          row.englishFormula.variableMapping?.['全称'] || '',
          row.level3Group,
          row.level4Group || '',
          row.level5Group || '',
          row.englishFormula.englishFormula || '',
          row.englishFormula.variableMapping?.['计算依据'] || '',  // H列：计算依据
          row.englishFormula.chineseFormula || '',
          row.englishFormula.variableMapping?.['数据规范'] || '',
        ];
        
        let maxLines = 1;
        const columnWidthsInPx = columnWidths.map(w => Math.max(500, w / 0.15)); // 最小 500px 用于计算
        
        // 计算需要换行的列（C, D, G, H, I, J）
        [2, 3, 6, 7, 8, 9].forEach((colIndex) => {
          const text = values[colIndex];
          if (text && text.length > 0) {
            const widthPx = columnWidthsInPx[colIndex];
            const lines = estimateLines(text, widthPx);
            maxLines = Math.max(maxLines, lines);
            
            // 调试：打印H列的行高计算
            if (colIndex === 7 && text.length > 50) {
              console.log(`[UniverSheet] H列行高计算: ${text.length} 字符, 宽度: ${widthPx.toFixed(0)}px, 行数: ${lines}`);
            }
          }
        });
        
        const rowHeight = Math.max(25, maxLines * 20 + 10);
        
        // 使用 executeCommand 设置行高
        univerAPI.executeCommand('sheet.command.set-row-height', {
          startRow: r,
          endRow: r,
          rowHeight: rowHeight,
        });
        
        if (r <= 3) { // 只打印前3行的日志
          console.log(`[UniverSheet] Row ${r} height: ${rowHeight} (maxLines: ${maxLines})`);
        }
      });
      
      console.log('[UniverSheet] Data loaded:', sheet.rows.length, 'rows');
      toast.success(`已加载 ${sheet.rows.length} 行数据`);
      
      // 6. 保存到 localStorage
      try {
        console.log('[UniverSheet] Converting sheetData to groups for saving...');
        const groups = convertSheetDataToGroups(sheetData);
        console.log('[UniverSheet] Converted to', groups.length, 'groups');
        console.log('[UniverSheet] Group names:', groups.map(g => g.name).join(', '));
        
        saveData(groups);
        console.log('[UniverSheet] Data saved to localStorage successfully');
        
        // 验证保存
        const savedGroups = loadData();
        console.log('[UniverSheet] Verification - loadData() returned:', savedGroups ? `${savedGroups.length} groups` : 'null');
      } catch (error) {
        console.error('[UniverSheet] Failed to save data:', error);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('数据加载失败');
    }
  }, []);

  // 初始化 Univer
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      console.log('Initializing Univer...');
      
      const { univerAPI, workbook } = createUniverInstance({
        container: containerRef.current,
      });

      univerRef.current = { univerAPI, workbook };

      // 配置冻结 - 只冻结第一行（表头行）
      const sheet = workbook.getActiveSheet();
      sheet.setFrozenRows(0, 1); // 从第0行开始，冻结1行
      
      setIsReady(true);
      console.log('Univer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Univer:', error);
      toast.error('表格初始化失败');
    }

    return () => {
      if (univerRef.current) {
        univerRef.current.univerAPI.dispose();
        univerRef.current = null;
        formulaCache.clear();
      }
    };
  }, []);

  // 加载数据（响应 data prop 或 localStorage）
  useEffect(() => {
    if (!isReady) {
      console.log('[UniverSheet] Univer not ready yet, skipping data load');
      return;
    }
    
    console.log('[UniverSheet] Data loading useEffect triggered');
    console.log('[UniverSheet] - data prop:', data ? `${data.length} sheets` : 'null/undefined');
    console.log('[UniverSheet] - data[0]?.rows:', data?.[0]?.rows?.length || 0, 'rows');
    
    // 优先使用传入的 data（必须是有真实数据的）
    if (data && data.length > 0 && data[0].rows.length > 0) {
      console.log('[UniverSheet] Using provided data:', data.length, 'sheets,', data[0].rows.length, 'rows');
      loadDataToUniver(data);
      return;
    }
    
    console.log('[UniverSheet] No valid provided data, trying to load from localStorage...');
    
    // 否则从 localStorage 加载
    try {
      const groups = loadData();
      console.log('[UniverSheet] loadData() returned:', groups ? `${groups.length} groups` : 'null');
      
      if (groups && groups.length > 0) {
        console.log('[UniverSheet] Loading from localStorage:', groups.length, 'groups');
        const sheetData = convertGroupsToSheetData(groups);
        console.log('[UniverSheet] Converted to sheetData:', sheetData.length, 'sheets,', sheetData[0].rows.length, 'rows');
        loadDataToUniver(sheetData);
        toast.success(`已从本地加载 ${groups.length} 个分组`);
      } else {
        console.log('[UniverSheet] No data in localStorage');
      }
    } catch (error) {
      console.error('[UniverSheet] Failed to load from localStorage:', error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, isReady]);

  /**
   * 查看公式详情
   */
  const handleViewFormula = useCallback((formulaData: FormulaCellData) => {
    setSelectedFormula(formulaData);
    setViewerOpen(true);
  }, []);

  return (
    <div className={`flex flex-col h-full ${className || ''}`}>
      {/* Univer 容器 */}
      <div ref={containerRef} className="flex-1" style={{ minHeight: 0 }} />
      
      {/* 公式查看器 */}
      <FormulaViewer
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        formulaData={selectedFormula}
      />
    </div>
  );
}
