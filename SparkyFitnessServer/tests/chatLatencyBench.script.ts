/**
 * Dev harness: repeated-run latency benchmark for the chatbot streaming path,
 * printing mean/median/min/max/stdev for total time, time to first byte, and
 * time to first text token (after tool calls) — the same shape as external
 * tester output, for side-by-side comparison.
 *
 * Each run mirrors the production pipeline for the chosen profile: the real
 * system prompt (capability-trimmed for router/core), the real tool surface,
 * and a streaming agentic loop with stopWhen(15) like chatService. On
 * PROFILE=router the selectToolDomains pre-pass runs inside the timed window,
 * exactly where prod awaits it before streamText. Tool handlers are replaced
 * with a canned stub result so the loop continues to a text answer without
 * touching the database — this measures model + prompt latency, not tool
 * execution.
 *
 * Timing definitions (clock starts before the router pre-pass, where used):
 *   - first byte: first stream part carrying provider data (the SDK's
 *     synthetic 'start'/'start-step' events are skipped)
 *   - first text token (after tool calls): first non-empty text delta after at
 *     least one tool call; falls back to the first text delta if the model
 *     never called a tool (flagged in the per-run line)
 *
 * Run from SparkyFitnessServer/ (RUNS defaults to 20, PROFILE to full). With
 * no env set, the connection (URL, model, API key) comes from the Ollama
 * service configured in the app — see ollamaServiceConfig.ts:
 *   PROFILE=router pnpm exec tsx tests/chatLatencyBench.script.ts
 * or point it explicitly:
 *   OLLAMA_URL=https://ollama.com OLLAMA_API_KEY=... OLLAMA_MODEL=gemma4:31b \
 *     PROFILE=router PROMPT="log 2 eggs and a banana for breakfast" \
 *     pnpm exec tsx tests/chatLatencyBench.script.ts
 */
import './scriptEnv.js';
import { streamText, stepCountIs } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import {
  buildChatbotTools,
  buildChatbotToolsForDomains,
  CORE_DOMAINS,
  type ToolDomain,
} from '../ai/tools/index.js';
import {
  getSystemPrompt,
  type ChatPromptCapabilities,
} from '../services/chatService.js';
import { selectToolDomains } from '../ai/toolRouter.js';
import type { ProviderConfig } from '../ai/providerDispatch.js';
import { resolveOllamaConfig } from './ollamaServiceConfig.js';

const cfg = await resolveOllamaConfig();
const OLLAMA_URL = cfg.url;
const OLLAMA_API_KEY = cfg.apiKey;
const MODEL = cfg.model;
const PROMPT = process.env.PROMPT ?? 'log 2 eggs and a banana for breakfast';
const RUNS = Number(process.env.RUNS ?? 20);
const PROFILE = (process.env.PROFILE ?? 'full') as 'full' | 'core' | 'router';
const USER_ID = '00000000-0000-0000-0000-000000000000';
const TZ = 'UTC';
// Matches chatService's MAX_AGENTIC_STEPS.
const MAX_AGENTIC_STEPS = 15;

const provider = createOpenAI({
  baseURL: `${OLLAMA_URL}/v1`,
  apiKey: OLLAMA_API_KEY ?? 'ollama',
});
const model = provider.chat(MODEL);

const routerProvider: ProviderConfig = {
  service_type: 'ollama',
  custom_url: OLLAMA_URL,
  model_name: MODEL,
  api_key: OLLAMA_API_KEY,
};

function capabilitiesForDomains(domains: ToolDomain[]): ChatPromptCapabilities {
  const set = new Set(domains);
  return {
    hasFood: set.has('food'),
    hasExercise: set.has('exercise'),
    hasCheckin: set.has('checkin'),
    hasVision: set.has('vision'),
  };
}

// Replace every handler with a canned success so the agentic loop proceeds to
// a text answer without touching the database.
type Tools = NonNullable<Parameters<typeof streamText>[0]['tools']>;
function stubbed(tools: Record<string, unknown>): Tools {
  const out: Record<string, unknown> = {};
  for (const [name, t] of Object.entries(tools)) {
    out[name] = {
      ...(t as Record<string, unknown>),
      execute: async () => 'OK — logged/retrieved (benchmark stub result).',
    };
  }
  return out as Tools;
}

interface RunTimings {
  totalS: number;
  ttfbS: number;
  firstTextS: number;
  toolCalls: number;
  textBeforeTools: boolean;
}

