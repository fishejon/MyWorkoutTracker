-- Restore workouts from the JSON data you provided
-- Replace YOUR_USER_SUB with your actual user sub (from users table)
-- Run this in Neon SQL editor

-- First, find your user sub:
-- SELECT sub, email FROM users;

-- Then update user_data.history with your workout data:
-- (Replace YOUR_USER_SUB with your actual sub value)

UPDATE user_data
SET history = '[
  {
    "id": "1770307156355",
    "date": "2026-02-05T00:00:00.000Z",
    "logs": [
      {
        "sets": [
          {"value": 8, "weight": 30, "setIndex": 0},
          {"value": 10, "weight": 20, "setIndex": 1},
          {"value": 10, "weight": 20, "setIndex": 2}
        ],
        "type": "weight",
        "circuitId": "1770302086513",
        "exerciseId": "custom-1770302031530",
        "circuitName": "Back",
        "exerciseName": "Reverse cable fly"
      },
      {
        "sets": [
          {"value": 6, "weight": 42, "setIndex": 0},
          {"value": 8, "weight": 35, "setIndex": 1},
          {"value": 8, "weight": 35, "setIndex": 2}
        ],
        "type": "weight",
        "circuitId": "1770302086513",
        "exerciseId": "b3",
        "circuitName": "Back",
        "exerciseName": "Lat Pulldown"
      },
      {
        "sets": [
          {"value": 10, "weight": 42, "setIndex": 0},
          {"value": 8, "weight": 50, "setIndex": 1},
          {"value": 8, "weight": 50, "setIndex": 2}
        ],
        "type": "weight",
        "circuitId": "1770302086513",
        "exerciseId": "b4",
        "circuitName": "Back",
        "exerciseName": "Seated Cable Row"
      },
      {
        "sets": [
          {"value": 10, "weight": 12, "setIndex": 0},
          {"value": 10, "weight": 12, "setIndex": 1},
          {"value": 10, "weight": 12, "setIndex": 2}
        ],
        "type": "weight",
        "circuitId": "1770302246782",
        "exerciseId": "s1",
        "circuitName": "Shoulders",
        "exerciseName": "Lateral Raises"
      },
      {
        "sets": [
          {"value": 8, "weight": 3, "setIndex": 0},
          {"value": 5, "weight": 3, "setIndex": 1},
          {"value": 5, "weight": 3, "setIndex": 2}
        ],
        "type": "weight",
        "circuitId": "1770302246782",
        "exerciseId": "custom-1770302168273",
        "circuitName": "Shoulders",
        "exerciseName": "Y, W, T"
      }
    ],
    "circuitNames": ["Back", "Shoulders"]
  },
  {
    "id": "1770076978983",
    "date": "2026-02-02T00:00:00.000Z",
    "logs": [
      {
        "sets": [
          {"value": 8, "weight": 50, "setIndex": 0},
          {"value": 8, "weight": 50, "setIndex": 1},
          {"value": 8, "weight": 50, "setIndex": 2}
        ],
        "type": "weight",
        "circuitId": "1770071920998",
        "exerciseId": "custom-1770071872192",
        "circuitName": "Glute and Quads 2",
        "exerciseName": "Curtsy Lunge"
      },
      {
        "sets": [
          {"value": 10, "weight": 50, "setIndex": 0},
          {"value": 8, "weight": 50, "setIndex": 1},
          {"value": 8, "weight": 50, "setIndex": 2}
        ],
        "type": "weight",
        "circuitId": "1770071920998",
        "exerciseId": "l6",
        "circuitName": "Glute and Quads 2",
        "exerciseName": "Bulgarian Split Squats"
      },
      {
        "sets": [
          {"value": 12, "weight": 35, "setIndex": 0},
          {"value": 10, "weight": 40, "setIndex": 1},
          {"value": 10, "weight": 50, "setIndex": 2}
        ],
        "type": "weight",
        "circuitId": "1770071920998",
        "exerciseId": "l7",
        "circuitName": "Glute and Quads 2",
        "exerciseName": "Goblet Squats"
      },
      {
        "sets": [
          {"value": 10, "weight": 50, "setIndex": 0},
          {"value": 0, "weight": 0, "setIndex": 1},
          {"value": 0, "weight": 0, "setIndex": 2}
        ],
        "type": "weight",
        "circuitId": "1770075530356",
        "exerciseId": "custom-1770075478659",
        "circuitName": "Hamstrings and Quads",
        "exerciseName": "Single Leg Deadlift, Right"
      },
      {
        "sets": [
          {"value": 10, "weight": 50, "setIndex": 0},
          {"value": 0, "weight": 0, "setIndex": 1},
          {"value": 0, "weight": 0, "setIndex": 2}
        ],
        "type": "weight",
        "circuitId": "1770075530356",
        "exerciseId": "custom-1770075491235",
        "circuitName": "Hamstrings and Quads",
        "exerciseName": "Single Leg Deadlift, Left"
      },
      {
        "sets": [
          {"value": 0, "setIndex": 0},
          {"value": 0, "setIndex": 1},
          {"value": 0, "setIndex": 2}
        ],
        "type": "reps",
        "circuitId": "1770075530356",
        "exerciseId": "custom-1770075520900",
        "circuitName": "Hamstrings and Quads",
        "exerciseName": "Jump Squat"
      }
    ],
    "circuitNames": ["Glute and Quads 2", "Hamstrings and Quads"]
  },
  {
    "id": "1769616698028",
    "date": "2026-01-28T00:00:00.000Z",
    "logs": [
      {
        "sets": [
          {"value": 12, "weight": 20, "setIndex": 0},
          {"value": 10, "weight": 20, "setIndex": 1},
          {"value": 6, "weight": 22, "setIndex": 2},
          {"value": 0, "weight": 0, "setIndex": 3}
        ],
        "type": "weight",
        "circuitId": "1769565673310",
        "exerciseId": "a1",
        "circuitName": "Biceps 1",
        "exerciseName": "Bicep Curls (Dumbbell)"
      },
      {
        "sets": [
          {"value": 10, "weight": 40, "setIndex": 0},
          {"value": 8, "weight": 40, "setIndex": 1},
          {"value": 8, "weight": 40, "setIndex": 2},
          {"value": 0, "weight": 0, "setIndex": 3}
        ],
        "type": "weight",
        "circuitId": "1769565673310",
        "exerciseId": "a5",
        "circuitName": "Biceps 1",
        "exerciseName": "Preacher Curls"
      },
      {
        "sets": [
          {"value": 10, "weight": 20, "setIndex": 0},
          {"value": 10, "weight": 20, "setIndex": 1},
          {"value": 6, "weight": 22, "setIndex": 2},
          {"value": 0, "weight": 0, "setIndex": 3}
        ],
        "type": "weight",
        "circuitId": "1769565673310",
        "exerciseId": "a2",
        "circuitName": "Biceps 1",
        "exerciseName": "Hammer Curls"
      },
      {
        "sets": [
          {"value": 12, "setIndex": 0},
          {"value": 12, "setIndex": 1},
          {"value": 12, "setIndex": 2},
          {"value": 0, "setIndex": 3}
        ],
        "type": "reps",
        "circuitId": "1769565731605",
        "exerciseId": "a6",
        "circuitName": "Triceps 1",
        "exerciseName": "Dips (Tricep Focus)"
      },
      {
        "sets": [
          {"value": 12, "weight": 30, "setIndex": 0},
          {"value": 12, "weight": 30, "setIndex": 1},
          {"value": 12, "weight": 30, "setIndex": 2},
          {"value": 0, "weight": 0, "setIndex": 3}
        ],
        "type": "weight",
        "circuitId": "1769565731605",
        "exerciseId": "a4",
        "circuitName": "Triceps 1",
        "exerciseName": "Skull Crushers"
      },
      {
        "sets": [
          {"value": 12, "weight": 20, "setIndex": 0},
          {"value": 12, "weight": 20, "setIndex": 1},
          {"value": 12, "weight": 20, "setIndex": 2},
          {"value": 0, "weight": 0, "setIndex": 3}
        ],
        "type": "weight",
        "circuitId": "1769565731605",
        "exerciseId": "custom-1769565728080",
        "circuitName": "Triceps 1",
        "exerciseName": "Close Grip Dumbell Press"
      },
      {
        "sets": [
          {"value": 8, "weight": 42, "setIndex": 0},
          {"value": 10, "weight": 42, "setIndex": 1},
          {"value": 8, "weight": 42, "setIndex": 2}
        ],
        "type": "weight",
        "circuitId": "1769573965482",
        "exerciseId": "b4",
        "circuitName": "Back and Shoulders 1",
        "exerciseName": "Seated Cable Row"
      },
      {
        "sets": [
          {"value": 12, "weight": 35, "setIndex": 0},
          {"value": 6, "weight": 42, "setIndex": 1},
          {"value": 6, "weight": 42, "setIndex": 2}
        ],
        "type": "weight",
        "circuitId": "1769573965482",
        "exerciseId": "b3",
        "circuitName": "Back and Shoulders 1",
        "exerciseName": "Lat Pulldown"
      },
      {
        "sets": [
          {"value": 12, "weight": 12, "setIndex": 0},
          {"value": 12, "weight": 12, "setIndex": 1},
          {"value": 12, "weight": 12, "setIndex": 2}
        ],
        "type": "weight",
        "circuitId": "1769573965482",
        "exerciseId": "s1",
        "circuitName": "Back and Shoulders 1",
        "exerciseName": "Lateral Raises"
      }
    ],
    "circuitNames": ["Biceps 1", "Triceps 1", "Back and Shoulders 1"]
  }
]'::jsonb
WHERE sub = 'YOUR_USER_SUB';  -- Replace with your actual user sub
