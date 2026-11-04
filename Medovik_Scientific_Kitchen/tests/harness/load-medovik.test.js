const test = require('node:test');
const assert = require('node:assert/strict');
const { loadMedovik, createMemoryStorage, evalIn } = require('./load-medovik');

test('يحمّل وحدات المشروع بترتيب البناء', () => {
  const ctx = loadMedovik();
  for (const name of ['Formula', 'IngredientsDB', 'BaseIngredientsDB', 'assessModelEvidence',
    'adjustSweetnessWithBalance', 'adjustFillingSweetnessKeepSolidsWater', 'analyzeFormulaGroups',
    'estimateFormulaComponents', 'SessionStore', 'RecipeLabAnalyzer', 'RecipeLabStore',
    'FullAnalysis', 'SweetnessCalculator', 'BatchCalculator']) {
    assert.ok(ctx[name], name);
  }
  assert.ok(Object.keys(ctx.IngredientsDB).length >= 16);
  assert.equal(Object.keys(ctx.BaseIngredientsDB).length, 14);
  assert.equal(typeof ctx.document, 'undefined');
  assert.equal(ctx.window, ctx);
});

test('يدعم createMemoryStorage وevalIn وتمرير storage: null', () => {
  const storage = createMemoryStorage();
  storage.setItem('k', 'v');
  assert.equal(storage.getItem('k'), 'v');
  storage.removeItem('k');
  assert.equal(storage.getItem('k'), null);
  storage.setItem('a', '1');
  storage.clear();
  assert.equal(storage.getItem('a'), null);

  const ctx = loadMedovik({ storage: null });
  assert.equal(ctx.localStorage, null);
  assert.equal(typeof evalIn(ctx, 'SCIENCE_REFERENCE_REGISTRY'), 'object');
});
