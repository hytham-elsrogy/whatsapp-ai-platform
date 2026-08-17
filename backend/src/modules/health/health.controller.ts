import { Controller, Get } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Public } from "@/common/decorators/public.decorator";

@Controller("health")
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  async check() {
    let database: "ok" | "down" = "ok";
    try {
      await this.dataSource.query("SELECT 1");
    } catch {
      database = "down";
    }
    return {
      status: database === "ok" ? "ok" : "degraded",
      database,
      timestamp: new Date().toISOString(),
    };
  }
}
