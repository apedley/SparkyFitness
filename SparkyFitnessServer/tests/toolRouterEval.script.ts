/**
 * Dev harness: evaluate the per-message tool router against a real Ollama model
 * across a labeled suite of user messages, answering two questions:
 *
 *   1. Is it working? Each case runs the real selectToolDomains classifier and
 *      is scored against labeled domains: EXACT (smallest correct set), OVER
 *      (correct but with unneeded extras — functionally fine, less trimming),
 *      MISS (a required domain absent — the turn would lack tools), or FALLBACK
 *      (dispatch failure/garbage → prod falls back to the core domains).
 *   2. Is it helping? For each tool-needing case, generation runs twice — full
 *      tool surface vs the routed subset — comparing real input tokens and
 *      whether the model still picks the same tool(s).
 *
 * Tool handlers are stripped before the generation call, so tool selection is
 * captured without running any handler — nothing touches the database. The
 * router itself is probabilistic; the script reports scores and always exits 0
 * unless the run itself fails.
 *
 * Run from SparkyFitnessServer/. With no env set, the connection (URL, model,
 * API key) comes from the Ollama service configured in the app — see
 * ollamaServiceConfig.ts:
 *   pnpm exec tsx tests/toolRouterEval.script.ts
 * or point it explicitly:
 *   OLLAMA_URL=https://ollama.com OLLAMA_API_KEY=... OLLAMA_MODEL=gemma4:31b \
 *     pnpm exec tsx tests/toolRouterEval.script.ts
 *
 * Against a local `ollama serve`, give Ollama real context headroom
 * (OLLAMA_CONTEXT_LENGTH=16384) so the full-arm tool block is not truncated.
 *
 * SKIP_GEN=1 runs the routing-accuracy pass only (~1 model call per case).
 */
