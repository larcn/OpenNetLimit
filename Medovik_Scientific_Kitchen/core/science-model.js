/* offline build: science-model.js */
const COMPONENT_DENSITIES = Object.freeze({
  water: 1.00,
  fat: 0.93,
  sugar: 1.59,
  protein: 1.35,
  starch: 1.50,
  cocoa: 1.30,
  milkSolids: 1.52,
  carbs: 1.53,
  other: 1.45
});

function pos(value) {
  return (typeof value === 'number' && Number.isFinite(value) && value > 0) ? value : 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function smoothstep01(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - (2 * t));
}
function getIngredientCompositionFractions(ing) {
  if (!ing || ing._missing) return {
    water: 0, fat: 0, protein: 0, sugar: 0, starch: 0, cocoa: 0, milkSolids: 0, carbs: 0, other: 0,
    totalKnown: 0, residual: 0
  };

  const water = pos(ing.waterFrac);
  const fat = pos(ing.fatFrac);
  const protein = pos(ing.proteinFrac);

  const sugarDirect = pos(ing.totalSugarFrac ?? ing.sugarFrac);
  const sugarFromFields = [ing.sucrose, ing.glucose, ing.fructose, ing.lactose, ing.maltose]
    .map(pos)
    .reduce((sum, value) => sum + value, 0);
  const sugar = Math.max(sugarDirect, sugarFromFields);

  const starch = pos(ing.starchFrac);
  // cocoaFiberFrac is normally a subset of cocoa solids, not an additional fraction.
  const cocoa = Math.max(pos(ing.cocoaSolidsFrac), pos(ing.cocoaFiberFrac));
  const otherBase = pos(ing.otherSolidsFrac);

  // milkSolidsFrac and carbsFrac are aggregate descriptors that overlap with
  // fat/protein/sugar/starch in many records. They are therefore used only as
  // classification hints for the unassigned residual and are never added twice.
  let primaryKnown = water + fat + protein + sugar + starch + cocoa + otherBase;
  if (primaryKnown > 1) {
    // A validated record should not enter here, but keep the physical model bounded.
    const scale = 1 / primaryKnown;
    return {
      water: water * scale,
      fat: fat * scale,
      protein: protein * scale,
      sugar: sugar * scale,
      starch: starch * scale,
      cocoa: cocoa * scale,
      milkSolids: 0,
      carbs: 0,
      other: otherBase * scale,
      totalKnown: 1,
      residual: 0
    };
  }

  const canUseResidual = !['flavor'].includes(ing.type);
  const residual = canUseResidual && primaryKnown < 0.995 ? Math.max(0, 1 - primaryKnown) : 0;
  let residualToStarch = 0;
  let residualToMilkSolids = 0;
  let residualToCarbs = 0;
  let residualToOther = residual;

  if (residual > 0) {
    if (ing.type === 'flour') {
      residualToStarch = residual;
      residualToOther = 0;
    } else if (ing.type === 'dairy' || ing.id === 'butter') {
      residualToMilkSolids = residual;
      residualToOther = 0;
    } else if (ing.type === 'sweetener' || ing.type === 'sugar') {
      residualToCarbs = residual;
      residualToOther = 0;
    }
  }

  primaryKnown += residual;
  return {
    water,
    fat,
    protein,
    sugar,
    starch: starch + residualToStarch,
    cocoa,
    milkSolids: residualToMilkSolids,
    carbs: residualToCarbs,
    other: otherBase + residualToOther,
    totalKnown: Math.min(1, primaryKnown),
    residual
  };
}
function getIngredientContributionFromRecord(ing, mass) {
  const f = getIngredientCompositionFractions(ing);
  const water = mass * f.water;
  const sugar = mass * f.sugar;
  const fat = mass * f.fat;
  const protein = mass * f.protein;
  const starch = mass * f.starch;
  const cocoa = mass * f.cocoa;
  const milkSolids = mass * f.milkSolids;
  const carbs = mass * f.carbs;
  const otherSolids = mass * f.other;
  return {
    water,
    sugar,
    fat,
    protein,
    starch,
    cocoa,
    milkSolids,
    carbs,
    otherSolids,
    solids: sugar + fat + protein + starch + cocoa + milkSolids + carbs + otherSolids,
    accountedMass: mass * f.totalKnown
  };
}
function estimateFormulaComponents(formula, ingredientsDB) {
  const totals = {
    totalMass: 0,
    waterMass: 0,
    sugarMass: 0,
    fatMass: 0,
    proteinMass: 0,
    starchMass: 0,
    cocoaMass: 0,
    milkSolidsMass: 0,
    carbsMass: 0,
    otherSolidsMass: 0,
    accountedMass: 0
  };

  (formula?.items || []).forEach(item => {
    const mass = Number(item?.weight) || 0;
    if (mass <= 0) return;
    const ing = getIngredient(ingredientsDB, item.ingredientId);
    const c = getIngredientContributionFromRecord(ing, mass);
    totals.totalMass += mass;
    totals.waterMass += c.water;
    totals.sugarMass += c.sugar;
    totals.fatMass += c.fat;
    totals.proteinMass += c.protein;
    totals.starchMass += c.starch;
    totals.cocoaMass += c.cocoa;
    totals.milkSolidsMass += c.milkSolids;
    totals.carbsMass += c.carbs;
    totals.otherSolidsMass += c.otherSolids;
    totals.accountedMass += c.accountedMass;
  });

  totals.solidsMass = totals.totalMass - totals.waterMass;
  totals.coverage = totals.totalMass > 0 ? Math.min(1, totals.accountedMass / totals.totalMass) : 0;
  return totals;
}
function densityFromComponentMasses(components) {
  const volume =
    (components.waterMass || 0) / COMPONENT_DENSITIES.water +
    (components.fatMass || 0) / COMPONENT_DENSITIES.fat +
    (components.sugarMass || 0) / COMPONENT_DENSITIES.sugar +
    (components.proteinMass || 0) / COMPONENT_DENSITIES.protein +
    (components.starchMass || 0) / COMPONENT_DENSITIES.starch +
    (components.cocoaMass || 0) / COMPONENT_DENSITIES.cocoa +
    (components.milkSolidsMass || 0) / COMPONENT_DENSITIES.milkSolids +
    (components.carbsMass || 0) / COMPONENT_DENSITIES.carbs +
    (components.otherSolidsMass || 0) / COMPONENT_DENSITIES.other;

  if (!Number.isFinite(volume) || volume <= 0) return { density: null, volume: null };
  return {
    density: (components.totalMass || 0) / volume,
    volume
  };
}
function estimateNonAeratedDensityFromComposition(formula, ingredientsDB) {
  const components = estimateFormulaComponents(formula, ingredientsDB);
  const density = densityFromComponentMasses(components);
  // 0.90 is a conservative product decision, not a physical threshold.
  const supported = components.coverage >= 0.90;
  return {
    ...density,
    density: supported ? density.density : null,
    volume: supported ? density.volume : null,
    components,
    densityStatus: supported ? 'MODEL_ESTIMATE' : 'UNSUPPORTED',
    modelLimitations: supported ? [] : ['كتلة مجهولة التركيب تتجاوز حد المنتج؛ لا يمكن حساب كثافة تركيبية موثوقة.'],
    confidence: supported ? 'medium' : 'unsupported'
  };
}

