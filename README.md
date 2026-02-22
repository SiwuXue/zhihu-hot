# zhihu-hot

知乎热榜抓取器，支持本地运行与 GitHub Actions 自动更新，自动生成美观的 `out/index.html` 并发布到 GitHub Pages。

## 功能
- 抓取知乎热榜并输出 JSON
- 按日期保存 `out/data/YYYY-MM-DD.json`
- 生成美观首页 `out/index.html`（含 Top10 滚动卡片）
- 生成历史日期切换页 `out/history.html`
- 输出 RSS/JSON 订阅 `out/feed.xml` / `out/feed.json`
- 自动更新 README 中的当天信息
- GitHub Actions 定时抓取 + GitHub Pages 部署

## 本地使用
1. 登录知乎并导出 Cookies
2. 将 Cookies 保存到 `env/cookies.json`
3. 安装依赖并运行

```bash
npm install
npm start
```

## GitHub Actions 使用
### 1) 设置 Secrets
在仓库 Settings → Secrets → Actions 中新增：
- `COOKIES_JSON_BASE64`

生成方法（本地 PowerShell 执行）：
```powershell
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((Get-Content -Raw .\env\cookies.json)))
```

### 2) 生成 package-lock.json
GitHub Actions 已改为使用 `npm ci`，需要提交 `package-lock.json`。请在本地执行一次：
```bash
npm install
```
并提交生成的 `package-lock.json`。

### 3) 启用 GitHub Pages
Settings → Pages → Build and deployment 选择 **GitHub Actions**。

工作流会自动：
- 抓取热榜
- 生成 `out/index.html`
- 生成 `out/history.html`、`out/feed.xml`、`out/feed.json`
- 提交 `README.md` 与 `out/data/*.json`
- 部署到 GitHub Pages

## 输出结构
- `out/data/hotLinks.json`：当次去重结果
- `out/data/YYYY-MM-DD.json`：当天累计结果
- `out/index.html`：可直接部署的首页
- `out/history.html`：历史日期切换页
- `out/feed.xml`：RSS 订阅
- `out/feed.json`：JSON Feed 订阅

<!-- HOTLINKS_START -->
## 当天热点 (2026-02-22)

- 数据文件: [out/data/2026-02-22.json](out/data/2026-02-22.json)
- 条目数: 73

说明：运行脚本后会自动更新本段内容。
<!-- HOTLINKS_END -->
