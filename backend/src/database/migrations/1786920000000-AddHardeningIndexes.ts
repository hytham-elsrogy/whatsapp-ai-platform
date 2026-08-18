import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Production hardening: every multi-tenant table's list queries filter by
 * tenant_id (the service-layer convention throughout this codebase — see
 * findOne(tenantId, id)), but only conversations/messages/audit_logs got an
 * explicit index in InitialSchema. Tables whose tenant_id is already the
 * leading column of a UNIQUE constraint (roles, users, customers, tags,
 * templates, settings) already have a usable index and are skipped here.
 * Also adds indexes for the most common parent->children lookups (ticket
 * comments, conversation notes/participants, chatbot nodes/edges, etc.)
 * that were previously full table scans.
 */
export class AddHardeningIndexes1786920000000 implements MigrationInterface {
  name = "AddHardeningIndexes1786920000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX idx_departments_tenant ON departments(tenant_id);
      CREATE INDEX idx_whatsapp_numbers_tenant ON whatsapp_numbers(tenant_id);
      CREATE INDEX idx_chatbot_flows_tenant ON chatbot_flows(tenant_id);
      CREATE INDEX idx_ai_agents_tenant ON ai_agents(tenant_id);
      CREATE INDEX idx_knowledge_bases_tenant ON knowledge_bases(tenant_id);
      CREATE INDEX idx_sla_policies_tenant ON sla_policies(tenant_id);
      CREATE INDEX idx_tickets_tenant ON tickets(tenant_id);
      CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
      CREATE INDEX idx_integrations_tenant ON integrations(tenant_id);
      CREATE INDEX idx_api_logs_tenant ON api_logs(tenant_id);

      CREATE INDEX idx_ticket_comments_ticket ON ticket_comments(ticket_id);
      CREATE INDEX idx_tickets_customer ON tickets(customer_id);
      CREATE INDEX idx_tickets_conversation ON tickets(conversation_id);
      CREATE INDEX idx_sla_breaches_ticket ON sla_breaches(ticket_id);
      CREATE INDEX idx_sla_breaches_conversation ON sla_breaches(conversation_id);

      CREATE INDEX idx_conversation_notes_conversation ON conversation_notes(conversation_id);
      CREATE INDEX idx_conversation_participants_conversation ON conversation_participants(conversation_id);

      CREATE INDEX idx_chatbot_nodes_flow ON chatbot_nodes(flow_id);
      CREATE INDEX idx_chatbot_edges_flow ON chatbot_edges(flow_id);
      CREATE INDEX idx_chatbot_sessions_conversation ON chatbot_sessions(conversation_id);

      CREATE INDEX idx_ai_sessions_conversation ON ai_sessions(conversation_id);
      CREATE INDEX idx_ai_actions_session ON ai_actions(ai_session_id);
      CREATE INDEX idx_ai_messages_session ON ai_messages(ai_session_id);

      CREATE INDEX idx_template_variables_template ON template_variables(template_id);
      CREATE INDEX idx_message_statuses_message ON message_statuses(message_id);
      CREATE INDEX idx_attachments_message ON attachments(message_id);

      CREATE INDEX idx_documents_knowledge_base ON documents(knowledge_base_id);
      CREATE INDEX idx_document_chunks_document ON document_chunks(document_id);
      CREATE INDEX idx_customer_consents_customer ON customer_consents(customer_id);

      CREATE INDEX idx_notifications_user ON notifications(user_id);
      CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
      CREATE INDEX idx_department_users_user ON department_users(user_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX idx_departments_tenant;
      DROP INDEX idx_whatsapp_numbers_tenant;
      DROP INDEX idx_chatbot_flows_tenant;
      DROP INDEX idx_ai_agents_tenant;
      DROP INDEX idx_knowledge_bases_tenant;
      DROP INDEX idx_sla_policies_tenant;
      DROP INDEX idx_tickets_tenant;
      DROP INDEX idx_notifications_tenant;
      DROP INDEX idx_integrations_tenant;
      DROP INDEX idx_api_logs_tenant;

      DROP INDEX idx_ticket_comments_ticket;
      DROP INDEX idx_tickets_customer;
      DROP INDEX idx_tickets_conversation;
      DROP INDEX idx_sla_breaches_ticket;
      DROP INDEX idx_sla_breaches_conversation;

      DROP INDEX idx_conversation_notes_conversation;
      DROP INDEX idx_conversation_participants_conversation;

      DROP INDEX idx_chatbot_nodes_flow;
      DROP INDEX idx_chatbot_edges_flow;
      DROP INDEX idx_chatbot_sessions_conversation;

      DROP INDEX idx_ai_sessions_conversation;
      DROP INDEX idx_ai_actions_session;
      DROP INDEX idx_ai_messages_session;

      DROP INDEX idx_template_variables_template;
      DROP INDEX idx_message_statuses_message;
      DROP INDEX idx_attachments_message;

      DROP INDEX idx_documents_knowledge_base;
      DROP INDEX idx_document_chunks_document;
      DROP INDEX idx_customer_consents_customer;

      DROP INDEX idx_notifications_user;
      DROP INDEX idx_refresh_tokens_user;
      DROP INDEX idx_department_users_user;
    `);
  }
}
