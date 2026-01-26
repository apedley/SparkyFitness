import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { fetchMeasurements } from '../services/measurementsApi';

export const measurementsQueryKey = (date: string) => ['measurements', date] as const;

interface UseMeasurementsOptions {
  date: string;
  enabled?: boolean;
}

export function useMeasurements({ date, enabled = true }: UseMeasurementsOptions) {
  const query = useQuery({
    queryKey: measurementsQueryKey(date),
    queryFn: () => fetchMeasurements(date),
    enabled,
  });

  useFocusEffect(
    useCallback(() => {
      if (enabled) {
        query.refetch();
      }
    }, [query, enabled])
  );

  return {
    measurements: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
