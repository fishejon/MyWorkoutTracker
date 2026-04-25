import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';

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
