import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentsModule } from '@/modules/departments/departments.module';
import { AssignmentModule } from '@/modules/assignment/assignment.module';
import { UsersModule } from '@/modules/users/users.module';
import { TicketsModule } from '@/modules/tickets/tickets.module';
import { TemplatesModule } from '@/modules/templates/templates.module';
import { IntegrationsModule } from '@/modules/integrations/integrations.module';
import { AiAction } from './entities/ai-action.entity';
import { ActionExecutorService } from './action-executor.service';
import { GetDepartmentAction } from './actions/get-department.action';
import { AssignDepartmentAction } from './actions/assign-department.action';
import { AssignAgentAction } from './actions/assign-agent.action';
import { CreateTicketAction } from './actions/create-ticket.action';
import { SendTemplateAction } from './actions/send-template.action';
import {
  CheckAppointmentAction,
  CreateAppointmentRequestAction,
  GetDoctorScheduleAction,
  GetPatientInfoAction,
} from './actions/his-actions';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiAction]),
    DepartmentsModule,
    AssignmentModule,
    UsersModule,
    TicketsModule,
    TemplatesModule,
    IntegrationsModule,
  ],
  providers: [
    ActionExecutorService,
    GetDepartmentAction,
    AssignDepartmentAction,
    AssignAgentAction,
    CreateTicketAction,
    SendTemplateAction,
    CheckAppointmentAction,
    GetDoctorScheduleAction,
    GetPatientInfoAction,
    CreateAppointmentRequestAction,
  ],
  exports: [ActionExecutorService],
})
export class AiActionsModule {}
