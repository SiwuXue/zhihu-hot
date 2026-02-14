function toWebUrl(input) {
    if (!input) return "";
    try {
        const parsed = new URL(input);
        if (parsed.hostname === "api.zhihu.com") {
            parsed.hostname = "www.zhihu.com";
        }
        parsed.pathname = parsed.pathname.replace(/\/questions\//, "/question/");
        return parsed.toString();
    } catch {
        return String(input)
            .replace("api.zhihu.com", "www.zhihu.com")
            .replace("/questions/", "/question/");
    }
}

function extractQuestionId(input) {
    const text = String(input || "");
    const match = text.match(/\/question[s]?\/(\d+)/);
    return match ? match[1] : null;
}

module.exports = {
    toWebUrl,
    extractQuestionId,
};
