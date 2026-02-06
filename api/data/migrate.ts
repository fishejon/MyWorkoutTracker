import { checkAllowList, getBearerToken, verifyGoogleIdToken } from '../../server/googleAuth.js';
import { ensureAppSchema, getSql } from '../../server/db.js';
import { normalizeWorkoutSession, denormalizeWorkouts } from '../../server/workoutDataTransform.js';
import { WorkoutRow, RoundRow, ExerciseSetRow } from '../../server/workoutDataTransform.js';
import { WorkoutSession } from '../../types.js';

type VercelRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  send: (body: string) => void;
  json: (body: unknown) => void;
};

/**
 * Manual migration endpoint
 * POST /api/data/migrate - Force migration of old data
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
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

    // Get old history data
    const userDataRows = await sql<{
      circuits: unknown;
      history: unknown;
    }[]>`
      select circuits, history
      from user_data
      where sub = ${user.sub}
    `;

    const oldHistoryRaw = userDataRows.length > 0 && Array.isArray(userDataRows[0].history)
      ? userDataRows[0].history
      : [];

    // Validate old history
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
      res.status(200).json({ 
        success: false, 
        message: 'No old history data found to migrate',
        oldHistoryCount: oldHistoryRaw.length,
        validatedCount: oldHistory.length
      });
      return;
    }

    // Check existing workouts
    const existingWorkouts = await sql<WorkoutRow[]>`
      select workout_id, user_id, date, created_at
      from workouts
      where user_id = ${user.sub}
    `;

    if (existingWorkouts.length > 0) {
      res.status(200).json({
        success: false,
        message: `User already has ${existingWorkouts.length} workout(s) in normalized tables`,
        existingCount: existingWorkouts.length,
        oldHistoryCount: oldHistory.length
      });
      return;
    }

    // Perform migration
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

    // Verify migration
    const migratedWorkouts = await sql<WorkoutRow[]>`
      select workout_id, user_id, date, created_at
      from workouts
      where user_id = ${user.sub}
      order by date desc
    `;

    // Clear old history only if migration succeeded
    if (migratedWorkouts.length > 0) {
      await sql`
        update user_data
        set history = '[]'::jsonb
        where sub = ${user.sub}
      `;
    }

    res.status(200).json({
      success: true,
      message: `Successfully migrated ${oldHistory.length} workout(s)`,
      migratedCount: migratedWorkouts.length,
      oldHistoryCount: oldHistory.length
    });
  } catch (err) {
    console.error('data/migrate error', err);
    res.status(500).json({ 
      success: false, 
      error: String(err),
      message: 'Migration failed'
    });
  }
}
