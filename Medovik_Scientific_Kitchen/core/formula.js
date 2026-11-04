/* Medovik v6 — formula, composition coverage and lineage */
(function(global) {
  'use strict';

  function finitePositiveOrNull(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function safeWeight(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function normalizeItems(items) {
    const aggregate = new Map();
    (Array.isArray(items) ? items : []).forEach(item => {
      const ingredientId = String(item?.ingredientId || '').trim();
      if (!ingredientId) return;
      const weight = safeWeight(item?.weight);
      if (weight <= 0) return;
      aggregate.set(ingredientId, (aggregate.get(ingredientId) || 0) + weight);
    });
    return Array.from(aggregate, ([ingredientId, weight]) => ({ ingredientId, weight }));
  }

  function normalizeMeta(meta = {}) {
    const sourceRecipeId = meta.sourceRecipeId || meta.sourceDoughId || null;
    return {
      schemaVersion: Number.isFinite(Number(meta.schemaVersion)) ? Number(meta.schemaVersion) : 2,
      sourceRecipeId,
      sourceDoughId: sourceRecipeId,
      sourceProcessFamily: meta.sourceProcessFamily || null,
      sourceShapingFamily: meta.sourceShapingFamily || null,
      sourceFillingId: meta.sourceFillingId || null,
      processFillingId: meta.processFillingId || meta.sourceFillingId || null,
      designDensity: finitePositiveOrNull(meta.designDensity),
      designDensitySource: meta.designDensitySource || (finitePositiveOrNull(meta.designDensity) ? 'ENGINEERING_DEFAULT' : null),
      massBasis: meta.massBasis || global.MEDOVIK_MASS_BASIS?.SOURCE_FORMULA || 'SOURCE_FORMULA',
      transformationHistory: Array.isArray(meta.transformationHistory) ? clone(meta.transformationHistory) : [],
      notes: Array.isArray(meta.notes) ? clone(meta.notes) : []
    };
  }

  function getSugarProfile(ing) {
    const totalSugarFrac = Math.max(0, Number(ing?.totalSugarFrac ?? ing?.sugarFrac ?? 0) || 0);
    const factors = { sucrose: 1.0, fructose: 1.3, glucose: 0.7, lactose: 0.2, maltose: 0.45 };
    const profile = {};
    let classified = 0;
    Object.keys(factors).forEach(field => {
      const value = Math.max(0, Number(ing?.[field]) || 0);
      if (value > 0) profile[field] = value;
      classified += value;
    });
    const unclassified = Math.max(0, totalSugarFrac - classified);
    return { totalSugarFrac, classified, unclassified, profile, factors };
  }

  class Formula {
    constructor(items = [], meta = {}) {
      this.items = normalizeItems(items);
      Object.assign(this, normalizeMeta(meta));
    }

    get meta() {
      return normalizeMeta(this);
    }

    clone() {
      return new Formula(this.items, this.meta);
    }

    withItems(items, transformation = null, metaPatch = {}) {
      const history = Array.isArray(this.transformationHistory) ? clone(this.transformationHistory) : [];
      if (transformation) {
        history.push({
          id: transformation.id || transformation.type || 'TRANSFORM',
          type: transformation.type || transformation.id || 'TRANSFORM',
          at: transformation.at || new Date().toISOString(),
          details: clone(transformation.details || transformation)
        });
      }
      return new Formula(items, { ...this.meta, ...metaPatch, transformationHistory: history });
    }

    setFillingMeta({ sourceFillingId = null, processFillingId = null, designDensity = null, designDensitySource = null } = {}) {
      this.sourceFillingId = sourceFillingId || null;
      this.processFillingId = processFillingId || sourceFillingId || null;
      this.designDensity = finitePositiveOrNull(designDensity);
      this.designDensitySource = designDensitySource || (this.designDensity ? 'ENGINEERING_DEFAULT' : null);
      return this;
    }

    clearFillingMeta({ preserveProcess = false } = {}) {
      const processId = preserveProcess ? (this.processFillingId || this.sourceFillingId || null) : null;
      this.sourceFillingId = null;
      this.processFillingId = processId;
      this.designDensity = null;
      this.designDensitySource = null;
      return this;
    }

    setDoughMeta({ sourceDoughId = null, sourceRecipeId = null, sourceProcessFamily = null, sourceShapingFamily = null } = {}) {
      this.sourceRecipeId = sourceRecipeId || sourceDoughId || null;
      this.sourceDoughId = this.sourceRecipeId;
      this.sourceProcessFamily = sourceProcessFamily || this.sourceProcessFamily || null;
      this.sourceShapingFamily = sourceShapingFamily || this.sourceShapingFamily || null;
      return this;
    }

    clearDoughMeta() {
      this.sourceRecipeId = null;
      this.sourceDoughId = null;
      this.sourceProcessFamily = null;
      this.sourceShapingFamily = null;
      return this;
    }

    toSnapshot() {
      return {
        schemaVersion: 2,
        items: this.items.map(item => ({ ingredientId: item.ingredientId, weight: item.weight })),
        meta: this.meta
      };
    }

    static fromSnapshot(snapshot) {
      if (!snapshot || typeof snapshot !== 'object') return new Formula([]);
      return new Formula(Array.isArray(snapshot.items) ? snapshot.items : [], snapshot.meta || {});
    }

    validate(ingredientsDB = null) {
      const errors = [];
      const warnings = [];
      if (!this.items.length) warnings.push('الصيغة لا تحتوي مكونات موجبة.');
      this.items.forEach(item => {
        if (!item.ingredientId) errors.push('يوجد سطر بلا مكوّن.');
        if (!(item.weight > 0)) errors.push(`وزن ${item.ingredientId || 'مكوّن'} غير صالح.`);
        if (ingredientsDB && !ingredientsDB[item.ingredientId]) warnings.push(`المكوّن ${item.ingredientId} غير معرّف في قاعدة البيانات.`);
      });
      return { ok: errors.length === 0, errors, warnings };
    }

    totalMass() {
      return this.items.reduce((sum, item) => sum + safeWeight(item.weight), 0);
    }

    breakdown(ingredientsDB) {
      const totals = typeof global.estimateFormulaComponents === 'function'
        ? global.estimateFormulaComponents(this, ingredientsDB)
        : { sugarMass: 0, fatMass: 0, waterMass: 0, proteinMass: 0, starchMass: 0, cocoaMass: 0, milkSolidsMass: 0, carbsMass: 0, otherSolidsMass: 0, coverage: 0 };
      let flourMass = 0;
      const missingIngredients = [];
      this.items.forEach(item => {
        const ing = typeof global.getIngredient === 'function' ? global.getIngredient(ingredientsDB, item.ingredientId) : ingredientsDB?.[item.ingredientId];
        if (ing?.type === 'flour') flourMass += item.weight;
        if (!ingredientsDB?.[item.ingredientId]) missingIngredients.push(item.ingredientId);
      });
      return {
        flourMass,
        sugarMass: totals.sugarMass || 0,
        fatMass: totals.fatMass || 0,
        waterMass: totals.waterMass || 0,
        proteinMass: totals.proteinMass || 0,
        otherSolidsMass: (totals.starchMass || 0) + (totals.cocoaMass || 0) + (totals.milkSolidsMass || 0) + (totals.carbsMass || 0) + (totals.otherSolidsMass || 0),
        compositionCoverage: totals.coverage ?? null,
        missingIngredients: Array.from(new Set(missingIngredients))
      };
    }

    compositionReport(ingredientsDB) {
      const breakdown = this.breakdown(ingredientsDB);
      const totalMass = this.totalMass();
      return {
        totalMass,
        coverage: breakdown.compositionCoverage,
        missingIngredients: breakdown.missingIngredients,
        complete: breakdown.missingIngredients.length === 0 && (breakdown.compositionCoverage == null || breakdown.compositionCoverage >= 0.9)
      };
    }

    bakersPerc(ingredientsDB) {
      const { flourMass, sugarMass, fatMass, waterMass } = this.breakdown(ingredientsDB);
      if (flourMass <= 0) return { flourMass, sugarMass, fatMass, waterMass, sugarPct: null, fatPct: null, liquidPct: null };
      return {
        flourMass,
        sugarMass,
        fatMass,
        waterMass,
        sugarPct: sugarMass / flourMass * 100,
        fatPct: fatMass / flourMass * 100,
        liquidPct: waterMass / flourMass * 100
      };
    }

    totalWaterToFlourRatio(ingredientsDB) {
      const { flourMass, waterMass } = this.breakdown(ingredientsDB);
      return flourMass > 0 ? waterMass / flourMass : null;
    }

    hydrationIndex(ingredientsDB) {
      return this.totalWaterToFlourRatio(ingredientsDB);
    }

    sweetness(ingredientsDB) {
      let totalEq = 0;
      let totalSugarMass = 0;
      let classifiedSugarMass = 0;
      const sources = [];
      const unknownIngredients = [];

      this.items.forEach(item => {
        const mass = safeWeight(item.weight);
        if (!mass) return;
        const ing = typeof global.getIngredient === 'function' ? global.getIngredient(ingredientsDB, item.ingredientId) : ingredientsDB?.[item.ingredientId];
        if (!ingredientsDB?.[item.ingredientId]) unknownIngredients.push(item.ingredientId);
        const sugar = getSugarProfile(ing || {});
        let eq = 0;
        Object.entries(sugar.profile).forEach(([field, fraction]) => {
          eq += mass * fraction * sugar.factors[field];
          classifiedSugarMass += mass * fraction;
        });
        if (sugar.unclassified > 0) eq += mass * sugar.unclassified;
        totalSugarMass += mass * sugar.totalSugarFrac;
        if (eq > 0 || sugar.totalSugarFrac > 0) {
          totalEq += eq;
          sources.push({
            ingredientId: item.ingredientId,
            name: ing?.displayName || item.ingredientId,
            eq,
            sugarMass: mass * sugar.totalSugarFrac,
            classifiedSugarMass: mass * sugar.classified,
            unclassifiedSugarMass: mass * sugar.unclassified,
            mass
          });
        }
      });

      sources.sort((a, b) => b.eq - a.eq);
      sources.forEach(source => { source.pctOfSweet = totalEq > 0 ? source.eq / totalEq * 100 : 0; });
      const totalMass = this.totalMass();
      const equivPer100 = totalMass > 0 ? totalEq / totalMass * 100 : null;
      let label = 'غير متاح';
      if (equivPer100 != null) {
        if (equivPer100 === 0) label = 'بدون حلاوة تقريباً';
        else if (equivPer100 < 10) label = 'خفيفة جداً';
        else if (equivPer100 < 20) label = 'خفيفة';
        else if (equivPer100 < 30) label = 'متوسطة';
        else if (equivPer100 < 40) label = 'حلوة';
        else label = 'حلوة جداً / ثقيلة';
      }
      return {
        totalMass,
        totalEq,
        totalSugarMass,
        classifiedSugarMass,
        sugarProfileCoverage: totalSugarMass > 0 ? Math.min(1, classifiedSugarMass / totalSugarMass) : 1,
        equivPer100,
        label,
        sources,
        unknownIngredients: Array.from(new Set(unknownIngredients))
      };
    }

    aqueousSugarIndex(ingredientsDB) {
      const { sugarMass, waterMass } = this.breakdown(ingredientsDB);
      const denominator = sugarMass + waterMass;
      if (!(denominator > 0)) return { value: null, label: 'غير متاح', sugarMass, waterMass, metricId: 'aqueousSugarIndex' };
      const value = sugarMass / denominator * 100;
      let label = 'مرتفع جداً';
      if (value < 15) label = 'منخفض جداً';
      else if (value < 30) label = 'منخفض/متوسط';
      else if (value < 45) label = 'متوسط';
      else if (value < 65) label = 'مرتفع';
      return { value, label, sugarMass, waterMass, metricId: 'aqueousSugarIndex' };
    }

    brixApprox(ingredientsDB) {
      const metric = this.aqueousSugarIndex(ingredientsDB);
      return { brix: metric.value, value: metric.value, label: metric.label, deprecated: true, metricId: metric.metricId };
    }

    solidsWaterRatio(ingredientsDB) {
      const { sugarMass, fatMass, proteinMass, waterMass, otherSolidsMass } = this.breakdown(ingredientsDB);
      const solids = sugarMass + fatMass + proteinMass + otherSolidsMass;
      if (!(waterMass > 0)) return { ratio: null, label: solids > 0 ? 'جاف جداً' : 'غير متاح' };
      const ratio = solids / waterMass;
      let label = 'ثقيل جداً / جاف';
      if (ratio < 0.5) label = 'رطب جداً';
      else if (ratio < 1.0) label = 'رطب/ناعم';
      else if (ratio < 2.0) label = 'متوازن تقريباً';
      else if (ratio < 3.0) label = 'مركز/ثقيل';
      return { ratio, label };
    }
  }

  global.Formula = Formula;
})(typeof window !== 'undefined' ? window : globalThis);
