/**
 * 变量映射器
 * 从英文公式和中文公式中提取变量，并按顺序建立映射关系
 */

class VariableMapper {
    /**
     * 从英文公式中提取所有变量
     * @param {string} formula - 英文公式
     * @returns {Array} 变量名数组（按首次出现顺序）
     */
    static extractEnglishVariables(formula) {
        if (!formula || formula.trim() === '') {
            return [];
        }

        // 正则：字母开头，后跟字母或数字
        const regex = /\b[A-Za-z][A-Za-z0-9]*\b/g;
        const matches = formula.match(regex);

        if (!matches) {
            return [];
        }

        // 去重并保持顺序
        const seen = new Set();
        const variables = [];

        for (const match of matches) {
            if (!seen.has(match)) {
                seen.add(match);
                variables.push(match);
            }
        }

        return variables;
    }

    /**
     * 从中文公式中提取所有变量
     * @param {string} formula - 中文公式
     * @returns {Array} 变量名数组（按首次出现顺序）
     */
    static extractChineseVariables(formula) {
        if (!formula || formula.trim() === '') {
            return [];
        }

        // 使用运算符和括号作为分隔符
        const parts = formula.split(/[+\-*/()\[\]{}]/);

        // 过滤空字符串并去重
        const seen = new Set();
        const variables = [];

        for (const part of parts) {
            const trimmed = part.trim();
            if (trimmed && !seen.has(trimmed)) {
                seen.add(trimmed);
                variables.push(trimmed);
            }
        }

        return variables;
    }

    /**
     * 建立英文变量到中文变量的映射关系
     * @param {string} englishFormula - 英文公式
     * @param {string} chineseFormula - 中文公式
     * @returns {Object} 映射对象 { englishVar: chineseVar }
     */
    static createMapping(englishFormula, chineseFormula) {
        const englishVars = this.extractEnglishVariables(englishFormula);
        const chineseVars = this.extractChineseVariables(chineseFormula);

        const mapping = {};

        // 按顺序建立映射
        for (let i = 0; i < englishVars.length; i++) {
            const englishVar = englishVars[i];
            const chineseVar = chineseVars[i] || '（未定义）';
            mapping[englishVar] = chineseVar;
        }

        return {
            mapping: mapping,
            englishVars: englishVars,
            chineseVars: chineseVars,
            hasMoreChinese: chineseVars.length > englishVars.length
        };
    }

    /**
     * 格式化映射信息用于显示
     * @param {Object} mappingResult - createMapping返回的结果
     * @returns {Array} 格式化的映射项数组
     */
    static formatMapping(mappingResult) {
        const { mapping, englishVars, hasMoreChinese } = mappingResult;
        const items = [];

        for (const englishVar of englishVars) {
            items.push({
                english: englishVar,
                chinese: mapping[englishVar]
            });
        }

        return {
            items: items,
            hasMoreChinese: hasMoreChinese
        };
    }
}

// 导出到全局
window.VariableMapper = VariableMapper;
