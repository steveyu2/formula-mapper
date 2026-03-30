# Formula Mapper

Formula Mapper is a powerful and intuitive tool designed to help users map, visualize, and manage complex mathematical and business formulas. It supports bilingual variable mapping (English/Chinese), hierarchical grouping, nested sub-formulas, and AST (Abstract Syntax Tree) visualization, making it an ideal choice for technical documentation, financial modeling, and academic research.

### Try the [DEMO](https://formula-mapper.netlify.app/)

![Formula Mapper Screenshot](./public/demo-image.png)

## ✨ Core Features

- **🌐 Bilingual Variable Mapping**: Easily switch between English and Chinese variables to enhance formula readability.
- **🌳 AST Visualization**: Automatically parse formulas into abstract syntax trees and render them beautifully with KaTeX, helping to understand complex structures.
- **🗂️ Hierarchical Grouping**: Organize formulas through main groups and secondary sub-groups to maintain logical clarity.
- **🔗 Sub-formulas & References**: Support nesting and referencing other formulas within a formula, enabling modularity and reuse.
- **🚀 URL Sharing**: Share and locate specific formulas with a simple URL (`?formula=...`).
- **💾 Local Persistence**: Automatically save sidebar state and user selections using LocalStorage for an enhanced experience.
- **🔍 Quick Search**: Real-time search across all formulas to quickly find what you need.
- **🧭 Cascading Selector**: Provides a cascading group selector for easy navigation between different groups.

## 🛠️ Tech Stack

- **Framework**: Next.js 16.2.1 (App Router)
- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **Math Rendering**: KaTeX
- **Parser**: Custom recursive descent parser
- **Local Storage**: LocalStorage

## 🚀 Getting Started

Follow these steps to run the project locally:

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/formula-mapper.git
    cd formula-mapper
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or yarn install / pnpm install
    ```

3.  **Run the development server**
    ```bash
    npm run dev
    # or yarn dev / pnpm dev
    ```

4.  Open `http://localhost:3000` in your browser.

## 📖 Usage

- **Create Groups**: Create main groups and sub-groups in the left sidebar to organize your formulas.
- **Add Formulas**: Add new formulas in the selected group, providing both English and Chinese versions.
- **Map Variables**: Within a formula, you can map a variable to another existing formula to create references.
- **View AST**: Click on any formula, and the right side will display its rendered effect and interactive AST tree.
- **Share Formulas**: When you select a formula, the URL in the browser address bar will automatically update. Copy this URL to share directly with others.

## 📁 Project Structure

```
src/
├── app/
│   └── page.tsx                    # Main page with all core state and logic
├── components/
│   ├── FormulaList.tsx             # Formula list (with search, grouping)
│   ├── GroupList.tsx               # Left sidebar group tree
│   ├── GroupSelector.tsx           # Cascading group selector
│   ├── FormulaRenderer.tsx         # Formula renderer (supports reference clicks)
│   ├── ASTTree.tsx                 # AST tree visualization component
│   ├── FormulaReferenceModal.tsx   # Reference formula modal
│   ├── SubFormulaManager.tsx       # Sub-formula management
│   └── FormulaReferenceSelector.tsx # Variable reference mapping
└── lib/
    ├── types.ts                    # Global type definitions
    ├── parser.ts                   # Formula parser
    ├── mapper.ts                   # Variable mapper
    └── storage.ts                  # LocalStorage wrapper
```

## 🤝 Contributing

Contributions of all kinds are welcome! If you have any ideas, suggestions, or find bugs, please feel free to submit Issues or Pull Requests.

1.  Fork this project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Submit a Pull Request

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.

---

[中文文档](./README_zh.md)
