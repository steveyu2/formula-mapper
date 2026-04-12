# Formula Mapper 项目架构梳理

## 📋 项目概述

Formula Mapper 是一个功能强大的公式管理工具，采用类 Excel 的电子表格界面，支持多级分组管理、双语变量映射、公式计算和云端同步等功能。

## 🏗️ 核心架构

### 1. 数据流架构

```
用户界面 (UI Components)
    ↓ ↑
状态管理 (React State + LocalStorage)
    ↓ ↑
业务逻辑层 (lib/)
    ↓ ↑
数据持久化 (LocalStorage / Cloudflare KV)
```

### 2. 核心模块划分

#### 2.1 公式解析引擎 (`src/lib/parser.ts`)

**职责**: 将公式字符串解析为抽象语法树 (AST)

**核心流程**:
1. **分词 (Tokenize)**: 将公式字符串转换为 Token 流
   - 支持变量: `a`, `is`, `var1`
   - 支持数字: `123`, `456`
   - 支持运算符: `+`, `-`, `*`, `/`, `^`
   - 支持括号: `()`, `[]`, `{}`, `（）`
   - 支持函数: `max()`, `min()`, `sum()`, `sqrt()` 等

2. **语法分析 (Parse)**: 使用递归下降算法构建 AST
   - 优先级处理: `^` > `*/` > `+-`
   - 括号优先: 括号内表达式优先计算
   - 函数解析: 识别函数名和参数列表

**关键类**:
- `FormulaParser`: 主解析器类
  - `static parse(formula: string)`: 入口方法
  - `static tokenize(formula: string)`: 分词方法
  - `parseExpression()`: 解析加减法
  - `parseTerm()`: 解析乘除法
  - `parsePower()`: 解析幂运算
  - `parseFactor()`: 解析因子（变量、数字、括号、函数）

#### 2.2 公式计算引擎 (`src/lib/calculator.ts`)

**职责**: 根据 AST 和变量值计算公式结果

**核心流程**:
1. **变量提取**: 从 AST 中提取所有变量名
2. **变量替换**: 将公式中的变量替换为值，生成可读表达式
3. **递归计算**: 深度优先遍历 AST 计算结果
   - 数字节点: 直接返回值
   - 变量节点: 从值映射中查找
   - 运算符节点: 递归计算左右子树，然后应用运算符
   - 函数节点: 递归计算所有参数，然后调用函数

**关键类**:
- `FormulaCalculator`: 主计算器类
  - `static evaluate(ast, values)`: 计算公式结果
  - `static extractVariables(ast)`: 提取变量名
  - `static replaceVariables(formula, values)`: 替换变量为值
  - `evaluateNode()`: 递归计算节点
  - `evaluateOperator()`: 计算运算符
  - `evaluateFunction()`: 计算函数

**支持的运算符**:
- `+`: 加法
- `-`: 减法
- `*`: 乘法
- `/`: 除法（检查除零）
- `^`: 幂运算

**支持的函数**:
- `max(a, b, ...)`: 最大值
- `min(a, b, ...)`: 最小值
- `sum(a, b, ...)`: 求和
- `abs(x)`: 绝对值
- `sqrt(x)`: 平方根
- `pow(x, y)`: 幂运算

#### 2.3 变量映射器 (`src/lib/mapper.ts`)

**职责**: 管理英文变量和中文变量之间的映射关系

**核心功能**:
1. 提取英文变量列表
2. 提取中文变量列表
3. 创建双向映射
4. 格式化映射结果

#### 2.4 数据存储 (`src/lib/storage.ts`)

**职责**: 封装 LocalStorage 操作

**核心功能**:
1. 保存分组数据
2. 加载分组数据
3. 保存列头配置
4. 加载列头配置

#### 2.5 导入导出 (`src/lib/importExport.ts`)

**职责**: 处理数据的导入和导出

**核心功能**:
1. 导出为 JSON 格式
2. 从 JSON 字符串导入
3. 从文件导入
4. 从 URL 导入
5. 数据验证

### 3. 组件架构

#### 3.1 主要组件

