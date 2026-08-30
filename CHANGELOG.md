# Changelog

All notable changes to this project. Dates are in CST (UTC+8).

---

## [v0.5.1] — 2026-08-30

### Bug Fixes
- **Tauri 桌面版图标全部不显示** — v0.5.0 将 Font Awesome 从 CDN 改为 npm 本地打包后，`tauri.conf.json` 的 CSP `font-src` 仍只允许 `https://cdnjs.cloudflare.com`，导致 Tauri WebView 加载本地图标字体（`/assets/fa-*.woff2`）时被 CSP 拦截，所有图标显示为占位方块。已修复为 `font-src 'self' data:`，并同步清理 `script-src`/`style-src` 中残留的 cdnjs 引用

---

## [v0.5.0] — 2026-08-30

### Breaking Changes
- **前端架构完全重写** — 从原生 JS DOM 操作改为 Vue 3 (`<script setup>` + Composition API)，所有 UI 逻辑用响应式数据驱动，不再手动操作 DOM

### Features — Vue 3 前端重构
- **Vue 3 + Composition API** — 全部前端代码重写为 `.vue` 单文件组件，`ref()`/`computed()` 响应式状态管理，无需 Pinia
- **组件拆分** — 从 1322 行单文件 `app.js` 拆分为 5 个组件 + 3 个 composables：
  - `App.vue` — 根布局 + 主题/语言/会话状态
  - `components/ChatPanel.vue` — 聊天区 + 流式输出 + 附件处理 + 发送逻辑
  - `components/ConversationList.vue` — 左侧对话列表
  - `components/ModelConfig.vue` — 右侧模型配置面板
  - `components/MessageBubble.vue` — 单条消息气泡 + Markdown 渲染 + 图片查看器
  - `components/StreamBubble.vue` — 流式输出气泡 + 闪烁光标
  - `composables/useApi.js` — API 客户端（Web fetch / Tauri invoke 自动切换）
  - `composables/useStream.js` — SSE 流式响应解析器
  - `composables/useUtils.js` — 工具函数 + API 请求体构建
- **CDN → npm** — Font Awesome 6.5.1、Viewer.js、Showdown.js 全部从 CDN `<script>` 标签改为 npm import，不再依赖外部 CDN
- **i18n 响应式化** — `i18n.js` 改为 Vue `ref()` + `useI18n()` composable，语言切换自动触发 UI 更新

### Infrastructure
- `frontend/package.json` — 新增 `vue`、`@vitejs/plugin-vue` 依赖，版本号 0.5.0
- `frontend/vite.config.js` — 添加 `vue()` 插件，`manualChunks` 分包优化（vendor chunk）
- `frontend/index.html` — 删除所有 CDN `<link>` 和 `<script>` 标签
- `frontend/src/main.js` — 改为 `createApp(App).mount('#app')` Vue 挂载入口
- `frontend/src/style.css` — 保留 Tailwind v4 + 自定义样式，新增 `#app` flex 布局
- 删除旧文件：`app.js`（1322 行）、`api.js`、`stream.js`

### Preserved (from v0.4.0)
- Rust 后端 API 完全不动
- 所有功能特性保持不变（流式输出、多模态、上下文开关、模型配置持久化等）
- Tailwind v4 做 UI 样式 + 暗色模式
- Tauri 桌面版前端共享

---

## [v0.4.0] — 2026-08-30

### Breaking Changes
- **配置方式从环境变量改为 CLI 参数** — 新增 `--host`/`--port`/`--db-path`/`--static-dir` 命令行参数（clap），环境变量仍向后兼容（CLI 参数 > 环境变量 > 默认值）
- **Release 产物文件名规范化** — 所有 release 产物统一 `mat-` 前缀命名

### Features
- **CLI 参数解析** — 引入 clap，支持 `--help` / `--version` 标准参数，`--static-dir` 可指定前端静态文件目录（默认 `crates/http-server/static`）
- **Tauri productName 规范化** — 桌面版产物名从 `Model API Tester` 改为 `mat-desktop`

### Infrastructure
- `crates/http-server/src/main.rs` — main() 重构为 clap derive 结构体 + CLI 参数解析，`build_router` 新增 `static_dir` 参数
- `Cargo.toml` — workspace.dependencies 新增 `clap = { version = "4", features = ["derive"] }`
- `.github/workflows/release.yml` — artifact 重命名：`model-api-tester-*` → `mat-server-*`，`frontend-dist.zip` → `mat-frontend-dist.zip`
- `crates/tauri-app/tauri.conf.json` — `productName` 改为 `mat-desktop`
- `README.md` / `README_en.md` — 按三套架构（服务器 / 桌面版 / 源码编译）重组，更新 CLI 参数说明和产物名

