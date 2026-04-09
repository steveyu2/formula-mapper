import { createFormula, createGroup } from '@/lib/storage';

describe('Storage Utils', () => {
  describe('createFormula', () => {
    it('should create a formula with required fields', () => {
      const formula = createFormula('Test Formula', 'A + B', '甲 + 乙');
      
      expect(formula.name).toBe('Test Formula');
      expect(formula.englishFormula).toBe('A + B');
      expect(formula.chineseFormula).toBe('甲 + 乙');
      expect(formula.id).toBeDefined();
      expect(formula.createdAt).toBeDefined();
      expect(typeof formula.createdAt).toBe('number');
    });

    it('should generate unique IDs for different formulas', () => {
      const formula1 = createFormula('Formula 1', 'A + B', '甲 + 乙');
      const formula2 = createFormula('Formula 2', 'C + D', '丙 + 丁');
      
      expect(formula1.id).not.toBe(formula2.id);
    });

    it('should create formula with optional fields', () => {
      const formula = createFormula('Test', 'A', '甲');
      formula.description = 'Test description';
      formula.level1Group = 'Module 1';
      formula.level2Group = 'Code 1';
      
      expect(formula.description).toBe('Test description');
      expect(formula.level1Group).toBe('Module 1');
      expect(formula.level2Group).toBe('Code 1');
    });
  });

  describe('createGroup', () => {
    it('should create a group with required fields', () => {
      const group = createGroup('Test Group');
      
      expect(group.name).toBe('Test Group');
      expect(group.id).toBeDefined();
      expect(group.parentId).toBeNull();
      expect(group.formulas).toEqual([]);
      expect(group.createdAt).toBeDefined();
    });

    it('should create a sub-group with parentId', () => {
      const parentGroup = createGroup('Parent Group');
      const childGroup = createGroup('Child Group', parentGroup.id);
      
      expect(childGroup.parentId).toBe(parentGroup.id);
    });

    it('should generate unique IDs for different groups', () => {
      const group1 = createGroup('Group 1');
      const group2 = createGroup('Group 2');
      
      expect(group1.id).not.toBe(group2.id);
    });
  });
});
