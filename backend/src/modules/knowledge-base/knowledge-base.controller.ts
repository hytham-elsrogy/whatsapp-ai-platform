import { BadRequestException, Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/permissions.decorator';
import { User } from '@/modules/users/entities/user.entity';
import { KnowledgeBaseService } from './knowledge-base.service';
import { DocumentsService } from './documents.service';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UploadPdfDto } from './dto/upload-pdf.dto';

const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20MB

@ApiTags('knowledge-base')
@ApiBearerAuth()
@Controller('knowledge-bases')
export class KnowledgeBaseController {
  constructor(
    private readonly knowledgeBaseService: KnowledgeBaseService,
    private readonly documentsService: DocumentsService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.knowledgeBaseService.findAll(user.tenantId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.knowledgeBaseService.findOne(user.tenantId, id);
  }

  @Post()
  @RequirePermissions('knowledge_base.manage')
  create(@CurrentUser() user: User, @Body() dto: CreateKnowledgeBaseDto) {
    return this.knowledgeBaseService.create(user.tenantId, dto);
  }

  @Get(':id/documents')
  async findDocuments(@CurrentUser() user: User, @Param('id') id: string) {
    await this.knowledgeBaseService.findOne(user.tenantId, id); // tenant-scope check
    return this.documentsService.findAllForKnowledgeBase(id);
  }

  @Post(':id/documents')
  @RequirePermissions('knowledge_base.manage')
  createDocument(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CreateDocumentDto,
  ) {
    return this.documentsService.create(user.tenantId, id, user.id, dto);
  }

  @Post(':id/documents/pdf')
  @RequirePermissions('knowledge_base.manage')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_PDF_BYTES } }))
  uploadPdf(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UploadPdfDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException(`Expected a PDF, got ${file.mimetype}`);
    }
    return this.documentsService.createFromPdf(user.tenantId, id, user.id, dto.title, file.buffer);
  }
}
