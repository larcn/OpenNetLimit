'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadMedovik, createMemoryStorage } = require('../harness/load-medovik');

test('normalizeBench تعيد كائناً نظيفاً للمدخلات الفارغة أو التالفة وتزيل المفاتيح الزائدة', () => {
  const ctx = loadMedovik();
  const { normalizeBench } = ctx.MedovikBench;
  const empty = { strained: null, firstLayer: null, timers: [] };

  for (const bad of [
    undefined,
    null,
    42,
    'x',
    {},
    { extra: 99, strained: { rawWeightG: -1, strainedWeightG: 1, measuredAt: 'x' } }
  ]) {
    const out = normalizeBench(bad);
    assert.deepEqual(out, empty);
    assert.deepEqual(Object.keys(out).sort(), ['firstLayer', 'strained', 'timers']);
  }
});

test('normalizeBench تتحقق من شروط strained وfirstLayer وحدود THICKNESS_INPUT_RANGE_MM', () => {
  const ctx = loadMedovik();
  const { normalizeBench } = ctx.MedovikBench;

  const validStrained = { rawWeightG: 200, strainedWeightG: 164, measuredAt: '2026-11-04T00:00:00Z' };
  const validFirst = {
    rawLayerWeightG: 60,
    bakedLayerWeightG: 50,
    areaCm2: 314.16,
    thicknessPointsMm: [1.8, 2.0, 2.2],
    measuredAt: '2026-11-04T00:00:00Z',
    context: 'ayaHabib|raw1.5|flour:1.0000'
  };

  const okOut = normalizeBench({
    strained: { ...validStrained, rogue: 1 },
    firstLayer: { ...validFirst, rogue: 2 },
    rogueTop: true
  });
  assert.deepEqual(okOut.strained, validStrained);
  assert.deepEqual(okOut.firstLayer, validFirst);

  // strainedWeightG > rawWeightG يسقط
  assert.equal(
    normalizeBench({ strained: { rawWeightG: 100, strainedWeightG: 110, measuredAt: 't' } }).strained,
    null
  );

  // نقطة سماكة 25 (> 20) أو 0.2 (<= 0.2) تُسقط firstLayer
  assert.equal(
    normalizeBench({ firstLayer: { ...validFirst, thicknessPointsMm: [1.9, 25] } }).firstLayer,
    null
  );
  assert.equal(
    normalizeBench({ firstLayer: { ...validFirst, thicknessPointsMm: [0.2] } }).firstLayer,
    null
  );
  assert.equal(
    normalizeBench({ firstLayer: { ...validFirst, thicknessPointsMm: Array(11).fill(2.0) } }).firstLayer,
    null
  );
});

test('normalizeBench تحذف المؤقتات التالفة وتبقي الصالحة', () => {
  const ctx = loadMedovik();
  const { normalizeBench } = ctx.MedovikBench;

  const goodTimer = {
    id: 't1',
    stepId: 'step_1',
    cueText: '4–6 دقائق',
    startedAtMs: 1700000000000,
    minSeconds: 240,
    maxSeconds: 360
  };
  const badMaxLtMin = { ...goodTimer, id: 't2', minSeconds: 400, maxSeconds: 300 };
  const badNegStart = { ...goodTimer, id: 't3', startedAtMs: -5 };

  const out = normalizeBench({ timers: [badMaxLtMin, goodTimer, badNegStart, null] });
  assert.deepEqual(out.timers, [goodTimer]);
});

