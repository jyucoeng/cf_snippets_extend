// Cloudflare Pages _worker.js
// 此文件将处理所有请求，包括静态文件和 API
import { connect } from 'cloudflare:sockets';
const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
};

// 自动初始化数据库
async function initDB(db) {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY, api_key TEXT UNIQUE, expires_at TEXT, created_at TEXT);
        CREATE TABLE IF NOT EXISTS proxy_ips (id INTEGER PRIMARY KEY, address TEXT, type TEXT, remark TEXT, enabled INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT);
        CREATE TABLE IF NOT EXISTS outbounds (id INTEGER PRIMARY KEY, address TEXT, type TEXT, remark TEXT, enabled INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0, exit_country TEXT, exit_city TEXT, exit_ip TEXT, exit_org TEXT, checked_at TEXT, created_at TEXT, updated_at TEXT);
        CREATE TABLE IF NOT EXISTS cf_ips (id INTEGER PRIMARY KEY, address TEXT, port INTEGER DEFAULT 443, remark TEXT, enabled INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT);
        CREATE TABLE IF NOT EXISTS subscribe_config (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, token TEXT UNIQUE NOT NULL, uuid TEXT, snippets_domain TEXT, proxy_path TEXT, remark TEXT, enabled INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT);
        CREATE TABLE IF NOT EXISTS argo_subscribe (id INTEGER PRIMARY KEY, token TEXT UNIQUE NOT NULL, template_link TEXT NOT NULL, remark TEXT, enabled INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT);
    `).catch(() => { });

    // 为已存在的 outbounds 表添加新列（如果不存在）
    try {
        await db.prepare(`ALTER TABLE outbounds ADD COLUMN exit_country TEXT`).run().catch(() => { });
        await db.prepare(`ALTER TABLE outbounds ADD COLUMN exit_city TEXT`).run().catch(() => { });
        await db.prepare(`ALTER TABLE outbounds ADD COLUMN exit_ip TEXT`).run().catch(() => { });
        await db.prepare(`ALTER TABLE outbounds ADD COLUMN exit_org TEXT`).run().catch(() => { });
        await db.prepare(`ALTER TABLE outbounds ADD COLUMN exit_asn TEXT`).run().catch(() => { });
        await db.prepare(`ALTER TABLE outbounds ADD COLUMN checked_at TEXT`).run().catch(() => { });
        await db.prepare(`ALTER TABLE outbounds ADD COLUMN entry_info_json TEXT`).run().catch(() => { });
        await db.prepare(`ALTER TABLE outbounds ADD COLUMN exit_info_json TEXT`).run().catch(() => { });
    } catch (e) {
        // 列可能已存在，忽略错误
    }

    // 迁移 proxy_ips 中的 socks5 和 http 数据到 outbounds
    try {
        const { results: socks5Data } = await db.prepare("SELECT * FROM proxy_ips WHERE type IN ('socks5', 'http', 'https')").all();
        if (socks5Data && socks5Data.length > 0) {
            for (const item of socks5Data) {
                // 插入到 outbounds
                await db.prepare('INSERT OR IGNORE INTO outbounds (address, type, remark, enabled, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
                    .bind(item.address, item.type, item.remark, item.enabled, item.sort_order, item.created_at, item.updated_at).run();
            }
            // 删除已迁移的数据
            await db.prepare("DELETE FROM proxy_ips WHERE type IN ('socks5', 'http', 'https')").run();
        }
    } catch (e) {
        console.error('Migration error:', e);
    }

    // 迁移旧的订阅配置到新表结构
    try {
        // 为旧表添加新列
        await db.prepare(`ALTER TABLE subscribe_config ADD COLUMN type TEXT`).run().catch(() => { });
        await db.prepare(`ALTER TABLE subscribe_config ADD COLUMN token TEXT`).run().catch(() => { });
        await db.prepare(`ALTER TABLE subscribe_config ADD COLUMN remark TEXT`).run().catch(() => { });
        await db.prepare(`ALTER TABLE subscribe_config ADD COLUMN enabled INTEGER DEFAULT 1`).run().catch(() => { });
        await db.prepare(`ALTER TABLE subscribe_config ADD COLUMN sort_order INTEGER DEFAULT 0`).run().catch(() => { });
        await db.prepare(`ALTER TABLE subscribe_config ADD COLUMN created_at TEXT`).run().catch(() => { });

        // 迁移 id=1 的 VLESS 配置
        const vlessConfig = await db.prepare('SELECT * FROM subscribe_config WHERE id = 1').first();
        if (vlessConfig && !vlessConfig.type) {
            const token = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
            await db.prepare('UPDATE subscribe_config SET type = ?, token = ?, remark = ?, enabled = 1, sort_order = 0, created_at = datetime("now") WHERE id = 1')
                .bind('vless', token, 'VLESS订阅-1').run();
        }

        // 迁移 id=2 的 SS 配置
        const ssConfig = await db.prepare('SELECT * FROM subscribe_config WHERE id = 2').first();
        if (ssConfig && !ssConfig.type) {
            const token = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
            await db.prepare('UPDATE subscribe_config SET type = ?, token = ?, remark = ?, enabled = 1, sort_order = 0, created_at = datetime("now") WHERE id = 2')
                .bind('ss', token, 'SS订阅-1').run();
        }
    } catch (e) {
        console.error('Subscribe config migration error:', e);
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS } });
}

function parseProxyType(addr) {
    if (!addr) return 'unknown';
    if (addr.startsWith('socks')) return 'socks5';
    if (addr.startsWith('http://')) return 'http';
    if (addr.startsWith('https://')) return 'https';
    if (addr.startsWith('[') || addr.includes('::')) return 'ipv6';
    if (/^(\d{1,3}\.){3}\d{1,3}/.test(addr)) return 'ipv4';
    return 'domain';
}

function parseOutboundType(addr) {
    if (!addr) return 'unknown';
    if (addr.startsWith('socks')) return 'socks5';
    if (addr.startsWith('http://') || addr.startsWith('https://')) return 'http';
    return 'unknown';
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        if (method === 'OPTIONS') return new Response(null, { headers: CORS });

        await initDB(env.DB);

        // 路由
        // 公开订阅
        if (path.startsWith('/sub/')) {
            const parts = path.split('/');
            if (parts[2] === 'token' && parts[3]) {
                // 通过 token 生成订阅: /sub/token/{token}
                return handleSubscribeByToken(env.DB, parts[3], request.url);
            } else if (parts[2] === 'ss' && parts[3]) {
                // SS 订阅: /sub/ss/password (兼容旧版)
                return handleSSSubscribe(env.DB, parts[3], request.url);
            } else if (parts[2] === 'argo' && parts[3]) {
                // ARGO 订阅: /sub/argo/token
                return handleArgoSubscribe(env.DB, parts[3]);
            } else if (parts[2]) {
                // VLESS 订阅: /sub/uuid (兼容旧版)
                return handleSubscribe(env.DB, parts[2], request.url);
            }
        }

        // 登录接口（放在静态资源处理之前）
        if (path === '/api/auth/login' && method === 'POST') {
            return handleLogin(request, env);
        }

        // 静态页面由 Pages 自动处理
        if (path === '/' || path === '/index.html' || (!path.startsWith('/api/') && !path.startsWith('/sub/'))) {
            return env.ASSETS.fetch(request);
        }

        // 内部 API - 使用 env.API_KEY 直接验证（供其他 Worker 调用）
        if (path === '/api/internal/cfip' && method === 'GET') {
            const internalKey = request.headers.get('X-Internal-Key') || url.searchParams.get('key');
            if (internalKey === env.API_KEY) {
                return handleGetCFIPs(env.DB);
            }
            return json({ error: 'Invalid Internal Key' }, 401);
        }

        // Telegram优选IP导入 - 使用 env.API_KEY 直接验证
        if (path === '/api/telegram/import-cfip' && method === 'POST') {
            const telegramApiKey = request.headers.get('X-API-Key');
            if (!telegramApiKey || telegramApiKey !== env.API_KEY) {
                return json({ error: 'Invalid API Key' }, 401);
            }
            return handleTelegramImportCFIP(request, env.DB);
        }

        // 需要认证的 API
        const apiKey = request.headers.get('X-API-Key') || url.searchParams.get('apikey');
        if (!apiKey) return json({ error: 'Missing API Key' }, 401);

        const session = await env.DB.prepare('SELECT * FROM sessions WHERE api_key = ? AND expires_at > datetime("now")').bind(apiKey).first();
        if (!session) return json({ error: 'Invalid API Key' }, 401);

        // ProxyIP
        if (path === '/api/proxyip') {
            if (method === 'GET') return handleGetProxyIPs(env.DB);
            if (method === 'POST') return handleAddProxyIP(request, env.DB);
        }
        if (path.startsWith('/api/proxyip/')) {
            const id = path.split('/')[3];
            if (method === 'PUT') return handleUpdateProxyIP(request, env.DB, id);
            if (method === 'DELETE') return handleDeleteProxyIP(env.DB, id);
        }

        // Outbounds
        if (path === '/api/outbound') {
            if (method === 'GET') return handleGetOutbounds(env.DB);
            if (method === 'POST') return handleAddOutbound(request, env.DB);
        }
        if (path.startsWith('/api/outbound/')) {
            const id = path.split('/')[3];
            if (method === 'PUT') return handleUpdateOutbound(request, env.DB, id);
            if (method === 'DELETE') return handleDeleteOutbound(env.DB, id);
        }

        // CFIP
        if (path === '/api/cfip') {
            if (method === 'GET') return handleGetCFIPs(env.DB);
            if (method === 'POST') return handleAddCFIP(request, env.DB);
        }
        if (path.startsWith('/api/cfip/')) {
            const id = path.split('/')[3];
            if (method === 'PUT') return handleUpdateCFIP(request, env.DB, id);
            if (method === 'DELETE') return handleDeleteCFIP(env.DB, id);
        }

        // ARGO 订阅管理
        if (path === '/api/argo') {
            if (method === 'GET') return handleGetArgoSubscribes(env.DB);
            if (method === 'POST') return handleAddArgoSubscribe(request, env.DB);
        }
        if (path.startsWith('/api/argo/')) {
            const id = path.split('/')[3];
            if (method === 'PUT') return handleUpdateArgoSubscribe(request, env.DB, id);
            if (method === 'DELETE') return handleDeleteArgoSubscribe(env.DB, id);
        }
        if (path === '/api/argo/batch/enable' && method === 'POST') {
            return handleBatchEnableArgoSubscribe(request, env.DB);
        }
        if (path === '/api/argo/batch/delete' && method === 'POST') {
            return handleBatchDeleteArgoSubscribe(request, env.DB);
        }

        // 订阅配置管理
        if (path === '/api/subscribe/config') {
            if (method === 'GET') return handleGetSubscribeConfigs(env.DB, url.searchParams.get('type'));
            if (method === 'POST') return handleAddSubscribeConfig(request, env.DB);
        }
        if (path.startsWith('/api/subscribe/config/')) {
            const id = path.split('/')[4];
            if (method === 'PUT') return handleUpdateSubscribeConfig(request, env.DB, id);
            if (method === 'DELETE') return handleDeleteSubscribeConfig(env.DB, id);
        }

        // 订阅生成 - VLESS（兼容旧接口）
        if (path === '/api/subscribe/vless/config') {
            if (method === 'GET') return handleGetVlessConfig(env.DB);
        }
        if (path === '/api/subscribe/vless/generate') {
            if (method === 'POST') return handleGenerateVlessSubscribe(request, env.DB);
        }

        // 订阅生成 - SS（兼容旧接口）
        if (path === '/api/subscribe/ss/config') {
            if (method === 'GET') return handleGetSSConfig(env.DB);
        }
        if (path === '/api/subscribe/ss/generate') {
            if (method === 'POST') return handleGenerateSSSubscribe(request, env.DB);
        }

        // SOCKS5 测速
        if (path === '/api/test-socks5' && method === 'POST') {
            return handleTestSocks5(request, env.DB);
        }

        // 出站测速
        if (path === '/api/test-outbound' && method === 'POST') {
            return handleTestOutbound(request, env.DB);
        }

        // 出站检测
        if (path === '/api/check-exit' && method === 'POST') {
            return handleCheckExit(request, env.DB);
        }

        return json({ error: 'Not Found' }, 404);
    }
};

// 登录
async function handleLogin(request, env) {
    const { apiKey } = await request.json();
    if (apiKey !== env.API_KEY) return json({ error: 'Invalid API Key' }, 401);

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await env.DB.prepare('INSERT INTO sessions (api_key, expires_at, created_at) VALUES (?, ?, datetime("now"))').bind(token, expires).run();

    return json({ success: true, apiKey: token, expiresAt: expires });
}

// ProxyIP CRUD
async function handleGetProxyIPs(db) {
    const { results } = await db.prepare('SELECT * FROM proxy_ips ORDER BY sort_order, id').all();
    return json({ success: true, data: results });
}

async function handleAddProxyIP(request, db) {
    const { address, remark, enabled = true, sort_order = 0 } = await request.json();
    if (!address) return json({ error: '地址不能为空' }, 400);

    const type = parseProxyType(address);
    // ProxyIP 不允许 socks5 和 http 类型
    if (type === 'socks5' || type === 'http' || type === 'https') {
        return json({ error: 'SOCKS5/HTTP 代理请添加到全局出站' }, 400);
    }

    const max = await db.prepare('SELECT MAX(id) as m FROM proxy_ips').first();
    const finalRemark = remark || `ProxyIP-${(max?.m || 0) + 1}`;

    const r = await db.prepare('INSERT INTO proxy_ips (address, type, remark, enabled, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))')
        .bind(address, type, finalRemark, enabled ? 1 : 0, sort_order).run();

    return json({ success: true, data: { id: r.meta.last_row_id, address, type, remark: finalRemark } });
}

async function handleUpdateProxyIP(request, db, id) {
    const body = await request.json();
    const sets = [], vals = [];
    if (body.address !== undefined) {
        const type = parseProxyType(body.address);
        if (type === 'socks5' || type === 'http' || type === 'https') {
            return json({ error: 'SOCKS5/HTTP 代理请添加到全局出站' }, 400);
        }
        sets.push('address = ?', 'type = ?');
        vals.push(body.address, type);
    }
    if (body.remark !== undefined) { sets.push('remark = ?'); vals.push(body.remark); }
    if (body.enabled !== undefined) { sets.push('enabled = ?'); vals.push(body.enabled ? 1 : 0); }
    if (body.sort_order !== undefined) { sets.push('sort_order = ?'); vals.push(body.sort_order); }
    if (sets.length === 0) return json({ error: '没有要更新的字段' }, 400);

    sets.push('updated_at = datetime("now")');
    vals.push(id);
    await db.prepare(`UPDATE proxy_ips SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    return json({ success: true });
}

