import { log } from '../config/logging.js';
import {
  dispatchAiRequest,
  type JsonSchemaNode,
  type ProviderConfig,
} from './providerDispatch.js';
import { TOOL_DOMAINS, type ToolDomain } from './tools/index.js';

/**
 * Per-message tool router: a cheap LLM classification pre-pass that picks only
 * the relevant tool domains for a user turn, so cacheless small/local models
 * (Ollama) process a much smaller tool-schema block on every subsequent agentic
 * step. Prompt + dispatch + parse only — composition lives in ai/tools/index.ts
 * and the resolution/fallback policy lives in services/chatService.ts.
 */

const DOMAIN_KEYS = Object.keys(TOOL_DOMAINS) as ToolDomain[];
const DOMAIN_KEY_SET = new Set<string>(DOMAIN_KEYS);

// The classifier's menu: one `key: description` line per domain, built from the
// registry so the router and the composed tool set can never drift apart.
const DOMAIN_MENU = DOMAIN_KEYS.map(
  (key) => `- ${key}: ${TOOL_DOMAINS[key].description}`
).join('\n');

// Constrains the reply to a domains array of known keys. Ollama enforces this as
// a grammar via its `format` field; strict OpenAI-family providers enforce it as
// a json_schema. The enum keeps a tiny model from inventing labels.
const DOMAIN_SELECTION_SCHEMA: JsonSchemaNode = {
  type: 'object',
  properties: {
    domains: {
      type: 'array',
      items: { type: 'string', enum: DOMAIN_KEYS },
    },
  },
  required: ['domains'],
};

const SCHEMA_NAME = 'tool_domain_selection';

// A tight bound: the router is awaited before streamText, so it adds directly
// to time-to-first-token on a slow local model. Kept well under the 120s Ollama
// dispatch default (in the spirit of TEST_CONNECTION_TIMEOUT_MS).
const ROUTER_TIMEOUT_MS = 10_000;

function isValidDomain(value: unknown): value is ToolDomain {
  return typeof value === 'string' && DOMAIN_KEY_SET.has(value);
}

function buildPrompt(userText: string): string {
  return `You are a tool router for a nutrition and wellness chat assistant. Given the user's latest message, choose which tool domains the assistant needs so it can load only the relevant tools.

Available domains:
${DOMAIN_MENU}

Rules:
- Return ONLY the domains relevant to the user's latest message.
- Prefer the smallest set that fully covers the request.
- Return an empty list for greetings, thanks, or small-talk that needs no tools.

Respond with a JSON object of the form {"domains": ["food"]} using only the domain keys listed above.

User message:
${userText}`;
}

/**
 * Classify a user message into the tool domains it needs.
 *
 * Fails safe to `null` (the caller maps that to its core fallback) rather than
 * ever returning zero tools from a garbage response: a dispatch/parse failure, a
 * missing or non-array `domains`, or an array of only-unknown keys all return
 * `null`. Returns `[]` **only** when the model deliberately answered
 * `{"domains":[]}` — honored as "no tools needed" for genuine small-talk.
 */
export async function selectToolDomains(
  provider: ProviderConfig,
  userText: string
): Promise<ToolDomain[] | null> {
  const result = await dispatchAiRequest({
    provider,
    prompt: buildPrompt(userText),
    jsonSchema: DOMAIN_SELECTION_SCHEMA,
    schemaName: SCHEMA_NAME,
    temperature: 0,
    timeoutMs: ROUTER_TIMEOUT_MS,
  });

  // On !ok the DispatchResult carries no `.text`; parse_error is folded in here.
  if (!result.ok) {
    log(
      'debug',
      `[toolRouter] dispatch failed (${result.category}): ${result.detail}`
    );
    return null;
  }

  const parsed = result.json;
  const rawDomains =
    parsed && typeof parsed === 'object'
      ? (parsed as { domains?: unknown }).domains
      : undefined;
  if (!Array.isArray(rawDomains)) {
    log('debug', '[toolRouter] response missing a domains array');
    return null;
  }

  const valid = rawDomains.filter(isValidDomain);
  // A non-empty array that yields no known keys is garbage (a tiny model
  // hallucinating labels), not a deliberate "no tools" — fail safe to null.
  if (rawDomains.length > 0 && valid.length === 0) {
    log('debug', '[toolRouter] response contained only unknown domain keys');
    return null;
  }

  // Dedupe while preserving first-seen order; canonical ordering is re-applied
  // downstream by buildChatbotToolsForDomains.
  return [...new Set(valid)];
}
