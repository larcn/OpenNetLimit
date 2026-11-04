'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadMedovik } = require('../harness/load-medovik');

const SYNTHETIC_FORMULAS = Object.freeze({
  sour_powdered: [
    { ingredientId: 'sour-cream', weight: 500 },
    { ingredientId: 'powdered-sugar', weight: 150 }
  ],
  sour_dulce_powdered: [
    { ingredientId: 'sour-cream', weight: 300 },
    { ingredientId: 'dulce-de-leche', weight: 300 },
    { ingredientId: 'powdered-sugar', weight: 60 }
  ],
  cream_cheese_powdered: [
    { ingredientId: 'whipping-cream', weight: 400 },
    { ingredientId: 'cream-cheese', weight: 200 },
    { ingredientId: 'powdered-sugar', weight: 120 }
  ]
});

test('تكافؤ عند عدم التقييد عبر الصيغ الاصطناعية الثلاث (4 حالات على الأقل)', () => {
  const ctx = loadMedovik();
  const deltas = [-30, -15, 15, 30];
  let unconstrainedCount = 0;

  for (const [name, items] of Object.entries(SYNTHETIC_FORMULAS)) {
    for (const deltaPct of deltas) {
      const legacy = ctx.adjustFillingSweetnessKeepSolidsWater({
        formula: new ctx.Formula(items),
        ingredientsDB: ctx.IngredientsDB,
        deltaPct,
        options: { solver: 'legacy' }
      });
      const bounded = ctx.adjustFillingSweetnessKeepSolidsWater({
        formula: new ctx.Formula(items),
        ingredientsDB: ctx.IngredientsDB,
        deltaPct,
        options: { solver: 'bounded' }
      });

      if (legacy.analysis.compositionLimited === false) {
        unconstrainedCount += 1;
        assert.ok(
          Math.abs(bounded.analysis.factor - legacy.analysis.factor) <= 1e-6,
          `Factor mismatch on ${name} @ ${deltaPct}: ${bounded.analysis.factor} vs ${legacy.analysis.factor}`
        );
        assert.ok(
          Math.abs(bounded.analysis.addedDairyMass - legacy.analysis.addedDairyMass) <= 1e-6,
          `Added dairy mismatch on ${name} @ ${deltaPct}: ${bounded.analysis.addedDairyMass} vs ${legacy.analysis.addedDairyMass}`
        );
      }
    }
  }

  assert.ok(unconstrainedCount >= 4, `Expected >= 4 unconstrained cases, got ${unconstrainedCount}`);
});

test('حالة مقيّدة (ساور كريم 500 + سكر بودرة 150) عند −30% وعند −15%', () => {
  const ctx = loadMedovik();
  const items = SYNTHETIC_FORMULAS.sour_powdered;

  const leg30 = ctx.adjustFillingSweetnessKeepSolidsWater({
    formula: new ctx.Formula(items),
    ingredientsDB: ctx.IngredientsDB,
    deltaPct: -30
  });
  assert.ok(Math.abs(leg30.analysis.factor - 0.7) <= 1e-5);
  assert.equal(leg30.analysis.addedDairyMass, 0);
  assert.ok(Math.abs(leg30.analysis.achievedPct - (-29.1892)) <= 1e-3);

  const bnd30 = ctx.adjustFillingSweetnessKeepSolidsWater({
    formula: new ctx.Formula(items),
    ingredientsDB: ctx.IngredientsDB,
    deltaPct: -30,
    options: { solver: 'bounded' }
  });
  assert.equal(bnd30.analysis.solver, 'bounded-vectors-v1');
  assert.ok(Math.abs(bnd30.analysis.factor - 0.69167) <= 1e-4);
  assert.equal(bnd30.analysis.addedDairyMass, 0);
  assert.ok(Math.abs(bnd30.analysis.achievedPct - (-30.0)) <= 1e-3);
  assert.ok(Math.abs(bnd30.analysis.solverResidual.solidsWaterDriftPct - (-13.603)) <= 0.01);

  const leg15 = ctx.adjustFillingSweetnessKeepSolidsWater({
    formula: new ctx.Formula(items),
    ingredientsDB: ctx.IngredientsDB,
    deltaPct: -15
  });
  assert.ok(Math.abs(leg15.analysis.achievedPct - (-14.5946)) <= 1e-3);

  const bnd15 = ctx.adjustFillingSweetnessKeepSolidsWater({
    formula: new ctx.Formula(items),
    ingredientsDB: ctx.IngredientsDB,
    deltaPct: -15,
    options: { solver: 'bounded' }
  });
  assert.ok(Math.abs(bnd15.analysis.factor - 0.84583) <= 1e-4);
  assert.ok(Math.abs(bnd15.analysis.achievedPct - (-15.0)) <= 1e-3);
});

