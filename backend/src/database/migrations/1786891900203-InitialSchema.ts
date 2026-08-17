import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Full platform schema in one migration, mirroring
 * docs/architecture/03-database-schema.sql exactly. Later phases add
 * TypeORM entities for the tables they implement — the tables already
 * exist here, so no further migrations are needed until the schema itself
 * changes.
 */
export class InitialSchema1786891900203 implements MigrationInterface {
  name = 'InitialSchema1786891900203';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE EXTENSION IF NOT EXISTS vector;

      -- 1. IDENTITY & ACCESS
      CREATE TABLE tenants (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name            VARCHAR(150) NOT NULL,
          slug            VARCHAR(80) NOT NULL UNIQUE,
          status          VARCHAR(20) NOT NULL DEFAULT 'active',
          plan            VARCHAR(40) NOT NULL DEFAULT 'standard',
          created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE roles (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
          name            VARCHAR(50) NOT NULL,
          is_system       BOOLEAN NOT NULL DEFAULT false,
          created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, name)
      );

      CREATE TABLE permissions (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code            VARCHAR(100) NOT NULL UNIQUE,
          description     VARCHAR(255)
      );

      CREATE TABLE role_permissions (
          role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
          permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
          PRIMARY KEY (role_id, permission_id)
      );

      CREATE TABLE users (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          role_id         UUID NOT NULL REFERENCES roles(id),
          name            VARCHAR(150) NOT NULL,
          email           VARCHAR(150) NOT NULL,
          password_hash   VARCHAR(255) NOT NULL,
          status          VARCHAR(20) NOT NULL DEFAULT 'active',
          mfa_enabled     BOOLEAN NOT NULL DEFAULT false,
          mfa_secret      VARCHAR(255),
          language        VARCHAR(10) NOT NULL DEFAULT 'ar',
          last_login_at   TIMESTAMPTZ,
          created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, email)
      );

      CREATE TABLE refresh_tokens (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash      VARCHAR(255) NOT NULL,
          expires_at      TIMESTAMPTZ NOT NULL,
          revoked_at      TIMESTAMPTZ,
          created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE departments (
          id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          name                VARCHAR(150) NOT NULL,
          description         TEXT,
          supervisor_id       UUID REFERENCES users(id),
          working_hours       JSONB,
          chatbot_flow_id     UUID,
          knowledge_base_id   UUID,
          ai_agent_id         UUID,
          ai_reply_mode       VARCHAR(20) NOT NULL DEFAULT 'suggestion',
          is_active           BOOLEAN NOT NULL DEFAULT true,
          created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE department_users (
          department_id   UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
          user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          is_supervisor   BOOLEAN NOT NULL DEFAULT false,
          skills          JSONB,
          max_concurrent_conversations INT NOT NULL DEFAULT 10,
          PRIMARY KEY (department_id, user_id)
      );

      -- 2. WHATSAPP NUMBERS, CUSTOMERS & CONSENT
      CREATE TABLE whatsapp_numbers (
          id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          phone_number_id     VARCHAR(50) NOT NULL UNIQUE,
          waba_id             VARCHAR(50) NOT NULL,
          display_number      VARCHAR(30) NOT NULL,
          label                VARCHAR(100) NOT NULL,
          access_token_secret_ref VARCHAR(255) NOT NULL,
          department_id       UUID REFERENCES departments(id),
          chatbot_flow_id     UUID,
          ai_agent_id         UUID,
          status              VARCHAR(20) NOT NULL DEFAULT 'active',
          created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE customers (
          id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          whatsapp_number         VARCHAR(30) NOT NULL,
          name                    VARCHAR(150),
          language                VARCHAR(10) DEFAULT 'ar',
          patient_id              VARCHAR(50),
          avatar_url              VARCHAR(255),
          last_interaction_at     TIMESTAMPTZ,
          created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, whatsapp_number)
      );

      CREATE TABLE customer_consents (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
          consent_status  VARCHAR(20) NOT NULL,
          consent_date    TIMESTAMPTZ,
          consent_source  VARCHAR(50),
          consent_type    VARCHAR(50),
          opt_out_date    TIMESTAMPTZ,
          last_communication_at TIMESTAMPTZ,
          created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE tags (
          id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          name        VARCHAR(50) NOT NULL,
          color       VARCHAR(20) NOT NULL DEFAULT '#6B7280',
          scope       VARCHAR(20) NOT NULL DEFAULT 'conversation',
          UNIQUE (tenant_id, name, scope)
      );

      CREATE TABLE customer_tags (
          customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
          tag_id      UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
          PRIMARY KEY (customer_id, tag_id)
      );

      -- 3. CHATBOT BUILDER
      CREATE TABLE chatbot_flows (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          name            VARCHAR(150) NOT NULL,
          department_id   UUID REFERENCES departments(id),
          version         INT NOT NULL DEFAULT 1,
          status          VARCHAR(20) NOT NULL DEFAULT 'draft',
          is_default      BOOLEAN NOT NULL DEFAULT false,
          created_by      UUID REFERENCES users(id),
          created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE chatbot_nodes (
          id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          flow_id     UUID NOT NULL REFERENCES chatbot_flows(id) ON DELETE CASCADE,
          type        VARCHAR(30) NOT NULL,
          config      JSONB NOT NULL DEFAULT '{}',
          position_x  FLOAT NOT NULL DEFAULT 0,
          position_y  FLOAT NOT NULL DEFAULT 0
      );

      CREATE TABLE chatbot_edges (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          flow_id         UUID NOT NULL REFERENCES chatbot_flows(id) ON DELETE CASCADE,
          source_node_id  UUID NOT NULL REFERENCES chatbot_nodes(id) ON DELETE CASCADE,
          target_node_id  UUID NOT NULL REFERENCES chatbot_nodes(id) ON DELETE CASCADE,
          condition       JSONB
      );

      -- 4. AI AGENTS & KNOWLEDGE BASE (RAG)
      CREATE TABLE ai_agents (
          id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          name                    VARCHAR(150) NOT NULL,
          system_prompt           TEXT NOT NULL,
          model                   VARCHAR(100) NOT NULL,
          temperature             FLOAT NOT NULL DEFAULT 0.3,
          max_tokens              INT NOT NULL DEFAULT 800,
          confidence_threshold    FLOAT NOT NULL DEFAULT 0.75,
          allowed_departments     JSONB NOT NULL DEFAULT '[]',
          allowed_actions         JSONB NOT NULL DEFAULT '[]',
          escalation_rules        JSONB NOT NULL DEFAULT '{}',
          guardrail_rules         JSONB NOT NULL DEFAULT '{}',
          language                VARCHAR(10) NOT NULL DEFAULT 'auto',
          is_active               BOOLEAN NOT NULL DEFAULT true,
          created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE knowledge_bases (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          name            VARCHAR(150) NOT NULL,
          department_id   UUID REFERENCES departments(id),
          created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE documents (
          id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          knowledge_base_id   UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
          title               VARCHAR(255) NOT NULL,
          source_type         VARCHAR(30) NOT NULL,
          source_uri          VARCHAR(500),
          status              VARCHAR(20) NOT NULL DEFAULT 'processing',
          uploaded_by         UUID REFERENCES users(id),
          created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE document_chunks (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
          chunk_index     INT NOT NULL,
          content         TEXT NOT NULL,
          token_count     INT,
          created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE embeddings (
          id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          chunk_id    UUID NOT NULL UNIQUE REFERENCES document_chunks(id) ON DELETE CASCADE,
          vector      VECTOR(1536) NOT NULL,
          model       VARCHAR(100) NOT NULL
      );
      CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (vector vector_cosine_ops);

      ALTER TABLE departments
          ADD CONSTRAINT fk_departments_chatbot_flow FOREIGN KEY (chatbot_flow_id) REFERENCES chatbot_flows(id),
          ADD CONSTRAINT fk_departments_knowledge_base FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id),
          ADD CONSTRAINT fk_departments_ai_agent FOREIGN KEY (ai_agent_id) REFERENCES ai_agents(id);

      ALTER TABLE whatsapp_numbers
          ADD CONSTRAINT fk_wan_chatbot_flow FOREIGN KEY (chatbot_flow_id) REFERENCES chatbot_flows(id),
          ADD CONSTRAINT fk_wan_ai_agent FOREIGN KEY (ai_agent_id) REFERENCES ai_agents(id);

      -- 5. CONVERSATIONS & MESSAGES
      CREATE TABLE conversations (
          id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          customer_id                 UUID NOT NULL REFERENCES customers(id),
          department_id               UUID REFERENCES departments(id),
          assigned_agent_id           UUID REFERENCES users(id),
          whatsapp_number_id          UUID NOT NULL REFERENCES whatsapp_numbers(id),
          status                      VARCHAR(20) NOT NULL DEFAULT 'new',
          priority                    VARCHAR(10) NOT NULL DEFAULT 'normal',
          ai_agent_id                 UUID REFERENCES ai_agents(id),
          ai_mode                     VARCHAR(20),
          chatbot_flow_id             UUID REFERENCES chatbot_flows(id),
          current_node_id             UUID REFERENCES chatbot_nodes(id),
          last_customer_message_at    TIMESTAMPTZ,
          first_response_at           TIMESTAMPTZ,
          resolved_at                 TIMESTAMPTZ,
          closed_at                   TIMESTAMPTZ,
          csat_rating                 SMALLINT,
          created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_conversations_tenant_status ON conversations(tenant_id, status);
      CREATE INDEX idx_conversations_agent ON conversations(assigned_agent_id);
      CREATE INDEX idx_conversations_department ON conversations(department_id);

      CREATE TABLE conversation_participants (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          user_id         UUID NOT NULL REFERENCES users(id),
          role             VARCHAR(20) NOT NULL DEFAULT 'observer',
          added_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE conversation_notes (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          user_id         UUID NOT NULL REFERENCES users(id),
          body            TEXT NOT NULL,
          created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE conversation_tags (
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          tag_id          UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
          PRIMARY KEY (conversation_id, tag_id)
      );

      CREATE TABLE messages (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          direction       VARCHAR(10) NOT NULL,
          sender_type     VARCHAR(20) NOT NULL,
          sender_id       UUID,
          wa_message_id   VARCHAR(100) UNIQUE,
          type            VARCHAR(20) NOT NULL,
          content         JSONB NOT NULL,
          status          VARCHAR(20) NOT NULL DEFAULT 'sent',
          sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_messages_conversation ON messages(conversation_id, sent_at);

      CREATE TABLE message_statuses (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          message_id      UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
          status          VARCHAR(20) NOT NULL,
          occurred_at     TIMESTAMPTZ NOT NULL,
          raw_payload     JSONB
      );

      CREATE TABLE attachments (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          message_id      UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
          storage_key     VARCHAR(500) NOT NULL,
          mime_type       VARCHAR(100),
          size            BIGINT,
          caption         VARCHAR(500)
      );

      CREATE TABLE chatbot_sessions (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          flow_id         UUID NOT NULL REFERENCES chatbot_flows(id),
          current_node_id UUID REFERENCES chatbot_nodes(id),
          variables       JSONB NOT NULL DEFAULT '{}',
          started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
          ended_at        TIMESTAMPTZ
      );

      CREATE TABLE ai_sessions (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          ai_agent_id     UUID NOT NULL REFERENCES ai_agents(id),
          intent          VARCHAR(100),
          confidence      FLOAT,
          status          VARCHAR(20) NOT NULL DEFAULT 'active',
          summary         TEXT,
          started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
          ended_at        TIMESTAMPTZ
      );

      CREATE TABLE ai_actions (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ai_session_id   UUID NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
          action_name     VARCHAR(100) NOT NULL,
          input           JSONB NOT NULL DEFAULT '{}',
          output          JSONB,
          status          VARCHAR(20) NOT NULL DEFAULT 'pending',
          executed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE ai_messages (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ai_session_id   UUID NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
          role            VARCHAR(20) NOT NULL,
          content         TEXT NOT NULL,
          tokens_used     INT,
          source_refs     JSONB,
          created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- 6. TEMPLATES
      CREATE TABLE templates (
          id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          name                VARCHAR(150) NOT NULL,
          category            VARCHAR(30) NOT NULL,
          language            VARCHAR(10) NOT NULL,
          body                TEXT NOT NULL,
          meta_template_id    VARCHAR(100),
          status              VARCHAR(20) NOT NULL DEFAULT 'pending',
          created_by          UUID REFERENCES users(id),
          created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, name, language)
      );

      CREATE TABLE template_variables (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          template_id     UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
          position        INT NOT NULL,
          example_value   VARCHAR(255),
          description     VARCHAR(255)
      );

      -- 7. TICKETS & SLA
      CREATE TABLE sla_policies (
          id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          name                    VARCHAR(150) NOT NULL,
          department_id           UUID REFERENCES departments(id),
          category                VARCHAR(50),
          first_response_minutes  INT NOT NULL,
          resolution_minutes      INT NOT NULL
      );

      CREATE TABLE tickets (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          ticket_number   VARCHAR(30) NOT NULL UNIQUE,
          customer_id     UUID NOT NULL REFERENCES customers(id),
          conversation_id UUID REFERENCES conversations(id),
          department_id   UUID REFERENCES departments(id),
          agent_id        UUID REFERENCES users(id),
          priority        VARCHAR(10) NOT NULL DEFAULT 'normal',
          category        VARCHAR(50),
          status          VARCHAR(20) NOT NULL DEFAULT 'open',
          sla_policy_id   UUID REFERENCES sla_policies(id),
          due_at          TIMESTAMPTZ,
          resolution      TEXT,
          resolved_at     TIMESTAMPTZ,
          closed_at       TIMESTAMPTZ,
          created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE ticket_comments (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ticket_id       UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
          user_id         UUID NOT NULL REFERENCES users(id),
          body            TEXT NOT NULL,
          is_internal     BOOLEAN NOT NULL DEFAULT true,
          created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE sla_breaches (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ticket_id       UUID REFERENCES tickets(id) ON DELETE CASCADE,
          conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
          policy_id       UUID NOT NULL REFERENCES sla_policies(id),
          type            VARCHAR(20) NOT NULL,
          breached_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- 8. NOTIFICATIONS, AUDIT, INTEGRATIONS, SETTINGS
      CREATE TABLE notifications (
          id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type        VARCHAR(50) NOT NULL,
          payload     JSONB NOT NULL DEFAULT '{}',
          is_read     BOOLEAN NOT NULL DEFAULT false,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE audit_logs (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
          user_id         UUID REFERENCES users(id),
          action          VARCHAR(100) NOT NULL,
          entity_type     VARCHAR(50) NOT NULL,
          entity_id       UUID,
          old_value       JSONB,
          new_value       JSONB,
          ip_address      VARCHAR(45),
          created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

      CREATE TABLE integrations (
          id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          type        VARCHAR(30) NOT NULL,
          name        VARCHAR(150) NOT NULL,
          config      JSONB NOT NULL DEFAULT '{}',
          status      VARCHAR(20) NOT NULL DEFAULT 'inactive'
      );

      CREATE TABLE webhook_events (
          id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          source      VARCHAR(30) NOT NULL DEFAULT 'meta',
          event_id    VARCHAR(150) NOT NULL,
          payload     JSONB NOT NULL,
          processed   BOOLEAN NOT NULL DEFAULT false,
          received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (source, event_id)
      );

      CREATE TABLE api_logs (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
          integration_id  UUID REFERENCES integrations(id),
          endpoint        VARCHAR(255) NOT NULL,
          method          VARCHAR(10) NOT NULL,
          status_code     INT,
          duration_ms     INT,
          created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE settings (
          id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          key         VARCHAR(100) NOT NULL,
          value       JSONB NOT NULL,
          updated_by  UUID REFERENCES users(id),
          updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
          UNIQUE (tenant_id, key)
      );

      INSERT INTO permissions (code, description) VALUES
          ('users.manage', 'Create/update/delete users'),
          ('departments.manage', 'Manage departments'),
          ('conversations.view_all', 'View all conversations across departments'),
          ('conversations.assign', 'Assign conversations to agents'),
          ('chatbot.manage', 'Create/edit chatbot flows'),
          ('ai_agents.manage', 'Configure AI agents'),
          ('knowledge_base.manage', 'Manage knowledge base documents'),
          ('templates.manage', 'Manage and submit message templates'),
          ('settings.manage', 'Manage system settings'),
          ('reports.view', 'View dashboards and reports'),
          ('audit_logs.view', 'View audit logs');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
  }
}
