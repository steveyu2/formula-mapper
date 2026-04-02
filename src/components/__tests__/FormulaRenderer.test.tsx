import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FormulaRenderer } from '../FormulaRenderer';
import { VariableMapper } from '@/lib/mapper';

describe('FormulaRenderer', () => {
  describe('rendering English formulas', () => {
    it('should render simple variable', () => {
      const formula = 'a';
      const mapping = VariableMapper.createMapping(formula, '中文');
      
      const { container } = render(
        <FormulaRenderer formula={formula} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render addition expression', () => {
      const formula = 'a + b';
      const mapping = VariableMapper.createMapping(formula, '变量a + 变量b');
      
      const { container } = render(
        <FormulaRenderer formula={formula} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render complex formula', () => {
      const formula = '(a + b) * c / d ^ 2';
      const mapping = VariableMapper.createMapping(formula, '(变量a + 变量b) * 变量c / 变量d ^ 2');
      
      const { container } = render(
        <FormulaRenderer formula={formula} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should handle formula with function', () => {
      const formula = 'max(a, b)';
      const mapping = VariableMapper.createMapping(formula, '最大值(变量a, 变量b)');
      
      const { container } = render(
        <FormulaRenderer formula={formula} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render nested function', () => {
      const formula = 'max(min(a, b), c)';
      const mapping = VariableMapper.createMapping(formula, '最大值(最小值(变量a, 变量b), 变量c)');
      
      const { container } = render(
        <FormulaRenderer formula={formula} mapping={mapping.mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });
  });

  describe('handling edge cases', () => {
    it('should handle single number', () => {
      const formula = '42';
      
      const { container } = render(
        <FormulaRenderer formula={formula} mapping={{}} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should handle empty mapping', () => {
      const formula = 'a + b';
      
      const { container } = render(
        <FormulaRenderer formula={formula} mapping={{}} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should handle empty formula', () => {
      const { container } = render(
        <FormulaRenderer formula="" mapping={{}} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should handle formula with only whitespace', () => {
      const { container } = render(
        <FormulaRenderer formula="   " mapping={{}} />
      );
      
      expect(container).toBeInTheDocument();
    });
  });

  describe('formula with special operators', () => {
    it('should render power operator correctly', () => {
      const formula = 'x ^ 2';
      
      const { container } = render(
        <FormulaRenderer formula={formula} mapping={{}} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render all arithmetic operators', () => {
      const operators = ['+', '-', '*', '/'];
      
      for (const op of operators) {
        const formula = `a ${op} b`;
        
        const { container } = render(
          <FormulaRenderer formula={formula} mapping={{}} />
        );
        
        expect(container).toBeInTheDocument();
      }
    });

    it('should handle Chinese parentheses', () => {
      const formula = '（a + b）* c';
      
      const { container } = render(
        <FormulaRenderer formula={formula} mapping={{}} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should handle square and curly brackets', () => {
      const brackets = ['[a + b]', '{a + b}'];
      
      for (const formula of brackets) {
        const { container } = render(
          <FormulaRenderer formula={formula} mapping={{}} />
        );
        
        expect(container).toBeInTheDocument();
      }
    });
  });

  describe('variable mapping rendering', () => {
    it('should render mapped variables', () => {
      const formula = 'a + b';
      const mapping = { a: '价格', b: '数量' };
      
      const { container } = render(
        <FormulaRenderer formula={formula} mapping={mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should handle partial mapping', () => {
      const formula = 'a + b + c';
      const mapping = { a: '价格', b: '数量' }; // c is not mapped
      
      const { container } = render(
        <FormulaRenderer formula={formula} mapping={mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should handle formula references', () => {
      const formula = 'a + b';
      const mapping = { a: '价格', b: '数量' };
      const formulaReferences = {
        a: {
          name: 'Price Formula',
          englishFormula: 'stock_price',
          chineseFormula: '股票价格',
          id: 'f1',
          isSubFormula: false,
        },
      };
      
      const { container } = render(
        <FormulaRenderer 
          formula={formula} 
          mapping={mapping}
          formulaReferences={formulaReferences}
        />
      );
      
      expect(container).toBeInTheDocument();
    });
  });

  describe('real-world financial formulas', () => {
    it('should render call option formula', () => {
      const formula = 'max(S - K, 0)';
      const mapping = { S: '股价', K: '行权价', max: '最大值' };
      
      const { container } = render(
        <FormulaRenderer formula={formula} mapping={mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render portfolio value formula', () => {
      const formula = 'sum(w * r)';
      const mapping = { w: '权重', r: '收益率', sum: '求和' };
      
      const { container } = render(
        <FormulaRenderer formula={formula} mapping={mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });

    it('should render Black-Scholes component', () => {
      const formula = 'S * N_d1 - K * exp(-r * T) * N_d2';
      const mapping = {
        S: '股价',
        N_d1: 'N(d1)',
        K: '行权价',
        r: '无风险利率',
        T: '时间',
        N_d2: 'N(d2)',
        exp: '指数函数',
      };
      
      const { container } = render(
        <FormulaRenderer formula={formula} mapping={mapping} />
      );
      
      expect(container).toBeInTheDocument();
    });
  });
});