test('حدّ المعامل factorBounds = { min: 0.8, max: 1.6 } عند طلب −30%', () => {
  const ctx = loadMedovik();
  const items = SYNTHETIC_FORMULAS.sour_powdered;

  const res = ctx.adjustFillingSweetnessKeepSolidsWater({
    formula: new ctx.Formula(items),
    ingredientsDB: ctx.IngredientsDB,
    deltaPct: -30,
    options: {
      solver: 'bounded',
      factorBounds: { min: 0.8, max: 1.6 }
    }
  });
  assert.equal(res.analysis.factor, 0.8);
  assert.equal(res.analysis.compositionLimited, true);
  assert.ok(Math.abs(res.analysis.achievedPct - (-19.4595)) <= 1e-3);
});

test('سقف الألبان compensationCapPct عند طلب +30% يطابق أساس النسبة في applyExternalSweetnessPolicy ويعيد موازنة المعامل', () => {
  const ctx = loadMedovik();
  const items = SYNTHETIC_FORMULAS.sour_powdered;
  const formula = new ctx.Formula(items);
  const baseMass = formula.totalMass(); // 650g
  const compensationCapPct = 10; // capMass = 65g (بينما الحل غير المقيد عند +30% يطلب 150g)
  const expectedCapMass = baseMass * (compensationCapPct / 100);

  const res = ctx.adjustFillingSweetnessKeepSolidsWater({
    formula,
    ingredientsDB: ctx.IngredientsDB,
    deltaPct: 30,
    options: {
      solver: 'bounded',
      compensationCapPct
    }
  });

  assert.equal(res.analysis.compositionLimited, true);
  assert.ok(res.analysis.addedDairyMass <= expectedCapMass + 1e-9);
  assert.ok(Math.abs(res.analysis.addedDairyMass - expectedCapMass) <= 1e-6);
  // وبفضل أولوية الحلاوة يحقق الحل المقيّد +30% بالضبط بتعديل factor بدل ترك فجوة حلاوة
  assert.ok(Math.abs(res.analysis.achievedPct - 30.0) <= 1e-3);
});

test('الوضع الافتراضي legacy محمي بـ SWEETNESS_SOLVER_DEFAULT ويقبل التبديل عبر MedovikSweetnessSolverMode ووصف التدقيق مسجّل', () => {
  const ctx = loadMedovik();
  assert.equal(ctx.MEDOVIK_ENGINEERING_CONSTANTS.SWEETNESS_SOLVER_DEFAULT.value, 'legacy');
  assert.equal(ctx.MEDOVIK_ENGINEERING_CONSTANTS.SWEETNESS_SOLVER_DEFAULT.status, 'OWNER_DECISION');

  const items = SYNTHETIC_FORMULAS.sour_powdered;
  const defRes = ctx.adjustFillingSweetnessKeepSolidsWater({
    formula: new ctx.Formula(items),
    ingredientsDB: ctx.IngredientsDB,
    deltaPct: -30
  });
  assert.equal(defRes.analysis.solver, undefined);
  assert.ok(Math.abs(defRes.analysis.factor - 0.7) <= 1e-6);

  ctx.MedovikSweetnessSolverMode = 'bounded';
  const globalOptIn = ctx.adjustFillingSweetnessKeepSolidsWater({
    formula: new ctx.Formula(items),
    ingredientsDB: ctx.IngredientsDB,
    deltaPct: -30
  });
  assert.equal(globalOptIn.analysis.solver, 'bounded-vectors-v1');
  assert.ok(Math.abs(globalOptIn.analysis.factor - 0.69167) <= 1e-4);

  const audit = ctx.getCalculationAudit('sweetness-bounded');
  assert.ok(audit && audit.id === 'sweetness-bounded');
});
