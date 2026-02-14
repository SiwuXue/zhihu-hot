const { fetchHotlistViaApi } = require("./fetchers/api");
const { fetchHotlistViaHotPage } = require("./fetchers/hot-html");
const { fetchHotlistViaPuppeteer } = require("./fetchers/puppeteer");
const { normalizeApiList, normalizePuppeteerList } = require("./pipeline/normalize");
const { dedupe } = require("./pipeline/dedupe");
const { writeOutputs } = require("./pipeline/output");

const url = "https://www.zhihu.com/";
const hotUrl = "https://www.zhihu.com/hot";
const hotApiUrl = "https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50&desktop=true";
const userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";

async function main() {
    let hotLinks = [];
    try {
        const apiList = await fetchHotlistViaApi({ hotApiUrl, hotUrl, userAgent });
        hotLinks = normalizeApiList(apiList);
        if (hotLinks.length === 0) {
            throw new Error("API returned empty list");
        }
        console.log(`Fetched ${hotLinks.length} items via API.`);
    } catch (error) {
        console.warn("API failed, fallback to hot page:", error.message);
        try {
            const pageList = await fetchHotlistViaHotPage({ hotUrl, userAgent });
            hotLinks = normalizeApiList(pageList);
            if (hotLinks.length === 0) {
                throw new Error("Hot page returned empty list");
            }
            console.log(`Fetched ${hotLinks.length} items via hot page.`);
        } catch (pageError) {
            console.warn("Hot page failed, fallback to Puppeteer:", pageError.message);
            const puppeteerList = await fetchHotlistViaPuppeteer({ url, hotUrl, userAgent });
            hotLinks = normalizePuppeteerList(puppeteerList);
        }
    }

    const deduped = dedupe(hotLinks);
    writeOutputs(deduped);
}

main();
