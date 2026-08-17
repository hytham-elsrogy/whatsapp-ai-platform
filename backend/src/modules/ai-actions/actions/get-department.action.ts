import { Injectable } from "@nestjs/common";
import { DepartmentsService } from "@/modules/departments/departments.service";
import {
  ActionContext,
  ActionDefinition,
  ActionResult,
} from "../action.interface";

@Injectable()
export class GetDepartmentAction implements ActionDefinition {
  name = "getDepartment";
  description =
    "Look up a department by its exact name and return its id, description and working hours.";
  inputSchema = {
    type: "object" as const,
    properties: {
      name: { type: "string", description: "Exact department name" },
    },
    required: ["name"],
  };

  constructor(private readonly departmentsService: DepartmentsService) {}

  async handler(
    input: Record<string, unknown>,
    ctx: ActionContext,
  ): Promise<ActionResult> {
    const department = await this.departmentsService.findByName(
      ctx.tenantId,
      String(input.name),
    );
    if (!department) return { found: false };
    return {
      found: true,
      id: department.id,
      name: department.name,
      description: department.description ?? null,
      workingHours: department.workingHours ?? null,
    };
  }
}
