/* offline build: balance.js */
// balance.js



function getSweetnessEquivalentPerGram(ing) {
  if (!ing || ing._missing) return 0;
  const factors = { sucrose: 1.0, fructose: 1.3, glucose: 0.7, lactose: 0.2, maltose: 0.45 };
  const totalSugar = Math.max(0, Number(ing.totalSugarFrac ?? ing.sugarFrac ?? 0) || 0);
  let classified = 0;
  let equivalent = 0;
  Object.entries(factors).forEach(([field, factor]) => {
    const fraction = Math.max(0, Number(ing[field]) || 0);
    classified += fraction;
    equivalent += fraction * factor;
  });
  equivalent += Math.max(0, totalSugar - classified); // سكر غير مفصل: يعامل كسكروز مكافئ معلن
  return equivalent;
}

function normalizeIdList(value) {
  return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
}

function isDirectSweetnessAdjustable(ing, ingredientId = null, options = null) {
  if (!ing) return false;
  const id = String(ingredientId || ing.id || '').trim();
  const explicitAdjustable = normalizeIdList(options?.adjustableIngredientIds);
  const explicitBlocked = normalizeIdList(options?.neverAdjustIngredientIds);
  if (explicitBlocked.includes(id)) return false;
  if (explicitAdjustable.length) return explicitAdjustable.includes(id);
  if (ing.type === 'sugar') return true;
  if (ing.type !== 'sweetener') return false;
  const fat = ing.fatFrac ?? 0;
  const protein = ing.proteinFrac ?? 0;
  const water = ing.waterFrac ?? 0;
  return fat <= 0.02 && protein <= 0.02 && water <= 0.40;
}

function getIngredientContribution(ing, mass) {
  const c = getIngredientContributionFromRecord(ing, mass);
  const sweetnessEq = mass * getSweetnessEquivalentPerGram(ing);
  return {
    water: c.water,
    sugar: c.sugar,
    fat: c.fat,
    protein: c.protein,
    otherSolids: c.starch + c.cocoa + c.milkSolids + c.carbs + c.otherSolids,
    solids: c.solids,
    sweetnessEq
  };
}

function analyzeFormulaGroups(formula, ingredientsDB, options = null) {
  const adjustableItems = [];
  const fixedItems = [];
  const dairyItems = [];

  const totals = {
    totalEq: 0,
    adjustableEq: 0,
    fixedEq: 0,
    adjustableWater: 0,
    adjustableSolids: 0,
    fixedWater: 0,
    fixedSolids: 0
  };

  formula.items.forEach((item, idx) => {
    if (!item || item.weight <= 0) return;
    const ing = getIngredient(ingredientsDB, item.ingredientId);
    const c = getIngredientContribution(ing, item.weight);
    const row = {
      index: idx,
      ingredientId: item.ingredientId,
      name: ing.displayName || item.ingredientId,
      weight: item.weight,
      ing,
      ...c
    };

    const fixedIds = normalizeIdList(options?.fixedSweetnessIngredientIds);
    const compensationIds = normalizeIdList(options?.compensationIngredientIds);
    const explicitAdjustable = normalizeIdList(options?.adjustableIngredientIds);
    const forcedFixed = fixedIds.includes(item.ingredientId);
    const adjustable = !forcedFixed && isDirectSweetnessAdjustable(ing, item.ingredientId, options) && c.sweetnessEq > 0;
    if (adjustable) {
      adjustableItems.push(row);
      totals.adjustableEq += c.sweetnessEq;
      totals.adjustableWater += c.water;
      totals.adjustableSolids += c.solids;
    } else {
      fixedItems.push(row);
      totals.fixedEq += c.sweetnessEq;
      totals.fixedWater += c.water;
      totals.fixedSolids += c.solids;
      if ((compensationIds.length && compensationIds.includes(item.ingredientId)) || (!compensationIds.length && ing.type === 'dairy')) dairyItems.push(row);
    }

    totals.totalEq += c.sweetnessEq;
  });

  const dairyTotalMass = dairyItems.reduce((s, row) => s + row.weight, 0);
  const dairyBlend = dairyTotalMass > 0 ? {
    totalMass: dairyTotalMass,
    items: dairyItems,
    eqPerGram: dairyItems.reduce((s, row) => s + row.sweetnessEq, 0) / dairyTotalMass,
    waterFrac: dairyItems.reduce((s, row) => s + row.water, 0) / dairyTotalMass,
    solidsFrac: dairyItems.reduce((s, row) => s + row.solids, 0) / dairyTotalMass,
    names: dairyItems.map(row => row.name),
    distribution: dairyItems.map(row => ({
      index: row.index,
      ingredientId: row.ingredientId,
      name: row.name,
      share: row.weight / dairyTotalMass
    }))
  } : null;

  return {
    ...totals,
    adjustableItems,
    fixedItems,
    dairyBlend,
    adjustableNames: adjustableItems.map(row => row.name),
    fixedSweetNames: fixedItems.filter(row => row.sweetnessEq > 0).map(row => row.name)
  };
}

