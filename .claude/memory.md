# Formula Mapper - 项目记忆

## 项目概述

公式变量映射和可视化工具，采用类 Excel 电子表格界面。
**技术栈**: Next.js 16.2.1 + React 19 + TypeScript + TanStack Table + Tailwind CSS

### 核心功能
- 📊 **电子表格视图**: 类 Excel 界面，支持 Sheet 标签页切换
- 🗂️ **7 层分组管理**: 模块、代码、全称、名称、条件、计算方等
- 🔀 **单元格合并**: 相同分组值自动纵向合并（rowSpan）
- 🌐 **双语公式**: 英文/中文公式同步编辑和显示
- 🎯 **自动补全**: 分组字段智能提示（AutocompleteInput）
- 🌳 **树形排序**: 拖拽树节点对多级分组排序
- ☁️ **云端同步**: Cloudflare KV 集成，版本历史
- 🔧 **导入导出**: JSON 格式数据管理
- 📱 **触摸板缩放**: 双指手势缩放表格

## 技术栈

- **框架**: Next.js 16.2.1 (App Router)
- **前端**: React 19, TypeScript
- **表格**: TanStack Table v8（替代 AG Grid）
- **拖拽**: @dnd-kit（Sheet 排序、树形排序）
- **样式**: Tailwind CSS, shadcn/ui
- **数学渲染**: KaTeX
- **图标**: Lucide React
- **解析**: 自定义递归下降解析器
- **存储**: LocalStorage + Cloudflare KV

## 重要文件结构

```
src/
├── app/
│   └── page.tsx                    # 主页面，核心状态和业务逻辑
├── components/
│   ├── FormulaSpreadsheet.tsx      # 电子表格主组件（TanStack Table）
│   ├── SheetTabs.tsx               # Sheet 标签页（支持拖拽排序）
│   ├── FormulaDetailModal.tsx      # 公式详情/编辑弹窗（双 Tab）
│   ├── SortModal.tsx               # 分组排序弹窗（树形拖拽）
│   ├── CloudSyncModal.tsx          # 云同步弹窗
│   ├── AutocompleteInput.tsx       # 自动补全输入框
│   ├── ConfirmDialog.tsx           # 确认对话框
│   ├── ASTTree.tsx                 # AST 树可视化
│   ├── SubFormulaManager.tsx       # 子公式管理
│   └── ui/                         # shadcn/ui 基础组件
└── lib/
    ├── types.ts                    # 类型定义
    ├── parser.ts                   # 公式解析器
    ├── mapper.ts                   # 变量映射器
    ├── storage.ts                  # LocalStorage 封装
    ├── importExport.ts            # 导入导出功能
    └── cloud/                      # 云端同步
```

## 关键类型定义

### FormulaGroup
```typescript
interface FormulaGroup {
  id: string;
  name: string;
  parentId: string | null;
  formulas: Formula[];
  createdAt: number;
}
```

### Formula
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

## 核心业务逻辑

### 1. 电子表格渲染（FormulaSpreadsheet.tsx）

**TanStack Table 列定义**:
```typescript
const columnDefs = useMemo(() => {
  const cols = [];
  
  // L1-L6 分组列（支持 rowSpan 合并）
  for (let i = 0; i < 6; i++) {
    cols.push({
      id: `level${i + 1}Group`,
      header: getHeader(i),
      cell: ({ row }) => {
        const value = getCellValue(row, i);
        const rowSpan = calculateRowSpan(row, i);
        return rowSpan > 0 ? (
          <div rowSpan={rowSpan}>{value}</div>
        ) : null;
      },
    });
  }
  
  // 英文公式列
  cols.push({
    id: 'englishFormula',
    cell: ({ row }) => <FormulaRenderer formula={...} />,
  });
  
  // 中文公式列
  cols.push({
    id: 'chineseFormula',
    cell: ({ row }) => <FormulaRenderer formula={...} />,
  });
  
  // 操作列（固定右侧）
  cols.push({
    id: 'actions',
    meta: { sticky: 'right' },
    cell: ({ row }) => (
      <div className="whitespace-nowrap">
        <button onClick={() => onEdit(...)}>编辑</button>
        <button onClick={() => onDelete(...)}>删除</button>
      </div>
    ),
  });
  
  return cols;
}, []);
```

**rowSpan 计算逻辑**:
```typescript
const calculateRowSpan = (row, levelIndex) => {
  const currentValue = getCellValue(row, levelIndex);
  const allRows = table.getRowModel().rows;
  const currentIndex = allRows.findIndex(r => r.id === row.id);
  
  // 计算相同值的连续行数
  let span = 1;
  for (let i = currentIndex + 1; i < allRows.length; i++) {
    if (getCellValue(allRows[i], levelIndex) === currentValue) {
      span++;
    } else {
      break;
    }
  }
  
  // 只在第一行返回 span，其他行返回 0
  const prevValue = currentIndex > 0 ? getCellValue(allRows[currentIndex - 1], levelIndex) : null;
  return prevValue === currentValue ? 0 : span;
};
```

### 2. Sheet 标签页（SheetTabs.tsx）

**拖拽排序**:
```typescript
const { setNodeRef } = useDroppable({ id: 'sheet-tabs' });
const { attributes, listeners, setNodeRef, transform } = useDraggable({
  id: group.id,
});

// 拖拽结束后重新排序
const handleDragEnd = (event) => {
  const { active, over } = event;
  if (active.id !== over?.id) {
    const oldIndex = groups.findIndex(g => g.id === active.id);
    const newIndex = groups.findIndex(g => g.id === over.id);
    const newGroups = arrayMove(groups, oldIndex, newIndex);
    setGroups(newGroups);
  }
};
```

### 3. 自动补全（AutocompleteInput.tsx）

