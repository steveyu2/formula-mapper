export interface Token {
  type: 'operator' | 'variable' | 'number' | 'paren';
  value: string;
}

export interface ASTNode {
  type: 'operator' | 'variable' | 'number';
  operator?: string;
  name?: string;
  value?: string;
  left?: ASTNode;
  right?: ASTNode;
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
