# Formula Mapper v2.0 - Univer 重构计划书

## 📋 项目概述

将 Formula Mapper 从 TanStack Table 迁移到 Univer，实现完整的类 Excel 体验，同时保留并优化原有的公式可视化和云同步功能。

**核心变化**：
- 表格引擎：TanStack Table → Univer
- 公式列：复合数据结构（英文公式 + 中文公式 + 变量绑定 + 子公式）
- 交互优化：点击操作列查看按钮 → 弹出公式可视化 UI

---

## 🎯 重构目标

### 核心需求（来自 new-version.md）

1. ✅ **使用 Univer 重构表格**
   - 完整的 Excel 体验
   - 多选、复制粘贴、合并单元格
   - 撤销/重做
   - 右键菜单

2. ✅ **支持 Excel 的导入和导出**
   - 导入 .xlsx 文件
   - 导出为 .xlsx 文件
   - 保留公式数据（JSON 序列化）

3. ✅ **支持 JSON 的导入和导出**
   - 导入 .json 文件（完整保留复合数据结构）
   - 导出为 .json 文件（备份/迁移）
   - 版本管理（exportData.version）
   - 支持旧版本数据迁移

4. ✅ **支持云端保存**
   - Cloudflare D1 (SQL 数据库)
   - 版本历史（最多 100 个版本）
   - 冲突解决
   - API Key 认证 + 写入密码保护

5. ✅ **保留公式可视化逻辑**

5. ✅ **保留公式可视化逻辑**
   - **针对某一行的数据进行处理**
   - **两列公式列**：
     - 一列指定为**英文公式**
     - 一列指定为**中文公式**
   - **复合数据结构**：
     - 编辑时弹出弹窗
     - 内部可编写中文公式和英文公式
     - 支持绑定其他公式
     - 支持内部创建子公式

6. ✅ **表头固定**
   - 滚动时表头始终可见

7. ✅ **右侧新增操作列，固定右侧**
   - 操作列固定在右侧
   - 滚动时操作列始终可见

8. ✅ **操作列查看按钮**
   - 点击查看按钮
   - 弹出公式可视化 UI
   - 显示英文公式和中文公式
   - 保留原项目的可视化逻辑（AST 树、变量映射等）
   - **复用现有组件**：
     - `FormulaRenderer` - KaTeX 公式渲染
     - `ASTTree` - AST 树可视化
     - `SubFormulaManager` - 子公式管理
     - `VariableMapping` - 变量映射展示

---

## 🔄 原有组件复用策略

根据 new-version.md 第 7 点要求："具体可视化ui参考原项目的逻辑"

### 需要复用的组件

| 原组件 | 路径 | 用途 | 复用方式 |
|--------|------|------|----------|
| FormulaRenderer | `src/components/FormulaRenderer.tsx` | KaTeX 公式渲染 | ✅ 直接复用 |
| ASTTree | `src/components/ASTTree.tsx` | AST 树展示 | ✅ 直接复用 |
| SubFormulaManager | `src/components/SubFormulaManager.tsx` | 子公式管理 | ✅ 直接复用 |
| parser.ts | `src/lib/parser.ts` | 公式解析为 AST | ✅ 直接复用 |
| mapper.ts | `src/lib/mapper.ts` | 变量映射逻辑 | ✅ 直接复用 |

### 复用示例

```typescript
// src/components/formula/FormulaViewer.tsx
import { FormulaRenderer } from '@/components/FormulaRenderer';
import { ASTTree } from '@/components/ASTTree';
import { SubFormulaManager } from '@/components/SubFormulaManager';
import { parseToAST } from '@/lib/parser';

export function FormulaViewer({ isOpen, onClose, formulaData }: FormulaViewerProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <div className="space-y-6">
          {/* 1. 英文公式 - 使用原 FormulaRenderer */}
          <div>
            <h3 className="text-lg font-semibold mb-2">英文公式</h3>
            <FormulaRenderer 
              formula={formulaData.englishFormula}
              mapping={formulaData.variableMapping}
            />
          </div>
          
          {/* 2. 中文公式 - 使用原 FormulaRenderer */}
          <div>
            <h3 className="text-lg font-semibold mb-2">中文公式</h3>
            <FormulaRenderer 
              formula={formulaData.chineseFormula}
              mapping={formulaData.variableMapping}
            />
          </div>
          
          {/* 3. AST 树 - 使用原 ASTTree */}
          <div>
            <h3 className="text-lg font-semibold mb-2">AST 树</h3>
            <ASTTree ast={parseToAST(formulaData.englishFormula)} />
          </div>
          
          {/* 4. 子公式 - 使用原子公式管理组件 */}
          {formulaData.subFormulas.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">子公式</h3>
              <SubFormulaManager 
                subFormulas={formulaData.subFormulas}
                readOnly={true}  // 查看模式
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 需要改造的组件

| 组件 | 改造内容 | 原因 |
|------|----------|------|
| FormulaList | → UniverSheet | 表格引擎从 TanStack 换为 Univer |
| GroupList | → 集成到 Univer | 分组逻辑改为 Univer 的 Sheet/行分组 |
| Modal | → Dialog | 统一使用 shadcn/ui 的 Dialog |
| FormulaReferenceSelector | 适配新数据结构 | 数据结构从扁平改为复合 |

### 数据流向对比

**旧版数据流**：
```
FormulaList (TanStack Table)
  ↓ 点击行
FormulaRenderer (KaTeX)
  ↓ 显示
ASTTree (AST 可视化)
```

**新版数据流**：
```
UniverSheet (Univer 表格)
  ↓ 点击操作列"查看"按钮
FormulaViewer (弹窗)
  ├→ FormulaRenderer (英文公式)
  ├→ FormulaRenderer (中文公式)
  ├→ ASTTree (AST 可视化)
  └→ SubFormulaManager (子公式)
```

---

## 🏣️ 架构设计

### 核心设计理念

**公式列复合数据结构**：
```
Univer 单元格 → 存储 JSON 字符串 → 解析为 FormulaCell 对象
                                    ↓
                          {
                            englishFormula: "A + B * C",
                            chineseFormula: "甲 + 乙 × 丙",
                            variableMapping: {
                              "A": "甲",
                              "B": "乙",
                              "C": "丙"
                            },
                            subFormulas: [...],
                            description: "计算公式"
                          }
```

### 数据流向

```
用户操作
  ↓
1. 点击操作列“查看”按钮
  ↓
2. 弹出 FormulaViewer 弹窗
  ↓
3. 读取当前行的公式列数据
  ↓
4. 解析 JSON 字符串为 FormulaCell 对象
  ↓
5. 显示公式可视化 UI（AST 树、变量映射等）
  ↓
6. 用户编辑 → 保存 → 更新单元格数据
```

### 表格布局

```
┌─────────────────────────────────────────────────────────────┐
│                        表头（固定）                           │
├──────────┬──────────┬──────────┬──────────┬─────────┬────────┤
│  分组1   │  分组2   │  分组3   │ 英文公式 │ 中文公式│ 操作   │
│ (L1)     │ (L2)     │ (L3)     │  (列D)   │  (列E)  │(固定)  │
├──────────┼──────────┼──────────┼──────────┼─────────┼────────┤
│          │          │          │ 公式单元格│ 公式单元格│ 查看   │
│  合并    │  合并    │  合并    │ (复合数据)│ (复合数据)│ 编辑   │
│  单元格  │  单元格  │  单元格  │          │         │ 删除   │
│          │          │          │          │         │        │
└──────────┴──────────┴──────────┴──────────┴─────────┴────────┘
         ↑ 可滚动区域                  ↑ 固定右侧
