const fs = require('fs');
const puppeteer = require("puppeteer");
const { mkdir } = require("./utils");
// const cookies = require("../env/cookies.json"); // Load cookies from a JSON file

function formatCookies(rawCookies) {
    if (!Array.isArray(rawCookies)) return [];

    return rawCookies.map(cookie => {
        // 只保留Puppeteer需要的核心字段，过滤无效字段
        const validCookie = {
            name: cookie.name || '',
            value: cookie.value || '',
            domain: cookie.domain || '.zhihu.com',
            path: cookie.path || '/',
            expires: cookie.expires || -1,
            httpOnly: cookie.httpOnly || false,
            secure: cookie.secure || false,
        };

        // 修复sameSite字段：转为字符串类型
        if (cookie.sameSite) {
            // 处理数字类型的sameSite（0=NoRestriction, 1=Lax, 2=Strict）
            if (typeof cookie.sameSite === 'number') {
                validCookie.sameSite = ['None', 'Lax', 'Strict'][cookie.sameSite] || 'Lax';
            } else {
                // 确保是字符串且符合规范
                validCookie.sameSite = cookie.sameSite.toString().charAt(0).toUpperCase() + cookie.sameSite.toString().slice(1).toLowerCase();
            }
        }

        return validCookie;
    }).filter(cookie => cookie.name && cookie.value); // 过滤空的Cookies
}

// 加载并格式化 Cookies（优先使用环境变量，适配 GitHub Actions）
let cookies = [];
try {
    let rawCookies = null;
    if (process.env.COOKIES_JSON_BASE64) {
        const jsonText = Buffer.from(process.env.COOKIES_JSON_BASE64, "base64").toString("utf-8");
        rawCookies = JSON.parse(jsonText);
    } else if (process.env.COOKIES_JSON) {
        rawCookies = JSON.parse(process.env.COOKIES_JSON);
    } else {
        rawCookies = require("../env/cookies.json");
    }
    cookies = formatCookies(rawCookies);
    console.log(`成功加载并格式化 ${cookies.length} 条Cookies`);
} catch (error) {
    console.warn("未找到 cookies 或格式错误，将以未登录状态访问：", error.message);
}


const url = "https://www.zhihu.com/"; // Replace with your target URL
const hotUrl = "https://www.zhihu.com/hot"; // Replace with your target URL for hot topics
mkdir("out/images"); // Ensure the output directory exists
mkdir("out/data"); // Ensure the cookies directory exists

