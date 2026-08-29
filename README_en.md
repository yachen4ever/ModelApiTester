# ModelApiTester

English | [中文](./README.md)

A lightweight LLM API testing tool with an all-in-one frontend/backend, deployable as a single binary. Supports multimodal chat, image/file upload, response timing stats, and persistent conversations & model configs.

Designed for individuals/teams who need to test API availability and manage API keys — not a full-blown chat product, just "fill in the endpoint → send a message → see the result."

## Features

- **Single-binary deployment** — Bun compiles to a standalone executable (Linux / Windows), SQLite storage, no Node runtime required
- **Multi-API type support** — Built-in OpenAI / Anthropic / Google Gemini / other mainstream API formats, auto-adapts request body and response parsing
- **Model list fetch** — Click the refresh button next to the model field to pull available models from `/v1/models`, with live filtering
- **API type + endpoint dropdown** — Provides candidate paths per type (e.g. `/v1/chat/completions`, `/v1/messages`); empty = auto-infer
- **Image & file upload** — Multi-image select/preview, images sent as multimodal (OpenAI vision format), files attachable (Claude document block)
- **Response timing** — Each reply shows elapsed time, token usage, and model name (below the bubble)
- **Context toggle** — One-click switch for sending conversation history (off = pure single-turn test mode), defaults to off
- **System prompt** — Optional system prompt field in the sidebar
- **Persistent model configs** — Save/switch multiple configs; Base URL / API Key / model name / API type stored in SQLite
- **Persistent conversations** — Multi-conversation list, chat history (including images) stored in SQLite, survives refresh
- **Optional password auth** — Set `ACCESS_PASSWORD` env var to require a password (empty = no auth)
- **Claude support** — Auto-detects Claude models, adapts `/v1/messages` format + image source format
- **Google Gemini support** — `contents[]` format, `systemInstruction`, `inlineData` images, adjacent same-role merge
- **Auto URL dedup** — Smart deduplication when Base URL contains `/v1`, no `/v1/v1/...`

## Tech Stack

- **Bun** — Runtime + HTTP server + compiler (`bun build --compile`)
- **bun:sqlite** — Data storage (model configs, conversations, messages, images)
- **Tailwind CSS** (CDN) — UI styling
- **showdown.js** — Markdown rendering
- **Native fetch** — Requests to OpenAI / Claude / Gemini compatible endpoints

## Quick Start

### Local Development

```bash
bun install
bun run dev       # dev mode (hot reload)
# or
bun run start     # direct run
```

Default listen on `0.0.0.0:53080`, open `http://localhost:53080` in browser.

### Compile Binary

```bash
# Linux
bun build src/server.ts --compile --target=bun-linux-x64 --outfile dist/model-api-tester-linux

# Windows
bun build src/server.ts --compile --target=bun-windows-x64 --outfile dist/model-api-tester.exe

# macOS
bun build src/server.ts --compile --target=bun-darwin-x64 --outfile dist/model-api-tester-mac
```

### Production Run

```bash
# Environment variables
export PORT=53080
export HOST=0.0.0.0
export DB_PATH=/opt/model-api-tester/model_api_tester.db
export ACCESS_PASSWORD=your-password   # optional, empty = no auth

./model-api-tester-linux
```

### systemd Service Example

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
Environment=PORT=53080
Environment=HOST=0.0.0.0
Environment=DB_PATH=/opt/model-api-tester/model_api_tester.db
# Environment=ACCESS_PASSWORD=your-password

[Install]
WantedBy=multi-user.target
```

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
├── src/
│   ├── server.ts        # Bun HTTP server + REST API
│   ├── db.ts            # SQLite data layer
│   └── frontend.html    # Frontend page (embedded at compile time)
├── .github/
│   └── workflows/
│       └── release.yml  # GitHub Actions release workflow
├── package.json
├── tsconfig.json
├── README.md
├── README_en.md
├── CHANGELOG.md
└── .gitignore
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## Credits

This project started as a fork of [openai-api-tester](https://github.com/RunningFelix/openai-api-tester) by [@RunningFelix](https://github.com/RunningFelix) (MIT License). It has since been rewritten as a Bun + SQLite engineering version with image upload, response timing, context toggle, UI redesign, multi-API type support, and more.

## License

MIT
