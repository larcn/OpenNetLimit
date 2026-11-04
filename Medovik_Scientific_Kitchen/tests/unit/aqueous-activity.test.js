'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadMedovik } = require('../harness/load-medovik');
const { loadAppWithMiniDom } = require('../helpers/mini-dom');

const near = (a, b, t = 5e-4) => assert.ok(Math.abs(a - b) <= t, `${a} vs ${b}`);
const makeFormula = (ctx, items) =>
  new ctx.Formula(items.map(([ingredientId, weight]) => ({ ingredientId, weight })));

test('مذاب واحد: سكروز 50 مع ماء 50 ← 0.9348، و30 مع 70 ← 0.9749، والطرفان متساويان', () => {
  const ctx = loadMedovik();
  const { computeNorrishAwRange } = ctx.MedovikAqueousActivity;
  const a = computeNorrishAwRange({ waterG: 50, solutes: [{ key: 'sucrose', massG: 50 }] });
  const b = computeNorrishAwRange({ waterG: 70, solutes: [{ key: 'sucrose', massG: 30 }] });
  near(a.aw, 0.9348);
  near(b.aw, 0.9749);
  assert.equal(a.awMin, a.awMax);
});

test('جلوكوز 50 مع ماء 50 ← 0.8923، وسكروز 25 + جلوكوز 25 مع ماء 50 ← 0.9131', () => {
  const ctx = loadMedovik();
  const { computeNorrishAwRange } = ctx.MedovikAqueousActivity;
  near(computeNorrishAwRange({ waterG: 50, solutes: [{ key: 'glucose', massG: 50 }] }).aw, 0.8923);
  near(
    computeNorrishAwRange({
      waterG: 50,
      solutes: [
        { key: 'sucrose', massG: 25 },
        { key: 'glucose', massG: 25 }
      ]
    }).aw,
    0.9131
  );
});

test('فركتوز وحده 50 مع ماء 50 بثابت Chirife et al. (1980) الموثق K = 2.15 ← 0.8931 والطرفان متساويان', () => {
  const ctx = loadMedovik();
  assert.equal(ctx.MEDOVIK_ENGINEERING_CONSTANTS.FRUCTOSE_NORRISH_K.value, 2.15);
  assert.equal(ctx.MEDOVIK_ENGINEERING_CONSTANTS.FRUCTOSE_NORRISH_K.status, 'APPROVED');

  const { computeNorrishAwRange } = ctx.MedovikAqueousActivity;
  const r = computeNorrishAwRange({ waterG: 50, solutes: [{ key: 'fructose', massG: 50 }] });
  near(r.awMin, 0.89309, 1e-4);
  near(r.awMax, 0.89309, 1e-4);
  assert.equal(r.awMin, r.awMax);
  near(r.aw, 0.8931, 1e-4);
  assert.ok(r.assumptions.length > 0);
});

test('سكر غير مصنّف 5 غ مع سكروز 25 غ وماء 50: مدى بين الافتراضين السداسي والثنائي', () => {
  const ctx = loadMedovik();
  const { computeNorrishAwRange } = ctx.MedovikAqueousActivity;
  const r = computeNorrishAwRange({
    waterG: 50,
    solutes: [{ key: 'sucrose', massG: 25 }],
    unclassifiedSugarG: 5
  });
  near(r.awMin, 0.95895, 1e-4);
  near(r.awMax, 0.96384, 1e-4);
});

test('حالات null: ماء صفر، لا مذابات، مفتاح مجهول، وممنوع قصّ القيمة عند تفعيل AW_VALIDITY_MIN', () => {
  const ctx = loadMedovik();
  const { computeNorrishAwRange } = ctx.MedovikAqueousActivity;
  assert.equal(computeNorrishAwRange({ waterG: 0, solutes: [{ key: 'sucrose', massG: 5 }] }).aw, null);
  assert.equal(computeNorrishAwRange({ waterG: 50, solutes: [] }).aw, null);
  assert.equal(computeNorrishAwRange({ waterG: 50, solutes: [{ key: 'xylitol', massG: 5 }] }).aw, null);

  // تحقق أن المراجع العلمية مسجلة في SCIENCE_REFERENCE_REGISTRY
  const refs = ctx.getScienceReferences(['norrish_1966', 'fao_norrish_y4358e', 'chirife_1980_norrish']);
  assert.equal(refs.length, 3);
});

const PROJECT_POINT_CASES = [
  ['ساور كريم 500 + سكر 150', [['sour-cream', 500], ['sugar', 150]], 0.9673],
  ['حليب مكثف 100', [['condensed-milk', 100]], 0.8451],
  ['دولسي 100', [['dulce-de-leche', 100]], 0.8620],
  ['ساور كريم 300 + دولسي 300', [['sour-cream', 300], ['dulce-de-leche', 300]], 0.9616]
];

