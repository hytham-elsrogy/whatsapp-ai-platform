# Database ERD

كل الجداول (عدا `permissions`, `roles` النظامية) تحتوي على `tenant_id` لدعم [Multi-Tenant](#multi-tenancy). المخطط الكامل (DDL) موجود في [03-database-schema.sql](03-database-schema.sql).

## 1. Identity & Access

```mermaid
erDiagram
    TENANTS ||--o{ USERS : has
    TENANTS ||--o{ ROLES : scopes
    ROLES ||--o{ USERS : assigned_to
    ROLES ||--o{ ROLE_PERMISSIONS : has
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : grants
    TENANTS ||--o{ DEPARTMENTS : has
    DEPARTMENTS ||--o{ DEPARTMENT_USERS : has
    USERS ||--o{ DEPARTMENT_USERS : belongs_to

    TENANTS {
        uuid id PK
        string name
        string slug
        string status
        string plan
    }
    ROLES {
        uuid id PK
        uuid tenant_id FK
        string name
        bool is_system
    }
    PERMISSIONS {
        uuid id PK
        string code
        string description
    }
    ROLE_PERMISSIONS {
        uuid role_id FK
        uuid permission_id FK
    }
    USERS {
        uuid id PK
        uuid tenant_id FK
        uuid role_id FK
        string name
        string email
        string password_hash
        string status
        bool mfa_enabled
        timestamp last_login_at
    }
    DEPARTMENTS {
        uuid id PK
        uuid tenant_id FK
        string name
        uuid supervisor_id FK
        jsonb working_hours
        uuid chatbot_flow_id FK
        uuid knowledge_base_id FK
        uuid ai_agent_id FK
        string ai_reply_mode
    }
    DEPARTMENT_USERS {
        uuid department_id FK
        uuid user_id FK
        bool is_supervisor
        jsonb skills
    }
```

## 2. WhatsApp Numbers, Customers & Consent

```mermaid
erDiagram
    TENANTS ||--o{ WHATSAPP_NUMBERS : owns
    DEPARTMENTS ||--o{ WHATSAPP_NUMBERS : default_for
    TENANTS ||--o{ CUSTOMERS : has
    CUSTOMERS ||--o{ CUSTOMER_CONSENTS : has
    CUSTOMERS ||--o{ CUSTOMER_TAGS : tagged
    TAGS ||--o{ CUSTOMER_TAGS : applied_to

    WHATSAPP_NUMBERS {
        uuid id PK
        uuid tenant_id FK
        string phone_number_id
        string waba_id
        string display_number
        string label
        uuid department_id FK
        uuid chatbot_flow_id FK
        uuid ai_agent_id FK
        string status
    }
    CUSTOMERS {
        uuid id PK
        uuid tenant_id FK
        string whatsapp_number
        string name
        string language
        string patient_id
        timestamp last_interaction_at
    }
    CUSTOMER_CONSENTS {
        uuid id PK
        uuid customer_id FK
        string consent_status
        timestamp consent_date
        string consent_source
        string consent_type
        timestamp opt_out_date
    }
    TAGS {
        uuid id PK
        uuid tenant_id FK
        string name
        string color
        string scope
    }
    CUSTOMER_TAGS {
        uuid customer_id FK
        uuid tag_id FK
    }
```

## 3. Conversations & Messages

```mermaid
erDiagram
    CUSTOMERS ||--o{ CONVERSATIONS : has
    DEPARTMENTS ||--o{ CONVERSATIONS : routed_to
    USERS ||--o{ CONVERSATIONS : assigned_to
    WHATSAPP_NUMBERS ||--o{ CONVERSATIONS : via
    AI_AGENTS ||--o{ CONVERSATIONS : handled_by
    CHATBOT_FLOWS ||--o{ CONVERSATIONS : running
    CONVERSATIONS ||--o{ MESSAGES : contains
    CONVERSATIONS ||--o{ CONVERSATION_NOTES : has
    CONVERSATIONS ||--o{ CONVERSATION_TAGS : tagged
    TAGS ||--o{ CONVERSATION_TAGS : applied_to
    MESSAGES ||--o{ MESSAGE_STATUSES : tracks
    MESSAGES ||--o{ ATTACHMENTS : has

    CONVERSATIONS {
        uuid id PK
        uuid tenant_id FK
        uuid customer_id FK
        uuid department_id FK
        uuid assigned_agent_id FK
        uuid whatsapp_number_id FK
        string status
        string priority
        uuid ai_agent_id FK
        string ai_mode
        uuid chatbot_flow_id FK
        uuid current_node_id
        timestamp last_customer_message_at
        timestamp first_response_at
        timestamp resolved_at
        timestamp closed_at
        int csat_rating
    }
    MESSAGES {
        uuid id PK
        uuid tenant_id FK
        uuid conversation_id FK
        string direction
        string sender_type
        uuid sender_id
        string wa_message_id
        string type
        jsonb content
        string status
        timestamp sent_at
    }
    MESSAGE_STATUSES {
        uuid id PK
        uuid message_id FK
        string status
        timestamp occurred_at
        jsonb raw_payload
    }
    ATTACHMENTS {
        uuid id PK
        uuid message_id FK
        string storage_key
        string mime_type
        bigint size
        string caption
    }
    CONVERSATION_NOTES {
        uuid id PK
        uuid conversation_id FK
        uuid user_id FK
        text body
        timestamp created_at
    }
    CONVERSATION_TAGS {
        uuid conversation_id FK
        uuid tag_id FK
    }
```

## 4. Chatbot Builder

```mermaid
erDiagram
    DEPARTMENTS ||--o{ CHATBOT_FLOWS : owns
    CHATBOT_FLOWS ||--o{ CHATBOT_NODES : contains
    CHATBOT_FLOWS ||--o{ CHATBOT_EDGES : contains
    CHATBOT_NODES ||--o{ CHATBOT_EDGES : source
    CHATBOT_NODES ||--o{ CHATBOT_EDGES : target
    CONVERSATIONS ||--o{ CHATBOT_SESSIONS : runs

    CHATBOT_FLOWS {
        uuid id PK
        uuid tenant_id FK
        string name
        uuid department_id FK
        int version
        string status
        bool is_default
    }
    CHATBOT_NODES {
        uuid id PK
        uuid flow_id FK
        string type
        jsonb config
        float position_x
        float position_y
    }
    CHATBOT_EDGES {
        uuid id PK
        uuid flow_id FK
        uuid source_node_id FK
        uuid target_node_id FK
        jsonb condition
    }
    CHATBOT_SESSIONS {
        uuid id PK
        uuid conversation_id FK
        uuid flow_id FK
        uuid current_node_id FK
        jsonb variables
        timestamp started_at
    }
```

## 5. AI Agent & Knowledge Base (RAG)

```mermaid
erDiagram
    TENANTS ||--o{ AI_AGENTS : has
    AI_AGENTS ||--o{ AI_SESSIONS : runs
    CONVERSATIONS ||--o{ AI_SESSIONS : has
    AI_SESSIONS ||--o{ AI_ACTIONS : executes
    AI_SESSIONS ||--o{ AI_MESSAGES : logs
    DEPARTMENTS ||--o{ KNOWLEDGE_BASES : owns
    KNOWLEDGE_BASES ||--o{ DOCUMENTS : contains
    DOCUMENTS ||--o{ DOCUMENT_CHUNKS : split_into
    DOCUMENT_CHUNKS ||--|| EMBEDDINGS : has

    AI_AGENTS {
        uuid id PK
        uuid tenant_id FK
        string name
        text system_prompt
        string model
        float temperature
        int max_tokens
        float confidence_threshold
        jsonb allowed_departments
        jsonb allowed_actions
        jsonb escalation_rules
        string language
        bool is_active
    }
    AI_SESSIONS {
        uuid id PK
        uuid conversation_id FK
        uuid ai_agent_id FK
        string intent
        float confidence
        string status
        text summary
        timestamp started_at
        timestamp ended_at
    }
    AI_ACTIONS {
        uuid id PK
        uuid ai_session_id FK
        string action_name
        jsonb input
        jsonb output
        string status
        timestamp executed_at
    }
    AI_MESSAGES {
        uuid id PK
        uuid ai_session_id FK
        string role
        text content
        int tokens_used
        jsonb source_refs
    }
    KNOWLEDGE_BASES {
        uuid id PK
        uuid tenant_id FK
        string name
        uuid department_id FK
    }
    DOCUMENTS {
        uuid id PK
        uuid knowledge_base_id FK
        string title
        string source_type
        string source_uri
        string status
        uuid uploaded_by FK
    }
    DOCUMENT_CHUNKS {
        uuid id PK
        uuid document_id FK
        int chunk_index
        text content
        int token_count
    }
    EMBEDDINGS {
        uuid id PK
        uuid chunk_id FK
        vector vector
        string model
    }
```

## 6. Templates, Tickets & SLA

```mermaid
erDiagram
    TENANTS ||--o{ TEMPLATES : owns
    TEMPLATES ||--o{ TEMPLATE_VARIABLES : has
    TENANTS ||--o{ TICKETS : has
    CUSTOMERS ||--o{ TICKETS : filed_by
    CONVERSATIONS ||--o{ TICKETS : originates
    DEPARTMENTS ||--o{ TICKETS : owns
    USERS ||--o{ TICKETS : assigned_to
    TICKETS ||--o{ TICKET_COMMENTS : has
    SLA_POLICIES ||--o{ TICKETS : governs
    SLA_POLICIES ||--o{ SLA_BREACHES : violated_in

    TEMPLATES {
        uuid id PK
        uuid tenant_id FK
        string name
        string category
        string language
        text body
        string meta_template_id
        string status
    }
    TEMPLATE_VARIABLES {
        uuid id PK
        uuid template_id FK
        int position
        string example_value
        string description
    }
    TICKETS {
        uuid id PK
        uuid tenant_id FK
        string ticket_number
        uuid customer_id FK
        uuid conversation_id FK
        uuid department_id FK
        uuid agent_id FK
        string priority
        string category
        string status
        uuid sla_policy_id FK
        timestamp due_at
        timestamp resolved_at
        timestamp closed_at
    }
    TICKET_COMMENTS {
        uuid id PK
        uuid ticket_id FK
        uuid user_id FK
        text body
        bool is_internal
    }
    SLA_POLICIES {
        uuid id PK
        uuid tenant_id FK
        string name
        uuid department_id FK
        string category
        int first_response_minutes
        int resolution_minutes
    }
    SLA_BREACHES {
        uuid id PK
        uuid ticket_id FK
        uuid policy_id FK
        string type
        timestamp breached_at
    }
```

## 7. Notifications, Audit, Integrations & Settings

```mermaid
erDiagram
    TENANTS ||--o{ NOTIFICATIONS : sends
    USERS ||--o{ NOTIFICATIONS : receives
    TENANTS ||--o{ AUDIT_LOGS : logs
    TENANTS ||--o{ INTEGRATIONS : configures
    INTEGRATIONS ||--o{ API_LOGS : produces
    TENANTS ||--o{ SETTINGS : configures

    NOTIFICATIONS {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        string type
        jsonb payload
        bool is_read
    }
    AUDIT_LOGS {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        string action
        string entity_type
        uuid entity_id
        jsonb old_value
        jsonb new_value
        string ip_address
    }
    INTEGRATIONS {
        uuid id PK
        uuid tenant_id FK
        string type
        string name
        jsonb config
        string status
    }
    WEBHOOK_EVENTS {
        uuid id PK
        string source
        string event_id UK
        jsonb payload
        bool processed
        timestamp received_at
    }
    API_LOGS {
        uuid id PK
        uuid tenant_id FK
        uuid integration_id FK
        string endpoint
        string method
        int status_code
        int duration_ms
    }
    SETTINGS {
        uuid id PK
        uuid tenant_id FK
        string key
        jsonb value
        uuid updated_by FK
    }
```

## Multi-Tenancy

كل جدول ذو صلة بالعميل يحتوي على عمود `tenant_id` (باستثناء `permissions` والجداول العالمية). القرار المعماري:

- **Row-level filtering إلزامي** في `BaseRepository` (Backend) — يُحقن `tenant_id` تلقائيًا من الـ Request Context في كل query.
- خيار **PostgreSQL Row-Level Security (RLS)** كطبقة حماية إضافية يمكن تفعيلها لاحقًا بدون تغيير الكود.
- `webhook_events` مستثناة من `tenant_id` مباشرة لأنها ترتبط بـ `phone_number_id` الذي يُحل إلى `tenant_id` عبر `whatsapp_numbers` أثناء المعالجة (الحدث الخام يصل قبل تحديد الـ tenant).
