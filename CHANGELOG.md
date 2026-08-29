---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: 'd5212965-73c6-415c-8a67-1b5a2927013b'
  PropagateID: 'd5212965-73c6-415c-8a67-1b5a2927013b'
  ReservedCode1: '71a900a7-28b5-454b-909c-cebe9010eb8e'
  ReservedCode2: '71a900a7-28b5-454b-909c-cebe9010eb8e'
---

# Changelog

All notable changes to this project. Dates are in CST (UTC+8).

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