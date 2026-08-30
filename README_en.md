# ModelApiTester

English | [中文](./README.md)

A lightweight LLM API testing tool with multimodal chat, image/file upload, streaming output, response timing stats, and persistent conversations & model configs.

Designed for individuals/teams who need to test API availability and manage API keys — not a full-blown chat product, just "fill in the endpoint -> send a message -> see the result."

## Features

- **Multi-API type support** — Built-in OpenAI / Anthropic / Google Gemini / other mainstream API formats, auto-adapts request body and response parsing
- **Streaming output** — Supports OpenAI / Anthropic / Google Gemini SSE streaming formats, character-by-character output with blinking cursor, auto Markdown render on completion
- **Preset test prompts** — 32 curated prompts across 8 capability categories (reasoning / coding / math / instruction following / creative writing / multilingual / knowledge / safety), one-click fill into the input box, ideal for quickly comparing model capabilities
- **Unified app icon** — Indigo gradient rounded square + white lightning bolt, consistent across Web favicon and desktop
- **About dialog** — Chrome-like about page: brand area + update checker (auto-checks GitHub latest release, one-click jump to download when outdated) + GitHub / Changelog / Credits links
- **Single-file desktop executable** — Tauri build no longer bundles installers; one portable binary, data stored in `~/.mat-desktop/`
- **Response timing** — Each reply shows elapsed time, token usage, and model name; streaming mode breaks down prefill/decode timing and tok/s separately
- **Image & file upload** — Multi-image select/preview, images sent as multimodal (OpenAI vision format), files attachable (Claude document block)
- **Image double-click zoom** — Integrated Viewer.js; double-click any chat image to open a viewer with zoom/rotate/flip/download
- **Model list fetch** — Click the refresh button next to the model field to pull available models from `/v1/models`, with live filtering
- **API type + endpoint dropdown** — Provides candidate paths per type (e.g. `/v1/chat/completions`, `/v1/messages`); empty = auto-infer
- **Context toggle** — One-click switch for sending conversation history (off = pure single-turn test mode), defaults to off
- **System prompt** — Optional system prompt field in the sidebar
- **Persistent model configs** — Save/switch multiple configs; Base URL / API Key / model name / API type stored in SQLite
- **Per-conversation model memory** — Current model config is auto-saved per conversation and restored when reopening
- **Persistent conversations** — Multi-conversation list, chat history (including images) stored in SQLite, survives refresh; one-click clear all conversations
- **i18n** — Chinese/English toggle, defaults to browser/OS language
- **Dark/light theme** — One-click toggle, preference saved to localStorage
- **Claude support** — Auto-detects Claude models, adapts `/v1/messages` format + image source format
- **Google Gemini support** — `contents[]` format, `systemInstruction`, `inlineData` images, adjacent same-role merge
- **Auto URL dedup** — Smart deduplication when Base URL contains `/v1`, no `/v1/v1/...`

## Three Usage Modes

ModelApiTester offers three deployment/usage modes, all sharing the same Rust core and Vite frontend:

| Mode | Description | Use case |
|------|-------------|----------|
| **Server** | Rust binary + frontend static files, accessed via browser | Server deployment, team sharing |
| **Desktop app** | Tauri-packaged native desktop application | Local use, no server needed |
| **Build from source** | cargo + npm local build | Development, customization |

---

### Mode 1: Server

