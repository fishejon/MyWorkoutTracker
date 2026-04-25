import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  History as HistoryIcon,
  Home,
  Layers,
  Pencil,
  Play,
  Plus,
  Trash2,
  Download,
} from 'lucide-react';
import Dashboard, { DashboardTourSection } from './Dashboard';
import { LANDING_DEMO_CIRCUITS, LANDING_DEMO_HISTORY, LANDING_DEMO_PROGRAM } from '../data/landingDemo';

export type LandingTourId = DashboardTourSection | 'program-detail';

const TOUR_ORDER: LandingTourId[] = ['today', 'calendar', 'stats', 'programs', 'program-detail'];

const TOUR_COPY: Record<LandingTourId, { title: string; body: string }> = {
  today: {
    title: 'Your day at a glance',
    body: 'Date, streak, last session. One tap to start again.',
  },
  calendar: {
    title: 'Workout calendar',
    body: 'Your month at a glance. Gaps don’t lie.',
  },
  stats: {
    title: 'Quick totals',
    body: 'Total sessions and this month’s count.',
  },
  programs: {
    title: 'Programs from CSV',
    body: 'Import a CSV. Work day by day. Mark it done.',
  },
  'program-detail': {
    title: 'Inside a program',
    body: 'Start a day, mark it done, edit circuits - all in one place.',
  },
};

function pickTourFromScroll(): LandingTourId {
  const centerY = window.innerHeight * 0.4;
  let best: LandingTourId | null = null;
  let bestScore = Infinity;

  for (const id of TOUR_ORDER) {
    const el = document.getElementById(`landing-tour-${id}`);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    const anyVisible = r.bottom > 0 && r.top < window.innerHeight;
    if (!anyVisible) continue;

    const mid = (r.top + r.bottom) / 2;
    const score = Math.abs(mid - centerY);
    if (score < bestScore) {
      bestScore = score;
      best = id;
    }
  }

  return best ?? 'today';
}

type AuthStatus = 'checking' | 'unauth' | 'authed';

type LandingPageProps = {
  authStatus: AuthStatus;
  authError: string | null;
  onGoogleCredentialMissing?: () => void;
  onGoogleSuccess: (credential: string) => void;
  onGoogleError: () => void;
};

const noop = () => {};

/** Small brand mark: three set columns + a bar — reads as “logged sets”, not generic sparkle UI. */
function LandingMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3 15V9M8 15V4M13 15V11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M2 16.5h16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}

