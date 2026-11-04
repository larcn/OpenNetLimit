// =============================================================================
// Medovik v6 — Unified Session Store
// Single Source of Truth. Replaces the AppState / SessionManager duplication.
//
// Responsibilities:
//   1. Session shape + normalization (was split between both)
//   2. localStorage persistence (was AppState only)
//   3. Formula slot management (was split)
//   4. Phase navigation + readiness gates (was SessionManager only)
//   5. Observations / deviations / phase notes (was SessionManager only)
//   6. Sweetness + filling + recipe settings (was split)
//
// Compatibility: exposes a thin AppState compatibility shim so existing
// calculators and tools continue to work during the transition.
// =============================================================================
(function(global) {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────────────

  const STORAGE_KEY = 'medovik_session_v6';
  const LEGACY_STORAGE_KEYS = Object.freeze(['medovik_session_v5', 'medovik_session_v4']);
  const SESSION_SCHEMA_VERSION = 6;
  const PHASE_ORDER = Object.freeze(['setup', 'dough', 'baking', 'filling', 'assembly', 'review']);
  const WORKFLOW_STEPS = Object.freeze([
    'setup',
    'dough-protocol',
    'baking',
    'filling',
    'assembly',
    'review',
    'troubleshooting',
    'science'
  ]);
  const WORKFLOW_STEP_ALIASES = Object.freeze({
    recipe: 'setup',
    dimensions: 'setup',
    ingredients: 'setup',
    'filling-protocol': 'filling',
    maturation: 'assembly',
    finish: 'review',
    comparison: 'setup'
  });
  const PHASE_LABELS = Object.freeze({
    setup: 'إعداد الجلسة',
    dough: 'العجين',
    baking: 'الخبز',
    filling: 'الحشو',
    assembly: 'التجميع',
    review: 'المراجعة'
  });
  const OFFICIAL_FILLING_SCOPE = 'single-filling-v6';
  const SWEETNESS_TARGETS = Object.freeze(['filling', 'dough', 'both']);
  const SWEETNESS_ADJUSTMENT_RANGE = Object.freeze({ min: -40, max: 40 });

  // ── Helpers ────────────────────────────────────────────────────────────────

  function nowId(prefix) {
    return prefix + '_' + Date.now();
  }

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  function safeUserText(value, maxLength) {
    var text = String(value == null ? '' : value).slice(0, maxLength || 20000);
    return text.replace(/</g, '‹').replace(/>/g, '›');
  }

  function safeTextMap(value) {
    var source = value && typeof value === 'object' ? value : {};
    var out = {};
    Object.keys(source).forEach(function(key) { out[key] = safeUserText(source[key]); });
    return out;
  }

  function normalizeSweetnessTarget(value) {
    var raw = String(value || '').trim();
    return SWEETNESS_TARGETS.includes(raw) ? raw : 'filling';
  }

  function clampSweetnessAdjustmentPct(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return clamp(n, SWEETNESS_ADJUSTMENT_RANGE.min, SWEETNESS_ADJUSTMENT_RANGE.max);
  }

  function normalizeWorkflowStep(value) {
    var raw = String(value || '').trim();
    if (WORKFLOW_STEP_ALIASES[raw]) return WORKFLOW_STEP_ALIASES[raw];
    return WORKFLOW_STEPS.indexOf(raw) !== -1 ? raw : 'setup';
  }

  function normalizeSingleFillingEntries(entries, defaultId) {
    var fallbackId = (global.DEFAULT_FILLING_ID || defaultId || 'classic_sourcream_frosting');
    var source = Array.isArray(entries) && entries.length ? entries[0] : null;
    return [{
      fillingId: (typeof global.resolveFillingId === 'function' ? global.resolveFillingId(source && source.fillingId) : (source && source.fillingId)) || fallbackId,
      gaps: 'all',
      sweetnessAdjustmentPct: clampSweetnessAdjustmentPct(source && source.sweetnessAdjustmentPct)
    }];
  }

  // ── Default product spec ───────────────────────────────────────────────────

  var DEFAULT_PRODUCT_SPEC = Object.freeze({
    shape: 'round',
    d1: 20,
    d2: 30,
    layers: 8,
    rawSheetThicknessMm: 1.5,
    targetBakedLayerThicknessMm: 2,
    estimatedBakedLayerThicknessMm: 2,
    fillingThicknessMm: 3,
    includeOuterCoat: true,
    topCoatThicknessMm: 2,
    sideCoatThicknessMm: 2,
    wastePct: 10,
    scaleMode: 'volume',
    ballWeight: 140,
    targetFlourWeight: 500
  });

  var DEFAULT_BATCH_CONFIG = Object.freeze(Object.assign({}, DEFAULT_PRODUCT_SPEC));

  // ── Formula slot ───────────────────────────────────────────────────────────

  function createFormulaSlot() {
    return {
      seed: null,
      live: null,
      version: 0,
      sourceSeed: null,
      mutations: [],
      lastPolicyPass: null,
      lastMutationAt: null
    };
  }

  function normalizeFormulaSlot(slot) {
    var base = createFormulaSlot();
    var inc = slot && typeof slot === 'object' ? slot : {};
    return {
      seed: inc.seed || null,
      live: inc.live || null,
      version: Number.isFinite(Number(inc.version)) ? Number(inc.version) : 0,
      sourceSeed: inc.sourceSeed || null,
      mutations: Array.isArray(inc.mutations) ? inc.mutations.map(function(m) { return Object.assign({}, m); }) : [],
      lastPolicyPass: inc.lastPolicyPass && typeof inc.lastPolicyPass === 'object' ? Object.assign({}, inc.lastPolicyPass) : null,
      lastMutationAt: inc.lastMutationAt || null
    };
  }

  // ── Session shape ──────────────────────────────────────────────────────────

  function createBlankSession() {
    return {
      schemaVersion: SESSION_SCHEMA_VERSION,
      id: nowId('session'),
      createdAt: new Date().toISOString(),
      productSpec: Object.assign({}, DEFAULT_PRODUCT_SPEC),
      recipeSelection: {
        mode: 'stored',
        selectedRecipeId: 'ayaHabib',
        customKind: 'dough',
        customDraftId: null
      },
      doughSystem: { recipeId: 'ayaHabib' },
      fillingPlan: {
        scope: OFFICIAL_FILLING_SCOPE,
        mode: 'reference',
        entries: [{ fillingId: (global.DEFAULT_FILLING_ID || 'classic_sourcream_frosting'), gaps: 'all', sweetnessAdjustmentPct: 0 }],
        customDraft: '',
        customRecipeId: null
      },
      sweetnessPlan: { adjustmentPct: 0, target: 'filling' },
      formulaState: {
        dough: createFormulaSlot(),
        filling: createFormulaSlot()
      },
      execution: {
        currentPhase: 'setup',
        currentProtocolStepId: null,
        completedPhases: [],
        completedStepIds: [],
        stepData: {},
        phaseNotes: {},
        observations: [],
        deviations: [],
        bakeLoop: { bakedLayers: 0, averageMinutes: '' },
        notes: ''
      },
      ui: {
        activeStep: 'setup',
        lastVisitedStep: 'setup',
        scienceTopicId: 'science:dough-base-heat',
        troubleshootingTopicId: 'trouble:dough-base-overheat'
      },
      compiledRunbook: null,
      review: null
    };
  }

  function normalizeSession(incoming) {
    var base = createBlankSession();
    var s = incoming && typeof incoming === 'object' ? incoming : {};
    var normalizedSpecResult = typeof global.normalizeProductSpec === 'function'
      ? global.normalizeProductSpec(Object.assign({}, s.productSpec || {}))
      : { value: Object.assign({}, base.productSpec, s.productSpec || {}), warnings: [] };

    return {
      schemaVersion: SESSION_SCHEMA_VERSION,
      id: s.id || base.id,
      createdAt: s.createdAt || base.createdAt,
      productSpec: normalizedSpecResult.value,
      recipeSelection: {
        mode: ((s.recipeSelection && s.recipeSelection.mode) === 'custom') ? 'custom' : 'stored',
        selectedRecipeId: (s.recipeSelection && s.recipeSelection.selectedRecipeId) || (s.doughSystem && s.doughSystem.recipeId) || base.recipeSelection.selectedRecipeId,
        customKind: ((s.recipeSelection && s.recipeSelection.customKind) === 'filling') ? 'filling' : 'dough',
        customDraftId: (s.recipeSelection && s.recipeSelection.customDraftId) || null
      },
      doughSystem: Object.assign({}, base.doughSystem, s.doughSystem || {}),
      fillingPlan: {
        scope: OFFICIAL_FILLING_SCOPE,
        mode: (s.fillingPlan && s.fillingPlan.mode) || 'reference',
        entries: normalizeSingleFillingEntries(
          (s.fillingPlan && s.fillingPlan.entries) || (s.entries ? [s.entries] : []),
          global.DEFAULT_FILLING_ID
        ),
        customDraft: safeUserText((s.fillingPlan && s.fillingPlan.customDraft) || (s.customDraft) || ''),
        customRecipeId: (s.fillingPlan && s.fillingPlan.customRecipeId) || null
      },
      sweetnessPlan: {
        adjustmentPct: Number.isFinite(Number(s.sweetnessPlan && s.sweetnessPlan.adjustmentPct))
          ? clampSweetnessAdjustmentPct(s.sweetnessPlan.adjustmentPct)
          : (Number.isFinite(Number(s.fillingPlan && s.fillingPlan.entries && s.fillingPlan.entries[0] && s.fillingPlan.entries[0].sweetnessAdjustmentPct))
              ? clampSweetnessAdjustmentPct(s.fillingPlan.entries[0].sweetnessAdjustmentPct)
              : 0),
        target: normalizeSweetnessTarget((s.sweetnessPlan && s.sweetnessPlan.target) || 'filling')
      },
      formulaState: {
        dough: normalizeFormulaSlot((s.formulaState && s.formulaState.dough) || createFormulaSlot()),
        filling: normalizeFormulaSlot((s.formulaState && s.formulaState.filling) || createFormulaSlot())
      },
      execution: {
        currentPhase: PHASE_ORDER.includes(s.execution && s.execution.currentPhase) ? s.execution.currentPhase :
                      PHASE_ORDER.includes(s.currentPhase) ? s.currentPhase : 'setup',
        currentProtocolStepId: (s.execution && s.execution.currentProtocolStepId) || null,
        completedPhases: Array.isArray(s.execution && s.execution.completedPhases) ? s.execution.completedPhases.slice() : [],
        completedStepIds: Array.isArray(s.execution && s.execution.completedStepIds) ? s.execution.completedStepIds.slice() : [],
        stepData: Object.assign({}, (s.execution && s.execution.stepData) || {}),
        phaseNotes: safeTextMap((s.execution && s.execution.phaseNotes) || {}),
        observations: Array.isArray(s.execution && s.execution.observations) ? s.execution.observations.map(function(o) { return Object.assign({}, o, { text: safeUserText(o && o.text) }); }) : [],
        deviations: Array.isArray(s.execution && s.execution.deviations) ? s.execution.deviations.map(function(d) { return Object.assign({}, d, { text: safeUserText(d && d.text) }); }) : [],
        bakeLoop: Object.assign({}, base.execution.bakeLoop, (s.execution && s.execution.bakeLoop) || {}),
        notes: safeUserText((s.execution && s.execution.notes) || '')
      },
      ui: {
        activeStep: normalizeWorkflowStep((s.ui && s.ui.activeStep) || (s.activeStep) || 'setup'),
        lastVisitedStep: normalizeWorkflowStep((s.ui && s.ui.lastVisitedStep) || (s.ui && s.ui.activeStep) || (s.activeStep) || 'setup'),
        scienceTopicId: (s.ui && s.ui.scienceTopicId) || base.ui.scienceTopicId,
        troubleshootingTopicId: (s.ui && s.ui.troubleshootingTopicId) || base.ui.troubleshootingTopicId
      },
      compiledRunbook: s.compiledRunbook || null,
      review: s.review && typeof s.review === 'object' ? { reviews: Array.isArray(s.review.reviews) ? s.review.reviews.map(function(r) { return Object.assign({}, r, { name: safeUserText(r && r.name, 500), notes: safeUserText(r && r.notes) }); }) : [] } : null,
      migrationWarnings: Array.isArray(s.migrationWarnings) ? s.migrationWarnings.slice() : (normalizedSpecResult.warnings || [])
    };
  }

  // ── Formula snapshot / restore helpers ─────────────────────────────────────

  function snapshotFormula(formula) {
    if (!formula || typeof formula.toSnapshot !== 'function') return null;
    var snap = formula.toSnapshot();
    if (!snap || typeof snap !== 'object') return null;
    var items = Array.isArray(snap.items)
      ? snap.items.filter(function(i) { return i && i.ingredientId; }).map(function(i) {
          return { ingredientId: String(i.ingredientId).trim(), weight: Number(i.weight) || 0 };
        })
      : [];
    return {
      items: items,
      meta: (snap.meta && typeof snap.meta === 'object') ? Object.assign({}, snap.meta) : {}
    };
  }

  function restoreFormula(snapshot) {
    if (!snapshot || typeof global.Formula !== 'function') return null;
    // Handle both Formula constructor and Formula.fromSnapshot static method
    if (typeof global.Formula.fromSnapshot === 'function') {
      try { return global.Formula.fromSnapshot(snapshot); } catch(e) { /* fall through */ }
    }
    // Fallback: create from items directly
    if (snapshot.items && Array.isArray(snapshot.items)) {
      try { return new global.Formula(snapshot.items, snapshot.meta || {}); } catch(e) { return null; }
    }
    return null;
  }

  function getRecipeLabRecord(recordId) {
    try {
      return global.RecipeLabStore?.getRecord?.(recordId) || null;
    } catch (_) {
      return null;
    }
  }

  function getRecipeLabDraft(kind) {
    try {
      return global.RecipeLabStore?.getDraft?.(kind) || null;
    } catch (_) {
      return null;
    }
  }

  function buildDraftProfile(kind, draft) {
    if (!draft || !Array.isArray(draft.items) || !draft.items.length) return null;
    return {
      id: 'draft:' + kind,
      kind: kind,
      origin: 'draft',
      readOnly: false,
      name: draft.name || (kind === 'filling' ? 'Custom Filling Draft' : 'Custom Dough Draft'),
      description: draft.description || '',
      rating: Number(draft.rating) || 0,
      notes: draft.notes || '',
      sourceId: draft.sourceId || null,
      formulaSnapshot: {
        items: draft.items.map(function(item) {
          return {
            ingredientId: String(item && item.ingredientId || '').trim(),
            weight: Number(item && item.weight) || 0
          };
        }).filter(function(item) { return item.ingredientId; }),
        meta: {}
      }
    };
  }

  function resolveSessionInput(sessionOverride) {
    return (sessionOverride && typeof sessionOverride === 'object') ? sessionOverride : _session;
  }

  function getRecipeProfileById(recipeId) {
    return (global.MEDOVIK_RECIPE_PROFILES && global.MEDOVIK_RECIPE_PROFILES[recipeId]) || null;
  }

  function getFillingProfileById(fillingId) {
    var canonical = (typeof global.resolveFillingId === 'function') ? global.resolveFillingId(fillingId) : fillingId;
    if (typeof global.getFillingRecord === 'function') {
      var record = global.getFillingRecord(canonical);
      if (record) return record;
    }
    return global.FILLING_CATALOG ? (global.FILLING_CATALOG[canonical] || null) : null;
  }

  function resolveProductSpecFromSession(sessionOverride) {
    var active = resolveSessionInput(sessionOverride) || {};
    var combined = Object.assign({}, DEFAULT_PRODUCT_SPEC, active.productSpec || {});
    return typeof global.normalizeProductSpec === 'function' ? global.normalizeProductSpec(combined).value : combined;
  }

  function resolveSweetnessSettingsFromSession(sessionOverride) {
    var active = resolveSessionInput(sessionOverride) || {};
    var sweetnessPlan = active.sweetnessPlan || {};
    var fillingPlan = active.fillingPlan || {};
    var firstEntry = Array.isArray(fillingPlan.entries) && fillingPlan.entries.length ? fillingPlan.entries[0] : null;
    var rawPct = Number(sweetnessPlan.adjustmentPct);
    if (!Number.isFinite(rawPct)) rawPct = Number(firstEntry && firstEntry.sweetnessAdjustmentPct);
    return {
      adjustmentPct: clampSweetnessAdjustmentPct(Number.isFinite(rawPct) ? rawPct : 0),
      target: normalizeSweetnessTarget(sweetnessPlan.target || 'filling')
    };
  }

  function resolveActiveRecipeProfileFromSession(sessionOverride) {
    var active = resolveSessionInput(sessionOverride) || createBlankSession();
    var selection = active.recipeSelection || {};
    if (selection.mode === 'custom') {
      return buildDraftProfile('dough', getRecipeLabDraft('dough'))
        || getRecipeProfileById((active.doughSystem && active.doughSystem.recipeId) || selection.selectedRecipeId || 'ayaHabib');
    }
    var selectedId = selection.selectedRecipeId || (active.doughSystem && active.doughSystem.recipeId) || 'ayaHabib';
    var selectedRecord = selectedId ? getRecipeLabRecord(selectedId) : null;
    if (selectedRecord && selectedRecord.kind === 'dough') return selectedRecord;
    return getRecipeProfileById(selectedId);
  }

  function resolveActiveFillingProfileFromSession(sessionOverride) {
    var active = resolveSessionInput(sessionOverride) || createBlankSession();
    var fillingPlan = active.fillingPlan || {};
    if (fillingPlan.mode === 'custom') {
      var customRecordId = fillingPlan.customRecipeId || null;
      var customRecord = customRecordId ? getRecipeLabRecord(customRecordId) : null;
      if (customRecord && customRecord.kind === 'filling') return customRecord;
      return buildDraftProfile('filling', getRecipeLabDraft('filling'))
        || getFillingProfileById((Array.isArray(fillingPlan.entries) && fillingPlan.entries[0] && fillingPlan.entries[0].fillingId) || global.DEFAULT_FILLING_ID || 'classic_sourcream_frosting');
    }
    var fillingId = (Array.isArray(fillingPlan.entries) && fillingPlan.entries[0] && fillingPlan.entries[0].fillingId)
      || global.DEFAULT_FILLING_ID
      || 'classic_sourcream_frosting';
    return getFillingProfileById(fillingId);
  }

  // ── Storage ────────────────────────────────────────────────────────────────

  function getStorage() {
    try {
      return (typeof localStorage !== 'undefined') ? localStorage : null;
    } catch(_) { return null; }
  }

  // ── Session Store (Single Source of Truth) ─────────────────────────────────

  var _session = null;
  var _listeners = [];
  var _runbookCacheKey = null;
  var _runbookCacheValue = null;

  var _lastPersistStatus = { ok: true, at: null, error: null };

  function loadSession() {
    var store = getStorage();
    if (!store) return null;
    try {
      var raw = store.getItem(STORAGE_KEY);
      var keyUsed = STORAGE_KEY;
      if (!raw) {
        for (var i = 0; i < LEGACY_STORAGE_KEYS.length; i++) {
          raw = store.getItem(LEGACY_STORAGE_KEYS[i]);
          if (raw) { keyUsed = LEGACY_STORAGE_KEYS[i]; break; }
        }
      }
      if (!raw) return null;
      var normalized = normalizeSession(JSON.parse(raw));
      if (keyUsed !== STORAGE_KEY) {
        normalized.migrationWarnings = (normalized.migrationWarnings || []).concat(['تم ترحيل الجلسة من إصدار أقدم.']);
        persistSession(normalized);
      }
      return normalized;
    } catch(e) {
      console.warn('SessionStore: failed to load from storage', e);
      return null;
    }
  }

  function persistSession(session) {
    var store = getStorage();
    if (!store) {
      _lastPersistStatus = { ok: false, at: new Date().toISOString(), error: 'التخزين المحلي غير متاح.' };
      return _lastPersistStatus;
    }
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(session));
      _lastPersistStatus = { ok: true, at: new Date().toISOString(), error: null };
    } catch(e) {
      _lastPersistStatus = { ok: false, at: new Date().toISOString(), error: String(e && e.message || e) };
      console.warn('SessionStore: failed to persist', e);
    }
    return _lastPersistStatus;
  }

  function notifyListeners() {
    for (var i = 0; i < _listeners.length; i++) {
      try { _listeners[i](_session); } catch(e) { /* ignore listener errors */ }
    }
  }

  // ── Compile runbook on save (same behavior as old SessionManager.save) ────

  function compileRunbookQuiet(session) {
    // Keep save side effects cycle-safe, but always invalidate cached output.
    invalidateRunbookCache(session);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  function invalidateRunbookCache(session) {
    _runbookCacheKey = null;
    _runbookCacheValue = null;
    if (session && typeof session === 'object') {
      session.compiledRunbook = null;
    }
  }

  function summarizeFormulaSlot(slot) {
    var source = slot && typeof slot === 'object' ? slot : {};
    var live = source.live && Array.isArray(source.live.items) ? source.live.items : [];
    var seed = source.seed && Array.isArray(source.seed.items) ? source.seed.items : [];
    return {
      sourceSeed: source.sourceSeed || null,
      version: Number.isFinite(Number(source.version)) ? Number(source.version) : 0,
      liveCount: live.length,
      seedCount: seed.length,
      liveTotal: live.reduce(function(sum, item) { return sum + (Number(item && item.weight) || 0); }, 0),
      seedTotal: seed.reduce(function(sum, item) { return sum + (Number(item && item.weight) || 0); }, 0)
    };
  }

  function summarizeRecipeLabProfile(profile) {
    if (!profile || typeof profile !== 'object') return null;
    var snapshot = profile.formulaSnapshot || {};
    var items = Array.isArray(snapshot.items) ? snapshot.items : [];
    return {
      id: profile.id || null,
      origin: profile.origin || null,
      updatedAt: profile.updatedAt || null,
      itemCount: items.length,
      totalMass: items.reduce(function(sum, item) { return sum + (Number(item && item.weight) || 0); }, 0)
    };
  }

  function buildRunbookCacheKey(session) {
    var active = session && typeof session === 'object' ? session : _session;
    if (!active) return null;
    var recipeSelection = active.recipeSelection || {};
    var fillingPlan = active.fillingPlan || {};
    var doughProfile = null;
    var fillingProfile = null;
    if (recipeSelection.mode === 'custom') {
      doughProfile = summarizeRecipeLabProfile(buildDraftProfile('dough', getRecipeLabDraft('dough')));
    } else if (recipeSelection.selectedRecipeId) {
      doughProfile = summarizeRecipeLabProfile(getRecipeLabRecord(recipeSelection.selectedRecipeId));
    }
    if (fillingPlan.mode === 'custom') {
      fillingProfile = summarizeRecipeLabProfile(
        fillingPlan.customRecipeId
          ? getRecipeLabRecord(fillingPlan.customRecipeId)
          : buildDraftProfile('filling', getRecipeLabDraft('filling'))
      );
    }
    return JSON.stringify({
      id: active.id || null,
      productSpec: active.productSpec || null,
      doughSystem: active.doughSystem || null,
      recipeSelection: recipeSelection,
      fillingPlan: {
        mode: fillingPlan.mode || 'reference',
        scope: fillingPlan.scope || OFFICIAL_FILLING_SCOPE,
        entries: Array.isArray(fillingPlan.entries) ? fillingPlan.entries : [],
        customRecipeId: fillingPlan.customRecipeId || null
      },
      sweetnessPlan: active.sweetnessPlan || null,
      formulaState: {
        dough: summarizeFormulaSlot(active.formulaState && active.formulaState.dough),
        filling: summarizeFormulaSlot(active.formulaState && active.formulaState.filling)
      },
      recipeLab: {
        dough: doughProfile,
        filling: fillingProfile
      }
    });
  }

  function cloneRunbook(runbook) {
    return runbook ? clone(runbook) : null;
  }

  function getCompiledRunbook(session) {
    var active = session && typeof session === 'object' ? session : _session;
    if (!active) return null;
    var cacheKey = buildRunbookCacheKey(active);
    if (cacheKey && _runbookCacheKey === cacheKey && _runbookCacheValue) {
      return cloneRunbook(_runbookCacheValue);
    }
    if (active.compiledRunbook && active.compiledRunbook.phases && active.compiledRunbook.phases.length && cacheKey) {
      _runbookCacheKey = cacheKey;
      _runbookCacheValue = cloneRunbook(active.compiledRunbook);
      return cloneRunbook(active.compiledRunbook);
    }
    if (typeof global.RunbookCompiler !== 'undefined' && typeof global.RunbookCompiler.compile === 'function') {
      try {
        var compiled = global.RunbookCompiler.compile(active);
        if (compiled && compiled.phases && compiled.phases.length) {
          active.compiledRunbook = cloneRunbook(compiled);
          if (cacheKey) {
            _runbookCacheKey = cacheKey;
            _runbookCacheValue = cloneRunbook(compiled);
          }
          return cloneRunbook(compiled);
        }
      } catch (error) {
        console.warn('SessionStore: failed to compile runbook on demand', error);
      }
    }
    return active.compiledRunbook && active.compiledRunbook.phases && active.compiledRunbook.phases.length
      ? cloneRunbook(active.compiledRunbook)
      : null;
  }

  var SessionStore = {

    PHASE_ORDER: PHASE_ORDER,
    PHASE_LABELS: PHASE_LABELS,
    WORKFLOW_STEPS: WORKFLOW_STEPS,
    FILLING_SCOPE: OFFICIAL_FILLING_SCOPE,

    /** Initialize or return current session */
    init: function() {
      if (_session) return _session;
      _session = normalizeSession(loadSession() || createBlankSession());
      return _session;
    },

    /** Get a clone of the current session */
    get: function() {
      if (!_session) this.init();
      return clone(_session);
    },

    /** Replace the entire session and persist */
    set: function(session) {
      _session = normalizeSession(session);
      compileRunbookQuiet(_session);
      persistSession(_session);
      notifyListeners();
      return clone(_session);
    },

    /** Reset to a blank session and persist */
    reset: function() {
      _session = createBlankSession();
      compileRunbookQuiet(_session);
      persistSession(_session);
      notifyListeners();
      return clone(_session);
    },

    /** Save current session (compiles runbook, persists, notifies) */
    save: function() {
      if (!_session) this.init();
      compileRunbookQuiet(_session);
      persistSession(_session);
      notifyListeners();
      return clone(_session);
    },

    getLastPersistStatus: function() { return Object.assign({}, _lastPersistStatus); },

    /** Subscribe to session changes */
    onChange: function(fn) {
      if (typeof fn === 'function') _listeners.push(fn);
    },

    subscribe: function(fn) {
      if (typeof fn === 'function') _listeners.push(fn);
      return function() {
        _listeners = _listeners.filter(function(entry) { return entry !== fn; });
      };
    },

    getActiveStep: function() {
      if (!_session) this.init();
      return normalizeWorkflowStep(_session.ui && _session.ui.activeStep);
    },

    setActiveStep: function(stepId) {
      if (!_session) this.init();
      var normalized = normalizeWorkflowStep(stepId);
      if (!_session.ui) _session.ui = { activeStep: 'setup', lastVisitedStep: 'setup' };
      _session.ui.activeStep = normalized;
      _session.ui.lastVisitedStep = normalized;
      if (normalized === 'setup') {
        _session.execution.currentPhase = 'setup';
      } else if (normalized === 'dough-protocol') {
        _session.execution.currentPhase = 'dough';
      } else if (normalized === 'baking') {
        _session.execution.currentPhase = 'baking';
      } else if (normalized === 'filling') {
        _session.execution.currentPhase = 'filling';
      } else if (normalized === 'assembly') {
        _session.execution.currentPhase = 'assembly';
      } else if (normalized === 'review') {
        _session.execution.currentPhase = 'review';
      }
      this.save();
    },

    // ── Product spec ───────────────────────────────────────────────────────

    getProductSpec: function() {
      if (!_session) this.init();
      return resolveProductSpecFromSession(_session);
    },

    updateProductSpec: function(spec) {
      if (!_session) this.init();
      var merged = Object.assign({}, _session.productSpec, spec || {});
      var result = typeof global.normalizeProductSpec === 'function' ? global.normalizeProductSpec(merged) : { value: merged };
      _session.productSpec = result.value;
      this.save();
      return Object.assign({}, _session.productSpec);
    },

    // ── Recipe ─────────────────────────────────────────────────────────────

    getRecipeId: function() {
      if (!_session) this.init();
      return _session.doughSystem.recipeId;
    },

    getRecipeSelection: function() {
      if (!_session) this.init();
      return Object.assign({}, _session.recipeSelection || {});
    },

    updateRecipeSelection: function(selection) {
      if (!_session) this.init();
      _session.recipeSelection = Object.assign({}, _session.recipeSelection || {}, selection || {});
      _session.recipeSelection.mode = _session.recipeSelection.mode === 'custom' ? 'custom' : 'stored';
      _session.recipeSelection.customKind = _session.recipeSelection.customKind === 'filling' ? 'filling' : 'dough';
      this.save();
      return this.getRecipeSelection();
    },

    getRecipeProfile: function() {
      var id = this.getRecipeId();
      return getRecipeProfileById(id);
    },

    getActiveRecipeProfile: function() {
      if (!_session) this.init();
      return resolveActiveRecipeProfileFromSession(_session);
    },

    setRecipe: function(recipeId) {
      if (!_session) this.init();
      if (global.MEDOVIK_RECIPE_PROFILES && global.MEDOVIK_RECIPE_PROFILES[recipeId]) {
        _session.doughSystem.recipeId = recipeId;
        _session.recipeSelection = Object.assign({}, _session.recipeSelection || {}, {
          mode: 'stored',
          selectedRecipeId: recipeId
        });
        this.save();
      }
    },

    // ── Filling ────────────────────────────────────────────────────────────

    getFillingId: function() {
      if (!_session) this.init();
      var entries = _session.fillingPlan.entries;
      return (entries && entries[0] && entries[0].fillingId) || (global.DEFAULT_FILLING_ID || 'classic_sourcream_frosting');
    },

    getFillingRecord: function() {
      var id = this.getFillingId();
      return getFillingProfileById(id);
    },

    getActiveFillingProfile: function() {
      if (!_session) this.init();
      return resolveActiveFillingProfileFromSession(_session);
    },

    setFilling: function(fillingId) {
      if (!_session) this.init();
      var canonical = (typeof global.resolveFillingId === 'function') ? global.resolveFillingId(fillingId) : fillingId;
      _session.fillingPlan.scope = OFFICIAL_FILLING_SCOPE;
      _session.fillingPlan.mode = 'reference';
      _session.fillingPlan.entries = normalizeSingleFillingEntries(
        [{ fillingId: canonical, gaps: 'all', sweetnessAdjustmentPct: this.getSweetnessAdjustmentPct() }],
        global.DEFAULT_FILLING_ID
      );
      this.save();
    },

    getFillingMode: function() {
      if (!_session) this.init();
      return _session.fillingPlan.mode || 'reference';
    },

    setFillingMode: function(mode) {
      if (!_session) this.init();
      _session.fillingPlan.mode = (mode === 'custom') ? 'custom' : 'reference';
      _session.fillingPlan.scope = OFFICIAL_FILLING_SCOPE;
      this.save();
    },

    getCustomDraft: function() {
      if (!_session) this.init();
      return _session.fillingPlan.customDraft || '';
    },

    setCustomDraft: function(text) {
      if (!_session) this.init();
      _session.fillingPlan.customDraft = safeUserText(text);
      this.save();
    },

    getCustomFillingRecipeId: function() {
      if (!_session) this.init();
      return _session.fillingPlan.customRecipeId || null;
    },

    setCustomFillingRecipeId: function(recipeId) {
      if (!_session) this.init();
      _session.fillingPlan.customRecipeId = recipeId || null;
      if (recipeId) _session.fillingPlan.mode = 'custom';
      this.save();
    },

    // ── Sweetness ──────────────────────────────────────────────────────────

    getSweetnessAdjustmentPct: function() {
      if (!_session) this.init();
      return Number(_session.sweetnessPlan.adjustmentPct) || 0;
    },

    setSweetnessAdjustmentPct: function(value) {
      if (!_session) this.init();
      var safe = clampSweetnessAdjustmentPct(value);
      _session.sweetnessPlan.adjustmentPct = safe;
      _session.fillingPlan.entries = normalizeSingleFillingEntries(
        [{ fillingId: this.getFillingId(), gaps: 'all', sweetnessAdjustmentPct: safe }],
        global.DEFAULT_FILLING_ID
      );
      this.save();
    },

    getSweetnessTarget: function() {
      if (!_session) this.init();
      return normalizeSweetnessTarget(_session.sweetnessPlan.target);
    },

    setSweetnessTarget: function(target) {
      if (!_session) this.init();
      _session.sweetnessPlan.target = normalizeSweetnessTarget(target);
      this.save();
    },

    resolveProductSpec: function(sessionOverride) {
      if (!_session && !sessionOverride) this.init();
      return resolveProductSpecFromSession(sessionOverride);
    },

    resolveSweetnessSettings: function(sessionOverride) {
      if (!_session && !sessionOverride) this.init();
      return resolveSweetnessSettingsFromSession(sessionOverride);
    },

    resolveActiveRecipeProfile: function(sessionOverride) {
      if (!_session && !sessionOverride) this.init();
      return resolveActiveRecipeProfileFromSession(sessionOverride);
    },

    resolveActiveFillingProfile: function(sessionOverride) {
      if (!_session && !sessionOverride) this.init();
      return resolveActiveFillingProfileFromSession(sessionOverride);
    },

    getScienceTopicId: function() {
      if (!_session) this.init();
      return _session?.ui?.scienceTopicId || 'science:dough-base-heat';
    },

    setScienceTopicId: function(topicId) {
      if (!_session) this.init();
      _session.ui.scienceTopicId = String(topicId || 'science:dough-base-heat');
      this.save();
      return _session.ui.scienceTopicId;
    },

    getTroubleshootingTopicId: function() {
      if (!_session) this.init();
      return _session?.ui?.troubleshootingTopicId || 'trouble:dough-base-overheat';
    },

    setTroubleshootingTopicId: function(topicId) {
      if (!_session) this.init();
      _session.ui.troubleshootingTopicId = String(topicId || 'trouble:dough-base-overheat');
      this.save();
      return _session.ui.troubleshootingTopicId;
    },

    getReferenceTopic: function() {
      return this.getScienceTopicId();
    },

    setReferenceTopic: function(topic) {
      return this.setScienceTopicId(topic);
    },

    setCalculatedBatch: function(batch) {
      this._calculatedBatch = batch || null;
      return this._calculatedBatch;
    },

    getCalculatedBatch: function() {
      return this._calculatedBatch || null;
    },

    // ── Formula slots ──────────────────────────────────────────────────────

    _getFormulaSlot: function(kind) {
      if (!_session) this.init();
      if (kind !== 'dough' && kind !== 'filling') return null;
      if (!_session.formulaState) {
        _session.formulaState = { dough: createFormulaSlot(), filling: createFormulaSlot() };
      }
      if (!_session.formulaState[kind]) {
        _session.formulaState[kind] = createFormulaSlot();
      }
      return _session.formulaState[kind];
    },

    seedFormula: function(kind, formula, sourceSeed, options) {
      var slot = this._getFormulaSlot(kind);
      if (!slot) return null;
      var snap = snapshotFormula(formula);
      if (!snap) return null;
      var replaceLive = !options || options.replaceLive !== false || !slot.live;
      slot.seed = snap;
      slot.sourceSeed = sourceSeed || slot.sourceSeed || null;
      if (replaceLive) {
        slot.live = snap;
        slot.version = (options && options.preserveVersion) ? slot.version : 0;
        slot.mutations = [];
        slot.lastMutationAt = null;
      }
      this.save();
      return restoreFormula(slot.live || slot.seed);
    },

    updateLiveFormula: function(kind, formula, mutation) {
      var slot = this._getFormulaSlot(kind);
      if (!slot) return null;
      var snap = snapshotFormula(formula);
      if (!snap) return null;
      slot.live = snap;
      slot.version = (Number.isFinite(Number(slot.version)) ? Number(slot.version) : 0) + 1;
      slot.lastMutationAt = new Date().toISOString();
      var mut = mutation || {};
      var rec = {
        id: kind + '_mutation_' + Date.now(),
        kind: kind,
        type: mut.type || 'manual-edit',
        at: new Date().toISOString(),
        source: mut.source || 'ui',
        summary: mut.summary || '',
        reason: mut.reason || ''
      };
      slot.mutations = [rec].concat(slot.mutations || []).slice(0, 25);
      this.save();
      return restoreFormula(slot.live);
    },

    resetFormulaToSeed: function(kind) {
      var slot = this._getFormulaSlot(kind);
      if (!slot || !slot.seed) return null;
      slot.live = clone(slot.seed);
      slot.version = 0;
      slot.mutations = [{
        id: kind + '_reset_' + Date.now(),
        kind: kind,
        type: 'reset',
        at: new Date().toISOString(),
        source: 'ui',
        reason: 'reset-to-seed'
      }];
      slot.lastMutationAt = new Date().toISOString();
      this.save();
      return restoreFormula(slot.live);
    },

    getLiveFormula: function(kind) {
      var slot = this._getFormulaSlot(kind);
      if (!slot) return null;
      return restoreFormula(slot.live || slot.seed);
    },

    getSeedFormula: function(kind) {
      var slot = this._getFormulaSlot(kind);
      if (!slot) return null;
      return restoreFormula(slot.seed);
    },

    getActiveFormula: function(kind, selection) {
      if (!_session) this.init();
      var slot = this._getFormulaSlot(kind);
      if (!slot) return null;

      if (kind === 'dough') {
        var recipeSelection = _session.recipeSelection || {};
        if (recipeSelection.mode === 'custom') {
          var draftProfile = buildDraftProfile('dough', getRecipeLabDraft('dough'));
          return restoreFormula(draftProfile && draftProfile.formulaSnapshot);
        }
        var activeProfile = this.getActiveRecipeProfile();
        if (activeProfile && activeProfile.origin === 'custom' && activeProfile.formulaSnapshot) {
          var doughSourceSeed = 'dough:' + activeProfile.id;
          if (slot.seed && slot.live && slot.sourceSeed === doughSourceSeed) {
            return restoreFormula(slot.live);
          }
          var customDoughFormula = restoreFormula(activeProfile.formulaSnapshot);
          if (customDoughFormula) {
            return this.seedFormula('dough', customDoughFormula, doughSourceSeed, { replaceLive: true });
          }
        }
      }

      if (kind === 'filling') {
        if ((_session.fillingPlan && _session.fillingPlan.mode) === 'custom') {
          var activeFilling = this.getActiveFillingProfile();
          if (activeFilling && activeFilling.origin === 'draft') {
            return restoreFormula(activeFilling.formulaSnapshot);
          }
          if (activeFilling && activeFilling.formulaSnapshot) {
            var fillingSourceSeed = 'filling:' + activeFilling.id;
            if (slot.seed && slot.live && slot.sourceSeed === fillingSourceSeed) {
              return restoreFormula(slot.live);
            }
            var customFillingFormula = restoreFormula(activeFilling.formulaSnapshot);
            if (customFillingFormula) {
              return this.seedFormula('filling', customFillingFormula, fillingSourceSeed, { replaceLive: true });
            }
          }
        }
      }

      return this.ensureLiveFormula(kind, selection);
    },

    ensureLiveFormula: function(kind, selection) {
      var slot = this._getFormulaSlot(kind);
      if (!slot) return null;
      var sel = selection || (kind === 'dough' ? this.getRecipeProfile() : this.getFillingRecord());
      var sourceSeed = kind + ':' + (sel && sel.id ? sel.id : 'unknown');
      if (slot.seed && slot.live && slot.sourceSeed === sourceSeed) {
        return restoreFormula(slot.live);
      }
      var builder = kind === 'dough' ?
        (typeof global.buildRecipeFormula === 'function' ? global.buildRecipeFormula : null) :
        (typeof global.buildFillingFormula === 'function' ? global.buildFillingFormula : null);
      if (!builder) return restoreFormula(slot.live || slot.seed);
      var formula = builder(sel);
      if (!formula) return restoreFormula(slot.live || slot.seed);
      return this.seedFormula(kind, formula, sourceSeed, { replaceLive: true });
    },

    notePolicyPass: function(kind, details) {
      var slot = this._getFormulaSlot(kind);
      if (!slot) return;
      slot.lastPolicyPass = Object.assign({ at: new Date().toISOString() }, details || {});
      this.save();
    },

    getFormulaDisplayState: function(kind) {
      var slot = this._getFormulaSlot(kind);
      if (!slot) return null;
      var fillingMode = this.getFillingMode();
      var isRefFilling = kind === 'filling' && fillingMode === 'reference';
      var snapDiffers = slot.seed && slot.live &&
        JSON.stringify(slot.live) !== JSON.stringify(slot.seed);
      return {
        kind: kind,
        activeMode: kind === 'filling' ? fillingMode : 'live',
        sourceSeed: slot.sourceSeed || null,
        version: isRefFilling ? 0 : (Number.isFinite(Number(slot.version)) ? Number(slot.version) : 0),
        mutationCount: isRefFilling ? 0 : (slot.mutations ? slot.mutations.length : 0),
        lastPolicyPass: isRefFilling ? null : (slot.lastPolicyPass ? Object.assign({}, slot.lastPolicyPass) : null),
        hasStoredCustom: kind === 'filling' && snapDiffers,
        storedCustomVersion: snapDiffers && Number.isFinite(Number(slot.version)) ? Number(slot.version) : 0
      };
    },

    // ── Phase navigation ───────────────────────────────────────────────────

    getPhaseIndex: function(phaseId) {
      return PHASE_ORDER.indexOf(String(phaseId || '').trim());
    },

    getCurrentPhase: function() {
      if (!_session) this.init();
      return _session.execution.currentPhase;
    },

    setCurrentPhase: function(phaseId, options) {
      if (!_session) this.init();
      var normalized = String(phaseId || '').trim();
      if (!PHASE_ORDER.includes(normalized)) return this.get();
      var force = options && options.force === true;
      if (!force && !this.canNavigateTo(normalized)) return this.get();
      var current = _session.execution.currentPhase;
      if (current && current !== normalized && !_session.execution.completedPhases.includes(current)) {
        _session.execution.completedPhases.push(current);
      }
      _session.execution.currentPhase = normalized;
      this.save();
    },

    advancePhase: function() {
      if (!_session) this.init();
      var current = _session.execution.currentPhase;
      var progress = this.getPhaseProgress(current);
      if (!progress.readyToAdvance && progress.requiredSteps > 0) return this.get();
      var idx = this.getPhaseIndex(current);
      var next = PHASE_ORDER[Math.min(idx + 1, PHASE_ORDER.length - 1)];
      this.setCurrentPhase(next);
    },

    regressPhase: function() {
      if (!_session) this.init();
      var idx = this.getPhaseIndex(_session.execution.currentPhase);
      var prev = PHASE_ORDER[Math.max(idx - 1, 0)];
      this.setCurrentPhase(prev, { force: true });
    },

    canNavigateTo: function(phaseId) {
      if (!_session) this.init();
      var target = this.getPhaseIndex(phaseId);
      if (target === -1) return false;
      var current = this.getPhaseIndex(_session.execution.currentPhase);
      var completed = _session.execution.completedPhases;
      var reached = Math.max(current);
      for (var i = 0; i < PHASE_ORDER.length; i++) {
        if (completed.indexOf(PHASE_ORDER[i]) !== -1) {
          reached = Math.max(reached, i);
        }
      }
      if (target <= current) return true;
      if (target > reached + 1) return false;
      var progress = this.getPhaseProgress(_session.execution.currentPhase);
      return progress.readyToAdvance;
    },

    getPhaseStatusMap: function() {
      if (!_session) this.init();
      var current = _session.execution.currentPhase;
      var currentIndex = this.getPhaseIndex(current);
      var completedSet = {};
      for (var i = 0; i < _session.execution.completedPhases.length; i++) {
        completedSet[_session.execution.completedPhases[i]] = true;
      }
      var reached = currentIndex;
      for (var j = 0; j < PHASE_ORDER.length; j++) {
        if (completedSet[PHASE_ORDER[j]]) reached = Math.max(reached, j);
      }
      var result = {};
      for (var k = 0; k < PHASE_ORDER.length; k++) {
        var p = PHASE_ORDER[k];
        if (completedSet[p]) result[p] = 'completed';
        else if (k === currentIndex) result[p] = 'active';
        else if (k <= reached + 1) result[p] = 'available';
        else result[p] = 'locked';
      }
      return result;
    },

    // ── Protocol step tracking ─────────────────────────────────────────────

    getCurrentProtocolStepId: function() {
      if (!_session) this.init();
      return _session.execution.currentProtocolStepId;
    },

    setCurrentProtocolStepId: function(stepId) {
      if (!_session) this.init();
      _session.execution.currentProtocolStepId = stepId || null;
      this.save();
    },

    markStepComplete: function(stepId, isComplete) {
      if (!_session) this.init();
      var done = {};
      for (var i = 0; i < _session.execution.completedStepIds.length; i++) {
        done[_session.execution.completedStepIds[i]] = true;
      }
      if (isComplete !== false) done[stepId] = true;
      else delete done[stepId];
      _session.execution.completedStepIds = Object.keys(done);
      var currentPhase = _session.execution.currentPhase;
      var progress = this.getPhaseProgress(currentPhase);
      if (progress.readyToAdvance && _session.execution.completedPhases.indexOf(currentPhase) === -1) {
        _session.execution.completedPhases.push(currentPhase);
      }
      this.save();
    },

    isStepComplete: function(stepId) {
      if (!_session) this.init();
      return _session.execution.completedStepIds.indexOf(stepId) !== -1;
    },

    getCompletedStepIds: function() {
      if (!_session) this.init();
      return _session.execution.completedStepIds.slice();
    },

    // ── Phase progress ─────────────────────────────────────────────────────

    getPhaseSteps: function(phaseId, sessionOverride) {
      var sess = sessionOverride || _session;
      if (!sess) this.init();
      var runbook = getCompiledRunbook(sess);
      if (!runbook || !Array.isArray(runbook.phases)) return [];
      var phase = null;
      for (var i = 0; i < runbook.phases.length; i++) {
        if (runbook.phases[i].id === phaseId) { phase = runbook.phases[i]; break; }
      }
      return (phase && Array.isArray(phase.steps)) ? phase.steps : [];
    },

    getPhaseProgress: function(phaseId, sessionOverride) {
      var sess = sessionOverride || _session;
      if (!sess) this.init();
      var steps = this.getPhaseSteps(phaseId, sess);
      var completedSet = {};
      for (var i = 0; i < sess.execution.completedStepIds.length; i++) {
        completedSet[sess.execution.completedStepIds[i]] = true;
      }
      var required = steps.filter(function(step) {
        var comp = (step && step.provenance && step.provenance.completeness) || 'partial';
        return comp !== 'reference-only';
      });
      var completedRequired = required.filter(function(step) {
        return step && step.id && completedSet[step.id];
      });
      return {
        phaseId: phaseId,
        totalSteps: steps.length,
        requiredSteps: required.length,
        completedSteps: completedRequired.length,
        readyToAdvance: required.length === 0 ? true : completedRequired.length >= required.length
      };
    },

    // ── Observations / Deviations ──────────────────────────────────────────

    addObservation: function(obs) {
      if (!_session) this.init();
      var text = safeUserText(obs && obs.text).trim();
      if (!text) return this.get();
      var item = {
        id: (obs && obs.id) || ('obs_' + Date.now()),
        phaseId: (obs && obs.phaseId) || _session.execution.currentPhase || 'setup',
        text: text,
        severity: (obs && obs.severity) || 'info',
        createdAt: (obs && obs.createdAt) || new Date().toISOString()
      };
      _session.execution.observations.push(item);
      this.save();
    },

    addDeviation: function(dev) {
      if (!_session) this.init();
      var text = safeUserText(dev && dev.text).trim();
      if (!text) return this.get();
      var item = {
        id: (dev && dev.id) || ('dev_' + Date.now()),
        phaseId: (dev && dev.phaseId) || _session.execution.currentPhase || 'setup',
        text: text,
        impact: (dev && dev.impact) || 'unknown',
        createdAt: (dev && dev.createdAt) || new Date().toISOString()
      };
      _session.execution.deviations.push(item);
      this.save();
    },

    getObservations: function(phaseId) {
      if (!_session) this.init();
      var all = _session.execution.observations || [];
      if (phaseId) return all.filter(function(o) { return o.phaseId === phaseId; });
      return all.slice();
    },

    getDeviations: function(phaseId) {
      if (!_session) this.init();
      var all = _session.execution.deviations || [];
      if (phaseId) return all.filter(function(d) { return d.phaseId === phaseId; });
      return all.slice();
    },

    setPhaseNote: function(phaseId, note) {
      if (!_session) this.init();
      var key = phaseId || _session.execution.currentPhase || 'setup';
      _session.execution.phaseNotes[key] = safeUserText(note);
      this.save();
    },

    getPhaseNote: function(phaseId) {
      if (!_session) this.init();
      var key = phaseId || _session.execution.currentPhase || 'setup';
      return _session.execution.phaseNotes[key] || '';
    },

    setExecutionNotes: function(notes) {
      if (!_session) this.init();
      _session.execution.notes = safeUserText(notes);
      this.save();
    },

    getExecutionNotes: function() {
      if (!_session) this.init();
      return _session.execution.notes || '';
    },

    setStepData: function(key, value) {
      if (!_session) this.init();
      _session.execution.stepData[key] = value;
      this.save();
    },

    getStepData: function(key, fallback) {
      if (!_session) this.init();
      return Object.prototype.hasOwnProperty.call(_session.execution.stepData, key)
        ? _session.execution.stepData[key] : fallback;
    },

    getBench: function() {
      if (!_session) this.init();
      var normFn = global.MedovikBench && global.MedovikBench.normalizeBench;
      var normalized = typeof normFn === 'function'
        ? normFn(this.getStepData('bench.v1', null))
        : { strained: null, firstLayer: null, timers: [] };
      return JSON.parse(JSON.stringify(normalized));
    },

    setBench: function(patch) {
      if (!_session) this.init();
      var current = this.getBench();
      var merged = Object.assign({}, current, patch && typeof patch === 'object' ? patch : {});
      var normFn = global.MedovikBench && global.MedovikBench.normalizeBench;
      var next = typeof normFn === 'function' ? normFn(merged) : merged;
      this.setStepData('bench.v1', JSON.parse(JSON.stringify(next)));
    },

    setBakeLoop: function(state) {
      if (!_session) this.init();
      _session.execution.bakeLoop = Object.assign({}, _session.execution.bakeLoop, state || {});
      this.save();
    },

    getBakeLoop: function() {
      if (!_session) this.init();
      return Object.assign({}, _session.execution.bakeLoop);
    },

    // ── Reviews ──────────────────────────────────────────────────────────────

    addReview: function(review) {
      if (!_session) this.init();
      if (!_session.review) _session.review = { reviews: [] };
      if (!Array.isArray(_session.review.reviews)) _session.review.reviews = [];
      var cleanReview = Object.assign({}, review || {});
      cleanReview.name = safeUserText(cleanReview.name, 500);
      cleanReview.notes = safeUserText(cleanReview.notes);
      _session.review.reviews.push(Object.assign({
        id: 'review_' + Date.now(),
        createdAt: new Date().toISOString()
      }, cleanReview));
      this.save();
    },

    getReviews: function() {
      if (!_session) this.init();
      return (_session.review && _session.review.reviews) || [];
    },

    getRunbook: function(sessionOverride) {
      if (!_session) this.init();
      return getCompiledRunbook(sessionOverride || _session);
    },

    // ── Migration: import legacy v4 state ──────────────────────────────────

    importLegacyV4: function(legacyState) {
      if (!legacyState || typeof legacyState !== 'object') return this.reset();

      // Try to extract session shape from legacy AppState format
      var legacySession = legacyState.session || legacyState;

      var migrated = {
        productSpec: legacyState.batchConfig || legacySession.productSpec || undefined,
        doughSystem: { recipeId:
          (legacySession.doughSystem && legacySession.doughSystem.recipeId) ||
          legacyState.selectedRecipeProfile ||
          'ayaHabib'
        },
        fillingPlan: {
          mode: (legacySession.fillingPlan && legacySession.fillingPlan.mode) ||
                (legacyState.stepData && legacyState.stepData['workflow-custom-filling-notes'] ? 'custom' : 'reference'),
          customDraft: (legacySession.fillingPlan && legacySession.fillingPlan.customDraft) ||
                       (legacyState.stepData && legacyState.stepData['workflow-custom-filling-notes']) || '',
          entries: [{
            fillingId: (global.resolveFillingId && global.resolveFillingId(
              legacyState.selectedFilling ||
              (legacySession.fillingPlan && legacySession.fillingPlan.entries && legacySession.fillingPlan.entries[0] && legacySession.fillingPlan.entries[0].fillingId)
            )) || legacyState.selectedFilling ||
               (legacySession.fillingPlan && legacySession.fillingPlan.entries && legacySession.fillingPlan.entries[0] && legacySession.fillingPlan.entries[0].fillingId) ||
               (global.DEFAULT_FILLING_ID || 'classic_sourcream_frosting'),
            gaps: 'all',
            sweetnessAdjustmentPct: clampSweetnessAdjustmentPct(
              legacyState.sweetnessAdjustmentPct ||
              (legacySession.sweetnessPlan && legacySession.sweetnessPlan.adjustmentPct) ||
              (legacySession.fillingPlan && legacySession.fillingPlan.entries && legacySession.fillingPlan.entries[0] && legacySession.fillingPlan.entries[0].sweetnessAdjustmentPct) || 0
            )
          }]
        },
        sweetnessPlan: {
          adjustmentPct: clampSweetnessAdjustmentPct(
            legacyState.sweetnessAdjustmentPct ||
            (legacySession.sweetnessPlan && legacySession.sweetnessPlan.adjustmentPct) || 0
          ),
          target: normalizeSweetnessTarget(
            legacyState.sweetnessTarget ||
            (legacySession.sweetnessPlan && legacySession.sweetnessPlan.target) || 'filling'
          )
        },
        execution: {
          currentPhase: (legacySession.executionState && legacySession.executionState.currentPhase === 'journal' ? 'review' :
                         legacySession.executionState && legacySession.executionState.currentPhase) ||
                        (legacyState.currentView === 'journal' ? 'review' : legacyState.currentView) || 'setup',
          notes: (legacySession.executionState && legacySession.executionState.notes) ||
                 (legacyState.stepData && legacyState.stepData['workflow-execution-notes']) || '',
          stepData: (legacySession.executionState && legacySession.executionState.stepData) ||
                    legacyState.stepData || {},
          bakeLoop: (legacySession.executionState && legacySession.executionState.bakeLoop) ||
                    (legacyState.stepData && legacyState.stepData['workflow-bake-loop']) ||
                    { bakedLayers: 0, averageMinutes: '' }
        },
        formulaState: legacySession.formulaState || undefined,
        compiledRunbook: legacySession.compiledRunbook || legacyState.compiledRunbook || null,
        review: legacySession.review || legacyState.review || null
      };

      // Map legacy phase names
      if (migrated.execution && migrated.execution.currentPhase) {
        var phaseMap = { execution: 'baking', planning: 'setup', finish: 'review' };
        if (phaseMap[migrated.execution.currentPhase]) {
          migrated.execution.currentPhase = phaseMap[migrated.execution.currentPhase];
        }
      }

      _session = normalizeSession(migrated);
      this.save();
      return clone(_session);
    }
  };

  // ── Compatibility shim: expose as global AppState for existing tools ───────

  // This allows app-tools.js and app-calculators.js to keep working without
  // modification. Over time these can be migrated to use SessionStore directly.
  if (!global.AppState) {
    global.AppState = {
      _store: SessionStore,

      get: function(key) {
        SessionStore.init();
        if (key === 'referenceTopic' || key === 'currentScienceTopic') return SessionStore.getReferenceTopic();
        if (key === 'drawerOpen') return SessionStore._drawerOpen || false;
        if (key === 'activeTool') return SessionStore._activeTool || null;
        if (key === 'selectedRecipeProfile') return SessionStore.resolveActiveRecipeProfile()?.id || SessionStore.getRecipeId();
        if (key === 'selectedFilling') return SessionStore.resolveActiveFillingProfile()?.id || SessionStore.getFillingId();
        if (key === 'fillingScope') return 'single-filling-v6';
        if (key === 'sweetnessTarget') return SessionStore.getSweetnessTarget();
        if (key === 'currentView') return SessionStore.getCurrentPhase();
        return null;
      },

      getAll: function() {
        return SessionStore.get();
      },

      set: function(key, value) {
        SessionStore.init();
        if (key === 'referenceTopic' || key === 'currentScienceTopic') { SessionStore.setReferenceTopic(value); return this; }
        if (key === 'drawerOpen') { SessionStore._drawerOpen = !!value; return this; }
        if (key === 'activeTool') { SessionStore._activeTool = value; return this; }
        if (key === 'fillingScope') return this; // locked to the single-filling v6 workflow
        if (key === 'selectedRecipeProfile') { SessionStore.setRecipe(value); return this; }
        if (key === 'selectedFilling') { SessionStore.setFilling(value); return this; }
        if (key === 'currentView') { SessionStore.setCurrentPhase(value); return this; }
        return this;
      },

      update: function(updates) {
        if (!updates) return this;
        if (updates.session) SessionStore.set(updates.session);
        if (updates.ui) {
          if (updates.ui.referenceTopic) SessionStore.setReferenceTopic(updates.ui.referenceTopic);
          if (updates.ui.drawerOpen !== undefined) SessionStore._drawerOpen = !!updates.ui.drawerOpen;
          if (updates.ui.activeTool !== undefined) SessionStore._activeTool = updates.ui.activeTool;
        }
        return this;
      },

      getSession: function() { return SessionStore.get(); },
      setSession: function(s) { return SessionStore.set(s); },

      getBatchConfig: function() { return SessionStore.getProductSpec(); },
      setBatchConfig: function(c) { SessionStore.updateProductSpec(c); },

       getSelectedRecipeProfile: function() { return SessionStore.resolveActiveRecipeProfile(); },
       setSelectedRecipeProfile: function(id) { SessionStore.setRecipe(id); },

       getSelectedFilling: function() { return SessionStore.resolveActiveFillingProfile(); },
       setSelectedFilling: function(id) { SessionStore.setFilling(id); },

      getFillingMode: function() { return SessionStore.getFillingMode(); },
      setFillingMode: function(m) { SessionStore.setFillingMode(m); },

      getSweetnessAdjustmentPct: function() { return SessionStore.getSweetnessAdjustmentPct(); },
      setSweetnessAdjustmentPct: function(v) { SessionStore.setSweetnessAdjustmentPct(v); },
      getSweetnessAdjustmentTarget: function() { return SessionStore.getSweetnessTarget(); },
      setSweetnessAdjustmentTarget: function(t) { SessionStore.setSweetnessTarget(t); },

       ensureLiveDoughFormula: function(sel) { return SessionStore.getActiveFormula('dough', sel) || new global.Formula([]); },
       ensureLiveFillingFormula: function(sel) { return SessionStore.getActiveFormula('filling', sel) || new global.Formula([]); },
       getLiveDoughFormula: function() { return SessionStore.getActiveFormula('dough') || new global.Formula([]); },
       getLiveFillingFormula: function() { return SessionStore.getActiveFormula('filling') || new global.Formula([]); },
       getActiveDoughFormula: function(sel) { return SessionStore.getActiveFormula('dough', sel) || new global.Formula([]); },
       getActiveFillingFormula: function(sel) { return SessionStore.getActiveFormula('filling', sel) || new global.Formula([]); },
      updateLiveDoughFormula: function(f, m) { return SessionStore.updateLiveFormula('dough', f, m); },
      updateLiveFillingFormula: function(f, m) { return SessionStore.updateLiveFormula('filling', f, m); },
      resetDoughFormulaToSeed: function() { return SessionStore.resetFormulaToSeed('dough'); },
      resetFillingFormulaToSeed: function() { return SessionStore.resetFormulaToSeed('filling'); },
      getSeedDoughFormula: function() { return SessionStore.getSeedFormula('dough') || new global.Formula([]); },
      getSeedFillingFormula: function() { return SessionStore.getSeedFormula('filling') || new global.Formula([]); },

      notePolicyPass: function(k, d) { SessionStore.notePolicyPass(k, d); },
      getFormulaState: function() {
        var s = SessionStore.get();
        return { dough: Object.assign({}, s.formulaState.dough), filling: Object.assign({}, s.formulaState.filling) };
      },
      getFormulaDisplayState: function(kind) { return SessionStore.getFormulaDisplayState(kind); },

      getExecutionPhase: function() { return SessionStore.getCurrentPhase(); },
      getPhaseStatusMap: function() { return SessionStore.getPhaseStatusMap(); },

      addReview: function(review) { SessionStore.addReview(review); },

      getReviews: function() { return SessionStore.getReviews(); },

      setCalculatedBatch: function(batch) { SessionStore.setCalculatedBatch(batch); },

      getCalculatedBatch: function() { return SessionStore.getCalculatedBatch(); },

      save: function() { SessionStore.save(); return this; }
    };
  }

  // Also expose SessionManager compatibility (for tools that call it directly)
  if (!global.SessionManager) {
    global.SessionManager = {
      PHASE_ORDER: PHASE_ORDER,
      FILLING_SCOPE: OFFICIAL_FILLING_SCOPE,

      init: function() { return SessionStore.init(); },
      current: function() { return SessionStore.get(); },
      ensure: function() { SessionStore.init(); return SessionStore.get(); },
      save: function(s) { if (s) SessionStore.set(s); else SessionStore.save(); return SessionStore.get(); },
      reset: function() { return SessionStore.reset(); },

      updateProductSpec: function(s) { SessionStore.updateProductSpec(s); },
      setRecipe: function(id) { SessionStore.setRecipe(id); },
      setFilling: function(id) { SessionStore.setFilling(id); },
      setFillingMode: function(m) { SessionStore.setFillingMode(m); },
      setSweetnessAdjustment: function(v) { SessionStore.setSweetnessAdjustmentPct(v); },
      setSweetnessTarget: function(t) { SessionStore.setSweetnessTarget(t); },
      setCustomDraft: function(t) { SessionStore.setCustomDraft(t); },

      getLiveDoughFormula: function() { return SessionStore.getActiveFormula('dough'); },
      getLiveFillingFormula: function() { return SessionStore.getActiveFormula('filling'); },
      getActiveDoughFormula: function() { return SessionStore.getActiveFormula('dough'); },
      getActiveFillingFormula: function() { return SessionStore.getActiveFormula('filling'); },
      updateLiveDoughFormula: function(f, m) { return SessionStore.updateLiveFormula('dough', f, m); },
      updateLiveFillingFormula: function(f, m) { return SessionStore.updateLiveFormula('filling', f, m); },
      resetDoughFormula: function(r) { return SessionStore.resetFormulaToSeed('dough'); },
      resetFillingFormula: function(r) { return SessionStore.resetFormulaToSeed('filling'); },
      notePolicyPass: function(k, d) { SessionStore.notePolicyPass(k, d); },
      getFormulaDisplayState: function(k) { return SessionStore.getFormulaDisplayState(k); },

      setPhase: function(id, opts) { SessionStore.setCurrentPhase(id, opts); return SessionStore.get(); },
      advancePhase: function() { SessionStore.advancePhase(); return SessionStore.get(); },
      regressPhase: function() { SessionStore.regressPhase(); return SessionStore.get(); },
      setProtocolStep: function(id) { SessionStore.setCurrentProtocolStepId(id); },
      setBakeLoop: function(s) { SessionStore.setBakeLoop(s); },
      setExecutionNotes: function(n) { SessionStore.setExecutionNotes(n); },
      setStepData: function(k, v) { SessionStore.setStepData(k, v); },
      getStepData: function(k, fb) { return SessionStore.getStepData(k, fb); },

      addObservation: function(o) { SessionStore.addObservation(o); },
      addDeviation: function(d) { SessionStore.addDeviation(d); },
      setPhaseNote: function(p, n) { SessionStore.setPhaseNote(p, n); },
      getPhaseNote: function(p) { return SessionStore.getPhaseNote(p); },
      getObservations: function(p) { return SessionStore.getObservations(p); },
      getDeviations: function(p) { return SessionStore.getDeviations(p); },

      canNavigateTo: function(id) { return SessionStore.canNavigateTo(id); },
      getPhaseStatusMap: function() { return SessionStore.getPhaseStatusMap(); },
      getRunbook: function(s) {
        return SessionStore.getRunbook(s || SessionStore.get());
      },
      getPhaseSteps: function(id, s) { return SessionStore.getPhaseSteps(id, s); },
      getPhaseProgress: function(id, s) { return SessionStore.getPhaseProgress(id, s); },
      getMissingRequiredSteps: function(id, s) {
        var steps = SessionStore.getPhaseSteps(id || SessionStore.getCurrentPhase(), s || SessionStore.get());
        var completedSet = {};
        var sess = s || SessionStore.get();
        for (var i = 0; i < (sess.execution.completedStepIds || []).length; i++) {
          completedSet[sess.execution.completedStepIds[i]] = true;
        }
        return steps
          .filter(function(step) { return (step.provenance && step.provenance.completeness) !== 'reference-only'; })
          .filter(function(step) { return !(step.id && completedSet[step.id]); })
          .map(function(step) { return step.title || step.operatorAction || step.id; })
          .filter(Boolean);
      },
      markStepComplete: function(id, c) { SessionStore.markStepComplete(id, c); },
      isStepComplete: function(id) { return SessionStore.isStepComplete(id); },
      getCompletedStepIds: function() { return SessionStore.getCompletedStepIds(); }
    };
  }

  global.MEDOVIK_SESSION_SCHEMA_VERSION = SESSION_SCHEMA_VERSION;
  global.SWEETNESS_ADJUSTMENT_RANGE = SWEETNESS_ADJUSTMENT_RANGE;
  global.DEFAULT_PRODUCT_SPEC = DEFAULT_PRODUCT_SPEC;
  global.DEFAULT_BATCH_CONFIG = DEFAULT_BATCH_CONFIG;
  global.SessionStore = SessionStore;
})(typeof window !== 'undefined' ? window : globalThis);
