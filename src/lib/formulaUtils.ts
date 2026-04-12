import { Formula, FormulaGroup, SubFormula } from './types';

/**
 * 公式查找结果
 */
export interface FormulaLookupResult {
  formula: Formula | SubFormula | null;
  type: 'external' | 'sub' | 'not_found';
  groupName?: string;
}

/**
 * 根据公式ID查找公式
 * @param formulaId 公式ID（可以是外部公式ID或 sub_ 开头的子公式ID）
 * @param groups 所有公式分组
 * @param subFormulas 子公式列表（可选）
 * @returns 查找结果
 */
export function findFormulaById(
  formulaId: string,
  groups: FormulaGroup[],
  subFormulas?: SubFormula[]
): FormulaLookupResult {
  // 查找子公式
  if (formulaId.startsWith('sub_')) {
    const subFormulaId = formulaId.substring(4);
    const subFormula = subFormulas?.find(sf => sf.id === subFormulaId);
    
    if (subFormula) {
      return {
        formula: subFormula,
        type: 'sub'
      };
    }
    
    return {
      formula: null,
      type: 'not_found'
    };
  }
  
  // 查找外部公式
  for (const group of groups) {
    const found = group.formulas.find(f => f.id === formulaId);
    if (found) {
      return {
        formula: found,
        type: 'external',
        groupName: group.name
      };
    }
  }
  
  return {
    formula: null,
    type: 'not_found'
  };
}

/**
 * 获取公式的英文表达式
 * @param formulaId 公式ID
 * @param groups 所有公式分组
 * @param subFormulas 子公式列表（可选）
 * @returns 公式表达式，如果未找到返回空字符串
 */
export function getFormulaExpression(
  formulaId: string,
  groups: FormulaGroup[],
  subFormulas?: SubFormula[]
): string {
  const result = findFormulaById(formulaId, groups, subFormulas);
  
  if (!result.formula) {
    return '';
  }
  
  return result.formula.englishFormula;
}

/**
 * 获取公式的显示名称
 * @param formula 公式对象
 * @param groupName 分组名称（外部公式）
 * @returns 显示名称
 */
export function getFormulaDisplayName(
  formula: Formula | SubFormula,
  groupName?: string
): string {
  // 如果是外部公式且有层级信息，使用层级路径
  if ('level3Group' in formula) {
    const f = formula as Formula;
    const parts = [f.level3Group, f.level4Group, f.level5Group, f.level6Group].filter(Boolean);
    if (parts.length > 0) {
      return parts.join('/');
    }
  }
  
  return formula.name;
}