```

### 技术栈

```typescript
{
  // 核心框架
  "next": "16.2.1",
  "react": "19",
  "typescript": "5.x",
  
  // 表格引擎
  "@univerjs/presets": "latest",  // Univer 预设包
  "@univerjs/core": "latest",     // Univer 核心
  "@univerjs/react": "latest",    // React 集成
  
  // UI 组件
  "tailwindcss": "3.x",
  "@radix-ui/react-*": "latest",
  "lucide-react": "latest",
  
  // 公式渲染
  "katex": "latest",
  
  // 状态管理
  "zustand": "latest",  // 轻量级状态管理
  
  // 工具库
  "date-fns": "latest",
  "sonner": "latest"    // Toast 通知
}
```

---

## 📁 项目结构

```
formula-mapper/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # 主页面（入口）
│   │   ├── layout.tsx                  # 根布局
│   │   └── globals.css                 # 全局样式
│   │
│   ├── components/
│   │   ├── spreadsheet/
│   │   │   ├── UniverSheet.tsx         # Univer 表格组件（主表格）
│   │   │   ├── SheetTabs.tsx           # Sheet 标签页
│   │   │   ├── Toolbar.tsx             # 工具栏（可选）
│   │   │   └── FixedColumns.tsx        # 固定列配置
│   │   │
│   │   ├── formula/
│   │   │   ├── FormulaViewer.tsx       # 公式查看弹窗（操作列点击查看）
│   │   │   ├── FormulaEditor.tsx       # 公式编辑弹窗（双击单元格）
│   │   │   ├── FormulaRenderer.tsx     # 公式渲染器（KaTeX）
│   │   │   ├── ASTTree.tsx             # AST 树可视化
│   │   │   ├── VariableMapping.tsx     # 变量映射组件
│   │   │   └── SubFormulaManager.tsx   # 子公式管理
│   │   │
│   │   ├── cloud/
│   │   │   ├── CloudSyncModal.tsx      # 云同步弹窗
│   │   │   └── CloudConfig.tsx         # 云配置
│   │   │
│   │   └── ui/                         # shadcn/ui 基础组件
│   │       ├── button.tsx
│   │       ├── dialog.tsx
│   │       └── ...
│   │
│   ├── lib/
│   │   ├── univer/
│   │   │   ├── config.ts               # Univer 基础配置
│   │   │   ├── plugins.ts              # Univer 插件注册
│   │   │   ├── custom-render.ts        # 自定义单元格渲染
│   │   │   └── utils.ts                # Univer 工具函数
│   │   │
│   │   ├── formula/
│   │   │   ├── parser.ts               # 公式解析器（AST）
│   │   │   ├── mapper.ts               # 变量映射器
│   │   │   ├── validator.ts            # 公式验证器
│   │   │   └── serializer.ts           # 公式序列化/反序列化
│   │   │
│   │   ├── storage/
│   │   │   ├── local.ts                # LocalStorage 封装
│   │   │   ├── cloud.ts                # 云端存储（Cloudflare D1 SQL）
│   │   │   └── migrate.ts              # 数据迁移脚本
│   │   │
│   │   ├── excel/
│   │   │   ├── import.ts               # Excel 导入（.xlsx）
│   │   │   └── export.ts               # Excel 导出（.xlsx）
│   │   │
│   │   ├── store/                      # Zustand 状态管理
│   │   │   ├── sheetStore.ts           # 表格状态（选中的 Sheet）
│   │   │   ├── formulaStore.ts         # 公式状态（当前编辑的公式）
│   │   │   └── cloudStore.ts           # 云端状态（同步状态）
│   │   │
│   │   └── types.ts                    # TypeScript 类型定义
│   │
│   └── hooks/
│       ├── useUniver.ts                # Univer 实例管理
│       ├── useCellData.ts              # 单元格数据读写
│       └── useKeyboard.ts              # 键盘快捷键
│
├── public/
│   └── demo-data.xlsx                  # 示例 Excel 文件
│
└── docs/
    ├── new-version.md                  # 需求文档
    └── REFACTORING_PLAN.md             # 重构计划书（本文档）
```

---

## 📅 实施计划

### 第一阶段：基础架构

#### 第 1 步：项目初始化和 Univer 集成
- [ ] 创建新项目结构
- [ ] 安装 Univer 依赖
- [ ] 配置 Univer 基础环境
- [ ] 创建 UniverSheet 组件
- [ ] 实现基础表格渲染

**交付物**: 
- ✅ 可运行的 Univer 表格
- ✅ 基础数据展示

#### 第 2 步：数据结构迁移
- [ ] 设计新的数据类型
- [ ] 迁移现有数据格式
- [ ] 实现数据适配层
- [ ] 测试数据加载

**交付物**:
- ✅ 数据兼容层
- ✅ 现有数据可正常显示

#### 第 3 步：核心功能实现
- [ ] 表头固定
- [ ] 右侧操作列固定
- [ ] Sheet 标签页
- [ ] 基础交互

**交付物**:
- ✅ 完整的表格 UI
- ✅ 固定表头和列

---

### 第二阶段：Excel 功能

#### 第 4 步：Excel 导入导出
- [ ] 集成 ExcelJS 或 SheetJS
- [ ] 实现 Excel 导入
- [ ] 实现 Excel 导出
- [ ] 处理公式数据映射

**交付物**:
- ✅ Excel 文件导入
- ✅ Excel 文件导出

#### 第 5 步：复制粘贴和多选
- [ ] 实现单元格多选
- [ ] 实现复制粘贴
- [ ] 支持从 Excel 粘贴
- [ ] 支持粘贴到 Excel

**交付物**:
- ✅ 完整的复制粘贴功能
- ✅ 多选功能

#### 第 6 步：合并单元格和样式
- [ ] 实现合并单元格
- [ ] 实现单元格样式
- [ ] 居中对齐
- [ ] 背景色、边框

**交付物**:
- ✅ 合并/取消合并
- ✅ 单元格样式

---

### 第三阶段：公式功能

#### 第 7 步：公式编辑器
- [ ] 创建 FormulaEditor 组件
- [ ] 实现双 Tab（英文/中文）
- [ ] 变量绑定
- [ ] 子公式管理
- [ ] AST 树预览

**交付物**:
- ✅ 完整的公式编辑器
- ✅ 变量映射
- ✅ 子公式支持

#### 第 8 步：公式查看器
- [ ] 创建 FormulaViewer 组件
- [ ] 公式渲染
- [ ] AST 树展示
- [ ] 点击操作列查看

**交付物**:
- ✅ 公式可视化
- ✅ AST 树

#### 第 9 步：公式列配置
- [ ] 指定英文公式列
- [ ] 指定中文公式列
- [ ] 复合数据处理
- [ ] 双击编辑

**交付物**:
- ✅ 公式列配置
- ✅ 双击编辑公式

---

### 第四阶段：云同步

#### 第 10 步：云端保存（Cloudflare D1 SQL）
- [ ] 迁移 Cloudflare D1 集成（已有后端）
- [ ] 实现云端保存（POST /save）
- [ ] 实现云端加载（GET /load）
- [ ] 版本历史管理（GET /versions, GET /load-version）
- [ ] 冲突解决（基于 saved_at 时间戳）
- [ ] API Key 认证 + 写入密码

**交付物**:
- ✅ 云端同步（D1 SQL）
- ✅ 版本管理（最多 100 个版本）
- ✅ 数据删除功能

---

### 第五阶段：优化和测试

#### 第 11 步：性能优化
- [ ] Univer 渲染优化（虚拟滚动、按需渲染）
- [ ] 公式数据缓存（解析结果缓存）
- [ ] JSON 序列化优化（避免重复解析）
- [ ] 内存优化（及时释放大对象）
- [ ] 懒加载（公式查看器/编辑器按需加载）
- [ ] Web Worker（复杂公式计算）
- [ ] 防抖/节流（输入、滚动事件）

**交付物**:
- ✅ 性能优化完成
- ✅ 性能监控报告

#### 第 12 步：测试和修复
- [ ] 功能测试
- [ ] 兼容性测试
- [ ] 性能测试（1000+ 行数据）
- [ ] Bug 修复
- [ ] 文档更新

**交付物**:
- ✅ 测试通过
- ✅ 文档完善

---

## 🔑 核心实现细节

### 1. 公式列复合数据结构

**核心设计**：每个公式单元格存储为 JSON 字符串

```typescript
// src/lib/types.ts

// 公式单元格数据结构
export interface FormulaCellData {
  id: string;                      // 公式 ID
  englishFormula: string;          // 英文公式："A + B * C"
  chineseFormula: string;          // 中文公式："甲 + 乙 × 丙"
  description?: string;            // 公式说明
  variableMapping: Record<string, string>;  // 变量映射：{ "A": "甲" }
  subFormulas: SubFormula[];       // 子公式列表
  createdAt: number;               // 创建时间
  updatedAt: number;               // 更新时间
}

// 子公式
export interface SubFormula {
  id: string;
  name: string;
  englishFormula: string;
  chineseFormula: string;
}

// Univer 单元格值（存储为 JSON 字符串）
export type UniverCellValue = string;  // JSON.stringify(FormulaCellData)
```

### 2. Univer 表格配置

```typescript
// src/lib/univer/config.ts
import { Univer } from '@univerjs/core';
import { defaultTheme } from '@univerjs/design';
import { LocaleType } from '@univerjs/core';

