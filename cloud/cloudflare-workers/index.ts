/**
 * Cloudflare Workers - Formula Mapper 云存储后端 (D1 Database)
 * 
 * 部署步骤:
 * 1. 安装 Wrangler: npm install -g wrangler
 * 2. 登录: wrangler login
 * 3. 创建 D1 Database: wrangler d1 create formula-mapper-db
 * 4. 更新 wrangler.toml 中的 database_id
 * 5. 执行数据库迁移: wrangler d1 execute formula-mapper-db --file=schema.sql
 * 6. 部署: wrangler deploy
 */

export interface Env {
  DB: D1Database;
  API_KEY?: string;
  WRITE_PASSWORD?: string; // 写入密码（可选）
}

// CORS 配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS, PUT',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Write-Password',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false',
};

// 版本历史配置
const MAX_VERSIONS = 100; // 每种类型最多保留100个版本

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

      if (path === '/need-password') {
        return jsonResponse({ needPassword: !!env.WRITE_PASSWORD });
      }

      // 验证 API Key（如果配置了）
      if (env.API_KEY) {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== env.API_KEY) {
          return errorResponse('Unauthorized', 401);
        }
      }

      switch (path) {
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
 * 保存数据到 D1，同时创建固定版本和日期版本
 */
async function handleSave(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('Method Not Allowed', 405);
  }

  try {
    const rawBody = await request.text();
    
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      return errorResponse(`JSON parse error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`, 400);
    }
    
    const { key, data, comment } = body;

    if (!key) {
      return errorResponse('Missing key', 400);
    }

    const timestamp = Date.now();
    const versionId = `${timestamp}`;
    const savedAt = new Date().toISOString();
    const value = JSON.stringify(data);

    // 1. 存储当前数据
    await env.DB.prepare(`
      INSERT OR REPLACE INTO formula_data (id, data, saved_at, version_id, comment)
      VALUES (?, ?, ?, ?, ?)
    `).bind(key, value, savedAt, versionId, comment || '').run();

    // 2. 创建固定版本
    await createFixedVersion(key, `${versionId}-fixed`, savedAt, value, comment || '', env);

    // 3. 创建/覆盖日期版本
    await createOrUpdateAutoVersion(key, `${versionId}-auto`, savedAt, value, env);

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
 * 创建固定版本（简单逻辑：超过100个删除最旧的）
 */
async function createFixedVersion(key: string, versionId: string, savedAt: string, data: string, comment: string, env: Env): Promise<void> {
  // 插入新固定版本
  await env.DB.prepare(`
    INSERT INTO version_history (data_key, version_id, data, saved_at, comment, version_type)
    VALUES (?, ?, ?, ?, ?, 'fixed')
  `).bind(key, versionId, data, savedAt, comment).run();

  // 清理超过100个的旧固定版本
  await env.DB.prepare(`
    DELETE FROM version_history 
    WHERE data_key = ? 
      AND version_type = 'fixed'
      AND id NOT IN (
        SELECT id FROM version_history 
        WHERE data_key = ? AND version_type = 'fixed'
        ORDER BY saved_at DESC 
        LIMIT 100
      )
  `).bind(key, key).run();
}

/**
 * 创建或覆盖日期版本（复杂逻辑：同日期覆盖最新）
 */
async function createOrUpdateAutoVersion(key: string, versionId: string, savedAt: string, data: string, env: Env): Promise<void> {
  // 1. 获取当前日期版本总数
  const countResult = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM version_history 
    WHERE data_key = ? AND version_type = 'auto'
  `).bind(key).first<{ count: number }>();
  
  const totalCount = countResult?.count || 0;
  const currentDate = savedAt.split('T')[0]; // YYYY-MM-DD
  
  if (totalCount >= 100) {
    // 2. 查找当天最新的版本
    const latestSameDay = await env.DB.prepare(`
      SELECT id, version_id FROM version_history 
      WHERE data_key = ? AND version_type = 'auto'
        AND strftime('%Y-%m-%d', saved_at) = ?
      ORDER BY saved_at DESC
      LIMIT 1
    `).bind(key, currentDate).first<{ id: number; version_id: string }>();
    
    if (latestSameDay) {
      // 3a. 有同日期版本，覆盖它
      await env.DB.prepare(`
        UPDATE version_history 
        SET data = ?, saved_at = ?, version_id = ?
        WHERE id = ?
      `).bind(data, savedAt, versionId, latestSameDay.id).run();
    } else {
      // 3b. 没有同日期版本，创建新的并删除最旧的
      await env.DB.prepare(`
        INSERT INTO version_history (data_key, version_id, data, saved_at, comment, version_type)
        VALUES (?, ?, ?, ?, '', 'auto')
      `).bind(key, versionId, data, savedAt).run();
      
      // 删除最旧的版本（保持总数 <= 100）
      await env.DB.prepare(`
        DELETE FROM version_history 
        WHERE data_key = ? 
          AND version_type = 'auto'
          AND id NOT IN (
            SELECT id FROM version_history 
            WHERE data_key = ? AND version_type = 'auto'
            ORDER BY saved_at DESC 
            LIMIT 100
          )
      `).bind(key, key).run();
    }
  } else {
    // 4. 总数 < 100，直接创建
    await env.DB.prepare(`
      INSERT INTO version_history (data_key, version_id, data, saved_at, comment, version_type)
      VALUES (?, ?, ?, ?, '', 'auto')
    `).bind(key, versionId, data, savedAt).run();
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

  const results = await env.DB.prepare(`
    SELECT version_id, saved_at, comment, version_type
    FROM version_history 
    WHERE data_key = ? 
    ORDER BY saved_at DESC
  `).bind(key).all();

  const versions = results.results.map((row: any) => ({
    versionId: row.version_id,
    savedAt: row.saved_at,
    comment: row.comment || '',
    versionType: row.version_type || 'auto',
  }));

  return jsonResponse({ 
    success: true, 
    versions,
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

  const result = await env.DB.prepare(`
    SELECT data, version_id, saved_at, comment 
    FROM version_history 
    WHERE data_key = ? AND version_id = ?
  `).bind(key, versionId).first();

  if (!result) {
    return errorResponse('Version not found', 404);
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
    return errorResponse('Invalid version data', 500);
  }
}

/**
 * 从 D1 删除数据
 */
async function handleDelete(url: URL, env: Env): Promise<Response> {
  const key = url.searchParams.get('key');

  if (!key) {
    return errorResponse('Missing key', 400);
  }

  // 删除当前数据
  await env.DB.prepare(`
    DELETE FROM formula_data WHERE id = ?
  `).bind(key).run();

  // 删除所有版本历史
  await env.DB.prepare(`
    DELETE FROM version_history WHERE data_key = ?
  `).bind(key).run();

  return jsonResponse({ success: true, message: 'Data deleted successfully' });
}

/**
 * 列出所有键
 */
async function handleList(env: Env): Promise<Response> {
  const results = await env.DB.prepare(`
    SELECT DISTINCT id FROM formula_data
  `).all();

  const keys = results.results.map((row: any) => row.id);

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
