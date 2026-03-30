'use client';

import { Tooltip } from './Tooltip';
import { Formula, SubFormula } from '@/lib/types';

interface FormulaRendererProps {
  formula: string;
  mapping: Record<string, string>;
  formulaReferences?: Record<string, { name: string; englishFormula: string; chineseFormula: string; id?: string; isSubFormula?: boolean }>;
  onFormulaReferenceClick?: (_formula: Formula | SubFormula) => void;
}

// 为每个变量分配不同的颜色（蓝色色调）
const VARIABLE_COLORS = [
  { bg: 'bg-blue-50', text: 'text-blue-600', hover: 'hover:bg-blue-100' },
  { bg: 'bg-sky-50', text: 'text-sky-600', hover: 'hover:bg-sky-100' },
  { bg: 'bg-cyan-50', text: 'text-cyan-600', hover: 'hover:bg-cyan-100' },
  { bg: 'bg-teal-50', text: 'text-teal-600', hover: 'hover:bg-teal-100' },
  { bg: 'bg-indigo-50', text: 'text-indigo-600', hover: 'hover:bg-indigo-100' },
  { bg: 'bg-blue-100', text: 'text-blue-700', hover: 'hover:bg-blue-200' },
  { bg: 'bg-sky-100', text: 'text-sky-700', hover: 'hover:bg-sky-200' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', hover: 'hover:bg-cyan-200' },
  { bg: 'bg-teal-100', text: 'text-teal-700', hover: 'hover:bg-teal-200' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', hover: 'hover:bg-indigo-200' },
];

export function FormulaRenderer({
  formula,
  mapping,
  formulaReferences = {},
  onFormulaReferenceClick
}: FormulaRendererProps) {
  const tokens = tokenizeFormula(formula);

  // 提取所有唯一的变量并按出现顺序排序
  const variableOrder = tokens
    .filter(token => token.type === 'variable')
    .map(token => token.value);
  const uniqueVariables = Array.from(new Set(variableOrder));

  // 为每个变量分配颜色索引
  const variableColorIndex: Record<string, number> = {};
  uniqueVariables.forEach((variable, index) => {
    variableColorIndex[variable] = index % VARIABLE_COLORS.length;
  });

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      {tokens.map((token, index) => {
        if (token.type === 'variable') {
          const colorIndex = variableColorIndex[token.value];
          const colors = VARIABLE_COLORS[colorIndex];
          const isReference = formulaReferences[token.value];
          const tooltipContent = isReference
            ? `引用公式: ${isReference.name}\n${mapping[token.value] || '（未定义）'}`
            : (mapping[token.value] || '（未定义）');

          return (
            <Tooltip key={index} content={tooltipContent}>
              <span
                className={`px-2.5 py-1 text-base font-semibold ${colors.text} ${colors.bg} rounded-lg cursor-help ${colors.hover} transition-colors ${isReference ? 'ring-2 ring-blue-400 cursor-pointer' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isReference && onFormulaReferenceClick) {
                    if (isReference.isSubFormula) {
                      // 子公式引用
                      const subFormula: SubFormula = {
                        id: isReference.id || '',
                        name: isReference.name,
                        englishFormula: isReference.englishFormula,
                        chineseFormula: isReference.chineseFormula,
                      };
                      onFormulaReferenceClick(subFormula);
                    } else {
                      // 外部公式引用
                      const formulaWithId: Formula = {
                        id: isReference.id || '',
                        name: isReference.name,
                        englishFormula: isReference.englishFormula,
                        chineseFormula: isReference.chineseFormula,
                        createdAt: Date.now(),
                      };
                      onFormulaReferenceClick(formulaWithId);
                    }
                  }
                }}
              >
                {token.value}
                {isReference && <span className="ml-1 text-xs">🔗</span>}
              </span>
            </Tooltip>
          );
        } else if (token.type === 'operator') {
          return (
            <span key={index} className="text-gray-400">
              {token.value}
            </span>
          );
        } else if (token.type === 'paren') {
          return (
            <span key={index} className="text-gray-700 font-medium">
              {token.value}
            </span>
          );
        } else if (token.type === 'number') {
          return (
            <span key={index} className="px-2.5 py-1 text-base font-semibold text-gray-700 bg-gray-50 rounded-lg">
              {token.value}
            </span>
          );
        }
        return null;
      })}
    </div>
  );
}

interface Token {
  type: 'variable' | 'operator' | 'paren' | 'number' | 'whitespace';
  value: string;
}

function tokenizeFormula(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < formula.length) {
    const char = formula[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (['+', '-', '*', '/', '^', '(', ')', '[', ']', '{', '}', '（', '）'].includes(char)) {
      const type = ['(', ')', '[', ']', '{', '}', '（', '）'].includes(char) ? 'paren' : 'operator';
      tokens.push({ type, value: char });
      i++;
      continue;
    }

    if (/[A-Za-z]/.test(char)) {
      let varName = char;
      i++;
      while (i < formula.length && /[A-Za-z0-9_]/.test(formula[i])) {
        varName += formula[i];
        i++;
      }
      tokens.push({ type: 'variable', value: varName });
      continue;
    }

    if (/\d/.test(char)) {
      let num = char;
      i++;
      while (i < formula.length && /\d/.test(formula[i])) {
        num += formula[i];
        i++;
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }

    i++;
  }

  return tokens;
}
