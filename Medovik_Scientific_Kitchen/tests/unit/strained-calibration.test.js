'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadMedovik } = require('../harness/load-medovik');

const ctx = loadMedovik();
const {
  calibrateStrainedSourCream,
  registerMeasuredIngredient,
  unregisterMeasuredIngredient
} = ctx.MedovikBench;
const near = (a, b, tol = 2e-4) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

for (const [strained, id] of [[82, 'sour-cream-strained-82'], [88, 'sour-cream-strained-88']]) {
  test(`معايرة 100 → ${strained} تعيد إنتاج السجل المدمج ${id}`, () => {
    const r = calibrateStrainedSourCream({ rawWeightG: 100, strainedWeightG: strained }, ctx.IngredientsDB);
    const ref = ctx.IngredientsDB[id];
    assert.equal(r.ok, true);
    for (const k of ['waterFrac', 'fatFrac', 'proteinFrac', 'sugarFrac']) near(r.record[k], ref[k]);
    assert.equal(r.record.density, ref.density);
    assert.equal(r.record.compositionStatus, 'USER_MEASURED');
  });
}

test('عتبة 0.85: 85 ← كثافة 82، و86 ← كثافة 88', () => {
  const lo = calibrateStrainedSourCream({ rawWeightG: 100, strainedWeightG: 85 }, ctx.IngredientsDB);
  const hi = calibrateStrainedSourCream({ rawWeightG: 100, strainedWeightG: 86 }, ctx.IngredientsDB);
  assert.equal(lo.record.density, ctx.IngredientsDB['sour-cream-strained-82'].density);
  assert.equal(hi.record.density, ctx.IngredientsDB['sour-cream-strained-88'].density);
});

test('مدخلات غير صالحة تعيد ok:false بلا استثناء', () => {
  for (const bad of [[100, 120], [0, 0], [NaN, 50], [-5, 3], [100, 30]]) {
    assert.equal(calibrateStrainedSourCream({ rawWeightG: bad[0], strainedWeightG: bad[1] }, ctx.IngredientsDB).ok, false);
  }
});

test('السجل المقاس لا يتسرب إلى قوائم المختبر ولا إلى المكوّنات المخصصة', () => {
  const db = ctx.IngredientsDB;
  const r = calibrateStrainedSourCream({ rawWeightG: 100, strainedWeightG: 82 }, db);
  registerMeasuredIngredient(db, r.record);
  const entry = ctx.listCanonicalIngredientEntries().find((e) => e.id === 'sour-cream-strained-measured');
  assert.ok(entry);
  assert.equal(entry.labEligible, false);
  assert.equal(ctx.listCanonicalIngredientEntries({ labOnly: true }).some((e) => e.id === 'sour-cream-strained-measured'), false);
  assert.equal(ctx.getCustomIngredients().some((x) => x.id === 'sour-cream-strained-measured'), false);
  unregisterMeasuredIngredient(db, 'sour-cream-strained-measured');
});

test('التسجيل لا يمسّ السجلات المدمجة', () => {
  const db = { ...ctx.IngredientsDB };
  const r = calibrateStrainedSourCream({ rawWeightG: 100, strainedWeightG: 82 }, db);
  registerMeasuredIngredient(db, r.record);
  registerMeasuredIngredient(db, r.record);
  assert.throws(() => registerMeasuredIngredient(db, { ...r.record, id: 'sour-cream-strained-82' }));
  assert.equal(unregisterMeasuredIngredient(db, 'sour-cream-strained-82'), false);
  assert.equal(Object.isFrozen(ctx.BaseIngredientsDB), true);
});

test('تمرير measuredStrain يعيد نتيجة السجل المدمج 82 للحشو classic_sourcream_frosting', () => {
  const db = ctx.IngredientsDB;
  const r = calibrateStrainedSourCream({ rawWeightG: 100, strainedWeightG: 82 }, db);
  registerMeasuredIngredient(db, r.record);
  const mk = () => new ctx.Formula([{ ingredientId: 'sour-cream', weight: 500 }, { ingredientId: 'powdered-sugar', weight: 150 }]);
  const base = ctx.applyMasterFillingYieldModel(mk(), 'classic_sourcream_frosting');
  const meas = ctx.applyMasterFillingYieldModel(
    mk(),
    'classic_sourcream_frosting',
    { measuredStrain: { outputRatio: 0.82, ingredientId: r.record.id } }
  );
  near(base.formula.totalMass(), 560, 1e-6);
  near(meas.formula.totalMass(), 560, 1e-6);
  assert.equal(meas.formula.items[0].ingredientId, 'sour-cream-strained-measured');
  assert.equal(meas.audit.itemAdjustments[0].status, 'USER_MEASURED');

  // كما يمرره Product.prototype.scaleFilling إلى الموضعين
  const geom = new ctx.ProductGeometry({ shape: 'round', d1: 20, layers: 8, fillingThicknessMm: 3, includeOuterCoat: false });
  const f1 = mk();
  f1.sourceFillingId = 'classic_sourcream_frosting';
  const f2 = mk();
  f2.sourceFillingId = 'classic_sourcream_frosting';
  const sBase = new ctx.Product({ geometry: geom, doughFormula: new ctx.Formula([]), fillingFormula: f1 }).scaleFilling({ ingredientsDB: db });
  const sMeas = new ctx.Product({ geometry: geom, doughFormula: new ctx.Formula([]), fillingFormula: f2 }).scaleFilling({
    ingredientsDB: db,
    measuredStrain: { outputRatio: 0.82, ingredientId: r.record.id }
  });
  near(sMeas.preparedRequiredMass, sBase.preparedRequiredMass, 1e-1);
  assert.equal(sMeas.scaledFormula.items[0].ingredientId, 'sour-cream-strained-measured');
  assert.equal(sMeas.yieldAudit.itemAdjustments[0].status, 'USER_MEASURED');

  unregisterMeasuredIngredient(db, r.record.id);
});
