# Backend & Frontend Folder Structure

هذا المستند يوثّق هيكل المجلدات (تم إنشاء المجلدات فعليًا كـ skeleton فارغ في هذه المرحلة). الملفات الفعلية (package.json, main.ts, أول module...) تُضاف في مرحلة **"Backend"/"Frontend" scaffolding** التالية، حتى لا يبدأ المشروع بكود منقوص.

## Backend — `backend/src/`

بنية NestJS Modular Monolith، وحدة واحدة لكل Domain، بلا Business Logic داخل Controllers (راجع [01-system-architecture.md § 4](01-system-architecture.md#4-layering--modular-monolith-principles)):

```
backend/
└── src/
    ├── main.ts
    ├── app.module.ts
    ├── config/                     # configuration.ts, validation schema (env)
    ├── common/
    │   ├── decorators/             # @RequirePermissions, @CurrentUser, @Tenant
    │   ├── guards/                 # JwtAuthGuard, PermissionsGuard, TenantGuard
    │   ├── interceptors/           # logging, response transform
    │   ├── filters/                # global exception filter
    │   ├── pipes/                  # validation
    │   ├── base/                   # BaseRepository (tenant scoping)
    │   └── enums/
    ├── modules/
    │   ├── auth/                   # JWT, refresh, MFA
    │   ├── tenants/
    │   ├── users/
    │   ├── roles-permissions/
    │   ├── departments/
    │   ├── whatsapp-numbers/
    │   ├── meta/                   # MetaService — Graph API client only
    │   ├── whatsapp/               # WhatsAppService — business layer over MetaService
    │   ├── webhooks/               # Webhook controller + idempotency
    │   ├── customers/
    │   ├── consents/               # ConsentService — opt-in/opt-out
    │   ├── conversations/          # ConversationService — state machine
    │   ├── messages/
    │   ├── routing/                # RoutingService — strategies
    │   ├── assignment/             # AssignmentService
    │   ├── chatbot/                # ChatbotService — flows/nodes/edges + execution engine
    │   ├── ai-agents/              # AIService — pipeline, guardrails
    │   ├── ai-actions/             # ActionExecutor — whitelisted action framework
    │   ├── knowledge-base/         # KnowledgeBaseService — documents, chunking
    │   ├── rag/                    # Retriever, EmbeddingProvider adapters
    │   ├── llm/                    # LLMProvider adapters (anthropic/openai/azure/local)
    │   ├── templates/              # TemplateService
    │   ├── tags/
    │   ├── tickets/                # TicketService
    │   ├── sla/                    # SlaService
    │   ├── notifications/          # NotificationService + Socket.IO Gateway
    │   ├── reports/                # Dashboard/KPI aggregation
    │   ├── audit-logs/             # AuditService
    │   ├── integrations/           # IntegrationService + adapters (Odoo/APEX/HIS)
    │   ├── settings/
    │   └── uploads/                # MinIO/S3 client
    ├── queue/                      # BullMQ module, processors, job definitions
    ├── database/
    │   └── migrations/             # TypeORM migrations (added in Phase 2)
    └── scripts/                    # seed.ts, migration helpers
```

## Frontend — `frontend/src/`

Next.js 14 App Router، مع دعم RTL/LTR وDark Mode:

```
frontend/
└── src/
    ├── app/
    │   ├── (auth)/
    │   │   └── login/
    │   ├── (dashboard)/
    │   │   ├── inbox/              # Customer Service Inbox (القسم 9)
    │   │   ├── customers/          # Customer 360
    │   │   ├── departments/
    │   │   ├── agents/
    │   │   ├── chatbot-builder/    # React Flow visual builder
    │   │   ├── ai-agents/
    │   │   ├── knowledge-base/
    │   │   ├── templates/
    │   │   ├── tickets/
    │   │   ├── reports/            # Admin / Department / Agent / AI dashboards
    │   │   ├── audit-logs/
    │   │   └── settings/
    │   └── layout.tsx
    ├── components/
    │   ├── ui/                     # shadcn/ui primitives
    │   ├── inbox/                  # ConversationList, ChatWindow, InternalNotes
    │   ├── chatbot-builder/        # Node components, edge components
    │   └── dashboard/              # KPI cards, charts
    ├── services/                   # API clients (per module, mirrors backend)
    ├── store/                      # Zustand slices
    ├── hooks/                      # useSocket, useAuth, ...
    ├── lib/                        # utils, api client base, socket client
    ├── i18n/                       # ar.json, en.json
    └── types/                      # shared DTO types
```

## ملاحظات

- كل Module Backend مرتبط باسمه مباشرة بخدمة مذكورة في قسم "Coding Rules" من المتطلبات الأصلية (`MetaService`, `WhatsAppService`, `ConversationService`, `RoutingService`, `AssignmentService`, `ChatbotService`, `AIService`, `KnowledgeBaseService`, `TemplateService`, `ConsentService`, `TicketService`, `NotificationService`, `AuditService`).
- الترتيب الفعلي للتنفيذ في المراحل القادمة (Phase 2+): Database migrations → Backend scaffolding (auth+RBAC أولًا) → Meta integration + Webhook → Conversation Engine → Routing/Assignment → Inbox (Frontend) → Chatbot → AI Agent → Knowledge Base/RAG → باقي الوحدات، كما هو محدد في قسمي "المطلوب من AI Coding Agent" و"طريقة التنفيذ" من المتطلبات الأصلية.
