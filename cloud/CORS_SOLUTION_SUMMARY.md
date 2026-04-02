# Worker CORS 问题解决方案总结

## 问题诊断

你遇到的 CORS 错误是因为：

1. ✅ **CORS 头配置本身是正确的**（Worker 代码已包含）
2. ⚠️ **OPTIONS 预检请求可能未返回 200 状态码**（已修复）
3. ⚠️ **CORS 头配置不够完整**（已增强）

## 已实施的修复

### 1. **增强 CORS 头配置**

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS, PUT',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',  // 预检请求缓存24小时
  'Access-Control-Allow-Credentials': 'false',
};
```

**改进点**：
- ✅ 添加了 PUT 方法支持
- ✅ 添加了 X-Requested-With 头支持
- ✅ 添加了预检缓存配置（减少浏览器预检请求）
- ✅ 明确声明不允许凭证

### 2. **修复 OPTIONS 预检响应**

```typescript
if (request.method === 'OPTIONS') {
  return new Response(null, { 
    status: 200,  // 明确设置 200 状态码
    headers: corsHeaders 
  });
}
```

## 快速恢复步骤

### 1️⃣ 更新 Worker 代码

```bash
cd cloud/cloudflare-workers
```

确保 `index.ts` 已应用上述修改（已自动应用）

### 2️⃣ 安装依赖

```bash
npm install
```

### 3️⃣ 部署到生产

```bash
wrangler deploy
```

部署完成后，你会看到：
```
✓ Uploaded formula-mapper-sync (1.23 MB)
✓ Published to https://your-worker.your-subdomain.workers.dev
```

### 4️⃣ 验证部署

```bash
# 测试 OPTIONS 预检请求
curl -v -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  https://your-worker.your-subdomain.workers.dev/load
```

**成功标志**：响应头包含 `Access-Control-Allow-Origin: *`

### 5️⃣ 清除浏览器缓存

- Chrome: `Ctrl+Shift+Delete` → 清除所有内容
- Safari: 菜单 → 开发 → 清空网站数据
- Firefox: `Ctrl+Shift+Delete` → 清除所有数据

## 文件变更清单

| 文件 | 变更 | 说明 |
|------|------|------|
| `index.ts` | ✏️ 修改 | OPTIONS 预检添加 200 状态码 + CORS 头增强 |
| `wrangler.toml` | ✏️ 修改 | 添加构建配置 |
| `package.json` | ✨ 新增 | Node.js 依赖管理 |
| `tsconfig.json` | ✨ 新增 | TypeScript 编译配置 |
| `.gitignore` | ✨ 新增 | Git 忽略配置 |
| `CORS_TROUBLESHOOTING.md` | ✨ 新增 | 详细排查指南 |
| `DEPLOYMENT_CHECKLIST.md` | ✨ 新增 | 部署检查清单 |

## 验证清单

在前端应用中测试：

- [ ] 点击「云端同步」按钮
- [ ] 输入 Worker URL：`https://your-worker.your-subdomain.workers.dev`
- [ ] 点击「保存到云端」
  - ✅ 预期：成功保存，无 CORS 错误
  - ❌ 错误：显示 CORS 错误 → 检查 Worker URL 是否正确
- [ ] 点击「从云端加载」
  - ✅ 预期：成功加载数据
  - ❌ 错误：显示加载错误 → 查看浏览器控制台日志

## 如果仍然出现 CORS 错误

### 检查清单

1. **确认 Worker 已重新部署**
   ```bash
   wrangler deploy
   ```

2. **查看 Worker 日志**
   ```bash
   wrangler tail --format pretty
   ```

3. **检查请求 URL 是否正确**
   - 格式：`https://your-worker.your-subdomain.workers.dev`
   - 不要包含路径（如 `/health`）

4. **清除浏览器缓存并重新刷新**
   - 确保加载了最新代码

5. **在浏览器控制台测试**
   ```javascript
   fetch('https://your-worker.your-subdomain.workers.dev/health')
     .then(r => {
       console.log('Status:', r.status);
       console.log('Headers:', {
         'Content-Type': r.headers.get('Content-Type'),
         'Access-Control-Allow-Origin': r.headers.get('Access-Control-Allow-Origin')
       });
       return r.json();
     })
     .then(d => console.log('Data:', d))
     .catch(e => console.error('Error:', e));
   ```

## 相关资源

- 📖 [Cloudflare Workers 官方文档](https://developers.cloudflare.com/workers/)
- 📖 [CORS 详细说明](./CORS_TROUBLESHOOTING.md)
- ✅ [部署检查清单](./DEPLOYMENT_CHECKLIST.md)
- 🔧 [Worker 源代码](./cloudflare-workers/index.ts)
