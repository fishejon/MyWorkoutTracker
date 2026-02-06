-- Migration script to add circuit_name column to rounds table
-- Run this in your Neon SQL editor if the rounds table already exists

-- Add circuit_name column (nullable first, then we'll backfill)
alter table rounds add column if not exists circuit_name text;

-- If there are existing rows without circuit_name, we can't easily backfill
-- But new migrations will populate it correctly
-- For existing data, you may need to re-migrate from the old JSONB history