### Release Artifacts Renamed

| 旧名 | 新名 |
|------|------|
| `model-api-tester-linux-x64` | `mat-server-linux-x64` |
| `model-api-tester-windows-x64.exe` | `mat-server-windows-x64.exe` |
| `model-api-tester-macos-arm64` | `mat-server-macos-arm64` |
| `model-api-tester-macos-x64` | `mat-server-macos-x64` |
| `frontend-dist.zip` | `mat-frontend-dist.zip` |
| `Model API Tester_*.msi` 等 | `mat-desktop_*` 系列 |

---

## [v0.3.2] — 2026-08-30

### Bug Fixes
- **模型列表拉取死循环** — API Key 错误时 `onfocus` 自动触发 `fetchModels()` → `alert()` 弹窗 → 关闭后焦点回到 input → 再次触发 `onfocus` → 无限循环。新增三层防护：`fetchModelsLock` 防并发、`modelListCacheError` 标记失败后不再自动重试（仅手动点刷新按钮可重试）、成功后清除错误标记

---

## [v0.3.1] — 2026-08-30

### Features
- **流式输出** — 支持 OpenAI / Anthropic / Google Gemini 三种 SSE 流式格式，逐字输出 + 闪烁光标动画，流结束后一次性 Markdown 渲染
- **prefill/decode 细粒度指标** — 流式模式下精确拆分 prefill（TTFB）与 decode（首 chunk 到末 chunk）耗时及各自 tok/s；数据库新增 `prompt_tokens`、`completion_tokens`、`prefill_ms`、`decode_ms` 四列（带自动 migration）
- **版本号单一源** — `Cargo.toml` workspace version 为唯一来源，Rust 通过 `env!("CARGO_PKG_VERSION")` 读取，前端从 `/api/health` 动态获取，Vite `__APP_VERSION__` fallback
- **刷新不自动创建新对话** — `init()` 改为优先加载最近会话，仅在零会话时才新建
- **i18n 新增词条** — `streaming`、`generating`

### Bug Fixes
- **上下文 toggle 开关** — Tailwind v4 迁移后丢失 `input:checked + .toggle-bg` 位移规则，已补回
- **Google Gemini 流式端点** — 自动将 `:generateContent` 替换为 `:streamGenerateContent?alt=sse`，确保返回标准 SSE 格式
- **流式渲染性能** — 流式过程中使用 `textContent`（零开销）而非 `makeHtml()`，避免全文 Markdown 转换阻塞 `reader.read()` 导致 decode tok/s 偏低

### Performance
- 流式渲染节流：`requestAnimationFrame` 每帧最多重绘一次，滚动同步节流

---

## [v0.3.0] — 2026-08-30

### Breaking Changes
- **移除密码认证** — 完全删除 `ACCESS_PASSWORD` 环境变量及所有认证逻辑（Web 端 + Tauri 端），后端不再检查 `X-Auth-Password` header，前端不再有认证遮罩 UI

### Features — Tauri 桌面应用
- **Tauri 2 集成** — 新增 `crates/tauri-app` crate，复用 `mat-core` 业务逻辑，通过 `api_request` IPC 命令与前端通信
- **前端共享** — Tauri 桌面版与 Web 版共享同一份 Vite 前端代码，`api.js` 自动检测 Tauri 环境切换 `fetch` ↔ `invoke`
- **Vite 构建兼容** — `vite.config.js` 根据环境变量区分 Web/Tauri 构建模式（base 路径、@tauri-apps/api 打包方式）
- **GitHub Actions** — release workflow 新增 `build-tauri` job：Linux (.deb/.AppImage)、Windows (.msi)、macOS (.dmg)

### Bug Fixes
- **db.rs 重复 VERSION 常量** — 删除 `db.rs` 中遗留的 `VERSION = "0.2.0"`，统一使用 `lib.rs` 中的 `VERSION`

### Infrastructure — Tauri
- `crates/tauri-app/` — 完整 Tauri 2 骨架（Cargo.toml、build.rs、src/lib.rs、src/main.rs、tauri.conf.json）
- 图标文件生成（32x32/128x128/128x128@2x/icon.icns/icon.ico + Android/iOS 图标集）
- `frontend/package.json` 新增 `@tauri-apps/api` 依赖（v2）
- `vite.config.js` 移除 `external` 配置，改为正常打包（Tauri 2 中 `@tauri-apps/api` 是普通 npm 包）
- 本地 `cargo build -p mat-tauri-app` 完整 debug 编译通过（MSVC + Tauri 2.11.5）

