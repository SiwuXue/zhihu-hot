const fs = require('fs');
const puppeteer = require("puppeteer");
const { mkdir } = require("./utils");
const { generateIndexHtml, generateHistoryHtml, generateFeeds } = require("./render");
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
    const history = loadHistoryIndex(dataDir);
    const baseUrl = getBaseUrl();
    generateIndexHtml(dateKey, mergedToday, history, { baseUrl });
    generateHistoryHtml(history, { baseUrl });
    generateFeeds(dateKey, mergedToday, { baseUrl });

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
function loadHistoryIndex(dataDir) {
    const dateFilePattern = /^\d{4}-\d{2}-\d{2}\.json$/;
    let files = [];
    try {
        files = fs.readdirSync(dataDir).filter(name => dateFilePattern.test(name));
    } catch {
        files = [];
    }
    const dates = files
        .map(name => name.replace(/\.json$/, ""))
        .sort((a, b) => b.localeCompare(a));

    return dates.map(date => {
        const path = `${dataDir}/${date}.json`;
        try {
            const raw = fs.readFileSync(path, "utf-8");
            const items = JSON.parse(raw || "[]");
            return { date, items: Array.isArray(items) ? items : [] };
        } catch {
            return { date, items: [] };
        }
    });
}

function getBaseUrl() {
    if (process.env.SITE_URL) {
        return String(process.env.SITE_URL).replace(/\/+$/, "");
    }
    try {
        const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
        const repoUrl = (pkg.repository && pkg.repository.url) ? pkg.repository.url : "";
        const match = repoUrl.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/i);
        if (match) {
            const owner = match[1];
            const repo = match[2];
            return `https://${owner.toLowerCase()}.github.io/${repo}`;
        }
    } catch {
        // ignore
    }
    return "";
}


