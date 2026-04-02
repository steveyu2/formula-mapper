import { loadData, saveData, createGroup, createFormula } from '../storage';
import { FormulaGroup, Formula } from '../types';

describe('Storage Module', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('createFormula', () => {
    it('should create a formula with required fields', () => {
      const formula = createFormula('Test', 'a + b', '变量a + 变量b');
      
      expect(formula.id).toBeDefined();
      expect(formula.name).toBe('Test');
      expect(formula.englishFormula).toBe('a + b');
      expect(formula.chineseFormula).toBe('变量a + 变量b');
      expect(formula.createdAt).toBeDefined();
    });

    it('should generate unique IDs', () => {
      const formula1 = createFormula('Test1', 'a + b', '变量a + 变量b');
      const formula2 = createFormula('Test2', 'c + d', '变量c + 变量d');
      
      expect(formula1.id).not.toBe(formula2.id);
    });

    it('should set createdAt timestamp', () => {
      const before = Date.now();
      const formula = createFormula('Test', 'a + b', '变量a + 变量b');
      const after = Date.now();
      
      expect(formula.createdAt).toBeGreaterThanOrEqual(before);
      expect(formula.createdAt).toBeLessThanOrEqual(after);
    });

    it('should allow optional description', () => {
      const formula = createFormula('Test', 'a + b', '变量a + 变量b');
      expect(formula.description).toBeUndefined();
    });
  });

  describe('createGroup', () => {
    it('should create a group with required fields', () => {
      const group = createGroup('Test Group');
      
      expect(group.id).toBeDefined();
      expect(group.name).toBe('Test Group');
      expect(group.parentId).toBeNull();
      expect(group.formulas).toEqual([]);
      expect(group.createdAt).toBeDefined();
    });

    it('should create group with parent ID', () => {
      const parentId = 'parent-id';
      const group = createGroup('Sub Group', parentId);
      
      expect(group.parentId).toBe(parentId);
    });

    it('should generate unique group IDs', () => {
      const group1 = createGroup('Group1');
      const group2 = createGroup('Group2');
      
      expect(group1.id).not.toBe(group2.id);
    });

    it('should set createdAt timestamp', () => {
      const before = Date.now();
      const group = createGroup('Test Group');
      const after = Date.now();
      
      expect(group.createdAt).toBeGreaterThanOrEqual(before);
      expect(group.createdAt).toBeLessThanOrEqual(after);
    });
  });

  describe('saveData and loadData', () => {
    it('should save and load empty groups', () => {
      const groups: FormulaGroup[] = [];
      saveData(groups);
      const loaded = loadData();
      
      expect(loaded).toEqual([]);
    });

    it('should save and load single group', () => {
      const groups: FormulaGroup[] = [
        {
          id: '1',
          name: 'Test Group',
          parentId: null,
          formulas: [],
          createdAt: Date.now(),
        },
      ];
      
      saveData(groups);
      const loaded = loadData();
      
      expect(loaded).toHaveLength(1);
      expect(loaded[0].name).toBe('Test Group');
    });

    it('should save and load group with formulas', () => {
      const groups: FormulaGroup[] = [
        {
          id: '1',
          name: 'Group 1',
          parentId: null,
          formulas: [
            {
              id: 'f1',
              name: 'Formula 1',
              englishFormula: 'a + b',
              chineseFormula: '变量a + 变量b',
              createdAt: Date.now(),
            },
          ],
          createdAt: Date.now(),
        },
      ];
      
      saveData(groups);
      const loaded = loadData();
      
      expect(loaded[0].formulas).toHaveLength(1);
      expect(loaded[0].formulas[0].name).toBe('Formula 1');
    });

    it('should handle multiple groups', () => {
      const groups: FormulaGroup[] = [
        createGroup('Group 1'),
        createGroup('Group 2'),
        createGroup('Group 3'),
      ];
      
      saveData(groups);
      const loaded = loadData();
      
      expect(loaded).toHaveLength(3);
      expect(loaded.map(g => g.name)).toEqual(['Group 1', 'Group 2', 'Group 3']);
    });

    it('should handle nested groups with parent IDs', () => {
      const parentGroup = createGroup('Parent Group');
      const childGroup = createGroup('Child Group', parentGroup.id);
      const groupsToSave: FormulaGroup[] = [parentGroup, childGroup];
      
      saveData(groupsToSave);
      const loaded = loadData();
      
      expect(loaded[1].parentId).toBe(loaded[0].id);
    });

    it('should preserve all group properties', () => {
      const now = Date.now();
      const group: FormulaGroup = {
        id: 'test-id',
        name: 'Test Group',
        parentId: null,
        formulas: [
          {
            id: 'f1',
            name: 'Formula 1',
            englishFormula: 'x + y',
            chineseFormula: '变量x + 变量y',
            createdAt: now,
            description: 'Test description',
            variableFormulaMapping: { 'x': 'f2' },
            subFormulas: [
              {
                id: 'sf1',
                name: 'SubFormula 1',
                englishFormula: 'a * b',
                chineseFormula: '变量a * 变量b',
              },
            ],
          },
        ],
        createdAt: now,
      };
      
      const groups = [group];
      saveData(groups);
      const loaded = loadData();
      
      expect(loaded[0]).toEqual(group);
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorage.setItem('formulaMapper', 'invalid json');
      const loaded = loadData();
      
      expect(loaded).toEqual([]);
    });

    it('should return empty array if no data exists', () => {
      const loaded = loadData();
      
      expect(loaded).toEqual([]);
    });

    it('should update existing data', () => {
      const groups1: FormulaGroup[] = [createGroup('Group 1')];
      saveData(groups1);
      
      const groups2: FormulaGroup[] = [createGroup('Group 2'), createGroup('Group 3')];
      saveData(groups2);
      
      const loaded = loadData();
      expect(loaded).toHaveLength(2);
      expect(loaded[0].name).toBe('Group 2');
      expect(loaded[1].name).toBe('Group 3');
    });

    it('should handle special characters in names', () => {
      const group = createGroup('Test Group 测试 !@#$%');
      const groups = [group];
      
      saveData(groups);
      const loaded = loadData();
      
      expect(loaded[0].name).toBe('Test Group 测试 !@#$%');
    });

    it('should handle large formulas', () => {
      const largeFormula = 'a'.repeat(1000) + '+' + 'b'.repeat(1000);
      const formula = createFormula('Large', largeFormula, '大公式');
      const group: FormulaGroup = {
        id: 'g1',
        name: 'Group',
        parentId: null,
        formulas: [formula],
        createdAt: Date.now(),
      };
      
      saveData([group]);
      const loaded = loadData();
      
      expect(loaded[0].formulas[0].englishFormula.length).toBeGreaterThan(1000);
    });
  });

  describe('edge cases', () => {
    it('should handle formula with empty name', () => {
      const formula = createFormula('', 'a + b', '变量a + 变量b');
      expect(formula.name).toBe('');
    });

    it('should handle formula with empty formulas', () => {
      const formula = createFormula('Empty', '', '');
      expect(formula.englishFormula).toBe('');
      expect(formula.chineseFormula).toBe('');
    });

    it('should handle group with empty formulas array', () => {
      const group = createGroup('Empty Group');
      expect(group.formulas).toEqual([]);
    });

    it('should preserve formula order in group', () => {
      const group: FormulaGroup = {
        id: 'g1',
        name: 'Group',
        parentId: null,
        formulas: [
          createFormula('Formula 1', 'a + b', 'a + b'),
          createFormula('Formula 2', 'c + d', 'c + d'),
          createFormula('Formula 3', 'e + f', 'e + f'),
        ],
        createdAt: Date.now(),
      };
      
      saveData([group]);
      const loaded = loadData();
      
      expect(loaded[0].formulas[0].name).toBe('Formula 1');
      expect(loaded[0].formulas[1].name).toBe('Formula 2');
      expect(loaded[0].formulas[2].name).toBe('Formula 3');
    });
  });
});
