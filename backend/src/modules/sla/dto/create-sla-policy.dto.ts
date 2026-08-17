import { IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class CreateSlaPolicyDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsInt()
  @Min(1)
  firstResponseMinutes: number;

  @IsInt()
  @Min(1)
  resolutionMinutes: number;
}
