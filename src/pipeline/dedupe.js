function dedupe(items) {
    const deduped = [];
    const seen = new Set();
    for (const item of items || []) {
        const key = item.href || `${item.title || ""}__${item.image || ""}`;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        deduped.push(item);
    }
    return deduped;
}

module.exports = {
    dedupe,
};
