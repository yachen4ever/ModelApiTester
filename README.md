---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: '19dcba1e-5dd9-4125-bc92-424cb858c4ce'
  PropagateID: '19dcba1e-5dd9-4125-bc92-424cb858c4ce'
  ReservedCode1: '91075988-b811-4e98-8773-3bc8ff4919e7'
  ReservedCode2: '91075988-b811-4e98-8773-3bc8ff4919e7'
---

# ModelApiTester

[English](./README_en.md) | 中文

轻量级大模型 API 测试工具，支持多模态对话、图片/文件上传、流式输出、响应耗时统计、会话与模型配置持久化。

专为个人/团队测试 API 可用性 + 保管 API Key 设计，不追求对话产品级体验，只做"填地址 → 发消息 → 看结果"。

## 特性

- **多 API 类型支持** — 内置 OpenAI / Anthropic / Google Gemini / 其他主流 API 格式，自动适配请求体与响应解析
- **流式输出** — 支持 OpenAI / Anthropic / Google Gemini 三种 SSE 流式格式，逐字输出 + 闪烁光标，流结束后自动 Markdown 渲染
- **预设测试提示词** — 内置 8 大能力分类（推理/代码/数学/指令遵循/创意写作/多语言/常识/安全）共 32 条精选提示词，一键填入输入框，适合快速对比不同模型的能力差异
- **统一图标** — Indigo 渐变圆角方块 + 白色闪电符号，Web favicon 与桌面版图标全平台统一
- **关于（About）弹窗** — 仿 Chrome 关于页：品牌区 + 更新检测（自动检查 GitHub 最新版本，有新版本时一键跳转下载）+ GitHub / 更新日志 / 致谢链接
- **桌面版单可执行文件** — Tauri 版不再打包安装器，单个二进制绿色分发，数据存于 `~/.mat-desktop/`
- **响应耗时统计** — 每条回复自动显示耗时、token 用量、模型名；流式模式下拆分 prefill/decode 各自耗时与 tok/s
- **图片与文件上传** — 支持多图选择/预览，图片走多模态（OpenAI vision 格式），文件可附加（Claude document 块）
- **图片双击放大** — 集成 Viewer.js，双击聊天图片打开查看器，支持缩放/旋转/翻转/下载
- **模型列表拉取** — 点击模型输入框刷新按钮，从接口 `/v1/models` 拉取可用模型列表，支持实时筛选
- **API 类型 + 路径下拉** — 按类型提供候选路径（如 `/v1/chat/completions`、`/v1/messages`），空值 = 自动推断
- **上下文开关** — 一键切换是否携带历史上下文（关闭 = 纯单轮测试模式），默认关闭
- **系统提示词** — 侧边栏可选填写 system prompt
- **模型配置持久化** — 多个配置可保存/切换，Base URL / API Key / 模型名 / API 类型存入 SQLite
- **对话记忆模型配置** — 每次发消息自动保存当前模型配置，重新打开对话时自动恢复
- **会话持久化** — 多会话列表，聊天记录（含图片）存 SQLite，刷新不丢；支持一键清空全部对话
- **i18n 国际化** — 中英文切换，默认按浏览器/OS 语言自动检测
- **亮暗主题** — 亮色/暗色一键切换，偏好本地存储
- **Claude 支持** — 自动识别 Claude 模型，适配 `/v1/messages` 格式 + 图片 source 格式
- **Google Gemini 支持** — `contents[]` 格式、`systemInstruction`、`inlineData` 图片、相邻同角色消息合并
- **自动 URL 去重** — Base URL 含 `/v1` 时智能去重，不会拼出 `/v1/v1/...`

## 三种使用方式

ModelApiTester 提供三种部署/使用方式，共享同一套 Rust core 业务逻辑和同一份 Vite 前端：

| 方式 | 说明 | 适用场景 |
|------|------|----------|
| **后端服务器** | Rust 编译为单二进制 + 前端静态文件，浏览器访问 | 服务器部署、团队共用 |
| **桌面应用** | Tauri 打包为原生桌面应用 | 本地使用、无需服务器 |
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

**部署步骤：**

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

所有参数仅通过命令行传入，**不支持环境变量**（避免 `HOST`/`PORT` 等通用变量被外部环境误设置影响服务）。

```bash
# 对外暴露 + 自定义端口和数据库路径
./mat-server --host 0.0.0.0 --port 8080 --db-path /data/mat.db --static-dir /var/www/mat
```

**生产部署（systemd + nginx）：**

