# ModelApiTester

[English](./README_en.md) | 中文

轻量级大模型 API 测试工具，支持多模态对话、流式输出、响应耗时统计、会话与模型配置持久化。

专为个人/团队测试 API 可用性 + 保管 API Key 设计，不追求对话产品级体验，只做"填地址 → 发消息 → 看结果"。

![Model API Tester 截图](./docs/screenshot.png)

## 功能特性

- **多 API 类型** — OpenAI / Anthropic / Google Gemini / 其他主流格式，自动适配请求体与响应解析
- **流式输出** — 支持 OpenAI / Anthropic / Gemini 三种 SSE 流式格式，逐字输出 + 完成后 Markdown 渲染
- **响应耗时统计** — 每条回复显示 prefill 耗时、decode 耗时、生成 token 数、生成速度（tok/s）、总耗时、模型名
- **多模态上传** — 支持多图选择/预览（OpenAI vision 格式）、文件附加（Claude document 块）、图片双击放大（Viewer.js）
- **Markdown + 公式** — markdown-it 渲染 + KaTeX 数学公式（`$...$` 行内 / `$$...$$` 块级）+ 视频链接自动播放
- **预设测试提示词** — 8 大能力分类共 32 条精选提示词，一键填入，快速对比模型能力
- **会话与配置持久化** — 多会话管理，聊天记录存 SQLite；多个模型配置可保存/切换；每次发消息自动保存当前配置
- **模型列表拉取** — 从 `/v1/models` 拉取可用模型，支持实时筛选
- **上下文开关** — 一键切换是否携带历史上下文（关闭 = 纯单轮测试模式）
- **中英文 + 亮暗主题** — i18n 自动检测浏览器/OS 语言，亮暗主题一键切换

## 三种使用方式

| 方式 | 说明 | 适用场景 |
|------|------|----------|
| **后端服务器** | Rust 单二进制 + 前端静态文件，浏览器访问 | 服务器部署、团队共用 |
| **桌面应用** | Tauri 打包为原生桌面应用，单文件绿色分发 | 本地使用、无需服务器 |
| **从源码编译** | cargo + npm 本地构建开发 | 开发调试、自定义修改 |

---

### 方式一：后端服务器

