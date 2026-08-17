# WhatsApp Customer Service & AI Agent Platform

[![CI](https://github.com/hytham-elsrogy/whatsapp-ai-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/hytham-elsrogy/whatsapp-ai-platform/actions/workflows/ci.yml)

A multi-tenant customer service platform built on the **Meta WhatsApp Cloud API** (never WhatsApp Web automation), combining a human agent inbox, a visual chatbot builder, and a guardrail-first AI agent with RAG over a per-department knowledge base.

Backend: NestJS + TypeORM + PostgreSQL/pgvector. Frontend: Next.js 14 (App Router), Arabic RTL. Real-time via Socket.IO. Background jobs via BullMQ.

## Features

- **Meta Cloud API integration** — signed webhook ingestion, outbound sends, media download, template messages, interactive buttons/lists
- **Conversation routing & assignment** — round-robin / least-active / skill-based strategies, department handoff, full audit trail
- **Visual chatbot builder** — drag-and-drop flow editor (React Flow) with a server-side execution engine (branching, delay nodes with real BullMQ scheduling, tag/API-call/department-handoff nodes)
- **AI agent with RAG** — guardrail-first pipeline (hardcoded safety checks that survive LLM/provider outages), pgvector-backed knowledge base (pasted text, PDF, or URL ingestion with SSRF protections), whitelisted tool-calling actions
- **Tickets, SLA policies, and breach tracking** — with a real BullMQ sweep job, not a cron hack
- **Real-time updates** — Socket.IO, tenant- and conversation-scoped rooms with server-side ownership checks
- **Compliance** — WhatsApp opt-in/opt-out tracking, rate limiting, duplicate-send suppression, template approval workflow
- **Third-party integrations** — Odoo (JSON-RPC), Oracle APEX/ORDS, and generic REST adapters behind one executor
- **Multi-tenant from the schema up** — every tenant-owned resource is scoped by `tenant_id`, enforced at the service layer

Full design docs (bilingual, Arabic-first) are in [`docs/architecture/`](docs/architecture/README.md).

## Tech stack

| Layer | Choice |
|---|---|
| Backend | NestJS, TypeScript, TypeORM, PostgreSQL 16 + pgvector |
| Frontend | Next.js 14 (App Router), Tailwind, Zustand, React Flow, Recharts |
| Queue / real-time | BullMQ (Redis), Socket.IO |
| Object storage | MinIO (S3-compatible) |
| AI | Provider-agnostic (`LLMProvider`/`EmbeddingProvider` interfaces) — Anthropic for chat, OpenAI for embeddings by default |
| Deployment | Docker Compose (nginx reverse proxy + TLS termination, separate `backend`/`worker` roles, scheduled Postgres/MinIO backups) |

## Getting started

### Local development (fast iteration)

Infra runs in Docker; the apps run locally with hot reload.

```bash
docker compose up -d postgres redis minio   # infra only
cd backend && cp .env.example .env && npm install && npm run migration:run && npm run seed && npm run start:dev
cd frontend && cp .env.example .env.local && npm install && npm run dev
```

Backend: `http://localhost:3000/api/v1` (Swagger at `/api/docs`). Frontend: `http://localhost:3001`. Seeded login: `admin@example.com` / `ChangeMe123!` (change `SEED_ADMIN_*` in `backend/.env` before seeding a real environment).

### Full containerized stack

```bash
docker compose up -d
```

Brings up Postgres, Redis, MinIO, `backend` (API), `worker` (BullMQ processors — see [`backend/src/main.worker.ts`](backend/src/main.worker.ts)), `frontend`, `nginx` (the only publicly-exposed service, ports 80/443), and scheduled `postgres-backup`/`minio-backup` sidecars.

## Testing philosophy

This project has no automated test suite by deliberate choice — every feature has instead been verified live against real infrastructure (real signed Meta webhooks, real Playwright browser sessions, real database queries, real object storage) throughout development. See `docs/architecture/` and commit history for the verification record.

## Security

Multi-tenant isolation is enforced at the service layer (every query touching a tenant-owned resource filters by `tenant_id`). This has been the subject of several dedicated audit passes — see commit history for specifics. If you find an issue, please open an issue rather than a public PR with exploit details.