function summarizeFillingMassShares(formula, ingredientsDB) {
  const summary = {
    totalMass: formula?.totalMass?.() || 0,
    whippingCreamMass: 0,
    butterMass: 0,
    dairyMass: 0,
    directSweetenerMass: 0,
    denseSweetenerMass: 0,
    eggMass: 0,
    structuringMass: 0,
    chocolateMass: 0
  };

  (formula?.items || []).forEach(item => {
    const mass = Number(item?.weight) || 0;
    if (mass <= 0) return;
    const ing = getIngredient(ingredientsDB, item.ingredientId);
    const c = getIngredientContributionFromRecord(ing, mass);
    if (item.ingredientId === 'whipping-cream') summary.whippingCreamMass += mass;
    if (item.ingredientId === 'butter' || ing.type === 'fat') summary.butterMass += mass;
    if (ing.type === 'dairy') summary.dairyMass += mass;
    if (ing.type === 'egg') summary.eggMass += mass;
    if (ing.type === 'sweetener' || ing.type === 'sugar') {
      const simple = (ing.type === 'sugar') || ((ing.fatFrac ?? 0) <= 0.02 && (ing.proteinFrac ?? 0) <= 0.02 && (ing.waterFrac ?? 0) <= 0.40);
      if (simple) summary.directSweetenerMass += mass;
      else summary.denseSweetenerMass += mass;
    }
    if (c.starch + c.cocoa + c.milkSolids > 0) summary.structuringMass += mass;
    if (c.cocoa > 0) summary.chocolateMass += mass;
  });

  const total = summary.totalMass || 1;
  summary.shares = {
    whippingCream: summary.whippingCreamMass / total,
    butter: summary.butterMass / total,
    dairy: summary.dairyMass / total,
    directSweetener: summary.directSweetenerMass / total,
    denseSweetener: summary.denseSweetenerMass / total,
    egg: summary.eggMass / total,
    structuring: summary.structuringMass / total,
    chocolate: summary.chocolateMass / total
  };
  return summary;
}

