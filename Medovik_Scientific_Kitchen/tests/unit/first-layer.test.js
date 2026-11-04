'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadMedovik } = require('../harness/load-medovik');

const ctx = loadMedovik();
const { calibrateFirstBakedLayer, benchContextKey } = ctx.MedovikBench;
const S = ctx.SessionStore;
S.init();
const AREA = Math.PI * 10 * 10;   // قالب دائري قطره 20 سم
const RHO = 50 / (AREA * 0.2);    // الكثافة المقاسة في المثال ≈ 0.795775
const run = () => ctx.FullAnalysis.run(S.resolveProductSpec(), S.resolveActiveRecipeProfile(), S.resolveActiveFillingProfile(), 0, null);
const runWithRecipe = (id) => { S.setRecipe(id); return run(); };
const scaleWith = (mode, doughDensity, measuredBakeYield = null) => {
  const c = run().context;
  return c.product.scaleDough({
    ingredientsDB: ctx.IngredientsDB,
    wastePct: c.config.wastePct,
    mode,
    targetBallWeight: c.config.ballWeight,
    doughProfile: c.doughProfile,
    targetFlourWeight: c.config.targetFlourWeight,
    processFamily: c.recipeProfile.processFamily,
    shapingFamily: c.recipeProfile.shapingFamily,
    doughDensity,
    measuredBakeYield
  });
};

test('طبقة مخبوزة: 60 غ خام، 50 غ مخبوز، قطر 20 سم، سماكات 1.8 و2.0 و2.2', () => {
  const r = calibrateFirstBakedLayer({
    rawLayerWeightG: 60,
    bakedLayerWeightG: 50,
    areaCm2: AREA,
    thicknessPointsMm: [1.8, 2.0, 2.2]
  });
  assert.equal(r.ok, true);
  assert.equal(r.status, 'USER_MEASURED');
  assert.ok(Math.abs(r.avgThicknessMm - 2.0) < 1e-9);
  assert.ok(Math.abs(r.spreadMm - 0.4) < 1e-9);
  assert.ok(Math.abs(r.spreadRelPct - 20) < 1e-9);
  assert.ok(Math.abs(r.bakedDensity - 0.795775) < 1e-6);
  assert.ok(Math.abs(r.bakeYield - 0.833333) < 1e-6);
  assert.ok(Math.abs(r.massLossPct - 16.6667) < 5e-4);
});

test('مدخلات غير صالحة', () => {
  const ok = { rawLayerWeightG: 60, bakedLayerWeightG: 50, areaCm2: 314, thicknessPointsMm: [2] };
  for (const bad of [{ bakedLayerWeightG: 70 }, { areaCm2: 0 }, { thicknessPointsMm: [] }, { thicknessPointsMm: [25] }, { rawLayerWeightG: NaN }]) {
    assert.equal(calibrateFirstBakedLayer({ ...ok, ...bad }).ok, false);
  }
});

test('توثيق: الكثافة الصريحة في volume تحصيل حاصل وفي manualBall فحص حقيقي', () => {
  assert.equal(scaleWith('volume', 0.8).thicknessAudit.status, 'CONSISTENT');
  assert.equal(scaleWith('manualBall', 0.8).thicknessAudit.status, 'CONFLICT');
  assert.equal(scaleWith('volume', null).thicknessAudit.status, 'INSUFFICIENT_DATA');
});

test('الكثافة وحدها تترك وزن العجين 56.77 غ، ومعها العائد المقاس يعود 60 غ', () => {
  const perLayer = (x) => x.netRaw / 8;
  assert.ok(Math.abs(perLayer(scaleWith('volume', RHO)) - 56.7693) < 1e-3);
  const withYield = scaleWith('volume', RHO, 50 / 60);
  assert.ok(Math.abs(perLayer(withYield) - 60) < 1e-3);
  assert.equal(withYield.bakeYieldStatus, 'USER_MEASURED');
  assert.ok(Math.abs(withYield.usedBakeYield - 50 / 60) < 1e-9);
  assert.ok(withYield.warnings.includes('عائد الخبز مقاس؛ الرطوبة النهائية المعروضة ما زالت تقديرًا'));
  assert.equal(scaleWith('volume', RHO).bakeYieldStatus, 'MODEL_ESTIMATE');
  assert.ok(Math.abs(scaleWith('volume', null, null).netRaw - run().context.dough.netRaw) < 1e-9);
});

test('manualBall وflourBasis: العائد المقاس يحدّد الكتلة المخبوزة', () => {
  const x = scaleWith('manualBall', RHO, 0.8);
  assert.ok(Math.abs(x.bakedMass - x.netRaw * 0.8) < 1e-9);
  const f = scaleWith('flourBasis', RHO, 0.8);
  assert.ok(Math.abs(f.bakedMass - f.netRaw * 0.8) < 1e-9);
});

test('قياس بسياق مطابق يُطبَّق، وبسياق مختلف لا يُطبَّق بصمت', () => {
  const base = run();
  const key = benchContextKey({
    doughRecipeId: 'ayaHabib',
    rawSheetThicknessMm: 1.5,
    doughFormula: base.context.product.doughFormula
  });
  S.setBench({
    firstLayer: {
      rawLayerWeightG: 60,
      bakedLayerWeightG: 50,
      areaCm2: AREA,
      thicknessPointsMm: [1.8, 2.0, 2.2],
      measuredAt: '2026-11-03T00:00:00Z',
      context: key
    }
  });
  const applied = run();
  assert.equal(applied.context.dough.densityStatus, 'USER_MEASURED');
  assert.equal(applied.context.dough.bakeYieldStatus, 'USER_MEASURED');
  assert.ok(Math.abs(applied.context.dough.usedBakedDensity - RHO) < 1e-6);
  assert.ok(Math.abs(applied.context.dough.ballWeight - 60) < 1e-3);
  assert.equal(applied.context.benchNotice.applied, true);
  assert.ok(Number.isFinite(applied.context.benchNotice.modelDensity));
  assert.ok(Number.isFinite(applied.context.benchNotice.modelBakeYield));
  assert.ok(Number.isFinite(applied.context.benchNotice.modelBallWeight));

  const other = runWithRecipe('tetyanaSpartak');
  assert.equal(other.context.benchNotice.applied, false);
  assert.equal(other.context.benchNotice.reason, 'context-mismatch');
  assert.notEqual(other.context.dough.densityStatus, 'USER_MEASURED');
});