async function handleDeleteProxyIP(db, id) {
    await db.prepare('DELETE FROM proxy_ips WHERE id = ?').bind(id).run();
    return json({ success: true });
}

// Outbound CRUD
async function handleGetOutbounds(db) {
    const { results } = await db.prepare('SELECT * FROM outbounds ORDER BY sort_order, id').all();
    return json({ success: true, data: results });
}

async function handleAddOutbound(request, db) {
    const { address, remark, enabled = true, sort_order = 0 } = await request.json();
    if (!address) return json({ error: '地址不能为空' }, 400);

    const type = parseOutboundType(address);
    if (type === 'unknown') {
        return json({ error: '地址格式错误，必须是 socks5:// 或 http:// 开头' }, 400);
    }

    const max = await db.prepare('SELECT MAX(id) as m FROM outbounds').first();
    const finalRemark = remark || `Outbound-${(max?.m || 0) + 1}`;

    const r = await db.prepare('INSERT INTO outbounds (address, type, remark, enabled, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))')
        .bind(address, type, finalRemark, enabled ? 1 : 0, sort_order).run();

    return json({ success: true, data: { id: r.meta.last_row_id, address, type, remark: finalRemark } });
}

async function handleUpdateOutbound(request, db, id) {
    const body = await request.json();
    const sets = [], vals = [];
    if (body.address !== undefined) {
        const type = parseOutboundType(body.address);
        if (type === 'unknown') return json({ error: '地址格式错误，必须是 socks5:// 或 http:// 开头' }, 400);
        sets.push('address = ?', 'type = ?');
        vals.push(body.address, type);
    }
    if (body.remark !== undefined) { sets.push('remark = ?'); vals.push(body.remark); }
    if (body.enabled !== undefined) { sets.push('enabled = ?'); vals.push(body.enabled ? 1 : 0); }
    if (body.sort_order !== undefined) { sets.push('sort_order = ?'); vals.push(body.sort_order); }
    if (sets.length === 0) return json({ error: '没有要更新的字段' }, 400);

    sets.push('updated_at = datetime("now")');
    vals.push(id);
    await db.prepare(`UPDATE outbounds SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    return json({ success: true });
}

async function handleDeleteOutbound(db, id) {
    await db.prepare('DELETE FROM outbounds WHERE id = ?').bind(id).run();
    return json({ success: true });
}

// CFIP CRUD
async function handleGetCFIPs(db) {
    const { results } = await db.prepare('SELECT * FROM cf_ips ORDER BY sort_order, id').all();
    return json({ success: true, data: results });
}

async function handleAddCFIP(request, db) {
    const { address, port = 443, remark, enabled = true, sort_order = 0 } = await request.json();
    if (!address) return json({ error: '地址不能为空' }, 400);

    const max = await db.prepare('SELECT MAX(id) as m FROM cf_ips').first();
    const finalRemark = remark || `CFIP-${(max?.m || 0) + 1}`;

    const r = await db.prepare('INSERT INTO cf_ips (address, port, remark, enabled, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))')
        .bind(address, port, finalRemark, enabled ? 1 : 0, sort_order).run();

    return json({ success: true, data: { id: r.meta.last_row_id, address, port, remark: finalRemark } });
}

async function handleUpdateCFIP(request, db, id) {
    const body = await request.json();
    const sets = [], vals = [];
    if (body.address !== undefined) { sets.push('address = ?'); vals.push(body.address); }
    if (body.port !== undefined) { sets.push('port = ?'); vals.push(body.port); }
    if (body.remark !== undefined) { sets.push('remark = ?'); vals.push(body.remark); }
    if (body.enabled !== undefined) { sets.push('enabled = ?'); vals.push(body.enabled ? 1 : 0); }
    if (body.sort_order !== undefined) { sets.push('sort_order = ?'); vals.push(body.sort_order); }
    if (sets.length === 0) return json({ error: '没有要更新的字段' }, 400);

    sets.push('updated_at = datetime("now")');
    vals.push(id);
    await db.prepare(`UPDATE cf_ips SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    return json({ success: true });
}

async function handleDeleteCFIP(db, id) {
    await db.prepare('DELETE FROM cf_ips WHERE id = ?').bind(id).run();
    return json({ success: true });
}

// ARGO 订阅管理
async function handleGetArgoSubscribes(db) {
    const { results } = await db.prepare('SELECT * FROM argo_subscribe ORDER BY sort_order, id').all();
    return json({ success: true, data: results });
}

async function handleAddArgoSubscribe(request, db) {
    const { template_link, remark, enabled = 1, sort_order = 0 } = await request.json();
    if (!template_link) return json({ error: '模板链接不能为空' }, 400);

    // 生成随机token
    const token = generateRandomToken(32);

    const r = await db.prepare(
        'INSERT INTO argo_subscribe (token, template_link, remark, enabled, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
    ).bind(token, template_link, remark, enabled, sort_order).run();

    return json({ success: true, id: r.meta.last_row_id, token });
}

async function handleUpdateArgoSubscribe(request, db, id) {
    const { template_link, remark, enabled } = await request.json();
    await db.prepare(
        'UPDATE argo_subscribe SET template_link = ?, remark = ?, enabled = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(template_link, remark, enabled, id).run();
    return json({ success: true });
}

async function handleDeleteArgoSubscribe(db, id) {
    await db.prepare('DELETE FROM argo_subscribe WHERE id = ?').bind(id).run();
    return json({ success: true });
}

async function handleBatchEnableArgoSubscribe(request, db) {
    const { ids, enabled } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) return json({ error: 'IDs不能为空' }, 400);

    const placeholders = ids.map(() => '?').join(',');
    await db.prepare(`UPDATE argo_subscribe SET enabled = ?, updated_at = datetime("now") WHERE id IN (${placeholders})`).bind(enabled, ...ids).run();
    return json({ success: true });
}

async function handleBatchDeleteArgoSubscribe(request, db) {
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) return json({ error: 'IDs不能为空' }, 400);

    const placeholders = ids.map(() => '?').join(',');
    await db.prepare(`DELETE FROM argo_subscribe WHERE id IN (${placeholders})`).bind(...ids).run();
    return json({ success: true });
}