function midpointBand(band) {
  if (!band || !Number.isFinite(band.min) || !Number.isFinite(band.max)) return null;
  return (band.min + band.max) / 2;
}

function evaluateBand(value, band) {
  if (!Number.isFinite(value) || !band || !Number.isFinite(band.min) || !Number.isFinite(band.max)) return null;
  if (value < band.min) return { status: 'below', delta: value - band.min };
  if (value > band.max) return { status: 'above', delta: value - band.max };
  return { status: 'within', delta: 0 };
}
function inferFillingAerationModel(formula, ingredientsDB, hints = {}) {
  const summary = summarizeFillingMassShares(formula, ingredientsDB);
  const s = summary.shares;
  let processClass = hints.processClass || 'dense-spread';
  let airFraction = midpointBand(hints.expectedAirBand) ?? 0.03;
  const rationale = [];

  if (!hints.processClass && s.whippingCream >= 0.18) {
    processClass = 'folded-whipped-dairy';
    airFraction = 0.18 + Math.min(0.14, s.whippingCream * 0.35);
    rationale.push('يوجد جزء معتبر من كريمة الخفق؛ الخلط هنا قد يحتجز هواءً فعلياً لا يملكه الخليط غير المخفوق.');
    if (s.denseSweetener > 0.25) {
      airFraction -= 0.04;
      rationale.push('وجود محليات/مراكز ثقيلة مثل الدولسي أو الكراميل يحد عادة من حجم الهواء النهائي مقارنة بالكريمة المخفوقة الصافية.');
    }
    if (s.structuring > 0.18 || s.chocolate > 0.18) {
      airFraction -= 0.03;
      rationale.push('وجود شوكولاتة أو مواد بنائية/صلبة كثيرة يزيد الثقل ويرفع الكثافة النهائية.');
    }
    if (s.dairy > 0.55) {
      airFraction += 0.02;
      rationale.push('القواعد اللبنية الطرية تسهّل الوصول لقوام موس/فوم أخف إذا كان الخفق والطي منضبطين.');
    }
  } else if (!hints.processClass && s.butter >= 0.08 && s.directSweetener >= 0.08) {
    processClass = 'butter-creamed';
    airFraction = 0.09 + Math.min(0.08, s.butter * 0.30);
    rationale.push('يوجد creaming للزبدة/الدهن مع مادة حلوة بسيطة؛ هذا يضيف هواءً محدوداً لكنه أقل من حشوات الكريمة المخفوقة.');
    if (s.denseSweetener > 0.25) {
      airFraction -= 0.02;
      rationale.push('وجود كراميل/دولسي كثيف يحد من الهواء المحتجز في creaming.');
    }
  } else if (!hints.processClass && s.dairy >= 0.55) {
    processClass = 'dense-dairy';
    airFraction = 0.05 + Math.min(0.04, s.dairy * 0.05);
    rationale.push('الحشو لبني كثيف في الأساس؛ نسمح بهواء محدود ناتج عن الخلط فقط، لا overrun كبير.');
  } else if (!hints.processClass && (s.structuring >= 0.18 || s.chocolate >= 0.18)) {
    processClass = 'structured-custard-or-chocolate';
    airFraction = 0.02 + Math.min(0.03, s.whippingCream * 0.10);
    rationale.push('الحشو يعتمد على شوكولاتة/نشا/مواد بنائية، لذا الكثافة النهائية أقرب للخليط الكثيف مع قدر بسيط فقط من الهواء.');
  }

  if (hints.expectedAirBand) {
    airFraction = clamp(airFraction, hints.expectedAirBand.min ?? 0.01, hints.expectedAirBand.max ?? 0.35);
  }
  airFraction = clamp(airFraction, 0.01, 0.35);
  const overrun = airFraction / (1 - airFraction);
  const confidence = (processClass === 'dense-spread' || processClass === 'dense-dairy') ? 'medium' : 'low';
  return { processClass, airFraction, overrun, confidence, rationale, summary };
}
function estimateFillingDensity(formula, ingredientsDB, { designDensity = null, designDensitySource = 'ENGINEERING_DEFAULT', profile = null } = {}) {
  const nonAerated = estimateNonAeratedDensityFromComposition(formula, ingredientsDB);
  const aeration = inferFillingAerationModel(formula, ingredientsDB, { processClass: profile?.processClass, expectedAirBand: profile?.expectedAirBand });
  const estimatedDensity = (nonAerated.density && aeration.airFraction < 1)
    ? (nonAerated.density * (1 - aeration.airFraction))
    : null;

  let usedDensity = estimatedDensity;
  let source = 'estimated';
  let impliedAirFraction = aeration.airFraction;
  let impliedOverrun = aeration.overrun;
  const rationale = [...aeration.rationale];

  if (typeof designDensity === 'number' && Number.isFinite(designDensity) && designDensity > 0) {
    usedDensity = designDensity;
    source = 'explicit';
    if (nonAerated.density && designDensity < nonAerated.density) {
      impliedAirFraction = clamp(1 - (designDensity / nonAerated.density), 0, 0.80);
      impliedOverrun = impliedAirFraction < 1 ? (impliedAirFraction / (1 - impliedAirFraction)) : Infinity;
      rationale.unshift('استُخدمت كثافة تصميمية صريحة للحشوة؛ تم اشتقاق الهواء الضمني منها مقارنة بالكثافة غير المهوّاة المحسوبة من تركيب الكتلة.');
    }
  } else {
    rationale.unshift('لا توجد كثافة تصميمية صريحة؛ استُخدم تقدير تركيبي: كثافة غير مهوّاة من تركيب الكتلة، ثم خفضها بهواء تقديري حسب أسلوب الخفق/الطي المتوقع.');
  }

  const bandCheck = evaluateBand(usedDensity, profile?.targetDensityBand || null);
  if (bandCheck?.status === 'below') rationale.push('الكثافة الحالية أدنى من النطاق المرجعي المسجل لهذه الحشوة؛ هذا قد يعني تهوية أعلى من المرجع أو ثباتاً أقل من المطلوب.');
  if (bandCheck?.status === 'above') rationale.push('الكثافة الحالية أعلى من النطاق المرجعي المسجل لهذه الحشوة؛ هذا قد يعني هواء أقل أو قاعدة أكثر ثقلاً/رطوبة من المرجع.');

  return {
    source,
    densityStatus: source === 'explicit' ? (designDensitySource === 'USER_MEASURED' ? 'USER_MEASURED' : 'ENGINEERING_DEFAULT') : nonAerated.densityStatus,
    modelLimitations: nonAerated.modelLimitations,
    nonAeratedDensity: nonAerated.density,
    estimatedDensity,
    usedDensity,
    impliedAirFraction,
    impliedOverrun,
    processClass: aeration.processClass,
    confidence: source === 'explicit' ? (profile?.confidence || 'medium') : (profile?.confidence || aeration.confidence),
    rationale,
    coverage: nonAerated.components.coverage,
    components: nonAerated.components,
    targetDensityBand: profile?.targetDensityBand || null,
    expectedAirBand: profile?.expectedAirBand || null,
    bandCheck
  };
}

