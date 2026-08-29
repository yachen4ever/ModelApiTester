# ModelApiTester

English | [中文](./README.md)

A lightweight LLM API testing tool with a Rust backend and Vite frontend, deployable as a single binary. Supports multimodal chat, image/file upload, response timing stats, and persistent conversations & model configs.

Designed for individuals/teams who need to test API availability and manage API keys — not a full-blown chat product, just "fill in the endpoint -> send a message -> see the result."

## Features

- **Single-binary deployment** — Rust compiles to a native executable (Linux / Windows / macOS), SQLite storage, no runtime required
- **Multi-API type support** — Built-in OpenAI / Anthropic / Google Gemini / other mainstream API formats, auto-adapts request body and response parsing
- **Model list fetch** — Click the refresh button next to the model field to pull available models from `/v1/models`, with live filtering
- **API type + endpoint dropdown** — Provides candidate paths per type (e.g. `/v1/chat/completions`, `/v1/messages`); empty = auto-infer
- **Image & file upload** — Multi-image select/preview, images sent as multimodal (OpenAI vision format), files attachable (Claude document block)
- **Image double-click zoom** — Integrated Viewer.js; double-click any chat image to open a viewer with zoom/rotate/flip/download
- **Response timing** — Each reply shows elapsed time, token usage, and model name (below the bubble); streaming mode breaks down prefill/decode timing and tok/s separately
- **Streaming output** — Supports OpenAI / Anthropic / Google Gemini SSE streaming formats, character-by-character output with blinking cursor, auto Markdown render on completion
- **Context toggle** — One-click switch for sending conversation history (off = pure single-turn test mode), defaults to off
- **System prompt** — Optional system prompt field in the sidebar
- **Persistent model configs** — Save/switch multiple configs; Base URL / API Key / model name / API type stored in SQLite
- **Per-conversation model memory** — Current model config is auto-saved per conversation and restored when reopening
- **Persistent conversations** — Multi-conversation list, chat history (including images) stored in SQLite, survives refresh; one-click clear all conversations
- **i18n** — Chinese/English toggle, defaults to browser/OS language
- **Dark/light theme** — One-click toggle, preference saved to localStorage
- **Tauri desktop app** — Same Rust core + Vite frontend, packaged as a native desktop application (.msi / .dmg / .AppImage)
- **Claude support** — Auto-detects Claude models, adapts `/v1/messages` format + image source format
- **Google Gemini support** — `contents[]` format, `systemInstruction`, `inlineData` images, adjacent same-role merge
- **Auto URL dedup** — Smart deduplication when Base URL contains `/v1`, no `/v1/v1/...`

## Tech Stack

- **Rust** — Backend language
- **axum** — HTTP server framework
- **rusqlite** (bundled) — SQLite data storage (model configs, conversations, messages, images)
- **tower-http** — Static file serving (ServeDir) + CORS
- **Vite 6** — Frontend build tool
- **Tailwind CSS v4** — UI styling + dark mode
- **showdown.js** — Markdown rendering
- **Viewer.js** — Image viewer (zoom/rotate/flip/download)
- **Native fetch** — Requests to OpenAI / Claude / Gemini compatible endpoints

## Download & Usage

### Option 1: Download Pre-built Binaries (Recommended)

Go to [Releases](https://github.com/yachen4ever/ModelApiTester/releases) and download the files for your platform:

| File | Platform |
|------|----------|
| `model-api-tester-linux-x64` | Linux x86_64 |
| `model-api-tester-windows-x64.exe` | Windows x86_64 |
| `model-api-tester-macos-arm64` | macOS Apple Silicon |
| `model-api-tester-macos-x64` | macOS Intel |
| `frontend-dist.zip` | Frontend static files (all platforms) |
| Tauri installers | Desktop app (.msi / .dmg / .AppImage) |

**Deployment steps:**

```bash
# 1. Create deployment directory
mkdir -p ~/model-api-tester/crates/http-server/static
cd ~/model-api-tester

# 2. Place the binary
cp ~/Downloads/model-api-tester-linux-x64 ./model-api-tester
chmod +x model-api-tester

# 3. Extract frontend to static directory
unzip ~/Downloads/frontend-dist.zip -d crates/http-server/static/

# 4. Run
./model-api-tester
```

Open `http://localhost:52081` in your browser.

> **Note**: Frontend static files must be placed at `crates/http-server/static/` relative to the **working directory**.

### Option 2: Build from Source

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

## Configuration

Configure via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `52081` | Listen port |
| `HOST` | `127.0.0.1` | Listen address (use `0.0.0.0` for external access) |
| `DB_PATH` | `./model_api_tester.db` | SQLite database path |

```bash
# Example
export HOST=0.0.0.0
export PORT=52081
export DB_PATH=/opt/model-api-tester/model_api_tester.db
./model-api-tester
```

## Production Deployment

### systemd Service

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

[Install]
WantedBy=multi-user.target
```

### Nginx Reverse Proxy (Static Frontend + API Proxy)

For production, nginx serves frontend static files directly and only proxies `/api/` to the Rust backend:

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

> The frontend build uses `base: '/api-tester-rust/'` (built into `vite.config.js`), so asset paths are automatically prefixed.

## Local Development

Start frontend and backend separately. The Vite dev server proxies API requests to the Rust backend:

```bash
# Terminal 1: Start backend (default 127.0.0.1:52081)
cargo run

# Terminal 2: Start frontend dev server (default localhost:5173, proxies /api -> :52081)
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. Frontend code changes hot-reload instantly.

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
│   ├── core/                     # Shared business logic
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs            # Module exports + VERSION
│   │       ├── models.rs         # Data structures + DTOs
│   │       └── db.rs             # SQLite schema/migration/CRUD
│   ├── http-server/              # axum HTTP server
│   │   ├── Cargo.toml
│   │   ├── src/
│   │   │   └── main.rs           # Routes + ServeDir static files
│   │   └── static/               # Vite build output (gitignored)
│   └── tauri-app/                # Tauri desktop app (reuses core)
├── frontend/                     # Vite frontend project
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.js               # Entry
│       ├── app.js                # Main app (UI + business logic)
│       ├── api.js                # API client
│       ├── i18n.js               # zh/en i18n
│       ├── stream.js             # SSE streaming response parser
│       └── style.css             # Tailwind v4 + custom styles
├── .github/
│   └── workflows/
│       └── release.yml           # GitHub Actions (3-platform binaries + frontend zip + Tauri installers)
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