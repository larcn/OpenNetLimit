// =============================================================================
// Medovik Journey System - Active Runtime Calculators
// Active calculators for the session-first Medovik workflow.
// =============================================================================
(function(global) {
  'use strict';

  const RECIPE_INGREDIENT_ID_MAP = Object.freeze({
    flour: 'flour',
    sugar: 'sugar',
    honey: 'honey',
    butter: 'butter',
    eggs: 'eggs',
    bakingSoda: 'baking-soda',
    bakingPowder: 'baking-powder',
    vanilla: 'vanilla',
    salt: 'salt',
    cocoa: 'cocoa-powder',
    sourCream: 'sour-cream'
  });

  const FILLING_INGREDIENT_ID_MAP = Object.freeze({
    sourCream: 'sour-cream',
    sugar: 'sugar',
    vanilla: 'vanilla',
    dulceDeLeche: 'dulce-de-leche',
    butter: 'butter',
    cream: 'whipping-cream',
    condensedMilk: 'condensed-milk'
  });

  const RECIPE_EDITABLE_INGREDIENT_IDS = Object.freeze(Array.from(new Set(Object.values(RECIPE_INGREDIENT_ID_MAP))));
  const FILLING_EDITABLE_INGREDIENT_IDS = Object.freeze(Array.from(new Set(Object.values(FILLING_INGREDIENT_ID_MAP).concat([
    'powdered-sugar',
    'caramel',
    'cream-cheese'
  ]))));

  const DOUGH_COMPARISON_ALIAS = Object.freeze({
    'baking-powder': 'baking-soda'
  });

  const BAKING_POWDER_RECORD = Object.freeze({
    id: 'baking-powder',
    displayName: 'بيكنج باودر',
    type: 'leavener',
    density: 0.95,
    otherSolidsFrac: 1.0,
    scienceMeta: {
      confidence: 'low',
      basis: 'process-derived-reference',
      summary: 'سجل داعم لمكوّن الرافعة في الصيغ التي تذكر بيكنج باودر صراحة.',
      referenceIds: ['acs_baking_soda'],
      variableFields: ['density'],
      notes: [
        'هذا السجل موجود فقط للحفاظ على الصيغ القديمة أو الحرة التي تذكر بيكنج باودر مباشرة.',
        'يُعامل هنا كعامل رفع فقط، لا كتركيبة تجارية كاملة أو بديل موثّق لبروتوكول الصودا.'
      ]
    }
  });

  const SWEETNESS_TARGETS = Object.freeze({
    low: 12,
    medium: 22,
    high: 32
  });

  const CALCULATION_AUDIT_REGISTRY = Object.freeze({
    'batch:volume': Object.freeze({
      id: 'batch:volume',
      title: 'سكيلنج العجين بالحجم',
      verdict: 'strong-operational',
      verdictLabel: 'تشغيلي قوي',
      confidence: 'medium-high',
      confidenceLabel: 'متوسطة-مرتفعة',
      use: 'مناسب عندما يكون القطر/الشكل/عدد الطبقات/السماكة هي نقطة البداية.',
      basis: [
        'يعتمد على هندسة المنتج ثم يحول الحجم إلى كتلة عبر الكثافة المخبوزة الفعالة.',
        'يحافظ على ربط السماكة والطبقات بالكتلة بدل توزيع المكونات بشكل أعمى.'
      ],
      limits: [
        'يتأثر مباشرة بصحة الكثافة المخبوزة والـ bake yield المستخدمين.',
        'لا يرى أخطاء الفرد الفعلي أو الفاقد العملي إذا انحرفت الدفعة عن الافتراضات.'
      ]
    }),
    'batch:manualBall': Object.freeze({
      id: 'batch:manualBall',
      title: 'سكيلنج العجين بوزن الكرة',
      verdict: 'operational',
      verdictLabel: 'تشغيلي مباشر',
      confidence: 'medium',
      confidenceLabel: 'متوسطة',
      use: 'مناسب عندما يعمل الشيف بوزن كرة مستهدف ثم يريد معرفة السماكة المتوقعة.',
      basis: [
        'يحترم كتلة الكرة كمدخل تشغيل أساسي.',
        'يربط وزن الكرة بالتقدير النهائي للسماكة بدل تركها حدساً محضاً.'
      ],
      limits: [
        'السماكة هنا ناتجة عن التقدير لا عن قياس مباشر للفرد الفعلي.',
        'إذا كان القص أو الهدر الفعلي أعلى من المتوقع فالناتج سيبدو أدق مما هو عليه.'
      ]
    }),
    'batch:flourBasis': Object.freeze({
      id: 'batch:flourBasis',
      title: 'سكيلنج العجين على أساس وزن الدقيق',
      verdict: 'operational',
      verdictLabel: 'تشغيلي محافظ',
      confidence: 'medium',
      confidenceLabel: 'متوسطة',
      use: 'مفيد عندما يريد المستخدم الانطلاق من أساس وصفي مألوف مثل 500غ دقيق.',
      basis: [
        'يحافظ على نسب الوصفة ثم يعيد بناء الكتلة من وزن دقيق مستهدف.',
        'يبقي الوصفة قريبة من مرجعها الأصلي عند التوسيع أو التصغير.'
      ],
      limits: [
        'لا يضمن وحده أن السماكة/القطر النهائيين سيطابقان الهدف ما لم تبق بقية الافتراضات صحيحة.',
        'أقل مباشرة من وضع الحجم عندما تكون مواصفات المنتج النهائية هي الأولوية.'
      ]
    }),
    'filling': Object.freeze({
      id: 'filling',
      title: 'سكيلنج الحشو والكثافة',
      verdict: 'estimated-operational',
      verdictLabel: 'تقديري مضبوط',
      confidence: 'medium',
      confidenceLabel: 'متوسطة',
      use: 'يعطي صافي الحشو المطلوب على الكيكة، ثم يترجمه إلى تحضير خام وكتلة قابلة للاستخدام بعد الـ yield والهدر.',
      basis: [
        'يربط الفراغات الهندسية بالكثافة التشغيلية والـ yield.',
        'يحافظ على فكرة أن الحشو نظام فيزيائي لا مجرد قائمة مكونات.'
      ],
      limits: [
        'الكثافة والـ yield في الحشو تقديريان أكثر من العجين.',
        'نتيجة الخفق والبرودة والتهوية الفعلية قد تغير الأداء أكثر من الحساب الاسمي.'
      ]
    }),
    'tempering': Object.freeze({
      id: 'tempering',
      title: 'اتزان التمبرنج',
      verdict: 'strong-operational',
      verdictLabel: 'تشغيلي قوي',
      confidence: 'medium-high',
      confidenceLabel: 'متوسطة-مرتفعة',
      use: 'يستخدم لاتخاذ قرار الدفعات الآمنة وخفض خطر تخثر البيض.',
      basis: [
        'يعتمد على اتزان حراري بسعات حرارية مختلفة للبيض والطور الساخن.',
        'يحسب سلامة الدفعات المرحلية ويعطي حلولاً عملية لخفض الخطر.'
      ],
      limits: [
        'لا يحسب الفقد الحراري الفعلي للقدر والهواء والزمن بين الدفعات.',
        'لا يرى أثر الخفق أو بطء الإضافة أو حرارة الوعاء نفسه.'
      ]
    }),
    'sweetness': Object.freeze({
      id: 'sweetness',
      title: 'تحليل الحلاوة والتوازن',
      verdict: 'guided-estimate',
      verdictLabel: 'تقدير موجّه',
      confidence: 'medium-low',
      confidenceLabel: 'متوسطة-منخفضة',
      use: 'مفيد لاتخاذ قرار خفض/رفع الحلاوة عندما يُقرأ الهدف الحسي مع قيود النظام البنيوية، لا كمؤشر سكر فقط.',
      basis: [
        'يعتمد على sweetness equivalence كهدف حسي تقريبي، ثم يضيف قيوداً مختلفة للعجين والحشو.',
        'العجين يُراجع مقابل بنية الملف المرجعي، والحشو يُراجع مقابل solids/water والكثافة/العائلة المرجعية.'
      ],
      limits: [
        'الحلاوة الحسية النهائية ليست مساوية دائماً للمكافئ العددي، ولا لهذا النموذج أن يدعي prediction كامل للمذاق.',
        'قيود البنية هنا guard rails تشغيلية لا قياسات rheology أو sensory panel كاملة.'
      ]
    }),
    'dough-audit': Object.freeze({
      id: 'dough-audit',
      title: 'تدقيق بنية العجين',
      verdict: 'guided-operational',
      verdictLabel: 'تشخيص موجّه',
      confidence: 'medium',
      confidenceLabel: 'متوسطة',
      use: 'يرصد انحرافات العجين مقارنة بمرجع dough system بدل الاكتفاء بالحدس.',
      basis: [
        'يقرأ نسباً مثل الماء/الدقيق والسكر/الدقيق والكثافة المخبوزة الفعالة.',
        'يعطي إشارات مبكرة للمسارات المعرضة للجفاف أو الثقل.'
      ],
      limits: [
        'ليس نموذج rheology كامل عبر جميع مراحل العجين.',
        'نتيجته تشخيصية داعمة وليست بديلاً عن العلامات الحسية والفرد الفعلي.'
      ]
    }),
    'moisture-profile': Object.freeze({
      id: 'moisture-profile',
      title: 'تفصيل الماء الكلي في الوصفة',
      verdict: 'strong-operational',
      verdictLabel: 'حساب حفظ كتلة مشروط بالتغطية',
      confidence: 'medium-high',
      confidenceLabel: 'متوسطة-مرتفعة',
      use: 'يبيّن نسبة الماء الكلي من كتلة الوصفة ومصادر هذا الماء مرتبة تنازلياً.',
      basis: [
        'يعتمد على كسور الماء المرجعية في سجلات المكونات مع اشتراط تغطية لا تقل عن 90%.',
        'يميز الماء الكلي كنسبة من الكتلة عن نسبة الرطوبة على أساس الدقيق (hydrationPct).'
      ],
      limits: [
        'يحسب ماء الصيغة الخام ولا يتنبأ وحده بالفقد التبخيري أثناء الطهي أو الخبز.',
        'تتوقف دقته على تطابق المكون الفعلي مع السجل المرجعي في قاعدة البيانات.'
      ]
    }),
    'hydration-load': Object.freeze({
      id: 'hydration-load',
      title: 'حمل الترطيب على المواد الجافة للطبقات',
      verdict: 'estimated-operational',
      verdictLabel: 'تقدير هندسي محدود',
      confidence: 'medium',
      confidenceLabel: 'متوسطة',
      use: 'يقيس جرامات ماء الحشو الداخلي لكل 100 غ مواد جافة في الطبقات، مع فصل السطح والجوانب.',
      basis: [
        'ينسب ماء الحشو الداخلي إلى المواد الجافة في صيغة الطبقات الصافية (NET_FOR_LAYERS).',
        'يفصل تغليف السطح والجوانب لأن مساهمتهما في تطرية قلب الطبقات مختلفة عن الحشو البيني.'
      ],
      limits: [
        'يعتمد على كثافة الحشو التصميمية وسماكات الفرد والتغليف المقدرة.',
        'لا يحسب سرعة انتشار الرطوبة مع الزمن ولا بديلاً عن مراقبة النضج الفعلي في الثلاجة.'
      ]
    }),
    'strained-calibration': Object.freeze({
      id: 'strained-calibration',
      title: 'معايرة تصفية الساور كريم بقياس المطبخ',
      verdict: 'strong-operational',
      verdictLabel: 'مقاس من المستخدم (USER_MEASURED)',
      confidence: 'high',
      confidenceLabel: 'مرتفعة (ضمن افتراض فصل الماء)',
      use: 'يستبدل العائد المفترض (82% أو 88%) بالعائد الفعلي المقاس قبل التصفية وبعدها.',
      basis: [
        'يحسب العائد والوزن المفقود من قياسين وزنيين مباشرين.',
        'يعيد حساب كسور التركيب على اتفاقية المشروع بأن المفقود مصل مائي صافٍ.'
      ],
      limits: [
        'يفترض أن المصل المفقود ماء خالص (يتجاهل بقايا اللاكتوز وبروتينات المصل الذائبة).',
        'تبقى الكثافة التشغيلية من قالب 82 أو 88 ما لم تقَس الكثافة مباشرة.'
      ]
    }),
    'first-layer-calibration': Object.freeze({
      id: 'first-layer-calibration',
      title: 'معايرة أول طبقة مخبوزة بقياس المطبخ',
      verdict: 'strong-operational',
      verdictLabel: 'مقاس من المستخدم (USER_MEASURED)',
      confidence: 'high',
      confidenceLabel: 'مرتفعة (ضمن سياق الوصفة وسماكة الفرد)',
      use: 'يغذي الكثافة المخبوزة وعائد الخبز الفعليين في حساب الطبقات المتبقية ضمن السياق نفسه.',
      basis: [
        'يحسب الكثافة من وزن الطبقة المخبوزة ومساحة القالب ومتوسط نقاط السماكة.',
        'يحسب عائد الخبز كفقد كتلة كلي (مخبوز / خام) ويبطل تطبيقه تلقائيًا عند تغير الوصفة أو سماكة الفرد أو نسب المكونات.'
      ],
      limits: [
        'الفرق الوزني بين الخام والمخبوز فقد كتلة كلي وليس فقد رطوبة خالصًا.',
        'الرطوبة النهائية المعروضة من النموذج تبقى تقديرًا ولا تُقاس بالوزن وحده.'
      ]
    }),
    'sweetness-bounded': Object.freeze({
      id: 'sweetness-bounded',
      title: 'حلّال الحلاوة المقيّد للمتجهين الوظيفيين',
      verdict: 'guided-operational',
      verdictLabel: 'مربعات صغرى مقيّدة حتمية (خلف مفتاح اختياري)',
      confidence: 'high',
      confidenceLabel: 'مرتفعة حسابيًا (تنتظر قرار المالك بشأن السلوك الافتراضي)',
      use: 'يحل معامل السكريات القابلة للضبط وكتلة الألبان المضافة معًا ضمن حدود السياسة بدل القصّ بعد الحل.',
      basis: [
        'تعداد كامل لأنماط القيود النشطة (9 أنماط لمتغيرين) مع حل مباشر للأنظمة المربعة غير المنفردة.',
        'يمنح أولوية لقيد الحلاوة (LEX_WEIGHT_RATIO = 1e8) عند اصطدام حل 2×2 بحدود المعامل أو سقف الألبان.'
      ],
      limits: [
        'عند خفض الحلاوة يمنع القيد d >= 0 إنقاص القاعدة اللبنية، فيظهر انجراف أصيل في نسبة الصلب/الماء.',
        'لا يضيف قيد دهن مستقل ولا يقسّم المحليات المركبة مثل الدولسي والعسل (القرار D2).'
      ]
    }),
    'aqueous-aw': Object.freeze({
      id: 'aqueous-aw',
      title: 'تقدير النشاط المائي للطور المائي السكري (Norrish)',
      verdict: 'estimated-operational',
      verdictLabel: 'للمقارنة النسبية فقط، لا للصلاحية',
      confidence: 'medium',
      confidenceLabel: 'متوسطة (تقدير طور مائي مثالي مقيد بالتركيب)',
      use: 'يقارن مدى ارتباط الماء بالسكريات المذابة في الطور المائي للحشو بعد التصفية.',
      basis: [
        'معادلة Norrish (1966) متعددة المذابات بثوابت FAO الأربعة وثابت الفركتوز الموثق من Chirife et al. (1980) K=2.15.',
        'يحصر أي سكر غير مصنّف بين حدّي السكر السداسي (K=2.25) والثنائي كالمالتوز (K=4.54) بدل افتراضه سكروزًا.'
      ],
      limits: [
        'لا يدخل الأملاح ولا البروتينات ولا الأحماض ولا الدهون في الحساب، ولا يصلح لتقدير صلاحية ميكروبية أو مدة حفظ.',
        'مجال الصلاحية الأدنى AW_VALIDITY_MIN معلّق لقرار المالك دون قصّ القيم المحسوبة.'
      ]
    })
  });

  function getCalculationAudit(id, context = {}) {
    if (!id) return null;
    if (id === 'batch') {
      const mode = context?.scaleMode || 'volume';
      return CALCULATION_AUDIT_REGISTRY[`batch:${mode}`] || CALCULATION_AUDIT_REGISTRY['batch:volume'];
    }
    return CALCULATION_AUDIT_REGISTRY[id] || null;
  }

  function listCalculationAudits(ids = [], context = {}) {
    return listify(ids).map(id => getCalculationAudit(id, context)).filter(Boolean);
  }

  function finiteNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === '') return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function hasExplicitFiniteNumber(value) {
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
  }

  function round(value, digits = 1) {
    if (!Number.isFinite(value)) return null;
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function listify(value) {
    return Array.isArray(value) ? value : [];
  }

  function resolveWeight(entry) {
    if (!entry || typeof entry !== 'object') return 0;
    if (Number.isFinite(entry.weight)) return Number(entry.weight);
    if (Number.isFinite(entry.totalWeight)) return Number(entry.totalWeight);
    if (Number.isFinite(entry.count) && Number.isFinite(entry.unitWeight)) {
      return Number(entry.count) * Number(entry.unitWeight);
    }
    return 0;
  }

  function getFillingsArray() {
    return global.FILLING_CATALOG && typeof global.FILLING_CATALOG === 'object'
      ? Object.values(global.FILLING_CATALOG)
      : [];
  }

  function findMasterFillingRecord(id) {
    const canonicalId = global.resolveFillingId?.(id) || id;
    return (global.getFillingRecord?.(canonicalId) || null) || getFillingsArray().find(item => item.id === canonicalId) || null;
  }

  function ensureRuntimeIngredient(id) {
    if (!id || IngredientsDB?.[id]) return;

    if (typeof ensureIngredientInDbById === 'function') {
      const ensured = ensureIngredientInDbById(id, IngredientsDB);
      if (ensured?.ok) return;
    }

    if (id === 'baking-powder' && typeof registerIngredient === 'function') {
      registerIngredient(IngredientsDB, BAKING_POWDER_RECORD);
    }
  }

  function ensureSupportIngredients() {
    ['salt', 'cocoa-powder', 'baking-powder'].forEach(ensureRuntimeIngredient);
  }

  function getDisplayName(ingredientId) {
    return getIngredient(IngredientsDB, ingredientId)?.displayName || ingredientId;
  }

  function normalizeIngredientRowBasis(input) {
    return input === 'filling' ? 'filling' : 'dough';
  }

  function getIngredientRowBasisMass(formula, basis) {
    if (!formula) return 0;
    if (basis === 'filling') {
      return finiteNumber(typeof formula.totalMass === 'function' ? formula.totalMass() : 0, 0);
    }
    const bakers = typeof formula.bakersPerc === 'function' ? formula.bakersPerc(IngredientsDB) : null;
    return finiteNumber(bakers?.flourMass, 0);
  }

  function getDisplayIngredientId(ingredientId, basis) {
    const canonicalId = String(ingredientId || '').trim();
    if (!canonicalId) return canonicalId;
    if (normalizeIngredientRowBasis(basis) === 'dough' && DOUGH_COMPARISON_ALIAS[canonicalId]) {
      return DOUGH_COMPARISON_ALIAS[canonicalId];
    }
    return canonicalId;
  }

  function buildIngredientRows(formula, options = {}) {
    const basis = normalizeIngredientRowBasis(options?.basis);
    const basisMass = getIngredientRowBasisMass(formula, basis);
    const grouped = new Map();

    listify(formula?.items)
      .filter(item => finiteNumber(item?.weight) > 0)
      .forEach(item => {
        const sourceIngredientId = String(item.ingredientId || '').trim();
        if (!sourceIngredientId) return;
        const displayIngredientId = getDisplayIngredientId(sourceIngredientId, basis);
        const existing = grouped.get(displayIngredientId) || {
          ingredientId: displayIngredientId,
          displayIngredientId,
          label: getDisplayName(displayIngredientId) || getDisplayName(sourceIngredientId),
          weight: 0,
          basis,
          unit: 'g',
          sourceIngredientIds: []
        };
        existing.weight += finiteNumber(item.weight, 0);
        if (!existing.sourceIngredientIds.includes(sourceIngredientId)) {
          existing.sourceIngredientIds.push(sourceIngredientId);
        }
        grouped.set(displayIngredientId, existing);
      });

    return Array.from(grouped.values())
      .map(row => Object.assign({}, row, {
        weight: round(row.weight, 1),
        pct: basisMass > 0 ? round((row.weight / basisMass) * 100, 1) : 0
      }))
      .sort((left, right) => String(left.label).localeCompare(String(right.label), 'ar'));
  }

  function formulaToObjectRows(formula, options = {}) {
    return Object.fromEntries(buildIngredientRows(formula, options).map(row => [row.label, row.weight]));
  }

  function findClosestDoughSourceId(profile, formula) {
    const ids = new Set(listify(formula?.items).filter(item => finiteNumber(item.weight) > 0).map(item => item.ingredientId));
    if (ids.has('honey') && ids.has('butter') && ids.has('eggs') && ids.has('baking-soda')) {
      return 'classic_cooked_honey_soda_medovik';
    }
    if (profile?.sourceDoughId) return profile.sourceDoughId;
    return null;
  }

  function buildRecipeFormula(recipeProfile) {
    ensureSupportIngredients();
    if (!recipeProfile) return new Formula([]);

    const items = [];
    Object.entries(recipeProfile.ingredients || {}).forEach(([key, entry]) => {
      const ingredientId = RECIPE_INGREDIENT_ID_MAP[key];
      if (!ingredientId) return;
      ensureRuntimeIngredient(ingredientId);
      const weight = resolveWeight(entry);
      if (weight > 0) {
        items.push({
          ingredientId,
          weight
        });
      }
    });

    const formula = new Formula(items, {
      sourceRecipeId: recipeProfile.id || null,
      sourceDoughId: recipeProfile.id || null,
      sourceProcessFamily: recipeProfile.processFamily || null,
      sourceShapingFamily: recipeProfile.shapingFamily || null,
      massBasis: global.MEDOVIK_MASS_BASIS?.SOURCE_FORMULA || 'SOURCE_FORMULA'
    });
    return formula;
  }

  function buildFillingFormula(fillingProfile) {
    ensureSupportIngredients();
    if (!fillingProfile) return new Formula([]);

    const canonicalId = global.resolveFillingId?.(fillingProfile.id) || fillingProfile.id || null;
    const masterRecord = global.getFillingRecord?.(canonicalId) || findMasterFillingRecord(canonicalId) || null;
    const items = [];

    if (Array.isArray(masterRecord?.base) && masterRecord.base.length) {
      masterRecord.base.forEach(part => {
        const ingredientId = part?.key;
        const weight = resolveWeight(part);
        if (!ingredientId || weight <= 0) return;
        ensureRuntimeIngredient(ingredientId);
        items.push({ ingredientId, weight });
      });
    } else {
      Object.entries(fillingProfile.ingredients || {}).forEach(([key, entry]) => {
        const ingredientId = FILLING_INGREDIENT_ID_MAP[key];
        if (!ingredientId) return;
        ensureRuntimeIngredient(ingredientId);
        const weight = resolveWeight(entry);
        if (weight > 0) items.push({ ingredientId, weight });
      });
    }

    return new Formula(items, {
      sourceFillingId: canonicalId,
      processFillingId: canonicalId,
      designDensity: masterRecord?.designDensity || fillingProfile?.designDensity || null,
      designDensitySource: (masterRecord?.designDensity || fillingProfile?.designDensity) ? 'ENGINEERING_DEFAULT' : null,
      massBasis: global.MEDOVIK_MASS_BASIS?.SOURCE_FORMULA || 'SOURCE_FORMULA'
    });
  }

  function normalizeGeometryShape(shape) {
    const raw = String(shape || '').trim().toLowerCase();
    return raw === 'rect' || raw === 'rectangle' ? 'rect' : 'round';
  }

  function resolveFillingThicknessMm(config, shape, d1, d2, layers, doughThicknessMm) {
    const safeConfig = config || {};
    if (hasExplicitFiniteNumber(safeConfig.targetHeightCm)) {
      const targetHeightMm = Math.max(0, Number(safeConfig.targetHeightCm) * 10);
      const doughStackMm = Math.max(1, layers) * doughThicknessMm;
      const gaps = Math.max(0, layers - 1);
      if (gaps === 0) return 0;
      return Math.max(0, (targetHeightMm - doughStackMm) / gaps);
    }
    return finiteNumber(safeConfig.fillingThicknessMm, 3);
  }

  function createGeometry(config) {
    const normalized = global.normalizeProductSpec
      ? global.normalizeProductSpec(config || {}).value
      : (config || {});
    const shape = normalizeGeometryShape(normalized.shape);
    const d1 = finiteNumber(normalized.d1, 20);
    const d2 = shape === 'round' ? d1 : finiteNumber(normalized.d2, d1);
    const layers = Math.max(1, Math.round(finiteNumber(normalized.layers, 8)));
    const bakedThicknessMm = finiteNumber(normalized.targetBakedLayerThicknessMm, 2);
    const fillingThicknessMm = resolveFillingThicknessMm(normalized, shape, d1, d2, layers, bakedThicknessMm);
    return new ProductGeometry({
      ...normalized,
      shape,
      d1,
      d2,
      layers,
      rawSheetThicknessMm: finiteNumber(normalized.rawSheetThicknessMm, 1.5),
      targetBakedLayerThicknessMm: bakedThicknessMm,
      estimatedBakedLayerThicknessMm: finiteNumber(normalized.estimatedBakedLayerThicknessMm, bakedThicknessMm),
      fillingThicknessMm,
      topCoatThicknessMm: clamp(finiteNumber(normalized.topCoatThicknessMm, 2), 0, 30),
      sideCoatThicknessMm: clamp(finiteNumber(normalized.sideCoatThicknessMm, 2), 0, 30),
      wastePct: clamp(finiteNumber(normalized.wastePct, 10), 0, 50)
    });
  }

  function normalizeSweetnessSettings(input, explicitTarget = null) {
    if (input && typeof input === 'object' && !Array.isArray(input)) {
      return {
        adjustmentPct: finiteNumber(input.adjustmentPct ?? input.deltaPct, 0),
        target: ['filling', 'dough', 'both'].includes(input.target) ? input.target : (explicitTarget || 'filling')
      };
    }
    return {
      adjustmentPct: finiteNumber(input, 0),
      target: ['filling', 'dough', 'both'].includes(explicitTarget)
        ? explicitTarget
        : (global.AppState?.getSweetnessAdjustmentTarget?.() || 'filling')
    };
  }

  function formulaHasMaterialChange(baseFormula, candidateFormula, tolerance = 0.05) {
    if (!baseFormula || !candidateFormula) return false;
    const summarize = formula => {
      const map = new Map();
      (Array.isArray(formula?.items) ? formula.items : []).forEach(item => {
        const key = item?.ingredientId || `row-${map.size}`;
        map.set(key, finiteNumber(item?.weight, 0));
      });
      return map;
    };
    const base = summarize(baseFormula);
    const candidate = summarize(candidateFormula);
    const keys = new Set([...base.keys(), ...candidate.keys()]);
    for (const key of keys) {
      if (Math.abs((base.get(key) || 0) - (candidate.get(key) || 0)) > tolerance) return true;
    }
    return false;
  }

  function buildFormulaWithIndexedAdjustments(baseFormula, adjustableDistribution = [], factor = 1, dairyDistribution = [], addedDairyMass = 0) {
    const scaleByIndex = new Map();
    listify(adjustableDistribution).forEach(row => {
      const index = Number(row?.index);
      if (!Number.isInteger(index)) return;
      scaleByIndex.set(index, Number.isFinite(Number(factor)) ? Number(factor) : 1);
    });

    const addByIndex = new Map();
    if (Number.isFinite(Number(addedDairyMass)) && Number(addedDairyMass) > 0) {
      listify(dairyDistribution).forEach(row => {
        const index = Number(row?.index);
        const share = finiteNumber(row?.share, 0);
        if (!Number.isInteger(index) || share <= 0) return;
        addByIndex.set(index, Number(addedDairyMass) * share);
      });
    }

    return new Formula(
      listify(baseFormula?.items).map((item, index) => ({
        ingredientId: item.ingredientId,
        weight: Math.max(0, (finiteNumber(item.weight, 0) * (scaleByIndex.get(index) ?? 1)) + (addByIndex.get(index) ?? 0))
      })),
      {
        sourceFillingId: baseFormula?.sourceFillingId || null,
        processFillingId: baseFormula?.processFillingId || null,
        designDensity: baseFormula?.designDensity ?? null,
        sourceDoughId: baseFormula?.sourceDoughId || null
      }
    );
  }

  function applyExternalSweetnessPolicy(baseFormula, solverResult, strategy = 'keepSolidsWater', options = null) {
    const analysis = solverResult?.analysis || null;
    const states = analysis?.states || null;
    const factorBounds = options?.factorBounds || null;
    const hasFactorBounds = !!(
      factorBounds &&
      (hasExplicitFiniteNumber(factorBounds.min) || hasExplicitFiniteNumber(factorBounds.max))
    );
    const hasDairyCap = strategy === 'keepSolidsWater' && hasExplicitFiniteNumber(options?.compensationCapPct);
    const compositionState = states?.compositionFeasible || {};
    const compositionLimitationReason = analysis?.compositionLimitationReason || (analysis?.limitedByFixedSweetness ? 'fixed-sweetness-floor' : null);

    if (!analysis || !states) {
      return solverResult;
    }

    if (!hasFactorBounds && !hasDairyCap) {
      return {
        ...solverResult,
        analysis: {
          ...analysis,
          policyLimited: false,
          policyLimitationReason: null,
          limitationReason: compositionLimitationReason || null,
          states: {
            ...states,
            policyAuthorized: {
              ...compositionState,
              policyApplied: false,
              policyLimitationReason: null,
              compositionLimitationReason: compositionLimitationReason || null
            }
          }
        }
      };
    }

    const adjustableDistribution = listify(analysis.adjustableDistribution);
    if (!adjustableDistribution.length) {
      return {
        ...solverResult,
        analysis: {
          ...analysis,
          policyLimited: false,
          policyLimitationReason: null,
          limitationReason: compositionLimitationReason || null,
          states: {
            ...states,
            policyAuthorized: {
              ...compositionState,
              policyApplied: false,
              policyLimitationReason: null,
              compositionLimitationReason: compositionLimitationReason || null
            }
          }
        }
      };
    }

    const baseSweet = baseFormula?.sweetness?.(IngredientsDB) || { totalEq: 0 };
    const baseMass = finiteNumber(analysis.totalBaseMass, baseFormula?.totalMass?.() || 0);

    let factor = Number.isFinite(Number(compositionState.factor))
      ? Number(compositionState.factor)
      : finiteNumber(analysis.factor, 1);
    let addedDairyMass = strategy === 'keepSolidsWater'
      ? (Number.isFinite(Number(compositionState.addedDairyMass))
          ? Number(compositionState.addedDairyMass)
          : finiteNumber(analysis.addedDairyMass, 0))
      : 0;

    let policyLimited = false;
    let policyLimitationReason = null;

    if (hasFactorBounds && hasExplicitFiniteNumber(factorBounds.min) && factor < Number(factorBounds.min)) {
      factor = Number(factorBounds.min);
      policyLimited = true;
      policyLimitationReason = policyLimitationReason || 'factor-min';
    }
    if (hasFactorBounds && hasExplicitFiniteNumber(factorBounds.max) && factor > Number(factorBounds.max)) {
      factor = Number(factorBounds.max);
      policyLimited = true;
      policyLimitationReason = policyLimitationReason || 'factor-max';
    }

    if (hasDairyCap) {
      const capMass = baseMass * (Number(options.compensationCapPct) / 100);
      if (addedDairyMass > capMass) {
        addedDairyMass = capMass;
        policyLimited = true;
        policyLimitationReason = policyLimitationReason || 'dairy-cap';
      }
    }

    const nextFormula = buildFormulaWithIndexedAdjustments(
      baseFormula,
      adjustableDistribution,
      factor,
      strategy === 'keepSolidsWater' ? listify(analysis.dairyDistribution) : [],
      strategy === 'keepSolidsWater' ? addedDairyMass : 0
    );
    const nextSweet = nextFormula?.sweetness?.(IngredientsDB) || { totalEq: 0 };
    const nextAqueousSugar = nextFormula?.aqueousSugarIndex?.(IngredientsDB) || solverResult?.after?.brix || null;
    const nextSW = nextFormula?.solidsWaterRatio?.(IngredientsDB) || solverResult?.after?.solidsWater || null;
    const achievedPct = baseSweet.totalEq > 0 ? (((nextSweet.totalEq / baseSweet.totalEq) - 1) * 100) : 0;
    const noCompositionChange = !formulaHasMaterialChange(baseFormula, nextFormula);
    const policyState = {
      ...(states.policyAuthorized || {}),
      factor,
      achievedPct,
      policyApplied: policyLimited,
      limitationReason: policyLimitationReason || compositionLimitationReason || null,
      policyLimitationReason: policyLimitationReason || null,
      compositionLimitationReason: compositionLimitationReason || null
    };
    if (strategy === 'keepSolidsWater') {
      policyState.addedDairyMass = addedDairyMass;
      policyState.afterRatio = nextSW?.ratio ?? null;
    }

    return {
      ...solverResult,
      newFormula: nextFormula,
      note: solverResult?.note || null,
      analysis: {
        ...analysis,
        achievedTotalEq: nextSweet.totalEq,
        achievedPct,
        factor,
        addedDairyMass,
        limited: !!analysis.compositionLimited || policyLimited,
        compositionLimited: !!analysis.compositionLimited,
        policyLimited,
        compositionLimitationReason: compositionLimitationReason || null,
        policyLimitationReason: policyLimitationReason || null,
        limitationReason: policyLimitationReason || compositionLimitationReason || null,
        noCompositionChange,
        noCompositionChangeReason: noCompositionChange
          ? (analysis.noCompositionChangeReason || (policyLimited ? 'policy-bounded-no-op' : 'no-op'))
          : null,
        afterRatio: nextSW?.ratio ?? analysis.afterRatio ?? null,
        states: {
          ...states,
          policyAuthorized: policyState
        }
      },
      after: {
        ...(solverResult?.after || {}),
        sweetness: nextSweet,
        brix: nextAqueousSugar,
        solidsWater: nextSW
      }
    };
  }

  function applySweetnessAdjustment(formula, deltaPct, strategy = 'keepSolidsWater', options = null) {
    const adjustment = finiteNumber(deltaPct, 0);
    if (!formula || adjustment === 0) {
      return {
        formula,
        note: null,
        analysis: null,
        adjusted: false,
        compositionChanged: false
      };
    }

    const solverResult = adjustSweetnessWithBalance({
      formula,
      ingredientsDB: IngredientsDB,
      deltaPct: adjustment,
      strategy,
      options
    });
    const result = applyExternalSweetnessPolicy(formula, solverResult, strategy, options);

    const candidateFormula = result?.newFormula || formula.clone();
    const compositionChanged = formulaHasMaterialChange(formula, candidateFormula);
    const adjustedFormula = compositionChanged ? candidateFormula : formula;
    if (compositionChanged) {
      const preservedDesignDensity = adjustedFormula?.designDensity ?? formula?.designDensity ?? null;
      if (typeof adjustedFormula.clearFillingMeta === 'function') {
        adjustedFormula.clearFillingMeta({ preserveProcess: true });
        if (preservedDesignDensity != null && adjustedFormula.designDensity == null) {
          adjustedFormula.designDensity = preservedDesignDensity;
          adjustedFormula.densityConfidenceAdjusted = true;
        }
      }
    }

    const analysis = result?.analysis
      ? { ...result.analysis, compositionChanged }
      : (compositionChanged ? null : { compositionChanged: false, noCompositionChange: true });

    return {
      formula: adjustedFormula,
      note: result?.note || (compositionChanged ? null : 'لم يجد النموذج مكوناً قابلاً للتعديل داخل هذه الصيغة بالاستراتيجية الحالية.'),
      analysis,
      adjusted: compositionChanged,
      compositionChanged
    };
  }


  function safeDiv(numerator, denominator) {
    const n = finiteNumber(numerator, 0);
    const d = finiteNumber(denominator, 0);
    return d > 0 ? (n / d) : 0;
  }

  function pctDelta(before, after) {
    const b = finiteNumber(before, 0);
    const a = finiteNumber(after, 0);
    if (Math.abs(b) < 1e-9) return a === 0 ? 0 : null;
    return ((a - b) / b) * 100;
  }

  function deriveSweetnessCompanionMetrics(formula) {
    if (!formula) {
      return {
        eqPer100Water: null,
        fatPct: null,
        aqueousSweetenerPct: null
      };
    }
    const sweet = formula.sweetness?.(IngredientsDB) || { totalEq: 0 };
    const breakdown = formula.breakdown?.(IngredientsDB) || { waterMass: 0, fatMass: 0 };
    const totalMass = formula.totalMass?.() || 0;
    const waterMass = finiteNumber(breakdown.waterMass, 0);
    const fatMass = finiteNumber(breakdown.fatMass, 0);
    const totalEq = finiteNumber(sweet.totalEq, 0);
    return {
      eqPer100Water: waterMass > 0 ? (totalEq / waterMass) * 100 : null,
      fatPct: totalMass > 0 ? (fatMass / totalMass) * 100 : null,
      aqueousSweetenerPct: (totalEq + waterMass) > 0 ? (totalEq / (totalEq + waterMass)) * 100 : null
    };
  }

  function statusLabel(status) {
    if (status === 'controlled') return 'متحكم';
    if (status === 'watch') return 'راقب';
    if (status === 'risk') return 'مرتفع الخطر';
    return 'غير نشط';
  }

  function scoreLevel(score) {
    if (!Number.isFinite(score)) return 'unknown';
    if (score >= 0.82) return 'controlled';
    if (score >= 0.62) return 'watch';
    return 'risk';
  }

  function buildChangedIngredientRows(baseFormula, adjustedFormula) {
    const baseMap = new Map(listify(baseFormula?.items).map(item => [item.ingredientId, finiteNumber(item.weight, 0)]));
    const nextMap = new Map(listify(adjustedFormula?.items).map(item => [item.ingredientId, finiteNumber(item.weight, 0)]));
    const ids = new Set([...baseMap.keys(), ...nextMap.keys()]);
    return [...ids]
      .map(id => {
        const before = baseMap.get(id) || 0;
        const after = nextMap.get(id) || 0;
        const delta = after - before;
        return {
          ingredientId: id,
          label: getDisplayName(id),
          before: round(before, 1),
          after: round(after, 1),
          delta: round(delta, 1),
          deltaPct: round(pctDelta(before, after) ?? 0, 1)
        };
      })
      .filter(row => Math.abs(row.delta) >= 0.1)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }

  function buildGuardRail(label, status, detail) {
    return { label, status, statusLabel: statusLabel(status), detail };
  }

  function sweetnessTargetLabel(target) {
    return target === 'dough' ? 'العجين فقط' : (target === 'both' ? 'العجين والحشو' : 'الحشو فقط');
  }

  function summarizeRequestedShift(requestedPct, achievedPct) {
    const requested = finiteNumber(requestedPct, 0);
    const achieved = finiteNumber(achievedPct, 0);
    if (requested === 0) return 'لا يوجد طلب تغيير حلاوة في هذه الدفعة.';
    const direction = requested < 0 ? 'خفض' : 'رفع';
    const magnitude = Math.abs(achieved);
    const label = magnitude < 8 ? 'تغير خفيف' : (magnitude < 18 ? 'تغير متوسط' : 'تغير قوي');
    return `الطلب الحالي هو ${direction} الحلاوة، والنتيجة المحققة تقريباً تشير إلى ${label} (${Math.abs(achieved).toFixed(1)}٪).`;
  }

  function buildDoughSweetnessModel(context) {
    const active = context?.sweetnessPlan?.target === 'dough' || context?.sweetnessPlan?.target === 'both';
    const baseFormula = context?.baseDoughFormula || null;
    const adjustedFormula = context?.doughFormula || baseFormula;
    const baseProfile = context?.doughProfile || inferCurrentDoughProfile(baseFormula, IngredientsDB) || null;
    const baseAudit = baseFormula ? auditDoughSystem(baseFormula, IngredientsDB, context?.config || null, baseProfile) : null;
    const afterAudit = adjustedFormula ? auditDoughSystem(adjustedFormula, IngredientsDB, context?.config || null, baseProfile) : null;
    const beforeSweet = baseFormula?.sweetness?.(IngredientsDB) || { equivPer100: 0, totalEq: 0 };
    const afterSweet = adjustedFormula?.sweetness?.(IngredientsDB) || beforeSweet;
    const beforeSW = baseFormula?.solidsWaterRatio?.(IngredientsDB) || { ratio: 0 };
    const afterSW = adjustedFormula?.solidsWaterRatio?.(IngredientsDB) || beforeSW;
    const beforeBakers = baseFormula?.bakersPerc?.(IngredientsDB) || null;
    const afterBakers = adjustedFormula?.bakersPerc?.(IngredientsDB) || beforeBakers;
    const analysis = context?.doughAdjustment?.analysis || null;
    const changes = buildChangedIngredientRows(baseFormula, adjustedFormula);
    const requestedPct = finiteNumber(context?.sweetnessPlan?.adjustmentPct, 0);
    const achievedPct = finiteNumber(analysis?.achievedPct, 0);
    const swDriftPct = pctDelta(beforeSW?.ratio, afterSW?.ratio);
    const sugarPctDrift = finiteNumber(afterBakers?.sugarPct, 0) - finiteNumber(beforeBakers?.sugarPct, 0);
    const honeyDrift = pctDelta(baseAudit?.metrics?.honeyOnFlour, afterAudit?.metrics?.honeyOnFlour);

    const guardRails = [];
    if (active) {
      guardRails.push(buildGuardRail(
        'تحقيق هدف الحلاوة',
        Math.abs(Math.abs(requestedPct) - Math.abs(achievedPct)) <= 4 ? 'controlled' : (Math.abs(Math.abs(requestedPct) - Math.abs(achievedPct)) <= 10 ? 'watch' : 'risk'),
        `الطلب ${requestedPct > 0 ? '+' : ''}${requestedPct.toFixed(0)}٪، والمحقق تقريباً ${achievedPct > 0 ? '+' : ''}${achievedPct.toFixed(1)}٪.`
      ));
      guardRails.push(buildGuardRail(
        'اتساق العجين مع الملف المرجعي',
        scoreLevel(afterAudit?.score),
        afterAudit?.summary || 'لا توجد معايرة مرجعية كافية.'
      ));
      guardRails.push(buildGuardRail(
        'انجراف المواد الصلبة/الماء',
        Math.abs(swDriftPct ?? 0) <= 8 ? 'controlled' : (Math.abs(swDriftPct ?? 0) <= 16 ? 'watch' : 'risk'),
        `نسبة solids/water انتقلت من ${round(beforeSW?.ratio, 2)} إلى ${round(afterSW?.ratio, 2)}.`
      ));
      const sugarPctRelativeDrift = pctDelta(beforeBakers?.sugarPct, afterBakers?.sugarPct);
      guardRails.push(buildGuardRail(
        'سكر/دقيق',
        Math.abs(sugarPctRelativeDrift ?? 0) <= 12 ? 'controlled' : (Math.abs(sugarPctRelativeDrift ?? 0) <= 22 ? 'watch' : 'risk'),
        `سكر/دقيق انتقل من ${round(beforeBakers?.sugarPct, 1)}٪ إلى ${round(afterBakers?.sugarPct, 1)}٪.`
      ));
      const crystalRisk = requestedPct < 0
        ? ((Math.abs(sugarPctRelativeDrift ?? 0) <= 10 && Math.abs(honeyDrift ?? 0) <= 10 && Math.abs(swDriftPct ?? 0) <= 8) ? 'controlled' : ((Math.abs(sugarPctRelativeDrift ?? 0) <= 18 && Math.abs(honeyDrift ?? 0) <= 18 && Math.abs(swDriftPct ?? 0) <= 14) ? 'watch' : 'risk'))
        : 'controlled';
      guardRails.push(buildGuardRail(
        'خطر التبلور/الفرد',
        crystalRisk,
        requestedPct < 0
          ? `يُقرأ عبر خفض sugar-on-flour (${round(sugarPctRelativeDrift ?? 0, 1)}٪) والعسل (${round(honeyDrift ?? 0, 1)}٪) وانجراف solids/water.`
          : 'رفع الحلاوة هنا لا يزيد خطر التبلور بنفس الدرجة، لكن القوام واللون ما زالا يحتاجان قراءة تشغيلية.'
      ));
    }

    const warnings = [];
    if (active && Math.abs(requestedPct) > 20) warnings.push('طلب تعديل الحلاوة في العجين كبير نسبيًا؛ راقب الفرد واللون والخبز بدل افتراض أن الحساب وحده يحافظ على السلوك نفسه.');
    if (active && analysis?.limitedByFixedSweetness) warnings.push('جزء من الحلاوة في العجين ثابت داخل مكونات غير مناسبة للخفض المباشر؛ لذلك قد لا يتحقق الهدف العددي بالكامل.');
    if (active && Number.isFinite(swDriftPct) && Math.abs(swDriftPct) > 12) warnings.push('انجراف solids/water في العجين صار كبيرًا بما يكفي ليتجاوز مجرد فرق حلاوة؛ هذا قد يغيّر الفرد أو الجفاف النسبي.');
    if (active && Number.isFinite(honeyDrift) && requestedPct < 0 && honeyDrift < -18) warnings.push('خفض العسل مع السكر قد يغير سلوك القاعدة السكرية والليونة أكثر مما يوحي به رقم الحلاوة وحده.');
    if (active && Number.isFinite(baseAudit?.score) && Number.isFinite(afterAudit?.score) && afterAudit.score < baseAudit.score - 0.08) warnings.push('خفض الحلاوة دفع العجين بعيدًا بصورة ملحوظة عن الملف المرجعي مقارنةً بالنسخة الأصلية.');

    const overall = !active
      ? 'inactive'
      : guardRails.some(rail => rail.status === 'risk')
        ? 'risk'
        : guardRails.some(rail => rail.status === 'watch')
          ? 'watch'
          : 'controlled';

    return {
      kind: 'dough',
      active,
      strategy: 'hybrid-dough',
      strategyLabel: 'هدف حسي + قيود عجين مرجعية',
      summary: !active
        ? 'لم يُطلب تعديل حلاوة العجين في هذه الدفعة.'
        : `${summarizeRequestedShift(requestedPct, achievedPct)} ${afterAudit?.summary || ''}`.trim(),
      modelNote: active
        ? 'العجين يُعدّل عبر sweeteners القابلة للضبط فقط، ثم يُراجع مقابل بنية العجين المرجعية بدل تعويضه تلقائيًا بالماء أو اللبن.'
        : null,
      before: {
        sweetnessEqPer100: round(beforeSweet?.equivPer100, 1),
        solidsWaterRatio: round(beforeSW?.ratio, 2),
        sugarPctOnFlour: round(beforeBakers?.sugarPct, 1),
        honeyOnFlour: round((baseAudit?.metrics?.honeyOnFlour || 0) * 100, 1),
        auditScore: round((baseAudit?.score || 0) * 100, 0)
      },
      after: {
        sweetnessEqPer100: round(afterSweet?.equivPer100, 1),
        solidsWaterRatio: round(afterSW?.ratio, 2),
        sugarPctOnFlour: round(afterBakers?.sugarPct, 1),
        honeyOnFlour: round((afterAudit?.metrics?.honeyOnFlour || 0) * 100, 1),
        auditScore: round((afterAudit?.score || 0) * 100, 0)
      },
      requestedPct: round(requestedPct, 1),
      achievedPct: round(achievedPct, 1),
      guardRails,
      warnings,
      changedIngredients: changes,
      note: context?.doughAdjustment?.note || null,
      overall,
      overallLabel: statusLabel(overall),
      confidence: afterAudit?.calibrationConfidence || 'medium',
      activeSources: changes.map(row => row.label),
      rangeStates: analysis?.states || null,
      limitationReason: analysis?.limitationReason || null,
      compositionLimitationReason: analysis?.compositionLimitationReason || null,
      policyLimitationReason: analysis?.policyLimitationReason || null
    };
  }

  function buildFillingSweetnessModel(context) {
    const active = context?.sweetnessPlan?.target === 'filling' || context?.sweetnessPlan?.target === 'both';
    const baseFormula = context?.baseFillingFormula || null;
    const adjustedFormula = context?.fillingFormula || baseFormula;
    const familyId = context?.fillingSweetnessPolicy?.familyId || inferFillingFamily(context);
    const policy = context?.fillingSweetnessPolicy || getFillingSweetnessPolicy(familyId, context?.fillingProfile || null, baseFormula, context?.masterFilling || null);
    const designDensity = context?.masterFilling?.designDensity || context?.baseFillingFormula?.designDensity || null;
    const baseAudit = baseFormula ? auditFillingAgainstMasterProfile(baseFormula, IngredientsDB, context?.masterFillingProfile || null, designDensity) : null;
    const afterAudit = adjustedFormula ? auditFillingAgainstMasterProfile(adjustedFormula, IngredientsDB, context?.masterFillingProfile || null, null) : null;
    const beforeSweet = baseFormula?.sweetness?.(IngredientsDB) || { equivPer100: 0, totalEq: 0 };
    const afterSweet = adjustedFormula?.sweetness?.(IngredientsDB) || beforeSweet;
    const beforeSW = baseFormula?.solidsWaterRatio?.(IngredientsDB) || { ratio: 0 };
    const afterSW = adjustedFormula?.solidsWaterRatio?.(IngredientsDB) || beforeSW;
    const beforeBreakdown = baseFormula?.breakdown?.(IngredientsDB) || null;
    const afterBreakdown = adjustedFormula?.breakdown?.(IngredientsDB) || null;
    const beforeCompanion = deriveSweetnessCompanionMetrics(baseFormula);
    const afterCompanion = deriveSweetnessCompanionMetrics(adjustedFormula);
    const analysis = context?.fillingAdjustment?.analysis || null;
    const changes = buildChangedIngredientRows(baseFormula, adjustedFormula);
    const requestedPct = finiteNumber(context?.sweetnessPlan?.adjustmentPct, 0);
    const achievedPct = finiteNumber(analysis?.achievedPct, 0);
    const densityBefore = baseAudit?.densityAudit?.usedDensity ?? null;
    const densityAfter = afterAudit?.densityAudit?.usedDensity ?? null;
    const swDriftPct = pctDelta(beforeSW?.ratio, afterSW?.ratio);
    const densityDriftPct = pctDelta(densityBefore, densityAfter);
    const baseMass = baseFormula?.totalMass?.() || 0;
    const addedDairyMass = finiteNumber(analysis?.addedDairyMass, 0);
    const addedDairyPct = baseMass > 0 ? (addedDairyMass / baseMass) * 100 : 0;
    const fatDriftPct = pctDelta(beforeBreakdown?.fatMass, afterBreakdown?.fatMass);
    const requestGap = Math.abs(Math.abs(requestedPct) - Math.abs(achievedPct));

    const guardRails = [];
    if (active) {
      guardRails.push(buildGuardRail(
        'تحقيق هدف الحلاوة',
        requestGap <= policy.requestGap.controlled ? 'controlled' : (requestGap <= policy.requestGap.watch ? 'watch' : 'risk'),
        `الطلب ${requestedPct > 0 ? '+' : ''}${requestedPct.toFixed(0)}٪، والمحقق تقريباً ${achievedPct > 0 ? '+' : ''}${achievedPct.toFixed(1)}٪.`
      ));
      guardRails.push(buildGuardRail(
        'تثبيت solids/water',
        Math.abs(swDriftPct ?? 0) <= policy.solidsWaterDrift.controlled ? 'controlled' : (Math.abs(swDriftPct ?? 0) <= policy.solidsWaterDrift.watch ? 'watch' : 'risk'),
        `نسبة solids/water انتقلت من ${round(beforeSW?.ratio, 2)} إلى ${round(afterSW?.ratio, 2)}.`
      ));
      if (Number.isFinite(densityBefore) && Number.isFinite(densityAfter)) {
        guardRails.push(buildGuardRail(
          'ثبات الكثافة التشغيلية',
          Math.abs(densityDriftPct ?? 0) <= policy.densityDrift.controlled ? 'controlled' : (Math.abs(densityDriftPct ?? 0) <= policy.densityDrift.watch ? 'watch' : 'risk'),
          `الكثافة التشغيلية انتقلت من ${round(densityBefore, 3)} إلى ${round(densityAfter, 3)}.`
        ));
      }
      guardRails.push(buildGuardRail(
        'ملاءمة العائلة المرجعية',
        Number.isFinite(afterAudit?.score) ? (afterAudit.score >= policy.score.controlled ? 'controlled' : (afterAudit.score >= policy.score.watch ? 'watch' : 'risk')) : 'unknown',
        afterAudit?.summary || 'لا توجد معايرة مرجعية كافية لهذه الحشوة.'
      ));
      if (analysis?.mode === 'keepSolidsWater') {
        guardRails.push(buildGuardRail(
          'حجم التعويض البنيوي',
          addedDairyPct <= policy.addedDairyPct.controlled ? 'controlled' : (addedDairyPct <= policy.addedDairyPct.watch ? 'watch' : 'risk'),
          addedDairyMass > 0
            ? `احتاج النموذج إلى تعويض لبني بنحو ${round(addedDairyMass, 1)} جم (${round(addedDairyPct, 1)}٪ من الكتلة الأساسية).`
            : 'لم يحتج التعديل إلى تعويض لبني صريح.'
        ));
      }
      if (familyId === 'butter-condensed') {
        guardRails.push(buildGuardRail(
          'ثبات الطابع المرجعي الكثيف',
          Math.abs(fatDriftPct ?? 0) <= 8 ? 'controlled' : (Math.abs(fatDriftPct ?? 0) <= 16 ? 'watch' : 'risk'),
          `دهون الحشو انتقلت من ${round(beforeBreakdown?.fatMass, 1)} إلى ${round(afterBreakdown?.fatMass, 1)} جم.`
        ));
      }
      if (familyId === 'dulce-sourcream') {
        const dulceConstraintDetail = analysis?.policyLimitationReason
          ? 'جزء من الحلاوة في هذه العائلة ثابت داخل الدولسي، لذلك دخلت policy لتمنع تعديلًا يخرج الحشو عن حدوده التشغيلية.'
          : ((analysis?.compositionLimitationReason && Math.abs(swDriftPct ?? 0) > policy.solidsWaterDrift.controlled)
              ? 'جزء من الحلاوة في هذه العائلة ثابت داخل الدولسي، لكن القيد الحقيقي هنا بنيوي: الإنجاز العددي ممكن، بينما القراءة الأهم هي انجراف solids/water وثبات القوام.'
              : 'جزء من الحلاوة في هذه العائلة ثابت داخل الدولسي، لكن التخفيض الحالي تحقق بدون clamp policy؛ ما يزال المطلوب قراءة القوام مع الرقم لا الرقم وحده.');
        guardRails.push(buildGuardRail(
          'قيد الحلاوة الثابتة في الدولسي',
          analysis?.policyLimitationReason || requestGap > policy.requestGap.watch
            ? 'risk'
            : (((analysis?.compositionLimitationReason && Math.abs(swDriftPct ?? 0) > policy.solidsWaterDrift.controlled) || requestGap > policy.requestGap.controlled)
                ? 'watch'
                : 'controlled'),
          dulceConstraintDetail
        ));
      }
    }

    const warnings = [];
    listify(policy.notes).forEach(note => warnings.push(note));
    if (active && analysis?.fallback) warnings.push('تعذر الحفاظ الكامل على التوازن البنيوي لهذه الحشوة بهذه الاستراتيجية؛ لذلك عاد النظام إلى ضبط أبسط أو جزئي.');
    if (active && analysis?.policyLimitationReason) warnings.push('الوصول الرياضي الخام كان غير عملي للحشو؛ فُرضت قيود لمنع حل غير قابل للتنفيذ أو تعويض مبالغ فيه.');
    if (active && !analysis?.policyLimitationReason && analysis?.compositionLimitationReason === 'negative-dairy') warnings.push('لا يوجد clamp policy على هذه النتيجة؛ الحد الحالي جاء من أن الحل التركيبي لم يحتج تعويضًا لبنيًا موجبًا، لذلك تُقرأ النتيجة مع solids/water والقوام الفعلي.');
    if (active && addedDairyPct > policy.addedDairyPct.watch) warnings.push('التعويض البنيوي المطلوب كبير نسبيًا لهذه العائلة؛ راقب القوام الحقيقي بدل اعتماد الرقم فقط.');
    if (active && familyId === 'whipped-dairy' && Math.abs(densityDriftPct ?? 0) > policy.densityDrift.controlled) warnings.push('في الحشوات المخفوقة حتى الانجرافات الصغيرة في الكثافة قد تغيّر الإحساس والثبات بسرعة.');
    if (active && familyId === 'butter-condensed' && policy.strategy === 'sugarOnly' && Math.abs(requestedPct) > 15) warnings.push('خفض الحلاوة بقوة في الزبدة + الحليب المكثف قد يتطلب variant مختلفاً، لا تعديل سكر بسيطاً فقط.');
    if (active && Number.isFinite(baseAudit?.score) && Number.isFinite(afterAudit?.score) && afterAudit.score < baseAudit.score - 0.08) warnings.push('خفض/رفع الحلاوة أبعد الحشو عن العائلة المرجعية مقارنةً بالصيغة الأصلية.');

    const overall = !active
      ? 'inactive'
      : guardRails.some(rail => rail.status === 'risk')
        ? 'risk'
        : guardRails.some(rail => rail.status === 'watch')
          ? 'watch'
          : 'controlled';

    return {
      kind: 'filling',
      active,
      familyId,
      familyLabel: policy.familyLabel,
      profileLabel: policy.profileLabel || null,
      strategy: policy.strategy === 'sugarOnly' ? 'hybrid-filling-sugar-first' : 'hybrid-filling-balance-first',
      strategyLabel: policy.strategy === 'sugarOnly' ? 'هدف حسي + ضبط السكريات القابلة للتعديل أولاً' : 'هدف حسي + تثبيت بنية الحشو',
      familyRuleSummary: policy.ruleSummary,
      sweetnessElements: listify(policy.sweetnessElements),
      summary: !active
        ? 'لم يُطلب تعديل حلاوة الحشو في هذه الدفعة.'
        : `${summarizeRequestedShift(requestedPct, achievedPct)} ${afterAudit?.summary || ''}`.trim(),
      modelNote: active
        ? `${policy.familyLabel}: ${policy.ruleSummary}`
        : null,
      before: {
        sweetnessEqPer100: round(beforeSweet?.equivPer100, 1),
        solidsWaterRatio: round(beforeSW?.ratio, 2),
        usedDensity: round(densityBefore, 3),
        auditScore: round((baseAudit?.score || 0) * 100, 0),
        eqPer100Water: round(beforeCompanion.eqPer100Water, 1),
        fatPct: round(beforeCompanion.fatPct, 1),
        aqueousSweetenerPct: round(beforeCompanion.aqueousSweetenerPct, 1)
      },
      after: {
        sweetnessEqPer100: round(afterSweet?.equivPer100, 1),
        solidsWaterRatio: round(afterSW?.ratio, 2),
        usedDensity: round(densityAfter, 3),
        auditScore: round((afterAudit?.score || 0) * 100, 0),
        eqPer100Water: round(afterCompanion.eqPer100Water, 1),
        fatPct: round(afterCompanion.fatPct, 1),
        aqueousSweetenerPct: round(afterCompanion.aqueousSweetenerPct, 1)
      },
      requestedPct: round(requestedPct, 1),
      achievedPct: round(achievedPct, 1),
      guardRails,
      warnings,
      changedIngredients: changes,
      note: context?.fillingAdjustment?.note || null,
      overall,
      overallLabel: statusLabel(overall),
      confidence: afterAudit?.confidence || 'medium',
      activeSources: changes.map(row => row.label),
      adjustableElementIds: listify(analysis?.adjustableElementIds),
      fixedSweetNames: listify(analysis?.fixedSweetNames),
      adjustableNames: listify(analysis?.adjustableNames),
      compensationElementIds: listify(analysis?.compensationElementIds),
      compensationNames: listify(analysis?.compensationNames),
      noCompositionChange: !!analysis?.noCompositionChange,
      noCompositionChangeReason: analysis?.noCompositionChangeReason || null,
      profileRationale: policy.rationale || null,
      addedDairyMass: round(addedDairyMass, 1),
      addedDairyPct: round(addedDairyPct, 1),
      rangeStates: analysis?.states || null,
      limitationReason: analysis?.limitationReason || null,
      compositionLimitationReason: analysis?.compositionLimitationReason || null,
      policyLimitationReason: analysis?.policyLimitationReason || null
    };
  }

  function buildSweetnessModel(context) {
    const dough = buildDoughSweetnessModel(context);
    const filling = buildFillingSweetnessModel(context);
    const activeSystems = [dough, filling].filter(system => system.active);
    const warnings = activeSystems.flatMap(system => system.warnings || []);
    const overall = !activeSystems.length
      ? 'inactive'
      : activeSystems.some(system => system.overall === 'risk')
        ? 'risk'
        : activeSystems.some(system => system.overall === 'watch')
          ? 'watch'
          : 'controlled';
    return {
      target: context?.sweetnessPlan?.target || 'filling',
      targetLabel: sweetnessTargetLabel(context?.sweetnessPlan?.target || 'filling'),
      adjustmentPct: finiteNumber(context?.sweetnessPlan?.adjustmentPct, 0),
      summary: !activeSystems.length
        ? 'لا يوجد تعديل حلاوة مطبق في هذه الدفعة.'
        : overall === 'controlled'
          ? 'التعديل الحالي قريب من هدف الحلاوة مع بقاء البنية ضمن guard rails عملية.'
          : overall === 'watch'
            ? 'التعديل الحالي ممكن، لكنه يحتاج قراءة تشغيلية واعية لأن بعض القيود البنيوية بدأت تنحرف.'
            : 'التعديل الحالي يدفع النظام خارج guard rails مريحة؛ لا تعتمد الرقم وحده بوصفه تعديلًا آمنًا.' ,
      overall,
      overallLabel: statusLabel(overall),
      confidence: activeSystems.every(system => system.confidence === 'high') ? 'high' : (activeSystems.some(system => system.confidence === 'low') ? 'low' : 'medium'),
      systems: { dough, filling },
      warnings,
      explanation: [
        'الحلاوة هنا هدف حسي تقريبي مبني على sweetness equivalence، لا prediction مطلق للمذاق النهائي.',
        'العجين والحشو لا يُعدلان بنفس القانون؛ لكل واحد قيود بنيوية مختلفة، والحشو يقرأ أيضاً عبر عائلته المرجعية عندما تتوفر.',
        'إذا خرجت القيود البنيوية عن النطاق، فالأولوية تُعطى للسلامة التشغيلية لا لتحقيق الرقم المطلوب بالكامل.'
      ]
    };
  }



  const FILLING_SWEETNESS_PROFILE_OVERRIDES = Object.freeze({
    classic_sourcream_frosting: Object.freeze({
      profileLabel: 'كلاسيك ساور كريم + كريمة',
      strategy: 'keepSolidsWater',
      adjustableIngredientIds: ['powdered-sugar'],
      compensationIngredientIds: ['sour-cream', 'whipping-cream'],
      factorBounds: { min: 0.35, max: 1.60 },
      compensationCapPct: null,
      sweetnessElements: ['السكر البودرة = عنصر الحلاوة القابل للخفض/الرفع الأساسي', 'القاعدة اللبنية الباردة = عنصر تعويض بنيوي عند الحاجة لا عنصر حلاوة مباشر'],
      rationale: 'السكر البودرة هو الرافع الحسي المباشر هنا؛ خفضه ثم تعويض القوام لبنياً هو الأقرب لروح الوصفة.'
    }),
    ayahabib: Object.freeze({
      profileLabel: 'آية حبيب - ساور كريم مخفوق',
      strategy: 'keepSolidsWater',
      adjustableIngredientIds: ['powdered-sugar'],
      compensationIngredientIds: ['sour-cream', 'whipping-cream'],
      factorBounds: { min: 0.40, max: 1.55 },
      compensationCapPct: null,
      sweetnessElements: ['السكر البودرة = رافعة الحلاوة الأساسية', 'الكريمة/الساور كريم = تعويض قوامي بارد عند الحاجة'],
      rationale: 'الحشو المخفوق أقل تسامحاً مع التعويض الكبير، لذلك يبقى الخفض أولاً في السكر البودرة.'
    }),
    shouqi_2: Object.freeze({
      profileLabel: 'شوقي 2 - ألبان + سكر بودرة',
      strategy: 'keepSolidsWater',
      adjustableIngredientIds: ['powdered-sugar'],
      compensationIngredientIds: ['sour-cream', 'whipping-cream'],
      factorBounds: { min: 0.40, max: 1.50 },
      compensationCapPct: null,
      sweetnessElements: ['السكر البودرة = عنصر التعديل الأول', 'القسم اللبني = تعويض قوامي فقط'],
      rationale: 'هذه الوصفة من أنظف الأنظمة لتعديل الحلاوة لأن السكر البودرة منفصل وواضح.'
    }),
    hiba: Object.freeze({
      profileLabel: 'هبة - عسل لبني',
      strategy: 'sugarOnly',
      adjustableIngredientIds: ['honey'],
      compensationIngredientIds: ['sour-cream', 'whipping-cream'],
      factorBounds: null,
      compensationCapPct: null,
      sweetnessElements: ['العسل = عنصر الحلاوة القابل للتعديل ولكن بحذر', 'القسم اللبني = مرجع بنيوي لا عنصر حلاوة بديل'],
      rationale: 'العسل يغيّر الحلاوة والرطوبة والنكهة معاً، لذلك يسمح له بمدى أضيق من السكر البودرة.'
    }),
    classic_dulce_sourcream: Object.freeze({
      profileLabel: 'دولسي + ساور كريم',
      strategy: 'keepSolidsWater',
      adjustableIngredientIds: ['dulce-de-leche'],
      compensationIngredientIds: ['sour-cream'],
      factorBounds: null,
      compensationCapPct: null,
      sweetnessElements: ['الدولسي = حامل الحلاوة الرئيس لكنه أيضاً حامل ماء ومواد صلبة لبنية', 'الساور كريم = عنصر معادلة القوام عند خفض محدود فقط'],
      rationale: 'الدولسي ليس سكراً فقط؛ يُخفض بمدى محدود مع قبول أن الوصول العددي الكامل قد لا يتحقق.'
    }),
    shouqi_1: Object.freeze({
      profileLabel: 'شوقي 1 - كراميل + ألبان',
      strategy: 'keepSolidsWater',
      adjustableIngredientIds: ['caramel'],
      compensationIngredientIds: ['sour-cream', 'whipping-cream'],
      factorBounds: null,
      compensationCapPct: null,
      sweetnessElements: ['الكراميل = حامل الحلاوة والطابع النكهـي', 'القسم اللبني = تعويض محدود عند الحاجة'],
      rationale: 'خفض الكراميل ممكن لكن بمدى محدود لأن دوره نكهياً وبنيوياً أكبر من مجرد سكر حر.'
    }),
    shouqi_3: Object.freeze({
      profileLabel: 'شوقي 3 - حليب مكثف + زبدة + جبنة',
      strategy: 'sugarOnly',
      adjustableIngredientIds: ['condensed-milk'],
      compensationIngredientIds: ['cream-cheese'],
      factorBounds: null,
      compensationCapPct: 6,
      sweetnessElements: ['الحليب المكثف = عنصر الحلاوة الأساسي لكنه حامل بنيوي قوي', 'الجبنة الكريمية = عنصر تلطيف/تعديل محدود'],
      rationale: 'خفض الحليب المكثف مباشرة يغيّر القوام بقوة، لذلك يسمح بمدى ضيق ويُعامل كنظام مقيد.'
    }),
    younis_cream1: Object.freeze({
      profileLabel: 'يونس 1 - زبدة + جبنة + سكر بودرة',
      strategy: 'keepSolidsWater',
      adjustableIngredientIds: ['powdered-sugar'],
      compensationIngredientIds: ['cream-cheese'],
      factorBounds: { min: 0.45, max: 1.50 },
      compensationCapPct: null,
      sweetnessElements: ['السكر البودرة = عنصر الحلاوة المباشر', 'الجبنة الكريمية = مرجع قوامي محدود'],
      rationale: 'خفض السكر البودرة هو المسار الأنظف هنا قبل أي عبث بنسبة الجبنة أو الزبدة.'
    }),
    younis_cream2: Object.freeze({
      profileLabel: 'يونس 2 - دولسي + زبدة + جبنة',
      strategy: 'sugarOnly',
      adjustableIngredientIds: ['dulce-de-leche'],
      compensationIngredientIds: ['cream-cheese'],
      factorBounds: null,
      compensationCapPct: 6,
      sweetnessElements: ['الدولسي = حامل الحلاوة الرئيس', 'الجبنة الكريمية = تعديل قوامي محدود فقط'],
      rationale: 'هذه العائلة تحتاج خفضاً محدوداً في الدولسي مع قبول أن الخفض الكبير يعني variant مختلفاً.'
    })
  });

  function inferFillingFamilyForSweetness(fillingProfile, formula = null) {
    const canonicalId = String(global.resolveFillingId?.(fillingProfile?.id) || fillingProfile?.id || '').toLowerCase();
    const haystack = `${canonicalId} ${fillingProfile?.name || ''} ${fillingProfile?.description || ''}`.toLowerCase();
    const hasSourCream = hasIngredient(formula, 'sour-cream');
    const hasWhippingCream = hasIngredient(formula, 'whipping-cream');
    const hasDulce = hasIngredient(formula, 'dulce-de-leche');
    const hasCondensedMilk = hasIngredient(formula, 'condensed-milk');
    const hasButter = hasIngredient(formula, 'butter');

    if (canonicalId === 'ayahabib' || /ayahabib|whipp|mous|chantilly|one-bowl/.test(haystack) || hasWhippingCream) return 'whipped-dairy';
    if (canonicalId === 'classic_dulce_sourcream' || (hasSourCream && hasDulce) || /dulce|caramel|toffee/.test(haystack)) return 'dulce-sourcream';
    if (/shouqi/.test(canonicalId) || (hasCondensedMilk && hasButter)) return 'butter-condensed';
    if (canonicalId === 'classic_sourcream_frosting' || hasSourCream) return 'classic-sourcream';
    return 'generic-reference';
  }

  function getFillingSweetnessProfile(fillingProfile, formula = null, masterFilling = null) {
    const canonicalId = String(global.resolveFillingId?.(fillingProfile?.id) || fillingProfile?.id || masterFilling?.id || '').trim();
    const override = FILLING_SWEETNESS_PROFILE_OVERRIDES[canonicalId] || null;
    const masterPolicy = masterFilling?.profile?.sweetnessPolicy || fillingProfile?.profile?.sweetnessPolicy || null;
    return {
      id: canonicalId || 'generic',
      profileLabel: override?.profileLabel || (fillingProfile?.name || masterFilling?.name || 'مرجعي عام'),
      strategy: override?.strategy || 'keepSolidsWater',
      adjustableIngredientIds: listify(override?.adjustableIngredientIds),
      compensationIngredientIds: listify(override?.compensationIngredientIds),
      fixedSweetnessIngredientIds: listify(override?.fixedSweetnessIngredientIds),
      factorBounds: override?.factorBounds || null,
      compensationCapPct: hasExplicitFiniteNumber(override?.compensationCapPct) ? Number(override.compensationCapPct) : null,
      sweetnessElements: listify(override?.sweetnessElements),
      rationale: override?.rationale || masterPolicy || null,
      policyText: masterPolicy || null
    };
  }

  function getFillingSweetnessPolicy(familyId, fillingProfile = null, formula = null, masterFilling = null) {
    const profile = getFillingSweetnessProfile(fillingProfile, formula, masterFilling);
    const base = {
      familyId,
      familyLabel: 'مرجعي عام',
      strategy: profile.strategy || 'keepSolidsWater',
      ruleSummary: profile.rationale || 'يُقرأ الهدف الحسي مع تثبيت solids/water قدر الإمكان، من غير الادعاء بأن الحلاوة الحسية النهائية متنبأ بها بالكامل.',
      requestGap: { controlled: 4, watch: 10 },
      solidsWaterDrift: { controlled: 6, watch: 12 },
      densityDrift: { controlled: 8, watch: 15 },
      score: { controlled: 0.82, watch: 0.62 },
      addedDairyPct: { controlled: 12, watch: 22 },
      notes: [],
      profileId: profile.id,
      profileLabel: profile.profileLabel,
      sweetnessElements: profile.sweetnessElements,
      adjustmentOptions: {
        adjustableIngredientIds: profile.adjustableIngredientIds,
        compensationIngredientIds: profile.compensationIngredientIds,
        fixedSweetnessIngredientIds: profile.fixedSweetnessIngredientIds,
        factorBounds: profile.factorBounds,
        compensationCapPct: profile.compensationCapPct
      }
    };

    if (familyId === 'classic-sourcream') {
      return {
        ...base,
        familyLabel: 'ساور كريم كلاسيكي',
        ruleSummary: 'في الساور كريم الكلاسيكي، خفض الحلاوة المقبول هو الذي لا يدفع القاعدة إلى رخاوة أو انهيار solids/water أكثر مما يحتمل الفرد بين الطبقات.',
        solidsWaterDrift: { controlled: 5, watch: 10 },
        densityDrift: { controlled: 7, watch: 12 },
        score: { controlled: 0.78, watch: 0.60 },
        addedDairyPct: { controlled: 10, watch: 18 },
        notes: ['لا تطارد خفض الحلاوة عبر تعويض لبني كبير؛ إذا احتاجت المعادلة ذلك فالحشو يقترب من رخاوة غير محبذة.']
      };
    }

    if (familyId === 'dulce-sourcream') {
      return {
        ...base,
        familyLabel: 'دولسي + ساور كريم',
        ruleSummary: 'هذه العائلة تحمل جزءاً ثابتاً من الحلاوة في الدولسي؛ لذلك لا يُقاس النجاح بكم خُفض السكر فقط، بل بمدى بقاء الحشو داخل العائلة المرجعية من دون إفراط في التخفيف اللبني.',
        requestGap: { controlled: 5, watch: 12 },
        solidsWaterDrift: { controlled: 5, watch: 10 },
        densityDrift: { controlled: 7, watch: 12 },
        score: { controlled: 0.76, watch: 0.58 },
        addedDairyPct: { controlled: 9, watch: 16 },
        notes: ['الحلاوة هنا مقيدة جزئياً بالدولسي؛ إذا اتسع الفرق بين المطلوب والمحقق فهذه إشارة بنيوية لا فشل عرض فقط.']
      };
    }

    if (familyId === 'whipped-dairy') {
      return {
        ...base,
        familyLabel: 'كريمة/ألبان مخفوقة',
        ruleSummary: 'في الحشوات المخفوقة، أي انجراف صغير في الكثافة أو التعويض اللبني قد يغير الإحساس والقوام بسرعة لأن الهواء جزء من البنية لا أثر جانبي.',
        solidsWaterDrift: { controlled: 4, watch: 8 },
        densityDrift: { controlled: 6, watch: 10 },
        score: { controlled: 0.80, watch: 0.64 },
        addedDairyPct: { controlled: 6, watch: 12 },
        notes: ['هذه العائلة أكثر حساسية من غيرها للتعويض اللبني؛ القبول الحسابي لا يغني عن قراءة القوام بعد الخفق.']
      };
    }

    if (familyId === 'butter-condensed') {
      return {
        ...base,
        familyLabel: 'زبدة + حليب مكثف',
        strategy: 'sugarOnly',
        ruleSummary: 'هذه العائلة لا يناسبها تعويض لبني تلقائي واسع؛ التعديل الأصدق فيها يبدأ من السكريات القابلة للضبط، مع قبول أن جزءاً من الحلاوة ثابت داخل الحليب المكثف أو القاعدة المركبة.',
        requestGap: { controlled: 4, watch: 9 },
        solidsWaterDrift: { controlled: 4, watch: 8 },
        densityDrift: { controlled: 6, watch: 10 },
        score: { controlled: 0.78, watch: 0.60 },
        addedDairyPct: { controlled: 0, watch: 4 },
        notes: ['إذا كان المطلوب خفضاً كبيراً للحلاوة في هذه العائلة فقد يكون الحل الحقيقي variant مختلفاً، لا slider فقط.']
      };
    }

    return base;
  }

  function buildRuntimeContext(config, recipeProfile, fillingProfile, adjustmentInput = 0, adjustmentTarget = null) {
    const recipeGeometryDefaults = recipeProfile?.layerGeometry || {};
    const geometry = createGeometry({ ...recipeGeometryDefaults, ...(config || {}), shapingFamily: recipeProfile?.shapingFamily || config?.shapingFamily || null });
    const sweetnessPlan = normalizeSweetnessSettings(adjustmentInput, adjustmentTarget);
    const fillingMode = global.AppState?.getFillingMode?.()
      || global.SessionManager?.current?.()?.fillingPlan?.mode
      || 'reference';
    const activeDoughFormula = global.AppState?.getActiveDoughFormula?.(recipeProfile)
      || global.AppState?.ensureLiveDoughFormula?.(recipeProfile)
      || buildRecipeFormula(recipeProfile);
    const activeFillingFormula = global.AppState?.getActiveFillingFormula?.(fillingProfile)
      || global.AppState?.ensureLiveFillingFormula?.(fillingProfile)
      || buildFillingFormula(fillingProfile);
    const baseDoughFormula = activeDoughFormula?.clone?.() || buildRecipeFormula(recipeProfile);
    const baseFillingFormula = activeFillingFormula?.clone?.() || buildFillingFormula(fillingProfile);
    const sourceFillingId = baseFillingFormula.sourceFillingId || baseFillingFormula.processFillingId || fillingProfile?.id || null;
    const masterFilling = sourceFillingId ? findMasterFillingRecord(sourceFillingId) : null;
    const fillingSweetnessFamilyId = inferFillingFamilyForSweetness(fillingProfile, baseFillingFormula);
    const fillingSweetnessPolicy = getFillingSweetnessPolicy(fillingSweetnessFamilyId, fillingProfile, baseFillingFormula, masterFilling);
    const doughAdjustment = (sweetnessPlan.target === 'dough' || sweetnessPlan.target === 'both')
      ? applySweetnessAdjustment(baseDoughFormula, sweetnessPlan.adjustmentPct, 'sugarOnly')
      : { formula: baseDoughFormula, note: null, analysis: null, adjusted: false };
    const fillingAdjustment = (sweetnessPlan.target === 'filling' || sweetnessPlan.target === 'both')
      ? applySweetnessAdjustment(baseFillingFormula, sweetnessPlan.adjustmentPct, fillingSweetnessPolicy.strategy, fillingSweetnessPolicy.adjustmentOptions)
      : { formula: baseFillingFormula, note: null, analysis: null, adjusted: false };
    const doughFormula = doughAdjustment.formula || baseDoughFormula;
    const runtimeFillingFormula = fillingAdjustment.formula || baseFillingFormula;
    const product = new Product({
      geometry,
      doughFormula,
      fillingFormula: runtimeFillingFormula
    });

    const doughProfile = inferCurrentDoughProfile(doughFormula, IngredientsDB) || null;
    const masterFillingProfile = masterFilling?.profile || (sourceFillingId ? getMasterFillingProfile(sourceFillingId) : null);
    const explicitDesignDensity = fillingAdjustment.adjusted
      ? null
      : (baseFillingFormula.designDensity || masterFilling?.designDensity || null);

    const baseScaleDoughOpts = {
      ingredientsDB: IngredientsDB,
      wastePct: geometry.wastePct,
      mode: geometry.scaleMode || 'volume',
      targetBallWeight: geometry.ballWeight,
      doughProfile,
      targetFlourWeight: geometry.targetFlourWeight,
      targetTotalDoughWeight: geometry.targetTotalDoughWeight,
      totalDoughMassBasis: geometry.totalDoughMassBasis,
      processFamily: recipeProfile?.processFamily || doughFormula?.sourceProcessFamily || null,
      shapingFamily: recipeProfile?.shapingFamily || doughFormula?.sourceShapingFamily || null
    };

    const bench = global.SessionStore?.getBench?.() || { strained: null, firstLayer: null, timers: [] };
    let benchDensity = null;
    let benchBakeYield = null;
    let benchNotice = {
      applied: false,
      reason: null,
      bakedDensity: null,
      modelDensity: null,
      bakeYield: null,
      modelBakeYield: null,
      ballWeight: null,
      modelBallWeight: null
    };

    if (bench.firstLayer && global.MedovikBench?.calibrateFirstBakedLayer && global.MedovikBench?.benchContextKey) {
      const doughRecipeId = String(
        recipeProfile?.sourceId || recipeProfile?.id || global.SessionStore?.getRecipeId?.() || ''
      );
      const currentKey = global.MedovikBench.benchContextKey({
        doughRecipeId,
        rawSheetThicknessMm: geometry.rawSheetThicknessMm,
        doughFormula
      });
      const cal = global.MedovikBench.calibrateFirstBakedLayer(bench.firstLayer);
      if (cal.ok && bench.firstLayer.context === currentKey) {
        benchDensity = cal.bakedDensity;
        benchBakeYield = cal.bakeYield;
      } else if (bench.firstLayer.context !== currentKey) {
        benchNotice = {
          applied: false,
          reason: 'context-mismatch',
          bakedDensity: cal.ok ? cal.bakedDensity : null,
          modelDensity: null,
          bakeYield: cal.ok ? cal.bakeYield : null,
          modelBakeYield: null,
          ballWeight: null,
          modelBallWeight: null
        };
      }
    }

    const dough = product.scaleDough({
      ...baseScaleDoughOpts,
      doughDensity: benchDensity,
      measuredBakeYield: benchBakeYield
    });

    if (geometry.scaleMode !== 'volume' && typeof dough.estimatedThicknessMm === 'number' && dough.estimatedThicknessMm > 0) {
      product.geometry.estimatedBakedLayerThicknessMm = dough.estimatedThicknessMm;
      geometry.estimatedBakedLayerThicknessMm = dough.estimatedThicknessMm;
    }

    if (benchDensity !== null && benchBakeYield !== null) {
      const modelDough = product.scaleDough(baseScaleDoughOpts);
      benchNotice = {
        applied: true,
        reason: null,
        bakedDensity: benchDensity,
        modelDensity: modelDough.usedBakedDensity ?? null,
        bakeYield: benchBakeYield,
        modelBakeYield: modelDough.bakeYield ?? null,
        ballWeight: dough.ballWeight ?? null,
        modelBallWeight: modelDough.ballWeight ?? null
      };
    }

    let measuredStrain = null;
    if (
      bench.strained &&
      global.MedovikBench?.calibrateStrainedSourCream &&
      global.MedovikBench?.registerMeasuredIngredient
    ) {
      const strainCal = global.MedovikBench.calibrateStrainedSourCream(bench.strained, IngredientsDB);
      if (strainCal.ok) {
        global.MedovikBench.registerMeasuredIngredient(IngredientsDB, strainCal.record);
        measuredStrain = {
          outputRatio: strainCal.outputRatio,
          ingredientId: strainCal.record.id
        };
      } else {
        global.MedovikBench?.unregisterMeasuredIngredient?.(IngredientsDB, 'sour-cream-strained-measured');
      }
    } else {
      global.MedovikBench?.unregisterMeasuredIngredient?.(IngredientsDB, 'sour-cream-strained-measured');
    }

    const filling = product.scaleFilling({
      ingredientsDB: IngredientsDB,
      designDensity: explicitDesignDensity,
      designDensitySource: explicitDesignDensity ? (baseFillingFormula.designDensitySource || 'ENGINEERING_DEFAULT') : null,
      profile: masterFillingProfile,
      measuredStrain
    });

    const sweetness = product.combinedSweetness({
      ingredientsDB: IngredientsDB,
      scaledDoughFormula: dough.scaledFormula,
      scaledFillingFormula: filling.scaledFormula
    });

    const structure = product.structureIndices(
      IngredientsDB,
      dough.scaledFormula,
      filling.scaledFormula
    );

    const fillingAudit = masterFillingProfile
      ? auditFillingAgainstMasterProfile(
          filling.scaledFormula,
          IngredientsDB,
          masterFillingProfile,
          explicitDesignDensity
        )
      : null;

    const fillingDecisionSupport = buildFillingDecisionSupport({
      config: geometry,
      recipeProfile,
      fillingProfile,
      fillingMode,
      sweetnessPlan,
      baseDoughFormula,
      doughFormula,
      doughAdjustment,
      fillingFormula: runtimeFillingFormula,
      baseFillingFormula,
      fillingAdjustment,
      doughProfile,
      masterFilling,
      masterFillingProfile,
      fillingSweetnessPolicy,
      product,
      dough,
      filling,
      sweetness,
      structure,
      fillingAudit
    });

    const sweetnessModel = buildSweetnessModel({
      config: geometry,
      sweetnessPlan,
      recipeProfile,
      fillingProfile,
      baseDoughFormula,
      doughFormula,
      doughAdjustment,
      baseFillingFormula,
      fillingFormula: runtimeFillingFormula,
      fillingAdjustment,
      doughProfile,
      masterFilling,
      masterFillingProfile,
      dough,
      filling,
      fillingAudit
    });

    return {
      config: geometry,
      recipeProfile,
      fillingProfile,
      sweetnessPlan,
      baseDoughFormula,
      doughFormula,
      doughAdjustment,
      fillingFormula: runtimeFillingFormula,
      baseFillingFormula,
      fillingAdjustment,
      doughProfile,
      masterFilling,
      masterFillingProfile,
      fillingSweetnessPolicy,
      product,
      dough,
      filling,
      sweetness,
      structure,
      fillingAudit,
      fillingDecisionSupport,
      sweetnessModel,
      benchNotice
    };
  }


  function hasIngredient(formula, ingredientId) {
    return listify(formula?.items).some(item => item?.ingredientId === ingredientId && finiteNumber(item?.weight) > 0);
  }

  function inferFillingFamily(context) {
    const filling = context?.masterFilling || context?.fillingProfile || {};
    const canonicalId = String(global.resolveFillingId?.(filling?.id) || filling?.id || '').toLowerCase();
    const haystack = `${canonicalId} ${filling?.name || ''} ${filling?.description || ''}`.toLowerCase();
    const formula = context?.baseFillingFormula || context?.fillingFormula || null;
    const hasSourCream = hasIngredient(formula, 'sour-cream');
    const hasWhippingCream = hasIngredient(formula, 'whipping-cream');
    const hasDulce = hasIngredient(formula, 'dulce-de-leche');
    const hasCondensedMilk = hasIngredient(formula, 'condensed-milk');
    const hasButter = hasIngredient(formula, 'butter');

    if (canonicalId === 'ayahabib' || /ayahabib|whipp|mous|chantilly|one-bowl/.test(haystack) || hasWhippingCream) {
      return 'whipped-dairy';
    }
    if (canonicalId === 'classic_dulce_sourcream' || (hasSourCream && hasDulce) || /dulce|caramel|toffee/.test(haystack)) {
      return 'dulce-sourcream';
    }
    if (/shouqi/.test(canonicalId) || (hasCondensedMilk && hasButter)) {
      return 'butter-condensed';
    }
    if (canonicalId === 'classic_sourcream_frosting' || hasSourCream) {
      return 'classic-sourcream';
    }
    return 'generic-reference';
  }

  function buildFillingDecisionSupport(context) {
    const familyId = inferFillingFamily(context);
    const support = {
      familyId,
      familyLabel: 'مرجعي عام',
      summary: 'استخدم هذا الحشو كمرجع تشغيل عام: ابنِ القوام تدريجيًا، وراقب القابلية للفرد بدل مطاردة أرقام زمنية أو حرارية غير موثقة.',
      targetTexture: 'قوام متجانس صالح للفرد بين الطبقات من دون سيلان مباشر أو تكتل واضح.',
      setupNotes: ['رتّب المكونات والوعاء قبل البدء حتى لا يتحول الحشو إلى خلط ارتجالي.', 'اقرأ القابلية للفرد بعد التوقف القصير، لا أثناء الحركة فقط.'],
      operationalWindows: [],
      watchpoints: ['التجانس أهم من السرعة.', 'إذا بدا القوام صحيحًا فقط تحت القص فاعتبره غير مستقر بعد.'],
      firstInterventions: ['برّد الحشو إذا أصبح لينًا أكثر من اللازم قبل الاستخدام.', 'عد إلى أسلوب الدمج والتبريد بدل زيادة الخفق عشوائيًا.'],
      stageFallbacks: [
        {
          title: 'تهيئة الحشو المرجعي',
          summary: 'ابدأ من قاعدة باردة نسبيًا ورتّب الإضافات قبل الخلط.',
          controls: [{ label: 'شرط البداية', text: 'قاعدة مستقرة ومكونات مرتبة' }],
          stopCues: ['القاعدة لا تسيل مباشرة، ويمكنها حمل الدمج التالي.'],
          failureSignals: ['سيولة مبكرة أو تكتل قبل اكتمال الدمج']
        },
        {
          title: 'بناء القوام القابل للفرد',
          summary: 'ادمج حتى يصبح الحشو متجانسًا وقابلًا للفرد، لا حتى يبدو أكثر سماكة فقط أثناء الحركة.',
          controls: [{ label: 'هدف القوام', text: 'متجانس وقابل للفرد بين الطبقات' }],
          stopCues: ['سطح أملس وتوزيع متقارب من دون انفصال.'],
          failureSignals: ['انفصال، رخاوة واضحة، أو خطوط كثيفة معزولة']
        }
      ]
    };

    if (familyId === 'classic-sourcream') {
      support.familyLabel = 'ساور كريم كلاسيكي';
      support.summary = 'هذا الحشو ينجح من صلاحية القاعدة نفسها: ابدأ بساور كريم بارد ومتماسك نسبيًا، واعتبر التجانس والقابلية للفرد أهم من مطاردة سماكة كاذبة تحت الخلط.';
      support.targetTexture = 'متجانس وأملس، يزداد تماسكه قليلًا بعد توقف الخلط ولا يبقى مائيًا صريحًا.';
      support.setupNotes = ['ابدأ بقاعدة باردة ومتماسكة نسبيًا؛ إذا كانت مائية بوضوح فبرّدها أو صفّها أولًا.', 'أضف السكر والفانيليا وادمج حتى يخف الإحساس الحبيبي الأساسي من دون خفق مطول.'];
      support.watchpoints = ['حبيبات سكر ظاهرة بعد الدمج الأولي.', 'سيولة واضحة بعد توقف الخلط القصير.', 'خروج مصل/شرش أو فقدان تماسك القاعدة.'];
      support.firstInterventions = ['إذا كانت القاعدة رخوة فبرّدها أو صفّها قبل متابعة الدمج.', 'إذا ظهر شرش أو انفصال فلا تعتمد على مزيد من الخفق كحل؛ أوقف الاستخدام وراجع صلاحية القاعدة.'];
      support.stageFallbacks = [
        {
          title: 'تهيئة قاعدة الساور كريم',
          summary: 'ابدأ بقاعدة باردة ومتماسكة نسبيًا؛ لا تبدأ من ساور كريم مائي على أمل أن يصلحه الخلط.',
          controls: [{ label: 'حالة القاعدة', text: 'باردة ومتماسكة نسبيًا' }],
          stopCues: ['القوام أقرب للفرد منه إلى السيلان.'],
          failureSignals: ['رخاوة مفرطة أو مصل ظاهر قبل الخلط']
        },
        {
          title: 'بناء الحشو الكلاسيكي',
          summary: 'ادمج حتى يختفي الإحساس الحبيبي الأساسي ويتكوّن حشو متجانس قابل للفرد بعد التوقف القصير.',
          controls: [{ label: 'المعيار', text: 'تجانس + تكاثف بسيط بعد التوقف' }],
          stopCues: ['سطح أملس وقوام متجانس غير مائي.'],
          failureSignals: ['حبيبات سكر ظاهرة، سيولة مفرطة، أو انفصال']
        }
      ];
    }

    if (familyId === 'dulce-sourcream') {
      support.familyLabel = 'دولسي + ساور كريم';
      support.summary = 'هذه العائلة أقل تسامحًا مع الإضافة العنيفة: الدولسي يُدخل سكرًا ودهنًا مرتفعين، لذلك يندمج على دفعات صغيرة فوق قاعدة لبنية باردة وناعمة.';
      support.targetTexture = 'لون موحد وقوام متماسك بلا خطوط كاراميل منفصلة أو جيوب كثيفة.';
      support.setupNotes = ['هيّئ القاعدة اللبنية أولًا حتى تصبح ناعمة وباردة وغير رخوة بوضوح.', 'أدخل الدولسي على دفعات صغيرة، واسمح لكل دفعة أن تختفي قبل التالية.'];
      support.watchpoints = ['خطوط لون واضحة لا تختفي.', 'جيوب كثيفة أو مناطق أثقل من بقية الحشو.', 'انفصال أو خطوط دهنية بعد الإضافة السريعة.'];
      support.firstInterventions = ['أوقف الإضافة إذا ظهرت خطوط دهنية، وارجع لدمج هادئ حتى يعود التجانس.', 'برّد الحشو قبل التجميع إذا بدا أثقل أو ألين من اللازم بعد اكتمال الدمج.'];
      support.stageFallbacks = [
        {
          title: 'تهيئة القاعدة قبل الدولسي',
          summary: 'ابدأ بقاعدة باردة وناعمة ومستعدة لاستقبال إضافة سكر/دهن عالية.',
          controls: [{ label: 'شرط البداية', text: 'قاعدة ملساء وغير رخوة بوضوح' }],
          stopCues: ['القاعدة تحمل الإضافة التالية بلا تكتلات مبكرة.'],
          failureSignals: ['رخاوة شديدة أو تكتل قبل الدمج']
        },
        {
          title: 'دمج الدولسي تدريجيًا',
          summary: 'أضف الدولسي على دفعات صغيرة مع دمج هادئ حتى يختفي الخط اللوني قبل متابعة الإضافة.',
          controls: [{ label: 'أسلوب الدمج', text: 'تدرج + دمج هادئ' }],
          stopCues: ['لون موحد وقوام متجانس صالح للفرد.'],
          failureSignals: ['انفصال، خطوط دهنية، أو جيوب كثيفة معزولة']
        }
      ];
    }

    if (familyId === 'whipped-dairy') {
      support.familyLabel = 'كريمة/ألبان مخفوقة';
      support.summary = 'هذه العائلة أكثر حساسية للحرارة والزمن: النجاح يبدأ من برودة المكونات والأدوات، ثم التوقف عند أول قوام موسي ثابت بدل مطاردة قمم حادة.';
      support.targetTexture = 'قوام موسي ثابت بقمم ناعمة إلى متوسطة، يلتصق بالوعاء ولا ينهار مباشرة.';
      support.setupNotes = ['برّد الكريمة والوعاء والمضرب قبل الخفق.', 'إذا كانت القاعدة اللبنية مائعة بوضوح فصفّها أولًا قبل إدخالها في الخفق.'];
      support.operationalWindows = [
        { label: 'حرارة الكريمة', range: { min: 2, max: 6 }, digits: 0, unit: '°م', hint: 'نافذة تشغيل مفيدة لهذه العائلة لا تُقرأ كضمان مطلق.' },
        { label: 'تبريد الأدوات', range: { min: 10, max: 15 }, digits: 0, unit: 'دقيقة', hint: 'خاصة في وعاء الوعاء الواحد.' },
        { label: 'تصفية القاعدة عند الحاجة', range: { min: 2, max: 3 }, digits: 0, unit: 'ساعة', hint: 'إذا كانت القاعدة أقرب للميوعة من الكثافة.' },
        { label: 'الدمج الأولي', range: { min: 30, max: 60 }, digits: 0, unit: 'ثانية', hint: 'على أقل سرعة فقط لتجميع المكونات.' },
        { label: 'الخفق الرئيسي', range: { min: 2, max: 4 }, digits: 0, unit: 'دقيقة', hint: 'أوقف عند أول قوام ثابت، لا بعده.' }
      ];
      support.watchpoints = ['دفء الوعاء أو المكونات أثناء الخفق.', 'قوام رخو لا يثبت بعد التوقف القصير.', 'مظهر حبيبي/زبدي أو قمم حادة مبالغ فيها.'];
      support.firstInterventions = ['إذا بدأت الحرارة ترتفع، أوقف الخفق وبرّد الوعاء بدل الاستمرار.', 'إذا ظهر مظهر زبدي أو حبيبي فاعتبر الحشو خارج القوام المرجعي ولا تطارد الإصلاح بخفق إضافي.'];
      support.stageFallbacks = [
        {
          title: 'تهيئة قاعدة باردة مستقرة',
          summary: 'برّد الكريمة والأدوات، وصفِّ القاعدة عند الحاجة قبل تشغيل الخفاق.',
          controls: [{ label: 'البرودة', text: 'مكونات وأدوات باردة بوضوح' }],
          stopCues: ['القاعدة كثيفة نسبيًا وليست أقرب لزبادي شرب.'],
          failureSignals: ['قاعدة رخوة قبل بدء الخفق']
        },
        {
          title: 'الخفق حتى القوام الموسي',
          summary: 'ابدأ ببطء ثم ارفع إلى متوسطة، وتوقف عند أول قمم ناعمة/متوسطة ثابتة.',
          controls: [{ label: 'هدف القوام', text: 'قمم ناعمة إلى متوسطة وقوام موسي ثابت' }],
          stopCues: ['القمة تنحني قليلًا ثم تثبت بدل أن تنهار فورًا.'],
          failureSignals: ['رخاوة مستمرة، مظهر زبدي حبيبي، أو over-whipping']
        }
      ];
    }

    if (familyId === 'butter-condensed') {
      support.familyLabel = 'زبدة + حليب مكثف/مرجعي كثيف';
      support.summary = 'هذه العائلة تعتمد أكثر على نعومة القاعدة وتدرج الدمج من اعتمادها على التهوية؛ اقرأ التجانس والثبات والقدرة على الفرد، لا حجم الخفق.';
      support.targetTexture = 'قوام ناعم متماسك، يثبت على الطبقات ولا يظهر فيه انفصال دهني أو جيوب كثيفة.';
      support.setupNotes = ['ابدأ من زبدة لينة/لدنة وليست مذابة، وقاعدة لبنية ناعمة غير باردة لدرجة التكتل.', 'أدخل العناصر الأثقل تدريجيًا إذا ظهرت فروق واضحة في الكثافة بين المكونات.'];
      support.watchpoints = ['تكتل دهني أو خطوط لامعة منفصلة.', 'مناطق كثيفة لا تندمج مع بقية الحشو.', 'قوام يلين بسرعة شديدة بعد الخلط.'];
      support.firstInterventions = ['إذا ظهر انفصال دهني فأوقف الخلط العنيف وارجع إلى دمج تدريجي أهدأ.', 'إذا صار الحشو لينًا أكثر من اللازم فبرّده قليلًا قبل الفرد بدل إضافة خفق جديد.'];
      support.stageFallbacks = [
        {
          title: 'تهيئة قاعدة الزبدة/اللبن',
          summary: 'ليّن القاعدة إلى نعومة قابلة للدمج من دون ذوبان أو رخاوة مفرطة.',
          controls: [{ label: 'حالة القاعدة', text: 'لينة/لدنة لا مذابة ولا متكتلة' }],
          stopCues: ['ملمس ناعم متجانس قبل الإضافات الثقيلة.'],
          failureSignals: ['تكتل دهني أو ذوبان واضح']
        },
        {
          title: 'بناء القوام المرجعي الكثيف',
          summary: 'ادمج تدريجيًا حتى يصبح الحشو ناعمًا ومتماسكًا وقابلًا للفرد من دون انفصال.',
          controls: [{ label: 'المعيار', text: 'تجانس + ثبات + قابلية للفرد' }],
          stopCues: ['قوام متقارب في الوعاء وعلى الطبقة.'],
          failureSignals: ['خطوط دهنية، جيوب ثقيلة، أو لين مفرط']
        }
      ];
    }

    const densityStatus = context?.fillingAudit?.checks?.usedDensity?.status || null;
    if (densityStatus === 'below') {
      support.watchpoints = ['الحشو أخف من المرجع وقد يفقد الثبات.', ...support.watchpoints];
      support.firstInterventions = ['برّد الحشو أكثر قبل الاستخدام إذا بدا أخف من المرجع.', ...support.firstInterventions];
    }
    if (densityStatus === 'above') {
      support.watchpoints = ['الحشو أثقل من المرجع وقد يثقل التجميع.', ...support.watchpoints];
      support.firstInterventions = ['راجع التهوية/الخفق أو شدة الدمج إذا بدا الحشو أثقل من المرجع.', ...support.firstInterventions];
    }
    if (context?.fillingAdjustment?.note) {
      support.setupNotes = [...support.setupNotes, context.fillingAdjustment.note];
    }

    return support;
  }

  function scoreBandSeverity(status) {
    if (status === 'within') return 'ok';
    if (status === 'below' || status === 'above') return 'warning';
    return 'info';
  }

  function deriveSweetnessRating(equivPer100) {
    if (!Number.isFinite(equivPer100)) {
      return { level: 'unknown', label: 'غير محسوبة', color: '#95a5a6' };
    }
    if (equivPer100 < SWEETNESS_TARGETS.low) {
      return { level: 'low', label: 'خفيفة', color: '#3498db' };
    }
    if (equivPer100 < SWEETNESS_TARGETS.medium) {
      return { level: 'balanced', label: 'متوازنة', color: '#27ae60' };
    }
    if (equivPer100 < SWEETNESS_TARGETS.high) {
      return { level: 'sweet', label: 'حلوة', color: '#f39c12' };
    }
    return { level: 'very-sweet', label: 'حلوة جدا', color: '#e74c3c' };
  }

  function getPrimarySweetnessSystem(context) {
    const target = context?.sweetnessPlan?.target || 'filling';
    if (target === 'dough') return context?.sweetnessModel?.systems?.dough || null;
    if (target === 'filling') return context?.sweetnessModel?.systems?.filling || null;
    return null;
  }

  function getPrimarySweetnessReading(context) {
    const system = getPrimarySweetnessSystem(context);
    const target = context?.sweetnessPlan?.target || 'filling';
    if (!system) {
      return {
        system: null,
        value: context?.sweetness?.equivPer100,
        ratingBasisValue: context?.sweetness?.equivPer100,
        unit: 'مكافئ/100جم',
        label: 'متوسط الكيكة',
        meterMax: 40
      };
    }
    if (target === 'dough' && Number.isFinite(system?.after?.sugarPctOnFlour)) {
      return {
        system,
        value: system.after.sugarPctOnFlour,
        ratingBasisValue: system?.after?.sweetnessEqPer100 ?? system.after.sugarPctOnFlour,
        unit: '% على الدقيق',
        label: 'سكر/دقيق في العجين المستهدف',
        meterMax: 60
      };
    }
    if (target === 'filling' && Number.isFinite(system?.after?.eqPer100Water)) {
      return {
        system,
        value: system.after.eqPer100Water,
        ratingBasisValue: system?.after?.sweetnessEqPer100 ?? system.after.eqPer100Water,
        unit: 'مكافئ/100جم ماء',
        label: 'Eq/Water للحشو المستهدف',
        meterMax: 80
      };
    }
    return {
      system,
      value: system?.after?.sweetnessEqPer100 ?? context?.sweetness?.equivPer100,
      ratingBasisValue: system?.after?.sweetnessEqPer100 ?? context?.sweetness?.equivPer100,
      unit: 'مكافئ/100جم',
      label: target === 'dough' ? 'حلاوة العجين المستهدف' : 'حلاوة الحشو المستهدف',
      meterMax: 40
    };
  }

  function summarizeBandIssues(bandAudit) {
    return Object.entries(bandAudit || {})
      .filter(([, audit]) => audit?.status && audit.status !== 'within')
      .map(([key, audit]) => ({
        key,
        status: audit.status,
        label: audit?.band?.label || key,
        severity: scoreBandSeverity(audit.status)
      }));
  }

  function buildCalculationSummary(context) {
    const issues = [];
    const warnings = [];
    const notes = [];

    const doughIssues = summarizeBandIssues(context.dough?.doughAudit?.bandAudit);
    doughIssues.forEach(issue => {
      const target = issue.status === 'below' ? issues : warnings;
      target.push(`${issue.label}: ${issue.status === 'below' ? 'أقل من المرجع' : 'أعلى من المرجع'}`);
    });

    if (context.fillingAudit?.summary && context.fillingAudit.confidence === 'low') {
      warnings.push(context.fillingAudit.summary);
    }

    if (context.fillingAudit?.notes?.length) {
      warnings.push(...context.fillingAudit.notes.slice(0, 2));
    }

    if (context.doughAdjustment?.note) {
      notes.push(context.doughAdjustment.note);
    }

    if (context.fillingAdjustment?.note) {
      notes.push(context.fillingAdjustment.note);
    }

    if (context.sweetnessModel?.warnings?.length) {
      warnings.push(...context.sweetnessModel.warnings.slice(0, 2));
    }

    if (context.dough?.doughAudit?.summary) {
      notes.push(context.dough.doughAudit.summary);
    }

    return { issues, warnings, notes };
  }

  function buildIngredientScienceRows(context) {
    const seen = new Set();
    const rows = [];
    const formulas = [context.doughFormula, context.baseFillingFormula];

    formulas.forEach(formula => {
      listify(formula?.items).forEach(item => {
        if (!item || seen.has(item.ingredientId)) return;
        seen.add(item.ingredientId);
        ensureRuntimeIngredient(item.ingredientId);
        const ingredient = getIngredient(IngredientsDB, item.ingredientId);
        const meta = getIngredientScienceMeta(ingredient);
        rows.push({
          ingredientId: item.ingredientId,
          label: ingredient.displayName || item.ingredientId,
          type: ingredient.type || 'unknown',
          confidence: meta?.confidence || 'low',
          summary: meta?.summary || '',
          notes: listify(meta?.notes).slice(0, 2),
          references: typeof getScienceReferences === 'function'
            ? getScienceReferences(meta?.referenceIds || [])
            : []
        });
      });
    });

    return rows.sort((a, b) => String(a.label).localeCompare(String(b.label), 'ar'));
  }

  function getStageLabel(stageId) {
    const map = {
      planning: 'التخطيط',
      dough: 'العجين',
      baking: 'الفرد والخبز',
      filling: 'الحشو',
      assembly: 'التجميع',
      finish: 'الإنهاء'
    };
    return map[stageId] || stageId || 'الحالة الحالية';
  }

  function getTroubleshootingCards(context, stageId = null) {
    const cards = [];
    const stage = stageId || 'planning';

    const doughAudit = context.dough?.doughAudit;
    const hydrationBand = doughAudit?.bandAudit?.waterOnFlour;
    if (hydrationBand?.status === 'below') {
      cards.push({
        stage: 'dough',
        severity: 'high',
        title: 'العجين معرض للقساوة والجفاف',
        reason: 'الماء التركيبي على الدقيق أقل من النطاق المرجعي.',
        actions: ['راجع سماكة الفرد ونسبة الدقيق المضافة فعليا.', 'خفف الاعتماد على الدقيق الإضافي أثناء الفرد.', 'راجع راحة العجين قبل الفرد.'],
        reference: doughAudit.metricNotes?.find(note => /ماء|ترطيب/.test(note)) || doughAudit.summary
      });
    }

    if (context.dough?.doughAudit?.metrics?.bakedDensity > 1.1) {
      cards.push({
        stage: 'dough',
        severity: 'medium',
        title: 'الطبقات قد تخرج ثقيلة أكثر من المرجع',
        reason: 'الكثافة المخبوزة الفعالة مرتفعة نسبيا.',
        actions: ['راجع سمك الفرد الفعلي.', 'تأكد من عدم الخبز الزائد.', 'راجع توزيع الصودا والعسل مقارنة بالمرجع.'],
        reference: context.dough.doughAudit.summary
      });
    }

    if (context.fillingAudit?.checks?.usedDensity?.status === 'above') {
      cards.push({
        stage: 'filling',
        severity: 'medium',
        title: 'الحشو أثقل من المرجع',
        reason: 'الكثافة التشغيلية المستخدمة أعلى من النطاق المرجعي.',
        actions: ['راجع درجة الخفق أو التهوية.', 'راجع كثافة الحشو المختار قبل التجميع.', 'إذا كان الحشو معدلا يدويا فاقرأ أثر تعديل الحلاوة على القوام.'],
        reference: context.fillingAudit.summary
      });
    }

    if (context.fillingAudit?.checks?.usedDensity?.status === 'below') {
      cards.push({
        stage: 'filling',
        severity: 'medium',
        title: 'الحشو أخف من المرجع وقد يفقد الثبات',
        reason: 'الكثافة التشغيلية المستخدمة أقل من المرجع.',
        actions: ['برد الحشو أكثر قبل الاستخدام.', 'راجع نسبة التهوية والخفق.', 'تأكد من أن الحشو ليس مفرطا في التخفيف بعد تعديل الحلاوة.'],
        reference: context.fillingAudit.summary
      });
    }

    const sweetnessRating = deriveSweetnessRating(getPrimarySweetnessReading(context).value);
    if (sweetnessRating.level === 'low' || sweetnessRating.level === 'very-sweet') {
      cards.push({
        stage: 'finish',
        severity: sweetnessRating.level === 'very-sweet' ? 'medium' : 'low',
        title: 'توازن الحلاوة يحتاج مراجعة',
        reason: `الحلاوة الكلية الحالية مصنفة: ${sweetnessRating.label}.`,
        actions: ['راجع تعديل الحلاوة الحالي.', 'قارن الحشو بالعجين على مستوى الحلاوة الموزونة لا المتوسط الاسمي فقط.', 'راجع مساهمة مصادر الحلاوة الرئيسية في التحليل.'],
        reference: context.sweetness?.label || sweetnessRating.label
      });
    }

    const filtered = cards.filter(card => stage === 'planning' || card.stage === stage || stage === 'finish');
    if (filtered.length > 0) return filtered;

    return [{
      stage,
      severity: 'ok',
      title: 'لا توجد إشارة حرجة في الحالة الحالية',
      reason: 'القراءة الحالية أقرب إلى المرجع من مسارات الفشل المعروفة.',
      actions: ['استمر مع مراقبة الإشارات الحسية أثناء التنفيذ.', 'احتفظ بالمراجعة النهائية في نهاية الرحلة.'],
      reference: context.dough?.doughAudit?.summary || context.fillingAudit?.summary || 'الحالة مستقرة.'
    }];
  }

  function getProtocolContext(context, stageId = null) {
    const doughTemplate = context.doughProfile?.id
      ? getMasterDoughTemplate(context.doughProfile.id)
      : null;
    const doughStages = doughTemplate?.protocol || listify(context.doughProfile?.stages).map(stage => ({
      title: stage.title,
      summary: stage.summary || stage.action || '',
      controls: listify(stage.controls),
      stopCues: listify(stage.stopCues),
      failureSignals: listify(stage.failureSignals),
      stageKind: stage.stageKind || 'process'
    }));

    const rawFillingStages = listify(context.masterFilling?.masterStages).length
      ? listify(context.masterFilling?.masterStages)
      : listify(context.fillingDecisionSupport?.stageFallbacks);

    const fillingStages = rawFillingStages.map(stage => ({
      title: stage.title,
      summary: stage.summary || stage.operatorAction || '',
      controls: listify(stage.controls),
      stopCues: listify(stage.stopCues || stage.sensoryCues),
      failureSignals: listify(stage.failureSignals),
      stageKind: stage.stageKind || 'general'
    }));

    return {
      stageId,
      dough: {
        title: doughTemplate?.name || context.doughProfile?.displayName || context.recipeProfile?.name || 'Dough',
        overview: listify(doughTemplate?.overview),
        stages: doughStages
      },
      filling: {
        title: context.masterFilling?.name || context.fillingProfile?.name || 'Filling',
        overview: context.masterFilling ? [context.masterFilling.name, context.masterFilling.origin].filter(Boolean) : [],
        stages: fillingStages
      }
    };
  }

  function getCurrentWorkflowStage() {
    return AppState?.getSession?.()?.execution?.currentPhase
      || AppState?.getExecutionPhase?.()
      || AppState?.get('currentView')
      || 'plan';
  }

  function getScienceContext(config, recipeProfile, fillingProfile, adjustmentPct = 0, stageIdOverride = null) {
    const context = buildRuntimeContext(config, recipeProfile, fillingProfile, adjustmentPct);
    const stageId = stageIdOverride || getCurrentWorkflowStage();
    return {
      context,
      stageId,
      stageLabel: getStageLabel(stageId),
      protocols: getProtocolContext(context, stageId),
      ingredients: buildIngredientScienceRows(context),
      troubleshooting: getTroubleshootingCards(context, stageId)
    };
  }

  function resolveAnalysisInputs(config, recipeProfile, fillingProfile, adjustment = 0, adjustmentTarget = null) {
    const recipe = recipeProfile || AppState?.getSelectedRecipeProfile() || MEDOVIK_RECIPE_PROFILES?.ayaHabib || null;
    const filling = fillingProfile || AppState?.getSelectedFilling() || (global.getFillingRecord?.(global.DEFAULT_FILLING_ID) || global.FILLING_CATALOG?.[global.DEFAULT_FILLING_ID]) || null;
    const activeConfig = config || AppState?.getBatchConfig() || DEFAULT_BATCH_CONFIG;
    return {
      recipe,
      filling,
      activeConfig,
      context: buildRuntimeContext(activeConfig, recipe, filling, adjustment, adjustmentTarget)
    };
  }

  function buildBatchResultFromContext(context, recipe) {
    const area = calcArea(context.config.shape, context.config.d1, context.config.d2);
    const stackHeight = context.config.stackHeightMm();
    const finishedHeight = stackHeight + (context.config.includeOuterCoat ? Math.max(0, context.config.topCoatThicknessMm || 0) : 0);
    const interiorFillingVolume = context.config.interiorFillingVolume();
    const topCoatVolume = context.config.topCoatVolume();
    const sideCoatVolume = context.config.sideCoatVolume();
    const outerCoatVolume = topCoatVolume + sideCoatVolume;
    const totalVolume = context.config.doughVolume() + context.config.fillingVolume();
    const bakers = context.dough.scaledFormula?.bakersPerc(IngredientsDB) || null;
    const baseFlour = context.doughFormula?.bakersPerc(IngredientsDB)?.flourMass || 0;
    const scaledFlour = context.dough.scaledFormula?.bakersPerc(IngredientsDB)?.flourMass || context.dough.scaledFlourWeight || 0;

    return {
      context,
      config: context.config,
      profile: recipe?.id || null,
      profileName: recipe?.name || '',
      scaleMode: context.config.scaleMode,
      scalingFactor: baseFlour > 0 ? (scaledFlour / baseFlour) : 0,
      area: round(area, 2),
      stackHeight: round(stackHeight, 2),
      finishedHeight: round(finishedHeight, 2),
      totalHeight: round(finishedHeight, 2),
      volume: round(totalVolume, 2),
      doughVolume: round(context.config.doughVolume(), 2),
      fillingVolume: round(context.config.fillingVolume(), 2),
      interiorFillingVolume: round(interiorFillingVolume, 2),
      outerCoatVolume: round(outerCoatVolume, 2),
      topCoatVolume: round(topCoatVolume, 2),
      sideCoatVolume: round(sideCoatVolume, 2),
      layers: context.config.layers,
      gaps: context.config.gaps(),
      wastePct: context.config.wastePct,
      ballWeight: round(context.dough.ballWeight, 1),
      totalRaw: round(context.dough.totalRaw, 1),
      netRaw: round(context.dough.netRaw, 1),
      bakedMass: round(context.dough.bakedMass, 1),
      estimatedThicknessMm: round(context.dough.estimatedThicknessMm, 3),
      bakeYield: round((context.dough.bakeYield || 0) * 100, 1),
      usedBakedDensity: round(context.dough.usedBakedDensity, 3),
      bakers,
      doughAudit: context.dough.doughAudit,
      doughModel: context.dough.doughModel,
      scaledFormula: context.dough.scaledFormula,
      ingredientRows: buildIngredientRows(context.dough.scaledFormula, { basis: 'dough' }),
      ingredients: formulaToObjectRows(context.dough.scaledFormula, { basis: 'dough' })
    };
  }

  function buildFillingResultFromContext(context, filling) {
    return {
      context,
      filling: filling?.id || null,
      fillingName: filling?.name || '',
      volume: round(context.config.fillingVolume(), 2),
      interiorVolume: round(context.filling.interiorVolume, 2),
      outerCoatVolume: round(context.filling.outerCoatVolume, 2),
      topCoatVolume: round(context.filling.topCoatVolume, 2),
      sideCoatVolume: round(context.filling.sideCoatVolume, 2),
      requiredMass: round(context.filling.requiredMass, 1),
      onCakeRequiredMass: round(context.filling.onCakeRequiredMass ?? context.filling.requiredMass, 1),
      usablePreparedMass: round(context.filling.usablePreparedMass ?? context.filling.requiredMass, 1),
      preparedRequiredMass: round(context.filling.preparedRequiredMass ?? context.filling.preparedFormula?.totalMass?.() ?? 0, 1),
      wasteAllowanceMass: round(context.filling.wasteAllowanceMass || 0, 1),
      yieldLossMass: round(context.filling.yieldLossMass || 0, 1),
      wastePctApplied: round(context.filling.wastePctApplied || 0, 1),
      interiorRequiredMass: round(context.filling.interiorRequiredMass, 1),
      outerRequiredMass: round(context.filling.outerRequiredMass, 1),
      topRequiredMass: round(context.filling.topRequiredMass, 1),
      sideRequiredMass: round(context.filling.sideRequiredMass, 1),
      perGap: round(context.filling.perGap, 1),
      gaps: context.config.gaps(),
      layers: context.config.layers,
      includeOuterCoat: !!context.config.includeOuterCoat,
      mixDensity: round(context.filling.mixDensity, 3),
      densityAudit: context.filling.densityAudit,
      yieldAudit: context.filling.yieldAudit,
      preparedFormula: context.filling.preparedFormula,
      scaledFormula: context.filling.scaledFormula,
      ingredientRows: buildIngredientRows(context.filling.preparedFormula, { basis: 'filling' }),
      usableRows: buildIngredientRows(context.filling.scaledFormula, { basis: 'filling' }),
      ingredients: formulaToObjectRows(context.filling.preparedFormula, { basis: 'filling' }),
      adjustmentNote: context.fillingAdjustment?.note || null,
      sweetnessTarget: context.sweetnessPlan?.target || 'filling',
      masterRecord: context.masterFilling,
      execution: context.fillingDecisionSupport || null,
      familyId: context.fillingDecisionSupport?.familyId || null,
      familyLabel: context.fillingDecisionSupport?.familyLabel || null,
      targetTexture: context.fillingDecisionSupport?.targetTexture || null,
      operationalWindows: listify(context.fillingDecisionSupport?.operationalWindows),
      readinessSummary: context.fillingDecisionSupport?.summary || null,
      setupNotes: listify(context.fillingDecisionSupport?.setupNotes),
      watchpoints: listify(context.fillingDecisionSupport?.watchpoints),
      firstInterventions: listify(context.fillingDecisionSupport?.firstInterventions)
    };
  }

  function buildSweetnessResultFromContext(context, adjustment = 0) {
    const primarySweetness = getPrimarySweetnessReading(context);
    const rating = deriveSweetnessRating(primarySweetness.ratingBasisValue ?? primarySweetness.value);
    return {
      context,
      doughSweetness: round(context.sweetness?.dough?.equivPer100, 1),
      fillingSweetness: round(context.sweetness?.filling?.equivPer100, 1),
      averageSweetness: round(context.sweetness?.equivPer100, 1),
      adjustedSweetness: round(context.sweetness?.equivPer100, 1),
      adjustment: context.sweetnessPlan?.adjustmentPct ?? finiteNumber(adjustment, 0),
      target: context.sweetnessPlan?.target || 'filling',
      primaryReading: primarySweetness,
      rating,
      label: primarySweetness.system ? rating.label : (context.sweetness?.label || rating.label),
      recommendation: context.sweetnessModel?.summary || [context.doughAdjustment?.note, context.fillingAdjustment?.note].filter(Boolean).join(' ') || null,
      sources: listify(context.sweetness?.sources),
      model: context.sweetnessModel || null
    };
  }

  function buildDoughAnalysisFromContext(context) {
    const bakers = context.dough.scaledFormula?.bakersPerc(IngredientsDB) || null;
    const issues = summarizeBandIssues(context.dough?.doughAudit?.bandAudit);
    return {
      context,
      fatRatio: round(bakers?.fatPct, 1),
      liquidRatio: round((context.dough?.doughAudit?.metrics?.waterOnFlour || 0) * 100, 1),
      sugarRatio: round(bakers?.sugarPct, 1),
      bakers,
      audit: context.dough?.doughAudit,
      issues,
      overall: issues.length === 0
        ? { level: 'excellent', label: 'متسقة مع المرجع', color: '#27ae60' }
        : issues.length <= 2
          ? { level: 'good', label: 'قريبة من المرجع', color: '#f39c12' }
          : { level: 'needs-adjustment', label: 'تحتاج تعديلا', color: '#e74c3c' }
    };
  }

  const BatchCalculator = {
    calculate(config, recipeProfile, adjustmentPct = 0, fillingProfile = null, adjustmentTarget = null) {
      const resolved = resolveAnalysisInputs(config, recipeProfile, fillingProfile, adjustmentPct, adjustmentTarget);
      return buildBatchResultFromContext(resolved.context, resolved.recipe);
    },

    calculateScalingFactor(config, recipeProfile, adjustmentPct = 0, fillingProfile = null, adjustmentTarget = null) {
      return this.calculate(config, recipeProfile, adjustmentPct, fillingProfile, adjustmentTarget)?.scalingFactor || 0;
    },

    calculateFilling(config, fillingProfile, adjustmentPct = 0, recipeProfile = null, adjustmentTarget = null) {
      const resolved = resolveAnalysisInputs(config, recipeProfile, fillingProfile, adjustmentPct, adjustmentTarget);
      return buildFillingResultFromContext(resolved.context, resolved.filling);
    }
  };

  const TEMPERING_CP = Object.freeze({ egg: 3.6, hotPhase: 2.2 });
  const TEMPERING_LIMITS = Object.freeze({ attention: 65, high: 72 });

  function normalizeEggMass(input) {
    const mass = finiteNumber(input, 0);
    return mass > 0 && mass < 20 ? mass * 50 : Math.max(0, mass);
  }

  function estimateHotPhaseMassFromRecipe(recipe) {
    const ingredients = recipe?.ingredients || {};
    return ['butter', 'sugar', 'honey'].map(key => resolveWeight(ingredients[key])).reduce((sum, value) => sum + value, 0);
  }

  function sumFormulaWeights(formula, ingredientIds) {
    const ids = new Set(listify(ingredientIds));
    return listify(formula?.items).filter(item => ids.has(item?.ingredientId)).reduce((sum, item) => sum + finiteNumber(item?.weight, 0), 0);
  }

  function estimateTemperingMassesFromBatch(batchResult) {
    const formula = batchResult?.scaledFormula || batchResult?.context?.dough?.scaledFormula || null;
    if (!formula) return { eggMass: 0, hotMass: 0 };
    return {
      eggMass: sumFormulaWeights(formula, ['eggs']),
      hotMass: sumFormulaWeights(formula, ['butter', 'sugar', 'honey'])
    };
  }

  function classifyThermalMixingTemp(temp) {
    if (!Number.isFinite(temp)) return { level: 'unknown', label: 'غير متاح' };
    if (temp >= TEMPERING_LIMITS.high) return { level: 'high', label: 'منطقة حرارية مرتفعة' };
    if (temp >= TEMPERING_LIMITS.attention) return { level: 'attention', label: 'تحتاج خفقاً سريعاً ومراقبة' };
    return { level: 'lower', label: 'أقل حرارياً في المتوسط الحجمي' };
  }

  function buildTemperingResult(eggsOrMass, eggTemp, hotMassInput, hotTempInput, batches = 4, options = {}) {
    const eggMass = normalizeEggMass(eggsOrMass);
    const hotMass = Math.max(0, finiteNumber(hotMassInput, 0));
    const hotTemp = finiteNumber(hotTempInput, 80);
    const startTemp = finiteNumber(eggTemp, 20);
    const safeBatches = Math.max(1, Math.round(finiteNumber(batches, 4)));
    const direction = options.direction === 'EGG_INTO_HOT_BASE' ? 'EGG_INTO_HOT_BASE' : 'HOT_BASE_INTO_EGG';
    const calculation = typeof global.calcThermalMixing === 'function'
      ? global.calcThermalMixing({ eggMass, eggTemp: startTemp, hotMass, hotTemp, batches: safeBatches, direction })
      : { steps: [], finalTemp: null, direction };
    const results = calculation.steps.map(step => {
      const classification = classifyThermalMixingTemp(step.temp);
      return { batch: step.i, temp: round(step.temp, 1), addedMass: round(step.addedMass, 1), riskLevel: classification.level, riskLabel: classification.label };
    });
    const finalClass = classifyThermalMixingTemp(calculation.finalTemp);
    return {
      eggs: Math.max(1, Math.round(eggMass / 50)),
      eggMass: round(eggMass, 1),
      eggTemp: startTemp,
      syrupMass: hotMass,
      syrupTemp: hotTemp,
      hotMass,
      hotTemp,
      batches: safeBatches,
      direction,
      directionLabel: direction === 'EGG_INTO_HOT_BASE' ? 'إضافة البيض إلى القاعدة الساخنة' : 'إضافة القاعدة الساخنة إلى البيض',
      batchSize: round((direction === 'EGG_INTO_HOT_BASE' ? eggMass : hotMass) / safeBatches, 1),
      results,
      finalTemp: round(calculation.finalTemp, 1),
      finalRiskLevel: finalClass.level,
      finalRiskLabel: finalClass.label,
      allSafe: null,
      recommendedSafe: null,
      recommendedSafeBatches: null,
      practicalSolutions: {
        coolHotBase: hotTemp >= TEMPERING_LIMITS.attention,
        useSmallerBatches: true,
        whiskContinuously: true
      },
      notes: [
        'هذا تقدير لاتزان الحرارة في كامل الكتلة، لا قياس لحرارة التلامس اللحظية حول خيط البيض أو الخليط الساخن.',
        'اتجاه الدمج يغيّر حرارة المراحل الأولى بوضوح، حتى لو بقي متوسط الحرارة النهائي متقارباً.',
        'اتبع ترتيب الوصفة الأصلية؛ لا تغيّر كمية البيض بغرض تبريد الخليط.'
      ]
    };
  }

  const TemperingCalculator = {
    calculate(eggsOrMass, eggTemp, hotMass, hotTemp, batches = 4, direction = 'HOT_BASE_INTO_EGG') {
      return buildTemperingResult(eggsOrMass, eggTemp, hotMass, hotTemp, batches, { direction });
    },
    isApplicableToRecipe(recipe) {
      return recipe?.processFamily === 'HOT_BASE_EGG_ADDED_AFTER_HEAT' && !!recipe?.temperingDirection;
    },
    calculateFromRecipe(recipe, override = {}) {
      if (!this.isApplicableToRecipe(recipe) && override.force !== true) return null;
      return this.calculate(
        resolveWeight(recipe?.ingredients?.eggs) || 150,
        finiteNumber(override.eggTemp, 20),
        estimateHotPhaseMassFromRecipe(recipe) || 400,
        finiteNumber(override.syrupTemp ?? override.hotTemp, 75),
        finiteNumber(override.batches, 4),
        override.direction || recipe?.temperingDirection || 'EGG_INTO_HOT_BASE'
      );
    },
    calculateFromBatch(batchResult, override = {}) {
      const recipe = batchResult?.context?.recipeProfile || override.recipe || null;
      if (recipe && !this.isApplicableToRecipe(recipe) && override.force !== true) return null;
      const masses = estimateTemperingMassesFromBatch(batchResult);
      return this.calculate(
        masses.eggMass || resolveWeight(recipe?.ingredients?.eggs) || 150,
        finiteNumber(override.eggTemp, 20),
        masses.hotMass || estimateHotPhaseMassFromRecipe(recipe) || 400,
        finiteNumber(override.syrupTemp ?? override.hotTemp, 75),
        finiteNumber(override.batches, 4),
        override.direction || recipe?.temperingDirection || 'EGG_INTO_HOT_BASE'
      );
    },
    getSafeBatches(eggsOrMass, eggTemp, hotMass, hotTemp, startAt = 2, direction = 'HOT_BASE_INTO_EGG') {
      const result = this.calculate(eggsOrMass, eggTemp, hotMass, hotTemp, Math.max(1, startAt), direction);
      return { batches: result?.batches || startAt, result, note: 'عدد الدفعات لا يحول النموذج إلى ضمان أمان؛ راقب اتجاه الدمج والخفق الفعلي.' };
    }
  };

  const SweetnessCalculator = {
    calculate(config, recipeProfile, fillingProfile, adjustment = 0, adjustmentTarget = null) {
      const resolved = resolveAnalysisInputs(config, recipeProfile, fillingProfile, adjustment, adjustmentTarget);
      return buildSweetnessResultFromContext(resolved.context, adjustment);
    }
  };

  const DoughAnalyzer = {
    analyze(recipeProfile, config, fillingProfile = null, adjustmentPct = 0, adjustmentTarget = null) {
      const resolved = resolveAnalysisInputs(config, recipeProfile, fillingProfile, adjustmentPct, adjustmentTarget);
      return buildDoughAnalysisFromContext(resolved.context);
    }
  };

  function normalizeRecipeLabKind(kind) {
    return kind === 'filling' ? 'filling' : 'dough';
  }

  function restoreRecipeLabFormula(input) {
    if (!input) return null;
    if (typeof input.totalMass === 'function' && Array.isArray(input.items)) return input;
    if (input.formula && typeof input.formula.totalMass === 'function') return input.formula;
    const snapshot = input.formulaSnapshot || input.snapshot || input;
    if (typeof Formula?.fromSnapshot === 'function') {
      try { return Formula.fromSnapshot(snapshot); } catch (_) { /* fall through */ }
    }
    if (snapshot && Array.isArray(snapshot.items)) {
      try { return new Formula(snapshot.items, snapshot.meta || {}); } catch (_) { return null; }
    }
    return null;
  }

  function summarizeRecipeLabDough(metrics) {
    const hydration = metrics.hydrationPct;
    const sweetness = metrics.sweetnessEqPer100;
    const sugar = metrics.sugarPctOnFlour;
    if (hydration < 28) {
      return 'تركيب العجين يميل إلى الجفاف النسبي ويحتاج مراجعة توازن الماء أو المكونات الرطبة قبل قراءته كعجين طبقات مرن.';
    }
    if (hydration > 52) {
      return 'تركيب العجين يميل إلى الرطوبة المرتفعة، لذا يجب قراءة قابلية الفرد والارتداد بحذر قبل اعتباره مستقرًا للتشغيل.';
    }
    if (sugar > 65 || sweetness > 30) {
      return 'العجين غني بالحلاوة نسبيًا، وهذا يرفع حساسية اللون والكرملة أثناء الطهي والخبز.';
    }
    return 'تركيب العجين يبدو ضمن مجال متوازن نسبيًا بين الماء والدهن والحلاوة، ويصلح كقراءة أولية قبل الحكم التشغيلي النهائي.';
  }

  function summarizeRecipeLabFilling(metrics) {
    const ratio = metrics.solidsWaterRatio;
    const sweetness = metrics.sweetnessEqPer100;
    if (ratio < 0.75) {
      return 'توازن الحشو يميل إلى الرطوبة الواضحة، لذا يجب توقع قوام أنعم وأقل ثباتًا ما لم توجد عناصر بنيوية داعمة.';
    }
    if (ratio > 1.6) {
      return 'توازن الحشو يميل إلى التركيز العالي، ما قد يعطي قوامًا أثقل أو أكثر امتلاءً من المرجع الكلاسيكي.';
    }
    if (sweetness > 30) {
      return 'الحشو يقع في مجال حلاوة مرتفع نسبيًا، لذلك يجب قراءة الحلاوة مع القوام لا كمؤشر منفصل.';
    }
    return 'توازن الحشو يبدو قريبًا من المجال المرن: رطوبة واضحة لكن غير منفلتة، مع حلاوة قابلة للقراءة والمقارنة.';
  }

  function buildRecipeLabMetrics(kind, formula) {
    const totalMass = round(formula?.totalMass?.() || 0, 1);
    const breakdown = formula?.breakdown?.(IngredientsDB) || {};
    const sweetness = formula?.sweetness?.(IngredientsDB) || { equivPer100: 0, label: 'غير معروف', sources: [] };
    const aqueousSugar = formula?.aqueousSugarIndex?.(IngredientsDB) || { value: 0, label: 'غير معروف' };
    const solidsWater = formula?.solidsWaterRatio?.(IngredientsDB) || { ratio: 0, label: 'غير معروف' };
    const metrics = {
      totalMass,
      sweetnessEqPer100: round(sweetness.equivPer100 || 0, 1),
      sweetnessLabel: sweetness.label || 'غير معروف',
      aqueousSugarIndex: round(aqueousSugar.value || aqueousSugar.brix || 0, 1),
      aqueousSugarLabel: aqueousSugar.label || 'غير معروف',
      brixApprox: round(aqueousSugar.value || aqueousSugar.brix || 0, 1), // legacy alias
      solidsWaterRatio: round(solidsWater.ratio || 0, 2),
      solidsWaterLabel: solidsWater.label || 'غير معروف',
      sugarMass: round(breakdown.sugarMass || 0, 1),
      fatMass: round(breakdown.fatMass || 0, 1),
      waterMass: round(breakdown.waterMass || 0, 1),
      proteinMass: round(breakdown.proteinMass || 0, 1),
      otherSolidsMass: round(breakdown.otherSolidsMass || 0, 1)
    };

    if (kind === 'dough') {
      const bakers = formula?.bakersPerc?.(IngredientsDB) || {};
      const flourMass = round(bakers.flourMass || breakdown.flourMass || 0, 1);
      metrics.flourMass = flourMass;
      metrics.sugarPctOnFlour = round(bakers.sugarPct || 0, 1);
      metrics.fatPctOnFlour = round(bakers.fatPct || 0, 1);
      metrics.hydrationPct = round(bakers.liquidPct || 0, 1);
      metrics.liquidPctOnFlour = metrics.hydrationPct;
      metrics.proteinPctOnFlour = flourMass > 0 ? round((finiteNumber(breakdown.proteinMass, 0) / flourMass) * 100, 1) : 0;
      metrics.summaryBasis = summarizeRecipeLabDough(metrics);
    } else {
      metrics.fatPctOfTotal = totalMass > 0 ? round((finiteNumber(breakdown.fatMass, 0) / totalMass) * 100, 1) : 0;
      metrics.summaryBasis = summarizeRecipeLabFilling(metrics);
    }

    return {
      metrics,
      breakdown,
      sweetness,
      aqueousSugar,
      brix: aqueousSugar, // legacy alias
      solidsWater
    };
  }

  function buildRecipeLabIngredientDiffs(kind, leftFormula, rightFormula, leftMetrics, rightMetrics) {
    const leftMap = new Map(listify(leftFormula?.items).map(item => [item.ingredientId, finiteNumber(item.weight, 0)]));
    const rightMap = new Map(listify(rightFormula?.items).map(item => [item.ingredientId, finiteNumber(item.weight, 0)]));
    const ids = Array.from(new Set([].concat(Array.from(leftMap.keys()), Array.from(rightMap.keys()))));
    const leftBasis = kind === 'dough'
      ? finiteNumber(leftMetrics?.flourMass, 0)
      : finiteNumber(leftMetrics?.totalMass, 0);
    const rightBasis = kind === 'dough'
      ? finiteNumber(rightMetrics?.flourMass, 0)
      : finiteNumber(rightMetrics?.totalMass, 0);
    return ids.map(function(ingredientId) {
      const leftWeight = round(leftMap.get(ingredientId) || 0, 1);
      const rightWeight = round(rightMap.get(ingredientId) || 0, 1);
      const delta = round(rightWeight - leftWeight, 1);
      return {
        ingredientId,
        label: getDisplayName(ingredientId),
        leftWeight,
        rightWeight,
        deltaWeight: delta,
        leftPct: leftBasis > 0 ? round((leftWeight / leftBasis) * 100, 1) : 0,
        rightPct: rightBasis > 0 ? round((rightWeight / rightBasis) * 100, 1) : 0,
        deltaPct: leftBasis > 0 || rightBasis > 0
          ? round(((rightBasis > 0 ? (rightWeight / rightBasis) * 100 : 0) - (leftBasis > 0 ? (leftWeight / leftBasis) * 100 : 0)), 1)
          : 0
      };
    }).sort(function(a, b) {
      return Math.abs(b.deltaPct) - Math.abs(a.deltaPct);
    });
  }

  function buildRecipeLabMetricDiffs(kind, leftMetrics, rightMetrics) {
    const descriptors = kind === 'dough'
      ? [
          ['hydrationPct', 'الرطوبة'],
          ['sugarPctOnFlour', 'سكر/دقيق'],
          ['fatPctOnFlour', 'دهن/دقيق'],
          ['proteinPctOnFlour', 'بروتين/دقيق'],
          ['sweetnessEqPer100', 'حلاوة/100غ']
        ]
      : [
          ['sweetnessEqPer100', 'حلاوة/100غ'],
          ['solidsWaterRatio', 'مواد صلبة/ماء'],
          ['fatPctOfTotal', 'دهن/الكتلة'],
          ['aqueousSugarIndex', 'مؤشر السكر/(السكر+الماء)']
        ];

    return descriptors.map(function(entry) {
      const key = entry[0];
      const label = entry[1];
      const left = round(leftMetrics[key] || 0, 1);
      const right = round(rightMetrics[key] || 0, 1);
      return {
        key,
        label,
        left,
        right,
        delta: round(right - left, 1)
      };
    });
  }

  const RecipeLabAnalyzer = {
    analyze(input) {
      const kind = normalizeRecipeLabKind(input?.kind);
      const formula = restoreRecipeLabFormula(input);
      if (!formula) {
        return {
          ok: false,
          kind,
          reason: 'missing-formula',
          metrics: {},
          ingredientRows: [],
          summary: 'لا توجد صيغة قابلة للتحليل.'
        };
      }

      const computed = buildRecipeLabMetrics(kind, formula);
      const name = input?.name || input?.title || (kind === 'filling' ? 'Filling' : 'Dough');

      return {
        ok: true,
        id: input?.id || null,
        kind,
        name,
        formulaSnapshot: typeof formula.toSnapshot === 'function' ? formula.toSnapshot() : null,
        metrics: computed.metrics,
        ingredientRows: buildIngredientRows(formula, { basis: kind === 'filling' ? 'filling' : 'dough' }),
        sweetnessSources: listify(computed.sweetness?.sources).map(function(source) {
          return {
            ingredientId: source.ingredientId,
            label: source.name || getDisplayName(source.ingredientId),
            eq: round(source.eq || 0, 1),
            pctOfSweet: round(source.pctOfSweet || 0, 1)
          };
        }),
        summary: computed.metrics.summaryBasis,
        labels: {
          sweetness: computed.metrics.sweetnessLabel,
          brix: computed.metrics.brixLabel,
          solidsWater: computed.metrics.solidsWaterLabel
        }
      };
    },

    compare(leftInput, rightInput) {
      const left = this.analyze(leftInput);
      const right = this.analyze(rightInput);
      if (!left.ok || !right.ok) {
        return {
          ok: false,
          reason: 'analysis-failed',
          left,
          right
        };
      }
      if (left.kind !== right.kind) {
        return {
          ok: false,
          reason: 'kind-mismatch',
          leftKind: left.kind,
          rightKind: right.kind,
          left,
          right
        };
      }

      const leftFormula = restoreRecipeLabFormula(leftInput);
      const rightFormula = restoreRecipeLabFormula(rightInput);

      return {
        ok: true,
        kind: left.kind,
        left,
        right,
        metricDiffs: buildRecipeLabMetricDiffs(left.kind, left.metrics, right.metrics),
        ingredientDiffs: buildRecipeLabIngredientDiffs(left.kind, leftFormula, rightFormula, left.metrics, right.metrics),
        summary: left.kind === 'dough'
          ? 'المقارنة هنا تركز على نسب الخباز والرطوبة والحلاوة والبنية داخل العجين.'
          : 'المقارنة هنا تركز على الحلاوة والتوازن المائي والدهن والبنية داخل الحشو.'
      };
    }
  };

  const FullAnalysis = {
    run(config, recipeProfile, fillingProfile, adjustmentPct = 0, adjustmentTarget = null) {
      const resolved = resolveAnalysisInputs(config, recipeProfile, fillingProfile, adjustmentPct, adjustmentTarget);
      const context = resolved.context;

      return {
        batch: buildBatchResultFromContext(context, resolved.recipe),
        filling: buildFillingResultFromContext(context, resolved.filling),
        sweetness: buildSweetnessResultFromContext(context, adjustmentPct),
        dough: buildDoughAnalysisFromContext(context),
        structure: context.structure,
        fillingAudit: context.fillingAudit,
        fillingExecution: context.fillingDecisionSupport,
        timestamp: new Date().toISOString(),
        summary: buildCalculationSummary(context),
        context
      };
    }
  };


  global.buildRecipeFormula = buildRecipeFormula;
  global.buildFillingFormula = buildFillingFormula;
  global.findMasterFillingRecord = findMasterFillingRecord;
  global.normalizeSweetnessSettings = normalizeSweetnessSettings;
  global.BatchCalculator = BatchCalculator;
  global.TemperingCalculator = TemperingCalculator;
  global.SweetnessCalculator = SweetnessCalculator;
  global.DoughAnalyzer = DoughAnalyzer;
  global.RecipeLabAnalyzer = RecipeLabAnalyzer;
  global.FullAnalysis = FullAnalysis;
  global.RECIPE_EDITABLE_INGREDIENT_IDS = RECIPE_EDITABLE_INGREDIENT_IDS;
  global.FILLING_EDITABLE_INGREDIENT_IDS = FILLING_EDITABLE_INGREDIENT_IDS;
  global.buildIngredientRows = buildIngredientRows;
  global.getCalculationAudit = getCalculationAudit;
  global.listCalculationAudits = listCalculationAudits;
})(typeof window !== 'undefined' ? window : globalThis);
