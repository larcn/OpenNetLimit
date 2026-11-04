'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadMedovik } = require('../harness/load-medovik');

function makeFormula(ctx, items) {
  return new ctx.Formula(items.map(([ingredientId, weight]) => ({ ingredientId, weight })));
}

test('ساور كريم 100 غ: ماء 63 غ وماء كلي 63%', () => {
  const ctx = loadMedovik();
  assert.ok(ctx.MedovikMoisture, 'Expected global.MedovikMoisture');
  const { analyzeMoistureProfile } = ctx.MedovikMoisture;

  const p = analyzeMoistureProfile(makeFormula(ctx, [['sour-cream', 100]]), ctx.IngredientsDB);
  assert.equal(p.status, 'DETERMINISTIC');
  assert.equal(p.totalWaterG, 63);
  assert.equal(p.moisturePctOfMass, 63);
  assert.equal(p.sources[0].ingredientId, 'sour-cream');
  assert.equal(p.sources[0].shareOfWaterPct, 100);
});

test('دقيق 300 + عسل 100: ماء 53 غ، نسبة الماء الكلي 13.25%، وحصص الماء مرتبة تنازليًا', () => {
  const ctx = loadMedovik();
  const { analyzeMoistureProfile } = ctx.MedovikMoisture;

  const p = analyzeMoistureProfile(
    makeFormula(ctx, [
      ['honey', 100],
      ['flour', 300]
    ]),
    ctx.IngredientsDB
  );
  assert.equal(p.totalWaterG, 53);
  assert.ok(Math.abs(p.moisturePctOfMass - 13.25) < 1e-9);
  assert.equal(p.sources[0].ingredientId, 'flour');
  assert.ok(Math.abs(p.sources[0].shareOfWaterPct - 67.9245) < 5e-4);
  assert.equal(p.sources[1].ingredientId, 'honey');
  assert.ok(Math.abs(p.sources[1].shareOfWaterPct - 32.0755) < 5e-4);
});

test('مكوّن مجهول أو تغطية دون 0.90 أو صيغة فارغة: INSUFFICIENT_EVIDENCE بلا استثناء', () => {
  const ctx = loadMedovik();
  const { analyzeMoistureProfile } = ctx.MedovikMoisture;

  const u = analyzeMoistureProfile(
    makeFormula(ctx, [
      ['no-such-ingredient', 50],
      ['sour-cream', 50]
    ]),
    ctx.IngredientsDB
  );
  assert.equal(u.status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(u.moisturePctOfMass, null);
  assert.equal(u.totalWaterG, null);
  assert.deepEqual(Array.from(u.sources), []);
  assert.ok(typeof u.reason === 'string' && u.reason.length > 0);

  const empty = analyzeMoistureProfile(makeFormula(ctx, []), ctx.IngredientsDB);
  assert.equal(empty.status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(empty.moisturePctOfMass, null);
});

test('حمل الترطيب: حشو ساور كريم مع عجين صافٍ دقيق 300 + عسل 100', () => {
  const ctx = loadMedovik();
  const { computeHydrationLoad } = ctx.MedovikMoisture;

  const r = computeHydrationLoad(
    {
      fillingFormula: makeFormula(ctx, [['sour-cream', 100]]),
      interiorRequiredMassG: 300,
      topRequiredMassG: 50,
      sideRequiredMassG: 30,
      doughNetFormula: makeFormula(ctx, [
        ['flour', 300],
        ['honey', 100]
      ])
    },
    ctx.IngredientsDB
  );

  assert.equal(r.status, 'BOUNDED_ESTIMATE');
  assert.equal(r.dryCrumbSolidsG, 347);
  assert.ok(Math.abs(r.interiorLoadPer100gDry - 54.4669) < 5e-4);
  assert.ok(Math.abs(r.topLoadPer100gDry - 9.0778) < 5e-4);
  assert.ok(Math.abs(r.sideLoadPer100gDry - 5.4467) < 5e-4);
  assert.ok(Math.abs(r.totalLoadPer100gDry - 68.9914) < 5e-4);
  assert.ok(Math.abs(r.totalWaterG - 239.4) < 1e-9);
});

test('كتلة جافة صفرية أو كتلة حشو سالبة أو تغطية ناقصة: INSUFFICIENT_EVIDENCE', () => {
  const ctx = loadMedovik();
  const { computeHydrationLoad } = ctx.MedovikMoisture;

  const badNeg = computeHydrationLoad(
    {
      fillingFormula: makeFormula(ctx, [['sour-cream', 100]]),
      interiorRequiredMassG: -1,
      topRequiredMassG: 0,
      sideRequiredMassG: 0,
      doughNetFormula: makeFormula(ctx, [['flour', 100]])
    },
    ctx.IngredientsDB
  );
  assert.equal(badNeg.status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(badNeg.interiorLoadPer100gDry, null);

  const badCoverage = computeHydrationLoad(
    {
      fillingFormula: makeFormula(ctx, [['unknown-x', 100]]),
      interiorRequiredMassG: 200,
      topRequiredMassG: 20,
      sideRequiredMassG: 20,
      doughNetFormula: makeFormula(ctx, [['flour', 100]])
    },
    ctx.IngredientsDB
  );
  assert.equal(badCoverage.status, 'INSUFFICIENT_EVIDENCE');
});

test('تكاملي مع FullAnalysis.run لـ ayaHabib + classic_sourcream_frosting', () => {
  const ctx = loadMedovik();
  const { computeHydrationLoad } = ctx.MedovikMoisture;

  ctx.SessionStore.reset();
  ctx.SessionStore.setRecipe('ayaHabib');
  ctx.SessionStore.setFilling('classic_sourcream_frosting');

  const analysis = ctx.FullAnalysis.run(
    ctx.SessionStore.resolveProductSpec(),
    ctx.SessionStore.resolveActiveRecipeProfile(),
    ctx.SessionStore.resolveActiveFillingProfile(),
    0,
    null
  );

  const load = computeHydrationLoad(
    {
      fillingFormula: analysis.context.filling.scaledFormula || analysis.context.fillingFormula,
      interiorRequiredMassG: analysis.context.filling.interiorRequiredMass,
      topRequiredMassG: analysis.context.filling.topRequiredMass,
      sideRequiredMassG: analysis.context.filling.sideRequiredMass,
      doughNetFormula: analysis.context.dough.netFormula
    },
    ctx.IngredientsDB
  );

  assert.equal(load.status, 'BOUNDED_ESTIMATE');
  assert.ok(
    Math.abs((load.interiorWaterG + load.topWaterG + load.sideWaterG) - load.totalWaterG) < 1e-9
  );
});