**聚焦即展开全量选项**:
```typescript
const [isOpen, setIsOpen] = useState(false);
const [inputValue, setValue] = useState(value);
const [filteredOptions, setFilteredOptions] = useState(options);

const handleFocus = () => {
  setIsOpen(true);
  filterOptions(''); // 显示所有选项
};

const filterOptions = (query) => {
  const filtered = options.filter(opt => 
    opt.toLowerCase().includes(query.toLowerCase())
  );
  setFilteredOptions(filtered);
};
```

### 4. 树形排序（SortModal.tsx）

**递归提取排序**:
```typescript
const extractOrder = (): string[][] => {
  const sortedGroups: string[][] = [];
  
  const extractLevelOrder = (nodes: TreeNode[], level: number) => {
    if (nodes.length === 0) return;
    
    while (sortedGroups.length <= level) {
      sortedGroups.push([]);
    }
    
    nodes.forEach(node => {
      if (!node.formula) {
        sortedGroups[level].push(node.name);
      }
    });
    
    nodes.forEach(node => {
      if (node.children.length > 0) {
        extractLevelOrder(node.children, level + 1);
      }
    });
  };
  
  extractLevelOrder(tree, 0);
  return sortedGroups;
};
```

**应用排序**:
```typescript
const handleSaveSortOrder = (sortedGroups: string[][]) => {
  const sortByLevels = (level: number, parentPath: string[]) => {
    if (level >= sortedGroups.length) {
      // 收集匹配此路径的所有公式
      const matched = formulas.filter(f => matchesPath(f, parentPath));
      sortedFormulas.push(...matched);
      return;
    }
    
    const currentLevelOrder = sortedGroups[level] || [];
    
    for (const currentValue of currentLevelOrder) {
      sortByLevels(level + 1, [...parentPath, currentValue]);
    }
    
    // 处理未排序的项
    const remaining = formulas.filter(f => 
      matchesParent(f, parentPath) && 
      !currentLevelOrder.includes(getValueAtLevel(f, level))
    );
    sortedFormulas.push(...remaining);
  };
  
  sortByLevels(0, []);
};
```

### 5. 新增公式逻辑

**智能插入到同 L1 分组**:
```typescript
const handleSaveFormulaDetail = (updatedFormula) => {
  if (!updatedFormula.id) {
    // 新增模式
    const newFormula = {
      ...updatedFormula,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    
    const updatedGroups = groups.map(group => {
      if (group.id === targetGroupId) {
        // 找到相同 L1 的位置
        const newL1 = newFormula.level1Group || '';
        let insertIndex = group.formulas.length;
        
        if (newL1) {
          for (let i = group.formulas.length - 1; i >= 0; i--) {
            if (group.formulas[i].level1Group === newL1) {
              insertIndex = i + 1;
              break;
            }
          }
        }
        
        const newFormulas = [...group.formulas];
        newFormulas.splice(insertIndex, 0, newFormula);
        return { ...group, formulas: newFormulas };
      }
      return group;
    });
  }
};
```

### 6. 云端加载后选中第一个 Sheet

```typescript
onLoadData={(loadedGroups) => {
  setGroups(loadedGroups);
  saveData(loadedGroups);
  
  // 选中第一个分组
  if (loadedGroups.length > 0) {
    setSelectedGroupId(loadedGroups[0].id);
  }
  
  setSelectedFormulaId(null);
}}
```

**自动选中逻辑**（防止 selectedGroupId 为 null）:
```typescript
useEffect(() => {
  // 如果有 groups 但 selectedGroupId 为 null，自动选中第一个
  if (groups.length > 0 && selectedGroupId === null) {
    setSelectedGroupId(groups[0].id);
    return;
  }
  
  if (selectedGroupId) {
    localStorage.setItem('selectedGroupId', selectedGroupId);
  }
}, [selectedGroupId, groups]);
```

## 常见问题及解决方案

### 1. rowSpan 合并不生效
**问题**: TanStack Table 默认使用 transform 移动行
**解决**: 确保不使用 `transform` 样式，使用原生 table 布局

### 2. 云端加载后未选中第一个 Sheet
**问题**: `setSelectedGroupId` 被异步重置为 null
**解决**: 在 useEffect 中检测并自动选中第一个

### 3. 新增公式插入位置导致无法合并
**问题**: 新公式添加到末尾，L1 值不同
**解决**: 智能插入到相同 L1 分组的末尾

### 4. TypeScript 类型错误
**问题**: Formula 类型不包含 level1Group 等动态属性
**解决**: 使用类型断言 `(formula as any).level1Group`

## 性能优化

1. **useMemo 缓存**: 列定义、rowSpan 计算使用 useMemo
2. **虚拟滚动**: 大数据集时考虑使用虚拟滚动
3. **防抖搜索**: 搜索输入使用防抖
4. **延迟渲染**: 弹窗内容延迟渲染

## 开发注意事项

1. **状态管理**: 所有状态在 page.tsx 集中管理
2. **数据流**: 单向数据流，props 传递
3. **类型安全**: 严格 TypeScript，动态属性使用 any 断言
4. **本地存储**: 数据变更后立即调用 saveData()
5. **空状态引导**: 无数据时显示清晰的操作引导
6. **删除确认**: 所有删除操作需二次确认

## 测试要点

- ✅ Sheet 标签页切换和拖拽排序
- ✅ 单元格合并（rowSpan）正确性
- ✅ 列宽拖拽调整
- ✅ 触摸板缩放
- ✅ 自动补全输入
- ✅ 树形分组排序
- ✅ 新增公式智能插入
- ✅ 删除二次确认
- ✅ 云端同步加载
- ✅ 导入导出功能
- ✅ 空状态引导显示