function estimateFinalMoistureTarget(formula, ingredientsDB) {
  const c = estimateFormulaComponents(formula, ingredientsDB);
  const total = c.totalMass || 1;
  const sugarShare = c.sugarMass / total;
  // طبقات الميدوفيك المخبوزة رقيقة وتشبه العجائن/البسكويت الرقيقة أكثر من الكيك،
  // لكن وجود العسل والسكر يرفع الماء المحتجز قليلاً مقارنة بالبسكويت الجاف جداً.
  return clamp(0.055 + (sugarShare * 0.10), 0.05, 0.10);
}

function estimateDoughPorosity(formula, ingredientsDB, geometry = null) {
  const totalMass = formula?.totalMass?.() || 1;
  let eggMass = 0;
  let leavenerMass = 0;
  let honeySweetenerMass = 0;

  (formula?.items || []).forEach(item => {
    const mass = Number(item?.weight) || 0;
    if (mass <= 0) return;
    const ing = getIngredient(ingredientsDB, item.ingredientId);
    if (ing.type === 'egg') eggMass += mass;
    if (ing.type === 'leavener') leavenerMass += mass;
    if (item.ingredientId === 'honey') honeySweetenerMass += mass;
  });

  let porosity = 0.12 + (eggMass / totalMass) * 0.22 + (leavenerMass / totalMass) * 3.0;
  if (honeySweetenerMass / totalMass > 0.08) porosity += 0.01;
  const bakedThickness = Number(geometry?.targetBakedLayerThicknessMm ?? geometry?.estimatedBakedLayerThicknessMm ?? geometry?.doughThicknessMm);
  if (Number.isFinite(bakedThickness) && bakedThickness > 0) {
    const thinness = (2.8 - bakedThickness) / 0.9;
    porosity -= 0.02 * smoothstep01(thinness);
  }
  return clamp(porosity, 0.10, 0.24);
}
function estimateDoughBakeModel(formula, ingredientsDB, geometry = null) {
  const components = estimateFormulaComponents(formula, ingredientsDB);
  const rawMass = components.totalMass || 0;
  if (rawMass <= 0) {
    return {
      rawMass: 0,
      finalMoistureTarget: 0.06,
      retainedWaterMass: 0,
      bakedMassFromRawMass: () => 0,
      bakeYield: 0,
      massBalance: { rawMass: 0, modeledWaterLoss: 0, modeledOtherLoss: 0, retainedMass: 0, residual: 0, assumptions: [] },
      nonPorousBakedDensity: 1.10,
      effectiveBakedDensity: 1.05,
      porosity: 0.15,
      rationale: []
    };
  }

  const finalMoistureTarget = estimateFinalMoistureTarget(formula, ingredientsDB);
  const dryMass = rawMass - components.waterMass;
  const retainedWaterMass = Math.min(
    components.waterMass,
    dryMass * finalMoistureTarget / (1 - finalMoistureTarget)
  );
  const bakedMass = dryMass + retainedWaterMass;
  // Physical conservation is an identity, not a calibrated yield interval.
  // Only water evaporation is represented by this simplified model;
  // soda CO2 and other volatiles are explicitly NOT predicted here.
  const modeledWaterLoss = Math.max(0, components.waterMass - retainedWaterMass);
  const modeledOtherLoss = 0;
  const retainedMass = rawMass - modeledWaterLoss - modeledOtherLoss;
  const bakeYield = retainedMass / rawMass;
  const massBalance = {
    rawMass, modeledWaterLoss, modeledOtherLoss, retainedMass,
    residual: rawMass - modeledWaterLoss - modeledOtherLoss - retainedMass,
    assumptions: ['تبخر الماء تقديري؛ فقد ثاني أكسيد الكربون والمواد المتطايرة الأخرى غير محسوب، وليس صفرًا مثبتًا.']
  };
  const porosity = estimateDoughPorosity(formula, ingredientsDB, geometry);

  const bakedComponents = {
    totalMass: bakedMass,
    waterMass: retainedWaterMass,
    sugarMass: components.sugarMass,
    fatMass: components.fatMass,
    proteinMass: components.proteinMass,
    starchMass: components.starchMass,
    cocoaMass: components.cocoaMass,
    milkSolidsMass: components.milkSolidsMass,
    carbsMass: components.carbsMass,
    otherSolidsMass: components.otherSolidsMass
  };

  const nonPorous = densityFromComponentMasses(bakedComponents);
  const densitySupported = components.coverage >= 0.90; // product policy, not a physical law
  const nonPorousBakedDensity = densitySupported ? nonPorous.density : null;
  const effectiveBakedDensity = nonPorousBakedDensity == null ? null : nonPorousBakedDensity * (1 - porosity);

  return {
    rawMass,
    finalMoistureTarget,
    retainedWaterMass,
    bakeYield,
    massBalance,
    nonPorousBakedDensity,
    effectiveBakedDensity,
    densityStatus: densitySupported ? 'MODEL_ESTIMATE' : 'UNSUPPORTED',
    modelLimitations: densitySupported ? [] : ['تغطية التركيب أقل من 90%؛ تقدير الكثافة غير مدعوم.'],
    porosity,
    components,
    rationale: [
      'عند تحويل وزن العجين الخام إلى وزن طبقات مخبوزة، استُخدم تقدير مبني على احتفاظ نهائي بالرطوبة + مسامية متوقعة لطبقات ميدوفيك الرقيقة، بدلاً من خلط الوزن الخام بوزن الكيكة بعد الخَبز.',
      'الوزن النهائي المخبوز ليس مجرد raw mass ناقص هالك؛ هناك فقد ماء أثناء الخَبز، بينما يظل معظم السكر والدهون والمواد الصلبة داخل الطبقات.'
    ],
    bakedMassFromRawMass(rawMassInput) {
      const raw = Number(rawMassInput) || 0;
      return raw * bakeYield;
    }
  };
}