export function createUniverInstance(container: string) {
  const univer = new Univer({
    theme: defaultTheme,
    locale: LocaleType.ZH_CN,  // 中文界面
  });
  
  // 创建 Workbook
  const workbook = univer.createUnit(UniverInstanceType.UNIVER_SHEET, {
    id: 'formula-mapper',
    name: 'Formula Mapper',
    sheetOrder: [],
    styles: {},
    sheets: {},
  });
  
  return { univer, workbook };
}
```

### 3. 公式列渲染器（关键）

```typescript
// src/lib/univer/custom-render.ts
import { IRenderModule } from '@univerjs/engine-render';

// 自定义单元格渲染器 - 显示公式预览
export const FormulaCellRender: IRenderModule = {
  type: 'formula-cell',
  
  // 渲染函数
  render: (ctx, cell) => {
    const formulaData = parseFormulaCell(cell.value);
    
    // 显示英文公式（或中文公式）
    const displayText = formulaData?.englishFormula || '';
    
    // 使用 KaTeX 渲染公式
    return {
      text: displayText,
      color: '#2563eb',  // 蓝色
      fontSize: 14,
      textAlign: 'center',
      verticalAlign: 'middle',
    };
  },
  
  // 双击事件 → 打开编辑器
  onDoubleClick: (ctx, cell) => {
    const formulaData = parseFormulaCell(cell.value);
    openFormulaEditor(formulaData, cell.position);
  },
};

// 解析公式单元格数据
function parseFormulaCell(value: string): FormulaCellData | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
```

### 4. 操作列实现（固定右侧）

```typescript
// src/components/spreadsheet/FixedColumns.tsx
import { UniverSheet } from './UniverSheet';

export function setupFixedColumns(workbook: any) {
  // 设置列
  const columns = [
    { id: 'level1Group', title: '分组1', width: 120, frozen: false },
    { id: 'level2Group', title: '分组2', width: 120, frozen: false },
    { id: 'level3Group', title: '分组3', width: 120, frozen: false },
    { id: 'englishFormula', title: '英文公式', width: 300, frozen: false, type: 'formula' },
    { id: 'chineseFormula', title: '中文公式', width: 300, frozen: false, type: 'formula' },
    { id: 'actions', title: '操作', width: 120, frozen: true, position: 'right' },  // 固定右侧
  ];
  
  // 配置固定列
  workbook.getActiveSheet().setFreeze(columns.length - 1, 0);  // 冻结最后一列
  
  return columns;
}

// 操作列渲染
function renderActionsCell(row: any) {
  return (
    <div className="flex gap-2">
      <button 
        onClick={() => openFormulaViewer(row)}
        className="text-blue-600 hover:text-blue-800"
      >
        查看
      </button>
      <button 
        onClick={() => openFormulaEditor(row)}
        className="text-green-600 hover:text-green-800"
      >
        编辑
      </button>
      <button 
        onClick={() => deleteRow(row)}
        className="text-red-600 hover:text-red-800"
      >
        删除
      </button>
    </div>
  );
}
```

### 5. 公式查看器（操作列点击查看）

```typescript
// src/components/formula/FormulaViewer.tsx
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormulaRenderer } from './FormulaRenderer';
import { ASTTree } from './ASTTree';

interface FormulaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  formulaData: FormulaCellData;
}

export function FormulaViewer({ isOpen, onClose, formulaData }: FormulaViewerProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <div className="space-y-6">
          {/* 标题 */}
          <h2 className="text-2xl font-bold">公式详情</h2>
          
          {/* 公式说明 */}
          {formulaData.description && (
            <div className="text-gray-600">{formulaData.description}</div>
          )}
          
          {/* 英文公式 */}
          <div>
            <h3 className="text-lg font-semibold mb-2">英文公式</h3>
            <FormulaRenderer 
              formula={formulaData.englishFormula}
              mapping={formulaData.variableMapping}
              mode="english"
            />
          </div>
          
          {/* 中文公式 */}
          <div>
            <h3 className="text-lg font-semibold mb-2">中文公式</h3>
            <FormulaRenderer 
              formula={formulaData.chineseFormula}
              mapping={formulaData.variableMapping}
              mode="chinese"
            />
          </div>
          
          {/* AST 树 */}
          <div>
            <h3 className="text-lg font-semibold mb-2">AST 树</h3>
            <ASTTree ast={parseToAST(formulaData.englishFormula)} />
          </div>
          
          {/* 变量映射 */}
          <div>
            <h3 className="text-lg font-semibold mb-2">变量映射</h3>
            <VariableMappingTable mapping={formulaData.variableMapping} />
          </div>
          
          {/* 子公式 */}
          {formulaData.subFormulas.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">子公式</h3>
              <SubFormulaList subFormulas={formulaData.subFormulas} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 6. 公式编辑器（双击单元格）

```typescript
// src/components/formula/FormulaEditor.tsx
interface FormulaEditorProps {
  isOpen: boolean;
  onClose: () => void;
  formulaData: FormulaCellData;
  onSave: (data: FormulaCellData) => void;
}

export function FormulaEditor({ isOpen, onClose, formulaData, onSave }: FormulaEditorProps) {
  const [activeTab, setActiveTab] = useState<'en' | 'cn' | 'preview'>('en');
  const [editingData, setEditingData] = useState(formulaData);
  
  const handleSave = () => {
    // 保存为 JSON 字符串
    const cellValue = JSON.stringify({
      ...editingData,
      updatedAt: Date.now()
    });
    
    // 更新 Univer 单元格
    updateUniverCell(cellValue);
    onSave(editingData);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="en">英文公式</TabsTrigger>
            <TabsTrigger value="cn">中文公式</TabsTrigger>
            <TabsTrigger value="preview">预览</TabsTrigger>
          </TabsList>
          
          {/* 英文公式编辑 */}
          <TabsContent value="en">
            <FormulaInput
              value={editingData.englishFormula}
              onChange={(v) => setEditingData({ ...editingData, englishFormula: v })}
              variables={availableVariables}
            />
            <VariableMapping
              mapping={editingData.variableMapping}
              onChange={(m) => setEditingData({ ...editingData, variableMapping: m })}
            />
          </TabsContent>
          
          {/* 中文公式编辑 */}
          <TabsContent value="cn">
            <FormulaInput
              value={editingData.chineseFormula}
              onChange={(v) => setEditingData({ ...editingData, chineseFormula: v })}
              variables={availableVariables}
            />
          </TabsContent>
          
          {/* 预览 */}
          <TabsContent value="preview">
            <FormulaRenderer formula={editingData.englishFormula} />
            <ASTTree ast={parseToAST(editingData.englishFormula)} />
            <SubFormulaManager
              subFormulas={editingData.subFormulas}
              onChange={(sf) => setEditingData({ ...editingData, subFormulas: sf })}
            />
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button onClick={onCancel}>取消</Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 7. Excel 导入导出

```typescript
// src/lib/excel/import.ts
import * as ExcelJS from 'exceljs';

export async function importFromExcel(file: File) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file);
  
  const sheets: SheetData[] = [];
  
  workbook.eachSheet((worksheet, sheetId) => {
    const sheet: SheetData = {
      name: worksheet.name,
      rows: [],
    };
    
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // 跳过表头
      
      const rowData: any = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // 识别公式列（JSON 字符串）
        if (typeof cell.value === 'string' && cell.value.startsWith('{')) {
          try {
            rowData[`col_${colNumber}`] = JSON.parse(cell.value);
          } catch {
            rowData[`col_${colNumber}`] = cell.value;
          }
        } else {
          rowData[`col_${colNumber}`] = cell.value;
        }
      });
      
      sheet.rows.push(rowData);
    });
    
    sheets.push(sheet);
  });
  
  return sheets;
}

// src/lib/excel/export.ts
export async function exportToExcel(data: SheetData[]) {
  const workbook = new ExcelJS.Workbook();
  
  data.forEach(sheet => {
    const worksheet = workbook.addWorksheet(sheet.name);
    
    // 添加表头
    worksheet.addRow(['分组1', '分组2', '分组3', '英文公式', '中文公式', '操作']);
    
    // 添加数据
    sheet.rows.forEach(row => {
      const excelRow = worksheet.addRow([
        row.level1Group,
        row.level2Group,
        row.level3Group,
        JSON.stringify(row.englishFormula),  // 公式列存储为 JSON
        JSON.stringify(row.chineseFormula),  // 公式列存储为 JSON
        '',  // 操作列留空
      ]);
      
      // 设置样式
      excelRow.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
    });
  });
  
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}
```

### 8. 数据迁移（旧格式 → 新格式）

```typescript
// src/lib/storage/migrate.ts

