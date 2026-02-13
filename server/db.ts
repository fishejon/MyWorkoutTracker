import postgres from 'postgres';

type Sql = ReturnType<typeof postgres>;

let sql: Sql | null = null;
let authSchemaEnsured = false;
let appSchemaEnsured = false;

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
  if (authSchemaEnsured) return;

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

  authSchemaEnsured = true;
}

export async function ensureAppSchema(): Promise<void> {
  const client = getSql();
  if (!client) return;
  if (appSchemaEnsured) return;

  // Ensure auth tables exist first (users is referenced).
  await ensureAuthSchema();

  // Legacy table for circuits and backward compatibility
  await client`
    create table if not exists user_data (
      sub text primary key references users(sub) on delete cascade,
      circuits jsonb not null default '[]'::jsonb,
      history jsonb not null default '[]'::jsonb,
      updated_at timestamptz not null default now()
    );
  `;

  // User-defined exercises per muscle group (backward compatible: default empty)
  await client`
    alter table user_data add column if not exists custom_exercises jsonb not null default '[]'::jsonb;
  `;

  // Normalized workout storage tables
  // Workouts table: one row per workout session
  // Note: workout_id is UUID, but we generate it in code to ensure consistency
  await client`
    create table if not exists workouts (
      workout_id uuid primary key,
      user_id text not null references users(sub) on delete cascade,
      date timestamptz not null,
      created_at timestamptz not null default now()
    );
  `;

  // Rounds table: one row per round of a circuit within a workout
  await client`
    create table if not exists rounds (
      round_id uuid primary key default gen_random_uuid(),
      workout_id uuid not null references workouts(workout_id) on delete cascade,
      circuit_id text not null,
      circuit_name text not null,
      round_number integer not null,
      created_at timestamptz not null default now()
    );
  `;

  // Add circuit_name column if it doesn't exist (for existing tables)
  await client`
    alter table rounds add column if not exists circuit_name text;
  `;

  // Exercise sets table: one row per set within a round
  await client`
    create table if not exists exercise_sets (
      set_id uuid primary key default gen_random_uuid(),
      round_id uuid not null references rounds(round_id) on delete cascade,
      exercise_id text not null,
      exercise_name text not null,
      exercise_type text not null,
      set_index integer not null,
      value numeric not null,
      weight numeric,
      created_at timestamptz not null default now()
    );
  `;

  // Indexes for efficient querying
  await client`create index if not exists workouts_user_id_date_idx on workouts (user_id, date desc);`;
  await client`create index if not exists rounds_workout_id_idx on rounds (workout_id);`;
  await client`create index if not exists exercise_sets_round_id_idx on exercise_sets (round_id);`;

  appSchemaEnsured = true;
}
