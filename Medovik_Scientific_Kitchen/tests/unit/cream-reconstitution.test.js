'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadMedovik } = require('../harness/load-medovik');

const near = (a, b, t = 1e-4) => {
  assert.ok(
    Math.abs(a - b) <= t,
    `Expected ${a} to be within ${t} of ${b} (diff: ${Math.abs(a - b)})`
  );
};

test('Task 20: Engineering constants include DEFAULT_CREAM_RECONSTITUTION_RATIO and UNSWEETENED_CREAM_POWDER_SPEC', () => {
  const ctx = loadMedovik();
  const { MEDOVIK_ENGINEERING_CONSTANTS } = ctx;

  const ratio = MEDOVIK_ENGINEERING_CONSTANTS.DEFAULT_CREAM_RECONSTITUTION_RATIO;
  assert.ok(ratio, 'DEFAULT_CREAM_RECONSTITUTION_RATIO must exist');
  assert.equal(ratio.value, 2.0);
  assert.equal(ratio.status, 'APPROVED');

  const spec = MEDOVIK_ENGINEERING_CONSTANTS.UNSWEETENED_CREAM_POWDER_SPEC;
  assert.ok(spec, 'UNSWEETENED_CREAM_POWDER_SPEC must exist');
  assert.equal(spec.status, 'PROPOSED');
  assert.equal(spec.value.fatFrac, 0.66);
  assert.equal(spec.value.waterFrac, 0.03);
});

test('Task 20: MedovikCreamPrep.normalizeCreamPrepConfig normalizes options with safe defaults', () => {
  const ctx = loadMedovik();
  const { MedovikCreamPrep } = ctx;
  assert.ok(MedovikCreamPrep, 'MedovikCreamPrep must be exported');

  // Default config
  const def = MedovikCreamPrep.normalizeCreamPrepConfig();
  assert.equal(def.mode, 'liquid');
  assert.equal(def.liquidType, 'milk');
  assert.equal(def.liquidPerPartPowder, 2.0);
  assert.equal(def.customPowderSpec, null);

  // Custom valid config
  const cfg = MedovikCreamPrep.normalizeCreamPrepConfig({
    mode: 'powder',
    liquidType: 'water',
    liquidPerPartPowder: 1.5
  });
  assert.equal(cfg.mode, 'powder');
  assert.equal(cfg.liquidType, 'water');
  assert.equal(cfg.liquidPerPartPowder, 1.5);

  // Clamped ratio
  assert.equal(MedovikCreamPrep.normalizeCreamPrepConfig({ liquidPerPartPowder: 0.1 }).liquidPerPartPowder, 0.5);
  assert.equal(MedovikCreamPrep.normalizeCreamPrepConfig({ liquidPerPartPowder: 10 }).liquidPerPartPowder, 4.0);
  assert.equal(MedovikCreamPrep.normalizeCreamPrepConfig({ liquidType: 'unknown' }).liquidType, 'milk');
  assert.equal(MedovikCreamPrep.normalizeCreamPrepConfig({ mode: 'other' }).mode, 'liquid');
});

test('Task 20: MedovikCreamPrep.splitWhippedCreamMass splits total cream mass deterministically', () => {
  const ctx = loadMedovik();
  const { MedovikCreamPrep } = ctx;

  // 750g at 1 : 2 ratio -> 250g powder, 500g milk
  const split750 = MedovikCreamPrep.splitWhippedCreamMass({
    totalCreamMassG: 750,
    liquidPerPartPowder: 2.0,
    liquidType: 'milk'
  });
  assert.equal(split750.status, 'DETERMINISTIC');
  assert.equal(split750.totalCreamMassG, 750);
  near(split750.powderMassG, 250);
  near(split750.liquidMassG, 500);
  assert.equal(split750.liquidType, 'milk');
  assert.equal(split750.liquidDisplayName, 'حليب بارد كامل الدسم');
  assert.equal(split750.ratioLabel, '1 : 2');

  // 500g at 1 : 1.5 ratio -> 200g powder, 300g water
  const split500 = MedovikCreamPrep.splitWhippedCreamMass({
    totalCreamMassG: 500,
    liquidPerPartPowder: 1.5,
    liquidType: 'water'
  });
  near(split500.powderMassG, 200);
  near(split500.liquidMassG, 300);
  assert.equal(split500.liquidType, 'water');
  assert.equal(split500.liquidDisplayName, 'ماء مثلج');

  // Invalid or zero mass returns null
  assert.equal(MedovikCreamPrep.splitWhippedCreamMass({ totalCreamMassG: 0 }), null);
  assert.equal(MedovikCreamPrep.splitWhippedCreamMass({ totalCreamMassG: -50 }), null);
});

