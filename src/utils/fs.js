const fs = require("fs");

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Directory created: ${dir}`);
    }
}

function readJsonSafe(path, fallback) {
    if (!fs.existsSync(path)) return fallback;
    try {
        return JSON.parse(fs.readFileSync(path, "utf-8") || "");
    } catch {
        return fallback;
    }
}

function writeJson(path, data) {
    fs.writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
}

module.exports = {
    ensureDir,
    readJsonSafe,
    writeJson,
};