function safeDiv(a, b) {
  return (Number.isFinite(a) && Number.isFinite(b) && b > 0) ? (a / b) : null;
}

function evaluateBandStatusHtml(status) {
  if (status === 'within') return 'ضمن النطاق';
  if (status === 'below') return 'أدنى من النطاق';
  if (status === 'above') return 'أعلى من النطاق';
  return '—';
}



function confidenceFromAuditScore(score) {
  if (!Number.isFinite(score)) return 'low';
  if (score >= 0.82) return 'high';
  if (score >= 0.62) return 'medium';
  return 'low';
}

function bandStatusScore(status) {
  if (status === 'within') return 1;
  if (status === 'above' || status === 'below') return 0.55;
  return 0.35;
}
function auditFillingAgainstMasterProfile(formula, ingredientsDB, masterProfile = null, designDensity = null) {
  const densityAudit = estimateFillingDensity(formula, ingredientsDB, { designDensity, designDensitySource: 'ENGINEERING_DEFAULT', profile: masterProfile });
  const calibration = masterProfile?.calibration || null;
  const sweet = formula?.sweetness?.(ingredientsDB) || null;
  const solidsWater = formula?.solidsWaterRatio?.(ingredientsDB) || null;
  const metrics = {
    sweetnessEqPer100g: sweet?.equivPer100 ?? null,
    solidsWater: solidsWater?.ratio ?? null,
    nonAeratedDensity: densityAudit?.nonAeratedDensity ?? null,
    usedDensity: densityAudit?.usedDensity ?? null,
    airFraction: densityAudit?.impliedAirFraction ?? null
  };
  if (!calibration?.targetBands) {
    return {
      densityAudit,
      calibration,
      metrics,
      checks: null,
      notes: [],
      score: null,
      confidence: masterProfile?.confidence || densityAudit?.confidence || 'low'
    };
  }

  const checks = {};
  const notes = [];
  const keys = [
    ['sweetnessEqPer100g', 'الحلاوة المكافئة'],
    ['solidsWater', 'نسبة المواد الصلبة/الماء'],
    ['nonAeratedDensity', 'الكثافة غير المهوّاة'],
    ['usedDensity', 'الكثافة التشغيلية'],
    ['airFraction', 'الهواء المتوقع/الضمني']
  ];

  let total = 0;
  let count = 0;
  keys.forEach(([key, label]) => {
    const band = calibration.targetBands[key];
    const value = metrics[key];
    const check = band ? evaluateBand(value, band) : null;
    checks[key] = { value, band, ...(check || {}) };
    if (check) {
      total += bandStatusScore(check.status);
      count += 1;
      if (check.status === 'above') notes.push(`${label} الحالية أعلى من النطاق المرجعي المشتق لهذه الحشوة.`);
      if (check.status === 'below') notes.push(`${label} الحالية أدنى من النطاق المرجعي المشتق لهذه الحشوة.`);
    }
  });

  const score = count ? (total / count) : null;
  return {
    densityAudit,
    calibration,
    metrics,
    checks,
    notes,
    score,
    auditType: 'PRESET_CONSISTENCY',
    confidence: null,
    consistencyLevel: confidenceFromAuditScore(score),
    summary: score == null ? 'لا توجد حدود اتساق مسجلة لهذا القالب.' : score >= 0.82 ? 'متسق مع قالب الحشو المسجل.' : score >= 0.62 ? 'قريب من قالب الحشو مع اختلافات تستحق الانتباه.' : 'مختلف بوضوح عن قالب الحشو المسجل.'
  };
}
function auditDoughSystem(formula, ingredientsDB, geometry = null, explicitProfile = null) {
  const components = estimateFormulaComponents(formula, ingredientsDB);
  const bakeModel = estimateDoughBakeModel(formula, ingredientsDB, geometry);
  const flourMass = (formula?.items || []).reduce((s, item) => {
    const ing = getIngredient(ingredientsDB, item.ingredientId);
    return s + ((ing.type === 'flour') ? (Number(item.weight) || 0) : 0);
  }, 0);

  const massById = (id) => (formula?.items || []).filter(i => i.ingredientId === id).reduce((s, i) => s + (Number(i.weight) || 0), 0);
  const honeyMass = massById('honey');
  const butterMass = massById('butter');
  const eggMass = massById('eggs');
  const sodaMass = massById('baking-soda');
  const directSugarMass = massById('sugar') + massById('powdered-sugar');
  const totalSweetenersMass = directSugarMass + honeyMass + massById('condensed-milk') + massById('dulce-de-leche') + massById('caramel');

  const metrics = {
    flourMass,
    totalSweetenersOnFlour: safeDiv(totalSweetenersMass, flourMass),
    honeyOnFlour: safeDiv(honeyMass, flourMass),
    butterOnFlour: safeDiv(butterMass, flourMass),
    eggOnFlour: safeDiv(eggMass, flourMass),
    sodaOnFlour: safeDiv(sodaMass, flourMass),
    waterOnFlour: safeDiv(components.waterMass, flourMass),
    bakedDensity: bakeModel.effectiveBakedDensity,
    finalMoisture: bakeModel.finalMoistureTarget,
    porosity: bakeModel.porosity
  };

  const profile = explicitProfile || inferCurrentDoughProfile(formula, ingredientsDB);
  const bandAudit = evaluateDoughAgainstProfile(metrics, profile);

  const rationale = [
    'المراجعة هنا تفصل بين التركيب الخام للعجين وبين حالة الطبقات بعد الخَبز. لذلك تُراجع المحليات، الماء التقريبي، الصودا، والرطوبة النهائية والكتلة المخبوزة كلٌ في موضعه.',
    'قيمة ماء/دقيق هنا ماءٌ تركيبي تقريبي من المكونات (مثل البيض والعسل والزبدة) لا ماء حر مضاف فقط؛ لذلك لا ينبغي قراءتها كترطيب عجين خبز مباشر.'
  ];

  if ((metrics.sodaOnFlour ?? 0) > 0.02) rationale.push('الصودا تتجاوز تقريباً الطرف الأعلى المأمون لهذا الملف المرجعي؛ راقب الطعم القلوي واللون المائل للغمق الزائد.');
  if ((metrics.sodaOnFlour ?? 0) > 0 && (metrics.honeyOnFlour ?? 0) < 0.15) rationale.push('وجود صودا مع عسل منخفض نسبياً يعني أن جزءاً أكبر من الاعتماد سيكون على التفكك الحراري لا على التعادل الحمضي-القاعدي وحده.');
  if ((metrics.waterOnFlour ?? 0) < 0.18) rationale.push('الماء التركيبي منخفض؛ راقب قساوة العجين وسهولة الفرد بعد الراحة.');
  if ((metrics.waterOnFlour ?? 0) > 0.35) rationale.push('الماء التركيبي مرتفع نسبيًا؛ راقب لزوجة العجين والحاجة إلى تبريد/راحة قبل الفرد.');
  if ((metrics.bakedDensity ?? 0) > 1.10) rationale.push('الكثافة المخبوزة الفعالة مرتفعة؛ قد يدل ذلك على مسامية أقل أو طبقات أثقل من المرجع.');
  if ((metrics.bakedDensity ?? 0) < 0.90) rationale.push('الكثافة المخبوزة الفعالة منخفضة جدًا؛ راقب أن لا يكون التقدير متفائلاً أكثر من اللازم مقارنة بالسمك والخبز الفعليين.');

  const metricNotes = [];
  let total = 0;
  let count = 0;
  Object.entries(bandAudit || {}).forEach(([key, audit]) => {
    if (!audit?.status) return;
    total += bandStatusScore(audit.status);
    count += 1;
    const label = audit?.band?.label || key;
    if (audit.status === 'above') metricNotes.push(`${label} الحالية أعلى من النطاق المرجعي لهذا الملف.`);
    if (audit.status === 'below') metricNotes.push(`${label} الحالية أدنى من النطاق المرجعي لهذا الملف.`);
  });
  const score = count ? (total / count) : null;
  const calibrationConfidence = null;
  const consistencyLevel = confidenceFromAuditScore(score);
  const summary = score == null
    ? 'لا يوجد قالب اتساق مناسب لهذه الوصفة.'
    : score >= 0.82
      ? 'المؤشرات متسقة مع القالب التشغيلي المختار.'
      : score >= 0.62
        ? 'المؤشرات قريبة من القالب مع اختلافات تستحق الانتباه.'
        : 'المؤشرات تختلف بوضوح عن القالب التشغيلي المختار.';

  return {
    profile,
    metrics,
    bandAudit,
    components,
    bakeModel,
    rationale,
    metricNotes,
    score,
    calibrationConfidence,
    consistencyLevel,
    auditType: 'PRESET_CONSISTENCY',
    summary,
    coverage: components.coverage,
    displayHelpers: { evaluateBandStatusHtml }
  };
}
