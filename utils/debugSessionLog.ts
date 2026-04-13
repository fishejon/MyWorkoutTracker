/** Debug session fc332b — rows in session + local storage + optional local ingest. */
const STORAGE_KEY = 'mwt_dbg_fc332b';
const MAX_ENTRIES = 40;

function parseStoredArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const p: unknown = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function appendRowToStorage(store: Storage, row: Record<string, unknown>): void {
  const arr = parseStoredArray(store.getItem(STORAGE_KEY));
  arr.push(row);
  while (arr.length > MAX_ENTRIES) arr.shift();
  store.setItem(STORAGE_KEY, JSON.stringify(arr));
}

export function debugSessionLog(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown> = {}
): void {
  const row = { hypothesisId, location, message, data, timestamp: Date.now() };
  if (typeof window !== 'undefined') {
    try {
      appendRowToStorage(sessionStorage, row);
    } catch {
      /* quota / private mode */
    }
    try {
      appendRowToStorage(localStorage, row);
    } catch {
      /* quota / private mode */
    }
  }
  // #region agent log
  fetch('http://127.0.0.1:7595/ingest/844c93ac-be5f-4632-98da-f58eb60611c6', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'fc332b' },
    body: JSON.stringify({
      sessionId: 'fc332b',
      location,
      message,
      data: { ...data, hypothesisId },
      timestamp: Date.now(),
      hypothesisId,
    }),
  }).catch(() => {});
  // #endregion
}

type DebugRow = { timestamp?: number; location?: string; message?: string };

export function readDebugSessionLog(): string {
  if (typeof window === 'undefined') return '';
  let ss = '';
  let ls = '';
  try {
    ss = sessionStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    /* */
  }
  try {
    ls = localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    /* */
  }
  const merged = [...parseStoredArray(ss), ...parseStoredArray(ls)] as DebugRow[];
  const seen = new Set<string>();
  const out: DebugRow[] = [];
  merged.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  for (const r of merged) {
    const k = `${r.timestamp ?? 0}\0${r.location ?? ''}\0${r.message ?? ''}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out.length ? JSON.stringify(out) : '';
}
