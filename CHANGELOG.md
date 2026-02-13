# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added
- Custom exercises: add your own exercises with a muscle group; they persist per user and appear in the exercise library under that group for future circuits
- Normalized database schema: workout data stored in relational tables (`workouts`, `rounds`, `exercise_sets`) instead of JSON blobs
- Automatic migration: existing JSON workout data migrates to normalized format on first access
- Last workout as placeholders: weight/reps inputs show previous session's values as light-gray placeholder text until you type (sets start empty)
- `getLastWorkoutDataForExercise()` in storage to find most recent exercise data
- Linear env vars (`LINEAR_API_KEY`, `LINEAR_TEAM_ID`) for Cursor/Linear integration

### Changed
- Database storage: workout sessions stored as normalized rows (workout → rounds → exercise_sets) instead of single JSON blob per user
- Workout IDs: UUIDs instead of timestamps for Postgres compatibility
- ActiveWorkout: optional `history` prop; sets initialize at 0; last values only as input placeholders; "Last: …" row only for duration (timer has no placeholder)
- ExerciseLog: `lastWorkoutSets` holds previous workout data for placeholder display

### Fixed
- History not loading: safe date handling when DB returns date as string; denormalizeWorkouts no longer throws
- Save wiping server: when client sends empty history, server no longer deletes existing workouts
- Storage: getCircuits/getHistory wrapped in try/catch so corrupted localStorage doesn’t crash app
- normalizeWorkoutSession: guards against missing or invalid `logs` array
- UUID generation for workout IDs (Postgres UUID type)
- SQL `any()` syntax in postgres.js queries
- Migration fallback to old data format on failure; circuit_name in rounds table
- API data/get: migration debug logs only when `NODE_ENV !== 'production'`

### Removed
- One-time migration scripts (`scripts/`): create-schema, manual-migrate, restore-workouts, etc. removed after stable migration
- Duplicate skills folder (`antigravity-skills copy/`)
- Temporary test files (`.cursor/temp_linear_test.json`)
