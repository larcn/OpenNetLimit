(function(global) {
  'use strict';

  function arrayify(value) {
    return Array.isArray(value) ? value : [];
  }

  function uniqBy(items, keyFn) {
    const seen = new Set();
    const out = [];
    arrayify(items).forEach(item => {
      const key = keyFn(item);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });
    return out;
  }

  function collectScienceReferences(scienceIds) {
    const notes = typeof global.listScienceNotes === 'function' ? global.listScienceNotes(scienceIds) : [];
    return uniqBy(notes.flatMap(note => arrayify(note.references)).filter(Boolean), item => `${item.label}|${item.source}`);
  }

  function article(intro, sections) {
    return Object.freeze({
      intro,
      sections: arrayify(sections).map(section => Object.freeze({
        heading: section.heading,
        paragraphs: Object.freeze(arrayify(section.paragraphs)),
        bullets: Object.freeze(arrayify(section.bullets))
      }))
    });
  }

  function topic(definition) {
    return Object.freeze(Object.assign({}, definition, {
      references: Object.freeze(collectScienceReferences(definition.relatedScienceIds))
    }));
  }

  const SCIENCE_TOPICS = Object.freeze({
    'science:dough-base-heat': topic({
      id: 'science:dough-base-heat',
      categoryId: 'science:dough-foundation',
      title: 'تسخين قاعدة العجين بالعسل والسكر والزبدة',
      summary: 'الهدف من هذه المرحلة هو بناء قاعدة متجانسة قابلة لاستقبال البيض ثم الدقيق، لا الوصول إلى لون أو حرارة شكلية فقط.',
      phaseHints: Object.freeze(['setup', 'dough']),
      relatedScienceIds: Object.freeze(['dough-honey-base']),
      relatedTopicIds: Object.freeze(['science:soda-activation', 'trouble:dough-base-overheat']),
      article: article(
        'تسخين القاعدة في الميدوفيك خطوة وظيفية: نذيب السكر، ننسق العسل مع الدهن، ونبني وسطًا متجانسًا قبل أي إضافة حساسة مثل البيض أو الصودا.',
        [
          {
            heading: 'ما الذي نبحث عنه فعلاً',
            paragraphs: [
              'النجاح هنا يُقرأ من تجانس السطح واختفاء حبيبات السكر الواضحة وهدوء الفقاعات، لا من الغليان العنيف أو اللون الداكن وحده.',
              'القاعدة إذا تجاوزت حدها الحراري تصبح أقرب إلى الكرملة الثقيلة، وهذا يغيّر الطعم والبنية ويضيّق هامش التمبرنج.'
            ],
            bullets: [
              'راقب اللمعان والتجانس قبل مراقبة اللون.',
              'اجعل التسخين تدريجيًا، لأن ارتفاع الحرارة أسرع من عودة القاعدة إلى وضع آمن.',
              'اعتبر الوقت مرشدًا ثانويًا، لا حاكمًا مستقلًا.'
            ]
          },
          {
            heading: 'الأثر التشغيلي على المراحل التالية',
            paragraphs: [
              'قاعدة متوازنة تعطي تمبرنجًا أهدأ، واندماجًا أفضل للبيض، ثم عجينًا أكثر قابلية للفرد.',
              'قاعدة مسخنة زيادة تجعل البيض أكثر عرضة للتكتل، وتدفع العجين نحو القساوة أو النكهة المحروقة.'
            ],
            bullets: [
              'إذا ظهر تغميق مبكر، خفف الحرارة وقيّم القاعدة قبل المتابعة.',
              'إذا بقي السكر واضحًا، فالمشكلة في التجانس لا في نقص الوقت فقط.'
            ]
          }
        ]
      )
    }),
    'science:soda-activation': topic({
      id: 'science:soda-activation',
      categoryId: 'science:dough-foundation',
      title: 'دور الصودا وتفاعلها داخل القاعدة',
      summary: 'الصودا تؤثر في الغاز والقلوية واللون، لكن الفوران الظاهر لا يثبت تعادل الجرعة بالكامل؛ تُقرأ داخل سياق الوصفة وطريقة الإضافة.',
      phaseHints: Object.freeze(['dough']),
      relatedScienceIds: Object.freeze(['dough-soda-reaction']),
      relatedTopicIds: Object.freeze(['trouble:soda-no-lift', 'science:dough-base-heat']),
      article: article(
        'تفاعل الصودا في الميدوفيك يجب أن يكون واضحًا ثم يهدأ. الهدف ليس الرغوة من أجل الرغوة، بل توزيع الرافعة داخل القاعدة من دون جيوب قلوية أو أثر طعم حاد.',
        [
          {
            heading: 'إشارات المرحلة السليمة',
            paragraphs: [
              'الفوران المتدرج والمتجانس يثبت أن الصودا توزعت وبدأت تتفاعل، لكنه لا يثبت أن كامل الجرعة تعادل حمضيًا. الفوران المرقع يوحي غالبًا بتوزيع غير كاف.',
              'درجة الحرارة والتوقيت يغيران سرعة التفاعل والتفكك الحراري، لكن ضعف الفوران الظاهر وحده لا يبرر زيادة الجرعة.'
            ],
            bullets: [
              'اتبع موضع الصودا المحدد في وصفة المصدر؛ لا تنقلها تلقائيًا إلى قاعدة ساخنة إذا لم تنص الوصفة على ذلك.',
              'لا تتعامل مع الفقاعات كغاية؛ المهم أن تهدأ القاعدة بعد تفاعل واضح ومنضبط.'
            ]
          },
          {
            heading: 'ما الذي يفسد القرار',
            paragraphs: [
              'الصودا الزائدة لا تعني رفعًا أفضل، بل قد تعطي طعمًا قلويًا وتخل بتوازن القاعدة.',
              'ضعف الفوران لا يُصحح تلقائيًا بزيادة الصودا؛ فقد يكون السبب في التوزيع أو تركيب الوصفة أو طريقة الإضافة.'
            ],
            bullets: [
              'إذا كان الفوران ضعيفًا، راجع طريقة الإضافة والتوزيع ومصدر الحمض قبل أي تعديل في الجرعة.',
              'إذا بقيت رائحة الصودا واضحة، راجع التوزيع والجرعة بدل زيادة زمن الطهي.'
            ]
          }
        ]
      )
    }),
    'science:egg-tempering': topic({
      id: 'science:egg-tempering',
      categoryId: 'science:dough-foundation',
      title: 'تمبرنج البيض',
      summary: 'التمبرنج خطوة حماية للبنية: ننقل البيض إلى القاعدة الساخنة تدريجيًا حتى يندمج من دون تكتل أو طبخ موضعي.',
      phaseHints: Object.freeze(['dough']),
      relatedScienceIds: Object.freeze(['egg-tempering']),
      relatedTopicIds: Object.freeze(['trouble:dough-base-overheat']),
      article: article(
        'التمبرنج في هذا السياق ليس رقمًا جامدًا فقط. الحساب الحراري مفيد، لكن الحكم التنفيذي يبقى في طريقة الإضافة والخفق وسلوك الخليط بعد كل دفعة.',
        [
          {
            heading: 'منطق التنفيذ',
            paragraphs: [
              'إضافة البيض على دفعات صغيرة مع خفق مستمر تقلل خطر التكتل وتسمح للقوام أن يعود ناعمًا بين دفعة وأخرى.',
              'كلما كانت القاعدة أكثر هدوءًا وتجانسًا، صار التمبرنج أكثر موثوقية.'
            ],
            bullets: [
              'قسّم البيض إلى دفعات إذا كان الحمل الحراري عاليًا.',
              'راقب اختفاء الخيوط أو الحبيبات بعد كل دفعة قبل الانتقال للتالية.'
            ]
          },
          {
            heading: 'كيف نقرأ الحاسبة الحرارية',
            paragraphs: [
              'الحاسبة تعطي توازنًا تقريبيًا مفيدًا للتصميم أو التحقق، لكنها لا تلغي تأثير موضع السكب، سرعة الخفق، أو تفاوت الحرارة داخل الوعاء.',
              'لهذا يجب قراءة النتيجة الرقمية مع السلوك الحسي، لا بدلًا منه.'
            ],
            bullets: [
              'إذا قالت الحاسبة إن المجال آمن لكن ظهر تكتل، فالمشكلة تنفيذية محلية لا حسابية فقط.',
              'لا تحوّل رقم التمبرنج إلى بروتوكول أعمى منفصل عن الخفق وسرعة الإضافة.'
            ]
          }
        ]
      )
    }),
    'science:dough-family-reading': topic({
      id: 'science:dough-family-reading',
      categoryId: 'science:dough-foundation',
      title: 'قراءة عائلة العجين لا الوصفة فقط',
      summary: 'حين لا نملك بروتوكولًا محررًا لوصفة بعينها، نقرأ العجين من عائلته التشغيلية لا من نص حر منفصل عن الواقع.',
      phaseHints: Object.freeze(['setup', 'dough']),
      relatedScienceIds: Object.freeze(['dough-profile-family']),
      relatedTopicIds: Object.freeze(['science:dough-base-heat']),
      article: article(
        'المشروع لا يملك دائمًا سلطة وصفة-بوصفة. في هذه الحالات نحتاج مرجعًا عائليًا أمينًا يوجّه القراءة من غير أن يدّعي دقة كاذبة.',
        [
          {
            heading: 'متى يفيد هذا المرجع',
            paragraphs: [
              'يفيد عندما تكون الوصفة الحرة أو المعدلة قريبة من عائلة معروفة في منطقها: عسل مطهو، دهون واضحة، بيض، وصودا.',
              'المرجع العائلي يساعد في ترتيب المراحل والإشارات الحرجة، لكنه لا يحل محل ملاحظاتك على الوصفة الفعلية.'
            ],
            bullets: [
              'استخدمه لتثبيت منطق التنفيذ، لا لادعاء التطابق الكامل.',
              'إذا ابتعدت الصيغة الحرة كثيرًا عن العائلة، فزد مساحة المراجعة البشرية بدل توسعة الادعاء.'
            ]
          }
        ]
      )
    }),
    'science:thin-layer-baking': topic({
      id: 'science:thin-layer-baking',
      categoryId: 'science:baking',
      title: 'خبز الطبقات الرقيقة',
      summary: 'خبز الطبقات الرقيقة يُقرأ باللون والثبات والسلوك السطحي، لا بزمن اسمي وحده.',
      phaseHints: Object.freeze(['baking']),
      relatedScienceIds: Object.freeze(['baking-thin-layers', 'baking-sheet-layers']),
      relatedTopicIds: Object.freeze(['trouble:layers-overbaked', 'trouble:layers-underbaked']),
      article: article(
        'طبقات الميدوفيك الرقيقة تغادر نافذة الخبز بسرعة. لذلك يصبح الحكم الحسي جزءًا من البروتوكول، لا مجرد ملحق.',
        [
          {
            heading: 'ما الذي يحدد نقطة الخروج',
            paragraphs: [
              'اللون الذهبي الخفيف، ثبات السطح، وسرعة ارتداد الطبقة بعد اللمس الخفيف أهم من الوقت المجرد.',
              'السمك الفعلي وتوزيع الحرارة داخل الفرن قد يقدمان الحواف أو يؤخران الوسط حتى مع نفس الحرارة الاسمية.'
            ],
            bullets: [
              'ابدأ الفحص مبكرًا ولا تنتظر نهاية الزمن الاسمي.',
              'إذا سبقت الحواف الوسط باستمرار فراجع السمك وتوزيع الحرارة قبل مراجعة الوصفة.'
            ]
          },
          {
            heading: 'النتيجة التشغيلية للخطأ',
            paragraphs: [
              'الخبز الزائد يعطي طبقات داكنة وهشة أكثر من المطلوب، بينما الخبز الناقص يترك أثرًا عجينيًا ويعطل النضج بعد التجميع.',
              'قرار الخروج يجب أن يحمي قابلية النضج بعد الحشو، لا أن ينتج طبقة جافة لذيذة وحدها.'
            ],
            bullets: [
              'اقرأ الطبقة في ضوء ما سيحدث بعد الحشو والراحة.',
              'لا تعزل قرار الخبز عن السماكة الفعلية للفرد.'
            ]
          }
        ]
      )
    }),
    'science:filling-whipped-dairy': topic({
      id: 'science:filling-whipped-dairy',
      categoryId: 'science:filling-systems',
      title: 'الحشوات اللبنية المخفوقة',
      summary: 'هذا النوع من الحشو يوازن بين البرودة، الخفق، والهواء المحتبس. أي قراءة صحيحة له يجب أن ترى البنية لا السكر فقط.',
      phaseHints: Object.freeze(['filling', 'assembly']),
      relatedScienceIds: Object.freeze(['filling-whipped-dairy']),
      relatedTopicIds: Object.freeze(['trouble:filling-too-loose', 'trouble:filling-grainy']),
      article: article(
        'الحشوات المخفوقة تبدو سهلة لأنها ناعمة، لكنها حساسة جدًا للحرارة وسرعة الخفق وطريقة الدمج.',
        [
          {
            heading: 'ما الذي يحفظ البنية',
            paragraphs: [
              'برودة المكونات والأدوات مهمة لأنها تحفظ جزءًا من بنية الدهن والهواء المحتبس.',
              'التوقف عند قوام مناسب أهم من مطاردة قمم حادة إذا كانت الصيغة لا تحتمل ذلك.'
            ],
            bullets: [
              'اجعل البرودة جزءًا من البروتوكول، لا مجرد تفضيل.',
              'اقرأ تماسك الحشو بعد الطي لا أثناء الخفق فقط.'
            ]
          },
          {
            heading: 'كيف تفهم الانهيار',
            paragraphs: [
              'الحشو السائل قد يكون سببه حرارة أو خفق غير كافٍ أو تعويض بنيوي غير مناسب، لا سببًا واحدًا دائمًا.',
              'الحشو المحبب أو الزبدي يشير غالبًا إلى تجاوز نقطة الخفق أو انهيار البنية الدهنية.'
            ],
            bullets: [
              'إذا ارتفعت الحرارة، أعد التبريد قبل أي تدخل آخر.',
              'إذا ظهرت حبيبات دهنية، أوقف الخفق وراجع نقطة التوقف.'
            ]
          }
        ]
      )
    }),
    'science:filling-rule-logic': topic({
      id: 'science:filling-rule-logic',
      categoryId: 'science:filling-systems',
      title: 'منطق قواعد الحشو',
      summary: 'قواعد الحشو تفسير تشغيلي لعائلة الحشو ومكوناته، لا وصفة مستقلة كاملة.',
      phaseHints: Object.freeze(['filling', 'filling-protocol']),
      relatedScienceIds: Object.freeze(['filling-rule-context']),
      relatedTopicIds: Object.freeze(['science:filling-whipped-dairy']),
      article: article(
        'القواعد التشغيلية للحشو تجيب عن: ما الذي أراقبه؟ متى أتدخل؟ وما الذي يمكن الوثوق به؟ لكنها لا تدّعي تعويض تحرير وصفي كامل لكل حشو.',
        [
          {
            heading: 'كيف تُستخدم القاعدة',
            paragraphs: [
              'تُستخدم كمنطق قرار: ما حدود الحلاوة، ما أثر العائلة، وما الإشارات التي تكشف الخلل مبكرًا.',
              'حين تتغير الصيغة أو تُبنى حشوة حرة، تبقى القاعدة مرجعًا للقراءة لا نصًا ملزمًا أعمى.'
            ],
            bullets: [
              'اربط القاعدة بعائلة الحشو الفعلية.',
              'عاملها كمرشد تشغيل لا كسلطة وصفية كاملة.'
            ]
          }
        ]
      )
    }),
    'science:assembly-rest': topic({
      id: 'science:assembly-rest',
      categoryId: 'science:assembly',
      title: 'الراحة بعد التجميع',
      summary: 'الراحة ليست انتظارًا فارغًا؛ هي مرحلة انتقال رطوبة وتوازن بنية ونكهة، ويجب قراءتها بحسب نوع الحشو والطبقات.',
      phaseHints: Object.freeze(['assembly', 'review']),
      relatedScienceIds: Object.freeze(['assembly-rest']),
      relatedTopicIds: Object.freeze(['trouble:assembly-rest-balance']),
      article: article(
        'بعد التجميع تبدأ مرحلة نضج حقيقية. الحشو والطبقات يتبادلان الرطوبة، والقوام النهائي لا يساوي لحظة الفرش مباشرة.',
        [
          {
            heading: 'ما الذي يتغير في هذه المرحلة',
            paragraphs: [
              'الطبقات تلين تدريجيًا، ويستقر القطع، وتتحسن وحدة الطعم. لكن سرعة هذا التحول تعتمد على نوع الحشو ورطوبته وتركيزه.',
              'لا توجد نافذة زمنية واحدة صالحة لكل الأنظمة؛ الحشوات اللبنية تختلف عن الحشوات المركزة عالية السكر.'
            ],
            bullets: [
              'اقرأ النتيجة في الثلاجة لا على الطاولة فقط.',
              'وازن بين سهولة القطع وليونة الطبقات بدل مطاردة زمن ثابت.'
            ]
          }
        ]
      )
    })
  });

  const TROUBLESHOOTING_TOPICS = Object.freeze({
    'trouble:dough-base-overheat': topic({
      id: 'trouble:dough-base-overheat',
      categoryId: 'trouble:dough',
      title: 'القاعدة سخنت زيادة قبل إضافة البيض',
      summary: 'المشكلة هنا حرارية قبل أن تكون وصفية. التبريد الجزئي وضبط الوتيرة أهم من مواصلة الخطوة كما لو لم يحدث شيء.',
      phaseHints: Object.freeze(['dough']),
      relatedScienceIds: Object.freeze(['dough-honey-base', 'egg-tempering']),
      relatedTopicIds: Object.freeze(['science:dough-base-heat', 'science:egg-tempering']),
      article: article(
        'إذا تحولت القاعدة إلى حرارة جارفة أو لون داكن مبكر، فغالبًا ستنتقل المشكلة إلى التمبرنج ثم إلى قابلية الفرد.',
        [
          {
            heading: 'العلامات',
            paragraphs: [
              'رائحة كرملة حادة أو تغميق سريع أو بخار قوي عند تحريك القاعدة قبل إضافة البيض.',
              'ظهور خيوط أو تكتلات عند أول دفعة بيض، حتى مع خفق جيد.'
            ],
            bullets: [
              'أوقف التسخين ودع القاعدة تهدأ قبل المتابعة.',
              'قسّم البيض إلى دفعات أصغر وراقب القوام بعد كل دفعة.',
              'إذا ظهر طبخ موضعي واضح، لا تتجاهله باعتباره سيذوب لاحقًا.'
            ]
          }
        ]
      )
    }),
    'trouble:soda-no-lift': topic({
      id: 'trouble:soda-no-lift',
      categoryId: 'trouble:dough',
      title: 'الصودا لم تتفاعل كما ينبغي',
      summary: 'ضعف التفاعل قد يكون من حرارة غير مناسبة أو توقيت متأخر أو توزيع ضعيف، وليس من نقص الجرعة فقط.',
      phaseHints: Object.freeze(['dough']),
      relatedScienceIds: Object.freeze(['dough-soda-reaction']),
      relatedTopicIds: Object.freeze(['science:soda-activation']),
      article: article(
        'الفوران الضعيف أو غير المتجانس إنذار مبكر. إذا مرّ من دون مراجعة، تظهر المشكلة لاحقًا في كثافة الطبقات وصعوبة الفرد.',
        [
          {
            heading: 'ما الذي تراجعه أولًا',
            paragraphs: [
              'تحقق من حرارة القاعدة وقت الإضافة، ثم من طريقة التوزيع. الصودا في وسط غير مناسب لن تعطي أثرًا موثوقًا حتى لو كانت الكمية صحيحة.',
              'زيادة الصودا كحل سريع قد تنقل الخلل إلى طعم قلوي أو توزيع غير متوازن.'
            ],
            bullets: [
              'راجع التوقيت قبل مراجعة الجرعة.',
              'إذا كانت الرائحة القلوية واضحة، فالمشكلة في الاندماج أو الزيادة لا في النقص.'
            ]
          }
        ]
      )
    }),
    'trouble:dough-too-tight': topic({
      id: 'trouble:dough-too-tight',
      categoryId: 'trouble:dough',
      title: 'العجين مشدود أو يميل للقساوة',
      summary: 'القساوة غالبًا نتيجة توازن ماء/دقيق غير مريح، أو إضافة دقيق أثناء الفرد، أو راحة غير كافية.',
      phaseHints: Object.freeze(['setup', 'dough']),
      relatedScienceIds: Object.freeze(['dough-profile-family']),
      relatedTopicIds: Object.freeze(['science:dough-family-reading']),
      article: article(
        'إذا قاوم العجين الفرد أو ارتد بقوة أو احتاج دقيقًا إضافيًا كثيرًا، فهذه ليست مجرد مشكلة راحة؛ قد تكون بنية الصيغة أو مسار التشغيل نفسه.',
        [
          {
            heading: 'أسباب متكررة',
            paragraphs: [
              'سماكة مستهدفة شديدة الرقة مع صيغة لا تتحمل ذلك، أو دقيق إضافي أثناء الفرد، أو قاعدة دخلت مرحلة الدقيق وهي غير متوازنة.',
              'أحيانًا يكون الخلل في قرار التشغيل: نحاول فرد عجين يحتاج راحة أو حرارة مختلفة، لا قوة أكبر.'
            ],
            bullets: [
              'راجع السماكة المستهدفة قبل إضافة دقيق جديد.',
              'أعطِ العجين راحة فعلية إذا كان مشدودًا، ثم أعد التقييم.',
              'راقب أثر كل دقيق إضافي على المقارنة النهائية؛ فهو يغيّر القراءة البنيوية.'
            ]
          }
        ]
      )
    }),
    'trouble:layers-overbaked': topic({
      id: 'trouble:layers-overbaked',
      categoryId: 'trouble:baking',
      title: 'الطبقات خرجت أغمق وأيبس من المطلوب',
      summary: 'الخبز الزائد في الطبقات الرقيقة يسحب المرونة من النظام كله، حتى لو تحسنت النكهة منفردة.',
      phaseHints: Object.freeze(['baking']),
      relatedScienceIds: Object.freeze(['baking-thin-layers', 'baking-sheet-layers']),
      relatedTopicIds: Object.freeze(['science:thin-layer-baking']),
      article: article(
        'الطبقة المبالغ في خبزها لا تُصلحها الراحة بالكامل. قد تخف الحدة بعد الحشو، لكن البنية تبقى أكثر هشاشة وأقل لطفًا في القطع.',
        [
          {
            heading: 'ما الذي يحدث عادة',
            paragraphs: [
              'تُترك الطبقة حتى يسبق الوقت الحكم الحسي، أو تكون الحواف أسرع من الوسط لأن السمك أو توزيع الحرارة غير متجانس.',
              'النتيجة طبقة داكنة، سريعة التفتت، وقد تعطي مرارة أو جفافًا في المنتج النهائي.'
            ],
            bullets: [
              'ابدأ الفحص مبكرًا في الدفعات التالية.',
              'سوِّ السمك الفعلي قبل أن تعدّل حرارة الفرن وحدها.',
              'إذا كانت الحواف تتقدم دائمًا، راجع طريقة الفرد وصينية الخبز.'
            ]
          }
        ]
      )
    }),
    'trouble:layers-underbaked': topic({
      id: 'trouble:layers-underbaked',
      categoryId: 'trouble:baking',
      title: 'الطبقات ما زالت عجينية أو رخوة',
      summary: 'الطبقة الناقصة لا تنضج لاحقًا لمجرد وجود الحشو؛ بل قد تسحب المنتج كله إلى قوام مشوش.',
      phaseHints: Object.freeze(['baking']),
      relatedScienceIds: Object.freeze(['baking-thin-layers']),
      relatedTopicIds: Object.freeze(['science:thin-layer-baking']),
      article: article(
        'الطبقات التي تخرج قبل اكتمال ثباتها قد تبدو قابلة للإنقاذ، لكنها غالبًا تعطي مركزًا عجينيًا أو تلاصقًا غير مريح بعد التجميع.',
        [
          {
            heading: 'كيف تفرّق بينها وبين الطبقة السليمة',
            paragraphs: [
              'الطبقة السليمة قد تكون مرنة وهي ساخنة، لكن سطحها ثابت ومظهرها مطهو. أما الطبقة الناقصة فتُبقي أثرًا عجينيًا ولمعانًا رطبًا غير مطمئن.',
              'لا تتكل على الراحة أو الحشو لإكمال خبز لم يحدث أصلًا.'
            ],
            bullets: [
              'زد زمن الخبز بحذر لا بقفزة كبيرة.',
              'اختبر الوسط والحواف معًا، لا الحواف فقط.'
            ]
          }
        ]
      )
    }),
    'trouble:filling-too-loose': topic({
      id: 'trouble:filling-too-loose',
      categoryId: 'trouble:filling',
      title: 'الحشو ألين من اللازم',
      summary: 'ليونة الحشو قد تكون من الحرارة أو الخفق أو اختيار العائلة أو سماكة الحشو المستهدفة، ولا تُقرأ من السكر وحده.',
      phaseHints: Object.freeze(['filling', 'assembly']),
      relatedScienceIds: Object.freeze(['filling-whipped-dairy', 'filling-rule-context']),
      relatedTopicIds: Object.freeze(['science:filling-whipped-dairy', 'science:filling-rule-logic']),
      article: article(
        'الحشو اللين ليس دائمًا مشكلة تركيب فقط. أحيانًا يكون القرار التشغيلي غير متسق مع نوع الحشو أو نافذته الباردة.',
        [
          {
            heading: 'أسئلة التشخيص الأولى',
            paragraphs: [
              'هل كانت المكونات والأدوات باردة؟ هل توقف الخفق عند قوام مناسب؟ هل سماكة الحشو المطلوبة أعلى مما تحتمله العائلة؟',
              'إذا رُفع مستوى الحلاوة أو تغيرت الكتلة، فاقرأ أثر ذلك مع البنية لا كرقم منفصل.'
            ],
            bullets: [
              'أعد التبريد قبل أي تصعيد في الخفق.',
              'راجع سماكة الحشو المستهدفة إذا كانت الكمية كبيرة لكن الثبات منخفض.',
              'لا تضف سكرًا أو بودرة عشوائيًا من دون مراجعة أثرها البنيوي.'
            ]
          }
        ]
      )
    }),
    'trouble:filling-grainy': topic({
      id: 'trouble:filling-grainy',
      categoryId: 'trouble:filling',
      title: 'الحشو محبب أو يميل للزبدي',
      summary: 'هذه علامة على خلل في الخفق أو الحرارة أو ترتيب الدمج، لا على نقص خفق دائمًا.',
      phaseHints: Object.freeze(['filling']),
      relatedScienceIds: Object.freeze(['filling-whipped-dairy']),
      relatedTopicIds: Object.freeze(['science:filling-whipped-dairy']),
      article: article(
        'حين تظهر حبيبات دهنية أو ملمس زبدي، فالمشكلة غالبًا أن البنية تجاوزت نقطة التوازن لا أنها تحتاج دفعًا إضافيًا.',
        [
          {
            heading: 'ما الذي تفعله',
            paragraphs: [
              'أوقف الخفق وراجع الحرارة أولًا. الاستمرار في الخفق فوق هذا الخط يزيد الانفصال ولا يعالجه.',
              'راجع ترتيب الدمج: بعض الحشوات تتضرر من الطي العنيف بعد بلوغ القوام المناسب.'
            ],
            bullets: [
              'خفف الحركة بدل زيادتها إذا بدأ التحبب.',
              'احفظ درجات الحرارة الباردة في كامل المسار، لا في أول الخفق فقط.'
            ]
          }
        ]
      )
    }),
    'trouble:assembly-rest-balance': topic({
      id: 'trouble:assembly-rest-balance',
      categoryId: 'trouble:assembly',
      title: 'نتيجة الراحة بعد التجميع غير متوازنة',
      summary: 'إذا بقيت الطبقات قاسية أو انقلبت الكيكة إلى رطوبة زائدة، فالمشكلة في توازن الحشو والطبقات والزمن والبرودة معًا.',
      phaseHints: Object.freeze(['assembly', 'review']),
      relatedScienceIds: Object.freeze(['assembly-rest']),
      relatedTopicIds: Object.freeze(['science:assembly-rest']),
      article: article(
        'الراحة ليست رقمًا محفوظًا. النتيجة النهائية تعتمد على نوع الحشو وسلوك الطبقات وحرارة التخزين، لذلك يجب أن تُقرأ من المنتج نفسه.',
        [
          {
            heading: 'إذا بقيت الطبقات قاسية',
            paragraphs: [
              'قد تكون الطبقات مخبوزة أكثر من اللازم، أو الحشو أقل قدرة على إعطاء الرطوبة، أو زمن الراحة لم يصل بعد إلى توازن مناسب.',
              'ابدأ بمراجعة الخبز والحشو معًا بدل تمديد الزمن وحده بلا تشخيص.'
            ],
            bullets: [
              'اقرأ نوع الحشو قبل أن تطيل الراحة آليًا.',
              'راجع خبز الطبقات إذا كان القساوة من أول يوم واضحة.'
            ]
          },
          {
            heading: 'إذا صارت النتيجة رطبة زيادة',
            paragraphs: [
              'هنا قد يكون الحشو أعلى رطوبة من اللازم أو الطبقات دون خبز كافٍ أو الراحة أطول من حاجة النظام.',
              'الهدف ليس أطول راحة، بل أفضل نافذة قطع وأكل.'
            ],
            bullets: [
              'اربط قرار الراحة بسلوك القطع والاستقرار، لا بالزمن وحده.',
              'افصل بين رطوبة الحشو وسلامة خبز الطبقات قبل الحكم.'
            ]
          }
        ]
      )
    })
  });

  const REFERENCE_LIBRARY = Object.freeze({
    science: Object.freeze({
      id: 'science',
      title: 'القاعدة العلمية',
      categories: Object.freeze([
        Object.freeze({ id: 'science:dough-foundation', title: 'أساسيات العجين', topicIds: Object.freeze(['science:dough-base-heat', 'science:soda-activation', 'science:egg-tempering', 'science:dough-family-reading']) }),
        Object.freeze({ id: 'science:baking', title: 'الخبز والطبقات', topicIds: Object.freeze(['science:thin-layer-baking']) }),
        Object.freeze({ id: 'science:filling-systems', title: 'أنظمة الحشو', topicIds: Object.freeze(['science:filling-whipped-dairy', 'science:filling-rule-logic']) }),
        Object.freeze({ id: 'science:assembly', title: 'التجميع والراحة', topicIds: Object.freeze(['science:assembly-rest']) })
      ]),
      topics: SCIENCE_TOPICS
    }),
    troubleshooting: Object.freeze({
      id: 'troubleshooting',
      title: 'مشاكل وحلول',
      categories: Object.freeze([
        Object.freeze({ id: 'trouble:dough', title: 'مشكلات العجين', topicIds: Object.freeze(['trouble:dough-base-overheat', 'trouble:soda-no-lift', 'trouble:dough-too-tight']) }),
        Object.freeze({ id: 'trouble:baking', title: 'مشكلات الخبز', topicIds: Object.freeze(['trouble:layers-overbaked', 'trouble:layers-underbaked']) }),
        Object.freeze({ id: 'trouble:filling', title: 'مشكلات الحشو', topicIds: Object.freeze(['trouble:filling-too-loose', 'trouble:filling-grainy']) }),
        Object.freeze({ id: 'trouble:assembly', title: 'مشكلات التجميع والراحة', topicIds: Object.freeze(['trouble:assembly-rest-balance']) })
      ]),
      topics: TROUBLESHOOTING_TOPICS
    })
  });

  function getReferenceSection(kind) {
    return REFERENCE_LIBRARY[String(kind || '').trim()] || null;
  }

  function listReferenceCategories(kind) {
    return arrayify(getReferenceSection(kind)?.categories);
  }

  function listReferenceTopics(kind) {
    const section = getReferenceSection(kind);
    return section ? Object.values(section.topics || {}) : [];
  }

  function getReferenceTopic(kind, topicId) {
    const section = getReferenceSection(kind);
    if (!section) return null;
    return section.topics?.[String(topicId || '').trim()] || null;
  }

  function getDefaultReferenceTopicId(kind) {
    const section = getReferenceSection(kind);
    const firstCategory = arrayify(section?.categories)[0];
    return firstCategory?.topicIds?.[0] || null;
  }

  function getReferenceTopicsForPhase(kind, phaseId) {
    const normalized = String(phaseId || '').trim();
    return listReferenceTopics(kind).filter(topic => arrayify(topic.phaseHints).includes(normalized));
  }

  global.REFERENCE_LIBRARY = REFERENCE_LIBRARY;
  global.getReferenceSection = getReferenceSection;
  global.getReferenceTopic = getReferenceTopic;
  global.listReferenceCategories = listReferenceCategories;
  global.listReferenceTopics = listReferenceTopics;
  global.getDefaultReferenceTopicId = getDefaultReferenceTopicId;
  global.getReferenceTopicsForPhase = getReferenceTopicsForPhase;
})(typeof window !== 'undefined' ? window : globalThis);
