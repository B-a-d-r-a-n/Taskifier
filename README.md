# Taskifier

A collaborative task management app with real-time team sync, AI-powered task suggestions, and interactive calendar views.

## Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native (Expo) |
| Backend | Express.js + Prisma (PostgreSQL) |
| AI | Python (FastAPI) + Ollama |
| Real-time | Server-Sent Events (SSE) |
| Auth | JWT + rotating refresh tokens |
| Monorepo | pnpm workspaces + Turborepo |

## Prerequisites

- **Node.js >= 20** and **pnpm >= 9**
- **PostgreSQL** running and accessible
- **Python >= 3.11** and **uv** (Python package manager)
- **Ollama** with a model pulled (e.g. `llama3.2`) — optional, AI features degrade gracefully

## Quick Start

### 1. Environment setup

Copy the example env files and fill in your values:

```
cp .env.example apps/server/.env
cp .env.example apps/ai/.env
```

At minimum, set `DATABASE_URL`, `JWT_SECRET` (32+ chars), and `EMAIL_ENCRYPTION_KEY` (64 hex chars) in `apps/server/.env`.

### 2. Install dependencies

```
pnpm install
cd apps/ai && uv sync
```

### 3. Database

```
cd apps/server
pnpm db:migrate
pnpm db:generate
```

### 4. Run the dev servers

```
.\dev.ps1
```

This starts three processes in parallel:
- **Mobile** — Expo dev server on port 8081
- **Backend** — Express API on port 3000
- **AI** — FastAPI on port 8001

### Running without the dev script

If you prefer not to use `dev.ps1`, start each service in its own terminal:

```powershell
# Terminal 1 — Backend
cd apps/server
pnpm run dev

# Terminal 2 — AI
cd apps/ai
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8001

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

## Architecture

```
taskifier/
├── apps/
│   ├── ai/              # Python FastAPI — Ollama-powered task rewrites
│   ├── server/          # Express REST API + SSE
│   └── Taskifier/       # React Native (Expo) mobile app
├── packages/
│   ├── config/          # Shared ESLint + TS config
│   ├── env/             # Zod-validated env schemas
│   ├── types/           # Shared TypeScript types
│   └── utils/           # Crypto + Zod validators
└── dev.ps1              # Parallel dev launcher (PowerShell)
```

## Key Design Decisions

- **Email privacy**: Emails are SHA-256 hashed for lookups and AES-256-GCM encrypted for recovery — never stored in plaintext
- **Refresh token rotation**: Each refresh revokes the old token and issues a new one, limiting the window for token theft
- **Cross-platform SSE**: Web uses native EventSource; React Native uses fetch + ReadableStream with manual SSE parsing
- **Graceful AI degradation**: If Ollama is unreachable, the app continues working — AI rewrites show a "not available" fallback
