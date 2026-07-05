import { vi, describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSystemPrompt } from '../services/chatService.js';

// Loading the real foodEntryService (via chatService → ai/tools → foodTools)
// trips on a deep '@workspace/shared' subpath import under vitest; getSystemPrompt
// is pure and never touches it.
vi.mock('../services/foodEntryService', () => ({ default: {} }));
vi.mock('../config/logging', () => ({ log: vi.fn() }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const readFixture = (name: string): string =>
  readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

// The current local date is the only per-run-variable line in the prompt; freeze
// it so the golden fixtures stay stable across days while every other byte of the
// template is asserted exactly.
const normalizeDate = (s: string): string =>
  s.replace(
    /The current local date is [0-9-]+\./,
    'The current local date is <DATE>.'
  );

// Baselines captured from the pre-refactor getSystemPrompt (profile 'full'/'core')
// before the capability-flag restructure. Byte-identical output for these two
// shapes is a hard requirement: every non-Ollama provider still renders 'full',
// and drift there busts their prompt caches / shifts the OpenAI cache-key prefix.
describe('getSystemPrompt golden output', () => {
  it('renders the full prompt (all capabilities) byte-for-byte', () => {
    const full = getSystemPrompt('UTC', 'None', {
      hasFood: true,
      hasExercise: true,
      hasCheckin: true,
      hasVision: true,
    });
    expect(normalizeDate(full)).toBe(readFixture('systemPrompt.full.txt'));
  });

  it('defaults to the full prompt when capabilities are omitted', () => {
    expect(normalizeDate(getSystemPrompt('UTC', 'None'))).toBe(
      readFixture('systemPrompt.full.txt')
    );
  });

  it('renders the core prompt (food+exercise+checkin, no vision) byte-for-byte', () => {
    const core = getSystemPrompt('UTC', 'None', {
      hasFood: true,
      hasExercise: true,
      hasCheckin: true,
      hasVision: false,
    });
    expect(normalizeDate(core)).toBe(readFixture('systemPrompt.core.txt'));
  });

  it('drops every tool-specific block when no capabilities are present', () => {
    // The minimal-floor case (router picked only a non-logging domain): intro,
    // date, and outro survive; the logging sentence, food, check-in, and vision
    // blocks are all gated out with no stray blank lines.
    const minimal = getSystemPrompt('UTC', 'None', {
      hasFood: false,
      hasExercise: false,
      hasCheckin: false,
      hasVision: false,
    });
    expect(normalizeDate(minimal)).toBe(
      [
        'You are Sparky, an AI nutrition and wellness coach. Your primary goal is to help users track their food, exercise, and measurements, and provide helpful advice and motivation based on their data and general health knowledge.',
        'The current local date is <DATE>.',
        'Be precise with data extraction and call the correct tools in the correct order.',
      ].join('\n\n')
    );
  });

  it('lists only the present logging domains in the logging sentence', () => {
    // food + measurements present, exercise absent → "food or measurements".
    const prompt = getSystemPrompt('UTC', 'None', {
      hasFood: true,
      hasExercise: false,
      hasCheckin: true,
      hasVision: false,
    });
    expect(prompt).toContain(
      'When the user mentions logging food or measurements, prioritize using the matching tools.'
    );
  });
});
