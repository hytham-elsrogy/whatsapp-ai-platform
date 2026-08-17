import { Injectable } from "@nestjs/common";
import { SecretsProvider } from "./secrets-provider.interface";

/**
 * Treats `ref` as an environment variable *name* to look up — the only
 * SecretsProvider implemented so far, and the same convention that was
 * previously duplicated ad-hoc in WhatsappNumbersService.resolveAccessToken
 * and the Integrations module's resolveSecret(). A real deployment swaps
 * this for a provider backed by an actual secret store (AWS/GCP Secrets
 * Manager, HashiCorp Vault, ...) keyed by the same `ref` string, without
 * touching any caller — same swap-behind-a-token pattern already used for
 * LLM_PROVIDER/EMBEDDING_PROVIDER (see llm.module.ts).
 */
@Injectable()
export class EnvSecretsProvider implements SecretsProvider {
  async getSecret(ref: string | undefined): Promise<string | undefined> {
    if (!ref) return undefined;
    return process.env[ref];
  }
}
