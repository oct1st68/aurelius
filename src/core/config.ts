/**
 * Central configuration. Reads environment once, validates, exposes a frozen object.
 * No `process.env` access anywhere else in the codebase.
 */

const NODE_ENVS = ["development", "test", "production"] as const;
type NodeEnv = (typeof NODE_ENVS)[number];

function readEnv(): AppEnv {
  const nodeEnv = (process.env.NODE_ENV ?? "development") as NodeEnv;
  if (!NODE_ENVS.includes(nodeEnv)) {
    throw new Error(`Invalid NODE_ENV: ${String(nodeEnv)}`);
  }

  const dataDir = process.env.AURELIUS_DATA_DIR ?? "data/local";
  const storageDir = process.env.AURELIUS_STORAGE_DIR ?? "storage/local";

  return {
    nodeEnv,
    isProduction: nodeEnv === "production",
    isTest: nodeEnv === "test",
    dataDir,
    storageDir,
    paymentDriver: (process.env.PAYMENT_DRIVER ?? "mock") as "mock" | "stripe",
    emailDriver: (process.env.EMAIL_DRIVER ?? "mock") as "mock",
    sessionTtlMinutes: numberFrom(process.env.SESSION_TTL_MINUTES, 60 * 24 * 7), // 7 days
    resetTokenTtlMinutes: numberFrom(process.env.RESET_TOKEN_TTL_MINUTES, 30),
    offerExpiryDays: numberFrom(process.env.OFFER_EXPIRY_DAYS, 7),
    platformFeeBasisPoints: numberFrom(process.env.PLATFORM_FEE_BASIS_POINTS, 500), // 5%
    uploadMaxBytes: numberFrom(process.env.UPLOAD_MAX_BYTES, 5 * 1024 * 1024),
    seedDemoPassword: process.env.AURELIUS_SEED_PASSWORD ?? "Aurelius#Demo2024",
  };
}

function numberFrom(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new Error(`Invalid numeric env value: ${String(raw)}`);
  }
  return n;
}

export interface AppEnv {
  nodeEnv: NodeEnv;
  isProduction: boolean;
  isTest: boolean;
  dataDir: string;
  storageDir: string;
  paymentDriver: "mock" | "stripe";
  emailDriver: "mock";
  sessionTtlMinutes: number;
  resetTokenTtlMinutes: number;
  offerExpiryDays: number;
  platformFeeBasisPoints: number;
  uploadMaxBytes: number;
  /** Only used by the seed script to hash demo passwords. */
  seedDemoPassword: string;
}

let cachedBase: Omit<AppEnv, "dataDir" | "storageDir"> | undefined;

/**
 * Lazily-initialized base config. dataDir/storageDir are read fresh on every
 * call so tests can re-point persistence per test case.
 */
export function env(): AppEnv {
  if (!cachedBase) {
    const base = readEnv();
    cachedBase = Object.freeze(base);
  }
  return {
    ...cachedBase,
    dataDir: process.env.AURELIUS_DATA_DIR ?? "data/local",
    storageDir: process.env.AURELIUS_STORAGE_DIR ?? "storage/local",
  };
}
