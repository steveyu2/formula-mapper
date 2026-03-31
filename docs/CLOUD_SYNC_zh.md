# 云端同步配置指南

Formula Mapper 支持将数据同步到 Cloudflare KV 进行备份和跨设备访问。这是完全可选的功能 - 您的数据默认始终保存在本地。

## 功能特性

- **自动版本管理**: 自动保留最多 100 个版本历史
- **版本历史查看**: 查看并恢复到任意历史版本
- **跨设备访问**: 在任何设备上访问您的数据

## 配置步骤

### 1. 创建 Cloudflare 账号

如果还没有账号，请在 [cloudflare.com](https://cloudflare.com) 注册

### 2. 创建 KV 命名空间

```bash
cd cloud/cloudflare-workers
npx wrangler kv:namespace create "FORMULA_DATA"
```

### 3. 更新 wrangler.toml

复制上一步得到的 namespace ID，更新 `wrangler.toml` 文件：

```toml
[[kv_namespaces]]
binding = "FORMULA_DATA"
id = "your-namespace-id-here"
```

### 4. 部署 Worker

```bash
npx wrangler deploy
```

### 5. 在应用中配置

1. 点击应用右上角的「云端同步」按钮
2. 输入 Worker URL（例如：`https://your-worker.your-subdomain.workers.dev`）
3.（可选）添加 API 密钥以增强安全性

## 使用方法

| 操作 | 步骤 |
|------|------|
| 保存到云端 | 点击「云端同步」→「保存到云端」 |
| 从云端加载 | 点击「云端同步」→「从云端加载」 |
| 查看历史 | 点击「云端同步」→「版本历史」 |
| 恢复版本 | 在历史列表中选择版本，点击「恢复此版本」 |

## 架构说明

云端同步功能采用策略模式设计，便于扩展：

- **当前实现**: Cloudflare KV + Cloudflare Workers
- **存储接口**: `CloudStorageProvider` - 易于添加其他提供商（AWS、阿里云等）
- **版本管理**: 自动版本控制，可配置保留数量（默认 100 个）

---

[← 返回 README](../README_zh.md)