### Removed
- `ACCESS_PASSWORD` 环境变量
- `check_auth()` 中间件函数 + 所有 handler 中的 `HeaderMap` / `Query` 参数
- `AppState.access_password` 字段
- 前端 `api.js` 中的 `accessToken` / `getAccessToken` / `setAccessToken` / `onAuthRequired` / `showAuthCallback`
- 前端 `app.js` 中的 `authOverlay` HTML、`showAuth()` / `doAuth()` 函数、auth 事件绑定
- `i18n.js` 中的 `access_verify` / `enter_password` / `enter` / `wrong_password` 词条

---

## [v0.2.1] — 2026-08-30

### Features
- **清空全部对话** — 对话列表"新建"旁新增"清空"按钮，一键删除所有对话（含二次确认）
- **nginx 静态+反代分离部署** — 生产环境改造为 nginx 直接服务前端静态文件，仅 `/api/` 反代到 Rust 后端，后端不再承担静态文件服务

### Bug Fixes
- 修复 `#app` 容器缺少 flex 布局导致页面内容无法撑满高度、聊天区被截断的问题

### Infrastructure
- `vite.config.js` 构建时 `base` 设为 `/api-tester-rust/`（开发时 `/`）
- `api.js` 使用 `import.meta.env.BASE_URL` 做 API 请求前缀，兼容子路径部署
- debsvc nginx 配置改为 `alias` 静态文件 + `proxy_pass` API 反代双 location

---

## [v0.2.0] — 2026-08-29

### Architecture Rewrite — Rust + Vite

Complete backend rewrite from Bun/TypeScript to Rust. Frontend migrated from a single embedded HTML to a modular Vite project.

### Backend (Rust)
- **Workspace structure** — `crates/core` (shared business logic) + `crates/http-server` (axum HTTP server), designed for future Tauri desktop crate to share the same `core`
- **axum 0.8** — HTTP server framework with typed extractors and routing
- **rusqlite** (bundled) — SQLite storage, same schema as Bun version, full backward compatibility with existing databases
- **tower-http** — `ServeDir` for static file serving + CORS layer
- **All 11 REST API routes** reimplemented (configs CRUD, conversations CRUD, messages CRUD, health check)
- **Environment variables** — `PORT` (default `52081`), `HOST` (default `127.0.0.1`), `DB_PATH`, `ACCESS_PASSWORD`; breaking change: default port changed from `53080` to `52081`, default host from `0.0.0.0` to `127.0.0.1`
- **Optional password auth** — same `X-Auth-Password` header / `?token=` query mechanism, preserved from Bun version

### Frontend (Vite)
- **Vite 6** — modular build replacing the single 1300+ line embedded HTML
- **Tailwind CSS v4** — via `@tailwindcss/vite` plugin, replacing CDN approach
- **Modular source** — `app.js` (main UI + logic), `api.js` (API client with Tauri `invoke` detection), `i18n.js` (zh/en dictionary), `main.js` (entry), `style.css`
- **Tauri-ready** — `api.js` auto-detects Tauri environment and switches between `fetch` (web) and `invoke` (Tauri IPC), `vite.config.js` externals `@tauri-apps/api/core`
- **All features preserved** — multimodal chat, image/file upload, Viewer.js, showdown.js, context toggle, model config persistence, per-conversation model memory, dark/light theme, i18n

### Infrastructure
- **GitHub Actions** — release workflow rebuilt: 3-platform Rust binaries (Linux x64, Windows x64, macOS arm64 + x64) + Vite frontend zip; old Bun build workflow replaced
- **Git branches** — `bun` renamed to `bun_legacy_archived`; `main` is now the default branch with Rust code
- **Deployed to debsvc** — systemd service `model-api-tester-rust.service` on port 52081, nginx reverse proxy at `/api-tester-rust/`, reusing the existing SQLite database from the Bun version

### Breaking Changes
- Default port: `53080` -> `52081`
- Default host: `0.0.0.0` -> `127.0.0.1` (use `HOST=0.0.0.0` for external access)
- Frontend no longer embedded in binary — must be deployed to `crates/http-server/static/` relative to working directory

---

## [v0.1.4] — 2026-08-29

### Features
- **对话记忆模型配置**：每次发送消息时自动保存当前模型配置到对话记录，重新打开对话时自动恢复 Base URL / API Key / 模型 / 参数等
- **默认展开两侧抽屉**：左右抽屉默认展开，无需手动点击
- **图片双击放大**：集成 Viewer.js，聊天区图片双击打开查看器，支持缩放/旋转/翻转/下载等操作

### Bug Fixes
- 修复图片重复显示问题（content 数组与 m.images 双重渲染）

---

## [v0.1.3] — 2026-08-29

