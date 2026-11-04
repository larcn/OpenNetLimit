(function(global) {
  'use strict';

  const STEP_ORDER = Object.freeze([
    'setup',
    'dough-protocol',
    'baking',
    'filling',
    'assembly',
    'review',
    'troubleshooting',
    'science'
  ]);

  const PRODUCTION_STEPS = Object.freeze(STEP_ORDER.slice(0, 6));
  let lastProductionStep = 'setup';

  const SHORT_STEP_LABELS = Object.freeze({
    setup: 'التهيئة',
    'dough-protocol': 'العجين',
    baking: 'الخبز',
    filling: 'الحشو',
    assembly: 'التجميع',
    review: 'النتيجة',
    troubleshooting: 'المشاكل',
    science: 'الأبحاث'
  });

  const STEP_GROUPS = Object.freeze([
    {
      label: 'الإعداد',
      steps: ['setup']
    },
    {
      label: 'التنفيذ',
      steps: ['dough-protocol', 'baking', 'filling', 'assembly', 'review']
    },
    {
      label: 'المرجع',
      steps: ['troubleshooting', 'science']
    }
  ]);

  const STEP_META = Object.freeze({
    setup: {
      label: 'التهيئة',
      title: 'التهيئة',
      subtitle: 'اختر وصفة العجين، حدّد القالب وعدد الطبقات وسماكة العجين، ثم اقرأ المقادير مباشرة كنسب خباز أولًا وجرامات تنفيذية ثانيًا.'
    },
    'dough-protocol': {
      label: 'بروتوكول العجين والتحضير',
      title: 'بروتوكول العجين والتحضير',
      subtitle: 'نفّذ العجين كمسار تحضير واضح: ماذا تفعل، لماذا، ما علامة الجاهزية، وما الذي قد يفشل.'
    },
    baking: {
      label: 'الخبز',
      title: 'الخبز',
      subtitle: 'انتقل من فرد الطبقات إلى الخبز كسلسلة تشغيلية واحدة، مع قراءة اللون والبنية والزمن من نفس المساحة.'
    },
    filling: {
      label: 'الحشو وشرح الحشو',
      title: 'الحشو وشرح الحشو',
      subtitle: 'اختر الحشو، اضبط الحلاوة، اقرأ المقادير الناتجة، ثم نفّذ بروتوكوله من نفس المساحة دون كسر في التدفق.'
    },
    assembly: {
      label: 'التجميع والنضج',
      title: 'التجميع والنضج',
      subtitle: 'وزّع الحشو، ابنِ الطبقات، ثم ثبّت الكعكة وامنحها وقت النضج المناسب قبل التقطيع.'
    },
    review: {
      label: 'النتيجة والحفظ',
      title: 'النتيجة والحفظ',
      subtitle: 'راجع المقادير النهائية، سجل النتيجة العملية، واحفظ النسخة التي نُفذت فعلًا.'
    },
    troubleshooting: {
      label: 'مشاكل وحلول',
      title: 'مشاكل وحلول',
      subtitle: 'اقرأ بطاقات التشخيص ضمن سياق الجلسة الحالية: السبب المحتمل، ما الذي تفعله الآن، وما الذي تتجنبه.'
    },
    science: {
      label: 'قاعدة علمية',
      title: 'قاعدة علمية',
      subtitle: 'مكتبة موضوعية تشرح الأسباب والمبادئ، ويمكن تصفحها حسب الموضوع لا حسب المرحلة الحالية فقط.'
    }
  });

  const TOOL_TITLES = Object.freeze({
    'workflow-tools-hub': 'الأدوات',
    'science-reference': 'قاعدة علمية',
    'troubleshooting-reference': 'مشاكل وحلول',
    'recipe-comparison': 'مقارنة الوصفات',
    'review-tool': 'المراجعة',
    'dough-formula-editor': 'تحرير وصفة العجين',
    'filling-formula-editor': 'تحرير وصفة الحشو'
  });

  let drawerState = {
    open: false,
    toolId: null,
    title: ''
  };

  let transientNotice = null;
  let transientNoticeTimer = null;

  const benchUiState = {
    strainedErrors: [],
    strainedPersistWarn: false,
    strainedDraft: null,
    firstLayerErrors: [],
    firstLayerPersistWarn: false,
    firstLayerDraft: null
  };

  const timerRuntime = {
    initialized: false,
    intervalId: null,
    chime: null,
    wakeLock: null,
    timers: [],
    timersById: new Map(),
    notifiedTransitions: new Set(),
    knownTimerIds: new Set(),
    unsupportedNoticeShown: false,
    showUnsupportedNotice: false,
    clockSkewActive: false,
    lastLiveAnnouncement: '',
    seq: 0
  };

  let subscriptionsBound = false;
  let renderQueued = false;

  function arrayify(value) {
    return Array.isArray(value) ? value : (value ? [value] : []);
  }

  function text(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function finiteNumber(value, fallback) {
    if (value === null || value === undefined || value === '') {
      return fallback !== undefined ? fallback : 0;
    }
    if (typeof value === 'string' && global.MedovikNumericInput?.parseLocalizedDecimal) {
      const localized = global.MedovikNumericInput.parseLocalizedDecimal(value);
      if (localized !== null) return localized;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback !== undefined ? fallback : 0);
  }

  function fmt(value, digits = 1) {
    if (value === null || value === undefined || value === '') return '—';
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return '—';
    return parsed.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  }

  function fmtPercent(value, digits = 1) {
    return `${fmt(value, digits)}%`;
  }

  function setTransientNotice(message, ok = true) {
    transientNotice = {
      message: text(message) || (ok ? 'تم حفظ التغيير.' : 'تعذر إكمال العملية.'),
      ok: !!ok
    };
    if (transientNoticeTimer) clearTimeout(transientNoticeTimer);
    renderApp();
    transientNoticeTimer = setTimeout(function() {
      transientNotice = null;
      transientNoticeTimer = null;
      renderApp();
    }, 4200);
  }

  function renderTransientNotice() {
    const attrs = {
      className: transientNotice
        ? `app-notice form-status ${transientNotice.ok ? 'is-success' : 'is-error'}`
        : 'app-notice is-empty',
      dataset: { appNoticeMount: 'true' }
    };
    if (!transientNotice) {
      attrs.hidden = true;
      return el('div', attrs);
    }
    attrs.dataset.appNotice = 'true';
    attrs.role = transientNotice.ok ? 'status' : 'alert';
    attrs.ariaLive = 'polite';
    return el('div', attrs, [
      el('span', { textContent: transientNotice.message }),
      el('button', {
        className: 'app-notice-close',
        type: 'button',
        ariaLabel: 'إغلاق الرسالة',
        textContent: '×',
        onclick: function() {
          transientNotice = null;
          if (transientNoticeTimer) clearTimeout(transientNoticeTimer);
          transientNoticeTimer = null;
          renderApp();
        }
      })
    ]);
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (key === 'className') node.className = value;
      else if (key === 'textContent') node.textContent = value;
      else if (key === 'innerHTML') node.innerHTML = value;
      else if (key === 'value') node.value = value;
      else if (key === 'checked') node.checked = !!value;
      else if (key === 'selected') node.selected = !!value;
      else if (key === 'disabled') node.disabled = !!value;
      else if (key === 'hidden') {
        node.hidden = !!value;
        if (value) node.setAttribute('hidden', '');
      }
      else if (key === 'htmlFor') node.htmlFor = value;
      else if (key === 'dataset' && value && typeof value === 'object') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          node.dataset[dataKey] = dataValue;
        });
      } else if (key === 'ariaLabel') {
        node.setAttribute('aria-label', value);
      } else if (key === 'ariaLive') {
        node.setAttribute('aria-live', value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else {
        node.setAttribute(key, value);
      }
    });

    arrayify(children).forEach((child) => {
      if (child === undefined || child === null || child === false) return;
      if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    });

    return node;
  }

  function clearNode(node) {
    while (node && node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function cloneFormulaItems(formula) {
    return arrayify(formula?.items).map((item) => ({
      ingredientId: String(item.ingredientId || '').trim(),
      weight: finiteNumber(item.weight, 0)
    })).filter((item) => item.ingredientId);
  }

  function restoreFormula(snapshot) {
    if (!snapshot) return null;
    try {
      const FormulaCtor = global.Formula || (typeof Formula !== 'undefined' ? Formula : null);
      if (typeof FormulaCtor?.fromSnapshot === 'function') {
        return FormulaCtor.fromSnapshot(snapshot);
      }
      if (Array.isArray(snapshot.items)) {
        return FormulaCtor ? new FormulaCtor(snapshot.items, snapshot.meta || {}) : null;
      }
    } catch (_) {
      return null;
    }
    return null;
  }

  function getSession() {
    return global.SessionStore?.get?.() || global.SessionStore?.init?.() || null;
  }

  function getRecipeStoreState() {
    return global.RecipeLabStore?.getState?.() || global.RecipeLabStore?.init?.() || null;
  }

  function getDraft(kind) {
    return global.RecipeLabStore?.getDraft?.(kind) || null;
  }

  function getRecords(kind) {
    return global.RecipeLabStore?.listRecords?.(kind) || [];
  }

  function getRecord(recordId) {
    return global.RecipeLabStore?.getRecord?.(recordId) || null;
  }

  function normalizeDoughRecordId(recordId) {
    const raw = text(recordId);
    if (!raw) return null;
    if (raw.startsWith('builtin:dough:') || raw.startsWith('custom_recipe')) return raw;
    if (raw.startsWith('builtin:filling:')) return null;
    return global.MEDOVIK_RECIPE_PROFILES?.[raw] ? `builtin:dough:${raw}` : raw;
  }

  function normalizeFillingRecordId(recordId) {
    const raw = text(recordId);
    if (!raw) return null;
    if (raw.startsWith('builtin:filling:') || raw.startsWith('custom_recipe')) return raw;
    if (raw.startsWith('builtin:dough:')) return null;
    return global.FILLING_CATALOG?.[raw] ? `builtin:filling:${raw}` : raw;
  }

  function buildFallbackDoughRecord(recipeId) {
    const profile = global.MEDOVIK_RECIPE_PROFILES?.[recipeId];
    if (!profile || typeof global.buildRecipeFormula !== 'function') return null;
    const formula = global.buildRecipeFormula(profile);
    return {
      id: `builtin:dough:${profile.id}`,
      kind: 'dough',
      origin: 'builtin',
      readOnly: true,
      name: profile.name || profile.id,
      description: profile.description || profile.bestFor || '',
      sourceId: profile.id,
      formulaSnapshot: typeof formula?.toSnapshot === 'function' ? formula.toSnapshot() : null
    };
  }

  function buildFallbackFillingRecord(fillingId) {
    const canonical = typeof global.resolveFillingId === 'function'
      ? global.resolveFillingId(fillingId)
      : fillingId;
    const record = (typeof global.getFillingRecord === 'function' ? global.getFillingRecord(canonical) : null)
      || global.FILLING_CATALOG?.[canonical]
      || null;
    if (!record || typeof global.buildFillingFormula !== 'function') return null;
    const formula = global.buildFillingFormula(record);
    return {
      id: `builtin:filling:${record.id}`,
      kind: 'filling',
      origin: 'builtin',
      readOnly: true,
      name: record.name || record.id,
      description: record.description || '',
      sourceId: record.id,
      formulaSnapshot: typeof formula?.toSnapshot === 'function' ? formula.toSnapshot() : null
    };
  }

  function getSelectedDoughRecord(session) {
    const selectionId = normalizeDoughRecordId(session?.recipeSelection?.selectedRecipeId || session?.doughSystem?.recipeId || 'ayaHabib');
    return getRecord(selectionId) || buildFallbackDoughRecord(session?.doughSystem?.recipeId || 'ayaHabib');
  }

  function getSelectedFillingRecord(session) {
    if ((session?.fillingPlan?.mode || 'reference') === 'custom') {
      const customId = normalizeFillingRecordId(session?.fillingPlan?.customRecipeId);
      if (customId) return getRecord(customId);
      return null;
    }
    const fillingId = typeof global.SessionStore?.getFillingId === 'function'
      ? global.SessionStore.getFillingId()
      : session?.fillingPlan?.entries?.[0]?.fillingId;
    return getRecord(normalizeFillingRecordId(fillingId)) || buildFallbackFillingRecord(fillingId);
  }

  function analyzeSourceFormula(kind, label, formula, recordId) {
    if (!formula || typeof global.RecipeLabAnalyzer?.analyze !== 'function') return null;
    const snapshot = typeof formula.toSnapshot === 'function'
      ? formula.toSnapshot()
      : { items: cloneFormulaItems(formula), meta: {} };
    return global.RecipeLabAnalyzer.analyze({
      id: recordId || null,
      kind,
      name: label,
      formulaSnapshot: snapshot
    }) || null;
  }

  function isFormulaCoverageValid(formula) {
    if (!formula || typeof global.estimateFormulaComponents !== 'function') return false;
    const comp = global.estimateFormulaComponents(formula, global.IngredientsDB);
    return !!(comp && comp.totalMass > 0 && comp.coverage >= 0.90);
  }

  function resolveRecordFamilyId(kind, record, formula) {
    if (kind === 'dough') {
      const srcId = record?.sourceId
        || (typeof record?.id === 'string' && record.id.startsWith('builtin:dough:')
          ? record.id.slice('builtin:dough:'.length)
          : record?.id);
      return record?.processFamily
        || (srcId && global.MEDOVIK_RECIPE_PROFILES?.[srcId]?.processFamily)
        || formula?.sourceProcessFamily
        || (typeof global.inferCurrentDoughProfile === 'function'
          ? (global.inferCurrentDoughProfile(formula, global.IngredientsDB)?.processFamily || null)
          : null);
    }
    const srcId = record?.sourceId
      || (typeof record?.id === 'string' && record.id.startsWith('builtin:filling:')
        ? record.id.slice('builtin:filling:'.length)
        : record?.id);
    const master = srcId
      ? (global.findMasterFillingRecord?.(srcId) || global.getFillingRecord?.(srcId) || null)
      : null;
    return record?.processClass || master?.profile?.processClass || null;
  }

  function formatEvidenceStatusLabel(status) {
    const map = {
      DETERMINISTIC: 'حساب حفظ كتلة (تغطية ≥ 90%)',
      BOUNDED_ESTIMATE: 'تقدير هندسي مشروط',
      MEASURED_INPUT: 'مدخل مقاس من المستخدم',
      USER_MEASURED: 'مقاس من المستخدم',
      MODEL_ESTIMATE: 'تقدير النموذج',
      INSUFFICIENT_EVIDENCE: 'بيانات غير كافية'
    };
    return map[status] || status || 'غير محدد';
  }

  function renderSingleRecipePanels(kind, formula, analysis, currentRecord) {
    const moisture = global.MedovikMoisture?.analyzeMoistureProfile
      ? global.MedovikMoisture.analyzeMoistureProfile(formula, global.IngredientsDB)
      : null;
    const validCurrent = isFormulaCoverageValid(formula);
    const currentFamilyId = resolveRecordFamilyId(kind, currentRecord, formula);
    const peerRecords = getRecords(kind);
    const peerPool = peerRecords.map((rec) => {
      const peerFormula = restoreFormula(rec?.formulaSnapshot);
      const peerValid = isFormulaCoverageValid(peerFormula);
      const peerAnalysis = peerValid ? global.RecipeLabAnalyzer?.analyze?.(rec) : null;
      return {
        id: rec.id,
        familyId: resolveRecordFamilyId(kind, rec, peerFormula),
        metrics: peerValid && peerAnalysis?.ok ? peerAnalysis.metrics : null
      };
    });

    const rankSpecs = [
      { key: 'solidsWaterRatio', label: 'مواد صلبة/ماء' },
      kind === 'dough'
        ? { key: 'fatPctOnFlour', label: 'دهن/دقيق' }
        : { key: 'fatPctOfTotal', label: 'دهن/الكتلة' },
      { key: 'aqueousSugarIndex', label: 'مؤشر السكر المائي' }
    ];

    const rankResults = global.MedovikComparison?.rankInLibrary
      ? rankSpecs.map((spec) => global.MedovikComparison.rankInLibrary({
          label: spec.label,
          value: validCurrent && analysis?.metrics ? analysis.metrics[spec.key] : null,
          familyId: currentFamilyId,
          peers: peerPool.map((p) => ({
            id: p.id,
            familyId: p.familyId,
            value: p.metrics ? p.metrics[spec.key] : null
          }))
        }))
      : [];

    const getIngLabel = (id) => global.getIngredient?.(global.IngredientsDB, id)?.displayName || id;

    return el('details', { className: 'optional-explanation' }, [
      el('summary', { textContent: 'الماء الكلي والترتيب النسبي داخل المكتبة' }),
      renderSectionCard(
        'الماء الكلي',
        'نسبة الماء من كتلة الصيغة الكلية ومصادره الموثقة (تختلف عن نسبة السوائل على أساس الدقيق).',
        [
          moisture ? el('div', { className: 'inline-actions' }, [
            el('span', {
              className: 'status-badge' + (moisture.status === 'INSUFFICIENT_EVIDENCE' ? ' is-insufficient' : ''),
              textContent: formatEvidenceStatusLabel(moisture.status)
            }),
            el('strong', {
              textContent: moisture.moisturePctOfMass !== null
                ? `الماء الكلي: ${fmtPercent(moisture.moisturePctOfMass, 1)} (${fmt(moisture.totalWaterG, 1)} غ من أصل ${fmt(moisture.totalMassG, 1)} غ)`
                : 'الماء الكلي: غير متاح'
            })
          ]) : null,
          moisture?.status === 'INSUFFICIENT_EVIDENCE' && moisture.reason
            ? el('p', { className: 'text-muted', textContent: moisture.reason })
            : null,
          moisture?.sources?.length ? el('table', { className: 'worksheet-table' }, [
            el('thead', null, el('tr', null, [
              el('th', { textContent: 'المكون' }),
              el('th', { textContent: 'الماء (غ)' }),
              el('th', { textContent: 'حصة الماء' }),
              el('th', { textContent: 'حصة الكتلة' })
            ])),
            el('tbody', null, moisture.sources.map((src) => el('tr', null, [
              el('td', { textContent: getIngLabel(src.ingredientId) }),
              el('td', { className: 'num-cell', textContent: fmt(src.waterG, 1) }),
              el('td', { className: 'num-cell', textContent: fmtPercent(src.shareOfWaterPct, 1) }),
              el('td', { className: 'num-cell', textContent: fmtPercent(src.shareOfMassPct, 1) })
            ])))
          ]) : null,
          rankResults.length ? el('div', { className: 'notice-card' }, [
            el('strong', { textContent: 'ترتيب نسبي داخل مكتبتك — ليس لزوجة' }),
            renderInlineList(rankResults.map((r) => r.sentence)),
            el('p', {
              className: 'text-muted',
              textContent: 'لماذا لا يُعرض رقم لزوجة مطلق؟ لأن اللزوجة الفعلية وسلوك الفرد يتبعان القص والحرارة وتاريخ الخفق والتبريد والتهوية، ولا يمكن استنتاجهما كقيمة فيزيائية مطلقة من نسب المكونات وحدها.'
            })
          ]) : null
        ]
      )
    ]);
  }

  function renderHydrationLoadCard(session) {
    if (!global.MedovikMoisture?.computeHydrationLoad || !global.FullAnalysis?.run) return null;
    const spec = global.SessionStore?.resolveProductSpec?.() || session?.productSpec || {};
    const recipeProfile = global.SessionStore?.resolveActiveRecipeProfile?.() || getSelectedDoughRecord(session);
    const fillingProfile = global.SessionStore?.resolveActiveFillingProfile?.() || getSelectedFillingRecord(session);
    const sweet = getSweetnessSettings();
    const full = global.FullAnalysis.run(spec, recipeProfile, fillingProfile, sweet.adjustmentPct, sweet.target);
    const ctx = full?.context || null;
    const load = global.MedovikMoisture.computeHydrationLoad({
      fillingFormula: ctx?.filling?.scaledFormula || ctx?.fillingFormula || null,
      interiorRequiredMassG: ctx?.filling?.interiorRequiredMass,
      topRequiredMassG: ctx?.filling?.topRequiredMass,
      sideRequiredMassG: ctx?.filling?.sideRequiredMass,
      doughNetFormula: ctx?.dough?.netFormula || null
    }, global.IngredientsDB);

    const fmtLoad = (val) => (val !== null && Number.isFinite(val) ? `${fmt(val, 1)} غ / 100غ جاف` : 'غير متاح');

    return renderSectionCard('حمل الترطيب', 'جرامات ماء الحشو مقابل كل 100 غ مواد جافة في طبقات العجين الصافية.', [
      el('div', { className: 'inline-actions' }, [
        el('span', {
          className: 'status-badge' + (load.status === 'INSUFFICIENT_EVIDENCE' ? ' is-insufficient' : ''),
          textContent: formatEvidenceStatusLabel(load.status)
        })
      ]),
      renderMetricGrid([
        { label: 'حمل الحشو الداخلي (الأساسي)', value: fmtLoad(load.interiorLoadPer100gDry), hint: 'الماء الفعلي بين الطبقات' },
        { label: 'حمل تغليف السطح', value: fmtLoad(load.topLoadPer100gDry) },
        { label: 'حمل تغليف الجوانب', value: fmtLoad(load.sideLoadPer100gDry) },
        { label: 'الحمل الكلي على الكعكة', value: fmtLoad(load.totalLoadPer100gDry) }
      ]),
      el('p', {
        className: 'text-muted',
        textContent: load.status === 'INSUFFICIENT_EVIDENCE' && load.reason
          ? load.reason
          : 'تقدير يعتمد على الكثافة التصميمية وسماكات التغليف.'
      })
    ]);
  }

  function buildActiveSource(kind, session) {
    const isFilling = kind === 'filling';
    const activeProfile = isFilling
      ? (global.SessionStore?.getActiveFillingProfile?.() || getSelectedFillingRecord(session))
      : (global.SessionStore?.getActiveRecipeProfile?.() || getSelectedDoughRecord(session));
    const activeFormula = isFilling
      ? (global.SessionStore?.getActiveFillingFormula?.(activeProfile) || restoreFormula(activeProfile?.formulaSnapshot) || null)
      : (global.SessionStore?.getActiveDoughFormula?.(activeProfile) || restoreFormula(activeProfile?.formulaSnapshot) || null);
    const explicitCustomMode = isFilling
      ? ((session?.fillingPlan?.mode || 'reference') === 'custom')
      : ((session?.recipeSelection?.mode || 'stored') === 'custom');
    const isCustom = explicitCustomMode || activeProfile?.origin === 'custom' || activeProfile?.origin === 'draft';
    const fallbackLabel = isFilling
      ? (isCustom ? 'وصفة حشو حرة' : 'الحشو المرجعي')
      : (isCustom ? 'وصفة عجين حرة' : 'وصفة العجين');
    const label = activeProfile?.name || fallbackLabel;

    return {
      kind,
      mode: isCustom ? 'custom' : 'stored',
      label,
      description: activeProfile?.description || activeProfile?.bestFor || '',
      formula: activeFormula,
      analysis: analyzeSourceFormula(kind, label, activeFormula, activeProfile?.id),
      record: activeProfile?.origin === 'draft' ? null : (activeProfile || null),
      draft: activeProfile?.origin === 'draft' ? activeProfile : null,
      profile: activeProfile || null
    };
  }

  function getActiveDoughSource(session) {
    return buildActiveSource('dough', session);
  }

  function getActiveFillingSource(session) {
    return buildActiveSource('filling', session);
  }

  function getTargetHeightCm(spec) {
    const layers = Math.max(1, finiteNumber(spec?.layers, 8));
    const bakedThicknessMm = finiteNumber(spec?.estimatedBakedLayerThicknessMm ?? spec?.targetBakedLayerThicknessMm, 2);
    const fillingThicknessMm = finiteNumber(spec?.fillingThicknessMm, 3);
    const derivedMm = (layers * bakedThicknessMm) + (Math.max(0, layers - 1) * fillingThicknessMm);
    return finiteNumber(spec?.targetHeightCm, derivedMm / 10);
  }

  function normalizeShapeValue(value) {
    const raw = text(value).toLowerCase();
    return raw === 'rectangle' || raw === 'rect' ? 'rect' : 'round';
  }

  function buildGeometry(spec) {
    const GeometryCtor = global.ProductGeometry || (typeof ProductGeometry !== 'undefined' ? ProductGeometry : null);
    const shape = normalizeShapeValue(spec?.shape);
    const d1 = finiteNumber(spec?.d1, 24);
    const d2 = shape === 'round' ? d1 : finiteNumber(spec?.d2, d1);
    const layers = Math.max(1, finiteNumber(spec?.layers, 8));
    const rawSheetThicknessMm = finiteNumber(spec?.rawSheetThicknessMm, 1.5);
    const targetBakedLayerThicknessMm = finiteNumber(spec?.targetBakedLayerThicknessMm, 2);
    const estimatedBakedLayerThicknessMm = finiteNumber(spec?.estimatedBakedLayerThicknessMm, targetBakedLayerThicknessMm);
    const targetHeightMm = getTargetHeightCm(spec) * 10;
    const computedFillingThickness = layers > 1
      ? Math.max(0, (targetHeightMm - (layers * estimatedBakedLayerThicknessMm)) / Math.max(1, layers - 1))
      : 0;

    return GeometryCtor ? new GeometryCtor({
      shape,
      d1,
      d2,
      layers,
      rawSheetThicknessMm,
      targetBakedLayerThicknessMm,
      estimatedBakedLayerThicknessMm,
      fillingThicknessMm: finiteNumber(spec?.fillingThicknessMm, computedFillingThickness),
      includeOuterCoat: spec?.includeOuterCoat !== false,
      topCoatThicknessMm: finiteNumber(spec?.topCoatThicknessMm, 2),
      sideCoatThicknessMm: finiteNumber(spec?.sideCoatThicknessMm, 2),
      wastePct: finiteNumber(spec?.wastePct, 10),
      scaleMode: text(spec?.scaleMode) || 'volume',
      ballWeight: finiteNumber(spec?.ballWeight, 140),
      targetFlourWeight: finiteNumber(spec?.targetFlourWeight, 500)
    }) : null;
  }

  function scaleDoughFormula(formula, spec) {
    if (!formula || typeof formula.totalMass !== 'function') return null;
    const FormulaCtor = global.Formula || (typeof Formula !== 'undefined' ? Formula : null);
    const ProductCtor = global.Product || (typeof Product !== 'undefined' ? Product : null);
    const geometry = buildGeometry(spec);
    if (!geometry || !FormulaCtor || !ProductCtor) return null;
    const product = new ProductCtor({
      geometry,
      doughFormula: formula,
      fillingFormula: new FormulaCtor([])
    });
    return product.scaleDough({
      ingredientsDB: global.IngredientsDB,
      wastePct: geometry.wastePct,
      mode: geometry.scaleMode,
      targetBallWeight: geometry.ballWeight,
      targetFlourWeight: geometry.targetFlourWeight
    });
  }

  function scaleFillingFormula(formula, spec) {
    if (!formula || typeof formula.totalMass !== 'function') return null;
    const FormulaCtor = global.Formula || (typeof Formula !== 'undefined' ? Formula : null);
    const ProductCtor = global.Product || (typeof Product !== 'undefined' ? Product : null);
    const geometry = buildGeometry(spec);
    if (!geometry || !FormulaCtor || !ProductCtor) return null;
    const product = new ProductCtor({
      geometry,
      doughFormula: new FormulaCtor([]),
      fillingFormula: formula
    });
    return product.scaleFilling({
      ingredientsDB: global.IngredientsDB,
      designDensity: formula.designDensity || null,
      designDensitySource: formula.designDensitySource || null
    });
  }

  function getSweetnessSettings() {
    return {
      adjustmentPct: global.SessionStore?.getSweetnessAdjustmentPct?.() || 0,
      target: global.SessionStore?.getSweetnessTarget?.() || 'filling'
    };
  }

  function getComputedDoughBatch(session) {
    const recipeProfile = global.SessionStore?.getActiveRecipeProfile?.() || getSelectedDoughRecord(session);
    const fillingProfile = global.SessionStore?.getActiveFillingProfile?.() || getSelectedFillingRecord(session);
    const sweetness = getSweetnessSettings();
    return global.BatchCalculator?.calculate?.(
      session?.productSpec || {},
      recipeProfile,
      sweetness.adjustmentPct,
      fillingProfile,
      sweetness.target
    ) || null;
  }

  function getComputedFillingBatch(session) {
    const recipeProfile = global.SessionStore?.getActiveRecipeProfile?.() || getSelectedDoughRecord(session);
    const fillingProfile = global.SessionStore?.getActiveFillingProfile?.() || getSelectedFillingRecord(session);
    const sweetness = getSweetnessSettings();
    return global.BatchCalculator?.calculateFilling?.(
      session?.productSpec || {},
      fillingProfile,
      sweetness.adjustmentPct,
      recipeProfile,
      sweetness.target
    ) || null;
  }

  function getComputedSweetness(session) {
    const recipeProfile = global.SessionStore?.getActiveRecipeProfile?.() || getSelectedDoughRecord(session);
    const fillingProfile = global.SessionStore?.getActiveFillingProfile?.() || getSelectedFillingRecord(session);
    return global.SweetnessCalculator?.calculate?.(
      session?.productSpec || {},
      recipeProfile,
      fillingProfile,
      getSweetnessSettings()
    ) || null;
  }

  function buildDoughIngredientRows(formula) {
    if (typeof global.buildIngredientRows === 'function') {
      return global.buildIngredientRows(formula, { basis: 'dough' });
    }
    return [];
  }

  function buildFillingIngredientRows(formula) {
    if (typeof global.buildIngredientRows === 'function') {
      return global.buildIngredientRows(formula, { basis: 'filling' });
    }
    return [];
  }

  function renderMetricGrid(metrics) {
    const grid = el('div', { className: 'metric-grid' });
    arrayify(metrics).filter(Boolean).forEach((metric) => {
      grid.appendChild(el('div', { className: 'metric-card' }, [
        el('span', { className: 'metric-label', textContent: metric.label }),
        el('strong', { className: 'metric-value', textContent: metric.value }),
        metric.hint ? el('span', { className: 'metric-hint', textContent: metric.hint }) : null
      ]));
    });
    return grid;
  }

  function renderInlineList(items) {
    const values = arrayify(items).filter(Boolean);
    if (!values.length) return null;
    return el('ul', { className: 'bullet-list' }, values.map((item) => el('li', { textContent: item })));
  }

  function navigateToStep(stepId) {
    if (!STEP_META[stepId]) return;
    if (PRODUCTION_STEPS.includes(stepId)) lastProductionStep=stepId;
    global.SessionStore?.setActiveStep?.(stepId);
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  function renderJourneyProgress(activeStep) {
    const index=PRODUCTION_STEPS.indexOf(activeStep);
    const isReference=index < 0;
    const position=isReference ? 0 : index+1;
    return el('div', {className:'journey-progress'+(isReference?' is-reference':''),
      role:isReference?'group':'progressbar',
      'aria-label':isReference?'مرجع مساعد خارج مراحل التصنيع':'موضع المرحلة في مسار التصنيع',
      'aria-valuemin':isReference?undefined:'1',
      'aria-valuemax':isReference?undefined:String(PRODUCTION_STEPS.length),
      'aria-valuenow':isReference?undefined:String(position)
    }, PRODUCTION_STEPS.map((stepId,i)=>el('span',{
      className:'journey-segment'+(i<position?' is-reached':'')+(i===position-1?' is-current':''),
      'aria-hidden':'true'
    })));
  }

  function renderMobileDock(currentStep) {
    const currentIndex=PRODUCTION_STEPS.indexOf(currentStep);
    if (currentIndex===-1) {
      return el('nav',{className:'journey-dock journey-dock-reference',dataset:{journeyDockMount:'true'},'aria-label':'العودة من المرجع إلى التصنيع'},[
        el('button',{type:'button',className:'journey-dock-prev',
          'aria-label':'العودة إلى العمل',textContent:'العودة إلى العمل',
          onclick:function(){navigateToStep(lastProductionStep)}}),
        el('div',{className:'journey-dock-current'},[
          el('span',{className:'journey-dock-counter',textContent:'المرجع'}),
          el('strong',{textContent:SHORT_STEP_LABELS[currentStep]})
        ]),
        el('span',{className:'journey-dock-placeholder'})
      ]);
    }
    const previous=PRODUCTION_STEPS[currentIndex-1];
    const next=PRODUCTION_STEPS[currentIndex+1];
    return el('nav',{className:'journey-dock',dataset:{journeyDockMount:'true'},'aria-label':'التنقل بين مراحل التصنيع'},[
      previous ? el('button',{type:'button',className:'journey-dock-prev',
        'aria-label':`المرحلة السابقة: ${STEP_META[previous].label}`,
        textContent:'السابق',onclick:function(){navigateToStep(previous)}}):el('span',{className:'journey-dock-placeholder'}),
      el('div',{className:'journey-dock-current'},[
        el('span',{className:'journey-dock-counter',textContent:`${currentIndex+1} / ${PRODUCTION_STEPS.length}`}),
        el('strong',{textContent:SHORT_STEP_LABELS[currentStep]})
      ]),
      next ? el('button',{type:'button',className:'journey-dock-next',
        'aria-label':`المرحلة التالية: ${STEP_META[next].label}`,
        textContent:`التالي: ${SHORT_STEP_LABELS[next]}`,onclick:function(){navigateToStep(next)}}):el('span',{className:'journey-dock-placeholder'})
    ]);
  }

  function renderStepNav(currentStep) {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex === -1) {
      return el('div', { className: 'step-footer' }, [el('span'), el('span')]);
    }
    const prevStep = currentIndex > 0 ? STEP_ORDER[currentIndex - 1] : null;
    const nextStep = currentIndex >= 0 && currentIndex < PRODUCTION_STEPS.length - 1 ? PRODUCTION_STEPS[currentIndex + 1] : null;
    return el('div', { className: 'step-footer' }, [
      prevStep ? el('button', {
        className: 'btn btn-secondary',
        type: 'button',
        textContent: `السابق ←`,
        onclick: function() {
          navigateToStep(prevStep);
        }
      }) : el('span'),
      nextStep ? el('button', {
        className: 'btn btn-primary',
        type: 'button',
        textContent: STEP_META[nextStep].label,
        onclick: function() {
          navigateToStep(nextStep);
        }
      }) : null
    ]);
  }

  function renderAsideCard(title, bodyChildren, sticky) {
    return el('section', { className: 'aside-card' + (sticky ? ' is-sticky' : '') }, [
      el('h3', { className: 'aside-title', textContent: title }),
      ...arrayify(bodyChildren)
    ]);
  }

  function renderSummaryList(rows) {
    return el('div', { className: 'summary-list' }, arrayify(rows).map((row) => {
      return el('div', { className: 'summary-row' }, [
        el('span', { className: 'summary-label', textContent: row.label }),
        el('strong', { className: 'summary-value', textContent: row.value })
      ]);
    }));
  }

  function renderWorksheetTable(title, rows, percentLabel) {
    return el('section', { className: 'table-card' }, [
      title ? el('h3', { className: 'table-title', textContent: title }) : null,
      el('table', { className: 'worksheet-table' }, [
        el('thead', null, el('tr', null, [
          el('th', { textContent: 'المكون' }),
          el('th', { textContent: percentLabel || 'النسبة' }),
          el('th', { textContent: 'الوزن (جرام)' })
        ])),
        el('tbody', null, arrayify(rows).map((row) => el('tr', null, [
          el('td', { textContent: row.label }),
          el('td', { className: 'num-cell', textContent: fmtPercent(row.pct, 1) }),
          el('td', { className: 'num-cell', textContent: `${fmt(row.weight, 1)}g` })
        ])))
      ])
    ]);
  }

  function renderSectionCard(title, subtitle, bodyChildren, footerChildren) {
    return el('section', { className: 'section-card' }, [
      el('div', { className: 'section-card-head' }, [
        el('div', null, [
          el('h2', { className: 'section-title', textContent: title }),
          subtitle ? el('p', { className: 'section-subtitle', textContent: subtitle }) : null
        ])
      ]),
      el('div', { className: 'section-card-body' }, bodyChildren),
      arrayify(footerChildren).length ? el('div', { className: 'section-card-foot' }, footerChildren) : null
    ]);
  }

  function humanizeProtocolConfidence(value) {
    const labels = {
      explicit: 'موثق صراحة',
      derived: 'مستنتج من المرجع',
      editorial: 'تحرير تشغيلي',
      unknown: 'ثقة غير محسومة'
    };
    return labels[text(value)] || text(value) || '';
  }

  function humanizeProtocolSource(value) {
    const labels = {
      recipe: 'الوصفة المرجعية',
      profile: 'ملف العائلة',
      compiled: 'تركيب تشغيلي',
      rule: 'قاعدة تشغيل',
      master: 'مرجع أساسي'
    };
    return labels[text(value)] || text(value) || '';
  }

  function humanizeProtocolCompleteness(value) {
    const labels = {
      full: 'مرجع كامل',
      partial: 'مرجع جزئي',
      'reference-only': 'مرجع تفسيري فقط'
    };
    return labels[text(value)] || text(value) || '';
  }

  function humanizeControlLabel(control) {
    const fallbackLabels = {
      gate: 'حد القرار',
      event: 'حدث مراقب',
      time: 'المدة',
      temperature: 'الحرارة',
      qualitative: 'إشارة تشغيلية'
    };
    return control?.label || fallbackLabels[text(control?.type)] || 'ضبط المرحلة';
  }

  function formatProtocolControlValue(control) {
    if (text(control?.text)) return control.text;
    if (Number.isFinite(Number(control?.min)) || Number.isFinite(Number(control?.max))) {
      const min = Number.isFinite(Number(control?.min)) ? fmt(control.min, 0) : null;
      const max = Number.isFinite(Number(control?.max)) ? fmt(control.max, 0) : null;
      const unit = text(control?.unit);
      if (min && max) return `${min}–${max}${unit}`;
      if (min) return `${min}${unit}+`;
      if (max) return `حتى ${max}${unit}`;
    }
    return text(control?.unit) || '—';
  }

  function ensureTimerControllers() {
    if (!timerRuntime.chime) {
      const AudioCtx = global.AudioContext || global.webkitAudioContext;
      timerRuntime.chime = global.MedovikTimers?.createChime?.(AudioCtx) || {
        unlock: async function() { return false; },
        play: function() { return false; }
      };
    }
    if (!timerRuntime.wakeLock) {
      timerRuntime.wakeLock = global.MedovikTimers?.createWakeLockController?.(global.navigator, document) || {
        supported: false,
        request: async function() { return false; },
        release: async function() {},
        isHeld: function() { return false; }
      };
    }
  }

  function resolveControlTimerSpec(control) {
    if (!control || control.type === 'temperature' || control.label === 'إشارة حرارية') {
      return null;
    }
    const displayValue = formatProtocolControlValue(control);
    const parsed = global.MedovikTimers?.parseTimeCue?.(displayValue);
    if (!parsed) return null;
    return {
      cueText: displayValue,
      minSeconds: parsed.minSeconds,
      maxSeconds: parsed.maxSeconds
    };
  }

  function computeSafeTimerState(timer, nowMs) {
    if (!global.MedovikTimers?.getTimerState) {
      return {
        phase: 'running',
        elapsedSeconds: 0,
        remainingToMinSeconds: timer.minSeconds || 0,
        remainingToMaxSeconds: timer.maxSeconds || 0,
        clockSkew: false
      };
    }
    try {
      return global.MedovikTimers.getTimerState({
        startedAtMs: timer.startedAtMs,
        minSeconds: timer.minSeconds,
        maxSeconds: timer.maxSeconds,
        nowMs
      });
    } catch (_) {
      return {
        phase: 'running',
        elapsedSeconds: 0,
        remainingToMinSeconds: 0,
        remainingToMaxSeconds: 0,
        clockSkew: false
      };
    }
  }

  function formatTimerDisplay(timer, state) {
    const fmtDur = global.MedovikTimers?.formatDuration || function(s) { return String(Math.max(0, Math.floor(s || 0))); };
    if (state.phase === 'running') {
      return `${timer.cueText} — باقٍ ${fmtDur(state.remainingToMinSeconds)}`;
    }
    if (state.phase === 'window') {
      if (timer.minSeconds === timer.maxSeconds) {
        return `${timer.cueText} — اكتمل الزمن (مضى ${fmtDur(state.elapsedSeconds)})`;
      }
      return `${timer.cueText} — داخل النافذة (متاح ${fmtDur(state.remainingToMaxSeconds)})`;
    }
    return `${timer.cueText} — تجاوز بـ ${fmtDur(state.elapsedSeconds - timer.maxSeconds)}`;
  }

  function syncTimerLoop() {
    const setIntervalFn = typeof global.setInterval === 'function'
      ? global.setInterval.bind(global)
      : (typeof setInterval === 'function' ? setInterval : null);
    const clearIntervalFn = typeof global.clearInterval === 'function'
      ? global.clearInterval.bind(global)
      : (typeof clearInterval === 'function' ? clearInterval : null);

    if (timerRuntime.timers.length > 0) {
      if (timerRuntime.intervalId === null && setIntervalFn) {
        const handle = setIntervalFn(function() {
          tickKitchenTimers({ silent: false });
        }, 1000);
        if (handle && typeof handle.unref === 'function') {
          handle.unref();
        }
        timerRuntime.intervalId = handle;
      }
    } else if (timerRuntime.intervalId !== null) {
      if (clearIntervalFn) clearIntervalFn(timerRuntime.intervalId);
      timerRuntime.intervalId = null;
    }
  }

  function syncTimersFromBench(benchTimers, options) {
    const isInitialLoad = !!(options && options.isInitialLoad);
    const list = arrayify(benchTimers);
    const now = Date.now();
    const activeIds = new Set();

    timerRuntime.timers = list.slice();
    timerRuntime.timersById.clear();

    list.forEach((timer) => {
      if (!timer || !timer.id) return;
      activeIds.add(timer.id);
      timerRuntime.timersById.set(timer.id, timer);
      if (isInitialLoad && !timerRuntime.knownTimerIds.has(timer.id)) {
        const st = computeSafeTimerState(timer, now);
        if (st.phase === 'window') {
          timerRuntime.notifiedTransitions.add(`${timer.id}:window`);
        } else if (st.phase === 'overdue') {
          timerRuntime.notifiedTransitions.add(`${timer.id}:window`);
          timerRuntime.notifiedTransitions.add(`${timer.id}:overdue`);
        }
      }
      timerRuntime.knownTimerIds.add(timer.id);
    });

    Array.from(timerRuntime.knownTimerIds).forEach((id) => {
      if (!activeIds.has(id)) {
        timerRuntime.knownTimerIds.delete(id);
        timerRuntime.notifiedTransitions.delete(`${id}:window`);
        timerRuntime.notifiedTransitions.delete(`${id}:overdue`);
      }
    });

    if (!list.length) {
      timerRuntime.clockSkewActive = false;
    }

    syncTimerLoop();
  }

  function tickKitchenTimers(options) {
    const silent = !!(options && options.silent);
    const now = Date.now();
    let anyClockSkew = false;
    const statesById = new Map();

    timerRuntime.timers.forEach((timer) => {
      const state = computeSafeTimerState(timer, now);
      statesById.set(timer.id, state);
      if (state.clockSkew) anyClockSkew = true;

      if (!silent && (state.phase === 'window' || state.phase === 'overdue')) {
        const key = `${timer.id}:${state.phase}`;
        if (!timerRuntime.notifiedTransitions.has(key)) {
          timerRuntime.notifiedTransitions.add(key);
          if (state.phase === 'overdue') {
            timerRuntime.notifiedTransitions.add(`${timer.id}:window`);
          }
          ensureTimerControllers();
          timerRuntime.chime.play(state.phase);
          try {
            global.navigator?.vibrate?.(200);
          } catch (_) {
            // ignore vibrate errors
          }
          const announcement = state.phase === 'window'
            ? `المؤقت (${timer.cueText}) دخل نافذة الجاهزية.`
            : `المؤقت (${timer.cueText}) تجاوز الحد الأقصى.`;
          timerRuntime.lastLiveAnnouncement = announcement;
          const liveNode = document.querySelector('[data-timer-live="true"]');
          if (liveNode) liveNode.textContent = announcement;
        }
      }
    });

    document.querySelectorAll('[data-timer-id]').forEach((node) => {
      const id = node.getAttribute('data-timer-id');
      const timer = timerRuntime.timersById.get(id);
      const state = statesById.get(id);
      if (timer && state) {
        node.textContent = formatTimerDisplay(timer, state);
        node.dataset.phase = state.phase;
      }
    });

    timerRuntime.clockSkewActive = anyClockSkew;
    const skewNode = document.querySelector('[data-timer-skew-notice="true"]');
    if (skewNode) {
      skewNode.hidden = !anyClockSkew;
      skewNode.textContent = anyClockSkew
        ? 'تنبيه هادئ: تغيّرت ساعة الجهاز إلى الخلف؛ جُمّد العدّ مؤقتًا عند الصفر.'
        : '';
    }
  }

  function startProtocolTimer(stepId, spec) {
    ensureTimerControllers();
    timerRuntime.chime.unlock();
    timerRuntime.wakeLock.request();

    if (!timerRuntime.wakeLock.supported && !timerRuntime.unsupportedNoticeShown) {
      timerRuntime.unsupportedNoticeShown = true;
      timerRuntime.showUnsupportedNotice = true;
    }

    const now = Date.now();
    const currentBench = global.SessionStore?.getBench?.() || { timers: [] };
    const existing = arrayify(currentBench.timers);
    let id = typeof global.crypto?.randomUUID === 'function'
      ? global.crypto.randomUUID()
      : ('t' + now);
    if (existing.some((t) => t.id === id)) {
      timerRuntime.seq += 1;
      id = `${id}_${timerRuntime.seq}`;
    }

    const newTimer = {
      id,
      stepId: String(stepId || ''),
      cueText: spec.cueText,
      startedAtMs: now,
      minSeconds: spec.minSeconds,
      maxSeconds: spec.maxSeconds
    };
    timerRuntime.knownTimerIds.add(id);
    const nextTimers = [...existing, newTimer];
    syncTimersFromBench(nextTimers, { isInitialLoad: false });
    global.SessionStore?.setBench?.({ timers: nextTimers });
  }

  function stopProtocolTimer(timerId) {
    ensureTimerControllers();
    const currentBench = global.SessionStore?.getBench?.() || { timers: [] };
    const nextTimers = arrayify(currentBench.timers).filter((t) => t.id !== timerId);
    timerRuntime.knownTimerIds.delete(timerId);
    timerRuntime.notifiedTransitions.delete(`${timerId}:window`);
    timerRuntime.notifiedTransitions.delete(`${timerId}:overdue`);
    syncTimersFromBench(nextTimers, { isInitialLoad: false });
    if (nextTimers.length === 0) {
      timerRuntime.wakeLock.release();
    }
    global.SessionStore?.setBench?.({ timers: nextTimers });
  }

  function renderKitchenTimersStrip() {
    const now = Date.now();
    const hasContent = timerRuntime.timers.length > 0 || timerRuntime.showUnsupportedNotice || timerRuntime.clockSkewActive;
    return el('section', {
      className: hasContent ? 'kitchen-timers-strip' : 'kitchen-timers-strip is-empty',
      dataset: { timersMount: 'true' },
      ariaLabel: 'مؤقتات المطبخ النشطة'
    }, [
      el('div', {
        className: 'sr-only',
        ariaLive: 'polite',
        dataset: { timerLive: 'true' },
        textContent: timerRuntime.lastLiveAnnouncement || ''
      }),
      el('div', {
        className: 'notice-card is-warning kitchen-timer-notice',
        hidden: !timerRuntime.clockSkewActive,
        dataset: { timerSkewNotice: 'true' },
        textContent: timerRuntime.clockSkewActive
          ? 'تنبيه هادئ: تغيّرت ساعة الجهاز إلى الخلف؛ جُمّد العدّ مؤقتًا عند الصفر.'
          : ''
      }),
      timerRuntime.showUnsupportedNotice ? el('div', {
        className: 'notice-card kitchen-timer-notice',
        dataset: { timerWakelockNotice: 'true' }
      }, [
        el('span', { textContent: 'جهازك لا يدعم إبقاء الشاشة مضاءة؛ فعّل ذلك يدويًا' }),
        el('button', {
          type: 'button',
          className: 'btn btn-sm btn-ghost',
          textContent: 'إخفاء',
          onclick: function() {
            timerRuntime.showUnsupportedNotice = false;
            renderApp();
          }
        })
      ]) : null,
      timerRuntime.timers.length ? el('div', { className: 'kitchen-timers-list' }, timerRuntime.timers.map((timer) => {
        const state = computeSafeTimerState(timer, now);
        return el('div', { className: 'kitchen-timer-item' }, [
          el('span', {
            className: 'kitchen-timer-readout',
            dataset: { timerId: timer.id, phase: state.phase },
            textContent: formatTimerDisplay(timer, state)
          }),
          el('button', {
            type: 'button',
            className: 'btn btn-sm btn-ghost kitchen-timer-stop',
            dataset: { stopTimerId: timer.id },
            textContent: 'إيقاف',
            onclick: function() {
              stopProtocolTimer(timer.id);
            }
          })
        ]);
      })) : null
    ]);
  }

  function renderProtocolBlocks(phaseId, session, sourceNote) {
    const runbook = global.SessionStore?.getRunbook?.(session) || session?.compiledRunbook || null;
    const phase = runbook?.phases?.find((entry) => entry.id === phaseId) || null;
    const steps = arrayify(phase?.steps);
    if (!steps.length) {
      return el('div', { className: 'empty-state' }, [
        el('h3', { textContent: 'لا يوجد بروتوكول جاهز' }),
        el('p', { textContent: 'لا يملك النظام بروتوكولًا موثقًا لهذه الحالة الآن.' })
      ]);
    }

    const cookingMode = global.MedovikViewPrefs?.getMode?.() === 'cook';
    const nextIndex = steps.findIndex((step) => !global.SessionStore?.isStepComplete?.(step.id));
    const activeIndex = nextIndex < 0 ? steps.length - 1 : nextIndex;
    return el('div', { className: 'protocol-stack' }, [
      sourceNote ? el('div', { className: 'notice-card' }, [
        el('strong', { textContent: 'ملاحظة تشغيلية' }),
        el('p', { textContent: sourceNote })
      ]) : null,
      ...steps.map((step, index) => {
        const isComplete = !!global.SessionStore?.isStepComplete?.(step.id);
        const controlRows = arrayify(step.controls);
        const readinessBlockers = arrayify(step.readinessGate?.blockers);
        const failureSignals = arrayify(step.failureSignals).slice(0, 3);
        const detail = el('article', {
          className: 'protocol-block' + (isComplete ? ' is-complete' : '')
        }, [
          el('div', { className: 'protocol-block-head' }, [
            el('span', { className: 'protocol-index', textContent: String(index + 1) }),
            el('div', { className: 'protocol-copy' }, [
              el('h3', { className: 'protocol-title', textContent: step.operatorAction || step.outputState || `خطوة ${index + 1}` }),
              step.purpose ? el('p', { className: 'protocol-purpose', textContent: step.purpose }) : null
            ]),
            el('label', { className: 'protocol-check' }, [
              el('input', {
                type: 'checkbox',
                checked: isComplete,
                onchange: function() {
                  global.SessionStore?.markStepComplete?.(step.id, !isComplete);
                }
              }),
              el('span', { textContent: 'تم' })
            ])
          ]),
          controlRows.length ? el('div', { className: 'protocol-facts' }, controlRows.map((control) => {
            const timerSpec = resolveControlTimerSpec(control);
            return el('div', { className: 'protocol-fact-row' }, [
              el('span', { className: 'protocol-fact-label', textContent: humanizeControlLabel(control) }),
              el('strong', { className: 'protocol-fact-value', textContent: formatProtocolControlValue(control) }),
              timerSpec ? el('button', {
                type: 'button',
                className: 'btn btn-sm btn-secondary protocol-timer-start',
                dataset: { startTimerCue: timerSpec.cueText, stepId: step.id },
                textContent: 'ابدأ مؤقتًا',
                onclick: function() {
                  startProtocolTimer(step.id, timerSpec);
                }
              }) : null
            ]);
          })) : null,
          step.readinessGate ? el('section', { className: 'protocol-note-block' }, [
            el('h4', { className: 'protocol-note-title', textContent: 'علامة الجاهزية' }),
            el('p', { textContent: step.readinessGate.condition || '—' }),
            readinessBlockers.length ? el('ul', { className: 'solutions-list' }, readinessBlockers.map((item) => el('li', { textContent: `مانع: ${item}` }))) : null
          ]) : null,
          failureSignals.length ? el('section', { className: 'protocol-note-block' }, [
            el('h4', { className: 'protocol-note-title', textContent: 'إذا ظهر خلل' }),
            ...failureSignals.map((signal) => el('div', { className: 'protocol-signal-row' }, [
              el('strong', { textContent: signal.signal || 'مشكلة' }),
              signal.cause ? el('p', { textContent: signal.cause }) : null,
              signal.fix ? el('p', { className: 'text-muted', textContent: `الإجراء التصحيحي: ${signal.fix}` }) : null
            ]))
          ]) : null,
          step.provenance?.sourceType ? el('div', { className: 'protocol-foot' }, [
            el('span', { className: 'chip chip-warning', textContent: humanizeProtocolSource(step.provenance.sourceType) })
          ]) : null
        ]);
        if (!cookingMode || index === activeIndex) {
          if (cookingMode) detail.classList.add('protocol-step-active');
          return detail;
        }
        return el('details', { className: 'protocol-step-fold' }, [
          el('summary', { textContent: `خطوة ${index + 1}${isComplete ? ' — منجزة' : ''}: ${step.operatorAction || 'تفاصيل التشغيل'}` }),
          detail
        ]);
      })
    ]);
  }

  function renderIngredientEditor(kind) {
    const draft = getDraft(kind) || { items: [] };
    const draftIds = new Set(arrayify(draft.items).map((it) => it?.ingredientId).filter(Boolean));
    const options = Object.keys(global.IngredientsDB || {})
      .filter((id) => {
        if (draftIds.has(id)) return true;
        const rec = global.IngredientsDB[id];
        if (!rec) return false;
        if (rec.processState === 'strained' || rec.compositionStatus === 'USER_MEASURED') return false;
        return true;
      })
      .map((id) => ({
        id,
        label: global.IngredientsDB[id]?.displayName || id
      }))
      .sort((left, right) => left.label.localeCompare(right.label, 'ar'));

    return el('div', { className: 'editor-shell' }, [
      el('div', { className: 'form-grid' }, [
        el('label', { className: 'field-stack' }, [
          el('span', { className: 'field-label', textContent: 'اسم الوصفة' }),
          el('input', {
            className: 'form-input',
            type: 'text',
            value: draft.name || '',
            onchange: function() {
              global.RecipeLabStore?.updateDraft?.({ name: this.value });
            }
          })
        ]),
        el('label', { className: 'field-stack field-wide' }, [
          el('span', { className: 'field-label', textContent: 'ملاحظات تعريفية' }),
          el('textarea', {
            className: 'form-textarea',
            rows: '3',
            onchange: function() {
              global.RecipeLabStore?.updateDraft?.({ description: this.value });
            }
          }, draft.description || '')
        ])
      ]),
      el('table', { className: 'worksheet-table editor-table' }, [
        el('thead', null, el('tr', null, [
          el('th', { textContent: 'المكون' }),
          el('th', { textContent: 'الوزن' }),
          el('th', { textContent: 'إجراء' })
        ])),
        el('tbody', null, arrayify(draft.items).map((item, index) => {
          const select = el('select', {
            className: 'form-select compact-select',
            onchange: function() {
              global.RecipeLabStore?.updateDraftItem?.(index, { ingredientId: this.value });
            }
          }, options.map((option) => el('option', {
            value: option.id,
            selected: option.id === item.ingredientId,
            textContent: option.label
          })));
          const input = el('input', {
            className: 'form-input compact-input',
            type: 'number',
            step: '0.1',
            value: item.weight,
            onchange: function() {
              global.RecipeLabStore?.updateDraftItem?.(index, { weight: finiteNumber(this.value, 0) });
            }
          });
          return el('tr', null, [
            el('td', null, select),
            el('td', null, input),
            el('td', null, el('button', {
              className: 'btn btn-ghost',
              type: 'button',
              textContent: 'حذف',
              onclick: function() {
                global.RecipeLabStore?.removeDraftItem?.(index);
              }
            }))
          ]);
        }))
      ]),
      el('div', { className: 'inline-actions' }, [
        el('button', {
          className: 'btn btn-secondary',
          type: 'button',
          textContent: 'إضافة مكون',
          onclick: function() {
            global.RecipeLabStore?.addDraftItem?.(options[0]?.id || '');
          }
        })
      ])
    ]);
  }

  function saveWorkflowRecipe(kind, session, form) {
    const source = kind === 'filling' ? getActiveFillingSource(session) : getActiveDoughSource(session);
    const visibleFormula = kind === 'filling'
      ? (getComputedFillingBatch(session)?.preparedFormula || source?.formula)
      : (getComputedDoughBatch(session)?.scaledFormula || source?.formula);
    if (!visibleFormula) return;

    const name = text(form.querySelector('[name="save-name"]')?.value) || source.label;
    const rating = finiteNumber(form.querySelector('[name="save-rating"]')?.value, 0);
    const notes = text(form.querySelector('[name="save-notes"]')?.value);

    global.RecipeLabStore?.createDraft?.({
      kind: kind,
      fromId: source.record?.id || null
    });
    global.RecipeLabStore?.updateDraft?.({
      name,
      description: source.description || '',
      rating,
      notes,
      sourceId: source.record?.sourceId || null
    });
    global.RecipeLabStore?.setDraftItems?.(cloneFormulaItems(visibleFormula));
    const saved = global.RecipeLabStore?.saveDraft?.();
    const persistStatus = global.RecipeLabStore?.getLastPersistStatus?.() || { ok: true };
    if (!saved || !persistStatus.ok) {
      return { ok: false, message: persistStatus.error || 'تعذر حفظ الوصفة محليًا. انسخ المقادير الظاهرة أو جرّب فتح التطبيق في متصفح يسمح بالتخزين المحلي.' };
    }

    if (kind === 'dough') {
      global.SessionStore?.updateRecipeSelection?.({
        mode: 'stored',
        selectedRecipeId: saved.id,
        customKind: 'dough',
        customDraftId: saved.id
      });
    } else {
      global.SessionStore?.setCustomFillingRecipeId?.(saved.id);
      global.SessionStore?.setFillingMode?.('custom');
    }

    global.SessionStore?.addReview?.({
      type: `${kind}-save`,
      rating: rating,
      notes: notes,
      name: saved.name
    });
    return { ok: true, message: `تم حفظ ${kind === 'filling' ? 'الحشو' : 'العجين'} كما يظهر الآن في الجلسة.` };
  }

  function renderSaveCard(kind, session) {
    const source = kind === 'filling' ? getActiveFillingSource(session) : getActiveDoughSource(session);
    const form = el('form', {
      className: 'save-form',
      onsubmit: function(event) {
        event.preventDefault();
        const result = saveWorkflowRecipe(kind, session, form) || { ok: false, message: 'تعذر إكمال الحفظ.' };
        setTransientNotice(result.message, result.ok);
      }
    }, [
      el('label', { className: 'field-stack' }, [
        el('span', { className: 'field-label', textContent: 'اسم الحفظ' }),
        el('input', {
          className: 'form-input',
          type: 'text',
          name: 'save-name',
          value: source?.label || ''
        })
      ]),
      el('label', { className: 'field-stack' }, [
        el('span', { className: 'field-label', textContent: 'التقييم' }),
        el('select', {
          className: 'form-select',
          name: 'save-rating'
        }, [0, 1, 2, 3, 4, 5].map((value) => el('option', {
          value: String(value),
          textContent: value === 0 ? 'بدون تقييم' : `${value}/5`
        })))
      ]),
      el('label', { className: 'field-stack' }, [
        el('span', { className: 'field-label', textContent: 'ملاحظات' }),
        el('textarea', {
          className: 'form-textarea',
          rows: '4',
          name: 'save-notes',
          placeholder: 'ما الذي نجح؟ ما الذي يحتاج تعديلًا؟'
        })
      ]),
      el('button', {
        className: 'btn btn-primary',
        type: 'submit',
        textContent: 'حفظ الوصفة'
      })
    ]);

    return renderAsideCard('حفظ وتقييم', [
      el('p', { className: 'text-muted', textContent: 'احفظ اللقطة الحالية مع تقييمك وملاحظاتك لتعود إليها لاحقًا في المقارنة أو التشغيل.' }),
      form
    ]);
  }

  function renderSetupStep(session) {
    const selection = session?.recipeSelection || {};
    const spec = session?.productSpec || {};
    const source = getActiveDoughSource(session);
    const records = getRecords('dough');
    const geometry = buildGeometry(spec);
    const batch = getComputedDoughBatch(session);
    const baseDoughMass = Math.round(batch?.context?.doughFormula?.totalMass?.() || source.formula?.totalMass?.() || (source.profile ? global.buildRecipeFormula?.(source.profile)?.totalMass?.() : 1000) || 1000);
    const formula = batch?.scaledFormula || source.formula;
    const ingredientRows = batch?.ingredientRows || buildDoughIngredientRows(formula);
    const adjustedAnalysis = analyzeSourceFormula('dough', source.label || 'وصفة العجين', formula, source.record?.id);
    const analysisMetrics = adjustedAnalysis?.metrics || source.analysis?.metrics || {};
    const shape = normalizeShapeValue(spec.shape);
    const groupedOptions = {
      builtin: records.filter((record) => record.origin === 'builtin'),
      custom: records.filter((record) => record.origin === 'custom')
    };

    const modeButtons = el('div', { className: 'mode-toggle' }, [
      el('button', {
        className: 'mode-pill' + (selection.mode !== 'custom' ? ' is-active' : ''),
        type: 'button',
        textContent: 'اختر من المكتبة',
        onclick: function() {
          const currentId = selection.selectedRecipeId || source.record?.id || groupedOptions.builtin[0]?.id || null;
          global.SessionStore?.updateRecipeSelection?.({
            mode: 'stored',
            selectedRecipeId: currentId,
            customKind: 'dough'
          });
          if (currentId) {
            const record = getRecord(currentId);
            if (record?.sourceId && global.MEDOVIK_RECIPE_PROFILES?.[record.sourceId]) {
              global.SessionStore?.setRecipe?.(record.sourceId);
            }
          }
        }
      }),
      el('button', {
        className: 'mode-pill' + (selection.mode === 'custom' ? ' is-active' : ''),
        type: 'button',
        textContent: 'أنشئ وصفة حرة',
        onclick: function() {
          global.RecipeLabStore?.createDraft?.({ kind: 'dough' });
          global.SessionStore?.updateRecipeSelection?.({
            mode: 'custom',
            customKind: 'dough',
            customDraftId: null
          });
        }
      })
    ]);

    const dropdown = el('select', {
      className: 'form-select',
      dataset: { role: 'recipe-select' },
      onchange: function() {
        const nextId = this.value;
        if (!nextId) return;
        const record = getRecord(nextId);
        global.SessionStore?.updateRecipeSelection?.({
          mode: 'stored',
          selectedRecipeId: nextId,
          customKind: 'dough'
        });
        if (record?.sourceId && global.MEDOVIK_RECIPE_PROFILES?.[record.sourceId]) {
          global.SessionStore?.setRecipe?.(record.sourceId);
        }
      }
    }, [
      el('option', { value: '', textContent: 'اختر وصفة عجين' }),
      el('optgroup', { label: 'المكتبة المرجعية' }, groupedOptions.builtin.map((record) => el('option', {
        value: record.id,
        selected: selection.mode !== 'custom' && normalizeDoughRecordId(selection.selectedRecipeId || session?.doughSystem?.recipeId) === record.id,
        textContent: record.name
      }))),
      groupedOptions.custom.length ? el('optgroup', { label: 'الوصفات المحفوظة' }, groupedOptions.custom.map((record) => el('option', {
        value: record.id,
        selected: selection.mode !== 'custom' && normalizeDoughRecordId(selection.selectedRecipeId) === record.id,
        textContent: record.name
      }))) : null
    ]);

    const main = [
      renderSectionCard('اختيار الوصفة', 'اختر وصفة جاهزة أو اكتب وصفة حرة، لكن دع القراءة تبقى كنسب خباز قبل أي أرقام تنفيذية.', [
        modeButtons,
        selection.mode === 'custom'
          ? renderIngredientEditor('dough')
          : el('div', { className: 'field-stack' }, [
              el('span', { className: 'field-label', textContent: 'اختر من المكتبة' }),
              dropdown
            ])
      ]),
      renderSectionCard('أبعاد العجين', 'هذه الحقول هي التي تقود مقادير العجين فعليًا عبر 5 مسارات تحجيم مرنة ومتكافئة رياضياً.', [
        el('div', { className: 'form-grid dimensions-grid' }, [
          el('label', { className: 'field-stack field-wide' }, [
            el('span', { className: 'field-label', textContent: 'مسار القيادة والتحجيم' }),
            el('select', {
              className: 'form-select',
              dataset: { focusKey: 'spec-scale-mode' },
              onchange: function() {
                global.SessionStore?.updateProductSpec?.({
                  scaleMode: this.value,
                  targetHeightCm: null
                });
              }
            }, [
              el('option', { value: 'volume', selected: (spec.scaleMode || 'volume') === 'volume', textContent: 'القيادة بالسمك المطلوب بعد الخبز (حجمي - الافتراضي)' }),
              el('option', { value: 'rawThickness', selected: spec.scaleMode === 'rawThickness', textContent: 'القيادة بسمك الفرد الخام المطلوب (مم)' }),
              el('option', { value: 'manualBall', selected: spec.scaleMode === 'manualBall', textContent: 'القيادة بوزن القطعة الواحدة (جم)' }),
              el('option', { value: 'totalDoughWeight', selected: spec.scaleMode === 'totalDoughWeight', textContent: 'القيادة بوزن العجين الكلي المطلوب (جم)' }),
              el('option', { value: 'flourBasis', selected: spec.scaleMode === 'flourBasis', textContent: 'القيادة بوزن الدقيق المطلوب (جم)' })
            ])
          ]),
          el('label', { className: 'field-stack' }, [
            el('span', { className: 'field-label', textContent: 'نوع الشكل' }),
            el('select', {
              className: 'form-select',
              onchange: function() {
                const nextShape = normalizeShapeValue(this.value);
                global.SessionStore?.updateProductSpec?.({
                  shape: nextShape,
                  d2: nextShape === 'round' ? finiteNumber(spec.d1, 20) : finiteNumber(spec.d2, finiteNumber(spec.d1, 20)),
                  targetHeightCm: null
                });
              }
            }, [
              el('option', { value: 'round', selected: shape === 'round', textContent: 'دائري' }),
              el('option', { value: 'rect', selected: shape === 'rect', textContent: 'مستطيل' })
            ])
          ]),
          el('label', { className: 'field-stack' }, [
            el('span', { className: 'field-label', textContent: shape === 'round' ? 'القطر (سم)' : 'العرض (سم)' }),
            el('input', {
              className: 'form-input',
              type: 'number',
              step: '0.1',
              value: finiteNumber(spec.d1, 20),
              onchange: function() {
                const next = finiteNumber(this.value, 20);
                global.SessionStore?.updateProductSpec?.({
                  d1: next,
                  d2: shape === 'round' ? next : finiteNumber(spec.d2, next),
                  targetHeightCm: null
                });
              }
            })
          ]),
          shape === 'rect' ? el('label', { className: 'field-stack' }, [
            el('span', { className: 'field-label', textContent: 'الطول (سم)' }),
            el('input', {
              className: 'form-input',
              type: 'number',
              step: '0.1',
              value: finiteNumber(spec.d2, finiteNumber(spec.d1, 20)),
              onchange: function() {
                global.SessionStore?.updateProductSpec?.({
                  d2: finiteNumber(this.value, finiteNumber(spec.d1, 20)),
                  targetHeightCm: null
                });
              }
            })
          ]) : null,
          el('label', { className: 'field-stack' }, [
            el('span', { className: 'field-label', textContent: 'عدد الطبقات' }),
            el('input', {
              className: 'form-input',
              type: 'number',
              step: '1',
              min: '1',
              value: finiteNumber(spec.layers, 8),
              onchange: function() {
                global.SessionStore?.updateProductSpec?.({
                  layers: Math.max(1, Math.round(finiteNumber(this.value, 8))),
                  targetHeightCm: null
                });
              }
            })
          ]),
          (spec.scaleMode === 'volume' || !spec.scaleMode) ? el('label', { className: 'field-stack' }, [
            el('span', { className: 'field-label', textContent: 'سماكة الطبقة بعد الخبز (مم)' }),
            el('input', {
              className: 'form-input',
              type: 'number',
              step: '0.1',
              min: '0.2',
              dataset: { focusKey: 'spec-target-baked-thickness' },
              value: finiteNumber(spec.targetBakedLayerThicknessMm, 2),
              onchange: function() {
                const next = Math.max(0.2, finiteNumber(this.value, 2));
                global.SessionStore?.updateProductSpec?.({
                  targetBakedLayerThicknessMm: next,
                  estimatedBakedLayerThicknessMm: next,
                  targetHeightCm: null
                });
              }
            })
          ]) : null,
          (spec.scaleMode === 'volume' || !spec.scaleMode) ? el('label', { className: 'field-stack' }, [
            el('span', { className: 'field-label', textContent: 'سماكة الفرد الخام المرجعية (مم)' }),
            el('input', {
              className: 'form-input',
              type: 'number',
              step: '0.1',
              min: '0.2',
              dataset: { focusKey: 'spec-raw-sheet-thickness-ref' },
              value: finiteNumber(spec.rawSheetThicknessMm, 1.5),
              onchange: function() {
                global.SessionStore?.updateProductSpec?.({
                  rawSheetThicknessMm: Math.max(0.2, finiteNumber(this.value, 1.5)),
                  targetHeightCm: null
                });
              }
            })
          ]) : null,
          spec.scaleMode === 'rawThickness' ? el('label', { className: 'field-stack' }, [
            el('span', { className: 'field-label', textContent: 'سماكة الفرد الخام (مم)' }),
            el('input', {
              className: 'form-input',
              type: 'number',
              step: '0.1',
              min: '0.2',
              dataset: { focusKey: 'spec-raw-sheet-thickness' },
              value: finiteNumber(spec.rawSheetThicknessMm, 1.5),
              onchange: function() {
                global.SessionStore?.updateProductSpec?.({
                  rawSheetThicknessMm: Math.max(0.2, finiteNumber(this.value, 1.5)),
                  targetHeightCm: null
                });
              }
            })
          ]) : null,
          spec.scaleMode === 'manualBall' ? el('label', { className: 'field-stack' }, [
            el('span', { className: 'field-label', textContent: 'وزن القطعة الواحدة (جم)' }),
            el('input', {
              className: 'form-input',
              type: 'number',
              step: '1',
              min: '10',
              dataset: { focusKey: 'spec-ball-weight' },
              value: finiteNumber(spec.ballWeight, 140),
              onchange: function() {
                global.SessionStore?.updateProductSpec?.({
                  ballWeight: Math.max(1, finiteNumber(this.value, 140)),
                  targetHeightCm: null
                });
              }
            })
          ]) : null,
          spec.scaleMode === 'totalDoughWeight' ? el('label', { className: 'field-stack' }, [
            el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;' }, [
              el('span', { className: 'field-label', style: 'margin:0;', textContent: 'وزن العجين المطلوب (جم)' }),
              baseDoughMass > 0 ? el('button', {
                type: 'button',
                className: 'btn btn-xs btn-ghost',
                style: 'font-size:0.75rem;padding:2px 6px;',
                textContent: `وزن الوصفة الأصلية (${baseDoughMass}g)`,
                onclick: function() {
                  global.SessionStore?.updateProductSpec?.({
                    targetTotalDoughWeight: baseDoughMass,
                    totalDoughMassBasis: 'prepared',
                    targetHeightCm: null
                  });
                }
              }) : null
            ]),
            el('input', {
              className: 'form-input',
              type: 'number',
              step: '10',
              min: '50',
              dataset: { focusKey: 'spec-total-dough-weight' },
              value: finiteNumber(spec.targetTotalDoughWeight, 1000),
              onchange: function() {
                global.SessionStore?.updateProductSpec?.({
                  targetTotalDoughWeight: Math.max(20, finiteNumber(this.value, 1000)),
                  targetHeightCm: null
                });
              }
            })
          ]) : null,
          spec.scaleMode === 'totalDoughWeight' ? el('label', { className: 'field-stack' }, [
            el('span', { className: 'field-label', textContent: 'أساس وزن العجين الكلي' }),
            el('select', {
              className: 'form-select',
              dataset: { focusKey: 'spec-total-dough-basis' },
              onchange: function() {
                global.SessionStore?.updateProductSpec?.({
                  totalDoughMassBasis: this.value,
                  targetHeightCm: null
                });
              }
            }, [
              el('option', { value: 'prepared', selected: (spec.totalDoughMassBasis || 'prepared') === 'prepared', textContent: 'شامل الهالك (عجين مُحضّر كامل)' }),
              el('option', { value: 'net', selected: spec.totalDoughMassBasis === 'net', textContent: 'صافي للطبقات فقط (بدون الهالك)' })
            ])
          ]) : null,
          spec.scaleMode === 'flourBasis' ? el('label', { className: 'field-stack' }, [
            el('span', { className: 'field-label', textContent: 'وزن الدقيق المطلوب (جم)' }),
            el('input', {
              className: 'form-input',
              type: 'number',
              step: '10',
              min: '10',
              dataset: { focusKey: 'spec-target-flour-weight' },
              value: finiteNumber(spec.targetFlourWeight, 500),
              onchange: function() {
                global.SessionStore?.updateProductSpec?.({
                  targetFlourWeight: Math.max(10, finiteNumber(this.value, 500)),
                  targetHeightCm: null
                });
              }
            })
          ]) : null
        ]),
        el('div', { className: 'scaling-estimates-bar', style: 'margin-top:12px;padding:10px 14px;background:var(--bg-card);border:1px solid var(--border-soft);border-radius:8px;font-size:0.85rem;display:flex;flex-wrap:wrap;gap:12px;align-items:center;' }, [
          el('span', { style: 'color:var(--text-muted);', textContent: 'تقديرات التحجيم المتبادلة:' }),
          el('span', { style: 'font-weight:600;', textContent: `السمك المتوقع للفرد الخام: ~${fmt(batch?.context?.dough?.estimatedRawThicknessMm ?? batch?.estimatedRawThicknessMm ?? spec.rawSheetThicknessMm, 1)} مم` }),
          el('span', { style: 'color:var(--border-soft);', textContent: '|' }),
          el('span', { style: 'font-weight:600;', textContent: `السمك المتوقع بعد الخبز: ~${fmt(batch?.context?.dough?.estimatedThicknessMm ?? batch?.estimatedThicknessMm ?? spec.targetBakedLayerThicknessMm, 1)} مم` }),
          el('span', { style: 'color:var(--border-soft);', textContent: '|' }),
          el('span', { style: 'color:var(--text-muted);', textContent: `كثافة العجين الخام المستند إليها: ${batch?.context?.dough?.usedRawDensity ? fmt(batch.context.dough.usedRawDensity, 3) + ' جم/سم³ (تقدير تركيبي)' : 'غير متاحة'}` })
        ])
      ]),
      renderSectionCard('مقادير العجين', 'النسبة هي اللغة الأولى. الجرامات هنا مرجع تنفيذي مشتق من نفس الوصفة والحجم الحالي.', [
        renderMetricGrid([
          { label: 'إجمالي الماء/الدقيق', value: fmtPercent(analysisMetrics.hydrationPct, 1), hint: 'مؤشر تركيبي لا يساوي الماء الحر' },
          { label: 'الحلاوة', value: analysisMetrics.sweetnessLabel || '—' },
          { label: 'الدهن', value: fmtPercent(analysisMetrics.fatPctOnFlour, 1) },
          { label: 'البروتين', value: fmtPercent(analysisMetrics.proteinPctOnFlour, 1) }
        ]),
        renderWorksheetTable('مقادير العجين', ingredientRows, 'نسبة الخباز'),
        renderSingleRecipePanels('dough', formula, adjustedAnalysis || source.analysis, source.record || source.profile)
      ], [renderStepNav('setup')])
    ];

    const aside = [
      renderAsideCard('قراءة التشغيل', [
        renderSummaryList([
          { label: 'الوصفة', value: source.label || '—' },
          { label: 'الشكل', value: shape === 'rect' ? 'مستطيل' : 'دائري' },
          { label: 'المساحة', value: `${fmt(geometry.area(), 1)} سم²` },
          { label: 'الكتلة الخام', value: `${fmt(batch?.totalRaw, 1)}g` },
          { label: 'وزن الكرة', value: `${fmt(batch?.ballWeight, 1)}g` },
          { label: 'الارتفاع الكلي الحالي', value: `${fmt(batch?.stackHeight ? batch.stackHeight / 10 : geometry.stackHeightMm() / 10, 1)} سم` }
        ]),
        (adjustedAnalysis?.summary || source.analysis?.summary) ? el('p', { className: 'text-muted', textContent: adjustedAnalysis?.summary || source.analysis?.summary }) : null
      ], true),
      renderSaveCard('dough', session)
    ];

    return renderWorkspaceLayout('setup', main, aside);
  }

  function renderTemperingSupport(session) {
    const tempering = global.TemperingCalculator?.calculateFromBatch?.(getComputedDoughBatch(session), {
      eggTemp: 20, syrupTemp: 85, batches: 4
    }) || null;
    if (!tempering) return null;
    const expected = Number.isFinite(tempering.finalTemp) ? `${fmt(tempering.finalTemp, 1)}°C` : 'غير محسوب';
    return renderSectionCard('التمبرنج — تقدير لا شهادة سلامة',
      'حساب طاقة حرارية مبسط بمدخلات مفترضة (20°م للبيض و85°م للقاعدة). لا يتنبأ بالسخونة الموضعية أو تجلط البيض.', [
        renderMetricGrid([
          { label: 'كتلة البيض', value: `${fmt(tempering.eggMass, 1)}g` },
          { label: 'كتلة القاعدة الساخنة', value: `${fmt(tempering.syrupMass, 1)}g` },
          { label: 'عدد دفعات مفترض', value: String(tempering.batches) },
          { label: 'متوسط الحرارة المتوقع بعد الخلط', value: expected }
        ]),
        el('p', { className: 'text-muted', textContent:
          'التقدير الحراري ليس حدًا آمنًا ولا يثبت عدم تخثر البيض. أضف تدريجيًا مع خفق مستمر واتبع بروتوكول الوصفة وعلامات التكتل المرئية.' }),
        el('div', { className: 'inline-actions' }, [
          el('button', { className: 'btn btn-secondary', type: 'button', textContent: 'فتح حاسبة التمبرنج',
            onclick: function() { openDrawer('tempering-tool', 'حاسبة التمبرنج'); } })
        ])
      ]);
  }

  function renderDoughProtocolStep(session) {
    const source = getActiveDoughSource(session);
    const sourceNote = source.mode === 'custom'
      ? `الوصفة الحالية حرة، لكن البروتوكول المعروض مرجعي ومربوط بمرجع التشغيل ${getSelectedDoughRecord(session)?.name || 'الحالي'}.`
      : null;
    return renderWorkspaceLayout('dough-protocol', [
      renderTemperingSupport(session),
      renderProtocolBlocks('dough', session, sourceNote)
    ], [
      renderAsideCard('حالة العجين', [
        renderSummaryList([
          { label: 'الوصفة', value: source.label || '—' },
          { label: 'المرجع', value: getSelectedDoughRecord(session)?.name || '—' },
          { label: 'المرحلة', value: 'بروتوكول العجين' }
        ])
      ], true)
    ]);
  }

  function formatThicknessAuditLabel(thicknessAudit, scaleMode) {
    const status = thicknessAudit?.status || 'INSUFFICIENT_DATA';
    if (status === 'CONSISTENT') {
      return scaleMode === 'volume'
        ? 'الكتلة محسوبة من الكثافة والسماكة (لا فحص مستقل)'
        : 'متسق';
    }
    if (status === 'CONFLICT') {
      return 'تعارض بين السماكة والكتلة';
    }
    return 'بيانات غير كافية للفحص المستقل';
  }

  function renderFirstLayerCalibrationCard(session, batch, geometry) {
    const bench = global.SessionStore?.getBench?.() || { strained: null, firstLayer: null, timers: [] };
    const saved = bench.firstLayer;
    const notice = batch?.context?.benchNotice || null;
    const doughOut = batch?.context?.dough || null;
    const draft = benchUiState.firstLayerDraft;

    const rawVal = draft ? draft.rawText : (saved ? String(saved.rawLayerWeightG) : '');
    const bakedVal = draft ? draft.bakedText : (saved ? String(saved.bakedLayerWeightG) : '');
    const areaVal = draft ? draft.areaText : (saved ? String(saved.areaCm2) : fmt(geometry?.area?.(), 2));
    const ptVals = [0, 1, 2].map((idx) => {
      if (draft && Array.isArray(draft.thicknessTexts)) return draft.thicknessTexts[idx] ?? '';
      if (saved && Array.isArray(saved.thicknessPointsMm) && saved.thicknessPointsMm[idx] !== undefined) {
        return String(saved.thicknessPointsMm[idx]);
      }
      return '';
    });

    const rawInput = el('input', {
      className: 'form-input',
      type: 'text',
      inputmode: 'decimal',
      dir: 'ltr',
      value: rawVal,
      dataset: { focusKey: 'bench:layer:raw' }
    });
    const bakedInput = el('input', {
      className: 'form-input',
      type: 'text',
      inputmode: 'decimal',
      dir: 'ltr',
      value: bakedVal,
      dataset: { focusKey: 'bench:layer:baked' }
    });
    const areaInput = el('input', {
      className: 'form-input',
      type: 'text',
      inputmode: 'decimal',
      dir: 'ltr',
      value: areaVal,
      dataset: { focusKey: 'bench:layer:area' }
    });
    const ptInputs = ptVals.map((val, idx) => el('input', {
      className: 'form-input',
      type: 'text',
      inputmode: 'decimal',
      dir: 'ltr',
      value: val,
      dataset: { focusKey: `bench:layer:pt:${idx}` }
    }));

    const clearMeasurement = function() {
      benchUiState.firstLayerErrors = [];
      benchUiState.firstLayerPersistWarn = false;
      benchUiState.firstLayerDraft = null;
      global.SessionStore?.setBench?.({ firstLayer: null });
    };

    const saveMeasurement = function() {
      const texts = {
        rawText: rawInput.value,
        bakedText: bakedInput.value,
        areaText: areaInput.value,
        thicknessTexts: ptInputs.map((inp) => inp.value)
      };
      const parsed = global.MedovikBench?.parseFirstLayerInputs?.(texts);
      if (!parsed || !parsed.ok) {
        benchUiState.firstLayerDraft = texts;
        benchUiState.firstLayerErrors = parsed?.errors || ['تعذر قراءة مدخلات الطبقة الأولى.'];
        benchUiState.firstLayerPersistWarn = false;
        renderApp();
        return;
      }
      const cal = global.MedovikBench?.calibrateFirstBakedLayer?.(parsed.values);
      if (!cal || !cal.ok) {
        benchUiState.firstLayerDraft = texts;
        benchUiState.firstLayerErrors = cal?.errors || ['مدخلات معايرة الطبقة الأولى غير صالحة.'];
        benchUiState.firstLayerPersistWarn = false;
        renderApp();
        return;
      }
      const recipeProfile = global.SessionStore?.getActiveRecipeProfile?.() || getSelectedDoughRecord(session);
      const doughRecipeId = String(
        recipeProfile?.sourceId || recipeProfile?.id || global.SessionStore?.getRecipeId?.() || ''
      );
      const activeDoughFormula =
        batch?.context?.product?.doughFormula || getActiveDoughSource(session)?.formula || null;
      const contextKey = global.MedovikBench?.benchContextKey?.({
        doughRecipeId,
        rawSheetThicknessMm: geometry?.rawSheetThicknessMm,
        doughFormula: activeDoughFormula
      }) || '';

      benchUiState.firstLayerErrors = [];
      benchUiState.firstLayerDraft = null;
      global.SessionStore?.setBench?.({
        firstLayer: {
          ...parsed.values,
          measuredAt: new Date().toISOString(),
          context: contextKey
        }
      });
      const ps = global.SessionStore?.getLastPersistStatus?.();
      benchUiState.firstLayerPersistWarn = ps ? !ps.ok : false;
      renderApp();
    };

    const alertMessages = [...benchUiState.firstLayerErrors];
    if (benchUiState.firstLayerPersistWarn) {
      alertMessages.push('تعذّر حفظ القياس على هذا الجهاز؛ سيبقى خلال هذه الجلسة فقط');
    }

    const calResult = saved ? global.MedovikBench?.calibrateFirstBakedLayer?.(saved) : null;
    const modelYieldPct = Number.isFinite(doughOut?.bakeYield) ? doughOut.bakeYield * 100 : null;
    const effectiveScaleMode = doughOut?.scaleMode || geometry?.scaleMode || 'volume';

    return renderSectionCard(
      'معايرة أول طبقة مخبوزة',
      'زن الطبقة الأولى خامًا ثم بعد الخبز وقس سماكتها في 3 نقاط لضبط كثافة الخبز وعائده لبقية الطبقات.',
      [
        notice?.applied ? el('div', { className: 'notice-card' }, [
          el('p', {
            textContent:
              `تُستخدم كثافتك المقاسة ${fmt(notice.bakedDensity, 3)} غ/سم³ وعائدك المقاس ${fmt(notice.bakeYield * 100, 1)}% بدل تقدير النموذج ${fmt(notice.modelDensity, 3)} و${fmt(notice.modelBakeYield * 100, 1)}%؛ وزن العجين للطبقة ${fmt(notice.ballWeight, 1)} غ بدل ${fmt(notice.modelBallWeight, 1)} غ`
          }),
          el('div', { className: 'inline-actions' }, [
            el('button', {
              className: 'btn btn-secondary',
              type: 'button',
              textContent: 'العودة إلى تقدير النموذج',
              dataset: { benchAction: 'reset-first-layer' },
              onclick: clearMeasurement
            })
          ])
        ]) : null,
        notice?.reason === 'context-mismatch' ? el('div', { className: 'notice-card is-warning' }, [
          el('strong', { textContent: 'قياس محفوظ لسياق مختلف' }),
          el('p', { textContent: 'القياس المحفوظ لا ينطبق على الوصفة أو سماكة اللوح الحاليين؛ تُستخدم تقديرات النموذج حاليًا.' }),
          el('div', { className: 'inline-actions' }, [
            el('button', {
              className: 'btn btn-secondary',
              type: 'button',
              textContent: 'مسح القياس',
              onclick: clearMeasurement
            })
          ])
        ]) : null,
        el('div', { className: 'form-grid dimensions-grid' }, [
          el('label', { className: 'field-stack' }, [
            el('span', { className: 'field-label', textContent: 'وزن الطبقة الخام (غ)' }),
            rawInput
          ]),
          el('label', { className: 'field-stack' }, [
            el('span', { className: 'field-label', textContent: 'وزن الطبقة المخبوزة (غ)' }),
            bakedInput
          ]),
          el('label', { className: 'field-stack' }, [
            el('span', { className: 'field-label', textContent: 'مساحة القالب (سم²)' }),
            areaInput
          ]),
          ...ptInputs.map((inp, idx) => el('label', { className: 'field-stack' }, [
            el('span', { className: 'field-label', textContent: `نقطة السماكة ${idx + 1} (مم)` }),
            inp
          ]))
        ]),
        el('div', { className: 'inline-actions' }, [
          el('button', {
            className: 'btn btn-primary',
            type: 'button',
            textContent: 'احفظ القياس',
            dataset: { benchAction: 'save-first-layer' },
            onclick: saveMeasurement
          }),
          el('button', {
            className: 'btn btn-secondary',
            type: 'button',
            textContent: 'مسح القياس',
            dataset: { benchAction: 'clear-first-layer' },
            onclick: clearMeasurement
          })
        ]),
        alertMessages.length ? el('div', { className: 'notice-card is-warning', role: 'alert' }, [
          renderInlineList(alertMessages)
        ]) : null,
        calResult?.ok ? renderMetricGrid([
          { label: 'متوسط السماكة', value: `${fmt(calResult.avgThicknessMm, 2)} مم` },
          { label: 'الانتشار', value: `${fmt(calResult.spreadMm, 2)} مم (${fmt(calResult.spreadRelPct, 1)}%)` },
          { label: 'الكثافة المقاسة', value: `${fmt(calResult.bakedDensity, 3)} غ/سم³` },
          {
            label: 'عائد الخبز المقاس',
            value: fmtPercent(calResult.bakeYield * 100, 1),
            hint: modelYieldPct !== null ? `عائد نموذج الخبز: ${fmtPercent(modelYieldPct, 1)}` : null
          },
          { label: 'فقد الكتلة', value: fmtPercent(calResult.massLossPct, 1) },
          { label: 'اتساق السماكة', value: formatThicknessAuditLabel(doughOut?.thicknessAudit, effectiveScaleMode) }
        ]) : null
      ]
    );
  }

  function renderAqueousAwPanel(formula) {
    const awApi = global.MedovikAqueousActivity;
    if (!awApi || typeof awApi.estimateAqueousPhaseAw !== 'function') return null;

    const res = awApi.estimateAqueousPhaseAw(formula, global.IngredientsDB);
    const statusLabelText = res.status === 'BOUNDED_ESTIMATE'
      ? 'تقدير مقيّد بالتركيب'
      : 'بيانات غير كافية';
    const statusClass = res.status === 'BOUNDED_ESTIMATE'
      ? 'chip chip-accent'
      : 'chip chip-warning';

    const valueDisplay = res.aw !== null && res.awMin !== null && res.awMax !== null
      ? `${res.aw.toFixed(4)} (المدى ${res.awMin.toFixed(4)}–${res.awMax.toFixed(4)})`
      : (res.reason || 'غير متاح');

    return el('section', {
      className: 'notice-card',
      dataset: { aqueousAwPanel: 'true' }
    }, [
      el('div', { className: 'inline-actions' }, [
        el('strong', {
          textContent: 'تقدير النشاط المائي للطور المائي (Norrish) — للمقارنة النسبية فقط، لا للصلاحية'
        }),
        el('span', { className: statusClass, textContent: statusLabelText })
      ]),
      el('p', { textContent: valueDisplay }),
      arrayify(res.assumptions).length ? el('p', {
        className: 'text-muted',
        textContent: res.assumptions.join(' · ')
      }) : null
    ]);
  }

  function renderCreamReconstitutionCard(session, fillingBatch, preparedFormula) {
    const hasCream = (preparedFormula?.items || []).some(
      it => it.ingredientId === 'whipping-cream' || it.ingredientId === 'cream'
    );
    if (!hasCream) return null;

    const rawCreamPrep = session?.execution?.stepData?.['creamPrep.v1'] || session?.stepData?.['creamPrep.v1'] || {};
    const creamPrep = global.MedovikCreamPrep?.normalizeCreamPrepConfig?.(rawCreamPrep) || {
      mode: 'liquid',
      liquidType: 'milk',
      liquidPerPartPowder: 2.0
    };

    const creamItem = (preparedFormula?.items || []).find(
      it => it.ingredientId === 'whipping-cream' || it.ingredientId === 'cream'
    );
    const totalCreamMassG = creamItem ? finiteNumber(creamItem.weight, 0) : 0;

    const impact = global.MedovikCreamPrep?.analyzeCreamReconstitutionImpact?.({
      fillingFormula: preparedFormula,
      ingredientsDB: global.IngredientsDB,
      creamPrepConfig: creamPrep,
      totalRequiredCreamMassG: totalCreamMassG
    });

    const isPowder = creamPrep.mode === 'powder';

    const controls = [
      el('div', { className: 'reconstitution-mode-row', style: 'display:flex;gap:8px;margin-bottom:12px;align-items:center;' }, [
        el('span', { className: 'field-label', style: 'margin:0;', textContent: 'نوع الكريمة المستعملة:' }),
        el('button', {
          type: 'button',
          className: `btn btn-sm ${!isPowder ? 'btn-primary' : 'btn-ghost'}`,
          textContent: 'كريمة خفق سائلة جاهزة',
          onclick: function() {
            global.SessionStore?.setStepData?.('creamPrep.v1', { ...creamPrep, mode: 'liquid' });
          }
        }),
        el('button', {
          type: 'button',
          className: `btn btn-sm ${isPowder ? 'btn-primary' : 'btn-ghost'}`,
          textContent: 'بديل كريمة بودر غير محلاة',
          onclick: function() {
            global.SessionStore?.setStepData?.('creamPrep.v1', { ...creamPrep, mode: 'powder' });
          }
        })
      ])
    ];

    if (isPowder && impact && impact.active) {
      controls.push(
        el('div', { className: 'form-grid dimensions-grid', style: 'margin-bottom:12px;' }, [
          el('label', { className: 'field-stack' }, [
            el('span', { className: 'field-label', textContent: 'سائل التذويب' }),
            el('select', {
              className: 'form-select',
              dataset: { focusKey: 'cream-prep-liquid-type' },
              onchange: function() {
                global.SessionStore?.setStepData?.('creamPrep.v1', { ...creamPrep, liquidType: this.value });
              }
            }, [
              el('option', { value: 'milk', selected: creamPrep.liquidType === 'milk', textContent: 'حليب بارد كامل الدسم (موصى به)' }),
              el('option', { value: 'water', selected: creamPrep.liquidType === 'water', textContent: 'ماء مثلج' })
            ])
          ]),
          el('label', { className: 'field-stack' }, [
            el('span', { className: 'field-label', textContent: 'نسبة التذويب (سائل لكل 1 بودر)' }),
            el('input', {
              className: 'form-input',
              type: 'number',
              step: '0.1',
              min: '0.5',
              max: '4.0',
              dataset: { focusKey: 'cream-prep-ratio' },
              value: creamPrep.liquidPerPartPowder,
              onchange: function() {
                const val = global.medovikClamp?.(finiteNumber(this.value, 2.0), 0.5, 4.0) ?? 2.0;
                global.SessionStore?.setStepData?.('creamPrep.v1', { ...creamPrep, liquidPerPartPowder: val });
              }
            })
          ])
        ]),
        el('div', { className: 'reconstitution-summary-card', style: 'background:var(--bg-card);border:1px solid var(--border-soft);border-radius:8px;padding:12px;margin-bottom:12px;' }, [
          el('h4', { style: 'margin:0 0 8px 0;font-size:0.95rem;color:var(--text-heading);', textContent: 'أوزان تحضير بديل الكريمة البودر' }),
          renderMetricGrid([
            { label: 'الكريمة السائلة المطلوبة', value: `${fmt(totalCreamMassG, 1)}g`, hint: 'الوزن المعياري في الوصفة' },
            { label: 'بودر الكريمة غير المحلى', value: `${fmt(impact.split.powderMassG, 1)}g`, hint: '1 جزء بالوزن' },
            { label: impact.split.liquidDisplayName, value: `${fmt(impact.split.liquidMassG, 1)}g`, hint: `${impact.split.liquidPerPartPowder} أجزاء بالوزن` }
          ]),
          impact.comparison ? el('div', { style: 'font-size:0.85rem;color:var(--text-muted);margin-top:8px;line-height:1.5;' }, [
            el('span', { textContent: 'الأثر التركيبي مقارنة بالكريمة السائلة 35%: ' }),
            el('strong', { textContent: `الماء (${impact.comparison.waterDeltaG >= 0 ? '+' : ''}${fmt(impact.comparison.waterDeltaG, 1)}g)` }),
            el('span', { textContent: ' · ' }),
            el('strong', { textContent: `الصلب (${impact.comparison.solidsDeltaG >= 0 ? '+' : ''}${fmt(impact.comparison.solidsDeltaG, 1)}g)` }),
            el('span', { textContent: ' · ' }),
            el('strong', { textContent: `الدهن (${impact.comparison.fatDeltaG >= 0 ? '+' : ''}${fmt(impact.comparison.fatDeltaG, 1)}g)` })
          ]) : null
        ])
      );
      if (impact.warnings && impact.warnings.length > 0) {
        controls.push(
          el('div', { className: 'callout callout-info', style: 'font-size:0.85rem;' }, [
            el('ul', { style: 'margin:0;padding-inline-start:18px;' },
              impact.warnings.map(w => el('li', { textContent: w }))
            )
          ])
        );
      }
    }

    return renderSectionCard(
      'بديل الكريمة البودر الخام (1:2)',
      'حساب دقيق لتفكيك وزن الكريمة السائلة المطلوبة إلى بودر وسائل بارد (حليب أو ماء) بنسبة تذويب مرنة دون تغيير هوية الوصفة الأصلية.',
      controls
    );
  }

  function renderStrainedCalibrationCard() {
    const bench = global.SessionStore?.getBench?.() || { strained: null, firstLayer: null, timers: [] };
    const saved = bench.strained;
    const draft = benchUiState.strainedDraft;

    const rawVal = draft ? draft.rawText : (saved ? String(saved.rawWeightG) : '');
    const strainedVal = draft ? draft.strainedText : (saved ? String(saved.strainedWeightG) : '');

    const rawInput = el('input', {
      className: 'form-input',
      type: 'text',
      inputmode: 'decimal',
      dir: 'ltr',
      value: rawVal,
      dataset: { focusKey: 'bench:strained:raw' }
    });
    const strainedInput = el('input', {
      className: 'form-input',
      type: 'text',
      inputmode: 'decimal',
      dir: 'ltr',
      value: strainedVal,
      dataset: { focusKey: 'bench:strained:strained' }
    });

    const clearMeasurement = function() {
      benchUiState.strainedErrors = [];
      benchUiState.strainedPersistWarn = false;
      benchUiState.strainedDraft = null;
      global.MedovikBench?.unregisterMeasuredIngredient?.(global.IngredientsDB, 'sour-cream-strained-measured');
      global.SessionStore?.setBench?.({ strained: null });
    };

    const saveMeasurement = function() {
      const texts = {
        rawText: rawInput.value,
        strainedText: strainedInput.value
      };
      const parsed = global.MedovikBench?.parseStrainedInputs?.(texts);
      if (!parsed || !parsed.ok) {
        benchUiState.strainedDraft = texts;
        benchUiState.strainedErrors = parsed?.errors || ['تعذر قراءة مدخلات التصفية.'];
        benchUiState.strainedPersistWarn = false;
        renderApp();
        return;
      }
      const cal = global.MedovikBench?.calibrateStrainedSourCream?.(parsed.values, global.IngredientsDB);
      if (!cal || !cal.ok) {
        benchUiState.strainedDraft = texts;
        benchUiState.strainedErrors = cal?.errors || ['مدخلات تصفية الساور كريم غير صالحة.'];
        benchUiState.strainedPersistWarn = false;
        renderApp();
        return;
      }
      benchUiState.strainedErrors = [];
      benchUiState.strainedDraft = null;
      global.SessionStore?.setBench?.({
        strained: {
          ...parsed.values,
          measuredAt: new Date().toISOString()
        }
      });
      const ps = global.SessionStore?.getLastPersistStatus?.();
      benchUiState.strainedPersistWarn = ps ? !ps.ok : false;
      renderApp();
    };

    const alertMessages = [...benchUiState.strainedErrors];
    if (benchUiState.strainedPersistWarn) {
      alertMessages.push('تعذّر حفظ القياس على هذا الجهاز؛ سيبقى خلال هذه الجلسة فقط');
    }

    const calResult = saved
      ? global.MedovikBench?.calibrateStrainedSourCream?.(saved, global.IngredientsDB)
      : null;

    return renderSectionCard(
      'معايرة تصفية الساور كريم',
      'إذا صفّيت الساور كريم في مطبخك، أدخل وزنه قبل التصفية وبعدها ليُستبدل العائد الافتراضي بالعائد الفعلي المقاس.',
      [
        el('div', { className: 'form-grid dimensions-grid' }, [
          el('label', { className: 'field-stack' }, [
            el('span', { className: 'field-label', textContent: 'الوزن الخام قبل التصفية (غ)' }),
            rawInput
          ]),
          el('label', { className: 'field-stack' }, [
            el('span', { className: 'field-label', textContent: 'الوزن بعد التصفية (غ)' }),
            strainedInput
          ])
        ]),
        el('div', { className: 'inline-actions' }, [
          el('button', {
            className: 'btn btn-primary',
            type: 'button',
            textContent: 'احفظ القياس',
            dataset: { benchAction: 'save-strained' },
            onclick: saveMeasurement
          }),
          el('button', {
            className: 'btn btn-secondary',
            type: 'button',
            textContent: 'مسح القياس',
            dataset: { benchAction: 'clear-strained' },
            onclick: clearMeasurement
          })
        ]),
        alertMessages.length ? el('div', { className: 'notice-card is-warning', role: 'alert' }, [
          renderInlineList(alertMessages)
        ]) : null,
        calResult?.ok ? renderMetricGrid([
          { label: 'العائد المقاس', value: fmtPercent(calResult.outputRatio * 100, 1) },
          { label: 'المصل المفقود', value: `${fmt(calResult.lostWeightG, 1)}g` }
        ]) : null
      ]
    );
  }

  function renderBakingStep(session) {
    const batch = getComputedDoughBatch(session);
    const bakeLoop = global.SessionStore?.getBakeLoop?.() || {};
    const geometry = buildGeometry(session?.productSpec || {});
    const sourceNote = batch?.estimatedThicknessMm
      ? `السماكة التشغيلية المستهدفة الآن تقارب ${fmt(batch.estimatedThicknessMm, 1)} مم لكل طبقة بعد الفرد، لذلك اقرأ اللون والزمن مع هذه السماكة لا بمعزل عنها.`
      : null;

    return renderWorkspaceLayout('baking', [
      renderSectionCard('متابعة الخبز', 'سجّل ما خرج من الفرن بالفعل حتى تبقى قراءة البروتوكول مرتبطة بنتيجة تشغيلية حقيقية لا بانطباع سريع.', [
        el('div', { className: 'form-grid dimensions-grid' }, [
          el('label', { className: 'field-stack' }, [
            el('span', { className: 'field-label', textContent: 'عدد الطبقات المخبوزة' }),
            el('input', {
              className: 'form-input',
              type: 'number',
              step: '1',
              min: '0',
              value: finiteNumber(bakeLoop.bakedLayers, 0),
              onchange: function() {
                global.SessionStore?.setBakeLoop?.({
                  bakedLayers: Math.max(0, Math.round(finiteNumber(this.value, 0)))
                });
              }
            })
          ]),
          el('label', { className: 'field-stack' }, [
            el('span', { className: 'field-label', textContent: 'متوسط زمن الطبقة (دقيقة)' }),
            el('input', {
              className: 'form-input',
              type: 'number',
              step: '0.1',
              min: '0',
              value: finiteNumber(bakeLoop.averageMinutes, 0),
              onchange: function() {
                global.SessionStore?.setBakeLoop?.({
                  averageMinutes: fmt(finiteNumber(this.value, 0), 1)
                });
              }
            })
          ])
        ]),
        renderMetricGrid([
          { label: 'وزن الكرة', value: `${fmt(batch?.ballWeight, 1)}g` },
          { label: 'السماكة المستهدفة', value: `${fmt(batch?.estimatedThicknessMm, 1)} مم` },
          { label: 'الارتفاع الحالي', value: `${fmt(geometry.stackHeightMm() / 10, 1)} سم` },
          { label: 'الطبقات المخبوزة', value: String(Math.max(0, finiteNumber(bakeLoop.bakedLayers, 0))) }
        ])
      ]),
      renderFirstLayerCalibrationCard(session, batch, geometry),
      renderSectionCard('بروتوكول الخبز', 'اقرأ الخبز كمرحلة مستقلة: فرد، إدخال، مراقبة اللون والبنية، ثم التبريد قبل أي حكم على الحشو أو التجميع.', [
        renderProtocolBlocks('baking', session, sourceNote)
      ], [renderStepNav('baking')])
    ], [
      renderAsideCard('قراءة الخبز', [
        renderSummaryList([
          { label: 'عدد الطبقات', value: String(Math.max(1, finiteNumber(session?.productSpec?.layers, 1))) },
          { label: 'متوسط الزمن', value: bakeLoop.averageMinutes ? `${fmt(bakeLoop.averageMinutes, 1)} دقيقة` : '—' },
          { label: 'الكتلة الخام', value: `${fmt(batch?.totalRaw, 1)}g` }
        ]),
        sourceNote ? el('p', { className: 'text-muted', textContent: sourceNote }) : null,
        el('p', { className: 'text-muted', textContent: 'بعد خروج الطبقة، اتركها تبرد فترة قصيرة ثم اختبر نقلها: يجب أن تتماسك من دون تمزق أو التصاق شديد. لا تحكم على هشاشتها وهي ساخنة.' })
      ], true)
    ]);
  }

  function renderFillingStep(session) {
    const fillingMode = (session?.fillingPlan?.mode || 'reference') === 'custom' ? 'custom' : 'reference';
    const source = getActiveFillingSource(session);
    const spec = session?.productSpec || {};
    const geometry = buildGeometry(spec);
    const fillingBatch = getComputedFillingBatch(session);
    const sweetnessSnapshot = getComputedSweetness(session);
    const preparedFormula = fillingBatch?.preparedFormula || source.formula;
    const ingredientRows = fillingBatch?.ingredientRows || buildFillingIngredientRows(preparedFormula);
    const builtinRecords = getRecords('filling').filter((record) => record.origin === 'builtin');
    const customRecords = getRecords('filling').filter((record) => record.origin === 'custom');
    const selectedReferenceId = normalizeFillingRecordId(source.record?.id || global.SessionStore?.getFillingId?.());
    const sweetnessValue = global.SessionStore?.getSweetnessAdjustmentPct?.() || 0;
    const sweetnessTarget = global.SessionStore?.getSweetnessTarget?.() || 'filling';
    const fillingThickness = finiteNumber(spec.fillingThicknessMm, geometry.fillingThicknessMm || 3);
    const adjustedAnalysis = analyzeSourceFormula('filling', source.label || 'الحشو', preparedFormula, source.record?.id);
    const sourceNote = source.mode === 'custom'
      ? 'الحشو الحالي حر أو محفوظ مخصص. الخطوات المعروضة تشرح التعامل العملي مع مكوناته، ولا تغيّر المقادير أو تفرض طريقة وصفة أخرى.'
      : null;
    const explanation = adjustedAnalysis?.summary || source.analysis?.summary || source.description || 'اقرأ هذا الحشو من خلال توازن الحلاوة والمواد الصلبة والماء، لا من خلال الحلاوة وحدها.';

    const main = [
      renderSectionCard('اختيار الحشو', 'اختر حشوًا محفوظًا أو حرًا، لكن يجب أن تظهر المقادير نفسها في نفس الشاشة مباشرة دون فصل غير مبرر.', [
        el('div', { className: 'mode-toggle' }, [
          el('button', {
            className: 'mode-pill' + (fillingMode === 'reference' ? ' is-active' : ''),
            type: 'button',
            textContent: 'حشو من المكتبة',
            onclick: function() {
              global.SessionStore?.setFillingMode?.('reference');
              global.SessionStore?.setCustomFillingRecipeId?.(null);
            }
          }),
          el('button', {
            className: 'mode-pill' + (fillingMode === 'custom' ? ' is-active' : ''),
            type: 'button',
            textContent: 'حشو حر',
            onclick: function() {
              global.RecipeLabStore?.createDraft?.({ kind: 'filling' });
              global.SessionStore?.setFillingMode?.('custom');
              global.SessionStore?.setCustomFillingRecipeId?.(null);
            }
          })
        ]),
        fillingMode === 'reference'
          ? el('div', { className: 'field-stack' }, [
              el('span', { className: 'field-label', textContent: 'اختر الحشو' }),
              el('select', {
                className: 'form-select',
                onchange: function() {
                  const record = getRecord(this.value);
                  if (!record) return;
                  if (record.origin === 'custom') {
                    global.SessionStore?.setFillingMode?.('custom');
                    global.SessionStore?.setCustomFillingRecipeId?.(record.id);
                  } else {
                    global.SessionStore?.setFilling?.(record.sourceId || record.id.replace('builtin:filling:', ''));
                    global.SessionStore?.setFillingMode?.('reference');
                    global.SessionStore?.setCustomFillingRecipeId?.(null);
                  }
                }
              }, [
                el('optgroup', { label: 'المكتبة المرجعية' }, builtinRecords.map((record) => el('option', {
                  value: record.id,
                  selected: selectedReferenceId === record.id,
                  textContent: record.name
                }))),
                customRecords.length ? el('optgroup', { label: 'الحشوات المحفوظة' }, customRecords.map((record) => el('option', {
                  value: record.id,
                  textContent: record.name
                }))) : null
              ])
            ])
          : renderIngredientEditor('filling')
      ]),
      renderSectionCard('ضبط الحشو', 'هنا تظهر سماكة الحشو، التغطية، والحلاوة في نفس الموضع الذي ترى فيه المقادير النهائية.', [
        el('div', { className: 'form-grid dimensions-grid' }, [
          el('label', { className: 'field-stack' }, [
            el('span', { className: 'field-label', textContent: 'سماكة الحشو بين الطبقات (مم)' }),
            el('input', {
              className: 'form-input',
              type: 'number',
              step: '0.1',
              min: '0',
              value: fillingThickness,
              onchange: function() {
                global.SessionStore?.updateProductSpec?.({
                  fillingThicknessMm: Math.max(0, finiteNumber(this.value, 3)),
                  targetHeightCm: null
                });
              }
            })
          ]),
          el('label', { className: 'field-stack' }, [
            el('span', { className: 'field-label', textContent: 'التطبيق' }),
            el('select', {
              className: 'form-select',
              onchange: function() {
                global.SessionStore?.setSweetnessTarget?.(this.value);
              }
            }, [
              el('option', { value: 'filling', selected: sweetnessTarget === 'filling', textContent: 'الحشو فقط' }),
              el('option', { value: 'dough', selected: sweetnessTarget === 'dough', textContent: 'العجين فقط' }),
              el('option', { value: 'both', selected: sweetnessTarget === 'both', textContent: 'الاثنان معًا' })
            ])
          ]),
          el('label', { className: 'field-stack field-wide' }, [
            el('span', { className: 'field-label', textContent: 'متحكم الحلاوة' }),
            el('div', { className: 'slider-shell' }, [
              el('input', {
                className: 'range-slider',
                type: 'range',
                min: '-40',
                max: '40',
                step: '1',
                value: sweetnessValue,
                oninput: function() {
                  global.SessionStore?.setSweetnessAdjustmentPct?.(finiteNumber(this.value, 0));
                }
              }),
              el('strong', {
                className: 'slider-value',
                textContent: `${sweetnessValue > 0 ? '+' : ''}${fmt(sweetnessValue, 0)}%`
              })
            ])
          ])
        ])
      ]),
      renderSectionCard('مقادير الحشو', 'هذه هي كمية التحضير الفعلية للحشو الحالي بعد ضبط الحجم والحلاوة، وليست بطاقة منفصلة عن الاختيار.', [
        renderMetricGrid([
          { label: 'الحلاوة', value: sweetnessSnapshot?.label || adjustedAnalysis?.metrics?.sweetnessLabel || source.analysis?.metrics?.sweetnessLabel || '—' },
          {
            label: 'القراءة التشغيلية',
            value: fmt(sweetnessSnapshot?.primaryReading?.value, 1),
            hint: sweetnessSnapshot?.primaryReading?.label || 'القراءة الحية للمسار المستهدف الآن'
          },
          { label: 'مواد صلبة/ماء', value: fmt(adjustedAnalysis?.metrics?.solidsWaterRatio ?? source.analysis?.metrics?.solidsWaterRatio, 2) },
          { label: 'الكمية المطلوبة', value: `${fmt(fillingBatch?.preparedRequiredMass, 1)}g` }
        ]),
        renderWorksheetTable('مقادير الحشو', ingredientRows, 'نسبة من الكتلة'),
        renderSingleRecipePanels('filling', preparedFormula, adjustedAnalysis || source.analysis, source.record || source.profile),
        renderAqueousAwPanel(fillingBatch?.scaledFormula || preparedFormula)
      ]),
      renderCreamReconstitutionCard(session, fillingBatch, preparedFormula),
      renderStrainedCalibrationCard(),
      el('details', {className:'optional-explanation',open:global.MedovikViewPrefs?.getMode?.()==='advanced' ? 'open' : null}, [
        el('summary', {textContent:'التفسير العلمي التفصيلي للحشو'}),
        renderSectionCard('شرح الحشو', 'اقرأ سلوك الحشو الحالي قبل التنفيذ: ما الذي يجعله متوازنًا، وما المؤشر الذي يجب أن تراقبه أثناء التحضير.', [
        el('p', { textContent: explanation }),
        renderInlineList([
          sourceNote,
          sweetnessSnapshot?.primaryReading?.label ? `المؤشر التشغيلي الأهم الآن: ${sweetnessSnapshot.primaryReading.label}.` : null,
          Number.isFinite(adjustedAnalysis?.metrics?.solidsWaterRatio ?? source.analysis?.metrics?.solidsWaterRatio)
            ? `نسبة المواد الصلبة إلى الماء الحالية: ${fmt(adjustedAnalysis?.metrics?.solidsWaterRatio ?? source.analysis?.metrics?.solidsWaterRatio, 2)}.`
            : null
        ])
      ])]),
      renderSectionCard('بروتوكول الحشو', 'نفّذ الحشو من نفس الصفحة التي تختاره وتضبطه فيها، حتى تبقى القراءة والمقادير والبروتوكول جزءًا من قرار واحد.', [
        renderProtocolBlocks('filling', session, sourceNote)
      ], [renderStepNav('filling')])
    ];

    const aside = [
      renderAsideCard('قراءة الحشو', [
        renderSummaryList([
          { label: 'الوضع', value: fillingMode === 'custom' ? 'وصفة حرة/محفوظة' : 'مرجع مخزن' },
          { label: 'الحشو', value: source.label || '—' },
          { label: 'سماكة الحشو', value: `${fmt(geometry.fillingThicknessMm, 1)} مم` },
          { label: 'ارتفاع الكعكة الحالي', value: `${fmt(fillingBatch?.context?.config?.stackHeightMm?.() ? fillingBatch.context.config.stackHeightMm() / 10 : geometry.stackHeightMm() / 10, 1)} سم` },
          { label: 'المرجع البروتوكولي', value: getSelectedFillingRecord(Object.assign({}, session, { fillingPlan: Object.assign({}, session.fillingPlan, { mode: 'reference' }) }))?.name || '—' }
        ]),
        (adjustedAnalysis?.summary || source.analysis?.summary) ? el('p', { className: 'text-muted', textContent: adjustedAnalysis?.summary || source.analysis?.summary }) : null
      ], true),
      renderSaveCard('filling', session)
    ];

    return renderWorkspaceLayout('filling', main, aside);
  }


  function renderAssemblyStep(session) {
    const geometry = buildGeometry(session?.productSpec || {});
    const fillingBatch = getComputedFillingBatch(session);
    const source = getActiveFillingSource(session);
    const main = [
      renderSectionCard('خطة التجميع', 'وزّع الحشو بانتظام، ثم راقب ثبات الرصة قبل نقلها إلى التبريد.', [
        renderMetricGrid([
          { label: 'عدد الطبقات', value: String(geometry?.layers || 0) },
          { label: 'الحشو لكل فجوة', value: `${fmt(fillingBatch?.perGap, 0)}g` },
          { label: 'الحشو داخل الطبقات', value: `${fmt(fillingBatch?.interiorRequiredMass, 0)}g` },
          { label: 'التغطية الخارجية', value: `${fmt(fillingBatch?.outerRequiredMass, 0)}g` }
        ]),
        fillingBatch?.applicationWarning ? el('div', { className: 'notice-card' }, [
          el('strong', { textContent: 'ملاحظة على الاستخدام' }),
          el('p', { textContent: fillingBatch.applicationWarning })
        ]) : null
      ]),
      renderHydrationLoadCard(session),
      renderSectionCard('بروتوكول التجميع والنضج', 'نفّذ الرص والضغط الخفيف والتبريد حتى تلين الطبقات من دون انزلاق أو خروج مصل.', [
        renderProtocolBlocks('assembly', session, null)
      ], [renderStepNav('assembly')])
    ];
    const aside = [renderAsideCard('قراءة سريعة', [
      renderSummaryList([
        { label: 'الحشو', value: source.label || '—' },
        { label: 'الارتفاع المتوقع', value: `${fmt(geometry?.stackHeightMm?.() / 10, 1)} سم` },
        { label: 'الكمية المحضرة', value: `${fmt(fillingBatch?.preparedRequiredMass, 0)}g` }
      ]),
      el('p', { className: 'text-muted', textContent: 'علامة الجاهزية: تمر السكين بسهولة، ولا تنزلق الطبقات، وتحافظ القطعة على شكلها بعد التقطيع.' })
    ], true)];
    return renderWorkspaceLayout('assembly', main, aside);
  }

  function renderReviewStep(session) {
    const doughSource = getActiveDoughSource(session);
    const fillingSource = getActiveFillingSource(session);
    const doughBatch = getComputedDoughBatch(session);
    const fillingBatch = getComputedFillingBatch(session);
    const reviews = global.SessionStore?.getReviews?.() || [];
    const form = el('form', {
      className: 'save-form',
      onsubmit: function(event) {
        event.preventDefault();
        const notes = text(form.querySelector('[name="final-notes"]')?.value);
        const rating = finiteNumber(form.querySelector('[name="final-rating"]')?.value, 0);
        global.SessionStore?.addReview?.({ type: 'final-result', name: `${doughSource.label} + ${fillingSource.label}`, rating, notes });
        const persistStatus = global.SessionStore?.getLastPersistStatus?.() || { ok: true };
        setTransientNotice(persistStatus.ok ? 'تم حفظ نتيجة الدفعة وملاحظاتها.' : (persistStatus.error || 'تعذر حفظ النتيجة محليًا.'), persistStatus.ok);
      }
    }, [
      el('label', { className: 'field-stack' }, [
        el('span', { className: 'field-label', textContent: 'تقييم النتيجة' }),
        el('select', { className: 'form-select', name: 'final-rating' }, [0,1,2,3,4,5].map(value => el('option', { value: String(value), textContent: value ? `${value}/5` : 'بدون تقييم' })))
      ]),
      el('label', { className: 'field-stack' }, [
        el('span', { className: 'field-label', textContent: 'ملاحظات الدفعة' }),
        el('textarea', { className: 'form-textarea', rows: '5', name: 'final-notes', placeholder: 'اللون، الفرد، الحشو، النضج، وما الذي ستكرره أو تعدله.' })
      ]),
      el('button', { className: 'btn btn-primary', type: 'submit', textContent: 'حفظ النتيجة' })
    ]);
    const main = [
      renderSectionCard('ملخص التنفيذ', 'هذه هي الصيغة والحجوم المستخدمة في الجلسة الحالية.', [
        renderMetricGrid([
          { label: 'العجين المحضّر', value: `${fmt(doughBatch?.totalRaw, 0)}g` },
          { label: 'وزن الطبقة الخام', value: doughBatch?.ballWeight ? `${fmt(doughBatch.ballWeight, 0)}g` : 'يُنشر في الصينية' },
          { label: 'الحشو المحضّر', value: `${fmt(fillingBatch?.preparedRequiredMass, 0)}g` },
          { label: 'الحشو لكل فجوة', value: `${fmt(fillingBatch?.perGap, 0)}g` }
        ]),
        renderSummaryList([
          { label: 'وصفة العجين', value: doughSource.label || '—' },
          { label: 'وصفة الحشو', value: fillingSource.label || '—' },
          { label: 'الملاحظات المحفوظة', value: String(reviews.length) }
        ])
      ]),
      renderHydrationLoadCard(session),
      renderSectionCard('سجل النتيجة', 'اكتب ما حدث فعليًا؛ هذه الملاحظات هي التي تساعدك في الدفعة التالية.', [form], [renderStepNav('review')])
    ];
    const aside = [
      renderSaveCard('dough', session),
      renderSaveCard('filling', session)
    ];
    return renderWorkspaceLayout('review', main, aside);
  }

  function renderComparisonSection(kind, title, selectedIds) {
    const allRecords = getRecords(kind);
    const analyses = arrayify(selectedIds).map((id) => getRecord(id)).filter(Boolean).map((record) => {
      const formula = restoreFormula(record?.formulaSnapshot);
      const validCoverage = isFormulaCoverageValid(formula);
      return {
        record,
        formula,
        validCoverage,
        familyId: resolveRecordFamilyId(kind, record, formula),
        analysis: global.RecipeLabAnalyzer?.analyze?.(record)
      };
    }).filter((entry) => entry.analysis);

    const metricKeys = kind === 'dough'
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
          ['aqueousSugarIndex', 'مؤشر السكر في السكر+الماء']
        ];

    const isPlainNumericKey = (key) =>
      key === 'sweetnessEqPer100' || key === 'solidsWaterRatio' || key === 'aqueousSugarIndex';

    const metricSpecs = metricKeys.map(([key, label]) => ({
      key,
      label,
      unit: key === 'sweetnessEqPer100' ? 'مكافئ/100غ' : (isPlainNumericKey(key) ? '' : '%'),
      decimals: 1,
      isPercent: !isPlainNumericKey(key)
    }));

    const compModel = global.MedovikComparison?.buildComparisonModel
      ? global.MedovikComparison.buildComparisonModel({
          kind,
          metricSpecs,
          analyses: analyses.map((entry) => {
            const rawMetrics = entry.validCoverage && entry.analysis?.ok ? (entry.analysis.metrics || {}) : {};
            const safeMetrics = {};
            metricKeys.forEach(([k]) => {
              safeMetrics[k] = entry.validCoverage && Number.isFinite(Number(rawMetrics[k]))
                ? Number(rawMetrics[k])
                : null;
            });
            return {
              id: entry.record.id,
              name: entry.record.name,
              familyId: entry.familyId,
              metrics: safeMetrics
            };
          })
        })
      : { rows: [], crossFamily: false, familyIds: [] };

    const ingredientMap = new Map();
    analyses.forEach((entry) => {
      arrayify(entry.analysis?.ingredientRows).forEach((row) => {
        const displayId = row.displayIngredientId || row.ingredientId;
        if (!ingredientMap.has(displayId)) {
          ingredientMap.set(displayId, row.label);
        }
      });
    });

    const comparisonSummary = analyses.length === 2
      ? global.RecipeLabAnalyzer?.compare?.(analyses[0].record, analyses[1].record)
      : null;

    const deltaSentences = analyses.length === 2
      ? compModel.rows.map((r) => r.delta?.sentence).filter(Boolean)
      : [];

    const renderComparisonCell = (cell, spec) => {
      if (!cell || cell.value === null || !Number.isFinite(cell.value)) {
        return el('td', { className: 'num-cell', textContent: 'غير متاح' });
      }
      const valueText = spec.isPercent ? fmtPercent(cell.value, spec.decimals) : fmt(cell.value, spec.decimals);
      const children = [valueText];
      if (cell.mark === 'max') {
        children.push(el('span', { className: 'compare-mark is-max', 'aria-hidden': 'true', textContent: '▲' }));
        children.push(el('span', { className: 'sr-only', textContent: ' الأعلى' }));
      } else if (cell.mark === 'min') {
        children.push(el('span', { className: 'compare-mark is-min', 'aria-hidden': 'true', textContent: '▼' }));
        children.push(el('span', { className: 'sr-only', textContent: ' الأدنى' }));
      } else if (cell.mark === 'tie') {
        children.push(el('span', { className: 'compare-mark is-tie', textContent: ' متساويان' }));
      }
      return el('td', { className: 'num-cell' }, children);
    };

    const renderDeltaCell = (row, spec) => {
      if (!row?.delta) {
        return el('td', { className: 'num-cell', textContent: 'غير متاح' });
      }
      const absText = spec.isPercent ? fmtPercent(row.delta.abs, spec.decimals) : fmt(row.delta.abs, spec.decimals);
      const relText = row.delta.relPct !== null ? ` (${fmtPercent(row.delta.relPct, 1)})` : '';
      return el('td', { className: 'num-cell', textContent: `${absText}${relText}` });
    };

    return el('section', { className: 'comparison-card' }, [
      el('div', { className: 'comparison-head' }, [
        el('h3', { className: 'card-title', textContent: title }),
        el('p', { className: 'text-muted', textContent: 'اختر وصفتين أو أكثر من النوع نفسه. النسب هي اللغة الأولى، والجرامات مرجع ثانوي فقط.' })
      ]),
      el('div', { className: 'compare-picker' }, allRecords.map((record) => {
        const checked = selectedIds.indexOf(record.id) !== -1;
        return el('label', { className: 'compare-checkbox' }, [
          el('input', {
            type: 'checkbox',
            checked: checked,
            dataset: { focusKey: `cmp:${kind}:${record.id}` },
            onchange: function() {
              const nextIds = checked
                ? selectedIds.filter((id) => id !== record.id)
                : selectedIds.concat([record.id]);
              global.RecipeLabStore?.setKindCompareIds?.(kind, nextIds);
            }
          }),
          el('span', { textContent: record.name })
        ]);
      })),
      analyses.length >= 2 ? el('div', { className: 'comparison-results' }, [
        compModel.crossFamily ? el('div', { className: 'notice-card is-warning', role: 'status' }, [
          el('strong', { textContent: 'تنبيه اختلاف عائلة العملية' }),
          el('p', { textContent: 'الوصفات المختارة تنتمي إلى عائلات عملية مختلفة؛ اقرأ الفروق البنيوية مع مراعاة اختلاف أسلوب التحضير والتشكيل.' })
        ]) : null,
        comparisonSummary?.ok ? el('div', { className: 'notice-card' }, [
          el('strong', { textContent: 'الفروق البنيوية الأوضح' }),
          el('p', { textContent: comparisonSummary.summary })
        ]) : null,
        el('table', { className: 'worksheet-table compare-table' }, [
          el('thead', null, el('tr', null, [
            el('th', { textContent: 'المؤشر' }),
            ...analyses.map((entry) => el('th', { textContent: entry.record.name })),
            analyses.length === 2 ? el('th', { textContent: 'الفرق (المطلق / النسبي)' }) : null
          ])),
          el('tbody', null, compModel.rows.map((row, idx) => {
            const spec = metricSpecs[idx];
            return el('tr', null, [
              el('td', { textContent: row.label }),
              ...row.cells.map((cell) => renderComparisonCell(cell, spec)),
              analyses.length === 2 ? renderDeltaCell(row, spec) : null
            ]);
          }))
        ]),
        deltaSentences.length ? el('div', { className: 'notice-card' }, [
          el('strong', { textContent: 'نتيجة المقارنة المباشرة' }),
          renderInlineList(deltaSentences)
        ]) : null,
        el('table', { className: 'worksheet-table compare-table' }, [
          el('thead', null, el('tr', null, [
            el('th', { textContent: kind === 'dough' ? 'المكون (٪ على الدقيق)' : 'المكون (٪ من الكتلة)' }),
            ...analyses.map((entry) => el('th', { textContent: entry.record.name }))
          ])),
          el('tbody', null, Array.from(ingredientMap.entries()).map(([ingredientId, label]) => el('tr', null, [
            el('td', { textContent: label }),
            ...analyses.map((entry) => {
              const row = arrayify(entry.analysis.ingredientRows).find((item) => (item.displayIngredientId || item.ingredientId) === ingredientId) || null;
              return el('td', { className: 'num-cell', textContent: row ? fmtPercent(row.pct, 1) : '—' });
            })
          ])))
        ])
      ]) : el('div', { className: 'empty-state' }, [
        el('h4', { textContent: 'حدد وصفتين على الأقل' }),
        el('p', { textContent: 'عند اختيار وصفتين أو أكثر سيعرض النظام المقارنة بالنسب البنيوية لا بفرق الجرامات.' })
      ])
    ]);
  }

  function renderComparisonToolBody() {
    const compareState = getRecipeStoreState()?.compare || {};
    const doughIds = arrayify(compareState.doughIds);
    const fillingIds = arrayify(compareState.fillingIds);
    return el('div', { className: 'comparison-tool-stack' }, [
      renderComparisonSection('dough', 'مقارنة وصفات العجين', doughIds),
      renderComparisonSection('filling', 'مقارنة وصفات الحشو', fillingIds)
    ]);
  }

  function registerLocalTools() {
    if (!global.ToolRegistry?.register || registerLocalTools.done) return;
    registerLocalTools.done = true;
    global.ToolRegistry.register({
      id: 'recipe-comparison',
      icon: null,
      title: 'مقارنة الوصفات',
      description: 'قارن وصفات العجين أو الحشو بالنسب البنيوية ومؤشرات الحلاوة والرطوبة والدهن، لا بفروق الجرامات.',
      render(container) {
        clearNode(container);
        container.appendChild(renderComparisonToolBody());
      }
    });
  }

  function renderToolStep(stepId, toolId) {
    return renderWorkspaceLayout(stepId, [
      el('section', { className: 'section-card' }, [
        el('div', { className: 'section-card-head' }, [
          el('div', null, [
            el('h2', {
              className: 'section-title',
              dataset: { role: 'workspace-title' },
              textContent: STEP_META[stepId].title
            }),
            el('p', { className: 'section-subtitle', textContent: STEP_META[stepId].subtitle })
          ])
        ]),
        el('div', { className: 'section-card-body' }, [
          el('div', { className: 'tool-host', dataset: { toolHost: toolId } })
        ]),
        renderStepNav(stepId)
      ])
    ], [
      renderAsideCard('السياق الحالي', [
        renderSummaryList([
          { label: 'الخطوة', value: STEP_META[stepId].label },
          { label: 'المرحلة التنفيذية', value: global.SessionStore?.getCurrentPhase?.() || 'setup' }
        ])
      ], true)
    ]);
  }

  function renderCookingBrief(stepId) {
    if (global.MedovikViewPrefs?.getMode?.() !== 'cook') return null;
    const phaseId = stepId === 'dough-protocol' ? 'dough' : stepId;
    if (!['dough','baking','filling','assembly'].includes(phaseId)) return null;
    const session = getSession();
    const phase = global.SessionStore?.getRunbook?.(session)?.phases?.find(p => p.id === phaseId);
    const steps = arrayify(phase?.steps);
    if (!steps.length) return null;
    const index = steps.findIndex(step => !global.SessionStore?.isStepComplete?.(step.id));
    const current = steps[Math.max(0,index<0?steps.length-1:index)];
    const complete = steps.filter(step => global.SessionStore?.isStepComplete?.(step.id)).length;
    const facts = arrayify(current.controls).slice(0,2).map(control => `${humanizeControlLabel(control)}: ${formatProtocolControlValue(control)}`);
    return el('section',{className:'cook-brief',role:'region',ariaLabel:'الخطوة العملية الحالية'},[
      el('span',{className:'cook-brief-eyebrow',textContent:`الخطوة الحالية · ${complete}/${steps.length} منجزة`}),
      el('h2',{className:'cook-brief-title',textContent:current.operatorAction||'راجع البروتوكول'}),
      facts.length?el('p',{className:'cook-brief-facts',textContent:facts.join(' · ')}):null,
      current.readinessGate?.condition?el('p',{className:'cook-brief-gate',textContent:`علامة الجاهزية: ${current.readinessGate.condition}`}):null,
      el('p',{className:'cook-brief-warning',textContent:'راجع موانع الجاهزية والتحذيرات المرتبطة بالخطوة في البروتوكول المفصل أدناه.'})
    ]);
  }

  function renderWorkspaceLayout(stepId, mainChildren, asideChildren) {
    const meta = STEP_META[stepId];
    const session = getSession();
    const index = Math.max(0, STEP_ORDER.indexOf(stepId));
    const source = getActiveDoughSource(session);
    const spec = session?.productSpec || {};
    return el('section', { className: 'workspace-screen' }, [
      el('header', { className: 'workflow-hero', 'aria-label':'سياق المرحلة الحالية' }, [
        el('div', {className:'workflow-hero-top'},[
          el('span',{className:'workflow-phase-label',textContent:index<6?`مسار التصنيع / المرحلة ${index+1} من ${PRODUCTION_STEPS.length}`:'المراجع العلمية / أدوات مساندة مستقلة'}),
          el('span',{className:'workflow-step-id',textContent:index<6?String(index+1).padStart(2,'0'):'REF'})
        ]),
        el('div', {className:'workspace-heading'},[
          el('h1', {className:'workspace-title',dataset:{role:'workspace-title'},textContent:meta.title}),
          el('p', {className:'workspace-description',textContent:meta.subtitle})
        ]),
        renderJourneyProgress(stepId),
        el('div',{className:'workflow-context-chips'},[
          el('span',{className:'workflow-context-chip',textContent:`الوصفة: ${source.label || '—'}`}),
          el('span',{className:'workflow-context-chip',textContent:`القطر: ${fmt(spec.d1,0)} سم`}),
          el('span',{className:'workflow-context-chip',textContent:`الطبقات: ${fmt(spec.layers,0)}`})
        ])
      ]),
      renderCookingBrief(stepId),
      el('div', { className: 'workspace-layout' }, [
        el('div', { className: 'workspace-main' }, mainChildren),
        el('aside', { className: 'workspace-aside' }, asideChildren)
      ])
    ]);
  }

  function renderCurrentWorkspace(session) {
    const activeStep = global.SessionStore?.getActiveStep?.() || 'setup';
    const workspace = activeStep === 'setup'
      ? renderSetupStep(session)
      : activeStep === 'dough-protocol'
        ? renderDoughProtocolStep(session)
        : activeStep === 'baking'
          ? renderBakingStep(session)
          : activeStep === 'filling'
            ? renderFillingStep(session)
          : activeStep === 'assembly'
            ? renderAssemblyStep(session)
            : activeStep === 'review'
              ? renderReviewStep(session)
              : activeStep === 'troubleshooting'
              ? renderToolStep('troubleshooting', 'troubleshooting-reference')
              : activeStep === 'science'
                ? renderToolStep('science', 'science-reference')
                : renderSetupStep(session);
    if (workspace?.dataset) workspace.dataset.workspaceMount = 'true';
    return workspace;
  }

  function renderMobileRail(session) {
    const activeStep = global.SessionStore?.getActiveStep?.() || 'setup';
    return el('nav', { className: 'mobile-rail', dataset: { mobileRailMount: 'true' },
      'aria-label': 'مراحل إعداد الكعكة' }, STEP_ORDER.map((stepId,index) => {
      return el('button', {
        className: 'mobile-stage' + (activeStep === stepId ? ' is-active' : '') + (index>=6?' is-reference':''),
        type: 'button',
        'aria-current': activeStep === stepId ? 'step' : undefined,
        'aria-label': `المرحلة ${index+1}: ${STEP_META[stepId].label}`,
        onclick: function() { navigateToStep(stepId); }
      }, [
        el('span',{className:'mobile-stage-number','aria-hidden':'true',textContent:String(index+1)}),
        el('span',{className:'mobile-stage-label',textContent:SHORT_STEP_LABELS[stepId]})
      ]);
    }));
  }

  function renderSidebar(session) {
    const activeStep = global.SessionStore?.getActiveStep?.() || 'setup';
    const doughSource = getActiveDoughSource(session);
    const fillingSource = getActiveFillingSource(session);
    return el('aside', { className: 'sidebar-shell', dataset: { sidebarMount: 'true' } }, [
      el('div', { className: 'brand-block' }, [
        el('div', { className: 'brand-text' }, [
          el('strong', { textContent: 'MEDOVIK' }),
          el('span', { textContent: 'مطبخ علمي · وصفات قابلة للضبط' })
        ]),
        el('div', { className: 'brand-mark','aria-hidden':'true', textContent: 'M' })
      ]),
      ...STEP_GROUPS.map((group) => el('section', { className: 'sidebar-group' }, [
        el('span', { className: 'sidebar-group-label', textContent: group.label }),
        ...group.steps.map((stepId) => {
          const stepIndex = STEP_ORDER.indexOf(stepId) + 1;
          return el('button', {
            className: 'sidebar-step' + (activeStep === stepId ? ' is-active' : ''),
            type: 'button',
            'aria-current':activeStep===stepId?'step':undefined,
            onclick: function() { navigateToStep(stepId); }
          }, [
            el('span', { className: 'sidebar-step-number', textContent: String(stepIndex) }),
            el('span', { className: 'sidebar-step-label', textContent: STEP_META[stepId].label })
          ]);
        })
      ])),
      el('div', { className: 'sidebar-note' }, [
        el('strong', { textContent: 'لقطة الجلسة' }),
        renderSummaryList([
          { label: 'العجين', value: doughSource.label || '—' },
          { label: 'الحشو', value: fillingSource.label || '—' },
          { label: 'المقاس', value: `${fmt(session?.productSpec?.d1, 0)} سم` }
        ]),
        el('p', { textContent: 'يمكنك الانتقال بين المراحل دون فقد إعدادات الوصفة.' })
      ])
    ]);
  }

  function openDrawer(toolId, title) {
    drawerState = {
      open: true,
      toolId: toolId,
      title: title || TOOL_TITLES[toolId] || 'الأدوات'
    };
    renderApp();
  }

  function closeDrawer() {
    drawerState = {
      open: false,
      toolId: null,
      title: ''
    };
    renderApp();
  }

  function renderHeader(session) {
    return el('header', { className: 'topbar', dataset: { headerMount: 'true' } }, [
      el('div', { className: 'topbar-copy' }, [
        el('span', { className: 'topbar-eyebrow', textContent: 'MEDOVIK / SCIENTIFIC KITCHEN' }),
        el('h2', { className: 'topbar-title', textContent: 'مختبر كيكة العسل' }),
        el('p', {
          className: 'topbar-subtitle',
          textContent: `تصنيع منظم، ومقادير مرتبطة بوصفة قابلة للتتبع`
        })
      ]),
      el('div', { className: 'topbar-actions' }, [
        el('button', {className:'btn btn-secondary view-mode-btn',type:'button',
          'aria-pressed': global.MedovikViewPrefs?.getMode?.()==='advanced'?'true':'false',
          textContent: global.MedovikViewPrefs?.getMode?.()==='advanced' ? 'وضع التنفيذ' : 'عرض متقدم',
          onclick: function(){
            const next=global.MedovikViewPrefs?.getMode?.()==='advanced'?'cook':'advanced';
            global.MedovikViewPrefs?.setMode?.(next);
            renderApp();
          }
        }),
        el('button', {
          className: 'btn btn-secondary',
          type: 'button',
          textContent: 'مقارنة الوصفات',
          onclick: function() {
            openDrawer('recipe-comparison', 'مقارنة الوصفات');
          }
        }),
        el('button', {
          className: 'btn btn-secondary',
          type: 'button',
          textContent: 'الأدوات',
          onclick: function() {
            openDrawer('workflow-tools-hub');
          }
        }),
        el('button', {
          className: 'btn btn-ghost',
          type: 'button',
          textContent: 'جلسة جديدة',
          onclick: function() {
            // Starting a new session is destructive for unsaved state.
            if (typeof window !== 'undefined' && typeof window.confirm === 'function'
                && !window.confirm('بدء جلسة جديدة سيمسح إعدادات الجلسة الحالية غير المحفوظة. هل تريد المتابعة؟')) return;
            drawerState = { open: false, toolId: null, title: '' };
            global.SessionStore?.reset?.();
          }
        })
      ])
    ]);
  }

  function renderDrawerShell() {
    return el('div', { className: 'drawer-shell', dataset: { drawerMount: 'true' } }, [
      el('button', {
        className: 'drawer-overlay' + (drawerState.open ? ' is-open' : ''),
        ariaLabel: 'إغلاق اللوحة الجانبية',
        onclick: function() { closeDrawer(); }
      }),
      el('aside', {
        className: 'drawer-panel' + (drawerState.open ? ' is-open' : ''),
        'aria-hidden': drawerState.open ? 'false' : 'true'
      }, [
        el('div', { className: 'drawer-head' }, [
          el('div', null, [
            el('span', { className: 'drawer-kicker', textContent: 'أدوات مساندة' }),
            el('h3', { className: 'drawer-title', textContent: drawerState.title || 'الأدوات' })
          ]),
          el('button', {
            className: 'btn btn-ghost',
            type: 'button',
            textContent: 'إغلاق',
            onclick: function() { closeDrawer(); }
          })
        ]),
        el('div', { className: 'drawer-body', dataset: { drawerBody: 'true' } })
      ])
    ]);
  }

  function renderShell(session) {
    return el('div', { className: 'app-shell' }, [
      el('a',{className:'skip-link',href:'#main-workspace',textContent:'تجاوز التنقل إلى محتوى المرحلة'}),
      renderSidebar(session),
      el('main', { className: 'app-main', id:'main-workspace',tabindex:'-1' }, [
        renderHeader(session),
        renderMobileRail(session),
        renderTransientNotice(),
        renderKitchenTimersStrip(),
        renderCurrentWorkspace(session),
        renderMobileDock(global.SessionStore?.getActiveStep?.() || 'setup')
      ]),
      renderDrawerShell()
    ]);
  }

  function ensureShell(session) {
    const mount = document.getElementById('app');
    if (!mount) return null;
    let shell = mount.querySelector('.app-shell');
    if (shell) return shell;
    clearNode(mount);
    mount.appendChild(renderShell(session));
    return mount.querySelector('.app-shell');
  }

  function replaceMountedNode(selector, nextNode) {
    if (!nextNode) return;
    const current = document.querySelector(selector);
    if (!current) return;
    current.replaceWith(nextNode);
  }

  function mountDrawerContent() {
    if (!drawerState.open || !drawerState.toolId) return;
    const host = document.querySelector('[data-drawer-body]');
    if (!host || typeof global.ToolRegistry?.open !== 'function') return;
    global.ToolRegistry.open(drawerState.toolId, host, {
      refresh: renderApp,
      close: closeDrawer
    });
  }

  function mountInlineTools() {
    if (typeof global.ToolRegistry?.open !== 'function') return;
    document.querySelectorAll('[data-tool-host]').forEach((node) => {
      const toolId = node.dataset.toolHost;
      global.ToolRegistry.open(toolId, node, {
        refresh: renderApp,
        close: closeDrawer
      });
    });
  }

  function flushRender() {
    const session = getSession();
    const currentStep = global.SessionStore?.getActiveStep?.() || 'setup';
    if (PRODUCTION_STEPS.includes(currentStep)) lastProductionStep=currentStep;
    if (!ensureShell(session)) return;
    const focusApi = global.MedovikFocus || null;
    const focusState = focusApi?.captureFocusState
      ? focusApi.captureFocusState(document.body, document.activeElement)
      : null;
    const winScrollX = typeof window !== 'undefined' ? (window.scrollX || 0) : 0;
    const winScrollY = typeof window !== 'undefined' ? (window.scrollY || 0) : 0;
    const scrollSelectors = ['#main-workspace', '[data-workspace-mount="true"]', '[data-drawer-body]'];
    const savedScrollTops = scrollSelectors.map(function(sel) {
      const node = document.querySelector(sel);
      return node ? { sel: sel, top: node.scrollTop } : null;
    }).filter(Boolean);

    syncTimersFromBench(session?.bench?.timers || global.SessionStore?.getBench?.()?.timers || [], { isInitialLoad: false });

    replaceMountedNode('[data-sidebar-mount="true"]', renderSidebar(session));
    replaceMountedNode('[data-mobile-rail-mount="true"]', renderMobileRail(session));
    replaceMountedNode('[data-header-mount="true"]', renderHeader(session));
    replaceMountedNode('[data-app-notice-mount="true"]', renderTransientNotice());
    replaceMountedNode('[data-timers-mount="true"]', renderKitchenTimersStrip());
    replaceMountedNode('[data-workspace-mount="true"]', renderCurrentWorkspace(session));
    replaceMountedNode('[data-journey-dock-mount="true"]',renderMobileDock(global.SessionStore?.getActiveStep?.() || 'setup'));
    replaceMountedNode('[data-drawer-mount="true"]', renderDrawerShell());
    mountDrawerContent();
    mountInlineTools();

    if (focusState && focusApi?.restoreFocusState) {
      focusApi.restoreFocusState(document.body, focusState);
    }
    savedScrollTops.forEach(function(entry) {
      const node = document.querySelector(entry.sel);
      if (node && typeof entry.top === 'number') {
        node.scrollTop = entry.top;
      }
    });
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo(winScrollX, winScrollY);
    }
  }

  function renderApp() {
    if (renderQueued) return;
    renderQueued = true;
    const schedule = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : function(callback) { return setTimeout(callback, 0); };
    schedule(function() {
      renderQueued = false;
      flushRender();
    });
  }

  function initSubscriptions() {
    if (subscriptionsBound) return;
    subscriptionsBound = true;
    global.SessionStore?.subscribe?.(renderApp);
    global.RecipeLabStore?.subscribe?.(renderApp);
  }

  function initApp() {
    global.SessionStore?.init?.();
    global.RecipeLabStore?.init?.();
    ensureTimerControllers();
    const restoredBench = global.SessionStore?.getBench?.() || { timers: [] };
    syncTimersFromBench(restoredBench.timers, { isInitialLoad: true });
    if (timerRuntime.timers.length > 0 && document.visibilityState === 'visible') {
      timerRuntime.wakeLock.request();
    }
    registerLocalTools();
    initSubscriptions();
    if (!timerRuntime.initialized) {
      timerRuntime.initialized = true;
      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
          tickKitchenTimers({ silent: false });
          if (timerRuntime.timers.length > 0) {
            ensureTimerControllers();
            timerRuntime.wakeLock.request();
          }
        }
      });
    }
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape' && drawerState.open) {
        event.preventDefault();
        closeDrawer();
      }
    });
    flushRender();
  }

  global.App = {
    refreshActiveView: renderApp
  };

  global.MedovikApp = {
    init: initApp,
    render: renderApp,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    finiteNumber: finiteNumber
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})(typeof window !== 'undefined' ? window : globalThis);
