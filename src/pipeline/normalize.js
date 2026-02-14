const { toWebUrl, extractQuestionId } = require("../utils/url");

function parseHotScore(detailText) {
    if (!detailText) return null;
    const compact = String(detailText).replace(/\s+/g, "");
    const match = compact.match(/(\d+(?:\.\d+)?)(万|亿)?/);
    if (!match) return null;
    return match[2] ? `${match[1]}${match[2]}` : match[1];
}

function normalizeApiItem(item) {
    const target = item && item.target ? item.target : {};
    const title = typeof target.title === "string" ? target.title.trim() : "";
    const href = toWebUrl(target.url || "");
    const image =
        (item.children && item.children[0] && item.children[0].thumbnail) || null;
    const hotScore = parseHotScore(item.detail_text);
    const id =
        extractQuestionId(target.url) ||
        extractQuestionId(href) ||
        (target.id !== undefined && target.id !== null ? String(target.id) : null) ||
        (item.id !== undefined && item.id !== null ? String(item.id) : null);

    return {
        id,
        href,
        title,
        image,
        hotScore,
    };
}

function normalizePuppeteerItem(item) {
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const href = toWebUrl(item.href || "");
    const image = item.image || null;
    const hotScore = item.hotScore ? String(item.hotScore).trim() : null;
    const id =
        extractQuestionId(href) ||
        (item.id !== undefined && item.id !== null ? String(item.id) : null);

    return {
        id,
        href,
        title,
        image,
        hotScore,
    };
}

function normalizeApiList(list) {
    return (Array.isArray(list) ? list : [])
        .map(normalizeApiItem)
        .filter(item => item.title || item.href);
}

function normalizePuppeteerList(list) {
    return (Array.isArray(list) ? list : [])
        .map(normalizePuppeteerItem)
        .filter(item => item.title || item.href);
}

module.exports = {
    normalizeApiList,
    normalizePuppeteerList,
};
