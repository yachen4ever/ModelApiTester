# Changelog

All notable changes to this project. Dates are in CST (UTC+8).

---

## [v0.5.6] — 2026-09-01

### Bug Fixes
- **修复预设提示词不随语言切换** — 界面切换英文后，预设测试用例（预设提示词）仍发送中文内容；
  改为每个用例提供 `contentEn` 英文版本，发送时根据当前界面语言自动选择

### Features
- **保存模型配置对话框重做** — 原生 `prompt()` 替换为自研对话框，名称拆分为两部分：
  A（模型名）+ B（域名），B 默认取 URL 主机名（不含端口与子目录，如 `openrouter.ai`、`192.168.5.2`），均可编辑
- **已保存配置列表优化** — 每项改为上方大字显示名称 A、下方小字显示域名 B，
  兼容旧数据（`model @ host` 格式自动拆分，无 `@` 时以模型名/URL 域名兜底）

### Technical
- `frontend/src/components/SaveConfigDialog.vue` — 新增自研保存配置对话框组件
- `frontend/src/composables/useUtils.js` — 新增 `tryGetHostname()`（提取纯主机名）
- `frontend/src/components/ModelConfig.vue` — 接入对话框、列表 A/B 拆分显示
- `frontend/src/presetPrompts.js` — 全部 29 个预设测试用例增加 `contentEn` 英文字段
- `frontend/src/components/ChatPanel.vue` — `applyPreset` 按 `currentLang` 选择 `contentEn` / `content`
- `frontend/src/App.vue` — 向 `ChatPanel` 传入 `current-lang` prop
- `.github/workflows/release.yml` — 产物矩阵精简：服务器版仅 Linux（amd64 + 新增 aarch64）；
  Tauri 版 Linux 打包 AppImage + deb、macOS 打包 dmg（arm64 + x64）、Windows 保持单文件 exe
- `crates/tauri-app/tauri.conf.json` — 开启 bundle 打包（`active: true`）

---

## [v0.5.5] — 2026-08-31

### Bug Fixes
- **修复已加载配置提示显示 undefined** — 从对话恢复模型配置时 `last_config` JSON 缺少 `name` 字段，
  导致提示文案显示 `已加载: undefined (模型名)`；改为回退到 `model` 字段并简化提示格式
- **修复配置提示不随语言切换更新** — 将 `savedModelHint` 从静态字符串改为 computed 属性，
  切换语言后提示文案自动更新为当前语言

### Technical
- `frontend/src/components/ModelConfig.vue` — `savedModelHint` 拆分为 `savedHintLabel` + `savedHintDetail`，
  通过 computed 实时响应 `t()` 翻译
- `README.md` / `README_en.md` — 精简内容去掉过程细节，截图移至功能介绍区，
  nginx location 统一用 `mat` 命名，CLI 参数说明补充 `--static-dir` / `--db-path` 作用

---

## [v0.5.4] — 2026-08-30

### Features — Markdown 渲染升级 + 公式与视频支持
- **Markdown 渲染引擎替换** — 从 showdown 切换至 markdown-it，渲染更规范、扩展性更强
- **数学公式渲染** — 集成 KaTeX，支持行内 `$...$` 与块级 `$$...$$` 公式语法，
  覆盖上下标、分数、根号、求和、希腊字母、集合等常用 LaTeX 语法
- **视频播放支持** — 视频文件链接（.mp4/.webm/.mov 等）及 `data:video` URI 自动渲染为
  `<video controls>` 播放器，支持播放/进度/音量/全屏
- **README 实机截图** — 中英文 README 均新增三栏布局实机截图（API Key 已脱敏）

### Technical
- 新增 `frontend/src/composables/mdRender.js` — 共享 Markdown 渲染模块
  （markdown-it + markdown-it-texmath + KaTeX，含视频链接/图片规则自定义）
- `frontend/src/components/MessageBubble.vue` / `StreamBubble.vue` —
  showdown `converter.makeHtml()` → `renderMarkdown()`
