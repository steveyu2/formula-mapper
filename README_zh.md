# Formula Mapper - 公式映射器

Formula Mapper 是一个强大而直观的工具，旨在帮助用户映射、可视化和管理复杂的数学及业务公式。它支持中英文变量映射、层级分组、子公式嵌套和 AST (抽象语法树) 可视化，是技术文档、金融建模和学术研究的理想选择。

### 试试 [DEMO](https://formula-mapper.netlify.app/)

![Formula Mapper Screenshot](./public/demo-image.png)  

## ✨ 核心功能

- **🌐 双语变量映射**: 在英文和中文变量之间轻松切换，增强公式的可读性。
- **🌳 AST 可视化**: 自动将公式解析为抽象语法树，并使用 KaTeX 进行精美渲染，帮助理解复杂结构。
- **🗂️ 分层分组管理**: 通过主分组和二级子分组来组织公式，保持逻辑清晰。
- **🔗 子公式与引用**: 支持在公式中嵌套和引用其他公式，实现模块化和复用。
- **🚀 URL 分享**: 通过一个简单的 URL (`?formula=...`) 即可分享和定位到特定的公式。
- **💾 本地持久化**: 自动使用 LocalStorage 保存侧边栏状态和用户选择，提升体验。
- **🔍 快速搜索**: 在所有公式中进行实时搜索，快速找到所需内容。
- **🧭 级联选择器**: 提供级联分组选择器，方便在不同分组之间导航。

## 🛠️ 技术栈

- **框架**: Next.js 16.2.1 (App Router)
- **前端**: React 19, TypeScript
- **样式**: Tailwind CSS
- **数学渲染**: KaTeX
- **解析器**: 自定义递归下降解析器
- **本地存储**: LocalStorage

## 🚀 如何开始

按照以下步骤在本地运行此项目：

1.  **克隆仓库**
    ```bash
    git clone https://github.com/your-username/formula-mapper.git
    cd formula-mapper
    ```

2.  **安装依赖**
    ```bash
    npm install
    # 或者 yarn install / pnpm install
    ```

3.  **运行开发服务器**
    ```bash
    npm run dev
    # 或者 yarn dev / pnpm dev
    ```

4.  在浏览器中打开 `http://localhost:3000` 查看。

## 📖 使用方法

- **创建分组**: 在左侧侧边栏创建主分组和子分组来组织你的公式。
- **添加公式**: 在选定的分组中添加新公式，并提供其中英文版本。
- **映射变量**: 在公式中，你可以将一个变量映射到另一个已存在的公式，实现引用。
- **查看 AST**: 点击任意公式，右侧将展示其渲染后的效果和可交互的 AST 树。
- **分享公式**: 当你选中一个公式时，浏览器地址栏的 URL 会自动更新。复制此 URL 即可直接分享给他人。

## 📁 项目结构

```
src/
├── app/
│   └── page.tsx                    # 主页面，包含所有核心状态和逻辑
├── components/
│   ├── FormulaList.tsx             # 公式列表（含搜索、分组）
│   ├── GroupList.tsx               # 左侧分组树
│   ├── GroupSelector.tsx           # 级联分组选择器
│   ├── FormulaRenderer.tsx         # 公式渲染器（支持引用点击）
│   ├── ASTTree.tsx                 # AST 树可视化组件
│   ├── FormulaReferenceModal.tsx   # 引用公式弹窗
│   ├── SubFormulaManager.tsx       # 子公式管理
│   └── FormulaReferenceSelector.tsx # 变量引用映射
└── lib/
    ├── types.ts                    # 全局类型定义
    ├── parser.ts                   # 公式解析器
    ├── mapper.ts                   # 变量映射器
    └── storage.ts                  # LocalStorage 封装
```

## 🤝 贡献

欢迎各种形式的贡献！如果你有任何想法、建议或发现了 Bug，请随时提交 Issues 或 Pull Requests。

1.  Fork 本项目
2.  创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3.  提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4.  推送到分支 (`git push origin feature/AmazingFeature`)
5.  提交一个 Pull Request

## 📄 许可证

该项目采用 MIT 许可证。详情请见 `LICENSE` 文件。