// ARGO 订阅生成
async function handleArgoSubscribe(db, token) {
    // 1. 获取该token对应的模板
    const template = await db.prepare(
        'SELECT * FROM argo_subscribe WHERE token = ? AND enabled = 1'
    ).bind(token).first();

    if (!template) {
        return new Response('Subscription not found', { status: 404 });
    }

    // 2. 获取所有启用的CFIP
    const { results: cfips } = await db.prepare(
        'SELECT * FROM cf_ips WHERE enabled = 1 ORDER BY sort_order, id'
    ).all();

    if (!cfips || cfips.length === 0) {
        return new Response('No enabled CFIP found', { status: 404 });
    }

    // 3. 解析模板并替换优选域名/IP
    try {
        const links = generateArgoVlessLinks(template.template_link, cfips);

        // 4. 返回Base64编码的订阅内容
        const subscriptionContent = links.join('\n');
        const base64Content = btoa(subscriptionContent);

        return new Response(base64Content, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-store, no-cache, must-revalidate'
            }
        });
    } catch (error) {
        return new Response(`Error: ${error.message}`, { status: 500 });
    }
}

function generateArgoVlessLinks(templateLink, cfips) {
    const links = [];

    // 判断是VLESS还是VMess格式
    if (templateLink.startsWith('vless://')) {
        // VLESS格式处理
        const vlessRegex = /^vless:\/\/([^@]+)@([^:]+):(\d+)(\?[^#]*)?(#.*)?$/;
        const match = templateLink.match(vlessRegex);

        if (!match) {
            throw new Error('Invalid VLESS template format');
        }

        const [, uuid, , , queryString, fragment] = match;
        const originalRemark = fragment ? decodeURIComponent(fragment.substring(1)) : '';

        // 为每个启用的CFIP生成节点
        for (const cfip of cfips) {
            let host = cfip.address;
            const port = cfip.port || 443;

            // 处理IPv6地址
            if (host.includes(':') && !host.startsWith('[')) {
                host = `[${host}]`;
            }

            // 构建新的VLESS链接（替换host:port）
            const newRemark = `${originalRemark}-${cfip.remark || cfip.address}`;
            const vlessLink = `vless://${uuid}@${host}:${port}${queryString || ''}#${encodeURIComponent(newRemark)}`;

            links.push(vlessLink);
        }
    } else if (templateLink.startsWith('vmess://')) {
        // VMess格式处理
        try {
            // 解码base64
            const base64Data = templateLink.substring(8); // 去掉 "vmess://"
            const jsonStr = decodeURIComponent(escape(atob(base64Data)));
            const vmessConfig = JSON.parse(jsonStr);

            const originalRemark = vmessConfig.ps || '';

            // 为每个启用的CFIP生成节点
            for (const cfip of cfips) {
                // 复制配置对象
                const newConfig = { ...vmessConfig };

                // 替换地址和端口
                newConfig.add = cfip.address;
                newConfig.port = String(cfip.port || 443);

                // 更新备注
                newConfig.ps = `${originalRemark}-${cfip.remark || cfip.address}`;

                // 重新编码为base64
                const newJsonStr = JSON.stringify(newConfig);
                const newBase64 = btoa(unescape(encodeURIComponent(newJsonStr)));
                const vmessLink = `vmess://${newBase64}`;

                links.push(vmessLink);
            }
        } catch (error) {
            throw new Error('Invalid VMess template format: ' + error.message);
        }
    } else {
        throw new Error('Unsupported protocol. Only vless:// and vmess:// are supported');
    }

    return links;
}

function generateRandomToken(length = 16) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

// 订阅
// 订阅配置 CRUD
async function handleGetSubscribeConfigs(db, type) {
    let query = 'SELECT * FROM subscribe_config';
    const params = [];

    if (type) {
        query += ' WHERE type = ?';
        params.push(type);
    }

    query += ' ORDER BY sort_order, id';

    const { results } = await db.prepare(query).bind(...params).all();
    return json({ success: true, data: results });
}

async function handleAddSubscribeConfig(request, db) {
    const { type, uuid, snippetsDomain, proxyPath, remark, enabled = true, sort_order = 0 } = await request.json();

    if (!type || !uuid || !snippetsDomain) {
        return json({ error: '类型、UUID/密码和域名不能为空' }, 400);
    }

    if (type !== 'vless' && type !== 'ss') {
        return json({ error: '类型必须是 vless 或 ss' }, 400);
    }

    const domain = snippetsDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const finalPath = proxyPath || (type === 'ss' ? `/${uuid}` : '/?ed=2560');

    const max = await db.prepare('SELECT MAX(id) as m FROM subscribe_config').first();
    const finalRemark = remark || `${type.toUpperCase()}订阅-${(max?.m || 0) + 1}`;

    // 生成随机 token (16位)
    const token = crypto.randomUUID().replace(/-/g, '').substring(0, 16);

    const r = await db.prepare(
        'INSERT INTO subscribe_config (type, token, uuid, snippets_domain, proxy_path, remark, enabled, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
    ).bind(type, token, uuid, domain, finalPath, finalRemark, enabled ? 1 : 0, sort_order).run();

    return json({ success: true, data: { id: r.meta.last_row_id, token } });
}

async function handleUpdateSubscribeConfig(request, db, id) {
    const body = await request.json();
    const sets = [], vals = [];

    if (body.uuid !== undefined) { sets.push('uuid = ?'); vals.push(body.uuid); }
    if (body.snippetsDomain !== undefined) {
        const domain = body.snippetsDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        sets.push('snippets_domain = ?');
        vals.push(domain);
    }
    if (body.proxyPath !== undefined) { sets.push('proxy_path = ?'); vals.push(body.proxyPath); }
    if (body.remark !== undefined) { sets.push('remark = ?'); vals.push(body.remark); }
    if (body.enabled !== undefined) { sets.push('enabled = ?'); vals.push(body.enabled ? 1 : 0); }
    if (body.sort_order !== undefined) { sets.push('sort_order = ?'); vals.push(body.sort_order); }

    if (sets.length === 0) return json({ error: '没有要更新的字段' }, 400);

    sets.push('updated_at = datetime("now")');
    vals.push(id);

    await db.prepare(`UPDATE subscribe_config SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    return json({ success: true });
}

async function handleDeleteSubscribeConfig(db, id) {
    await db.prepare('DELETE FROM subscribe_config WHERE id = ?').bind(id).run();
    return json({ success: true });
}

// VLESS 订阅配置
async function handleGetVlessConfig(db) {
    const config = await db.prepare('SELECT * FROM subscribe_config WHERE id = 1').first();
    return json({ success: true, data: config });
}

// SS 订阅配置
async function handleGetSSConfig(db) {
    const config = await db.prepare('SELECT * FROM subscribe_config WHERE id = 2').first();
    if (config) {
        // 将 uuid 字段作为 password 返回
        return json({ success: true, data: { password: config.uuid, snippets_domain: config.snippets_domain, proxy_path: config.proxy_path } });
    }
    return json({ success: true, data: null });
}

// VLESS 订阅生成
async function handleGenerateVlessSubscribe(request, db) {
    const { uuid, snippetsDomain, proxyPath = '/?ed=2560' } = await request.json();
    if (!uuid || !snippetsDomain) return json({ error: 'UUID 和域名不能为空' }, 400);

    const domain = snippetsDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    await db.prepare('INSERT OR REPLACE INTO subscribe_config (id, uuid, snippets_domain, proxy_path, updated_at) VALUES (1, ?, ?, ?, datetime("now"))').bind(uuid, domain, proxyPath).run();

    const { results: cfips } = await db.prepare('SELECT * FROM cf_ips WHERE enabled = 1 ORDER BY sort_order, id').all();
    if (cfips.length === 0) return json({ error: '没有启用的 CFIP' }, 400);

    const { results: proxyips } = await db.prepare('SELECT * FROM proxy_ips WHERE enabled = 1 ORDER BY sort_order, id').all();
    const { results: outbounds } = await db.prepare('SELECT * FROM outbounds WHERE enabled = 1 ORDER BY sort_order, id').all();
    const allProxies = [...proxyips, ...outbounds];

    const links = [];
    if (allProxies.length === 0) {
        for (const cfip of cfips) {
            let host = cfip.address;
            if (host.includes(':') && !host.startsWith('[')) host = `[${host}]`;
            const nodeName = cfip.remark || host;
            links.push(`vless://${uuid}@${host}:${cfip.port || 443}?encryption=none&security=tls&sni=${domain}&fp=firefox&allowInsecure=1&type=ws&host=${domain}&path=${encodeURIComponent(proxyPath)}#${encodeURIComponent(nodeName)}`);
        }
    } else {
        for (const proxyip of allProxies) {
            for (const cfip of cfips) {
                let host = cfip.address;
                if (host.includes(':') && !host.startsWith('[')) host = `[${host}]`;
                const path = proxyPath + (proxyPath.includes('?') ? '&' : '?') + `proxyip=${encodeURIComponent(proxyip.address)}`;
                const cfipRemark = cfip.remark || host;
                const nodeName = `${cfipRemark}-${proxyip.remark}`;
                links.push(`vless://${uuid}@${host}:${cfip.port || 443}?encryption=none&security=tls&sni=${domain}&fp=firefox&allowInsecure=1&type=ws&host=${domain}&path=${encodeURIComponent(path)}#${encodeURIComponent(nodeName)}`);
            }
        }
    }

    return json({ success: true, data: { plain: links.join('\n'), count: links.length } });
}

// SS 订阅生成
async function handleGenerateSSSubscribe(request, db) {
    const { password, snippetsDomain, proxyPath } = await request.json();
    if (!password || !snippetsDomain) return json({ error: '密码和域名不能为空' }, 400);

    const domain = snippetsDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const finalPath = proxyPath || `/${password}`;

    // 保存配置，使用 uuid 字段存储 password
    await db.prepare('INSERT OR REPLACE INTO subscribe_config (id, uuid, snippets_domain, proxy_path, updated_at) VALUES (2, ?, ?, ?, datetime("now"))').bind(password, domain, finalPath).run();

    const { results: cfips } = await db.prepare('SELECT * FROM cf_ips WHERE enabled = 1 ORDER BY sort_order, id').all();
    if (cfips.length === 0) return json({ error: '没有启用的 CFIP' }, 400);

    const method = 'none';
    const links = [];

    for (const cfip of cfips) {
        let host = cfip.address;
        if (host.includes(':') && !host.startsWith('[')) host = `[${host}]`;
        const port = cfip.port || 443;
        const nodeName = cfip.remark || host;

        // SS 格式
        const ssConfig = `${method}:${password}`;
        const encodedConfig = btoa(ssConfig);
        // 原版格式: /path/?ed=2560，只对 = 编码，? 和 / 不编码
        const pathWithQuery = finalPath + '/?ed=2560';
        const encodedPath = pathWithQuery.replace(/=/g, '%3D');
        const ssLink = `ss://${encodedConfig}@${host}:${port}?plugin=v2ray-plugin;mode%3Dwebsocket;host%3D${domain};path%3D${encodedPath};tls;sni%3D${domain};skip-cert-verify%3Dtrue;mux%3D0#${encodeURIComponent(nodeName)}`;
        links.push(ssLink);
    }

    return json({ success: true, data: { plain: links.join('\n'), count: links.length } });
}

// 通过 token 生成订阅
async function handleSubscribeByToken(db, token, url) {
    const config = await db.prepare('SELECT * FROM subscribe_config WHERE token = ? AND enabled = 1').bind(token).first();
    if (!config) return new Response('Not Found', { status: 404 });

    // 根据类型调用对应的订阅生成函数
    if (config.type === 'vless') {
        return handleSubscribe(db, config.uuid, url, config);
    } else if (config.type === 'ss') {
        return handleSSSubscribe(db, config.uuid, url, config);
    }

    return new Response('Invalid Config Type', { status: 400 });
}

// 通过配置 ID 生成订阅 (已废弃，保留用于兼容)
async function handleSubscribeByConfigId(db, configId, url) {
    const config = await db.prepare('SELECT * FROM subscribe_config WHERE id = ? AND enabled = 1').bind(configId).first();
    if (!config) return new Response('Not Found', { status: 404 });

    // 根据类型调用对应的订阅生成函数
    if (config.type === 'vless') {
        return handleSubscribe(db, config.uuid, url, config);
    } else if (config.type === 'ss') {
        return handleSSSubscribe(db, config.uuid, url, config);
    }

    return new Response('Invalid Config Type', { status: 400 });
}

// 公开订阅
async function handleSubscribe(db, uuid, url, configParam = null) {
    let config = configParam;
    if (!config) {
        config = await db.prepare('SELECT * FROM subscribe_config WHERE id = 1').first();
    }
    if (!config || uuid !== config.uuid) return new Response('Not Found', { status: 404 });

    // 解析URL参数
    const urlParams = new URL(url).searchParams;
    const proxyipIds = urlParams.get('proxyip')?.split(',').filter(id => id.trim()) || [];
    const outboundIds = urlParams.get('outbound')?.split(',').filter(id => id.trim()) || [];
    const cfipIds = urlParams.get('cfip')?.split(',').filter(id => id.trim()) || [];

    // 获取CFIP列表
    let cfips = [];
    if (cfipIds.length > 0) {
        // 指定了CFIP ID，获取指定的CFIP（不管启用状态）
        const placeholders = cfipIds.map(() => '?').join(',');
        const { results } = await db.prepare(`SELECT * FROM cf_ips WHERE id IN (${placeholders}) ORDER BY sort_order, id`).bind(...cfipIds).all();
        cfips = results;
    } else {
        // 未指定CFIP ID，获取所有启用的CFIP
        const { results } = await db.prepare('SELECT * FROM cf_ips WHERE enabled = 1 ORDER BY sort_order, id').all();
        cfips = results;
    }

    if (cfips.length === 0) return new Response('No CFIP', { status: 404 });

    // 获取ProxyIP和Outbound列表
    let proxyips = [];
    let outbounds = [];

    if (proxyipIds.length > 0) {
        // 指定了ProxyIP ID，获取指定的ProxyIP（不管启用状态）
        const placeholders = proxyipIds.map(() => '?').join(',');
        const { results } = await db.prepare(`SELECT * FROM proxy_ips WHERE id IN (${placeholders}) ORDER BY sort_order, id`).bind(...proxyipIds).all();
        proxyips = results;
    } else if (outboundIds.length === 0) {
        // 未指定任何ID，获取所有启用的ProxyIP
        const { results } = await db.prepare('SELECT * FROM proxy_ips WHERE enabled = 1 ORDER BY sort_order, id').all();
        proxyips = results;
    }

    if (outboundIds.length > 0) {
        // 指定了Outbound ID，获取指定的Outbound（不管启用状态）
        const placeholders = outboundIds.map(() => '?').join(',');
        const { results } = await db.prepare(`SELECT * FROM outbounds WHERE id IN (${placeholders}) ORDER BY sort_order, id`).bind(...outboundIds).all();
        outbounds = results;
    } else if (proxyipIds.length === 0) {
        // 未指定任何ID，获取所有启用的Outbound
        const { results } = await db.prepare('SELECT * FROM outbounds WHERE enabled = 1 ORDER BY sort_order, id').all();
        outbounds = results;
    }

    const proxyPath = config.proxy_path || '/?ed=2560';

    // 合并 ProxyIP 和 Outbound
    const allProxies = [...proxyips, ...outbounds];

    // 生成所有 ProxyIP × CFIP 的组合（相同 ProxyIP 的放在一起）
    const links = [];
    if (allProxies.length === 0) {
        // 没有 ProxyIP，只生成 CFIP
        for (const cfip of cfips) {
            let host = cfip.address;
            if (host.includes(':') && !host.startsWith('[')) host = `[${host}]`;
            const nodeName = (cfip.remark || host) + '-VLESS';
            links.push(`vless://${uuid}@${host}:${cfip.port || 443}?encryption=none&security=tls&sni=${config.snippets_domain}&fp=firefox&allowInsecure=1&type=ws&host=${config.snippets_domain}&path=${encodeURIComponent(proxyPath)}#${encodeURIComponent(nodeName)}`);
        }
    } else {
        // 为每个 ProxyIP 生成所有 CFIP 的组合
        for (const proxyip of allProxies) {
            for (const cfip of cfips) {
                let host = cfip.address;
                if (host.includes(':') && !host.startsWith('[')) host = `[${host}]`;

                const path = proxyPath + (proxyPath.includes('?') ? '&' : '?') + `proxyip=${encodeURIComponent(proxyip.address)}`;
                const cfipRemark = cfip.remark || host;
                const nodeName = `${cfipRemark}-${proxyip.remark}-VLESS`;

                links.push(`vless://${uuid}@${host}:${cfip.port || 443}?encryption=none&security=tls&sni=${config.snippets_domain}&fp=firefox&allowInsecure=1&type=ws&host=${config.snippets_domain}&path=${encodeURIComponent(path)}#${encodeURIComponent(nodeName)}`);
            }
        }
    }

    return new Response(btoa(unescape(encodeURIComponent(links.join('\n')))), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
    });
}

