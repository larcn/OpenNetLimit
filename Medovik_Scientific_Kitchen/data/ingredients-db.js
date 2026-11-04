// =============================================================================
// Medovik Workflow v4 - Compiled Canonical Ingredients DB
// Single active ingredient truth for the runtime path.
// Generated from the base ingredient source + filling ingredient enrichment.
// =============================================================================
(function(global) {
  'use strict';

  const BASE_INGREDIENT_IDS = Object.freeze([
  "flour",
  "sugar",
  "powdered-sugar",
  "honey",
  "condensed-milk",
  "dulce-de-leche",
  "caramel",
  "butter",
  "eggs",
  "sour-cream",
  "whipping-cream",
  "cream-cheese",
  "vanilla",
  "baking-soda"
]);
  const BaseIngredientsDB = Object.freeze({
  "flour": {
    "id": "flour",
    "displayName": "دقيق",
    "type": "flour",
    "density": 0.6,
    "waterFrac": 0.12,
    "sugarFrac": 0.01,
    "fatFrac": 0.01,
    "proteinFrac": 0.11,
    "starchFrac": 0.72,
    "otherSolidsFrac": 0.03,
    "scienceMeta": {
      "confidence": "medium",
      "basis": "reference-composition",
      "summary": "تركيب تقريبي لدقيق أبيض متعدد الاستخدامات/متوسط البروتين. مكونات الماء والبروتين والدهن أقرب لمرجع تركيبي، بينما bulk density تقدير استخدامي.",
      "referenceIds": [
        "usda_fdc"
      ],
      "fieldConfidence": {
        "waterFrac": "medium",
        "proteinFrac": "medium",
        "fatFrac": "medium",
        "starchFrac": "medium",
        "density": "low"
      },
      "fieldBasis": {},
      "variableFields": [
        "density",
        "proteinFrac"
      ],
      "notes": [
        "الكثافة هنا bulk/use density للفرد والقياس الحجمي، لا كثافة حقيقية لمادة صلبة نقية.",
        "تركيب الدقيق يتغير باختلاف الاستخراج والبروتين والرطوبة الفعلية بين الموردين."
      ],
      "tags": []
    }
  },
  "sugar": {
    "id": "sugar",
    "displayName": "سكر حبيبات",
    "type": "sugar",
    "density": 0.85,
    "waterFrac": 0,
    "sugarFrac": 1,
    "totalSugarFrac": 1,
    "fatFrac": 0,
    "proteinFrac": 0,
    "sucrose": 1,
    "scienceMeta": {
      "confidence": "high",
      "basis": "reference-composition",
      "summary": "سكر سكروز شبه نقي؛ التركيب الكيميائي المرجعي أعلى ثباتاً من أغلب المكونات، مع بقاء الكثافة التعبوية متغيرة.",
      "referenceIds": [
        "usda_fdc"
      ],
      "fieldConfidence": {
        "sugarFrac": "high",
        "density": "low"
      },
      "fieldBasis": {},
      "variableFields": [
        "density"
      ],
      "notes": [
        "الكثافة هنا كثافة تعبئة/استخدام وليست ثابتاً فيزيائياً مستقلاً عن حجم البلورات والهواء بين الحبيبات."
      ],
      "tags": []
    }
  },
  "powdered-sugar": {
    "id": "powdered-sugar",
    "displayName": "سكر بودرة",
    "type": "sugar",
    "density": 0.65,
    "waterFrac": 0.01,
    "sugarFrac": 0.96,
    "totalSugarFrac": 0.96,
    "fatFrac": 0,
    "proteinFrac": 0,
    "sucrose": 0.96,
    "starchFrac": 0.03,
    "scienceMeta": {
      "confidence": "medium",
      "basis": "reference-composition",
      "summary": "سكر بودرة مع نسبة نشا مانع تكتل تقريبية (نحو 3%). النسبة الفعلية تختلف تجارياً.",
      "referenceIds": [
        "usda_fdc"
      ],
      "fieldConfidence": {
        "sugarFrac": "medium",
        "starchFrac": "medium",
        "density": "low"
      },
      "fieldBasis": {},
      "variableFields": [
        "density",
        "starchFrac"
      ],
      "notes": [
        "الكثافة هنا كثافة تعبئة/استخدام وليست ثابتاً فيزيائياً مستقلاً عن حجم البلورات والهواء بين الحبيبات."
      ],
      "tags": []
    }
  },
  "honey": {
    "id": "honey",
    "displayName": "عسل",
    "type": "sweetener",
    "density": 1.4,
    "waterFrac": 0.17,
    "sugarFrac": 0.82,
    "totalSugarFrac": 0.82,
    "fatFrac": 0,
    "proteinFrac": 0.003,
    "fructose": 0.38,
    "glucose": 0.31,
    "sucrose": 0.01,
    "otherSolidsFrac": 0.007,
    "scienceMeta": {
      "confidence": "medium",
      "basis": "reference-composition",
      "summary": "قيم تقريبية لعسل ناضج نموذجي: ماء + فركتوز + جلوكوز مع قدر صغير من السكروز وبقية مواد صلبة مذابة.",
      "referenceIds": [
        "usda_fdc",
        "codex_honey"
      ],
      "fieldConfidence": {
        "waterFrac": "medium",
        "fructose": "medium",
        "glucose": "medium",
        "density": "medium"
      },
      "fieldBasis": {},
      "variableFields": [
        "density",
        "waterFrac",
        "fructose",
        "glucose"
      ],
      "notes": [
        "المحليات المركبة تتغير كثيراً حسب العلامة التجارية أو درجة الطبخ/التركيز.",
        "العسل من أكثر المكونات تغيراً حسب المصدر النباتي والنضج والتخزين؛ لذلك هذه القيم مرجعية لا مواصفة إلزامية."
      ],
      "tags": []
    }
  },
  "condensed-milk": {
    "id": "condensed-milk",
    "displayName": "حليب مكثف محلى",
    "type": "sweetener",
    "density": 1.3,
    "waterFrac": 0.27,
    "sugarFrac": 0.55,
    "fatFrac": 0.08,
    "proteinFrac": 0.08,
    "sucrose": 0.45,
    "lactose": 0.1,
    "scienceMeta": {
      "confidence": "medium",
      "basis": "typical-commercial-spec",
      "summary": "حليب مكثف محلى ممثل بملف تجاري/معياري تقريبي. يصلح كافتراض افتراضي للمقارنة، لكنه حساس للعلامة التجارية ونسبة التركيز الفعلية.",
      "referenceIds": [
        "usda_fdc",
        "fda_condensed_milk"
      ],
      "fieldConfidence": {
        "waterFrac": "medium",
        "sugarFrac": "medium",
        "fatFrac": "medium",
        "proteinFrac": "medium",
        "density": "low"
      },
      "fieldBasis": {},
      "variableFields": [
        "density",
        "waterFrac",
        "sucrose",
        "lactose"
      ],
      "notes": [
        "المحليات المركبة تتغير كثيراً حسب العلامة التجارية أو درجة الطبخ/التركيز.",
        "يعامل هذا الملف كـ default brand-sensitive، لا كمرجع تركيبي صارم لمنتج بعينه.",
        "إذا كانت العبوة المستخدمة مختلفة بوضوح في السمك أو الحلاوة فالأولوية للمعايرة العملية أو بيانات الملصق."
      ],
      "tags": []
    }
  },
  "dulce-de-leche": {
    "id": "dulce-de-leche",
    "displayName": "دولسي دي ليتشي",
    "type": "sweetener",
    "density": 1.35,
    "waterFrac": 0.28,
    "sugarFrac": 0.5,
    "fatFrac": 0.07,
    "proteinFrac": 0.07,
    "sucrose": 0.35,
    "lactose": 0.12,
    "glucose": 0.03,
    "scienceMeta": {
      "confidence": "low",
      "basis": "process-derived-reference",
      "summary": "الدولسي هنا ملف تشغيلي مشتق من منتج لبني مطهو ومحلى، لا مرجعًا تركيبيًا موحدًا. يصلح للمعايرة الداخلية أكثر من كونه default ثابتًا بين العلامات.",
      "referenceIds": [
        "usda_fdc"
      ],
      "fieldConfidence": {
        "waterFrac": "low",
        "sugarFrac": "low",
        "fatFrac": "low",
        "proteinFrac": "low",
        "density": "low"
      },
      "fieldBasis": {},
      "variableFields": [
        "density",
        "waterFrac",
        "sugarFrac",
        "fatFrac",
        "lactose"
      ],
      "notes": [
        "المحليات المركبة تتغير كثيراً حسب العلامة التجارية أو درجة الطبخ/التركيز.",
        "يُعامل هذا الملف كـ calibration-only تقريبًا عند اختلاف درجة الطهي أو التركيز أو المنشأ التجاري.",
        "أي لزوجة أو حلاوة أو aw للدولسي يجب قراءتها كخاصية منتج/عملية لا كقيمة عالمية."
      ],
      "tags": []
    }
  },
  "caramel": {
    "id": "caramel",
    "displayName": "كراميل (صوص منزلي)",
    "type": "sweetener",
    "density": 1.35,
    "waterFrac": 0.23,
    "sugarFrac": 0.5,
    "fatFrac": 0.19,
    "proteinFrac": 0.03,
    "sucrose": 0.3,
    "glucose": 0.1,
    "fructose": 0.1,
    "scienceMeta": {
      "confidence": "low",
      "basis": "recipe-heuristic",
      "summary": "الكراميل هنا تمثيل تشغيلي لصوص كراميل، لا مادة قياسية واحدة. القيم صالحة للمقارنة الداخلية وللتنبؤ التقريبي فقط.",
      "referenceIds": [
        "usda_fdc"
      ],
      "fieldConfidence": {
        "waterFrac": "low",
        "sugarFrac": "low",
        "fatFrac": "low",
        "density": "low"
      },
      "fieldBasis": {},
      "variableFields": [
        "density",
        "waterFrac",
        "sugarFrac",
        "fatFrac"
      ],
      "notes": [
        "المحليات المركبة تتغير كثيراً حسب العلامة التجارية أو درجة الطبخ/التركيز.",
        "يُفضّل اعتباره profile وصفيًا أو fallback داخليًا لا مرجعًا تركيبيًا خارجيًا."
      ],
      "tags": []
    }
  },
  "butter": {
    "id": "butter",
    "displayName": "زبدة",
    "type": "fat",
    "density": 0.9,
    "waterFrac": 0.16,
    "sugarFrac": 0.01,
    "fatFrac": 0.8,
    "proteinFrac": 0.01,
    "lactose": 0.01,
    "milkSolidsFrac": 0.02,
    "scienceMeta": {
      "confidence": "medium",
      "basis": "reference-composition",
      "summary": "زبدة غير مملحة بنحو 80–82% دهن مع 16–17% ماء وقدر صغير من المواد الصلبة اللبنية.",
      "referenceIds": [
        "usda_fdc",
        "cdr_butter"
      ],
      "fieldConfidence": {
        "fatFrac": "medium",
        "waterFrac": "medium",
        "milkSolidsFrac": "medium",
        "density": "low"
      },
      "fieldBasis": {},
      "variableFields": [
        "density",
        "waterFrac"
      ],
      "notes": [
        "الكثافة وحالة البلورات الدهنية ترتبطان بالحرارة والحالة الفيزيائية، لا بالتركيب فقط.",
        "حالة الزبدة البلورية وخواصها في الخفق تعتمد على الحرارة، لذلك دلالتها التشغيلية أوسع من مجرد نسب التركيب."
      ],
      "tags": []
    }
  },
  "eggs": {
    "id": "eggs",
    "displayName": "بيض",
    "type": "egg",
    "density": 1.03,
    "waterFrac": 0.758,
    "sugarFrac": 0,
    "fatFrac": 0.095,
    "proteinFrac": 0.126,
    "glucose": 0.004,
    "otherSolidsFrac": 0.017,
    "scienceMeta": {
      "confidence": "medium",
      "basis": "reference-composition",
      "summary": "بيض كامل خام نموذجي؛ يصلح لتقدير الماء والبروتين والدهن في العجين والحشوات، مع اعتماد متوسطات تركيبية قريبة من USDA.",
      "referenceIds": [
        "usda_fdc"
      ],
      "fieldConfidence": {
        "waterFrac": "high",
        "proteinFrac": "high",
        "fatFrac": "high",
        "density": "medium"
      },
      "fieldBasis": {},
      "variableFields": [
        "waterFrac",
        "fatFrac",
        "proteinFrac",
        "density"
      ],
      "notes": [
        "القيم هنا لبيض كامل خام نموذجي؛ كتلة البيضة الفعلية وحجم الصفار/البياض يختلفان بالحجم والسلالة."
      ],
      "tags": []
    }
  },
  "sour-cream": {
    "id": "sour-cream",
    "displayName": "ساور كريم",
    "type": "dairy",
    "density": 1.05,
    "waterFrac": 0.63,
    "sugarFrac": 0.04,
    "fatFrac": 0.3,
    "proteinFrac": 0.03,
    "lactose": 0.04,
    "scienceMeta": {
      "confidence": "medium",
      "basis": "reference-composition",
      "summary": "ساور كريم/سميتانا كاملة الدسم تقريبية (~30% دهن). التصفية والبلد التجاري يغيران الماء والكثافة بوضوح.",
      "referenceIds": [
        "usda_fdc"
      ],
      "fieldConfidence": {
        "waterFrac": "medium",
        "fatFrac": "medium",
        "density": "low",
        "pH": "medium"
      },
      "fieldBasis": {},
      "variableFields": [
        "density",
        "waterFrac",
        "fatFrac",
        "pH"
      ],
      "notes": [
        "الألبان أكثر الفئات حساسية لاختلاف النوع التجاري، نسبة الدهن، التصفية، والثبات القوامي.",
        "إذا صُفيت القشطة الحامضة فالماء الفعلي والكثافة التشغيلية يتغيران، لذلك يجب تحديث القراءة عملياً عند العمل بوصفة مصفاة."
      ],
      "tags": []
    }
  },
  "whipping-cream": {
    "id": "whipping-cream",
    "displayName": "كريمة خفق",
    "type": "dairy",
    "density": 1,
    "waterFrac": 0.58,
    "sugarFrac": 0.04,
    "fatFrac": 0.35,
    "proteinFrac": 0.03,
    "lactose": 0.04,
    "scienceMeta": {
      "confidence": "medium",
      "basis": "reference-composition",
      "summary": "كريمة خفق ثقيلة تقريبية 33–36% دهن. التركيب المرجعي ثابت نسبيًا، لكن السلوك الهوائي/الكثافة التشغيلية يعتمد على درجة الخفق والحرارة.",
      "referenceIds": [
        "usda_fdc",
        "pubmed_whipped_cream_temp"
      ],
      "fieldConfidence": {
        "waterFrac": "medium",
        "fatFrac": "medium",
        "density": "low"
      },
      "fieldBasis": {},
      "variableFields": [
        "density",
        "waterFrac",
        "fatFrac",
        "pH",
        "expectedAirBand"
      ],
      "notes": [
        "الألبان أكثر الفئات حساسية لاختلاف النوع التجاري، نسبة الدهن، التصفية، والثبات القوامي.",
        "قيم الخفق والهواء ليست تركيبا غذائيا خاما بل سلوكا تشغيليا يتغير مع الحرارة والقص ومهارة الخفق."
      ],
      "tags": []
    }
  },
  "cream-cheese": {
    "id": "cream-cheese",
    "displayName": "جبن كريمي",
    "type": "dairy",
    "density": 1.1,
    "waterFrac": 0.52,
    "sugarFrac": 0.04,
    "fatFrac": 0.33,
    "proteinFrac": 0.09,
    "lactose": 0.04,
    "scienceMeta": {
      "confidence": "medium",
      "basis": "reference-composition",
      "summary": "جبن كريمي كامل الدسم بحد أدنى معياري 33% دهن وبحد أقصى رطوبة 55% تقريباً، مع تقريب التركيب الفعلي للاستخدام الحسابي.",
      "referenceIds": [
        "usda_fdc",
        "fda_cream_cheese"
      ],
      "fieldConfidence": {
        "waterFrac": "medium",
        "fatFrac": "medium",
        "proteinFrac": "medium",
        "density": "low"
      },
      "fieldBasis": {},
      "variableFields": [
        "density",
        "waterFrac",
        "fatFrac",
        "pH"
      ],
      "notes": [
        "الألبان أكثر الفئات حساسية لاختلاف النوع التجاري، نسبة الدهن، التصفية، والثبات القوامي."
      ],
      "tags": []
    }
  },
  "vanilla": {
    "id": "vanilla",
    "displayName": "فانيليا",
    "type": "flavor",
    "density": 0.9,
    "waterFrac": 0,
    "sugarFrac": 0,
    "fatFrac": 0,
    "proteinFrac": 0,
    "scienceMeta": {
      "confidence": "low",
      "basis": "process-heuristic",
      "summary": "الفانيليا في النموذج تمثل أثرًا عطريًا بكتلة صغيرة؛ التركيب التفصيلي ليس ما يحدد القرار الحسابي هنا.",
      "referenceIds": [],
      "fieldConfidence": {
        "density": "low"
      },
      "fieldBasis": {},
      "variableFields": [
        "density"
      ],
      "notes": [
        "هذه القيم ليست وصفًا تحليليًا دقيقًا لمستخلص الفانيليا؛ بل تمثيل حسابي مبسط لأن أثرها البنيوي محدود في معظم الوصفات هنا."
      ],
      "tags": []
    }
  },
  "baking-soda": {
    "id": "baking-soda",
    "displayName": "بيكنج صودا",
    "type": "leavener",
    "density": 2.2,
    "waterFrac": 0,
    "sugarFrac": 0,
    "fatFrac": 0,
    "proteinFrac": 0,
    "otherSolidsFrac": 1,
    "scienceMeta": {
      "confidence": "medium",
      "basis": "identity-plus-process-heuristic",
      "summary": "بيكنج صودا تُعامل هنا كمادة صلبة كاملة من حيث الكتلة، لكن أثرها على الرفع/اللون heuristic تشغيلي تابع للحمض والحرارة.",
      "referenceIds": [
        "acs_baking_soda"
      ],
      "fieldConfidence": {
        "otherSolidsFrac": "high",
        "density": "medium"
      },
      "fieldBasis": {},
      "variableFields": [
        "leaveningEffect"
      ],
      "notes": [
        "وظيفة الرفع ليست خاصية تركيبية ثابتة للمكوّن وحده؛ بل تعتمد على الوسط الحمضي، الماء، والحرارة.",
        "المعادلة لا تعني أن كل الغرامات تتحول مباشرة إلى رفع محسوس؛ جزء من القرار يظل مرتبطًا بالسياق الحمضي والخبز الفعلي."
      ],
      "tags": []
    }
  }
});
  const IngredientsDB = {
  "flour": {
    "id": "flour",
    "displayName": "دقيق",
    "type": "flour",
    "density": 0.6,
    "waterFrac": 0.12,
    "sugarFrac": 0.01,
    "fatFrac": 0.01,
    "proteinFrac": 0.11,
    "starchFrac": 0.72,
    "otherSolidsFrac": 0.03,
    "scienceMeta": {
      "confidence": "medium",
      "basis": "reference-composition",
      "summary": "تركيب تقريبي لدقيق أبيض متعدد الاستخدامات/متوسط البروتين. مكونات الماء والبروتين والدهن أقرب لمرجع تركيبي، بينما bulk density تقدير استخدامي.",
      "referenceIds": [
        "usda_fdc"
      ],
      "fieldConfidence": {
        "waterFrac": "medium",
        "proteinFrac": "medium",
        "fatFrac": "medium",
        "starchFrac": "medium",
        "density": "low"
      },
      "fieldBasis": {},
      "variableFields": [
        "density",
        "proteinFrac"
      ],
      "notes": [
        "الكثافة هنا bulk/use density للفرد والقياس الحجمي، لا كثافة حقيقية لمادة صلبة نقية.",
        "تركيب الدقيق يتغير باختلاف الاستخراج والبروتين والرطوبة الفعلية بين الموردين."
      ],
      "tags": []
    }
  },
  "sugar": {
    "id": "sugar",
    "displayName": "سكر حبيبات",
    "type": "sweetener",
    "density": 1,
    "waterFrac": 0,
    "sugarFrac": 1,
    "totalSugarFrac": 1,
    "fatFrac": 0,
    "proteinFrac": 0,
    "sucrose": 1,
    "scienceMeta": {
      "confidence": "high",
      "basis": "reference-composition",
      "summary": "سكر سكروز شبه نقي؛ التركيب الكيميائي المرجعي أعلى ثباتاً من أغلب المكونات، مع بقاء الكثافة التعبوية متغيرة.",
      "referenceIds": [
        "usda_fdc"
      ],
      "variableFields": [
        "density"
      ],
      "notes": [
        "الكثافة هنا كثافة تعبئة/استخدام وليست ثابتاً فيزيائياً مستقلاً عن حجم البلورات والهواء بين الحبيبات.",
        "قد يحتاج وقتاً ليذوب؛ يفضّل إذابته في طور مائي.",
        "يذوب عملياً في الجزء المائي من النظام، ولا يذوب على نحو مفيد في الطور الدهني وحده؛ لذلك يحتاج ماءً أو رطوبة كافية حتى يختفي إحساس الحبيبات."
      ]
    },
    "starchFrac": 0,
    "otherSolidsFrac": 0,
    "acidity": "neutral",
    "pH": 7,
    "roles": [
      "sweetener",
      "humectant",
      "preservative"
    ],
    "handling": {
      "notes": "قد يحتاج وقتاً ليذوب؛ يفضّل إذابته في طور مائي.",
      "science": "يذوب عملياً في الجزء المائي من النظام، ولا يذوب على نحو مفيد في الطور الدهني وحده؛ لذلك يحتاج ماءً أو رطوبة كافية حتى يختفي إحساس الحبيبات."
    }
  },
  "powdered-sugar": {
    "id": "powdered-sugar",
    "displayName": "سكر بودرة",
    "type": "sugar",
    "density": 0.8,
    "waterFrac": 0.01,
    "sugarFrac": 0.96,
    "totalSugarFrac": 0.96,
    "fatFrac": 0,
    "proteinFrac": 0,
    "sucrose": 0.96,
    "starchFrac": 0.03,
    "scienceMeta": {
      "confidence": "medium",
      "basis": "reference-composition",
      "summary": "سكر بودرة مع نسبة نشا مانع تكتل تقريبية (نحو 3%). النسبة الفعلية تختلف تجارياً.",
      "referenceIds": [
        "usda_fdc"
      ],
      "variableFields": [
        "density",
        "starchFrac"
      ],
      "notes": [
        "الكثافة هنا كثافة تعبئة/استخدام وليست ثابتاً فيزيائياً مستقلاً عن حجم البلورات والهواء بين الحبيبات.",
        "انخله مرتين قبل الاستخدام.",
        "النشا المضاف (3%) يمتص الرطوبة ويمنع التكتل"
      ]
    },
    "otherSolidsFrac": 0,
    "acidity": "neutral",
    "pH": 7,
    "roles": [
      "sweetener",
      "humectant",
      "body",
      "tenderizer"
    ],
    "handling": {
      "notes": "انخله مرتين قبل الاستخدام.",
      "science": "النشا المضاف (3%) يمتص الرطوبة ويمنع التكتل"
    }
  },
  "honey": {
    "id": "honey",
    "displayName": "عسل نقي",
    "type": "sweetener",
    "density": 1,
    "waterFrac": 0.17,
    "sugarFrac": 0.82,
    "totalSugarFrac": 0.82,
    "fatFrac": 0,
    "proteinFrac": 0.003,
    "fructose": 0.38,
    "glucose": 0.31,
    "sucrose": 0.01,
    "otherSolidsFrac": 0.007,
    "scienceMeta": {
      "confidence": "medium",
      "basis": "reference-composition",
      "summary": "قيم تقريبية لعسل ناضج نموذجي: ماء + فركتوز + جلوكوز مع قدر صغير من السكروز وبقية مواد صلبة مذابة.",
      "referenceIds": [
        "usda_fdc",
        "codex_honey"
      ],
      "variableFields": [
        "density",
        "waterFrac",
        "fructose",
        "glucose"
      ],
      "notes": [
        "المحليات المركبة تتغير كثيراً حسب العلامة التجارية أو درجة الطبخ/التركيز.",
        "العسل من أكثر المكونات تغيراً حسب المصدر النباتي والنضج والتخزين؛ لذلك هذه القيم مرجعية لا مواصفة إلزامية.",
        "إن كان متبلوراً، سخنه بلطف ≤40°C.",
        "نسبة عالية من الفركتوز تعطي حلاوة أعلى وحساسية رطوبة"
      ]
    },
    "starchFrac": 0,
    "acidity": "slightly-acidic",
    "pH": 3.9,
    "roles": [
      "sweetener",
      "flavor",
      "humectant",
      "preservative"
    ],
    "handling": {
      "minTemp": 20,
      "maxTemp": 40,
      "notes": "إن كان متبلوراً، سخنه بلطف ≤40°C.",
      "science": "نسبة عالية من الفركتوز تعطي حلاوة أعلى وحساسية رطوبة"
    }
  },
  "condensed-milk": {
    "id": "condensed-milk",
    "displayName": "حليب مكثف محلى",
    "type": "sweetener",
    "density": 1,
    "waterFrac": 0.27,
    "sugarFrac": 0.55,
    "fatFrac": 0.08,
    "proteinFrac": 0.08,
    "sucrose": 0.45,
    "lactose": 0.1,
    "scienceMeta": {
      "confidence": "medium",
      "basis": "typical-commercial-spec",
      "summary": "حليب مكثف محلى ممثل بملف تجاري/معياري تقريبي. يصلح كافتراض افتراضي للمقارنة، لكنه حساس للعلامة التجارية ونسبة التركيز الفعلية.",
      "referenceIds": [
        "usda_fdc",
        "fda_condensed_milk"
      ],
      "variableFields": [
        "density",
        "waterFrac",
        "sucrose",
        "lactose"
      ],
      "notes": [
        "المحليات المركبة تتغير كثيراً حسب العلامة التجارية أو درجة الطبخ/التركيز.",
        "يعامل هذا الملف كـ default brand-sensitive، لا كمرجع تركيبي صارم لمنتج بعينه.",
        "إذا كانت العبوة المستخدمة مختلفة بوضوح في السمك أو الحلاوة فالأولوية للمعايرة العملية أو بيانات الملصق.",
        "حرارة الغرفة لضمان سلاسة الدمج.",
        "تفاعل ميلارد مع البروتينات يعطي نكهة الكراميل"
      ]
    },
    "starchFrac": 0,
    "otherSolidsFrac": 0.019999999999999907,
    "acidity": "slightly-acidic",
    "pH": 6.3,
    "roles": [
      "sweetener",
      "body",
      "aqueous",
      "maillard-enhancer"
    ],
    "handling": {
      "minTemp": 20,
      "maxTemp": 24,
      "notes": "حرارة الغرفة لضمان سلاسة الدمج.",
      "science": "تفاعل ميلارد مع البروتينات يعطي نكهة الكراميل"
    }
  },
  "dulce-de-leche": {
    "id": "dulce-de-leche",
    "displayName": "دولسي دي ليتشي",
    "type": "sweetener",
    "density": 1,
    "waterFrac": 0.28,
    "sugarFrac": 0.5,
    "fatFrac": 0.07,
    "proteinFrac": 0.07,
    "sucrose": 0.35,
    "lactose": 0.12,
    "glucose": 0.03,
    "scienceMeta": {
      "confidence": "low",
      "basis": "process-derived-reference",
      "summary": "الدولسي هنا ملف تشغيلي مشتق من منتج لبني مطهو ومحلى، لا مرجعًا تركيبيًا موحدًا. يصلح للمعايرة الداخلية أكثر من كونه default ثابتًا بين العلامات.",
      "referenceIds": [
        "usda_fdc"
      ],
      "variableFields": [
        "density",
        "waterFrac",
        "sugarFrac",
        "fatFrac",
        "lactose"
      ],
      "notes": [
        "المحليات المركبة تتغير كثيراً حسب العلامة التجارية أو درجة الطبخ/التركيز.",
        "يُعامل هذا الملف كـ calibration-only تقريبًا عند اختلاف درجة الطهي أو التركيز أو المنشأ التجاري.",
        "أي لزوجة أو حلاوة أو aw للدولسي يجب قراءتها كخاصية منتج/عملية لا كقيمة عالمية.",
        "اخفقه منفرداً حتى يصبح ناعماً قبل الدمج.",
        "نتيجة تفاعل ميلارد بين اللاكتوز والبروتينات"
      ]
    },
    "starchFrac": 0,
    "otherSolidsFrac": 0.07999999999999996,
    "acidity": "slightly-acidic",
    "pH": 6.1,
    "roles": [
      "sweetener",
      "flavor",
      "body",
      "color"
    ],
    "handling": {
      "minTemp": 20,
      "maxTemp": 26,
      "notes": "اخفقه منفرداً حتى يصبح ناعماً قبل الدمج.",
      "science": "نتيجة تفاعل ميلارد بين اللاكتوز والبروتينات"
    }
  },
  "caramel": {
    "id": "caramel",
    "displayName": "كراميل (صوص)",
    "type": "sweetener",
    "density": 1,
    "waterFrac": 0.23,
    "sugarFrac": 0.5,
    "fatFrac": 0.19,
    "proteinFrac": 0.03,
    "sucrose": 0.65,
    "glucose": 0.1,
    "fructose": 0.1,
    "scienceMeta": {
      "confidence": "low",
      "basis": "recipe-heuristic",
      "summary": "الكراميل هنا تمثيل تشغيلي لصوص كراميل، لا مادة قياسية واحدة. القيم صالحة للمقارنة الداخلية وللتنبؤ التقريبي فقط.",
      "referenceIds": [
        "usda_fdc"
      ],
      "variableFields": [
        "density",
        "waterFrac",
        "sugarFrac",
        "fatFrac"
      ],
      "notes": [
        "المحليات المركبة تتغير كثيراً حسب العلامة التجارية أو درجة الطبخ/التركيز.",
        "يُفضّل اعتباره profile وصفيًا أو fallback داخليًا لا مرجعًا تركيبيًا خارجيًا.",
        "استخدمه في حرارة الغرفة؛ البارد يسبب كتل.",
        "كاراميلزايشن: تكسير السكر عند 170°C+"
      ]
    },
    "starchFrac": 0,
    "otherSolidsFrac": 0.04999999999999993,
    "acidity": "neutral",
    "pH": 5.8,
    "roles": [
      "sweetener",
      "flavor",
      "color"
    ],
    "handling": {
      "minTemp": 20,
      "maxTemp": 24,
      "notes": "استخدمه في حرارة الغرفة؛ البارد يسبب كتل.",
      "science": "كاراميلزايشن: تكسير السكر عند 170°C+"
    }
  },
  "butter": {
    "id": "butter",
    "displayName": "زبدة غير مملحة 82%",
    "type": "fat",
    "density": 1,
    "waterFrac": 0.16,
    "sugarFrac": 0.01,
    "fatFrac": 0.8,
    "proteinFrac": 0.01,
    "lactose": 0.01,
    "milkSolidsFrac": 0.02,
    "scienceMeta": {
      "confidence": "medium",
      "basis": "reference-composition",
      "summary": "زبدة غير مملحة بنحو 80–82% دهن مع 16–17% ماء وقدر صغير من المواد الصلبة اللبنية.",
      "referenceIds": [
        "usda_fdc",
        "cdr_butter"
      ],
      "variableFields": [
        "density",
        "waterFrac"
      ],
      "notes": [
        "الكثافة وحالة البلورات الدهنية ترتبطان بالحرارة والحالة الفيزيائية، لا بالتركيب فقط.",
        "حالة الزبدة البلورية وخواصها في الخفق تعتمد على الحرارة، لذلك دلالتها التشغيلية أوسع من مجرد نسب التركيب.",
        "طرية قابلة للخفق، ليست ذائبة.",
        "بلورات دهنية قابلة للخفق تحبس الهواء عند 18-20°C"
      ]
    },
    "starchFrac": 0,
    "otherSolidsFrac": 0.019999999999999907,
    "acidity": "neutral",
    "pH": 6.9,
    "roles": [
      "fat-phase",
      "structure",
      "flavor",
      "shortening"
    ],
    "handling": {
      "minTemp": 18,
      "maxTemp": 22,
      "notes": "طرية قابلة للخفق، ليست ذائبة.",
      "science": "بلورات دهنية قابلة للخفق تحبس الهواء عند 18-20°C"
    }
  },
  "eggs": {
    "id": "eggs",
    "displayName": "بيض",
    "type": "egg",
    "density": 1.03,
    "waterFrac": 0.758,
    "sugarFrac": 0,
    "fatFrac": 0.095,
    "proteinFrac": 0.126,
    "glucose": 0.004,
    "otherSolidsFrac": 0.017,
    "scienceMeta": {
      "confidence": "medium",
      "basis": "reference-composition",
      "summary": "بيض كامل خام نموذجي؛ يصلح لتقدير الماء والبروتين والدهن في العجين والحشوات، مع اعتماد متوسطات تركيبية قريبة من USDA.",
      "referenceIds": [
        "usda_fdc"
      ],
      "fieldConfidence": {
        "waterFrac": "high",
        "proteinFrac": "high",
        "fatFrac": "high",
        "density": "medium"
      },
      "fieldBasis": {},
      "variableFields": [
        "waterFrac",
        "fatFrac",
        "proteinFrac",
        "density"
      ],
      "notes": [
        "القيم هنا لبيض كامل خام نموذجي؛ كتلة البيضة الفعلية وحجم الصفار/البياض يختلفان بالحجم والسلالة."
      ],
      "tags": []
    }
  },
  "sour-cream": {
    "id": "sour-cream",
    "displayName": "قشطة حامضة (سميتانا ~30%)",
    "type": "dairy",
    "density": 1,
    "waterFrac": 0.63,
    "sugarFrac": 0.04,
    "fatFrac": 0.3,
    "proteinFrac": 0.03,
    "lactose": 0.04,
    "scienceMeta": {
      "confidence": "medium",
      "basis": "reference-composition",
      "summary": "ساور كريم/سميتانا كاملة الدسم تقريبية (~30% دهن). التصفية والبلد التجاري يغيران الماء والكثافة بوضوح.",
      "referenceIds": [
        "usda_fdc"
      ],
      "variableFields": [
        "density",
        "waterFrac",
        "fatFrac",
        "pH"
      ],
      "notes": [
        "الألبان أكثر الفئات حساسية لاختلاف النوع التجاري، نسبة الدهن، التصفية، والثبات القوامي.",
        "إذا صُفيت القشطة الحامضة فالماء الفعلي والكثافة التشغيلية يتغيران، لذلك يجب تحديث القراءة عملياً عند العمل بوصفة مصفاة.",
        "قد تحتاج تصفية 6–8 ساعات لثبات أعلى.",
        "تحتوي على بكتيريا lactic acid التي تخمر اللاكتوز"
      ]
    },
    "starchFrac": 0,
    "otherSolidsFrac": 0,
    "acidity": "acidic",
    "pH": 4.5,
    "roles": [
      "aqueous",
      "fat-phase",
      "stabilizer",
      "flavor"
    ],
    "handling": {
      "cold": true,
      "minTemp": 2,
      "maxTemp": 8,
      "notes": "قد تحتاج تصفية 6–8 ساعات لثبات أعلى.",
      "science": "تحتوي على بكتيريا lactic acid التي تخمر اللاكتوز"
    }
  },
  "whipping-cream": {
    "id": "whipping-cream",
    "displayName": "كريمة خفق (33–36%)",
    "type": "dairy",
    "density": 1,
    "waterFrac": 0.58,
    "sugarFrac": 0.04,
    "fatFrac": 0.35,
    "proteinFrac": 0.03,
    "lactose": 0.04,
    "scienceMeta": {
      "confidence": "medium",
      "basis": "reference-composition",
      "summary": "كريمة خفق ثقيلة تقريبية 33–36% دهن. التركيب المرجعي ثابت نسبيًا، لكن السلوك الهوائي/الكثافة التشغيلية يعتمد على درجة الخفق والحرارة.",
      "referenceIds": [
        "usda_fdc",
        "pubmed_whipped_cream_temp"
      ],
      "variableFields": [
        "density",
        "waterFrac",
        "fatFrac",
        "pH",
        "expectedAirBand"
      ],
      "notes": [
        "الألبان أكثر الفئات حساسية لاختلاف النوع التجاري، نسبة الدهن، التصفية، والثبات القوامي.",
        "قيم الخفق والهواء ليست تركيبا غذائيا خاما بل سلوكا تشغيليا يتغير مع الحرارة والقص ومهارة الخفق.",
        "برّد الوعاء والمضرب قبل الخفق.",
        "الدهون تشكل شبكة حول فقاعات الهواء عند الخفق"
      ]
    },
    "starchFrac": 0,
    "otherSolidsFrac": 0,
    "acidity": "neutral",
    "pH": 6.7,
    "roles": [
      "fat-phase",
      "emulsifier",
      "body",
      "aeration"
    ],
    "handling": {
      "cold": true,
      "minTemp": 2,
      "maxTemp": 6,
      "notes": "برّد الوعاء والمضرب قبل الخفق.",
      "science": "الدهون تشكل شبكة حول فقاعات الهواء عند الخفق"
    }
  },
  "cream-cheese": {
    "id": "cream-cheese",
    "displayName": "جبن كريمي كامل الدسم",
    "type": "dairy",
    "density": 1,
    "waterFrac": 0.52,
    "sugarFrac": 0.04,
    "fatFrac": 0.33,
    "proteinFrac": 0.09,
    "lactose": 0.03,
    "scienceMeta": {
      "confidence": "medium",
      "basis": "reference-composition",
      "summary": "جبن كريمي كامل الدسم بحد أدنى معياري 33% دهن وبحد أقصى رطوبة 55% تقريباً، مع تقريب التركيب الفعلي للاستخدام الحسابي.",
      "referenceIds": [
        "usda_fdc",
        "fda_cream_cheese"
      ],
      "variableFields": [
        "density",
        "waterFrac",
        "fatFrac",
        "pH"
      ],
      "notes": [
        "الألبان أكثر الفئات حساسية لاختلاف النوع التجاري، نسبة الدهن، التصفية، والثبات القوامي.",
        "ليّن حتى 18–20°C؛ اخفق على سرعة منخفضة حتى ناعم.",
        "بروتينات الكازين تشكل هيكلاً جيلاتينياً"
      ]
    },
    "starchFrac": 0,
    "otherSolidsFrac": 0.019999999999999907,
    "acidity": "slightly-acidic",
    "pH": 4.9,
    "roles": [
      "structure",
      "stabilizer",
      "fat-phase",
      "emulsifier"
    ],
    "handling": {
      "minTemp": 18,
      "maxTemp": 22,
      "notes": "ليّن حتى 18–20°C؛ اخفق على سرعة منخفضة حتى ناعم.",
      "science": "بروتينات الكازين تشكل هيكلاً جيلاتينياً"
    }
  },
  "vanilla": {
    "id": "vanilla",
    "displayName": "خلاصة فانيليا",
    "type": "flavor",
    "density": 1,
    "waterFrac": 0,
    "sugarFrac": 0,
    "fatFrac": 0,
    "proteinFrac": 0,
    "scienceMeta": {
      "confidence": "low",
      "basis": "process-heuristic",
      "summary": "الفانيليا في النموذج تمثل أثرًا عطريًا بكتلة صغيرة؛ التركيب التفصيلي ليس ما يحدد القرار الحسابي هنا.",
      "referenceIds": [],
      "variableFields": [
        "density"
      ],
      "notes": [
        "هذه القيم ليست وصفًا تحليليًا دقيقًا لمستخلص الفانيليا؛ بل تمثيل حسابي مبسط لأن أثرها البنيوي محدود في معظم الوصفات هنا.",
        "تُضاف في المرحلة الأخيرة.",
        "مركبات عطرية متطايرة (فانيلين، حمض الفانيليك)"
      ]
    },
    "starchFrac": 0,
    "otherSolidsFrac": 1,
    "acidity": "neutral",
    "pH": 6.8,
    "roles": [
      "aroma",
      "flavor-enhancer"
    ],
    "handling": {
      "notes": "تُضاف في المرحلة الأخيرة.",
      "science": "مركبات عطرية متطايرة (فانيلين، حمض الفانيليك)"
    },
    "alcohol": 0.35,
    "vanillin": 0.01
  },
  "baking-soda": {
    "id": "baking-soda",
    "displayName": "بيكنج صودا",
    "type": "leavener",
    "density": 2.2,
    "waterFrac": 0,
    "sugarFrac": 0,
    "fatFrac": 0,
    "proteinFrac": 0,
    "otherSolidsFrac": 1,
    "scienceMeta": {
      "confidence": "medium",
      "basis": "identity-plus-process-heuristic",
      "summary": "بيكنج صودا تُعامل هنا كمادة صلبة كاملة من حيث الكتلة، لكن أثرها على الرفع/اللون heuristic تشغيلي تابع للحمض والحرارة.",
      "referenceIds": [
        "acs_baking_soda"
      ],
      "fieldConfidence": {
        "otherSolidsFrac": "high",
        "density": "medium"
      },
      "fieldBasis": {},
      "variableFields": [
        "leaveningEffect"
      ],
      "notes": [
        "وظيفة الرفع ليست خاصية تركيبية ثابتة للمكوّن وحده؛ بل تعتمد على الوسط الحمضي، الماء، والحرارة.",
        "المعادلة لا تعني أن كل الغرامات تتحول مباشرة إلى رفع محسوس؛ جزء من القرار يظل مرتبطًا بالسياق الحمضي والخبز الفعلي."
      ],
      "tags": []
    }
  },
  "mascarpone": {
    "id": "mascarpone",
    "displayName": "ماسكربوني",
    "type": "dairy",
    "density": 1,
    "waterFrac": 0.45,
    "fatFrac": 0.45,
    "proteinFrac": 0.06,
    "sugarFrac": 0.03,
    "starchFrac": 0,
    "otherSolidsFrac": 0.010000000000000009,
    "acidity": "neutral",
    "pH": 6.3,
    "roles": [
      "structure",
      "fat-phase",
      "stabilizer",
      "richness"
    ],
    "handling": {
      "minTemp": 6,
      "maxTemp": 22,
      "notes": "حساس للحرارة العالية والسرعة؛ ادمج بلطف.",
      "science": "نسبة دهون عالية تمنح قواماً حريرياً"
    },
    "scienceMeta": {
      "confidence": "medium",
      "basis": "merged-runtime-catalog",
      "summary": "ماسكربوني",
      "referenceIds": [],
      "variableFields": [],
      "notes": [
        "حساس للحرارة العالية والسرعة؛ ادمج بلطف.",
        "نسبة دهون عالية تمنح قواماً حريرياً"
      ]
    },
    "lactose": 0.03
  },
  "gelatin": {
    "id": "gelatin",
    "displayName": "جيلاتين",
    "type": "hydrocolloid",
    "density": 0.7,
    "waterFrac": 0.1,
    "fatFrac": 0,
    "proteinFrac": 0.85,
    "sugarFrac": 0,
    "starchFrac": 0,
    "otherSolidsFrac": 0.050000000000000044,
    "acidity": "neutral",
    "pH": 5.5,
    "roles": [
      "stabilizer",
      "gelling",
      "viscosity"
    ],
    "handling": {
      "notes": "انقعه في ماء بارد 5–10 دقائق، أذِبه 50–55°C.",
      "science": "بروتين كولاجين مائي، يشكل شبكة هلامية ثلاثية الأبعاد"
    },
    "scienceMeta": {
      "confidence": "medium",
      "basis": "merged-runtime-catalog",
      "summary": "جيلاتين",
      "referenceIds": [],
      "variableFields": [],
      "notes": [
        "انقعه في ماء بارد 5–10 دقائق، أذِبه 50–55°C.",
        "بروتين كولاجين مائي، يشكل شبكة هلامية ثلاثية الأبعاد"
      ]
    },
    "bloomStrength": 200
  },
  "cornstarch": {
    "id": "cornstarch",
    "displayName": "نشا ذرة",
    "type": "hydrocolloid",
    "density": 1,
    "waterFrac": 0.1,
    "fatFrac": 0.01,
    "proteinFrac": 0,
    "sugarFrac": 0,
    "starchFrac": 0.88,
    "otherSolidsFrac": 0.010000000000000009,
    "acidity": "neutral",
    "pH": 6.5,
    "roles": [
      "thickener",
      "stabilizer",
      "gelling"
    ],
    "handling": {
      "notes": "يستخدم مع الحليب/الصفار (كاسترد) ويطهى حتى 82–85°C.",
      "science": "في أنظمة الكاسترد يكتمل التثخين عادة قرب 82–85°C، بينما يبدأ انتفاخ حبيبات النشا قبل ذلك حسب الوسط."
    },
    "scienceMeta": {
      "confidence": "medium",
      "basis": "merged-runtime-catalog",
      "summary": "نشا ذرة",
      "referenceIds": [],
      "variableFields": [],
      "notes": [
        "يستخدم مع الحليب/الصفار (كاسترد) ويطهى حتى 82–85°C.",
        "في أنظمة الكاسترد يكتمل التثخين عادة قرب 82–85°C، بينما يبدأ انتفاخ حبيبات النشا قبل ذلك حسب الوسط."
      ]
    }
  },
  "lemon-juice": {
    "id": "lemon-juice",
    "displayName": "عصير ليمون",
    "type": "acid",
    "density": 1,
    "waterFrac": 0.9,
    "fatFrac": 0,
    "proteinFrac": 0,
    "sugarFrac": 0,
    "starchFrac": 0,
    "otherSolidsFrac": 0.09999999999999998,
    "acidity": "acidic",
    "pH": 2.3,
    "roles": [
      "acidulant",
      "flavor",
      "preservative"
    ],
    "handling": {
      "notes": "مع مشتقات الألبان يُضاف في النهاية.",
      "science": "حمض الستريك يخفض pH ويمكن أن يخثر البروتينات عند <5.2"
    },
    "scienceMeta": {
      "confidence": "medium",
      "basis": "merged-runtime-catalog",
      "summary": "عصير ليمون",
      "referenceIds": [],
      "variableFields": [],
      "notes": [
        "مع مشتقات الألبان يُضاف في النهاية.",
        "حمض الستريك يخفض pH ويمكن أن يخثر البروتينات عند <5.2"
      ]
    }
  },
  "milk": {
    "id": "milk",
    "displayName": "حليب كامل الدسم",
    "type": "dairy",
    "density": 1,
    "waterFrac": 0.87,
    "fatFrac": 0.035,
    "proteinFrac": 0.033,
    "sugarFrac": 0.047,
    "starchFrac": 0,
    "otherSolidsFrac": 0.014999999999999902,
    "acidity": "near-neutral",
    "pH": 6.7,
    "roles": [
      "aqueous",
      "body",
      "solvent"
    ],
    "handling": {
      "notes": "يسخّن حتى 80–85°C للكاسترد (بدون غليان).",
      "science": "بروتينات الكازين والواي مستقرة حتى 85°C"
    },
    "scienceMeta": {
      "confidence": "medium",
      "basis": "merged-runtime-catalog",
      "summary": "حليب كامل الدسم",
      "referenceIds": [],
      "variableFields": [],
      "notes": [
        "يسخّن حتى 80–85°C للكاسترد (بدون غليان).",
        "بروتينات الكازين والواي مستقرة حتى 85°C"
      ]
    },
    "lactose": 0.047
  },
  "egg-yolks": {
    "id": "egg-yolks",
    "displayName": "صفار بيض",
    "type": "protein",
    "density": 1,
    "waterFrac": 0.523,
    "fatFrac": 0.265,
    "proteinFrac": 0.159,
    "sugarFrac": 0,
    "starchFrac": 0,
    "otherSolidsFrac": 0.052999999999999936,
    "acidity": "near-neutral",
    "pH": 6.3,
    "roles": [
      "emulsifier",
      "structure",
      "color",
      "flavor"
    ],
    "handling": {
      "notes": "يخضع للتمبرنج؛ يتكاثف عادة في نطاق 68–70°C. الفوسفوليبيدات هنا وُسِمت صراحة كمعلومة بنيوية مهمة حتى لو كانت ضمن جزء الدهن الكلي.",
      "science": "الليسيثين والفوسفوليبيدات في الصفار تدعم الاستحلاب، بينما البروتينات تعطي التماسك الحراري عند الاقتراب من 68-70°C."
    },
    "scienceMeta": {
      "confidence": "medium",
      "basis": "merged-runtime-catalog",
      "summary": "صفار بيض",
      "referenceIds": [],
      "variableFields": [],
      "notes": [
        "يخضع للتمبرنج؛ يتكاثف عادة في نطاق 68–70°C. الفوسفوليبيدات هنا وُسِمت صراحة كمعلومة بنيوية مهمة حتى لو كانت ضمن جزء الدهن الكلي.",
        "الليسيثين والفوسفوليبيدات في الصفار تدعم الاستحلاب، بينما البروتينات تعطي التماسك الحراري عند الاقتراب من 68-70°C."
      ]
    }
  },
  "greek-yogurt-2": {
    "id": "greek-yogurt-2",
    "displayName": "زبادي يوناني 2%",
    "type": "dairy",
    "density": 1,
    "waterFrac": 0.84,
    "fatFrac": 0.02,
    "proteinFrac": 0.1,
    "sugarFrac": 0.04,
    "starchFrac": 0,
    "otherSolidsFrac": 0,
    "acidity": "acidic",
    "pH": 4.4,
    "roles": [
      "aqueous",
      "structure",
      "probiotic"
    ],
    "handling": {
      "cold": true,
      "minTemp": 4,
      "maxTemp": 8,
      "notes": "يُصفّى إذا كان سائلاً.",
      "science": "بروتينات الحليب المتخثرة تعطي قواماً كثيفاً"
    },
    "scienceMeta": {
      "confidence": "medium",
      "basis": "merged-runtime-catalog",
      "summary": "زبادي يوناني 2%",
      "referenceIds": [],
      "variableFields": [],
      "notes": [
        "يُصفّى إذا كان سائلاً.",
        "بروتينات الحليب المتخثرة تعطي قواماً كثيفاً"
      ]
    },
    "lactose": 0.04
  },
  "greek-yogurt-5": {
    "id": "greek-yogurt-5",
    "displayName": "زبادي يوناني 5%",
    "type": "dairy",
    "density": 1,
    "waterFrac": 0.8,
    "fatFrac": 0.05,
    "proteinFrac": 0.09,
    "sugarFrac": 0.04,
    "starchFrac": 0,
    "otherSolidsFrac": 0.019999999999999907,
    "acidity": "acidic",
    "pH": 4.4,
    "roles": [
      "aqueous",
      "structure",
      "fat-phase",
      "probiotic"
    ],
    "handling": {
      "cold": true,
      "minTemp": 4,
      "maxTemp": 8,
      "notes": "قوام كريمي، لا يحتاج تصفية.",
      "science": "نسبة دهون أعلى تعطي قواماً كريمياً"
    },
    "scienceMeta": {
      "confidence": "medium",
      "basis": "merged-runtime-catalog",
      "summary": "زبادي يوناني 5%",
      "referenceIds": [],
      "variableFields": [],
      "notes": [
        "قوام كريمي، لا يحتاج تصفية.",
        "نسبة دهون أعلى تعطي قواماً كريمياً"
      ]
    },
    "lactose": 0.04
  },
  "greek-yogurt-7": {
    "id": "greek-yogurt-7",
    "displayName": "زبادي يوناني 7%",
    "type": "dairy",
    "density": 1,
    "waterFrac": 0.78,
    "fatFrac": 0.07,
    "proteinFrac": 0.09,
    "sugarFrac": 0.04,
    "starchFrac": 0,
    "otherSolidsFrac": 0.019999999999999907,
    "acidity": "acidic",
    "pH": 4.3,
    "roles": [
      "aqueous",
      "structure",
      "fat-phase",
      "probiotic"
    ],
    "handling": {
      "cold": true,
      "minTemp": 4,
      "maxTemp": 10,
      "notes": "قوام غني، ممتاز للحشوات الكريمية.",
      "science": "نسبة دهون عالية + بروتينات = قوام غني ومستقر"
    },
    "scienceMeta": {
      "confidence": "medium",
      "basis": "merged-runtime-catalog",
      "summary": "زبادي يوناني 7%",
      "referenceIds": [],
      "variableFields": [],
      "notes": [
        "قوام غني، ممتاز للحشوات الكريمية.",
        "نسبة دهون عالية + بروتينات = قوام غني ومستقر"
      ]
    },
    "lactose": 0.04
  },
  "cocoa-powder": {
    "id": "cocoa-powder",
    "displayName": "كاكاو",
    "type": "dry",
    "density": 1,
    "waterFrac": 0.05,
    "fatFrac": 0.12,
    "proteinFrac": 0.2,
    "sugarFrac": 0,
    "starchFrac": 0,
    "otherSolidsFrac": 0.63,
    "acidity": "slightly-acidic",
    "pH": 5.6,
    "roles": [
      "flavor",
      "color",
      "antioxidant"
    ],
    "handling": {
      "notes": "انخله مع السكر لمنع التكتل.",
      "science": "دهون الكاكاو تتصلب في البرودة وتشكل كتل"
    },
    "scienceMeta": {
      "confidence": "medium",
      "basis": "merged-runtime-catalog",
      "summary": "كاكاو",
      "referenceIds": [],
      "variableFields": [],
      "notes": [
        "انخله مع السكر لمنع التكتل.",
        "دهون الكاكاو تتصلب في البرودة وتشكل كتل"
      ]
    }
  },
  "salt": {
    "id": "salt",
    "displayName": "ملح",
    "type": "flavor",
    "density": 1,
    "waterFrac": 0,
    "fatFrac": 0,
    "proteinFrac": 0,
    "sugarFrac": 0,
    "starchFrac": 0,
    "otherSolidsFrac": 1,
    "acidity": "neutral",
    "pH": 7,
    "roles": [
      "flavor-enhancer",
      "preservative"
    ],
    "handling": {
      "notes": "يُضاف قليل لتحسين النكهات.",
      "science": "أيونات الصوديوم تعزز النكهات وتثبط المرارة"
    },
    "scienceMeta": {
      "confidence": "medium",
      "basis": "merged-runtime-catalog",
      "summary": "ملح",
      "referenceIds": [],
      "variableFields": [],
      "notes": [
        "يُضاف قليل لتحسين النكهات.",
        "أيونات الصوديوم تعزز النكهات وتثبط المرارة"
      ]
    }
  },
  "chocolate-dark": {
    "id": "chocolate-dark",
    "displayName": "شوكولاتة داكنة 70% (افتراضي)",
    "type": "chocolate",
    "density": 1.25,
    "waterFrac": 0.01,
    "fatFrac": 0.42,
    "proteinFrac": 0.07,
    "sugarFrac": 0.29,
    "totalSugarFrac": 0.29,
    "sucrose": 0.29,
    "cocoaSolidsFrac": 0.21,
    "starchFrac": 0,
    "otherSolidsFrac": 0,
    "chocolateType": "real-couverture",
    "cocoaPercent": 70,
    "compositionStatus": "ENGINEERING_DEFAULT",
    "acidity": "slightly-acidic",
    "pH": 5.8,
    "roles": ["flavor", "structure", "fat-phase", "sweetener"],
    "handling": {
      "notes": "للغاناش والحشوات يكفي الذوبان والاستحلاب؛ لا يُطلب تمبير إلا عند تكوين طبقة شوكولاتة صلبة مستقلة.",
      "science": "المواصفة الافتراضية 70% قابلة للاستبدال بقيم ملصق المنتج."
    },
    "scienceMeta": {
      "confidence": "medium",
      "basis": "engineering-default-label-spec",
      "summary": "ملف افتراضي لشوكولاتة داكنة 70% حقيقية بزبدة الكاكاو؛ أدخل سكر الملصق عند اختلاف المنتج.",
      "referenceIds": [],
      "variableFields": ["sugarFrac", "fatFrac", "cocoaPercent", "density"],
      "notes": ["لا تُعامل الشوكولاتة الحقيقية والكومبوند كمادة واحدة."]
    }
  },
  "chocolate-milk": {
    "id": "chocolate-milk",
    "displayName": "شوكولاتة بالحليب (افتراضي)",
    "type": "chocolate",
    "density": 1.25,
    "waterFrac": 0.01,
    "fatFrac": 0.32,
    "proteinFrac": 0.08,
    "sugarFrac": 0.50,
    "totalSugarFrac": 0.50,
    "sucrose": 0.50,
    "starchFrac": 0,
    "otherSolidsFrac": 0.09,
    "chocolateType": "real-milk-chocolate",
    "compositionStatus": "ENGINEERING_DEFAULT",
    "acidity": "neutral",
    "pH": 6.3,
    "roles": ["flavor", "structure", "fat-phase", "sweetener"],
    "handling": {
      "notes": "تذاب بلطف وتُستحلب داخل الحشوة؛ استخدم ملصق المنتج لضبط السكر والدهن عند الحاجة.",
      "science": "مواد الحليب تجعلها أكثر حساسية للحرارة."
    },
    "scienceMeta": {
      "confidence": "medium",
      "basis": "engineering-default-label-spec",
      "summary": "ملف افتراضي لشوكولاتة بالحليب؛ السكر يختلف بوضوح بين العلامات.",
      "referenceIds": [],
      "variableFields": ["sugarFrac", "fatFrac", "density"],
      "notes": ["حدّث التركيب من الملصق للحصول على تحليل حلاوة أدق."]
    }
  }
};

  // حالات تشغيلية للتصفية: تمثل إزالة المصل أساساً، لا خفض كل المكونات بالنسبة نفسها.
  IngredientsDB["sour-cream-strained-82"] = {
    id: "sour-cream-strained-82",
    displayName: "ساور كريم مصفّى (عائد 82%)",
    type: "dairy",
    density: 1.10,
    waterFrac: 0.5488,
    sugarFrac: 0.0488,
    totalSugarFrac: 0.0488,
    lactose: 0.0488,
    fatFrac: 0.3659,
    proteinFrac: 0.0365,
    otherSolidsFrac: 0,
    acidity: "acidic",
    pH: 4.5,
    processState: "strained",
    sourceIngredientId: "sour-cream",
    outputRatio: 0.82,
    compositionStatus: "ENGINEERING_DEFAULT",
    roles: ["aqueous", "fat-phase", "stabilizer", "flavor"],
    scienceMeta: { confidence: "medium", basis: "mass-balance-process-state", summary: "حالة مصفاة بافتراض فقد 18% من الوزن كمصل مائي أساساً.", referenceIds: [], variableFields: ["waterFrac", "outputRatio", "density"], notes: ["القيمة تشغيلية وتتغير مع المنتج ودرجة التصفية."] }
  };
  IngredientsDB["sour-cream-strained-88"] = {
    id: "sour-cream-strained-88",
    displayName: "ساور كريم مصفّى خفيفاً (عائد 88%)",
    type: "dairy",
    density: 1.08,
    waterFrac: 0.5795,
    sugarFrac: 0.0455,
    totalSugarFrac: 0.0455,
    lactose: 0.0455,
    fatFrac: 0.3409,
    proteinFrac: 0.0341,
    otherSolidsFrac: 0,
    acidity: "acidic",
    pH: 4.5,
    processState: "strained",
    sourceIngredientId: "sour-cream",
    outputRatio: 0.88,
    compositionStatus: "ENGINEERING_DEFAULT",
    roles: ["aqueous", "fat-phase", "stabilizer", "flavor"],
    scienceMeta: { confidence: "medium", basis: "mass-balance-process-state", summary: "حالة تصفية خفيفة بافتراض فقد 12% من الوزن كمصل مائي أساساً.", referenceIds: [], variableFields: ["waterFrac", "outputRatio", "density"], notes: ["القيمة تشغيلية وتتغير مع المنتج ودرجة التصفية."] }
  };


  function cloneRecord(record) {
    return record && typeof record === 'object' ? JSON.parse(JSON.stringify(record)) : null;
  }

  function syncBaseIngredientTruth(db = IngredientsDB) {
    Object.keys(BaseIngredientsDB).forEach(function(id) {
      const baseRecord = cloneRecord(BaseIngredientsDB[id]);
      const runtimeRecord = cloneRecord(db[id]);
      if (!baseRecord) return;
      if (!runtimeRecord) {
        db[id] = baseRecord;
        return;
      }
      Object.keys(runtimeRecord).forEach(function(key) {
        if (!(key in baseRecord)) {
          baseRecord[key] = runtimeRecord[key];
        }
      });
      db[id] = baseRecord;
    });
  }

  function isBaseIngredient(id) {
    return Object.prototype.hasOwnProperty.call(BaseIngredientsDB, id) || String(id || '').startsWith('sour-cream-strained-');
  }

  function sanitizeCustomIngredientRecord(record) {
    if (!record || typeof record !== 'object' || !record.id) return null;
    const validation = global.validateIngredientRecord
      ? global.validateIngredientRecord(record)
      : { ok: true, normalized: { ...record }, errors: [], warnings: [] };
    if (!validation.ok) return null;
    const normalized = validation.normalized || record;
    const type = normalized.type || 'unknown';
    const out = {
      id: String(normalized.id).trim(),
      displayName: normalized.displayName || normalized.id,
      type,
      density: Number.isFinite(Number(normalized.density)) ? Number(normalized.density) : 1.0,
      waterFrac: Number(normalized.waterFrac) || 0,
      sugarFrac: Number(normalized.totalSugarFrac ?? normalized.sugarFrac) || 0,
      totalSugarFrac: Number(normalized.totalSugarFrac ?? normalized.sugarFrac) || 0,
      fatFrac: Number(normalized.fatFrac) || 0,
      proteinFrac: Number(normalized.proteinFrac) || 0,
      starchFrac: Number(normalized.starchFrac) || 0,
      otherSolidsFrac: Number(normalized.otherSolidsFrac) || 0,
      acidity: normalized.acidity ?? null,
      pH: Number.isFinite(Number(normalized.pH)) ? Number(normalized.pH) : null,
      roles: Array.isArray(normalized.roles) ? [...normalized.roles] : [],
      handling: normalized.handling ? { ...normalized.handling } : null,
      scienceMeta: normalized.scienceMeta || global.getDefaultScienceMetaForType?.(type) || null,
      validationWarnings: validation.warnings || []
    };
    ['lactose','sucrose','glucose','fructose','maltose','bloomStrength','alcohol','vanillin','milkSolidsFrac','cocoaSolidsFrac','cocoaFiberFrac','phospholipidsFrac','carbsFrac','chocolateType','cocoaPercent'].forEach(key => {
      const value = normalized[key];
      if (value != null) out[key] = value;
    });
    return out;
  }

  function registerIngredient(db, ingredient) {
    if (!ingredient || !ingredient.id) return false;
    const normalized = isBaseIngredient(ingredient.id) ? cloneRecord(BaseIngredientsDB[ingredient.id]) : sanitizeCustomIngredientRecord(ingredient);
    if (!normalized) return false;
    db[normalized.id] = cloneRecord(normalized);
    return true;
  }

  function getIngredient(db, id) {
    const ing = db[id];
    if (!ing) {
      return {
        id,
        displayName: id,
        type: 'unknown',
        _missing: true,
        density: 1.0,
        waterFrac: 0,
        sugarFrac: 0,
        fatFrac: 0,
        proteinFrac: 0,
        otherSolidsFrac: 0,
        starchFrac: 0,
        cocoaSolidsFrac: 0,
        milkSolidsFrac: 0,
        cocoaFiberFrac: 0,
        phospholipidsFrac: 0,
        carbsFrac: 0,
        scienceMeta: global.buildScienceMeta?.({
          confidence: 'low',
          basis: 'missing-data-fallback',
          summary: 'هذا المكوّن غير معرّف في قاعدة البيانات الحالية، لذلك استُخدمت قيم صفرية/محايدة كي لا ينهار الحساب.',
          notes: ['أضف تعريفاً حقيقياً للمكوّن إذا كنت ستعتمد على الحسابات المرتبطة به.']
        }) || null
      };
    }
    return ing;
  }

  function getIngredientScienceMeta(ing) {
    if (ing?.scienceMeta) return ing.scienceMeta;
    return global.getDefaultScienceMetaForType?.(ing?.type) || null;
  }

  function getCustomIngredients(db = IngredientsDB) {
    return Object.keys(db).filter(id => !isBaseIngredient(id)).map(id => cloneRecord(db[id]));
  }

  function resetToBaseIngredients(db = IngredientsDB) {
    Object.keys(db).forEach(id => { if (!isBaseIngredient(id)) delete db[id]; });
  }

  function restoreCustomIngredients(customIngredients = [], db = IngredientsDB) {
    resetToBaseIngredients(db);
    const summary = { imported: 0, skipped: 0, warnings: [] };
    if (!Array.isArray(customIngredients)) return summary;
    customIngredients.forEach((ingredient, idx) => {
      if (!ingredient || !ingredient.id) {
        summary.skipped += 1;
        summary.warnings.push(`تم تجاهل مكوّن مخصّص بلا id عند الفهرس ${idx}.`);
        return;
      }
      if (registerIngredient(db, ingredient)) summary.imported += 1;
      else {
        summary.skipped += 1;
        summary.warnings.push(`تم تجاهل المكوّن المخصّص ${ingredient.id} لأن بياناته غير مكتملة أو غير صالحة.`);
      }
    });
    return summary;
  }

  function getCanonicalIngredientEntry(id, db = IngredientsDB) {
    if (!id || !db?.[id]) return null;
    const record = cloneRecord(db[id]);
    return {
      id,
      displayName: record.displayName || id,
      type: record.type || 'unknown',
      sourceLabel: 'Canonical compiled ingredient DB',
      truthMode: 'canonical',
      availableInDb: true,
      labEligible: !!record.handling,
      mappedRecord: record,
      scienceMeta: cloneRecord(record.scienceMeta),
      acidity: record.acidity ?? null,
      pH: record.pH ?? null,
      roles: Array.isArray(record.roles) ? [...record.roles] : [],
      handling: record.handling ? { ...record.handling } : null
    };
  }

  function listCanonicalIngredientEntries({ labOnly = false } = {}, db = IngredientsDB) {
    const entries = Object.keys(db || {}).map(id => getCanonicalIngredientEntry(id, db)).filter(Boolean).sort((a,b)=>String(a.displayName||a.id).localeCompare(String(b.displayName||b.id),'ar'));
    return labOnly ? entries.filter(entry => entry.labEligible) : entries;
  }

  function ensureIngredientInDbById(id, db = IngredientsDB) {
    if (!id) return { ok: false, error: 'missing-id' };
    if (db?.[id]) return { ok: true, record: db[id], status: 'already-present' };
    const source = BaseIngredientsDB[id] || null;
    if (!source) return { ok: false, error: 'unknown-ingredient' };
    const ok = registerIngredient(db, source);
    return { ok, record: ok ? db[id] : null, status: ok ? 'registered-from-compiled-db' : 'registration-failed' };
  }

  function describeIngredientTruthMode(mode) {
    return mode === 'canonical' ? 'حقيقة موحّدة' : '—';
  }

  syncBaseIngredientTruth(IngredientsDB);

  global.BASE_INGREDIENT_IDS = BASE_INGREDIENT_IDS;
  global.BaseIngredientsDB = BaseIngredientsDB;
  global.IngredientsDB = IngredientsDB;
  global.CANONICAL_INGREDIENTS_DB = IngredientsDB;
  global.registerIngredient = registerIngredient;
  global.getIngredient = getIngredient;
  global.getIngredientScienceMeta = getIngredientScienceMeta;
  global.getCustomIngredients = getCustomIngredients;
  global.resetToBaseIngredients = resetToBaseIngredients;
  global.restoreCustomIngredients = restoreCustomIngredients;
  global.getCanonicalIngredientEntry = getCanonicalIngredientEntry;
  global.listCanonicalIngredientEntries = listCanonicalIngredientEntries;
  global.ensureIngredientInDbById = ensureIngredientInDbById;
  global.describeIngredientTruthMode = describeIngredientTruthMode;
})(typeof window !== 'undefined' ? window : globalThis);
