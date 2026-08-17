import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

export interface OverviewReport {
  openConversations: number;
  todayConversations: number;
  resolvedToday: number;
  avgFirstResponseMinutesToday: number | null;
}

export interface AgentPerformanceRow {
  agentId: string;
  agentName: string;
  openCount: number;
  resolvedCount: number;
  avgFirstResponseMinutes: number | null;
}

export interface AiAnalyticsReport {
  total: number;
  resolved: number;
  escalated: number;
  active: number;
  resolutionRate: number | null;
  avgConfidence: number | null;
  totalTokensUsed: number;
  topIntents: { intent: string; count: number }[];
}

export interface SlaComplianceRow {
  type: string;
  count: number;
}

/**
 * Reporting queries are read-heavy cross-table aggregations — raw
 * parameterized SQL via DataSource rather than TypeORM QueryBuilder, same
 * rationale as EmbeddingsRepository in the knowledge-base module. Nothing
 * here writes.
 */
@Injectable()
export class ReportsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getOverview(tenantId: string): Promise<OverviewReport> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [row] = await this.dataSource.query(
      `SELECT
         (SELECT count(*) FROM conversations WHERE tenant_id = $1 AND status NOT IN ('resolved','closed')) AS open_conversations,
         (SELECT count(*) FROM conversations WHERE tenant_id = $1 AND created_at >= $2) AS today_conversations,
         (SELECT count(*) FROM conversations WHERE tenant_id = $1 AND resolved_at >= $2) AS resolved_today,
         (SELECT avg(extract(epoch FROM (first_response_at - created_at)) / 60)
            FROM conversations
            WHERE tenant_id = $1 AND first_response_at IS NOT NULL AND created_at >= $2) AS avg_first_response_minutes_today`,
      [tenantId, startOfToday],
    );

    return {
      openConversations: Number(row.open_conversations),
      todayConversations: Number(row.today_conversations),
      resolvedToday: Number(row.resolved_today),
      avgFirstResponseMinutesToday:
        row.avg_first_response_minutes_today === null
          ? null
          : Number(row.avg_first_response_minutes_today),
    };
  }

  async getAgentPerformance(tenantId: string): Promise<AgentPerformanceRow[]> {
    const rows = await this.dataSource.query(
      `SELECT u.id AS agent_id, u.name AS agent_name,
              count(c.id) FILTER (WHERE c.status NOT IN ('resolved','closed')) AS open_count,
              count(c.id) FILTER (WHERE c.resolved_at IS NOT NULL) AS resolved_count,
              avg(extract(epoch FROM (c.first_response_at - c.created_at)) / 60)
                FILTER (WHERE c.first_response_at IS NOT NULL) AS avg_first_response_minutes
       FROM users u
       LEFT JOIN conversations c ON c.assigned_agent_id = u.id AND c.tenant_id = $1
       WHERE u.tenant_id = $1
       GROUP BY u.id, u.name
       ORDER BY resolved_count DESC, u.name ASC`,
      [tenantId],
    );

    return rows.map((r: Record<string, string>) => ({
      agentId: r.agent_id,
      agentName: r.agent_name,
      openCount: Number(r.open_count),
      resolvedCount: Number(r.resolved_count),
      avgFirstResponseMinutes:
        r.avg_first_response_minutes === null
          ? null
          : Number(r.avg_first_response_minutes),
    }));
  }

  async getAiAnalytics(tenantId: string): Promise<AiAnalyticsReport> {
    const [summary] = await this.dataSource.query(
      `SELECT
         count(*) AS total,
         count(*) FILTER (WHERE s.status = 'resolved') AS resolved,
         count(*) FILTER (WHERE s.status = 'escalated') AS escalated,
         count(*) FILTER (WHERE s.status = 'active') AS active,
         avg(s.confidence) AS avg_confidence
       FROM ai_sessions s
       JOIN conversations c ON c.id = s.conversation_id
       WHERE c.tenant_id = $1`,
      [tenantId],
    );

    const [tokenRow] = await this.dataSource.query(
      `SELECT coalesce(sum(m.tokens_used), 0) AS total_tokens
       FROM ai_messages m
       JOIN ai_sessions s ON s.id = m.ai_session_id
       JOIN conversations c ON c.id = s.conversation_id
       WHERE c.tenant_id = $1`,
      [tenantId],
    );

    const topIntents = await this.dataSource.query(
      `SELECT s.intent, count(*) AS count
       FROM ai_sessions s
       JOIN conversations c ON c.id = s.conversation_id
       WHERE c.tenant_id = $1 AND s.intent IS NOT NULL
       GROUP BY s.intent
       ORDER BY count DESC
       LIMIT 5`,
      [tenantId],
    );

    const total = Number(summary.total);
    const resolved = Number(summary.resolved);

    return {
      total,
      resolved,
      escalated: Number(summary.escalated),
      active: Number(summary.active),
      resolutionRate: total > 0 ? resolved / total : null,
      avgConfidence:
        summary.avg_confidence === null ? null : Number(summary.avg_confidence),
      totalTokensUsed: Number(tokenRow.total_tokens),
      topIntents: topIntents.map((r: Record<string, string>) => ({
        intent: r.intent,
        count: Number(r.count),
      })),
    };
  }

  async getSlaCompliance(tenantId: string): Promise<SlaComplianceRow[]> {
    const rows = await this.dataSource.query(
      `SELECT b.type, count(*) AS count
       FROM sla_breaches b
       JOIN sla_policies p ON p.id = b.policy_id
       WHERE p.tenant_id = $1
       GROUP BY b.type`,
      [tenantId],
    );
    return rows.map((r: Record<string, string>) => ({
      type: r.type,
      count: Number(r.count),
    }));
  }
}
