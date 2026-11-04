(function (global) {
  'use strict';

  function clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
  }

  function finiteNumber(val, fallback = 0) {
    const n = Number(val);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalizeCreamPrepConfig(raw = {}) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const mode = src.mode === 'powder' ? 'powder' : 'liquid';
    const liquidType = src.liquidType === 'water' ? 'water' : 'milk';
    const rawRatio = finiteNumber(src.liquidPerPartPowder, 2.0);
    const liquidPerPartPowder = clamp(rawRatio, 0.5, 4.0);
    let customPowderSpec = null;
    if (src.customPowderSpec && typeof src.customPowderSpec === 'object') {
      customPowderSpec = {
        fatPct: finiteNumber(src.customPowderSpec.fatPct, 0),
        proteinPct: finiteNumber(src.customPowderSpec.proteinPct, 0),
        carbsPct: finiteNumber(src.customPowderSpec.carbsPct, 0),
        sugarPct: finiteNumber(src.customPowderSpec.sugarPct, 0),
        moisturePct: finiteNumber(src.customPowderSpec.moisturePct, 0)
      };
    }
    return {
      mode,
      liquidType,
      liquidPerPartPowder,
      customPowderSpec
    };
  }

  function splitWhippedCreamMass({ totalCreamMassG, liquidPerPartPowder = 2.0, liquidType = 'milk' } = {}) {
    const totalMass = Number(totalCreamMassG);
    if (!Number.isFinite(totalMass) || totalMass <= 0) return null;
    const ratio = clamp(Number(liquidPerPartPowder) || 2.0, 0.5, 4.0);
    const effectiveLiquidType = liquidType === 'water' ? 'water' : 'milk';

    const powderMassG = totalMass / (1 + ratio);
    const liquidMassG = totalMass - powderMassG;

    return {
      status: 'DETERMINISTIC',
      totalCreamMassG: totalMass,
      ratioLabel: `1 : ${ratio}`,
      liquidPerPartPowder: ratio,
      powderMassG,
      liquidMassG,
      liquidType: effectiveLiquidType,
      liquidDisplayName: effectiveLiquidType === 'water' ? 'ماء مثلج' : 'حليب بارد كامل الدسم'
    };
  }

  function analyzeCreamReconstitutionImpact({
    fillingFormula,
    ingredientsDB,
    creamPrepConfig,
    totalRequiredCreamMassG = null
  } = {}) {
    const config = normalizeCreamPrepConfig(creamPrepConfig);
    if (config.mode !== 'powder') {
      return { active: false, reason: 'mode_liquid' };
    }

    // Determine target mass of whipping cream
    let targetMass = Number(totalRequiredCreamMassG);
    if (!Number.isFinite(targetMass) || targetMass <= 0) {
      if (fillingFormula?.items && Array.isArray(fillingFormula.items)) {
        const creamItem = fillingFormula.items.find(
          item => item.ingredientId === 'whipping-cream' || item.ingredientId === 'cream'
        );
        targetMass = creamItem ? Number(creamItem.weight) : 0;
      }
    }

    if (!Number.isFinite(targetMass) || targetMass <= 0) {
      return { active: false, reason: 'no_cream_in_formula' };
    }

    const split = splitWhippedCreamMass({
      totalCreamMassG: targetMass,
      liquidPerPartPowder: config.liquidPerPartPowder,
      liquidType: config.liquidType
    });

    const defaultPowderSpec = global.MEDOVIK_ENGINEERING_CONSTANTS?.UNSWEETENED_CREAM_POWDER_SPEC?.value || {
      waterFrac: 0.03,
      fatFrac: 0.66,
      proteinFrac: 0.08,
      carbsFrac: 0.23,
      otherSolidsFrac: 0.23,
      sugarFrac: 0,
      density: 0.55
    };

    const powderSpec = config.customPowderSpec
      ? {
          waterFrac: (config.customPowderSpec.moisturePct || 0) / 100,
          fatFrac: (config.customPowderSpec.fatPct || 0) / 100,
          proteinFrac: (config.customPowderSpec.proteinPct || 0) / 100,
          carbsFrac: (config.customPowderSpec.carbsPct || 0) / 100,
          sugarFrac: (config.customPowderSpec.sugarPct || 0) / 100,
          status: 'USER_MEASURED'
        }
      : { ...defaultPowderSpec, status: 'PROPOSED' };

    // Standard whole milk composition: ~88% water, 3.5% fat, 3.2% protein, 4.8% carbs
    const milkRecord = ingredientsDB?.milk || { waterFrac: 0.88, fatFrac: 0.035, proteinFrac: 0.032, carbsFrac: 0.048, sugarFrac: 0.048 };
    const liquidSpec = config.liquidType === 'water'
      ? { waterFrac: 1.0, fatFrac: 0, proteinFrac: 0, carbsFrac: 0, sugarFrac: 0 }
      : {
          waterFrac: milkRecord.waterFrac ?? milkRecord.water ?? 0.88,
          fatFrac: milkRecord.fatFrac ?? milkRecord.fat ?? 0.035,
          proteinFrac: milkRecord.proteinFrac ?? milkRecord.protein ?? 0.032,
          carbsFrac: milkRecord.carbsFrac ?? milkRecord.carbs ?? 0.048,
          sugarFrac: milkRecord.sugarFrac ?? milkRecord.sugar ?? 0.048
        };

    // Reconstituted totals
    const powderWaterG = split.powderMassG * powderSpec.waterFrac;
    const powderFatG = split.powderMassG * powderSpec.fatFrac;
    const powderSolidsG = split.powderMassG * (1 - powderSpec.waterFrac);

    const liquidWaterG = split.liquidMassG * liquidSpec.waterFrac;
    const liquidFatG = split.liquidMassG * liquidSpec.fatFrac;
    const liquidSolidsG = split.liquidMassG * (1 - liquidSpec.waterFrac);

    const reconTotalWaterG = powderWaterG + liquidWaterG;
    const reconTotalSolidsG = powderSolidsG + liquidSolidsG;
    const reconTotalFatG = powderFatG + liquidFatG;

    // Baseline commercial whipping cream (35% fat, ~58% water, ~42% solids)
    const baseCreamRecord = ingredientsDB?.['whipping-cream'] || ingredientsDB?.cream || {
      waterFrac: 0.58, fatFrac: 0.35, solidsFrac: 0.42
    };
    const baseWaterFrac = baseCreamRecord.waterFrac ?? baseCreamRecord.water ?? 0.58;
    const baseFatFrac = baseCreamRecord.fatFrac ?? baseCreamRecord.fat ?? 0.35;
    const baseWaterG = targetMass * baseWaterFrac;
    const baseFatG = targetMass * baseFatFrac;
    const baseSolidsG = targetMass * (1 - baseWaterFrac);

    const waterDeltaG = reconTotalWaterG - baseWaterG;
    const solidsDeltaG = reconTotalSolidsG - baseSolidsG;
    const fatDeltaG = reconTotalFatG - baseFatG;

    const warnings = [];
    if (config.liquidType === 'water') {
      warnings.push('تذويب الكريمة البودر في الماء يعطي قوامًا أخف ومحتوى دهنيًا أقل بكثير مقارنة بالحليب أو الكريمة السائلة.');
    }
    if (powderSpec.status === 'PROPOSED') {
      warnings.push('التركيب الغذائي للبودر افتراضي؛ يمكنك إدخال قيم الملصق على عبوتك للحصول على حساب أدق.');
    }

    return {
      active: true,
      split,
      powderSpec,
      liquidSpec,
      reconstituted: {
        totalMassG: targetMass,
        waterG: reconTotalWaterG,
        solidsG: reconTotalSolidsG,
        fatG: reconTotalFatG,
        waterFrac: reconTotalWaterG / targetMass,
        fatFrac: reconTotalFatG / targetMass
      },
      baseline: {
        totalMassG: targetMass,
        waterG: baseWaterG,
        solidsG: baseSolidsG,
        fatG: baseFatG,
        waterFrac: baseWaterG / targetMass,
        fatFrac: baseFatG / targetMass
      },
      comparison: {
        waterDeltaG,
        solidsDeltaG,
        fatDeltaG
      },
      warnings
    };
  }

  function buildReconstitutedCreamFormula(fillingFormula, creamPrepConfig, _ingredientsDB) {
    const config = normalizeCreamPrepConfig(creamPrepConfig);
    if (config.mode !== 'powder' || !fillingFormula?.items) return fillingFormula;
    const items = Array.isArray(fillingFormula.items) ? fillingFormula.items : [];
    const creamIndex = items.findIndex(
      (i) => i.ingredientId === 'whipping-cream' || i.ingredientId === 'cream'
    );
    if (creamIndex < 0) return fillingFormula;
    const creamItem = items[creamIndex];
    const creamWeight = Number(creamItem.weight || 0);
    if (creamWeight <= 0) return fillingFormula;

    const split = splitWhippedCreamMass({
      totalCreamMassG: creamWeight,
      liquidPerPartPowder: config.liquidPerPartPowder,
      liquidType: config.liquidType
    });
    if (!split) return fillingFormula;

    const liquidIngredientId = config.liquidType === 'water' ? 'water' : 'milk';
    const newItems = items.filter((_, idx) => idx !== creamIndex);
    newItems.push({ ingredientId: 'unsweetened-cream-powder', weight: split.powderMassG });
    newItems.push({ ingredientId: liquidIngredientId, weight: split.liquidMassG });

    if (typeof fillingFormula.withItems === 'function') {
      return fillingFormula.withItems(newItems, { type: 'RECONSTITUTE_CREAM', details: split });
    }
    if (typeof global.Formula === 'function') {
      return new global.Formula(newItems, fillingFormula.meta);
    }
    return Object.assign({}, fillingFormula, { items: newItems });
  }

  const MedovikCreamPrep = Object.freeze({
    normalizeCreamPrepConfig,
    splitWhippedCreamMass,
    analyzeCreamReconstitutionImpact,
    buildReconstitutedCreamFormula
  });

  global.MedovikCreamPrep = MedovikCreamPrep;
})(typeof window !== 'undefined' ? window : globalThis);
