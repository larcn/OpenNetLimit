#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const LOAD_ORDER = [
  'core/domain-utils.js','core/formula.js','core/science-model.js','core/model-evidence.js','core/geometry.js','core/thickness-consistency.js','core/balance.js','core/product.js',
  'ingredients/ingredient-references.js','data/ingredients-db.js','ingredients/dough-profiles.js',
  'data/filling-rules.js','data/master-fillings-data.js','data/recipes.js','data/filling-catalog.js','data/science-content.js','data/evidence-register.js','data/reference-library.js','data/protocol-schema.js','data/protocol-authority.js',
  'tempering.js','app-calculators.js','runtime/session-store.js','runtime/recipe-lab-store.js','runtime/runbook-compiler.js','runtime/workflow-context.js'
];

function makeStorage({ failWrites = false } = {}) {
  return {
    data: Object.create(null),
    getItem(key) { return Object.prototype.hasOwnProperty.call(this.data, key) ? this.data[key] : null; },
    setItem(key, value) { if (failWrites) throw new Error('quota exceeded'); this.data[key] = String(value); },
    removeItem(key) { delete this.data[key]; }
  };
}

function loadContext(storage = makeStorage(), logger = console) {
  const context = { console: logger, structuredClone: global.structuredClone, setTimeout, clearTimeout, localStorage: storage };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  for (const file of LOAD_ORDER) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
  }
  return context;
}

