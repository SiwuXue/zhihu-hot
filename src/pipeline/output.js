const fs = require("fs");
const { generateIndexHtml, generateHistoryHtml, generateFeeds } = require("../render");
const { loadHistoryIndex } = require("./history");
const { getDateKey } = require("../utils/date");
const { getBaseUrl } = require("../utils/baseUrl");
const { ensureDir, readJsonSafe, writeJson } = require("../utils/fs");

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

function buildKey(item) {
    return item.href || `${item.title || ""}__${item.image || ""}`;
}

function writeOutputs(items, options = {}) {
    ensureDir("out/images");
    ensureDir("out/data");

    writeJson("out/data/hotLinks.json", items);

    const dateKey = options.dateKey || getDateKey();
    const dataDir = "out/data";
    const todayPath = `${dataDir}/${dateKey}.json`;
    let todayList = readJsonSafe(todayPath, []);
    if (!Array.isArray(todayList)) todayList = [];

    const todaySeen = new Set(todayList.map(buildKey).filter(Boolean));
    const newItems = [];
    for (const item of items) {
        const key = buildKey(item);
        if (!key) continue;
        if (todaySeen.has(key)) continue;
        newItems.push(item);
        todaySeen.add(key);
    }

    const mergedToday = todayList.concat(newItems);
    writeJson(todayPath, mergedToday);
    console.log(`Saved ${items.length} items for today (${dateKey}), ${newItems.length} new after today de-dup.`);

    updateReadme(dateKey, mergedToday);
    const history = loadHistoryIndex(dataDir);
    const baseUrl = getBaseUrl();
    generateIndexHtml(dateKey, mergedToday, history, { baseUrl });
    generateHistoryHtml(history, { baseUrl });
    generateFeeds(dateKey, mergedToday, { baseUrl });

    return {
        dateKey,
        total: items.length,
        newItems: newItems.length,
    };
}

module.exports = {
    writeOutputs,
};
