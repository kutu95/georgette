import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const REQUIRED_MODELS = [
  "source",
  "claim",
  "evidenceLink",
  "observation",
  "observationClaimLink",
  "shipFeature",
  "observationShipFeatureLink",
  "person",
  "place",
  "event",
  "contradiction",
  "file",
] as const;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

function createPool(): Pool {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  pool.on("error", (err) => {
    console.error("[db] Pool error (connections will be retried):", err.message);
  });
  return pool;
}

function createPrismaClient(): PrismaClient {
  const pool = globalForPrisma.pool ?? createPool();

  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }

  return client;
}

function hasDelegate(client: PrismaClient, model: string): boolean {
  const delegate = (client as unknown as Record<string, unknown>)[model];
  return typeof delegate === "object" && delegate !== null && "count" in delegate;
}

export function isPrismaClientCurrent(client: PrismaClient): boolean {
  return REQUIRED_MODELS.every((model) => hasDelegate(client, model));
}

let activeClient: PrismaClient;

function resolvePrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && isPrismaClientCurrent(cached)) {
    return cached;
  }

  if (cached) {
    void cached.$disconnect().catch(() => undefined);
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

/** Returns a fresh Prisma client if the cached one is stale (e.g. after prisma generate). */
export function getPrisma(): PrismaClient {
  if (!activeClient || !isPrismaClientCurrent(activeClient)) {
    if (activeClient) {
      console.warn("[db] Prisma client was stale — reloading after schema change");
    }
    activeClient = resolvePrismaClient();
  }
  return activeClient;
}

activeClient = resolvePrismaClient();

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrisma();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export async function checkDatabase(): Promise<{ ok: boolean; error?: string }> {
  try {
    getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    if (!isPrismaClientCurrent(getPrisma())) {
      return {
        ok: false,
        error: "Prisma client is out of date — run: npx prisma generate",
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Database connection failed",
    };
  }
}

export async function withDbRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("out of date") ||
      message.includes("Cannot read properties of undefined")
    ) {
      activeClient = resolvePrismaClient();
      return await fn();
    }
    throw err;
  }
}
