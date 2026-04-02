import { VariableMapper } from '../mapper';

describe('VariableMapper', () => {
  describe('extractEnglishVariables', () => {
    it('should extract simple variable from formula', () => {
      const vars = VariableMapper.extractEnglishVariables('a + b');
      expect(vars).toEqual(['a', 'b']);
    });

    it('should extract multi-character variable names', () => {
      const vars = VariableMapper.extractEnglishVariables('price + amount * quantity');
      expect(vars).toContain('price');
      expect(vars).toContain('amount');
      expect(vars).toContain('quantity');
    });

    it('should handle variables with numbers and underscores', () => {
      const vars = VariableMapper.extractEnglishVariables('var1 + var_2 + myVar_123');
      expect(vars).toContain('var1');
      expect(vars).toContain('var_2');
      expect(vars).toContain('myVar_123');
    });

    it('should not duplicate variables', () => {
      const vars = VariableMapper.extractEnglishVariables('a + a + b + b + b');
      expect(vars).toEqual(['a', 'b']);
    });

    it('should extract from formula with functions', () => {
      const vars = VariableMapper.extractEnglishVariables('max(a, b) + min(c, d)');
      expect(vars).toContain('max');
      expect(vars).toContain('a');
      expect(vars).toContain('b');
      expect(vars).toContain('min');
      expect(vars).toContain('c');
      expect(vars).toContain('d');
    });

    it('should ignore numbers', () => {
      const vars = VariableMapper.extractEnglishVariables('a + 10 + b + 20');
      expect(vars).toEqual(['a', 'b']);
    });

    it('should handle empty formula', () => {
      const vars = VariableMapper.extractEnglishVariables('');
      expect(vars).toEqual([]);
    });

    it('should handle whitespace-only formula', () => {
      const vars = VariableMapper.extractEnglishVariables('   ');
      expect(vars).toEqual([]);
    });

    it('should preserve order of first appearance', () => {
      const vars = VariableMapper.extractEnglishVariables('z + a + m');
      expect(vars).toEqual(['z', 'a', 'm']);
    });

    it('should extract from complex expressions', () => {
      const vars = VariableMapper.extractEnglishVariables('(S - K) / exp(r * t)');
      expect(vars).toContain('S');
      expect(vars).toContain('K');
      expect(vars).toContain('exp');
      expect(vars).toContain('r');
      expect(vars).toContain('t');
    });

    it('should handle real-world derivative formula', () => {
      const vars = VariableMapper.extractEnglishVariables('max(S - K, 0)');
      expect(vars).toContain('max');
      expect(vars).toContain('S');
      expect(vars).toContain('K');
    });
  });

  describe('extractChineseVariables', () => {
    it('should extract simple Chinese variables', () => {
      const vars = VariableMapper.extractChineseVariables('股价 + 行权价');
      expect(vars).toEqual(['股价', '行权价']);
    });

    it('should extract mixed Chinese variables', () => {
      const vars = VariableMapper.extractChineseVariables('当前价格 - 执行价格');
      expect(vars).toContain('当前价格');
      expect(vars).toContain('执行价格');
    });

    it('should not duplicate Chinese variables', () => {
      const vars = VariableMapper.extractChineseVariables('价格 + 价格 + 数量');
      expect(vars).toEqual(['价格', '数量']);
    });

    it('should ignore numbers', () => {
      const vars = VariableMapper.extractChineseVariables('价格 + 10 + 数量 + 20.5');
      expect(vars).toEqual(['价格', '数量']);
    });

    it('should handle parentheses in Chinese formulas', () => {
      const vars = VariableMapper.extractChineseVariables('（股价 - 行权价）× 合约张数');
      expect(vars).toContain('股价');
      expect(vars).toContain('行权价');
      expect(vars).toContain('合约张数');
    });

    it('should handle multiplication operator ×', () => {
      const vars = VariableMapper.extractChineseVariables('利率 × 时间');
      expect(vars).toContain('利率');
      expect(vars).toContain('时间');
    });

    it('should handle division operator ÷', () => {
      const vars = VariableMapper.extractChineseVariables('总收益 ÷ 投资金额');
      expect(vars).toContain('总收益');
      expect(vars).toContain('投资金额');
    });

    it('should handle power notation', () => {
      const vars = VariableMapper.extractChineseVariables('基数 ^ 2');
      expect(vars).toContain('基数');
    });

    it('should handle empty formula', () => {
      const vars = VariableMapper.extractChineseVariables('');
      expect(vars).toEqual([]);
    });

    it('should handle formula with only numbers', () => {
      const vars = VariableMapper.extractChineseVariables('10 + 20 + 30');
      expect(vars).toEqual([]);
    });
  });

  describe('createMapping', () => {
    it('should create basic mapping between English and Chinese variables', () => {
      const mapping = VariableMapper.createMapping('a + b', '价格 + 数量');
      expect(mapping.mapping['a']).toBe('价格');
      expect(mapping.mapping['b']).toBe('数量');
      expect(mapping.englishVars).toEqual(['a', 'b']);
      expect(mapping.chineseVars).toEqual(['价格', '数量']);
      expect(mapping.hasMoreChinese).toBe(false);
    });

    it('should handle more Chinese variables than English', () => {
      const mapping = VariableMapper.createMapping('a + b', '价格 + 数量 + 金额');
      expect(mapping.hasMoreChinese).toBe(true);
      expect(mapping.chineseVars.length).toBe(3);
    });

    it('should mark undefined variables with placeholder', () => {
      const mapping = VariableMapper.createMapping('a', '价格 + 数量');
      expect(mapping.mapping['a']).toBe('价格');
      expect(mapping.hasMoreChinese).toBe(true);
    });

    it('should create empty mapping for empty formulas', () => {
      const mapping = VariableMapper.createMapping('', '');
      expect(mapping.englishVars).toEqual([]);
      expect(mapping.chineseVars).toEqual([]);
      expect(mapping.hasMoreChinese).toBe(false);
    });

    it('should handle complex real-world formulas', () => {
      const mapping = VariableMapper.createMapping(
        'max(S - K)',
        '最大值(股价 - 行权价)'
      );
      expect(mapping.englishVars).toContain('S');
      expect(mapping.englishVars).toContain('K');
      expect(mapping.englishVars).toContain('max');
      expect(mapping.chineseVars).toContain('股价');
      expect(mapping.chineseVars).toContain('行权价');
    });

    it('should preserve English variable order', () => {
      const mapping = VariableMapper.createMapping('z + a + m + b', '变量z + 变量a + 变量m + 变量b');
      expect(mapping.englishVars).toEqual(['z', 'a', 'm', 'b']);
    });
  });

  describe('formatMapping', () => {
    it('should format mapping into readable items', () => {
      const mappingResult = VariableMapper.createMapping('a + b', '价格 + 数量');
      const formatted = VariableMapper.formatMapping(mappingResult);
      
      expect(formatted.items).toHaveLength(2);
      expect(formatted.items[0]).toEqual({ english: 'a', chinese: '价格' });
      expect(formatted.items[1]).toEqual({ english: 'b', chinese: '数量' });
      expect(formatted.hasMoreChinese).toBe(false);
    });

    it('should include hasMoreChinese flag', () => {
      const mappingResult = VariableMapper.createMapping('a + b', '价格 + 数量 + 金额');
      const formatted = VariableMapper.formatMapping(mappingResult);
      
      expect(formatted.hasMoreChinese).toBe(true);
    });

    it('should handle single variable mapping', () => {
      const mappingResult = VariableMapper.createMapping('price', '价格');
      const formatted = VariableMapper.formatMapping(mappingResult);
      
      expect(formatted.items).toHaveLength(1);
      expect(formatted.items[0].english).toBe('price');
      expect(formatted.items[0].chinese).toBe('价格');
    });

    it('should preserve mapping order', () => {
      const mappingResult = VariableMapper.createMapping('z + a + m', '变量z + 变量a + 变量m');
      const formatted = VariableMapper.formatMapping(mappingResult);
      
      expect(formatted.items[0].english).toBe('z');
      expect(formatted.items[1].english).toBe('a');
      expect(formatted.items[2].english).toBe('m');
    });

    it('should handle empty mapping', () => {
      const mappingResult = VariableMapper.createMapping('', '');
      const formatted = VariableMapper.formatMapping(mappingResult);
      
      expect(formatted.items).toHaveLength(0);
      expect(formatted.hasMoreChinese).toBe(false);
    });
  });

  describe('real-world scenarios', () => {
    it('should map Black-Scholes option pricing formula', () => {
      const englishFormula = 'S * N_d1 - K * exp(-r * T) * N_d2';
      const chineseFormula = '股价 × N_d1 - 行权价 × exp(-利率 × 时间) × N_d2';
      
      const mapping = VariableMapper.createMapping(englishFormula, chineseFormula);
      expect(mapping.englishVars).toContain('S');
      expect(mapping.englishVars).toContain('K');
      expect(mapping.englishVars).toContain('r');
      expect(mapping.englishVars).toContain('T');
      expect(mapping.chineseVars).toContain('股价');
      expect(mapping.chineseVars).toContain('行权价');
    });

    it('should map call option formula', () => {
      const mapping = VariableMapper.createMapping(
        'S - K',
        '股价 - 行权价'
      );
      expect(mapping.mapping['S']).toBe('股价');
      expect(mapping.mapping['K']).toBe('行权价');
    });

    it('should handle financial ratio formula', () => {
      const mapping = VariableMapper.createMapping(
        '(Revenue - COGS) / Revenue',
        '（收入 - 销售成本）/ 收入'
      );
      expect(mapping.englishVars).toContain('Revenue');
      expect(mapping.englishVars).toContain('COGS');
    });
  });
});
