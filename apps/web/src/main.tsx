import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { SocketProvider } from '@/providers/SocketProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { App } from '@/App';
import './styles.css';
import { mark } from '@/lib/perf';
import { initThemeV2 } from '@/theme/initTheme';
import { useCallStore } from '@/stores/call.store';

mark('app_start');
initThemeV2();

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__gratoniteHarness = {
    setCallState: (partial) => useCallStore.getState().setState(partial as any),
    resetCallState: () => useCallStore.getState().reset(),
    getCallState: () => useCallStore.getState() as any,
  };
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SocketProvider>
            <App />
          </SocketProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
