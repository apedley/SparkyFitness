import { QueryClient } from '@tanstack/react-query';
import { serverConnectionQueryKey } from './queryKeys';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // Only refetch when explicitly triggered or polled
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 0,
    },
  },
});

export const invalidateServerConnection = () =>
  queryClient.invalidateQueries({ queryKey: serverConnectionQueryKey });
