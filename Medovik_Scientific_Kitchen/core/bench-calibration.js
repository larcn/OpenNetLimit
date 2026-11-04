// =============================================================================
// Medovik Scientific Kitchen — Bench Calibration (Task 10+)
// Pure calibration helpers for kitchen bench measurements (strained sour cream,
// first baked layer, session bench normalization, and localized input parsing).
// =============================================================================
(function(global) {
  'use strict';

  function calibrateStrainedSourCream(input, ingredientsDB) {
    const errors = [];
    if (!input || typeof input !== 'object') {
      return { ok: false, errors: ['مدخلات معايرة التصفية غير صالحة.'] };
    }
    const raw = Number(input.rawWeightG);
    const strained = Number(input.strainedWeightG);
    if (!Number.isFinite(raw) || raw <= 0) {
      errors.push('الوزن الخام قبل التصفية يجب أن يكون عددًا موجبًا.');
    }
    if (!Number.isFinite(strained) || strained <= 0) {
      errors.push('الوزن بعد التصفية يجب أن يكون عددًا موجبًا.');
    }
    if (errors.length === 0 && strained > raw) {
      errors.push('الوزن بعد التصفية لا يمكن أن يتجاوز الوزن الخام قبل التصفية.');
    }
    if (errors.length > 0) {
      return { ok: false, errors };
    }

    const src = ingredientsDB?.['sour-cream'] || global.BaseIngredientsDB?.['sour-cream'] || null;
    if (!src) {
      return { ok: false, errors: ['سجل الساور كريم الأساسي غير متوفر في قاعدة البيانات.'] };
    }

    const outputRatio = strained / raw;
    const lostWeightG = raw - strained;
    const templateId = outputRatio <= 0.85 ? 'sour-cream-strained-82' : 'sour-cream-strained-88';
    const template = ingredientsDB?.[templateId] || null;
    if (!template) {
      return { ok: false, errors: [`قالب الساور كريم المصفّى (${templateId}) غير متوفر في قاعدة البيانات.`] };
    }

    const water0 = Number(src.waterFrac) || 0;
    const waterFrac = (water0 - (1 - outputRatio)) / outputRatio;
    if (!Number.isFinite(waterFrac) || waterFrac < 0) {
      return {
        ok: false,
        errors: ['الوزن بعد التصفية أقل من كتلة المواد الصلبة المتاحة (يتطلب فقد ماء أكبر من الماء الموجود).']
      };
    }

    const fatFrac = (Number(src.fatFrac) || 0) / outputRatio;
    const proteinFrac = (Number(src.proteinFrac) || 0) / outputRatio;
    const sugarFrac = (Number(src.sugarFrac) || 0) / outputRatio;
    const totalSugarFrac = (Number(src.totalSugarFrac ?? src.sugarFrac) || 0) / outputRatio;
    const lactose = (Number(src.lactose ?? src.sugarFrac) || 0) / outputRatio;
    const otherSolidsFrac = (Number(src.otherSolidsFrac) || 0) / outputRatio;

    const pctRounded = Math.round(outputRatio * 1000) / 10;
    const record = JSON.parse(JSON.stringify(template));
    record.id = 'sour-cream-strained-measured';
    record.displayName = `ساور كريم مصفّى مقاس (عائد ${pctRounded}%)`;
    record.outputRatio = outputRatio;
    record.compositionStatus = 'USER_MEASURED';
    record.waterFrac = waterFrac;
    record.fatFrac = fatFrac;
    record.proteinFrac = proteinFrac;
    record.sugarFrac = sugarFrac;
    record.totalSugarFrac = totalSugarFrac;
    record.lactose = lactose;
    record.otherSolidsFrac = otherSolidsFrac;
    delete record.handling;

    const validateFn = global.validateIngredientRecord;
    if (typeof validateFn === 'function') {
      const validation = validateFn(record, { tolerance: 0.005 });
      if (!validation.ok) {
        return { ok: false, errors: validation.errors };
      }
    }

    return {
      ok: true,
      outputRatio,
      lostWeightG,
      record
    };
  }

  function registerMeasuredIngredient(ingredientsDB, record) {
    if (!ingredientsDB || typeof ingredientsDB !== 'object') {
      throw new Error('قاعدة بيانات المكوّنات مطلوبة لتسجيل السجل المقاس.');
    }
    if (!record || typeof record !== 'object' || !record.id) {
      throw new Error('سجل المكوّن المقاس غير صالح.');
    }
    const id = String(record.id);
    if (global.BaseIngredientsDB && Object.prototype.hasOwnProperty.call(global.BaseIngredientsDB, id)) {
      throw new Error(`لا يُسمح بالكتابة فوق مكوّن أساسي (${id}).`);
    }
    if (
      Object.prototype.hasOwnProperty.call(ingredientsDB, id) &&
      ingredientsDB[id]?.compositionStatus !== 'USER_MEASURED'
    ) {
      throw new Error(`لا يُسمح بالكتابة فوق مكوّن مدمج غير مقاس (${id}).`);
    }
    if (record.compositionStatus !== 'USER_MEASURED') {
      throw new Error('يجب أن يحمل السجل المقاس الحالة USER_MEASURED.');
    }

    const validateFn = global.validateIngredientRecord;
    if (typeof validateFn === 'function') {
      const validation = validateFn(record, { tolerance: 0.005 });
      if (!validation.ok) {
        throw new Error(validation.errors.join(' '));
      }
    }

    const copy = JSON.parse(JSON.stringify(record));
    delete copy.handling;
    ingredientsDB[id] = Object.freeze(copy);
  }

  function unregisterMeasuredIngredient(ingredientsDB, id) {
    if (!ingredientsDB || typeof ingredientsDB !== 'object' || !id) return false;
    const key = String(id);
    if (global.BaseIngredientsDB && Object.prototype.hasOwnProperty.call(global.BaseIngredientsDB, key)) {
      return false;
    }
    if (!Object.prototype.hasOwnProperty.call(ingredientsDB, key)) {
      return false;
    }
    if (ingredientsDB[key]?.compositionStatus !== 'USER_MEASURED') {
      return false;
    }
    delete ingredientsDB[key];
    return true;
  }

  function getThicknessRange() {
    const entry = global.MEDOVIK_ENGINEERING_CONSTANTS?.THICKNESS_INPUT_RANGE_MM?.value;
    return {
      minExclusive: Number.isFinite(entry?.minExclusive) ? entry.minExclusive : 0.2,
      maxInclusive: Number.isFinite(entry?.maxInclusive) ? entry.maxInclusive : 20
    };
  }

  function isPosFiniteNumber(v) {
    return typeof v === 'number' && Number.isFinite(v) && v > 0;
  }

  function normalizeBench(raw) {
    const out = {
      strained: null,
      firstLayer: null,
      timers: []
    };
    if (!raw || typeof raw !== 'object') {
      return out;
    }

    const s = raw.strained;
    if (
      s &&
      typeof s === 'object' &&
      isPosFiniteNumber(s.rawWeightG) &&
      isPosFiniteNumber(s.strainedWeightG) &&
      s.strainedWeightG <= s.rawWeightG &&
      typeof s.measuredAt === 'string'
    ) {
      out.strained = {
        rawWeightG: s.rawWeightG,
        strainedWeightG: s.strainedWeightG,
        measuredAt: s.measuredAt
      };
    }

    const f = raw.firstLayer;
    const range = getThicknessRange();
    if (
      f &&
      typeof f === 'object' &&
      isPosFiniteNumber(f.rawLayerWeightG) &&
      isPosFiniteNumber(f.bakedLayerWeightG) &&
      isPosFiniteNumber(f.areaCm2) &&
      f.bakedLayerWeightG <= f.rawLayerWeightG &&
      Array.isArray(f.thicknessPointsMm) &&
      f.thicknessPointsMm.length >= 1 &&
      f.thicknessPointsMm.length <= 10 &&
      f.thicknessPointsMm.every(
        (pt) =>
          typeof pt === 'number' &&
          Number.isFinite(pt) &&
          pt > range.minExclusive &&
          pt <= range.maxInclusive
      ) &&
      typeof f.measuredAt === 'string' &&
      typeof f.context === 'string'
    ) {
      out.firstLayer = {
        rawLayerWeightG: f.rawLayerWeightG,
        bakedLayerWeightG: f.bakedLayerWeightG,
        areaCm2: f.areaCm2,
        thicknessPointsMm: f.thicknessPointsMm.slice(),
        measuredAt: f.measuredAt,
        context: f.context
      };
    }

    if (Array.isArray(raw.timers)) {
      for (let i = 0; i < raw.timers.length; i += 1) {
        const t = raw.timers[i];
        if (
          t &&
          typeof t === 'object' &&
          typeof t.id === 'string' &&
          typeof t.stepId === 'string' &&
          typeof t.cueText === 'string' &&
          typeof t.startedAtMs === 'number' &&
          Number.isFinite(t.startedAtMs) &&
          t.startedAtMs >= 0 &&
          typeof t.minSeconds === 'number' &&
          Number.isFinite(t.minSeconds) &&
          typeof t.maxSeconds === 'number' &&
          Number.isFinite(t.maxSeconds) &&
          t.minSeconds >= 0 &&
          t.minSeconds <= t.maxSeconds
        ) {
          out.timers.push({
            id: t.id,
            stepId: t.stepId,
            cueText: t.cueText,
            startedAtMs: t.startedAtMs,
            minSeconds: t.minSeconds,
            maxSeconds: t.maxSeconds
          });
        }
      }
    }

    return out;
  }

  function benchContextKey(input) {
    const recipeId = String(input?.doughRecipeId ?? '');
    const rawMm = Number(input?.rawSheetThicknessMm);
    const items = Array.isArray(input?.doughFormula?.items) ? input.doughFormula.items : [];
    const byId = new Map();
    let totalMass = 0;

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (!item || typeof item !== 'object') continue;
      const id = String(item.ingredientId || '').trim();
      const w = Number(item.weight);
      if (!id || !Number.isFinite(w) || w <= 0) continue;
      byId.set(id, (byId.get(id) || 0) + w);
      totalMass += w;
    }

    let fingerprint = 'empty';
    if (totalMass > 0 && byId.size > 0) {
      const sortedIds = Array.from(byId.keys()).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      fingerprint = sortedIds
        .map((id) => `${id}:${(byId.get(id) / totalMass).toFixed(4)}`)
        .join(',');
    }

    return `${recipeId}|raw${rawMm}|${fingerprint}`;
  }

  function calibrateFirstBakedLayer(input) {
    const errors = [];
    if (!input || typeof input !== 'object') {
      return { ok: false, errors: ['مدخلات معايرة الطبقة الأولى غير صالحة.'] };
    }
    const raw = Number(input.rawLayerWeightG);
    const baked = Number(input.bakedLayerWeightG);
    const area = Number(input.areaCm2);
    const pts = Array.isArray(input.thicknessPointsMm) ? input.thicknessPointsMm : null;
    const range = getThicknessRange();

    if (!Number.isFinite(raw) || raw <= 0) {
      errors.push('وزن الطبقة الخام يجب أن يكون عددًا موجبًا.');
    }
    if (!Number.isFinite(baked) || baked <= 0) {
      errors.push('وزن الطبقة المخبوزة يجب أن يكون عددًا موجبًا.');
    }
    if (errors.length === 0 && baked > raw) {
      errors.push('وزن الطبقة المخبوزة لا يمكن أن يتجاوز وزن الطبقة الخام.');
    }
    if (!Number.isFinite(area) || area <= 0) {
      errors.push('مساحة الطبقة يجب أن تكون عددًا موجبًا.');
    }
    if (!pts || pts.length < 1 || pts.length > 10) {
      errors.push('نقاط السماكة يجب أن تكون بين نقطة واحدة و10 نقاط.');
    } else {
      for (let i = 0; i < pts.length; i += 1) {
        const pt = Number(pts[i]);
        if (!Number.isFinite(pt) || pt <= range.minExclusive || pt > range.maxInclusive) {
          errors.push(`نقطة السماكة رقم ${i + 1} خارج المجال المسموح (${range.minExclusive}–${range.maxInclusive} مم).`);
        }
      }
    }

    if (errors.length > 0) {
      return { ok: false, errors };
    }

    const numericPts = pts.map(Number);
    const sum = numericPts.reduce((acc, v) => acc + v, 0);
    const avgThicknessMm = sum / numericPts.length;
    const minPt = Math.min(...numericPts);
    const maxPt = Math.max(...numericPts);
    const spreadMm = maxPt - minPt;
    const spreadRelPct = (spreadMm / avgThicknessMm) * 100;
    const bakedDensity = baked / ((area * avgThicknessMm) / 10);
    const bakeYield = baked / raw;
    const massLossPct = (1 - bakeYield) * 100;

    return {
      ok: true,
      status: 'USER_MEASURED',
      avgThicknessMm,
      spreadMm,
      spreadRelPct,
      bakedDensity,
      bakeYield,
      massLossPct
    };
  }

  function parseDecimalField(rawText, fieldLabel, errors) {
    const parseFn = global.MedovikNumericInput?.parseLocalizedDecimal;
    if (typeof parseFn !== 'function') {
      errors.push(`تعذر قراءة ${fieldLabel}: محلل الأرقام غير متوفر.`);
      return null;
    }
    const str = typeof rawText === 'string' ? rawText : String(rawText ?? '');
    if (str.trim() === '') {
      errors.push(`حقل «${fieldLabel}» مطلوب ولا يقبل قيمة فارغة.`);
      return null;
    }
    const val = parseFn(str);
    if (val === null || !Number.isFinite(val)) {
      errors.push(`حقل «${fieldLabel}» يحتوي على صيغة رقمية غير صالحة (أدخل الرقم فقط بلا وحدات).`);
      return null;
    }
    if (val <= 0) {
      errors.push(`حقل «${fieldLabel}» يجب أن يكون عددًا موجبًا أكبر من صفر.`);
      return null;
    }
    return val;
  }

  function parseStrainedInputs(texts) {
    const errors = [];
    if (!texts || typeof texts !== 'object') {
      return { ok: false, errors: ['مدخلات التصفية مطلوبة.'] };
    }
    const rawWeightG = parseDecimalField(texts.rawText, 'الوزن الخام', errors);
    const strainedWeightG = parseDecimalField(texts.strainedText, 'الوزن بعد التصفية', errors);
    if (errors.length === 0 && strainedWeightG > rawWeightG) {
      errors.push('حقل «الوزن بعد التصفية» لا يمكن أن يتجاوز «الوزن الخام».');
    }
    if (errors.length > 0) {
      return { ok: false, errors };
    }
    return {
      ok: true,
      values: { rawWeightG, strainedWeightG }
    };
  }

  function parseFirstLayerInputs(texts) {
    const errors = [];
    if (!texts || typeof texts !== 'object') {
      return { ok: false, errors: ['مدخلات الطبقة الأولى مطلوبة.'] };
    }
    const rawLayerWeightG = parseDecimalField(texts.rawText, 'وزن الطبقة الخام', errors);
    const bakedLayerWeightG = parseDecimalField(texts.bakedText, 'وزن الطبقة المخبوزة', errors);
    const areaCm2 = parseDecimalField(texts.areaText, 'مساحة القالب', errors);

    if (
      rawLayerWeightG !== null &&
      bakedLayerWeightG !== null &&
      bakedLayerWeightG > rawLayerWeightG
    ) {
      errors.push('حقل «وزن الطبقة المخبوزة» لا يمكن أن يتجاوز «وزن الطبقة الخام».');
    }

    const rawPts = Array.isArray(texts.thicknessTexts) ? texts.thicknessTexts : null;
    const range = getThicknessRange();
    const thicknessPointsMm = [];

    if (!rawPts || rawPts.length < 1 || rawPts.length > 10) {
      errors.push('حقل «نقاط السماكة» يجب أن يضم من نقطة واحدة إلى 10 نقاط.');
    } else {
      for (let i = 0; i < rawPts.length; i += 1) {
        const label = `نقطة السماكة ${i + 1}`;
        const val = parseDecimalField(rawPts[i], label, errors);
        if (val !== null) {
          if (val <= range.minExclusive || val > range.maxInclusive) {
            errors.push(
              `حقل «${label}» خارج مجال السماكة المسموح (أكبر من ${range.minExclusive} وحتى ${range.maxInclusive} مم).`
            );
          } else {
            thicknessPointsMm.push(val);
          }
        }
      }
    }

    if (errors.length > 0) {
      return { ok: false, errors };
    }

    return {
      ok: true,
      values: {
        rawLayerWeightG,
        bakedLayerWeightG,
        areaCm2,
        thicknessPointsMm
      }
    };
  }

  global.MedovikBench = Object.freeze({
    calibrateStrainedSourCream,
    registerMeasuredIngredient,
    unregisterMeasuredIngredient,
    normalizeBench,
    benchContextKey,
    calibrateFirstBakedLayer,
    parseStrainedInputs,
    parseFirstLayerInputs
  });
})(typeof window !== 'undefined' ? window : globalThis);
