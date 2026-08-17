# المرحلة 1 — System Architecture

> منصة WhatsApp Customer Service & AI Agent — بنية معمارية للنظام الكامل (CRM + Chatbot Builder + AI Agent + RAG Knowledge Base)

## 1. نظرة عامة (Overview)

النظام عبارة عن منصة Customer Service متعددة الطبقات (Multi-Layer), مبنية حول **WhatsApp Business Platform / Meta Cloud API** الرسمي فقط. لا يوجد أي اعتماد على WhatsApp Web automation.

المكونات الرئيسية:

1. **Meta Cloud API** — القناة الوحيدة للتواصل مع WhatsApp (Inbound/Outbound).
2. **Webhook Ingestion Layer** — استقبال الأحداث من Meta بشكل آمن و idempotent.
3. **Message Queue (BullMQ/Redis)** — امتصاص الحمل، إعادة المحاولة، معالجة غير متزامنة.
4. **Conversation Engine** — إدارة دورة حياة المحادثة (state machine).
5. **Routing & Assignment Engine** — توزيع المحادثات على الأقسام/الموظفين.
6. **Chatbot Engine** — تنفيذ Flows مبنية بـ Visual Builder (node-based).
7. **AI Agent Layer** — Intent detection, RAG retrieval, guardrails, actions, handover.
8. **Knowledge Base / RAG** — Documents → Chunking → Embeddings → Vector DB → Retriever.
9. **Compliance Engine** — Opt-in/Opt-out, 24h window, template enforcement, rate limiting.
10. **Core CRM** — Customers, Tickets, SLA, Tags, Notes, Templates, Audit.
11. **Dashboard/Reports** — KPIs لكل من Admin/Department/Agent/AI.
12. **Multi-Tenant Layer** — `tenant_id` على مستوى كل الجداول ذات الصلة.

## 2. High-Level Architecture Diagram

```mermaid
flowchart TB
    subgraph Meta["Meta WhatsApp Business Platform"]
        MetaAPI["Cloud API (Graph API v20+)"]
        MetaWebhook["Webhook Events"]
    end

    subgraph Edge["Edge / Ingress"]
        NGINX["Nginx (TLS, Reverse Proxy)"]
    end

    subgraph Backend["Backend — NestJS (Modular Monolith)"]
        WH["Webhook Controller\n(HMAC verify, idempotency)"]
        Q["BullMQ Queues\n(inbound / outbound / ai / notifications)"]
        CE["Conversation Engine"]
        RE["Routing & Assignment Engine"]
        CB["Chatbot Engine"]
        AI["AI Agent Layer\n(Intent, Guardrails, Actions)"]
        RAG["RAG Service\n(Retriever)"]
        COMP["Compliance Engine"]
        CORE["Core Services\n(Users, Departments, Tickets, SLA, Templates)"]
        WS["Socket.IO Gateway"]
    end

    subgraph Data["Data Layer"]
        PG[("PostgreSQL")]
        REDIS[("Redis — Cache + Queue")]
        VDB[("Vector DB — pgvector")]
        S3[("Object Storage — MinIO/S3")]
    end

    subgraph Frontend["Frontend — Next.js"]
        INBOX["Inbox / Chat UI"]
        BUILDER["Visual Chatbot Builder"]
        DASH["Dashboards & Reports"]
        ADMIN["Admin Settings"]
    end

    subgraph External["External Systems (Future)"]
        ODOO["Odoo"]
        APEX["Oracle APEX / HIS"]
    end

    MetaWebhook --> NGINX --> WH --> Q
    Q --> CE --> RE
    CE --> CB --> AI
    AI --> RAG --> VDB
    AI --> COMP
    CE --> COMP --> MetaAPI
    RE --> CORE
    CORE <--> PG
    Q <--> REDIS
    AI -.Action Framework.-> ODOO
    AI -.Action Framework.-> APEX
    CORE --> WS --> INBOX
    INBOX --> NGINX
    BUILDER --> NGINX
    DASH --> NGINX
    CORE --> S3
    MetaAPI <--> NGINX
```

