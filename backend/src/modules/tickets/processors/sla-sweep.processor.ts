import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { SlaSweepService } from "../sla-sweep.service";
import { SLA_SWEEP_QUEUE } from "../sla-sweep.constants";

@Processor(SLA_SWEEP_QUEUE)
export class SlaSweepProcessor extends WorkerHost {
  private readonly logger = new Logger(SlaSweepProcessor.name);

  constructor(private readonly slaSweepService: SlaSweepService) {
    super();
  }

  async process(): Promise<void> {
    await this.slaSweepService.run();
    this.logger.debug("SLA sweep completed");
  }
}