function buildScaledFormula(base, scaleByIndex = new Map(), addByIndex = new Map(), transformationType = 'SWEETNESS_ADJUSTMENT') {
  const items = base.items.map((item, idx) => ({
    ingredientId: item.ingredientId,
    weight: Math.max(0, (item.weight * (scaleByIndex.get(idx) ?? 1)) + (addByIndex.get(idx) ?? 0))
  }));
  if (typeof base.withItems === 'function') {
    return base.withItems(items, { type: transformationType, details: { adjustedItems: items.length } });
  }
  return new Formula(items, base.meta || {});
}

function makeSugarOnlyNote({ requestedPct, achievedPct, factor, adjustableNames, limitedByFixedSweetness }) {
  const pieces = [];
  if (adjustableNames.length) {
    pieces.push(`تم تعديل مصادر الحلاوة القابلة للضبط فقط: ${adjustableNames.join('، ')}.`);
  } else {
    pieces.push('لم تُرصد مصادر حلاوة قابلة للضبط آلياً داخل هذه الوصفة.');
  }
  if (Number.isFinite(factor)) {
    pieces.push(`معامل التعديل الفعلي للمصادر القابلة للضبط = ×${factor.toFixed(3)}.`);
  }
  pieces.push(`الهدف كان ${requestedPct > 0 ? 'زيادة' : 'خفض'} الحلاوة الكلية بنحو ${Math.abs(requestedPct).toFixed(0)}٪، والنتيجة المحققة تقريباً ${Math.abs(achievedPct).toFixed(1)}٪.`);
  if (limitedByFixedSweetness) {
    pieces.push('لم يمكن الوصول إلى الخفض المطلوب بالكامل لأن جزءاً من الحلاوة ثابت داخل مكونات لا ينبغي تغييرها آلياً مثل اللاكتوز أو المحليات المركبة (دولسي/كراميل/حليب مكثف).');
  }
  return pieces.join(' ');
}
function adjustSweetnessSugarOnly({ formula, ingredientsDB, deltaPct, options = null }) {
  const base = formula.clone();
  const groups = analyzeFormulaGroups(base, ingredientsDB, options);
  const baseSweet = base.sweetness(ingredientsDB);
  const targetTotalEq = Math.max(0, groups.totalEq * (1 + (deltaPct / 100)));

  if (groups.adjustableEq <= 0) {
    return {
      newFormula: base,
      note: 'لا توجد داخل هذه الوصفة سكريات بسيطة قابلة للخفض أو الرفع آلياً؛ بقيت المكونات كما هي.',
      analysis: {
        mode: 'sugarOnly',
        targetTotalEq,
        baseTotalEq: groups.totalEq,
        achievedTotalEq: groups.totalEq,
        requestedPct: deltaPct,
        achievedPct: 0,
        factor: 1,
        adjustableNames: [],
        fixedSweetNames: groups.fixedSweetNames,
        compositionLimited: false,
        compositionLimitationReason: null,
        limitedByFixedSweetness: false,
        noCompositionChange: true,
        noCompositionChangeReason: 'no-adjustable-sweetness',
        adjustableElementIds: groups.adjustableItems.map(row => row.ingredientId),
        compensationElementIds: groups.dairyBlend ? groups.dairyBlend.items.map(row => row.ingredientId) : [],
        compensationNames: groups.dairyBlend ? groups.dairyBlend.names : []
      }
    };
  }

  const targetAdjustableEqRaw = targetTotalEq - groups.fixedEq;
  const limitedByFixedSweetness = targetAdjustableEqRaw < 0;
  const algebraicFactor = groups.adjustableEq > 0 ? (targetAdjustableEqRaw / groups.adjustableEq) : 1;
  const compositionFeasibleFactor = Math.max(0, algebraicFactor);
  const factor = compositionFeasibleFactor;
  const compositionLimitationReason = limitedByFixedSweetness ? 'fixed-sweetness-floor' : null;

  const unconstrainedScaleMap = new Map(groups.adjustableItems.map(row => [row.index, compositionFeasibleFactor]));
  const unconstrainedFormula = buildScaledFormula(base, unconstrainedScaleMap);
  const unconstrainedSweet = unconstrainedFormula.sweetness(ingredientsDB);
  const unconstrainedAchievedPct = baseSweet.totalEq > 0 ? (((unconstrainedSweet.totalEq / baseSweet.totalEq) - 1) * 100) : 0;

  const scaleMap = new Map(groups.adjustableItems.map(row => [row.index, factor]));
  const newFormula = buildScaledFormula(base, scaleMap);
  const newSweet = newFormula.sweetness(ingredientsDB);
  const achievedPct = baseSweet.totalEq > 0 ? (((newSweet.totalEq / baseSweet.totalEq) - 1) * 100) : 0;

  return {
    newFormula,
    note: makeSugarOnlyNote({
      requestedPct: deltaPct,
      achievedPct,
      factor,
      adjustableNames: groups.adjustableNames,
      limitedByFixedSweetness
    }),
    analysis: {
      mode: 'sugarOnly',
      targetTotalEq,
      baseTotalEq: groups.totalEq,
      achievedTotalEq: newSweet.totalEq,
      requestedPct: deltaPct,
      achievedPct,
      factor,
      algebraicFactor,
      unconstrainedAchievedPct,
      compositionLimited: limitedByFixedSweetness,
      adjustableNames: groups.adjustableNames,
      fixedSweetNames: groups.fixedSweetNames,
      limitedByFixedSweetness,
      compositionLimitationReason,
      states: {
        algebraic: { factor: algebraicFactor },
        compositionFeasible: { factor: compositionFeasibleFactor, achievedPct: unconstrainedAchievedPct }
      },
      noCompositionChange: Math.abs(achievedPct) < 0.05,
      noCompositionChangeReason: Math.abs(achievedPct) < 0.05 ? 'bounded-to-no-op' : null,
      adjustableDistribution: groups.adjustableItems.map(row => ({
        index: row.index,
        ingredientId: row.ingredientId,
        name: row.name
      })),
      adjustableElementIds: groups.adjustableItems.map(row => row.ingredientId),
      compensationElementIds: groups.dairyBlend ? groups.dairyBlend.items.map(row => row.ingredientId) : [],
      compensationNames: groups.dairyBlend ? groups.dairyBlend.names : []
    }
  };
}

