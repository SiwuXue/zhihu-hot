const fs = require("fs");

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

module.exports = {
    loadHistoryIndex,
};
