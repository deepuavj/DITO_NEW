# DITO — AI-Powered Metadata-Driven Interior Design Platform

> A metadata-driven spatial composition platform. Not a 3D editor. Not a CAD system.
> **Everything is driven by metadata → runtime engines → Three.js rendering.**

---

## Architecture Principle

```
Metadata
  ↓
Runtime Engines (Metadata · Scene · Material · Snap · Rules · AI)
  ↓
Three.js Rendering
  ↓
Angular UI
```

Three.js handles ONLY rendering — it never owns business logic, metadata, or rules.

---

## Tech Stack

| Layer         | Technology                        |
|---------------|-----------------------------------|
| Frontend      | Angular 21 (Signals, Standalone)  |
| 3D Engine     | Three.js                          |
| Styling       | TailwindCSS + SCSS                |
| State         | Angular Signals                   |
| Backend       | Node.js + Express (TypeScript)    |
| ORM           | Prisma                            |
| Database      | PostgreSQL                        |
| Auth          | JWT (access + refresh tokens)     |
| Validation    | Zod                               |
| File Storage  | S3-compatible (MinIO local / AWS) |
| AI            | OpenAI / Ollama (local Llama)     |
| Vector Search | Qdrant                            |
| Cache/Queue   | Redis + BullMQ                    |

---

## Project Structure

```
DITO_NEW/
├── apps/
│   ├── web/                  # Angular 21 frontend
│   │   └── src/app/
│   │       ├── core/         # Auth, HTTP, guards, interceptors
│   │       ├── shared/       # Reusable UI components
│   │       ├── features/     # Page-level feature modules
│   │       │   ├── auth/
│   │       │   ├── dashboard/
│   │       │   └── studio/   # Main design editor
│   │       └── engines/      # Runtime engine layer
│   │           ├── metadata/ # Metadata parsing & registry
│   │           ├── scene/    # Scene graph management
│   │           ├── material/ # Material swapping & caching
│   │           ├── snap/     # Snapping rules
│   │           ├── rules/    # Business/design rules
│   │           └── property/ # Dynamic property panel engine
│   └── api/                  # Node.js + Express backend
│       ├── prisma/           # DB schema & migrations
│       └── src/
│           ├── modules/      # Domain modules (auth, assets, scenes…)
│           ├── middleware/   # Auth, validation, error handling
│           ├── config/       # Environment & app config
│           └── utils/        # Shared utilities
├── docs/                     # Architecture & API docs
└── docker-compose.yml        # Local dev services (PG, Redis, Qdrant)
```

---

## Development Roadmap

| Phase | Focus                          | Status      |
|-------|--------------------------------|-------------|
| 1     | Foundation (Angular + Three.js + API scaffold) | 🔄 In Progress |
| 2     | Configurable Assets (metadata, property panel) | ⏳ Planned  |
| 3     | AI Features (semantic search, layout gen)      | ⏳ Planned  |
| 4     | Realistic Rendering (PBR, shadows, post-fx)    | ⏳ Planned  |
| 5     | AR/VR (WebXR)                                  | ⏳ Planned  |

---

## Getting Started

### Prerequisites
- Node.js 22+
- PostgreSQL 15+
- Redis 7+
- Docker (optional, for local services)

### Local Services (Docker)

```bash
docker-compose up -d
```

Starts: PostgreSQL · Redis · Qdrant

### Backend

```bash
cd apps/api
cp .env.example .env   # fill in secrets
npm install
npx prisma migrate dev
npm run dev
```

API runs on `http://localhost:3000`

### Frontend

```bash
cd apps/web
npm install
npm start
```

App runs on `http://localhost:4200`

---

## Environment Variables

See `apps/api/.env.example` for all required variables.

---

## Coding Standards

- **No hardcoded** property panels, asset behaviours, snapping rules, AI rules, or rendering rules.
- All asset configurability is expressed as **metadata JSON**.
- Engines read metadata at runtime — they never import asset-specific knowledge.
- Angular components use **Signals** for state — no BehaviorSubjects for simple state.
- Backend routes follow **RESTful conventions** with Zod validation on every endpoint.
- All async route handlers are wrapped — no unhandled promise rejections.
- JWT access tokens expire in 15 min; refresh tokens in 7 days.

---

## Changelog

### 2026-06-16 — Phase 1 Foundation
- Scaffolded Angular 21 frontend (`apps/web`)
- Scaffolded Node.js/Express backend (`apps/api`)
- Established monorepo structure
- Created Docker Compose for local dev services (PostgreSQL, Redis, Qdrant)
- Added Prisma schema (users, assets, scenes, materials, organisations)
- Set up backend modules: auth, assets, scenes, materials
- Configured Three.js integration layer in Angular
- Added project-wide README and architecture docs
