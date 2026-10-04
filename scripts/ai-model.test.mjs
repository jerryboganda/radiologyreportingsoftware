// Tests for the model-naming helpers (src/lib/aiModel.ts). No patient data.
//   node scripts/ai-model.test.mjs      (Node 22.18+ runs the TypeScript source directly)
// Regression: the reading banner used to name a hardcoded model, so a case read by the OpenCode
// gateway's deepseek-v4.1-flash still said "Gemini 3.8 Flash is reading the note".
import assert from 'node:assert/strict';
import { ENGINE_DEFAULT_LABEL, NO_AI_LABEL, aiCopy, aiModelLabel, modelLabel } from '../src/lib/aiModel.ts';
import { agyModelCatalog } from './queue_worker.mjs';

// Verbatim `agy models` output (agy 1.2.14, 5 Oct 2026): a header line, then id<TAB>label per model.
const AGY_MODELS = `Fetching available models...
gemini-3.8-flash-high\tGemini 3.8 Flash (High)
gemini-3.8-flash-medium\tGemini 3.8 Flash (Medium)
gemini-3.8-flash-low\tGemini 3.8 Flash (Low)
gemini-3.7-flash-high\tGemini 3.7 Flash (High)
gemini-3.7-flash-medium\tGemini 3.7 Flash (Medium)
gemini-3.7-flash-low\tGemini 3.7 Flash (Low)
gemini-3.6-flash-high\tGemini 3.6 Flash (High)
gemini-3.6-flash-medium\tGemini 3.6 Flash (Medium)
gemini-3.6-flash-low\tGemini 3.6 Flash (Low)
gemini-3.1-pro-high\tGemini 3.1 Pro (High)
gemini-3.1-pro-low\tGemini 3.1 Pro (Low)
claude-opus-5-5-low\tClaude Opus 5.5 (Low)
claude-opus-5-5-medium\tClaude Opus 5.5 (Medium)
claude-opus-5-5-high\tClaude Opus 5.5 (High)
claude-sonnet-5-5-low\tClaude Sonnet 5.5 (Low)
claude-sonnet-5-5-medium\tClaude Sonnet 5.5 (Medium)
claude-sonnet-5-5-high\tClaude Sonnet 5.5 (High)
gpt-oss-120b-medium\tGPT-OSS 120B (Medium)
`;

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

test('the Antigravity catalogue keeps every model the CLI lists, with the CLI labels', () => {
  const { models, labels } = agyModelCatalog(AGY_MODELS);
  // The Settings dropdown showed only one hardcoded model; every listed model must reach the app.
  assert.equal(models.length, 18);
  assert.deepEqual(models.slice(0, 3), ['gemini-3.8-flash-high', 'gemini-3.8-flash-medium', 'gemini-3.8-flash-low']);
  assert.ok(models.includes('gemini-3.1-pro-low'));
  assert.ok(models.some((m) => m.startsWith('claude-opus-5-5-')));
  assert.ok(models.some((m) => m.startsWith('claude-sonnet-5-5-')));
  assert.ok(models.includes('gpt-oss-120b-medium'));
  assert.equal(labels['gemini-3.8-flash-high'], 'Gemini 3.8 Flash (High)');
  assert.equal(labels['gpt-oss-120b-medium'], 'GPT-OSS 120B (Medium)');
  assert.ok(!models.includes('Fetching'), 'the header line is not a model');
  assert.ok(!JSON.stringify(models).includes(' '), 'an id never contains a space');
});

test('the catalogue parser survives CRLF, blank lines, help text and duplicate ids', () => {
  const out = 'Fetching available models...\r\n\r\nmodel-a\tModel A (High)\r\nUsage: agy models [flags]\r\nmodel-a\tModel A (High)\r\nmodel-b\t\r\nnotalabel\tonly-a-label\r\n';
  const { models, labels } = agyModelCatalog(out);
  assert.deepEqual(models, ['model-a', 'notalabel'], 'a line without a tab is not a model; a missing label is dropped');
  assert.equal(labels['model-a'], 'Model A (High)');
  assert.deepEqual(agyModelCatalog('').models, []);
  assert.deepEqual(agyModelCatalog(undefined).models, []);
});

console.log(`\nall ${n} ai-model tests passed`);
