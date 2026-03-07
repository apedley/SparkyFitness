import { apiFetch } from './apiClient';
import { MealTypeResponse } from '@workspace/shared';

/**
 * Fetches all meal types for the current user.
 */
export const fetchMealTypes = async (): Promise<MealTypeResponse[]> => {
  return apiFetch<MealTypeResponse[]>({
    endpoint: '/api/meal-types',
    serviceName: 'Meal Types API',
    operation: 'fetch meal types',
  });
};
