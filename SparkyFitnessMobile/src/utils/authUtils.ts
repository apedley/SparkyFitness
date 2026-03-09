import type { ServerConfig } from '../services/storage';

export function getAuthStatusText(config: ServerConfig): string {
  if (config.authType === 'session' && config.sessionToken) {
    return config.email ? `Signed in as ${config.email}` : 'Signed in';
  }
  if (config.authType === 'apiKey' && config.apiKey) {
    return 'API key configured';
  }
  return 'Not configured';
}