// SS 公开订阅
async function handleSSSubscribe(db, password, url, configParam = null) {
    let config = configParam;
    if (!config) {
        config = await db.prepare('SELECT * FROM subscribe_config WHERE id = 2').first();
    }
    if (!config || password !== config.uuid) return new Response('Not Found', { status: 404 });

    // 解析URL参数
    const urlParams = new URL(url).searchParams;
    const proxyipIds = urlParams.get('proxyip')?.split(',').filter(id => id.trim()) || [];
    const outboundIds = urlParams.get('outbound')?.split(',').filter(id => id.trim()) || [];
    const cfipIds = urlParams.get('cfip')?.split(',').filter(id => id.trim()) || [];

    // 获取CFIP列表
    let cfips = [];
    if (cfipIds.length > 0) {
        // 指定了CFIP ID，获取指定的CFIP（不管启用状态）
        const placeholders = cfipIds.map(() => '?').join(',');
        const { results } = await db.prepare(`SELECT * FROM cf_ips WHERE id IN (${placeholders}) ORDER BY sort_order, id`).bind(...cfipIds).all();
        cfips = results;
    } else {
        // 未指定CFIP ID，获取所有启用的CFIP
        const { results } = await db.prepare('SELECT * FROM cf_ips WHERE enabled = 1 ORDER BY sort_order, id').all();
        cfips = results;
    }

    if (cfips.length === 0) return new Response('No CFIP', { status: 404 });

    // 获取ProxyIP和Outbound列表
    let proxyips = [];
    let outbounds = [];

    if (proxyipIds.length > 0) {
        // 指定了ProxyIP ID，获取指定的ProxyIP（不管启用状态）
        const placeholders = proxyipIds.map(() => '?').join(',');
        const { results } = await db.prepare(`SELECT * FROM proxy_ips WHERE id IN (${placeholders}) ORDER BY sort_order, id`).bind(...proxyipIds).all();
        proxyips = results;
    } else if (outboundIds.length === 0) {
        // 未指定任何ID，获取所有启用的ProxyIP
        const { results } = await db.prepare('SELECT * FROM proxy_ips WHERE enabled = 1 ORDER BY sort_order, id').all();
        proxyips = results;
    }

    if (outboundIds.length > 0) {
        // 指定了Outbound ID，获取指定的Outbound（不管启用状态）
        const placeholders = outboundIds.map(() => '?').join(',');
        const { results } = await db.prepare(`SELECT * FROM outbounds WHERE id IN (${placeholders}) ORDER BY sort_order, id`).bind(...outboundIds).all();
        outbounds = results;
    } else if (proxyipIds.length === 0) {
        // 未指定任何ID，获取所有启用的Outbound
        const { results } = await db.prepare('SELECT * FROM outbounds WHERE enabled = 1 ORDER BY sort_order, id').all();
        outbounds = results;
    }

    const proxyPath = config.proxy_path || '/';
    const method = 'none';

    // 合并 ProxyIP 和 Outbound
    const allProxies = [...proxyips, ...outbounds];

    const links = [];
    if (allProxies.length === 0) {
        // 没有 ProxyIP，只生成 CFIP
        for (const cfip of cfips) {
            let host = cfip.address;
            if (host.includes(':') && !host.startsWith('[')) host = `[${host}]`;
            const port = cfip.port || 443;
            const nodeName = (cfip.remark || host) + '-SS';

            const ssConfig = `${method}:${password}`;
            const encodedConfig = btoa(ssConfig);
            const pathWithQuery = proxyPath + '/?ed=2560';
            const encodedPath = pathWithQuery.replace(/=/g, '%3D');
            const ssLink = `ss://${encodedConfig}@${host}:${port}?plugin=v2ray-plugin;mode%3Dwebsocket;host%3D${config.snippets_domain};path%3D${encodedPath};tls;sni%3D${config.snippets_domain};skip-cert-verify%3Dtrue;mux%3D0#${encodeURIComponent(nodeName)}`;
            links.push(ssLink);
        }
    } else {
        // 为每个 ProxyIP 生成所有 CFIP 的组合
        for (const proxyip of allProxies) {
            for (const cfip of cfips) {
                let host = cfip.address;
                if (host.includes(':') && !host.startsWith('[')) host = `[${host}]`;
                const port = cfip.port || 443;

                const path = proxyPath + (proxyPath.includes('?') ? '&' : '?') + `proxyip=${encodeURIComponent(proxyip.address)}`;
                const pathWithQuery = path + '&ed=2560';
                const encodedPath = pathWithQuery.replace(/=/g, '%3D');

                const cfipRemark = cfip.remark || host;
                const nodeName = `${cfipRemark}-${proxyip.remark}-SS`;

                const ssConfig = `${method}:${password}`;
                const encodedConfig = btoa(ssConfig);
                const ssLink = `ss://${encodedConfig}@${host}:${port}?plugin=v2ray-plugin;mode%3Dwebsocket;host%3D${config.snippets_domain};path%3D${encodedPath};tls;sni%3D${config.snippets_domain};skip-cert-verify%3Dtrue;mux%3D0#${encodeURIComponent(nodeName)}`;
                links.push(ssLink);
            }
        }
    }

    return new Response(btoa(unescape(encodeURIComponent(links.join('\n')))), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
    });
}

