const fs = require("fs");

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

module.exports = {
    getBaseUrl,
};
