import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export const SENDABLE_MEDIA_TYPES = ["image", "audio", "document"] as const;
export type SendableMediaType = (typeof SENDABLE_MEDIA_TYPES)[number];

export class SendMediaDto {
  @IsIn(SENDABLE_MEDIA_TYPES)
  type: SendableMediaType;

  // Ignored for type "audio" — the Cloud API rejects captions on audio messages (see MetaService.sendMediaMessage).
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  caption?: string;
}
