# ⚡ CORS 问题快速修复 (3 分钟)

## 问题
浏览器报错：`CORS policy: Response to preflight request doesn't pass access control check`

## 解决 (复制粘贴这 3 个命令)

```bash
# 1. 进入 Worker 目录
cd cloud/cloudflare-workers

# 2. 安装依赖
npm install

# 3. 部署
wrangler deploy
```

## ✅ 验证

```bash
# 测试 Worker 是否在线
curl https://your-worker.your-subdomain.workers.dev/health

# 应该返回: {"status":"ok","timestamp":...}
```

## 🔍 如果还是有问题

1. **确认 URL 正确**
   - 格式：`https://xxx.workers.dev`（不要带路径）
   - 从 `wrangler deploy` 的输出中复制

2. **清除浏览器缓存**
   - Chrome: `Ctrl+Shift+Delete`
   - Safari: ⌘ + Shift + Delete

3. **查看详细日志**
   ```bash
   wrangler tail --format pretty
   ```

## 📚 详细文档

- [CORS 完整解决方案](./CORS_SOLUTION_SUMMARY.md)
- [部署检查清单](./DEPLOYMENT_CHECKLIST.md)
- [CORS 排查指南](./CORS_TROUBLESHOOTING.md)
