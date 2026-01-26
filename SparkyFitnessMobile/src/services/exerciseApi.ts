import { getActiveServerConfig } from './storage';
import { addLog } from './LogService';
import type { ExerciseEntry } from '../types/exercise';

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
      addLog(`[Exercise API] Failed to fetch exercise entries: ${response.status}`, 'ERROR', [errorText]);
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addLog(`[Exercise API] Failed to fetch exercise entries: ${message}`, 'ERROR');
    throw error;
  }
};

/**
 * Calculates total calories burned from exercise entries.
 */
export const calculateCaloriesBurned = (entries: ExerciseEntry[]): number => {
  return entries.reduce((total, entry) => total + (entry.calories_burned || 0), 0);
};