let passed = 0;
const results = [];
function test(name, fn) {
  try {
    fn();
    passed += 1;
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error.stack || String(error) });
  }
}
function approx(actual, expected, tolerance = 1e-6) {
  assert.ok(Number.isFinite(actual), `Expected finite value, got ${actual}`);
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected} ± ${tolerance}`);
}
function allFinite(value, trail = 'root') {
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value), `Non-finite number at ${trail}: ${value}`);
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => allFinite(item, `${trail}[${i}]`));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => allFinite(item, `${trail}.${key}`));
  }
}

const c = loadContext();
const recipes = c.MEDOVIK_RECIPE_PROFILES;
const fillings = c.FILLING_CATALOG;
const db = c.IngredientsDB;
const defaultSpec = {
  shape:'round', d1:20, d2:30, layers:8,
  rawSheetThicknessMm:1.5, targetBakedLayerThicknessMm:2, estimatedBakedLayerThicknessMm:2,
  fillingThicknessMm:3, includeOuterCoat:true, topCoatThicknessMm:2, sideCoatThicknessMm:2,
  wastePct:10, scaleMode:'volume', ballWeight:140, targetFlourWeight:500
};

test('Design filling density is not misrepresented as measured', () => {
  const formula = new c.Formula([{ ingredientId:'sugar', weight:100 }, { ingredientId:'cream-35', weight:200 }]);
  const engineering = c.estimateFillingDensity(formula, db, {designDensity:0.78,designDensitySource:'ENGINEERING_DEFAULT'});
  assert.strictEqual(engineering.densityStatus,'ENGINEERING_DEFAULT');
  const user = c.estimateFillingDensity(formula, db, {designDensity:0.78,designDensitySource:'USER_MEASURED'});
  assert.strictEqual(user.densityStatus,'USER_MEASURED');
  const product = new c.Product({geometry:defaultSpec, doughFormula:null, fillingFormula:formula});
  const result = product.scaleFilling({ingredientsDB:db,designDensity:0.78,designDensitySource:'ENGINEERING_DEFAULT'});
  assert.strictEqual(result.densityAudit.densityStatus,'ENGINEERING_DEFAULT');
});

test('Filling volume scaling refuses unknown density but mass input remains usable',()=>{
  const formula = new c.Formula([{ingredientId:'not-in-db',weight:180},{ingredientId:'sugar',weight:20}]);
  const product = new c.Product({geometry:defaultSpec,doughFormula:null,fillingFormula:formula});
  const volume=product.scaleFilling({ingredientsDB:db});
  assert.strictEqual(volume.mixDensity,null);
  assert.strictEqual(volume.requiredMass,0);
  assert.strictEqual(volume.densityAudit.densityStatus,'UNSUPPORTED');
  assert.ok(volume.densityWarnings.some(x=>x.includes('كثافة')));
  const manual=product.scaleFilling({ingredientsDB:db,targetTotalMass:400});
  assert.strictEqual(manual.requiredMass,400);
  assert.strictEqual(manual.mixDensity,null);
});

test('All expected recipes and fillings are present', () => {
  assert.strictEqual(Object.keys(recipes).length, 9);
  assert.strictEqual(Object.keys(fillings).length, 9);
});

test('Every ingredient record passes centralized validation', () => {
  const failed = [];
  Object.entries(db).forEach(([id, record]) => {
    const result = c.validateIngredientRecord(record);
    if (!result.ok) failed.push({ id, errors: result.errors });
  });
  assert.deepStrictEqual(failed, []);
});

test('Formula rejects negative/zero weights and aggregates duplicates', () => {
  const f = new c.Formula([{ ingredientId:'sugar', weight:100 }, { ingredientId:'sugar', weight:50 }, { ingredientId:'flour', weight:-4 }, { ingredientId:'honey', weight:0 }]);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(f.items)), [{ ingredientId:'sugar', weight:150 }]);
  assert.strictEqual(f.totalMass(), 150);
});

test('Formula snapshot preserves lineage and mass basis', () => {
  const f = new c.Formula([{ ingredientId:'flour', weight:500 }], { sourceRecipeId:'ayaHabib', sourceProcessFamily:'HOT_BASE_EGG_ADDED_AFTER_HEAT', massBasis:'SOURCE_FORMULA' });
  const scaled = f.withItems([{ ingredientId:'flour', weight:750 }], { type:'SCALE', details:{ factor:1.5 } }, { massBasis:'PREPARED_BATCH' });
  const restored = c.Formula.fromSnapshot(scaled.toSnapshot());
  assert.strictEqual(restored.sourceRecipeId, 'ayaHabib');
  assert.strictEqual(restored.sourceDoughId, 'ayaHabib');
  assert.strictEqual(restored.massBasis, 'PREPARED_BATCH');
  assert.strictEqual(restored.transformationHistory.length, 1);
});

test('Honey total sugar is not lost when profile is incomplete', () => {
  const f = new c.Formula([{ ingredientId:'honey', weight:100 }]);
  const sweet = f.sweetness(db);
  approx(sweet.totalSugarMass, 82, 1e-9);
  assert.ok(sweet.totalEq > 75 && sweet.totalEq < 90, `Unexpected honey sweetness ${sweet.totalEq}`);
  approx(sweet.sugarProfileCoverage, 70/82, 1e-9);
});

test('Commercial chocolate contributes sugar and sweetness', () => {
  const dark = new c.Formula([{ ingredientId:'chocolate-dark', weight:100 }]).sweetness(db);
  const milk = new c.Formula([{ ingredientId:'chocolate-milk', weight:100 }]).sweetness(db);
  assert.ok(dark.totalSugarMass >= 25);
  assert.ok(milk.totalSugarMass >= 45);
  assert.ok(milk.totalEq > dark.totalEq);
});

test('Unknown ingredient remains visible in composition coverage', () => {
  const f = new c.Formula([{ ingredientId:'flour', weight:100 }, { ingredientId:'unknown-large-item', weight:100 }]);
  const report = f.compositionReport(db);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(report.missingIngredients)), ['unknown-large-item']);
  assert.strictEqual(report.complete, false);
});

test('Aqueous sugar metric is not identified as true Brix', () => {
  const localDb = { ...db, water: { id:'water', displayName:'ماء', type:'liquid', density:1, waterFrac:1, sugarFrac:0, totalSugarFrac:0, fatFrac:0, proteinFrac:0, starchFrac:0, otherSolidsFrac:0 } };
  const f = new c.Formula([{ ingredientId:'sugar', weight:100 }, { ingredientId:'water', weight:100 }]);
  const m = f.aqueousSugarIndex(localDb);
  approx(m.value, 50, 1e-9);
  assert.strictEqual(m.metricId, 'aqueousSugarIndex');
  assert.strictEqual(f.brixApprox(db).deprecated, true);
});

test('Invalid product spec is normalized into operational limits', () => {
  const result = c.normalizeProductSpec({ d1:-5, d2:999, layers:0, rawSheetThicknessMm:-2, targetBakedLayerThicknessMm:0, wastePct:120, ballWeight:-10 });
  assert.ok(result.value.d1 >= 5);
  assert.ok(result.value.d2 <= 100);
  assert.ok(result.value.layers >= 1);
  assert.ok(result.value.rawSheetThicknessMm >= 0.2);
  assert.ok(result.value.targetBakedLayerThicknessMm >= 0.2);
  assert.ok(result.value.wastePct <= 50);
  assert.ok(result.warnings.length >= 1);
});

test('Legacy single thickness migrates to raw and baked thickness fields', () => {
  const result = c.normalizeProductSpec({ doughThicknessMm:1.8 });
  approx(result.value.rawSheetThicknessMm, 1.8);
  approx(result.value.targetBakedLayerThicknessMm, 1.8);
  assert.strictEqual(result.value.legacyAmbiguousThickness, true);
});

test('Geometry separates raw sheet volume from baked layer volume and stack height', () => {
  const g = new c.ProductGeometry({ ...defaultSpec, rawSheetThicknessMm:1, targetBakedLayerThicknessMm:2, estimatedBakedLayerThicknessMm:2.5, layers:8, fillingThicknessMm:3 });
  assert.ok(g.rawSheetVolume() < g.doughVolume());
  approx(g.stackHeightMm(), 8*2.5 + 7*3, 1e-9);
});

test('Tempering calculation distinguishes mixing direction', () => {
  const hotIntoEgg = c.calcThermalMixing({ eggMass:150, eggTemp:20, hotMass:510, hotTemp:85, batches:4, direction:'HOT_BASE_INTO_EGG' });
  const eggIntoHot = c.calcThermalMixing({ eggMass:150, eggTemp:20, hotMass:510, hotTemp:85, batches:4, direction:'EGG_INTO_HOT_BASE' });
  assert.ok(hotIntoEgg.steps[0].temp < eggIntoHot.steps[0].temp);
  approx(hotIntoEgg.finalTemp, eggIntoHot.finalTemp, 1e-9);
  assert.strictEqual(eggIntoHot.direction, 'EGG_INTO_HOT_BASE');
});

test('Recipes have explicit process, shaping and flour policies', () => {
  Object.values(recipes).forEach(recipe => {
    assert.ok(recipe.processFamily, recipe.id);
    assert.ok(recipe.shapingFamily, recipe.id);
    assert.ok(recipe.flourPolicy, recipe.id);
    assert.ok(recipe.layerGeometry && Number.isFinite(Number(recipe.layerGeometry.rawSheetThicknessMm)), recipe.id);
  });
});

test('Spartak uses spread-batter path and disables ball-weight mode', () => {
  const recipe = recipes.tetyanaSpartak;
  const formula = c.buildRecipeFormula(recipe);
  const filling = c.buildFillingFormula(fillings.classic_sourcream_frosting);
  const geometry = new c.ProductGeometry({ ...defaultSpec, scaleMode:'manualBall', shapingFamily:recipe.shapingFamily });
  const result = new c.Product({ geometry, doughFormula:formula, fillingFormula:filling }).scaleDough({ ingredientsDB:db, mode:'manualBall', targetBallWeight:150, processFamily:recipe.processFamily, shapingFamily:recipe.shapingFamily });
  assert.strictEqual(result.scaleMode, 'volume');
  assert.strictEqual(result.ballWeight, null);
  assert.ok(result.warnings.some(message => /تُنشر/.test(message)));
});

test('All dough scaling modes preserve source lineage', () => {
  const modes = ['volume','manualBall','flourBasis'];
  Object.values(recipes).forEach(recipe => {
    const dough = c.buildRecipeFormula(recipe);
    const filling = c.buildFillingFormula(fillings.classic_sourcream_frosting);
    modes.forEach(mode => {
      const geometry = new c.ProductGeometry({ ...defaultSpec, scaleMode:mode, shapingFamily:recipe.shapingFamily });
      const result = new c.Product({ geometry, doughFormula:dough, fillingFormula:filling }).scaleDough({ ingredientsDB:db, mode, targetBallWeight:140, targetFlourWeight:500, wastePct:10, processFamily:recipe.processFamily, shapingFamily:recipe.shapingFamily });
      assert.ok(result.scaledFormula, `${recipe.id}/${mode}`);
      assert.strictEqual(result.scaledFormula.sourceRecipeId, recipe.id, `${recipe.id}/${mode}`);
      assert.strictEqual(result.netFormula.sourceRecipeId, recipe.id, `${recipe.id}/${mode}`);
      assert.strictEqual(result.scaledFormula.massBasis, 'PREPARED_BATCH');
      assert.strictEqual(result.netFormula.massBasis, 'NET_FOR_LAYERS');
      assert.ok(result.scaledFormula.transformationHistory.length >= 1);
    });
  });
});

test('Sweetness adjustment preserves dough source identity', () => {
  const recipe = recipes.ayaHabib;
  const output = c.FullAnalysis.run(defaultSpec, recipe, fillings.classic_sourcream_frosting, -10, 'dough');
  assert.strictEqual(output.context.doughFormula.sourceRecipeId, recipe.id);
  assert.ok(output.context.doughFormula.transformationHistory.length >= 1);
});

test('Sour-cream straining removes mass through a process-state ingredient', () => {
  const source = new c.Formula([{ ingredientId:'sour-cream', weight:1000 }], { sourceFillingId:'classic_sourcream_frosting' });
  const out = c.applyMasterFillingYieldModel(source, 'classic_sourcream_frosting');
  assert.ok(out.formula.totalMass() < source.totalMass());
  assert.ok(out.formula.items.some(item => /^sour-cream-strained-/.test(item.ingredientId)));
  assert.ok(out.audit && out.audit.lostTotal > 0);
  const before = source.breakdown(db);
  const after = out.formula.breakdown(db);
  assert.ok(after.waterMass / out.formula.totalMass() < before.waterMass / source.totalMass());
});

test('Every filling declares application suitability', () => {
  Object.values(fillings).forEach(filling => {
    assert.ok(filling.applicationSuitability, filling.id);
    ['gaps','top','sides'].forEach(key => assert.ok(Object.prototype.hasOwnProperty.call(filling.applicationSuitability, key), `${filling.id}/${key}`));
  });
});

test('Source-specific filling protocols are not overwritten by generic ingredient rules', () => {
  const aya = c.ProtocolAuthority.getFillingPhase(fillings.ayahabib, 'reference');
  const text = aya.steps.map(step => step.operatorAction).join(' | ');
  assert.ok(aya.steps.length > 0);
  assert.ok(!/تم إلحاق قواعد/.test(aya.description || ''));
  assert.ok(!/يجب تصفية.*6/.test(text));
});

test('Ahmed Shouqi protocol keeps eggs and soda in the heated system and lifts at 70C', () => {
  const phases = c.ProtocolAuthority.getDoughPhases(recipes.ahmedShouqi);
  const all = phases.dough.steps.map(step => `${step.operatorAction} ${JSON.stringify(step.controls)}`).join(' ');
  assert.ok(/البيض/.test(all));
  assert.ok(/الصودا/.test(all));
  assert.ok(/70/.test(all));
  assert.ok(!/تمبير/.test(all));
});

test('Ahmed Younis protocol does not invent soda in hot base and preserves 1 hour chill + 0.5mm roll', () => {
  const phases = c.ProtocolAuthority.getDoughPhases(recipes.ahmedYounis);
  const dough = phases.dough.steps.map(step => step.operatorAction).join(' ');
  const baking = phases.baking.steps.map(step => step.operatorAction).join(' ');
  assert.ok(/المكونات الجافة.*الصودا/.test(dough));
  assert.ok(/ساعة/.test(dough));
  assert.ok(/0\.5/.test(baking));
});

test('Spartak protocol preserves spreadable batter instruction', () => {
  const phases = c.ProtocolAuthority.getDoughPhases(recipes.tetyanaSpartak);
  const all = [...phases.dough.steps, ...phases.baking.steps].map(step => step.operatorAction).join(' ');
  assert.ok(/سائلاً|يُفرد الخليط|صواني/.test(all));
  assert.ok(!/كرة|كرات/.test(all));
});

test('Protocol coverage dynamically includes all recipes and fillings', () => {
  const matrix = c.getProtocolCoverageMatrix();
  assert.strictEqual(matrix.scope, 'single-filling-v6');
  assert.strictEqual(matrix.dough.length, Object.keys(recipes).length);
  assert.strictEqual(matrix.fillings.length, Object.keys(fillings).length);
});

test('Runbook contains setup, dough, baking, filling, assembly and review phases', () => {
  const session = c.SessionStore.get();
  const runbook = c.RunbookCompiler.compile(session);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(runbook.phases.map(phase => phase.id))), ['setup','dough','baking','filling','assembly','review']);
});

test('Session migration separates legacy thickness and sanitizes free text', () => {
  const migrated = c.SessionStore.set({
    schemaVersion:5,
    productSpec:{ shape:'round', d1:24, layers:9, doughThicknessMm:1.7 },
    execution:{ phaseNotes:{ dough:'</textarea><img src=x onerror=alert(1)>' }, observations:[], deviations:[] },
    ui:{ activeStep:'assembly' }
  });
  approx(migrated.productSpec.rawSheetThicknessMm, 1.7);
  approx(migrated.productSpec.targetBakedLayerThicknessMm, 1.7);
  assert.ok(!migrated.execution.phaseNotes.dough.includes('<'));
  assert.strictEqual(migrated.ui.activeStep, 'assembly');
});

test('Recipe Lab sanitizes stored user text', () => {
  c.RecipeLabStore.init();
  c.RecipeLabStore.createDraft({ kind:'dough' });
  c.RecipeLabStore.updateDraft({ name:'<img src=x onerror=alert(1)>', notes:'</textarea><svg onload=alert(1)>' });
  const draft = c.RecipeLabStore.getDraft('dough');
  assert.ok(!draft.name.includes('<'));
  assert.ok(!draft.notes.includes('<'));
});

test('Storage failures are surfaced through persist status', () => {
  const quietConsole = { log(){}, info(){}, warn(){}, error(){} };
  const failing = loadContext(makeStorage({ failWrites:true }), quietConsole);
  failing.SessionStore.reset();
  assert.strictEqual(failing.SessionStore.getLastPersistStatus().ok, false);
  failing.RecipeLabStore.init();
  failing.RecipeLabStore.createDraft({ kind:'dough' });
  failing.RecipeLabStore.updateDraft({ name:'test' });
  failing.RecipeLabStore.setDraftItems([{ ingredientId:'flour', weight:100 }]);
  failing.RecipeLabStore.saveDraft();
  assert.strictEqual(failing.RecipeLabStore.getLastPersistStatus().ok, false);
});

test('All 1,620 recipe/filling/config analyses complete with finite numeric outputs', () => {
  const configs = [];
  const shapes = [
    { shape:'round', d1:18, d2:30 },
    { shape:'round', d1:24, d2:30 },
    { shape:'rect', d1:20, d2:30 },
    { shape:'rect', d1:30, d2:40 }
  ];
  const variants = [
    { layers:6, rawSheetThicknessMm:1.0, targetBakedLayerThicknessMm:1.6, estimatedBakedLayerThicknessMm:1.8, fillingThicknessMm:2.5, scaleMode:'volume' },
    { layers:8, rawSheetThicknessMm:1.5, targetBakedLayerThicknessMm:2.0, estimatedBakedLayerThicknessMm:2.1, fillingThicknessMm:3.0, scaleMode:'volume' },
    { layers:10, rawSheetThicknessMm:2.0, targetBakedLayerThicknessMm:2.5, estimatedBakedLayerThicknessMm:2.7, fillingThicknessMm:3.5, scaleMode:'manualBall', ballWeight:150 },
    { layers:12, rawSheetThicknessMm:1.2, targetBakedLayerThicknessMm:1.8, estimatedBakedLayerThicknessMm:2.0, fillingThicknessMm:2.8, scaleMode:'flourBasis', targetFlourWeight:750 },
    { layers:9, rawSheetThicknessMm:1.7, targetBakedLayerThicknessMm:2.2, estimatedBakedLayerThicknessMm:2.4, fillingThicknessMm:4.0, scaleMode:'volume', includeOuterCoat:false }
  ];
  shapes.forEach(shape => variants.forEach(variant => configs.push({ ...defaultSpec, ...shape, ...variant })));
  assert.strictEqual(configs.length, 20);
  let count = 0;
  Object.values(recipes).forEach(recipe => {
    Object.values(fillings).forEach(filling => {
      configs.forEach(config => {
        const output = c.FullAnalysis.run(config, recipe, filling, -12, 'filling');
        assert.ok(output.batch && output.filling && output.sweetness, `${recipe.id}/${filling.id}`);
        allFinite(output);
        assert.strictEqual(output.batch.scaledFormula.sourceRecipeId, recipe.id);
        count += 1;
      });
    });
  });
  assert.strictEqual(count, 1620);
});

test('Custom filling guidance is practical and does not override source protocols', () => {
  const custom = {
    id: 'custom-whipped-sour',
    name: 'حشو حر',
    base: [
      { key:'whipping-cream', weight:400 },
      { key:'sour-cream', weight:300 },
      { key:'powdered-sugar', weight:100 }
    ]
  };
  const phase = c.ProtocolAuthority.getFillingPhase(custom, 'custom');
  const joined = JSON.stringify(phase);
  assert.ok(phase.steps.length >= 2);
  assert.ok(joined.includes('اخفق الكريمة وهي باردة'));
  assert.ok(joined.includes('استخدم الساور كريم كما هو أو صفّه عند الحاجة'));
  assert.ok(!/cP|300-400%|6-8 ساعات|100-150 مل/.test(joined));
  const source = c.ProtocolAuthority.getFillingPhase(fillings.ayahabib, 'reference');
  assert.ok(!JSON.stringify(source).includes('استخدم الساور كريم كما هو أو صفّه عند الحاجة'));
});

test('Generic filling rules avoid pseudo-precise viscosity and yield claims', () => {
  const rulesText = fs.readFileSync(path.join(ROOT, 'data/filling-rules.js'), 'utf8');
  assert.ok(!/\bcP\b|300-400%|تحسن الاستقرار:|قطر الفقاعات المثالي/.test(rulesText));
});

test('Static user-facing files do not label filling metric as Brix or expose scientific-confidence panel', () => {
  const uiFiles = ['app-v6.js','app-tools.js'];
  const text = uiFiles.map(file => fs.readFileSync(path.join(ROOT, file), 'utf8')).join('\n');
  assert.ok(!/Brix الحشو|بريكس الحشو|الثقة العلمية المستقلة|اكتمال بيانات المصدر/.test(text));
});

test('Dry formula mass balance has no phantom clamp loss', () => {
  const dry = new c.Formula([{ ingredientId:'sugar', weight:100 }]);
  const baked = c.estimateDoughBakeModel(dry, db);
  approx(baked.bakedMassFromRawMass(100), 100, 1e-8);
  approx(baked.massBalance.residual, 0, 1e-8);
  const wet = new c.Formula([{ ingredientId:'flour',weight:100 }, {ingredientId:'water',weight:100}]);
  const model = c.estimateDoughBakeModel(wet, db);
  approx(model.bakedMassFromRawMass(200), 200-model.massBalance.modeledWaterLoss-model.massBalance.modeledOtherLoss,1e-7);
});

test('Half-unknown composition cannot drive density but manual scaling remains available', () => {
  const formula = new c.Formula([{ingredientId:'flour',weight:100},{ingredientId:'unknown-large-item',weight:100}]);
  const m = c.estimateDoughBakeModel(formula,db);
  assert.strictEqual(m.densityStatus,'UNSUPPORTED');
  assert.strictEqual(m.effectiveBakedDensity,null);
  const product = new c.Product({geometry:new c.ProductGeometry({...defaultSpec,layers:4}),doughFormula:formula,fillingFormula:null});
  const manual = product.scaleDough({ingredientsDB:db,mode:'manualBall',targetBallWeight:100});
  assert.strictEqual(manual.densityStatus,'UNSUPPORTED');
  approx(manual.netRaw,400);
  const volume = product.scaleDough({ingredientsDB:db,mode:'volume'});
  assert.strictEqual(volume.densityStatus,'UNSUPPORTED');
  assert.strictEqual(volume.scaledFormula,null);
  const measured = product.scaleDough({ingredientsDB:db,mode:'volume',doughDensity:1.2});
  assert.strictEqual(measured.densityStatus,'USER_MEASURED');
  assert.ok(measured.totalRaw>0);
});

test('Thickness audit enforces measured geometry without inferring raw density', () => {
  const input={areaCm2:100,layers:1,netRawMass:100,bakedMass:80,rawThicknessMm:1,targetBakedThicknessMm:8,rawDensity:1,bakedDensity:1};
  const conflict=c.auditThicknessConsistency(input);
  assert.strictEqual(conflict.status,'CONFLICT');
  approx(conflict.predictedRawThicknessMm,10);
  const consistent=c.auditThicknessConsistency({...input,rawThicknessMm:10});
  assert.strictEqual(consistent.status,'CONSISTENT');
  const unknown=c.auditThicknessConsistency({...input,rawDensity:null,bakedDensity:null});
  assert.strictEqual(unknown.status,'INSUFFICIENT_DATA');
  approx(conflict.predictedBakedThicknessMm,8);
});

test('Evidence status distinguishes geometric law, model and missing composition', () => {
  const factor=(26/20)**2*(9/8);
  approx(factor,1.90125,1e-10);
  assert.strictEqual(c.assessModelEvidence({claimType:'GEOMETRY',compositionCoverage:1}).status,'DETERMINISTIC');
  assert.notStrictEqual(c.assessModelEvidence({claimType:'SENSORY_TEXTURE',compositionCoverage:1}).status,'DETERMINISTIC');
  assert.strictEqual(c.assessModelEvidence({claimType:'BAKED_DENSITY',compositionCoverage:0.5}).status,'INSUFFICIENT_EVIDENCE');
  assert.strictEqual(c.assessModelEvidence({claimType:'BAKED_DENSITY',compositionCoverage:1,hasMeasuredParameter:true}).status,'MEASURED_INPUT');
});

test('Every built-in recipe and science note has honest provenance status',()=>{
  for(const id of Object.keys(recipes)){
    const record=c.getEvidenceRecord('dough',id);
    assert.ok(record && record.key===`dough:${id}`);
    assert.ok(['UNVERIFIED','NOT_AVAILABLE','DOCUMENTED_SECONDARY','VERIFIED_PRIMARY'].includes(record.status));
  }
  for(const id of Object.keys(fillings)) assert.ok(c.getEvidenceRecord('filling',id));
  for(const id of Object.keys(c.SCIENCE_CONTENT)) assert.ok(c.getEvidenceRecord('science',id));
  assert.notStrictEqual(c.getEvidenceRecord('science','dough-soda-reaction').status,'VERIFIED_PRIMARY');
  assert.strictEqual(c.getEvidenceRecord('science','dough-soda-reaction').status,'NOT_AVAILABLE');
  assert.strictEqual(c.getEvidenceRecord('dough','custom-not-listed'),null);
});

test('Saved variant and derived runbook instructions disclose provenance',()=>{
  const context=loadContext(makeStorage());
  context.SessionStore.init(); context.RecipeLabStore.init();
  context.RecipeLabStore.createDraft({kind:'dough'});
  context.RecipeLabStore.updateDraft({sourceId:'ayaHabib',name:'Variant'});
  context.RecipeLabStore.setDraftItems([{ingredientId:'flour',weight:150},{ingredientId:'sugar',weight:35}]);
  const saved=context.RecipeLabStore.saveDraft();
  assert.strictEqual(saved.provenanceKind,'USER_VARIANT');
  assert.strictEqual(saved.sourceId,'ayaHabib');
  const compiled=context.RunbookCompiler.compile(context.SessionStore.get());
  assert.ok(compiled.phases.find(p=>p.id==='setup').steps[0].controls[0].provenanceKind);
  assert.ok(compiled.phases.find(p=>p.id==='baking').steps.some(step=>step.controls.some(control=>control.provenanceKind==='MODEL_ESTIMATE')));
});

const failed = results.filter(result => !result.ok);
const report = { generatedAt:new Date().toISOString(), total:results.length, passed, failed:failed.length, results };
fs.writeFileSync(path.join(__dirname, 'node-test-results.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ total:report.total, passed:report.passed, failed:report.failed }, null, 2));
if (failed.length) {
  failed.forEach(result => console.error(`\nFAIL: ${result.name}\n${result.error}`));
  process.exit(1);
}
