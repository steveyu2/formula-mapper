# Formula Mapper - 项目记忆

## 项目概述

公式变量映射和可视化工具，使用 Next.js 16.2.1 + React 19 + Tailwind CSS + TypeScript。

### 核心功能
- 公式变量映射（英文 ↔ 中文）
- AST 树可视化（KaTeX 渲染）
- 分层分组管理（主分组 + 二级子分组）
- 子公式支持（公式内嵌套子公式）
- URL 公式分享（`?formula=` 参数）
- LocalStorage 持久化（侧边栏状态、选中分组）
- 公式搜索
- 级联分组选择器

## 技术栈

- **框架**: Next.js 16.2.1 (App Router)
- **前端**: React 19, TypeScript
- **样式**: Tailwind CSS
- **数学渲染**: KaTeX
- **解析**: 自递归下降解析器
- **存储**: LocalStorage

## 重要文件结构

```
src/
├── app/
│   └── page.tsx                    # 主页面，所有状态管理
├── components/
│   ├── FormulaList.tsx             # 公式列表（含搜索、分组标签）
│   ├── GroupList.tsx               # 左侧分组树（可展开/收起）
│   ├── GroupSelector.tsx           # 级联分组选择器
│   ├── FormulaRenderer.tsx         # 公式渲染器（支持引用点击）
│   ├── ASTTree.tsx                 # AST 树可视化
│   ├── FormulaReferenceModal.tsx   # 引用公��弹窗
│   ├── SubFormulaManager.tsx       # 子公式管理
│   └── FormulaReferenceSelector.tsx # 变量引用公式映射
└── lib/
    ├── types.ts                    # 类型定义
    ├── parser.ts                   # 公式解析器
    ├── mapper.ts                   # 变量映射器
    └── storage.ts                  # LocalStorage 封装
```

## 关键类型定义

### FormulaGroup
```typescript
interface FormulaGroup {
  id: string;
  name: string;
  parentId: string | null;  // 支持二级分组
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
  variableFormulaMapping?: Record<string, string>;  // 变量 → 公式ID
  subFormulas?: SubFormula[];
  createdAt: number;
}
```

### SubFormula
```typescript
interface SubFormula {
  id: string;
  name: string;
  englishFormula: string;
  chineseFormula: string;
}
```

## 核心业务逻辑

### 分组过滤逻辑（FormulaList.tsx）

**关键修复**: 主分组应显示所有子分组的公式

```typescript
// 获取后代分组 ID（递归）
const getDescendantGroupIds = (groupId: string): string[] => {
  const descendants = [groupId];
  const children = groups.filter(g => g.parentId === groupId);
  children.forEach(child => {
    descendants.push(...getDescendantGroupIds(child.id));
  });
  return descendants;
};

// 过滤逻辑
const formulasWithGroup = selectedGroupId
  ? allFormulasWithGroup.filter(f => {
      const selectedGroup = groups.find(g => g.id === selectedGroupId);
      // 主分组：显示自己及所有子分组的公式
      if (!selectedGroup?.parentId) {
        return getDescendantGroupIds(selectedGroupId).includes(f.groupId);
      }
      // 子分组：只显示自己的公式
      return f.groupId === selectedGroupId;
    })
  : allFormulasWithGroup;
```

### URL 分享机制（page.tsx）

```typescript
// 1. 根据 URL 参数展开公式
useEffect(() => {
  if (urlFormulaId) {
    for (const group of savedGroups) {
      const formula = group.formulas.find(f => f.id === urlFormulaId);
      if (formula) {
        setSelectedGroupId(group.id);
        handleSelectFormula(urlFormulaId);
        break;
      }
    }
  }
}, [urlFormulaId]);

// 2. 展开公式时更新 URL
const handleSelectFormula = (formulaId: string | null) => {
  // ... 更新 URL
  const params = new URLSearchParams(searchParams.toString());
  if (formulaId) params.set('formula', formulaId);
  else params.delete('formula');
  router.push(newUrl, { scroll: false });
};

// 3. 切换分组时清空 URL
const handleSelectGroup = (groupId: string | null) => {
  setSelectedGroupId(groupId);
  const params = new URLSearchParams(searchParams.toString());
  params.delete('formula');
  // ...
};
```

### LocalStorage 缓存策略

```typescript
// 缓存选中分组和侧边栏状态
useEffect(() => {
  if (selectedGroupId) {
    localStorage.setItem('selectedGroupId', selectedGroupId);
  } else {
    localStorage.removeItem('selectedGroupId');
  }
  localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
}, [selectedGroupId, sidebarCollapsed]);

// 初始化时恢复
useEffect(() => {
  const cachedSelectedGroupId = localStorage.getItem('selectedGroupId');
  const cachedSidebarCollapsed = localStorage.getItem('sidebarCollapsed');
  // ...
}, []);
```

## 常见问题及解决方案

### 1. useEffect 无限循环
**问题**: 依赖项中使用整个对象导致重复渲染
```typescript
// ❌ 错误
useEffect(() => { ... }, [formula, isExpanded]);

// ✅ 正确
useEffect(() => { ... }, [formula.id, formula.englishFormula, formula.chineseFormula, isExpanded]);
```

### 2. useState 在渲染函数��
**问题**: 在 `renderGroupTree` 等渲染函数中使用 `useState`
**解决**: 将状态提升到组件顶层

### 3. 分组过滤逻辑错误
**问题**: 判断 `formulaGroup.parentId` 而非 `selectedGroup.parentId`
```typescript
// ❌ 错误
if (!formulaGroup?.parentId) { ... }

// ✅ 正确
if (!selectedGroup?.parentId) { ... }
```

### 4. TypeScript 类型错误
**问题**: 缺少 `groupId` 和 `parentGroupId` 字段
**解决**: 在 `formulaForm` 状态中添加这些字段

## 性能优化

1. **useMemo 缓存**
   - `FormulaReferenceSelector.tsx`: 变量提取使用 `useMemo`

2. **避免重复计算**
   - 分组树构建、公式计数等逻辑保持简洁

3. **控制台日志**
   - 仅保留必要的错误日志（storage.ts, ASTTree.tsx）

## 开发注意事项

1. **状态管理**: 所有状态在 `page.tsx` 集中管理
2. **数据流**: 单向数据流，props 传递
3. **类型安全**: 严格使用 TypeScript 类型
4. **本地存储**: 数据变更后立即调用 `saveData()`
5. **URL 同步**: 状态变更时同步更新 URL（使用 `scroll: false`）

## 测试要点

- 主分组显示所有子分组公式
- 子分组只显示自己的公式
- 分组标签显示完整路径（如"永续/前端公式"）
- URL 分享功能正常
- LocalStorage 缓存生效
- 搜索功能正常
