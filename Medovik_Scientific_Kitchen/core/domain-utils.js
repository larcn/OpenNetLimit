/* Medovik v6 — shared domain utilities and validation */
(function(global) {
  'use strict';

  const VALUE_STATUS = Object.freeze({
    SOURCE_VALUE: 'SOURCE_VALUE',
    REFERENCE_RELATION: 'REFERENCE_RELATION',
    ENGINEERING_DEFAULT: 'ENGINEERING_DEFAULT',
    EMPIRICAL_PRESET: 'EMPIRICAL_PRESET',
    USER_MEASURED: 'USER_MEASURED',
    MODEL_ESTIMATE: 'MODEL_ESTIMATE',
    UNKNOWN: 'UNKNOWN'
  });

  const MASS_BASIS = Object.freeze({
    SOURCE_FORMULA: 'SOURCE_FORMULA',
    PREPARED_BATCH: 'PREPARED_BATCH',
    NET_FOR_LAYERS: 'NET_FOR_LAYERS',
    BAKED_PRODUCT: 'BAKED_PRODUCT',
    ON_PRODUCT: 'ON_PRODUCT',
    USABLE_AFTER_PROCESS: 'USABLE_AFTER_PROCESS'
  });

  const DOUGH_PROCESS_FAMILY = Object.freeze({
    HOT_BASE_EGG_ADDED_AFTER_HEAT: 'HOT_BASE_EGG_ADDED_AFTER_HEAT',
    EGG_HEATED_FROM_START: 'EGG_HEATED_FROM_START',
    BAIN_MARIE_EGG_SYSTEM: 'BAIN_MARIE_EGG_SYSTEM',
    SOUR_CREAM_SODA_SPARTAK: 'SOUR_CREAM_SODA_SPARTAK',
    SOURCE_INCOMPLETE: 'SOURCE_INCOMPLETE'
  });

  const DOUGH_SHAPING_FAMILY = Object.freeze({
    ROLLED_WARM: 'ROLLED_WARM',
    ROLLED_CHILLED: 'ROLLED_CHILLED',
    ROLLED_RESTED: 'ROLLED_RESTED',
    ROLLED_DIRECT: 'ROLLED_DIRECT',
    SPREAD_BATTER_SHEET: 'SPREAD_BATTER_SHEET',
    SOURCE_INCOMPLETE: 'SOURCE_INCOMPLETE'
  });

  function finiteOrNull(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function clamp(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function cleanText(value, maxLength = 10000) {
    const text = String(value == null ? '' : value);
    return text.slice(0, Math.max(0, maxLength));
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function validateFraction(value, fieldName, errors, { allowNull = true } = {}) {
    if (value == null && allowNull) return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 1) {
      errors.push(`${fieldName} يجب أن يكون بين 0 و1.`);
      return null;
    }
    return n;
  }

  function validateIngredientRecord(record, { tolerance = 0.005 } = {}) {
    const errors = [];
    const warnings = [];
    if (!record || typeof record !== 'object') return { ok: false, errors: ['سجل المكوّن غير صالح.'], warnings, normalized: null };
    const id = String(record.id || '').trim();
    if (!id) errors.push('معرّف المكوّن مطلوب.');

    const normalized = { ...record, id };
    const fractionFields = [
      'waterFrac', 'sugarFrac', 'fatFrac', 'proteinFrac', 'starchFrac',
      'otherSolidsFrac', 'milkSolidsFrac', 'cocoaSolidsFrac', 'cocoaFiberFrac',
      'phospholipidsFrac', 'carbsFrac'
    ];
    fractionFields.forEach(field => {
      if (record[field] != null) normalized[field] = validateFraction(record[field], field, errors, { allowNull: true });
    });

    const density = finiteOrNull(record.density);
    if (density != null && (density <= 0 || density > 3)) errors.push('الكثافة يجب أن تكون أكبر من صفر وأقل من أو تساوي 3 جم/مل.');
    normalized.density = density == null ? 1 : density;

    // Primary mass-balance fields only. Aggregate descriptors such as milkSolidsFrac, carbsFrac,
    // cocoaFiberFrac and phospholipidsFrac overlap with detailed fractions and are not summed twice.
    const compositionFields = ['waterFrac', 'sugarFrac', 'fatFrac', 'proteinFrac', 'starchFrac', 'otherSolidsFrac', 'cocoaSolidsFrac'];
    const compositionSum = compositionFields.reduce((sum, field) => sum + (Number(normalized[field]) || 0), 0);
    if (compositionSum > 1 + tolerance) errors.push(`مجموع الكسور التركيبية ${compositionSum.toFixed(3)} يتجاوز 1.`);
    if (compositionSum < 0.75) warnings.push(`التغطية التركيبية للمكوّن منخفضة (${Math.round(compositionSum * 100)}%).`);

    const totalSugar = Number(normalized.totalSugarFrac ?? normalized.sugarFrac ?? 0) || 0;
    const sugarProfileFields = ['sucrose', 'glucose', 'fructose', 'lactose', 'maltose'];
    const sugarProfileTotal = sugarProfileFields.reduce((sum, field) => {
      const val = record[field];
      if (val == null) return sum;
      const checked = validateFraction(val, field, errors, { allowNull: true });
      normalized[field] = checked;
      return sum + (Number(checked) || 0);
    }, 0);
    if (sugarProfileTotal > totalSugar + tolerance) errors.push('مجموع أنواع السكر يتجاوز إجمالي السكر المسجل.');
    normalized.totalSugarFrac = totalSugar;
    normalized.sugarProfileCoverage = totalSugar > 0 ? Math.min(1, sugarProfileTotal / totalSugar) : 1;
    normalized.compositionCoverage = Math.min(1, compositionSum);

    return { ok: errors.length === 0, errors, warnings, normalized, compositionSum, sugarProfileTotal };
  }

  const PRODUCT_SPEC_LIMITS = Object.freeze({
    d1: [5, 100],
    d2: [5, 100],
    layers: [1, 40],
    rawSheetThicknessMm: [0.2, 15],
    targetBakedLayerThicknessMm: [0.2, 20],
    estimatedBakedLayerThicknessMm: [0.2, 20],
    fillingThicknessMm: [0, 30],
    topCoatThicknessMm: [0, 30],
    sideCoatThicknessMm: [0, 30],
    wastePct: [0, 50],
    ballWeight: [5, 2000],
    targetFlourWeight: [10, 50000],
    targetTotalDoughWeight: [20, 100000]
  });

  function normalizeProductSpec(input = {}, { preserveUnknown = true } = {}) {
    const source = input && typeof input === 'object' ? input : {};
    const out = preserveUnknown ? { ...source } : {};
    const warnings = [];
    const errors = [];
    const rawShape = String(source.shape || '').toLowerCase();
    out.shape = rawShape === 'rect' || rawShape === 'rectangle' || rawShape === 'square' ? 'rect' : 'round';
    out.d1 = clamp(source.d1 ?? 20, ...PRODUCT_SPEC_LIMITS.d1);
    out.d2 = clamp(source.d2 ?? (out.shape === 'round' ? 0 : 30), ...PRODUCT_SPEC_LIMITS.d2);
    out.layers = Math.round(clamp(source.layers ?? 8, ...PRODUCT_SPEC_LIMITS.layers));

    const legacyThickness = finiteOrNull(source.doughThicknessMm);
    const raw = finiteOrNull(source.rawSheetThicknessMm);
    const baked = finiteOrNull(source.targetBakedLayerThicknessMm);
    out.rawSheetThicknessMm = clamp(raw ?? legacyThickness ?? 1.5, ...PRODUCT_SPEC_LIMITS.rawSheetThicknessMm);
    out.targetBakedLayerThicknessMm = clamp(baked ?? legacyThickness ?? 2, ...PRODUCT_SPEC_LIMITS.targetBakedLayerThicknessMm);
    out.estimatedBakedLayerThicknessMm = clamp(
      source.estimatedBakedLayerThicknessMm ?? out.targetBakedLayerThicknessMm,
      ...PRODUCT_SPEC_LIMITS.estimatedBakedLayerThicknessMm
    );
    out.legacyAmbiguousThickness = Boolean(source.legacyAmbiguousThickness || (legacyThickness != null && raw == null && baked == null));
    if (out.legacyAmbiguousThickness) warnings.push('تم ترحيل حقل السمك القديم إلى قيمتي الفرد والطبقة المخبوزة؛ راجعهما عند الحاجة.');
    delete out.doughThicknessMm;

    ['fillingThicknessMm', 'topCoatThicknessMm', 'sideCoatThicknessMm', 'wastePct', 'ballWeight', 'targetFlourWeight', 'targetTotalDoughWeight'].forEach(field => {
      const fallback = field === 'fillingThicknessMm' ? 3
        : field === 'wastePct' ? 10
        : field === 'ballWeight' ? 140
        : field === 'targetFlourWeight' ? 500
        : field === 'targetTotalDoughWeight' ? 1000
        : 2;
      out[field] = clamp(source[field] ?? fallback, ...PRODUCT_SPEC_LIMITS[field]);
    });
    out.includeOuterCoat = source.includeOuterCoat !== false;
    out.totalDoughMassBasis = source.totalDoughMassBasis === 'net' ? 'net' : 'prepared';
    out.scaleMode = ['volume', 'rawThickness', 'manualBall', 'totalDoughWeight', 'flourBasis'].includes(source.scaleMode) ? source.scaleMode : 'volume';

    for (const [field, limits] of Object.entries(PRODUCT_SPEC_LIMITS)) {
      const original = finiteOrNull(source[field]);
      if (original != null && (original < limits[0] || original > limits[1])) warnings.push(`${field} عُدل إلى النطاق التشغيلي المسموح.`);
    }
    return { ok: errors.length === 0, value: out, errors, warnings };
  }

  function formatEstimate(value, { digits = 1, prefix = 'نحو ', suffix = '' } = {}) {
    const n = finiteOrNull(value);
    if (n == null) return 'غير متاح';
    const rounded = Number(n.toFixed(digits));
    return `${prefix}${rounded}${suffix}`;
  }

  global.MEDOVIK_VALUE_STATUS = VALUE_STATUS;
  global.PRODUCT_SPEC_LIMITS = PRODUCT_SPEC_LIMITS;
  global.MEDOVIK_MASS_BASIS = MASS_BASIS;
  global.MEDOVIK_DOUGH_PROCESS_FAMILY = DOUGH_PROCESS_FAMILY;
  global.MEDOVIK_DOUGH_SHAPING_FAMILY = DOUGH_SHAPING_FAMILY;
  global.medovikFiniteOrNull = finiteOrNull;
  global.medovikClamp = clamp;
  global.medovikCleanText = cleanText;
  global.escapeHtml = global.escapeHtml || escapeHtml;
  global.validateIngredientRecord = validateIngredientRecord;
  global.normalizeProductSpec = normalizeProductSpec;
  global.formatEngineeringEstimate = formatEstimate;
})(typeof window !== 'undefined' ? window : globalThis);