// 旧格式
interface OldFormula {
  id: string;
  name: string;
  englishFormula: string;
  chineseFormula: string;
  variableFormulaMapping?: Record<string, string>;
  subFormulas?: SubFormula[];
  level1Group?: string;
  level2Group?: string;
  // ...
}

// 新格式
interface NewSheetRow {
  level1Group: string;
  level2Group: string;
  level3Group: string;
  englishFormula: FormulaCellData;  // 复合数据
  chineseFormula: FormulaCellData;  // 复合数据
}

// 迁移函数
export function migrateOldData(oldFormulas: OldFormula[]): NewSheetRow[] {
  return oldFormulas.map(formula => {
    // 创建公式单元格数据
    const formulaCell: FormulaCellData = {
      id: formula.id,
      englishFormula: formula.englishFormula,
      chineseFormula: formula.chineseFormula,
      variableMapping: formula.variableFormulaMapping || {},
      subFormulas: formula.subFormulas || [],
      createdAt: formula.createdAt,
      updatedAt: Date.now()
    };
    
    return {
      level1Group: formula.level1Group || '',
      level2Group: formula.level2Group || '',
      level3Group: formula.level3Group || '',
      englishFormula: formulaCell,  // 复用同一份数据
      chineseFormula: formulaCell,  // 实际存储时只存一次
    };
  });
}
```

---

### 9. Excel 导入导出复合数据处理（关键）

**问题**：Excel 单元格只能存储字符串/数字/布尔值，不能直接存储对象。

**解决方案**：将 `FormulaCellData` 序列化为 JSON 字符串存储。

#### Excel 导出流程

```typescript
// src/lib/excel/export.ts
export async function exportToExcel(data: SheetData[]) {
  const workbook = new ExcelJS.Workbook();
  
  data.forEach(sheet => {
    const worksheet = workbook.addWorksheet(sheet.name);
    
    // 添加表头
    worksheet.addRow([
      '分组1', 
      '分组2', 
      '分组3', 
      '英文公式',      // 存储 JSON 字符串
      '中文公式',      // 存储 JSON 字符串
      '操作'           // 留空
    ]);
    
    // 添加数据行
    sheet.rows.forEach(row => {
      const excelRow = worksheet.addRow([
        row.level1Group,
        row.level2Group,
        row.level3Group,
        // 关键：将复合数据序列化为 JSON 字符串
        JSON.stringify(row.englishFormula),
        JSON.stringify(row.chineseFormula),
        ''  // 操作列留空
      ]);
      
      // 设置样式
      excelRow.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
    });
  });
  
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}
```

#### Excel 导入流程

```typescript
// src/lib/excel/import.ts
export async function importFromExcel(file: File): Promise<SheetData[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file);
  
  const sheets: SheetData[] = [];
  
  workbook.eachSheet((worksheet, sheetId) => {
    const sheet: SheetData = {
      name: worksheet.name,
      rows: [],
    };
    
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // 跳过表头
      
      const rowData: any = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // 第 4、5 列是公式列（英文、中文）
        if (colNumber === 4 || colNumber === 5) {
          if (typeof cell.value === 'string') {
            try {
              // 尝试解析 JSON 字符串
              rowData[`col_${colNumber}`] = JSON.parse(cell.value);
            } catch {
              // 如果不是 JSON，当作普通字符串
              rowData[`col_${colNumber}`] = {
                id: generateId(),
                englishFormula: cell.value,
                chineseFormula: cell.value,
                variableMapping: {},
                subFormulas: [],
                createdAt: Date.now(),
                updatedAt: Date.now()
              };
            }
          }
        } else {
          // 普通列
          rowData[`col_${colNumber}`] = cell.value;
        }
      });
      
      sheet.rows.push(rowData);
    });
    
    sheets.push(sheet);
  });
  
  return sheets;
}
```

#### 数据示例

**Excel 中的存储形式**：

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| 分组1 | 分组2 | 分组3 | 英文公式 | 中文公式 | 操作 |
| 导数 | 合约 | 期货 | `{"id":"f1","englishFormula":"A + B","chineseFormula":"甲 + 乙",...}` | `{"id":"f1","englishFormula":"A + B","chineseFormula":"甲 + 乙",...}` |  |

**导入到 Univer 后的数据结构**：

```typescript
{
  level1Group: "导数",
  level2Group: "合约",
  level3Group: "期货",
  englishFormula: {
    id: "f1",
    englishFormula: "A + B",
    chineseFormula: "甲 + 乙",
    variableMapping: { "A": "甲", "B": "乙" },
    subFormulas: [],
    createdAt: 1712236800000,
    updatedAt: 1712236800000
  },
  chineseFormula: { /* 同上 */ }
}
```

---

### 10. JSON 导入导出（完整保留复合数据）

**为什么需要 JSON 导入导出？**

虽然 Excel 导入导出可以通过 JSON 字符串存储公式数据，但：
- Excel 中的 JSON 字符串不易阅读和编辑
- JSON 格式可以完整保留所有元数据（createdAt、updatedAt、id 等）
- JSON 格式更适合备份、迁移和版本控制
- JSON 格式可以直接用于调试和数据分析

#### JSON 数据结构定义

```typescript
// src/lib/types.ts

// 新版本导出数据格式
export interface ExportDataV2 {
  version: '2.0';                    // 版本号
  exportDate: string;                // 导出时间
  columnHeaders?: {                  // 自定义表头
    level1?: string;
    level2?: string;
    level3?: string;
    level4?: string;
    level5?: string;
    level6?: string;
    englishFormula?: string;
    chineseFormula?: string;
  };
  sheets: SheetData[];               // 所有 Sheet 数据
}

// Sheet 数据
export interface SheetData {
  name: string;                      // Sheet 名称
  rows: SheetRow[];                  // 行数据
}

// 行数据
export interface SheetRow {
  level1Group: string;
  level2Group: string;
  level3Group: string;
  level4Group?: string;
  level5Group?: string;
  level6Group?: string;
  englishFormula: FormulaCellData;   // 复合数据
  chineseFormula: FormulaCellData;   // 复合数据
}
```

#### JSON 导出实现

```typescript
// src/lib/json/export.ts

export interface JsonExportOptions {
  pretty?: boolean;                  // 是否格式化（默认 true）
  includeMetadata?: boolean;         // 是否包含元数据（默认 true）
}

export function exportToJson(
  sheets: SheetData[], 
  options: JsonExportOptions = {}
): string {
  const { pretty = true, includeMetadata = true } = options;

  const exportData: ExportDataV2 = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    columnHeaders: {
      level1: '分组1',
      level2: '分组2',
      level3: '分组3',
      englishFormula: '英文公式',
      chineseFormula: '中文公式',
    },
    sheets: sheets.map(sheet => ({
      name: sheet.name,
      rows: sheet.rows.map(row => {
        const rowData: any = {
          level1Group: row.level1Group,
          level2Group: row.level2Group,
          level3Group: row.level3Group,
        };

        // 可选字段
        if (row.level4Group) rowData.level4Group = row.level4Group;
        if (row.level5Group) rowData.level5Group = row.level5Group;
        if (row.level6Group) rowData.level6Group = row.level6Group;

        // 公式列（完整保留复合数据）
        if (includeMetadata) {
          rowData.englishFormula = row.englishFormula;
          rowData.chineseFormula = row.chineseFormula;
        } else {
          // 简化模式：只保留公式字符串
          rowData.englishFormula = row.englishFormula.englishFormula;
          rowData.chineseFormula = row.chineseFormula.chineseFormula;
        }

        return rowData;
      })
    }))
  };

  // 返回 JSON 字符串
  return pretty ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
}

