/**
 * Resolves the Ollama connection for the tests/*.script.ts harnesses.
 *
 * Precedence:
 *   - OLLAMA_URL set in the environment → env-only (OLLAMA_API_KEY /
 *     OLLAMA_MODEL as given; the DB is never consulted, so a key stored for
 *     the app's service can't leak to a different host).
 *   - Otherwise → the active `service_type='ollama'` row in
 *     ai_service_settings (the service configured in the app UI), decrypting
 *     its stored API key in-process; OLLAMA_MODEL / OLLAMA_API_KEY still
 *     override individual fields.
 *   - No usable DB row → local `ollama serve` defaults.
 */
import { endPool, getSystemClient } from '../db/poolManager.js';
import { decrypt, ENCRYPTION_KEY } from '../security/encryption.js';

export interface OllamaScriptConfig {
  url: string;
  apiKey: string | undefined;
  model: string;
  source: 'env' | 'app service' | 'local default';
}

const DEFAULT_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'qwen3:4b';

interface OllamaServiceRow {
  custom_url: string | null;
  model_name: string | null;
  encrypted_api_key: string | null;
  api_key_iv: string | null;
  api_key_tag: string | null;
}

async function loadAppServiceRow(): Promise<OllamaServiceRow | undefined> {
  const client = await getSystemClient();
  try {
    const result = await client.query(
      `SELECT custom_url, model_name, encrypted_api_key, api_key_iv, api_key_tag
       FROM ai_service_settings
       WHERE service_type = 'ollama' AND is_active = TRUE
       ORDER BY updated_at DESC NULLS LAST
       LIMIT 1`
    );
    return result.rows[0] as OllamaServiceRow | undefined;
  } finally {
    client.release();
    await endPool();
  }
}

export async function resolveOllamaConfig(): Promise<OllamaScriptConfig> {
  if (process.env.OLLAMA_URL) {
    return {
      url: process.env.OLLAMA_URL,
      apiKey: process.env.OLLAMA_API_KEY,
      model: process.env.OLLAMA_MODEL ?? DEFAULT_MODEL,
      source: 'env',
    };
  }

  let row: OllamaServiceRow | undefined;
  try {
    row = await loadAppServiceRow();
  } catch (err) {
    console.warn(
      `(ollama config: could not read app service from DB — ${err instanceof Error ? err.message : String(err)})`
    );
  }
  if (!row?.custom_url) {
    return {
      url: DEFAULT_URL,
      apiKey: process.env.OLLAMA_API_KEY,
      model: process.env.OLLAMA_MODEL ?? DEFAULT_MODEL,
      source: 'local default',
    };
  }

  let apiKey = process.env.OLLAMA_API_KEY;
  if (!apiKey && row.encrypted_api_key && row.api_key_iv && row.api_key_tag) {
    try {
      apiKey =
        (await decrypt(
          row.encrypted_api_key,
          row.api_key_iv,
          row.api_key_tag,
          ENCRYPTION_KEY
        )) ?? undefined;
    } catch (err) {
      console.warn(
        `(ollama config: stored API key could not be decrypted — ${err instanceof Error ? err.message : String(err)})`
      );
    }
  }

  return {
    url: row.custom_url,
    apiKey,
    model: process.env.OLLAMA_MODEL ?? row.model_name ?? DEFAULT_MODEL,
    source: 'app service',
  };
}
