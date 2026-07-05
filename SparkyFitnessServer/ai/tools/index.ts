import type { ToolSet } from 'ai';
import { buildCheckinTools } from './checkinTools.js';
import { buildCoachTools } from './coachTools.js';
import { buildEngagementTools } from './engagementTools.js';
import { buildExerciseTools } from './exerciseTools.js';
import { buildFoodTools } from './foodTools.js';
import { buildGoalTools } from './goalTools.js';
import { buildHabitTools } from './habitTools.js';
import { buildProfileTools } from './profileTools.js';
import { buildReportTools } from './reportTools.js';
import { buildVisionTools } from './visionTools.js';
import { buildWizardTools } from './wizardTools.js';

/**
 * Ordered registry of the chat-visible tool domains. Each entry pairs a
 * one-line `description` (the menu the tool router classifies against — see
 * `ai/toolRouter.ts`) with a `build(userId, tz)` that normalizes the differing
 * per-builder arg shapes (vision/profile/habits/wizard ignore `tz`).
 *
 * Iteration order is the canonical tool-emission order and MUST stay in sync
 * with MCP's registerAllTools. It anchors two invariants:
 *  - the golden tool-surface tests (exact 35/18 name sets), and
 *  - the Anthropic cache breakpoint, which finalizeTools pins on whichever tool
 *    the SDK emits last (see finalizeTools).
 * Reordering keys silently moves the cache breakpoint and can break provider
 * validation, so keep this order fixed unless MCP's order changes too.
 */
export const TOOL_DOMAINS = {
  exercise: {
    description:
      'Logging, searching, editing, and reviewing workouts and exercises (e.g. "log a 30 minute run", "how much did I exercise today", "find bench press").',
    build: (userId: string, tz: string) => buildExerciseTools(userId, tz),
  },
  food: {
    description:
      'Logging, searching, editing, and reviewing food, meals, and drinks — including water and all beverages (e.g. "log 2 eggs", "log 500ml of water", "what did I eat today"). Water and every beverage go here, never to check-in.',
    build: (userId: string, tz: string) => buildFoodTools(userId, tz),
  },
  checkin: {
    description:
      'Logging or reading a single-day body metric or diary value: weight, sleep duration, mood, body fat, fasting, blood pressure, and custom measurements (e.g. "log 7 hours of sleep", "record my weight as 80kg"). For a trend across a date range use coach instead.',
    build: (userId: string, tz: string) => buildCheckinTools(userId, tz),
  },
  coach: {
    description:
      'Trend analysis and coaching over a date range: multi-day/30-day trends, pattern detection, health summaries, and coaching plans (e.g. "how did I sleep last week", "analyze my nutrition trends", "am I making progress").',
    build: (userId: string, tz: string) => buildCoachTools(userId, tz),
  },
  engagement: {
    description:
      'Logging streaks, engagement checks, and contextual nudges (e.g. "what is my logging streak", "am I on track today").',
    build: (userId: string, tz: string) => buildEngagementTools(userId, tz),
  },
  vision: {
    description:
      'Analyzing an attached photo of food, a meal, or a nutrition label to extract nutrition data from the image.',
    build: (userId: string, _tz: string) => buildVisionTools(userId),
  },
  goals: {
    description:
      'Viewing or changing nutrition and fitness goals and targets (e.g. "set my calorie goal to 2000", "what are my macro targets").',
    build: (userId: string, tz: string) => buildGoalTools(userId, tz),
  },
  profile: {
    description:
      "Viewing or updating the user's profile details such as height, age, sex, and activity level.",
    build: (userId: string, _tz: string) => buildProfileTools(userId),
  },
  habits: {
    description:
      'Creating, logging, or reviewing habits and habit streaks (e.g. "mark my water habit done", "add a meditation habit").',
    build: (userId: string, _tz: string) => buildHabitTools(userId),
  },
  wizard: {
    description:
      'The guided daily check-in wizard that walks the user step by step through logging their scheduled daily metrics.',
    build: (userId: string, _tz: string) => buildWizardTools(userId),
  },
  reports: {
    description:
      'Generating a daily nutrition/exercise report or a summary report for a specific day (e.g. "give me today\'s report", "summarize yesterday").',
    build: (userId: string, tz: string) => buildReportTools(userId, tz),
  },
} as const;

/** A chat tool domain key (the router's classification labels). */
export type ToolDomain = keyof typeof TOOL_DOMAINS;

/** Canonical domain order — the single source the full set and any sliced set follow. */
const DOMAIN_ORDER = Object.keys(TOOL_DOMAINS) as ToolDomain[];

