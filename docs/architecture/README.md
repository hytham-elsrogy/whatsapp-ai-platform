# Phase 1 — Architecture Deliverables

توثيق المرحلة الأولى من منصة WhatsApp Customer Service & AI Agent. لا كود تنفيذي في هذه المرحلة (باستثناء هياكل المجلدات الفارغة) — الهدف هو الاتفاق على التصميم قبل البدء بالتنفيذ الفعلي (Phase 2+).

## المستندات

| # | المستند | يغطي |
|---|---|---|
| 1 | [00-technology-stack.md](00-technology-stack.md) | Frontend/Backend/AI/Infra stack واختيارات التقنية |
| 2 | [01-system-architecture.md](01-system-architecture.md) | البنية العامة، طبقات النظام، تدفق البيانات |
| 3 | [02-database-erd.md](02-database-erd.md) | ERD الكامل (7 مخططات مجمّعة منطقيًا) |
| 4 | [03-database-schema.sql](03-database-schema.sql) | DDL كامل قابل للتنفيذ مباشرة على PostgreSQL 16 + pgvector |
| 5 | [04-security-architecture.md](04-security-architecture.md) | Auth, RBAC, Secrets, حماية OWASP، Audit |
| 6 | [05-meta-integration-architecture.md](05-meta-integration-architecture.md) | Meta Cloud API, Webhook, Compliance قبل الإرسال |
| 7 | [06-ai-agent-architecture.md](06-ai-agent-architecture.md) | Guardrails, Intent, Actions, RAG, Handover |
| 8 | [07-chatbot-architecture.md](07-chatbot-architecture.md) | Visual Builder, Node types, Execution Engine |
| 9 | [08-routing-architecture.md](08-routing-architecture.md) | استراتيجيات التوزيع، State Machine، SLA |
| 10 | [09-deployment-architecture.md](09-deployment-architecture.md) | Docker topology, Environments, Health, Scaling |
| 11 | [10-folder-structure.md](10-folder-structure.md) | هيكل مجلدات Backend/Frontend (تم إنشاؤها فعليًا) |

## قرارات مهمة اتُّخذت في هذه المرحلة

1. **إعادة بناء كاملة** بدل التوسعة على الكود القديم — الكود القديم محفوظ في `backend_old/` و`frontend_old/` بدون حذف (راجع تاريخ المحادثة).
2. **NestJS Modular Monolith** بدل Microservices مبكرًا — تبسيط العمليات، مع فصل `backend`/`worker` كعمليتين منفصلتين لفصل حمل الـ API عن معالجة الـ Queue.
3. **pgvector** بدل Vector DB منفصلة، خلف interface يسمح بالتبديل لاحقًا بدون تعديل Business Logic.
4. **LLM Provider Abstraction** إلزامي — لا ربط مباشر بأي SDK لمزود AI معيّن.
5. **Multi-Tenant من اليوم الأول** (`tenant_id` + tenant scoping إلزامي في `BaseRepository`) حتى لو كان الاستخدام الحالي لعميل واحد فقط.
6. **Guardrail-first AI pipeline** — أي فشل في أي مرحلة من pipeline الذكاء الاصطناعي يؤدي لتحويل بشري، وليس محاولة إجابة احتياطية.

## الخطوة التالية (Phase 2)

بحسب ترتيب التنفيذ المطلوب: **Database migrations** (تحويل [03-database-schema.sql](03-database-schema.sql) إلى TypeORM entities + migrations فعلية) ثم **Backend scaffolding** (`package.json`, `main.ts`, `app.module.ts`, Auth + RBAC أولًا).

لا ننتقل لهذه الخطوة قبل مراجعتك واعتمادك لتصميم هذه المرحلة.