// 导出并下载文件
export function downloadJsonExport(
  sheets: SheetData[], 
  filename?: string
): void {
  const json = exportToJson(sheets, { pretty: true });
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `formula-mapper-v2-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
```

#### JSON 导入实现

```typescript
// src/lib/json/import.ts

export interface JsonImportResult {
  sheets: SheetData[];
  version: string;
  exportDate: string;
  rowCount: number;
}

export async function importFromJson(file: File): Promise<JsonImportResult> {
  const text = await file.text();
  
  let rawData: any;
  try {
    rawData = JSON.parse(text);
  } catch {
    throw new Error('无效的 JSON 文件格式');
  }

  // 检测版本
  const version = rawData.version || '1.0';
  
  // 根据版本解析数据
  if (version === '1.0') {
    // 旧版本格式（FormulaGroup[]）
    return importFromV1(rawData);
  } else if (version === '2.0') {
    // 新版本格式（ExportDataV2）
    return importFromV2(rawData);
  } else {
    throw new Error(`不支持的版本：${version}`);
  }
}

// 导入 V2 格式
function importFromV2(data: ExportDataV2): JsonImportResult {
  const sheets: SheetData[] = data.sheets.map(sheet => ({
    name: sheet.name,
    rows: sheet.rows.map(row => {
      // 确保公式数据是完整的 FormulaCellData 对象
      const englishFormula = typeof row.englishFormula === 'string' 
        ? {
            id: generateId(),
            englishFormula: row.englishFormula,
            chineseFormula: row.chineseFormula || row.englishFormula,
            variableMapping: {},
            subFormulas: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        : row.englishFormula;

      const chineseFormula = typeof row.chineseFormula === 'string'
        ? {
            id: generateId(),
            englishFormula: row.englishFormula?.englishFormula || row.chineseFormula,
            chineseFormula: row.chineseFormula,
            variableMapping: {},
            subFormulas: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
          }
        : row.chineseFormula;

      return {
        level1Group: row.level1Group || '',
        level2Group: row.level2Group || '',
        level3Group: row.level3Group || '',
        level4Group: row.level4Group,
        level5Group: row.level5Group,
        level6Group: row.level6Group,
        englishFormula,
        chineseFormula,
      };
    })
  }));

  return {
    sheets,
    version: data.version,
    exportDate: data.exportDate,
    rowCount: sheets.reduce((sum, s) => sum + s.rows.length, 0)
  };
}

// 导入 V1 格式（旧版本兼容）
function importFromV1(data: any): JsonImportResult {
  // 转换旧格式到新格式
  const oldGroups = data.groups;
  const rows: SheetRow[] = oldGroups.flatMap((group: any) => 
    group.formulas.map((formula: any) => ({
      level1Group: group.level1 || '',
      level2Group: group.level2 || '',
      level3Group: group.level3 || '',
      englishFormula: {
        id: formula.id || generateId(),
        englishFormula: formula.englishFormula || '',
        chineseFormula: formula.chineseFormula || '',
        variableMapping: formula.variableFormulaMapping || {},
        subFormulas: formula.subFormulas || [],
        createdAt: formula.createdAt || Date.now(),
        updatedAt: Date.now()
      },
      chineseFormula: { /* 同上 */ }
    }))
  );

  return {
    sheets: [{ name: 'Sheet1', rows }],
    version: '1.0',
    exportDate: data.exportDate,
    rowCount: rows.length
  };
}
```

#### JSON 导入导出 UI

```typescript
// src/components/ImportExport.tsx

export function ImportExportButtons() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportJson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await importFromJson(file);
      // 加载到 Univer
      loadToUniver(result.sheets);
      toast.success(`成功导入 ${result.rowCount} 行数据（版本 ${result.version}）`);
    } catch (error) {
      toast.error(`导入失败：${error.message}`);
    }
  };

  const handleExportJson = () => {
    const sheets = getSheetsFromUniver();
    downloadJsonExport(sheets);
    toast.success('导出成功');
  };

  return (
    <div className="flex gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportJson}
        className="hidden"
      />
      
      <Button onClick={() => fileInputRef.current?.click()}>
        <Upload className="w-4 h-4 mr-2" />
        导入 JSON
      </Button>
      
      <Button onClick={handleExportJson}>
        <Download className="w-4 h-4 mr-2" />
        导出 JSON
      </Button>
    </div>
  );
}
```

#### 数据格式对比

**Excel 格式**：
```csv
分组1,分组2,分组3,英文公式,中文公式
导数,合约,期货,"{""id"":""f1"",""englishFormula"":""A+B"",...}","{""id"":""f1"",""chineseFormula"":""甲+乙"",...}"
```

**JSON 格式**：
```json
{
  "version": "2.0",
  "exportDate": "2026-04-04T10:30:00.000Z",
  "sheets": [
    {
      "name": "Sheet1",
      "rows": [
        {
          "level1Group": "导数",
          "level2Group": "合约",
          "level3Group": "期货",
          "englishFormula": {
            "id": "f1",
            "englishFormula": "A + B",
            "chineseFormula": "甲 + 乙",
            "variableMapping": { "A": "甲", "B": "乙" },
            "subFormulas": [],
            "createdAt": 1712236800000,
            "updatedAt": 1712236800000
          },
          "chineseFormula": { /* 同上 */ }
        }
      ]
    }
  ]
}
```

#### 使用场景

| 场景 | 推荐格式 | 原因 |
|------|----------|------|
| 日常数据交换 | Excel | 用户友好，可编辑 |
| 完整备份 | JSON | 保留所有元数据 |
| 版本控制 | JSON | 易 diff，易合并 |
| 数据迁移 | JSON | 格式完整，无损失 |
| 调试分析 | JSON | 可读性强，易解析 |
| 用户分享 | Excel | 通用格式 |

---

## ☁️ 云端存储架构（Cloudflare D1 SQL）

### 数据库表结构

项目已配置 Cloudflare D1 SQL 数据库，包含两个表：

#### 1. formula_data 表（当前数据）

```sql
CREATE TABLE IF NOT EXISTS formula_data (
  id TEXT PRIMARY KEY DEFAULT 'formula-data',  -- 数据键
  data TEXT NOT NULL,                          -- JSON 数据
  saved_at TEXT NOT NULL DEFAULT (datetime('now')),  -- 保存时间
  version_id TEXT NOT NULL,                    -- 版本号
  comment TEXT DEFAULT ''                      -- 备注
);
```

#### 2. version_history 表（版本历史）

```sql
CREATE TABLE IF NOT EXISTS version_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data_key TEXT NOT NULL,                      -- 数据键
  version_id TEXT NOT NULL,                    -- 版本号
  data TEXT NOT NULL,                          -- JSON 数据
  saved_at TEXT NOT NULL DEFAULT (datetime('now')),  -- 保存时间
  comment TEXT DEFAULT '',                     -- 备注
  created_at TEXT NOT NULL DEFAULT (datetime('now'))  -- 创建时间
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_version_history_key ON version_history(data_key);
CREATE INDEX IF NOT EXISTS idx_version_history_version ON version_history(version_id);
CREATE INDEX IF NOT EXISTS idx_version_history_saved_at ON version_history(saved_at);
```

### API 端点

Cloudflare Worker 已实现以下 API：

| 端点 | 方法 | 功能 | 认证 |
|------|------|------|------|
| `/health` | GET | 健康检查 | 无 |
| `/need-password` | GET | 检查是否需要写入密码 | 无 |
| `/save` | POST | 保存数据 + 创建版本 | API Key + 写入密码 |
| `/load` | GET | 加载最新数据 | API Key |
| `/delete` | GET | 删除数据及所有版本 | API Key + 写入密码 |
| `/list` | GET | 列出所有数据键 | API Key |
| `/versions` | GET | 获取版本历史列表 | API Key |
| `/load-version` | GET | 加载指定版本 | API Key |

### 前端集成示例

```typescript
// src/lib/storage/cloud.ts

const WORKER_URL = 'https://formula-mapper-sync.your-account.workers.dev';

export interface CloudData {
  sheets: SheetData[];           // Univer 表格数据
  lastSavedAt: string;           // 最后保存时间
  versionId: string;             // 版本号
  comment?: string;              // 备注
}

export class CloudStorage {
  private apiKey: string;
  private writePassword?: string;

  constructor(apiKey: string, writePassword?: string) {
    this.apiKey = apiKey;
    this.writePassword = writePassword;
  }

  // 保存数据到云端
  async save(data: CloudData, comment?: string): Promise<void> {
    const response = await fetch(`${WORKER_URL}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Write-Password': this.writePassword || '',
      },
      body: JSON.stringify({
        key: 'formula-mapper-v2',  // 新版本使用不同的 key
        data,
        comment,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save data');
    }

    return await response.json();
  }

  // 从云端加载数据
  async load(): Promise<CloudData> {
    const response = await fetch(
      `${WORKER_URL}/load?key=formula-mapper-v2`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to load data');
    }

    const result = await response.json();
    return result.data;
  }

  // 获取版本历史
  async getVersions(): Promise<VersionInfo[]> {
    const response = await fetch(
      `${WORKER_URL}/versions?key=formula-mapper-v2`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get versions');
    }

    const result = await response.json();
    return result.versions;
  }

  // 加载指定版本
  async loadVersion(versionId: string): Promise<CloudData> {
    const response = await fetch(
      `${WORKER_URL}/load-version?key=formula-mapper-v2&versionId=${versionId}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to load version');
    }

    const result = await response.json();
    return result.data;
  }
}
```

### 版本历史管理

```typescript
// 版本历史 UI 组件
export function VersionHistoryModal({ isOpen, onClose }: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const cloudStorage = new CloudStorage(apiKey, writePassword);

  useEffect(() => {
    if (isOpen) {
      cloudStorage.getVersions().then(setVersions);
    }
  }, [isOpen]);

  const handleLoadVersion = async (versionId: string) => {
    const data = await cloudStorage.loadVersion(versionId);
    // 加载到 Univer
    loadToUniver(data.sheets);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <div className="space-y-4">
          <h2>版本历史</h2>
          <div className="space-y-2">
            {versions.map(version => (
              <div key={version.versionId} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <div className="font-medium">{formatDate(version.savedAt)}</div>
                  <div className="text-sm text-gray-500">{version.comment}</div>
                </div>
                <Button onClick={() => handleLoadVersion(version.versionId)}>
                  加载此版本
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 部署步骤

1. **安装 Wrangler**:
   ```bash
   npm install -g wrangler
   ```

2. **登录 Cloudflare**:
   ```bash
   wrangler login
   ```

3. **创建 D1 数据库**（如果还没有）:
   ```bash
   wrangler d1 create formula-mapper-db
   ```

4. **更新 wrangler.toml**:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "formula-mapper-db"
   database_id = "your-database-id"  # 替换为实际 ID
   ```

5. **执行数据库迁移**:
   ```bash
   wrangler d1 execute formula-mapper-db --file=schema.sql
   ```

6. **设置密钥**:
   ```bash
   wrangler secret put API_KEY
   wrangler secret put WRITE_PASSWORD
   ```

7. **部署 Worker**:
   ```bash
   wrangler deploy
   ```

### Cloudflare D1 免费额度

- **存储**: 5 GB/天
- **读取**: 100,000 次/天
- **写入**: 100,000 次/天
- **适合场景**: 个人项目、小型团队

---

## 📊 数据迁移方案

### 旧数据格式 → 新数据格式

```typescript
// 旧格式
interface OldFormula {
  id: string;
  name: string;
  englishFormula: string;
  chineseFormula: string;
  level1Group?: string;
  // ...
}

// 新格式
interface NewFormulaCell {
  id: string;
  englishFormula: string;
  chineseFormula: string;
  variableMapping: Record<string, string>;
  subFormulas: SubFormula[];
  // ...
}

// 迁移函数
function migrateData(oldData: OldFormula[]): SheetRow[] {
  return oldData.map(formula => ({
    formulaCell: {
      id: formula.id,
      englishFormula: formula.englishFormula,
      chineseFormula: formula.chineseFormula,
      variableMapping: formula.variableFormulaMapping || {},
      subFormulas: formula.subFormulas || [],
      createdAt: formula.createdAt,
      updatedAt: Date.now()
    },
    level1Group: formula.level1Group,
    level2Group: formula.level2Group,
    // ...
  }));
}
```

---

## ✅ 验收标准

### 功能验收
- [ ] Univer 表格正常渲染
- [ ] 表头固定
- [ ] 右侧操作列固定
- [ ] Excel 导入正常
- [ ] Excel 导出正常
- [ ] JSON 导入正常（V1 和 V2 格式）
- [ ] JSON 导出正常（完整保留复合数据）
- [ ] 复制粘贴功能正常
- [ ] 合并单元格功能正常
- [ ] 公式编辑器可用
- [ ] 公式可视化正常
- [ ] AST 树展示正常
- [ ] 云端保存正常（D1 SQL）
- [ ] 云端加载正常
- [ ] 版本历史正常（最多 100 个版本）
- [ ] 加载指定版本正常
- [ ] 删除数据正常
- [ ] API Key 认证正常
- [ ] 写入密码保护正常

### 性能验收
- [ ] 1000 行数据初始渲染 < 500ms
- [ ] 滚动帧率 ≥ 60 FPS（1000 行）
- [ ] 复制粘贴响应时间 < 100ms
- [ ] 公式编辑器打开时间 < 200ms
- [ ] JSON 导入性能 < 2s（10MB 文件）
- [ ] Excel 导入性能 < 3s（5MB 文件）
- [ ] 云端保存时间 < 1s（1000 行）
- [ ] 内存占用 < 200MB（1000 行）
- [ ] 虚拟滚动正常（无明显卡顿）
- [ ] 缓存命中率 > 80%（重复渲染）

### 兼容性验收
- [ ] Chrome 最新版
- [ ] Firefox 最新版
- [ ] Safari 最新版
- [ ] Edge 最新版

---

## ⚠️ 风险和应对

### 风险 1: Univer 文档不完善
**应对**: 
- 查看源码
- 参考示例项目
- 联系社区

### 风险 2: 数据迁移丢失
**应对**:
- 完整的备份
- 迁移脚本测试
- 数据验证

### 风险 3: 性能问题
**应对**:
- 虚拟滚动
- 懒加载
- 性能监控

### 风险 4: 样式冲突
**应对**:
- CSS 模块化
- Scoped 样式
- 样式隔离

---

## 📝 开发规范

### 代码规范
- 使用 TypeScript 严格模式
- ESLint + Prettier
- 组件使用函数式 + Hooks
- 状态使用 Zustand

### 命名规范
- 组件：PascalCase
- 文件：camelCase
- 常量：UPPER_SNAKE_CASE
- 类型：PascalCase

### Git 规范
- feat: 新功能
- fix: 修复
- refactor: 重构
- perf: 性能优化
- docs: 文档
- test: 测试

---

## ⚡ 性能优化指南

### 性能目标

| 指标 | 目标值 | 测试条件 |
|------|--------|----------|
| 初始渲染时间 | < 500ms | 1000 行数据 |
| 滚动帧率 | ≥ 60 FPS | 1000 行数据 |
| 公式编辑器打开 | < 200ms | 含复杂公式 |
| JSON 导入 | < 2s | 10MB 文件 |
| Excel 导入 | < 3s | 5MB 文件 |
| 云端保存 | < 1s | 1000 行数据 |
| 内存占用 | < 200MB | 1000 行数据 |

---

### 1. Univer 渲染优化

#### 1.1 虚拟滚动（Virtual Scrolling）

Univer 内置虚拟滚动，但需要正确配置：

```typescript
// src/lib/univer/config.ts
import { UniverInstanceType } from '@univerjs/core';

export function createUniverInstance(container: string) {
  const univer = new Univer({
    theme: defaultTheme,
    locale: LocaleType.ZH_CN,
  });

  const workbook = univer.createUnit(UniverInstanceType.UNIVER_SHEET, {
    id: 'formula-mapper',
    name: 'Formula Mapper',
    // 启用虚拟滚动
    config: {
      rendering: {
        enableVirtualScroll: true,      // 开启虚拟滚动
        bufferSize: 50,                 // 缓冲区大小（上下各 50 行）
        fps: 60,                        // 目标帧率
      }
    },
    sheetOrder: [],
    styles: {},
    sheets: {},
  });

  return { univer, workbook };
}
```

#### 1.2 按需渲染公式单元格

**问题**：每个公式单元格都需要解析 JSON + 渲染 KaTeX，非常耗性能。

**解决方案**：

```typescript
// src/lib/univer/custom-render.ts

// 公式解析缓存
const formulaCache = new Map<string, FormulaCellData>();

// 渲染缓存（避免重复渲染相同的公式）
const renderCache = new Map<string, string>();

export const FormulaCellRender: IRenderModule = {
  type: 'formula-cell',
  
  render: (ctx, cell) => {
    const cacheKey = cell.value;
    
    // 检查渲染缓存
    if (renderCache.has(cacheKey)) {
      return renderCache.get(cacheKey);
    }
    
    // 检查解析缓存
    let formulaData = formulaCache.get(cacheKey);
    if (!formulaData) {
      formulaData = parseFormulaCell(cell.value);
      if (formulaData) {
        formulaCache.set(cacheKey, formulaData);
      }
    }
    
    // 渲染公式
    const displayText = formulaData?.englishFormula || '';
    const rendered = {
      text: displayText,
      color: '#2563eb',
      fontSize: 14,
      textAlign: 'center',
      verticalAlign: 'middle',
    };
    
    // 缓存渲染结果
    renderCache.set(cacheKey, rendered);
    
    return rendered;
  },
};

// 清除缓存（当数据更新时）
export function clearFormulaCache() {
  formulaCache.clear();
  renderCache.clear();
}
```

#### 1.3 批量更新优化

**问题**：逐行更新会导致多次重渲染。

**解决方案**：使用批量更新

```typescript
// src/lib/univer/utils.ts

export function batchUpdateCells(
  workbook: any, 
  updates: Array<{row: number, col: number, value: any}>
) {
  // 暂停渲染
  workbook.suspendRedraw();
  
  try {
    // 批量更新
    updates.forEach(({ row, col, value }) => {
      workbook.getActiveSheet().getRange(row, col).setValue(value);
    });
  } finally {
    // 恢复渲染
    workbook.resumeRedraw();
  }
}
```

---

### 2. 公式数据缓存

#### 2.1 解析结果缓存

```typescript
// src/lib/formula/cache.ts

export class FormulaCache {
  // 解析缓存：JSON 字符串 → FormulaCellData
  private parseCache = new Map<string, FormulaCellData>();
  
  // AST 缓存：公式字符串 → AST
  private astCache = new Map<string, ASTNode>();
  
  // 渲染缓存：公式字符串 → KaTeX HTML
  private renderCache = new Map<string, string>();
  
  // 解析公式
  parseFormula(cellValue: string): FormulaCellData | null {
    if (this.parseCache.has(cellValue)) {
      return this.parseCache.get(cellValue)!;
    }
    
    const result = this.parseFormulaInternal(cellValue);
    if (result) {
      this.parseCache.set(cellValue, result);
    }
    
    return result;
  }
  
  // 解析 AST
  parseAST(formula: string): ASTNode {
    if (this.astCache.has(formula)) {
      return this.astCache.get(formula)!;
    }
    
    const ast = parseToAST(formula);
    this.astCache.set(formula, ast);
    
    return ast;
  }
  
  // 清除缓存
  clear() {
    this.parseCache.clear();
    this.astCache.clear();
    this.renderCache.clear();
  }
  
  // 获取缓存统计
  getStats() {
    return {
      parseCache: this.parseCache.size,
      astCache: this.astCache.size,
      renderCache: this.renderCache.size,
    };
  }
}

// 全局单例
export const formulaCache = new FormulaCache();
```

#### 2.2 缓存失效策略

```typescript
// 数据更新时清除缓存
export function onCellUpdate(row: number, col: number, value: string) {
  // 清除单个单元格的缓存
  formulaCache.parseCache.delete(value);
  formulaCache.renderCache.delete(value);
  
  // 或者清除所有缓存（保守策略）
  // formulaCache.clear();
}

// 批量导入后清除缓存
export function onBatchImport() {
  formulaCache.clear();
}
```

---

### 3. JSON 序列化优化

#### 3.1 避免重复序列化

**问题**：每次保存都重新序列化整个数据集。

**解决方案**：增量序列化

```typescript
// src/lib/json/optimized-export.ts

export function exportToJsonOptimized(sheets: SheetData[]): string {
  // 只序列化有变化的数据
  const changedRows = sheets.flatMap(sheet => 
    sheet.rows.filter(row => row.isDirty)  // 标记已修改的行
  );
  
  const exportData: ExportDataV2 = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    sheets: sheets.map(sheet => ({
      name: sheet.name,
      rows: sheet.rows.map(row => {
        // 只序列化必要字段
        return {
          level1Group: row.level1Group,
          level2Group: row.level2Group,
          level3Group: row.level3Group,
          englishFormula: row.englishFormula,  // 引用，不深拷贝
          chineseFormula: row.chineseFormula,
        };
      })
    }))
  };
  
  return JSON.stringify(exportData, null, 2);
}
```

#### 3.2 Web Worker 处理大文件

```typescript
// src/workers/json-import.worker.ts

self.onmessage = async (event: MessageEvent) => {
  const { file } = event.data;
  
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    // 发送处理结果
    self.postMessage({
      success: true,
      data,
      rowCount: data.sheets.reduce((sum: number, s: any) => sum + s.rows.length, 0)
    });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error.message
    });
  }
};

// 使用 Web Worker
export function importJsonWithWorker(file: File): Promise<JsonImportResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/json-import.worker.ts', import.meta.url));
    
    worker.onmessage = (event) => {
      const result = event.data;
      worker.terminate();  // 终止 Worker
      
      if (result.success) {
        resolve(result.data);
      } else {
        reject(new Error(result.error));
      }
    };
    
    worker.onerror = (error) => {
      worker.terminate();
      reject(error);
    };
    
    worker.postMessage({ file });
  });
}
```

---

### 4. 内存优化

#### 4.1 及时释放大对象

```typescript
// src/components/spreadsheet/UniverSheet.tsx

export function UniverSheet() {
  const univerRef = useRef<Univer | null>(null);
  
  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (univerRef.current) {
        // 清理 Univer 实例
        univerRef.current.dispose();
        univerRef.current = null;
        
        // 清理缓存
        formulaCache.clear();
        
        // 强制垃圾回收（开发环境）
        if (process.env.NODE_ENV === 'development') {
          (window as any).gc?.();
        }
      }
    };
  }, []);
  
  // ...
}
```

#### 4.2 避免内存泄漏

```typescript
// ❌ 错误示例：事件监听未清理
useEffect(() => {
  window.addEventListener('resize', handleResize);
  // 缺少清理函数
});

// ✅ 正确示例
useEffect(() => {
  window.addEventListener('resize', handleResize);
  
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

#### 4.3 使用 WeakMap 缓存

```typescript
// 使用 WeakMap 避免内存泄漏
const cellMetadata = new WeakMap<any, CellMetadata>();

function getCellMetadata(cell: any): CellMetadata {
  if (!cellMetadata.has(cell)) {
    cellMetadata.set(cell, {
      lastUpdated: Date.now(),
      renderCount: 0,
    });
  }
  return cellMetadata.get(cell)!;
}
```

---

### 5. 懒加载优化

#### 5.1 按需加载公式查看器

```typescript
// src/components/formula/FormulaViewer.tsx

import { lazy, Suspense } from 'react';

// 懒加载
const FormulaViewerContent = lazy(() => import('./FormulaViewerContent'));

export function FormulaViewer({ isOpen, onClose, formulaData }: FormulaViewerProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <Suspense fallback={<LoadingSpinner />}>
          {isOpen && <FormulaViewerContent formulaData={formulaData} />}
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}
```

#### 5.2 动态导入大型库

```typescript
// src/lib/excel/import.ts

// 动态导入 ExcelJS（减少初始包大小）
export async function importFromExcel(file: File) {
  const ExcelJS = await import('exceljs');
  
  const workbook = new ExcelJS.default.Workbook();
  await workbook.xlsx.load(file);
  
  // 处理数据...
}
```

---

### 6. Web Worker 复杂计算

#### 6.1 公式计算 Worker

```typescript
// src/workers/formula-calc.worker.ts

import { parseToAST, evaluateAST } from '@/lib/parser';

self.onmessage = (event: MessageEvent) => {
  const { formula, variables } = event.data;
  
  try {
    // 解析 AST
    const ast = parseToAST(formula);
    
    // 计算结果
    const result = evaluateAST(ast, variables);
    
    self.postMessage({ success: true, result });
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};

// 使用
export function calculateFormula(formula: string, variables: any) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('../workers/formula-calc.worker.ts', import.meta.url)
    );
    
    worker.onmessage = (e) => resolve(e.data);
    worker.onerror = (e) => reject(e);
    
    worker.postMessage({ formula, variables });
  });
}
```

---

### 7. 防抖/节流优化

#### 7.1 输入防抖

```typescript
// src/components/formula/FormulaEditor.tsx

