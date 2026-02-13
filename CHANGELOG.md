# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Added
- Normalized database schema: workout data now stored in relational tables (`workouts`, `rounds`, `exercise_sets`) instead of JSON blobs
- Automatic migration: existing JSON workout data automatically migrates to normalized format on first access
- Last workout data display: new workouts pre-fill with previous workout's reps and weights
- `getLastWorkoutDataForExercise()` helper function to find most recent exercise data
- Linear integration environment variables (`LINEAR_API_KEY`, `LINEAR_TEAM_ID`) for development tools

### Changed
- Database storage: workout sessions now stored as normalized rows (one per workout, round, and set) instead of single JSON blob per user
- Workout IDs: now use UUIDs instead of timestamps for better database compatibility
- ActiveWorkout component: accepts optional `history` prop and pre-fills sets with last workout data
- ExerciseLog type: added `lastWorkoutSets` field for storing previous workout reference data

### Fixed
- UUID generation for workout IDs to prevent type errors with PostgreSQL UUID columns
- SQL `any()` function syntax in postgres.js queries
- Migration error handling with fallback to old data format
- Circuit name storage in normalized rounds table

### Removed
- One-time migration scripts (`scripts/` directory): schema creation and migration scripts removed after stable migration
- Duplicate skills folder (`antigravity-skills copy/`)
- Temporary test files (`.cursor/temp_linear_test.json`)
