import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Conversation } from '../conversations/entities/conversation.entity';
import { Message } from '../messages/entities/message.entity';
import { User } from '../users/entities/user.entity';
import { ConversationStatus, MessageDirection } from '../../common/enums';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import * as ExcelJS from 'exceljs';

export type ReportPeriod = 'today' | 'week' | 'month' | 'custom';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private getDateRange(period: ReportPeriod, from?: Date, to?: Date) {
    const now = new Date();
    switch (period) {
      case 'today':
        return { from: startOfDay(now), to: endOfDay(now) };
      case 'week':
        return { from: startOfWeek(now, { weekStartsOn: 0 }), to: endOfWeek(now, { weekStartsOn: 0 }) };
      case 'month':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'custom':
        return { from: from || subDays(now, 30), to: to || now };
      default:
        return { from: startOfDay(now), to: endOfDay(now) };
    }
  }

  async getDashboardStats(period: ReportPeriod = 'today', from?: Date, to?: Date) {
    const { from: start, to: end } = this.getDateRange(period, from, to);

    const [totalConversations, resolvedConversations, newConversations, totalMessages, inboundMessages, outboundMessages] =
      await Promise.all([
        this.conversationRepo.count({ where: { createdAt: Between(start, end) } }),
        this.conversationRepo.count({ where: { status: ConversationStatus.RESOLVED, resolvedAt: Between(start, end) } }),
        this.conversationRepo.count({ where: { status: ConversationStatus.NEW } }),
        this.messageRepo.count({ where: { createdAt: Between(start, end) } }),
        this.messageRepo.count({ where: { direction: MessageDirection.INBOUND, createdAt: Between(start, end) } }),
        this.messageRepo.count({ where: { direction: MessageDirection.OUTBOUND, createdAt: Between(start, end) } }),
      ]);

    const avgResponseTime = await this.getAverageResponseTime(start, end);
    const avgResolutionTime = await this.getAverageResolutionTime(start, end);

    const statusBreakdown = await this.conversationRepo
      .createQueryBuilder('c')
      .select('c.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('c.status')
      .getRawMany();

    const dailyTrend = await this.getDailyTrend(start, end);

    const topAgents = await this.getTopAgents(start, end);

    return {
      totalConversations,
      resolvedConversations,
      newConversations,
      resolutionRate: totalConversations > 0 ? Math.round((resolvedConversations / totalConversations) * 100) : 0,
      totalMessages,
      inboundMessages,
      outboundMessages,
      avgResponseTime,
      avgResolutionTime,
      statusBreakdown,
      dailyTrend,
      topAgents,
    };
  }

  async getAgentReport(period: ReportPeriod = 'month', from?: Date, to?: Date) {
    const { from: start, to: end } = this.getDateRange(period, from, to);

    const agents = await this.userRepo
      .createQueryBuilder('u')
      .leftJoin('conversations', 'c', 'c.assigned_to_id = u.id AND c."createdAt" BETWEEN :start AND :end', { start, end })
      .select('u.id', 'id')
      .addSelect('u.name', 'name')
      .addSelect('u.email', 'email')
      .addSelect('COUNT(DISTINCT c.id)', 'totalConversations')
      .addSelect(`SUM(CASE WHEN c.status = 'resolved' THEN 1 ELSE 0 END)`, 'resolved')
      .addSelect(`AVG(EXTRACT(EPOCH FROM (c."firstResponseAt" - c."createdAt"))/60)`, 'avgResponseMinutes')
      .addSelect(`AVG(EXTRACT(EPOCH FROM (c."resolvedAt" - c."createdAt"))/3600)`, 'avgResolutionHours')
      .where('u.role = :role AND u."isActive" = true', { role: 'agent' })
      .groupBy('u.id, u.name, u.email')
      .orderBy('"totalConversations"', 'DESC')
      .getRawMany();

    return agents;
  }

  private async getAverageResponseTime(start: Date, end: Date): Promise<number> {
    const result = await this.conversationRepo
      .createQueryBuilder('c')
      .select('AVG(EXTRACT(EPOCH FROM (c."firstResponseAt" - c."createdAt"))/60)', 'avg')
      .where('c."firstResponseAt" IS NOT NULL')
      .andWhere('c."createdAt" BETWEEN :start AND :end', { start, end })
      .getRawOne();
    return Math.round(result?.avg || 0);
  }

  private async getAverageResolutionTime(start: Date, end: Date): Promise<number> {
    const result = await this.conversationRepo
      .createQueryBuilder('c')
      .select('AVG(EXTRACT(EPOCH FROM (c."resolvedAt" - c."createdAt"))/3600)', 'avg')
      .where('c."resolvedAt" IS NOT NULL')
      .andWhere('c."createdAt" BETWEEN :start AND :end', { start, end })
      .getRawOne();
    return Math.round((result?.avg || 0) * 10) / 10;
  }

  private async getDailyTrend(start: Date, end: Date) {
    return this.conversationRepo
      .createQueryBuilder('c')
      .select(`DATE_TRUNC('day', c."createdAt")`, 'date')
      .addSelect('COUNT(*)', 'count')
      .where('c."createdAt" BETWEEN :start AND :end', { start, end })
      .groupBy(`DATE_TRUNC('day', c."createdAt")`)
      .orderBy('date', 'ASC')
      .getRawMany();
  }

  private async getTopAgents(start: Date, end: Date) {
    return this.conversationRepo
      .createQueryBuilder('c')
      .leftJoin('c.assignedTo', 'u')
      .select('u.id', 'id')
      .addSelect('u.name', 'name')
      .addSelect('COUNT(*)', 'count')
      .where('c."createdAt" BETWEEN :start AND :end', { start, end })
      .andWhere('u.id IS NOT NULL')
      .groupBy('u.id, u.name')
      .orderBy('"count"', 'DESC')
      .limit(5)
      .getRawMany();
  }

  async exportToExcel(period: ReportPeriod = 'month', from?: Date, to?: Date): Promise<Buffer> {
    const data = await this.getDashboardStats(period, from, to);
    const agentData = await this.getAgentReport(period, from, to);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'WhatsApp CRM';
    workbook.created = new Date();

    const overviewSheet = workbook.addWorksheet('ملخص عام');
    overviewSheet.addRow(['المؤشر', 'القيمة']);
    overviewSheet.addRow(['إجمالي المحادثات', data.totalConversations]);
    overviewSheet.addRow(['المحادثات المحلولة', data.resolvedConversations]);
    overviewSheet.addRow(['معدل الحل %', `${data.resolutionRate}%`]);
    overviewSheet.addRow(['إجمالي الرسائل', data.totalMessages]);
    overviewSheet.addRow(['رسائل واردة', data.inboundMessages]);
    overviewSheet.addRow(['رسائل صادرة', data.outboundMessages]);
    overviewSheet.addRow(['متوسط وقت الاستجابة (دقيقة)', data.avgResponseTime]);
    overviewSheet.addRow(['متوسط وقت الحل (ساعة)', data.avgResolutionTime]);

    const agentSheet = workbook.addWorksheet('أداء الموظفين');
    agentSheet.addRow(['الاسم', 'البريد', 'المحادثات', 'تم الحل', 'متوسط الاستجابة (دق)', 'متوسط الحل (ساعة)']);
    agentData.forEach((a: any) => {
      agentSheet.addRow([
        a.name, a.email, a.totalConversations, a.resolved,
        Math.round(a.avgResponseMinutes || 0),
        Math.round((a.avgResolutionHours || 0) * 10) / 10,
      ]);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
