import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFlowDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  departmentId?: string;
}
