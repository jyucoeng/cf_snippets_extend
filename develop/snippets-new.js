import { connect } from 'cloudflare:sockets';

// ==========================================
// [ 修改此处 ]
let yourUUID = '69a33565-c524-4c8d-b46b-0eb7df43fa36';
let proxyIP = '';
// ==========================================

const _0x4e = (s) => new TextEncoder().encode(s);
const _0x8f = (a) => new TextDecoder().decode(a);

function _0xbb(arr, o = 0) {
    const h = [...arr.slice(o, o + 16)].map(b => b.toString(16).padStart(2, '0')).join('');
    return `${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}-${h.substring(16, 20)}-${h.substring(20)}`;
}

function _0xcc(b) {
    if (!b) return { error: null };
    try {
        const bin = atob(b.replace(/-/g, '+').replace(/_/g, '/'));
        const u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return { earlyData: u8.buffer, error: null };
    } catch (e) { return { error: e }; }
}

function _0xdd(s) {
    try { if (s.readyState === 1 || s.readyState === 2) s.close(); } catch (e) { }
}

function _0xee(h) {
    const d = ['speedtest.net', 'fast.com', 'speedtest.cn', 'speed.cloudflare.com', 'ovo.speedtestcustom.com'];
    return d.some(x => h.includes(x));
}

