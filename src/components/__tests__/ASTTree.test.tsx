import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ASTTree } from '../ASTTree';
import { FormulaParser } from '@/lib/parser';
import { VariableMapper } from '@/lib/mapper';

describe('ASTTree', () => {
  describe('rendering AST trees', () => {
    it('should render simple variable AST', () => {
      const formula = 'a';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '变量a');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render binary operation AST', () => {
      const formula = 'a + b';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '变量a + 变量b');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render nested AST', () => {
      const formula = '(a + b) * (c - d)';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '(变量a + 变量b) * (变量c - 变量d)');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render power operation', () => {
      const formula = 'x ^ 2';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '变量x ^ 2');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });
  });

  describe('rendering function calls', () => {
    it('should render max function', () => {
      const formula = 'max(a, b)';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '最大值(变量a, 变量b)');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render nested functions', () => {
      const formula = 'max(min(a, b), c)';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '最大值(最小值(变量a, 变量b), 变量c)');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render function with multiple arguments', () => {
      const formula = 'sum(a, b, c, d)';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '求和(变量a, 变量b, 变量c, 变量d)');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render function with expression arguments', () => {
      const formula = 'max(a + b, c * d)';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '最大值(变量a + 变量b, 变量c * 变量d)');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render sqrt function', () => {
      const formula = 'sqrt(a)';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '平方根(变量a)');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render pow function', () => {
      const formula = 'pow(x, 2)';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '幂(变量x, 2)');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render abs function', () => {
      const formula = 'abs(x - y)';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '绝对值(变量x - 变量y)');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });
  });

  describe('rendering complex expressions', () => {
    it('should render priority-respecting expression', () => {
      const formula = 'a + b * c';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '变量a + 变量b * 变量c');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render parentheses-forced grouping', () => {
      const formula = '(a + b) * c';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '(变量a + 变量b) * 变量c');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render deeply nested expression', () => {
      const formula = '((a + b) * (c - d)) / ((e + f) * (g - h))';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '((变量a + 变量b) * (变量c - 变量d)) / ((变量e + 变量f) * (变量g - 变量h))');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render expression with all operators', () => {
      const formula = 'a + b - c * d / e ^ f';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '变量a + 变量b - 变量c * 变量d / 变量e ^ 变量f');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render expression with Chinese parentheses', () => {
      const formula = '（a + b）* c';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '（变量a + 变量b）* 变量c');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });
  });

  describe('rendering financial formulas', () => {
    it('should render call option payoff formula', () => {
      const formula = 'max(S - K, 0)';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '最大值(股价 - 行权价, 0)');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render put option payoff formula', () => {
      const formula = 'max(K - S, 0)';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '最大值(行权价 - 股价, 0)');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render compound interest formula', () => {
      const formula = 'P * pow(1 + r, n)';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '本金 * 幂(1 + 利率, 年数)');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render expected return formula', () => {
      const formula = 'sum(w * r)';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '求和(权重 * 收益率)');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render variance formula', () => {
      const formula = 'sqrt(sum(w ^ 2 * sigma))';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '平方根(求和(权重 ^ 2 * 波动率))');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });
  });

  describe('rendering numbers and variables', () => {
    it('should render number literal', () => {
      const ast = FormulaParser.parse('42');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={{}} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render decimal number', () => {
      const ast = FormulaParser.parse('314');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={{}} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render variable with numbers', () => {
      const formula = 'var1 + var2';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '变量1 + 变量2');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render variable with underscores', () => {
      const formula = 'my_var + another_var';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '我的变量 + 另一个变量');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });
  });

  describe('KaTeX conversion', () => {
    it('should convert operators to LaTeX', () => {
      const formula = 'a + b - c * d / e ^ f';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '变量a + 变量b - 变量c * 变量d / 变量e ^ 变量f');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      // Should render without errors
      expect(container).toBeInTheDocument();
    });

    it('should convert functions to LaTeX', () => {
      const formula = 'max(a, b) + sqrt(c)';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '最大值(变量a, 变量b) + 平方根(变量c)');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      // Should render without errors
      expect(container).toBeInTheDocument();
    });

    it('should handle complex mathematical notation', () => {
      const formula = '(a + b) / (c - d)';
      const ast = FormulaParser.parse(formula);
      const mapping = VariableMapper.createMapping(formula, '(变量a + 变量b) / (变量c - 变量d)');
      
      const { container } = render(
        <ASTTree ast={ast} mapping={mapping.mapping} />
      );
      
      // Should render without errors
      expect(container).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle very long expression', () => {
      const longFormula = 'a' + Array(10).fill(' + b').join('');
      const ast = FormulaParser.parse(longFormula);
      
      const { container } = render(
        <ASTTree ast={ast} mapping={{}} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render formula with many parentheses', () => {
      const formula = '(((a)))';
      const ast = FormulaParser.parse(formula);
      
      const { container } = render(
        <ASTTree ast={ast} mapping={{}} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should handle empty mapping', () => {
      const formula = 'a + b';
      const ast = FormulaParser.parse(formula);
      
      const { container } = render(
        <ASTTree ast={ast} mapping={{}} />
      );
      
      expect(container).toBeInTheDocument();
    });
  });
});