```
App (page.tsx)
├── FormulaSpreadsheet (电子表格主组件)
│   ├── SheetTabs (Sheet 标签页)
│   ├── 表格 (TanStack Table)
│   └── 操作按钮
├── FormulaDetailModal (公式详情弹窗)
│   ├── Edit Tab (编辑)
│   ├── Preview Tab (预览)
│   └── Calculation Tab (计算)
│       ├── 主公式变量输入
│       ├── 绑定公式变量输入
│       ├── 计算过程展示
│       └── 计算结果展示
├── SortModal (排序弹窗)
├── CloudSyncModal (云同步弹窗)
└── 其他辅助组件
```

#### 3.2 公式计算 Tab 组件 (`src/components/CalculationTab.tsx`)

**职责**: 提供交互式公式计算界面

**核心功能**:
1. **变量分组显示**:
   - 主公式变量（未绑定的变量）
   - 绑定公式的变量（按绑定公式分组）

2. **公式绑定处理**:
   - 支持绑定到外部公式
   - 支持绑定到子公式
   - 多个变量可绑定同一公式（值独立存储）

3. **实时计算**:
   - 输入变量值后自动计算
   - 使用 `useEffect` 监听变化

4. **计算过程展示**:
   - 替换主公式变量为值
   - 展开绑定公式为完整表达式
   - 显示完整的计算表达式

**数据结构**:
```typescript
// 主公式变量值
variableValues: Record<string, string>
// 绑定公式变量值
// key 格式: "variable-refFormulaId"
boundFormulaValues: Record<string, Record<string, string>>
```

**计算流程**:
1. 收集主公式变量值
2. 遍历绑定公式：
   - 解析 bindingKey 获取变量名和公式ID
   - 收集绑定公式的变量值
   - 查找并计算绑定公式
   - 将结果赋值给主公式变量
3. 计算主公式
4. 生成计算过程展示：
   - 先替换绑定公式变量为表达式
   - 再替换主公式变量为值

### 4. 数据类型定义

#### 4.1 核心类型 (`src/lib/types.ts`)

```typescript
// AST 节点
interface ASTNode {
  type: 'operator' | 'variable' | 'number' | 'function';
  operator?: string;
  name?: string;
  value?: string;
  left?: ASTNode;
  right?: ASTNode;
  func?: string;
  args?: ASTNode[];
}

// 公式
interface Formula {
  id: string;
  name: string;
  englishFormula: string;
  chineseFormula: string;
  description?: string;
  variableFormulaMapping?: Record<string, string>;
  subFormulas?: SubFormula[];
  createdAt: number;
  level1Group?: string;
  level2Group?: string;
  // ... 最多7层
}

// 子公式
interface SubFormula {
  id: string;
  name: string;
  englishFormula: string;
  chineseFormula: string;
}

// 公式分组
interface FormulaGroup {
  id: string;
  name: string;
  parentId: string | null;
  formulas: Formula[];
  createdAt: number;
}
```

## 🔄 核心业务流程

### 1. 公式编辑流程

```
1. 用户点击编辑按钮
2. 打开 FormulaDetailModal
3. 加载公式数据
4. 解析公式生成 AST
5. 提取变量映射
6. 用户修改公式内容
7. 实时更新 AST 和映射
8. 点击保存
9. 更新 LocalStorage
10. 刷新界面
```

### 2. 公式计算流程

```
1. 用户切换到 Calculation Tab
2. 加载公式和绑定信息
3. 显示变量输入框（分组显示）
4. 用户输入变量值
5. 自动触发计算:
   a. 收集主公式变量值
   b. 遍历绑定公式:
      - 计算绑定公式的值
      - 赋值给主公式变量
   c. 计算主公式
   d. 生成计算过程
6. 显示计算过程和结果
```

### 3. 数据同步流程

```
1. 用户修改数据
2. 自动保存到 LocalStorage
3. 可选: 手动同步到云端
   a. 配置 Cloudflare Workers
   b. 输入密码（如果需要）
   c. 发送数据到云端
   d. 云端保存版本历史
4. 可选: 从云端加载
   a. 请求云端数据
   b. 验证数据格式
   c. 替换本地数据
   d. 更新界面
```

## 🎯 关键技术点

### 1. 公式解析

**递归下降解析器**:
- 优点: 简单、直观、易扩展
- 支持运算符优先级
- 支持括号嵌套
- 支持函数调用

**分词策略**:
- 正则表达式匹配
- 支持中英文括号
- 支持多字符变量名

### 2. 变量替换