function solveLinear2x2(a11, a12, b1, a21, a22, b2) {
  const det = (a11 * a22) - (a12 * a21);
  if (!Number.isFinite(det) || Math.abs(det) < 1e-9) return null;
  const x = ((b1 * a22) - (a12 * b2)) / det;
  const y = ((a11 * b2) - (b1 * a21)) / det;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y, det };
}
function adjustFillingSweetnessKeepSolidsWater({ formula, ingredientsDB, deltaPct, options = null }) {
  const base = formula.clone();
  const groups = analyzeFormulaGroups(base, ingredientsDB, options);
  const baseSweet = base.sweetness(ingredientsDB);
  const baseSW = base.solidsWaterRatio(ingredientsDB);
  const targetRatio = baseSW.ratio;

  if (!Number.isFinite(targetRatio) || targetRatio <= 0) {
    const fallback = adjustSweetnessSugarOnly({ formula, ingredientsDB, deltaPct, options });
    return {
      newFormula: fallback.newFormula,
      note: 'تعذر تثبيت نسبة المواد الصلبة/الماء لهذه الوصفة، لذلك تم الاكتفاء بتعديل السكريات القابلة للضبط فقط. ' + fallback.note,
      analysis: {
        ...(fallback.analysis || {}),
        mode: 'keepSolidsWater',
        fallback: 'invalid-ratio'
      }
    };
  }

  if (!groups.dairyBlend || !groups.dairyBlend.totalMass) {
    const fallback = adjustSweetnessSugarOnly({ formula, ingredientsDB, deltaPct, options });
    return {
      newFormula: fallback.newFormula,
      note: 'لا يوجد أساس لبني واضح يمكن الزيادة منه لتعويض خفض السكر، لذلك تم الاكتفاء بتعديل السكريات القابلة للضبط فقط. ' + fallback.note,
      analysis: {
        ...(fallback.analysis || {}),
        mode: 'keepSolidsWater',
        fallback: 'no-dairy'
      }
    };
  }

  if (groups.adjustableEq <= 0) {
    return {
      newFormula: base,
      note: 'لا توجد داخل الحشو سكريات بسيطة قابلة للتعديل الآلي مع الحفاظ على التوازن؛ بقيت الوصفة كما هي.',
      analysis: {
        mode: 'keepSolidsWater',
        targetRatio,
        targetTotalEq: groups.totalEq,
        achievedTotalEq: groups.totalEq,
        requestedPct: deltaPct,
        achievedPct: 0,
        factor: 1,
        addedDairyMass: 0,
        adjustableNames: [],
        fixedSweetNames: groups.fixedSweetNames,
        dairyBlend: groups.dairyBlend,
        compositionLimited: false,
        compositionLimitationReason: null,
        noCompositionChange: true,
        noCompositionChangeReason: 'no-adjustable-sweetness',
        adjustableElementIds: groups.adjustableItems.map(row => row.ingredientId),
        compensationElementIds: groups.dairyBlend ? groups.dairyBlend.items.map(row => row.ingredientId) : [],
        compensationNames: groups.dairyBlend ? groups.dairyBlend.names : []
      }
    };
  }

  const targetTotalEq = Math.max(0, groups.totalEq * (1 + (deltaPct / 100)));

  const a11 = groups.adjustableEq;
  const a12 = groups.dairyBlend.eqPerGram;
  const b1 = targetTotalEq - groups.fixedEq;

  const a21 = groups.adjustableSolids - (targetRatio * groups.adjustableWater);
  const a22 = groups.dairyBlend.solidsFrac - (targetRatio * groups.dairyBlend.waterFrac);
  const b2 = (targetRatio * groups.fixedWater) - groups.fixedSolids;

  const rootScope = typeof window !== 'undefined' ? window : globalThis;
  const defaultSolverMode = rootScope.MEDOVIK_ENGINEERING_CONSTANTS?.SWEETNESS_SOLVER_DEFAULT?.value || 'legacy';
  const solverMode = options?.solver ?? rootScope.MedovikSweetnessSolverMode ?? defaultSolverMode;
  const useBoundedSolver = solverMode === 'bounded' && typeof rootScope.MedovikBoundedSolver?.solveBoundedVectors === 'function';
  const totalBaseMass = base.totalMass();

  const solved = solveLinear2x2(a11, a12, b1, a21, a22, b2);
  if (!solved && !useBoundedSolver) {
    const fallback = adjustSweetnessSugarOnly({ formula, ingredientsDB, deltaPct, options });
    return {
      newFormula: fallback.newFormula,
      note: 'تعذر حل معادلة موازنة الحلاوة مع المواد الصلبة/الماء لهذه التركيبة، لذلك تم الاكتفاء بتعديل السكريات القابلة للضبط فقط. ' + fallback.note,
      analysis: {
        ...(fallback.analysis || {}),
        mode: 'keepSolidsWater',
        targetRatio,
        fallback: 'singular-system',
        dairyBlend: groups.dairyBlend
      }
    };
  }

  const algebraicFactor = solved ? solved.x : null;
  const algebraicAddedDairyMass = solved ? solved.y : null;
  let compositionFeasibleFactor;
  let compositionFeasibleAddedDairyMass;
  let compositionLimited = false;
  let compositionLimitationReason = null;

  if (useBoundedSolver) {
    const fb = options?.factorBounds || null;
    const hasMin = fb && fb.min !== null && fb.min !== undefined && fb.min !== '' && Number.isFinite(Number(fb.min));
    const hasMax = fb && fb.max !== null && fb.max !== undefined && fb.max !== '' && Number.isFinite(Number(fb.max));
    const minFactor = hasMin ? Number(fb.min) : 0;
    const maxFactor = hasMax ? Number(fb.max) : Infinity;
    const hasCap = options && options.compensationCapPct !== null && options.compensationCapPct !== undefined && options.compensationCapPct !== '' && Number.isFinite(Number(options.compensationCapPct));
    const dairyCapMass = hasCap ? Math.max(0, totalBaseMass * (Number(options.compensationCapPct) / 100)) : Infinity;
    const lexWeight = rootScope.MEDOVIK_ENGINEERING_CONSTANTS?.LEX_WEIGHT_RATIO?.value ?? 1e8;
    const regEps = rootScope.MEDOVIK_ENGINEERING_CONSTANTS?.SOLVER_REGULARIZATION?.value ?? 1e-9;

    const bounded = rootScope.MedovikBoundedSolver.solveBoundedVectors({
      rows: [
        { a: [a11, a12], b: b1, w: lexWeight },
        { a: [a21, a22], b: b2, w: 1 }
      ],
      lower: [minFactor, 0],
      upper: [maxFactor, dairyCapMass],
      x0: [1, 0],
      eps: regEps
    });

    compositionFeasibleFactor = bounded.x[0];
    compositionFeasibleAddedDairyMass = bounded.x[1];

    if (!solved) {
      compositionLimited = true;
      compositionLimitationReason = 'singular-system';
    } else {
      if (algebraicFactor < 0) {
        compositionLimited = true;
        compositionLimitationReason = compositionLimitationReason || 'negative-factor';
      }
      if (algebraicAddedDairyMass < 0) {
        compositionLimited = true;
        compositionLimitationReason = compositionLimitationReason || 'negative-dairy';
      }
      if (algebraicFactor < minFactor - 1e-9) {
        compositionLimited = true;
        compositionLimitationReason = compositionLimitationReason || 'factor-min';
      }
      if (algebraicFactor > maxFactor + 1e-9) {
        compositionLimited = true;
        compositionLimitationReason = compositionLimitationReason || 'factor-max';
      }
      if (algebraicAddedDairyMass > dairyCapMass + 1e-9) {
        compositionLimited = true;
        compositionLimitationReason = compositionLimitationReason || 'dairy-cap';
      }
    }
  } else {
    compositionFeasibleFactor = Math.max(0, algebraicFactor);
    compositionFeasibleAddedDairyMass = Math.max(0, algebraicAddedDairyMass);
    if (algebraicFactor < 0) {
      compositionLimited = true;
      compositionLimitationReason = compositionLimitationReason || 'negative-factor';
    }
    if (algebraicAddedDairyMass < 0) {
      compositionLimited = true;
      compositionLimitationReason = compositionLimitationReason || 'negative-dairy';
    }
  }

  const factor = compositionFeasibleFactor;
  const addedDairyMass = compositionFeasibleAddedDairyMass;

  const scaleMap = new Map(groups.adjustableItems.map(row => [row.index, factor]));
  const addMap = new Map();
  groups.dairyBlend.distribution.forEach(row => {
    addMap.set(row.index, addedDairyMass * row.share);
  });

  const unconstrainedScaleMap = new Map(groups.adjustableItems.map(row => [row.index, compositionFeasibleFactor]));
  const unconstrainedAddMap = new Map();
  groups.dairyBlend.distribution.forEach(row => {
    unconstrainedAddMap.set(row.index, compositionFeasibleAddedDairyMass * row.share);
  });

  const unconstrainedFormula = buildScaledFormula(base, unconstrainedScaleMap, unconstrainedAddMap);
  const unconstrainedSweet = unconstrainedFormula.sweetness(ingredientsDB);
  const unconstrainedSW = unconstrainedFormula.solidsWaterRatio(ingredientsDB);
  const newFormula = buildScaledFormula(base, scaleMap, addMap);
  const newSweet = newFormula.sweetness(ingredientsDB);
  const newSW = newFormula.solidsWaterRatio(ingredientsDB);
  const unconstrainedAchievedPct = baseSweet.totalEq > 0 ? (((unconstrainedSweet.totalEq / baseSweet.totalEq) - 1) * 100) : 0;
  const achievedPct = baseSweet.totalEq > 0 ? (((newSweet.totalEq / baseSweet.totalEq) - 1) * 100) : 0;
  const solidsWaterDriftPct = baseSW.ratio > 0 ? (((newSW.ratio - baseSW.ratio) / baseSW.ratio) * 100) : 0;

  const notes = [];
  notes.push(`تم تعديل الحلاوة عبر المكونات القابلة للضبط فقط (${groups.adjustableNames.join('، ') || 'لا يوجد'}) مع الإبقاء تقريباً على نسبة المواد الصلبة/الماء الأصلية.`);
  notes.push(`معامل تعديل مصادر الحلاوة القابلة للضبط = ×${factor.toFixed(3)}.`);
  if (addedDairyMass > 0) {
    notes.push(`تمت إضافة نحو ${addedDairyMass.toFixed(0)} جم موزعة على القاعدة اللبنية الحالية (${groups.dairyBlend.names.join('، ')}) حتى لا يهبط القوام أو يصبح الحشو مائياً بعد خفض السكر.`);
  } else {
    notes.push('لم تحتج المعادلة إلى إضافة لبنية صريحة، أو لم يكن ذلك ممكناً ضمن الحدود الآمنة الموضوعة.' );
  }
  notes.push(`الهدف كان تغيير الحلاوة الكلية بنحو ${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(0)}٪، والنتيجة المحققة تقريباً ${achievedPct > 0 ? '+' : ''}${achievedPct.toFixed(1)}٪، مع نسبة مواد صلبة/ماء انتقلت من ${baseSW.ratio.toFixed(2)} إلى ${newSW.ratio.toFixed(2)}.`);
  if (compositionLimited) {
    notes.push('احتاج الحل الجبري الخام إلى تقليم تركيبي حتى لا تظهر قيم سالبة أو غير قابلة للخلط. أي قيود تشغيلية إضافية يجب أن تُطبَّق لاحقاً في طبقة policy خارج solver.');
  }

  return {
    newFormula,
    note: notes.join(' '),
    analysis: {
      mode: 'keepSolidsWater',
      targetRatio,
      targetTotalEq,
      baseTotalEq: groups.totalEq,
      achievedTotalEq: newSweet.totalEq,
      requestedPct: deltaPct,
      achievedPct,
      factor,
      algebraicFactor,
      unconstrainedAchievedPct,
      addedDairyMass,
      algebraicAddedDairyMass,
      compositionFeasibleAddedDairyMass,
      compositionLimited,
      compositionLimitationReason,
      adjustableNames: groups.adjustableNames,
      fixedSweetNames: groups.fixedSweetNames,
      dairyBlend: groups.dairyBlend,
      noCompositionChange: Math.abs(achievedPct) < 0.05 && addedDairyMass <= 0.05,
      noCompositionChangeReason: (Math.abs(achievedPct) < 0.05 && addedDairyMass <= 0.05) ? 'bounded-to-no-op' : null,
      totalBaseMass,
      adjustableDistribution: groups.adjustableItems.map(row => ({
        index: row.index,
        ingredientId: row.ingredientId,
        name: row.name
      })),
      dairyDistribution: groups.dairyBlend ? groups.dairyBlend.distribution.map(row => ({ ...row })) : [],
      adjustableElementIds: groups.adjustableItems.map(row => row.ingredientId),
      compensationElementIds: groups.dairyBlend ? groups.dairyBlend.items.map(row => row.ingredientId) : [],
      compensationNames: groups.dairyBlend ? groups.dairyBlend.names : [],
      beforeRatio: baseSW.ratio,
      afterRatio: newSW.ratio,
      states: {
        algebraic: { factor: algebraicFactor, addedDairyMass: algebraicAddedDairyMass },
        compositionFeasible: {
          factor: compositionFeasibleFactor,
          addedDairyMass: compositionFeasibleAddedDairyMass,
          achievedPct: unconstrainedAchievedPct,
          afterRatio: unconstrainedSW.ratio
        }
      },
      ...(useBoundedSolver ? {
        solver: 'bounded-vectors-v1',
        solverResidual: {
          sweetnessPct: achievedPct - deltaPct,
          solidsWaterDriftPct
        }
      } : {})
    }
  };
}
function adjustSweetnessWithBalance({
  formula,
  ingredientsDB,
  deltaPct,
  strategy = 'sugarOnly',
  options = null
}) {
  const baseSweet = formula.sweetness(ingredientsDB);
  const baseAqueousSugarIndex = formula.aqueousSugarIndex(ingredientsDB);
  const baseSW = formula.solidsWaterRatio(ingredientsDB);

  let result;
  if (strategy === 'keepSolidsWater') result = adjustFillingSweetnessKeepSolidsWater({ formula, ingredientsDB, deltaPct, options });
  else result = adjustSweetnessSugarOnly({ formula, ingredientsDB, deltaPct, options });

  const newFormula = result.newFormula;
  const newSweet = newFormula.sweetness(ingredientsDB);
  const newAqueousSugarIndex = newFormula.aqueousSugarIndex(ingredientsDB);
  const newSW = newFormula.solidsWaterRatio(ingredientsDB);

  return {
    baseFormula: formula,
    newFormula,
    deltaPct,
    strategy,
    note: result.note || '',
    analysis: result.analysis || null,
    before: {
      sweetness: baseSweet,
      aqueousSugarIndex: baseAqueousSugarIndex,
      brix: { brix: baseAqueousSugarIndex.value, value: baseAqueousSugarIndex.value, label: baseAqueousSugarIndex.label, deprecated: true },
      solidsWater: baseSW
    },
    after: {
      sweetness: newSweet,
      aqueousSugarIndex: newAqueousSugarIndex,
      brix: { brix: newAqueousSugarIndex.value, value: newAqueousSugarIndex.value, label: newAqueousSugarIndex.label, deprecated: true },
      solidsWater: newSW
    }
  };
}
