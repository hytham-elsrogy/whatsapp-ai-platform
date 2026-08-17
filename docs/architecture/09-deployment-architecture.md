# Deployment Architecture

## 1. Docker Compose Topology

```mermaid
flowchart TB
    subgraph Public["Public"]
        NGINX["nginx\n:443/:80"]
    end
    subgraph App["Application"]
        FE["frontend (Next.js)\n:3000 internal"]
        BE["backend (NestJS API)\n:3000 internal"]
        WK["worker (BullMQ processors)\nno exposed port"]
    end
    subgraph Data["Data"]
        PG[("postgres\n+ pgvector")]
        REDIS[("redis")]
        MINIO[("minio")]
    end
    subgraph Obs["Observability (optional)"]
        PROM["prometheus"]
        GRAF["grafana"]
    end

    Internet((Internet)) --> NGINX
    NGINX --> FE
    NGINX --> BE
    BE <--> PG
    BE <--> REDIS
    BE <--> MINIO
    WK <--> PG
    WK <--> REDIS
    WK <--> MINIO
    BE -.metrics.-> PROM --> GRAF
```

### Containers

| Container | الوصف | Ports |
|---|---|---|
| `nginx` | TLS termination, reverse proxy, static caching | 80, 443 |
| `frontend` | Next.js production build | internal 3000 |
| `backend` | NestJS API (HTTP + Socket.IO Gateway) | internal 3000 |
| `worker` | نفس كود backend، عملية منفصلة تُشغّل BullMQ processors فقط (`--worker` mode) — لا تستقبل HTTP traffic، تُوسَّع أفقيًا بشكل مستقل | — |
| `postgres` | PostgreSQL 16 + pgvector extension | internal 5432 |
| `redis` | Cache + BullMQ backend | internal 6379 |
| `minio` | S3-compatible object storage للمرفقات | internal 9000/9001 |
| `prometheus`/`grafana` | اختياري — Observability | internal |

فصل `backend` عن `worker` (نفس الصورة، أمر تشغيل مختلف) يمنع ازدحام معالجة الـ AI/Webhook من التأثير على زمن استجابة الـ API، ويسمح بتوسيع كل منهما بشكل مستقل حسب الحمل.

## 2. Environment Configuration

`.env.example` (جذر المشروع) يحتوي المتغيرات الأساسية:

```
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/whatsapp_platform

# Redis
REDIS_URL=redis://:pass@redis:6379

# MinIO / Object Storage
S3_ENDPOINT=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=

# Meta WhatsApp Business Platform
META_APP_ID=
META_APP_SECRET=
META_VERIFY_TOKEN=
META_ACCESS_TOKEN=            # dev only — production via Secret Manager
META_PHONE_NUMBER_ID=
META_WABA_ID=
META_API_VERSION=v20.0

# AI Layer
AI_PROVIDER=anthropic          # anthropic | openai | azure | local
AI_API_KEY=
AI_MODEL=
EMBEDDING_PROVIDER=anthropic
EMBEDDING_MODEL=

# Auth
JWT_SECRET=
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d
ENCRYPTION_KEY=

# App
NODE_ENV=production
PORT=3000
FRONTEND_URL=
APP_URL=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_WS_URL=
```

راجع الملف الفعلي: [`.env.example`](../../.env.example) (سيُحدَّث في مرحلة الـ Backend Scaffolding).

## 3. System Health Page

`GET /health` (Backend) يُجمّع حالة كل Dependency:

```json
{
  "meta_api": "ok",
  "database": "ok",
  "redis": "ok",
  "queue": "ok",
  "ai_provider": "degraded",
  "webhook": "ok"
}
```

يُستخدم من Docker healthcheck ومن صفحة "System Health" في الـ Admin UI.

## 4. Deployment Environments

| البيئة | الوصف |
|---|---|
| `local` | `docker-compose up` — كل الخدمات على جهاز المطور |
| `staging` | نفس Topology، بيانات تجريبية، Meta Test Number |
| `production` | نفس Topology + Secret Manager + backups مجدولة لـ Postgres/MinIO + TLS certs حقيقية (Let's Encrypt/managed) |

## 5. Backups & Migrations

- PostgreSQL: `pg_dump` مجدول (cron داخل صورة backup منفصلة أو عبر managed DB snapshots) + الاحتفاظ N يوم.
- Migrations: TypeORM migrations تُشغَّل كخطوة `pre-start` في `backend` container (`npm run migration:run`) قبل بدء استقبال traffic.
- Rollback: كل migration لها `down()` مقابل.

## 6. Scaling Notes (لمراحل لاحقة)

- `backend` و`worker` stateless بالكامل → يمكن تشغيل نسخ متعددة خلف Nginx/Load Balancer.
- Socket.IO يتطلب **Redis Adapter** (`@socket.io/redis-adapter`) عند تشغيل أكثر من نسخة backend، لضمان توصيل الأحداث لحظيًا عبر كل النسخ.
- pgvector مناسب للحجم المبدئي؛ عند نمو حجم الـ Knowledge Base بشكل كبير، الانتقال لـ Vector DB مخصص (Qdrant) لا يتطلب تعديل Business Logic (راجع [06-ai-agent-architecture.md](06-ai-agent-architecture.md#9-knowledge-base--rag)).
