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

test('Task 19: PRODUCT_SPEC_LIMITS and normalizeProductSpec support 5 scale modes', () => {
  const ctx = loadMedovik();
  const { normalizeProductSpec, PRODUCT_SPEC_LIMITS } = ctx;

  assert.ok(PRODUCT_SPEC_LIMITS.targetTotalDoughWeight, 'targetTotalDoughWeight should be in PRODUCT_SPEC_LIMITS');
  assert.deepEqual(PRODUCT_SPEC_LIMITS.targetTotalDoughWeight, [20, 100000]);

  const allowedModes = ['volume', 'rawThickness', 'manualBall', 'totalDoughWeight', 'flourBasis'];
  for (const mode of allowedModes) {
    const spec = normalizeProductSpec({ scaleMode: mode }).value;
    assert.equal(spec.scaleMode, mode, `scaleMode ${mode} should be accepted`);
  }

  // Check fallback for unknown mode
  assert.equal(normalizeProductSpec({ scaleMode: 'invalid_mode' }).value.scaleMode, 'volume');

  // Check targetTotalDoughWeight normalization
  assert.equal(normalizeProductSpec({ targetTotalDoughWeight: 1250 }).value.targetTotalDoughWeight, 1250);
  assert.equal(normalizeProductSpec({ targetTotalDoughWeight: -5 }).value.targetTotalDoughWeight, 20);
  assert.equal(normalizeProductSpec({}).value.targetTotalDoughWeight, 1000);
  assert.equal(normalizeProductSpec({ totalDoughMassBasis: 'net' }).value.totalDoughMassBasis, 'net');
  assert.equal(normalizeProductSpec({ totalDoughMassBasis: 'prepared' }).value.totalDoughMassBasis, 'prepared');
  assert.equal(normalizeProductSpec({ totalDoughMassBasis: 'other' }).value.totalDoughMassBasis, 'prepared');
});

test('Task 19: rawThickness scaling mode calculates netRaw from rawSheetVolume and usedRawDensity', () => {
  const ctx = loadMedovik();
  const { Product, ProductGeometry, buildRecipeFormula, MEDOVIK_RECIPE_PROFILES, IngredientsDB } = ctx;
  const classicProfile = MEDOVIK_RECIPE_PROFILES.ayaHabib;
  assert.ok(classicProfile, 'classic dough profile must exist');

  const geom = new ProductGeometry({
    shape: 'round',
    d1: 20,
    layers: 8,
    rawSheetThicknessMm: 1.5,
    wastePct: 10,
    scaleMode: 'rawThickness'
  });

  const product = new Product({
    geometry: geom,
    doughFormula: buildRecipeFormula(classicProfile),
    fillingFormula: new ctx.Formula([])
  });

  const res = product.scaleDough({
    ingredientsDB: IngredientsDB,
    wastePct: 10,
    mode: 'rawThickness'
  });

  assert.equal(res.scaleMode, 'rawThickness');
  assert.equal(res.estimatedRawThicknessMm, 1.5);
  assert.ok(res.usedRawDensity > 1.0, `usedRawDensity should be ~1.2-1.3, got ${res.usedRawDensity}`);
  assert.equal(res.rawDensityStatus, 'MODEL_ESTIMATE');

  const rawVol = product.geometry.rawSheetVolume();
  const expectedNetRaw = rawVol * res.usedRawDensity;
  near(res.netRaw, expectedNetRaw, 1e-4);
  near(res.totalRaw, expectedNetRaw / 0.9, 1e-4);
  near(res.ballWeight, res.netRaw / 8, 1e-4);
  assert.ok(res.estimatedThicknessMm > 0, 'estimatedThicknessMm must be positive');
});

test('Task 19: Bidirectional invertibility between rawThickness and volume modes', () => {
  const ctx = loadMedovik();
  const { Product, ProductGeometry, buildRecipeFormula, MEDOVIK_RECIPE_PROFILES, IngredientsDB } = ctx;
  const classicProfile = MEDOVIK_RECIPE_PROFILES.ayaHabib;

  const rawThicknessInput = 1.5;
  const geomRaw = new ProductGeometry({
    shape: 'round',
    d1: 20,
    layers: 8,
    rawSheetThicknessMm: rawThicknessInput,
    wastePct: 10,
    scaleMode: 'rawThickness'
  });

  const prodRaw = new Product({
    geometry: geomRaw,
    doughFormula: buildRecipeFormula(classicProfile),
    fillingFormula: new ctx.Formula([])
  });

  const resRaw = prodRaw.scaleDough({
    ingredientsDB: IngredientsDB,
    wastePct: 10,
    mode: 'rawThickness'
  });

  const derivedBakedThickness = resRaw.estimatedThicknessMm;
  assert.ok(derivedBakedThickness > 0);

  // Now create a product driven by volume with the exact derived baked thickness
  const geomVol = new ProductGeometry({
    shape: 'round',
    d1: 20,
    layers: 8,
    targetBakedLayerThicknessMm: derivedBakedThickness,
    wastePct: 10,
    scaleMode: 'volume'
  });

  const prodVol = new Product({
    geometry: geomVol,
    doughFormula: buildRecipeFormula(classicProfile),
    fillingFormula: new ctx.Formula([])
  });

  const resVol = prodVol.scaleDough({
    ingredientsDB: IngredientsDB,
    wastePct: 10,
    mode: 'volume'
  });

  // Both directions must yield the same masses and thicknesses within 1e-4
  near(resVol.netRaw, resRaw.netRaw, 1e-4);
  near(resVol.totalRaw, resRaw.totalRaw, 1e-4);
  near(resVol.ballWeight, resRaw.ballWeight, 1e-4);
  near(resVol.estimatedRawThicknessMm, rawThicknessInput, 1e-4);
  near(resVol.estimatedThicknessMm, derivedBakedThickness, 1e-4);
});

