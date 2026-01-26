import { UserPreferences } from "../types/preferences";
import { addLog } from "./LogService";
import { getActiveServerConfig } from "./storage";

/**
 * Fetches user preferences.
 */
export const fetchPreferences = async () : Promise<UserPreferences> => {
  const config = await getActiveServerConfig();
  if (!config) {
    throw new Error('Server configuration not found.');
  }

  let { url, apiKey } = config;
  url = url.endsWith('/') ? url.slice(0, -1) : url;

  try {
    const response = await fetch(`${url}/api/user-preferences`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      addLog(`[Preferences API] Failed to fetch preferences: ${response.status}`, 'ERROR', [errorText]);
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addLog(`[Preferences API] Failed to fetch preferences: ${message}`, 'ERROR');
    throw error;
  }
}