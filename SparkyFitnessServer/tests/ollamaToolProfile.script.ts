/**
 * Dev harness: A/B/C the chatbot's 'full' (35-tool), 'core' (18-tool), and
 * 'router' (per-message auto-selected) tool surfaces against a real Ollama
 * model, to eyeball tool-selection accuracy and latency on a small/local model.
 *
 * All arms use the same model, backend, prompt, and the production system prompt
 * — only the tool surface differs (full vs core vs the router's per-message
 * pick). The router arm additionally runs the real selectToolDomains pre-pass
 * and reports its routed domains plus separate route vs generation latency (the
 * router adds directly to time-to-first-token). Tool handlers are stripped
 * before the generation call, so the model's selection is captured without
 * running any handler — nothing touches the database. This measures tool
 * selection + prefill size, not execution.
 *
 * Prereqs: `ollama serve` running and the model pulled (`ollama pull qwen3:4b`).
 *   Give Ollama real context headroom or the tool block is silently truncated
 *   (which looks exactly like "won't call tools"):
 *     OLLAMA_CONTEXT_LENGTH=16384 ollama serve
 *
 * Run from SparkyFitnessServer/. With no env set, the connection (URL, model,
 * API key) comes from the Ollama service configured in the app — see
 * ollamaServiceConfig.ts:
 *   PROMPT="log a 30 minute run" pnpm exec tsx tests/ollamaToolProfile.script.ts
 * or point it explicitly (local `ollama serve`, or cloud with a key from
 * https://ollama.com/settings/keys):
 *   OLLAMA_URL=http://localhost:11434 OLLAMA_MODEL=qwen3:4b \
 *     pnpm exec tsx tests/ollamaToolProfile.script.ts
 */
import './scriptEnv.js';
import { generateText, stepCountIs } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import {
  buildChatbotTools,
  buildChatbotToolsForDomains,
  CORE_DOMAINS,
  type ChatToolProfile,
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
const USER_ID = '00000000-0000-0000-0000-000000000000';
const TZ = 'UTC';

// Same OpenAI-compatible wiring the server uses for Ollama (chatService appends
// /v1 and calls provider.chat); vanilla Ollama ignores the api key, Ollama
// Cloud requires it as a Bearer token.
const provider = createOpenAI({
  baseURL: `${OLLAMA_URL}/v1`,
  apiKey: OLLAMA_API_KEY ?? 'ollama',
});
const model = provider.chat(MODEL);
const systemPrompt = getSystemPrompt(TZ, 'None');

// The router calls Ollama's native /api/chat with a grammar-constrained schema
// via dispatchAiRequest, so it needs the base URL (no /v1) as a ProviderConfig.
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

// Drop execute so the model's tool selection is captured without running a real
// handler (which would hit the database). Returned tool calls are inspected
// directly instead of executed.
function selectionOnly(
  tools: Record<string, unknown>
): Parameters<typeof generateText>[0]['tools'] {
  const out: Record<string, unknown> = {};
  for (const [name, tool] of Object.entries(tools)) {
    const copy = { ...(tool as Record<string, unknown>) };
    delete copy.execute;
    out[name] = copy;
  }
  return out as Parameters<typeof generateText>[0]['tools'];
}

async function runProfile(profile: ChatToolProfile) {
  const builtTools = buildChatbotTools(USER_ID, TZ, profile);
  const toolCount = Object.keys(builtTools).length;
  const tools = selectionOnly(builtTools as Record<string, unknown>);

  const start = performance.now();
  const result = await generateText({
    model,
    system: systemPrompt,
    messages: [{ role: 'user', content: PROMPT }],
    tools,
    stopWhen: stepCountIs(1),
    maxRetries: 1,
  });
  const ms = Math.round(performance.now() - start);

  return {
    profile,
    toolCount,
    ms,
    inputTokens: result.usage?.inputTokens ?? null,
    calls: result.toolCalls.map(
      (c) => `${c.toolName}(${JSON.stringify(c.input)})`
    ),
    text: result.text.trim(),
  };
}

function report(r: Awaited<ReturnType<typeof runProfile>>) {
  console.log(
    `\n[${r.profile}] ${r.toolCount} tools | ${r.ms} ms | input≈${r.inputTokens ?? '?'} tok`
  );
  if (r.calls.length > 0) {
    console.log(`  tool calls: ${r.calls.join(', ')}`);
  } else {
    console.log('  tool calls: (none — model answered in text)');
    if (r.text) console.log(`  text: ${r.text.slice(0, 200)}`);
  }
}

// Router arm: run the real per-message classifier against the live model, then
// generate with only the routed tools. Mirrors chatService — a null (garbage)
// route falls back to the core domains. Reports the routed domains plus separate
// route and generation latencies (the router adds directly to time-to-first-token).
async function runRouter() {
  const routeStart = performance.now();
  const routed = await selectToolDomains(routerProvider, PROMPT);
  const routeMs = Math.round(performance.now() - routeStart);
  const resolved = routed ?? [...CORE_DOMAINS];

  const builtTools = buildChatbotToolsForDomains(USER_ID, TZ, resolved);
  const toolCount = Object.keys(builtTools).length;
  const tools = selectionOnly(builtTools as Record<string, unknown>);
  const routedSystemPrompt = getSystemPrompt(
    TZ,
    'None',
    capabilitiesForDomains(resolved)
  );

  const genStart = performance.now();
  const result = await generateText({
    model,
    system: routedSystemPrompt,
    messages: [{ role: 'user', content: PROMPT }],
    tools,
    stopWhen: stepCountIs(1),
    maxRetries: 1,
  });
  const genMs = Math.round(performance.now() - genStart);

  return {
    routed,
    resolved,
    routeMs,
    toolCount,
    genMs,
    inputTokens: result.usage?.inputTokens ?? null,
    calls: result.toolCalls.map(
      (c) => `${c.toolName}(${JSON.stringify(c.input)})`
    ),
    text: result.text.trim(),
  };
}

function reportRouter(r: Awaited<ReturnType<typeof runRouter>>) {
  const routedLabel = r.routed
    ? r.routed.join(', ') || '(empty — small talk)'
    : 'null → core fallback';
  console.log(
    `\n[router] routed: ${routedLabel} | ${r.toolCount} tools | route ${r.routeMs} ms | gen ${r.genMs} ms | input≈${r.inputTokens ?? '?'} tok`
  );
  if (r.calls.length > 0) {
    console.log(`  tool calls: ${r.calls.join(', ')}`);
  } else {
    console.log('  tool calls: (none — model answered in text)');
    if (r.text) console.log(`  text: ${r.text.slice(0, 200)}`);
  }
}

async function main() {
  console.log('=== Ollama tool-profile A/B ===');
  console.log(`model: ${MODEL}   url: ${OLLAMA_URL}`);
  console.log(`prompt: "${PROMPT}"`);

  // Warm up so the first timed run doesn't absorb model-load latency.
  process.stdout.write('warming up model... ');
  await generateText({
    model,
    messages: [{ role: 'user', content: 'hi' }],
    maxRetries: 1,
  });
  console.log('done');

  report(await runProfile('full'));
  report(await runProfile('core'));
  reportRouter(await runRouter());
  console.log('');
}

main().catch((err) => {
  console.error('\nA/B run failed:', err instanceof Error ? err.message : err);
  console.error(
    `Is Ollama running and the model pulled? Try: ollama serve && ollama pull ${MODEL}`
  );
  process.exitCode = 1;
});
