const fs = require('fs');

function mkdir(dir) {
    // 递归创建目录，即使上级目录不存在也能创建
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`目录已创建：${dir}`);
    }
}

module.exports = {
    mkdir
}