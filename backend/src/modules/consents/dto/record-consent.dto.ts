import { IsIn, IsOptional } from "class-validator";
import {
  ConsentStatus,
  ConsentType,
} from "../entities/customer-consent.entity";

export class RecordConsentDto {
  @IsIn(["opted_in", "opted_out", "unknown"])
  status: ConsentStatus;

  @IsOptional()
  @IsIn(["transactional", "marketing"])
  type?: ConsentType;
}
