/**
 * 渲染器
 * 负责将公式和AST渲染为DOM元素
 */

class FormulaRenderer {
    /**
     * 渲染公式展示区
     * @param {string} formula - 英文公式
     * @param {Object} mapping - 变量映射对象
     * @returns {HTMLElement} 渲染后的DOM元素
     */
    static renderFormula(formula, mapping) {
        const container = document.createElement('div');

        if (!formula || formula.trim() === '') {
            container.innerHTML = '<div class="empty-message">请输入公式</div>';
            return container;
        }

        // 词法分析：拆分token
        const tokens = this.tokenizeFormula(formula);

        // 渲染每个token
        tokens.forEach(token => {
            if (token.type === 'variable') {
                const span = document.createElement('span');
                span.className = 'formula-var';
                span.textContent = token.value;
                span.dataset.tooltip = mapping[token.value] || '（未定义）';
                this.attachTooltip(span);
                container.appendChild(span);
            } else if (token.type === 'operator') {
                const span = document.createElement('span');
                span.className = 'formula-operator';
                span.textContent = token.value;
                container.appendChild(span);
            } else if (token.type === 'paren') {
                const span = document.createElement('span');
                span.className = 'formula-paren';
                span.textContent = token.value;
                container.appendChild(span);
            } else if (token.type === 'whitespace') {
                // 保留空格
                const span = document.createElement('span');
                span.textContent = ' ';
                container.appendChild(span);
            }
        });

        return container;
    }

    /**
     * 为元素添加自定义tooltip
     * @param {HTMLElement} element - 目标元素
     */
    static attachTooltip(element) {
        element.addEventListener('mouseenter', (e) => {
            const text = e.target.dataset.tooltip;
            if (!text) return;

            // 移除旧的tooltip
            const oldTooltip = document.getElementById('custom-tooltip');
            if (oldTooltip) {
                oldTooltip.remove();
            }

            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = text;
            tooltip.id = 'custom-tooltip';
            document.body.appendChild(tooltip);

            const rect = e.target.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();

            // 居中显示在元素上方
            tooltip.style.left = (rect.left + rect.width / 2 - tooltipRect.width / 2) + 'px';
            tooltip.style.top = (rect.top - tooltipRect.height - 8) + 'px';

            requestAnimationFrame(() => {
                tooltip.classList.add('show');
            });
        });

        element.addEventListener('mouseleave', () => {
            const tooltip = document.getElementById('custom-tooltip');
            if (tooltip) {
                tooltip.classList.remove('show');
                setTimeout(() => tooltip.remove(), 150);
            }
        });
    }

    /**
     * 词法分析：拆分公式为token
     * @param {string} formula - 公式字符串
     * @returns {Array} token数组
     */
    static tokenizeFormula(formula) {
        const tokens = [];
        let i = 0;

        while (i < formula.length) {
            const char = formula[i];

            // 空白字符
            if (/\s/.test(char)) {
                tokens.push({ type: 'whitespace', value: char });
                i++;
                continue;
            }

            // 运算符
            if (['+', '-', '*', '/', '(', ')', '[', ']', '{', '}'].includes(char)) {
                const type = ['(', ')', '[', ']', '{', '}'].includes(char) ? 'paren' : 'operator';
                tokens.push({ type: type, value: char });
                i++;
                continue;
            }

            // 变量
            if (/[A-Za-z]/.test(char)) {
                let varName = char;
                i++;
                while (i < formula.length && /[A-Za-z0-9]/.test(formula[i])) {
                    varName += formula[i];
                    i++;
                }
                tokens.push({ type: 'variable', value: varName });
                continue;
            }

            // 跳过其他字符（如数字）
            i++;
        }

        return tokens;
    }

    /**
     * 渲染AST树
     * @param {Object} ast - AST根节点
     * @param {Object} mapping - 变量映射对象
     * @returns {HTMLElement} 渲染后的DOM元素
     */
    static renderAST(ast, mapping) {
        const container = document.createElement('div');
        container.className = 'ast-tree-container';

        if (!ast) {
            container.innerHTML = '<div class="empty-message">请输入有效的公式</div>';
            return container;
        }

        const treeElement = this.renderASTNode(ast, mapping);
        container.appendChild(treeElement);

        return container;
    }

    /**
     * 递归渲染AST节点
     * @param {Object} node - AST节点
     * @param {Object} mapping - 变量映射对象
     * @returns {HTMLElement} 节点DOM元素
     */
    static renderASTNode(node, mapping) {
        const nodeContainer = document.createElement('div');
        nodeContainer.className = 'ast-node';

        // 节点内容
        const content = document.createElement('div');
        content.className = 'ast-node-content';

        if (node.type === 'variable') {
            nodeContainer.classList.add('ast-node-variable');
            content.textContent = node.name;
            content.dataset.tooltip = mapping[node.name] || '（未定义）';
            this.attachTooltip(content);
        } else if (node.type === 'number') {
            nodeContainer.classList.add('ast-node-variable');
            content.textContent = node.value;
        } else if (node.type === 'operator') {
            nodeContainer.classList.add('ast-node-operator');
            content.textContent = node.operator;
        }

        nodeContainer.appendChild(content);

        // 渲染子节点
        if (node.type === 'operator') {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'ast-children';

            const leftChild = this.renderASTNode(node.left, mapping);
            const rightChild = this.renderASTNode(node.right, mapping);

            childrenContainer.appendChild(leftChild);
            childrenContainer.appendChild(rightChild);

            nodeContainer.appendChild(childrenContainer);
        }

        return nodeContainer;
    }
}

// 导出到全局
window.FormulaRenderer = FormulaRenderer;
