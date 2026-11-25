import net from 'node:net';
import { PrismaClient } from '@prisma/client';
import { env, isProduction } from './env.js';
import { createMemoryDb } from './memoryDb.js';

const TCP_PROBE_TIMEOUT_MS = 500;

let activeClient = null;
let initPromise = null;
let usingMemoryFallback = false;

function probeTcp(host, port, timeoutMs = TCP_PROBE_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const done = (reachable) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(reachable);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

async function isDatabaseReachable(databaseUrl) {
  if (!databaseUrl) return false;
  try {
    const parsed = new URL(databaseUrl);
    if (!parsed.hostname) return false;
    const port = Number.parseInt(parsed.port || '5432', 10);
    return await probeTcp(parsed.hostname, port);
  } catch {
    return false;
  }
}

async function resolveClient() {
  if (activeClient) return activeClient;
  if (!initPromise) {
    initPromise = (async () => {
      if (await isDatabaseReachable(env.databaseUrl)) {
        const realClient = new PrismaClient({
          datasourceUrl: env.databaseUrl,
          log: isProduction ? ['error'] : ['warn', 'error'],
        });
        try {
          await realClient.$connect();
          activeClient = realClient;
          usingMemoryFallback = false;
          return activeClient;
        } catch {
          await realClient.$disconnect().catch(() => {});
        }
      }

      usingMemoryFallback = true;
      activeClient = createMemoryDb();
      console.log('[db] PostgreSQL unavailable — using local in-memory store');
      return activeClient;
    })();
  }
  return initPromise;
}

function makeDelegateProxy(modelName) {
  return new Proxy(
    {},
    {
      get(_target, methodName) {
        return (...args) => {
          if (activeClient) {
            return activeClient[modelName][methodName](...args);
          }
          return resolveClient().then((client) => client[modelName][methodName](...args));
        };
      },
    },
  );
}

const delegateCache = new Map();

export const prisma = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === 'then') return undefined;
      if (typeof prop === 'string' && prop.startsWith('$')) {
        return (...args) => {
          if (activeClient) {
            return activeClient[prop](...args);
          }
          return resolveClient().then((client) => client[prop](...args));
        };
      }
      if (!delegateCache.has(prop)) {
        delegateCache.set(prop, makeDelegateProxy(prop));
      }
      return delegateCache.get(prop);
    },
  },
);

export async function connectDb() {
  await resolveClient();
  return { mode: usingMemoryFallback ? 'memory' : 'postgres' };
}

export async function disconnectDb() {
  if (activeClient) {
    await activeClient.$disconnect();
  }
}

export async function pingDb() {
  const client = await resolveClient();
  await client.$queryRaw`SELECT 1`;
}
