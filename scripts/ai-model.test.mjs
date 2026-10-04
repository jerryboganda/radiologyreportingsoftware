// Tests for the model-naming helpers (src/lib/aiModel.ts). No patient data.
//   node scripts/ai-model.test.mjs      (Node 22.18+ runs the TypeScript source directly)
// Regression: the reading banner used to name a hardcoded model, so a case read by the OpenCode
// gateway's deepseek-v4.1-flash still said "Gemini 3.8 Flash is reading the note".
import assert from 'node:assert/strict';
import { ENGINE_DEFAULT_LABEL, NO_AI_LABEL, aiCopy, aiModelLabel, modelLabel } from '../src/lib/aiModel.ts';

const state = (engineModel, engineEngine = 'opencode') => ({ engineOnline: true, engineBusy: true, engineEngine, engineModel });
let n = 0;
const test = (name, fn) => {
  fn();
  console.log(`✓ ${++n}. ${name}`);
};

test('the reported regression: the banner names the model the worker is running', () => {
  const label = aiModelLabel(state('deepseek-v4.1-flash'));
  assert.equal(label, 'DeepSeek V4.1 Flash');
  assert.equal(aiCopy(label).named.reading, 'DeepSeek V4.1 Flash is reading the note');
  assert.ok(!/gemini/i.test(label), 'no other engine may be named');
  assert.ok(!/gemini/i.test(aiCopy(label).named.queued + aiCopy(label).named.auditNote + aiCopy(label).named.noReport));
});

test('model ids become readable names, acronyms kept upper-case', () => {
  assert.equal(modelLabel('gemini-3.8-flash-high'), 'Gemini 3.8 Flash High');
  assert.equal(modelLabel('glm-5.3-flash'), 'GLM 5.3 Flash');
  assert.equal(modelLabel('gpt-6-luna'), 'GPT 6 Luna');
  assert.equal(modelLabel('mimo-v2.6-flash'), 'MIMO V2.6 Flash');
  assert.equal(modelLabel('qwen3.8-flash'), 'Qwen3.8 Flash');
  assert.equal(modelLabel('deepseek-v4.1-flash-fast'), 'DeepSeek V4.1 Flash Fast');
  assert.equal(modelLabel('  spaced-id  '), 'Spaced Id');
});

test('unknown or missing model falls back without naming another engine', () => {
  assert.equal(modelLabel(''), '');
  assert.equal(aiModelLabel({ engineEngine: 'opencode', engineModel: '' }), NO_AI_LABEL);
  assert.equal(aiModelLabel({ engineEngine: 'opencode', engineModel: null }), NO_AI_LABEL);
  assert.equal(aiModelLabel({ engineEngine: null, engineModel: null }), NO_AI_LABEL);
  // Engine known, model not yet reported: the engine's own default wording.
  assert.equal(aiModelLabel({ engineEngine: 'antigravity', engineModel: null }), ENGINE_DEFAULT_LABEL.antigravity);
  assert.equal(aiModelLabel({ engineEngine: 'antigravity', engineModel: '   ' }), 'Gemini 3.8 Flash High');
});

test('the generic copy names nobody, so an unknown engine never shows a wrong name', () => {
  const copy = aiCopy(NO_AI_LABEL);
  assert.equal(copy.named.reading, 'The AI is reading the note');
  assert.equal(copy.generic.reading, 'The AI is reading the note');
  assert.ok(!/gemini|deepseek/i.test(Object.values(copy.named).join(' ') + Object.values(copy.generic).join(' ')));
  // An empty label is treated as unknown rather than printing " is reading the note".
  assert.equal(aiCopy('').named.reading, 'The AI is reading the note');
  assert.equal(aiCopy('').named.noReport, 'Let the AI draft it from the note, or start writing below.');
});

console.log(`\nall ${n} ai-model tests passed`);
