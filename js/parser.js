/**
 * 表达式解析器 - 递归下降解析器
 * 将中缀表达式转换为抽象语法树（AST）
 */

class FormulaParser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }

    /**
     * 解析表达式的主入口
     * @param {string} formula - 公式字符串
     * @returns {Object} AST根节点
     */
    static parse(formula) {
        const tokens = FormulaParser.tokenize(formula);
        const parser = new FormulaParser(tokens);
        const ast = parser.parseExpression();

        // 检查是否消费完所有token
        if (parser.pos < tokens.length) {
            throw new Error('表达式解析不完整：存在未处理的字符');
        }

        return ast;
    }

    /**
     * 词法分析：将公式字符串转换为token数组
     * @param {string} formula - 公式字符串
     * @returns {Array} token数组
     */
    static tokenize(formula) {
        const tokens = [];
        let i = 0;

        while (i < formula.length) {
            const char = formula[i];

            // 跳过空白字符
            if (/\s/.test(char)) {
                i++;
                continue;
            }

            // 运算符
            if (['+', '-', '*', '/', '(', ')', '[', ']', '{', '}'].includes(char)) {
                tokens.push({ type: 'operator', value: char });
                i++;
                continue;
            }

            // 变量（字母开头，后跟字母或数字）
            if (/[A-Za-z]/.test(char)) {
                let varName = char;
                i++;
                while (i < formula.length && /[A-Za-z0-9]/.test(formula[i])) {
                    varName += formula[i];
                    i++;
                }
                tokens.push({ type: 'variable', value: varName });
                continue;
            }

            // 数字（虽然主要处理变量，但支持数字作为字面量）
            if (/\d/.test(char)) {
                let num = char;
                i++;
                while (i < formula.length && /\d/.test(formula[i])) {
                    num += formula[i];
                    i++;
                }
                tokens.push({ type: 'number', value: num });
                continue;
            }

            throw new Error(`无法识别的字符: '${char}' (位置 ${i + 1})`);
        }

        return tokens;
    }

    /**
     * 获取当前token
     */
    peek() {
        return this.tokens[this.pos];
    }

    /**
     * 消费当前token并前进
     */
    consume() {
        return this.tokens[this.pos++];
    }

    /**
     * 解析表达式（处理加减法）
     * 优先级最低，在解析层次的最外层
     */
    parseExpression() {
        let left = this.parseTerm();

        while (this.peek() && (this.peek().value === '+' || this.peek().value === '-')) {
            const operator = this.consume().value;
            const right = this.parseTerm();
            left = {
                type: 'operator',
                operator: operator,
                left: left,
                right: right
            };
        }

        return left;
    }

    /**
     * 解析项（处理乘除法）
     * 优先级高于加减法
     */
    parseTerm() {
        let left = this.parseFactor();

        while (this.peek() && (this.peek().value === '*' || this.peek().value === '/')) {
            const operator = this.consume().value;
            const right = this.parseFactor();
            left = {
                type: 'operator',
                operator: operator,
                left: left,
                right: right
            };
        }

        return left;
    }

    /**
     * 解析因子（处理变量、数字、括号）
     * 优先级最高，是递归的基础情况
     */
    parseFactor() {
        const token = this.peek();

        if (!token) {
            throw new Error('表达式不完整：缺少操作数');
        }

        // 变量
        if (token.type === 'variable') {
            this.consume();
            return {
                type: 'variable',
                name: token.value
            };
        }

        // 数字字面量
        if (token.type === 'number') {
            this.consume();
            return {
                type: 'number',
                value: token.value
            };
        }

        // 左括号 - 递归解析括号内的表达式
        if (token.type === 'operator' && ['(', '[', '{'].includes(token.value)) {
            const openBracket = token.value;
            const closeBracket = openBracket === '(' ? ')' : openBracket === '[' ? ']' : '}';

            this.consume(); // 消费左括号
            const expr = this.parseExpression();

            // 检查右括号
            if (!this.peek() || this.peek().value !== closeBracket) {
                throw new Error(`括号不匹配：缺少右括号 ${closeBracket}`);
            }

            this.consume(); // 消费右括号
            return expr;
        }

        throw new Error(`语法错误：意外的token '${token.value}'`);
    }
}

// 导出到全局
window.FormulaParser = FormulaParser;
