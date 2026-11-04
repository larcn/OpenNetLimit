(function (global) {
  'use strict';

  const WATER_MW = 18.015;
  const SUGAR_KEYS = Object.freeze(['sucrose', 'glucose', 'fructose', 'lactose', 'maltose']);

  const BASE_SUGAR_TABLE = Object.freeze({
    sucrose: Object.freeze({ K: 6.47, M: 342.30 }),
    maltose: Object.freeze({ K: 4.54, M: 342.30 }),
    glucose: Object.freeze({ K: 2.25, M: 180.16 }),
    lactose: Object.freeze({ K: 10.2, M: 342.30 }),
    fructose: Object.freeze({ K: null, M: 180.16 })
  });

  const UNCLASSIFIED_BOUNDS = Object.freeze([
    Object.freeze({ id: 'hexose', K: 2.25, M: 180.16 }),
    Object.freeze({ id: 'disaccharide', K: 4.54, M: 342.30 })
  ]);

  function getFructoseK() {
    const val = global.MEDOVIK_ENGINEERING_CONSTANTS?.FRUCTOSE_NORRISH_K?.value;
    return typeof val === 'number' && Number.isFinite(val) && val > 0 ? val : 2.15;
  }

  function evaluateMultiSoluteNorrish(waterG, entries) {
    const nWater = waterG / WATER_MW;
    let totalMoles = nWater;
    const molesAndK = new Array(entries.length);

    for (let i = 0; i < entries.length; i += 1) {
      const e = entries[i];
      const nSol = e.massG / e.M;
      totalMoles += nSol;
      molesAndK[i] = { n: nSol, sqrtK: Math.sqrt(e.K) };
    }

    if (!(totalMoles > 0)) return null;
    const xWater = nWater / totalMoles;
    let weightedMoleSum = 0;
    for (let i = 0; i < molesAndK.length; i += 1) {
      weightedMoleSum += molesAndK[i].sqrtK * (molesAndK[i].n / totalMoles);
    }

    return xWater * Math.exp(-(weightedMoleSum * weightedMoleSum));
  }

  function computeNorrishAwRange(input) {
    if (!input || typeof input !== 'object') {
      return {
        aw: null,
        awMin: null,
        awMax: null,
        reason: 'مدخلات حساب النشاط المائي غير صالحة.',
        assumptions: [],
        validityChecked: false
      };
    }

    const waterG = Number(input.waterG);
    if (!Number.isFinite(waterG) || waterG <= 0) {
      return {
        aw: null,
        awMin: null,
        awMax: null,
        reason: 'كتلة الماء في الطور المائي غير موجبة.',
        assumptions: [],
        validityChecked: false
      };
    }

    if (!Array.isArray(input.solutes)) {
      return {
        aw: null,
        awMin: null,
        awMax: null,
        reason: 'قائمة المذابات مفقودة أو غير صالحة.',
        assumptions: [],
        validityChecked: false
      };
    }

    const unclRaw = input.unclassifiedSugarG !== undefined ? Number(input.unclassifiedSugarG) : 0;
    if (!Number.isFinite(unclRaw) || unclRaw < 0) {
      return {
        aw: null,
        awMin: null,
        awMax: null,
        reason: 'كتلة السكر غير المصنّف غير صالحة.',
        assumptions: [],
        validityChecked: false
      };
    }

    const fructoseK = getFructoseK();
    const resolvedSolutes = [];
    let hasFructose = false;

    for (let i = 0; i < input.solutes.length; i += 1) {
      const s = input.solutes[i];
      const key = s && typeof s.key === 'string' ? s.key.trim() : '';
      if (!Object.prototype.hasOwnProperty.call(BASE_SUGAR_TABLE, key)) {
        return {
          aw: null,
          awMin: null,
          awMax: null,
          reason: `مذاب غير معرّف في جدول ثوابت Norrish: ${key || 'غير محدد'}.`,
          assumptions: [],
          validityChecked: false
        };
      }
      const massG = Number(s.massG);
      if (!Number.isFinite(massG) || massG < 0) {
        return {
          aw: null,
          awMin: null,
          awMax: null,
          reason: `كتلة غير صالحة للمذاب ${key}.`,
          assumptions: [],
          validityChecked: false
        };
      }
      if (massG > 0) {
        const spec = BASE_SUGAR_TABLE[key];
        const K = key === 'fructose' ? fructoseK : spec.K;
        if (key === 'fructose') hasFructose = true;
        resolvedSolutes.push({ key, massG, K, M: spec.M });
      }
    }

    if (resolvedSolutes.length === 0 && unclRaw <= 0) {
      return {
        aw: null,
        awMin: null,
        awMax: null,
        reason: 'لا توجد سكريات مذابة في الطور المائي لحساب معادلة Norrish.',
        assumptions: [],
        validityChecked: false
      };
    }

    const cornerValues = [];
    if (unclRaw > 0) {
      for (let c = 0; c < UNCLASSIFIED_BOUNDS.length; c += 1) {
        const bound = UNCLASSIFIED_BOUNDS[c];
        const val = evaluateMultiSoluteNorrish(waterG, [
          ...resolvedSolutes,
          { key: 'unclassified', massG: unclRaw, K: bound.K, M: bound.M }
        ]);
        if (val !== null && Number.isFinite(val)) {
          cornerValues.push(val);
        }
      }
    } else {
      const val = evaluateMultiSoluteNorrish(waterG, resolvedSolutes);
      if (val !== null && Number.isFinite(val)) {
        cornerValues.push(val);
      }
    }

    if (cornerValues.length === 0) {
      return {
        aw: null,
        awMin: null,
        awMax: null,
        reason: 'تعذر حساب النشاط المائي للطور المائي.',
        assumptions: [],
        validityChecked: false
      };
    }

    const awMin = Math.min(...cornerValues);
    const awMax = Math.max(...cornerValues);

    const assumptions = [
      'يقتصر الحساب على ماء الطور المائي والسكريات المذابة فقط دون الأملاح أو البروتينات أو الدهون، وباعتماد الوزن الجزيئي اللامائي للاكتوز (342.30).'
    ];
    if (hasFructose) {
      assumptions.push(`ثابت الفركتوز K=${fructoseK} موثّق ومعتمد من Chirife et al. (1980).`);
    }
    if (unclRaw > 0) {
      assumptions.push('السكر غير المصنّف محصور بين افتراض أحادي سداسي (K=2.25، M=180.16) وثنائي كالمالتوز (K=4.54، M=342.30).');
    }

    const minValid = global.MEDOVIK_ENGINEERING_CONSTANTS?.AW_VALIDITY_MIN?.value;
    const validityChecked = typeof minValid === 'number' && Number.isFinite(minValid);
    if (validityChecked && (awMin < minValid || awMax < minValid)) {
      return {
        aw: null,
        awMin: null,
        awMax: null,
        reason: `القيمة المحسوبة خارج مجال صلاحية معادلة Norrish المعتمد (أقل من ${minValid}).`,
        assumptions,
        validityChecked: true
      };
    }

    const aw = Math.round(((awMin + awMax) / 2) * 10000) / 10000;

    return {
      aw,
      awMin,
      awMax,
      reason: null,
      assumptions,
      validityChecked
    };
  }

  function estimateAqueousPhaseAw(formula, ingredientsDB) {
    const estimateFn = global.estimateFormulaComponents;
    const getIngFn = global.getIngredient;
    const evidenceFn = global.assessModelEvidence;

    if (!formula || !Array.isArray(formula.items) || typeof estimateFn !== 'function') {
      return {
        aw: null,
        awMin: null,
        awMax: null,
        status: 'INSUFFICIENT_EVIDENCE',
        reason: 'الصيغة غير متاحة لحساب النشاط المائي.',
        coverage: 0,
        aqueousWaterG: 0,
        solutes: [],
        unclassifiedSugarG: 0,
        assumptions: [],
        validityChecked: false
      };
    }

    const comp = estimateFn(formula, ingredientsDB);
    const coverage = Number.isFinite(comp?.coverage) ? comp.coverage : 0;
    const aqueousWaterG = Number.isFinite(comp?.waterMass) ? comp.waterMass : 0;

    if (!(comp?.totalMass > 0)) {
      return {
        aw: null,
        awMin: null,
        awMax: null,
        status: 'INSUFFICIENT_EVIDENCE',
        reason: 'الصيغة فارغة ولا تحوي كتلة موجبة.',
        coverage: 0,
        aqueousWaterG: 0,
        solutes: [],
        unclassifiedSugarG: 0,
        assumptions: [],
        validityChecked: false
      };
    }

    const evidence = typeof evidenceFn === 'function'
      ? evidenceFn({ claimType: 'AQUEOUS_AW', compositionCoverage: coverage })
      : { status: coverage >= 0.90 ? 'BOUNDED_ESTIMATE' : 'INSUFFICIENT_EVIDENCE', reason: 'التغطية التركيبية أقل من 90%.' };

    if (evidence.status === 'INSUFFICIENT_EVIDENCE') {
      return {
        aw: null,
        awMin: null,
        awMax: null,
        status: 'INSUFFICIENT_EVIDENCE',
        reason: evidence.reason || 'التغطية التركيبية أقل من 90%.',
        coverage,
        aqueousWaterG,
        solutes: [],
        unclassifiedSugarG: 0,
        assumptions: [],
        validityChecked: false
      };
    }

    const soluteMassByKey = new Map();
    SUGAR_KEYS.forEach((k) => soluteMassByKey.set(k, 0));
    let unclassifiedSugarG = 0;

    for (let i = 0; i < formula.items.length; i += 1) {
      const item = formula.items[i];
      const mass = Number(item?.weight) || 0;
      if (mass <= 0) continue;
      const ing = typeof getIngFn === 'function'
        ? getIngFn(ingredientsDB, item.ingredientId)
        : ingredientsDB?.[item.ingredientId];
      if (!ing || ing._missing) continue;

      let classifiedFrac = 0;
      for (let k = 0; k < SUGAR_KEYS.length; k += 1) {
        const key = SUGAR_KEYS[k];
        const frac = Math.max(0, Number(ing[key]) || 0);
        if (frac > 0) {
          classifiedFrac += frac;
          soluteMassByKey.set(key, soluteMassByKey.get(key) + mass * frac);
        }
      }

      const totalSugarFrac = Math.max(0, Number(ing.totalSugarFrac ?? ing.sugarFrac ?? 0) || 0);
      const remFrac = totalSugarFrac - classifiedFrac;
      if (remFrac > 1e-9) {
        unclassifiedSugarG += mass * remFrac;
      }
    }

    unclassifiedSugarG = Math.round(unclassifiedSugarG * 1e9) / 1e9;
    const solutes = [];
    for (let k = 0; k < SUGAR_KEYS.length; k += 1) {
      const key = SUGAR_KEYS[k];
      const massG = soluteMassByKey.get(key) || 0;
      if (massG > 0) {
        solutes.push({ key, massG });
      }
    }

    const range = computeNorrishAwRange({
      waterG: aqueousWaterG,
      solutes,
      unclassifiedSugarG
    });

    if (range.aw === null) {
      return {
        aw: null,
        awMin: null,
        awMax: null,
        status: 'INSUFFICIENT_EVIDENCE',
        reason: range.reason,
        coverage,
        aqueousWaterG,
        solutes,
        unclassifiedSugarG,
        assumptions: range.assumptions,
        validityChecked: range.validityChecked
      };
    }

    return {
      aw: range.aw,
      awMin: range.awMin,
      awMax: range.awMax,
      status: 'BOUNDED_ESTIMATE',
      reason: null,
      coverage,
      aqueousWaterG,
      solutes,
      unclassifiedSugarG,
      assumptions: range.assumptions,
      validityChecked: range.validityChecked
    };
  }

  global.MedovikAqueousActivity = Object.freeze({
    computeNorrishAwRange,
    estimateAqueousPhaseAw
  });
})(typeof window !== 'undefined' ? window : globalThis);