for (const [name, items, expected] of PROJECT_POINT_CASES) {
  test(`سجلات المشروع بلا افتراض مفتوح: ${name} ← ${expected} والطرفان متساويان`, () => {
    const ctx = loadMedovik();
    const r = ctx.MedovikAqueousActivity.estimateAqueousPhaseAw(
      makeFormula(ctx, items),
      ctx.IngredientsDB
    );
    assert.equal(r.status, 'BOUNDED_ESTIMATE');
    near(r.aw, expected);
    assert.ok(r.awMax - r.awMin < 1e-9);
  });
}

test('hiba (فركتوز 11.4 غ وسكر غير مصنّف 3.6 غ): المدى 0.99040 إلى 0.99081', () => {
  const ctx = loadMedovik();
  const hiba = makeFormula(ctx, [
    ['sour-cream', 200],
    ['whipping-cream', 500],
    ['honey', 30]
  ]);
  const r = ctx.MedovikAqueousActivity.estimateAqueousPhaseAw(hiba, ctx.IngredientsDB);
  assert.equal(r.status, 'BOUNDED_ESTIMATE');
  assert.ok(Math.abs(r.unclassifiedSugarG - 3.6) < 1e-9);
  near(r.awMin, 0.99040, 1e-4);
  near(r.awMax, 0.99081, 1e-4);
  assert.ok(r.awMax - r.awMin > 3e-4 && r.awMax - r.awMin < 5e-4);
  assert.ok(r.assumptions.length >= 2);
});

test('shouqi_1 (فركتوز 25 غ من الكراميل بلا سكر غير مصنّف): تقدير موثق 0.96150 والطرفان متساويان', () => {
  const ctx = loadMedovik();
  const f = makeFormula(ctx, [
    ['whipping-cream', 250],
    ['sour-cream', 100],
    ['caramel', 250],
    ['butter', 75]
  ]);
  const r = ctx.MedovikAqueousActivity.estimateAqueousPhaseAw(f, ctx.IngredientsDB);
  assert.equal(r.status, 'BOUNDED_ESTIMATE');
  near(r.awMin, 0.96150, 1e-4);
  near(r.awMax, 0.96150, 1e-4);
  assert.ok(r.awMax - r.awMin < 1e-9);
});

test('عسل 100 غ وحده: مدى 0.53512 إلى 0.55134 مع validityChecked = false طالما AW_VALIDITY_MIN = null', () => {
  const ctx = loadMedovik();
  const r = ctx.MedovikAqueousActivity.estimateAqueousPhaseAw(
    makeFormula(ctx, [['honey', 100]]),
    ctx.IngredientsDB
  );
  near(r.awMin, 0.53512, 1e-3);
  near(r.awMax, 0.55134, 1e-3);
  assert.equal(r.validityChecked, false);
});

test('تغطية 0.5 أو صيغة فارغة: INSUFFICIENT_EVIDENCE بلا استثناء', () => {
  const ctx = loadMedovik();
  const { estimateAqueousPhaseAw } = ctx.MedovikAqueousActivity;
  const u = makeFormula(ctx, [
    ['no-such-ingredient', 50],
    ['sour-cream', 50]
  ]);
  assert.equal(estimateAqueousPhaseAw(u, ctx.IngredientsDB).status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(estimateAqueousPhaseAw(makeFormula(ctx, []), ctx.IngredientsDB).aw, null);
});

test('لوحة تحليل الحشو تعرض تقدير Norrish مع المدى والافتراضات على صيغة ما بعد التصفية وبلا أي ادعاء صلاحية أو ساعات', () => {
  const { ctx, document } = loadAppWithMiniDom();
  ctx.SessionStore.setFilling('hiba');
  ctx.SessionStore.setActiveStep('filling');

  const awPanel = document.querySelector('[data-aqueous-aw-panel="true"]');
  assert.ok(awPanel, 'Expected [data-aqueous-aw-panel="true"] in filling workspace');
  const panelText = awPanel.textContent;
  assert.equal(
    panelText.includes('تقدير النشاط المائي للطور المائي (Norrish) — للمقارنة النسبية فقط، لا للصلاحية'),
    true
  );
  assert.equal(panelText.includes('0.9906'), true);
  assert.equal(panelText.includes('0.9904–0.9908'), true);
  // ممنوع أي تصنيف سرعة أو عدد ساعات أو مدة صلاحية (D5 وD10)
  assert.equal(/سريع|بطيء|ساعة|ساعات|أيام صلاحية/.test(panelText), false);

  const audit = ctx.getCalculationAudit('aqueous-aw');
  assert.ok(audit && audit.id === 'aqueous-aw');
});
