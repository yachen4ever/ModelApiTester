# ModelApiTester

[English](./README_en.md) | 中文

轻量级大模型 API 测试工具，Rust 后端 + Vite 前端，单二进制部署。支持多模态对话、图片/文件上传、响应耗时统计、会话与模型配置持久化。

专为个人/团队测试 API 可用性 + 保管 API Key 设计，不追求对话产品级体验，只做"填地址 → 发消息 → 看结果"。

## 特性

- **单二进制部署** — Rust 编译为原生可执行程序（Linux / Windows / macOS），SQLite 存储，无需任何运行时
- **多 API 类型支持** — 内置 OpenAI / Anthropic / Google Gemini / 其他主流 API 格式，自动适配请求体与响应解析
- **模型列表拉取** — 点击模型输入框刷新按钮，从接口 `/v1/models` 拉取可用模型列表，支持实时筛选
- **API 类型 + 路径下拉** — 按类型提供候选路径（如 `/v1/chat/completions`、`/v1/messages`），空值 = 自动推断
- **图片与文件上传** — 支持多图选择/预览，图片走多模态（OpenAI vision 格式），文件可附加（Claude document 块）
- **图片双击放大** — 集成 Viewer.js，双击聊天图片打开查看器，支持缩放/旋转/翻转/下载
- **响应耗时统计** — 每条回复自动显示耗时、token 用量、模型名（位于气泡下方）
- **上下文开关** — 一键切换是否携带历史上下文（关闭 = 纯单轮测试模式），默认关闭
- **系统提示词** — 侧边栏可选填写 system prompt
- **模型配置持久化** — 多个配置可保存/切换，Base URL / API Key / 模型名 / API 类型存入 SQLite
- **对话记忆模型配置** — 每次发消息自动保存当前模型配置，重新打开对话时自动恢复
- **会话持久化** — 多会话列表，聊天记录（含图片）存 SQLite，刷新不丢；支持一键清空全部对话
- **i18n 国际化** — 中英文切换，默认按浏览器/OS 语言自动检测
- **亮暗主题** — 亮色/暗色一键切换，偏好本地存储
- **可选密码认证** — 环境变量 `ACCESS_PASSWORD` 设置后，访问需输入密码（留空则无需认证）
- **Claude 支持** — 自动识别 Claude 模型，适配 `/v1/messages` 格式 + 图片 source 格式
- **Google Gemini 支持** — `contents[]` 格式、`systemInstruction`、`inlineData` 图片、相邻同角色消息合并
- **自动 URL 去重** — Base URL 含 `/v1` 时智能去重，不会拼出 `/v1/v1/...`

## 技术栈

- **Rust** — 后端语言
- **axum** — HTTP 服务器框架
- **rusqlite**（bundled）— SQLite 数据存储（模型配置、会话、消息、图片）
- **tower-http** — 静态文件服务（ServeDir）+ CORS
- **Vite 6** — 前端构建工具
- **Tailwind CSS v4** — 界面样式 + 暗色模式
- **showdown.js** — Markdown 渲染
- **Viewer.js** — 图片查看器（缩放/旋转/翻转/下载）
- **原生 fetch** — 请求 OpenAI / Claude / Gemini 兼容接口

## 下载使用

### 方式一：下载预编译二进制（推荐）

前往 [Releases](https://github.com/yachen4ever/ModelApiTester/releases) 下载对应平台的文件：

| 文件 | 平台 |
|------|------|
| `model-api-tester-linux-x64` | Linux x86_64 |
| `model-api-tester-windows-x64.exe` | Windows x86_64 |
| `model-api-tester-macos-arm64` | macOS Apple Silicon |
| `model-api-tester-macos-x64` | macOS Intel |
| `frontend-dist.zip` | 前端静态文件（所有平台通用） |

**部署步骤：**

```bash
# 1. 创建部署目录
mkdir -p ~/model-api-tester/crates/http-server/static
cd ~/model-api-tester

# 2. 放入二进制
cp ~/Downloads/model-api-tester-linux-x64 ./model-api-tester
chmod +x model-api-tester

# 3. 解压前端到 static 目录
unzip ~/Downloads/frontend-dist.zip -d crates/http-server/static/

# 4. 运行
./model-api-tester
```

浏览器打开 `http://localhost:52081` 即可使用。

> **注意**：前端静态文件必须放在相对于**工作目录**的 `crates/http-server/static/` 路径下，即与上述目录结构一致。

### 方式二：从源码编译

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

## 配置

通过环境变量配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `52081` | 监听端口 |
| `HOST` | `127.0.0.1` | 监听地址（对外暴露设为 `0.0.0.0`） |
| `DB_PATH` | `./model_api_tester.db` | SQLite 数据库路径 |
| `ACCESS_PASSWORD` | （空） | 访问密码，留空则无需认证 |

```bash
# 示例
export HOST=0.0.0.0
export PORT=52081
export DB_PATH=/opt/model-api-tester/model_api_tester.db
export ACCESS_PASSWORD=your-password   # 可选
./model-api-tester
```

## 生产部署

### systemd 服务

```ini
[Unit]
Description=Model API Tester
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/model-api-tester
ExecStart=/opt/model-api-tester/model-api-tester
Restart=always
RestartSec=3
Environment=HOST=127.0.0.1
Environment=PORT=52081
Environment=DB_PATH=/opt/model-api-tester/model_api_tester.db
# Environment=ACCESS_PASSWORD=your-password

[Install]
WantedBy=multi-user.target
```

### Nginx 反向代理（前端静态 + API 反代分离）

生产部署推荐 nginx 直接服务前端静态文件，仅反代 `/api/` 到 Rust 后端：

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

> 前端构建时需设 `base: '/api-tester-rust/'`（`vite.config.js` 已内置），资源路径会自动带上前缀。

## 本地开发

前后端分别启动，Vite dev server 代理 API 请求到 Rust 后端：

```bash
# 终端 1：启动后端（默认 127.0.0.1:52081）
cargo run

# 终端 2：启动前端 dev server（默认 localhost:5173，自动代理 /api → :52081）
cd frontend
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`，修改前端代码即时热更新。

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
│   ├── core/                     # 共享业务逻辑
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs            # 模块导出 + VERSION
│   │       ├── models.rs         # 数据结构 + DTO
│   │       └── db.rs             # SQLite schema/迁移/CRUD
│   └── http-server/              # axum HTTP 服务器
│       ├── Cargo.toml
│       ├── src/
│       │   └── main.rs           # 路由 + 认证 + ServeDir 静态文件
│       └── static/               # Vite 构建产物（gitignore）
├── frontend/                     # Vite 前端工程
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.js               # 入口
│       ├── app.js                # 主应用（UI + 业务逻辑）
│       ├── api.js                # API 客户端
│       ├── i18n.js               # 中英文 i18n
│       └── style.css             # Tailwind v4 + 自定义样式
├── .github/
│   └── workflows/
│       └── release.yml           # GitHub Actions（3平台二进制 + 前端打包）
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