### Features
- **i18n 国际化**：右上角新增语言切换图标，支持中文/英文；默认根据浏览器/OS 语言自动检测
- **亮暗主题**：右上角新增主题切换图标，支持亮色/暗色两种主题；默认亮色，偏好保存在 localStorage
- 所有 UI 文本通过 `data-i18n` 属性 + `t()` 函数驱动，切换语言即时生效
- 暗色模式覆盖全部界面元素（对话气泡、抽屉、输入区、markdown 内容等）

---

## [v0.1.2] — 2026-08-29

### Bug Fixes
- **对话删除修复**：删除对话后不再自动新建"新对话"，改为切换到最近一条剩余对话；仅在全部删完时才新建
- **门户导航页链接修复**：`https://192.168.5.7:53080` → `http://192.168.5.7:53080`（服务仅跑 HTTP）

### Features
- 右上角设置按钮左侧新增 **GitHub 图标链接**，指向项目仓库
- **保存模型配置**按钮从高级选项中移出，独立显示在配置表单下方，无需展开高级选项即可保存
- 保存配置后显示已保存的模型地址提示从高级选项内移到按钮正下方

---

## [v0.1.1] — 2026-08-29

### Features
- Default port changed from 3000 to **53080**; added `HOST` environment variable (default `0.0.0.0`)
- Right drawer redesign:
  - **API type dropdown** (openai / anthropic / google / other) — controls request body format and response parsing
  - **Endpoint path dropdown** — provides candidate paths per API type (e.g. `/v1/chat/completions`, `/v1/messages`); empty value = auto-infer
  - **Model field on its own line** with a refresh button to fetch model list from `/v1/models`, plus live filtering as you type
- Added **Google Gemini API support**: `contents[]` format, `systemInstruction`, `inlineData` for images, adjacent same-role message merging
- Attachment button moved to **right of input, left of send button**
- Context toggle **defaults to off** (was on)
- Title displays **version badge** (`v0.1.1`)
- Added `api_type` column to `model_configs` table (with auto-migration for existing databases)

### Bug Fixes
- Fixed OpenAI response parsing — was incorrectly using Claude's `respData.content` path due to `isMessagesEndpoint` flag being set in the OpenAI branch
- Fixed message meta (duration/tokens/model name) position — moved from right-side to **below the bubble**

### Infrastructure
- Added **GitHub Actions release workflow** (`.github/workflows/release.yml`) — auto-builds Linux + Windows binaries on tag push and creates a GitHub Release
- Deployed to debsvc with updated systemd service (PORT=53080, HOST=0.0.0.0)
- Nginx `/api-tester/` reverse proxy removed; portal navigation page now links directly to `https://192.168.5.7:53080`

---

## [v0.1.0] — 2026-08-29

### Rewrite — Bun + SQLite Engineering Version

Complete rewrite from the original single-file HTML fork into an engineering project:

### Features
- **Single-binary deployment** via `bun build --compile` (Linux / Windows / macOS targets)
- **SQLite storage** (`bun:sqlite`) for model configs, conversations, messages, and images
- **Multi-modal support** — image upload (OpenAI vision `image_url` format, Claude `image` source format), file upload (Claude `document` block)
- **Response timing stats** — each reply shows elapsed time, token usage, model name
- **Context toggle** — one-click switch for sending conversation history
- **System prompt** support
- **Model config persistence** — save/switch multiple configs
- **Conversation persistence** — multi-conversation list, messages (including images) stored in SQLite
- **Optional password auth** via `ACCESS_PASSWORD` environment variable
- **Claude support** — auto-detects Claude models, adapts `/v1/messages` request/response format
- **Auto URL dedup** — Base URL containing `/v1` is smart-deduplicated, avoiding `/v1/v1/...`
- **Relative-path API** — frontend uses relative paths for sub-path deployment compatibility
- **Tailwind CSS** (CDN) for UI styling, **showdown.js** for Markdown rendering
- **Drawer-based UI** — left drawer for conversation list, right drawer for model config, both collapsible

### Project Structure
- `src/server.ts` — Bun HTTP server + REST API
- `src/db.ts` — SQLite data layer (model configs, conversations, messages, images)
- `src/frontend.html` — Frontend page (embedded at compile time)
- `package.json`, `tsconfig.json`

### Original Fork (Pre-v0.1.0)

Based on [openai-api-tester](https://github.com/RunningFelix/openai-api-tester) by [@RunningFelix](https://github.com/RunningFelix) (MIT License).

The original was a single-file HTML tool for testing OpenAI-compatible APIs. Before the v0.1.0 rewrite, the following modifications were made on top of the fork:

- Fixed URL concatenation bug: Base URL already containing `/v1` was being appended with another `/v1`, resulting in `http://host/v1/v1/chat/completions`
- Added smart URL dedup in `getApiUrl()` (handles both `auto` mode and manual endpoint)
- Deployed to debsvc behind Nginx reverse proxy at `/api-tester/`