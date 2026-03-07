import { useQuery } from '@tanstack/react-query';
import { fetchMealTypes } from '../services/api/mealTypesApi';
import { getDefaultMealTypeId } from '../constants/meals';
import { mealTypesQueryKey } from './queryKeys';

export function useMealTypes(options?: { enabled?: boolean }) {
  const { enabled = true } = options ?? {};

  const query = useQuery({
    queryKey: mealTypesQueryKey,
    queryFn: fetchMealTypes,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
    select: (data) => {
      const mealTypes = data
        .filter((mt) => mt.is_visible)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      return {
        mealTypes,
        defaultMealTypeId: getDefaultMealTypeId(mealTypes),
      };
    },
  });

  return {
    mealTypes: query.data?.mealTypes ?? [],
    defaultMealTypeId: query.data?.defaultMealTypeId ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