/** Every domain, in canonical order — the domain set behind the 'full' profile. */
export const ALL_DOMAINS: ToolDomain[] = DOMAIN_ORDER;

/** Domains that make up the 'core' profile: the food/exercise/measurement logging the system prompt centers on. */
export const CORE_DOMAINS: ToolDomain[] = ['exercise', 'food', 'checkin'];

/**
 * Tool surfaces the chatbot can expose:
 * - 'full': every chat-visible tool (the default).
 * - 'core': just the food/exercise/measurement logging the system prompt
 *   centers on. Used for small/local models (e.g. Ollama's default 3B
 *   llama3.2) that have no prompt cache — so the whole tool block is
 *   reprocessed every turn — and select tools more reliably from a smaller
 *   surface. Analytics, coaching, vision, goals, profile, habits, the check-in
 *   wizard, and reports are dropped.
 */
export type ChatToolProfile = 'full' | 'core';

// Only these two mutable fields matter for post-processing; casting the tool
// values to this narrow shape keeps finalizeTools decoupled from the SDK's full
// Tool generics while still mutating the real objects in place.
interface FinalizableTool {
  strict?: boolean;
  providerOptions?: {
    anthropic?: Record<string, unknown>;
    [k: string]: unknown;
  };
}

/**
 * Post-process a composed tool set: disable provider-side strict mode on every
 * tool and tag the final one as an Anthropic cache breakpoint. Any set exposed
 * to the chat model — full, core, or a router-sliced subset — must run through
 * this, or slicing silently breaks provider validation and prompt caching.
 */
function finalizeTools<T extends ToolSet>(tools: T): T {
  // The published flat schemas are advisory; real validation is the strict
  // per-action union inside each handler. Strict provider-side mode must stay
  // off: OpenAI's Responses API treats an omitted flag as "attempt strict
  // mode" and then forces models to emit every published property, producing
  // placeholder junk that the per-action validation rejects.
  const allTools = Object.values(tools) as FinalizableTool[];
  for (const t of allTools) {
    t.strict = false;
  }

  // Anthropic prompt caching: tag the final tool as a cache breakpoint so the
  // entire (static, user-independent) tool-schema block — the bulk of every
  // request prefix — is written once and re-read across the multi-step agent
  // loop and conversation turns. Provider-namespaced: non-Anthropic providers
  // ignore it (and auto-cache on their own). MUST be the LAST tool the SDK
  // emits (Anthropic caches the prefix up to & including the marked tool). This
  // relies on the AI SDK preserving Object.values() order when building the
  // Anthropic `tools` array — true today; if a package bump reorders tools this
  // stops caching the full block silently (no error). Merge, don't overwrite,
  // so any future providerOptions on this tool (e.g. deferLoading) survive.
  const lastTool = allTools[allTools.length - 1];
  if (lastTool) {
    lastTool.providerOptions = {
      ...lastTool.providerOptions,
      anthropic: {
        ...lastTool.providerOptions?.anthropic,
        cacheControl: { type: 'ephemeral' },
      },
    };
  }
  return tools;
}

/**
 * Compose the given domains in canonical order (ignoring the order the caller
 * lists them) and finalize. Handlers close over the authenticated userId — chat
 * tools always act as the session user, so two-actor services receive
 * (userId, userId, …) — and the user's IANA timezone, used for "today" defaults
 * and day bucketing.
 */
function composeDomains(
  userId: string,
  tz: string,
  domains: ToolDomain[]
): ToolSet {
  const requested = new Set(domains);
  const tools: ToolSet = {};
  for (const domain of DOMAIN_ORDER) {
    if (requested.has(domain)) {
      Object.assign(tools, TOOL_DOMAINS[domain].build(userId, tz));
    }
  }
  return finalizeTools(tools);
}

/**
 * Composes the in-process chatbot tool set for generateText/streamText. The
 * 'core' profile is a strict prefix of the full set, so the full set keeps its
 * original ordering.
 */
export function buildChatbotTools(
  userId: string,
  tz: string,
  profile: ChatToolProfile = 'full'
): ToolSet {
  const domains = profile === 'core' ? CORE_DOMAINS : DOMAIN_ORDER;
  return composeDomains(userId, tz, domains);
}

/**
 * Composes exactly the requested domains (in canonical order) for the tool
 * router. Same per-domain builders and finalization as buildChatbotTools, so a
 * router-sliced set behaves identically to the full set minus the omitted
 * domains.
 */
export function buildChatbotToolsForDomains(
  userId: string,
  tz: string,
  domains: ToolDomain[]
): ToolSet {
  return composeDomains(userId, tz, domains);
}
