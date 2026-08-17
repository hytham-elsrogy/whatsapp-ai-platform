import { Global, Module } from "@nestjs/common";
import { EnvSecretsProvider } from "./env-secrets.provider";
import { SECRETS_PROVIDER } from "./secrets.tokens";

/**
 * Global + leaf module (no imports of its own), same isolation pattern as
 * RealtimeModule (Phase 9) — any module can inject SECRETS_PROVIDER with
 * zero circular-import risk. Swapping in a real Secret Manager later is a
 * one-line change to the `useExisting`/`useClass` binding here, nowhere else.
 */
@Global()
@Module({
  providers: [
    EnvSecretsProvider,
    { provide: SECRETS_PROVIDER, useExisting: EnvSecretsProvider },
  ],
  exports: [SECRETS_PROVIDER],
})
export class SecretsModule {}
