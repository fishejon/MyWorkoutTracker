-- Manual SQL script to create database schema
-- Run this in your Neon SQL editor

-- Auth tables
create table if not exists users (
  sub text primary key,
  email text not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  last_logout_at timestamptz,
  last_seen_at timestamptz not null default now()
);

create table if not exists auth_events (
  id bigserial primary key,
  sub text not null references users(sub) on delete cascade,
  email text not null,
  event text not null,
  created_at timestamptz not null default now(),
  ip text,
  user_agent text
);

create index if not exists auth_events_sub_created_at_idx on auth_events (sub, created_at desc);

-- Legacy table for circuits and backward compatibility
create table if not exists user_data (
  sub text primary key references users(sub) on delete cascade,
  circuits jsonb not null default '[]'::jsonb,
  history jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Normalized workout storage tables
-- Workouts table: one row per workout session
create table if not exists workouts (
  workout_id uuid primary key default gen_random_uuid(),
  user_id text not null references users(sub) on delete cascade,
  date timestamptz not null,
  created_at timestamptz not null default now()
);

-- Rounds table: one row per round of a circuit within a workout
create table if not exists rounds (
  round_id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(workout_id) on delete cascade,
  circuit_id text not null,
  round_number integer not null,
  created_at timestamptz not null default now()
);

-- Exercise sets table: one row per set within a round
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

-- Indexes for efficient querying
create index if not exists workouts_user_id_date_idx on workouts (user_id, date desc);
create index if not exists rounds_workout_id_idx on rounds (workout_id);
create index if not exists exercise_sets_round_id_idx on exercise_sets (round_id);
