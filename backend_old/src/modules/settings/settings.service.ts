import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';

const DEFAULT_SETTINGS = [
  { key: 'app_name', value: 'WhatsApp CRM', type: 'string', group: 'general', description: 'اسم التطبيق' },
  { key: 'working_hours_start', value: '08:00', type: 'string', group: 'working_hours', description: 'بداية ساعات العمل' },
  { key: 'working_hours_end', value: '18:00', type: 'string', group: 'working_hours', description: 'نهاية ساعات العمل' },
  { key: 'working_days', value: '0,1,2,3,4', type: 'string', group: 'working_hours', description: 'أيام العمل (0=أحد)' },
  { key: 'away_message', value: 'شكراً لتواصلك معنا. نحن خارج ساعات العمل حالياً. سنرد عليك في أقرب وقت.', type: 'string', group: 'messages', description: 'رسالة خارج ساعات العمل' },
  { key: 'welcome_message', value: 'مرحباً! كيف يمكننا مساعدتك؟', type: 'string', group: 'messages', description: 'رسالة الترحيب' },
  { key: 'auto_assign', value: 'true', type: 'boolean', group: 'automation', description: 'التعيين التلقائي للمحادثات' },
  { key: 'sla_first_response', value: '30', type: 'number', group: 'sla', description: 'وقت أول رد (دقيقة)' },
  { key: 'sla_resolution', value: '480', type: 'number', group: 'sla', description: 'وقت الحل (دقيقة)' },
  { key: 'satisfaction_survey', value: 'true', type: 'boolean', group: 'automation', description: 'تقييم الخدمة عند الإغلاق' },
  { key: 'max_concurrent_chats', value: '10', type: 'number', group: 'automation', description: 'الحد الأقصى للمحادثات لكل موظف' },
];

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(Setting)
    private readonly settingRepo: Repository<Setting>,
  ) {}

  async onModuleInit() {
    for (const setting of DEFAULT_SETTINGS) {
      const exists = await this.settingRepo.findOne({ where: { key: setting.key } });
      if (!exists) {
        await this.settingRepo.save(this.settingRepo.create(setting));
      }
    }
  }

  async findAll(group?: string): Promise<Setting[]> {
    const where: any = {};
    if (group) where.group = group;
    return this.settingRepo.find({ where, order: { key: 'ASC' } });
  }

  async get(key: string): Promise<string | null> {
    const setting = await this.settingRepo.findOne({ where: { key } });
    return setting?.value || null;
  }

  async getGroup(group: string): Promise<Record<string, string>> {
    const settings = await this.settingRepo.find({ where: { group } });
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  async update(key: string, value: string): Promise<Setting> {
    let setting = await this.settingRepo.findOne({ where: { key } });
    if (!setting) {
      setting = this.settingRepo.create({ key, value });
    } else {
      setting.value = value;
    }
    return this.settingRepo.save(setting);
  }

  async updateMany(updates: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(updates)) {
      await this.update(key, value);
    }
  }
}
