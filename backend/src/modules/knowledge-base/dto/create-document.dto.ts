import {
  IsIn,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";
import { DocumentSourceType } from "../entities/kb-document.entity";

// 'pdf' has its own upload endpoint (multipart) — see
// KnowledgeBaseController.uploadPdf() — since a PDF is binary, not JSON body content.
const SUPPORTED_SOURCE_TYPES: DocumentSourceType[] = [
  "manual",
  "faq",
  "policy",
  "url",
];

export class CreateDocumentDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsIn(SUPPORTED_SOURCE_TYPES)
  sourceType: DocumentSourceType;

  // Required for manual|faq|policy (pasted text), ignored for url (the page's
  // own text is extracted server-side instead).
  @ValidateIf((dto: CreateDocumentDto) => dto.sourceType !== "url")
  @IsString()
  @MinLength(1)
  content?: string;

  // Required for url, ignored otherwise.
  @ValidateIf((dto: CreateDocumentDto) => dto.sourceType === "url")
  @IsUrl({ require_protocol: true })
  sourceUri?: string;
}
