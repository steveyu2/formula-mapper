# Cloudflare Workers 云存储方案

这个目录包含 Cloudflare Workers 后端配置，用于 Formula Mapper 的云端同步功能。

## 快速开始

### 1. 前置要求

```bash
# 全局安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare 账号
wrangler login
```

### 2. 创建 KV Namespace

```bash
cd cloud/cloudflare-workers

# 创建 KV 存储空间
wrangler kv:namespace create "FORMULA_DATA"

# 输出会显示 namespace ID，复制下来
# ✓ Created namespace with id: 9b3e867f8ed64427b03d4a48cf058d67
```

### 3. 更新配置

将上一步得到的 namespace ID 更新到 `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "FORMULA_DATA"
id = "your-namespace-id-here"
```

### 4. 部署

```bash
cd cloud/cloudflare-workers
npm install
wrangler deploy
```

成功后会输出 Worker URL：
```
✓ Published to https://formula-mapper-sync.your-subdomain.workers.dev
```

### 5. 在应用中配置

1. 打开应用
2. 点击右上角「云端同步」按钮
3. 输入 Worker URL（例如：`https://formula-mapper-sync.your-subdomain.workers.dev`）
4. 点击「测试连接」或直接保存

## CORS 问题排查

如果遇到 CORS 相关错误，请查看：
- 📖 [CORS 解决方案总结](./CORS_SOLUTION_SUMMARY.md)
- 📖 [CORS 详细排查指南](./CORS_TROUBLESHOOTING.md)

## 部署检查清单

部署前后的完整检查清单：
- ✅ [部署检查清单](./DEPLOYMENT_CHECKLIST.md)

## 项目结构

```
cloud/
├── cloudflare-workers/          # Worker 源代码
│   ├── index.ts                # Worker 入口点
│   ├── wrangler.toml           # Wrangler 配置
│   ├── package.json            # Node.js 依赖
│   ├── tsconfig.json           # TypeScript 配置
│   └── .gitignore
├── CORS_SOLUTION_SUMMARY.md     # CORS 解决方案总结
├── CORS_TROUBLESHOOTING.md      # CORS 详细排查指南
├── DEPLOYMENT_CHECKLIST.md      # 部署检查清单
└── README.md                    # 本文件
```

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/save` | POST | 保存数据到 KV |
| `/load` | GET | 从 KV 加载数据 |
| `/delete` | DELETE | 删除 KV 中的数据 |
| `/list` | GET | 列出所有数据键 |
| `/versions` | GET | 获取版本历史 |
| `/load-version` | GET | 加载指定版本 |

## 可选：添加 API 密钥认证

在 `wrangler.toml` 中设置：

```toml
[vars]
API_KEY = "your-secret-key"
```

所有请求都需要添加认证头：

```
Authorization: Bearer your-secret-key
```

## 开发模式

带热重载的本地开发：

```bash
cd cloud/cloudflare-workers
wrangler dev --local
```

然后访问 `http://localhost:8787/health`

## 查看日志

实时查看 Worker 日志：

```bash
wrangler tail --format pretty
```

## 更多信息

- [Cloudflare Workers 官方文档](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare KV 文档](https://developers.cloudflare.com/workers/runtime-apis/kv/)
