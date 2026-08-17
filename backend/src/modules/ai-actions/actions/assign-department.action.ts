import { Injectable } from '@nestjs/common';
import { DepartmentsService } from '@/modules/departments/departments.service';
import { AssignmentService } from '@/modules/assignment/assignment.service';
import { ActionContext, ActionDefinition, ActionResult } from '../action.interface';

@Injectable()
export class AssignDepartmentAction implements ActionDefinition {
  name = 'assignDepartment';
  description =
    'Hand this conversation over to a department by exact name. Use this once you have gathered enough information and a human specialist should take over.';
  inputSchema = {
    type: 'object' as const,
    properties: { departmentName: { type: 'string', description: 'Exact department name' } },
    required: ['departmentName'],
  };

  constructor(
    private readonly departmentsService: DepartmentsService,
    private readonly assignmentService: AssignmentService,
  ) {}

  async handler(input: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
    const department = await this.departmentsService.findByName(ctx.tenantId, String(input.departmentName));
    if (!department) return { success: false, reason: 'department_not_found' };

    await this.assignmentService.routeToDepartment(ctx.conversation, department.id);
    return { success: true, departmentId: department.id, departmentName: department.name };
  }
}
