// Tests for Create Report: region list/search (src/lib/studies.ts) and owner-typed biodata surviving the AI result (src/lib/report.ts).
//   node scripts/create-report.test.mjs
import assert from 'node:assert/strict';
import { MODALITIES, STUDIES, searchRegions, studyLabel } from '../src/lib/studies.ts';
import { workerResultToColumns } from '../src/lib/report.ts';

assert.ok(MODALITIES.length >= 8);
for (const m of MODALITIES) assert.ok(STUDIES[m].every((g) => g.regions.length > 0), `${m} has an empty group`);

assert.deepEqual(searchRegions('CT', 'kub').map((g) => g.regions).flat(), ['KUB']);
assert.ok(searchRegions('CT', 'ABDOMEN pelvis').flat().length > 0, 'multi-word, case-insensitive');
assert.deepEqual(searchRegions('CT', 'zzzz'), []);
assert.deepEqual(searchRegions('nope', ''), []);
assert.equal(searchRegions('MRI', '').flatMap((g) => g.regions).length, STUDIES.MRI.flatMap((g) => g.regions).length, 'empty query keeps all regions');
assert.equal(studyLabel('CT', 'Abdomen and pelvis'), 'CT: Abdomen and pelvis');
assert.equal(studyLabel('', ' Knee '), 'Knee');

const ai = { status: 'READY', patientName: '', age: '', gender: 'F', tokenNumber: '', mrNumber: '', modality: 'x', studyDate: '', referringClinician: '', clinicalHistory: '', comparison: '', technique: '', findings: [], impression: [], recommendations: [], isUrgent: false, urgentFindings: '', verbatimTranscription: '', verificationSheet: '' };
const typed = { patientName: 'Test A', age: '52 Years', gender: 'Male', sourceText: 'liver enlarged' };
const merged = workerResultToColumns(ai, typed);
assert.deepEqual([merged.patientName, merged.age, merged.gender], ['Test A', '52 Years', 'Male'], 'typed values beat AI blanks and AI guesses');
const photo = workerResultToColumns(ai, { ...typed, sourceText: null });
assert.deepEqual([photo.patientName, photo.gender], ['', 'F'], 'photo cases keep the AI reading');
assert.equal(workerResultToColumns({ ...ai, patientName: 'AI' }, { ...typed, patientName: '' }).patientName, 'AI', 'blank typed field falls back to the AI');
console.log('create-report checks passed');
