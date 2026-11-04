/* offline build: dough-profiles.js */
function hasIdSet(formula) {
  return new Set((formula?.items || []).filter(i => (Number(i?.weight) || 0) > 0).map(i => i.ingredientId));
}

function massById(formula, id) {
  return (formula?.items || []).filter(i => i.ingredientId === id).reduce((s, i) => s + (Number(i.weight) || 0), 0);
}

function flourMass(formula, ingredientsDB) {
  return (formula?.items || []).reduce((s, item) => {
    const ing = getIngredient(ingredientsDB, item.ingredientId);
    return s + ((ing.type === 'flour') ? (Number(item.weight) || 0) : 0);
  }, 0);
}
const DOUGH_PROFILES = {
  classic_cooked_honey_soda_medovik: {
    id: 'classic_cooked_honey_soda_medovik',
    displayName: 'عجين ميدوفيك مطهو بالعسل + زبدة + بيض + بيكنج صودا',
    processClass: 'cooked-honey-butter-sheet-dough',
    mixingFamily: 'heated sweet-fat base, eggs incorporated off heat, soda expansion, then flour addition and thin rolled sheets',
    targetBands: {
      totalSweetenersOnFlour: { min: 0.48, max: 0.72, label: 'محليات كلية/دقيق' },
      honeyOnFlour: { min: 0.18, max: 0.38, label: 'عسل/دقيق' },
      butterOnFlour: { min: 0.18, max: 0.36, label: 'زبدة/دقيق' },
      eggOnFlour: { min: 0.12, max: 0.30, label: 'بيض/دقيق' },
      sodaOnFlour: { min: 0.008, max: 0.020, label: 'صودا/دقيق' },
      waterOnFlour: { min: 0.26, max: 0.42, label: 'ماء تقريبي/دقيق' },
      bakedDensity: { min: 1.00, max: 1.18, label: 'كثافة الطبقات المخبوزة' },
      finalMoisture: { min: 0.05, max: 0.09, label: 'رطوبة نهائية تقريبية' },
      porosity: { min: 0.10, max: 0.22, label: 'مسامية الطبقات' }
    },
    weightBasis: 'وزن العجين الخام شيء، ووزن الطبقات بعد الخَبز شيء آخر. في هذا النظام تُفقد كمية معتبرة من الماء أثناء الخَبز، بينما تبقى غالبية السكريات والدهون والمواد الصلبة داخل الطبقات.',
    criticalControls: [
      'تسخين العسل/السكر/الزبدة حتى الذوبان والتجانس فقط، لا إلى طبخ كراميلي غير مقصود.',
      'إدخال البيض بعد خفض الحرارة بما يكفي حتى لا يتخثر، مع استمرار المزج السريع.',
      'إضافة الصودا في طور يوجد فيه ماء ووسط حمضي/عسلي مناسب، مع توقع رغوة وتمدد مؤقتين لا ينبغي إساءة تفسيرهما كتهوية بنيوية دائمة.',
      'إضافة الدقيق حتى الوصول إلى عجين طري قابل للفرد بعد الراحة، لا عجين جاف قاسٍ منذ البداية.',
      'فرد الطبقات رفيعة ومتشابهة ثم الخَبز حتى تثبيت وتجفيف نسبي لا حتى جفاف محروق.'
    ],
    stopCues: [
      'القاعدة المسخنة متجانسة لامعة بلا انفصال دهن واضح.',
      'بعد إضافة الدقيق يصبح العجين طرياً لكنه قابلاً للتجميع ولا يسيل كسائل.',
      'الطبقة قبل الخَبز تفرد رقيقة بانتظام ولا ترتد بقوة كما ترتد عجائن الجلوتين الأعلى.',
      'الطبقات بعد الخَبز جافة سطحياً ومرنة-هشة بشكل خفيف، لا رطبة خامة ولا متفحمة.'
    ],
    failureSignals: [
      'طعم قلوي/صابوني: صودا زائدة أو تعادل حمضي ضعيف أو خَبز غير كافٍ.',
      'طبقات قاسية جداً: دقيق زائد أو فقد ماء أكبر من اللازم أو خَبز مفرط.',
      'طبقات رخوة/لزجة: تجفيف غير كافٍ أو ماء أولي مرتفع أكثر من اللازم.',
      'انكماش قوي أثناء الفرد أو بعد الخَبز: تطوير جلوتين/راحة غير كافية أو دقيق أعلى قوة مما افترضه النظام.'
    ],
    calibrationNotes: [
      'هذا الملف مرجعي لعائلة الميدوفيك الرقيقة المطهوة بالعسل، لا لكل عجائن العسل الروسية أو طبقات الكيك المشابهة.',
      'وجود الصودا هنا يخدم التفاعل الحمضي-القاعدي أولاً ثم يكمّل بقدر من التفكك الحراري أثناء الخَبز؛ لذلك رقم الصودا وحده لا يكفي دون النظر إلى العسل وباقي السوائل.',
      'كثافة الطبقات المخبوزة الفعالة ليست كثافة العجين الخام؛ هي ناتج رطوبة نهائية + مسامية + تركيب صلب/دهن/سكر.'
    ],
    scientificBasis: [
      'العسل يوفّر ماءً وسكريات مختزِلة ومواد صلبة مذابة، فيؤثر في الحلاوة، اللون، الاحتفاظ بالرطوبة، ولزوجة القاعدة المسخنة.',
      'بيكنج صودا يعمل عبر تفاعل حمضي-قاعدي بوجود حمض مناسب، كما يمكنه إطلاق مزيد من ثاني أكسيد الكربون بالتفكك الحراري أثناء الخَبز.',
      'طبقات الميدوفيك الرقيقة أقرب في منطقها الرطوبي إلى صفائح عجين/بسكويت رقيق من كيك إسفنجي؛ لذلك عائد الخَبز يجب أن يفصل الخام عن المخبوز.'
    ],
    stages: [
      {
        title: 'المرحلة 1: تسخين قاعدة العسل/السكر/الزبدة',
        summary: 'تسخين المكوّنات الحلوة والدهنية حتى الذوبان والتجانس دون دفعها إلى كراملة غير مقصودة.',
        action: 'ضع العسل والسكر والزبدة في حمام مائي أو نار هادئة وحرّك حتى يذوب السكر ويصبح الخليط متجانساً ولامعاً.',
        controls: ['حرارة معتدلة', 'تحريك مستمر', 'منع انفصال الدهن أو غليان عنيف'],
        stopCues: ['السكر ذاب بصرياً', 'الخليط متجانس ولامع'],
        failureSignals: ['رائحة كراميل قوية مبكرة', 'انفصال دهن واضح', 'سخونة زائدة تجعل إدخال البيض خطراً'],
        science: 'هذه المرحلة تذيب السكريات وتوزّع الماء والدهن تمهيداً لدخول البيض والصودا بصورة أكثر تجانساً.'
      },
      {
        title: 'المرحلة 2: إدخال البيض خارج الذروة الحرارية',
        summary: 'يُدخل البيض بعد خفض الحرارة بما يكفي لمنع التخثر مع استمرار المزج السريع.',
        action: 'ارفع الوعاء من الحرارة، اتركه يهدأ قليلاً، ثم أضف البيض تدريجياً مع الخلط حتى يعود الخليط متجانساً.',
        controls: ['خفض الحرارة قبل البيض', 'إضافة تدريجية', 'مراقبة التجانس'],
        stopCues: ['لا تظهر رقائق بيض مطبوخ', 'القوام ناعم ومتجانس بعد الإدخال'],
        failureSignals: ['تخثر أو حبيبات بروتينية', 'انفصال دهني بعد البيض'],
        science: 'إدخال البيض مبكراً جداً يسبب تخثر البروتينات ويكسر الأساس الاستحلابي للعجين.'
      },
      {
        title: 'المرحلة 3: الصودا والتمدد الرغوي الأولي',
        summary: 'الصودا تُدخل لتوليد رغوة وتمدد مؤقتين يساعدان في تفتيح القاعدة قبل إضافة الدقيق.',
        action: 'أضف الصودا وراقب الفوران والانتفاخ المؤقت، ثم حرّك حتى ينتظم القوام.',
        controls: ['وجود ماء كافٍ', 'عدم الإفراط في الصودا', 'قراءة التمدد كرغوة مؤقتة لا كرفع نهائي'],
        stopCues: ['انتفاخ مؤقت ثم عودة القوام إلى قاعدة رغوية أكثر خفة'],
        failureSignals: ['طعم قلوي لاحقاً', 'فوران ضعيف جداً مع صودا مرتفعة أو عسل منخفض'],
        science: 'جزء من عمل الصودا هنا حمضي-قاعدي، ويُستكمل جزء آخر أثناء الخَبز بالتفكك الحراري.'
      },
      {
        title: 'المرحلة 4: إضافة الدقيق وتكوين العجين',
        summary: 'يُضاف الدقيق حتى يتكوّن عجين طري قابل للفرد بعد الراحة، لا عجين جاف من البداية.',
        action: 'أضف الدقيق تدريجياً وقلّب حتى يختفي الجاف ويتكوّن عجين لين متماسك.',
        controls: ['عدم الإغراق بالدقيق', 'خلط حتى التجانس فقط', 'الانتباه لقوة الدقيق الفعلية'],
        stopCues: ['العجين يجتمع ولا يسيل كسائل', 'ما زال طرياً وقابلاً للتنعيم بالراحة'],
        failureSignals: ['قاسٍ منذ البداية', 'لزج جداً مع عجز عن التماسك'],
        science: 'في هذا النظام لا نبحث عن تطوير جلوتين مرتفع؛ الدقيق هنا هيكل + نشا أكثر من كونه شبكة خبز مطاطية.'
      },
      {
        title: 'المرحلة 5: الراحة والفرد إلى طبقات رقيقة',
        summary: 'الراحة القصيرة تساعد على تجانس الرطوبة وسهولة الفرد وتقليل الارتداد.',
        action: 'اترك العجين يهدأ ثم افرده إلى طبقات متشابهة الرقة بسمك محسوب.',
        controls: ['راحة كافية', 'سمك متقارب بين الطبقات', 'أقل دقيق إضافي ممكن أثناء الفرد'],
        stopCues: ['الفرد يتم دون ارتداد قوي', 'السماكة متقاربة بين الأقراص'],
        failureSignals: ['ارتداد وانكماش', 'حاجة مستمرة لدقيق كثير على الرخامة'],
        science: 'توزع الماء داخل العجين يؤثر مباشرة في الفرد وتكرارية السماكة بين الطبقات.'
      },
      {
        title: 'المرحلة 6: الخَبز إلى تثبيت وتجفيف نسبي',
        summary: 'تُخبز الطبقات حتى تثبت وتفقد جزءاً من الماء، لا حتى تصبح محروقة أو شديدة الجفاف.',
        action: 'اخبز كل طبقة حتى تثبت ويجف سطحها مع لون ذهبي-عسلي مناسب، ثم برّدها تماماً قبل التجميع.',
        controls: ['مراقبة اللون', 'مراقبة الجفاف السطحي', 'منع الإفراط في الخَبز'],
        stopCues: ['السطح جاف نسبيًا', 'الطبقة تحمل نفسها بعد الخروج والتبريد'],
        failureSignals: ['قساوة مفرطة', 'رطوبة/لزوجة خامة', 'اسمرار مفرط بطعم مر'],
        science: 'الوزن المخبوز النهائي تحكمه الرطوبة المتبقية والمسامية، لا مجموع الأوزان الخام وحده.'
      }
    ],
    confidence: 'medium',
    sourceMeta: {
      defaultFormula: [
        { key: 'flour', weight: 500 },
        { key: 'sugar', weight: 200 },
        { key: 'honey', weight: 150 },
        { key: 'butter', weight: 150 },
        { key: 'eggs', weight: 100 },
        { key: 'baking-soda', weight: 10 }
      ],
      origin: 'الملف المرجعي الافتراضي للمشروع',
      protocolVersion: 'structured-v1'
    }
  }
};