import { debounce } from 'lodash-es';

export function FormulaEditor() {
  const [formula, setFormula] = useState('');
  
  // 防抖：500ms 后保存
  const debouncedSave = useMemo(
    () => debounce((value: string) => {
      saveToLocalStorage(value);
    }, 500),
    []
  );
  
  const handleChange = (value: string) => {
    setFormula(value);
    debouncedSave(value);
  };
  
  // 清理
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);
  
  // ...
}
```

#### 7.2 滚动节流

```typescript
// src/hooks/useScrollThrottle.ts

import { throttle } from 'lodash-es';

export function useScrollThrottle(callback: () => void) {
  const throttledCallback = useMemo(
    () => throttle(callback, 100),  // 100ms 内最多执行一次
    [callback]
  );
  
  useEffect(() => {
    window.addEventListener('scroll', throttledCallback);
    
    return () => {
      throttledCallback.cancel();
      window.removeEventListener('scroll', throttledCallback);
    };
  }, [throttledCallback]);
}
```

---

### 8. Excel/JSON 导入导出优化

#### 8.1 分块处理大数据

```typescript
// src/lib/excel/optimized-import.ts

export async function importLargeExcel(file: File): Promise<SheetData[]> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.default.Workbook();
  
  // 使用流式读取（避免一次性加载到内存）
  const stream = file.stream();
  const reader = stream.getReader();
  
  const chunks: Uint8Array[] = [];
  let done = false;
  
  while (!done) {
    const { value, done: readerDone } = await reader.read();
    if (value) chunks.push(value);
    done = readerDone;
  }
  
  const buffer = new Blob(chunks).arrayBuffer();
  await workbook.xlsx.load(buffer);
  
  // 处理数据...
}
```

#### 8.2 压缩 JSON 导出

```typescript
// src/lib/json/compress-export.ts

