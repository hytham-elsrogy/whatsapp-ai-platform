# Security Architecture

## 1. Authentication

- **JWT Access Token** (قصير الأجل، 15 دقيقة) + **Refresh Token** (طويل الأجل، مخزّن كـ hash في `refresh_tokens`، قابل للإلغاء).
- Refresh rotation: كل استخدام لـ Refresh Token يُبطله ويصدر واحدًا جديدًا (يمنع إعادة الاستخدام/السرقة الصامتة).
- **MFA اختياري** عبر TOTP (speakeasy/otplib) — إلزامي قابل للتفعيل على مستوى tenant لأدوار Admin/Super Admin.
- Password hashing: `argon2id` (أفضل من bcrypt لمقاومة GPU cracking).

## 2. Authorization (RBAC)

- الأدوار: `super_admin`, `admin`, `supervisor`, `agent`, `ai_agent` (نظامي، غير قابل للتسجيل الفعلي بل يُستخدم لتمييز الرسائل الصادرة من AI).
- الصلاحيات (`permissions`) دقيقة (fine-grained)، مرتبطة بالأدوار عبر `role_permissions`.
- `PermissionsGuard` (NestJS Guard) + `@RequirePermissions('conversations.assign')` decorator على مستوى كل Controller method.
- **Department Scoping**: Agent يرى فقط محادثات قسمه إلا إن كانت لديه صلاحية `conversations.view_all`.
- **Tenant Scoping**: إلزامي على مستوى `BaseRepository` — كل query تُفلتر تلقائيًا بـ `tenant_id` المستخرج من JWT claims، بغض النظر عن الصلاحيات.

## 3. Secret Management

- **لا يوجد أي Access Token أو API Key مكتوب داخل الكود.**
- Meta Access Token, AI API Key, DB/Redis passwords → Environment Variables في بيئة التطوير، و**Secret Manager** (Azure Key Vault / AWS Secrets Manager / HashiCorp Vault) في الإنتاج.
- عمود `whatsapp_numbers.access_token_secret_ref` يخزن **مرجع** (key name) وليس التوكن نفسه؛ `MetaService` يجلب القيمة الفعلية من Secret Provider عند الحاجة فقط، ولا يُسجَّل (log) أبدًا.
- تدوير التوكنات (token rotation) مدعوم عبر إعادة كتابة الـ secret دون Downtime.

## 4. Data Protection

- **TLS إلزامي** على كل الاتصالات الخارجية (Nginx termination، إعادة توجيه HTTP→HTTPS).
- **Encryption at rest**: تفعيل تشفير القرص على مستوى قاعدة البيانات المُدارة (managed PostgreSQL) أو volume-level encryption عند self-hosting.
- **PII sensitivity**: أرقام WhatsApp، أسماء العملاء، `patient_id` تُعامل كبيانات حساسة — تُستبعد من الـ logs العادية (log redaction middleware).
- **Field-level encryption اختياري** لأعمدة طبية حساسة إضافية إذا اقتضت متطلبات الامتثال المحلية لاحقًا.

## 5. Application-Layer Protections

| التهديد | الحماية |
|---|---|
| SQL Injection | TypeORM parameterized queries حصريًا؛ ممنوع raw SQL بدون parameterization |
| XSS | Sanitization لأي محتوى يُعرض كـ HTML في الـ Inbox (مثل رسائل تحتوي روابط)؛ CSP header صارم على الـ Frontend |
| CSRF | JWT في Authorization header (ليس Cookie) لطلبات API، مما يلغي معظم مخاطر CSRF التقليدية؛ إن استُخدمت Cookies (refresh) → `SameSite=Strict` + `HttpOnly` + CSRF token على mutating routes |
| Rate Limiting | `@nestjs/throttler` + Redis على مستوى IP/User/Tenant، وطبقة منفصلة لمعدل الإرسال لكل WhatsApp number (Meta rate limits) |
| Secure Headers | Helmet.js (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy) |
| Webhook Spoofing | التحقق من `X-Hub-Signature-256` (HMAC-SHA256 بـ App Secret) على كل Webhook قبل أي معالجة |
| Mass Assignment | DTOs صريحة (`class-validator` + `whitelist: true` في `ValidationPipe`) — لا `any` body يمر مباشرة إلى Entity |
| Brute Force Login | Rate limiting + progressive delay + account lockout بعد محاولات فاشلة متكررة |

## 6. AI-Specific Security (راجع [06-ai-agent-architecture.md](06-ai-agent-architecture.md) للتفاصيل الكاملة)

- **Action Whitelisting**: الـ AI لا يستطيع تنفيذ أي Action غير مُدرج صراحة في `ai_agents.allowed_actions`.
- **No Direct DB/SQL Access**: الـ AI لا يستدعي قاعدة البيانات مباشرة؛ فقط عبر Action Framework مُحكم.
- **Prompt Injection Mitigation**: فصل صارم بين System Prompt والمحتوى القادم من العميل أو من Knowledge Base (كلها تُمرَّر كـ untrusted input)؛ لا تنفيذ لأي تعليمات تظهر داخل رسالة العميل أو مستند الـ KB على أنها تعليمات نظام.
- **Guardrail Layer** قبل أي إرسال (Safety Check → Policy Check) كما هو موضح في المخطط.

## 7. Audit & Compliance

- `audit_logs` تُسجّل: Login/Logout، Assignment، Message Sent/Received، Template Used، AI Response، Human Response، Conversation Closed، Customer Data Changed، Permission Changed، Configuration Changed — مع `old_value`/`new_value` لأي تعديل.
- الاحتفاظ بالسجلات (retention) قابل للتهيئة حسب سياسة الـ tenant.
- Audit logs **immutable من واجهة التطبيق** (لا تعديل ولا حذف عبر API، فقط عبر عمليات صيانة مصرح بها على مستوى DB).

## 8. Network & Infrastructure

- كل الخدمات الداخلية (Postgres, Redis, MinIO) على شبكة Docker داخلية غير مكشوفة للإنترنت مباشرة.
- فقط Nginx (443) و Webhook endpoint معرّضان للخارج.
- Health/metrics endpoints محمية (auth أو IP allowlist) وليست عامة.