function withinBand(value, band) {
  if (!Number.isFinite(value) || !band) return null;
  if (value < band.min) return 'below';
  if (value > band.max) return 'above';
  return 'within';
}
function inferCurrentDoughProfile(formula, ingredientsDB) {
  if (formula?.sourceDoughId && DOUGH_PROFILES[formula.sourceDoughId]) {
    return DOUGH_PROFILES[formula.sourceDoughId];
  }
  const ids = hasIdSet(formula);
  const flour = flourMass(formula, ingredientsDB);
  const honey = massById(formula, 'honey');
  const butter = massById(formula, 'butter');
  const eggs = massById(formula, 'eggs');
  const soda = massById(formula, 'baking-soda');
  if (flour > 0 && ids.has('honey') && ids.has('butter') && ids.has('eggs') && ids.has('baking-soda')) {
    return DOUGH_PROFILES.classic_cooked_honey_soda_medovik;
  }
  // ما زلنا نعيد نفس الملف كأساس مقارنة إذا بقيت البنية العامة قريبة، لكن بثقة أقل.
  if (flour > 0 && (honey > 0 || soda > 0) && (butter > 0 || eggs > 0)) {
    return {
      ...DOUGH_PROFILES.classic_cooked_honey_soda_medovik,
      id: 'custom_honey_sheet_dough',
      displayName: 'عجين عسل/طبقات مخصص قريب من عائلة الميدوفيك',
      confidence: 'low',
      calibrationNotes: [
        'الوصفة الحالية ليست مطابقة تماماً للملف المرجعي الكلاسيكي، لذلك يجب قراءة النطاقات هنا كمرجع معايرة لا كحكم صلاحية قطعي.',
        ...DOUGH_PROFILES.classic_cooked_honey_soda_medovik.calibrationNotes
      ]
    };
  }
  return null;
}
function evaluateDoughAgainstProfile(metrics, profile) {
  if (!metrics || !profile?.targetBands) return null;
  const out = {};
  Object.entries(profile.targetBands).forEach(([key, band]) => {
    const value = metrics[key];
    out[key] = {
      value,
      band,
      status: withinBand(value, band)
    };
  });
  return out;
}


