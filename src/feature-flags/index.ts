/**
 * @file Feature flag system with boolean, percentage, and user-target flag types.
 * Zero runtime dependencies, ESM-only, strict TypeScript.
 */

/**
 * Configuration for a single feature flag.
 */
export interface FlagDefinition {
  /** The evaluation strategy for this flag. */
  type: 'boolean' | 'percentage' | 'user-target'
  /** Default value when the flag has not been evaluated. */
  default: boolean
  /** Human-readable description of the flag's purpose. */
  description?: string
  /**
   * For `percentage` flags — the rollout percentage (0–100).
   * `Math.random() * 100 < percentage` determines the result.
   */
  percentage?: number
  /**
   * For `user-target` flags — the rollout percentage per user (0–100).
   * Evaluated against a deterministic hash of the user id.
   */
  userPercentage?: number
}

/** Options passed to {@link createFlagStore}. */
export interface FlagStoreOptions {
  /** Map of flag names to their definitions. */
  flags: Record<string, FlagDefinition>
  /**
   * Optional set of forced values that take precedence over
   * normal evaluation logic.
   */
  overrides?: Record<string, boolean>
}

/** Runtime flag store returned by {@link createFlagStore}. */
export interface FlagStore {
  /**
   * Returns `true` if the named flag is enabled for the optional context.
   * Overrides take highest priority, followed by type-specific evaluation.
   *
   * @param flag - The flag name.
   * @param context - Optional context carrying a `userId` for user-target flags.
   */
  isEnabled(flag: string, context?: { userId?: string }): boolean

  /** Returns the raw {@link FlagDefinition} for the named flag, or `undefined`. */
  getFlag(flag: string): FlagDefinition | undefined

  /** Returns every registered flag along with its current evaluated value and definition. */
  getAllFlags(): Record<string, { value: boolean; definition: FlagDefinition }>

  /**
   * Forces a flag to a specific value, bypassing normal evaluation.
   *
   * @param flag - The flag name.
   * @param value - The override value.
   */
  setOverride(flag: string, value: boolean): void

  /** Removes the override for a single flag, restoring normal evaluation. */
  clearOverride(flag: string): void

  /** Removes all overrides. */
  clearAllOverrides(): void

  /**
   * Evaluates every registered flag and returns a map of flag name → boolean.
   *
   * @param context - Optional context to use for evaluation.
   */
  evaluateAll(context?: { userId?: string }): Record<string, boolean>
}

/**
 * DJB2 hash algorithm.
 * Converts a string into a deterministic positive integer.
 *
 * @param str - The input string.
 * @returns A positive 32-bit integer hash.
 */
export function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/**
 * Assigns a user to a variant bucket deterministically.
 * Uses a DJB2 hash of `{experimentId}:{userId}` modulo the number of variants.
 *
 * @param userId - The unique identifier of the user.
 * @param experimentId - The experiment / A/B test identifier.
 * @param variants - The list of variant names to choose from.
 * @returns One of the variant strings from the `variants` array.
 */
export function bucketUser(userId: string, experimentId: string, variants: string[]): string {
  const index = hashString(`${experimentId}:${userId}`) % variants.length
  return variants[index]!
}

/**
 * Creates a new {@link FlagStore} from the provided options.
 *
 * @param opts - The flag definitions and optional overrides.
 * @returns A configured {@link FlagStore} instance.
 */
export function createFlagStore(opts: FlagStoreOptions): FlagStore {
  const overrides = new Map(Object.entries(opts.overrides ?? {}))

  const store: FlagStore = {
    isEnabled(flag: string, context?: { userId?: string }): boolean {
      if (overrides.has(flag)) {
        return overrides.get(flag)!
      }

      const def = opts.flags[flag]
      if (!def) return false

      switch (def.type) {
        case 'boolean':
          return def.default

        case 'percentage': {
          const pct = def.percentage ?? 0
          return Math.random() * 100 < pct
        }

        case 'user-target': {
          if (!context?.userId) return def.default
          const pct = def.userPercentage ?? 0
          const hash = hashString(context.userId)
          return hash % 100 < pct
        }

        default:
          return def.default
      }
    },

    getFlag(flag: string): FlagDefinition | undefined {
      return opts.flags[flag]
    },

    getAllFlags(): Record<string, { value: boolean; definition: FlagDefinition }> {
      const result: Record<string, { value: boolean; definition: FlagDefinition }> = {}
      for (const key of Object.keys(opts.flags)) {
        result[key] = {
          value: store.isEnabled(key),
          definition: opts.flags[key]!,
        }
      }
      return result
    },

    setOverride(flag: string, value: boolean): void {
      overrides.set(flag, value)
    },

    clearOverride(flag: string): void {
      overrides.delete(flag)
    },

    clearAllOverrides(): void {
      overrides.clear()
    },

    evaluateAll(context?: { userId?: string }): Record<string, boolean> {
      const result: Record<string, boolean> = {}
      for (const key of Object.keys(opts.flags)) {
        result[key] = store.isEnabled(key, context)
      }
      return result
    },
  }

  return store
}
