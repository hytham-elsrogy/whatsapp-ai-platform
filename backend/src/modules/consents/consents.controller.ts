import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConsentsService } from './consents.service';
import { RecordConsentDto } from './dto/record-consent.dto';

@ApiTags('consents')
@ApiBearerAuth()
@Controller('customers/:customerId/consent')
export class ConsentsController {
  constructor(private readonly consentsService: ConsentsService) {}

  @Get()
  async getLatest(@Param('customerId') customerId: string) {
    return (await this.consentsService.getLatest(customerId)) ?? { consentStatus: 'unknown' };
  }

  @Get('history')
  history(@Param('customerId') customerId: string) {
    return this.consentsService.history(customerId);
  }

  @Post()
  record(@Param('customerId') customerId: string, @Body() dto: RecordConsentDto) {
    return this.consentsService.record(customerId, dto.status, dto.type, 'manual');
  }
}
