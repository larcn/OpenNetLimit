/*
 * Medovik v6 — Generic filling guidance for custom formulas only.
 *
 * These rules never override a source recipe. They are practical fallbacks that
 * describe order, visible cues, and failure signals without pretending that one
 * fixed time, viscosity, or yield applies to every brand and batch.
 */
(function(global) {
  'use strict';

  const RULES = Object.freeze([
    {
      id: 'keep_whipping_cream_cold',
      priority: 200,
      if: { has: ['whipping-cream'] },
      title: 'خفق الكريمة الباردة',
      steps: [{
        step: 'whip_cream',
        name: 'اخفق الكريمة وهي باردة',
        tools: ['وعاء نظيف', 'مضرب خفق'],
        technique: {
          why: 'برودة الكريمة تساعد الدهن على تكوين شبكة تحمل الهواء بدل الانفصال.',
          method: 'ابدأ بسرعة متوسطة وراقب القوام. توقف عند القمة التي تحتاجها الصيغة قبل أن يصبح السطح باهتًا أو محببًا.',
          target: 'قوام ناعم متجانس يحتفظ بأثر المضرب من دون تكتل دهني.',
          test: 'ارفع المضرب: القمة تحافظ على شكلها بالدرجة المطلوبة ولا يظهر سائل منفصل.'
        }
      }],
      warnings: [
        'عند ظهور لمعان دهني أو حبيبات، أوقف الخفق فورًا.',
        'إذا لانت الكريمة بسبب السخونة، برّدها قبل مواصلة العمل بدل زيادة الخفق.'
      ]
    },
    {
      id: 'optional_sour_cream_draining',
      priority: 190,
      if: { has: ['sour-cream'] },
      title: 'تقييم قوام الساور كريم',
      steps: [{
        step: 'assess_sour_cream',
        name: 'استخدم الساور كريم كما هو أو صفّه عند الحاجة',
        tools: ['مصفاة وشاش عند الحاجة فقط'],
        technique: {
          why: 'المنتجات تختلف كثيرًا في كمية المصل؛ التصفية ليست خطوة إلزامية لكل وصفة.',
          method: 'افحص القوام أولًا. إذا كان رخوًا وكانت الصيغة تحتاج حشوًا ثابتًا، صفّه في الثلاجة حتى يصل للقوام المطلوب، ثم زن الكمية الناتجة واستخدم الوزن الفعلي.',
          target: 'قوام قابل للفرد لا يطلق مصلًا واضحًا عند الوقوف.',
          test: 'يبقى أثر الملعقة ولا يتجمع سائل حوله بعد دقائق.'
        }
      }],
      warnings: [
        'التصفية تغيّر الوزن ونسبة الماء؛ لا تستخدم وزن ما قبل التصفية كأنه الوزن الجاهز.',
        'لا تفرض التصفية إذا كانت وصفة المصدر تستخدم المنتج مباشرة.'
      ]
    },
    {
      id: 'sift_lumpy_dry_ingredients',
      priority: 180,
      if: { any: [['powdered-sugar'], ['cocoa-powder']] },
      title: 'نخل المكونات المتكتلة',
      steps: [{
        step: 'sift_dry',
        name: 'انخل السكر البودرة أو الكاكاو عند وجود كتل',
        tools: ['منخل ناعم'],
        technique: {
          why: 'الكتل الجافة لا تختفي دائمًا داخل الحشو البارد وقد تترك ملمسًا خشنًا.',
          method: 'انخل مباشرة قبل الإضافة، ثم اخلط على سرعة منخفضة أولًا حتى لا يتطاير المسحوق.',
          target: 'مسحوق ناعم بلا كتل مرئية.',
          test: 'لا تبقى نقاط جافة أو حبيبات داكنة بعد الدمج.'
        }
      }]
    },
    {
      id: 'butter_and_cream_cheese_consistency',
      priority: 170,
      if: { all: [['butter'], ['cream-cheese']] },
      title: 'توحيد قوام الزبدة والجبن الكريمي',
      steps: [{
        step: 'combine_butter_cream_cheese',
        name: 'وحّد القوام قبل الدمج',
        tools: ['مضرب مسطح أو خلاط بسرعة منخفضة'],
        technique: {
          why: 'فرق القوام الكبير بين الزبدة والجبن يزيد احتمال الكتل أو الانفصال.',
          method: 'ليّن كل مكوّن حتى يصبح قابلًا للخلط من دون ذوبان، ثم ادمجهما تدريجيًا. أوقف الخلط فور التجانس.',
          target: 'مستحلب ناعم بلا كتل زبدة ولا سائل منفصل.',
          test: 'تمر الملعقة في الحشو ويظل السطح متجانسًا.'
        }
      }],
      warnings: ['الزبدة المذابة أو الجبن شديد البرودة قد يسببان انفصالًا أو تكتلًا.']
    },
    {
      id: 'chocolate_in_water_based_filling',
      priority: 165,
      if: { any: [['chocolate-dark'], ['chocolate-milk']] },
      title: 'دمج الشوكولاتة في الحشو',
      steps: [{
        step: 'melt_and_emulsify_chocolate',
        name: 'أذب الشوكولاتة بلطف ثم وازن الحرارة قبل الدمج',
        tools: ['وعاء جاف', 'ملعقة أو خلاط يدوي عند الحاجة'],
        technique: {
          why: 'الشوكولاتة الساخنة جدًا مع قاعدة باردة قد تتكتل، والقاعدة الساخنة جدًا قد ترخي الحشو.',
          method: 'أذب الشوكولاتة من دون تعريضها للماء المباشر، ثم قرّب حرارتها من قاعدة الحشو بإضافة جزء صغير من القاعدة تدريجيًا قبل جمع الكمية كلها.',
          target: 'مستحلب لامع متجانس بلا حبيبات أو خطوط دهنية.',
          test: 'لا تتصلب خيوط شوكولاتة منفصلة عند ملامسة الحشو.'
        }
      }],
      warnings: ['وجود الشوكولاتة داخل حشوة مائية لا يعني أن تمبير شوكولاتة القوالب مطلوب.']
    },
    {
      id: 'gelatin_handling',
      priority: 160,
      if: { has: ['gelatin'] },
      title: 'استخدام الجيلاتين',
      steps: [{
        step: 'hydrate_and_add_gelatin',
        name: 'حضّر الجيلاتين وفق مواصفة المنتج ثم ادمجه بلا غلي',
        tools: ['وعاء صغير', 'ميزان دقيق'],
        technique: {
          why: 'الترطيب والذوبان الكاملان ضروريان لتوزيع الجيلاتين بالتساوي.',
          method: 'استخدم جرعة الصيغة وتعليمات الجيلاتين نفسه. رطّبه، أذبه بلطف، ثم قرّب حرارته من جزء من الحشو قبل دمجه في الكمية كلها.',
          target: 'سائل جيلاتين صافٍ بلا حبيبات، موزع بالتساوي في الحشو.',
          test: 'لا تظهر خيوط أو كتل جيلاتين بعد الخلط.'
        }
      }],
      warnings: ['لا تغلِ الحشو بعد إضافة الجيلاتين، ولا تضف محلولًا ساخنًا مباشرة إلى حشو شديد البرودة.']
    },
    {
      id: 'dulce_or_condensed_milk_blending',
      priority: 150,
      if: { any: [['dulce-de-leche'], ['condensed-milk']] },
      title: 'دمج الدولسي أو الحليب المكثف',
      steps: [{
        step: 'soften_sweet_concentrate',
        name: 'ليّن المركز الحلو وادمجه تدريجيًا',
        tools: ['ملعقة أو مضرب مسطح'],
        technique: {
          why: 'المركز شديد اللزوجة قد يترك جيوبًا حلوة أو يهبط الرغوة إذا أضيف دفعة واحدة.',
          method: 'حرّكه أولًا حتى يصبح ناعمًا، ثم اخلطه مع جزء من القاعدة قبل إضافته إلى بقية الحشو.',
          target: 'لون وقوام موحدان بلا خطوط كثيفة.',
          test: 'لا تظهر كتل أو مناطق أغمق عند فرد طبقة رقيقة من الحشو.'
        }
      }]
    },
    {
      id: 'vanilla_timing',
      priority: 80,
      if: { has: ['vanilla'] },
      title: 'توقيت الفانيليا',
      steps: [{
        step: 'add_vanilla',
        name: 'أضف الفانيليا حسب مسار الوصفة',
        technique: {
          why: 'في الحشوات الباردة يحافظ الإضافة المتأخرة على الرائحة، أما الوصفات المطبوخة فقد تستخدمها في توقيت مختلف.',
          method: 'اتبع وصفة المصدر أولًا. في الصيغ الباردة الحرة، أضفها قرب نهاية الخلط واخلط حتى تتوزع فقط.',
          target: 'رائحة موزعة من دون خفق إضافي غير لازم.',
          test: 'لا توجد جيوب نكهة مركزة أو سائل منفصل.'
        }
      }]
    }
  ]);

  function normalizeInput(items) {
    const ids = new Set();
    (Array.isArray(items) ? items : []).forEach(item => {
      const id = typeof item === 'string' ? item : (item?.ingredientId || item?.key || item?.id);
      const weight = typeof item === 'object' && item !== null ? Number(item.weight ?? item.totalWeight ?? 1) : 1;
      if (id && Number.isFinite(weight) && weight > 0) ids.add(String(id));
    });
    return ids;
  }

  function matches(rule, idSet) {
    const condition = rule?.if || {};
    if (Array.isArray(condition.has)) return condition.has.every(id => idSet.has(id));
    if (Array.isArray(condition.all)) return condition.all.every(group => Array.isArray(group) && group.every(id => idSet.has(id)));
    if (Array.isArray(condition.any)) return condition.any.some(group => Array.isArray(group) && group.some(id => idSet.has(id)));
    return false;
  }

  function getApplicableRules(items) {
    const idSet = normalizeInput(items);
    return RULES
      .filter(rule => matches(rule, idSet))
      .map(rule => ({
        id: rule.id,
        priority: rule.priority,
        title: rule.title,
        steps: rule.steps.map(step => ({ ...step })),
        warnings: Array.isArray(rule.warnings) ? [...rule.warnings] : []
      }))
      .sort((a, b) => b.priority - a.priority);
  }

  global.FILLING_RULES = RULES;
  global.getApplicableRules = getApplicableRules;
})(typeof window !== 'undefined' ? window : globalThis);
