# ModelApiTester

一个极简的 LLM API 测试工具。单文件 HTML，零依赖、零后端，浏览器打开即用。

专为个人测试 API 可用性 + 保管 API Key 设计，不追求对话产品级体验，只做"填地址 → 发消息 → 看结果"。

## Features

- **单文件部署** — 整个项目就一个 `index.html`，浏览器双击打开或丢到任意 Web 服务器即可
- **图片上传** — 支持多图选择/预览，自动转为多模态格式发送（OpenAI vision 格式）
- **响应耗时统计** — 每条回复自动显示耗时、token 用量、模型名
- **上下文开关** — 一键切换是否携带历史上下文（关闭 = 纯单轮测试模式）
- **系统提示词** — 侧边栏可选填写 system prompt
- **配置持久化** — Base URL / API Key / 模型名自动保存历史，刷新不丢
- **聊天记录持久化** — 对话内容存 localStorage，关闭浏览器后再打开仍在
- **可选密码认证** — 源码顶部设置密码后，访问需输入密码（留空则无需认证）
- **Claude 支持** — 自动识别 Claude 模型，适配 `/v1/messages` 格式 + 图片 source 格式
- **自动 URL 去重** — Base URL 含 `/v1` 时智能去重，不会拼出 `/v1/v1/...`

## Quick Start

### 方式一：直接打开

下载 `index.html`，浏览器双击打开即可。

### 方式二：部署到 Web 服务器

```bash
# Nginx
cp index.html /var/www/html/

# 或 Python 简易服务器
python3 -m http.server 8080
```

### 配置密码认证（可选）

编辑 `index.html` 顶部：

```javascript
const ACCESS_PASSWORD = 'your-password';  // 留空则不需要密码
```

## Screenshot

侧边栏配置 + 聊天区双栏布局，每条 AI 回复下方显示耗时和 token 数。

## Tech Stack

- 纯 HTML / CSS / JavaScript，无框架、无构建工具
- [showdown.js](https://github.com/showdownjs/showdown) — Markdown 渲染
- [Font Awesome](https://fontawesome.com/) — 图标

## Credits

本项目基于 [openai-api-tester](https://github.com/RunningFelix/openai-api-tester)（作者 [@RunningFelix](https://github.com/RunningFelix)，MIT License）改造，在原项目基础上新增了图片上传、响应耗时统计、上下文开关、UI 重构等功能。

## License

MIT