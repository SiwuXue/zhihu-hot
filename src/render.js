const fs = require("fs");

function escapeHtml(input) {
    return String(input)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeXml(input) {
    return String(input)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function compact(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v === undefined || v === null || v === "") continue;
        out[k] = v;
    }
    return out;
}

function generateIndexHtml(dateKey, items, history, options = {}) {
    const outPath = options.outPath || "out/index.html";
    const dataFile = `data/${dateKey}.json`;
    const historyUrl = "history.html";
    const feedJson = "feed.json";
    const feedXml = "feed.xml";
    const nowText = new Date().toLocaleString("zh-CN", { hour12: false });

    const top10 = items.slice(0, 10);
    const topCards = top10.map((item, idx) => {
        const rank = String(idx + 1).padStart(2, "0");
        const title = escapeHtml(item.title || "未命名条目");
        const href = item.href || "#";
        const hot = item.hotScore ? `${escapeHtml(item.hotScore)} 热度` : "热度未知";
        const image = item.image
            ? `<img class="thumb" src="${escapeHtml(item.image)}" alt="" loading="lazy">`
            : `<div class="thumb placeholder"></div>`;
        return `
        <div class="mar-card">
          <div class="mar-rank">${rank}</div>
          <div class="mar-body">
            <a class="mar-title" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${title}</a>
            <div class="mar-meta">${hot}</div>
          </div>
          ${image}
        </div>`;
    }).join("\n");

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

    const historyPreview = (history || []).slice(0, 6).map(day => {
        const count = (day.items || []).length;
        const date = escapeHtml(day.date);
        return `
        <a class="day" href="${historyUrl}" title="查看历史">
          <div class="day-date">${date}</div>
          <div class="day-count">${count} 条</div>
        </a>`;
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
      --glow: rgba(244,185,66,0.35);
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
      font-size: 14px;
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
    .actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid rgba(244,185,66,0.45);
      color: var(--accent);
      text-decoration: none;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .marquee {
      margin-top: 18px;
      border-top: 1px solid var(--stroke);
      padding-top: 16px;
      overflow: hidden;
      position: relative;
    }
    .track {
      display: flex;
      gap: 16px;
      width: max-content;
      animation: marquee 32s linear infinite;
    }
    .marquee:hover .track { animation-play-state: paused; }
    .mar-card {
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 12px;
      align-items: center;
      padding: 10px 12px;
      border: 1px solid var(--stroke);
      border-radius: 14px;
      background: rgba(255,255,255,0.05);
      min-width: 320px;
    }
    .mar-rank {
      font-family: "Bebas Neue", sans-serif;
      color: var(--accent);
      font-size: 22px;
      width: 32px;
      text-align: center;
    }
    .mar-title {
      color: var(--ink);
      text-decoration: none;
      font-size: 14px;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .mar-meta {
      color: var(--muted);
      font-size: 11px;
      margin-top: 4px;
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
      transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    }
    .card:hover { transform: translateY(-3px); border-color: rgba(244,185,66,0.45); box-shadow: 0 18px 40px rgba(0,0,0,0.2); }
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
    .section-title {
      margin-top: 40px;
      font-family: "Bebas Neue", sans-serif;
      letter-spacing: 2px;
      font-size: 22px;
    }
    .history-grid {
      margin-top: 14px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
    }
    .day {
      display: grid;
      gap: 6px;
      padding: 12px 14px;
      border: 1px solid var(--stroke);
      border-radius: 14px;
      background: rgba(255,255,255,0.05);
      color: var(--ink);
      text-decoration: none;
    }
    .day-date { font-size: 14px; letter-spacing: 0.5px; }
    .day-count { color: var(--muted); font-size: 12px; }

    @keyframes marquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    @media (max-width: 720px) {
      .card { grid-template-columns: auto 1fr; }
      .thumb { grid-column: 1 / -1; width: 100%; height: 180px; }
      .mar-card { min-width: 260px; }
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
      <div class="actions">
        <a class="action" href="${historyUrl}">历史日期</a>
        <a class="action" href="${feedXml}">RSS</a>
        <a class="action" href="${feedJson}">JSON Feed</a>
      </div>
      <div class="marquee">
        <div class="track">
          ${topCards}
          ${topCards}
        </div>
      </div>
    </header>

    <div class="section-title">今日榜单</div>
    <ul class="list">
      ${cards}
    </ul>

    <div class="section-title">最近日期</div>
    <div class="history-grid">
      ${historyPreview}
    </div>
  </div>
</body>
</html>`;

    fs.writeFileSync(outPath, html, "utf-8");
}

function generateHistoryHtml(history, options = {}) {
    const outPath = options.outPath || "out/history.html";
    const nowText = new Date().toLocaleString("zh-CN", { hour12: false });

    const blocks = (history || []).map(day => {
        const date = escapeHtml(day.date);
        const items = Array.isArray(day.items) ? day.items : [];
        const top3 = items.slice(0, 3).map(it => {
            const title = escapeHtml(it.title || "未命名条目");
            const href = it.href || "#";
            return `<li><a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${title}</a></li>`;
        }).join("\n");

        return `
      <article class="day-card">
        <div class="day-head">
          <div class="day-date">${date}</div>
          <a class="day-json" href="data/${date}.json">JSON</a>
        </div>
        <div class="day-count">${items.length} 条</div>
        <ul class="day-list">
          ${top3}
        </ul>
      </article>`;
    }).join("\n");

    const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>知乎热榜 · 历史日期</title>
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
    .wrap {
      max-width: 1100px;
      margin: 0 auto;
      padding: 56px 24px 80px;
    }
    .hero {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .title {
      font-family: "Bebas Neue", sans-serif;
      letter-spacing: 2px;
      font-size: clamp(32px, 6vw, 52px);
      margin: 0;
    }
    .meta { color: var(--muted); font-size: 12px; }
    .back {
      color: var(--accent);
      text-decoration: none;
      border: 1px solid rgba(244,185,66,0.45);
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }
    .day-card {
      border: 1px solid var(--stroke);
      border-radius: 16px;
      background: var(--card);
      padding: 16px;
      display: grid;
      gap: 10px;
    }
    .day-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .day-date { font-size: 16px; letter-spacing: 0.5px; }
    .day-json {
      color: var(--accent);
      text-decoration: none;
      font-size: 12px;
      border-bottom: 1px dashed rgba(244,185,66,0.5);
    }
    .day-count { color: var(--muted); font-size: 12px; }
    .day-list { margin: 0; padding-left: 18px; color: var(--ink); }
    .day-list a { color: var(--ink); text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hero">
      <div>
        <h1 class="title">历史日期</h1>
        <div class="meta">更新时间 ${nowText}</div>
      </div>
      <a class="back" href="index.html">返回首页</a>
    </div>
    <div class="grid">
      ${blocks}
    </div>
  </div>
</body>
</html>`;

    fs.writeFileSync(outPath, html, "utf-8");
}

function generateFeeds(dateKey, items, options = {}) {
    const outJson = options.outJson || "out/feed.json";
    const outXml = options.outXml || "out/feed.xml";
    const baseUrl = (options.baseUrl || "").replace(/\/+$/, "");
    const homeUrl = baseUrl ? `${baseUrl}/` : "";
    const feedJsonUrl = baseUrl ? `${baseUrl}/feed.json` : "";
    const feedXmlUrl = baseUrl ? `${baseUrl}/feed.xml` : "";

    const iso = `${dateKey}T00:00:00+08:00`;

    const jsonFeed = {
        version: "https://jsonfeed.org/version/1.1",
        title: "知乎热榜",
        home_page_url: homeUrl || undefined,
        feed_url: feedJsonUrl || undefined,
        description: "知乎热榜订阅",
        items: items.slice(0, 50).map((item, idx) => compact({
            id: item.href || `${dateKey}-${idx + 1}`,
            url: item.href || undefined,
            title: item.title || "",
            image: item.image || undefined,
            date_published: iso,
            content_text: item.hotScore ? `热度 ${item.hotScore}` : "知乎热榜",
        }))
    };

    fs.writeFileSync(outJson, JSON.stringify(compact(jsonFeed), null, 2), "utf-8");

    const rssItems = items.filter(item => item.href).slice(0, 50).map(item => {
        const title = escapeXml(item.title || "");
        const link = escapeXml(item.href || "");
        const desc = escapeXml(item.hotScore ? `热度 ${item.hotScore}` : "知乎热榜");
        const pubDate = new Date().toUTCString();
        return `
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${desc}</description>
    </item>`;
    }).join("\n");

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>知乎热榜</title>
    <link>${escapeXml(homeUrl || "https://github.com/SiwuXue/zhihu-hot")}</link>
    <description>知乎热榜订阅</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${rssItems}
  </channel>
</rss>`;

    fs.writeFileSync(outXml, rss, "utf-8");
}

module.exports = {
    generateIndexHtml,
    generateHistoryHtml,
    generateFeeds,
    escapeHtml,
};