test('Task 19: totalDoughWeight mode with prepared basis and net basis', () => {
  const ctx = loadMedovik();
  const { Product, ProductGeometry, buildRecipeFormula, MEDOVIK_RECIPE_PROFILES, IngredientsDB } = ctx;
  const classicProfile = MEDOVIK_RECIPE_PROFILES.ayaHabib;

  // Case A: prepared basis = 1000g, 10% waste, 8 layers
  const geomA = new ProductGeometry({
    shape: 'round',
    d1: 20,
    layers: 8,
    targetTotalDoughWeight: 1000,
    totalDoughMassBasis: 'prepared',
    wastePct: 10,
    scaleMode: 'totalDoughWeight'
  });

  const prodA = new Product({
    geometry: geomA,
    doughFormula: buildRecipeFormula(classicProfile),
    fillingFormula: new ctx.Formula([])
  });

  const resA = prodA.scaleDough({
    ingredientsDB: IngredientsDB,
    wastePct: 10,
    mode: 'totalDoughWeight',
    targetTotalDoughWeight: 1000,
    totalDoughMassBasis: 'prepared'
  });

  near(resA.totalRaw, 1000, 1e-4);
  near(resA.netRaw, 900, 1e-4);
  near(resA.ballWeight, 900 / 8, 1e-4);
  assert.ok(resA.estimatedRawThicknessMm > 0);
  assert.ok(resA.estimatedThicknessMm > 0);

  // Case B: net basis = 800g, 10% waste, 8 layers
  const geomB = new ProductGeometry({
    shape: 'round',
    d1: 20,
    layers: 8,
    targetTotalDoughWeight: 800,
    totalDoughMassBasis: 'net',
    wastePct: 10,
    scaleMode: 'totalDoughWeight'
  });

  const prodB = new Product({
    geometry: geomB,
    doughFormula: buildRecipeFormula(classicProfile),
    fillingFormula: new ctx.Formula([])
  });

  const resB = prodB.scaleDough({
    ingredientsDB: IngredientsDB,
    wastePct: 10,
    mode: 'totalDoughWeight',
    targetTotalDoughWeight: 800,
    totalDoughMassBasis: 'net'
  });

  near(resB.netRaw, 800, 1e-4);
  near(resB.ballWeight, 100, 1e-4);
  near(resB.totalRaw, 800 / 0.9, 1e-4);
  assert.ok(resB.estimatedRawThicknessMm > 0);
  assert.ok(resB.estimatedThicknessMm > 0);
});

test('Task 19: manualBall mode computes both estimatedRawThicknessMm and estimatedThicknessMm', () => {
  const ctx = loadMedovik();
  const { Product, ProductGeometry, buildRecipeFormula, MEDOVIK_RECIPE_PROFILES, IngredientsDB } = ctx;
  const classicProfile = MEDOVIK_RECIPE_PROFILES.ayaHabib;

  const geom = new ProductGeometry({
    shape: 'round',
    d1: 20,
    layers: 10,
    ballWeight: 120,
    wastePct: 10,
    scaleMode: 'manualBall'
  });

  const prod = new Product({
    geometry: geom,
    doughFormula: buildRecipeFormula(classicProfile),
    fillingFormula: new ctx.Formula([])
  });

  const res = prod.scaleDough({
    ingredientsDB: IngredientsDB,
    wastePct: 10,
    mode: 'manualBall',
    targetBallWeight: 120
  });

  near(res.netRaw, 1200, 1e-4);
  near(res.ballWeight, 120, 1e-4);
  assert.ok(res.estimatedRawThicknessMm > 0);
  assert.ok(res.estimatedThicknessMm > 0);
  assert.equal(res.rawDensityStatus, 'MODEL_ESTIMATE');
});

test('Task 19: runtime context updates product.geometry.estimatedBakedLayerThicknessMm when scaleMode !== volume', () => {
  const ctx = loadMedovik();
  const { BatchCalculator, MEDOVIK_RECIPE_PROFILES, getMasterFillingProfile } = ctx;
  const dough = MEDOVIK_RECIPE_PROFILES.ayaHabib;
  const filling = getMasterFillingProfile('classic_sourcream_frosting');

  const config = {
    shape: 'round',
    d1: 20,
    layers: 8,
    targetTotalDoughWeight: 1200,
    totalDoughMassBasis: 'prepared',
    scaleMode: 'totalDoughWeight',
    wastePct: 10
  };

  const batch = BatchCalculator.calculate(config, dough, 0, filling);
  const runtime = batch.context;
  assert.equal(runtime.config.scaleMode, 'totalDoughWeight');
  assert.ok(runtime.config.estimatedBakedLayerThicknessMm > 0);
  assert.equal(runtime.config.estimatedBakedLayerThicknessMm, runtime.dough.estimatedThicknessMm);
  // Stack height should match the estimated baked thickness, including the filling gaps
  const expectedStack = 8 * runtime.dough.estimatedThicknessMm + 7 * runtime.config.fillingThicknessMm;
  near(batch.stackHeight, expectedStack, 0.01);
});
