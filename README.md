# Taskifier

A collaborative task management app with real-time team sync, AI-powered task suggestions, and interactive calendar views.

https://deepwiki.com/B-a-d-r-a-n/Taskifier

## Features

- **Task management** — Create, assign, prioritize, and track tasks across teams
- **Real-time sync** — Live updates via Server-Sent Events (SSE)
- **AI task assistance** — Smart task rewrites and suggestions via Ollama (degrades gracefully when offline)
- **Calendar views** — Interactive scheduling with team availability
- **Team collaboration** — Shared workspaces with role-based access
- **Secure auth** — JWT with rotating refresh tokens & email encryption at rest

## Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native (Expo) — Web + Android |
| Backend | Express.js + Prisma ORM (PostgreSQL) |
| AI | Python (FastAPI) + Ollama |
| Real-time | Server-Sent Events (SSE) |
| Auth | JWT access tokens + rotating refresh tokens |
| Monorepo | pnpm workspaces + Turborepo |

## Prerequisites

- **Node.js >= 20** and **pnpm >= 9**
- **PostgreSQL** running and accessible
- **Python >= 3.11** and **uv** (Python package manager)
- **Ollama** with a model pulled (e.g. `llama3.2`) — optional, AI features degrade gracefully

## Quick Start

### 1. Clone & environment setup

```bash
cp .env.example apps/server/.env
cp .env.example apps/ai/.env
```

At minimum, set these in `apps/server/.env`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | 32+ character random string |
| `EMAIL_ENCRYPTION_KEY` | 64 hex characters (32 bytes) |

### 2. Install dependencies

```bash
# JS/TS packages (all apps + packages)
pnpm install

# Python AI service
cd apps/ai && uv sync && cd ../..
```

### 3. Database setup

```bash
cd apps/server
pnpm db:migrate
pnpm db:generate
cd ../..
```

### 4. Run dev servers

```powershell
.\dev.ps1
```

This starts three processes in parallel:

| Service | Port | URL |
|---------|------|-----|
| Mobile (Expo) | `8081` | http://localhost:8081 |
| Backend (Express) | `3000` | http://localhost:3000 |
| AI (FastAPI) | `8001` | http://localhost:8001/docs |

### Running without the dev script

```powershell
# Terminal 1 — Backend
cd apps/server; pnpm run dev

# Terminal 2 — AI
cd apps/ai; uv run uvicorn main:app --reload --host 0.0.0.0 --port 8001

# Terminal 3 — Mobile
cd apps/Taskifier
$env:CI = "1"
npx expo start -c --port 8081 --web
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start all dev servers via Turborepo |
| `pnpm run build` | Build all packages and apps |
| `pnpm run lint` | Lint all projects |
| `pnpm run typecheck` | Type-check all projects |
| `pnpm run test` | Run all tests |
| `pnpm run clean` | Clean all build artifacts |
| `.\dev.ps1` | Parallel dev launcher (PowerShell) |
| `.\install.ps1` | Full install (deps + DB setup) |

## Architecture

```
taskifier/
├── apps/
│   ├── ai/              # Python FastAPI — Ollama-powered task rewrites
│   ├── server/          # Express REST API + SSE endpoints
│   └── Taskifier/       # React Native (Expo) mobile app
├── packages/
│   ├── config/          # Shared ESLint + TypeScript config
│   ├── env/             # Zod-validated environment schemas
│   ├── types/           # Shared TypeScript type definitions
│   └── utils/           # Crypto helpers + Zod validators
└── dev.ps1              # Parallel dev launcher (PowerShell)
```

### Data flow

```
Mobile App ──HTTP/SSE──> Express API ──Prisma──> PostgreSQL
                              │
                              └──> FastAPI ──HTTP──> Ollama
```

## Environment Variables

### `apps/server/.env`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | JWT signing secret (32+ chars) |
| `JWT_EXPIRES_IN` | No | `15m` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRES_IN` | No | `7d` | Refresh token lifetime |
| `EMAIL_ENCRYPTION_KEY` | Yes | — | AES-256-GCM key (64 hex chars) |
| `AI_SERVICE_URL` | No | `http://localhost:8001` | FastAPI endpoint |
| `PORT` | No | `3000` | API server port |
| `NODE_ENV` | No | `development` | Environment |

### `apps/ai/.env`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OLLAMA_BASE_URL` | No | `http://localhost:11434` | Ollama host |
| `OLLAMA_MODEL` | No | `llama3.2` | Model to use |

## Key Design Decisions

- **Email privacy** — Emails are SHA-256 hashed for lookups and AES-256-GCM encrypted for recovery; never stored in plaintext
- **Refresh token rotation** — Each refresh revokes the old token and issues a new one, limiting the window for token theft
- **Cross-platform SSE** — Web uses native `EventSource`; React Native uses `fetch` + `ReadableStream` with manual SSE parsing
- **Graceful AI degradation** — If Ollama is unreachable, the app continues working; AI rewrites show a "not available" fallback