function _0xff(p) {
    if (!p) return null;
    p = p.trim();
    try {
        if (p.startsWith('socks')) {
            const u = new URL(p.replace(/^socks:\/\//, 'socks5://'));
            return { type: 'socks5', host: u.hostname, port: parseInt(u.port) || 1080, user: u.username, pass: u.password };
        }
        if (p.startsWith('http')) {
            const u = new URL(p);
            return { type: 'http', host: u.hostname, port: parseInt(u.port) || (p.startsWith('https') ? 443 : 80), user: u.username, pass: u.password };
        }
        const lastC = p.lastIndexOf(':');
        if (lastC > 0) return { type: 'direct', host: p.substring(0, lastC).replace(/[\[\]]/g, ''), port: parseInt(p.substring(lastC + 1)) };
    } catch (e) { }
    return { type: 'direct', host: p.replace(/[\[\]]/g, ''), port: 443 };
}

export default {
    async fetch(req, env, ctx) {
        try {
            const u = new URL(req.url), p = u.pathname, upg = req.headers.get('Upgrade');
            if (p.startsWith('/proxyip=') && !upg) {
                proxyIP = decodeURIComponent(p.substring(9)).trim();
                return new Response(`SET_OK`, { status: 200 });
            }
            if (upg === 'websocket') {
                const cP = (p.startsWith('/proxyip=')) ? decodeURIComponent(p.substring(9)).trim() : (u.searchParams.get('proxyip') || req.headers.get('proxyip'));
                return await _0x01(req, cP);
            }
            return new Response('Worker running', { status: 200 });
        } catch (e) { return new Response('Err', { status: 500 }); }
    }
};

async function _0x01(req, cP) {
    const pair = new WebSocketPair();
    const [c, s] = Object.values(pair);
    s.accept();
    let rW = { s: null }, isD = false;
    const r = new ReadableStream({
        start(ctrl) {
            s.addEventListener('message', (e) => ctrl.enqueue(e.data));
            s.addEventListener('close', () => { _0xdd(s); ctrl.close(); });
            const { earlyData } = _0xcc(req.headers.get('sec-websocket-protocol') || '');
            if (earlyData) ctrl.enqueue(earlyData);
        }
    });

    r.pipeTo(new WritableStream({
        async write(chunk) {
            if (isD) return await _0x05(chunk, s);
            if (rW.s) {
                const w = rW.s.writable.getWriter();
                await w.write(chunk);
                return w.releaseLock();
            }
            const h = _0x02(chunk, yourUUID);
            if (h.err || _0xee(h.host)) throw new Error();
            if (h.udp && h.port !== 53) throw new Error();
            if (h.udp) isD = true;

            const head = new Uint8Array([h.ver[0], 0]);
            const body = chunk.slice(h.idx);
            if (isD) return _0x05(body, s, head);
            await _0x03(h, body, s, head, rW, cP);
        }
    })).catch(() => _0xdd(s));

    return new Response(null, { status: 101, webSocket: c });
}

async function _0x03(h, body, ws, head, rW, cP) {
    const dC = async (a, p, d) => {
        const s = connect({ hostname: a, port: p });
        const w = s.writable.getWriter();
        await w.write(d);
        w.releaseLock();
        return s;
    };

    let pC = _0xff(cP || proxyIP);
    const pX = async () => {
        let nS;
        if (pC.type === 'socks5') {
            nS = await (async (cfg, th, tp, id) => {
                const s = connect({ hostname: cfg.host, port: cfg.port });
                const w = s.writable.getWriter(), r = s.readable.getReader();
                await w.write(new Uint8Array(cfg.user ? [5, 2, 0, 2] : [5, 1, 0]));
                const mR = await r.read();
                if (mR.value[1] === 2) {
                    const u = _0x4e(cfg.user), p = _0x4e(cfg.pass);
                    const pkt = new Uint8Array(3 + u.length + p.length);
                    pkt.set([1, u.length]), pkt.set(u, 2), pkt.set([p.length], 2 + u.length), pkt.set(p, 3 + u.length);
                    await w.write(pkt); await r.read();
                }
                const hB = _0x4e(th), cP = new Uint8Array(7 + hB.length);
                cP.set([5, 1, 0, 3, hB.length]), cP.set(hB, 5);
                new DataView(cP.buffer).setUint16(5 + hB.length, tp, false);
                await w.write(cP); await r.read();
                await w.write(id);
                w.releaseLock(); r.releaseLock();
                return s;
            })(pC, h.host, h.port, body);
        } else if (pC.type === 'http') {
            nS = await (async (cfg, th, tp, id) => {
                const s = connect({ hostname: cfg.host, port: cfg.port });
                const w = s.writable.getWriter(), r = s.readable.getReader();
                let req = `CONNECT ${th}:${tp} HTTP/1.1\r\nHost: ${th}:${tp}\r\n`;
                if (cfg.user) req += `Proxy-Authorization: Basic ${btoa(cfg.user + ':' + cfg.pass)}\r\n`;
                await w.write(_0x4e(req + '\r\n'));
                await r.read(); // 简单跳过HTTP响应头
                await w.write(id);
                w.releaseLock(); r.releaseLock();
                return s;
            })(pC, h.host, h.port, body);
        } else {
            nS = await dC(pC.host, pC.port, body);
        }
        rW.s = nS;
        _0x04(nS, ws, head);
    };

    if (pC && pC.type !== 'direct') {
        try { await pX(); } catch (e) { _0xdd(ws); }
    } else {
        try {
            const s = await dC(h.host, h.port, body);
            rW.s = s;
            _0x04(s, ws, head);
        } catch { try { await pX(); } catch { _0xdd(ws); } }
    }
}

function _0x02(c, t) {
    const dV = new DataView(c);
    if (c.byteLength < 24 || _0xbb(new Uint8Array(c.slice(1, 17))) !== t) return { err: true };
    const oL = dV.getUint8(17);
    const cmd = dV.getUint8(18 + oL);
    const port = dV.getUint16(19 + oL);
    let aIdx = 21 + oL, h = '';
    const aT = dV.getUint8(aIdx);
    if (aT === 1) {
        h = new Uint8Array(c.slice(aIdx + 1, aIdx + 5)).join('.');
        aIdx += 5;
    } else if (aT === 2) {
        const l = dV.getUint8(aIdx + 1);
        h = _0x8f(c.slice(aIdx + 2, aIdx + 2 + l));
        aIdx += l + 2;
    } else if (aT === 3) {
        const v6 = [];
        for (let i = 0; i < 8; i++) v6.push(dV.getUint16(aIdx + 1 + (i * 2)).toString(16));
        h = v6.join(':');
        aIdx += 17;
    }
    return { err: false, port, host: h, udp: cmd === 2, idx: aIdx, ver: new Uint8Array(c.slice(0, 1)) };
}

async function _0x04(rS, wS, hD) {
    let hd = hD;
    rS.readable.pipeTo(new WritableStream({
        async write(c) {
            if (wS.readyState !== 1) return;
            if (hd) {
                const b = new Uint8Array(hd.length + c.byteLength);
                b.set(hd), b.set(c, hd.length);
                wS.send(b.buffer); hd = null;
            } else wS.send(c);
        }
    })).catch(() => _0xdd(wS));
}

async function _0x05(uk, ws, vh) {
    try {
        const s = connect({ hostname: '8.8.4.4', port: 53 });
        const w = s.writable.getWriter();
        await w.write(uk); w.releaseLock();
        let h = vh;
        s.readable.pipeTo(new WritableStream({
            write(c) {
                if (ws.readyState !== 1) return;
                if (h) {
                    const b = new Uint8Array(h.length + c.byteLength);
                    b.set(h), b.set(c, h.length);
                    ws.send(b.buffer); h = null;
                } else ws.send(c);
            }
        }));
    } catch (e) { }
}