// =============================================================================
// Medovik Workflow v6 - Protocol Authority
// Structured protocol content. Numeric controls are used only when explicit or
// legitimately derived. No fake precision is introduced.
// =============================================================================
(function(global) {
  'use strict';

  const FULL = global.PROTOCOL_COMPLETENESS?.FULL || 'full';
  const PARTIAL = global.PROTOCOL_COMPLETENESS?.PARTIAL || 'partial';
  const REF_ONLY = global.PROTOCOL_COMPLETENESS?.REFERENCE_ONLY || 'reference-only';
  const SINGLE_FILLING_SCOPE = 'single-filling-v6';
  const READY_DOUGH_IDS = Object.freeze(['ayaHabib', 'hebaAbuElKhair', 'ahmedYounis']);
  const READY_FILLING_IDS = Object.freeze(['classic_sourcream_frosting', 'classic_dulce_sourcream', 'shouqi_1', 'ayahabib']);
  const EXPLICIT = global.PROTOCOL_CONFIDENCE?.EXPLICIT || 'explicit';
  const DERIVED = global.PROTOCOL_CONFIDENCE?.DERIVED || 'derived';
  const EDITORIAL = global.PROTOCOL_CONFIDENCE?.EDITORIAL || 'editorial';
  const UNKNOWN = global.PROTOCOL_CONFIDENCE?.UNKNOWN || 'unknown';

  function arrayify(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizePhase(phase, defaults) {
    return typeof global.normalizeProtocolPhase === 'function'
      ? global.normalizeProtocolPhase(phase, defaults)
      : phase;
  }

  function stepFromFreeText(text, phaseId, sourceId, index) {
    const action = String(text || '').trim();
    const controls = [{
      type: 'event',
      label: 'تعليمة المصدر',
      text: 'اتبع الحرارة أو الزمن أو علامة القوام كما وردت في نص الخطوة أعلاه؛ لا يستخرج التطبيق رقمًا آليًا من جملة قد تحمل سياقًا مختلفًا.',
      confidence: UNKNOWN
    }];

    return {
      id: `${sourceId}-${index + 1}`,
      phaseId,
      operatorAction: action,
      purpose: null,
      inputs: [],
      tools: [],
      controls,
      sensoryCues: [],
      readinessGate: {
        condition: 'انتقل فقط بعد تحقق النص التشغيلي لهذه الخطوة.',
        blockers: [],
        warning: 'إذا كان النص عامًا أو غير كافٍ، تعامل معه كمرجع جزئي لا كخطوة تشغيل مكتملة.'
      },
      failureSignals: [],
      outputState: null,
      scienceRef: null,
      provenance: {
        sourceType: 'recipe',
        sourceId,
        completeness: PARTIAL
      }
    };
  }

  const DOUGH_PROTOCOLS = {
    ayaHabib: [
      {
        id: 'aya-heat-base',
        title: 'بناء القاعدة الحرارية الأولى',
        phaseId: 'dough',
        operatorAction: 'ضع الزبدة والسكر والعسل في قدر عميق ثقيل. سخّن مع التحريك المستمر حتى تدخل الكتلة مجال تشغيل عملي قريب من 75–85°م وتبقى فيه فقط حتى يذوب السكر تمامًا ويصبح السطح لامعًا ومتجانسًا. إذا اقتربت من 90°م أو تحوّل الغليان إلى عنيف من الوسط، تعامل مع ذلك كتحذير تشغيلي وارفع القدر من النار فورًا واهدأ بالتحريك قبل المتابعة.',
        purpose: 'بناء أساس حراري متجانس قبل الصودا والبيض مع تقليل خطر التغميق المبكر ورفع HMF غير الضروري.',
        inputs: [
          { ingredientId: 'butter', amount: 180, unit: 'g', note: null },
          { ingredientId: 'sugar', amount: 200, unit: 'g', note: null },
          { ingredientId: 'honey', amount: 130, unit: 'g', note: null }
        ],
        tools: ['قدر عميق ثقيل', 'سباتولا أو ملعقة مقاومة للحرارة', 'ترمومتر حراري'],
        controls: [
          { type: 'temperature', label: 'نافذة تشغيل عملية', value: null, min: 75, max: 85, unit: '°م', confidence: EDITORIAL, text: null },
          { type: 'time', label: 'نافذة الوصول المعتادة', value: null, min: 5, max: 7, unit: 'دقيقة', confidence: DERIVED, text: null },
          { type: 'gate', label: 'حد تحذيري', text: 'تعامل مع الاقتراب من 90°م أو الغليان العنيف من الوسط كمنطقة إنذار تشغيلية، لا كهدف أو علامة نضج.', confidence: EDITORIAL }
        ],
        sensoryCues: [
          { channel: 'visual', cue: 'اختفاء البلورات الظاهرة والسطح يصبح لامعًا ومتجانسًا مع فقاعات خفيفة من الأطراف فقط.' },
          { channel: 'olfactory', cue: 'رائحة عسلية نظيفة بلا احتراق أو كراملة حادة.' }
        ],
        readinessGate: {
          condition: 'القاعدة داخل المجال الحراري الصحيح، والسكر ذائب، والسطح متجانس بلا انفصال دهني.',
          blockers: ['بلورات سكر ظاهرة', 'غليان عنيف من المركز', 'لون داكن سريع', 'وصول مستمر إلى 90°م أو أكثر'],
          warning: 'الحرارة والسلوك السطحي هما الكنترول الأول هنا؛ لا تنتقل لمجرد مرور وقت ولا تتعامل مع 75–85°م كقانون علمي عام لكل الأنظمة.'
        },
        failureSignals: [
          { signal: 'تغميق سريع أو رائحة احتراق', cause: 'حرارة أعلى من اللازم أو بقاء طويل فوق المجال العملي', fix: 'ارفع القدر فورًا من النار واستمر بالتحريك حتى يهبط الغليان ثم عُد بحرارة ألطف', severity: 'recoverable' },
          { signal: 'بلورات سكر باقية رغم الحرارة', cause: 'تحريك غير كافٍ أو توزيع حرارة ضعيف', fix: 'استمر داخل نافذة التشغيل العملية نفسها مع تحريك أوسع قبل المتابعة', severity: 'recoverable' }
        ],
        outputState: 'أساس حراري متجانس جاهز لإضافة الصودا.',
        scienceRef: 'dough-honey-base',
        provenance: { sourceType: 'editorial', sourceId: 'ayaHabib', completeness: FULL }
      },
      {
        id: 'aya-add-soda',
        title: 'إضافة الصودا وتوزيعها من دون فقد السيطرة',
        phaseId: 'dough',
        operatorAction: 'أخرج القدر من النار بينما ما تزال القاعدة في المنطقة الساخنة الفعالة، ثم أضف الصودا كلها وحرّك فورًا وبشكل ثابت حتى تتوزع بالكامل. راقب الفوران كحدث كيميائي: المطلوب ارتفاع واضح ومتجانس ثم هدوء نسبي، لا فورانًا رقعيًا ولا غليانًا عنيفًا.',
        purpose: 'توزيع الصودا وإتاحة تفاعلها الجزئي ورفع pH التشغيلي من دون خلق جيوب قلوية أو فقد السيطرة الحرارية.',
        inputs: [{ ingredientId: 'baking-soda', amount: 12, unit: 'g', note: null }],
        tools: ['ملعقة خلط', 'ترمومتر حراري'],
        controls: [
          { type: 'temperature', label: 'حرارة الإضافة', value: null, min: 75, max: 85, unit: '°م', confidence: EXPLICIT, text: null },
          { type: 'event', label: 'إشارة التفاعل', text: 'فوران واضح ومتجانس ثم هدوء تدريجي', confidence: EXPLICIT },
          { type: 'gate', label: 'شرط الإضافة', text: 'تُضاف الصودا خارج النار لا بعد أن تبرد القاعدة إلى منطقة خاملة.', confidence: EXPLICIT }
        ],
        sensoryCues: [
          { channel: 'visual', cue: 'يرتفع الحجم بسرعة ثم يستقر نسبيًا من دون جيوب بيضاء أو رغوة غير متجانسة.' },
          { channel: 'olfactory', cue: 'لا تظهر رائحة قلوية حادة أو احتراق.' }
        ],
        readinessGate: {
          condition: 'انتهى الفوران النشط وأصبحت القاعدة متجانسة اللون والقوام بلا جيوب صودا.',
          blockers: ['فوران ضعيف جدًا أو متأخر', 'رقع بيضاء/بودرية', 'رائحة قلوية حادة', 'غليان عنيف بعد الإضافة'],
          warning: 'إذا بردت القاعدة أكثر من اللازم فقد يضعف الفوران الظاهر؛ أعدها بلطف إلى المنطقة الساخنة الفعالة بدل المتابعة العمياء.'
        },
        failureSignals: [
          { signal: 'غياب الفوران أو ضعفه الشديد', cause: 'برودة القاعدة أو ضعف توزيع الصودا', fix: 'حرّك بقوة أولًا، ثم أعد تسخينًا لطيفًا فقط حتى تعود القاعدة إلى 75–85°م إذا لزم', severity: 'critical' },
          { signal: 'رغوة رقعية أو جيوب صودا', cause: 'توزيع غير متجانس', fix: 'استمر في الخلط قبل أي خطوة لاحقة ولا تنتقل حتى تختفي الجيوب', severity: 'recoverable' }
        ],
        outputState: 'قاعدة متجانسة بعد إضافة الصودا وجاهزة للهبوط الحراري قبل البيض.',
        scienceRef: 'dough-soda-reaction',
        provenance: { sourceType: 'editorial', sourceId: 'ayaHabib', completeness: FULL }
      },
      {
        id: 'aya-add-eggs',
        title: 'إدخال البيض بأمان',
        phaseId: 'dough',
        operatorAction: 'دع القاعدة تهبط إلى 70–80°م قبل أول دفعة بيض. اخفق البيض منفصلًا ثم أضفه على 4 دفعات متقاربة، مع خفق نشط 10–15 ثانية بعد كل دفعة حتى تعود الكتلة ناعمة بالكامل. إذا ظهر أي خيط أو حبيبات بيض مطبوخ، أوقف الإضافة فورًا ولا تعتمد على الخفق وحده لتجاهل المشكلة.',
        purpose: 'إدخال البيض كمرطب ورابط من دون تخثر موضعي أو تكوين حبيبات مطبوخة تفسد القوام.',
        inputs: [{ ingredientId: 'eggs', amount: 150, unit: 'g', note: '3 بيضات كبيرة تقريبًا' }],
        tools: ['مضرب يدوي', 'ترمومتر حراري'],
        controls: [
          { type: 'temperature', label: 'حرارة القاعدة قبل أول دفعة بيض', value: null, min: 70, max: 80, unit: '°م', confidence: EDITORIAL, text: null },
          { type: 'time', label: 'الخفق بعد كل دفعة', value: null, min: 10, max: 15, unit: 'ثانية', confidence: EXPLICIT, text: null },
          { type: 'gate', label: 'حد الأمان بعد الدمج', text: 'لا تنتقل إذا بقيت الكتلة فوق 70°م مع ظهور تخثر مرئي أو شرائط بيض.', confidence: EXPLICIT }
        ],
        sensoryCues: [
          { channel: 'visual', cue: 'الخليط ناعم ولامع بعد كل دفعة بلا خيوط أو حبيبات بيض.' },
          { channel: 'texture', cue: 'الكتلة تبقى سائلة متجانسة ولا تتحول إلى حبيبات.' }
        ],
        readinessGate: {
          condition: 'اندماج كل البيض بالكامل والكتلة ناعمة ومتجانسة بلا تخثر مرئي.',
          blockers: ['حبيبات أو شرائط بيض مطبوخ', 'إضافة دفعة جديدة قبل امتصاص السابقة', 'حرارة قاعدة خارج نافذة 70–80°م عند البداية'],
          warning: 'هذه الخطوة حرارية بامتياز؛ إذا شككت بالحرارة افتح حاسبة التمبرنج.'
        },
        failureSignals: [
          { signal: 'ظهور حبيبات بيض', cause: 'إضافة البيض بينما القاعدة ساخنة أكثر من اللازم أو بسرعة عالية', fix: 'أوقف الإضافة فورًا، اخفق بقوة لتقييم إمكانية الاسترداد، ولا تضف المزيد حتى تعود الكتلة ناعمة', severity: 'critical' }
        ],
        outputState: 'كتلة ناعمة جاهزة لإغلاق العجين بالدقيق.',
        scienceRef: 'egg-tempering',
        provenance: { sourceType: 'editorial', sourceId: 'ayaHabib', completeness: FULL }
      },
      {
        id: 'aya-add-flour',
        title: 'إغلاق العجين بالقوام الصحيح',
        phaseId: 'dough',
        operatorAction: 'أضف الدقيق والملح تدريجيًا مع الدمج بعد كل إضافة حتى تختفي الجيوب الجافة وتتكون كتلة متماسكة. توقف عندما تحصل على عجين طري متجانس يمسك نفسه، لا عندما يصبح جافًا صلبًا داخل القدر. غطِّ العجين بعد التكوين، وافحص قابليته للفرد وهو دافئ: إذا فرد من دون تمزق أو ارتداد حاد استخدمه، وإذا لطخ السطح أو انكمش سريعًا فاتركه يهدأ أو برّده قليلًا ثم أعد التقييم.',
        purpose: 'بناء matrix عجين قابلة للفرد من دون جفاف مبكر أو لزوجة خارجة عن السيطرة.',
        inputs: [
          { ingredientId: 'flour', amount: 500, unit: 'g', note: null },
          { ingredientId: 'salt', amount: 2.5, unit: 'g', note: null }
        ],
        tools: ['ملعقة قوية أو سباتولا', 'غطاء أو غلاف'],
        controls: [
          { type: 'qualitative', label: 'قوام الهدف', text: 'طري متماسك يمسك نفسه ولا ينهار كسائل', confidence: EXPLICIT },
          { type: 'gate', label: 'قاعدة الاستخدام', text: 'استخدم العجين دافئًا إذا كان يفرد بلا تمزق أو ارتداد حاد؛ هدّئه إذا ظل يلطخ أو ينكمش بسرعة.', confidence: DERIVED }
        ],
        sensoryCues: [
          { channel: 'texture', cue: 'العجين يتجمع بوضوح ويقبل الرفع بالسباتولا من دون أن ينساب كمعجون.' },
          { channel: 'tactile', cue: 'عند الاختبار لا يتمزق فورًا ولا يترك لطخًا كثيفًا على السطح.' }
        ],
        readinessGate: {
          condition: 'العجين متجانس، بلا جيوب دقيق أو انفصال دهني، ويصل إلى حالة قابلة للفرد بعد تهدئة قصيرة.',
          blockers: ['جفاف متكسر', 'لزوجة شديدة تسحب وتلطخ السطح', 'ارتداد حاد بعد الفرد', 'انفصال دهني أو جيوب دقيق'],
          warning: 'لا تضف دقيقًا إضافيًا تلقائيًا قبل إعادة تقييم سلوك العجين بعد التهدئة.'
        },
        failureSignals: [
          { signal: 'العجين يلطخ السطح ولا يحافظ على الشكل', cause: 'عدم اكتمال التوازن المائي/الحراري أو حرارة مرتفعة جدًا للعجين', fix: 'غطه واتركه يهدأ أو برّده قليلًا ثم أعد الاختبار قبل أي تصحيح تركيبي', severity: 'recoverable' },
          { signal: 'العجين متكسر وجاف', cause: 'إفراط في الدقيق أو خلط زائد', fix: 'توقف عن إضافة الدقيق وقيّم إمكانية الدمج اللطيف فقط؛ لا تواصل التجفيف', severity: 'critical' }
        ],
        outputState: 'عجين منضبط صالح للفرد بعد تهدئة قصيرة.',
        scienceRef: 'dough-matrix-formation',
        provenance: { sourceType: 'editorial', sourceId: 'ayaHabib', completeness: FULL }
      },
      {
        id: 'aya-rest-and-bake',
        title: 'الراحة ثم الفرد والخبز',
        phaseId: 'baking',
        operatorAction: 'غطّ العجين واتركه يرتاح حتى يهدأ التماسك ويصبح الفرد أسهل. افرد كل طبقة برقة متقاربة، ثم اخبز على 180°م مع مراقبة اللون من الدقيقة الخامسة. أخرج الطبقة عندما تثبت ويظهر ذهبي خفيف، لا عندما يحمر السطح بالكامل.',
        purpose: 'تثبيت القوام ثم إنتاج طبقات رقيقة قابلة للتجميع.',
        inputs: [],
        tools: ['فرن', 'نشابة', 'ورق خبز أو سطح فرد مناسب'],
        controls: [
          { type: 'time', label: 'الخبز لكل طبقة', min: 5, max: 7, unit: 'دقيقة', confidence: EXPLICIT, text: null },
          { type: 'temperature', label: 'حرارة الفرن', value: 180, min: 180, max: 180, unit: '°م', confidence: EXPLICIT, text: null },
          { type: 'qualitative', label: 'سماكة الفرد', text: 'رقيقة جدًا', confidence: EXPLICIT }
        ],
        sensoryCues: [
          { channel: 'visual', cue: 'الطبقة ذهبيّة وخفيفة وليست داكنة أو محروقة.' }
        ],
        readinessGate: {
          condition: 'كل طبقة مخبوزة ومبردة بما يكفي للمناولة.',
          blockers: ['لون شاحب جدًا أو لون داكن زائد'],
          warning: 'الزمن هنا صريح للخبز، لكنه لا يغني عن مراقبة اللون.'
        },
        failureSignals: [],
        outputState: 'طبقات جاهزة للتعبئة والتجميع.',
        scienceRef: 'baking-thin-layers',
        provenance: { sourceType: 'recipe', sourceId: 'ayaHabib', completeness: FULL }
      }
    ],
    ahmedShouqi: [
      {
        id: 'shouqi-source-heat',
        title: 'تسخين مكونات القاعدة كما وردت في المصدر',
        phaseId: 'dough',
        operatorAction: 'ضع السكر والعسل والزبدة والبيض والصودا معًا في القدر، مع استثناء الدقيق فقط. سخّن مع التقليب المستمر، وارفع القدر من النار عندما تصل الكتلة إلى 70°م.',
        purpose: 'الحفاظ على طريقة شوقي الأصلية دون نقل البيض أو الصودا إلى مرحلة أخرى.',
        inputs: [],
        tools: ['قدر', 'مضرب يدوي أو سباتولا', 'ترمومتر'],
        controls: [
          { type: 'temperature', label: 'نقطة رفع القدر', value: 70, min: 70, max: 70, unit: '°م', confidence: EXPLICIT, text: null },
          { type: 'event', label: 'أثناء التسخين', text: 'تقليب مستمر ومنع التصاق البيض أو تكتله عند القاع والجوانب.', confidence: EXPLICIT }
        ],
        sensoryCues: [{ channel: 'visual', cue: 'الخليط متجانس ولا توجد كتل بيض أو جيوب صودا ظاهرة.' }],
        readinessGate: { condition: 'وصل الخليط إلى 70°م مع بقاء القوام متجانسًا.', blockers: ['تكتل البيض', 'التصاق أو احتراق عند القاع', 'توقف التقليب'], warning: 'هذه وصفة تسخّن البيض داخل النظام من البداية؛ لا تطبق عليها بروتوكول تمبرنج منفصل.' },
        failureSignals: [
          { signal: 'ظهور خيوط أو كتل بيض', cause: 'تسخين موضعي أو تقليب غير كافٍ', fix: 'ارفع القدر فورًا واخلط بقوة؛ لا ترفع الحرارة لتعويض التأخر.', severity: 'critical' }
        ],
        outputState: 'قاعدة شوقي عند 70°م جاهزة للدقيق.',
        scienceRef: 'dough-honey-base',
        provenance: { sourceType: 'recipe', sourceId: 'ahmedShouqi', completeness: PARTIAL }
      },
      {
        id: 'shouqi-source-flour',
        title: 'إضافة الدقيق الثابت',
        phaseId: 'dough',
        operatorAction: 'بعد رفع القدر من النار، أضف 450 جم الدقيق المحددة في الوصفة وقلّب حتى تتكون عجينة متجانسة.',
        purpose: 'إغلاق العجين بالمقدار المصدري دون تحويل الدقيق الثابت إلى عبارة «حسب القوام».',
        inputs: [{ ingredientId: 'flour', amount: 450, unit: 'g', note: 'مقدار ثابت في المصدر' }],
        tools: ['سباتولا قوية'],
        controls: [{ type: 'mass', label: 'الدقيق', value: 450, min: 450, max: 450, unit: 'g', confidence: EXPLICIT, text: null }],
        sensoryCues: [{ channel: 'texture', cue: 'تتجمع المكونات في عجينة متجانسة بلا جيوب دقيق جاف.' }],
        readinessGate: { condition: 'اكتمل دخول الدقيق وتكونت العجينة.', blockers: ['جيوب دقيق جافة', 'انفصال دهني واضح'], warning: 'المصدر المتاح لا يحدد زمن راحة أو طريقة فرد تفصيلية؛ لا يضيف التطبيق خطوة إلزامية غير مذكورة.' },
        failureSignals: [],
        outputState: 'عجينة شوقي بحسب النص المصدري المتاح.',
        scienceRef: 'dough-matrix-formation',
        provenance: { sourceType: 'recipe', sourceId: 'ahmedShouqi', completeness: PARTIAL }
      },
      {
        id: 'shouqi-source-bake',
        title: 'خبز الطبقات',
        phaseId: 'baking',
        operatorAction: 'اخبز الطبقات عند 180°م. ابدأ فحص الطبقة مبكرًا، وأخرجها عند اختفاء اللمعان الخام وثبات السطح والحواف وظهور اللون الذهبي المقصود.',
        purpose: 'استخدام حرارة المصدر مع نقطة نهاية عملية بدل اختراع زمن ثابت غير مذكور بوضوح.',
        inputs: [],
        tools: ['فرن', 'صينية أو ورق خبز'],
        controls: [
          { type: 'temperature', label: 'حرارة الفرن', value: 180, min: 180, max: 180, unit: '°م', confidence: EXPLICIT, text: null },
          { type: 'event', label: 'علامة الخروج', text: 'اختفاء اللمعان الخام وثبات السطح والحواف والذهبي المقصود.', confidence: EDITORIAL }
        ],
        sensoryCues: [{ channel: 'visual', cue: 'لا توجد مناطق سائلة أو خامة، والحواف لا تسبق الوسط باحتراق واضح.' }],
        readinessGate: { condition: 'الطبقة ثابتة وتتحمل المناولة بعد تبريد قصير.', blockers: ['سطح خام لامع', 'حواف محترقة ووسط شاحب'], warning: 'زمن الخبز غير مكتمل في المصدر المتاح، لذلك يظل الفحص البصري واللمسي هو الحاكم.' },
        failureSignals: [],
        outputState: 'طبقات شوقي مخبوزة.',
        scienceRef: 'baking-thin-layers',
        provenance: { sourceType: 'recipe', sourceId: 'ahmedShouqi', completeness: PARTIAL }
      }
    ],
    tetyanaClassic: [
      {
        id: 'tetyana-heat-base', phaseId: 'dough',
        operatorAction: 'كوّن القاعدة الحرارية للعسل/السكر/الزبدة مع تقليب مستمر حتى الذوبان والتجانس.',
        purpose: 'الوصول إلى قاعدة موحدة قبل النقل للمرحلة التالية.',
        inputs: [], tools: ['قدر', 'أداة خلط'],
        controls: [
          { type: 'event', label: 'علامة التقدم', text: 'ذوبان السكر وتجانس القاعدة', confidence: EXPLICIT }
        ],
        sensoryCues: [{ channel: 'visual', cue: 'لا توجد بلورات ظاهرة أو انفصال دهني.' }],
        readinessGate: { condition: 'قاعدة متجانسة', blockers: ['بلورات أو انفصال'], warning: null },
        failureSignals: [], outputState: 'قاعدة عجين جاهزة', scienceRef: 'dough-honey-base', provenance: { sourceType: 'recipe', sourceId: 'tetyanaClassic', completeness: PARTIAL }
      },
      {
        id: 'tetyana-bake-loop', phaseId: 'baking',
        operatorAction: 'افرد واخبز الطبقات بسرعة تشغيلية مع مراقبة اللون والمرونة بدل فرض مدة واحدة على كل دفعة.',
        purpose: 'التعامل مع تغير سلوك الفرن والسمك الفعلي بين الطبقات.',
        inputs: [], tools: ['نشابة', 'فرن'],
        controls: [
          { type: 'event', label: 'الإخراج', text: 'الطبقة ثابتة وذهبية بخفة', confidence: EXPLICIT }
        ],
        sensoryCues: [{ channel: 'texture', cue: 'الطبقة تمسك نفسها بعد الخروج ولا تبقى عجينية.' }],
        readinessGate: { condition: 'طبقات ثابتة وغير محروقة', blockers: ['عجينية', 'محروقة'], warning: null },
        failureSignals: [], outputState: 'طبقات جاهزة للتبريد', scienceRef: 'baking-thin-layers', provenance: { sourceType: 'recipe', sourceId: 'tetyanaClassic', completeness: PARTIAL }
      }
    ],

    hebaAbuElKhair: [
      {
        id: 'heba-base-heat',
        title: 'بناء القاعدة الحرارية المتوازنة',
        phaseId: 'dough',
        operatorAction: 'كوّن قاعدة العسل/السكر/الزبدة على حرارة مضبوطة حتى تدخل مجال تشغيل عملي قريب من 75–85°م ويذوب السكر بالكامل ويصبح السطح متجانسًا. المطلوب أساس أشقر نظيف؛ لا تتركه حتى يغمق فقط لأنك تريد لوناً أقوى، ولا تتعامل مع الاقتراب من 90°م كمنطقة آمنة للبقاء الطويل.',
        purpose: 'الحفاظ على نعومة القاعدة قبل الصودا والبيض، لأن التغميق المبكر هنا ينعكس مباشرة على الطعم والقوام.',
        inputs: [], tools: ['قدر', 'أداة خلط', 'ترمومتر حراري'],
        controls: [
          { type: 'temperature', label: 'نافذة تشغيل عملية', value: null, min: 75, max: 85, unit: '°م', confidence: EDITORIAL, text: null },
          { type: 'time', label: 'نافذة الوصول المعتادة', value: null, min: 5, max: 7, unit: 'دقيقة', confidence: DERIVED, text: null },
          { type: 'gate', label: 'حد تحذيري', text: 'توقف إذا اقتربت القاعدة من 90°م أو تحولت الفقاعات إلى غليان عنيف من الوسط؛ هذا إنذار تشغيلي لا هدف رقمي.', confidence: EDITORIAL }
        ],
        sensoryCues: [
          { channel: 'visual', cue: 'سطح موحد بلا بلورات وبلا انفصال دهني مع فقاعات خفيفة من الأطراف.' },
          { channel: 'olfactory', cue: 'رائحة عسلية واضحة بلا احتراق.' }
        ],
        readinessGate: { condition: 'قاعدة متجانسة قابلة لاستقبال الصودا ثم البيض.', blockers: ['انفصال دهني', 'تغميق مبكر', 'بلورات سكر'], warning: 'هذه خطوة حرارية حسية معًا؛ لا يكفي الوقت وحده.' },
        failureSignals: [
          { signal: 'انفصال دهني', cause: 'سوء التحكم الحراري أو ضعف التحريك', fix: 'اخفض الحرارة ووسّع سطح التحريك قبل المتابعة', severity: 'recoverable' }
        ],
        outputState: 'قاعدة عجين مستقرة.',
        scienceRef: 'dough-honey-base',
        provenance: { sourceType: 'recipe', sourceId: 'hebaAbuElKhair', completeness: FULL }
      },
      {
        id: 'heba-eggs-flour',
        title: 'تهدئة القاعدة ثم إدخال البيض والدقيق',
        phaseId: 'dough',
        operatorAction: 'بعد الصودا اترك القاعدة تهبط إلى 70–80°م قبل أول دفعة بيض. أضف البيض على 4 دفعات مع خفق 10–15 ثانية بعد كل دفعة حتى تعود النعومة بالكامل. بعد ذلك أدخل الدقيق تدريجيًا حتى تصل إلى عجين طري متماسك، ثم غطِّه واختبر قابليته للفرد: إذا فرد من دون تمزق أو ارتداد حاد استخدمه، وإذا ظل يلطخ أو ينكمش بسرعة فدعْه يهدأ أو برّده قليلًا ثم أعد التقييم.',
        purpose: 'الوصول إلى عجين عملي من دون تخثر البيض أو إفراط في الدقيق.',
        inputs: [], tools: ['مضرب يدوي', 'سباتولا', 'ترمومتر حراري'],
        controls: [
          { type: 'temperature', label: 'حرارة القاعدة قبل البيض', value: null, min: 70, max: 80, unit: '°م', confidence: EDITORIAL, text: null },
          { type: 'time', label: 'الخفق بعد كل دفعة بيض', value: null, min: 10, max: 15, unit: 'ثانية', confidence: EXPLICIT, text: null },
          { type: 'qualitative', label: 'قوام الهدف', text: 'طري متماسك لا سائل ولا متكسر', confidence: EXPLICIT }
        ],
        sensoryCues: [
          { channel: 'visual', cue: 'الخليط ناعم بعد البيض ثم يتحول إلى عجين متجانس.' },
          { channel: 'texture', cue: 'العجين يتجمع بوضوح ويقبل الراحة والفرد.' }
        ],
        readinessGate: { condition: 'العجين مغطى وجاهز للتهدئة القصيرة قبل الفرد.', blockers: ['تخثر بيض', 'جفاف متكسر', 'لزوجة شديدة', 'ارتداد حاد بعد الاختبار'], warning: 'إذا كانت حرارة القاعدة موضع شك، استخدم حاسبة التمبرنج قبل إضافة البيض.' },
        failureSignals: [
          { signal: 'خيوط أو حبيبات بيض مطبوخ', cause: 'بدء الإضافة على قاعدة ساخنة أكثر من اللازم', fix: 'أوقف الإضافة واخفق فورًا لتقييم إمكانية الاسترداد قبل المتابعة', severity: 'critical' }
        ],
        outputState: 'عجين أولي مغطى وجاهز للراحة/الفرد.',
        scienceRef: 'dough-matrix-formation',
        provenance: { sourceType: 'recipe', sourceId: 'hebaAbuElKhair', completeness: FULL }
      },
      {
        id: 'heba-rest-bake',
        title: 'الراحة ثم الخبز المتقارب',
        phaseId: 'baking',
        operatorAction: 'أرح العجين وهو مغطى حتى يهدأ التماسك ثم افرد الطبقات برقة متقاربة. راقب اللون الحقيقي على الحواف والوسط معاً، وأخرج الطبقة عند الذهبي الخفيف والثبات، لا بعد الجفاف الكامل.',
        purpose: 'إنتاج طبقات قابلة للتجميع بدل طبقات جافة أو متباينة.',
        inputs: [], tools: ['نشابة', 'فرن', 'صينية'],
        controls: [
          { type: 'event', label: 'الجاهزية', text: 'ثبات الطبقة + ذهبي خفيف', confidence: EXPLICIT },
          { type: 'qualitative', label: 'الفرد', text: 'طبقات رقيقة متقاربة', confidence: EXPLICIT }
        ],
        sensoryCues: [
          { channel: 'visual', cue: 'ذهبي خفيف متجانس نسبيًا.' },
          { channel: 'texture', cue: 'الطبقة تثبت ولا تبقى خامة في الوسط.' }
        ],
        readinessGate: { condition: 'طبقات متقاربة اللون والسلوك وجاهزة للتعبئة.', blockers: ['اختلاف واضح في النضج بين الطبقات'], warning: 'صحح الزمن والفرد مبكرًا من أول طبقتين.' },
        failureSignals: [],
        outputState: 'طبقات جاهزة للتعبئة.',
        scienceRef: 'baking-thin-layers',
        provenance: { sourceType: 'recipe', sourceId: 'hebaAbuElKhair', completeness: FULL }
      }
    ],
    ahmedYounis: [
      {
        id: 'younis-source-caramel',
        title: 'بناء الكراميل الذهبي',
        phaseId: 'dough',
        operatorAction: 'ضع السكر والزبدة على نار هادئة، ثم أضف العسل وقلّب حتى تصل القاعدة إلى اللون الكراميل الذهبي المذكور في الوصفة.',
        purpose: 'الحفاظ على هوية وصفة يونس ونكهتها العميقة كما وردت في المصدر.',
        inputs: [
          { ingredientId: 'sugar', amount: 200, unit: 'g', note: null },
          { ingredientId: 'butter', amount: 200, unit: 'g', note: null },
          { ingredientId: 'honey', amount: 130, unit: 'g', note: null }
        ],
        tools: ['قدر', 'سباتولا'],
        controls: [{ type: 'event', label: 'نقطة التقدم', text: 'لون كراميل ذهبي بلا احتراق أو مرارة.', confidence: EXPLICIT }],
        sensoryCues: [{ channel: 'visual', cue: 'اللون ذهبي عميق ومتجانس.' }, { channel: 'olfactory', cue: 'رائحة عسل وكراميل نظيفة بلا احتراق.' }],
        readinessGate: { condition: 'تحقق اللون الذهبي المقصود دون احتراق.', blockers: ['رائحة احتراق', 'نقاط داكنة أو مرارة'], warning: 'المصدر لا يعطي درجة حرارة رقمية لهذه المرحلة؛ اللون والرائحة هما المرجع.' },
        failureSignals: [],
        outputState: 'قاعدة كراميل ذهبية.',
        scienceRef: 'dough-honey-base',
        provenance: { sourceType: 'recipe', sourceId: 'ahmedYounis', completeness: FULL }
      },
      {
        id: 'younis-source-eggs',
        title: 'التبريد القصير ثم البيض',
        phaseId: 'dough',
        operatorAction: 'ارفع الخليط من النار واتركه يبرد قليلًا، ثم أضف البيض مع التقليب المستمر بمضرب سلك يدوي حتى يتجانس.',
        purpose: 'اتباع ترتيب المصدر وتقليل خطر تخثر البيض موضعيًا.',
        inputs: [{ ingredientId: 'eggs', amount: 150, unit: 'g', note: '3 بيضات تقريبًا' }],
        tools: ['مضرب سلك يدوي'],
        controls: [{ type: 'event', label: 'الدمج', text: 'إضافة البيض إلى القاعدة بعد تبريدها قليلًا مع تقليب مستمر.', confidence: EXPLICIT }],
        sensoryCues: [{ channel: 'visual', cue: 'الكتلة ناعمة بلا خيوط أو حبيبات بيض مطبوخ.' }],
        readinessGate: { condition: 'اختفى البيض داخل القاعدة تمامًا وبقي الخليط ناعمًا.', blockers: ['حبيبات أو خيوط بيض مطبوخ'], warning: 'المصدر لا يحدد حرارة رقمية أو عدد دفعات؛ لا يفرض التطبيق بروتوكول تمبرنج عامًا.' },
        failureSignals: [{ signal: 'تكتل البيض', cause: 'حرارة موضعية مرتفعة أو إضافة سريعة دون تقليب', fix: 'أوقف الإضافة وارفع الوعاء عن أي حرارة متبقية واخلط فورًا.', severity: 'critical' }],
        outputState: 'قاعدة مدمج بها البيض.',
        scienceRef: 'egg-tempering',
        provenance: { sourceType: 'recipe', sourceId: 'ahmedYounis', completeness: FULL }
      },
      {
        id: 'younis-source-dry-rest',
        title: 'المكونات الجافة والراحة الباردة',
        phaseId: 'dough',
        operatorAction: 'أضف المكونات الجافة، بما فيها الصودا وفق النص المتاح، واعجن حتى يتكون العجين؛ ثم غطّه واتركه في الثلاجة لمدة ساعة.',
        purpose: 'الحفاظ على الراحة الباردة الصريحة في المصدر قبل الفرد.',
        inputs: [
          { ingredientId: 'flour', amount: 500, unit: 'g', note: 'مقدار ثابت' },
          { ingredientId: 'baking-soda', amount: 6, unit: 'g', note: 'وردت ضمن المكونات الجافة دون تحديد موضع منفصل' }
        ],
        tools: ['وعاء أو سطح عجن', 'ثلاجة'],
        controls: [
          { type: 'time', label: 'الراحة في الثلاجة', value: 60, min: 60, max: 60, unit: 'دقيقة', confidence: EXPLICIT, text: null },
          { type: 'gate', label: 'موضع الصودا', text: 'تُحفظ ضمن المكونات الجافة لأن المصدر المتاح لا يذكر إضافتها منفصلة إلى القاعدة الساخنة.', confidence: EXPLICIT }
        ],
        sensoryCues: [{ channel: 'texture', cue: 'العجين متجانس وقابل للتقسيم بعد الراحة.' }],
        readinessGate: { condition: 'اكتملت ساعة الراحة والعجين جاهز للتشكيل.', blockers: ['جيوب دقيق جافة', 'عدم إكمال الراحة'], warning: 'لا تنقل الصودا إلى القاعدة الساخنة صامتًا؛ ذلك يغير طريقة المصدر.' },
        failureSignals: [],
        outputState: 'عجين يونس مرتاح وبارد.',
        scienceRef: 'dough-matrix-formation',
        provenance: { sourceType: 'recipe', sourceId: 'ahmedYounis', completeness: FULL }
      },
      {
        id: 'younis-source-roll-bake',
        title: 'الرول والفرد الرقيق والخبز',
        phaseId: 'baking',
        operatorAction: 'شكّل العجين رولًا واقطعه، ثم افرد كل قطعة بسمك خام يقارب 0.5 مم. اخبز عند 180°م لمدة 5 دقائق، مع إخراج الطبقة عند ثباتها وبلوغ اللون الذهبي العميق المقصود.',
        purpose: 'تنفيذ السمك والزمن والحرارة الصريحة في المصدر.',
        inputs: [],
        tools: ['نشابة', 'فرن', 'صينية'],
        controls: [
          { type: 'thickness', label: 'سمك الفرد الخام', value: 0.5, min: 0.5, max: 0.5, unit: 'مم', confidence: EXPLICIT, text: null },
          { type: 'temperature', label: 'حرارة الفرن', value: 180, min: 180, max: 180, unit: '°م', confidence: EXPLICIT, text: null },
          { type: 'time', label: 'الخبز', value: 5, min: 5, max: 5, unit: 'دقيقة', confidence: EXPLICIT, text: null }
        ],
        sensoryCues: [{ channel: 'visual', cue: 'اللون ذهبي عميق والسطح غير خام.' }],
        readinessGate: { condition: 'الطبقة مخبوزة وتتحمل النقل بعد تبريد قصير.', blockers: ['سطح خام', 'احتراق الحواف'], warning: 'سمك 0.5 مم هو سمك الفرد الخام، وليس سمك الطبقة المخبوزة النهائية.' },
        failureSignals: [],
        outputState: 'طبقات يونس جاهزة للتبريد.',
        scienceRef: 'baking-thin-layers',
        provenance: { sourceType: 'recipe', sourceId: 'ahmedYounis', completeness: FULL }
      }
    ],
    smittenKitchen:  [
      {
        id: 'smitten-base', phaseId: 'dough',
        operatorAction: 'حضّر القاعدة الحرارية حتى التجانس ثم انقلها عبر بقية الخطوات مع تجنب التسخين العدواني أو الكرملة غير المقصودة.',
        purpose: 'الحفاظ على نكهة نظيفة وبنية قابلة للتكرار.',
        inputs: [], tools: ['قدر', 'أداة خلط'],
        controls: [
          { type: 'qualitative', label: 'السلوك الحراري', text: 'لطيف ومضبوط', confidence: EXPLICIT },
          { type: 'event', label: 'الإكمال', text: 'تجانس القاعدة واستقرارها', confidence: EXPLICIT }
        ],
        sensoryCues: [{ channel: 'olfactory', cue: 'رائحة نظيفة بلا مرارة كراميل.' }],
        readinessGate: { condition: 'قاعدة مستقرة للانتقال.', blockers: ['طعم/رائحة احتراق', 'عدم تجانس'], warning: null },
        failureSignals: [], outputState: 'قاعدة عجين مستقرة.', scienceRef: 'dough-honey-base', provenance: { sourceType: 'recipe', sourceId: 'smittenKitchen', completeness: PARTIAL }
      },
      {
        id: 'smitten-bake', phaseId: 'baking',
        operatorAction: 'اخبز الطبقات حتى تظهر جاهزية بصرية ولمسية واضحة بدل التعلق بزمن واحد لكل فرن.',
        purpose: 'التعامل مع حساسية الطبقات الرقيقة لاختلاف الأفران.',
        inputs: [], tools: ['فرن', 'صينية'],
        controls: [
          { type: 'event', label: 'الجاهزية', text: 'السطح ثابت وذهبي بخفة', confidence: EXPLICIT }
        ],
        sensoryCues: [{ channel: 'visual', cue: 'اللون ثابت ومعتدل.' }, { channel: 'texture', cue: 'لا تبقى الطبقة خامة عند اللمس الخفيف.' }],
        readinessGate: { condition: 'كل طبقة خرجت عند جاهزية مماثلة.', blockers: ['اختلاف واضح في النضج'], warning: null },
        failureSignals: [], outputState: 'طبقات أقرب للتجانس.', scienceRef: 'baking-thin-layers', provenance: { sourceType: 'recipe', sourceId: 'smittenKitchen', completeness: PARTIAL }
      }
    ],

  };

  const FILLING_PROTOCOLS = {
    classic_sourcream_frosting: [
      {
        id: 'classic-sourcream-prep',
        title: 'تهيئة قاعدة الساور كريم قبل الخلط',
        phaseId: 'filling',
        operatorAction: 'ابدأ بساور كريم بارد ومتماسك نسبيًا. إذا كان قريبًا من القوام السائل فبرده جيدًا أو صفّه قبل أي خلط. هذه الخطوة ليست شكلية؛ نجاح الحشو يبدأ من صلاحية القاعدة نفسها.',
        purpose: 'منع بناء حشو ضعيف من قاعدة رخوة أصلاً.',
        inputs: [
          { ingredientId: 'sour-cream', amount: 500, unit: 'g', note: null }
        ],
        tools: ['وعاء بارد', 'ملعقة أو سباتولا'],
        controls: [
          { type: 'qualitative', label: 'حالة القاعدة', text: 'باردة ومتماسكة نسبيًا', confidence: EXPLICIT },
          { type: 'gate', label: 'شرط البداية', text: 'لا تبدأ الخلط إذا كانت القاعدة مائية بوضوح', confidence: EDITORIAL }
        ],
        sensoryCues: [
          { channel: 'texture', cue: 'القوام أقرب إلى الكثافة القابلة للفرد لا إلى السيلان.' }
        ],
        readinessGate: { condition: 'القاعدة صالحة للخلط ولا تظهر رخاوة مفرطة.', blockers: ['ساور كريم مائي', 'وعاء دافئ'], warning: 'التبريد هنا يسبق الخفق ولا يعوّضه لاحقًا.' },
        failureSignals: [],
        outputState: 'قاعدة باردة جاهزة للخلط.',
        scienceRef: 'sourcream-mixing',
        provenance: { sourceType: 'recipe', sourceId: 'classic_sourcream_frosting', completeness: FULL }
      },
      {
        id: 'classic-sourcream-mix',
        title: 'بناء حشو الساور كريم الكلاسيكي',
        phaseId: 'filling',
        operatorAction: 'أضف السكر والفانيليا وابدأ الخلط حتى يختفي الإحساس الحبيبي الأساسي ويتماسك الخليط قليلًا. الهدف هنا التجانس والقابلية للفرد، لا خفق طويل يوهمك بأن القوام سيزداد إلى ما لا نهاية.',
        purpose: 'بناء حشو متجانس صالح للفرد من دون overmixing أو أوهام دقة غير موثقة.',
        inputs: [
          { ingredientId: 'sugar', amount: 150, unit: 'g', note: null },
          { ingredientId: 'vanilla', amount: 5, unit: 'g', note: null }
        ],
        tools: ['وعاء خلط', 'مضرب'],
        controls: [
          { type: 'event', label: 'علامة التقدم', text: 'ذوبان السكر وتكاثف بسيط', confidence: EXPLICIT },
          { type: 'qualitative', label: 'أسلوب الخلط', text: 'حتى التجانس فقط، بلا خفق مطول', confidence: EDITORIAL }
        ],
        sensoryCues: [
          { channel: 'visual', cue: 'قوام متجانس أملس.' },
          { channel: 'texture', cue: 'يزداد التماسك قليلًا ولا يبقى مائيًا تمامًا.' }
        ],
        readinessGate: { condition: 'الحشو متجانس وقابل للفرد.', blockers: ['حبيبات سكر ظاهرة', 'انفصال أو سيولة مفرطة'], warning: 'المصدر لا يعطي زمنًا أو حرارة محددين؛ لا تخترعهما.' },
        failureSignals: [
          { signal: 'سيولة واضحة بعد الخلط', cause: 'قاعدة غير مناسبة أو خلط زائد', fix: 'برّد الحشو وراجع صلاحية القاعدة قبل متابعة التعبئة', severity: 'recoverable' }
        ],
        outputState: 'حشو ساور كريم كلاسيكي جاهز.',
        scienceRef: 'sourcream-mixing',
        provenance: { sourceType: 'recipe', sourceId: 'classic_sourcream_frosting', completeness: FULL }
      }
    ],
    classic_dulce_sourcream: [
      {
        id: 'dulce-prep-base',
        title: 'تهيئة القاعدة اللبنية قبل الدولسي',
        phaseId: 'filling',
        operatorAction: 'ليّن الساور كريم أولًا حتى يصبح أملسًا وباردًا ومستعدًا للاستقبال. إذا كانت القاعدة رخوة جدًا فبردها قبل إضافة الدولسي، لأن الدمج لن يصلح قاعدة غير مستقرة.',
        purpose: 'تقليل صدمة السكر/الدهن على القاعدة اللبنية من البداية.',
        inputs: [], tools: ['وعاء خلط', 'سباتولا'],
        controls: [
          { type: 'qualitative', label: 'حالة القاعدة', text: 'باردة، ناعمة، غير رخوة بوضوح', confidence: EXPLICIT }
        ],
        sensoryCues: [{ channel: 'texture', cue: 'القاعدة تلتصق بالملعقة ولا تسيل فورًا.' }],
        readinessGate: { condition: 'القاعدة ملساء وقابلة لاستقبال الدولسي على دفعات.', blockers: ['رخاوة شديدة', 'تكتلات قبل الدمج'], warning: null },
        failureSignals: [],
        outputState: 'قاعدة مهيأة للدمج.',
        scienceRef: 'dulce-folding',
        provenance: { sourceType: 'recipe', sourceId: 'classic_dulce_sourcream', completeness: FULL }
      },
      {
        id: 'dulce-base-blend',
        title: 'دمج الدولسي مع القاعدة اللبنية',
        phaseId: 'filling',
        operatorAction: 'أضف الدولسي على دفعات صغيرة. بعد كل دفعة ادمج بهدوء حتى يختفي الخط اللوني قبل إضافة التالية. لا تصب الكمية كلها مرة واحدة لأن ذلك يرفع خطر الانفصال والخطوط الدهنية.',
        purpose: 'خفض صدمة السكر/الدهن المرتفعة على القاعدة اللبنية.',
        inputs: [], tools: ['وعاء خلط', 'سباتولا أو مضرب'],
        controls: [
          { type: 'qualitative', label: 'أسلوب الدمج', text: 'إضافة تدريجية ودمج هادئ', confidence: EXPLICIT },
          { type: 'event', label: 'علامة الاكتمال', text: 'تجانس كامل بلا جيوب دولسي أو انفصال', confidence: EXPLICIT }
        ],
        sensoryCues: [
          { channel: 'visual', cue: 'لون موحد وقوام متماسك.' },
          { channel: 'texture', cue: 'لا توجد جيوب كثيفة معزولة أو انفصال دهني.' }
        ],
        readinessGate: { condition: 'الخليط متجانس وقابل للفرد', blockers: ['انفصال', 'تكتلات كثيفة'], warning: 'لا تسرّع الإضافة لمجرد اختصار الوقت.' },
        failureSignals: [
          { signal: 'انفصال أو خطوط دهنية', cause: 'إضافة سريعة أو خلط عنيف', fix: 'أوقف الإضافة وادمج تدريجيًا حتى يعود التجانس', severity: 'recoverable' }
        ],
        outputState: 'حشو دولسي/ساور كريم متجانس',
        scienceRef: 'dulce-folding',
        provenance: { sourceType: 'recipe', sourceId: 'classic_dulce_sourcream', completeness: FULL }
      }
    ],
    shouqi_1: [
      {
        id: 'shouqi1-prep',
        title: 'تجهيز قاعدة الحشو المرجعي',
        phaseId: 'filling',
        operatorAction: 'رتّب المكونات الباردة وأدوات الخلط قبل البدء، ثم ابدأ على دفعات صغيرة إن كانت القاعدة متفاوتة الكثافة. لا تعامل هذه الحشوة كوعاء إسقاط سريع؛ نجاحها مرتبط بالتجانس التدريجي.',
        purpose: 'منع التكتل والانفصال قبل الوصول إلى القوام النهائي.',
        inputs: [], tools: ['وعاء', 'أداة خلط مناسبة'],
        controls: [
          { type: 'qualitative', label: 'أسلوب البداية', text: 'تجهيز بارد ودمج تدريجي', confidence: EXPLICIT }
        ],
        sensoryCues: [{ channel: 'visual', cue: 'القاعدة متماسكة بما يكفي للدمج التدريجي.' }],
        readinessGate: { condition: 'المكونات مرتبة والقوام يسمح بدمج تدريجي.', blockers: ['رخاوة شديدة أو تكتل مبكر'], warning: null },
        failureSignals: [],
        outputState: 'قاعدة مهيأة للخلط.',
        scienceRef: 'filling-rule-context',
        provenance: { sourceType: 'reference', sourceId: 'shouqi_1', completeness: FULL }
      },
      {
        id: 'shouqi1-build',
        title: 'تنفيذ الحشو المرجعي لشوقي',
        phaseId: 'filling',
        operatorAction: 'اتبع ترتيب الخلط المرجعي للحشوة خطوة بخطوة مع التركيز على القوام النهائي: يجب أن يصبح الحشو متجانسًا ومتماسكًا وقابلًا للفرد، لا مجرد مخلوط سريع لأنه وصل إلى زمن افتراضي.',
        purpose: 'تحويل المرجع إلى خطوة تشغيلية صادقة بدل عنوان عام.',
        inputs: [], tools: ['وعاء', 'أداة خلط مناسبة'],
        controls: [
          { type: 'event', label: 'الاكتمال', text: 'قوام متجانس صالح للفرد', confidence: EXPLICIT },
          { type: 'qualitative', label: 'المعيار', text: 'تجانس ومسك مع قابلية للفرد', confidence: EDITORIAL }
        ],
        sensoryCues: [{ channel: 'visual', cue: 'سطح متجانس من غير تكتلات أو انفصال.' }],
        readinessGate: { condition: 'الحشو صالح للفرد على الطبقات', blockers: ['تكتلات أو انفصال'], warning: 'إذا فقد الحشو تماسكه فارجع لأسلوب الدمج لا لزيادة الخفق.' },
        failureSignals: [],
        outputState: 'حشو جاهز للتجميع',
        scienceRef: 'filling-rule-context',
        provenance: { sourceType: 'reference', sourceId: 'shouqi_1', completeness: FULL }
      }
    ],
    ayahabib: [
      {
        id: 'ayahabib-prep',
        title: 'تهيئة قاعدة باردة مستقرة',
        phaseId: 'filling',
        operatorAction: 'برّد الكريمة والساور كريم والوعاء والمضرب. إذا كان الساور كريم مائعًا أو قريبًا من قوام الشرب فصفِّه أولًا. نجاح هذه الحشوة يبدأ قبل تشغيل الخفّاق، لا أثناءه فقط.',
        purpose: 'تهيئة قاعدة باردة وثابتة قبل خفق الوعاء الواحد.',
        inputs: [],
        tools: ['وعاء معدني بارد', 'مضرب بارد'],
        controls: [
          { type: 'temperature', label: 'برودة الكريمة', value: null, min: 2, max: 6, unit: '°م', confidence: EXPLICIT, text: null },
          { type: 'time', label: 'تصفية اختيارية للساور كريم', value: null, min: 2, max: 3, unit: 'ساعة', confidence: EXPLICIT, text: null },
          { type: 'time', label: 'تبريد الأدوات', value: null, min: 10, max: 15, unit: 'دقيقة', confidence: EXPLICIT, text: null }
        ],
        sensoryCues: [{ channel: 'visual', cue: 'القاعدة اللبنية سميكة نسبيًا وليست أقرب لزبادي شرب.' }],
        readinessGate: { condition: 'المكونات باردة والقاعدة اللبنية قابلة للحفاظ على الهواء.', blockers: ['ساور كريم مائي', 'وعاء وأدوات دافئة'], warning: 'هذه الوصفة أقل تسامحًا مع حرارة المكونات من أنظمة الطي المنفصل.' },
        failureSignals: [{ signal: 'قاعدة رخوة قبل الخفق', cause: 'ساور كريم غير مناسب أو غير مصفى', fix: 'صفِّه أو استبدله بقاعدة أكثر كثافة', severity: 'recoverable' }],
        outputState: 'قاعدة باردة جاهزة للخفق.',
        scienceRef: 'filling-whipped-dairy',
        provenance: { sourceType: 'editorial', sourceId: 'ayahabib', completeness: FULL }
      },
      {
        id: 'ayahabib-one-bowl',
        title: 'خفق الوعاء الواحد حتى القوام المستقر',
        phaseId: 'filling',
        operatorAction: 'ابدأ بدمج المكونات على أقل سرعة فقط حتى لا يطير السكر البودرة ولا تنكسر البنية مبكرًا، ثم ارفع السرعة تدريجيًا إلى متوسطة. أوقف الخفق عند أول وصول لقوام موسي ثابت بقمم ناعمة/متوسطة؛ لا تطارد قممًا حادة لأن هذا يقود مباشرة إلى over-whipping.',
        purpose: 'تنفيذ طريقة الوعاء الواحد دون over-whipping.',
        inputs: [],
        tools: ['خلاط بمضرب'],
        controls: [
          { type: 'time', label: 'مرحلة الدمج الأولي', value: null, min: 30, max: 60, unit: 'ثانية', confidence: EXPLICIT, text: null },
          { type: 'speed', label: 'سرعة البداية', text: 'منخفضة جدًا (1–2)', confidence: EXPLICIT },
          { type: 'time', label: 'مرحلة الخفق الرئيسية', value: null, min: 2, max: 4, unit: 'دقيقة', confidence: EXPLICIT, text: null },
          { type: 'speed', label: 'سرعة الخفق', text: 'متوسطة (3–4)', confidence: EXPLICIT },
          { type: 'event', label: 'هدف القوام', text: 'قمم ناعمة إلى متوسطة مع قوام موسي ثابت', confidence: EXPLICIT }
        ],
        sensoryCues: [
          { channel: 'visual', cue: 'القمة تنحني قليلًا ثم تثبت بدل أن تنهار فورًا.' },
          { channel: 'texture', cue: 'الخليط يلتصق بجوانب الوعاء ولا يهبط مباشرة.' }
        ],
        readinessGate: { condition: 'قوام موسي ثابت متوسط بلا انفصال مصل.', blockers: ['قوام رخو', 'مظهر زبدي محبب', 'فقاعات كبيرة غير مستقرة'], warning: 'لا تطِل الخفق بعد الوصول للقوام المستهدف.' },
        failureSignals: [
          { signal: 'قوام رخو', cause: 'overmixing أو قاعدة مائعة', fix: 'أوقف الخفق فورًا وراجع برودة/صلابة القاعدة', severity: 'critical' },
          { signal: 'مظهر زبدي حبيبي', cause: 'over-whipping أو خلل حراري', fix: 'اعتبر الحشو خارج القوام المرجعي ولا تستمر في الخفق', severity: 'critical' }
        ],
        outputState: 'حشو آية حبيب جاهز للتجميع.',
        scienceRef: 'filling-whipped-dairy',
        provenance: { sourceType: 'editorial', sourceId: 'ayahabib', completeness: FULL }
      }
    ]
  };

  const ASSEMBLY_PROTOCOL = normalizePhase({
    id: 'assembly',
    title: 'التجميع',
    description: 'مرحلة تجميع صادقة بلا أرقام مزيفة. تعتمد على جاهزية الطبقات والحشو لا على زمن مفروض بلا مصدر.',
    steps: [
      {
        id: 'assembly-ready',
        phaseId: 'assembly',
        operatorAction: 'تأكد أن الطبقات قابلة للمناولة وأن الحشو متجانس وقابل للفرد قبل البدء.',
        purpose: 'منع بناء كيك غير مستقر من مواد غير جاهزة.',
        controls: [
          { type: 'gate', label: 'شرط الجاهزية', text: 'طبقات ثابتة + حشو قابل للفرد', confidence: EDITORIAL }
        ],
        sensoryCues: [
          { channel: 'visual', cue: 'الطبقات لا تتكسر بمجرد الرفع، والحشو لا يسيل مباشرة.' }
        ],
        readinessGate: {
          condition: 'الطبقات والحشو جاهزان فعليًا للمناولة.',
          blockers: ['طبقات هشة جدًا أو ساخنة', 'حشو سائل وغير متماسك'],
          warning: 'هذه بوابة تشغيلية قبل أن تكون خطوة ترتيب.'
        },
        failureSignals: [],
        outputState: 'محطة التجميع جاهزة.',
        scienceRef: null,
        provenance: { sourceType: 'editorial', sourceId: 'assembly-base', completeness: PARTIAL }
      },
      {
        id: 'assembly-stack',
        phaseId: 'assembly',
        operatorAction: 'افرد الحشو بين الطبقات بالتساوي وكرر حتى اكتمال التكديس، ثم غطّ السطح والجوانب إذا كان ذلك ضمن أسلوبك المعتمد.',
        purpose: 'بناء توزيع متسق للحشو بين كل الفجوات.',
        controls: [
          { type: 'qualitative', label: 'التوزيع', text: 'فرد متساوٍ دون فراغات ظاهرة', confidence: EDITORIAL },
          { type: 'event', label: 'نقطة الاكتمال', text: 'اكتمال كل فجوات الحشو واستقرار التكديس', confidence: EDITORIAL }
        ],
        sensoryCues: [
          { channel: 'visual', cue: 'لا توجد مناطق جافة كبيرة أو انزلاق واضح بين الطبقات.' }
        ],
        readinessGate: {
          condition: 'الكيكة مكدسة بثبات والفرد متقارب بين الفجوات.',
          blockers: ['فراغات واضحة', 'انزلاق أو ميلان شديد'],
          warning: 'لا نفرض كمية per-gap هنا إلا إذا كانت محسوبة من session والكمية الكلية صريحة.'
        },
        failureSignals: [],
        outputState: 'كيكة مكدسة وجاهزة للراحة/المراجعة.',
        scienceRef: 'assembly-rest',
        provenance: { sourceType: 'editorial', sourceId: 'assembly-base', completeness: PARTIAL }
      }
    ]
  }, { id: 'assembly', completeness: PARTIAL });

  function getRecipeId(recipe) {
    return recipe?.id || null;
  }

  function getFillingId(filling) {
    return global.resolveFillingId?.(filling?.id) || filling?.id || null;
  }

  function buildFallbackDoughPhase(recipe) {
    const recipeId = getRecipeId(recipe) || 'recipe';
    const steps = arrayify(recipe?.method?.steps).map((item, index) => stepFromFreeText(item, index === arrayify(recipe?.method?.steps).length - 1 ? 'baking' : 'dough', recipeId, index));
    if (recipe?.baking?.temp || recipe?.baking?.timePerLayer) {
      steps.push({
        id: `${recipeId}-baking-explicit`,
        phaseId: 'baking',
        operatorAction: 'طبّق إعدادات الخبز المرجعية المسجّلة لهذه الوصفة.',
        purpose: 'إعطاء خطوة خبز صريحة عندما تكون حرارة الفرن أو الزمن متوفرين في بيانات الوصفة.',
        inputs: [],
        tools: ['فرن'],
        controls: [
          ...(Number.isFinite(Number(recipe?.baking?.temp)) ? [{ type: 'temperature', label: 'حرارة الفرن', value: Number(recipe.baking.temp), min: Number(recipe.baking.temp), max: Number(recipe.baking.temp), unit: '°م', confidence: EXPLICIT, text: null }] : []),
          ...((Number.isFinite(Number(recipe?.baking?.timePerLayer)) || Number.isFinite(Number(recipe?.baking?.maxTimePerLayer))) ? [{ type: 'time', label: 'زمن الخبز لكل طبقة', value: null, min: Number(recipe?.baking?.timePerLayer) || null, max: Number(recipe?.baking?.maxTimePerLayer || recipe?.baking?.timePerLayer) || null, unit: 'دقيقة', confidence: EXPLICIT, text: null }] : [])
        ],
        sensoryCues: [
          { channel: 'visual', cue: 'راقب اللون حتى لو كانت الحرارة والزمن معروفين؛ الأرقام لا تلغي الملاحظة.' }
        ],
        readinessGate: {
          condition: 'تحقق نتيجة خبز مستقرة مع لون مناسب.',
          blockers: ['لون داكن زائد أو شحوب شديد'],
          warning: null
        },
        failureSignals: [],
        outputState: 'طبقات مخبوزة وفق المرجع المتاح.',
        scienceRef: null,
        provenance: { sourceType: 'recipe', sourceId: recipeId, completeness: PARTIAL }
      });
    }

    return {
      dough: normalizePhase({
        id: 'dough',
        title: `بروتوكول العجين — ${recipe?.name || recipeId}`,
        description: 'إما مرجع محرر يدويًا أو fallback مشتق من خطوات الوصفة الحالية دون اختراع أرقام.',
        steps: steps.filter(step => step.phaseId === 'dough'),
        provenance: { sourceType: 'recipe', sourceId: recipeId, completeness: PARTIAL }
      }, { id: 'dough', completeness: PARTIAL }),
      baking: normalizePhase({
        id: 'baking',
        title: 'الفرد والخبز',
        description: 'خطوات الخبز والفرد المتاحة من المرجع الحالي.',
        steps: steps.filter(step => step.phaseId === 'baking'),
        provenance: { sourceType: 'recipe', sourceId: recipeId, completeness: PARTIAL }
      }, { id: 'baking', completeness: PARTIAL })
    };
  }

  function stageToProtocolStep(stage, fillingId, index) {
    return {
      id: `${fillingId}-stage-${index + 1}`,
      phaseId: 'filling',
      operatorAction: stage?.summary || stage?.title || `مرحلة ${index + 1}`,
      purpose: stage?.title || null,
      inputs: [],
      tools: [],
      controls: [
        ...makeQualitativeControls(stage?.controls, 'ضبط المرحلة'),
        ...makeQualitativeControls(stage?.tempCues, 'إشارة حرارية'),
        ...makeQualitativeControls(stage?.timeCues, 'إشارة زمنية')
      ],
      sensoryCues: arrayify(stage?.stopCues).map(cue => ({ channel: 'visual', cue: String(cue) })),
      readinessGate: {
        condition: arrayify(stage?.stopCues).join('، ') || 'اكتمال الإشارات المرجعية لهذه المرحلة.',
        blockers: arrayify(stage?.failureSignals),
        warning: 'هذه المرحلة مشتقة من الماستر المرجعي، وتبقى بقدر اكتمال مرجعها.'
      },
      failureSignals: arrayify(stage?.failureSignals).map(signal => ({ signal: String(signal), cause: null, fix: null, severity: 'unknown' })),
      outputState: stage?.title || null,
      scienceRef: null,
      provenance: { sourceType: 'reference-profile', sourceId: fillingId, completeness: PARTIAL }
    };
  }

  function buildMasterStageFallback(filling) {
    const fillingId = global.resolveFillingId?.(getFillingId(filling)) || getFillingId(filling) || 'filling';
    const steps = arrayify(filling?.masterStages).map((stage, index) => stageToProtocolStep(stage, fillingId, index)).filter(Boolean);
    if (!steps.length) return null;
    return normalizePhase({
      id: 'filling',
      title: `بروتوكول الحشو — ${filling?.name || fillingId}`,
      description: 'مرجع احتياطي من المراحل الأساسية المهيكلة بدل النص الحر أو الشيفرة الخام.',
      steps,
      provenance: { sourceType: 'reference-profile', sourceId: fillingId, completeness: PARTIAL }
    }, { id: 'filling', completeness: PARTIAL });
  }

  function inferFillingScienceRef(filling) {
    const profile = filling?.profile || {};
    const processClass = String(profile.processClass || '').toLowerCase();
    const mixingFamily = String(profile.mixingFamily || '').toLowerCase();
    const ingredientKeys = arrayify(filling?.base).map(item => String(item?.key || '').toLowerCase());
    if (
      processClass.includes('whipped') ||
      mixingFamily.includes('whipped') ||
      ingredientKeys.includes('whipping-cream')
    ) {
      return 'filling-whipped-dairy';
    }
    if (
      ingredientKeys.includes('dulce-de-leche') ||
      ingredientKeys.includes('caramel') ||
      ingredientKeys.includes('condensed-milk')
    ) {
      return 'dulce-folding';
    }
    if (ingredientKeys.includes('sour-cream')) {
      return 'sourcream-mixing';
    }
    return 'filling-rule-context';
  }

  function buildFallbackFillingPhase(filling, mode, ruleSteps = []) {
    if (mode === 'custom') {
      const seedScienceRef = inferFillingScienceRef(filling);
      const seedLabel = filling?.name || getFillingId(filling) || 'المرجع المختار';
      const practicalSteps = arrayify(ruleSteps);
      return normalizePhase({
        id: 'filling',
        title: 'خطوات تشغيل الحشو الحر',
        description: practicalSteps.length
          ? 'رتّب مكوناتك وفق وظيفة كل منها، ثم استخدم الإرشادات العملية المطابقة للصيغة. هذه الإرشادات لا تغيّر المقادير التي أدخلتها.'
          : 'المقادير محسوبة، لكن الصيغة لا تحتوي بعد على مكونات تطابق قاعدة تشغيل عامة. اكتب ترتيب الخلط الخاص بك واحفظه مع الوصفة.',
        steps: practicalSteps.length ? practicalSteps : [{
          id: 'custom-filling-formula',
          phaseId: 'filling',
          operatorAction: 'حدّد ترتيب الإضافة والخلط ودرجة البرودة المطلوبة لهذه الصيغة، ثم سجّل علامة التوقف التي ستعتمد عليها.',
          purpose: 'تحويل المقادير إلى خطوات تنفيذية واضحة من دون فرض طريقة وصفة أخرى عليها.',
          controls: [
            { type: 'event', label: 'مرجع البداية', text: seedLabel, confidence: DERIVED }
          ],
          sensoryCues: [],
          readinessGate: {
            condition: 'قوام متجانس مناسب لاستخدام الحشو المختار داخل الطبقات أو على السطح.',
            blockers: ['كتل ظاهرة', 'انفصال سائل', 'قوام لا يحتفظ بطبقة متساوية'],
            warning: null
          },
          failureSignals: [],
          outputState: 'حشو متجانس صالح للاستخدام المقصود.',
          scienceRef: seedScienceRef,
          provenance: { sourceType: 'compiled', sourceId: 'custom-filling', completeness: REF_ONLY }
        }],
        provenance: { sourceType: 'compiled', sourceId: 'custom-filling', completeness: REF_ONLY }
      }, { id: 'filling', completeness: REF_ONLY });
    }

    const fillingId = getFillingId(filling) || 'filling';
    const action = filling?.method || 'اتبع المرجع المعتمد لهذا الحشو.';
    return normalizePhase({
      id: 'filling',
      title: `بروتوكول الحشو — ${filling?.name || fillingId}`,
      description: 'مرجع احتياطي عندما لا يوجد بروتوكول محرر يدويًا ومراجع بالكامل.',
      steps: [stepFromFreeText(action, 'filling', fillingId, 0)],
      provenance: { sourceType: 'recipe', sourceId: fillingId, completeness: PARTIAL }
    }, { id: 'filling', completeness: PARTIAL });
  }


  function buildRecipeIngredientMap(recipe) {
    const out = {};
    Object.entries(recipe?.ingredients || {}).forEach(([key, entry]) => {
      const weight = Number(entry?.weight || entry?.totalWeight || 0);
      if (weight > 0) out[key] = weight;
    });
    return out;
  }

  function inferRecipeDoughProfile(recipe) {
    if (!recipe || typeof global.getMasterDoughProfile !== 'function') return null;
    const ingredients = buildRecipeIngredientMap(recipe);
    const hasHoneyFamily = Number(ingredients.honey || 0) > 0;
    const hasButter = Number(ingredients.butter || 0) > 0;
    const hasEggs = Number(ingredients.eggs || 0) > 0;
    const hasLeavener = Number(ingredients.bakingSoda || 0) > 0 || Number(ingredients.bakingPowder || 0) > 0;
    if (hasHoneyFamily && hasButter && hasEggs && hasLeavener) {
      return global.getMasterDoughProfile('classic_cooked_honey_soda_medovik') || null;
    }
    return null;
  }

  function makeQualitativeControls(values, label = 'ضبط المرحلة') {
    return arrayify(values).map(value => ({
      type: 'qualitative',
      label,
      text: String(value),
      confidence: EXPLICIT
    }));
  }

  function doughStageToProtocolStep(stage, recipe, phaseId, index) {
    const recipeId = getRecipeId(recipe) || 'recipe';
    return {
      id: `${recipeId}-profile-stage-${index + 1}`,
      phaseId,
      operatorAction: stage?.summary || stage?.title || `مرحلة ${index + 1}`,
      purpose: stage?.title || null,
      inputs: [],
      tools: [],
      controls: [
        ...makeQualitativeControls(stage?.controls, 'ضبط المرحلة'),
        ...makeQualitativeControls(stage?.tempCues, 'إشارة حرارية'),
        ...makeQualitativeControls(stage?.timeCues, 'إشارة زمنية')
      ],
      sensoryCues: arrayify(stage?.stopCues).map(cue => ({ channel: 'visual', cue: String(cue) })),
      readinessGate: {
        condition: arrayify(stage?.stopCues).join('، ') || 'اكتمال إشارات هذه المرحلة المرجعية.',
        blockers: arrayify(stage?.failureSignals).map(String),
        warning: 'هذه الخطوة profile-backed: تحافظ على الإشارات المرجعية دون اختراع أرقام غير موثقة.'
      },
      failureSignals: arrayify(stage?.failureSignals).map(signal => ({ signal: String(signal), cause: null, fix: null, severity: 'unknown' })),
      outputState: stage?.summary || stage?.title || null,
      scienceRef: phaseId === 'dough' ? 'dough-profile-family' : 'baking-sheet-layers',
      provenance: { sourceType: 'reference-profile', sourceId: recipeId, completeness: PARTIAL }
    };
  }

  function buildProfileBackedDoughPhase(recipe) {
    const recipeId = getRecipeId(recipe) || 'recipe';
    const profile = inferRecipeDoughProfile(recipe);
    const stages = arrayify(profile?.stages);
    if (!stages.length) return null;

    const doughSteps = stages
      .filter(stage => String(stage?.stageKind || '').toLowerCase() !== 'baking' && !/خبز|تجفيف/.test(String(stage?.title || '')))
      .map((stage, index) => doughStageToProtocolStep(stage, recipe, 'dough', index));
    const bakingSteps = stages
      .filter(stage => String(stage?.stageKind || '').toLowerCase() === 'baking' || /خبز|تجفيف/.test(String(stage?.title || '')))
      .map((stage, index) => doughStageToProtocolStep(stage, recipe, 'baking', index));

    if (recipe?.baking?.temp || recipe?.baking?.timePerLayer || recipe?.baking?.maxTimePerLayer) {
      bakingSteps.push({
        id: `${recipeId}-profile-baking-explicit`,
        phaseId: 'baking',
        operatorAction: 'طبّق إعدادات الخبز المرجعية المسجّلة لهذه الوصفة مع مراقبة اللون والجفاف السطحي.',
        purpose: 'ربط profile family بإعدادات الخبز الخاصة بهذه الوصفة.',
        inputs: [],
        tools: ['فرن'],
        controls: [
          ...(Number.isFinite(Number(recipe?.baking?.temp)) ? [{ type: 'temperature', label: 'حرارة الفرن', value: Number(recipe.baking.temp), min: Number(recipe.baking.temp), max: Number(recipe.baking.temp), unit: '°م', confidence: EXPLICIT, text: null }] : []),
          ...((Number.isFinite(Number(recipe?.baking?.timePerLayer)) || Number.isFinite(Number(recipe?.baking?.maxTimePerLayer))) ? [{ type: 'time', label: 'زمن الخبز لكل طبقة', value: null, min: Number(recipe?.baking?.timePerLayer) || null, max: Number(recipe?.baking?.maxTimePerLayer || recipe?.baking?.timePerLayer) || null, unit: 'دقيقة', confidence: EXPLICIT, text: null }] : [])
        ],
        sensoryCues: [{ channel: 'visual', cue: 'الأرقام توجهك لكنها لا تلغي مراقبة اللون والجفاف الفعلي.' }],
        readinessGate: {
          condition: 'لون مناسب + تثبيت بنيوي + جفاف سطحي مقبول.',
          blockers: ['شحوب خام', 'اسمرار مرّ أو جفاف زائد'],
          warning: null
        },
        failureSignals: [],
        outputState: 'طبقة مخبوزة صالحة للتبريد والتجميع.',
        scienceRef: 'baking-sheet-layers',
        provenance: { sourceType: 'recipe', sourceId: recipeId, completeness: PARTIAL }
      });
    }

    return {
      dough: normalizePhase({
        id: 'dough',
        title: `بروتوكول العجين — ${recipe?.name || recipeId}`,
        description: `Structured fallback من profile عائلة العجين (${profile?.displayName || 'مرجع عجين'}) بدل النص الحر المباشر.`,
        steps: doughSteps,
        provenance: { sourceType: 'reference-profile', sourceId: recipeId, completeness: PARTIAL }
      }, { id: 'dough', completeness: PARTIAL }),
      baking: normalizePhase({
        id: 'baking',
        title: 'الفرد والخبز',
        description: 'مزيج من profile family + إعدادات الخبز الصريحة المتوفرة في بيانات الوصفة.',
        steps: bakingSteps,
        provenance: { sourceType: 'reference-profile', sourceId: recipeId, completeness: PARTIAL }
      }, { id: 'baking', completeness: PARTIAL })
    };
  }

  function textControlFromRule(type, label, value, unit) {
    if (!value) return null;
    const raw = String(value).trim();
    const parsed = type === 'temperature' ? extractTempControl(raw) : extractTimeControl(raw);
    if (parsed) return { ...parsed, label };
    return {
      type,
      label,
      text: raw,
      confidence: EXPLICIT
    };
  }

  function ruleStepToProtocolStep(rule, rawStep, index) {
    const stepId = rawStep?.step || `rule-step-${index + 1}`;
    const technique = rawStep?.technique || {};
    const controls = [
      textControlFromRule('time', 'المدة', rawStep?.time),
      textControlFromRule('temperature', 'الحرارة', rawStep?.temp),
      rawStep?.speed ? { type: 'speed', label: 'السرعة', text: String(rawStep.speed), confidence: EXPLICIT } : null,
      technique?.target ? { type: 'event', label: 'الهدف', text: String(technique.target), confidence: EXPLICIT } : null,
      technique?.test ? { type: 'sensory', label: 'الاختبار', text: String(technique.test), confidence: EXPLICIT } : null
    ].filter(Boolean);

    const methodBits = [];
    if (typeof technique?.method === 'string') methodBits.push(technique.method);
    if (Array.isArray(technique?.method?.setup)) methodBits.push(...technique.method.setup);
    if (Array.isArray(technique?.method?.monitoring)) methodBits.push(...technique.method.monitoring);
    if (Array.isArray(technique?.method?.powderedSugar)) methodBits.push(...technique.method.powderedSugar);
    if (Array.isArray(technique?.method?.cocoa)) methodBits.push(...technique.method.cocoa);

    const operatorAction = [rawStep?.name, ...methodBits].filter(Boolean).join(' — ') || rule?.title || stepId;
    const sensoryCues = [technique?.test, technique?.target].filter(Boolean).map(cue => ({ channel: 'visual', cue: String(cue) }));
    const warnings = arrayify(rule?.warnings).map(String);

    return {
      id: `rule-${rule.id}-${index + 1}`,
      phaseId: 'filling',
      operatorAction,
      purpose: technique?.why ? String(technique.why) : (rule?.title || null),
      inputs: [],
      tools: arrayify(rawStep?.tools).map(String),
      controls: controls.length ? controls : [{ type: 'event', label: 'إشارة القاعدة', text: 'اتبع القاعدة التشغيلية كما هي دون اختراع مؤشرات إضافية من خارج المرجع.', confidence: EXPLICIT }],
      sensoryCues,
      readinessGate: {
        condition: technique?.target ? String(technique.target) : 'تحقق من اكتمال القاعدة التشغيلية المرتبطة بهذه المكونات.',
        blockers: warnings,
        warning: warnings[0] || null
      },
      failureSignals: [],
      outputState: rawStep?.name || rule?.title || null,
      scienceRef: 'filling-rule-context',
      provenance: { sourceType: 'rule', sourceId: rule.id, completeness: PARTIAL }
    };
  }

  function buildApplicableRuleSteps(filling) {
    if (typeof global.getApplicableRules !== 'function') return [];
    const ingredientIds = arrayify(filling?.base).map(item => item?.key).filter(Boolean);
    if (!ingredientIds.length) return [];
    const rules = global.getApplicableRules(ingredientIds, global.IngredientsDB || {}) || [];
    return rules.flatMap(rule => arrayify(rule?.steps).map((rawStep, index) => ruleStepToProtocolStep(rule, rawStep, index)));
  }

  function mergePhaseWithRuleSteps(phase, ruleSteps) {
    const extraSteps = arrayify(ruleSteps).filter(Boolean);
    if (!phase) return phase;
    if (!extraSteps.length) return phase;
    const existing = new Set(arrayify(phase.steps).map(step => step?.id).filter(Boolean));
    const merged = [...arrayify(phase.steps), ...extraSteps.filter(step => !existing.has(step.id))];
    const baseDescription = phase.description ? `${phase.description} ` : '';
    return normalizePhase({
      ...phase,
      description: `${baseDescription}تم إلحاق قواعد تشغيلية مطابقة للمكونات النشطة عندما كانت متاحة.`.trim(),
      steps: merged,
      provenance: phase.provenance
    }, { id: phase.id || 'filling', completeness: PARTIAL });
  }


  function summarizeCoverage(kind, id, phase) {
    const validation = typeof global.validateProtocolPhase === 'function' ? global.validateProtocolPhase(phase) : { ok: true, errors: [] };
    return {
      kind,
      id,
      title: phase?.title || id,
      completeness: phase?.provenance?.completeness || PARTIAL,
      validation: validation.ok ? 'valid' : 'invalid',
      errors: validation.errors || [],
      stepCount: arrayify(phase?.steps).length,
      ready: validation.ok && (phase?.provenance?.completeness === FULL)
    };
  }

  function getCoverageMatrix() {
    const dough = Object.keys(global.MEDOVIK_RECIPE_PROFILES || {}).map(id => {
      const recipe = global.MEDOVIK_RECIPE_PROFILES?.[id];
      const phases = ProtocolAuthority.getDoughPhases(recipe);
      const phase = phases?.dough;
      return summarizeCoverage('dough', id, phase);
    });
    const fillingIds = ['classic_sourcream_frosting','classic_dulce_sourcream','shouqi_1','ayahabib','shouqi_2','shouqi_3','hiba','younis_cream1','younis_cream2'];
    const fillings = fillingIds.map(id => {
      const filling = global.getFillingRecord?.(id) || global.FILLING_CATALOG?.[id] || { id, name: id };
      const phase = ProtocolAuthority.getFillingPhase(filling, 'reference');
      return summarizeCoverage('filling', id, phase);
    });
    return { scope: SINGLE_FILLING_SCOPE, dough, fillings };
  }

  const ProtocolAuthority = {
    getDoughPhases(recipe) {
      const recipeId = getRecipeId(recipe);
      const explicit = DOUGH_PROTOCOLS[recipeId];
      if (explicit) {
        const completeness = READY_DOUGH_IDS.includes(recipeId) ? FULL : PARTIAL;
        return {
          dough: normalizePhase({
            id: 'dough',
            title: `بروتوكول العجين — ${recipe?.name || recipeId}`,
            steps: explicit.filter(step => step.phaseId === 'dough').map(step => ({ ...step, provenance: { ...(step.provenance || {}), completeness } })),
            provenance: { sourceType: 'editorial', sourceId: recipeId, completeness }
          }, { id: 'dough', completeness }),
          baking: normalizePhase({
            id: 'baking',
            title: 'الفرد والخبز',
            steps: explicit.filter(step => step.phaseId === 'baking').map(step => ({ ...step, provenance: { ...(step.provenance || {}), completeness } })),
            provenance: { sourceType: 'editorial', sourceId: recipeId, completeness }
          }, { id: 'baking', completeness })
        };
      }
      // Preserve the recipe's recorded method before falling back to a generic family profile.
      // This is essential for source-specific paths such as Spartak's spreadable batter.
      return buildFallbackDoughPhase(recipe) || buildProfileBackedDoughPhase(recipe);
    },

    getFillingPhase(filling, mode = 'reference') {
      if (mode !== 'custom') {
        const explicit = FILLING_PROTOCOLS[getFillingId(filling)];
        if (explicit) {
          const fillingId = getFillingId(filling);
          const completeness = READY_FILLING_IDS.includes(fillingId) ? FULL : PARTIAL;
          const masterSteps = arrayify(filling?.masterStages)
            .map((stage, index) => stageToProtocolStep(stage, fillingId, index))
            .filter(Boolean);
          return normalizePhase({
            id: 'filling',
            title: `بروتوكول الحشو — ${filling?.name || fillingId}`,
            steps: [
              ...explicit.map(step => ({ ...step, provenance: { ...(step.provenance || {}), completeness } })),
              ...masterSteps
            ],
            provenance: { sourceType: 'recipe', sourceId: fillingId, completeness }
          }, { id: 'filling', completeness });
        }
      }
      const masterStagePhase = mode !== 'custom' ? buildMasterStageFallback(filling) : null;
      const customRuleSteps = mode === 'custom' ? buildApplicableRuleSteps(filling) : [];
      return masterStagePhase || buildFallbackFillingPhase(filling, mode, customRuleSteps);
    },

    getAssemblyPhase() {
      return ASSEMBLY_PROTOCOL;
    },

    getCoverageMatrix
  };

  global.ProtocolAuthority = ProtocolAuthority;
  global.getProtocolCoverageMatrix = getCoverageMatrix;
})(typeof window !== 'undefined' ? window : globalThis);