Download the files for your platform from [Releases](https://github.com/yachen4ever/ModelApiTester/releases):

| File | Platform |
|------|----------|
| `mat-server-linux-x64` | Linux x86_64 |
| `mat-server-windows-x64.exe` | Windows x86_64 |
| `mat-server-macos-arm64` | macOS Apple Silicon |
| `mat-server-macos-x64` | macOS Intel |
| `mat-frontend-dist.zip` | Frontend static files (all platforms) |

**Deployment steps:**

```bash
# 1. Create deployment directory
mkdir -p ~/mat-server/static
cd ~/mat-server

# 2. Place the binary
cp ~/Downloads/mat-server-linux-x64 ./mat-server
chmod +x mat-server

# 3. Extract frontend to static directory
unzip ~/Downloads/mat-frontend-dist.zip -d static/

# 4. Run
./mat-server --static-dir ./static
```

Open `http://localhost:52081` in your browser.

**CLI options:**

```
Usage: mat-server [OPTIONS]

Options:
      --host <HOST>          Listen address [default: 127.0.0.1]
      --port <PORT>          Listen port [default: 52081]
      --db-path <DB_PATH>    SQLite database path [default: ./model_api_tester.db]
      --static-dir <DIR>     Frontend static files directory [default: crates/http-server/static]
  -h, --help                 Show help
  -V, --version              Show version
```

All options also support environment variables (`HOST`/`PORT`/`DB_PATH`/`STATIC_DIR`). CLI flags take precedence over environment variables.

```bash
# Expose externally + custom port and database path
./mat-server --host 0.0.0.0 --port 8080 --db-path /data/mat.db --static-dir /var/www/mat

# Or via environment variables
export HOST=0.0.0.0
export PORT=8080
./mat-server
```

**Production deployment (systemd + nginx):**

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

nginx serves frontend static files directly and only proxies `/api/` to the Rust backend:

```nginx
# Frontend static files
location /api-tester-rust/ {
    alias /var/www/api-tester-rust/;
    index index.html;
    try_files $uri $uri/ /api-tester-rust/index.html =404;
}

# API proxy to Rust backend
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

> In nginx deployment mode, the backend does not need `--static-dir` (nginx handles static files), but `--db-path` is still required.

---

### Mode 2: Desktop App (Tauri)

Download the executable for your platform from [Releases](https://github.com/yachen4ever/ModelApiTester/releases) (**single file, no installer**):

| File | Platform |
|------|----------|
| `mat-desktop-windows-x64.exe` | Windows x86_64 |
| `mat-desktop-darwin-arm64` | macOS Apple Silicon |
| `mat-desktop-darwin-x64` | macOS Intel |
| `mat-desktop-linux-x64` | Linux x86_64 |

Download and launch directly — data is stored in `~/.mat-desktop/`, no server configuration needed.

> **Note**: Since v0.5.3 the desktop build is a single executable (no msi/dmg/deb installers).
> The data directory is fixed to `~/.mat-desktop/model_api_tester.db` for portable green distribution.

<!-- screenshot placeholder -->

---

### Mode 3: Build from Source

**Prerequisites:**
- Rust 1.75+ (install via `rustup`)
- Node.js 18+ (for frontend build)

```bash
# 1. Build frontend
cd frontend
npm install
npm run build        # Output goes to crates/http-server/static/

# 2. Build backend
cd ..
cargo build --release

# 3. Run
./target/release/model-api-tester
```

**Local development** (start frontend and backend separately, with hot-reload):

```bash
# Terminal 1: Start backend (default 127.0.0.1:52081)
cargo run

# Terminal 2: Start frontend dev server (default localhost:5173, proxies /api -> :52081)
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. Frontend code changes hot-reload instantly.

---

## Tech Stack

**Backend (shared core):**
- Rust + axum 0.8 (HTTP server)
- rusqlite (bundled SQLite)
- tower-http (static file serving + CORS)
- clap (CLI argument parsing)

**Frontend:**
- Vue 3 (Composition API + `<script setup>`)
- Vite 6 + Tailwind CSS v4
- showdown.js (Markdown rendering)
- Viewer.js (image viewer)
- Font Awesome (icons)
- Native fetch (API requests)

**Desktop:**
- Tauri 2 (reuses core + frontend)

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET/POST | `/api/configs` | List / create model configs |
| PUT/DELETE | `/api/configs/:id` | Update / delete model config |
| GET/POST | `/api/conversations` | List / create conversations |
| PUT/DELETE | `/api/conversations/:id` | Update / delete conversation |
| GET/DELETE | `/api/conversations/:id/messages` | List / clear messages |
| POST | `/api/messages` | Save message (with images/files) |

## Project Structure

```
ModelApiTester/
├── Cargo.toml                    # Rust workspace root
├── Cargo.lock
├── crates/
│   ├── core/                     # Shared business logic (server + desktop)
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs            # Module exports + VERSION
│   │       ├── models.rs         # Data structures + DTOs
│   │       └── db.rs             # SQLite schema/migration/CRUD
│   ├── http-server/              # axum HTTP server
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   └── main.rs           # CLI args + routes + ServeDir
│   │   └── static/               # Vite build output (gitignored)
│   └── tauri-app/                # Tauri desktop app (reuses core)
│       ├── Cargo.toml
│       ├── tauri.conf.json
│       └── src/
│           ├── lib.rs            # IPC routing (api_request command)
│           └── main.rs           # Tauri entry
├── frontend/                     # Vite + Vue 3 frontend project
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.js               # Vue mount entry
│       ├── App.vue               # Root layout (theme/language/conversation state)
│       ├── i18n.js               # zh/en i18n (Vue reactive)
│       ├── style.css             # Tailwind v4 + custom styles
│       ├── components/           # Vue components
│       │   ├── ChatPanel.vue      #   Chat area + streaming + preset prompt panel + send logic
│       │   ├── ConversationList.vue #  Conversation list
│       │   ├── ModelConfig.vue     #   Model config panel
│       │   ├── MessageBubble.vue   #   Message bubble + Markdown render
│       │   └── StreamBubble.vue    #   Streaming output bubble
│       └── composables/          # Vue Composition utilities
│           ├── useApi.js           #   API client (fetch / Tauri invoke)
│           ├── useStream.js        #   SSE streaming response parser
│           └── useUtils.js         #   Utility functions + request builder
├── .github/
│   └── workflows/
│       └── release.yml           # GitHub Actions (3-platform binaries + frontend zip + Tauri single executable)
├── README.md
├── README_en.md
├── CHANGELOG.md
└── .gitignore
```

> The legacy Bun version is archived in the `bun_legacy_archived` branch.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## Credits

This project started as a fork of [openai-api-tester](https://github.com/RunningFelix/openai-api-tester) by [@RunningFelix](https://github.com/RunningFelix) (MIT License). It has since been rewritten first as a Bun + SQLite engineering version, then as a Rust + Vite rewrite, with image upload, response timing, context toggle, UI redesign, multi-API type support, and more.

## License

MIT