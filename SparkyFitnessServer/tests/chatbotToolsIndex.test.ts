import { vi, describe, expect, it } from 'vitest';
import {
  buildChatbotTools,
  buildChatbotToolsForDomains,
} from '../ai/tools/index.js';

// Loading the real foodEntryService trips on a deep '@workspace/shared'
// subpath import; the registry surface test never executes handlers.
vi.mock('../services/foodEntryService', () => ({ default: {} }));
vi.mock('../config/logging', () => ({
  log: vi.fn(),
}));

// The chat-visible tool surface: every MCP tool except the four dev tools
// (sparky_inspect_schema, sparky_get_user_info, sparky_get_db_stats,
// sparky_run_project_tests), which are intentionally not ported.
const EXPECTED_TOOLS = [
  'sparky_analyze_food_image',
  'sparky_analyze_trends',
  'sparky_check_engagement',
  'sparky_daily_checkin_wizard',
  'sparky_detect_patterns',
  'sparky_generate_coaching_plan',
  'sparky_get_30_day_trends',
  'sparky_get_contextual_nudge',
  'sparky_get_daily_exercise_totals',
  'sparky_get_daily_report',
  'sparky_get_exercise_details',
  'sparky_get_exercise_diary',
  'sparky_get_exercise_progress',
  'sparky_get_exercise_usage',
  'sparky_get_food_details',
  'sparky_get_food_diary',
  'sparky_get_food_usage',
  'sparky_get_goal_snapshot',
  'sparky_get_health_summary',
  'sparky_get_logging_streak',
  'sparky_get_nutrition_summary',
  'sparky_get_recent_exercise_entries',
  'sparky_get_recent_food_entries',
  'sparky_get_report',
  'sparky_list_exercises',
  'sparky_list_foods',
  'sparky_manage_checkin',
  'sparky_manage_exercise',
  'sparky_manage_food',
  'sparky_manage_goals',
  'sparky_manage_habits',
  'sparky_manage_profile',
  'sparky_scan_label',
  'sparky_search_exercises',
  'sparky_search_foods',
];

// The 'core' profile (used for Ollama and other small/local models): the
// food, exercise, and measurement logging the system prompt centers on, minus
// the analytics, coaching, vision, goal, profile, habit, wizard, and report
// tools that weaker models struggle to drive and that inflate prefill cost.
const EXPECTED_CORE_TOOLS = [
  'sparky_get_daily_exercise_totals',
  'sparky_get_exercise_details',
  'sparky_get_exercise_diary',
  'sparky_get_exercise_progress',
  'sparky_get_exercise_usage',
  'sparky_get_food_details',
  'sparky_get_food_diary',
  'sparky_get_food_usage',
  'sparky_get_nutrition_summary',
  'sparky_get_recent_exercise_entries',
  'sparky_get_recent_food_entries',
  'sparky_list_exercises',
  'sparky_list_foods',
  'sparky_manage_checkin',
  'sparky_manage_exercise',
  'sparky_manage_food',
  'sparky_search_exercises',
  'sparky_search_foods',
];

