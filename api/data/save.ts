import { checkAllowList, getBearerToken, verifyGoogleIdToken } from '../../server/googleAuth.js';
import { ensureAppSchema, getSql } from '../../server/db.js';
import { normalizeWorkoutSession } from '../../server/workoutDataTransform.js';
import { WorkoutSession } from '../../types.js';

type VercelRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  send: (body: string) => void;
  json: (body: unknown) => void;
};

type SaveBody = {
  circuits?: unknown;
  history?: unknown;
};

function parseBody(body: unknown): SaveBody {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as SaveBody;
    } catch {
      return {};
    }
  }
  if (typeof body === 'object') return body as SaveBody;
  return {};
}

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

    const { circuits, history } = parseBody(req.body);
    if (!Array.isArray(circuits) || !Array.isArray(history)) {
      res.status(400).send('Invalid body: expected { circuits: Circuit[], history: WorkoutSession[] }');
      return;
    }

    // Validate and deduplicate workout sessions by ID
    const uniqueWorkouts = new Map<string, WorkoutSession>();
    for (const workoutSession of history as WorkoutSession[]) {
      if (!workoutSession || typeof workoutSession !== 'object' || !workoutSession.id) {
        continue; // Skip invalid entries
      }
      if (uniqueWorkouts.has(workoutSession.id)) {
        // Keep the first occurrence, skip duplicates
        continue;
      }
      uniqueWorkouts.set(workoutSession.id, workoutSession);
    }
    const deduplicatedHistory = Array.from(uniqueWorkouts.values());

    // Ensure the user exists in users table (verify route usually handles this).
    await sql`
      insert into users (sub, email, last_seen_at)
      values (${user.sub}, ${user.email}, now())
      on conflict (sub)
      do update set email = excluded.email, last_seen_at = now();
    `;

    // Save circuits to JSONB (unchanged)
    await sql`
      insert into user_data (sub, circuits, updated_at)
      values (${user.sub}, ${sql.json(circuits)}, now())
      on conflict (sub)
      do update set
        circuits = excluded.circuits,
        updated_at = now();
    `;

    // Save workouts in normalized format using transaction
    await sql.begin(async (tx) => {
      // Delete existing workouts for this user (to handle updates)
      // Cascade delete will automatically remove rounds and exercise_sets
      await tx`
        delete from workouts
        where user_id = ${user.sub}
      `;

      // Insert each workout session as normalized rows
      for (const workoutSession of deduplicatedHistory) {
        const normalized = normalizeWorkoutSession(workoutSession, user.sub);

        // Insert workout
        await tx`
          insert into workouts (workout_id, user_id, date, created_at)
          values (${normalized.workout.workout_id}, ${normalized.workout.user_id}, ${normalized.workout.date}, ${normalized.workout.created_at})
        `;

        // Insert rounds and sets for this workout
        for (const { round, sets } of normalized.rounds) {
          await tx`
            insert into rounds (round_id, workout_id, circuit_id, circuit_name, round_number, created_at)
            values (${round.round_id}, ${round.workout_id}, ${round.circuit_id}, ${round.circuit_name}, ${round.round_number}, ${round.created_at})
          `;

          // Insert sets for this round
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

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('data/save error', err);
    res.status(500).send('Server error');
  }
}