```ini
[Unit]
Description=Model API Tester
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/mat-server
ExecStart=/opt/mat-server/mat-server --host 127.0.0.1 --port 52081 --db-path /opt/mat-server/model_api_tester.db --static-dir /opt/mat-server/static
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

nginx 直接服务前端静态文件，仅反代 `/api/` 到 Rust 后端：

```nginx
# 前端静态文件
location /api-tester-rust/ {
    alias /var/www/api-tester-rust/;
    index index.html;
    try_files $uri $uri/ /api-tester-rust/index.html =404;
}

# API 反代到 Rust 后端
location /api-tester-rust/api/ {
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

> nginx 部署模式下后端不需要 `--static-dir`（nginx 负责静态文件），但仍需指定 `--db-path`。

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

> **说明**：自 v0.5.3 起桌面版改为单可执行文件（不生成 msi/dmg/deb 安装包），
> 数据目录固定为 `~/.mat-desktop/model_api_tester.db`，绿色分发、随拷随用。

<!-- 截图占位 -->

---

### 方式三：从源码编译

**环境要求：**
- Rust 1.75+（`rustup` 安装）
- Node.js 18+（前端构建）

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

## 技术栈

**后端（共享 core）：**
- Rust + axum 0.8（HTTP 服务器）
- rusqlite（bundled SQLite）
- tower-http（静态文件服务 + CORS）
- clap（CLI 参数解析）

**前端：**
- Vue 3（Composition API + `<script setup>`）
- Vite 6 + Tailwind CSS v4
- showdown.js（Markdown 渲染）
- Viewer.js（图片查看器）
- Font Awesome（图标）
- 原生 fetch（请求 API 兼容接口）

**桌面版：**
- Tauri 2（复用 core + 前端）

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
├── Cargo.toml                    # Rust workspace 根配置
├── Cargo.lock
├── crates/
│   ├── core/                     # 共享业务逻辑（后端 + 桌面版复用）
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs            # 模块导出 + VERSION
│   │       ├── models.rs         # 数据结构 + DTO
│   │       └── db.rs             # SQLite schema/迁移/CRUD
│   ├── http-server/              # axum HTTP 服务器
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   └── main.rs           # CLI 参数 + 路由 + ServeDir
│   │   └── static/               # Vite 构建产物（gitignore）
│   └── tauri-app/                # Tauri 桌面版（复用 core）
│       ├── Cargo.toml
│       ├── tauri.conf.json
│       └── src/
│           ├── lib.rs            # IPC 路由（api_request 命令）
│           └── main.rs           # Tauri 入口
├── frontend/                     # Vite + Vue 3 前端工程
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html             # favicon 指向 app-icon.svg
│   ├── public/
│   │   └── app-icon.svg        # 应用图标源文件（1024×1024）
│   └── src/
│       ├── main.js               # Vue 挂载入口
│       ├── App.vue               # 根布局（主题/语言/会话状态）
│       ├── i18n.js               # 中英文 i18n（Vue reactive）
│       ├── presetPrompts.js       # 预设测试提示词数据（8 分类 × 4 条）
│       ├── style.css             # Tailwind v4 + 自定义样式
│       ├── components/           # Vue 组件
│       │   ├── ChatPanel.vue      #   聊天区 + 流式输出 + 预设提示词面板 + 发送逻辑
│       │   ├── AboutDialog.vue     #   关于弹窗（更新检测 + 链接 + 版权）
│       │   ├── ConversationList.vue #  对话列表
│       │   ├── ModelConfig.vue     #   模型配置面板
│       │   ├── MessageBubble.vue   #   消息气泡 + Markdown 渲染
│       │   └── StreamBubble.vue    #   流式输出气泡
│       └── composables/          # Vue Composition 工具
│           ├── useApi.js           #   API 客户端（fetch / Tauri invoke）
│           ├── useStream.js        #   SSE 流式响应解析器
│           └── useUtils.js         #   工具函数 + 请求体构建
├── .github/
│   └── workflows/
│       └── release.yml           # GitHub Actions（3平台二进制 + 前端打包 + Tauri 单可执行）
├── README.md
├── README_en.md
├── CHANGELOG.md
└── .gitignore
```

> 旧 Bun 版代码归档在 `bun_legacy_archived` 分支。

## Changelog

详见 [CHANGELOG.md](./CHANGELOG.md)。

## Credits

本项目第一版基于 [openai-api-tester](https://github.com/RunningFelix/openai-api-tester)（作者 [@RunningFelix](https://github.com/RunningFelix)，MIT License）改造，在原项目基础上新增了图片上传、响应耗时统计、上下文开关、UI 重构等功能。后先后演进为 Bun + SQLite 工程化版本和 Rust + Vite 重构版本。

## License

MIT