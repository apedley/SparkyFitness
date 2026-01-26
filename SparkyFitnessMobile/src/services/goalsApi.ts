import { getActiveServerConfig } from './storage';
import { addLog } from './LogService';
import type { DailyGoals } from '../types/goals';

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
      addLog(`[Goals API] Failed to fetch goals: ${response.status}`, 'ERROR', [errorText]);
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addLog(`[Goals API] Failed to fetch goals: ${message}`, 'ERROR');
    throw error;
  }
};