(async () => {
    console.log("Starting Puppeteer...");
    const launchOptions = {
        headless: process.env.CI ? true : false,
        defaultViewport: { width: 1280, height: 720 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    // 设置更长的导航超时，降低因网络慢导致的失败
    page.setDefaultNavigationTimeout(60000);
    // 固定 UA，减少反爬导致的异常跳转
    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );

    // 安全导航：失败自动重试，避免中途 frame 被卸载
    async function safeGoto(targetUrl, label) {
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                // 用 domcontentloaded 更稳，不等待所有网络请求结束
                await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
                return;
            } catch (err) {
                console.warn(`[${label}] goto failed (attempt ${attempt}/3):`, err.message);
                if (attempt === 3) throw err;
                await page.waitForTimeout(1500);
            }
        }
    }

    // 先访问首页，方便写入 cookie
    await safeGoto(url, "home");
    // await page.screenshot({ path: "out/images/sign.png" });

    // 只有存在 cookie 时才设置，避免空数组报错
    if (cookies.length) {
        await page.setCookie(...cookies);
    }

    // 进入热榜页并等待列表渲染完成
    await safeGoto(hotUrl, "hot");
    await page.waitForSelector(".HotList-list section", { timeout: 60000 });
    // await page.screenshot({ path: "out/images/hot.png" });

    const hotLinks = await page.evaluate(() => {
        const links = [];
        Array.from(document.querySelectorAll('.HotList-list section')).forEach((ele) => {
            const $link = ele.querySelector('.HotItem-content a');
            if (!$link) return; // Skip if no link found
            const $img = ele.querySelector('.HotItem-img img');
            const $id = ele.querySelector('.HotItem-index div');
            // 4. 提取热度值（核心新增逻辑）
            const $metrics = ele.querySelector('.HotItem-metrics');
            let hotScore = null;
            if ($metrics) {
                // 方法：提取标签内的所有文本，过滤掉空白和无关内容
                const fullText = $metrics.textContent.trim();
                // 正则匹配热度值（匹配「数字+万/亿+热度」或纯数字热度）
                const hotMatch = fullText.match(/(\d+(?:\.\d+)?\s*[万|亿]?)\s*热度/);
                if (hotMatch) {
                    hotScore = hotMatch[1].trim(); // 提取匹配到的热度值（如"1495万"）
                }
            }
            links.push({
                id: $id.textContent.trim() || null,
                href: $link.href,
                title: $link.title,
                image: $img ? $img.src : null,
                hotScore: hotScore || null,
            });
        })
        return links;
    });

    // 默认按 href 去重，没有 href 时用 title+image 兜底
    const deduped = [];
    const seen = new Set();
    for (const item of hotLinks) {
        const key = item.href || `${item.title || ""}__${item.image || ""}`;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        deduped.push(item);
    }
    // 写入当次抓取结果（已去重）
    fs.writeFileSync("out/data/hotLinks.json", JSON.stringify(deduped, null, 2), "utf-8");

    // 按本地日期分文件，只对当天去重
    const now = new Date();
    const dateKey = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
    ].join("-");

    const dataDir = "out/data";
    const todayPath = `${dataDir}/${dateKey}.json`;
    let todayList = [];
    // 读取当天历史（若文件损坏则当作空）
    if (fs.existsSync(todayPath)) {
        try {
            const parsed = JSON.parse(fs.readFileSync(todayPath, "utf-8") || "[]");
            if (Array.isArray(parsed)) todayList = parsed;
        } catch {
            todayList = [];
        }
    }
    // 计算当天已存在的 key
    const todaySeen = new Set(
        todayList.map(it => it.href || `${it.title || ""}__${it.image || ""}`).filter(Boolean)
    );

    // 过滤掉当天已存在的条目
    const newItems = [];
    for (const item of deduped) {
        const key = item.href || `${item.title || ""}__${item.image || ""}`;
        if (!key) continue;
        if (todaySeen.has(key)) continue;
        newItems.push(item);
        todaySeen.add(key);
    }

    // 追加写入当天文件
    const mergedToday = todayList.concat(newItems);
    fs.writeFileSync(todayPath, JSON.stringify(mergedToday, null, 2), "utf-8");
    console.log(`Saved ${deduped.length} items for today (${dateKey}), ${newItems.length} new after today de-dup.`);

    // 更新 README：写入当天数据文件链接和条目数量
    updateReadme(dateKey, mergedToday);
    generateIndexHtml(dateKey, mergedToday);

    await browser.close();
    console.log("Puppeteer finished and browser closed.");
})();