// SOCKS5 测速
async function handleTestSocks5(request, db) {
    try {
        const { id } = await request.json();

        // 获取要测试的 ProxyIP
        let proxyips = [];
        if (id) {
            // 测试单个
            const proxy = await db.prepare('SELECT * FROM proxy_ips WHERE id = ? AND type = ?').bind(id, 'socks5').first();
            if (proxy) proxyips = [proxy];
        } else {
            // 测试所有 SOCKS5
            const { results } = await db.prepare('SELECT * FROM proxy_ips WHERE type = ? ORDER BY sort_order, id').bind('socks5').all();
            proxyips = results;
        }

        if (proxyips.length === 0) {
            return json({ error: 'No SOCKS5 proxy found' }, 404);
        }

        const results = [];
        for (const proxy of proxyips) {
            const startTime = Date.now();
            let socket = null;
            let writer = null;
            let reader = null;

            try {
                const parsed = parseSocks5Address(proxy.address);

                // 创建超时 Promise
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Connection timeout')), 5000);
                });

                // 连接 SOCKS5 服务器
                const connectPromise = (async () => {
                    socket = connect({
                        hostname: parsed.host,
                        port: parsed.port
                    });

                    writer = socket.writable.getWriter();
                    reader = socket.readable.getReader();

                    // 发送 SOCKS5 握手
                    const authMethods = parsed.username && parsed.password ?
                        new Uint8Array([0x05, 0x02, 0x00, 0x02]) :
                        new Uint8Array([0x05, 0x01, 0x00]);

                    await writer.write(authMethods);

                    // 读取服务器响应
                    const methodResponse = await reader.read();

                    if (methodResponse.done || methodResponse.value.byteLength < 2) {
                        throw new Error('Invalid method response');
                    }

                    const responseArray = new Uint8Array(methodResponse.value);
                    if (responseArray[0] !== 0x05) {
                        throw new Error('Invalid SOCKS version');
                    }

                    const selectedMethod = responseArray[1];

                    // 如果服务器选择了用户名密码认证
                    if (selectedMethod === 0x02) {
                        if (!parsed.username || !parsed.password) {
                            throw new Error('Server requires authentication');
                        }

                        const encoder = new TextEncoder();
                        const userBytes = encoder.encode(parsed.username);
                        const passBytes = encoder.encode(parsed.password);
                        const authPacket = new Uint8Array(3 + userBytes.length + passBytes.length);
                        authPacket[0] = 0x01;
                        authPacket[1] = userBytes.length;
                        authPacket.set(userBytes, 2);
                        authPacket[2 + userBytes.length] = passBytes.length;
                        authPacket.set(passBytes, 3 + userBytes.length);

                        await writer.write(authPacket);
                        const authResponse = await reader.read();

                        if (authResponse.done || authResponse.value.byteLength < 2) {
                            throw new Error('Invalid auth response');
                        }

                        if (new Uint8Array(authResponse.value)[1] !== 0x00) {
                            throw new Error('Authentication failed');
                        }
                    } else if (selectedMethod === 0xFF) {
                        throw new Error('No acceptable methods');
                    } else if (selectedMethod !== 0x00) {
                        throw new Error(`Unsupported auth method: ${selectedMethod}`);
                    }

                    // 测试连接到 1.1.1.1:80
                    const connectPacket = new Uint8Array([
                        0x05, 0x01, 0x00, 0x01,
                        0x01, 0x01, 0x01, 0x01,
                        0x00, 0x50
                    ]);

                    await writer.write(connectPacket);
                    const connectResponse = await reader.read();

                    if (connectResponse.done || connectResponse.value.byteLength < 2) {
                        throw new Error('Invalid connect response');
                    }

                    const connectArray = new Uint8Array(connectResponse.value);
                    if (connectArray[1] !== 0x00) {
                        throw new Error(`Connection failed with code: ${connectArray[1]}`);
                    }

                    return Date.now() - startTime;
                })();

                // 等待连接或超时
                const latency = await Promise.race([connectPromise, timeoutPromise]);

                results.push({
                    id: proxy.id,
                    remark: proxy.remark,
                    address: proxy.address,
                    status: 'online',
                    latency
                });
            } catch (error) {
                results.push({
                    id: proxy.id,
                    remark: proxy.remark,
                    address: proxy.address,
                    status: 'offline',
                    latency: -1,
                    error: error.message
                });
            } finally {
                // 清理资源
                try {
                    if (writer) writer.releaseLock();
                    if (reader) reader.releaseLock();
                    if (socket) socket.close();
                } catch (e) { }
            }
        }

        return json({ success: true, results });
    } catch (error) {
        return json({ error: 'Test failed: ' + error.message }, 500);
    }
}

