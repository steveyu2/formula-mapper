'use client';

import { useState, useEffect, useCallback } from 'react';
import { Formula, FormulaGroup, SubFormula } from '@/lib/types';
import { FormulaParser } from '@/lib/parser';
import { VariableMapper } from '@/lib/mapper';
import { FormulaCalculator } from '@/lib/calculator';

interface CalculationTabProps {
  editFormula: Formula;
  groups: FormulaGroup[];
  mapping: Record<string, string>;
  ast: any;
}

export function CalculationTab({ editFormula, groups, mapping, ast }: CalculationTabProps) {
  // 计算相关状态
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [boundFormulaValues, setBoundFormulaValues] = useState<Record<string, Record<string, string>>>({});
  const [calculationResult, setCalculationResult] = useState<{ result: number; steps: string[] } | null>(null);
  const [calculationError, setCalculationError] = useState<string>('');

  // 计算逻辑
  const handleCalculate = useCallback(() => {
    if (!ast) return;
    try {
      // 1. 收集主公式变量值
      const mainValues: Record<string, number> = {};
      for (const [key, val] of Object.entries(variableValues)) {
        if (val !== '') mainValues[key] = parseFloat(val);
      }
      
      // 2. 计算绑定公式的值，并添加到主公式变量中
      for (const [bindingKey, formulaValues] of Object.entries(boundFormulaValues)) {
        // bindingKey 格式: "variable-refFormulaId"
        const firstDashIndex = bindingKey.indexOf('-');
        const variable = bindingKey.substring(0, firstDashIndex);
        const refFormulaId = bindingKey.substring(firstDashIndex + 1);
        
        // 收集绑定公式的变量值
        const formulaVarValues: Record<string, number> = {};
        for (const [varName, val] of Object.entries(formulaValues)) {
          if (val !== '') {
            formulaVarValues[varName] = parseFloat(val);
          }
        }
        
        // 计算绑定公式的结果
        try {
          if (refFormulaId.startsWith('sub_')) {
            const subFormulaId = refFormulaId.substring(4);
            const subFormula = editFormula.subFormulas?.find(sf => sf.id === subFormulaId);
            if (subFormula) {
              const subAst = FormulaParser.parse(subFormula.englishFormula);
              const result = FormulaCalculator.evaluate(subAst, formulaVarValues);
              mainValues[variable] = result.result;  // 将绑定公式的计算结果赋值给主公式变量
            }
          } else {
            for (const group of groups) {
              const found = group.formulas.find(f => f.id === refFormulaId);
              if (found) {
                const foundAst = FormulaParser.parse(found.englishFormula);
                const result = FormulaCalculator.evaluate(foundAst, formulaVarValues);
                mainValues[variable] = result.result;  // 将绑定公式的计算结果赋值给主公式变量
                break;
              }
            }
          }
        } catch (e) {
          // 如果计算失败，跳过
        }
      }
      
      // 3. 计算主公式
      const result = FormulaCalculator.evaluate(ast, mainValues);
      setCalculationResult(result);
      setCalculationError('');
    } catch (err) {
      setCalculationError(err instanceof Error ? err.message : '计算错误');
      setCalculationResult(null);
    }
  }, [ast, variableValues, boundFormulaValues]);

  // 自动计算
  useEffect(() => {
    if (ast) {
      handleCalculate();
    }
  }, [ast, handleCalculate]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200" style={{ padding: '10px' }}>
      <div className="space-y-4">
        {/* 公式信息 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="space-y-2">
            <div>
              <span className="text-sm text-blue-700 font-medium">英文公式：</span>
              <span className="text-sm font-mono text-blue-900">{editFormula.englishFormula}</span>
            </div>
            <div>
              <span className="text-sm text-blue-700 font-medium">中文公式：</span>
              <span className="text-sm text-blue-900">{editFormula.chineseFormula}</span>
            </div>
          </div>
        </div>

        {/* 主公式变量输入 - 放最上面 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">主公式变量</label>
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            {Object.keys(mapping).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(mapping).map(([eng, chi]) => {
                  const isBound = editFormula.variableFormulaMapping?.[eng];
                  // 只显示未绑定的变量
                  if (isBound) return null;
                  
                  return (
                    <div key={eng} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 w-24 text-right">{chi}</span>
                      <input
                        type="number"
                        step="any"
                        value={variableValues[eng] || ''}
                        onChange={(e) => setVariableValues({...variableValues, [eng]: e.target.value})}
                        placeholder="输入数值"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-400 font-mono w-20">{eng}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">无变量</p>
            )}
          </div>
        </div>

        {/* 绑定公式的值 - 按公式分组显示 */}
        {editFormula.variableFormulaMapping && Object.keys(editFormula.variableFormulaMapping).length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">绑定公式的值</label>
            <div className="space-y-3">
              {(() => {
                // 按变量分别显示（不合并）
                const variableBindings: Array<{
                  variable: string;  // 原公式的变量名
                  refFormulaId: string;  // 绑定的公式ID
                  formulaInfo: any;
                  formulaAst: any;
                  formulaVariables: Array<{eng: string; chi: string}>;
                }> = [];
                
                for (const [variable, refFormulaId] of Object.entries(editFormula.variableFormulaMapping || {})) {
                  // 获取公式信息
                  let formulaInfo = { name: variable, formula: refFormulaId };
                  let formulaContent = '';
                  let formulaAst = null;
                  
                  if (refFormulaId.startsWith('sub_')) {
                    const subFormulaId = refFormulaId.substring(4);
                    const subFormula = editFormula.subFormulas?.find(sf => sf.id === subFormulaId);
                    if (subFormula) {
                      formulaInfo = { name: subFormula.name, formula: subFormula.englishFormula };
                      formulaContent = subFormula.englishFormula;
                      try {
                        formulaAst = FormulaParser.parse(subFormula.englishFormula);
                      } catch (e) {}
                    }
                  } else {
                    for (const group of groups) {
                      const found = group.formulas.find(f => f.id === refFormulaId);
                      if (found) {
                        formulaInfo = {
                          name: (found as any).level4Group || found.name || refFormulaId,
                          formula: found.englishFormula
                        };
                        formulaContent = found.englishFormula;
                        try {
                          formulaAst = FormulaParser.parse(found.englishFormula);
                        } catch (e) {}
                        break;
                      }
                    }
                  }
                  
                  // 提取公式中的变量
                  const formulaVariables: Array<{eng: string; chi: string}> = [];
                  if (formulaAst) {
                    const variables = FormulaCalculator.extractVariables(formulaAst);
                    // 尝试找到中文映射
                    if (refFormulaId.startsWith('sub_')) {
                      const subFormulaId = refFormulaId.substring(4);
                      const subFormula = editFormula.subFormulas?.find(sf => sf.id === subFormulaId);
                      if (subFormula && subFormula.chineseFormula) {
                        try {
                          const mappingResult = VariableMapper.createMapping(subFormula.englishFormula, subFormula.chineseFormula);
                          variables.forEach(v => {
                            formulaVariables.push({ eng: v, chi: mappingResult.mapping[v] || v });
                          });
                        } catch (e) {
                          variables.forEach(v => {
                            formulaVariables.push({ eng: v, chi: v });
                          });
                        }
                      } else {
                        variables.forEach(v => {
                          formulaVariables.push({ eng: v, chi: v });
                        });
                      }
                    } else {
                      for (const group of groups) {
                        const found = group.formulas.find(f => f.id === refFormulaId);
                        if (found && found.chineseFormula) {
                          try {
                            const mappingResult = VariableMapper.createMapping(found.englishFormula, found.chineseFormula);
                            variables.forEach(v => {
                              formulaVariables.push({ eng: v, chi: mappingResult.mapping[v] || v });
                            });
                          } catch (e) {
                            variables.forEach(v => {
                              formulaVariables.push({ eng: v, chi: v });
                            });
                          }
                          break;
                        }
                      }
                      if (formulaVariables.length === 0) {
                        const variables = FormulaCalculator.extractVariables(formulaAst);
                        variables.forEach(v => {
                          formulaVariables.push({ eng: v, chi: v });
                        });
                      }
                    }
                  }
                  
                  variableBindings.push({
                    variable,
                    refFormulaId,
                    formulaInfo,
                    formulaAst,
                    formulaVariables
                  });
                }
                
                return variableBindings.map(({ variable, refFormulaId, formulaInfo, formulaVariables }) => {
                  const variableChi = mapping[variable] || variable;
                  
                  return (
                    <div key={`${variable}-${refFormulaId}`} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                      {/* 公式信息 */}
                      <div className="mb-3 pb-2 border-b border-gray-200">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-800">{formulaInfo.name}</span>
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            用于变量: {variableChi} ({variable})
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 font-mono">{formulaInfo.formula}</div>
                      </div>
                      
                      {/* 变量输入 */}
                      {(() => {
                        // 使用 variable-refFormulaId 作为唯一key，避免多个变量绑定同一公式时值同步
                        const bindingKey = `${variable}-${refFormulaId}`;
                        
                        return formulaVariables.map(({ eng, chi }) => (
                          <div key={eng} className="flex items-center gap-3">
                            <span className="text-sm text-gray-700 w-24 text-right">{chi}</span>
                            <input
                              type="number"
                              step="any"
                              value={boundFormulaValues[bindingKey]?.[eng] || ''}
                              onChange={(e) => setBoundFormulaValues({
                                ...boundFormulaValues,
                                [bindingKey]: {
                                  ...(boundFormulaValues[bindingKey] || {}),
                                  [eng]: e.target.value
                                }
                              })}
                              placeholder="输入数值"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-400 font-mono w-20">{eng}</span>
                          </div>
                        ));
                      })()}
                  </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* 计算结果 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">计算结果</label>
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            {calculationError ? (
              <p className="text-sm text-red-600">{calculationError}</p>
            ) : calculationResult ? (
              <div>
                <div className="mb-4">
                  <div className="text-xs text-gray-500 mb-2">计算过程:</div>
                  <pre className="bg-white border border-gray-200 p-4 rounded-lg text-base font-mono overflow-x-auto whitespace-pre-wrap break-all text-gray-800">
                    {(() => {
                      // 构建变量替换映射
                      const allValues: Record<string, number> = {};
                      // 存储绑定公式的表达式（用于展开显示）
                      const boundFormulaExpressions: Record<string, string> = {};
                      
                      // 1. 处理主公式变量（未绑定的）
                      for (const [key, val] of Object.entries(variableValues)) {
                        if (val !== '') allValues[key] = parseFloat(val);
                      }
                      
                      // 2. 处理绑定公式的值，并构建表达式
                      for (const [bindingKey, formulaValues] of Object.entries(boundFormulaValues)) {
                        // bindingKey 格式: "variable-refFormulaId"
                        // 使用 indexOf 找到第一个 '-' 来分割，因为 refFormulaId 可能包含 '-'
                        const firstDashIndex = bindingKey.indexOf('-');
                        const variable = bindingKey.substring(0, firstDashIndex);
                        const refFormulaId = bindingKey.substring(firstDashIndex + 1);
                        
                        // 计算绑定公式的表达式
                        let formulaExpression = '';
                        const formulaVarValues: Record<string, number> = {};
                        
                        // 收集绑定公式的变量值
                        for (const [varName, val] of Object.entries(formulaValues)) {
                          if (val !== '') {
                            formulaVarValues[varName] = parseFloat(val);
                          }
                        }
                        
                        // 找到绑定公式的原始表达式
                        let formulaContent = '';
                        if (refFormulaId.startsWith('sub_')) {
                          const subFormulaId = refFormulaId.substring(4);
                          const subFormula = editFormula.subFormulas?.find(sf => sf.id === subFormulaId);
                          if (subFormula) {
                            formulaContent = subFormula.englishFormula;
                          }
                        } else {
                          for (const group of groups) {
                            const found = group.formulas.find(f => f.id === refFormulaId);
                            if (found) {
                              formulaContent = found.englishFormula;
                              break;
                            }
                          }
                        }
                        
                        // 生成绑定公式的表达式（替换变量为值）
                        if (formulaContent && Object.keys(formulaVarValues).length > 0) {
                          formulaExpression = FormulaCalculator.replaceVariables(formulaContent, formulaVarValues);
                          console.log(`绑定公式 ${variable} (${refFormulaId}):`, {
                            formulaContent,
                            formulaVarValues,
                            formulaExpression
                          });
                        } else {
                          console.log(`绑定公式 ${variable} 缺少内容:`, {
                            formulaContent,
                            formulaVarValues,
                            hasContent: !!formulaContent,
                            hasValues: Object.keys(formulaVarValues).length > 0
                          });
                        }
                        
                        // 计算绑定公式的值
                        try {
                          if (refFormulaId.startsWith('sub_')) {
                            const subFormulaId = refFormulaId.substring(4);
                            const subFormula = editFormula.subFormulas?.find(sf => sf.id === subFormulaId);
                            if (subFormula) {
                              const subAst = FormulaParser.parse(subFormula.englishFormula);
                              const result = FormulaCalculator.evaluate(subAst, formulaVarValues);
                              allValues[variable] = result.result;
                            }
                          } else {
                            for (const group of groups) {
                              const found = group.formulas.find(f => f.id === refFormulaId);
                              if (found) {
                                const foundAst = FormulaParser.parse(found.englishFormula);
                                const result = FormulaCalculator.evaluate(foundAst, formulaVarValues);
                                allValues[variable] = result.result;
                                break;
                              }
                            }
                          }
                        } catch (e) {
                          // 如果计算失败，跳过
                        }
                        
                        // 保存表达式用于显示
                        if (formulaExpression) {
                          boundFormulaExpressions[variable] = formulaExpression;
                        }
                      }
                      
                      // 3. 生成展开的表达式
                      // 先替换绑定公式的变量为它们的表达式（用括号包裹）
                      let displayFormula = editFormula.englishFormula;
                      console.log('boundFormulaExpressions:', boundFormulaExpressions);
                      console.log('displayFormula before:', displayFormula);
                      
                      const sortedBoundVars = Object.keys(boundFormulaExpressions).sort((a, b) => b.length - a.length);
                      for (const varName of sortedBoundVars) {
                        const regex = new RegExp(`\\b${varName}\\b`, 'g');
                        displayFormula = displayFormula.replace(regex, `(${boundFormulaExpressions[varName]})`);
                      }
                      
                      console.log('displayFormula after bound:', displayFormula);
                      console.log('allValues:', allValues);
                      
                      // 再替换主公式变量的值
                      const finalExpression = FormulaCalculator.replaceVariables(displayFormula, allValues);
                      
                      console.log('finalExpression:', finalExpression);
                      
                      return finalExpression;
                    })()}
                  </pre>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-500">最终结果: </span>
                  <span className="text-2xl font-bold text-blue-600 ml-2">
                    {calculationResult.result}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">请输入变量值以查看计算结果</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
