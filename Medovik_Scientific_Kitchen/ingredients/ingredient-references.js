/* offline build: ingredient-references.js */
// ingredient-references.js
// سجل مرجعي موحد لمصادر تركيب المكونات، ووسم ما هو مرجع تركيبي وما هو heuristic تشغيلية.
const SCIENCE_REFERENCE_REGISTRY = Object.freeze({
  usda_fdc: Object.freeze({
    id: 'usda_fdc',
    label: 'USDA FoodData Central',
    url: 'https://fdc.nal.usda.gov/',
    kind: 'composition-reference'
  }),
  codex_honey: Object.freeze({
    id: 'codex_honey',
    label: 'Codex Standard for Honey',
    url: 'https://www.fao.org/input/download/standards/310/cxs_012e.pdf',
    kind: 'standard'
  }),
  fda_condensed_milk: Object.freeze({
    id: 'fda_condensed_milk',
    label: '21 CFR 131.120 — Sweetened condensed milk',
    url: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-131/subpart-B/section-131.120',
    kind: 'standard'
  }),
  cdr_butter: Object.freeze({
    id: 'cdr_butter',
    label: 'Center for Dairy Research — Butter Science 101',
    url: 'https://cdr.wisc.edu/butter-science-101',
    kind: 'technical-reference'
  }),
  acs_baking_soda: Object.freeze({
    id: 'acs_baking_soda',
    label: 'ACS Axial — The Science of Baking Soda',
    url: 'https://axial.acs.org/cross-disciplinary-concepts/the-science-of-baking-soda',
    kind: 'science-article'
  }),
  fda_cream_cheese: Object.freeze({
    id: 'fda_cream_cheese',
    label: '21 CFR 133.133 — Cream cheese',
    url: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-133/subpart-B/section-133.133',
    kind: 'standard'
  }),
  pubmed_whipped_cream_temp: Object.freeze({
    id: 'pubmed_whipped_cream_temp',
    label: 'J. Dairy Sci. — Influence of whipping temperature on whipped cream',
    url: 'https://pubmed.ncbi.nlm.nih.gov/20630206/',
    kind: 'paper'
  }),
  pmc_mascarpone_review: Object.freeze({
    id: 'pmc_mascarpone_review',
    label: 'PMC — Mascarpone cheese review / pH context',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10771476/',
    kind: 'paper'
  }),
  norrish_1966: Object.freeze({
    id: 'norrish_1966',
    label: 'Norrish, R. S. (1966) — An equation for the activity coefficients and equilibrium relative humidities of water in confectionery syrups (J. Food Technol. 1(1):25–39)',
    url: 'https://doi.org/10.1111/j.1365-2621.1966.tb01027.x',
    kind: 'paper',
    confidence: 'high'
  }),
  fao_norrish_y4358e: Object.freeze({
    id: 'fao_norrish_y4358e',
    label: 'FAO Fisheries Technical Paper 419 (Y4358E) — Norrish constants for sucrose (6.47), maltose (4.54), glucose (2.25), lactose (10.2)',
    url: 'https://www.fao.org/4/y4358e/y4358e05.htm',
    kind: 'technical-reference',
    confidence: 'high'
  }),
  chirife_1980_norrish: Object.freeze({
    id: 'chirife_1980_norrish',
    label: 'Chirife, J., Ferro Fontán, C. & Benmergui, E. A. (1980) — Prediction of water activity in aqueous solutions IV: K_fructose = 2.15 (J. Food Technol. 15(1):59–70)',
    url: 'https://doi.org/10.1111/j.1365-2621.1980.tb00919.x',
    kind: 'paper',
    confidence: 'high'
  }),
  pubchem_sugar_mw: Object.freeze({
    id: 'pubchem_sugar_mw',
    label: 'IUPAC / PubChem Molecular Weights — Water (18.015), Anhydrous Hexoses (180.16), Anhydrous Disaccharides (342.30)',
    url: 'https://pubchem.ncbi.nlm.nih.gov/',
    kind: 'composition-reference',
    confidence: 'high'
  })
});
function getScienceReferences(referenceIds = []) {
  if (!Array.isArray(referenceIds)) return [];
  return referenceIds
    .map(id => SCIENCE_REFERENCE_REGISTRY[id])
    .filter(Boolean);
}
function buildScienceMeta(overrides = {}) {
  return {
    confidence: overrides.confidence || 'medium',
    basis: overrides.basis || 'reference-composition',
    summary: overrides.summary || 'قيم تقريبية للاستخدام الحسابي، وليست مواصفة شراء أو تحليل مخبري لدفعة محددة.',
    referenceIds: Array.isArray(overrides.referenceIds) ? overrides.referenceIds : [],
    fieldConfidence: overrides.fieldConfidence || {},
    fieldBasis: overrides.fieldBasis || {},
    variableFields: Array.isArray(overrides.variableFields) ? overrides.variableFields : [],
    notes: Array.isArray(overrides.notes) ? overrides.notes : [],
    tags: Array.isArray(overrides.tags) ? overrides.tags : []
  };
}
function getDefaultScienceMetaForType(type = 'unknown') {
  const common = {
    confidence: 'low',
    basis: 'reference-composition',
    summary: 'قيم تقريبية rounded لتغذية النموذج، ويجب فهمها كمراجع تركيبية لا كتحليل مخبري لدفعة واحدة.',
    notes: []
  };

  switch (type) {
    case 'flour':
      return buildScienceMeta({
        ...common,
        confidence: 'medium',
        referenceIds: ['usda_fdc'],
        variableFields: ['density'],
        notes: [
          'الكثافة هنا bulk/use density للفرد والقياس الحجمي، لا كثافة حقيقية لمادة صلبة نقية.',
          'تركيب الدقيق يتغير باختلاف الاستخراج والبروتين والرطوبة الفعلية بين الموردين.'
        ]
      });
    case 'sugar':
      return buildScienceMeta({
        ...common,
        confidence: 'high',
        referenceIds: ['usda_fdc'],
        variableFields: ['density'],
        notes: ['الكثافة هنا كثافة تعبئة/استخدام وليست ثابتاً فيزيائياً مستقلاً عن حجم البلورات والهواء بين الحبيبات.']
      });
    case 'sweetener':
      return buildScienceMeta({
        ...common,
        confidence: 'medium',
        referenceIds: ['usda_fdc'],
        variableFields: ['density', 'waterFrac'],
        notes: ['المحليات المركبة تتغير كثيراً حسب العلامة التجارية أو درجة الطبخ/التركيز.']
      });
    case 'dairy':
      return buildScienceMeta({
        ...common,
        confidence: 'medium',
        referenceIds: ['usda_fdc'],
        variableFields: ['density', 'waterFrac', 'fatFrac', 'pH'],
        notes: ['الألبان أكثر الفئات حساسية لاختلاف النوع التجاري، نسبة الدهن، التصفية، والثبات القوامي.']
      });
    case 'fat':
      return buildScienceMeta({
        ...common,
        confidence: 'medium',
        referenceIds: ['usda_fdc', 'cdr_butter'],
        variableFields: ['density'],
        notes: ['الكثافة وحالة البلورات الدهنية ترتبطان بالحرارة والحالة الفيزيائية، لا بالتركيب فقط.']
      });
    case 'egg':
      return buildScienceMeta({
        ...common,
        confidence: 'medium',
        referenceIds: ['usda_fdc'],
        variableFields: ['waterFrac', 'fatFrac', 'proteinFrac'],
        notes: ['القيم هنا لبيض كامل خام نموذجي؛ كتلة البيضة الفعلية وحجم الصفار/البياض يختلفان بالحجم والسلالة.']
      });
    case 'protein':
      return buildScienceMeta({
        ...common,
        confidence: 'medium',
        referenceIds: ['usda_fdc'],
        variableFields: ['waterFrac', 'proteinFrac', 'density'],
        notes: ['فئة البروتين هنا تمثل مركزات أو عزلات بروتينية؛ النسبة الفعلية وقابلية الذوبان تختلف كثيراً بين المنتجات.']
      });
    case 'hydrocolloid':
      return buildScienceMeta({
        ...common,
        confidence: 'medium',
        basis: 'identity-plus-process-heuristic',
        variableFields: ['waterFrac', 'density'],
        notes: ['وظيفة التثخين أو الجلترة لا تُقرأ من التركيب وحده، بل من الوسط الحراري والقص ونسبة الترطيب أيضاً.']
      });
    case 'leavener':
      return buildScienceMeta({
        ...common,
        confidence: 'medium',
        referenceIds: ['acs_baking_soda'],
        basis: 'identity-plus-process-heuristic',
        notes: ['وظيفة الرفع ليست خاصية تركيبية ثابتة للمكوّن وحده؛ بل تعتمد على الوسط الحمضي، الماء، والحرارة.']
      });
    default:
      return buildScienceMeta(common);
  }
}
function describeScienceConfidence(confidence) {
  if (confidence === 'high') return 'مرتفعة';
  if (confidence === 'medium') return 'متوسطة';
  if (confidence === 'low') return 'منخفضة';
  return 'غير محددة';
}
const INGREDIENT_FIELD_SPECS = Object.freeze({
  density: Object.freeze({ label: 'الكثافة المستخدمة', kind: 'process-sensitive' }),
  waterFrac: Object.freeze({ label: 'جزء الماء', kind: 'composition' }),
  sugarFrac: Object.freeze({ label: 'جزء السكريات الكلية', kind: 'composition' }),
  fatFrac: Object.freeze({ label: 'جزء الدهون', kind: 'composition' }),
  proteinFrac: Object.freeze({ label: 'جزء البروتين', kind: 'composition' }),
  starchFrac: Object.freeze({ label: 'جزء النشا', kind: 'composition' }),
  otherSolidsFrac: Object.freeze({ label: 'جزء المواد الصلبة الأخرى', kind: 'composition' }),
  milkSolidsFrac: Object.freeze({ label: 'جزء المواد الصلبة اللبنية', kind: 'composition' }),
  cocoaSolidsFrac: Object.freeze({ label: 'جزء المواد الصلبة الكاكاوية', kind: 'composition' }),
  phospholipidsFrac: Object.freeze({ label: 'جزء الفوسفوليبيدات', kind: 'composition' }),
  carbsFrac: Object.freeze({ label: 'جزء الكربوهيدرات الأخرى', kind: 'composition' }),
  water: Object.freeze({ label: 'جزء الماء', kind: 'composition' }),
  sugar: Object.freeze({ label: 'جزء السكريات الكلية', kind: 'composition' }),
  fat: Object.freeze({ label: 'جزء الدهون', kind: 'composition' }),
  protein: Object.freeze({ label: 'جزء البروتين', kind: 'composition' }),
  starch: Object.freeze({ label: 'جزء النشا', kind: 'composition' }),
  otherSolids: Object.freeze({ label: 'جزء المواد الصلبة الأخرى', kind: 'composition' }),
  milkSolids: Object.freeze({ label: 'جزء المواد الصلبة اللبنية', kind: 'composition' }),
  cocoaSolids: Object.freeze({ label: 'جزء المواد الصلبة الكاكاوية', kind: 'composition' }),
  phospholipids: Object.freeze({ label: 'جزء الفوسفوليبيدات', kind: 'composition' }),
  carbs: Object.freeze({ label: 'جزء الكربوهيدرات الأخرى', kind: 'composition' }),
  fructose: Object.freeze({ label: 'فركتوز', kind: 'composition' }),
  glucose: Object.freeze({ label: 'جلوكوز', kind: 'composition' }),
  sucrose: Object.freeze({ label: 'سكروز', kind: 'composition' }),
  lactose: Object.freeze({ label: 'لاكتوز', kind: 'composition' }),
  pH: Object.freeze({ label: 'الرقم الهيدروجيني (pH)', kind: 'process-sensitive' }),
  acidity: Object.freeze({ label: 'الطبيعة الحمضية', kind: 'process-sensitive' }),
  minTemp: Object.freeze({ label: 'أدنى حرارة تشغيلية', kind: 'process-sensitive' }),
  maxTemp: Object.freeze({ label: 'أعلى حرارة تشغيلية', kind: 'process-sensitive' })
});

