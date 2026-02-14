const fs = require("fs");
const { normalizeApiList } = require("./pipeline/normalize");
const { dedupe } = require("./pipeline/dedupe");
const { writeOutputs } = require("./pipeline/output");

function main() {
    const inputPath = process.argv[2] || "hotlist.json";
    if (!fs.existsSync(inputPath)) {
        console.error(`Input not found: ${inputPath}`);
        process.exit(1);
    }

    let payload = null;
    try {
        payload = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
    } catch (err) {
        console.error(`Failed to parse JSON: ${err.message}`);
        process.exit(1);
    }

    const list = Array.isArray(payload.data) ? payload.data : [];
    const normalized = normalizeApiList(list);
    const deduped = dedupe(normalized);
    writeOutputs(deduped);
}

main();
