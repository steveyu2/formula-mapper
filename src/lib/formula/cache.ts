/**
 * 公式缓存系统
 * 
 * 用于优化公式解析和渲染性能
 */

import { FormulaCellData } from '@/lib/types';

/**
 * 公式缓存类
 */
export class FormulaCache {
  // 解析缓存：JSON 字符串 → FormulaCellData
  private parseCache = new Map<string, FormulaCellData>();
  
  // AST 缓存：公式字符串 → AST（未来扩展）
  private astCache = new Map<string, any>();
  
  // 渲染缓存：公式字符串 → 渲染结果（未来扩展）
  private renderCache = new Map<string, string>();
  
  /**
   * 解析公式单元格数据
   */
  parseFormula(cellValue: string): FormulaCellData | null {
    // 检查缓存
    if (this.parseCache.has(cellValue)) {
      return this.parseCache.get(cellValue)!;
    }
    
    // 解析
    const result = this.parseFormulaInternal(cellValue);
    
    // 存入缓存
    if (result) {
      this.parseCache.set(cellValue, result);
    }
    
    return result;
  }
  
  /**
   * 内部解析逻辑
   */
  private parseFormulaInternal(cellValue: string): FormulaCellData | null {
    try {
      // 尝试解析 JSON
      const data = JSON.parse(cellValue);
      
      // 验证数据结构
      if (data && typeof data === 'object' && 
          'englishFormula' in data && 
          'chineseFormula' in data) {
        return data as FormulaCellData;
      }
      
      return null;
    } catch {
      // 不是有效的 JSON，返回 null
      return null;
    }
  }
  
  /**
   * 序列化公式单元格数据
   */
  serializeFormula(data: FormulaCellData): string {
    return JSON.stringify(data);
  }
  
  /**
   * 清除单个缓存
   */
  clearSingle(cellValue: string) {
    this.parseCache.delete(cellValue);
    this.astCache.delete(cellValue);
    this.renderCache.delete(cellValue);
  }
  
  /**
   * 清除所有缓存
   */
  clear() {
    this.parseCache.clear();
    this.astCache.clear();
    this.renderCache.clear();
  }
  
  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      parseCache: this.parseCache.size,
      astCache: this.astCache.size,
      renderCache: this.renderCache.size,
      total: this.parseCache.size + this.astCache.size + this.renderCache.size,
    };
  }
}

// 全局单例
export const formulaCache = new FormulaCache();
