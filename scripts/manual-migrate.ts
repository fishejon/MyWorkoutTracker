#!/usr/bin/env tsx
/**
 * Manual migration script to recover data from user_data.history
 * Run with: npx tsx scripts/manual-migrate.ts
 * 
 * This script will:
 * 1. Read old history from user_data.history JSONB
 * 2. Migrate it to normalized tables
 * 3. Clear the old history after successful migration
 */

import { getSql, ensureAppSchema } from '../server/db.js';
import { normalizeWorkoutSession } from '../server/workoutDataTransform.js';
import { WorkoutSession } from '../types.js';

async function main() {
  console.log('Starting manual migration...');
  
  const sql = getSql();
  if (!sql) {
    console.error('❌ Database not configured (set DATABASE_URL)');
    process.exit(1);
  }

  try {
    await ensureAppSchema();

    // Get all users with old history data
    const userDataRows = await sql<{
      sub: string;
      history: unknown;
    }[]>`
      select sub, history
      from user_data
      where history != '[]'::jsonb
        and jsonb_array_length(history) > 0
    `;

    if (userDataRows.length === 0) {
      console.log('ℹ️  No users with old history data found.');
      process.exit(0);
    }

    console.log(`Found ${userDataRows.length} user(s) with old history data`);

    for (const userData of userDataRows) {
      const userId = userData.sub;
      console.log(`\nProcessing user: ${userId}`);

      // Validate old history data
      const oldHistoryRaw = Array.isArray(userData.history) ? userData.history : [];
      const oldHistory = (oldHistoryRaw as unknown[]).filter((item): item is WorkoutSession => {
        return (
          typeof item === 'object' &&
          item !== null &&
          'id' in item &&
          typeof (item as { id: unknown }).id === 'string' &&
          'date' in item &&
          typeof (item as { date: unknown }).date === 'string' &&
          'logs' in item &&
          Array.isArray((item as { logs: unknown }).logs) &&
          'circuitNames' in item &&
          Array.isArray((item as { circuitNames: unknown }).circuitNames)
        );
      });

      if (oldHistory.length === 0) {
        console.log(`  ⚠️  No valid workout sessions found for user ${userId}`);
        continue;
      }

      console.log(`  Found ${oldHistory.length} workout session(s) to migrate`);

      // Check if user already has normalized data
      const existingWorkouts = await sql<{ count: number }[]>`
        select count(*) as count
        from workouts
        where user_id = ${userId}
      `;

      if (existingWorkouts[0].count > 0) {
        console.log(`  ⚠️  User already has ${existingWorkouts[0].count} workout(s) in normalized tables. Skipping.`);
        continue;
      }

      // Migrate in transaction
      await sql.begin(async (tx) => {
        let migratedCount = 0;
        
        for (const workoutSession of oldHistory) {
          try {
            const normalized = normalizeWorkoutSession(workoutSession, userId);

            // Insert workout
            await tx`
              insert into workouts (workout_id, user_id, date, created_at)
              values (${normalized.workout.workout_id}, ${normalized.workout.user_id}, ${normalized.workout.date}, ${normalized.workout.created_at})
              on conflict (workout_id) do nothing
            `;

            // Insert rounds and sets
            for (const { round, sets } of normalized.rounds) {
              await tx`
                insert into rounds (round_id, workout_id, circuit_id, circuit_name, round_number, created_at)
                values (${round.round_id}, ${round.workout_id}, ${round.circuit_id}, ${round.circuit_name}, ${round.round_number}, ${round.created_at})
                on conflict (round_id) do nothing
              `;

              for (const set of sets) {
                await tx`
                  insert into exercise_sets (
                    set_id, round_id, exercise_id, exercise_name, exercise_type,
                    set_index, value, weight, created_at
                  )
                  values (
                    ${set.set_id}, ${set.round_id}, ${set.exercise_id}, ${set.exercise_name},
                    ${set.exercise_type}, ${set.set_index}, ${set.value}, ${set.weight}, ${set.created_at}
                  )
                  on conflict (set_id) do nothing
                `;
              }
            }

            migratedCount++;
            console.log(`    ✓ Migrated workout: ${workoutSession.id} (${new Date(workoutSession.date).toLocaleDateString()})`);
          } catch (error) {
            console.error(`    ✗ Failed to migrate workout ${workoutSession.id}:`, error);
            throw error; // Rollback transaction
          }
        }

        console.log(`  ✅ Successfully migrated ${migratedCount} workout(s)`);

        // Clear old history after successful migration
        await tx`
          update user_data
          set history = '[]'::jsonb
          where sub = ${userId}
        `;
        console.log(`  ✅ Cleared old history data`);
      });
    }

    console.log('\n✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
