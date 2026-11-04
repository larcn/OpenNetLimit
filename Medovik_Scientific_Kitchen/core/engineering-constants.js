(function(global) {
  'use strict';

  const constants = Object.freeze({
    THICKNESS_INPUT_RANGE_MM: Object.freeze({
      value: Object.freeze({ minExclusive: 0.2, maxInclusive: 20 }),
      unit: 'mm',
      status: 'PROPOSED',
      reason: 'حارس لأخطاء الإدخال لا قيمة علمية (D11)'
    }),
    LEX_WEIGHT_RATIO: Object.freeze({
      value: 1e8,
      unit: 'ratio',
      status: 'NUMERICAL',
      reason: 'نسبة وزن قيد الحلاوة إلى قيد الصلب/الماء في الأنماط المقيّدة غير المربعة (D2)'
    }),
    SOLVER_REGULARIZATION: Object.freeze({
      value: 1e-9,
      unit: 'dimensionless',
      status: 'NUMERICAL',
      reason: 'معامل التنظيم نحو القيمة المرجعية x0 في الأنظمة ناقصة التحديد (D2)'
    }),
    SWEETNESS_SOLVER_DEFAULT: Object.freeze({
      value: 'legacy',
      unit: 'mode',
      status: 'OWNER_DECISION',
      reason: 'يبقى الحلّال القديم افتراضيًا حتى يراجع المالك docs/solver-diff-report.md ويحسم القرار (D3)'
    }),
    FRUCTOSE_NORRISH_K: Object.freeze({
      value: 2.15,
      unit: 'dimensionless',
      status: 'APPROVED',
      sourceRef: 'chirife_1980_norrish',
      reason: 'ثابت Norrish الموثق للفركتوز K = 2.15 من Chirife, Ferro Fontán & Benmergui (1980) والمعتمد من المالك (D4)'
    }),
    AW_VALIDITY_MIN: Object.freeze({
      value: null,
      unit: 'a_w',
      status: 'OWNER_DECISION',
      reason: 'مجال صلاحية معادلة Norrish يقرّه المالك بعد مراجعة المرجع (D4)'
    }),
    DEFAULT_CREAM_RECONSTITUTION_RATIO: Object.freeze({
      value: 2.0,
      unit: 'g_liquid_per_g_powder',
      status: 'APPROVED',
      reason: 'النسبة القياسية لتحضير الكريمة البودر الخام غير المحلاة 1 بودر : 2 سائل بالوزن (D14)'
    }),
    UNSWEETENED_CREAM_POWDER_SPEC: Object.freeze({
      value: Object.freeze({
        waterFrac: 0.03,
        fatFrac: 0.66,
        proteinFrac: 0.08,
        carbsFrac: 0.23,
        otherSolidsFrac: 0.23,
        sugarFrac: 0,
        totalSugarFrac: 0,
        density: 0.55
      }),
      unit: 'mass_fraction',
      status: 'PROPOSED',
      reason: 'تركيب مرجعي لبودر كريمة خفق خام غير محلاة للتحليل الاختياري عند غياب ملصق المستخدم (D14)'
    })
  });

  global.MEDOVIK_ENGINEERING_CONSTANTS = constants;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = constants;
  }
})(typeof window !== 'undefined' ? window : globalThis);
