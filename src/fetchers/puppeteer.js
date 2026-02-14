const puppeteer = require("puppeteer");

async function fetchHotlistViaPuppeteer(options = {}) {
    const url = options.url || "https://www.zhihu.com/";
    const hotUrl = options.hotUrl || "https://www.zhihu.com/hot";
    const userAgent = options.userAgent;

    console.log("Starting Puppeteer (API failed)...");
    const launchOptions = {
        headless: process.env.CI ? true : false,
        defaultViewport: { width: 1280, height: 720 },
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    };
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    try {
        page.setDefaultNavigationTimeout(60000);
        if (userAgent) {
            await page.setUserAgent(userAgent);
        }

        async function safeGoto(targetUrl, label) {
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
                    return;
                } catch (err) {
                    console.warn(`[${label}] goto failed (attempt ${attempt}/3):`, err.message);
                    if (attempt === 3) throw err;
                    await page.waitForTimeout(1500);
                }
            }
        }

        await safeGoto(url, "home");
        await safeGoto(hotUrl, "hot");
        await page.waitForSelector(".HotList-list section", { timeout: 60000 });

        const hotLinks = await page.evaluate(() => {
            const links = [];
            Array.from(document.querySelectorAll(".HotList-list section")).forEach((ele) => {
                const $link = ele.querySelector(".HotItem-content a");
                if (!$link) return;
                const $img = ele.querySelector(".HotItem-img img");
                const $id = ele.querySelector(".HotItem-index div");
                const $metrics = ele.querySelector(".HotItem-metrics");
                let hotScore = null;
                if ($metrics) {
                    const fullText = $metrics.textContent.trim();
                    const hotMatch = fullText.match(/(\d+(?:\.\d+)?\s*[万|亿]?)\s*热度/);
                    if (hotMatch) {
                        hotScore = hotMatch[1].trim();
                    }
                }
                links.push({
                    id: $id ? $id.textContent.trim() : null,
                    href: $link.href,
                    title: $link.title,
                    image: $img ? $img.src : null,
                    hotScore: hotScore || null,
                });
            });
            return links;
        });

        return hotLinks;
    } finally {
        await browser.close();
        console.log("Puppeteer finished and browser closed.");
    }
}

module.exports = {
    fetchHotlistViaPuppeteer,
};
