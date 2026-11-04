'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadMedovik } = require('../harness/load-medovik');
const { loadAppWithMiniDom } = require('../helpers/mini-dom');

test('parseStrainedInputs يقبل الأرقام العربية والفواصل العشرية ويرفض اللاحقة النصية أو زيادة المصفّى على الخام', () => {
  const ctx = loadMedovik();
  const { parseStrainedInputs } = ctx.MedovikBench;

  const okRes = parseStrainedInputs({ rawText: '١٠٠٫٥', strainedText: '82,5' });
  assert.equal(okRes.ok, true);
  assert.deepEqual(okRes.values, { rawWeightG: 100.5, strainedWeightG: 82.5 });

  const suffixErr = parseStrainedInputs({ rawText: '12 جم', strainedText: '10' });
  assert.equal(suffixErr.ok, false);
  assert.ok(suffixErr.errors.some((e) => e.includes('الوزن الخام')), `Expected error mentioning الوزن الخام, got: ${suffixErr.errors.join(' | ')}`);

  const gtErr = parseStrainedInputs({ rawText: '100', strainedText: '105' });
  assert.equal(gtErr.ok, false);
  assert.ok(gtErr.errors.length > 0);
});

test('parseFirstLayerInputs يقبل نقاط سماكة بالعربية ويرفض القيم خارج المجال أو النقاط الفارغة', () => {
  const ctx = loadMedovik();
  const { parseFirstLayerInputs } = ctx.MedovikBench;

  const okRes = parseFirstLayerInputs({
    rawText: '٦٠',
    bakedText: '50',
    areaText: '314,16',
    thicknessTexts: ['١٫٨', '2.0', '٢٫٢']
  });
  assert.equal(okRes.ok, true);
  assert.deepEqual(okRes.values, {
    rawLayerWeightG: 60,
    bakedLayerWeightG: 50,
    areaCm2: 314.16,
    thicknessPointsMm: [1.8, 2.0, 2.2]
  });

  const rangeErr = parseFirstLayerInputs({
    rawText: '60',
    bakedText: '50',
    areaText: '314',
    thicknessTexts: ['1.8', '25', '2.1']
  });
  assert.equal(rangeErr.ok, false);
  assert.ok(
    rangeErr.errors.some((e) => /السماكة/.test(e) && /0\.2/.test(e) && /20/.test(e)),
    `Expected error mentioning السماكة range (0.2..20), got: ${rangeErr.errors.join(' | ')}`
  );

  const emptyPtErr = parseFirstLayerInputs({
    rawText: '60',
    bakedText: '50',
    areaText: '314',
    thicknessTexts: ['1.8', '   ', '2.1']
  });
  assert.equal(emptyPtErr.ok, false);
  assert.ok(emptyPtErr.errors.some((e) => /السماكة/.test(e)));
});

test('buildRuntimeContext يربط bench.strained بـ scaleFilling ويسجل/يلغي sour-cream-strained-measured', () => {
  const ctx = loadMedovik();
  const S = ctx.SessionStore;
  S.init();
  S.setFilling('classic_sourcream_frosting');

  const runBase = ctx.FullAnalysis.run(S.resolveProductSpec(), S.resolveActiveRecipeProfile(), S.resolveActiveFillingProfile(), 0, null);
  assert.equal(ctx.IngredientsDB['sour-cream-strained-measured'], undefined);

  // 100 -> 82 يعيد إنتاج السجل المدمج 82 تماماً
  S.setBench({ strained: { rawWeightG: 100, strainedWeightG: 82, measuredAt: '2026-11-04T00:00:00Z' } });
  const runMeas82 = ctx.FullAnalysis.run(S.resolveProductSpec(), S.resolveActiveRecipeProfile(), S.resolveActiveFillingProfile(), 0, null);
  assert.ok(ctx.IngredientsDB['sour-cream-strained-measured']);
  assert.equal(runMeas82.context.filling.scaledFormula.items[0].ingredientId, 'sour-cream-strained-measured');
  assert.ok(Math.abs(runMeas82.context.filling.preparedRequiredMass - runBase.context.filling.preparedRequiredMass) < 0.2);

  // مسح القياس يلغي التسجيل
  S.setBench({ strained: null });
  ctx.FullAnalysis.run(S.resolveProductSpec(), S.resolveActiveRecipeProfile(), S.resolveActiveFillingProfile(), 0, null);
  assert.equal(ctx.IngredientsDB['sour-cream-strained-measured'], undefined);
});