test('SessionStore.setBench / getBench يحفظان ويعيدان التحميل ويمسحان حقلاً منفرداً دون المساس بالباقي', () => {
  const storage = createMemoryStorage();
  const a = loadMedovik({ storage });
  a.SessionStore.init();

  const strained = { rawWeightG: 500, strainedWeightG: 410, measuredAt: '2026-11-04T01:00:00Z' };
  const timer = {
    id: 'timer_a',
    stepId: 'bake_1',
    cueText: '5 دقائق',
    startedAtMs: 1000,
    minSeconds: 300,
    maxSeconds: 300
  };
  a.SessionStore.setBench({ strained, timers: [timer] });

  const b = loadMedovik({ storage });
  b.SessionStore.init();
  const loaded = b.SessionStore.getBench();
  assert.deepEqual(loaded.strained, strained);
  assert.deepEqual(loaded.timers, [timer]);

  // نسخة عميقة: التعديل الخارجي لا يغيّر الحالة المخزنة
  loaded.strained.rawWeightG = 9999;
  assert.equal(b.SessionStore.getBench().strained.rawWeightG, 500);

  // مسح strained بـ null يبقي المؤقتات
  b.SessionStore.setBench({ strained: null });
  assert.equal(b.SessionStore.getBench().strained, null);
  assert.deepEqual(b.SessionStore.getBench().timers, [timer]);
});

test('مع storage: null لا يرمي setBench استثناءً ويسجل فشل الحفظ مع بقاء القياس في الذاكرة', () => {
  const ctx = loadMedovik({ storage: null });
  ctx.SessionStore.init();

  const strained = { rawWeightG: 300, strainedWeightG: 246, measuredAt: '2026-11-04T02:00:00Z' };
  assert.doesNotThrow(() => ctx.SessionStore.setBench({ strained }));
  assert.equal(ctx.SessionStore.getLastPersistStatus().ok, false);
  assert.deepEqual(ctx.SessionStore.getBench().strained, strained);
});

test('benchContextKey ثابت عند التكبير النسبي وترتيب المكونات وتكرار المعرف وحساس لتغير النسب أو الوصفة أو السماكة', () => {
  const ctx = loadMedovik();
  const { benchContextKey } = ctx.MedovikBench;

  const kBase = benchContextKey({
    doughRecipeId: 'ayaHabib',
    rawSheetThicknessMm: 1.5,
    doughFormula: { items: [{ ingredientId: 'flour', weight: 300 }, { ingredientId: 'honey', weight: 100 }] }
  });
  assert.equal(kBase, 'ayaHabib|raw1.5|flour:0.7500,honey:0.2500');

  const kScaledAndReversed = benchContextKey({
    doughRecipeId: 'ayaHabib',
    rawSheetThicknessMm: 1.5,
    doughFormula: {
      items: [
        { ingredientId: 'honey', weight: 200 },
        { ingredientId: 'flour', weight: 250 },
        { ingredientId: 'flour', weight: 350 }
      ]
    }
  });
  assert.equal(kScaledAndReversed, kBase);

  const kChangedRatio = benchContextKey({
    doughRecipeId: 'ayaHabib',
    rawSheetThicknessMm: 1.5,
    doughFormula: { items: [{ ingredientId: 'flour', weight: 300 }, { ingredientId: 'honey', weight: 101 }] }
  });
  assert.notEqual(kChangedRatio, kBase);

  const kChangedRecipe = benchContextKey({
    doughRecipeId: 'shouqi',
    rawSheetThicknessMm: 1.5,
    doughFormula: { items: [{ ingredientId: 'flour', weight: 300 }, { ingredientId: 'honey', weight: 100 }] }
  });
  assert.notEqual(kChangedRecipe, kBase);

  const kChangedThickness = benchContextKey({
    doughRecipeId: 'ayaHabib',
    rawSheetThicknessMm: 1.6,
    doughFormula: { items: [{ ingredientId: 'flour', weight: 300 }, { ingredientId: 'honey', weight: 100 }] }
  });
  assert.notEqual(kChangedThickness, kBase);

  const kEmpty = benchContextKey({
    doughRecipeId: 'ayaHabib',
    rawSheetThicknessMm: 1.5,
    doughFormula: { items: [] }
  });
  assert.equal(kEmpty, 'ayaHabib|raw1.5|empty');
});
