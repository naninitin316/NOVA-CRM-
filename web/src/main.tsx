import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from './store';
import App from './App';
import './styles/global.css';

// Apply theme before first paint to avoid flash
const saved = localStorage.getItem('crm-theme');
const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
document.documentElement.setAttribute(
  'data-theme',
  saved === 'light' || saved === 'dark' ? saved : prefersLight ? 'light' : 'dark'
);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Provider>
  </StrictMode>
);
