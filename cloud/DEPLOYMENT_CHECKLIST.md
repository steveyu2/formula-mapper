# Cloudflare Worker 部署检查清单

## 部署前检查

- [ ] 已在 Cloudflare 账号中创建 KV Namespace
- [ ] 已将 namespace ID 更新到 `wrangler.toml`
- [ ] 已在 `cloud/cloudflare-workers` 目录运行 `npm install`
- [ ] Worker 代码包含正确的 CORS 头配置
- [ ] `index.ts` 已保存

## 部署步骤

```bash
cd cloud/cloudflare-workers
npm install
wrangler deploy
```

## 部署后验证

- [ ] 部署成功且没有错误
- [ ] 记下输出的 Worker URL（格式：`https://your-worker.your-subdomain.workers.dev`）

## 测试 CORS

### 1. 健康检查

```bash
curl https://your-worker.your-subdomain.workers.dev/health
```

✅ 预期：返回 `{"status":"ok","timestamp":...}`

### 2. OPTIONS 预检

```bash
curl -v -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  https://your-worker.your-subdomain.workers.dev/load
```

✅ 预期：响应头包含 `Access-Control-Allow-Origin: *`

### 3. 浏览器测试

在应用中配置 Worker URL，点击「云端同步」：

- [ ] 没有 CORS 错误
- [ ] 成功连接到 Worker
- [ ] 可以保存/加载数据

## 常见问题排查

### ❌ 错误：`CORS policy: Response to preflight request...`

**原因**：CORS 头配置不正确或 Worker 未重新部署

**解决**：
1. 检查 `index.ts` 中的 `corsHeaders` 配置
2. 运行 `wrangler deploy` 重新部署
3. 清除浏览器缓存

### ❌ 错误：`KV namespace not found`

**原因**：`wrangler.toml` 中的 namespace ID 不正确

**解决**：
1. 运行 `wrangler kv:namespace list` 查看所有 namespace
2. 确认并更新正确的 ID

### ❌ 错误：`Unauthorized`（401）

**原因**：如果启用了 API Key，但请求中没有正确的授权头

**解决**：
1. 在前端调用时添加 `Authorization: Bearer your-api-key` 头
2. 或在 `wrangler.toml` 中注释掉 `API_KEY` 配置

### ⚠️ 问题：Worker 返回 500 错误

**排查步骤**：
1. 运行 `wrangler tail` 查看 Worker 日志
2. 检查请求参数是否正确
3. 确保 KV 数据格式正确

## 性能检查

- [ ] 响应时间 < 500ms
- [ ] 没有频繁的超时错误

## 文档

- Worker 代码：`cloud/cloudflare-workers/index.ts`
- 配置文件：`cloud/cloudflare-workers/wrangler.toml`
- CORS 详细说明：`cloud/CORS_TROUBLESHOOTING.md`
