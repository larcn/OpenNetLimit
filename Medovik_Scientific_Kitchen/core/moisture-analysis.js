(function(global) {
  'use strict';

  function isFiniteNonNegative(val) {
    return typeof val === 'number' && Number.isFinite(val) && val >= 0;
  }

  function analyzeMoistureProfile(formula, ingredientsDB) {
    const massBasis = (formula && formula.massBasis) || (global.MEDOVIK_MASS_BASIS && global.MEDOVIK_MASS_BASIS.SOURCE_FORMULA) || 'SOURCE_FORMULA';

    if (!formula || !Array.isArray(formula.items) || typeof global.estimateFormulaComponents !== 'function') {
      return {
        status: 'INSUFFICIENT_EVIDENCE',
        massBasis,
        coverage: 0,
        totalMassG: 0,
        totalWaterG: null,
        moisturePctOfMass: null,
        sources: [],
        reason: 'الصيغة غير صالحة أو فارغة لحساب الماء الكلي.'
      };
    }

    const components = global.estimateFormulaComponents(formula, ingredientsDB);
    const totalMassG = Number(components.totalMass) || 0;
    const coverage = Number(components.coverage) || 0;

    if (!(totalMassG > 0)) {
      return {
        status: 'INSUFFICIENT_EVIDENCE',
        massBasis,
        coverage: 0,
        totalMassG: 0,
        totalWaterG: null,
        moisturePctOfMass: null,
        sources: [],
        reason: 'كتلة الوصفة صفرية فلا يمكن اشتقاق تفصيل الماء الكلي.'
      };
    }

    if (!(coverage >= 0.90)) {
      return {
        status: 'INSUFFICIENT_EVIDENCE',
        massBasis,
        coverage,
        totalMassG,
        totalWaterG: null,
        moisturePctOfMass: null,
        sources: [],
        reason: 'التغطية التركيبية دون 90%؛ لا يُعرض رقم ماء كلي جزئي قد يخفي مكونات غير موثقة.'
      };
    }

    const evidence = typeof global.assessModelEvidence === 'function'
      ? global.assessModelEvidence({ claimType: 'MASS_CONSERVATION', compositionCoverage: coverage })
      : { status: 'DETERMINISTIC', reason: null };

    const grouped = new Map();
    formula.items.forEach(function(item) {
      const mass = Number(item && item.weight) || 0;
      if (!(mass > 0)) return;
      const ingredientId = String((item && item.ingredientId) || '').trim();
      if (!ingredientId) return;
      const ing = typeof global.getIngredient === 'function'
        ? global.getIngredient(ingredientsDB, ingredientId)
        : (ingredientsDB && ingredientsDB[ingredientId]);
      const contrib = typeof global.getIngredientContributionFromRecord === 'function'
        ? global.getIngredientContributionFromRecord(ing, mass)
        : { water: mass * ((ing && Number(ing.waterFrac)) || 0) };

      const prev = grouped.get(ingredientId) || { ingredientId, massG: 0, waterG: 0 };
      prev.massG += mass;
      prev.waterG += contrib.water;
      grouped.set(ingredientId, prev);
    });

    const totalWaterG = Number(components.waterMass) || 0;
    const moisturePctOfMass = (totalWaterG / totalMassG) * 100;

    const sources = Array.from(grouped.values())
      .map(function(row) {
        return {
          ingredientId: row.ingredientId,
          massG: row.massG,
          waterG: row.waterG,
          shareOfWaterPct: totalWaterG > 0 ? (row.waterG / totalWaterG) * 100 : 0,
          shareOfMassPct: (row.massG / totalMassG) * 100
        };
      })
      .sort(function(a, b) {
        return b.waterG - a.waterG;
      });

    return {
      status: evidence.status,
      massBasis,
      coverage,
      totalMassG,
      totalWaterG,
      moisturePctOfMass,
      sources,
      reason: evidence.reason || null
    };
  }

  function computeHydrationLoad(input, ingredientsDB) {
    const safeInput = input && typeof input === 'object' ? input : {};
    const fillingFormula = safeInput.fillingFormula || null;
    const doughNetFormula = safeInput.doughNetFormula || null;
    const interiorG = safeInput.interiorRequiredMassG;
    const topG = safeInput.topRequiredMassG;
    const sideG = safeInput.sideRequiredMassG;
    const massBasis = {
      filling: (global.MEDOVIK_MASS_BASIS && global.MEDOVIK_MASS_BASIS.ON_PRODUCT) || 'ON_PRODUCT',
      doughDrySolids: (global.MEDOVIK_MASS_BASIS && global.MEDOVIK_MASS_BASIS.NET_FOR_LAYERS) || 'NET_FOR_LAYERS'
    };

    const fail = function(reason) {
      return {
        status: 'INSUFFICIENT_EVIDENCE',
        massBasis,
        dryCrumbSolidsG: null,
        interiorWaterG: null,
        topWaterG: null,
        sideWaterG: null,
        totalWaterG: null,
        interiorLoadPer100gDry: null,
        topLoadPer100gDry: null,
        sideLoadPer100gDry: null,
        totalLoadPer100gDry: null,
        reason
      };
    };

    if (!isFiniteNonNegative(interiorG) || !isFiniteNonNegative(topG) || !isFiniteNonNegative(sideG)) {
      return fail('كتل الحشو المطلوبة يجب أن تكون أرقامًا منتهية وغير سالبة.');
    }

    if (!fillingFormula || !doughNetFormula || typeof global.estimateFormulaComponents !== 'function') {
      return fail('صيغة الحشو أو العجين الصافي غير متوفرة لحساب حمل الترطيب.');
    }

    const fillingComp = global.estimateFormulaComponents(fillingFormula, ingredientsDB);
    const doughComp = global.estimateFormulaComponents(doughNetFormula, ingredientsDB);

    if (!(fillingComp.totalMass > 0) || !(doughComp.totalMass > 0)) {
      return fail('كتلة صيغة الحشو أو العجين الصافي صفرية.');
    }

    if (!(fillingComp.coverage >= 0.90) || !(doughComp.coverage >= 0.90)) {
      return fail('التغطية التركيبية للعجين أو الحشو دون 90% فلا يُحسب حمل الترطيب.');
    }

    const dryCrumbSolidsG = Number(doughComp.solidsMass) || 0;
    if (!(dryCrumbSolidsG > 0)) {
      return fail('المواد الجافة في طبقات العجين غير موجبة.');
    }

    const fillingWaterFrac = fillingComp.waterMass / fillingComp.totalMass;
    const interiorWaterG = interiorG * fillingWaterFrac;
    const topWaterG = topG * fillingWaterFrac;
    const sideWaterG = sideG * fillingWaterFrac;
    const totalWaterG = interiorWaterG + topWaterG + sideWaterG;

    return {
      status: 'BOUNDED_ESTIMATE',
      massBasis,
      dryCrumbSolidsG,
      interiorWaterG,
      topWaterG,
      sideWaterG,
      totalWaterG,
      interiorLoadPer100gDry: (interiorWaterG / dryCrumbSolidsG) * 100,
      topLoadPer100gDry: (topWaterG / dryCrumbSolidsG) * 100,
      sideLoadPer100gDry: (sideWaterG / dryCrumbSolidsG) * 100,
      totalLoadPer100gDry: (totalWaterG / dryCrumbSolidsG) * 100,
      reason: 'تقدير هندسي مشروط بكثافة الحشو التصميمية وسماكات التغليف؛ لا يتنبأ بمعدل انتقال الرطوبة الزمني.'
    };
  }

  const MedovikMoisture = Object.freeze({
    analyzeMoistureProfile,
    computeHydrationLoad
  });

  global.MedovikMoisture = MedovikMoisture;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MedovikMoisture;
  }
})(typeof window !== 'undefined' ? window : globalThis);