const LandingPage: React.FC<LandingPageProps> = ({
  authStatus,
  authError,
  onGoogleCredentialMissing,
  onGoogleSuccess,
  onGoogleError,
}) => {
  const [activeTour, setActiveTour] = useState<LandingTourId>('today');
  /** Scrolls the full landing page (document/body does not scroll — see index.html). */
  const landingScrollRef = useRef<HTMLDivElement | null>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);

  const recomputeTour = useCallback(() => {
    const next = pickTourFromScroll();
    setActiveTour((prev) => (prev === next ? prev : next));
  }, []);

  useLayoutEffect(() => {
    recomputeTour();
  }, [recomputeTour]);

  useEffect(() => {
    recomputeTour();
    window.addEventListener('scroll', recomputeTour, { passive: true });
    window.addEventListener('resize', recomputeTour);
    const previewEl = previewScrollRef.current;
    const landingEl = landingScrollRef.current;
    previewEl?.addEventListener('scroll', recomputeTour, { passive: true });
    landingEl?.addEventListener('scroll', recomputeTour, { passive: true });
    return () => {
      window.removeEventListener('scroll', recomputeTour);
      window.removeEventListener('resize', recomputeTour);
      previewEl?.removeEventListener('scroll', recomputeTour);
      landingEl?.removeEventListener('scroll', recomputeTour);
    };
  }, [recomputeTour]);

  const tourNarrative = useMemo(() => TOUR_COPY[activeTour] ?? TOUR_COPY.today, [activeTour]);

  const highlightDashboard: DashboardTourSection | null =
    activeTour !== 'program-detail' ? activeTour : null;

  return (
    <div
      ref={landingScrollRef}
      className="h-full min-h-0 overflow-y-auto overflow-x-hidden bg-zinc-50 text-zinc-900"
    >
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-10 md:py-14 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-900 text-xs font-semibold px-3 py-1 border border-blue-100">
              <LandingMark className="w-4 h-4 shrink-0 text-blue-600" />
              No subscription. No noise.
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight italic">
              Log your workouts. See the work add up.
            </h1>
            <p className="text-zinc-600 text-base leading-relaxed">
              Track sessions, programs, and consistency in one clean place.
            </p>
          </div>
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500 mb-1">Ready when you are</p>
            <p className="text-sm text-slate-800 font-medium mb-4">Sign in to sync your workouts.</p>
            {authError && (
              <div className="text-left text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 mb-4 whitespace-pre-wrap">
                {authError}
              </div>
            )}
            <div className="flex justify-center rounded-xl border border-slate-100 bg-slate-50/80 py-3 px-2">
              {authStatus === 'checking' ? (
                <div className="text-xs text-slate-500 font-semibold py-2">Verifying your session…</div>
              ) : (
                <GoogleLogin
                  onSuccess={(credentialResponse) => {
                    const token = credentialResponse.credential;
                    if (!token) {
                      onGoogleCredentialMissing?.();
                      return;
                    }
                    onGoogleSuccess(token);
                  }}
                  onError={onGoogleError}
                  useOneTap
                />
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 md:py-14 space-y-10">
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-zinc-900">See your training home in action</h2>
          <p className="text-sm text-zinc-600 max-w-2xl">
            A live preview with sample data shows the same sections you will use once you sign in.
          </p>
        </section>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-8 items-start">
          <div className="space-y-4">
            <div className="lg:hidden sticky top-2 z-20 rounded-2xl border border-zinc-200 bg-white/95 backdrop-blur p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-600 mb-1">
                {tourNarrative.title}
              </p>
              <p className="text-sm text-zinc-700 leading-snug">{tourNarrative.body}</p>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-zinc-100/80 shadow-inner overflow-hidden">
              <div className="bg-zinc-900 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 bg-white/10 rounded-lg flex-shrink-0">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold tracking-tight truncate">MyWorkoutTracker</p>
                    <p className="text-[10px] text-white/50 truncate">Preview — sample data</p>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-white/40 uppercase tracking-wide">Home</span>
              </div>

              <div
                ref={previewScrollRef}
                className="max-h-[min(78vh,820px)] overflow-y-auto bg-zinc-50 border-x border-zinc-200/80 scroll-smooth"
              >
                <div className="pointer-events-none select-none">
                  <Dashboard
                    circuits={LANDING_DEMO_CIRCUITS}
                    history={LANDING_DEMO_HISTORY}
                    programs={[LANDING_DEMO_PROGRAM]}
                    onStart={noop}
                    onDeleteProgram={noop}
                    onEdit={noop}
                    onNew={noop}
                    onImportCSV={noop}
                    onOpenProgram={noop}
                    tourIds
                    highlightTour={highlightDashboard}
                  />
                </div>
              </div>

              <nav className="glass-nav border-t border-zinc-200/60 px-1 pt-2 pb-3 grid grid-cols-5 items-end pointer-events-none select-none">
                <div className="flex flex-col items-center justify-end gap-1 pb-1 text-blue-600 min-h-[48px]">
                  <Home className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Home</span>
                </div>
                <div className="flex flex-col items-center justify-end gap-1 pb-1 text-zinc-400 min-h-[48px]">
                  <Layers className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Circuits</span>
                </div>
                <div className="flex flex-col items-center justify-end pb-0.5 min-h-[48px]">
                  <div className="flex flex-col items-center gap-0.5 -translate-y-2">
                    <div className="p-3 bg-zinc-900 text-white rounded-2xl shadow-lg ring-6 ring-zinc-50">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-medium text-zinc-400">New</span>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-end gap-1 pb-1 text-zinc-400 min-h-[48px]">
                  <HistoryIcon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">History</span>
                </div>
                <div className="flex flex-col items-center justify-end gap-1 pb-1 text-zinc-400 min-h-[48px]">
                  <BarChart3 className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Stats</span>
                </div>
              </nav>
            </div>
          </div>

          <aside className="hidden lg:block sticky top-24 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-600">What you are looking at</p>
            <h3 className="text-base font-bold text-zinc-900 leading-snug">{tourNarrative.title}</h3>
            <p className="text-sm text-zinc-600 leading-relaxed">{tourNarrative.body}</p>
            <div className="pt-2 border-t border-zinc-100 space-y-2">
              {TOUR_ORDER.map((id) => (
                <div
                  key={id}
                  className={`flex items-center gap-2 text-xs font-medium rounded-lg px-2 py-1.5 ${
                    activeTour === id ? 'bg-sky-50 text-sky-800' : 'text-zinc-400'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      activeTour === id ? 'bg-sky-500' : 'bg-zinc-300'
                    }`}
                  />
                  {TOUR_COPY[id].title}
                </div>
              ))}
            </div>
          </aside>
        </div>

        <section
          id="landing-tour-program-detail"
          className={`rounded-3xl border border-zinc-200 bg-white p-6 md:p-8 space-y-6 transition-[box-shadow,ring] duration-500 ${
            activeTour === 'program-detail'
              ? 'ring-2 ring-sky-500 ring-offset-2 ring-offset-zinc-50 shadow-xl'
              : ''
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500">
                <Layers className="w-4 h-4" />
                One level deeper — programs
              </div>
              <h2 className="text-xl font-bold text-zinc-900">After you import a program</h2>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Opening a program takes you to a dedicated workspace (this is a simplified peek). From there you can
                manage weeks and days the way the live app does: start a day as a workout, toggle completion, edit circuits,
                and delete a program when you are done with the block.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <BookOpen className="w-4 h-4 text-zinc-400" />
              <span className="font-medium text-zinc-700">{LANDING_DEMO_PROGRAM.name}</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-700">Week navigator</p>
                <CalendarDays className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((w) => (
                  <div
                    key={w}
                    className={`flex-1 text-center rounded-xl py-2 text-xs font-semibold border ${
                      w === 1 ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-500 border-zinc-200'
                    }`}
                  >
                    W{w}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-zinc-500 leading-snug">
                Jump between weeks, see which days are complete, and focus on the block you are in.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 space-y-3">
              <p className="text-xs font-semibold text-zinc-700">Day actions</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl bg-white border border-zinc-200 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-800">
                    <Play className="w-3.5 h-3.5 text-sky-500" />
                    Start day
                  </div>
                  <span className="text-[10px] text-zinc-400">Launches the live workout runner</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white border border-zinc-200 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Mark complete
                  </div>
                  <span className="text-[10px] text-zinc-400">Tracks finished program days</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white border border-zinc-200 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-800">
                    <Pencil className="w-3.5 h-3.5 text-zinc-500" />
                    Edit circuits
                  </div>
                  <span className="text-[10px] text-zinc-400">Adjust exercises per day</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white border border-zinc-200 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-800">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    Remove program
                  </div>
                  <span className="text-[10px] text-zinc-400">Deletes from your library</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-dashed border-blue-200 bg-blue-50/40 p-6 md:p-8 flex flex-col gap-6">
          <div className="space-y-3 max-w-2xl">
            <h2 className="text-lg font-bold text-zinc-900">Ready to track for real?</h2>
            <p className="text-sm text-zinc-600 max-w-xl">
              Download the CSV template to build your next program block, then sign in above to import it and sync your data.
            </p>
            <div className="rounded-2xl border border-blue-100 bg-white/90 p-4 max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-800 mb-2">Program builder preview</p>
              <div className="space-y-2 text-xs text-zinc-600">
                <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2">
                  <span className="font-medium text-zinc-800">Week 1 · Day 1</span>
                  <span className="text-zinc-400">Upper Body A</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2">
                  <span className="font-medium text-zinc-800">Week 1 · Day 2</span>
                  <span className="text-zinc-400">Lower Body A</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2">
                  <span className="font-medium text-zinc-800">Week 2 · Day 1</span>
                  <span className="text-zinc-400">Upper Body B</span>
                </div>
              </div>
            </div>
            <a
              href="/program-template.csv"
              download
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:text-blue-800 hover:border-blue-300 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download the program CSV template
            </a>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
