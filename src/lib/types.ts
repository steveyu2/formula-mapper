export interface Token {
  type: 'operator' | 'variable' | 'number' | 'paren';
  value: string;
}

export interface ASTNode {
  type: 'operator' | 'variable' | 'number' | 'function';
  operator?: string;
  name?: string;
  value?: string;
  left?: ASTNode;
  right?: ASTNode;
  func?: string; // 函数名：max, min, sum 等
  args?: ASTNode[]; // 函数参数列表
}

export interface VariableMapping {
  mapping: Record<string, string>;
  englishVars: string[];
  chineseVars: string[];
  hasMoreChinese: boolean;
}

export interface MappingItem {
  english: string;
  chinese: string;
}

export interface Formula {
  id: string;
  name: string;
  englishFormula: string;
  chineseFormula: string;
  description?: string; // 公式说明
  createdAt: number;
  variableFormulaMapping?: Record<string, string>; // 变量映射到公式ID的映射
  subFormulas?: SubFormula[]; // 子公式列表
  
  // 分组字段（最多 7 层）
  level1Group?: string; // 模块
  level2Group?: string; // 代码
  level3Group?: string; // 全称
  level4Group?: string; // 名称
  level5Group?: string; // 条件
  level6Group?: string; // 计算方
  level7Group?: string; // 扩展
}

export interface SubFormula {
  id: string;
  name: string;
  englishFormula: string;
  chineseFormula: string;
}

export interface FormulaGroup {
  id: string;
  name: string;
  parentId: string | null; // 父分组ID，null表示顶级分组
  formulas: Formula[];
  createdAt: number;
}
