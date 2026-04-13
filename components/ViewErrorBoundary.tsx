import React from 'react';
import { debugSessionLog } from '../utils/debugSessionLog';

type Props = {
  children: React.ReactNode;
  onReset: () => void;
};

type State = { hasError: boolean; message: string };

/**
 * Catches render errors in full-screen views so a blank screen becomes a recoverable message
 * (especially useful on mobile where the console is not visible).
 */
export class ViewErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: unknown): State {
    const message = err instanceof Error ? err.message : String(err);
    return { hasError: true, message };
  }

  componentDidCatch(err: unknown, info: React.ErrorInfo): void {
    // #region agent log
    debugSessionLog('H5', 'ViewErrorBoundary:componentDidCatch', err instanceof Error ? err.message : String(err), {
      stack: err instanceof Error ? String(err.stack).slice(0, 900) : '',
      componentStack: (info.componentStack || '').slice(0, 600),
    });
    // #endregion
    console.error('[ViewErrorBoundary]', err, info.componentStack);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-0 flex-1 p-6 text-center bg-zinc-50">
          <p className="text-zinc-800 font-semibold text-sm">This screen could not be shown.</p>
          <p className="text-[11px] text-zinc-500 mt-2 max-w-sm break-words">
            {this.state.message || 'Unknown error'}
          </p>
          <button
            type="button"
            onClick={() => {
              this.props.onReset();
            }}
            className="mt-6 px-6 py-3 bg-zinc-900 text-white rounded-xl text-sm font-semibold"
          >
            Go to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
