import { checkAllowList, getBearerToken, verifyGoogleIdToken } from '../../server/googleAuth.js';
import { ensureAppSchema, getSql } from '../../server/db.js';
import { denormalizeWorkouts, normalizeWorkoutSession } from '../../server/workoutDataTransform.js';
import { WorkoutRow, RoundRow, ExerciseSetRow } from '../../server/workoutDataTransform.js';
import { WorkoutSession } from '../../types.js';

const isDev = process.env.NODE_ENV !== 'production';

type VercelRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  send: (body: string) => void;
  json: (body: unknown) => void;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const idToken = getBearerToken(req);
  if (!idToken) {
    res.status(401).send('Missing Authorization: Bearer <id_token>');
    return;
  }

  try {
    const user = await verifyGoogleIdToken(idToken);
    if (!user.emailVerified) {
      res.status(403).send('Unverified Google account');
      return;
    }

    checkAllowList(user);

    const sql = getSql();
    if (!sql) {
      res.status(500).send('Database not configured (set DATABASE_URL)');
      return;
    }

    await ensureAppSchema();

    // Ensure circuit_name column exists (for existing tables)
    try {
      await sql`alter table rounds add column if not exists circuit_name text;`;
    } catch {
      // Column might already exist or table doesn't exist yet - ignore
    }

    // Get circuits and check for old history data
    const userDataRows = await sql<{
      circuits: unknown;
      history: unknown;
    }[]>`
      select circuits, history
      from user_data
      where sub = ${user.sub}
    `;

    const circuits = userDataRows.length > 0 && Array.isArray(userDataRows[0].circuits)
      ? userDataRows[0].circuits
      : [];

    // Check if user has old JSONB history data that needs migration
    // Validate old history data structure before casting
    const oldHistoryRaw = userDataRows.length > 0 && Array.isArray(userDataRows[0].history)
      ? userDataRows[0].history
      : [];
    
    if (isDev) console.log(`[Migration Debug] User ${user.sub}: userDataRows.length=${userDataRows.length}, oldHistoryRaw.length=${oldHistoryRaw.length}`);

    // Runtime validation: ensure each item is a valid WorkoutSession
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

    if (isDev) console.log(`[Migration Debug] After validation: oldHistory.length=${oldHistory.length}`);

    // Get workouts from normalized tables
    const workoutRows = await sql<WorkoutRow[]>`
      select workout_id, user_id, date, created_at
      from workouts
      where user_id = ${user.sub}
      order by date desc
    `;

    if (isDev) console.log(`[Migration Debug] Existing workouts: ${workoutRows.length}`);

    // Migrate old data if it exists and no normalized data exists
    if (oldHistory.length > 0 && workoutRows.length === 0) {
      if (isDev) console.log(`Starting migration for user ${user.sub}: ${oldHistory.length} workout(s)`);

      // Migrate old JSONB history to normalized tables
      try {
        await sql.begin(async (tx) => {
          for (const workoutSession of oldHistory) {
            const normalized = normalizeWorkoutSession(workoutSession, user.sub);

            // Insert workout
            await tx`
              insert into workouts (workout_id, user_id, date, created_at)
              values (${normalized.workout.workout_id}, ${normalized.workout.user_id}, ${normalized.workout.date}, ${normalized.workout.created_at})
            `;

            // Insert rounds and sets
            for (const { round, sets } of normalized.rounds) {
              await tx`
                insert into rounds (round_id, workout_id, circuit_id, circuit_name, round_number, created_at)
                values (${round.round_id}, ${round.workout_id}, ${round.circuit_id}, ${round.circuit_name}, ${round.round_number}, ${round.created_at})
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
                `;
              }
            }
          }
        });

        if (isDev) console.log(`Migration completed successfully for user ${user.sub}`);
      } catch (migrationError) {
        console.error(`Migration failed for user ${user.sub}:`, migrationError);
        // Don't clear old data if migration failed
        // Return old data format so user doesn't lose data
        res.status(200).json({ 
          circuits, 
          history: oldHistory // Return old format if migration fails
        });
        return;
      }

      // Re-query workouts after migration
      const migratedWorkoutRows = await sql<WorkoutRow[]>`
        select workout_id, user_id, date, created_at
        from workouts
        where user_id = ${user.sub}
        order by date desc
      `;

      if (migratedWorkoutRows.length > 0) {
        // Use migrated data
        const roundRows = await sql<RoundRow[]>`
          select round_id, workout_id, circuit_id, circuit_name, round_number, created_at
          from rounds
          where workout_id = any(${migratedWorkoutRows.map(w => w.workout_id)})
          order by workout_id, round_number
        `;

        const roundIds = roundRows.map(r => r.round_id);
        const setRows = roundIds.length > 0
          ? await sql<ExerciseSetRow[]>`
              select set_id, round_id, exercise_id, exercise_name, exercise_type,
                     set_index, value, weight, created_at
              from exercise_sets
              where round_id = any(${roundIds})
              order by round_id, set_index
            `
          : [];

        const workoutsData = migratedWorkoutRows.map(workout => {
          const rounds = roundRows
            .filter(r => r.workout_id === workout.workout_id)
            .map(round => ({
              round,
              sets: setRows.filter(s => s.round_id === round.round_id),
            }));

          return { workout, rounds };
        });

        const history = denormalizeWorkouts(workoutsData);
        
        // Only clear old history data if migration was successful and we have data
        if (history.length > 0) {
          await sql`
            update user_data
            set history = '[]'::jsonb
            where sub = ${user.sub}
          `;
        }
        
        res.status(200).json({ circuits, history });
        return;
      } else {
        // Migration ran but no data was created - don't clear old data
        console.error(`[Migration Debug] Migration completed but no workouts were created for user ${user.sub}`);
        // Return old history if migration failed
        if (oldHistory.length > 0) {
          res.status(200).json({ circuits, history: oldHistory });
          return;
        }
      }
    }

    // If no workouts exist and no old history, return empty
    if (workoutRows.length === 0) {
      if (isDev) console.log(`[Migration Debug] No workouts found, oldHistory.length=${oldHistory.length}`);
      // If we have old history but migration didn't run, return it
      if (oldHistory.length > 0) {
        if (isDev) console.log(`[Migration Debug] Returning old history format as fallback`);
        res.status(200).json({ circuits, history: oldHistory });
        return;
      }
      res.status(200).json({ circuits, history: [] });
      return;
    }

    // Get rounds for these workouts
    const workoutIds = workoutRows.map(w => w.workout_id);
    const roundRows = workoutIds.length > 0
      ? await sql<RoundRow[]>`
          select round_id, workout_id, circuit_id, circuit_name, round_number, created_at
          from rounds
          where workout_id = any(${workoutIds})
          order by workout_id, round_number
        `
      : [];

    // Get sets for these rounds
    const roundIds = roundRows.map(r => r.round_id);
    const setRows = roundIds.length > 0
      ? await sql<ExerciseSetRow[]>`
          select set_id, round_id, exercise_id, exercise_name, exercise_type,
                 set_index, value, weight, created_at
          from exercise_sets
          where round_id = any(${roundIds})
          order by round_id, set_index
        `
      : [];

    // Group data by workout
    const workoutsData = workoutRows.map(workout => {
      const rounds = roundRows
        .filter(r => r.workout_id === workout.workout_id)
        .map(round => ({
          round,
          sets: setRows.filter(s => s.round_id === round.round_id),
        }));

      return {
        workout,
        rounds,
      };
    });

    // Reconstruct WorkoutSession objects
    const history = denormalizeWorkouts(workoutsData);

    res.status(200).json({
      circuits,
      history,
    });
  } catch (err) {
    console.error('data/get error', err);
    res.status(500).send('Server error');
  }
}
