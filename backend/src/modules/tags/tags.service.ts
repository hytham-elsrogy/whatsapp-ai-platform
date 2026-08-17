import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConversationsService } from "@/modules/conversations/conversations.service";
import { Conversation } from "@/modules/conversations/entities/conversation.entity";
import { CustomersService } from "@/modules/customers/customers.service";
import { Tag, TagScope } from "./entities/tag.entity";
import { ConversationTag } from "./entities/conversation-tag.entity";
import { CustomerTag } from "./entities/customer-tag.entity";
import { CreateTagDto } from "./dto/create-tag.dto";

// See docs/architecture/08-routing-architecture.md § 5 — a `complaint`-type
// tag auto-raises priority to `high`. Names are matched case-insensitively;
// Arabic/English variants both recognized since either could be typed by an agent.
const HIGH_PRIORITY_TAG_NAMES = ["complaint", "شكوى", "urgent", "عاجل"];
const PRIORITY_RANK: Record<Conversation["priority"], number> = {
  low: 0,
  normal: 1,
  high: 2,
  urgent: 3,
};

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepo: Repository<Tag>,
    @InjectRepository(ConversationTag)
    private readonly conversationTagRepo: Repository<ConversationTag>,
    @InjectRepository(CustomerTag)
    private readonly customerTagRepo: Repository<CustomerTag>,
    private readonly conversationsService: ConversationsService,
    private readonly customersService: CustomersService,
  ) {}

  findAll(tenantId: string, scope?: TagScope): Promise<Tag[]> {
    return this.tagRepo.find({
      where: scope ? { tenantId, scope } : { tenantId },
    });
  }

  create(tenantId: string, dto: CreateTagDto): Promise<Tag> {
    return this.tagRepo.save(
      this.tagRepo.create({
        ...dto,
        tenantId,
        scope: dto.scope ?? "conversation",
      }),
    );
  }

  async findOrCreateByName(
    tenantId: string,
    name: string,
    scope: TagScope,
  ): Promise<Tag> {
    const existing = await this.tagRepo.findOne({
      where: { tenantId, name, scope },
    });
    if (existing) return existing;
    return this.tagRepo.save(this.tagRepo.create({ tenantId, name, scope }));
  }

  async listForConversation(
    tenantId: string,
    conversationId: string,
  ): Promise<Tag[]> {
    await this.conversationsService.findOne(tenantId, conversationId); // tenant-scope check
    return this.tagRepo
      .createQueryBuilder("tag")
      .innerJoin(ConversationTag, "ct", "ct.tag_id = tag.id")
      .where("ct.conversation_id = :conversationId", { conversationId })
      .getMany();
  }

  async attachToConversation(
    tenantId: string,
    conversationId: string,
    tagId: string,
  ): Promise<void> {
    await this.conversationsService.findOne(tenantId, conversationId); // tenant-scope check
    const tag = await this.findOwnedTag(tenantId, tagId);

    await this.conversationTagRepo
      .createQueryBuilder()
      .insert()
      .into(ConversationTag)
      .values({ conversationId, tagId: tag.id })
      .orIgnore()
      .execute();

    await this.maybeBumpPriority(tenantId, conversationId, tag);
  }

  async detachFromConversation(
    tenantId: string,
    conversationId: string,
    tagId: string,
  ): Promise<void> {
    await this.conversationsService.findOne(tenantId, conversationId); // tenant-scope check
    await this.conversationTagRepo.delete({ conversationId, tagId });
  }

  async listForCustomer(tenantId: string, customerId: string): Promise<Tag[]> {
    await this.customersService.findOne(tenantId, customerId); // tenant-scope check
    return this.tagRepo
      .createQueryBuilder("tag")
      .innerJoin(CustomerTag, "ct", "ct.tag_id = tag.id")
      .where("ct.customer_id = :customerId", { customerId })
      .getMany();
  }

  async attachToCustomer(
    tenantId: string,
    customerId: string,
    tagId: string,
  ): Promise<void> {
    await this.customersService.findOne(tenantId, customerId); // tenant-scope check
    const tag = await this.findOwnedTag(tenantId, tagId);

    await this.customerTagRepo
      .createQueryBuilder()
      .insert()
      .into(CustomerTag)
      .values({ customerId, tagId: tag.id })
      .orIgnore()
      .execute();
  }

  async detachFromCustomer(
    tenantId: string,
    customerId: string,
    tagId: string,
  ): Promise<void> {
    await this.customersService.findOne(tenantId, customerId); // tenant-scope check
    await this.customerTagRepo.delete({ customerId, tagId });
  }

  private async findOwnedTag(tenantId: string, tagId: string): Promise<Tag> {
    const tag = await this.tagRepo.findOne({
      where: { id: tagId, tenantId },
    });
    if (!tag) throw new NotFoundException("Tag not found");
    return tag;
  }

  private async maybeBumpPriority(
    tenantId: string,
    conversationId: string,
    tag: Tag,
  ): Promise<void> {
    if (!HIGH_PRIORITY_TAG_NAMES.includes(tag.name.toLowerCase())) return;

    const conversation = await this.conversationsService.findOne(
      tenantId,
      conversationId,
    );
    if (PRIORITY_RANK[conversation.priority] < PRIORITY_RANK.high) {
      await this.conversationsService.setPriority(conversationId, "high");
    }
  }
}