import './scriptEnv.js';
import { generateText, stepCountIs } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import {
  ALL_DOMAINS,
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
const SKIP_GEN = process.env.SKIP_GEN === '1';
const USER_ID = '00000000-0000-0000-0000-000000000000';
const TZ = 'UTC';

interface EvalCase {
  prompt: string;
  /** Domains the router must select; any one missing is a MISS. */
  required: ToolDomain[];
  /** Defensible extras that do not count as over-selection. */
  allowed?: ToolDomain[];
}

// Two per domain plus the known traps: water is food (never checkin),
// range-trends are coach (not checkin), multi-intent turns, and small-talk
// that should route to an empty set.
const EVAL_CASES: EvalCase[] = [
  {
    prompt: 'log 2 eggs and a slice of toast for breakfast',
    required: ['food'],
  },
  {
    prompt: 'how many calories have I eaten so far today',
    required: ['food'],
    allowed: ['reports'],
  },
  { prompt: 'log 500ml of water', required: ['food'] },
  { prompt: 'log a 30 minute run', required: ['exercise'] },
  { prompt: 'find a bench press exercise for me', required: ['exercise'] },
  { prompt: 'record my weight as 80.5 kg', required: ['checkin'] },
  { prompt: 'I slept 7 and a half hours last night', required: ['checkin'] },
  {
    prompt: 'how did I sleep over the last week',
    required: ['coach'],
    allowed: ['checkin', 'reports'],
  },
  {
    prompt: 'analyze my nutrition trends for the past month',
    required: ['coach'],
    allowed: ['food', 'reports'],
  },
  {
    prompt: "what's my logging streak",
    required: ['engagement'],
    allowed: ['habits'],
  },
  { prompt: 'set my calorie goal to 2000', required: ['goals'] },
  { prompt: 'what are my protein and carb targets', required: ['goals'] },
  {
    prompt: 'update my height to 180 cm',
    required: ['profile'],
    allowed: ['checkin'],
  },
  {
    prompt: 'mark my meditation habit as done for today',
    required: ['habits'],
  },
  {
    prompt: 'add a habit to drink water every morning',
    required: ['habits'],
    allowed: ['food'],
  },
  {
    prompt: "let's do my daily check-in",
    required: ['wizard'],
    allowed: ['checkin'],
  },
  { prompt: "give me today's report", required: ['reports'] },
  {
    prompt: 'summarize what I ate and did yesterday',
    required: ['reports'],
    allowed: ['food', 'exercise', 'coach'],
  },
  {
    prompt: 'log 2 eggs for breakfast and a 20 minute walk',
    required: ['food', 'exercise'],
  },
  {
    prompt: 'I weighed 80kg this morning and had oatmeal for breakfast',
    required: ['checkin', 'food'],
  },
  {
    prompt: 'estimate the calories in a Big Mac meal',
    required: [],
    allowed: ['food'],
  },
  { prompt: "thanks, that's all for now!", required: [] },
  { prompt: 'hello!', required: [] },
  { prompt: 'what can you help me with?', required: [], allowed: ALL_DOMAINS },
];

// Same OpenAI-compatible wiring the server uses for Ollama generation; vanilla
// Ollama ignores the api key, Ollama Cloud requires it as a Bearer token.
const provider = createOpenAI({
  baseURL: `${OLLAMA_URL}/v1`,
  apiKey: OLLAMA_API_KEY ?? 'ollama',
});
const model = provider.chat(MODEL);

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
// handler (which would hit the database).
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

type Verdict = 'EXACT' | 'OVER' | 'MISS' | 'FALLBACK';

function scoreRoute(c: EvalCase, routed: ToolDomain[] | null): Verdict {
  if (routed === null) return 'FALLBACK';
  const selected = new Set(routed);
  if (c.required.some((d) => !selected.has(d))) return 'MISS';
  const ok = new Set<ToolDomain>([...c.required, ...(c.allowed ?? [])]);
  return routed.some((d) => !ok.has(d)) ? 'OVER' : 'EXACT';
}

interface GenArm {
  toolCount: number;
  inputTokens: number | null;
  ms: number;
  calls: string[];
}

async function runGenArm(
  prompt: string,
  builtTools: Record<string, unknown>,
  systemPrompt: string
): Promise<GenArm> {
  const start = performance.now();
  const result = await generateText({
    model,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
    tools: selectionOnly(builtTools),
    stopWhen: stepCountIs(1),
    maxRetries: 1,
  });
  return {
    toolCount: Object.keys(builtTools).length,
    inputTokens: result.usage?.inputTokens ?? null,
    ms: Math.round(performance.now() - start),
    calls: [...new Set(result.toolCalls.map((c) => c.toolName))].sort(),
  };
}

function pct(saved: number, from: number): string {
  return `${Math.round((saved / from) * 100)}%`;
}

function stats(values: number[]): string {
  if (values.length === 0) return 'n/a';
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  return `avg ${avg} ms (min ${Math.min(...values)}, max ${Math.max(...values)})`;
}

async function main() {
  console.log('=== tool-router eval ===');
  console.log(`model: ${MODEL}   url: ${OLLAMA_URL}`);
  console.log(
    `${EVAL_CASES.length} cases | generation A/B: ${SKIP_GEN ? 'off (SKIP_GEN=1)' : 'on'}`
  );

  // Warm up so the first timed call doesn't absorb model-load/connection setup.
  process.stdout.write('warming up model... ');
  await generateText({
    model,
    messages: [{ role: 'user', content: 'hi' }],
    maxRetries: 1,
  });
  console.log('done');

  const fullTools = buildChatbotTools(USER_ID, TZ, 'full');
  const fullSystemPrompt = getSystemPrompt(TZ, 'None');

  const verdicts: Record<Verdict, number> = {
    EXACT: 0,
    OVER: 0,
    MISS: 0,
    FALLBACK: 0,
  };
  const failures: string[] = [];
  const routeLatencies: number[] = [];
  const tokenSavings: Array<{ full: number; routed: number }> = [];
  let parityMatches = 0;
  let parityTotal = 0;

  for (const [i, c] of EVAL_CASES.entries()) {
    const label = `${String(i + 1).padStart(2)}/${EVAL_CASES.length}`;
    console.log(`\n${label} "${c.prompt}"`);

    const routeStart = performance.now();
    const routed = await selectToolDomains(routerProvider, c.prompt);
    const routeMs = Math.round(performance.now() - routeStart);
    routeLatencies.push(routeMs);

    const verdict = scoreRoute(c, routed);
    verdicts[verdict] += 1;
    const routedLabel = routed
      ? routed.join(', ') || '(empty — no tools)'
      : 'null → core fallback';
    console.log(
      `   routed: ${routedLabel} | expected: ${c.required.join(', ') || '(none)'} | ${verdict} | ${routeMs} ms`
    );
    if (verdict === 'MISS' || verdict === 'FALLBACK') {
      // A fallback still works when the required domains are all in core.
      const coveredByCore = c.required.every((d) => CORE_DOMAINS.includes(d));
      if (verdict === 'MISS' || !coveredByCore) {
        failures.push(
          `"${c.prompt}" wanted [${c.required.join(', ')}] got ${routedLabel}`
        );
      }
    }

    if (SKIP_GEN || c.required.length === 0) continue;

    // Mirror prod: a null route falls back to the core domains; the routed arm
    // also gets the capability-trimmed system prompt.
    const resolved = routed ?? [...CORE_DOMAINS];
    const routedTools = buildChatbotToolsForDomains(USER_ID, TZ, resolved);
    try {
      const full = await runGenArm(
        c.prompt,
        fullTools as Record<string, unknown>,
        fullSystemPrompt
      );
      const trimmed = await runGenArm(
        c.prompt,
        routedTools as Record<string, unknown>,
        getSystemPrompt(TZ, 'None', capabilitiesForDomains(resolved))
      );
      const match =
        full.calls.length > 0 && full.calls.join() === trimmed.calls.join();
      parityTotal += 1;
      if (match) parityMatches += 1;
      if (full.inputTokens !== null && trimmed.inputTokens !== null) {
        tokenSavings.push({
          full: full.inputTokens,
          routed: trimmed.inputTokens,
        });
      }
      const tokens =
        full.inputTokens !== null && trimmed.inputTokens !== null
          ? `${full.inputTokens} → ${trimmed.inputTokens} tok (-${pct(full.inputTokens - trimmed.inputTokens, full.inputTokens)})`
          : 'tokens unreported';
      console.log(
        `   gen: full ${full.toolCount} tools/${full.ms} ms vs routed ${trimmed.toolCount} tools/${trimmed.ms} ms | ${tokens}`
      );
      console.log(
        `   calls: full [${full.calls.join(', ') || 'none'}] vs routed [${trimmed.calls.join(', ') || 'none'}] ${match ? '✓' : '✗'}`
      );
    } catch (err) {
      parityTotal += 1;
      console.log(
        `   gen failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  console.log('\n=== summary ===');
  const functional = verdicts.EXACT + verdicts.OVER;
  console.log(
    `routing: ${verdicts.EXACT} EXACT / ${verdicts.OVER} OVER / ${verdicts.MISS} MISS / ${verdicts.FALLBACK} FALLBACK ` +
      `(${functional}/${EVAL_CASES.length} functional)`
  );
  for (const f of failures) console.log(`  ✗ ${f}`);
  console.log(`router latency: ${stats(routeLatencies)}`);
  if (tokenSavings.length > 0) {
    const fullSum = tokenSavings.reduce((a, b) => a + b.full, 0);
    const routedSum = tokenSavings.reduce((a, b) => a + b.routed, 0);
    console.log(
      `gen input tokens: avg ${Math.round(fullSum / tokenSavings.length)} full → ` +
        `${Math.round(routedSum / tokenSavings.length)} routed (-${pct(fullSum - routedSum, fullSum)}) over ${tokenSavings.length} cases`
    );
  }
  if (parityTotal > 0) {
    console.log(
      `tool-call parity (full vs routed): ${parityMatches}/${parityTotal}`
    );
  }
  console.log('');
}

main().catch((err) => {
  console.error('\neval run failed:', err instanceof Error ? err.message : err);
  console.error(
    'Check OLLAMA_URL / OLLAMA_API_KEY / OLLAMA_MODEL — for Ollama Cloud use ' +
      'OLLAMA_URL=https://ollama.com with a key from https://ollama.com/settings/keys'
  );
  process.exitCode = 1;
});
