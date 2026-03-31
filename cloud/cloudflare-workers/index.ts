/**
 * Cloudflare Workers - Formula Mapper 云存储后端
 * 
 * 部署步骤:
 * 1. 安装 Wrangler: npm install -g wrangler
 * 2. 登录: wrangler login
 * 3. 创建 KV Namespace: wrangler kv:namespace create "FORMULA_DATA"
 * 4. 更新 wrangler.toml 中的 namespace_id
 * 5. 部署: wrangler deploy
 */

// KVNamespace 类型定义
declare global {
  interface KVNamespace {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
    list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
      keys: Array<{ name: string; expiration?: number; metadata?: unknown }>;
      list_complete: boolean;
      cursor?: string;
    }>;
  }
}

export interface Env {
  FORMULA_DATA: KVNamespace;
  API_KEY?: string; // 可选的 API 密钥用于身份验证
}

// CORS 配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 健康检查
      if (path === '/health') {
        return jsonResponse({ status: 'ok', timestamp: Date.now() });
      }

      // 验证 API Key（如果配置了）
      if (env.API_KEY) {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== env.API_KEY) {
          return errorResponse('Unauthorized', 401);
        }
      }

      // 路由处理
      switch (path) {
        case '/save':
          return handleSave(request, env);
        case '/load':
          return handleLoad(url, env);
        case '/delete':
          return handleDelete(url, env);
        case '/list':
          return handleList(env);
        default:
          return errorResponse('Not Found', 404);
      }
    } catch (error) {
      console.error('Worker error:', error);
      return errorResponse(
        error instanceof Error ? error.message : 'Internal Server Error',
        500
      );
    }
  },
};

/**
 * 保存数据到 KV
 */
async function handleSave(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('Method Not Allowed', 405);
  }

  try {
    const body = await request.json() as { key: string; data: unknown };
    const { key, data } = body;

    if (!key) {
      return errorResponse('Missing key', 400);
    }

    // 存储数据，添加时间戳
    const value = JSON.stringify({
      data,
      savedAt: new Date().toISOString(),
    });

    await env.FORMULA_DATA.put(key, value);

    return jsonResponse({ success: true, message: 'Data saved successfully' });
  } catch (error) {
    return errorResponse('Invalid JSON', 400);
  }
}

/**
 * 从 KV 加载数据
 */
async function handleLoad(url: URL, env: Env): Promise<Response> {
  const key = url.searchParams.get('key');

  if (!key) {
    return errorResponse('Missing key', 400);
  }

  const value = await env.FORMULA_DATA.get(key);

  if (value === null) {
    return errorResponse('Data not found', 404);
  }

  try {
    const parsed = JSON.parse(value);
    return jsonResponse({ success: true, data: parsed.data });
  } catch {
    // 兼容旧格式（直接存储的数据）
    return jsonResponse({ success: true, data: JSON.parse(value) });
  }
}

/**
 * 从 KV 删除数据
 */
async function handleDelete(url: URL, env: Env): Promise<Response> {
  const key = url.searchParams.get('key');

  if (!key) {
    return errorResponse('Missing key', 400);
  }

  await env.FORMULA_DATA.delete(key);

  return jsonResponse({ success: true, message: 'Data deleted successfully' });
}

/**
 * 列出所有键
 */
async function handleList(env: Env): Promise<Response> {
  const list = await env.FORMULA_DATA.list();
  const keys = list.keys.map((k: { name: string }) => k.name);

  return jsonResponse({ success: true, keys });
}

/**
 * 返回 JSON 响应
 */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

/**
 * 返回错误响应
 */
function errorResponse(message: string, status: number): Response {
  return jsonResponse({ success: false, error: message }, status);
}
