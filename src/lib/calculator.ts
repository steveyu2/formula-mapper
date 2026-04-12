import { ASTNode } from './types';

export interface CalculationResult {
  result: number;
  steps: string[];
}

export class FormulaCalculator {
  /**
   * 计算公式的值
   * @param ast AST 树
   * @param values 变量值映射
   * @returns 计算结果和步骤
   */
  static evaluate(ast: ASTNode, values: Record<string, number>): CalculationResult {
    const steps: string[] = [];
    const result = this.evaluateNode(ast, values, steps);
    
    steps.push(`最终结果: ${result}`);
    
    return { result, steps };
  }

  /**
   * 从 AST 中提取所有变量名
   */
  static extractVariables(ast: ASTNode): string[] {
    const variables: Set<string> = new Set();
    this.extractVariablesFromNode(ast, variables);
    return Array.from(variables);
  }

  /**
   * 替换公式中的变量为值，生成可读表达式
   */
  static replaceVariables(formula: string, values: Record<string, number>): string {
    let result = formula;
    
    // 按变量名长度降序排序，避免短变量名替换影响长变量名
    const sortedVars = Object.keys(values).sort((a, b) => b.length - a.length);
    
    for (const varName of sortedVars) {
      const value = values[varName];
      if (value !== undefined) {
        // 使用正则表达式确保完整匹配变量名
        const regex = new RegExp(`\\b${varName}\\b`, 'g');
        result = result.replace(regex, String(value));
      }
    }
    
    return result;
  }

  private static evaluateNode(node: ASTNode, values: Record<string, number>, steps: string[]): number {
    switch (node.type) {
      case 'number':
        return parseFloat(node.value || '0');

      case 'variable':
        const varName = node.name || node.value || '';
        const value = values[varName];
        if (value === undefined) {
          throw new Error(`未定义变量: ${varName}`);
        }
        return value;

      case 'operator':
        return this.evaluateOperator(node, values, steps);

      case 'function':
        return this.evaluateFunction(node, values, steps);

      default:
        throw new Error(`不支持的节点类型: ${(node as any).type}`);
    }
  }

  private static evaluateOperator(node: ASTNode, values: Record<string, number>, steps: string[]): number {
    const operator = node.operator || '';
    
    if (!node.left || !node.right) {
      throw new Error(`运算符 ${operator} 缺少操作数`);
    }

    const leftValue = this.evaluateNode(node.left, values, steps);
    const rightValue = this.evaluateNode(node.right, values, steps);

    let result: number;
    let stepText: string;

    switch (operator) {
      case '+':
        result = leftValue + rightValue;
        stepText = `计算 ${leftValue} + ${rightValue} = ${result}`;
        break;
      case '-':
        result = leftValue - rightValue;
        stepText = `计算 ${leftValue} - ${rightValue} = ${result}`;
        break;
      case '*':
        result = leftValue * rightValue;
        stepText = `计算 ${leftValue} * ${rightValue} = ${result}`;
        break;
      case '/':
        if (rightValue === 0) {
          throw new Error('除数不能为零');
        }
        result = leftValue / rightValue;
        stepText = `计算 ${leftValue} / ${rightValue} = ${result}`;
        break;
      case '^':
        result = Math.pow(leftValue, rightValue);
        stepText = `计算 ${leftValue} ^ ${rightValue} = ${result}`;
        break;
      default:
        throw new Error(`不支持的运算符: ${operator}`);
    }

    steps.push(stepText);
    return result;
  }

  private static evaluateFunction(node: ASTNode, values: Record<string, number>, steps: string[]): number {
    const funcName = node.func || '';
    const args = node.args || [];

    // 计算所有参数的值
    const argValues = args.map(arg => this.evaluateNode(arg, values, steps));

    let result: number;

    switch (funcName.toLowerCase()) {
      case 'sum':
        result = argValues.reduce((sum, val) => sum + val, 0);
        break;
      case 'max':
        result = Math.max(...argValues);
        break;
      case 'min':
        result = Math.min(...argValues);
        break;
      case 'abs':
        if (argValues.length !== 1) {
          throw new Error(`abs 函数需要 1 个参数，得到 ${argValues.length} 个`);
        }
        result = Math.abs(argValues[0]);
        break;
      case 'sqrt':
        if (argValues.length !== 1) {
          throw new Error(`sqrt 函数需要 1 个参数，得到 ${argValues.length} 个`);
        }
        if (argValues[0] < 0) {
          throw new Error('sqrt 函数的参数不能为负数');
        }
        result = Math.sqrt(argValues[0]);
        break;
      case 'pow':
        if (argValues.length !== 2) {
          throw new Error(`pow 函数需要 2 个参数，得到 ${argValues.length} 个`);
        }
        result = Math.pow(argValues[0], argValues[1]);
        break;
      default:
        throw new Error(`不支持的函数: ${funcName}`);
    }

    const argsStr = argValues.join(', ');
    steps.push(`计算 ${funcName}(${argsStr}) = ${result}`);
    
    return result;
  }

  private static extractVariablesFromNode(node: ASTNode, variables: Set<string>): void {
    switch (node.type) {
      case 'variable':
        if (node.name || node.value) {
          variables.add(node.name || node.value || '');
        }
        break;

      case 'operator':
      case 'function':
        if (node.left) {
          this.extractVariablesFromNode(node.left, variables);
        }
        if (node.right) {
          this.extractVariablesFromNode(node.right, variables);
        }
        if (node.args) {
          for (const arg of node.args) {
            this.extractVariablesFromNode(arg, variables);
          }
        }
        break;

      case 'number':
        // 数字节点不包含变量
        break;
    }
  }
}
