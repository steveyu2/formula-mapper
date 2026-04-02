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

// D1Database 类型定义
declare global {
  interface D1Database {
    prepare(_query: string): D1PreparedStatement;
    dump(): Promise<ArrayBuffer>;
    batch<T = unknown>(_statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
    exec<T = unknown>(_query: string): Promise<D1Result<T>>;
  }

  interface D1PreparedStatement {
    bind(..._values: unknown[]): D1PreparedStatement;
    first<T = unknown>(_colName?: string): Promise<T | null>;
    run<T = unknown>(): Promise<D1Result<T>>;
    all<T = unknown>(): Promise<D1Result<T>>;
    raw<T = unknown>(): Promise<T[][]>;
  }

  interface D1Result<T = unknown> {
    results: T[];
    success: boolean;
    meta: {
      served_by: string;
      duration: number;
      changes: number;
      last_row_id: number;
      changed_db: boolean;
      size_after: number;
    };
    error?: string;
  }
}

export interface Env {
  DB: D1Database;
  API_KEY?: string;
  WRITE_PASSWORD?: string; // 写入密码（可选）
}

// CORS 配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS, PUT',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false',
};

// 版本历史配置
const VERSIONS_PREFIX = 'versions:';
const MAX_VERSIONS = 100; // 最多保留100个版本

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: 200,
        headers: corsHeaders 
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
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

      switch (path) {
        case '/health':
          return jsonResponse({ status: 'ok', timestamp: Date.now() });
        case '/need-password':
          return jsonResponse({ needPassword: !!env.WRITE_PASSWORD });
        case '/save':
          // 验证写入密码
          if (!validateWritePassword(request, env)) {
            return errorResponse('Invalid write password', 403);
          }
          return handleSave(request, env);
        case '/load':
          return handleLoad(url, env);
        case '/delete':
          // 验证写入密码
          if (!validateWritePassword(request, env)) {
            return errorResponse('Invalid write password', 403);
          }
          return handleDelete(url, env);
        case '/list':
          return handleList(env);
        case '/versions':
          return handleGetVersions(url, env);
        case '/load-version':
          return handleLoadVersion(url, env);
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
 * 验证写入密码
 */
function validateWritePassword(request: Request, env: Env): boolean {
  // 如果没有配置写入密码，则不需要验证
  if (!env.WRITE_PASSWORD) {
    return true;
  }

  // 从请求体中获取密码
  const authHeader = request.headers.get('X-Write-Password');
  if (!authHeader || authHeader !== env.WRITE_PASSWORD) {
    return false;
  }

  return true;
}

/**
 * 保存数据到 D1，同时创建版本历史
 */
async function handleSave(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('Method Not Allowed', 405);
  }

  try {
    // 先获取原始文本用于调试
    const rawBody = await request.text();
    console.log('[handleSave] Raw body:', rawBody.substring(0, 200));
    
    // 尝试解析 JSON
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('[handleSave] JSON parse error:', parseError);
      return errorResponse(`JSON parse error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`, 400);
    }
    
    const { key, data, comment } = body;

    if (!key) {
      return errorResponse('Missing key', 400);
    }

    const timestamp = Date.now();
    const versionId = `${timestamp}`;
    const savedAt = new Date().toISOString();
    
    // 存储当前数据
    const value = JSON.stringify(data);

    await env.DB.prepare(`
      INSERT OR REPLACE INTO formula_data (id, data, saved_at, version_id, comment)
      VALUES (?, ?, ?, ?, ?)
    `).bind(key, value, savedAt, versionId, comment || '').run();

    // 保存版本历史
    await env.DB.prepare(`
      INSERT INTO version_history (data_key, version_id, data, saved_at, comment)
      VALUES (?, ?, ?, ?, ?)
    `).bind(key, versionId, value, savedAt, comment || '').run();

    // 清理旧版本
    await cleanupOldVersions(key, env);

    return jsonResponse({ 
      success: true, 
      message: 'Data saved successfully',
      versionId,
      timestamp,
    });
  } catch (error) {
    console.error('[handleSave] Error:', error);
    return errorResponse(`Server error: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
}

/**
 * 清理旧版本，只保留最新的 MAX_VERSIONS 个
 */
async function cleanupOldVersions(key: string, env: Env): Promise<void> {
  const result = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM version_history WHERE data_key = ?
  `).bind(key).first<{ count: number }>();
  
  const count = result?.count || 0;
  
  if (count > MAX_VERSIONS) {
    // 删除最旧的版本
    await env.DB.prepare(`
      DELETE FROM version_history 
      WHERE data_key = ? 
      AND id NOT IN (
        SELECT id FROM version_history 
        WHERE data_key = ? 
        ORDER BY saved_at DESC 
        LIMIT ?
      )
    `).bind(key, key, MAX_VERSIONS).run();
  }
}