function inferFieldBasis(meta, fieldName, fieldSpec) {
  if (meta?.fieldBasis?.[fieldName]) return meta.fieldBasis[fieldName];
  if (fieldSpec?.kind === 'process-sensitive') {
    if (fieldName === 'density') return 'process-derived-reference';
    if (fieldName === 'pH') return meta?.basis || 'reference-composition';
    return 'process-heuristic';
  }
  return meta?.basis || 'reference-composition';
}

function normalizeFieldValue(value, fieldName) {
  if (!Number.isFinite(value)) return String(value ?? '—');
  if (fieldName === 'density') return `${value.toFixed(2)} جم/مل`;
  if (fieldName === 'pH') return value.toFixed(2);
  if (value >= 0 && value <= 1) return `${(value * 100).toFixed(1)}٪`;
  return value.toFixed(2);
}
function getIngredientFieldAuditRows(ing) {
  if (!ing) return [];
  const meta = ing.scienceMeta || getDefaultScienceMetaForType(ing.type);
  return Object.entries(INGREDIENT_FIELD_SPECS)
    .filter(([fieldName]) => Object.prototype.hasOwnProperty.call(ing, fieldName) && ing[fieldName] != null)
    .map(([fieldName, fieldSpec]) => ({
      fieldName,
      label: fieldSpec.label,
      value: ing[fieldName],
      displayValue: normalizeFieldValue(ing[fieldName], fieldName),
      confidence: meta?.fieldConfidence?.[fieldName] || meta?.confidence || 'low',
      basis: inferFieldBasis(meta, fieldName, fieldSpec),
      variable: Array.isArray(meta?.variableFields) ? meta.variableFields.includes(fieldName) : false
    }));
}
function confidenceToNumeric(confidence) {
  if (confidence === 'high') return 1;
  if (confidence === 'medium') return 0.72;
  if (confidence === 'low') return 0.42;
  return 0.42;
}
function numericToConfidence(score) {
  if (!Number.isFinite(score)) return 'low';
  if (score >= 0.82) return 'high';
  if (score >= 0.60) return 'medium';
  return 'low';
}

