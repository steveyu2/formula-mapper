'use client';

import { useEffect, useState } from 'react';
import { ASTNode } from '@/lib/types';

interface ASTTreeProps {
  ast: ASTNode;
  mapping: Record<string, string>;
}

export function ASTTree({ ast, mapping }: ASTTreeProps) {
  const [katexLoaded, setKatexLoaded] = useState(false);
  const [showChinese, setShowChinese] = useState(false);

  useEffect(() => {
    // 动态加载 KaTeX CSS
    if (typeof window !== 'undefined' && !katexLoaded) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
      document.head.appendChild(link);
      setKatexLoaded(true);
    }
  }, [katexLoaded]);

  // 将 AST 转换为 LaTeX 表达式
  const astToLatex = (node: ASTNode): string => {
    if (!node) {
      return '';
    }
    if (node.type === 'variable') {
      // 在 LaTeX 中，下划线需要转义为 \_
      const escapedName = node.name?.replace(/_/g, '\\_') || '';
      return `\\text{${escapedName}}`;
    }
    if (node.type === 'number') {
      return String(node.value);
    }
    if (node.type === 'function') {
      if (!node.argument) {
        return '';
      }
      const arg = astToLatex(node.argument);
      // LaTeX 函数渲染
      return `\\${node.name}\{${arg}\}`;
    }
    if (node.type === 'operator') {
      if (!node.left || !node.right) {
        return '';
      }
      const left = astToLatex(node.left);
      const right = astToLatex(node.right);

      switch (node.operator) {
        case '+':
          return `${left} + ${right}`;
        case '-':
          return `${left} - ${right}`;
        case '*':
          // 判断是否需要括号
          const leftNeedsParens = node.left!.type === 'operator' && (node.left!.operator === '+' || node.left!.operator === '-');
          const rightNeedsParens = node.right!.type === 'operator';
          const leftStr = leftNeedsParens ? `(${left})` : left;
          const rightStr = rightNeedsParens ? `(${right})` : right;
          return `${leftStr} \\cdot ${rightStr}`;
        case '/':
          return `\\frac{${left}}{${right}}`;
        case '^':
          const baseNeedsParens = node.left!.type === 'operator';
          const baseStr = baseNeedsParens ? `(${left})` : left;
          return `${baseStr}^{${right}}`;
        default:
          return `${left} ${node.operator} ${right}`;
      }
    }
    return '';
  };

  const englishLatex = astToLatex(ast);

  // 生成中文公式LaTeX：将英文变量替换为中文
  let chineseLatex = englishLatex;
  for (const [englishVar, chineseVar] of Object.entries(mapping)) {
    // 英文变量名中的下划线已经被转义为 \_
    const escapedEnglishVar = englishVar.replace(/_/g, '\\_');
    // 中文变量名中的下划线也需要转义
    const escapedChineseVar = chineseVar.replace(/_/g, '\\_');
    // 替换 \text{englishVar} 为 \text{chineseVar}
    chineseLatex = chineseLatex.replace(
      new RegExp(`\\\\text\\{${escapedEnglishVar.replace(/[.*+?^${}()|[\]]/g, '\\$&')}\\}`, 'g'),
      `\\text{${escapedChineseVar}}`
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      <div className="bg-white rounded-lg p-6 shadow-sm w-full">
        {/* 切换按钮 */}
        <div className="flex items-center justify-center mb-4">
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setShowChinese(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                !showChinese
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              英文公式
            </button>
            <button
              onClick={() => setShowChinese(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                showChinese
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              中文公式
            </button>
          </div>
        </div>

        <LatexRenderer
          latex={showChinese ? chineseLatex : englishLatex}
          mapping={mapping}
          showChinese={showChinese}
        />
      </div>
    </div>
  );
}

interface LatexRendererProps {
  latex: string;
  mapping: Record<string, string>;
  showChinese: boolean;
}

function LatexRenderer({ latex, mapping, showChinese }: LatexRendererProps) {
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const renderLatex = async () => {
      try {
        const katex = (await import('katex')).default;
        const renderedHtml = katex.renderToString(latex, {
          throwOnError: false,
          displayMode: true,
        });
        setHtml(renderedHtml);
        setError('');
      } catch (err) {
        console.error('KaTeX render error:', err);
        setError('渲染失败');
        setHtml(latex);
      }
    };

    renderLatex();
  }, [latex]);

  return (
    <div className="space-y-4">
      {/* LaTeX 公式 */}
      {error ? (
        <div className="text-red-600">渲染失败</div>
      ) : html ? (
        <div
          className="text-2xl overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div className="text-gray-400">正在渲染...</div>
      )}

      {/* 变量映射说明 */}
      {!showChinese && Object.keys(mapping).length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-600 mb-3">变量说明</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(mapping).map(([english, chinese]) => (
              <div
                key={english}
                className="px-3 py-1.5 bg-blue-50 text-gray-700 rounded-md text-sm"
              >
                <span className="font-mono font-medium">{english}</span>
                <span className="mx-1.5 text-gray-400">→</span>
                <span>{chinese}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
