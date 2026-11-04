/* Medovik v6 — product geometry, scaling and mass lineage */
(function(global) {
  'use strict';

  function finite(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, finite(value, min)));
  }

  class ProductGeometry {
    constructor(input = {}) {
      const normalized = global.normalizeProductSpec
        ? global.normalizeProductSpec(input).value
        : input;
      this.shape = normalized.shape || 'round';
      this.d1 = finite(normalized.d1, 24);
      this.d2 = finite(normalized.d2, 0);
      this.layers = Math.max(1, Math.round(finite(normalized.layers, 8)));
      this.rawSheetThicknessMm = finite(normalized.rawSheetThicknessMm, finite(normalized.doughThicknessMm, 1.5));
      this.targetBakedLayerThicknessMm = finite(normalized.targetBakedLayerThicknessMm, finite(normalized.doughThicknessMm, 2));
      this.estimatedBakedLayerThicknessMm = finite(normalized.estimatedBakedLayerThicknessMm, this.targetBakedLayerThicknessMm);
      this.legacyAmbiguousThickness = Boolean(normalized.legacyAmbiguousThickness);
      this.fillingThicknessMm = Math.max(0, finite(normalized.fillingThicknessMm, 3));
      this.includeOuterCoat = normalized.includeOuterCoat !== false;
      this.topCoatThicknessMm = Math.max(0, finite(normalized.topCoatThicknessMm, 2));
      this.sideCoatThicknessMm = Math.max(0, finite(normalized.sideCoatThicknessMm, 2));
      this.wastePct = clamp(normalized.wastePct, 0, 50);
      this.scaleMode = ['volume', 'rawThickness', 'manualBall', 'totalDoughWeight', 'flourBasis'].includes(normalized.scaleMode) ? normalized.scaleMode : 'volume';
      this.ballWeight = Math.max(1, finite(normalized.ballWeight, 140));
      this.targetFlourWeight = Math.max(1, finite(normalized.targetFlourWeight, 500));
      this.targetTotalDoughWeight = Math.max(1, finite(normalized.targetTotalDoughWeight, 1000));
      this.totalDoughMassBasis = normalized.totalDoughMassBasis === 'net' ? 'net' : 'prepared';
      this.shapingFamily = normalized.shapingFamily || null;
    }

    // Legacy compatibility: old callers read doughThicknessMm as baked layer thickness.
    get doughThicknessMm() { return this.targetBakedLayerThicknessMm; }
    set doughThicknessMm(value) { this.targetBakedLayerThicknessMm = Math.max(0.2, finite(value, this.targetBakedLayerThicknessMm)); }

    toSpec() {
      return {
        shape: this.shape,
        d1: this.d1,
        d2: this.d2,
        layers: this.layers,
        rawSheetThicknessMm: this.rawSheetThicknessMm,
        targetBakedLayerThicknessMm: this.targetBakedLayerThicknessMm,
        estimatedBakedLayerThicknessMm: this.estimatedBakedLayerThicknessMm,
        legacyAmbiguousThickness: this.legacyAmbiguousThickness,
        fillingThicknessMm: this.fillingThicknessMm,
        includeOuterCoat: this.includeOuterCoat,
        topCoatThicknessMm: this.topCoatThicknessMm,
        sideCoatThicknessMm: this.sideCoatThicknessMm,
        wastePct: this.wastePct,
        scaleMode: this.scaleMode,
        ballWeight: this.ballWeight,
        targetFlourWeight: this.targetFlourWeight,
        targetTotalDoughWeight: this.targetTotalDoughWeight,
        totalDoughMassBasis: this.totalDoughMassBasis,
        shapingFamily: this.shapingFamily
      };
    }

    area() { return calcArea(this.shape, this.d1, this.d2); }
    perimeter() { return calcPerimeter(this.shape, this.d1, this.d2); }

    doughVolume() {
      const { volume } = calcVolume({
        shape: this.shape,
        d1: this.d1,
        d2: this.d2,
        layers: this.layers,
        thicknessMm: this.targetBakedLayerThicknessMm
      });
      return volume;
    }

    rawSheetVolume() {
      const { volume } = calcVolume({
        shape: this.shape,
        d1: this.d1,
        d2: this.d2,
        layers: this.layers,
        thicknessMm: this.rawSheetThicknessMm
      });
      return volume;
    }

    interiorFillingVolume() {
      const gaps = this.gaps();
      if (gaps === 0 || this.fillingThicknessMm <= 0) return 0;
      return this.area() * (this.fillingThicknessMm / 10) * gaps;
    }

    stackHeightMm() {
      const bakedThickness = this.estimatedBakedLayerThicknessMm || this.targetBakedLayerThicknessMm;
      return this.layers * bakedThickness + this.gaps() * this.fillingThicknessMm;
    }

    topCoatVolume() {
      return (!this.includeOuterCoat || this.topCoatThicknessMm <= 0) ? 0 : this.area() * (this.topCoatThicknessMm / 10);
    }

    sideCoatVolume() {
      if (!this.includeOuterCoat || this.sideCoatThicknessMm <= 0) return 0;
      const stackHeightCm = this.stackHeightMm() / 10;
      return stackHeightCm > 0 ? this.perimeter() * stackHeightCm * (this.sideCoatThicknessMm / 10) : 0;
    }

    outerCoatVolume() { return this.topCoatVolume() + this.sideCoatVolume(); }
    totalFillingVolume() { return this.interiorFillingVolume() + this.outerCoatVolume(); }
    fillingVolume() { return this.totalFillingVolume(); }
    gaps() { return Math.max(0, this.layers - 1); }
  }

  class Product {
    constructor({ geometry, doughFormula, fillingFormula }) {
      this.geometry = geometry instanceof ProductGeometry ? geometry : new ProductGeometry(geometry || {});
      this.doughFormula = doughFormula;
      this.fillingFormula = fillingFormula;
    }

    _scaleFormula(formula, factor, { type, massBasis, details = {} } = {}) {
      const items = formula.items.map(item => ({ ingredientId: item.ingredientId, weight: item.weight * factor }));
      if (typeof formula.withItems === 'function') {
        return formula.withItems(items, { type: type || 'SCALE', details: { factor, ...details } }, { massBasis: massBasis || formula.massBasis });
      }
      return new Formula(items, { ...(formula.meta || {}), massBasis });
    }

    scaleDough({
      ingredientsDB,
      doughDensity = null,
      rawDoughDensity = null,
      measuredBakeYield = null,
      wastePct = 0,
      mode = 'volume',
      targetBallWeight = 120,
      doughProfile = null,
      targetFlourWeight = null,
      targetTotalDoughWeight = null,
      totalDoughMassBasis = 'prepared',
      processFamily = null,
      shapingFamily = null
    } = {}) {
      const layers = Math.max(1, this.geometry.layers || 1);
      const waste = clamp((wastePct || 0) / 100, 0, 0.5);
      const effectiveShapingFamily = shapingFamily || this.doughFormula?.sourceShapingFamily || this.geometry.shapingFamily || null;
      const isSpreadBatter = effectiveShapingFamily === global.MEDOVIK_DOUGH_SHAPING_FAMILY?.SPREAD_BATTER_SHEET || effectiveShapingFamily === 'SPREAD_BATTER_SHEET';
      const effectiveMode = isSpreadBatter && mode === 'manualBall' ? 'volume' : mode;
      const auditGeometry = effectiveMode === 'volume' ? this.geometry : { ...this.geometry, targetBakedLayerThicknessMm: null, doughThicknessMm: null };

      const emptyResult = {
        totalRaw: 0, netRaw: 0, bakedMass: 0, ballWeight: null, scaledFormula: null, netFormula: null,
        wasteRaw: 0, scaledFlourWeight: 0, estimatedThicknessMm: null,
        estimatedRawThicknessMm: this.geometry.rawSheetThicknessMm ?? null,
        usedRawDensity: null, rawDensityStatus: 'UNKNOWN',
        rawSheetThicknessMm: this.geometry.rawSheetThicknessMm,
        targetBakedLayerThicknessMm: this.geometry.targetBakedLayerThicknessMm, bakeYield: null, usedBakeYield: null,
        bakeYieldStatus: 'MODEL_ESTIMATE', usedBakedDensity: null,
        densityStatus: 'UNKNOWN', doughModel: null, doughAudit: null, scaleMode: effectiveMode, shapingFamily: effectiveShapingFamily
      };
      if (!this.doughFormula || this.doughFormula.totalMass() <= 0) return emptyResult;

      const doughAudit = auditDoughSystem(this.doughFormula, ingredientsDB, auditGeometry, doughProfile);
      const doughModel = doughAudit.bakeModel;
      const explicitDensity = typeof doughDensity === 'number' && Number.isFinite(doughDensity) && doughDensity > 0;
      let effectiveBakedDensity = explicitDensity ? doughDensity : doughModel.effectiveBakedDensity;
      let usedDoughModel = doughModel;
      let usedDoughAudit = doughAudit;
      const densityStatus = explicitDensity ? 'USER_MEASURED' : doughModel.densityStatus;
      const explicitBakeYield =
        typeof measuredBakeYield === 'number' &&
        Number.isFinite(measuredBakeYield) &&
        measuredBakeYield > 0 &&
        measuredBakeYield <= 1;
      const effectiveBakeYield = explicitBakeYield ? measuredBakeYield : null;
      const usedBakeYield = effectiveBakeYield !== null ? effectiveBakeYield : doughModel.bakeYield;
      const bakeYieldStatus = explicitBakeYield ? 'USER_MEASURED' : 'MODEL_ESTIMATE';
      const modelLimitations = doughModel.modelLimitations || [];

      let usedRawDensity = null;
      let rawDensityStatus = 'UNKNOWN';
      if (typeof rawDoughDensity === 'number' && Number.isFinite(rawDoughDensity) && rawDoughDensity > 0) {
        usedRawDensity = rawDoughDensity;
        rawDensityStatus = 'USER_MEASURED';
      } else {
        const nonAerated = typeof global.estimateNonAeratedDensityFromComposition === 'function'
          ? global.estimateNonAeratedDensityFromComposition(this.doughFormula, ingredientsDB)
          : null;
        if (nonAerated && (nonAerated.densityStatus === 'MODEL_ESTIMATE' || (nonAerated.components?.coverage >= 0.90)) && typeof nonAerated.density === 'number' && nonAerated.density > 0) {
          usedRawDensity = nonAerated.density;
          rawDensityStatus = 'MODEL_ESTIMATE';
        } else {
          usedRawDensity = null;
          rawDensityStatus = 'UNSUPPORTED';
        }
      }

      const flourMassInFormula = () => this.doughFormula.items.reduce((sum, item) => {
        const ing = getIngredient(ingredientsDB, item.ingredientId);
        return sum + (ing?.type === 'flour' ? item.weight : 0);
      }, 0);

      const thicknessFromBakedMass = (bakedMass, density = effectiveBakedDensity) => {
        const area = this.geometry.area();
        if (!(area > 0 && layers > 0 && density > 0)) return null;
        return ((bakedMass / density) / (area * layers)) * 10;
      };

      const refineBakedDensityForThickness = bakedMass => {
        if (explicitDensity || effectiveMode === 'volume') return;
        const initialThick = thicknessFromBakedMass(bakedMass, effectiveBakedDensity);
        if (typeof initialThick === 'number' && initialThick > 0) {
          const refinedAudit = auditDoughSystem(
            this.doughFormula,
            ingredientsDB,
            { ...this.geometry, targetBakedLayerThicknessMm: initialThick, estimatedBakedLayerThicknessMm: initialThick },
            doughProfile
          );
          if (refinedAudit.bakeModel?.effectiveBakedDensity > 0) {
            effectiveBakedDensity = refinedAudit.bakeModel.effectiveBakedDensity;
            usedDoughModel = refinedAudit.bakeModel;
            usedDoughAudit = refinedAudit;
          }
        }
      };

      const rawThicknessFromNetRaw = mass => {
        const area = this.geometry.area();
        if (!(area > 0 && layers > 0 && typeof usedRawDensity === 'number' && usedRawDensity > 0)) return null;
        return ((mass / usedRawDensity) / (area * layers)) * 10;
      };

      const buildResult = ({ totalRaw, netRaw, bakedMass, scaledFlourWeight, ballWeight, estimatedThicknessMm, estimatedRawThicknessMm }) => {
        const baseMass = this.doughFormula.totalMass();
        const preparedFactor = baseMass > 0 ? totalRaw / baseMass : 0;
        const netFactor = baseMass > 0 ? netRaw / baseMass : 0;
        const scaledFormula = this._scaleFormula(this.doughFormula, preparedFactor, {
          type: 'SCALE_PREPARED_BATCH',
          massBasis: global.MEDOVIK_MASS_BASIS?.PREPARED_BATCH || 'PREPARED_BATCH',
          details: { mode: effectiveMode, wastePct: waste * 100, processFamily, shapingFamily: effectiveShapingFamily }
        });
        const netFormula = this._scaleFormula(this.doughFormula, netFactor, {
          type: 'SCALE_NET_LAYERS',
          massBasis: global.MEDOVIK_MASS_BASIS?.NET_FOR_LAYERS || 'NET_FOR_LAYERS',
          details: { mode: effectiveMode, processFamily, shapingFamily: effectiveShapingFamily }
        });
        const thicknessAudit = typeof global.auditThicknessConsistency === 'function'
          ? global.auditThicknessConsistency({
              areaCm2: this.geometry.area(), layers,
              rawThicknessMm: this.geometry.rawSheetThicknessMm,
              targetBakedThicknessMm: this.geometry.targetBakedLayerThicknessMm,
              netRawMass: netRaw, bakedMass,
              // Model estimates must not be passed as measured inputs.
              rawDensity: rawDensityStatus === 'USER_MEASURED' ? usedRawDensity : null,
              bakedDensity: explicitDensity ? effectiveBakedDensity : null
            }) : null;
        const resultWarnings = [];
        if (isSpreadBatter && mode === 'manualBall') {
          resultWarnings.push('هذه الوصفة تُنشر في الصينية ولا تستخدم وزن كرة؛ استُخدم التحجيم الحجمي.');
        }
        if (explicitBakeYield) {
          resultWarnings.push('عائد الخبز مقاس؛ الرطوبة النهائية المعروضة ما زالت تقديرًا');
        }
        const finalEstimatedRawThickness = estimatedRawThicknessMm !== undefined
          ? estimatedRawThicknessMm
          : (effectiveMode === 'rawThickness' ? this.geometry.rawSheetThicknessMm : rawThicknessFromNetRaw(netRaw));
        return {
          totalRaw,
          netRaw,
          bakedMass,
          thicknessAudit,
          ballWeight: isSpreadBatter ? null : ballWeight,
          scaledFormula,
          netFormula,
          wasteRaw: Math.max(0, totalRaw - netRaw),
          scaledFlourWeight,
          estimatedThicknessMm,
          estimatedRawThicknessMm: finalEstimatedRawThickness,
          usedRawDensity,
          rawDensityStatus,
          rawSheetThicknessMm: this.geometry.rawSheetThicknessMm,
          targetBakedLayerThicknessMm: this.geometry.targetBakedLayerThicknessMm,
          bakeYield: usedDoughModel.bakeYield,
          usedBakeYield,
          bakeYieldStatus,
          usedBakedDensity: effectiveBakedDensity,
          densityStatus,
          modelLimitations,
          modelEvidence: global.assessModelEvidence?.({claimType:'BAKED_DENSITY',compositionCoverage:usedDoughModel.components?.coverage,hasMeasuredParameter:explicitDensity}) || null,
          doughModel: usedDoughModel,
          doughAudit: usedDoughAudit,
          scaleMode: effectiveMode,
          requestedScaleMode: mode,
          shapingFamily: effectiveShapingFamily,
          processFamily: processFamily || this.doughFormula?.sourceProcessFamily || null,
          warnings: resultWarnings
        };
      };

      if (effectiveMode === 'manualBall') {
        const ball = Math.max(1, Number(targetBallWeight) || 120);
        const netRaw = layers * ball;
        const totalRaw = netRaw / (1 - waste);
        const bakedMass = effectiveBakeYield !== null ? netRaw * effectiveBakeYield : doughModel.bakedMassFromRawMass(netRaw);
        refineBakedDensityForThickness(bakedMass);
        return buildResult({
          totalRaw,
          netRaw,
          bakedMass,
          ballWeight: ball,
          scaledFlourWeight: flourMassInFormula() * (totalRaw / this.doughFormula.totalMass()),
          estimatedThicknessMm: thicknessFromBakedMass(bakedMass),
          estimatedRawThicknessMm: rawThicknessFromNetRaw(netRaw)
        });
      }

      if (effectiveMode === 'flourBasis') {
        const baseFlourMass = flourMassInFormula();
        const target = Number.isFinite(Number(targetFlourWeight)) ? Number(targetFlourWeight) : Number(this.geometry.targetFlourWeight || 0);
        if (!(baseFlourMass > 0 && target > 0)) return { ...emptyResult, usedRawDensity, rawDensityStatus, doughModel, doughAudit, bakeYield: doughModel.bakeYield, usedBakeYield, bakeYieldStatus, usedBakedDensity: effectiveBakedDensity, densityStatus };
        const factor = target / baseFlourMass;
        const totalRaw = this.doughFormula.totalMass() * factor;
        const netRaw = totalRaw * (1 - waste);
        const bakedMass = effectiveBakeYield !== null ? netRaw * effectiveBakeYield : doughModel.bakedMassFromRawMass(netRaw);
        refineBakedDensityForThickness(bakedMass);
        return buildResult({
          totalRaw,
          netRaw,
          bakedMass,
          ballWeight: netRaw / layers,
          scaledFlourWeight: target,
          estimatedThicknessMm: thicknessFromBakedMass(bakedMass),
          estimatedRawThicknessMm: rawThicknessFromNetRaw(netRaw)
        });
      }

      if (effectiveMode === 'rawThickness') {
        if (!(usedRawDensity > 0)) {
          return {
            ...emptyResult,
            usedRawDensity: null,
            rawDensityStatus,
            densityStatus,
            usedBakedDensity: effectiveBakedDensity,
            warnings: ['التحجيم بسمك الفرد الخام يتطلب تغطية تركيبية >= 90% أو كثافة مقاسة من المستخدم.'],
            doughModel,
            doughAudit,
            bakeYield: doughModel.bakeYield,
            usedBakeYield,
            bakeYieldStatus
          };
        }
        const rawVolume = this.geometry.rawSheetVolume();
        const netRaw = rawVolume * usedRawDensity;
        const totalRaw = netRaw / (1 - waste);
        const bakedMass = effectiveBakeYield !== null ? netRaw * effectiveBakeYield : doughModel.bakedMassFromRawMass(netRaw);
        refineBakedDensityForThickness(bakedMass);
        return buildResult({
          totalRaw,
          netRaw,
          bakedMass,
          ballWeight: netRaw / layers,
          scaledFlourWeight: flourMassInFormula() * (totalRaw / this.doughFormula.totalMass()),
          estimatedThicknessMm: thicknessFromBakedMass(bakedMass),
          estimatedRawThicknessMm: this.geometry.rawSheetThicknessMm
        });
      }

      if (effectiveMode === 'totalDoughWeight') {
        const targetMass = Number.isFinite(Number(targetTotalDoughWeight))
          ? Number(targetTotalDoughWeight)
          : Number(this.geometry.targetTotalDoughWeight || 1000);
        const basis = (totalDoughMassBasis || this.geometry.totalDoughMassBasis) === 'net' ? 'net' : 'prepared';
        let totalRaw = 0;
        let netRaw = 0;
        if (basis === 'net') {
          netRaw = targetMass;
          totalRaw = netRaw / (1 - waste);
        } else {
          totalRaw = targetMass;
          netRaw = totalRaw * (1 - waste);
        }
        const bakedMass = effectiveBakeYield !== null ? netRaw * effectiveBakeYield : doughModel.bakedMassFromRawMass(netRaw);
        refineBakedDensityForThickness(bakedMass);
        return buildResult({
          totalRaw,
          netRaw,
          bakedMass,
          ballWeight: netRaw / layers,
          scaledFlourWeight: flourMassInFormula() * (totalRaw / this.doughFormula.totalMass()),
          estimatedThicknessMm: thicknessFromBakedMass(bakedMass),
          estimatedRawThicknessMm: rawThicknessFromNetRaw(netRaw)
        });
      }

      // A manual or flour-based scale remains usable even if density is unknown.
      // Only volume-derived scale depends on the density estimate.
      if (!(effectiveBakedDensity > 0)) {
        return { ...emptyResult, usedRawDensity, rawDensityStatus, densityStatus: 'UNSUPPORTED', modelLimitations,
          warnings: [...modelLimitations, 'التحجيم الحجمي يحتاج كثافة موثوقة أو قيمة مقاسة من المستخدم؛ استخدم وزن الكرات أو أساس الدقيق.'],
          doughModel, doughAudit, bakeYield: doughModel.bakeYield, usedBakeYield, bakeYieldStatus, usedBakedDensity: null };
      }
      const volume = this.geometry.doughVolume();
      if (!(volume > 0)) return { ...emptyResult, usedRawDensity, rawDensityStatus, doughModel, doughAudit, bakeYield: doughModel.bakeYield, usedBakeYield, bakeYieldStatus, usedBakedDensity: effectiveBakedDensity, densityStatus };
      const bakedMass = volume * effectiveBakedDensity;
      const yieldForVolume = effectiveBakeYield !== null ? effectiveBakeYield : doughModel.bakeYield;
      const netRaw = yieldForVolume > 0 ? bakedMass / yieldForVolume : bakedMass;
      const totalRaw = netRaw / (1 - waste);
      return buildResult({
        totalRaw,
        netRaw,
        bakedMass,
        ballWeight: netRaw / layers,
        scaledFlourWeight: flourMassInFormula() * (totalRaw / this.doughFormula.totalMass()),
        estimatedThicknessMm: this.geometry.targetBakedLayerThicknessMm,
        estimatedRawThicknessMm: rawThicknessFromNetRaw(netRaw)
      });
    }

    scaleFilling({ ingredientsDB, targetTotalMass = null, designDensity = null, designDensitySource = null, profile = null, application = 'gaps', measuredStrain = null } = {}) {
      const baseFormula = this.fillingFormula;
      const waste = clamp((this.geometry?.wastePct || 0) / 100, 0, 0.5);
      const empty = {
        requiredMass: 0, onCakeRequiredMass: 0, usablePreparedMass: 0, preparedRequiredMass: 0,
        wasteAllowanceMass: 0, yieldLossMass: 0, wastePctApplied: waste * 100, perGap: 0,
        interiorRequiredMass: 0, outerRequiredMass: 0, topRequiredMass: 0, sideRequiredMass: 0,
        volume: 0, interiorVolume: 0, outerCoatVolume: 0, topCoatVolume: 0, sideCoatVolume: 0,
        scaledFormula: null, preparedFormula: null, mixDensity: null, densityAudit: null, densityWarnings: [], yieldAudit: null,
        applicationSuitability: null
      };
      if (!baseFormula || baseFormula.totalMass() <= 0) return empty;

      const processBasisId = baseFormula.sourceFillingId || baseFormula.processFillingId || null;
      const yieldOptions = measuredStrain ? { measuredStrain } : null;
      const usableBase = applyMasterFillingYieldModel(baseFormula, processBasisId, yieldOptions);
      const usableBaseFormula = usableBase.formula || baseFormula;
      const densitySource = designDensity ? (designDensitySource || baseFormula.designDensitySource || 'ENGINEERING_DEFAULT') : 'MODEL_ESTIMATE';
      const densityAudit = estimateFillingDensity(usableBaseFormula, ingredientsDB, { designDensity, designDensitySource:densitySource, profile });
      const density = densityAudit?.usedDensity || null;
      const densityWarnings = density ? [] : ['كثافة الحشو غير مدعومة ببيانات التركيب؛ أدخل وزن الحشو الكلي أو كثافة مدعومة.'];
      const gaps = this.geometry.gaps();
      const interiorVolume = this.geometry.interiorFillingVolume();
      const topCoatVolume = this.geometry.topCoatVolume();
      const sideCoatVolume = this.geometry.sideCoatVolume();
      const totalVolume = interiorVolume + topCoatVolume + sideCoatVolume;
      const usableBaseTotal = usableBaseFormula.totalMass();

      const suitability = profile?.applicationSuitability || null;
      const suitabilityValue = suitability ? suitability[application] : null;

      const buildPrepared = factor => {
        if (typeof baseFormula.withItems === 'function') {
          return baseFormula.withItems(baseFormula.items.map(item => ({ ingredientId: item.ingredientId, weight: item.weight * factor })), {
            type: 'SCALE_FILLING_PREPARED', details: { application, wastePct: waste * 100 }
          }, { massBasis: global.MEDOVIK_MASS_BASIS?.PREPARED_BATCH || 'PREPARED_BATCH' });
        }
        return new Formula(baseFormula.items.map(item => ({ ingredientId: item.ingredientId, weight: item.weight * factor })), baseFormula.meta || {});
      };

      const buildResult = onCakeMass => {
        const onCakeRequiredMass = Math.max(0, Number(onCakeMass) || 0);
        const usablePreparedTarget = waste < 1 ? onCakeRequiredMass / (1 - waste) : onCakeRequiredMass;
        const factor = usableBaseTotal > 0 ? usablePreparedTarget / usableBaseTotal : 0;
        const preparedFormula = buildPrepared(factor);
        const usableScaled = applyMasterFillingYieldModel(preparedFormula, processBasisId, yieldOptions);
        if (usableScaled.formula) usableScaled.formula.massBasis = global.MEDOVIK_MASS_BASIS?.USABLE_AFTER_PROCESS || 'USABLE_AFTER_PROCESS';
        const usablePreparedMass = usableScaled.formula?.totalMass?.() || usablePreparedTarget;
        const preparedRequiredMass = preparedFormula.totalMass();
        const wasteAllowanceMass = Math.max(0, usablePreparedMass - onCakeRequiredMass);
        const yieldLossMass = Math.max(0, preparedRequiredMass - usablePreparedMass);
        const share = totalVolume > 0 ? onCakeRequiredMass / totalVolume : 0;
        const interiorRequiredMass = share * interiorVolume;
        const topRequiredMass = share * topCoatVolume;
        const sideRequiredMass = share * sideCoatVolume;
        return {
          requiredMass: onCakeRequiredMass,
          onCakeRequiredMass,
          usablePreparedMass,
          preparedRequiredMass,
          wasteAllowanceMass,
          yieldLossMass,
          wastePctApplied: waste * 100,
          perGap: gaps > 0 ? interiorRequiredMass / gaps : 0,
          interiorRequiredMass,
          outerRequiredMass: topRequiredMass + sideRequiredMass,
          topRequiredMass,
          sideRequiredMass,
          volume: totalVolume,
          interiorVolume,
          outerCoatVolume: topCoatVolume + sideCoatVolume,
          topCoatVolume,
          sideCoatVolume,
          scaledFormula: usableScaled.formula,
          preparedFormula,
          mixDensity: density,
          densityWarnings,
          densitySource,
          densityAudit,
          yieldAudit: usableScaled.audit,
          applicationSuitability: suitabilityValue,
          applicationWarning: suitabilityValue === false || suitabilityValue === 'not-recommended'
            ? 'هذا الحشو غير موصى به لهذا الاستخدام دون دعم أو تغطية إضافية.'
            : null
        };
      };

      if (targetTotalMass != null && targetTotalMass > 0) return buildResult(targetTotalMass);
      if (!(density > 0)) return { ...empty, densityAudit, densityWarnings, densitySource, yieldAudit: usableBase.audit, applicationSuitability: suitabilityValue };
      if (!(totalVolume > 0)) return { ...empty, densityAudit, densityWarnings, yieldAudit: usableBase.audit, mixDensity: density, densitySource, applicationSuitability: suitabilityValue };
      return buildResult(totalVolume * density);
    }

    combinedSweetness({ ingredientsDB, scaledDoughFormula, scaledFillingFormula } = {}) {
      const doughFormula = scaledDoughFormula || this.doughFormula;
      const fillingFormula = scaledFillingFormula || this.fillingFormula;
      const dough = doughFormula ? doughFormula.sweetness(ingredientsDB) : { totalMass: 0, totalEq: 0, sources: [] };
      const filling = fillingFormula ? fillingFormula.sweetness(ingredientsDB) : { totalMass: 0, totalEq: 0, sources: [] };
      const totalMass = dough.totalMass + filling.totalMass;
      const totalEq = dough.totalEq + filling.totalEq;
      const equivPer100 = totalMass > 0 ? totalEq / totalMass * 100 : null;
      const sources = [...dough.sources.map(source => ({ ...source, origin: 'dough' })), ...filling.sources.map(source => ({ ...source, origin: 'filling' }))].sort((a, b) => b.eq - a.eq);
      sources.forEach(source => { source.pctOfSweet = totalEq > 0 ? source.eq / totalEq * 100 : 0; });
      let label = 'غير متاح';
      if (equivPer100 != null) {
        if (equivPer100 === 0) label = 'بدون حلاوة تقريباً';
        else if (equivPer100 < 10) label = 'خفيفة جداً';
        else if (equivPer100 < 20) label = 'خفيفة';
        else if (equivPer100 < 30) label = 'متوسطة';
        else if (equivPer100 < 40) label = 'حلوة';
        else label = 'حلوة جداً / ثقيلة';
      }
      return { totalMass, totalEq, equivPer100, label, dough, filling, sources };
    }

    structureIndices(ingredientsDB, scaledDoughFormula, scaledFillingFormula) {
      const doughFormula = scaledDoughFormula || this.doughFormula;
      const fillingFormula = scaledFillingFormula || this.fillingFormula;
      const doughTotalWaterToFlour = doughFormula ? doughFormula.totalWaterToFlourRatio(ingredientsDB) : null;
      const aqueousSugarIndex = fillingFormula ? fillingFormula.aqueousSugarIndex(ingredientsDB) : { value: null, label: 'غير متاح' };
      const fillSolidsWater = fillingFormula ? fillingFormula.solidsWaterRatio(ingredientsDB) : { ratio: null, label: 'غير متاح' };
      return {
        doughHydration: doughTotalWaterToFlour,
        doughTotalWaterToFlour,
        fillingBrix: { brix: aqueousSugarIndex.value, value: aqueousSugarIndex.value, label: aqueousSugarIndex.label, deprecated: true },
        fillingAqueousSugarIndex: aqueousSugarIndex,
        fillSolidsWater
      };
    }
  }

  global.ProductGeometry = ProductGeometry;
  global.Product = Product;
})(typeof window !== 'undefined' ? window : globalThis);
