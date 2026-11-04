// =============================================================================
// Medovik Workflow v4 - Dough Recipes Database
// قاعدة بيانات وصفات الميدوفيك
// =============================================================================

const MEDOVIK_RECIPE_PROFILES = {
  // 1. الشيف آية حبيب - وصفة كلاسيكية
  ayaHabib: {
    id: 'ayaHabib',
    processFamily: 'HOT_BASE_EGG_ADDED_AFTER_HEAT',
    shapingFamily: 'ROLLED_RESTED',
    sourceCompleteness: 'FULL',
    flourPolicy: 'FIXED',
    temperingDirection: 'EGG_INTO_HOT_BASE',
    layerGeometry: { rawSheetThicknessMm: 1.5, targetBakedLayerThicknessMm: 2.0, status: 'ENGINEERING_DEFAULT' },
    bakeColorIntent: 'golden',
    bakeEndpoint: { hot: ['اختفاء اللمعان الخام', 'ثبات السطح والحواف'], cooled: ['تتحمل الطبقة النقل بعد تبريد قصير دون تمزق أو التصاق شديد'] },
    name: 'آية حبيب - كلاسيكية',
    description: 'وصفة كيكة العسل الروسية الكلاسيكية - متوازنة ومثالية للمبتدئين',
    bestFor: 'مبتدئين، نتيجة متسقة',
    icon: '👩‍🍳',
    chef: 'آية حبيب',
    source: 'وصفة تقليدية',
    // المقادير الأساسية (لـ 8 طبقات)
    ingredients: {
      flour: { weight: 500, unit: 'g', note: '4 أكواب قياس تقريباً' },
      sugar: { weight: 200, unit: 'g', note: 'كوب قياس' },
      honey: { weight: 130, unit: 'g', note: 'نصف كوب' },
      butter: { weight: 180, unit: 'g', note: 'كوب إلا ربع' },
      eggs: { count: 3, unitWeight: 50, totalWeight: 150, note: '3 حبات كبيرة' },
      bakingSoda: { weight: 12, unit: 'g', note: 'ملعقتان صغيرتان' },
      salt: { weight: 2.5, unit: 'g', note: 'رشة' }
    },
    // نسب للحسابات
    ratios: {
      flour: 100,
      sugar: 40,
      honey: 26,
      butter: 36,
      eggs: 30,
      bakingSoda: 2.4
    },
    // إعدادات الخبز
    baking: {
      method: 'one-batch', // أو 'tempering'
      temp: 180,
      timePerLayer: 5,
      maxTimePerLayer: 7,
      note: 'تُخبز على حرارة 180°م لمدة 5-7 دقائق للطبقة'
    },
    // طريقة التحضير
    method: {
      type: 'one-batch',
      steps: [
        'تُذاب الزبدة مع السكر والعسل في قدر عميق على نار هادئة حتى يصل الخليط للغليان',
        'تُضاف بيكربونات الصودا ويُقلب الخليط بسرعة (سيحدث فوران وتغير في اللون). يُرفع عن النار',
        'يُترك ليبرد قليلاً، ثم يُضاف البيض تدريجياً (واحدة بواحدة) مع التقليب السريع',
        'يُضاف الدقيق والملح تدريجياً وتُعجن حتى تتكون عجينة طرية ولا تلتصق باليد',
        'تُترك لترتاح (نصف ساعة إلى ساعة) وهي مغطاة',
        'تُفرد الطبقات بسمك رقيق جداً وتُخبز على حرارة 180°م لمدة 5-7 دقائق'
      ]
    },
    notes: [
      'وصفة متوازنة ومثالية للمبتدئين',
      'العجينة يجب أن تكون طرية ولا تلتصق باليد',
      'الراحة مهمة قبل الفرد'
    ]
  },

  // 2. الشيف هبة أبو الخير - طبقات العسل المكرمل
  hebaAbuElKhair: {
    id: 'hebaAbuElKhair',
    processFamily: 'HOT_BASE_EGG_ADDED_AFTER_HEAT',
    shapingFamily: 'ROLLED_DIRECT',
    sourceCompleteness: 'FULL',
    flourPolicy: 'FIXED',
    temperingDirection: 'EGG_INTO_HOT_BASE',
    layerGeometry: { rawSheetThicknessMm: 1.3, targetBakedLayerThicknessMm: 1.8, status: 'ENGINEERING_DEFAULT' },
    bakeColorIntent: 'light-golden',
    bakeEndpoint: { hot: ['اختفاء اللمعان الخام', 'ثبات السطح والحواف'], cooled: ['تتحمل الطبقة النقل بعد تبريد قصير دون تمزق أو التصاق شديد'] },
    name: 'هبة أبو الخير - مكرمل',
    description: 'وصفة طبقات العسل المكرمل - لون ذهبي جميل',
    bestFor: 'محبي اللون الذهبي',
    icon: '🌟',
    chef: 'هبة أبو الخير',
    source: 'وصفة مكرملة',
    ingredients: {
      flour: { weight: 540, unit: 'g', note: '4 أكواب + 4 ملاعق كبيرة' },
      sugar: { weight: 150, unit: 'g', note: 'كوب إلا ربع' },
      honey: { weight: 170, unit: 'g', note: 'كوب (حوالي 8 ملاعق كبيرة)' },
      butter: { weight: 130, unit: 'g', note: '3/4 كوب + ملعقة صغيرة' },
      eggs: { count: 3, unitWeight: 50, totalWeight: 150, note: '3 حبات كبيرة' },
      bakingSoda: { weight: 6, unit: 'g', note: 'ملعقة صغيرة' },
      vanilla: { weight: 5, unit: 'g', note: 'ملعقة صغيرة' }
    },
    ratios: {
      flour: 100,
      sugar: 27.8,
      honey: 31.5,
      butter: 24,
      eggs: 27.8
    },
    baking: {
      method: 'one-batch',
      temp: 180,
      timePerLayer: 5,
      maxTimePerLayer: 5,
      note: 'تُخبز على حرارة 180°م لمدة 5 دقائق'
    },
    method: {
      type: 'one-batch',
      steps: [
        'يُوضع العسل والسكر والزبدة في قدر على نار هادئة حتى يبدأ الغليان من الجوانب',
        'تُضاف البيكنج صودا مع التقليب المستمر لمدة دقيقة حتى يتغير اللون للأشقر الفاتح',
        'يُرفع الخليط ويُضاف إليه البيض المخفوق مع الفانيليا تدريجياً مع الخلط المستمر',
        'يُضاف الدقيق ويُعجن الخليط حتى تتكون عجينة ناعمة وطرية',
        'تُقسم العجينة وتُغطى، ثم تُفرد بسمك رقيق جداً (تُثقب بالشوكة) وتُخبز على حرارة 180°م لمدة 5 دقائق'
      ]
    },
    notes: [
      'اللون الذهبي نتيجة الكرملة',
      'ثقب الطبقات بالشوكة قبل الخبز'
    ]
  },

  // 3. الشيف أحمد عبدالسلام يونس - الطريقة الروسية الأصلية
  ahmedYounis: {
    id: 'ahmedYounis',
    processFamily: 'HOT_BASE_EGG_ADDED_AFTER_HEAT',
    shapingFamily: 'ROLLED_CHILLED',
    sourceCompleteness: 'FULL',
    flourPolicy: 'FIXED',
    temperingDirection: 'EGG_INTO_HOT_BASE',
    layerGeometry: { rawSheetThicknessMm: 0.5, targetBakedLayerThicknessMm: 1.2, status: 'SOURCE_VALUE' },
    bakeColorIntent: 'deep-golden',
    bakeEndpoint: { hot: ['اختفاء اللمعان الخام', 'ثبات السطح والحواف'], cooled: ['تتحمل الطبقة النقل بعد تبريد قصير دون تمزق أو التصاق شديد'] },
    name: 'أحمد عبدالسلام يونس - روسية أصلية',
    description: 'الطريقة الروسية الأصلية - كراميل ذهبي عميق',
    bestFor: 'محبي النكهة العميقة',
    icon: '🇷🇺',
    chef: 'أحمد عبدالسلام يونس',
    source: 'طريقة روسية أصلية',
    ingredients: {
      flour: { weight: 500, unit: 'g' },
      sugar: { weight: 200, unit: 'g' },
      honey: { weight: 130, unit: 'g' },
      butter: { weight: 200, unit: 'g' },
      eggs: { count: 3, unitWeight: 50, totalWeight: 150, note: '3 بيضات' },
      bakingSoda: { weight: 6, unit: 'g', note: '6 جرام' }
    },
    ratios: {
      flour: 100,
      sugar: 40,
      honey: 26,
      butter: 40,
      eggs: 30
    },
    baking: {
      method: 'one-batch',
      temp: 180,
      timePerLayer: 5,
      maxTimePerLayer: 5,
      note: 'تُخبز على حرارة 180°م لمدة 5 دقائق'
    },
    method: {
      type: 'one-batch',
      steps: [
        'يُوضع السكر والزبدة على نار هادئة، ثم يُضاف العسل ويُقلب حتى يتحول لكراميل ذهبي',
        'يُرفع الخليط ويُبرد قليلاً، ثم يُضاف البيض مع التقليب المستمر بمضرب سلك يدوي',
        'تُضاف المكونات الجافة وتُعجن جيداً، ثم تريح العجينة في الثلاجة لمدة ساعة',
        'تُشكل العجينة على شكل "رول" وتُقطع، ثم تُفرد بسمك رقيق جداً (نصف ملّي)',
        'تُخبز الطبقات على حرارة 180°م لمدة 5 دقائق'
      ]
    },
    notes: [
      'الكراميل الذهبي يعطي نكهة عميقة',
      'الراحة في الثلاجة مهمة',
      'الفرد رقيق جداً (نصف ملّي)'
    ]
  },

  // 4. الشيف أحمد شوقي
  ahmedShouqi: {
    id: 'ahmedShouqi',
    processFamily: 'EGG_HEATED_FROM_START',
    shapingFamily: 'SOURCE_INCOMPLETE',
    sourceCompleteness: 'PARTIAL',
    flourPolicy: 'FIXED',
    temperingDirection: null,
    layerGeometry: { rawSheetThicknessMm: 1.5, targetBakedLayerThicknessMm: 2.0, status: 'ENGINEERING_DEFAULT' },
    bakeColorIntent: 'golden',
    bakeEndpoint: { hot: ['اختفاء اللمعان الخام', 'ثبات السطح والحواف'], cooled: ['تتحمل الطبقة النقل بعد تبريد قصير دون تمزق أو التصاق شديد'] },
    name: 'أحمد شوقي - شوقي',
    description: 'وصفة كيكة العسل - غنية ومتخصصة',
    bestFor: 'نتيجة غنية',
    icon: '👨‍🍳',
    chef: 'أحمد شوقي',
    source: 'وصفة شوقي',
    ingredients: {
      flour: { weight: 450, unit: 'g', note: 'دقيق لكل الأغراض' },
      sugar: { weight: 150, unit: 'g', note: 'سكر أبيض' },
      honey: { weight: 100, unit: 'g' },
      butter: { weight: 120, unit: 'g' },
      eggs: { count: 3, unitWeight: 50, totalWeight: 150, note: '150 جرام (حوالي 3 حبات)' },
      bakingSoda: { weight: 6, unit: 'g', note: '6 جرام' }
    },
    ratios: {
      flour: 100,
      sugar: 33.3,
      honey: 22.2,
      butter: 26.7,
      eggs: 33.3
    },
    baking: {
      method: 'one-batch',
      temp: 180,
      timePerLayer: 5,
      maxTimePerLayer: 5,
      note: 'تُخبز على حرارة 180°م'
    },
    method: {
      type: 'one-batch',
      steps: [
        'تُمزج كل المكونات (ماعدا الدقيق) في قدر على النار مع التقليب المستمر',
        'يُرفع الخليط من على النار عندما تصل درجة حرارته إلى 70 درجة مئوية',
        'يُضاف الدقيق ويُقلب مع المزيج حتى تتكون العجينة'
      ]
    },
    notes: [
      'درجة الحرارة 70°م نقطة أساسية',
      'الخلط المستمر مهم'
    ]
  },

  // 5. الشيف تيتيانا فيربيتسكا - كلاسيكية (10 طبقات)
  tetyanaClassic: {
    id: 'tetyanaClassic',
    processFamily: 'EGG_HEATED_FROM_START',
    shapingFamily: 'ROLLED_CHILLED',
    sourceCompleteness: 'FULL',
    flourPolicy: 'FIXED',
    temperingDirection: null,
    layerGeometry: { rawSheetThicknessMm: 1.5, targetBakedLayerThicknessMm: 2.0, status: 'ENGINEERING_DEFAULT' },
    bakeColorIntent: 'golden',
    bakeEndpoint: { hot: ['اختفاء اللمعان الخام', 'ثبات السطح والحواف'], cooled: ['تتحمل الطبقة النقل بعد تبريد قصير دون تمزق أو التصاق شديد'] },
    name: 'تيتيانا فيربيتسكا - كلاسيكية',
    description: 'الوصفة الكلاسيكية لـ 10 طبقات بقطر 22 سم',
    bestFor: 'كيكة كبيرة (10 طبقات)',
    icon: '🇺🇦',
    chef: 'Tetyana Verbytska',
    source: 'وصفة أوكرانية كلاسيكية',
    ingredients: {
      flour: { weight: 500, unit: 'g' },
      sugar: { weight: 220, unit: 'g' },
      honey: { weight: 100, unit: 'g' },
      butter: { weight: 120, unit: 'g', note: 'زبدة 82.5%' },
      eggs: { count: 4, unitWeight: 45, totalWeight: 180, note: '180 جرام (حوالي 3-4 حبات)' },
      bakingSoda: { weight: 8, unit: 'g', note: '8 جرام' }
    },
    ratios: {
      flour: 100,
      sugar: 44,
      honey: 20,
      butter: 24,
      eggs: 36
    },
    baking: {
      method: 'one-batch',
      temp: 170,
      timePerLayer: 5,
      maxTimePerLayer: 5,
      note: 'تُخبز على حرارة 170°م لمدة 5 دقائق'
    },
    method: {
      type: 'one-batch',
      steps: [
        'يُخفق البيض مع السكر في قدر، ثم تُضاف الزبدة والعسل والصودا',
        'يُطهى المزيج على نار متوسطة مع التقليب المستمر حتى يفور ويزداد حجمه',
        'يُرفع عن النار ويُضاف الدقيق المنخول ويُعجن',
        'تُبرد العجينة في الثلاجة (15-30 دقيقة)، ثم تُقسم لـ 10 أجزاء',
        'تُفرد الطبقات وتُخبز على حرارة 170°م لمدة 5 دقائق'
      ]
    },
    notes: [
      'مناسبة لـ 10 طبقات بقطر 22 سم',
      'التبريد 15-30 دقيقة قبل الفرد'
    ]
  },

  // 6. الشيف تيتيانا فيربيتسكا - سبارتاك (كاكاو)
  tetyanaSpartak: {
    id: 'tetyanaSpartak',
    processFamily: 'SOUR_CREAM_SODA_SPARTAK',
    shapingFamily: 'SPREAD_BATTER_SHEET',
    sourceCompleteness: 'FULL',
    flourPolicy: 'FIXED',
    temperingDirection: null,
    layerGeometry: { rawSheetThicknessMm: 2.0, targetBakedLayerThicknessMm: 2.2, status: 'ENGINEERING_DEFAULT' },
    bakeColorIntent: 'cocoa-set',
    bakeEndpoint: { hot: ['اختفاء اللمعان الخام', 'ثبات السطح والحواف'], cooled: ['تتحمل الطبقة النقل بعد تبريد قصير دون تمزق أو التصاق شديد'] },
    name: 'تيتيانا فيربيتسكا - سبارتاك (كاكاو)',
    description: 'كيكة سبارتاك بالكاكاو - غنية وداكنة',
    bestFor: 'محبي الشوكولاتة',
    icon: '🍫',
    chef: 'Tetyana Verbytska',
    source: 'وصفة Spartak',
    ingredients: {
      flour: { weight: 400, unit: 'g' },
      cocoa: { weight: 50, unit: 'g', note: 'كاكاو بودرة' },
      honey: { weight: 480, unit: 'g' },
      sugar: { weight: 90, unit: 'g' },
      butter: { weight: 115, unit: 'g' },
      sourCream: { weight: 165, unit: 'g', note: 'كريمة حامضة 15-20%' },
      eggs: { count: 5, unitWeight: 52, totalWeight: 260, note: '260 جرام' },
      bakingSoda: { weight: 12, unit: 'g', note: '12 جرام + رشة ملح' }
    },
    ratios: {
      flour: 100,
      cocoa: 12.5,
      honey: 120,
      sugar: 22.5,
      butter: 28.75,
      sourCream: 41.25,
      eggs: 65
    },
    baking: {
      method: 'one-batch',
      temp: 180,
      timePerLayer: 5,
      maxTimePerLayer: 8,
      note: 'تُخبز على حرارة 180°م لـ 5-8 دقائق'
    },
    method: {
      type: 'one-batch',
      steps: [
        'تُسخن الزبدة والعسل والسكر في قدر حتى يذوب السكر',
        'تُضاف الكريمة الحامضة المخلوطة بالصودا للخليط ويُقلب حتى يفور',
        'يُوضع الخليط في العجان ويُضاف البيض تدريجياً، ثم تُضاف المكونات الجافة',
        'يُفرد الخليط (يكون سائلاً نوعاً ما) في صواني خبز ويُخبز على حرارة 180°م لـ 5-8 دقائق'
      ]
    },
    notes: [
      'الخليط سائل نوعاً ما - طبيعي',
      'الكاكاو يعطي نكهة غنية'
    ]
  },

  // 7. الشيف ديب بيريلمان - Smitten Kitchen
  smittenKitchen: {
    id: 'smittenKitchen',
    processFamily: 'HOT_BASE_EGG_ADDED_AFTER_HEAT',
    shapingFamily: 'ROLLED_WARM',
    sourceCompleteness: 'FULL',
    flourPolicy: 'FIXED',
    temperingDirection: 'EGG_INTO_HOT_BASE',
    layerGeometry: { rawSheetThicknessMm: 1.5, targetBakedLayerThicknessMm: 2.0, status: 'ENGINEERING_DEFAULT' },
    bakeColorIntent: 'deep-golden',
    bakeEndpoint: { hot: ['اختفاء اللمعان الخام', 'ثبات السطح والحواف'], cooled: ['تتحمل الطبقة النقل بعد تبريد قصير دون تمزق أو التصاق شديد'] },
    name: 'Smitten Kitchen - أمريكية',
    description: 'وصفة Smitten Kitchen - مقاربة أمريكية',
    bestFor: 'مقاربة أمريكية',
    icon: '🇺🇸',
    chef: 'Deb Perelman',
    source: 'Smitten Kitchen',
    ingredients: {
      flour: { weight: 455, unit: 'g', note: '3.5 كوب' },
      honey: { weight: 170, unit: 'g', note: 'نصف كوب' },
      sugar: { weight: 100, unit: 'g', note: 'نصف كوب' },
      butter: { weight: 115, unit: 'g', note: 'نصف كوب' },
      eggs: { count: 3, unitWeight: 50, totalWeight: 150, note: '3 حبات كبيرة' },
      bakingSoda: { weight: 5, unit: 'g', note: 'ملعقة صغيرة' },
      salt: { weight: 2.5, unit: 'g', note: 'رشة' },
      vanilla: { weight: 5, unit: 'g', note: 'فانيليا' }
    },
    ratios: {
      flour: 100,
      honey: 37.4,
      sugar: 22,
      butter: 25.3,
      eggs: 33
    },
    baking: {
      method: 'one-batch',
      temp: 175,
      timePerLayer: 6,
      maxTimePerLayer: 7,
      note: 'تُخبز على 350°F (175°م) لمدة 6-7 دقائق'
    },
    method: {
      type: 'one-batch',
      steps: [
        'يُذاب السكر والعسل والزبدة في قدر حتى يغلي المزيج ويصبح لونه أغمق قليلاً',
        'تُرفع عن النار وتُضاف البيكنج صودا',
        'يُضاف البيض المخفوق بخيط رفيع جداً مع الخفق المستمر في القدر لضمان عدم نضجه',
        'يُقلب الدقيق والملح والفانيليا حتى تتكون عجينة سميكة',
        'تُقسم العجينة وتُفرد وهي دافئة وتُخبز على 350°F (175°م) لمدة 6-7 دقائق'
      ]
    },
    notes: [
      'الفرد وهي دافئة أسهل',
      'الخفق المستمر عند إضافة البيض مهم'
    ]
  },

  // 8. الشيف ديفيد - The Cooking Foodie
  davidCooking: {
    id: 'davidCooking',
    processFamily: 'BAIN_MARIE_EGG_SYSTEM',
    shapingFamily: 'ROLLED_DIRECT',
    sourceCompleteness: 'FULL',
    flourPolicy: 'FIXED',
    temperingDirection: null,
    layerGeometry: { rawSheetThicknessMm: 1.5, targetBakedLayerThicknessMm: 2.0, status: 'ENGINEERING_DEFAULT' },
    bakeColorIntent: 'golden',
    bakeEndpoint: { hot: ['اختفاء اللمعان الخام', 'ثبات السطح والحواف'], cooled: ['تتحمل الطبقة النقل بعد تبريد قصير دون تمزق أو التصاق شديد'] },
    name: 'The Cooking Foodie - ديفيد',
    description: 'وصفة The Cooking Foodie - حمام مائي',
    bestFor: 'طريقة الحمام المائي',
    icon: '📺',
    chef: 'David',
    source: 'The Cooking Foodie',
    ingredients: {
      flour: { weight: 450, unit: 'g', note: '3.5 كوب' },
      butter: { weight: 100, unit: 'g', note: '7 ملاعق كبيرة' },
      honey: { weight: 80, unit: 'g', note: '4 ملاعق كبيرة' },
      sugar: { weight: 150, unit: 'g', note: '3/4 كوب' },
      eggs: { count: 3, unitWeight: 50, totalWeight: 150, note: '3 حبات' },
      bakingSoda: { weight: 5, unit: 'g', note: 'ملعقة صغيرة' }
    },
    ratios: {
      flour: 100,
      butter: 22.2,
      honey: 17.8,
      sugar: 33.3,
      eggs: 33.3
    },
    baking: {
      method: 'one-batch',
      temp: 175,
      timePerLayer: 7,
      maxTimePerLayer: 8,
      note: 'تُخبز على 350°F (175°م) لمدة 7-8 دقائق'
    },
    method: {
      type: 'one-batch',
      steps: [
        'يُخفق البيض والسكر، ثم تُضاف الزبدة والعسل ويُوضع الخليط فوق حمام مائي (Double Boiler)',
        'يُقلب حتى تذوب الزبدة والسكر تماماً، ثم تُضاف البيكنج صودا وتُرفع عن النار',
        'يُضاف الدقيق تدريجياً ويُعجن، ثم تُقسم لـ 8 كرات وتُفرد رقيقة',
        'تُخبز على 350°F (175°م) لمدة 7-8 دقائق حتى تصبح ذهبية'
      ]
    },
    notes: [
      'طريقة الحمام المائي تضمن ذوبان كامل',
      '8 كرات للفرد'
    ]
  },

  // 9. الشيف دينا - Recipes Collection (الوصفة العائلية)
  dinaFamily: {
    id: 'dinaFamily',
    processFamily: 'EGG_HEATED_FROM_START',
    shapingFamily: 'ROLLED_RESTED',
    sourceCompleteness: 'FULL',
    flourPolicy: 'FIXED',
    temperingDirection: null,
    layerGeometry: { rawSheetThicknessMm: 1.5, targetBakedLayerThicknessMm: 2.0, status: 'ENGINEERING_DEFAULT' },
    bakeColorIntent: 'golden',
    bakeEndpoint: { hot: ['اختفاء اللمعان الخام', 'ثبات السطح والحواف'], cooled: ['تتحمل الطبقة النقل بعد تبريد قصير دون تمزق أو التصاق شديد'] },
    name: 'دينا - وصفة عائلية',
    description: 'الوصفة العائلية - طريقة الفوران',
    bestFor: 'وصفة عائلية تقليدية',
    icon: '👪',
    chef: 'دينا',
    source: 'Recipes Collection',
    ingredients: {
      flour: { weight: 600, unit: 'g' },
      butter: { weight: 100, unit: 'g', note: 'زبدة أو مارجرين' },
      sugar: { weight: 200, unit: 'g' },
      honey: { weight: 60, unit: 'g', note: '3 ملاعق كبيرة' },
      eggs: { count: 3, unitWeight: 50, totalWeight: 150, note: '3 حبات' },
      bakingSoda: { weight: 12, unit: 'g', note: 'ملعقتان صغيرتان' }
    },
    ratios: {
      flour: 100,
      butter: 16.7,
      sugar: 33.3,
      honey: 10,
      eggs: 25
    },
    baking: {
      method: 'one-batch',
      temp: 180,
      timePerLayer: 7,
      maxTimePerLayer: 8,
      note: 'تُخبز على حرارة 180°م لمدة 7-8 دقائق'
    },
    method: {
      type: 'one-batch',
      steps: [
        'تُوضع الزبدة والصودا والسكر والبيض والعسل في قدر على نار متوسطة',
        'يُقلب المزيج باستمرار حتى تذوب الزبدة والسكر ويفتح لون الخليط ويفور (يزداد حجمه 2-3 مرات)',
        'يُرفع عن النار ويُضاف الدقيق المنخول فوراً ويُعجن',
        'تُترك لترتاح وتبرد لمدة ساعة، ثم تُفرد رقيقة جداً وتُخبز على 180°م لمدة 7-8 دقائق'
      ]
    },
    notes: [
      'الفوران يزيد حجم الخليط 2-3 مرات',
      'الراحة ساعة كاملة',
      'الفرد رقيق جداً'
    ]
  }
};

