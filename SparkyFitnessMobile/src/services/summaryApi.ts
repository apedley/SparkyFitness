import { getActiveServerConfig } from './storage';
import { addLog } from './LogService';
import type { DailyGoals, FoodEntry, ExerciseEntry } from '../types/summary';

/**
 * Fetches daily goals for a given date.
 */
export const fetchDailyGoals = async (date: string): Promise<DailyGoals> => {
  const config = await getActiveServerConfig();
  if (!config) {
    throw new Error('Server configuration not found.');
  }

  let { url, apiKey } = config;
  url = url.endsWith('/') ? url.slice(0, -1) : url;

  try {
    const response = await fetch(`${url}/api/goals/for-date?date=${date}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      addLog(`[Summary API] Failed to fetch goals: ${response.status}`, 'ERROR', [errorText]);
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addLog(`[Summary API] Failed to fetch goals: ${message}`, 'ERROR');
    throw error;
  }
};

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
      addLog(`[Summary API] Failed to fetch food entries: ${response.status}`, 'ERROR', [errorText]);
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addLog(`[Summary API] Failed to fetch food entries: ${message}`, 'ERROR');
    throw error;
  }
};

/**
 * Fetches exercise entries for a given date.
 */
export const fetchExerciseEntries = async (date: string): Promise<ExerciseEntry[]> => {
  const config = await getActiveServerConfig();
  if (!config) {
    throw new Error('Server configuration not found.');
  }

  let { url, apiKey } = config;
  url = url.endsWith('/') ? url.slice(0, -1) : url;

  try {
    const response = await fetch(`${url}/api/exercise-entries/by-date?selectedDate=${date}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      addLog(`[Summary API] Failed to fetch exercise entries: ${response.status}`, 'ERROR', [errorText]);
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addLog(`[Summary API] Failed to fetch exercise entries: ${message}`, 'ERROR');
    throw error;
  }
};

/**
 * Calculates total calories consumed from food entries.
 * Formula: sum((entry.calories * entry.quantity) / entry.serving_size)
 */
export const calculateCaloriesConsumed = (entries: FoodEntry[]): number => {
  return entries.reduce((total, entry) => {
    // Avoid division by zero
    if (entry.serving_size === 0) {
      return total;
    }
    return total + (entry.calories * entry.quantity) / entry.serving_size;
  }, 0);
};

/**
 * Calculates total calories burned from exercise entries.
 */
export const calculateCaloriesBurned = (entries: ExerciseEntry[]): number => {
  return entries.reduce((total, entry) => total + (entry.calories_burned || 0), 0);
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
