import { apiFetch } from './apiClient';
import type {
  FoodEntryResponse,
  CreateFoodEntryRequest,
  UpdateFoodEntryRequest,
} from '@workspace/shared';

export type CreateFoodEntryPayload = CreateFoodEntryRequest;
export type UpdateFoodEntryPayload = UpdateFoodEntryRequest;

/**
 * Creates a food entry.
 */
export const createFoodEntry = async (payload: CreateFoodEntryRequest): Promise<FoodEntryResponse> => {
  return apiFetch<FoodEntryResponse>({
    endpoint: '/api/food-entries/',
    serviceName: 'Food Entries API',
    operation: 'create food entry',
    method: 'POST',
    body: payload,
  });
};

/**
 * Updates a food entry by ID.
 */
export const updateFoodEntry = async (id: string, payload: UpdateFoodEntryRequest): Promise<FoodEntryResponse> => {
  return apiFetch<FoodEntryResponse>({
    endpoint: `/api/food-entries/${id}`,
    serviceName: 'Food Entries API',
    operation: 'update food entry',
    method: 'PUT',
    body: payload,
  });
};

/**
 * Deletes a food entry by ID.
 */
export const deleteFoodEntry = async (id: string): Promise<void> => {
  await apiFetch<void>({
    endpoint: `/api/food-entries/${id}`,
    serviceName: 'Food Entries API',
    operation: 'delete food entry',
    method: 'DELETE',
  });
};

/**
 * Fetches food entries for a given date.
 */
export const fetchFoodEntries = async (date: string): Promise<FoodEntryResponse[]> => {
  return apiFetch<FoodEntryResponse[]>({
    endpoint: `/api/food-entries/by-date/${date}`,
    serviceName: 'Food Entries API',
    operation: 'fetch food entries',
  });
};

/**
 * Calculates total calories consumed from food entries.
 * Formula: sum((entry.calories * quantity) / serving_size)
 */
export const calculateCaloriesConsumed = (entries: FoodEntryResponse[]): number => {
  return entries.reduce((total, entry) => {
    if (!entry.serving_size || !entry.calories) {
      return total;
    }
    return total + (entry.calories * entry.quantity) / entry.serving_size;
  }, 0);
};

/**
 * Calculates a macro nutrient total from food entries.
 * Uses same formula as calories: (value * quantity) / serving_size
 */
const calculateMacro = (entries: FoodEntryResponse[], field: keyof FoodEntryResponse): number => {
  return entries.reduce((total, entry) => {
    if (!entry.serving_size) {
      return total;
    }
    const value = entry[field];
    if (typeof value !== 'number') {
      return total;
    }
    return total + (value * entry.quantity) / entry.serving_size;
  }, 0);
};

export const calculateProtein = (entries: FoodEntryResponse[]): number => calculateMacro(entries, 'protein');
export const calculateCarbs = (entries: FoodEntryResponse[]): number => calculateMacro(entries, 'carbs');
export const calculateFat = (entries: FoodEntryResponse[]): number => calculateMacro(entries, 'fat');
export const calculateFiber = (entries: FoodEntryResponse[]): number => calculateMacro(entries, 'dietary_fiber');
