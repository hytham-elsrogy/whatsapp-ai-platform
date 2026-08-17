export interface SecretsProvider {
  /**
   * Resolves an opaque reference to its real secret value, or `undefined`
   * if it doesn't resolve to anything. `ref` itself is never a secret —
   * it's a lookup key (currently: an environment variable name).
   */
  getSecret(ref: string | undefined): Promise<string | undefined>;
}
