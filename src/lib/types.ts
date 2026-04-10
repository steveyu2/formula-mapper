/**
 * Formula Mapper v2.0 - TypeScript 类型定义
 * 
 * 定义复合公式数据结构、Sheet 数据结构等
 */

// ==================== 公式单元格复合数据 ====================

/**
 * 子公式
 */
export interface SubFormula {
  id: string;
  name: string;
  englishFormula: string;
  chineseFormula: string;
}

/**
 * 公式单元格数据结构（复合数据）
 * 
 * 存储在 Univer 单元格中，序列化为 JSON 字符串
 */
export interface FormulaCellData {
  id: string;                      // 公式 ID
  englishFormula: string;          // 英文公式："A + B * C"
  chineseFormula: string;          // 中文公式："甲 + 乙 × 丙"
  description?: string;            // 公式说明
  variableMapping: Record<string, string>;  // 变量映射：{ "A": "甲" }
  subFormulas: SubFormula[];       // 子公式
  createdAt: number;               // 创建时间
  updatedAt: number;               // 更新时间
}

/**
 * 公式（用于存储）
 */
export interface Formula {
  id: string;
  name: string;
  englishFormula: string;
  chineseFormula: string;
  variableMapping?: Record<string, string>;
  subFormulas?: SubFormula[];
  createdAt: number;
  updatedAt: number;
}

/**
 * 公式分组（用于存储）
 */
export interface FormulaGroup {
  id: string;
  name: string;
  formulas: Formula[];
  subGroups: FormulaGroup[];
}

// ==================== Sheet 数据结构 ====================

/**
 * Sheet 行数据
 */
export interface SheetRow {
  level1Group: string;
  level2Group: string;
  level3Group: string;
  level4Group?: string;
  level5Group?: string;
  level6Group?: string;
  englishFormula: FormulaCellData;   // 复合数据
  chineseFormula: FormulaCellData;   // 复合数据
  isDirty?: boolean;                 // 是否已修改（用于增量保存）
}

/**
 * Sheet 数据
 */
export interface SheetData {
  name: string;                      // Sheet 名称
  rows: SheetRow[];                  // 行数据
}

// ==================== JSON 导入导出 ====================

/**
 * 导出的 JSON 数据格式（V2）
 */
export interface ExportDataV2 {
  version: '2.0';                    // 版本号
  exportDate: string;                // 导出时间
  columnHeaders?: {                  // 自定义表头
    level1?: string;
    level2?: string;
    level3?: string;
    level4?: string;
    level5?: string;
    level6?: string;
    englishFormula?: string;
    chineseFormula?: string;
  };
  sheets: SheetData[];               // 所有 Sheet 数据
}

/**
 * JSON 导入结果
 */
export interface JsonImportResult {
  sheets: SheetData[];
  version: string;
  exportDate: string;
  rowCount: number;
}

// ==================== 云端数据 ====================

/**
 * 云端存储数据
 */
export interface CloudData {
  sheets: SheetData[];           // Univer 表格数据
  lastSavedAt: string;           // 最后保存时间
  versionId: string;             // 版本号
  comment?: string;              // 备注
}

/**
 * 版本信息
 */
export interface VersionInfo {
  versionId: string;
  savedAt: string;
  comment: string;
}

// ==================== 旧版本兼容 ====================

/**
 * 旧版本数据格式（V1）
 */
export interface OldFormulaGroup {
  level1?: string;
  level2?: string;
  level3?: string;
  formulas: OldFormula[];
}

export interface OldFormula {
  id: string;
  name?: string;
  englishFormula: string;
  chineseFormula: string;
  variableFormulaMapping?: Record<string, string>;
  subFormulas?: SubFormula[];
  createdAt?: number;
}

export interface ExportDataV1 {
  version: '1.0';
  exportDate: string;
  groups: OldFormulaGroup[];
}