import { gzip } from 'pako';

export async function exportCompressedJson(sheets: SheetData[]): Promise<Blob> {
  const json = exportToJson(sheets);
  
  // 压缩
  const compressed = gzip(json);
  
  return new Blob([compressed], { type: 'application/gzip' });
}

export async function importCompressedJson(file: File): Promise<SheetData[]> {
  const buffer = await file.arrayBuffer();
  
  // 解压缩
  const decompressed = pako.ungzip(new Uint8Array(buffer));
  const json = new TextDecoder().decode(decompressed);
  
  return JSON.parse(json);
}
```

---

### 9. 性能监控

#### 9.1 性能指标收集

```typescript
// src/lib/performance/monitor.ts

export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  
  // 记录性能指标
  record(metric: string, duration: number) {
    if (!this.metrics.has(metric)) {
      this.metrics.set(metric, []);
    }
    this.metrics.get(metric)!.push(duration);
  }
  
  // 开始计时
  start(id: string): () => void {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.record(id, duration);
    };
  }
  
  // 获取统计
  getStats(metric: string) {
    const values = this.metrics.get(metric) || [];
    
    if (values.length === 0) return null;
    
    return {
      count: values.length,
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      p95: this.percentile(values, 95),
    };
  }
  
  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * (p / 100));
    return sorted[index];
  }
  
  // 导出报告
  exportReport(): string {
    const report: any = {};
    
    for (const [metric, _] of this.metrics) {
      report[metric] = this.getStats(metric);
    }
    
    return JSON.stringify(report, null, 2);
  }
}

