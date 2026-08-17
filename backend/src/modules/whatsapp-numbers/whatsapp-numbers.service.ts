import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SecretsProvider } from "@/modules/secrets/secrets-provider.interface";
import { SECRETS_PROVIDER } from "@/modules/secrets/secrets.tokens";
import { WhatsappNumber } from "./entities/whatsapp-number.entity";
import { CreateWhatsappNumberDto } from "./dto/create-whatsapp-number.dto";
import { UpdateWhatsappNumberDto } from "./dto/update-whatsapp-number.dto";

@Injectable()
export class WhatsappNumbersService {
  private readonly logger = new Logger(WhatsappNumbersService.name);

  constructor(
    @InjectRepository(WhatsappNumber)
    private readonly repo: Repository<WhatsappNumber>,
    @Inject(SECRETS_PROVIDER)
    private readonly secretsProvider: SecretsProvider,
  ) {}

  findAll(tenantId: string): Promise<WhatsappNumber[]> {
    return this.repo.find({ where: { tenantId } });
  }

  /**
   * Unscoped by design — safe only when `id` is derived from an
   * already-tenant-verified object (e.g. `conversation.whatsappNumberId`
   * after `conversationsService.findOne(tenantId, ...)`), never from raw
   * client input. If `id` comes straight from a request body/param, use
   * `findOne(tenantId, id)` instead — see its doc comment for why this
   * distinction matters.
   */
  async findById(id: string): Promise<WhatsappNumber> {
    const number = await this.repo.findOne({ where: { id } });
    if (!number) throw new NotFoundException("WhatsApp number not found");
    return number;
  }

  /**
   * Tenant-scoped lookup — use this whenever `id` originates from
   * unvalidated client input (a request body field, not a value derived
   * from an already-tenant-verified resource). `findById()` above has no
   * such guarantee and previously being used with a raw client-supplied
   * `whatsappNumberId` (in TemplatesService.submitToMeta) let one tenant
   * resolve and use another tenant's live Meta access token.
   */
  async findOne(tenantId: string, id: string): Promise<WhatsappNumber> {
    const number = await this.repo.findOne({ where: { id, tenantId } });
    if (!number) throw new NotFoundException("WhatsApp number not found");
    return number;
  }

  async findByPhoneNumberId(phoneNumberId: string): Promise<WhatsappNumber> {
    const number = await this.repo.findOne({ where: { phoneNumberId } });
    if (!number) {
      throw new NotFoundException(
        `No WhatsApp number registered for phone_number_id=${phoneNumberId}`,
      );
    }
    return number;
  }

  create(
    tenantId: string,
    dto: CreateWhatsappNumberDto,
  ): Promise<WhatsappNumber> {
    const number = this.repo.create({ ...dto, tenantId });
    return this.repo.save(number);
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateWhatsappNumberDto,
  ): Promise<WhatsappNumber> {
    const number = await this.repo.findOne({ where: { id, tenantId } });
    if (!number) throw new NotFoundException("WhatsApp number not found");
    await this.repo.update(id, dto);
    return this.findById(id);
  }

  /**
   * Resolves the raw Meta access token for a number via SECRETS_PROVIDER
   * (currently env-var-backed; see modules/secrets). Falls back to the
   * single shared META_ACCESS_TOKEN when the ref doesn't resolve to
   * anything, logging a warning — that fallback is a dev convenience, not
   * something that should go unnoticed in a real deployment with more than
   * one WhatsApp number.
   */
  async resolveAccessToken(number: WhatsappNumber): Promise<string> {
    const scoped = await this.secretsProvider.getSecret(
      number.accessTokenSecretRef,
    );
    if (scoped) return scoped;

    this.logger.warn(
      `WhatsApp number ${number.id} (${number.label}) has no resolvable secret at accessTokenSecretRef="${number.accessTokenSecretRef}" — falling back to the shared META_ACCESS_TOKEN`,
    );
    return (await this.secretsProvider.getSecret("META_ACCESS_TOKEN")) ?? "";
  }
}