async function timedRun(): Promise<RunTimings> {
  const start = performance.now();

  // Mirror prod: on the router profile the domain pre-pass is awaited before
  // streamText, so it lands inside the user-perceived latency window.
  let tools: Tools;
  let systemPrompt: string;
  if (PROFILE === 'router') {
    const routed = await selectToolDomains(routerProvider, PROMPT);
    const resolved = routed ?? [...CORE_DOMAINS];
    tools = stubbed(
      buildChatbotToolsForDomains(USER_ID, TZ, resolved) as Record<
        string,
        unknown
      >
    );
    systemPrompt = getSystemPrompt(
      TZ,
      'None',
      capabilitiesForDomains(resolved)
    );
  } else {
    tools = stubbed(
      buildChatbotTools(USER_ID, TZ, PROFILE) as Record<string, unknown>
    );
    systemPrompt =
      PROFILE === 'core'
        ? getSystemPrompt(TZ, 'None', capabilitiesForDomains([...CORE_DOMAINS]))
        : getSystemPrompt(TZ, 'None');
  }

  const result = streamText({
    model,
    system: systemPrompt,
    messages: [{ role: 'user', content: PROMPT }],
    tools,
    stopWhen: stepCountIs(MAX_AGENTIC_STEPS),
    maxRetries: 1,
  });

  let ttfb: number | null = null;
  let firstTextAfterTools: number | null = null;
  let firstTextAny: number | null = null;
  let toolCalls = 0;
  for await (const part of result.fullStream) {
    const now = performance.now();
    // 'start'/'start-step' are synthetic SDK events emitted before the
    // provider responds; first byte means the first part carrying provider
    // data (tool-input-start, text-start, a delta, ...).
    if (ttfb === null && part.type !== 'start' && part.type !== 'start-step') {
      ttfb = now - start;
    }
    if (part.type === 'tool-call') toolCalls += 1;
    if (part.type === 'error') {
      throw part.error instanceof Error
        ? part.error
        : new Error(String(part.error));
    }
    if (part.type === 'text-delta' && part.text.length > 0) {
      if (firstTextAny === null) firstTextAny = now - start;
      if (firstTextAfterTools === null && toolCalls > 0) {
        firstTextAfterTools = now - start;
      }
    }
  }
  const total = performance.now() - start;

  const firstText = firstTextAfterTools ?? firstTextAny;
  if (ttfb === null || firstText === null) {
    throw new Error('stream produced no text');
  }
  return {
    totalS: total / 1000,
    ttfbS: ttfb / 1000,
    firstTextS: firstText / 1000,
    toolCalls,
    textBeforeTools: firstTextAfterTools === null,
  };
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(
    values.reduce((a, b) => a + (b - m) ** 2, 0) / (values.length - 1)
  );
}

function block(title: string, values: number[]): string {
  const s = (n: number) => `${n.toFixed(2)}s`;
  return [
    `--- ${title} ---`,
    `Mean:   ${s(mean(values))}`,
    `Median: ${s(median(values))}`,
    `Min:    ${s(Math.min(...values))}`,
    `Max:    ${s(Math.max(...values))}`,
    `Stdev:  ${s(stdev(values))}`,
  ].join('\n');
}

async function main() {
  console.log(
    `=== chat latency bench === model: ${MODEL} | url: ${OLLAMA_URL} | profile: ${PROFILE}`
  );
  console.log(`prompt: "${PROMPT}" | runs: ${RUNS}\n`);

  // Untimed warm-up so run 1 doesn't absorb model-load/connection setup.
  process.stdout.write('warming up model... ');
  await streamText({
    model,
    messages: [{ role: 'user', content: 'hi' }],
    maxRetries: 1,
  }).consumeStream();
  console.log('done\n');

  const runs: RunTimings[] = [];
  for (let i = 1; i <= RUNS; i++) {
    try {
      const r = await timedRun();
      runs.push(r);
      console.log(
        `run ${i}/${RUNS}: total ${r.totalS.toFixed(2)}s | ttfb ${r.ttfbS.toFixed(2)}s | ` +
          `first text ${r.firstTextS.toFixed(2)}s | ${r.toolCalls} tool call(s)` +
          (r.textBeforeTools ? ' [no tool call before text]' : '')
      );
    } catch (err) {
      console.log(
        `run ${i}/${RUNS}: FAILED — ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  console.log(`\nRuns completed: ${runs.length}/${RUNS}`);
  if (runs.length === 0) {
    process.exitCode = 1;
    return;
  }
  console.log('');
  console.log(
    block(
      'Total time',
      runs.map((r) => r.totalS)
    )
  );
  console.log('');
  console.log(
    block(
      'Time to first byte',
      runs.map((r) => r.ttfbS)
    )
  );
  console.log('');
  console.log(
    block(
      'Time to first text token (after tool calls)',
      runs.map((r) => r.firstTextS)
    )
  );
}

main().catch((err) => {
  console.error('\nbench failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