## 3. Incoming Message Data Flow

```mermaid
sequenceDiagram
    participant C as Customer (WhatsApp)
    participant M as Meta Cloud API
    participant W as Webhook Controller
    participant Q as Queue (BullMQ)
    participant CE as Conversation Engine
    participant COMP as Compliance Engine
    participant CB as Chatbot Engine
    participant AI as AI Agent
    participant RE as Routing Engine
    participant A as Human Agent (Inbox)

    C->>M: Sends message
    M->>W: POST /webhooks/whatsapp (signed)
    W->>W: Verify signature + dedupe (event_id)
    W->>Q: enqueue(InboundMessageJob)
    W-->>M: 200 OK (fast ack)
    Q->>CE: process job
    CE->>COMP: checkOptIn / checkWindow
    CE->>CE: find-or-create Customer + Conversation
    alt Conversation status = Bot
        CE->>CB: runFlow(node)
        CB-->>CE: next action
    else Conversation status = AI
        CE->>AI: handle(message)
        AI->>AI: Intent Detection + Confidence
        alt confidence >= threshold AND safe
            AI-->>CE: response / action
        else low confidence OR guardrail triggered
            AI->>RE: escalate to Human
            RE->>A: assign conversation
        end
    else Conversation status = Assigned/InProgress
        CE->>A: push via Socket.IO
    end
    CE->>M: sendMessage (via MetaService)
    M->>C: delivers message
```

## 4. Layering / Modular Monolith Principles

- **Controllers** لا تحتوي على Business Logic — فقط تفويض إلى Services.
- **Service Layer** لكل domain (`ConversationService`, `RoutingService`, `AIService`, ...) — راجع [10-folder-structure.md](10-folder-structure.md).
- **Repository access** عبر TypeORM Repositories/QueryBuilder، مع تغليف الاستعلامات المعقدة.
- **Meta API logic** معزول بالكامل داخل `MetaService`/`WhatsAppService` — لا يظهر مباشرة في أي مكان آخر (UI أو Controllers).
- **AI Actions** عبر Action Framework مع Whitelist صريح (راجع [06-ai-agent-architecture.md](06-ai-agent-architecture.md)).
- كل الاتصال الخارجي (Odoo/APEX/HIS) يمر عبر **Integration Layer** موحّد وليس مباشرة من AI أو Chatbot.

## 5. Cross-Cutting Concerns

| Concern | التنفيذ |
|---|---|
| Auth | JWT + Refresh Tokens + optional MFA (TOTP) |
| Authorization | RBAC (roles/permissions matrix) + tenant scoping |
| Validation | class-validator DTOs على كل Endpoint |
| Error Handling | Global Exception Filter موحّد + Structured error codes |
| Logging | Structured JSON logging (pino/winston) + correlation id لكل request/job |
| Idempotency | `webhook_events.event_id` unique constraint + Redis dedupe lock |
| Rate Limiting | Redis-based sliding window، على مستوى API وعلى مستوى الإرسال لكل رقم WhatsApp |
| Observability | Health checks لكل Dependency (Meta, DB, Redis, Queue, AI Provider) — راجع [09-deployment-architecture.md](09-deployment-architecture.md) |
| Multi-Tenancy | `tenant_id` + Postgres Row-Level Security (اختياري) أو تطبيق فلترة إلزامية على مستوى Repository base class |

## 6. المستندات المرتبطة بهذه المرحلة

1. [02-database-erd.md](02-database-erd.md) — ERD الكامل
2. [03-database-schema.sql](03-database-schema.sql) — DDL
3. [04-security-architecture.md](04-security-architecture.md)
4. [05-meta-integration-architecture.md](05-meta-integration-architecture.md)
5. [06-ai-agent-architecture.md](06-ai-agent-architecture.md)
6. [07-chatbot-architecture.md](07-chatbot-architecture.md)
7. [08-routing-architecture.md](08-routing-architecture.md)
8. [09-deployment-architecture.md](09-deployment-architecture.md)
9. [10-folder-structure.md](10-folder-structure.md)
10. [00-technology-stack.md](00-technology-stack.md)
