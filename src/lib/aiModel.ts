// Which AI model is actually running, and how to name it on screen.
// The worker heartbeat (scripts/queue_worker.mjs → POST /api/queue) reports the live engine and model,
// so nothing in the UI hardcodes a model name: the app shows what the reporting PC is really running.

/** The live worker state the app already polls; a subset of what /api/queue reports. */
export interface AiModelState {
  engineOnline: boolean;
  engineBusy: boolean;
  /** The worker's live engine: 'antigravity' | 'opencode' | null (never seen). */
  engineEngine: string | null;
  /** The worker's live model id, e.g. 'deepseek-v4.1-flash'; null before the first heartbeat. */
  engineModel: string | null;
}

/** Wording used only while no model has been reported yet (engine rules: AGENTS-free, see queue_worker.mjs). */
export const ENGINE_DEFAULT_LABEL: Record<string, string> = { antigravity: 'Gemini 3.8 Flash High' };

/** Used when neither a model nor a known engine has been reported. */
export const NO_AI_LABEL = 'The AI';

/** Acronyms kept upper-case when a model id is turned into words. */
const ACRONYMS = new Set(['ai', 'gpt', 'glm', 'mimo']);

/** Brand names whose own casing is not title-case; matched case-insensitively, per word. */
const BRANDS: Record<string, string> = { deepseek: 'DeepSeek', minimax: 'MiniMax', longcat: 'LongCat', moonshot: 'Moonshot', openai: 'OpenAI' };

/** 'gemini-3.8-flash-high' → 'Gemini 3.8 Flash High'. An empty id stays empty. */
export function modelLabel(model: string): string {
  return String(model ?? '')
    .trim()
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => ACRONYMS.has(word.toLowerCase()) ? word.toUpperCase() : (BRANDS[word.toLowerCase()] ?? word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}

/** The model the worker is running now: its live model, else the engine's own label, else a neutral "The AI". */
export function aiModelLabel(ai: Pick<AiModelState, 'engineEngine' | 'engineModel'>): string {
  const model = String(ai?.engineModel ?? '').trim();
  if (model) return modelLabel(model);
  return ENGINE_DEFAULT_LABEL[String(ai?.engineEngine ?? '').trim()] ?? NO_AI_LABEL;
}

export interface AiCopy {
  /** "DeepSeek V4.1 Flash is reading the note" */
  reading: string;
  /** "… will pick this note up in a moment. The report fills in here when it's ready." */
  queued: string;
  /** "Let … draft it from the note, or start writing below." */
  noReport: string;
  /** "… ran the AGENTS.md §10 final audit. You still verify before signing." */
  auditNote: string;
}

/** The same four sentences, once naming the model and once without a name. */
export function aiCopy(label: string): { named: AiCopy; generic: AiCopy } {
  const name = String(label ?? '').trim();
  return {
    named: {
      reading: `${name || NO_AI_LABEL} is reading the note`,
      queued: `${name || 'The AI'} will pick this note up in a moment. The report fills in here when it's ready.`,
      noReport: `Let ${name || 'the AI'} draft it from the note, or start writing below.`,
      auditNote: `${name || 'The AI'} ran the AGENTS.md §10 final audit. You still verify before signing.`,
    },
    generic: {
      reading: 'The AI is reading the note',
      queued: "It will pick this note up in a moment. The report fills in here when it's ready.",
      noReport: 'Let the AI draft it from the note, or start writing below.',
      auditNote: 'The AI ran the AGENTS.md §10 final audit. You still verify before signing.',
    },
  };
}
