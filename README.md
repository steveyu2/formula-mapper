# Formula Mapper

Formula Mapper is a powerful and intuitive formula management tool featuring an Excel-like spreadsheet interface, hierarchical grouping, bilingual variable mapping, and cloud synchronization. It's ideal for financial modeling, technical documentation, and business rule management.

### Try the [DEMO](https://formula-mapper.netlify.app/)

![Formula Mapper Screenshot](./public/demo-image.png)  

## ✨ Key Features

### 📊 Spreadsheet View
- **Excel-like Interface**: Familiar spreadsheet layout reduces learning curve
- **Sheet Tabs**: Switch between groups via top sheet tabs with drag-and-drop reordering
- **Cell Merging**: Cells with identical group values automatically merge vertically
- **Resizable Columns**: Drag to adjust column widths with fixed operation column
- **Trackpad Zoom**: Two-finger gesture zoom support for different screens
- **Fixed Headers**: Headers remain visible while scrolling

### 🗂️ Multi-level Group Management
- **7-Level Grouping**: Supports up to 7 group levels (Module, Code, Full Name, Name, Condition, Calculator, etc.)
- **Custom Headers**: Customizable names for each group column
- **Tree Sorting**: Drag-and-drop tree nodes to sort multi-level groups
- **Autocomplete**: Smart suggestions and autocomplete for group fields when adding formulas

### 🌐 Bilingual Formulas
- **Chinese-English Mapping**: Synchronized display and editing of English and Chinese formulas
- **Formula Visualization**: Automatic formula parsing and rendering for better readability
- **AST Tree Display**: Tree structure visualization in edit modal

### ☁️ Cloud Synchronization
- **Cloudflare KV Integration**: Optional cloud data sync functionality
- **Version History**: Maintains historical versions with rollback support
- **Write Protection**: Optional write password for data security
- **One-Click Load**: Auto-selects first sheet after loading from cloud

### 🔧 Data Management
- **File Import/Export**: JSON format data import and export
- **URL Import**: Direct data import from URLs
- **Delete Confirmation**: Two-step confirmation for formula deletion
- **Auto-Save**: All operations automatically saved to LocalStorage

### 🎨 User Experience
- **Responsive Design**: Adapts to different screen sizes
- **Keyboard Shortcuts**: ESC to close modals, Enter to confirm
- **Real-time Search**: Quick search across all formulas
- **Empty State Guidance**: Clear empty state prompts and action guides

## 🛠️ Tech Stack

- **Framework**: Next.js 16.2.1 (App Router)
- **Frontend**: React 19, TypeScript
- **Table**: TanStack Table v8
- **Styling**: Tailwind CSS, shadcn/ui
- **Math Rendering**: KaTeX
- **Drag & Drop**: @dnd-kit
- **Icons**: Lucide React
- **Parser**: Custom recursive descent parser
- **Local Storage**: LocalStorage
- **Cloud**: Cloudflare Workers + KV

## 🚀 Quick Start

Follow these steps to run the project locally:

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/formula-mapper.git
   cd formula-mapper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000` in your browser to view the application

## 📖 Usage Guide

### Creating and Managing Sheets
1. Click the **+** button above to create a new sheet (group)
2. Click sheet tabs to switch between groups
3. Drag sheet tabs to reorder
4. Double-click sheet tab to rename

### Adding Formulas
1. Select the sheet where you want to add a formula
2. Click the **+ Add Formula** button above the table
3. Fill in the modal:
   - Group fields (with autocomplete support)
   - English formula
   - Chinese formula
   - Description (optional)
4. Click Save

### Editing Formulas
1. Click the **Edit** button in the operations column
2. Modify formula content in the **Edit** tab
3. Switch to **Preview** tab to see formula rendering
4. Click Save

### Sorting Groups
1. Click the **Sort** button to open the sorting modal
2. Drag tree nodes to adjust group order
3. Click arrows before nodes to expand/collapse children
4. Click Save to apply sorting

### Cloud Synchronization
1. Click **Cloud Sync** button in the sidebar
2. Enter Cloudflare Workers URL
3. Click **Save Config**
4. Use **Save to Cloud** or **Load from Cloud** to sync

Detailed configuration guide: [Cloud Sync Configuration](./docs/CLOUD_SYNC.md)

## 📁 Project Structure

```
formula-mapper/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Main page with core state and logic
│   │   ├── layout.tsx                  # Root layout
│   │   └── globals.css                 # Global styles
│   ├── components/
│   │   ├── FormulaSpreadsheet.tsx      # Main spreadsheet component
│   │   ├── SheetTabs.tsx               # Sheet tabs component
│   │   ├── FormulaDetailModal.tsx      # Formula detail/edit modal
│   │   ├── SortModal.tsx               # Group sorting modal
│   │   ├── CloudSyncModal.tsx          # Cloud sync modal
│   │   ├── AutocompleteInput.tsx       # Autocomplete input
│   │   ├── ASTTree.tsx                 # AST tree visualization
│   │   ├── SubFormulaManager.tsx       # Sub-formula management
│   │   ├── ConfirmDialog.tsx           # Confirmation dialog
│   │   └── ui/                         # shadcn/ui base components
│   └── lib/
│       ├── types.ts                    # TypeScript type definitions
│       ├── parser.ts                   # Formula parser
│       ├── mapper.ts                   # Variable mapper
│       ├── storage.ts                  # LocalStorage wrapper
│       ├── importExport.ts            # Import/export functionality
│       └── cloud/                      # Cloud sync related
├── cloud/
│   └── cloudflare-workers/             # Cloudflare Workers deployment code
├── docs/
│   ├── CLOUD_SYNC.md                   # Cloud sync English docs
│   └── CLOUD_SYNC_zh.md               # Cloud sync Chinese docs
└── demo-data/                          # Demo data
```

## 🔑 Core Features Details

### Formula Data Structure
```typescript
interface Formula {
  id: string;
  name: string;
  englishFormula: string;
  chineseFormula: string;
  description?: string;
  variableFormulaMapping: Record<string, string>;
  subFormulas: SubFormula[];
  createdAt: number;
  // 7 group fields
  level1Group?: string;  // Module
  level2Group?: string;  // Code
  level3Group?: string;  // Full Name
  level4Group?: string;  // Name
  level5Group?: string;  // Condition
  level6Group?: string;  // Calculator
  level7Group?: string;  // Extended
}
```

### Table Merging Logic
- First 6 group columns (L1-L6) support cell merging
- Consecutive cells with identical values are automatically merged
- Merged cells support double-click editing
- L1, L2 use darker background (sky-100)
- L3, L4 use lighter background (sky-50)

### Autocomplete Mechanism
- Group fields display autocomplete when adding/editing formulas
- Shows all available options immediately on focus
- Real-time filtering as you type
- Options extracted from existing formula group fields

## 🤝 Contributing

Contributions are welcome in all forms!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Write all new code in TypeScript
- Follow existing code style and patterns
- Add comments for complex logic
- Ensure features work across different screen sizes

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [TanStack Table](https://tanstack.com/table) - Headless UI for building powerful tables
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework
- [KaTeX](https://katex.org/) - Fast math typesetting for the web
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Lucide](https://lucide.dev/) - Beautiful & consistent icon toolkit
