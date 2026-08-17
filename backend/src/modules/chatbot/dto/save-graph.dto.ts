import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

const NODE_TYPES = [
  'start',
  'message',
  'question',
  'button',
  'list',
  'condition',
  'department',
  'agent',
  'ai',
  'api_call',
  'db_query',
  'delay',
  'tag',
  'end',
];

export class NodeInputDto {
  @IsString()
  clientId: string;

  @IsIn(NODE_TYPES)
  type: string;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsNumber()
  positionX: number;

  @IsNumber()
  positionY: number;
}

export class EdgeInputDto {
  @IsString()
  sourceClientId: string;

  @IsString()
  targetClientId: string;

  @IsOptional()
  @IsObject()
  condition?: Record<string, unknown>;
}

export class SaveGraphDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NodeInputDto)
  nodes: NodeInputDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EdgeInputDto)
  edges: EdgeInputDto[];
}