前往 [Releases](https://github.com/yachen4ever/ModelApiTester/releases) 下载对应平台的文件：

| 文件 | 平台 |
|------|------|
| `mat-server-linux-x64` | Linux x86_64 |
| `mat-server-windows-x64.exe` | Windows x86_64 |
| `mat-server-macos-arm64` | macOS Apple Silicon |
| `mat-server-macos-x64` | macOS Intel |
| `mat-frontend-dist.zip` | 前端静态文件（所有平台通用） |

```bash
# 1. 创建部署目录
mkdir -p ~/mat-server/static
cd ~/mat-server

# 2. 放入二进制
cp ~/Downloads/mat-server-linux-x64 ./mat-server
chmod +x mat-server

# 3. 解压前端到 static 目录
unzip ~/Downloads/mat-frontend-dist.zip -d static/

# 4. 运行
./mat-server --static-dir ./static
```

浏览器打开 `http://localhost:52081` 即可使用。

**CLI 参数：**

```
Usage: mat-server [OPTIONS]

Options:
      --host <HOST>          监听地址 [默认: 127.0.0.1]
      --port <PORT>          监听端口 [默认: 52081]
      --db-path <DB_PATH>    SQLite 数据库路径 [默认: ./model_api_tester.db]
      --static-dir <DIR>     前端静态文件目录 [默认: crates/http-server/static]
   -h, --help                 显示帮助
   -V, --version              显示版本
```

所有参数仅通过命令行传入，不支持环境变量。

- `--static-dir`：指定前端静态文件目录。后端内置 ServeDir，直接通过该目录提供前端页面。如果使用 nginx 托管前端，则后端不需要此参数。
- `--db-path`：指定 SQLite 数据库存放位置，可用于集中管理数据目录。

```bash
# 对外暴露 + 自定义端口和数据目录
./mat-server --host 0.0.0.0 --port 8080 --db-path /data/mat.db --static-dir /var/www/mat
```

**生产部署（systemd + nginx）：**

```ini
[Unit]
Description=Model API Tester
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/mat
ExecStart=/opt/mat/mat-server --host 127.0.0.1 --port 52081 --db-path /opt/mat/model_api_tester.db
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

nginx 托管前端静态文件，仅反代 `/api/` 到 Rust 后端：

```nginx
# 前端静态文件
location /mat/ {
    alias /var/www/mat/;
    index index.html;
    try_files $uri $uri/ /mat/index.html =404;
}

# API 反代到 Rust 后端
location /mat/api/ {
    proxy_pass http://127.0.0.1:52081/api/;
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

> nginx 模式下后端不需要 `--static-dir`（nginx 负责静态文件），但仍需指定 `--db-path`。

---

### 方式二：桌面应用（Tauri）

前往 [Releases](https://github.com/yachen4ever/ModelApiTester/releases) 下载对应平台的可执行文件（**单文件，无需安装**）：

| 文件 | 平台 |
|------|------|
| `mat-desktop-windows-x64.exe` | Windows x86_64 |
| `mat-desktop-darwin-arm64` | macOS Apple Silicon |
| `mat-desktop-darwin-x64` | macOS Intel |
| `mat-desktop-linux-x64` | Linux x86_64 |

下载后直接双击运行，数据存储在 `~/.mat-desktop/` 目录下，无需配置服务器。

---

### 方式三：从源码编译

**环境要求：** Rust 1.75+、Node.js 18+

```bash
# 1. 构建前端
cd frontend
npm install
npm run build        # 产物输出到 crates/http-server/static/

# 2. 构建后端
cd ..
cargo build --release

# 3. 运行
./target/release/model-api-tester
```

**本地开发模式**（前后端分别启动，热更新）：

```bash
# 终端 1：启动后端（默认 127.0.0.1:52081）
cargo run

# 终端 2：启动前端 dev server（默认 localhost:5173，自动代理 /api → :52081）
cd frontend
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`，修改前端代码即时热更新。

---

## 架构

```
ModelApiTester/
├── crates/
│   ├── core/              # 共享业务逻辑（后端 + 桌面版复用）
│   │   └── src/
│   │       ├── lib.rs     # 模块导出 + VERSION
│   │       ├── models.rs  # 数据结构 + DTO
│   │       └── db.rs      # SQLite schema/迁移/CRUD
│   ├── http-server/       # axum HTTP 服务器
│   │   └── src/main.rs    # CLI 参数 + 路由 + 静态文件服务
│   └── tauri-app/         # Tauri 桌面版（复用 core）
│       └── src/lib.rs     # IPC 路由（api_request 命令）
├── frontend/              # Vite + Vue 3 前端工程
│   └── src/
│       ├── components/    # Vue 组件
│       │   ├── ChatPanel.vue       # 聊天区 + 流式输出 + 预设提示词
│       │   ├── ModelConfig.vue     # 模型配置面板
│       │   ├── MessageBubble.vue   # 消息气泡 + Markdown 渲染
│       │   └── StreamBubble.vue    # 流式输出气泡
│       └── composables/   # Vue Composition 工具
│           ├── useApi.js           # API 客户端
│           ├── useStream.js        # SSE 流式响应解析
│           ├── useUtils.js         # 请求体构建 + 工具函数
│           └── mdRender.js         # Markdown 渲染（markdown-it + KaTeX + 视频）
└── .github/workflows/     # GitHub Actions CI/CD
```

**技术栈：**

| 层 | 技术 |
|----|------|
| 后端 | Rust + axum + rusqlite + clap |
| 前端 | Vue 3 + Vite 6 + Tailwind CSS v4 + markdown-it + KaTeX |
| 桌面 | Tauri 2（复用 core + 前端） |

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

## Changelog

详见 [CHANGELOG.md](./CHANGELOG.md)。

## Credits

本项目第一版基于 [openai-api-tester](https://github.com/RunningFelix/openai-api-tester)（MIT License）改造，后演进为 Bun + SQLite 版本，最终重构为 Rust + Vue 3 版本。

## License

MIT