**完整匹配策略**:
```typescript
// 按变量名长度降序排序，避免短变量名影响长变量名
const sortedVars = Object.keys(values).sort((a, b) => b.length - a.length);
for (const varName of sortedVars) {
  const regex = new RegExp(`\\b${varName}\\b`, 'g');
  result = result.replace(regex, String(value));
}
```

### 3. 绑定公式值隔离

**唯一 Key 设计**:
```typescript
// 使用 variable-refFormulaId 作为唯一 key
const bindingKey = `${variable}-${refFormulaId}`;
boundFormulaValues[bindingKey] = { /* 变量值 */ };
```

这样确保多个变量绑定同一公式时，各自的值独立存储。

### 4. 计算过程展开

**两步替换**:
1. 先替换绑定公式的变量为它们的表达式（用括号包裹）
2. 再替换所有变量为值

```typescript
// 第一步: 展开绑定公式
let displayFormula = editFormula.englishFormula;
for (const varName of sortedBoundVars) {
  const regex = new RegExp(`\\b${varName}\\b`, 'g');
  displayFormula = displayFormula.replace(regex, `(${boundFormulaExpressions[varName]})`);
}

// 第二步: 替换变量值
const finalExpression = FormulaCalculator.replaceVariables(displayFormula, allValues);
```

## 📊 状态管理

### 1. 本地状态

- **React State**: 组件内部状态
- **useCallback**: 优化回调函数
- **useEffect**: 副作用处理（自动计算、数据加载）

### 2. 持久化状态

- **LocalStorage**: 本地数据持久化
  - `formulaMapper`: 分组数据
  - `formulaMapper_headers`: 列头配置
  - `formulaMapper_selectedGroupId`: 选中的分组
  - `formulaMapper_cloudConfig`: 云端配置

### 3. URL 状态

- `?formula=公式ID`: 选中并展开公式
- `?cloud=endpoint`: 从云端加载
- `?sheet=分组ID`: 选中分组

## 🔐 安全机制

### 1. 数据验证

- JSON 格式验证
- 必填字段验证
- 公式语法验证
- 除零检查

### 2. 云端保护

- 可选写入密码
- 版本历史保护
- CORS 配置

### 3. 用户操作保护

- 删除二次确认
- 导入覆盖确认
- 清空数据确认

## 🚀 性能优化

### 1. 计算优化

- 自动计算使用 `useEffect` 和 `useCallback`
- 避免不必要的重新计算
- 错误捕获防止崩溃

### 2. 渲染优化

- TanStack Table 虚拟化
- 组件懒加载
- 状态提升避免重复渲染

### 3. 存储优化

- 数据压缩（可选）
- 增量保存
- 防抖处理

## 📝 开发规范

### 1. 代码组织

- 按功能模块组织文件
- 类型定义统一在 `types.ts`
- 工具函数放在 `lib/` 目录

### 2. 命名规范

- 组件: PascalCase
- 函数/变量: camelCase
- 类型/接口: PascalCase
- 常量: UPPER_SNAKE_CASE

### 3. 注释规范

- 复杂逻辑必须注释
- 公共 API 使用 JSDoc
- 关键算法说明原理

## 🧪 测试策略

### 1. 单元测试

- 公式解析器 (parser.ts)
- 公式计算器 (calculator.ts)
- 变量映射器 (mapper.ts)
- 数据存储 (storage.ts)
- 导入导出 (importExport.ts)

### 2. 集成测试

- 公式编辑流程
- 公式计算流程
- 数据导入导出流程
- 云端同步流程

### 3. E2E 测试

- 完整的用户操作流程
- 跨浏览器兼容性
- 响应式布局测试

## 🔮 未来扩展

### 1. 功能扩展

- 更多数学函数支持
- 自定义函数
- 公式模板
- 批量计算
- 计算历史

### 2. 性能扩展

- Web Worker 计算
- 增量解析
- 缓存机制

### 3. 集成扩展

- Excel 导入导出
- 更多云端服务
- API 接口
- 插件系统

## 📚 参考资源

- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev/)
- [TanStack Table 文档](https://tanstack.com/table/latest)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)

---

**文档版本**: 1.0  
**创建日期**: 2026-04-10  
**作者**: AI Assistant  
**更新说明**: 初始版本，涵盖项目核心架构和关键业务流程
