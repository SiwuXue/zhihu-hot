const https = require("https");
const { buildHotPageHeaders } = require("../utils/headers");

async function fetchText(url, headers) {
    if (typeof fetch === "function") {
        const res = await fetch(url, { headers });
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        return res.text();
    }

    return new Promise((resolve, reject) => {
        const req = https.request(url, { method: "GET", headers }, res => {
            let raw = "";
            res.on("data", chunk => {
                raw += chunk;
            });
            res.on("end", () => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }
                resolve(raw);
            });
        });
        req.on("error", reject);
        req.end();
    });
}

function decodeHtmlEntities(input) {
    return String(input)
        .replace(/&quot;/g, "\"")
        .replace(/&#34;/g, "\"")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");
}

function extractInitialState(html) {
    if (!html) return null;

    const idMatch = html.match(
        /<script[^>]*id=["']js-initialData["'][^>]*>([\s\S]*?)<\/script>/
    );
    if (idMatch && idMatch[1]) {
        const payload = decodeHtmlEntities(idMatch[1].trim());
        try {
            return JSON.parse(payload);
        } catch {
            // fall through
        }
    }

    const stateMatch = html.match(
        /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*;/
    );
    if (stateMatch && stateMatch[1]) {
        try {
            return JSON.parse(stateMatch[1]);
        } catch {
            // ignore
        }
    }

    return null;
}

function isHotListArray(list) {
    if (!Array.isArray(list) || list.length === 0) return false;
    return list.some(item => item && typeof item === "object" && item.target && item.target.url);
}

function findHotList(obj, depth = 0) {
    if (!obj || depth > 8) return null;
    if (isHotListArray(obj)) return obj;
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const found = findHotList(item, depth + 1);
            if (found) return found;
        }
        return null;
    }
    if (typeof obj === "object") {
        for (const value of Object.values(obj)) {
            const found = findHotList(value, depth + 1);
            if (found) return found;
        }
    }
    return null;
}

async function fetchHotlistViaHotPage(options = {}) {
    const headers = buildHotPageHeaders({
        hotUrl: options.hotUrl,
        userAgent: options.userAgent,
    });
    const html = await fetchText(options.hotUrl, headers);
    const initialState = extractInitialState(html);
    if (!initialState) {
        return [];
    }
    const list = findHotList(initialState);
    return Array.isArray(list) ? list : [];
}

module.exports = {
    fetchHotlistViaHotPage,
};
