# ModelApiTester

轻量级大模型 API 测试工具，前后端一体，单二进制部署。支持多模态对话、图片/文件上传、响应耗时统计、会话与模型配置持久化。

专为个人/团队测试 API 可用性 + 保管 API Key 设计，不追求对话产品级体验，只做"填地址 → 发消息 → 看结果"。

## 特性

- **单二进制部署** — Bun 编译为单文件可执行程序（Linux / Windows），SQLite 存储，无需 Node 运行时
- **图片与文件上传** — 支持多图选择/预览，图片走多模态（OpenAI vision 格式），文件可附加（Claude document 块）
- **响应耗时统计** — 每条回复自动显示耗时、token 用量、模型名
- **上下文开关** — 一键切换是否携带历史上下文（关闭 = 纯单轮测试模式）
- **系统提示词** — 侧边栏可选填写 system prompt
- **模型配置持久化** — 多个配置可保存/切换，Base URL / API Key / 模型名存入 SQLite
- **会话持久化** — 多会话列表，聊天记录（含图片）存 SQLite，刷新不丢
- **可选密码认证** — 环境变量 `ACCESS_PASSWORD` 设置后，访问需输入密码（留空则无需认证）
- **Claude 支持** — 自动识别 Claude 模型，适配 `/v1/messages` 格式 + 图片 source 格式
- **自动 URL 去重** — Base URL 含 `/v1` 时智能去重，不会拼出 `/v1/v1/...`
- **子路径部署** — 前端 API 使用相对路径，可部署在任意子路径（如 `/api-tester/`）

## 技术栈

- **Bun** — 运行时 + HTTP 服务器 + 编译器（`bun build --compile`）
- **bun:sqlite** — 数据存储（模型配置、会话、消息、图片）
- **Tailwind CSS**（CDN）— 界面样式
- **showdown.js** — Markdown 渲染
- **原生 fetch** — 请求 OpenAI / Claude 兼容接口

## 快速开始

### 本地开发

```bash
bun install
bun run dev       # 开发模式（热重载）
# 或
bun run start     # 直接运行
```

默认监听 `:3000`，浏览器打开 `http://localhost:3000`。

### 编译二进制

```bash
# Linux
bun build src/server.ts --compile --target=bun-linux-x64 --outfile dist/model-api-tester-linux

# Windows
bun build src/server.ts --compile --target=bun-windows-x64 --outfile dist/model-api-tester.exe

# macOS
bun build src/server.ts --compile --target=bun-darwin-x64 --outfile dist/model-api-tester-mac
```

### 生产运行

```bash
# 环境变量
export PORT=3000
export DB_PATH=/opt/model-api-tester/model_api_tester.db
export ACCESS_PASSWORD=your-password   # 可选，留空则无需认证

./model-api-tester-linux
```

### systemd 服务示例

```ini
[Unit]
Description=Model API Tester
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/model-api-tester
ExecStart=/opt/model-api-tester/model-api-tester-linux
Restart=always
RestartSec=3
Environment=PORT=3000
Environment=DB_PATH=/opt/model-api-tester/model_api_tester.db
# Environment=ACCESS_PASSWORD=your-password

[Install]
WantedBy=multi-user.target
```

### Nginx 子路径反代

```nginx
location /api-tester/ {
    proxy_pass http://127.0.0.1:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_buffering off;
    proxy_read_timeout 3600s;
    client_max_body_size 100m;
}
```

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET/POST | `/api/configs` | 模型配置列表 / 新建 |
| PUT/DELETE | `/api/configs/:id` | 更新 / 删除模型配置 |
| GET/POST | `/api/conversations` | 会话列表 / 新建 |
| PUT/DELETE | `/api/conversations/:id` | 更新 / 删除会话 |
| GET/DELETE | `/api/conversations/:id/messages` | 消息列表 / 清空 |
| POST | `/api/messages` | 保存消息（含图片/文件） |

## 目录结构

```
ModelApiTester/
├── src/
│   ├── server.ts      # Bun HTTP 服务器 + REST API
│   ├── db.ts          # SQLite 数据层
│   └── frontend.html  # 前端页面（编译时内嵌）
├── package.json
├── tsconfig.json
└── .gitignore
```

## Credits

本项目第一版基于 [openai-api-tester](https://github.com/RunningFelix/openai-api-tester)（作者 [@RunningFelix](https://github.com/RunningFelix)，MIT License）改造，在原项目基础上新增了图片上传、响应耗时统计、上下文开关、UI 重构等功能。后演进为 Bun + SQLite 工程化版本。

## License

MIT