/**
 * 从 D1 加载数据
 */
async function handleLoad(url: URL, env: Env): Promise<Response> {
  const key = url.searchParams.get('key');

  if (!key) {
    return errorResponse('Missing key', 400);
  }

  const result = await env.DB.prepare(`
    SELECT data, version_id, saved_at, comment FROM formula_data WHERE id = ?
  `).bind(key).first();

  if (!result) {
    return errorResponse('Data not found', 404);
  }

  try {
    const parsed = result as { data: string; version_id: string; saved_at: string; comment: string };
    return jsonResponse({ 
      success: true, 
      data: JSON.parse(parsed.data),
      versionId: parsed.version_id,
      savedAt: parsed.saved_at,
      comment: parsed.comment,
    });
  } catch {
    return errorResponse('Invalid data format', 500);
  }
}

/**
 * 获取版本历史列表
 */
async function handleGetVersions(url: URL, env: Env): Promise<Response> {
  const key = url.searchParams.get('key');

  if (!key) {
    return errorResponse('Missing key', 400);
  }

  const prefix = `${VERSIONS_PREFIX}${key}:`;
  const list = await env.FORMULA_DATA.list({ prefix });
  
  const versions = await Promise.all(
    list.keys.map(async (k) => {
      const value = await env.FORMULA_DATA.get(k.name);
      if (!value) return null;
      
      try {
        const parsed = JSON.parse(value);
        return {
          versionId: parsed.versionId,
          savedAt: parsed.savedAt,
          comment: parsed.comment || '',
        };
      } catch {
        return null;
      }
    })
  );

  const validVersions = versions
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

  return jsonResponse({ 
    success: true, 
    versions: validVersions,
  });
}

/**
 * 加载指定版本的数据
 */
async function handleLoadVersion(url: URL, env: Env): Promise<Response> {
  const key = url.searchParams.get('key');
  const versionId = url.searchParams.get('versionId');

  if (!key || !versionId) {
    return errorResponse('Missing key or versionId', 400);
  }

  const versionKey = `${VERSIONS_PREFIX}${key}:${versionId}`;
  const value = await env.FORMULA_DATA.get(versionKey);

  if (value === null) {
    return errorResponse('Version not found', 404);
  }

  try {
    const parsed = JSON.parse(value);
    return jsonResponse({ 
      success: true, 
      data: parsed.data,
      versionId: parsed.versionId,
      savedAt: parsed.savedAt,
      comment: parsed.comment,
    });
  } catch {
    return errorResponse('Invalid version data', 500);
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

  // 同时删除所有版本历史
  const prefix = `${VERSIONS_PREFIX}${key}:`;
  const list = await env.FORMULA_DATA.list({ prefix });
  for (const k of list.keys) {
    await env.FORMULA_DATA.delete(k.name);
  }

  return jsonResponse({ success: true, message: 'Data deleted successfully' });
}

/**
 * 列出所有键
 */
async function handleList(env: Env): Promise<Response> {
  const list = await env.FORMULA_DATA.list();
  const keys = list.keys
    .filter((k) => !k.name.startsWith(VERSIONS_PREFIX))
    .map((k) => k.name);

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
