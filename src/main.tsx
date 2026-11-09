import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Safely clear the HTML preloader safety timer once JS evaluates
try {
  if (typeof window !== 'undefined' && (window as any).__clearAirtelPreloaderTimer) {
    (window as any).__clearAirtelPreloaderTimer();
  }
} catch {}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
