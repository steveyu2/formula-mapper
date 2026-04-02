# Cloudflare Worker CORS 问题解决指南

## 问题症状

浏览器报错：
```
Access to fetch at 'https://your-worker.workers.dev/load?key=formula-data' 
from origin 'http://localhost:3000' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check
```

## 根本原因

CORS (Cross-Origin Resource Sharing) 问题通常由以下原因引起：

1. **缺少正确的 CORS 头** - Worker 响应中没有包含必要的 CORS 头
2. **OPTIONS 预检请求未正确处理** - 浏览器在发送实际请求前会先发送 OPTIONS 预检请求
3. **CORS 头与实际请求方法不匹配** - 声明的方法与实际使用的方法不一致

## 解决方案

### 1. 确保 Worker 代码包含正确的 CORS 配置

```typescript
// CORS 配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // 允许所有来源
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS, PUT',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',  // 预检请求缓存24小时
  'Access-Control-Allow-Credentials': 'false',
};
```

### 2. 处理 OPTIONS 预检请求

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 处理 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: 200,
        headers: corsHeaders 
      });
    }

    // ... 处理其他请求 ...
  },
};
```

### 3. 确保所有响应都包含 CORS 头

```typescript
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,  // 关键：添加 CORS 头
    },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ success: false, error: message }, status);
}
```

## 部署步骤

### 前置要求

```bash
# 全局安装 Wrangler CLI
npm install -g wrangler

# 登录 Cloudflare
wrangler login
```

### 创建并配置 KV Namespace

```bash
cd cloud/cloudflare-workers

# 创建 KV Namespace
wrangler kv:namespace create "FORMULA_DATA"

# 输出类似：
# ✓ Created namespace with id: 9b3e867f8ed64427b03d4a48cf058d67
# Add the following to your wrangler.toml:
# [[kv_namespaces]]
# binding = "FORMULA_DATA"
# id = "9b3e867f8ed64427b03d4a48cf058d67"
```

### 更新 wrangler.toml

将上述 namespace 配置复制到 `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "FORMULA_DATA"
id = "your-namespace-id-here"
```

### 安装依赖

```bash
cd cloud/cloudflare-workers
npm install
```

### 部署 Worker

```bash
# 部署到生产环境
wrangler deploy

# 或开发模式（带热重载）
wrangler dev
```

## 验证部署

### 1. 测试健康检查

```bash
curl https://your-worker.your-subdomain.workers.dev/health
```

预期响应：
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

### 2. 测试 OPTIONS 预检请求

```bash
curl -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  https://your-worker.your-subdomain.workers.dev/load
```

预期响应头包含：
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS, PUT
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
```

### 3. 在浏览器中测试

打开浏览器控制台，运行：

```javascript
fetch('https://your-worker.your-subdomain.workers.dev/load?key=test')
  .then(r => r.json())
  .then(d => console.log('Success:', d))
  .catch(e => console.error('Error:', e.message));
```

## 常见问题

### Q: 为什么我看不到 CORS 头？

A: 可能是以下原因：
1. Worker 代码未重新部署 - 运行 `wrangler deploy`
2. 浏览器缓存 - 清除缓存或使用 Incognito 窗口
3. 使用了错误的 Worker URL - 确认部署地址

### Q: 如何添加 API 密钥认证？

A: 在 `wrangler.toml` 中设置环境变量：

```toml
[vars]
API_KEY = "your-secret-key"
```

前端调用时添加 Authorization 头：

```javascript
fetch('https://your-worker.workers.dev/load?key=data', {
  headers: {
    'Authorization': 'Bearer your-secret-key'
  }
})
```

### Q: 如何限制特定来源的 CORS？

A: 修改 `corsHeaders` 中的 `Access-Control-Allow-Origin`:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourdomain.com',  // 只允许特定域名
  // ... 其他配置
};
```

或动态设置：

```typescript
const origin = request.headers.get('Origin') || '';
const allowedOrigins = ['https://yourdomain.com', 'http://localhost:3000'];

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : '',
  // ... 其他配置
};
```

## 调试技巧

### 启用 Worker 日志

```bash
# 查看实时日志
wrangler tail

# 在代码中添加日志
console.log('Request method:', request.method);
console.log('Request headers:', Object.fromEntries(request.headers));
```

### 使用 Wrangler 开发服务器

```bash
wrangler dev --local

# 然后在浏览器中访问 http://localhost:8787
```

## 相关文档

- [Cloudflare Workers CORS](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)
- [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
