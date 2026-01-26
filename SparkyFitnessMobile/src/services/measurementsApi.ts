import { getActiveServerConfig } from './storage';
import { addLog } from './LogService';
import type { CheckInMeasurement } from '../types/measurements';

/**
 * Fetches measurements for a given date.
 */
export const fetchMeasurements = async (date: string): Promise<CheckInMeasurement> => {
  const config = await getActiveServerConfig();
  if (!config) {
    throw new Error('Server configuration not found.');
  }

  let { url, apiKey } = config;
  url = url.endsWith('/') ? url.slice(0, -1) : url;

  try {
    const response = await fetch(`${url}/api/measurements/check-in/${date}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      addLog(`[Measurements API] Failed to fetch measurements: ${response.status}`, 'ERROR', [errorText]);
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addLog(`[Measurements API] Failed to fetch measurements: ${message}`, 'ERROR');
    throw error;
  }
};