function basisFactor(basis) {
  const map = {
    'reference-composition': 1,
    'process-derived-reference': 0.88,
    'identity-plus-process-heuristic': 0.76,
    'typical-commercial-spec': 0.74,
    'recipe-heuristic': 0.62,
    'process-heuristic': 0.56,
    'missing-data-fallback': 0.40
  };
  return map[basis] ?? 0.60;
}
function summarizeScienceEntries(entries = [], { extraPenalty = 0, extraNotes = [] } = {}) {
  const valid = (entries || []).filter(e => e && e.meta && Number.isFinite(e.weight) && e.weight > 0);
  if (!valid.length) {
    return {
      score: 0.42,
      confidence: 'low',
      summaryLabel: 'منخفضة',
      notes: ['لا توجد مدخلات مرجعية كافية لحساب درجة ثقة معبرة.'],
      weakest: []
    };
  }

  const totalWeight = valid.reduce((s, e) => s + e.weight, 0) || 1;
  let weighted = 0;
  const ranked = [];
  for (const entry of valid) {
    const meta = entry.meta || {};
    const conf = meta.confidence || 'low';
    const score = confidenceToNumeric(conf) * basisFactor(meta.basis);
    weighted += entry.weight * score;
    ranked.push({
      name: entry.name || entry.id || 'مكوّن غير مسمى',
      weight: entry.weight,
      score,
      confidence: conf,
      basis: meta.basis || 'reference-composition',
      variableFields: Array.isArray(meta.variableFields) ? meta.variableFields : []
    });
  }
  let finalScore = weighted / totalWeight;
  finalScore = Math.max(0.1, Math.min(1, finalScore - (extraPenalty || 0)));
  const confidence = numericToConfidence(finalScore);
  ranked.sort((a,b) => a.score - b.score);
  const weakest = ranked.slice(0, 3);
  const notes = [];
  if (confidence === 'high') notes.push('أغلب مدخلات هذه القراءة مبنية على مراجع تركيبية/تشغيلية جيدة نسبيًا.');
  if (confidence === 'medium') notes.push('القراءة الحالية مفيدة عمليًا، لكن جزءًا من القيم أو التحويلات ما زال يعتمد على نطاقات مرجعية أو اشتقاق تشغيلي.');
  if (confidence === 'low') notes.push('القراءة الحالية يجب فهمها كتقدير إرشادي أكثر من كونها قياسًا صلبًا، لأن بعض المدخلات أو التحويلات منخفضة الثقة أو heuristic بطبيعتها.');
  weakest.forEach(item => {
    notes.push(`أضعف مدخلات الثقة نسبيًا: ${item.name} (${describeScienceConfidence(item.confidence)}، ${formatScienceBasisLabel(item.basis)}${item.variableFields.length ? `، حقول متغيرة: ${item.variableFields.join('، ')}` : ''}).`);
  });
  notes.push(...(extraNotes || []));
  return {
    score: finalScore,
    confidence,
    summaryLabel: describeScienceConfidence(confidence),
    notes,
    weakest
  };
}
function formatScienceBasisLabel(basis) {
  const map = {
    'reference-composition': 'مرجع تركيبي تقريبي',
    'identity-plus-process-heuristic': 'مرجع هوية + heuristic تشغيلية',
    'process-derived-reference': 'مرجع مستنتج من منتج/عملية',
    'recipe-heuristic': 'heuristic وصفية/وصفة',
    'process-heuristic': 'heuristic تشغيلية',
    'typical-commercial-spec': 'مواصفة تجارية/صناعية تقريبية',
    'missing-data-fallback': 'fallback لغياب البيانات'
  };
  return map[basis] || basis || '—';
}
