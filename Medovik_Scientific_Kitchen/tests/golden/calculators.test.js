'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadMedovik } = require('../harness/load-medovik');
const { assertGolden } = require('../helpers/golden');

const DOUGH_IDS = [
  'ayaHabib',
  'hebaAbuElKhair',
  'ahmedYounis',
  'ahmedShouqi',
  'tetyanaClassic',
  'tetyanaSpartak',
  'smittenKitchen',
  'davidCooking',
  'dinaFamily'
];

const FILLING_IDS = [
  'classic_sourcream_frosting',
  'classic_dulce_sourcream',
  'shouqi_1',
  'shouqi_2',
  'shouqi_3',
  'ayahabib',
  'hiba',
  'younis_cream1',
  'younis_cream2'
];

function extractNumericTree(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (Array.isArray(value)) {
    const items = Array.from(value, extractNumericTree).filter(entry => entry !== undefined);
    return items.length > 0 ? items : undefined;
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value)) {
      const extracted = extractNumericTree(value[key]);
      if (extracted !== undefined) {
        out[key] = extracted;
      }
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
  return undefined;
}

test('golden: pipeline across all 9 doughs x 9 fillings', () => {
  const ctx = loadMedovik();
  const out = {};

  for (const d of DOUGH_IDS) {
    for (const f of FILLING_IDS) {
      ctx.SessionStore.reset();
      ctx.SessionStore.setRecipe(d);
      ctx.SessionStore.setFilling(f);

      const res = ctx.FullAnalysis.run(
        ctx.SessionStore.resolveProductSpec(),
        ctx.SessionStore.resolveActiveRecipeProfile(),
        ctx.SessionStore.resolveActiveFillingProfile(),
        0,
        null
      );

      assert.equal(res.context.dough.thicknessAudit.status, 'INSUFFICIENT_DATA');
      const sumParts =
        res.context.filling.interiorRequiredMass +
        res.context.filling.topRequiredMass +
        res.context.filling.sideRequiredMass;
      assert.ok(
        Math.abs(sumParts - res.context.filling.onCakeRequiredMass) < 1e-9,
        `Expected interior + top + side === onCakeRequiredMass for ${d} x ${f}`
      );

      out[`${d}__${f}`] = {
        dough: {
          bakedMass: res.context.dough.bakedMass,
          netRaw: res.context.dough.netRaw,
          ballWeight: res.context.dough.ballWeight,
          densityStatus: res.context.dough.densityStatus,
          thicknessAudit: {
            status: res.context.dough.thicknessAudit.status
          }
        },
        filling: {
          interiorRequiredMass: res.context.filling.interiorRequiredMass,
          topRequiredMass: res.context.filling.topRequiredMass,
          sideRequiredMass: res.context.filling.sideRequiredMass,
          onCakeRequiredMass: res.context.filling.onCakeRequiredMass
        },
        sweetness: {
          equivPer100: res.context.sweetness.equivPer100
        }
      };
    }
  }

  assertGolden('pipeline', out);
});

test('golden: sweetness-stack across 9 fillings x 6 deltas x accepted targets', () => {
  const ctx = loadMedovik();
  const deltas = [-30, -15, -5, 5, 15, 30];
  const candidateTargets = ['filling', 'dough', 'both'];
  const out = {};

  for (const f of FILLING_IDS) {
    ctx.SessionStore.reset();
    ctx.SessionStore.setRecipe('ayaHabib');
    ctx.SessionStore.setFilling(f);

    const spec = ctx.SessionStore.resolveProductSpec();
    const recipe = ctx.SessionStore.resolveActiveRecipeProfile();
    const filling = ctx.SessionStore.resolveActiveFillingProfile();
    const acceptedTargets = candidateTargets.filter(
      target => ctx.normalizeSweetnessSettings(0, target).target === target
    );

    out[f] = {};
    for (const target of acceptedTargets) {
      out[f][target] = {};
      for (const deltaPct of deltas) {
        const res = ctx.SweetnessCalculator.calculate(spec, recipe, filling, deltaPct, target);
        const { context: _omitContext, primaryReading, ...rest } = res;
        const cleanPrimaryReading = primaryReading
          ? {
              value: primaryReading.value,
              ratingBasisValue: primaryReading.ratingBasisValue,
              meterMax: primaryReading.meterMax
            }
          : null;
        out[f][target][String(deltaPct)] = extractNumericTree({
          ...rest,
          primaryReading: cleanPrimaryReading
        });
      }
    }
  }

  assertGolden('sweetness-stack', out);
});

test('golden: solver-synthetic across 3 synthetic formulas x 4 deltas', () => {
  const ctx = loadMedovik();
  const syntheticFormulas = {
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
  };
  const deltas = [-30, -15, 15, 30];
  const out = {};

  for (const [name, items] of Object.entries(syntheticFormulas)) {
    out[name] = {};
    for (const deltaPct of deltas) {
      const formula = new ctx.Formula(items);
      const res = ctx.adjustFillingSweetnessKeepSolidsWater({
        formula,
        ingredientsDB: ctx.IngredientsDB,
        deltaPct,
        options: null
      });
      out[name][String(deltaPct)] = res.analysis;
    }
  }

  assertGolden('solver-synthetic', out);
});

test('golden: recipe-lab analyze all library records and compare adjacent same-kind pairs', () => {
  const ctx = loadMedovik();
  ctx.RecipeLabStore.init();

  const analyzed = {};
  const compared = { dough: {}, filling: {} };

  for (const kind of ['dough', 'filling']) {
    const records = ctx.RecipeLabStore.listRecords(kind);
    for (const record of records) {
      analyzed[record.id] = ctx.RecipeLabAnalyzer.analyze(record);
    }
    for (let i = 0; i < records.length - 1; i += 1) {
      const left = records[i];
      const right = records[i + 1];
      compared[kind][`${left.id}__vs__${right.id}`] = ctx.RecipeLabAnalyzer.compare(left, right);
    }
  }

  assertGolden('recipe-lab', { analyzed, compared });
});

test('golden: tempering calculator on 3 test input samples', () => {
  const ctx = loadMedovik();
  const samples = {
    sample_1: ctx.TemperingCalculator.calculate(3, 20, 400, 80, 4, 'HOT_BASE_INTO_EGG'),
    sample_2: ctx.TemperingCalculator.calculate(150, 8, 350, 85, 4, 'HOT_BASE_INTO_EGG'),
    sample_3: ctx.TemperingCalculator.calculate(200, 22, 500, 72, 4, 'HOT_BASE_INTO_EGG')
  };

  assertGolden('tempering', samples);
});