// 解析 SOCKS5 地址
function parseSocks5Address(address) {
    // socks5://user:pass@host:port 或 socks://user:pass@host:port
    const match = address.match(/^socks5?:\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/);
    if (!match) {
        throw new Error('Invalid SOCKS5 address format');
    }
    return {
        username: match[1] || '',
        password: match[2] || '',
        host: match[3],
        port: parseInt(match[4])
    };
}

// 解析 HTTP 代理地址
function parseHttpAddress(address) {
    // http://user:pass@host:port 或 http://host:port
    const match = address.match(/^https?:\/\/(?:([^:]+):([^@]+)@)?([^:]+):(\d+)$/);
    if (!match) {
        throw new Error('Invalid HTTP proxy address format');
    }
    return {
        username: match[1] || '',
        password: match[2] || '',
        host: match[3],
        port: parseInt(match[4])
    };
}

// 出站检测（检查代理的出口 IP 信息）
async function handleCheckExit(request, db) {
    try {
        const { id, ids } = await request.json();

        // 获取要检测的 Outbound
        let outbounds = [];
        if (id) {
            // 检测单个
            const outbound = await db.prepare('SELECT * FROM outbounds WHERE id = ?').bind(id).first();
            if (outbound) outbounds = [outbound];
        } else if (ids && Array.isArray(ids) && ids.length > 0) {
            // 检测指定的多个
            const placeholders = ids.map(() => '?').join(',');
            const { results } = await db.prepare(`SELECT * FROM outbounds WHERE id IN (${placeholders}) ORDER BY sort_order, id`).bind(...ids).all();
            outbounds = results;
        } else {
            // 检测所有
            const { results } = await db.prepare('SELECT * FROM outbounds ORDER BY sort_order, id').all();
            outbounds = results;
        }

        if (outbounds.length === 0) {
            return json({ error: '没有找到出站代理' }, 404);
        }

        const results = [];
        for (const outbound of outbounds) {
            let socket = null;
            let writer = null;
            let reader = null;

            try {
                // 解析代理地址获取主机名
                const parsed = outbound.type === 'socks5'
                    ? parseSocks5Address(outbound.address)
                    : parseHttpAddress(outbound.address);

                // 获取入口信息（代理服务器本身的IP信息）
                let entryInfo = null;
                try {
                    const entryIPResponse = await fetch(`https://api.ipapi.is/?q=${parsed.host}`);
                    if (entryIPResponse.ok) {
                        entryInfo = await entryIPResponse.json();
                    }
                } catch (e) {
                    console.error('Failed to get entry info:', e);
                }

                if (outbound.type === 'socks5') {
                    // SOCKS5 代理检测
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Connection timeout')), 15000);
                    });

                    const checkPromise = (async () => {
                        socket = connect({
                            hostname: parsed.host,
                            port: parsed.port
                        });

                        writer = socket.writable.getWriter();
                        reader = socket.readable.getReader();

                        // SOCKS5 握手
                        const authMethods = parsed.username && parsed.password ?
                            new Uint8Array([0x05, 0x02, 0x00, 0x02]) :
                            new Uint8Array([0x05, 0x01, 0x00]);

                        await writer.write(authMethods);
                        const methodResponse = await reader.read();

                        if (methodResponse.done || methodResponse.value.byteLength < 2) {
                            throw new Error('Invalid method response');
                        }

                        const responseArray = new Uint8Array(methodResponse.value);
                        if (responseArray[0] !== 0x05) {
                            throw new Error('Invalid SOCKS version');
                        }

                        const selectedMethod = responseArray[1];

                        if (selectedMethod === 0x02) {
                            if (!parsed.username || !parsed.password) {
                                throw new Error('Server requires authentication');
                            }

                            const encoder = new TextEncoder();
                            const userBytes = encoder.encode(parsed.username);
                            const passBytes = encoder.encode(parsed.password);
                            const authPacket = new Uint8Array(3 + userBytes.length + passBytes.length);
                            authPacket[0] = 0x01;
                            authPacket[1] = userBytes.length;
                            authPacket.set(userBytes, 2);
                            authPacket[2 + userBytes.length] = passBytes.length;
                            authPacket.set(passBytes, 3 + userBytes.length);

                            await writer.write(authPacket);
                            const authResponse = await reader.read();

                            if (authResponse.done || authResponse.value.byteLength < 2) {
                                throw new Error('Invalid auth response');
                            }

                            if (new Uint8Array(authResponse.value)[1] !== 0x00) {
                                throw new Error('Authentication failed');
                            }
                        } else if (selectedMethod === 0xFF) {
                            throw new Error('No acceptable methods');
                        } else if (selectedMethod !== 0x00) {
                            throw new Error(`Unsupported auth method: ${selectedMethod}`);
                        }

                        // 连接到 check.socks5.090227.xyz
                        const targetHost = 'check.socks5.090227.xyz';
                        const targetPort = 80;
                        const hostBytes = new TextEncoder().encode(targetHost);
                        const connectPacket = new Uint8Array([
                            0x05, 0x01, 0x00, 0x03,
                            hostBytes.length,
                            ...hostBytes,
                            (targetPort >> 8) & 0xFF,
                            targetPort & 0xFF
                        ]);

                        await writer.write(connectPacket);
                        const connectResponse = await reader.read();

                        if (connectResponse.done || connectResponse.value.byteLength < 2) {
                            throw new Error('Invalid connect response');
                        }

                        const connectArray = new Uint8Array(connectResponse.value);
                        if (connectArray[1] !== 0x00) {
                            throw new Error(`Connection failed with code: ${connectArray[1]}`);
                        }

                        // 发送 HTTP 请求获取 /cdn-cgi/trace
                        const encoder = new TextEncoder();
                        const httpRequest = `GET /cdn-cgi/trace HTTP/1.1\r\nHost: ${targetHost}\r\nConnection: close\r\n\r\n`;
                        await writer.write(encoder.encode(httpRequest));

                        // 读取响应
                        let responseData = '';
                        const decoder = new TextDecoder();
                        let chunks = 0;
                        while (chunks < 100) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            responseData += decoder.decode(value, { stream: true });
                            chunks++;
                        }

                        // 解析响应获取IP
                        const ipMatch = responseData.match(/ip=([\d\.]+)/);
                        if (!ipMatch) {
                            throw new Error('无法从响应中提取IP地址');
                        }

                        const exitIP = ipMatch[1].trim();

                        // 使用 ipapi.is API 获取详细信息
                        const ipInfoResponse = await fetch(`https://api.ipapi.is/?q=${exitIP}`);
                        if (!ipInfoResponse.ok) {
                            throw new Error(`IP信息查询失败: ${ipInfoResponse.status}`);
                        }

                        const ipInfo = await ipInfoResponse.json();

                        return {
                            ip: exitIP,
                            country: ipInfo.location?.country || 'Unknown',
                            city: ipInfo.location?.city || 'Unknown',
                            org: ipInfo.asn?.org || 'Unknown',
                            asn: ipInfo.asn?.asn ? `AS${ipInfo.asn.asn}` : 'Unknown',
                            fullExitInfo: ipInfo,
                            fullEntryInfo: ipInfo  // 入口和出口使用相同的信息
                        };
                    })();

                    const exitInfo = await Promise.race([checkPromise, timeoutPromise]);

                    // 保存到数据库（只保留 country 和 city 用于列表显示，详细信息存在 JSON 中）
                    await db.prepare('UPDATE outbounds SET exit_country = ?, exit_city = ?, entry_info_json = ?, exit_info_json = ?, checked_at = datetime("now") WHERE id = ?')
                        .bind(
                            exitInfo.country,
                            exitInfo.city,
                            exitInfo.fullEntryInfo ? JSON.stringify(exitInfo.fullEntryInfo) : null,
                            exitInfo.fullExitInfo ? JSON.stringify(exitInfo.fullExitInfo) : null,
                            outbound.id
                        ).run();

                    results.push({
                        id: outbound.id,
                        success: true,
                        ...exitInfo
                    });
                } else if (outbound.type === 'http') {
                    // HTTP 代理检测
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Connection timeout')), 15000);
                    });

                    const checkPromise = (async () => {
                        socket = connect({
                            hostname: parsed.host,
                            port: parsed.port
                        });

                        writer = socket.writable.getWriter();
                        reader = socket.readable.getReader();

                        // 发送 HTTP CONNECT 请求
                        const encoder = new TextEncoder();
                        const targetHost = 'check.socks5.090227.xyz';
                        const targetPort = 80;
                        let connectRequest = `CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\nHost: ${targetHost}:${targetPort}\r\n`;

                        if (parsed.username && parsed.password) {
                            const auth = btoa(`${parsed.username}:${parsed.password}`);
                            connectRequest += `Proxy-Authorization: Basic ${auth}\r\n`;
                        }

                        connectRequest += `\r\n`;
                        await writer.write(encoder.encode(connectRequest));

                        // 读取 CONNECT 响应
                        let connectResponseData = '';
                        const decoder = new TextDecoder();
                        let chunks = 0;
                        while (chunks < 10) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            connectResponseData += decoder.decode(value, { stream: true });
                            chunks++;
                            if (connectResponseData.includes('\r\n\r\n')) break;
                        }

                        if (!connectResponseData.includes('200')) {
                            throw new Error('Proxy connection failed: ' + connectResponseData.split('\r\n')[0]);
                        }

                        // 发送 HTTP 请求获取 /cdn-cgi/trace
                        const httpRequest = `GET /cdn-cgi/trace HTTP/1.1\r\nHost: ${targetHost}\r\nConnection: close\r\n\r\n`;
                        await writer.write(encoder.encode(httpRequest));

                        // 读取响应
                        let responseData = '';
                        chunks = 0;
                        while (chunks < 100) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            responseData += decoder.decode(value, { stream: true });
                            chunks++;
                        }

                        // 解析响应获取IP
                        const ipMatch = responseData.match(/ip=(.*)/);
                        if (!ipMatch) {
                            throw new Error('无法从响应中提取IP地址');
                        }

                        const exitIP = ipMatch[1].trim();

                        // 使用 ipapi.is API 获取详细信息
                        const ipInfoResponse = await fetch(`https://api.ipapi.is/?q=${exitIP}`);
                        if (!ipInfoResponse.ok) {
                            throw new Error(`IP信息查询失败: ${ipInfoResponse.status}`);
                        }

                        const ipInfo = await ipInfoResponse.json();

                        return {
                            ip: exitIP,
                            country: ipInfo.location?.country || 'Unknown',
                            city: ipInfo.location?.city || 'Unknown',
                            org: ipInfo.asn?.org || 'Unknown',
                            asn: ipInfo.asn?.asn ? `AS${ipInfo.asn.asn}` : 'Unknown',
                            fullExitInfo: ipInfo,
                            fullEntryInfo: ipInfo  // 入口和出口使用相同的信息
                        };
                    })();

                    const exitInfo = await Promise.race([checkPromise, timeoutPromise]);

                    // 保存到数据库（只保留 country 和 city 用于列表显示，详细信息存在 JSON 中）
                    await db.prepare('UPDATE outbounds SET exit_country = ?, exit_city = ?, entry_info_json = ?, exit_info_json = ?, checked_at = datetime("now") WHERE id = ?')
                        .bind(
                            exitInfo.country,
                            exitInfo.city,
                            exitInfo.fullEntryInfo ? JSON.stringify(exitInfo.fullEntryInfo) : null,
                            exitInfo.fullExitInfo ? JSON.stringify(exitInfo.fullExitInfo) : null,
                            outbound.id
                        ).run();

                    results.push({
                        id: outbound.id,
                        success: true,
                        ...exitInfo
                    });
                } else {
                    throw new Error('Unsupported outbound type: ' + outbound.type);
                }
            } catch (error) {
                results.push({
                    id: outbound.id,
                    success: false,
                    error: error.message
                });
            } finally {
                // 清理资源
                try {
                    if (writer) writer.releaseLock();
                    if (reader) reader.releaseLock();
                    if (socket) socket.close();
                } catch (e) { }
            }
        }

        return json({ success: true, results });
    } catch (error) {
        return json({ error: 'Check failed: ' + error.message }, 500);
    }
}

