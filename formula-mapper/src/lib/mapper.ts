import { VariableMapping, MappingItem } from './types';

export class VariableMapper {
  static extractEnglishVariables(formula: string): string[] {
    if (!formula || formula.trim() === '') {
      return [];
    }

    const regex = /\b[A-Za-z][A-Za-z0-9]*\b/g;
    const matches = formula.match(regex);

    if (!matches) {
      return [];
    }

    const seen = new Set<string>();
    const variables: string[] = [];

    for (const match of matches) {
      if (!seen.has(match)) {
        seen.add(match);
        variables.push(match);
      }
    }

    return variables;
  }

  static extractChineseVariables(formula: string): string[] {
    if (!formula || formula.trim() === '') {
      return [];
    }

    // 支持英文和中文运算符及括号
    const parts = formula.split(/[+\-*/×÷()\[\]{}（）]/);

    const seen = new Set<string>();
    const variables: string[] = [];

    for (const part of parts) {
      const trimmed = part.trim();
      // 过滤掉纯数字和空字符串
      if (trimmed && !seen.has(trimmed) && !/^\d+(\.\d+)?$/.test(trimmed)) {
        seen.add(trimmed);
        variables.push(trimmed);
      }
    }

    return variables;
  }

  static createMapping(englishFormula: string, chineseFormula: string): VariableMapping {
    const englishVars = this.extractEnglishVariables(englishFormula);
    const chineseVars = this.extractChineseVariables(chineseFormula);

    const mapping: Record<string, string> = {};

    for (let i = 0; i < englishVars.length; i++) {
      const englishVar = englishVars[i];
      const chineseVar = chineseVars[i] || '（未定义）';
      mapping[englishVar] = chineseVar;
    }

    return {
      mapping,
      englishVars,
      chineseVars,
      hasMoreChinese: chineseVars.length > englishVars.length,
    };
  }

  static formatMapping(mappingResult: VariableMapping): { items: MappingItem[]; hasMoreChinese: boolean } {
    const { mapping, englishVars, hasMoreChinese } = mappingResult;
    const items: MappingItem[] = [];

    for (const englishVar of englishVars) {
      items.push({
        english: englishVar,
        chinese: mapping[englishVar],
      });
    }

    return {
      items,
      hasMoreChinese,
    };
  }
}
