export declare const PROD_HOST_PATTERN: RegExp;
export declare const STAGING_HOST_PATTERN: RegExp;
export declare function hostOf(url: string | undefined): string;
export declare function resolveEnv(
  target: "staging" | "prod",
  opts?: { root?: string },
): Record<string, string>;
export declare function loadEnv(
  target: "staging" | "prod",
  opts?: { root?: string; quiet?: boolean },
): Record<string, string>;