test('Task 20: analyzeCreamReconstitutionImpact calculates compositional deltas when whipping cream is present', () => {
  const ctx = loadMedovik();
  const { MedovikCreamPrep, buildFillingFormula, getMasterFillingProfile, IngredientsDB } = ctx;
  const profile = getMasterFillingProfile('classic_sourcream_frosting');
  const formula = buildFillingFormula(profile);

  // Inactive when mode is liquid
  const inactive = MedovikCreamPrep.analyzeCreamReconstitutionImpact({
    fillingFormula: formula,
    ingredientsDB: IngredientsDB,
    creamPrepConfig: { mode: 'liquid' }
  });
  assert.equal(inactive.active, false);

  // Active when mode is powder
  const activeMilk = MedovikCreamPrep.analyzeCreamReconstitutionImpact({
    fillingFormula: formula,
    ingredientsDB: IngredientsDB,
    creamPrepConfig: {
      mode: 'powder',
      liquidType: 'milk',
      liquidPerPartPowder: 2.0
    },
    totalRequiredCreamMassG: 600
  });
  assert.equal(activeMilk.active, true);
  assert.ok(activeMilk.split);
  near(activeMilk.split.powderMassG, 200);
  near(activeMilk.split.liquidMassG, 400);
  assert.ok(activeMilk.comparison);
  assert.equal(typeof activeMilk.comparison.waterDeltaG, 'number');
  assert.equal(typeof activeMilk.comparison.solidsDeltaG, 'number');
  assert.equal(typeof activeMilk.comparison.fatDeltaG, 'number');

  // Verify custom IngredientsDB records with waterFrac and fatFrac are respected
  const customDB = {
    ...IngredientsDB,
    milk: { waterFrac: 0.86, fatFrac: 0.04, proteinFrac: 0.035, carbsFrac: 0.05, sugarFrac: 0.05 },
    'whipping-cream': { waterFrac: 0.54, fatFrac: 0.38, proteinFrac: 0.025, carbsFrac: 0.03, sugarFrac: 0.03 }
  };
  const activeCustom = MedovikCreamPrep.analyzeCreamReconstitutionImpact({
    fillingFormula: formula,
    ingredientsDB: customDB,
    creamPrepConfig: { mode: 'powder', liquidType: 'milk', liquidPerPartPowder: 2.0 },
    totalRequiredCreamMassG: 300
  });
  // 300g total: 100g powder (3% water -> 3g water), 200g milk (86% water -> 172g water) => recon water = 175g
  near(activeCustom.reconstituted.waterG, 175);
  // Baseline 300g cream at 54% water => 162g water
  near(activeCustom.baseline.waterG, 162);
  near(activeCustom.comparison.waterDeltaG, 13);
});

test('Task 20: MedovikCreamPrep.buildReconstitutedCreamFormula creates formula with powder and liquid', () => {
  const ctx = loadMedovik();
  const { MedovikCreamPrep, buildFillingFormula, getMasterFillingProfile, IngredientsDB } = ctx;
  const profile = getMasterFillingProfile('classic_sourcream_frosting');
  const formula = buildFillingFormula(profile);

  // Liquid mode returns formula unchanged
  const liquidFormula = MedovikCreamPrep.buildReconstitutedCreamFormula(formula, { mode: 'liquid' }, IngredientsDB);
  assert.equal(liquidFormula, formula);

  // Powder mode replaces whipping-cream with powder + milk
  const reconFormula = MedovikCreamPrep.buildReconstitutedCreamFormula(formula, {
    mode: 'powder',
    liquidType: 'milk',
    liquidPerPartPowder: 2.0
  }, IngredientsDB);
  assert.notEqual(reconFormula, formula);

  const creamItem = formula.items.find(i => i.ingredientId === 'whipping-cream');
  const origCreamWeight = creamItem.weight;

  const powderItem = reconFormula.items.find(i => i.ingredientId === 'unsweetened-cream-powder');
  const milkItem = reconFormula.items.find(i => i.ingredientId === 'milk');
  assert.ok(powderItem, 'Formula must contain unsweetened-cream-powder');
  assert.ok(milkItem, 'Formula must contain milk');
  near(powderItem.weight + milkItem.weight, origCreamWeight);
  near(powderItem.weight, origCreamWeight / 3);
  near(milkItem.weight, (origCreamWeight / 3) * 2);
});
