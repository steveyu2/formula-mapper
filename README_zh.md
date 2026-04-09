# Formula Mapper - 公式映射器

Formula Mapper 是一个强大而直观的公式管理工具，采用类 Excel 的电子表格界面，支持层级分组管理、双语变量映射、云端同步等功能，是金融建模、技术文档和业务规则管理的理想选择。

### 试试 [DEMO](https://formula-mapper.netlify.app/)

![Formula Mapper Screenshot](./public/demo-image.png)  

## ✨ 核心功能

### 📊 电子表格视图
- **类 Excel 界面**: 熟悉的电子表格布局，降低学习成本
- **Sheet 标签页**: 通过顶部 Sheet 标签页切换不同分组，支持拖拽排序
- **单元格合并**: 相同分组值的单元格自动纵向合并，层次清晰
- **列宽调整**: 支持拖拽调整列宽，操作列固定右侧
- **触摸板缩放**: 支持双指手势缩放，适配不同屏幕
- **表头固定**: 滚动时表头始终可见，方便查看

### 🗂️ 多级分组管理
- **7 层分组结构**: 支持最多 7 级分组（模块、代码、全称、名称、条件、计算方等）
- **自定义表头**: 可为每个分组列自定义名称
- **树形排序**: 通过拖拽树形节点对多级分组进行排序
- **自动补全**: 新增公式时，分组字段支持智能提示和自动补全

### 🌐 双语公式
- **中英文变量映射**: 英文公式和中文公式同步显示和编辑
- **公式可视化**: 自动解析公式并渲染，提升可读性
- **AST 树展示**: 在编辑弹窗中以树形结构展示公式结构

### ☁️ 云端同步
- **Cloudflare KV 集成**: 可选的云端数据同步功能
- **版本历史**: 保留历史版本，支持回滚
- **写入保护**: 支持设置写入密码，保护数据安全
- **一键加载**: 从云端加载数据后自动选中第一个 Sheet

### 🔧 数据管理
- **文件导入导出**: 支持 JSON 格式的数据导入导出
- **URL 导入**: 可从 URL 直接导入数据
- **删除确认**: 删除公式时需二次确认，防止误操作
- **自动保存**: 所有操作自动保存到 LocalStorage

### 🎨 用户体验
- **响应式设计**: 适配不同屏幕尺寸
- **键盘快捷键**: ESC 关闭弹窗，Enter 确认操作
- **实时搜索**: 在公式中快速搜索
- **空状态引导**: 清晰的空状态提示和操作引导

## 🛠️ 技术栈

- **框架**: Next.js 16.2.1 (App Router)
- **前端**: React 19, TypeScript
- **表格**: TanStack Table v8
- **样式**: Tailwind CSS, shadcn/ui
- **数学渲染**: KaTeX
- **拖拽**: @dnd-kit (拖拽排序)
- **图标**: Lucide React
- **解析器**: 自定义递归下降解析器
- **本地存储**: LocalStorage
- **云端**: Cloudflare Workers + KV

## 🚀 快速开始

按照以下步骤在本地运行此项目：

1. **克隆仓库**
   ```bash
   git clone https://github.com/your-username/formula-mapper.git
   cd formula-mapper
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **运行开发服务器**
   ```bash
   npm run dev
   ```

4. 在浏览器中打开 `http://localhost:3000` 查看应用

## 📖 使用指南

### 创建和管理 Sheet
1. 点击上方 **+** 按钮创建新 Sheet（分组）
2. 点击 Sheet 标签页切换不同分组
3. 拖拽 Sheet 标签页调整顺序
4. 双击 Sheet 标签页可重命名

### 添加公式
1. 选择要添加公式的 Sheet
2. 点击表格上方的 **+ 新增公式** 按钮
3. 在弹窗中填写：
   - 分组字段（支持自动补全）
   - 英文公式
   - 中文公式
   - 说明（可选）
4. 点击保存

### 编辑公式
1. 点击表格操作列的 **编辑** 按钮
2. 在弹窗的 **编辑** Tab 中修改公式内容
3. 切换到 **预览** Tab 查看公式渲染效果
4. 点击保存

### 排序分组
1. 点击 **排序** 按钮打开排序弹窗
2. 拖拽树形节点调整分组顺序
3. 点击节点前的箭头展开/收起子级
4. 点击保存应用排序

### 云端同步
1. 点击侧边栏的 **云同步** 按钮
2. 输入 Cloudflare Workers URL
3. 点击 **保存配置**
4. 使用 **保存到云端** 或 **从云端加载** 进行同步

详细配置指南：[云同步配置](./docs/CLOUD_SYNC_zh.md)

## 📁 项目结构

```
formula-mapper/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # 主页面，核心状态和业务逻辑
│   │   ├── layout.tsx                  # 根布局
│   │   └── globals.css                 # 全局样式
│   ├── components/
│   │   ├── FormulaSpreadsheet.tsx      # 电子表格主组件
│   │   ├── SheetTabs.tsx               # Sheet 标签页组件
│   │   ├── FormulaDetailModal.tsx      # 公式详情/编辑弹窗
│   │   ├── SortModal.tsx               # 分组排序弹窗
│   │   ├── CloudSyncModal.tsx          # 云同步弹窗
│   │   ├── AutocompleteInput.tsx       # 自动补全输入框
│   │   ├── ASTTree.tsx                 # AST 树可视化
│   │   ├── SubFormulaManager.tsx       # 子公式管理
│   │   ├── ConfirmDialog.tsx           # 确认对话框
│   │   └── ui/                         # shadcn/ui 基础组件
│   └── lib/
│       ├── types.ts                    # TypeScript 类型定义
│       ├── parser.ts                   # 公式解析器
│       ├── mapper.ts                   # 变量映射器
│       ├── storage.ts                  # LocalStorage 封装
│       ├── importExport.ts            # 导入导出功能
│       └── cloud/                      # 云端同步相关
├── cloud/
│   └── cloudflare-workers/             # Cloudflare Workers 部署代码
├── docs/
│   ├── CLOUD_SYNC.md                   # 云同步英文文档
│   └── CLOUD_SYNC_zh.md               # 云同步中文文档
└── demo-data/                          # 示例数据
```

## 🔑 核心特性详解

### 公式数据结构
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
  // 7 个分组字段
  level1Group?: string;  // 模块
  level2Group?: string;  // 代码
  level3Group?: string;  // 全称
  level4Group?: string;  // 名称
  level5Group?: string;  // 条件
  level6Group?: string;  // 计算方
  level7Group?: string;  // 扩展
}
```

### 表格合并逻辑
- 前 6 个分组列（L1-L6）支持单元格合并
- 相同值的连续单元格自动合并
- 合并后的单元格支持双击编辑
- L1、L2 使用深色背景（sky-100）
- L3、L4 使用浅色背景（sky-50）

### 自动补全机制
- 新增/编辑公式时，分组字段显示自动补全
- 聚焦时立即显示所有可选项
- 输入时实时过滤匹配项
- 从现有公式的分组字段中提取选项

## 🤝 贡献指南

欢迎各种形式的贡献！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 开发规范
- 使用 TypeScript 编写所有新代码
- 遵循现有的代码风格和模式
- 为复杂逻辑添加注释
- 确保功能在不同屏幕尺寸下正常工作

## 📄 许可证

该项目采用 MIT 许可证。详情请见 `LICENSE` 文件。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [TanStack Table](https://tanstack.com/table) - 表格解决方案
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
- [KaTeX](https://katex.org/) - 数学公式渲染
- [shadcn/ui](https://ui.shadcn.com/) - UI 组件库
- [Lucide](https://lucide.dev/) - 图标库