// 出站测速（支持 SOCKS5 和 HTTP）
async function handleTestOutbound(request, db) {
    try {
        const { id } = await request.json();

        // 获取要测试的 Outbound
        let outbounds = [];
        if (id) {
            // 测试单个
            const outbound = await db.prepare('SELECT * FROM outbounds WHERE id = ?').bind(id).first();
            if (outbound) outbounds = [outbound];
        } else {
            // 测试所有
            const { results } = await db.prepare('SELECT * FROM outbounds ORDER BY sort_order, id').all();
            outbounds = results;
        }

        if (outbounds.length === 0) {
            return json({ error: 'No outbound found' }, 404);
        }

        const results = [];
        for (const outbound of outbounds) {
            const startTime = Date.now();
            let socket = null;
            let writer = null;
            let reader = null;

            try {
                if (outbound.type === 'socks5') {
                    // SOCKS5 测速逻辑
                    const parsed = parseSocks5Address(outbound.address);

                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Connection timeout')), 5000);
                    });

                    const connectPromise = (async () => {
                        socket = connect({
                            hostname: parsed.host,
                            port: parsed.port
                        });

                        writer = socket.writable.getWriter();
                        reader = socket.readable.getReader();

                        // SOCKS5 握手
                        const authMethods = parsed.username && parsed.password ?
                            new Uint8Array([0x05, 0x02, 0x00, 0x02]) :
                            new Uint8Array([0x05, 0x01, 0x00]);

                        await writer.write(authMethods);
                        const methodResponse = await reader.read();

                        if (methodResponse.done || methodResponse.value.byteLength < 2) {
                            throw new Error('Invalid method response');
                        }

                        const responseArray = new Uint8Array(methodResponse.value);
                        if (responseArray[0] !== 0x05) {
                            throw new Error('Invalid SOCKS version');
                        }

                        const selectedMethod = responseArray[1];

                        if (selectedMethod === 0x02) {
                            if (!parsed.username || !parsed.password) {
                                throw new Error('Server requires authentication');
                            }

                            const encoder = new TextEncoder();
                            const userBytes = encoder.encode(parsed.username);
                            const passBytes = encoder.encode(parsed.password);
                            const authPacket = new Uint8Array(3 + userBytes.length + passBytes.length);
                            authPacket[0] = 0x01;
                            authPacket[1] = userBytes.length;
                            authPacket.set(userBytes, 2);
                            authPacket[2 + userBytes.length] = passBytes.length;
                            authPacket.set(passBytes, 3 + userBytes.length);

                            await writer.write(authPacket);
                            const authResponse = await reader.read();

                            if (authResponse.done || authResponse.value.byteLength < 2) {
                                throw new Error('Invalid auth response');
                            }

                            if (new Uint8Array(authResponse.value)[1] !== 0x00) {
                                throw new Error('Authentication failed');
                            }
                        } else if (selectedMethod === 0xFF) {
                            throw new Error('No acceptable methods');
                        } else if (selectedMethod !== 0x00) {
                            throw new Error(`Unsupported auth method: ${selectedMethod}`);
                        }

                        // 测试连接到 1.1.1.1:80
                        const connectPacket = new Uint8Array([
                            0x05, 0x01, 0x00, 0x01,
                            0x01, 0x01, 0x01, 0x01,
                            0x00, 0x50
                        ]);

                        await writer.write(connectPacket);
                        const connectResponse = await reader.read();

                        if (connectResponse.done || connectResponse.value.byteLength < 2) {
                            throw new Error('Invalid connect response');
                        }

                        const connectArray = new Uint8Array(connectResponse.value);
                        if (connectArray[1] !== 0x00) {
                            throw new Error(`Connection failed with code: ${connectArray[1]}`);
                        }

                        return Date.now() - startTime;
                    })();

                    const latency = await Promise.race([connectPromise, timeoutPromise]);

                    results.push({
                        id: outbound.id,
                        remark: outbound.remark,
                        address: outbound.address,
                        status: 'online',
                        latency
                    });
                } else if (outbound.type === 'http') {
                    // HTTP 代理测速逻辑
                    const parsed = parseHttpAddress(outbound.address);

                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Connection timeout')), 5000);
                    });

                    const connectPromise = (async () => {
                        socket = connect({
                            hostname: parsed.host,
                            port: parsed.port
                        });

                        writer = socket.writable.getWriter();
                        reader = socket.readable.getReader();

                        // 发送 HTTP CONNECT 请求
                        const encoder = new TextEncoder();
                        let connectRequest = `CONNECT 1.1.1.1:80 HTTP/1.1\r\nHost: 1.1.1.1:80\r\n`;

                        // 如果有认证信息
                        if (parsed.username && parsed.password) {
                            const auth = btoa(`${parsed.username}:${parsed.password}`);
                            connectRequest += `Proxy-Authorization: Basic ${auth}\r\n`;
                        }

                        connectRequest += `\r\n`;

                        await writer.write(encoder.encode(connectRequest));

                        // 读取响应
                        const response = await reader.read();

                        if (response.done) {
                            throw new Error('No response from proxy');
                        }

                        const decoder = new TextDecoder();
                        const responseText = decoder.decode(response.value);

                        // 检查是否成功（HTTP/1.1 200 或 HTTP/1.0 200）
                        if (!responseText.includes('200')) {
                            throw new Error('Proxy connection failed: ' + responseText.split('\r\n')[0]);
                        }

                        return Date.now() - startTime;
                    })();

                    const latency = await Promise.race([connectPromise, timeoutPromise]);

                    results.push({
                        id: outbound.id,
                        remark: outbound.remark,
                        address: outbound.address,
                        status: 'online',
                        latency
                    });
                } else {
                    throw new Error('Unsupported outbound type: ' + outbound.type);
                }
            } catch (error) {
                results.push({
                    id: outbound.id,
                    remark: outbound.remark,
                    address: outbound.address,
                    status: 'offline',
                    latency: -1,
                    error: error.message
                });
            } finally {
                // 清理资源
                try {
                    if (writer) writer.releaseLock();
                    if (reader) reader.releaseLock();
                    if (socket) socket.close();
                } catch (e) { }
            }
        }

        return json({ success: true, results });
    } catch (error) {
        return json({ error: 'Test failed: ' + error.message }, 500);
    }
}

// Telegram优选IP导入接口
async function handleTelegramImportCFIP(request, db) {
    try {
        const { address, port = 443, remark } = await request.json();

        // 验证必填字段
        if (!address) {
            return json({ error: '地址不能为空' }, 400);
        }

        // 检查是否已存在
        const existing = await db.prepare('SELECT id FROM cf_ips WHERE address = ? AND port = ?').bind(address, port).first();
        if (existing) {
            return json({ error: '该CFIP已存在', existingId: existing.id }, 409);
        }

        // 获取当前最大排序值
        const maxSort = await db.prepare('SELECT MAX(sort_order) as max FROM cf_ips').first();
        const sortOrder = (maxSort?.max || 0) + 1;

        // 插入数据
        const result = await db.prepare(
            'INSERT INTO cf_ips (address, port, remark, enabled, sort_order, created_at) VALUES (?, ?, ?, 1, ?, datetime("now"))'
        ).bind(address, port, remark || address, sortOrder).run();

        return json({
            success: true,
            data: {
                id: result.meta.last_row_id,
                address,
                port,
                remark: remark || address,
                enabled: true
            }
        });
    } catch (error) {
        return json({ error: 'Import failed: ' + error.message }, 500);
    }
}

// 修改 export default 以适配 Pages

