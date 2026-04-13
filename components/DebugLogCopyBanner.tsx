import React from 'react';
import { readDebugSessionLog } from '../utils/debugSessionLog';

/** Shows when session fc332b has captured rows — paste JSON for remote debugging. */
export const DebugLogCopyBanner: React.FC = () => {
  const raw = readDebugSessionLog();
  if (!raw) return null;
  return (
    <div className="px-4 py-2 border-t border-amber-100 bg-amber-50/80 mt-2">
      <button
        type="button"
        className="text-[11px] text-amber-900 font-semibold underline py-1"
        onClick={() => {
          void navigator.clipboard?.writeText(raw);
        }}
      >
        Copy workout debug log (fc332b)
      </button>
      <p className="text-[9px] text-amber-800/80 pb-1 leading-snug">
        After a blank workout screen, open Home/History/Stats and copy — paste the JSON in chat.
      </p>
    </div>
  );
};
