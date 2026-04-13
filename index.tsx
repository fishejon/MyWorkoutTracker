import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import { debugSessionLog } from './utils/debugSessionLog';

// #region agent log
window.addEventListener('error', ev => {
  const e = ev as ErrorEvent;
  debugSessionLog('H1', 'index.tsx:window.error', e.message || 'window.error', {
    filename: e.filename,
    lineno: e.lineno,
    colno: e.colno,
    errName: e.error instanceof Error ? e.error.name : typeof e.error,
    stack: e.error instanceof Error ? String(e.error.stack).slice(0, 900) : '',
  });
});
window.addEventListener('unhandledrejection', ev => {
  const r = ev.reason;
  debugSessionLog('H1', 'index.tsx:unhandledrejection', r instanceof Error ? r.message : String(r), {
    stack: r instanceof Error ? String(r.stack).slice(0, 900) : '',
  });
});
// #endregion

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

root.render(
  clientId ? (
    <GoogleOAuthProvider clientId={clientId}>
      {app}
    </GoogleOAuthProvider>
  ) : (
    app
  )
);
