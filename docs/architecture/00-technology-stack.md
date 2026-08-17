# Technology Stack

## Frontend
| الطبقة | التقنية | السبب |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR/CSR hybrid, routing, API-friendly |
| Language | TypeScript (strict) | Type safety |
| Styling | Tailwind CSS + shadcn/ui | سرعة تطوير + Design System متسق |
| State | Zustand | بسيط وخفيف مقارنة بـ Redux |
| Realtime | Socket.IO Client | تحديث الـ Inbox لحظيًا |
| i18n | next-intl (ar/en) | دعم RTL/LTR |
| Forms | React Hook Form + Zod | Validation موحّد Frontend/Backend (schema sharing) |
| Chatbot Builder | React Flow | Drag & Drop node editor |
| Charts | Recharts | Dashboards |

## Backend
| الطبقة | التقنية | السبب |
|---|---|---|
| Framework | NestJS (Node.js + TypeScript) | Modular, DI, Enterprise-grade |
| ORM | TypeORM | Migrations + Repository pattern |
| Database | PostgreSQL 16 | Relational integrity, JSONB, pgvector extension |
| Vector Store | pgvector (extension on PostgreSQL) | تجنب تشغيل قاعدة بيانات منفصلة لـ RAG في المرحلة الأولى؛ قابل للاستبدال بـ Qdrant/Weaviate لاحقًا خلف interface موحّد |
| Cache/Queue | Redis 7 | Cache + BullMQ backend |
| Queue | BullMQ | معالجة غير متزامنة (webhook, AI, notifications) |
| Realtime | Socket.IO (NestJS Gateway) | إشعارات Inbox لحظية |
| Object Storage | MinIO (S3-compatible) | Attachments/Media |
| Auth | JWT + Passport + Refresh Tokens | Stateless auth قابل للتوسع |
| Validation | class-validator / class-transformer | DTO validation |
| API Docs | Swagger/OpenAPI | توثيق تلقائي |
| Logging | Pino (structured JSON) | أداء عالي + قابل للفهرسة |

## AI Layer
| الطبقة | التقنية | السبب |
|---|---|---|
| LLM Provider Abstraction | `LLMProvider` interface داخلي | تبديل المزود (Anthropic/OpenAI/Azure/local) بدون تعديل باقي النظام |
| Embeddings Provider | `EmbeddingProvider` interface | نفس مبدأ الفصل |
| Orchestration | خدمة داخلية مبنية يدويًا فوق NestJS (Service + Pipeline pattern) بدل framework خارجي ثقيل، لسهولة التحكم في الـ Guardrails | |

> **قرار معماري مهم:** لا يتم ربط Business Logic مباشرة بأي SDK خاص بمزود AI معيّن. كل استدعاء يمر عبر `AIProviderAdapter` — التبديل بين المزودين يتم عبر Environment Variable (`AI_PROVIDER`) بدون إعادة بناء.

## Infrastructure
| الطبقة | التقنية |
|---|---|
| Containerization | Docker + Docker Compose |
| Reverse Proxy | Nginx (TLS termination) |
| CI-ready | GitHub Actions (lint, test, build) — يُضاف في مرحلة Testing/Deployment |

## لماذا pgvector بدل Vector DB منفصلة؟
لتقليل عدد الخدمات في مرحلة مبكرة (تبسيط الـ Ops). الـ `EmbeddingRetriever` مصمم خلف interface، لذلك يمكن الانتقال إلى Qdrant/Weaviate لاحقًا دون تعديل `AIService` أو `KnowledgeBaseService`.