// =============================================================================
// طريقة التمبرنج (Tempering Method) - للوصفات التي تدعمها
// =============================================================================
const TEMPERING_METHOD = {
  id: 'tempering-estimate',
  name: 'تقدير الدمج الحراري للبيض',
  description: 'أداة اختيارية للوصفات التي تضيف البيض إلى قاعدة ساخنة أو تضيف الساخن إلى البيض. لا تظهر للوصفات التي يُسخن فيها البيض من البداية.',
  directions: {
    EGG_INTO_HOT_BASE: 'إضافة البيض إلى القاعدة الساخنة',
    HOT_BASE_INTO_EGG: 'إضافة القاعدة الساخنة تدريجياً إلى البيض'
  },
  steps: [
    'اختر اتجاه الدمج المطابق للوصفة.',
    'أدخل الكتل ودرجات الحرارة الفعلية.',
    'استخدم الناتج كتقدير لاتزان الحرارة الكلي، مع استمرار الخفق ومراقبة أي تخثر موضعي.'
  ],
  note: 'الأداة لا تحسب حرارة التلامس اللحظية أو زمن التخثر، ولا تعطي ضماناً قطعياً.'
};

// =============================================================================
// ملاحظة v4
// مصدر حقيقة الحشوات النشط لم يعد داخل هذا الملف. الحشوات تأتي من
// data/filling-catalog.js المبني على master source واحد.
// =============================================================================

// Export
const __recipesGlobal = typeof window !== 'undefined' ? window : globalThis;
__recipesGlobal.MEDOVIK_RECIPE_PROFILES = MEDOVIK_RECIPE_PROFILES;
__recipesGlobal.TEMPERING_METHOD = TEMPERING_METHOD;