export const perfMonitor = new PerformanceMonitor();
```

#### 9.2 使用示例

```typescript
// 监控渲染性能
function renderSheet() {
  const end = perfMonitor.start('sheet-render');
  
  // 渲染逻辑
  // ...
  
  end();  // 记录耗时
}

// 监控导入性能
async function importData(file: File) {
  const end = perfMonitor.start('json-import');
  
  const result = await importFromJson(file);
  
  end();
  console.log('导入耗时:', perfMonitor.getStats('json-import'));
  
  return result;
}
```

---

### 10. 性能优化清单

#### 必须做（Must Have）

- [x] 启用 Univer 虚拟滚动
- [x] 公式解析缓存（避免重复解析 JSON）
- [x] AST 缓存（避免重复解析公式）
- [x] 批量更新单元格（避免多次重渲染）
- [x] 组件卸载时清理缓存和实例
- [x] 事件监听器清理（避免内存泄漏）

#### 应该做（Should Have）

- [ ] 懒加载公式查看器/编辑器
- [ ] Web Worker 处理大文件导入
- [ ] 防抖/节流优化（输入、滚动）
- [ ] 动态导入大型库（ExcelJS）
- [ ] 性能监控（收集关键指标）

#### 可以做（Nice to Have）

- [ ] Web Worker 复杂公式计算
- [ ] 增量 JSON 序列化
- [ ] 压缩 JSON 导出
- [ ] 流式 Excel 读取
- [ ] 自定义内存管理

---

### 11. 性能测试脚本

```typescript
// src/lib/performance/test.ts

export async function runPerformanceTest() {
  console.log('🚀 开始性能测试...\n');
  
  // 测试 1: 渲染性能
  await testRenderPerformance();
  
  // 测试 2: 导入性能
  await testImportPerformance();
  
  // 测试 3: 内存占用
  await testMemoryUsage();
  
  console.log('\n✅ 性能测试完成');
}

async function testRenderPerformance() {
  console.log('📊 测试渲染性能...');
  
  const testData = generateTestData(1000);  // 1000 行
  
  const start = performance.now();
  renderToUniver(testData);
  const duration = performance.now() - start;
  
  console.log(`  ✓ 1000 行渲染耗时: ${duration.toFixed(2)}ms`);
  console.log(`  ${duration < 500 ? '✅ 通过' : '❌ 未通过'} (< 500ms)\n`);
}

async function testImportPerformance() {
  console.log('📊 测试导入性能...');
  
  const file = generateTestJsonFile(10);  // 10MB
  
  const start = performance.now();
  await importFromJson(file);
  const duration = performance.now() - start;
  
  console.log(`  ✓ 10MB JSON 导入耗时: ${duration.toFixed(2)}ms`);
  console.log(`  ${duration < 2000 ? '✅ 通过' : '❌ 未通过'} (< 2s)\n`);
}

async function testMemoryUsage() {
  console.log('📊 测试内存占用...');
  
  if ((performance as any).memory) {
    const memory = (performance as any).memory;
    const usedMB = memory.usedJSHeapSize / 1048576;
    
    console.log(`  ✓ 当前内存占用: ${usedMB.toFixed(2)}MB`);
    console.log(`  ${usedMB < 200 ? '✅ 通过' : '❌ 未通过'} (< 200MB)\n`);
  } else {
    console.log('  ⚠️ 浏览器不支持内存监控\n');
  }
}
```

---

## 🎯 总结

### 核心变化

| 项目 | 旧版本 | 新版本 |
|------|--------|--------|
| 表格引擎 | TanStack Table | Univer |
| 公式列 | 单独的字段 | 复合数据（JSON） |
| 编辑方式 | 弹窗编辑 | 双击单元格编辑 |
| 查看方式 | 侧边栏 | 操作列查看按钮 → 弹窗 |
| Excel 支持 | 无 | 完整支持（导入/导出） |
| JSON 支持 | 基础支持 | 完整支持（V1/V2 格式） |
| 复制粘贴 | 无 | 完整支持 |
| 合并单元格 | rowSpan | 原生支持 |
| 云端存储 | 无 | Cloudflare D1 SQL |

### 预计步骤
- **总步骤数**: 12 步
- **当前进度**: 第 1-3 步已完成
- **剩余步骤**: 9 步

### 预计成本
- **开发成本**: 免费（开源方案）
- **授权费用**: 0 元
- **云服务**: Cloudflare D1 SQL（免费额度：5GB 存储/天）

### 技术风险
- **风险等级**: 中等
- **主要风险**: 
  - Univer 文档不完善
  - 数据迁移复杂性
  - 性能优化

### 预期收益
1. ✅ **完整的 Excel 体验**
   - 多选、复制粘贴、合并单元格
   - 撤销/重做、右键菜单
   - 公式计算、图表

2. ✅ **优化的公式管理**
   - 复合数据结构
   - 双击编辑
   - 查看按钮弹出可视化 UI
   - 保留 AST 树、变量映射

3. ✅ **更好的用户体验**
   - 表头固定
   - 右侧操作列固定
   - Excel 导入导出
   - JSON 导入导出（完整备份/迁移）
   - 云端同步（D1 SQL）

4. ✅ **零成本**
   - 完全免费开源
   - 无授权费用
   - 社区支持
   - Cloudflare D1 免费额度（5GB 存储/天）

---

## 🚀 下一步

**准备好了吗？立即开始执行重构计划！**

### Phase 1: 安装和初始化
1. ✅ 安装 Univer 依赖
2. ✅ 创建项目结构
3. ✅ 配置 Univer 基础环境

### Phase 2: 基础功能
4. ✅ 实现公式列复合数据
5. ✅ 迁移现有数据
6. ✅ 实现表头固定和操作列固定

### Phase 3: 核心功能
7. ✅ Excel 导入导出
8. ✅ 公式编辑器和查看器
9. ✅ 复制粘贴、合并单元格

### Phase 4: 云同步和优化
10. ✅ 云端保存（Cloudflare D1 SQL）
11. ✅ 性能优化
12. ✅ 测试所有功能

---

**文档版本**: v1.0  
**最后更新**: 2026-04-04  
**作者**: AI Assistant  
**审核状态**: 待审核
