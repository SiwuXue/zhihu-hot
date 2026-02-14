const fs = require("fs");

let cachedCookies = null;

function formatCookies(rawCookies) {
    if (!Array.isArray(rawCookies)) return [];

    return rawCookies.map(cookie => {
        const validCookie = {
            name: cookie.name || "",
            value: cookie.value || "",
            domain: cookie.domain || ".zhihu.com",
            path: cookie.path || "/",
            expires: cookie.expires || -1,
            httpOnly: cookie.httpOnly || false,
            secure: cookie.secure || false,
        };

        if (cookie.sameSite) {
            if (typeof cookie.sameSite === "number") {
                validCookie.sameSite = ["None", "Lax", "Strict"][cookie.sameSite] || "Lax";
            } else {
                validCookie.sameSite =
                    cookie.sameSite.toString().charAt(0).toUpperCase() +
                    cookie.sameSite.toString().slice(1).toLowerCase();
            }
        }

        return validCookie;
    }).filter(cookie => cookie.name && cookie.value);
}

function loadCookies() {
    if (cachedCookies) return cachedCookies;

    let rawCookies = null;
    try {
        if (process.env.COOKIES_JSON_BASE64) {
            const jsonText = Buffer.from(process.env.COOKIES_JSON_BASE64, "base64").toString("utf-8");
            rawCookies = JSON.parse(jsonText);
        } else if (process.env.COOKIES_JSON) {
            rawCookies = JSON.parse(process.env.COOKIES_JSON);
        } else if (fs.existsSync("env/cookies.json")) {
            rawCookies = JSON.parse(fs.readFileSync("env/cookies.json", "utf-8"));
        }
    } catch (error) {
        console.warn("Failed to load cookies:", error.message);
        rawCookies = null;
    }

    const formatted = formatCookies(rawCookies);
    if (formatted.length) {
        console.log(`Loaded ${formatted.length} cookies.`);
    } else {
        console.warn("No cookies loaded. Requests may be rate-limited.");
    }

    cachedCookies = formatted;
    return formatted;
}

function cookiesToHeader(cookies) {
    if (!Array.isArray(cookies) || cookies.length === 0) return "";
    return cookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .filter(Boolean)
        .join("; ");
}

function getCookieHeader() {
    const cookies = loadCookies();
    return cookiesToHeader(cookies);
}

module.exports = {
    loadCookies,
    getCookieHeader,
};
