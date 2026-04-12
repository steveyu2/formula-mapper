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
  const [subFormulaVariableValues, setSubFormulaVariableValues] = useState<Record<string, Record<string, string>>>({});
  const [calculationResult, setCalculationResult] = useState<{ result: number; steps: string[] } | null>(null);
  const [calculationError, setCalculationError] = useState<string>('');
  const [subFormulaMappings, setSubFormulaMappings] = useState<Record<string, Record<string, string>>>({});

  // 初始化子公式变量映射
  useEffect(() => {
    if (editFormula?.subFormulas && editFormula.subFormulas.length > 0) {
      const mappings: Record<string, Record<string, string>> = {};
      for (const subFormula of editFormula.subFormulas) {
        try {
          if (subFormula.chineseFormula) {
            const mappingResult = VariableMapper.createMapping(subFormula.englishFormula, subFormula.chineseFormula);
            mappings[subFormula.id] = mappingResult.mapping;
          } else {
            const ast = FormulaParser.parse(subFormula.englishFormula);
            const variables = FormulaCalculator.extractVariables(ast);
            const varMapping: Record<string, string> = {};
            variables.forEach(v => { varMapping[v] = v; });
            mappings[subFormula.id] = varMapping;
          }
        } catch (err) {
          mappings[subFormula.id] = {};
        }
      }
      setSubFormulaMappings(mappings);
    }
  }, [editFormula?.subFormulas]);

  // 计算逻辑
  const handleCalculate = useCallback(() => {
    if (!ast) return;
    try {
      // 1. 计算子公式结果
      const subFormulaResults: Record<string, number> = {};
      if (editFormula?.subFormulas) {
        for (const subFormula of editFormula.subFormulas) {
          try {
            const subAst = FormulaParser.parse(subFormula.englishFormula);
            const subValues = subFormulaVariableValues[subFormula.id] || {};
            const numericValues: Record<string, number> = {};
            for (const [key, val] of Object.entries(subValues)) {
              if (val !== '') numericValues[key] = parseFloat(val);
            }
            const result = FormulaCalculator.evaluate(subAst, numericValues);
            subFormulaResults[subFormula.name] = result.result;
          } catch (err) {}
        }
      }
      
      // 2. 收集主公式变量值
      const mainValues: Record<string, number> = {};
      for (const [key, val] of Object.entries(variableValues)) {
        if (val !== '') mainValues[key] = parseFloat(val);
      }
      
      // 3. 添加绑定公式的值
      for (const [variable, formulaValues] of Object.entries(boundFormulaValues)) {
        for (const [formulaId, val] of Object.entries(formulaValues)) {
          if (val !== '') {
            mainValues[variable] = parseFloat(val);
            break;
          }
        }
      }
      
      // 4. 合并子公式结果
      Object.assign(mainValues, subFormulaResults);
      
      // 5. 计算主公式
      const result = FormulaCalculator.evaluate(ast, mainValues);
      setCalculationResult(result);
      setCalculationError('');
    } catch (err) {
      setCalculationError(err instanceof Error ? err.message : '计算错误');
      setCalculationResult(null);
    }
  }, [ast, variableValues, boundFormulaValues, subFormulaVariableValues, editFormula?.subFormulas]);

  // 自动计算
  useEffect(() => {
    if (ast) {
      handleCalculate();
    }
  }, [ast, handleCalculate]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200" style={{ padding: '10px' }}>
      <div className="space-y-4">
        {/* 子公式变量输入 */}
        {editFormula.subFormulas && editFormula.subFormulas.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">子公式变量</label>
            <div className="space-y-3">
              {editFormula.subFormulas.map(subFormula => {
                const subMapping = subFormulaMappings[subFormula.id] || {};
                if (Object.keys(subMapping).length === 0) return null;
                return (
                  <div key={subFormula.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                    <div className="text-sm font-medium text-gray-800 mb-2">{subFormula.name}</div>
                    <div className="space-y-2">
                      {Object.entries(subMapping).map(([eng, chi]) => (
                        <div key={eng} className="flex items-center gap-3">
                          <span className="text-sm text-gray-700 w-24 text-right">{chi}</span>
                          <input
                            type="number"
                            step="any"
                            value={subFormulaVariableValues[subFormula.id]?.[eng] || ''}
                            onChange={(e) => setSubFormulaVariableValues({
                              ...subFormulaVariableValues,
                              [subFormula.id]: {
                                ...(subFormulaVariableValues[subFormula.id] || {}),
                                [eng]: e.target.value
                              }
                            })}
                            placeholder="输入数值"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-xs text-gray-400 font-mono w-20">{eng}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 主公式变量输入 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">主公式变量</label>
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            {Object.keys(mapping).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(mapping).map(([eng, chi]) => {
                  const isBound = editFormula.variableFormulaMapping?.[eng];
                  if (isBound) {
                    return (
                      <div key={eng} className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 w-24 text-right">{chi}</span>
                        <div className="flex-1 px-3 py-2 bg-gray-100 border border-gray-200 rounded text-sm text-gray-500">
                          已绑定公式，请在下方输入值
                        </div>
                        <span className="text-xs text-gray-400 font-mono w-20">{eng}</span>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">已绑定</span>
                      </div>
                    );
                  }
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

        {/* 绑定公式的值 */}
        {editFormula.variableFormulaMapping && Object.keys(editFormula.variableFormulaMapping).length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">绑定公式的值</label>
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="space-y-2">
                {Object.entries(editFormula.variableFormulaMapping).map(([variable, refFormulaId]) => {
                  let boundFormulaInfo = { name: variable, formula: refFormulaId };
                  
                  // 检查是否是子公式
                  if (refFormulaId.startsWith('sub_')) {
                    const subFormulaId = refFormulaId.substring(4);
                    const subFormula = editFormula.subFormulas?.find(sf => sf.id === subFormulaId);
                    if (subFormula) {
                      boundFormulaInfo = { name: subFormula.name, formula: subFormula.englishFormula };
                    }
                  } else {
                    // 查找普通公式
                    for (const group of groups) {
                      const found = group.formulas.find(f => f.id === refFormulaId);
                      if (found) {
                        boundFormulaInfo = {
                          name: (found as any).level4Group || found.name || refFormulaId,
                          formula: found.englishFormula
                        };
                        break;
                      }
                    }
                  }
                  
                  const chiName = mapping[variable] || variable;
                  
                  return (
                    <div key={variable} className="flex items-center gap-3">
                      <span className="text-sm text-gray-700 w-24 text-right">{chiName}</span>
                      <input
                        type="number"
                        step="any"
                        value={boundFormulaValues[variable]?.[refFormulaId] || ''}
                        onChange={(e) => setBoundFormulaValues({
                          ...boundFormulaValues,
                          [variable]: {
                            ...(boundFormulaValues[variable] || {}),
                            [refFormulaId]: e.target.value
                          }
                        })}
                        placeholder={`输入 ${boundFormulaInfo.name} 的结果`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-400 font-mono w-20">{variable}</span>
                    </div>
                  );
                })}
              </div>
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
                  <div className="text-xs text-gray-500 mb-2">可执行代码 (可复制到浏览器控制台执行):</div>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all">
                    {calculationResult.steps[0]}
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
