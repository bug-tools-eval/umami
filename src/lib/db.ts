export const PRISMA = 'prisma';
export const POSTGRESQL = 'postgresql';
export const CLICKHOUSE = 'clickhouse';
export const KAFKA = 'kafka';
export const KAFKA_PRODUCER = 'kafka-producer';

// Fixes issue with converting bigint values
BigInt.prototype.toJSON = function () {
  return Number(this);
};

export function getDatabaseType(url = process.env.DATABASE_URL) {
  const type = url?.split(':')[0];

  if (type === 'postgres') {
    return POSTGRESQL;
  }

  return type;
}

// Both DATABASE_URL and CLICKHOUSE_URL are runtime-immutable; resolve the
// dispatch target once at module init instead of re-reading env vars
// (and re-splitting DATABASE_URL) on every query.
const useClickhouse = !!process.env.CLICKHOUSE_URL;
const usePostgres = !useClickhouse && getDatabaseType() === POSTGRESQL;

export async function runQuery(queries: any) {
  if (useClickhouse) {
    if (queries[KAFKA]) {
      return queries[KAFKA]();
    }

    return queries[CLICKHOUSE]();
  }

  if (usePostgres) {
    return queries[PRISMA]();
  }
}

export function notImplemented() {
  throw new Error('Not implemented.');
}