describe('buildChatbotTools', () => {
  it('exposes exactly the MCP chat-visible tool surface', () => {
    const tools = buildChatbotTools('user-1', 'UTC');
    expect(Object.keys(tools).sort()).toEqual(EXPECTED_TOOLS);
  });

  it('defaults to the full profile', () => {
    const tools = buildChatbotTools('user-1', 'UTC', 'full');
    expect(Object.keys(tools).sort()).toEqual(EXPECTED_TOOLS);
  });

  it('exposes only the core logging tools for the core profile', () => {
    const tools = buildChatbotTools('user-1', 'UTC', 'core');
    expect(Object.keys(tools).sort()).toEqual(EXPECTED_CORE_TOOLS);
  });

  it('keeps the core profile a strict subset of the full surface', () => {
    const full = new Set(Object.keys(buildChatbotTools('user-1', 'UTC')));
    const core = Object.keys(buildChatbotTools('user-1', 'UTC', 'core'));
    expect(core.length).toBeLessThan(full.size);
    for (const name of core) {
      expect(full.has(name), `${name} missing from full surface`).toBe(true);
    }
  });

  it('still disables provider strict mode in the core profile', () => {
    const tools = buildChatbotTools('user-1', 'UTC', 'core');
    for (const [name, t] of Object.entries(tools)) {
      expect(t.strict, `${name} strict`).toBe(false);
    }
  });

  it('gives every tool a description, an input schema, and an executor', () => {
    const tools = buildChatbotTools('user-1', 'UTC');
    for (const [name, t] of Object.entries(tools)) {
      expect(t.description, `${name} description`).toBeTruthy();
      expect(t.inputSchema, `${name} inputSchema`).toBeDefined();
      expect(typeof t.execute, `${name} execute`).toBe('function');
    }
  });

  // OpenAI's Responses API treats an omitted strict flag as "attempt strict
  // mode", which forces models to fill every published property with
  // placeholder values that the per-action union validation then rejects.
  it('publishes every tool with provider strict mode disabled', () => {
    const tools = buildChatbotTools('user-1', 'UTC');
    for (const [name, t] of Object.entries(tools)) {
      expect(t.strict, `${name} strict`).toBe(false);
    }
  });

  // The golden surface tests above sort the names, so runtime insertion order —
  // which anchors the Anthropic cache breakpoint (the last tool the SDK emits) —
  // is otherwise unprotected. These lock the canonical domain-block ordering.
  it('emits the full surface in canonical domain-block order', () => {
    const keys = Object.keys(buildChatbotTools('user-1', 'UTC'));
    // Representative "manage" tool per logging domain, then a coach tool: their
    // relative positions prove the exercise→food→checkin→coach block order.
    expect(keys.indexOf('sparky_manage_exercise')).toBeLessThan(
      keys.indexOf('sparky_manage_food')
    );
    expect(keys.indexOf('sparky_manage_food')).toBeLessThan(
      keys.indexOf('sparky_manage_checkin')
    );
    expect(keys.indexOf('sparky_manage_checkin')).toBeLessThan(
      keys.indexOf('sparky_get_health_summary')
    );
  });

  it('keeps sparky_get_daily_report as the final full-set tool (cache breakpoint anchor)', () => {
    const keys = Object.keys(buildChatbotTools('user-1', 'UTC'));
    expect(keys[keys.length - 1]).toBe('sparky_get_daily_report');
  });
});

describe('buildChatbotToolsForDomains', () => {
  it('exposes exactly the requested domain’s tools', () => {
    const tools = buildChatbotToolsForDomains('user-1', 'UTC', ['goals']);
    expect(Object.keys(tools).sort()).toEqual([
      'sparky_get_goal_snapshot',
      'sparky_manage_goals',
    ]);
  });

  it('composes in canonical order regardless of the order requested', () => {
    // Router hands domains back in arbitrary order; the composed set must still
    // follow the canonical block order (exercise, then food, then reports).
    const keys = Object.keys(
      buildChatbotToolsForDomains('user-1', 'UTC', [
        'reports',
        'food',
        'exercise',
      ])
    );
    expect(keys.indexOf('sparky_search_exercises')).toBeLessThan(
      keys.indexOf('sparky_search_foods')
    );
    expect(keys.indexOf('sparky_search_foods')).toBeLessThan(
      keys.indexOf('sparky_get_daily_report')
    );
    // reports is the last requested block, so its final tool anchors the cache.
    expect(keys[keys.length - 1]).toBe('sparky_get_daily_report');
  });

  it('reapplies strict=false and the cache breakpoint to the sliced last tool', () => {
    const tools = buildChatbotToolsForDomains('user-1', 'UTC', [
      'vision',
      'food',
    ]);
    const entries = Object.entries(tools);
    const lastKey = entries[entries.length - 1][0];

    for (const [name, tool] of entries) {
      expect(tool.strict, `${name} strict`).toBe(false);
      const cacheControl = (
        tool.providerOptions?.anthropic as
          | { cacheControl?: unknown }
          | undefined
      )?.cacheControl;
      if (name === lastKey) {
        expect(cacheControl, `${name} cacheControl`).toEqual({
          type: 'ephemeral',
        });
      } else {
        expect(cacheControl, `${name} cacheControl`).toBeUndefined();
      }
    }
  });

  it('returns an empty set for no domains', () => {
    const tools = buildChatbotToolsForDomains('user-1', 'UTC', []);
    expect(Object.keys(tools)).toEqual([]);
  });
});