function inferDoughStageKind(title = '') {
  const text = String(title || '');
  if (/تسخين|حرار/i.test(text)) return 'heating';
  if (/بيض|صودا|دقيق|تكوين/i.test(text)) return 'mixing';
  if (/راحة|فرد/i.test(text)) return 'sheeting';
  if (/خبز|تجفيف/i.test(text)) return 'baking';
  return 'process';
}

function cloneDoughStage(stage) {
  if (!stage) return null;
  return Object.freeze({
    title: stage.title || '',
    stageKind: stage.stageKind || inferDoughStageKind(stage.title || ''),
    summary: stage.summary || '',
    bullets: [stage.action, ...(Array.isArray(stage.bullets) ? stage.bullets : [])].filter(Boolean),
    controls: Array.isArray(stage.controls) ? stage.controls.slice() : [],
    stopCues: Array.isArray(stage.stopCues) ? stage.stopCues.slice() : [],
    failureSignals: Array.isArray(stage.failureSignals) ? stage.failureSignals.slice() : [],
    scientificBasis: [stage.science, ...(Array.isArray(stage.scientificBasis) ? stage.scientificBasis : [])].filter(Boolean),
    tempCues: Array.isArray(stage.tempCues) ? stage.tempCues.slice() : [],
    timeCues: Array.isArray(stage.timeCues) ? stage.timeCues.slice() : [],
    calibrationNotes: Array.isArray(stage.calibrationNotes) ? stage.calibrationNotes.slice() : []
  });
}

