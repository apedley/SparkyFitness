import { getActiveServerConfig } from './storage';
import { addLog } from './LogService';
import type { FoodEntry } from '../types/foodEntries';

/**
 * Fetches food entries for a given date.
 */
export const fetchFoodEntries = async (date: string): Promise<FoodEntry[]> => {
  const config = await getActiveServerConfig();
  if (!config) {
    throw new Error('Server configuration not found.');
  }

  let { url, apiKey } = config;
  url = url.endsWith('/') ? url.slice(0, -1) : url;

  try {
    const response = await fetch(`${url}/api/food-entries/by-date/${date}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      addLog(`[Food Entries API] Failed to fetch food entries: ${response.status}`, 'ERROR', [errorText]);
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addLog(`[Food Entries API] Failed to fetch food entries: ${message}`, 'ERROR');
    throw error;
  }
};

/**
 * Calculates total calories consumed from food entries.
 * Formula: sum((entry.calories * quantity) / serving_size)
 */
export const calculateCaloriesConsumed = (entries: FoodEntry[]): number => {
  return entries.reduce((total, entry) => {
    if (entry.serving_size === 0) {
      return total;
    }
    return total + (entry.calories * entry.quantity) / entry.serving_size;
  }, 0);
};

/**
 * Calculates a macro nutrient total from food entries.
 * Uses same formula as calories: (value * quantity) / serving_size
 */
const calculateMacro = (entries: FoodEntry[], field: keyof FoodEntry): number => {
  return entries.reduce((total, entry) => {
    if (entry.serving_size === 0) {
      return total;
    }
    const value = entry[field];
    if (typeof value !== 'number') {
      return total;
    }
    return total + (value * entry.quantity) / entry.serving_size;
  }, 0);
};

export const calculateProtein = (entries: FoodEntry[]): number => calculateMacro(entries, 'protein');
export const calculateCarbs = (entries: FoodEntry[]): number => calculateMacro(entries, 'carbs');
export const calculateFat = (entries: FoodEntry[]): number => calculateMacro(entries, 'fat');
export const calculateFiber = (entries: FoodEntry[]): number => calculateMacro(entries, 'dietary_fiber');
