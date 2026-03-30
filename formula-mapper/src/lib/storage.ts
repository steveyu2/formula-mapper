import { FormulaGroup, Formula } from './types';

const STORAGE_KEY = 'formulaMapper';

export function loadData(): FormulaGroup[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load data:', error);
    return [];
  }
}

export function saveData(groups: FormulaGroup[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch (error) {
    console.error('Failed to save data:', error);
  }
}

export function createGroup(name: string, parentId: string | null = null): FormulaGroup {
  return {
    id: generateId(),
    name,
    parentId,
    formulas: [],
    createdAt: Date.now(),
  };
}

export function createFormula(name: string, englishFormula: string, chineseFormula: string): Formula {
  return {
    id: generateId(),
    name,
    englishFormula,
    chineseFormula,
    createdAt: Date.now(),
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