function buildMasterDoughTemplate(profile) {
  if (!profile || !profile.sourceMeta?.defaultFormula) return null;
  return Object.freeze({
    id: profile.id,
    shortName: 'كلاسيك - عجين عسل مطهو + صودا + زبدة + بيض',
    name: profile.displayName,
    origin: profile.sourceMeta.origin || 'مرجع عجين',
    base: profile.sourceMeta.defaultFormula.map(item => Object.freeze({ ...item })),
    profile,
    overview: [
      `${profile.displayName}: نظام عجين ماستر مرجعي لتخطيط دفعة الميدوفيك قبل السكيلنج والتنفيذ.`,
      'أي تعديل يدوي في جدول العجين أو في الحلاوة التي تمر عبر العجين يكسر رابط الماستر ويحوّل الوصفة إلى Custom mode.'
    ],
    protocolSource: profile.sourceMeta.protocolVersion || 'structured-v1',
    protocol: (profile.stages || []).map(cloneDoughStage)
  });
}

const MASTER_DOUGH_TEMPLATES = Object.freeze(
  Object.values(DOUGH_PROFILES).map(buildMasterDoughTemplate).filter(Boolean)
);

function getMasterDoughTemplate(id) {
  return MASTER_DOUGH_TEMPLATES.find(item => item.id === id) || null;
}

function getMasterDoughs() {
  return MASTER_DOUGH_TEMPLATES.slice();
}

function getMasterDoughProfile(id) {
  return DOUGH_PROFILES[id] || null;
}
