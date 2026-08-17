import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  ConsentSource,
  ConsentStatus,
  ConsentType,
  CustomerConsent,
} from "./entities/customer-consent.entity";

// Common WhatsApp opt-out keywords, Arabic + English — matched
// case-insensitively against the *entire trimmed message*, not a substring,
// so "stop by tomorrow" doesn't false-positive.
const OPT_OUT_KEYWORDS = [
  "stop",
  "unsubscribe",
  "cancel",
  "إلغاء",
  "الغاء",
  "توقف",
  "إيقاف",
];

@Injectable()
export class ConsentsService {
  constructor(
    @InjectRepository(CustomerConsent)
    private readonly repo: Repository<CustomerConsent>,
  ) {}

  /**
   * Consent is an append-only event log (like audit_logs), not a row that's
   * updated in place — every opt-in/opt-out is its own record, so the full
   * history is always recoverable.
   */
  async record(
    customerId: string,
    status: ConsentStatus,
    type?: ConsentType,
    source: ConsentSource = "manual",
  ): Promise<CustomerConsent> {
    const now = new Date();
    return this.repo.save(
      this.repo.create({
        customerId,
        consentStatus: status,
        consentType: type,
        consentSource: source,
        consentDate: status === "opted_in" ? now : null,
        optOutDate: status === "opted_out" ? now : null,
        lastCommunicationAt: now,
      }),
    );
  }

  async getLatest(customerId: string): Promise<CustomerConsent | null> {
    return this.repo.findOne({
      where: { customerId },
      order: { createdAt: "DESC" },
    });
  }

  async isOptedOut(customerId: string): Promise<boolean> {
    const latest = await this.getLatest(customerId);
    return latest?.consentStatus === "opted_out";
  }

  history(customerId: string): Promise<CustomerConsent[]> {
    return this.repo.find({
      where: { customerId },
      order: { createdAt: "DESC" },
    });
  }

  matchesOptOutKeyword(text: string): boolean {
    const normalized = text.trim().toLowerCase();
    return OPT_OUT_KEYWORDS.includes(normalized);
  }
}
