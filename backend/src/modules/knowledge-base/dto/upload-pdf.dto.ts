import { IsString, MaxLength } from "class-validator";

export class UploadPdfDto {
  @IsString()
  @MaxLength(255)
  title: string;
}