- `frontend/src/style.css` — 新增 KaTeX 样式引入 + 视频播放器样式
- `frontend/src/main.js` — 引入 `katex/dist/katex.min.css`
- `frontend/package.json` — 新增 markdown-it / markdown-it-texmath / katex 依赖，移除 showdown
- `docs/screenshot.png` — 脱敏后实机截图（288KB）
- `README.md` / `README_en.md` — 嵌入截图 + 技术栈更新 + 公式/视频特性说明 + 目录结构补充
- `crates/http-server/src/main.rs` — 移除 HOST/PORT/DB_PATH/STATIC_DIR 环境变量支持，
  仅通过 CLI 参数配置（更精确、避免环境变量干扰）

---

## [v0.5.3] — 2026-08-30

### Features — 统一图标 + 关于页面 + 桌面版单文件
- **统一应用图标** — 设计全新图标（Indigo 渐变圆角方块 + 居中白色闪电符号），
  统一 Web favicon 与桌面版（Tauri）图标，全平台一套视觉
- **语言切换按钮改进** — 中文界面显示 `EN`，英文界面显示 `中`，替代原 `fa-language` 图标，语义更直观
- **关于（About）弹窗** — 导航栏新增"关于"按钮（`fa-circle-info`），仿 Chrome 关于页风格：
  - 品牌区：应用图标 + 名称 + 副标题
  - 更新检测区：启动时自动检查 GitHub 最新版本，展示 checking / current / outdated / error 四种状态；
    检测到新版本时显示"可更新"按钮，点击跳转下载页（不自动下载）
  - 链接区：GitHub、更新日志（CHANGELOG）、致谢（openai-api-tester）
  - 版权区：版权声明 + MIT License 声明
- **Tauri 桌面版改为单可执行文件** — 不再生成安装包（msi/dep/dmg），
  数据目录改为 `~/.mat-desktop/`（原平台 data 目录），便于绿色分发

### Technical
- 新增 `frontend/public/app-icon.svg` — 1024×1024 应用图标源文件（Indigo 渐变 + FA bolt 路径）
- 新增 `frontend/src/components/AboutDialog.vue` — 关于弹窗组件（含更新检测逻辑）
- `frontend/index.html` — 新增 `<link rel="icon">` 指向 `app-icon.svg`
- `crates/tauri-app/icons/` — 用 `tauri icon` 重新生成全套平台图标（ico/icns/png）
- `frontend/src/App.vue` — 语言按钮文字化 + 新增关于按钮 + 接入 AboutDialog
- `frontend/src/i18n.js` — 新增约 16 个 `about_*` 中英文 key
- `crates/http-server/src/main.rs` — 新增 `GET /api/check-update` 接口（代理 GitHub API，1 小时缓存）
- `crates/tauri-app/src/lib.rs` — 更新检测路由 + 请求重构为 async（tokio），
  数据目录改为 `~/.mat-desktop`
- `crates/tauri-app/tauri.conf.json` — `bundle.active: false`（不打包安装器）
- `.github/workflows/release.yml` — build-tauri 改为 `--no-bundle`，收集裸二进制发布

---

## [v0.5.2] — 2026-08-30

### Features — 预设测试提示词
- **测试用例面板** — 在聊天输入区新增烧瓶按钮（`fa-flask`），点击弹出左右分栏下拉面板：
  - 左栏为能力分类（8 项），右栏为对应分类下的预设提示词（每类 4 条，共 32 条）
  - 点击任意提示词即填入输入框，不自动发送，用户可编辑后发送
  - 烧瓶按钮激活时高亮，面板打开时自动选中第一个分类
  - 8 个分类：推理能力、代码能力、数学能力、指令遵循、创意写作、多语言、常识知识、安全性
  - 每条提示词经精选设计，能有效区分不同模型的实际能力水平

### Technical
- 新增 `frontend/src/presetPrompts.js` — 预设提示词数据，含分类元信息和提示词内容
- `frontend/src/i18n.js` — 新增约 50 个中英文 i18n key（分类名 + 提示词名 + 面板 UI 文案）
- `frontend/src/components/ChatPanel.vue` — 新增预设面板 UI + 烧瓶按钮 + 交互逻辑

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