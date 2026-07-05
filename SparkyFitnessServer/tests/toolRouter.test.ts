import { vi, describe, expect, it, beforeEach } from 'vitest';
import { selectToolDomains } from '../ai/toolRouter.js';
import { dispatchAiRequest } from '../ai/providerDispatch.js';
import type { ProviderConfig } from '../ai/providerDispatch.js';

// Loading the real foodEntryService (via tools/index → foodTools) trips on a
// deep '@workspace/shared' subpath import; the router only reads the registry's
// descriptions, never executes a handler.
vi.mock('../services/foodEntryService', () => ({ default: {} }));
vi.mock('../config/logging', () => ({ log: vi.fn() }));
vi.mock('../ai/providerDispatch', () => ({ dispatchAiRequest: vi.fn() }));

const provider: ProviderConfig = {
  service_type: 'ollama',
  custom_url: 'http://localhost:11434',
  model_name: 'qwen3:4b',
};

const okWith = (json: unknown) => ({
  ok: true as const,
  text: JSON.stringify(json),
  json,
});

describe('selectToolDomains', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the parsed domains and drops unknown keys', async () => {
    vi.mocked(dispatchAiRequest).mockResolvedValue(
      okWith({ domains: ['food', 'exercise', 'not_a_domain'] })
    );

    const result = await selectToolDomains(provider, 'log 2 eggs and a run');

    expect(result).toEqual(['food', 'exercise']);
  });

  it('dedupes repeated domains, preserving first-seen order', async () => {
    vi.mocked(dispatchAiRequest).mockResolvedValue(
      okWith({ domains: ['food', 'food', 'goals'] })
    );

    const result = await selectToolDomains(provider, 'anything');

    expect(result).toEqual(['food', 'goals']);
  });

  it('honors an explicit empty selection (small-talk => no tools)', async () => {
    vi.mocked(dispatchAiRequest).mockResolvedValue(okWith({ domains: [] }));

    const result = await selectToolDomains(provider, 'thanks!');

    expect(result).toEqual([]);
  });

  it('fails safe to null on a dispatch/parse failure', async () => {
    vi.mocked(dispatchAiRequest).mockResolvedValue({
      ok: false,
      category: 'parse_error',
      detail: 'AI service returned invalid JSON.',
    });

    const result = await selectToolDomains(provider, 'log 2 eggs');

    expect(result).toBeNull();
  });

  it('fails safe to null when domains is missing', async () => {
    vi.mocked(dispatchAiRequest).mockResolvedValue(okWith({ nope: true }));

    const result = await selectToolDomains(provider, 'log 2 eggs');

    expect(result).toBeNull();
  });

  it('fails safe to null when domains is not an array', async () => {
    vi.mocked(dispatchAiRequest).mockResolvedValue(okWith({ domains: 'food' }));

    const result = await selectToolDomains(provider, 'log 2 eggs');

    expect(result).toBeNull();
  });

  it('fails safe to null when a non-empty array yields only unknown keys', async () => {
    // A tiny model hallucinating labels is garbage, not a deliberate "no tools".
    vi.mocked(dispatchAiRequest).mockResolvedValue(
      okWith({ domains: ['nutrition', 'workout'] })
    );

    const result = await selectToolDomains(provider, 'log 2 eggs');

    expect(result).toBeNull();
  });

  it('requests a structured selection at temperature 0 with a bounded timeout', async () => {
    vi.mocked(dispatchAiRequest).mockResolvedValue(
      okWith({ domains: ['food'] })
    );

    await selectToolDomains(provider, 'log 2 eggs');

    expect(dispatchAiRequest).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(dispatchAiRequest).mock.calls[0][0];
    expect(arg.provider).toBe(provider);
    expect(arg.jsonSchema).toBeDefined();
    expect(arg.temperature).toBe(0);
    expect(arg.timeoutMs).toBeGreaterThan(0);
    // The prompt must carry the user's message so the model can classify it.
    expect(arg.prompt).toContain('log 2 eggs');
  });
});
