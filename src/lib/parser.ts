import { Token, ASTNode } from './types';

export class FormulaParser {
  private tokens: Token[];
  private pos: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.pos = 0;
  }

  static parse(formula: string): ASTNode {
    const tokens = FormulaParser.tokenize(formula);
    const parser = new FormulaParser(tokens);
    const ast = parser.parseExpression();

    if (parser.pos < tokens.length) {
      throw new Error('表达式解析不完整：存在未处理的字符');
    }

    return ast;
  }

  static tokenize(formula: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < formula.length) {
      const char = formula[i];

      if (/\s/.test(char)) {
        i++;
        continue;
      }

      if (['+', '-', '*', '/', '^', '(', ')', '[', ']', '{', '}', '（', '）', ','].includes(char)) {
        tokens.push({ type: 'operator', value: char });
        i++;
        continue;
      }

      if (/[A-Za-z]/.test(char)) {
        let varName = char;
        i++;
        while (i < formula.length && /[A-Za-z0-9_]/.test(formula[i])) {
          varName += formula[i];
          i++;
        }
        tokens.push({ type: 'variable', value: varName });
        continue;
      }

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

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    return this.tokens[this.pos++];
  }

  private parseExpression(): ASTNode {
    let left = this.parseTerm();

    let token = this.peek();
    while (token && (token.value === '+' || token.value === '-')) {
      const operator = this.consume().value;
      const right = this.parseTerm();
      left = {
        type: 'operator',
        operator,
        left,
        right,
      };
      token = this.peek();
    }

    return left;
  }

  private parseTerm(): ASTNode {
    let left = this.parsePower();

    let token = this.peek();
    while (token && (token.value === '*' || token.value === '/')) {
      const operator = this.consume().value;
      const right = this.parsePower();
      left = {
        type: 'operator',
        operator,
        left,
        right,
      };
      token = this.peek();
    }

    return left;
  }

  private parsePower(): ASTNode {
    let left = this.parseFactor();

    let token = this.peek();
    while (token && token.value === '^') {
      const operator = this.consume().value;
      const right = this.parseFactor();
      left = {
        type: 'operator',
        operator,
        left,
        right,
      };
      token = this.peek();
    }

    return left;
  }

  private parseFactor(): ASTNode {
    const token = this.peek();

    if (!token) {
      throw new Error('表达式不完整：缺少操作数');
    }

    if (token.type === 'variable') {
      const varToken = this.consume();
      
      // 检查是否是函数调用（支持英文和中文括号）
      const nextToken = this.peek();
      if (nextToken && nextToken.type === 'operator' && ['(', '（'].includes(nextToken.value)) {
        // 这是一个函数调用
        const funcName = varToken.value.toLowerCase();
        
        // 检查是否是支持的函数
        if (['max', 'min', 'sum', 'abs', 'sqrt', 'pow'].includes(funcName)) {
          const openBracket = nextToken.value;
          const closeBracket = openBracket === '(' ? ')' : '）'; // 中文左括号对应中文右括号
          
          this.consume(); // 消费 '(' 或 '（'
          
          // 解析函数参数
          const args: ASTNode[] = [];
          
          // 如果不是立即关闭的括号，解析参数
          if (this.peek()?.value !== closeBracket) {
            args.push(this.parseExpression());
            
            // 解析其他参数（使用 ',' 分隔）
            while (this.peek()?.value === ',') {
              this.consume(); // 消费 ','
              args.push(this.parseExpression());
            }
          }
          
          const closeToken = this.peek();
          if (!closeToken || closeToken.value !== closeBracket) {
            throw new Error(`函数调用语法错误：缺少右括号 ${closeBracket}`);
          }
          this.consume(); // 消费 ')' 或 '）'
          
          return {
            type: 'function',
            func: funcName,
            args,
          };
        }
      }
      
      // 不是函数，返回普通变量
      return {
        type: 'variable',
        name: varToken.value,
      };
    }

    if (token.type === 'number') {
      this.consume();
      return {
        type: 'number',
        value: token.value,
      };
    }

    // 处理各种括号：() [] {} （）
    if (token.type === 'operator' && ['(', '[', '{', '（'].includes(token.value)) {
      const openBracket = token.value;
      const closeBracket = openBracket === '(' ? ')' : openBracket === '[' ? ']' : openBracket === '{' ? '}' : '）';

      this.consume();
      const expr = this.parseExpression();

      const nextToken = this.peek();
      if (!nextToken || nextToken.value !== closeBracket) {
        throw new Error(`括号不匹配：缺少右括号 ${closeBracket}`);
      }

      this.consume();
      return expr;
    }

    throw new Error(`语法错误：意外的token '${token.value}'`);
  }
}
