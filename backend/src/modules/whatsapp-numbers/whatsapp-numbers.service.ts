import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WhatsappNumber } from "./entities/whatsapp-number.entity";
import { CreateWhatsappNumberDto } from "./dto/create-whatsapp-number.dto";
import { UpdateWhatsappNumberDto } from "./dto/update-whatsapp-number.dto";

@Injectable()
export class WhatsappNumbersService {
  private readonly logger = new Logger(WhatsappNumbersService.name);

  constructor(
    @InjectRepository(WhatsappNumber)
    private readonly repo: Repository<WhatsappNumber>,
  ) {}

  findAll(tenantId: string): Promise<WhatsappNumber[]> {
    return this.repo.find({ where: { tenantId } });
  }

  async findById(id: string): Promise<WhatsappNumber> {
    const number = await this.repo.findOne({ where: { id } });
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
   * Resolves the raw Meta access token for a number by treating
   * `accessTokenSecretRef` as an environment variable *name* to look up —
   * the same convention already used by the Integrations module's
   * `resolveSecret()`. A production deployment would swap this lookup for a
   * real Secret Manager call keyed by the same ref, without touching any
   * caller (see docs/architecture/04-security-architecture.md).
   *
   * Falls back to the single shared META_ACCESS_TOKEN when the ref doesn't
   * resolve to anything, logging a warning — that fallback is a dev
   * convenience, not something that should go unnoticed in a real deployment
   * with more than one WhatsApp number.
   */
  resolveAccessToken(number: WhatsappNumber): string {
    const scoped = number.accessTokenSecretRef
      ? process.env[number.accessTokenSecretRef]
      : undefined;
    if (scoped) return scoped;

    this.logger.warn(
      `WhatsApp number ${number.id} (${number.label}) has no resolvable secret at accessTokenSecretRef="${number.accessTokenSecretRef}" — falling back to the shared META_ACCESS_TOKEN`,
    );
    return process.env.META_ACCESS_TOKEN || "";
  }
}
