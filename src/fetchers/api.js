const https = require("https");
const { buildApiHeaders } = require("../utils/headers");
const { getCookieHeader } = require("../utils/cookies");

async function fetchJson(url, headers) {
    if (typeof fetch === "function") {
        const res = await fetch(url, { headers });
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
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
                try {
                    resolve(JSON.parse(raw));
                } catch (err) {
                    reject(err);
                }
            });
        });
        req.on("error", reject);
        req.end();
    });
}

async function fetchHotlistViaApi(options = {}) {
    const headers = buildApiHeaders({
        hotUrl: options.hotUrl,
        userAgent: options.userAgent,
    });
    const cookieHeader = getCookieHeader();
    if (cookieHeader) {
        headers.cookie = cookieHeader;
    }
    const payload = await fetchJson(options.hotApiUrl, headers);
    return Array.isArray(payload && payload.data) ? payload.data : [];
}

module.exports = {
    fetchHotlistViaApi,
};
