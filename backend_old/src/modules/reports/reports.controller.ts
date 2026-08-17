import {
  Controller, Get, Query, UseGuards, Res, StreamableFile,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService, ReportPeriod } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'إحصائيات لوحة التحكم' })
  getDashboard(
    @Query('period') period: ReportPeriod = 'today',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getDashboardStats(
      period,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('agents')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'تقرير أداء الموظفين' })
  getAgentReport(
    @Query('period') period: ReportPeriod = 'month',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getAgentReport(
      period,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('export/excel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'تصدير التقرير إلى Excel' })
  async exportExcel(
    @Query('period') period: ReportPeriod = 'month',
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const buffer = await this.reportsService.exportToExcel(
      period,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="report-${new Date().toISOString().split('T')[0]}.xlsx"`,
    });

    return new StreamableFile(buffer);
  }
}
