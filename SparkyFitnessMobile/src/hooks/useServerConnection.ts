import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { checkServerConnection } from '../services/api';

export const serverConnectionQueryKey = ['serverConnection'] as const;

export function useServerConnection(options?: { enablePolling?: boolean }) {
  const { enablePolling = false } = options ?? {};

  const query = useQuery({
    queryKey: serverConnectionQueryKey,
    queryFn: checkServerConnection,
    refetchInterval: enablePolling ? 60 * 1000 : false,
    refetchIntervalInBackground: false,
  });

  // Refetch on screen focus
  useFocusEffect(
    useCallback(() => {
      query.refetch();
    }, [query])
  );

  return {
    isConnected: query.data ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
