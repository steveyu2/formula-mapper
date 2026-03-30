/**
 * 主入口
 * 负责初始化和事件监听
 */

class FormulaApp {
    constructor() {
        // 获取DOM元素
        this.englishInput = document.getElementById('english-formula');
        this.chineseInput = document.getElementById('chinese-formula');
        this.mappingTable = document.getElementById('mapping-table');
        this.formulaDisplay = document.getElementById('formula-display');
        this.astTree = document.getElementById('ast-tree');

        // 初始化
        this.init();
    }

    /**
     * 初始化应用
     */
    init() {
        // 从localStorage恢复上次输入的值
        this.loadFromStorage();

        // 绑定事件监听
        this.englishInput.addEventListener('input', () => {
            this.saveToStorage();
            this.handleInput();
        });
        this.chineseInput.addEventListener('input', () => {
            this.saveToStorage();
            this.handleInput();
        });

        // 首次渲染
        this.handleInput();
    }

    /**
     * 保存输入到localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem('englishFormula', this.englishInput.value);
            localStorage.setItem('chineseFormula', this.chineseInput.value);
        } catch (e) {
            console.warn('无法保存到localStorage:', e);
        }
    }

    /**
     * 从localStorage恢复输入
     */
    loadFromStorage() {
        try {
            const savedEnglish = localStorage.getItem('englishFormula');
            const savedChinese = localStorage.getItem('chineseFormula');

            if (savedEnglish !== null) {
                this.englishInput.value = savedEnglish;
            }
            if (savedChinese !== null) {
                this.chineseInput.value = savedChinese;
            }
        } catch (e) {
            console.warn('无法从localStorage读取:', e);
        }
    }

    /**
     * 处理输入事件
     */
    handleInput() {
        const englishFormula = this.englishInput.value.trim();
        const chineseFormula = this.chineseInput.value.trim();

        // 清空所有显示区域
        this.clearAllDisplays();

        // 检查空输入
        if (!englishFormula || !chineseFormula) {
            this.showEmptyState();
            return;
        }

        // 创建变量映射
        const mappingResult = VariableMapper.createMapping(
            englishFormula,
            chineseFormula
        );

        // 渲染映射表
        this.renderMappingTable(mappingResult);

        // 渲染公式展示
        this.renderFormulaDisplay(englishFormula, mappingResult.mapping);

        // 解析并渲染AST
        this.renderAST(englishFormula, mappingResult.mapping);
    }

    /**
     * 清空所有显示区域
     */
    clearAllDisplays() {
        this.mappingTable.innerHTML = '';
        this.formulaDisplay.innerHTML = '';
        this.astTree.innerHTML = '';
    }

    /**
     * 显示空状态
     */
    showEmptyState() {
        this.mappingTable.innerHTML = '<div class="empty-message">请输入英文公式和中文公式</div>';
        this.formulaDisplay.innerHTML = '<div class="empty-message">等待输入...</div>';
        this.astTree.innerHTML = '<div class="empty-message">等待输入...</div>';
    }

    /**
     * 渲染映射表
     * @param {Object} mappingResult - 变量映射结果
     */
    renderMappingTable(mappingResult) {
        const formatted = VariableMapper.formatMapping(mappingResult);

        if (formatted.items.length === 0) {
            this.mappingTable.innerHTML = '<div class="empty-message">未提取到变量</div>';
            return;
        }

        // 渲染映射项
        formatted.items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'mapping-item';
            itemDiv.innerHTML = `
                <span class="english-var">${this.escapeHtml(item.english)}</span>
                <span class="arrow">→</span>
                <span class="chinese-var">${this.escapeHtml(item.chinese)}</span>
            `;
            this.mappingTable.appendChild(itemDiv);
        });

        // 显示中文变量过多的提示
        if (formatted.hasMoreChinese) {
            const hintDiv = document.createElement('div');
            hintDiv.className = 'mapping-item';
            hintDiv.style.background = '#ffc107';
            hintDiv.textContent = '⚠️ 中文变量数量多于英文变量，多余的已被忽略';
            this.mappingTable.appendChild(hintDiv);
        }
    }

    /**
     * 渲染公式展示区
     * @param {string} formula - 英文公式
     * @param {Object} mapping - 变量映射
     */
    renderFormulaDisplay(formula, mapping) {
        const rendered = FormulaRenderer.renderFormula(formula, mapping);
        this.formulaDisplay.appendChild(rendered);
    }

    /**
     * 解析并渲染AST
     * @param {string} formula - 英文公式
     * @param {Object} mapping - 变量映射
     */
    renderAST(formula, mapping) {
        try {
            // 解析公式
            const ast = FormulaParser.parse(formula);

            // 渲染AST
            const rendered = FormulaRenderer.renderAST(ast, mapping);
            this.astTree.appendChild(rendered);

        } catch (error) {
            // 显示错误信息
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.innerHTML = `
                <strong>解析错误：</strong>${this.escapeHtml(error.message)}
            `;
            this.astTree.appendChild(errorDiv);
        }
    }

    /**
     * 转义HTML特殊字符
     * @param {string} text - 原始文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new FormulaApp();
});