test('بطاقتا المعايرة في الواجهة تحفظان عند الضغط فقط وتعرضان النتائج وتنبيه الفشل وعدم الانطباق وتمنعان تسرب السجل لمحرر المكونات', () => {
  const { ctx, document } = loadAppWithMiniDom({ storage: null });

  // خطوة الحشو: إدخال تصفية الساور كريم بالضغط على «احفظ القياس» مع storage: null يعرض تنبيه عدم الحفظ
  ctx.SessionStore.setActiveStep('filling');
  const rawInput = document.querySelector('[data-focus-key="bench:strained:raw"]');
  const strainedInput = document.querySelector('[data-focus-key="bench:strained:strained"]');
  const saveStrainedBtn = document.querySelector('[data-bench-action="save-strained"]');
  assert.ok(rawInput && strainedInput && saveStrainedBtn, 'Expected strained calibration inputs & button');
  assert.equal(rawInput.getAttribute('inputmode'), 'decimal');
  assert.equal(rawInput.getAttribute('dir'), 'ltr');

  rawInput.value = '١٠٠';
  strainedInput.value = '٨٢٫٥';
  // لم يُحفظ قبل الضغط
  assert.equal(ctx.SessionStore.getBench().strained, null);
  saveStrainedBtn.click();
  assert.equal(ctx.SessionStore.getBench().strained.strainedWeightG, 82.5);
  assert.match(document.body.textContent, /تعذّر حفظ القياس على هذا الجهاز؛ سيبقى خلال هذه الجلسة فقط/);
  assert.match(document.body.textContent, /82\.5%/);

  // السجلات المصفاة / المقاسة لا تتسرب إلى قائمة محرر المكونات في الوضع المخصص
  ctx.RecipeLabStore.createDraft({ kind: 'filling' });
  ctx.SessionStore.setFillingMode('custom');
  const selects = document.querySelectorAll('select');
  const allOptionValues = selects.flatMap((s) => (s.children || []).map((o) => o.value));
  assert.equal(allOptionValues.includes('sour-cream-strained-measured'), false);
  assert.equal(allOptionValues.includes('sour-cream-strained-82'), false);

  // خطوة الخبز: معايرة أول طبقة + شريط التفعيل + عدم الانطباق عند تغيير الوصفة
  ctx.SessionStore.setActiveStep('baking');
  document.querySelector('[data-focus-key="bench:layer:raw"]').value = '60';
  document.querySelector('[data-focus-key="bench:layer:baked"]').value = '50';
  document.querySelector('[data-focus-key="bench:layer:area"]').value = '314.159';
  document.querySelector('[data-focus-key="bench:layer:pt:0"]').value = '١٫٨';
  document.querySelector('[data-focus-key="bench:layer:pt:1"]').value = '2.0';
  document.querySelector('[data-focus-key="bench:layer:pt:2"]').value = '٢٫٢';
  document.querySelector('[data-bench-action="save-first-layer"]').click();

  assert.match(document.body.textContent, /تُستخدم كثافتك المقاسة/);
  assert.match(document.body.textContent, /فقد الكتلة/);
  assert.match(document.body.textContent, /الكتلة محسوبة من الكثافة والسماكة \(لا فحص مستقل\)/);

  // تغيير الوصفة يظهر عدم الانطباق
  ctx.SessionStore.setRecipe('tetyanaSpartak');
  assert.match(document.body.textContent, /لا ينطبق على الوصفة أو سماكة اللوح الحاليين/);
});
