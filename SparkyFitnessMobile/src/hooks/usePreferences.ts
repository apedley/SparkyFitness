import { useQuery } from '@tanstack/react-query';
import { fetchPreferences } from '../services/preferencesApi';

export const preferencesQueryKey = ['userPreferences'] as const;

export function usePreferences() {
  const query = useQuery({
    queryKey: preferencesQueryKey,
    queryFn: fetchPreferences,
    staleTime: 1000 * 60 * 30, // 30 minutes - preferences rarely change
  });

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}