function updateReadme(dateKey, items) {
    const readmePath = "README.md";
    if (!fs.existsSync(readmePath)) return;

    const markerStart = "<!-- HOTLINKS_START -->";
    const markerEnd = "<!-- HOTLINKS_END -->";
    const dataFile = `out/data/${dateKey}.json`;
    const bodyLines = [
        `## 当天热点 (${dateKey})`,
        "",
        `- 数据文件: [${dataFile}](${dataFile})`,
        `- 条目数: ${items.length}`,
        "",
        "说明：运行脚本后会自动更新本段内容。",
    ];
    const section = [markerStart, ...bodyLines, markerEnd].join("\n");

    let text = fs.readFileSync(readmePath, "utf-8");
    if (text.includes(markerStart) && text.includes(markerEnd)) {
        const regex = new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}`);
        text = text.replace(regex, section);
    } else {
        text = text.trimEnd() + "\n\n" + section + "\n";
    }
    fs.writeFileSync(readmePath, text, "utf-8");
}
function generateIndexHtml(dateKey, items) {
    const outPath = "out/index.html";
    const dataFile = `out/data/${dateKey}.json`;
    const nowText = new Date().toLocaleString("zh-CN", { hour12: false });

    const cards = items.map((item, idx) => {
        const rank = String(idx + 1).padStart(2, "0");
        const title = escapeHtml(item.title || "未命名条目");
        const href = item.href || "#";
        const hot = item.hotScore ? `${escapeHtml(item.hotScore)} 热度` : "热度未知";
        const image = item.image
            ? `<img class="thumb" src="${escapeHtml(item.image)}" alt="" loading="lazy">`
            : `<div class="thumb placeholder"></div>`;
        return `
        <li class="card">
          <div class="rank">${rank}</div>
          <div class="content">
            <a class="title" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${title}</a>
            <div class="meta">
              <span class="badge">${hot}</span>
              <span class="dot">&middot;</span>
              <span class="link">知乎</span>
            </div>
          </div>
          ${image}
        </li>`;
    }).join("\n");

    const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>知乎热榜 · ${dateKey}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Newsreader:opsz,wght@6..72,300;6..72,500;6..72,700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-1: #0f1012;
      --bg-2: #1a1b1f;
      --ink: #f4f1ea;
      --muted: #b5b0a5;
      --accent: #f4b942;
      --card: rgba(255,255,255,0.06);
      --stroke: rgba(255,255,255,0.12);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Newsreader", serif;
      color: var(--ink);
      background: radial-gradient(1200px 800px at 20% -10%, #2a261c 0%, transparent 60%),
                  radial-gradient(1200px 800px at 120% 0%, #2a1f2f 0%, transparent 55%),
                  linear-gradient(135deg, var(--bg-1), var(--bg-2));
      min-height: 100vh;
    }
    .noise {
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: 0.12;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E");
      mix-blend-mode: soft-light;
    }
    .wrap {
      max-width: 1100px;
      margin: 0 auto;
      padding: 56px 24px 80px;
    }
    .hero {
      display: grid;
      gap: 16px;
      padding: 28px 28px 20px;
      border: 1px solid var(--stroke);
      border-radius: 20px;
      background: linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
      box-shadow: 0 30px 80px rgba(0,0,0,0.35);
    }
    .kicker {
      font-family: "Bebas Neue", sans-serif;
      letter-spacing: 3px;
      font-size: 14px;
      color: var(--muted);
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      font-family: "Bebas Neue", sans-serif;
      font-size: clamp(40px, 8vw, 72px);
      letter-spacing: 2px;
    }
    .sub {
      color: var(--muted);
      font-size: 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }
    .pill {
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid var(--stroke);
      background: rgba(255,255,255,0.05);
      font-size: 12px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .data-link {
      color: var(--accent);
      text-decoration: none;
      border-bottom: 1px dashed rgba(244,185,66,0.5);
    }
    .list {
      margin: 28px 0 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 16px;
    }
    .card {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 16px;
      align-items: center;
      padding: 16px 18px;
      border: 1px solid var(--stroke);
      border-radius: 16px;
      background: var(--card);
      backdrop-filter: blur(12px);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .card:hover { transform: translateY(-3px); border-color: rgba(244,185,66,0.45); }
    .rank {
      font-family: "Bebas Neue", sans-serif;
      font-size: 26px;
      color: var(--accent);
      width: 44px;
      text-align: center;
    }
    .title {
      color: var(--ink);
      text-decoration: none;
      font-size: 18px;
      line-height: 1.4;
    }
    .meta {
      margin-top: 6px;
      color: var(--muted);
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge {
      padding: 3px 8px;
      border-radius: 999px;
      border: 1px solid rgba(244,185,66,0.5);
      color: var(--accent);
      font-size: 11px;
      letter-spacing: 0.4px;
    }
    .thumb {
      width: 120px;
      height: 72px;
      object-fit: cover;
      border-radius: 12px;
      border: 1px solid var(--stroke);
    }
    .thumb.placeholder {
      background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
    }
    @media (max-width: 720px) {
      .card { grid-template-columns: auto 1fr; }
      .thumb { grid-column: 1 / -1; width: 100%; height: 180px; }
    }
  </style>
</head>
<body>
  <div class="noise"></div>
  <div class="wrap">
    <header class="hero">
      <div class="kicker">ZH HOT</div>
      <h1>知乎热榜</h1>
      <div class="sub">
        <span class="pill">${dateKey}</span>
        <span class="pill">更新时间 ${nowText}</span>
        <a class="data-link" href="${dataFile}">查看原始数据</a>
      </div>
    </header>

    <ul class="list">
      ${cards}
    </ul>
  </div>
</body>
</html>`;

    fs.writeFileSync(outPath, html, "utf-8");
}

function escapeHtml(input) {
    return String(input)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}





