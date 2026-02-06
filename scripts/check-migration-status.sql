-- Check migration status
-- Run this in Neon SQL editor to see what's in your database

-- 1. Check if old history data still exists
SELECT 
  sub,
  jsonb_array_length(history) as history_count,
  jsonb_pretty(history) as history_data
FROM user_data
WHERE jsonb_array_length(history) > 0;

-- 2. Check normalized tables
SELECT COUNT(*) as workout_count FROM workouts;
SELECT COUNT(*) as round_count FROM rounds;
SELECT COUNT(*) as set_count FROM exercise_sets;

-- 3. Check if circuit_name column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'rounds' AND column_name = 'circuit_name';

-- 4. See what's in workouts table (if any)
SELECT workout_id, user_id, date 
FROM workouts 
ORDER BY date DESC 
LIMIT 10;
