import { FormulaGroup, Formula } from './types';

const STORAGE_KEY = 'formulaMapper';
const HEADERS_KEY = 'formulaMapper_headers';

export interface ColumnHeaders {
  level1?: string;
  level2?: string;
  level3?: string;
  level4?: string;
  level5?: string;
  level6?: string;
  formula?: string;
}

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

export function loadColumnHeaders(): ColumnHeaders | undefined {
  if (typeof window === 'undefined') return undefined;
  
  try {
    const data = localStorage.getItem(HEADERS_KEY);
    return data ? JSON.parse(data) : undefined;
  } catch (error) {
    console.error('Failed to load column headers:', error);
    return undefined;
  }
}

export function saveData(groups: FormulaGroup[], headers?: ColumnHeaders): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
    if (headers) {
      localStorage.setItem(HEADERS_KEY, JSON.stringify(headers));
    }
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
