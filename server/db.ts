import postgres from 'postgres';

type Sql = ReturnType<typeof postgres>;

let sql: Sql | null = null;
let schemaEnsured = false;

function getDatabaseUrl(): string | null {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    null
  );
}

export function getSql(): Sql | null {
  const url = getDatabaseUrl();
  if (!url) return null;

  if (!sql) {
    // Works with standard Postgres URLs and Vercel Postgres.
    sql = postgres(url, {
      ssl: 'require',
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }

  return sql;
}

export async function ensureAuthSchema(): Promise<void> {
  const client = getSql();
  if (!client) return;
  if (schemaEnsured) return;

  await client`
    create table if not exists users (
      sub text primary key,
      email text not null,
      created_at timestamptz not null default now(),
      last_login_at timestamptz,
      last_logout_at timestamptz,
      last_seen_at timestamptz not null default now()
    );
  `;

  await client`
    create table if not exists auth_events (
      id bigserial primary key,
      sub text not null references users(sub) on delete cascade,
      email text not null,
      event text not null,
      created_at timestamptz not null default now(),
      ip text,
      user_agent text
    );
  `;

  await client`create index if not exists auth_events_sub_created_at_idx on auth_events (sub, created_at desc);`;

  schemaEnsured = true;
}
