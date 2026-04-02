import { FormulaParser } from '../parser';
import { ASTNode } from '../types';

describe('FormulaParser', () => {
  describe('tokenize', () => {
    it('should tokenize simple arithmetic expression', () => {
      const tokens = FormulaParser.tokenize('a + b');
      expect(tokens).toEqual([
        { type: 'variable', value: 'a' },
        { type: 'operator', value: '+' },
        { type: 'variable', value: 'b' },
      ]);
    });

    it('should tokenize expression with numbers', () => {
      const tokens = FormulaParser.tokenize('10 + 20');
      expect(tokens).toEqual([
        { type: 'number', value: '10' },
        { type: 'operator', value: '+' },
        { type: 'number', value: '20' },
      ]);
    });

    it('should tokenize expression with parentheses', () => {
      const tokens = FormulaParser.tokenize('(a + b) * c');
      expect(tokens).toEqual([
        { type: 'operator', value: '(' },
        { type: 'variable', value: 'a' },
        { type: 'operator', value: '+' },
        { type: 'variable', value: 'b' },
        { type: 'operator', value: ')' },
        { type: 'operator', value: '*' },
        { type: 'variable', value: 'c' },
      ]);
    });

    it('should handle Chinese parentheses', () => {
      const tokens = FormulaParser.tokenize('（a + b）');
      expect(tokens).toEqual([
        { type: 'operator', value: '（' },
        { type: 'variable', value: 'a' },
        { type: 'operator', value: '+' },
        { type: 'variable', value: 'b' },
        { type: 'operator', value: '）' },
      ]);
    });

    it('should tokenize multi-character variable names', () => {
      const tokens = FormulaParser.tokenize('abc123 + x_var');
      expect(tokens).toEqual([
        { type: 'variable', value: 'abc123' },
        { type: 'operator', value: '+' },
        { type: 'variable', value: 'x_var' },
      ]);
    });

    it('should skip whitespace', () => {
      const tokens = FormulaParser.tokenize('  a   +   b  ');
      expect(tokens).toEqual([
        { type: 'variable', value: 'a' },
        { type: 'operator', value: '+' },
        { type: 'variable', value: 'b' },
      ]);
    });

    it('should tokenize comma operator', () => {
      const tokens = FormulaParser.tokenize('max(a, b)');
      expect(tokens).toContainEqual({ type: 'operator', value: ',' });
    });

    it('should throw error for invalid characters', () => {
      expect(() => {
        FormulaParser.tokenize('a @ b');
      }).toThrow();
    });

    it('should tokenize all bracket types', () => {
      const tokens = FormulaParser.tokenize('[] {} ()');
      expect(tokens).toContainEqual({ type: 'operator', value: '[' });
      expect(tokens).toContainEqual({ type: 'operator', value: ']' });
      expect(tokens).toContainEqual({ type: 'operator', value: '{' });
      expect(tokens).toContainEqual({ type: 'operator', value: '}' });
    });
  });

  describe('parse', () => {
    it('should parse simple addition', () => {
      const ast = FormulaParser.parse('a + b');
      expect(ast.type).toBe('operator');
      expect(ast.operator).toBe('+');
      expect(ast.left?.type).toBe('variable');
      expect(ast.right?.type).toBe('variable');
    });

    it('should parse multiplication before addition', () => {
      const ast = FormulaParser.parse('a + b * c');
      expect(ast.operator).toBe('+');
      expect(ast.right?.operator).toBe('*');
    });

    it('should parse power operation', () => {
      const ast = FormulaParser.parse('a ^ 2');
      expect(ast.type).toBe('operator');
      expect(ast.operator).toBe('^');
    });

    it('should parse parentheses grouping', () => {
      const ast = FormulaParser.parse('(a + b) * c');
      expect(ast.operator).toBe('*');
      expect(ast.left?.operator).toBe('+');
    });

    it('should parse nested parentheses', () => {
      const ast = FormulaParser.parse('((a + b) * c) / d');
      expect(ast.operator).toBe('/');
      expect(ast.left?.operator).toBe('*');
      expect(ast.left?.left?.operator).toBe('+');
    });

    it('should parse number literals', () => {
      const ast = FormulaParser.parse('123');
      expect(ast.type).toBe('number');
      expect(ast.value).toBe('123');
    });

    it('should parse variable names', () => {
      const ast = FormulaParser.parse('myVar');
      expect(ast.type).toBe('variable');
      expect(ast.name).toBe('myVar');
    });

    it('should throw error for incomplete expression', () => {
      expect(() => {
        FormulaParser.parse('a + ');
      }).toThrow();
    });

    it('should throw error for mismatched brackets', () => {
      expect(() => {
        FormulaParser.parse('(a + b');
      }).toThrow();
    });

    it('should throw error for unmatched closing bracket', () => {
      expect(() => {
        FormulaParser.parse('a + b)');
      }).toThrow();
    });

    it('should handle Chinese parentheses in parsing', () => {
      const ast = FormulaParser.parse('（a + b）* c');
      expect(ast.operator).toBe('*');
      expect(ast.left?.operator).toBe('+');
    });

    it('should parse complex expression', () => {
      const ast = FormulaParser.parse('a * b + c / d - e ^ 2');
      expect(ast.type).toBe('operator');
      expect(ast.operator).toBe('-');
    });

    it('should parse expressions with multiple operators', () => {
      const ast = FormulaParser.parse('a + b - c * d / e ^ f');
      expect(ast.type).toBe('operator');
    });
  });

  describe('function parsing', () => {
    it('should parse max function with two arguments', () => {
      const ast = FormulaParser.parse('max(a, b)');
      expect(ast.type).toBe('function');
      expect(ast.func).toBe('max');
      expect(ast.args).toHaveLength(2);
      expect(ast.args?.[0].name).toBe('a');
      expect(ast.args?.[1].name).toBe('b');
    });

    it('should parse min function with multiple arguments', () => {
      const ast = FormulaParser.parse('min(x, y, z)');
      expect(ast.type).toBe('function');
      expect(ast.func).toBe('min');
      expect(ast.args).toHaveLength(3);
    });

    it('should parse sum function', () => {
      const ast = FormulaParser.parse('sum(a, b, c, d)');
      expect(ast.type).toBe('function');
      expect(ast.func).toBe('sum');
      expect(ast.args).toHaveLength(4);
    });

    it('should parse abs function with single argument', () => {
      const ast = FormulaParser.parse('abs(x)');
      expect(ast.type).toBe('function');
      expect(ast.func).toBe('abs');
      expect(ast.args).toHaveLength(1);
    });

    it('should parse sqrt function', () => {
      const ast = FormulaParser.parse('sqrt(a)');
      expect(ast.type).toBe('function');
      expect(ast.func).toBe('sqrt');
    });

    it('should parse pow function with two arguments', () => {
      const ast = FormulaParser.parse('pow(x, n)');
      expect(ast.type).toBe('function');
      expect(ast.func).toBe('pow');
      expect(ast.args).toHaveLength(2);
    });

    it('should parse nested functions', () => {
      const ast = FormulaParser.parse('max(a, min(b, c))');
      expect(ast.type).toBe('function');
      expect(ast.func).toBe('max');
      expect(ast.args?.[1].func).toBe('min');
    });

    it('should parse function with Chinese parentheses', () => {
      const ast = FormulaParser.parse('max（a, b）');
      expect(ast.type).toBe('function');
      expect(ast.func).toBe('max');
      expect(ast.args).toHaveLength(2);
    });

    it('should parse function with expressions as arguments', () => {
      const ast = FormulaParser.parse('max(a + b, c * d)');
      expect(ast.type).toBe('function');
      expect(ast.args?.[0].operator).toBe('+');
      expect(ast.args?.[1].operator).toBe('*');
    });

    it('should parse function in arithmetic expression', () => {
      const ast = FormulaParser.parse('max(a, b) + c');
      expect(ast.operator).toBe('+');
      expect(ast.left?.func).toBe('max');
    });

    it('should parse deeply nested functions', () => {
      const ast = FormulaParser.parse('max(min(sum(a, b), c), d)');
      expect(ast.type).toBe('function');
      expect(ast.func).toBe('max');
      expect(ast.args?.[0].func).toBe('min');
      expect(ast.args?.[0].args?.[0].func).toBe('sum');
    });

    it('should parse empty function arguments', () => {
      const ast = FormulaParser.parse('max()');
      expect(ast.type).toBe('function');
      expect(ast.func).toBe('max');
      expect(ast.args).toHaveLength(0);
    });

    it('should parse function with number arguments', () => {
      const ast = FormulaParser.parse('pow(2, 8)');
      expect(ast.type).toBe('function');
      expect(ast.args?.[0].value).toBe('2');
      expect(ast.args?.[1].value).toBe('8');
    });

    it('should parse real-world derivative formula with functions', () => {
      const ast = FormulaParser.parse('max(S - K, 0)');
      expect(ast.func).toBe('max');
      expect(ast.args).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('should throw error for incomplete parentheses', () => {
      expect(() => FormulaParser.parse('(a + b')).toThrow();
    });

    it('should throw error for extra closing parentheses', () => {
      expect(() => FormulaParser.parse('a + b)')).toThrow();
    });

    it('should throw error for mismatched bracket types', () => {
      expect(() => FormulaParser.parse('[a + b)')).toThrow();
    });

    it('should throw error for invalid function syntax', () => {
      expect(() => FormulaParser.parse('max(a, b')).toThrow();
    });
  });
});
