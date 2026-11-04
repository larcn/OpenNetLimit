// =============================================================================
// Medovik v6 - Recipe Library Store
// Persistent library for built-in and custom dough/filling recipes.
// Owns saved recipe records, comparison selections, and per-kind custom drafts.
// =============================================================================
(function(global) {
  'use strict';

  const STORAGE_KEY = 'medovik_recipe_lab_v2';
  const LEGACY_STORAGE_KEYS = Object.freeze(['medovik_recipe_lab_v1']);
  const RECIPE_LAB_SCHEMA_VERSION = 2;
  const KINDS = Object.freeze(['dough', 'filling']);
  function nowId(prefix) {
    return prefix + '_' + Date.now();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function arrayify(value) {
    return Array.isArray(value) ? value : [];
  }

  function text(value) {
    const raw = typeof value === 'string' ? value : '';
    return raw.slice(0, 20000).replace(/</g, '‹').replace(/>/g, '›').trim();
  }

  function normalizeKind(kind) {
    return KINDS.includes(kind) ? kind : 'dough';
  }

  function getStorage() {
    try {
      return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch (_) {
      return null;
    }
  }

  function toFormulaSnapshot(formulaOrSnapshot) {
    if (!formulaOrSnapshot) return { items: [], meta: {} };
    if (typeof formulaOrSnapshot.toSnapshot === 'function') {
      const snapshot = formulaOrSnapshot.toSnapshot();
      return {
        items: arrayify(snapshot.items).map(function(item) {
          return {
            ingredientId: String(item.ingredientId || '').trim(),
            weight: Number(item.weight) || 0
          };
        }).filter(function(item) { return item.ingredientId; }),
        meta: snapshot.meta && typeof snapshot.meta === 'object' ? Object.assign({}, snapshot.meta) : {}
      };
    }
    if (formulaOrSnapshot.items) {
      return {
        items: arrayify(formulaOrSnapshot.items).map(function(item) {
          return {
            ingredientId: String(item.ingredientId || '').trim(),
            weight: Number(item.weight) || 0
          };
        }).filter(function(item) { return item.ingredientId; }),
        meta: formulaOrSnapshot.meta && typeof formulaOrSnapshot.meta === 'object' ? Object.assign({}, formulaOrSnapshot.meta) : {}
      };
    }
    return { items: [], meta: {} };
  }

  function defaultItemsForKind(kind) {
    if (normalizeKind(kind) === 'filling') {
      return [
        { ingredientId: 'sour-cream', weight: 400 },
        { ingredientId: 'powdered-sugar', weight: 120 },
        { ingredientId: 'whipping-cream', weight: 150 }
      ];
    }
    return [
      { ingredientId: 'flour', weight: 500 },
      { ingredientId: 'sugar', weight: 180 },
      { ingredientId: 'honey', weight: 120 },
      { ingredientId: 'butter', weight: 150 },
      { ingredientId: 'eggs', weight: 150 }
    ];
  }

  function createDraft(kind) {
    const normalizedKind = normalizeKind(kind);
    return {
      id: null,
      kind: normalizedKind,
      name: '',
      description: '',
      rating: 0,
      notes: '',
      items: defaultItemsForKind(normalizedKind),
      sourceId: null
    };
  }

  function normalizeDraft(input) {
    const source = input && typeof input === 'object' ? input : {};
    const kind = normalizeKind(source.kind);
    return {
      id: source.id || null,
      kind,
      name: text(source.name),
      description: text(source.description),
      rating: Math.max(0, Math.min(5, Number(source.rating) || 0)),
      notes: text(source.notes),
      items: arrayify(source.items).map(function(item) {
        return {
          ingredientId: String(item && item.ingredientId || '').trim(),
          weight: Number(item && item.weight) || 0
        };
      }).filter(function(item) { return item.ingredientId; }),
      sourceId: source.sourceId || null
    };
  }

  function createInitialState() {
    return {
      schemaVersion: RECIPE_LAB_SCHEMA_VERSION,
      selectedId: null,
      compare: {
        ids: [],
        leftId: null,
        rightId: null,
        doughIds: [],
        fillingIds: []
      },
      draftKind: 'dough',
      drafts: {
        dough: createDraft('dough'),
        filling: createDraft('filling')
      },
      draft: createDraft('dough'),
      customRecords: []
    };
  }

  function normalizeDraftBundle(source, fallbackDraft) {
    const activeKind = normalizeKind(source && source.draftKind);
    const doughDraft = normalizeDraft(
      (source && source.drafts && source.drafts.dough)
      || (fallbackDraft && normalizeKind(fallbackDraft.kind) === 'dough' ? fallbackDraft : null)
      || createDraft('dough')
    );
    const fillingDraft = normalizeDraft(
      (source && source.drafts && source.drafts.filling)
      || (fallbackDraft && normalizeKind(fallbackDraft.kind) === 'filling' ? fallbackDraft : null)
      || createDraft('filling')
    );
    return {
      draftKind: activeKind,
      drafts: {
        dough: doughDraft,
        filling: fillingDraft
      },
      draft: activeKind === 'filling' ? fillingDraft : doughDraft
    };
  }

  function normalizeCustomRecord(record) {
    const source = record && typeof record === 'object' ? record : {};
    const kind = normalizeKind(source.kind);
    const snapshot = toFormulaSnapshot(source.formulaSnapshot);
    const now = new Date().toISOString();
    return {
      id: source.id || nowId('custom_recipe'),
      kind,
      origin: 'custom',
      readOnly: false,
      name: text(source.name) || (kind === 'filling' ? 'Custom Filling' : 'Custom Dough'),
      description: text(source.description),
      rating: Math.max(0, Math.min(5, Number(source.rating) || 0)),
      notes: text(source.notes),
      sourceId: source.sourceId || null,
      // Pre-vNext records have no auditable creator label; never infer originality.
      provenanceKind: source.provenanceKind || 'UNVERIFIED_LEGACY',
      createdAt: source.createdAt || now,
      updatedAt: source.updatedAt || now,
      formulaSnapshot: snapshot,
      derivedMetrics: source.derivedMetrics && typeof source.derivedMetrics === 'object'
        ? Object.assign({}, source.derivedMetrics)
        : null
    };
  }

  function normalizeState(input) {
    const source = input && typeof input === 'object' ? input : {};
    const base = createInitialState();
    const draftBundle = normalizeDraftBundle(source, source.draft || base.draft);
    return {
      schemaVersion: RECIPE_LAB_SCHEMA_VERSION,
      selectedId: source.selectedId || null,
      compare: {
        ids: Array.isArray(source.compare && source.compare.ids)
          ? source.compare.ids.filter(Boolean).map(function(id) { return String(id); })
          : [source.compare && source.compare.leftId, source.compare && source.compare.rightId].filter(Boolean),
        leftId: source.compare && source.compare.leftId || null,
        rightId: source.compare && source.compare.rightId || null,
        doughIds: Array.isArray(source.compare && source.compare.doughIds)
          ? source.compare.doughIds.filter(Boolean).map(function(id) { return String(id); })
          : [],
        fillingIds: Array.isArray(source.compare && source.compare.fillingIds)
          ? source.compare.fillingIds.filter(Boolean).map(function(id) { return String(id); })
          : []
      },
      draftKind: draftBundle.draftKind,
      drafts: draftBundle.drafts,
      draft: draftBundle.draft,
      customRecords: arrayify(source.customRecords).map(normalizeCustomRecord)
    };
  }

  let _lastPersistStatus = { ok: true, at: null, error: null };

  function loadState() {
    const storage = getStorage();
    if (!storage) return null;
    try {
      let raw = storage.getItem(STORAGE_KEY);
      let migrated = false;
      if (!raw) {
        for (const key of LEGACY_STORAGE_KEYS) {
          raw = storage.getItem(key);
          if (raw) { migrated = true; break; }
        }
      }
      if (!raw) return null;
      const state = normalizeState(JSON.parse(raw));
      if (migrated) persistState(state);
      return state;
    } catch (error) {
      console.warn('RecipeLabStore: failed to load state', error);
      return null;
    }
  }

  function persistState(state) {
    const storage = getStorage();
    if (!storage) {
      _lastPersistStatus = { ok: false, at: new Date().toISOString(), error: 'التخزين المحلي غير متاح.' };
      return _lastPersistStatus;
    }
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
      _lastPersistStatus = { ok: true, at: new Date().toISOString(), error: null };
    } catch (error) {
      _lastPersistStatus = { ok: false, at: new Date().toISOString(), error: String(error && error.message || error) };
      console.warn('RecipeLabStore: failed to persist state', error);
    }
    return _lastPersistStatus;
  }

  function buildBuiltinDoughRecords() {
    return Object.values(global.MEDOVIK_RECIPE_PROFILES || {}).map(function(profile) {
      const formula = typeof global.buildRecipeFormula === 'function'
        ? global.buildRecipeFormula(profile)
        : null;
      return {
        id: 'builtin:dough:' + profile.id,
        kind: 'dough',
        origin: 'builtin',
        readOnly: true,
        name: profile.name || profile.nameAr || profile.id,
        description: profile.description || profile.bestFor || '',
        sourceId: profile.id,
        createdAt: null,
        updatedAt: null,
        formulaSnapshot: toFormulaSnapshot(formula)
      };
    });
  }

  function buildBuiltinFillingRecords() {
    return Object.values(global.FILLING_CATALOG || {}).map(function(record) {
      const formula = typeof global.buildFillingFormula === 'function'
        ? global.buildFillingFormula(record)
        : null;
      return {
        id: 'builtin:filling:' + record.id,
        kind: 'filling',
        origin: 'builtin',
        readOnly: true,
        name: record.name || record.shortName || record.id,
        description: record.description || '',
        sourceId: record.id,
        createdAt: null,
        updatedAt: null,
        formulaSnapshot: toFormulaSnapshot(formula)
      };
    });
  }

  function sortRecords(records) {
    return records.slice().sort(function(a, b) {
      if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
      if (a.origin !== b.origin) return a.origin === 'builtin' ? -1 : 1;
      return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
    });
  }

  var _state = null;
  var _listeners = [];
  var _builtins = null;

  function ensureBuiltins() {
    if (_builtins) return _builtins;
    _builtins = sortRecords(buildBuiltinDoughRecords().concat(buildBuiltinFillingRecords()));
    return _builtins;
  }

  function emit() {
    const next = clone(_state);
    _listeners.forEach(function(listener) {
      try { listener(next); } catch (_) { /* ignore listener failures */ }
    });
  }

  function setState(nextState) {
    _state = normalizeState(nextState);
    persistState(_state);
    emit();
    return clone(_state);
  }

  function replaceActiveDraft(nextDraft, nextKind) {
    const kind = normalizeKind(nextKind || (_state && _state.draftKind) || 'dough');
    const drafts = Object.assign({}, (_state && _state.drafts) || {}, {
      [kind]: normalizeDraft(nextDraft)
    });
    return Object.assign({}, _state, {
      draftKind: kind,
      drafts: drafts,
      draft: drafts[kind]
    });
  }

  function getMergedRecords() {
    return sortRecords(ensureBuiltins().concat(arrayify(_state && _state.customRecords)));
  }

  function getRecordById(id) {
    const target = String(id || '').trim();
    if (!target) return null;
    const records = getMergedRecords();
    for (var i = 0; i < records.length; i += 1) {
      if (records[i].id === target) return clone(records[i]);
    }
    return null;
  }

  const RecipeLabStore = {
    init: function() {
      if (_state) return clone(_state);
      _state = normalizeState(loadState() || createInitialState());
      ensureBuiltins();
      return clone(_state);
    },

    getState: function() {
      if (!_state) this.init();
      return clone(_state);
    },

    getLastPersistStatus: function() { return Object.assign({}, _lastPersistStatus); },

    subscribe: function(listener) {
      if (typeof listener !== 'function') return function() {};
      _listeners.push(listener);
      return function() {
        _listeners = _listeners.filter(function(entry) { return entry !== listener; });
      };
    },

    listRecords: function(kind) {
      if (!_state) this.init();
      const normalizedKind = kind ? normalizeKind(kind) : null;
      return getMergedRecords().filter(function(record) {
        return normalizedKind ? record.kind === normalizedKind : true;
      });
    },

    getRecord: function(id) {
      if (!_state) this.init();
      return getRecordById(id);
    },

    getDraft: function(kind) {
      if (!_state) this.init();
      const normalizedKind = normalizeKind(kind || _state.draftKind);
      return clone((_state.drafts && _state.drafts[normalizedKind]) || createDraft(normalizedKind));
    },

    setSelected: function(id) {
      if (!_state) this.init();
      return setState(Object.assign({}, _state, { selectedId: id || null }));
    },

    setCompare: function(leftId, rightId) {
      if (!_state) this.init();
      const ids = [leftId || null, rightId || null].filter(Boolean);
      return setState(Object.assign({}, _state, {
        compare: {
          ids: ids,
          leftId: leftId || null,
          rightId: rightId || null,
          doughIds: arrayify(_state.compare && _state.compare.doughIds),
          fillingIds: arrayify(_state.compare && _state.compare.fillingIds)
        }
      }));
    },

    setCompareIds: function(ids) {
      if (!_state) this.init();
      const clean = arrayify(ids).filter(Boolean).map(function(id) { return String(id); });
      return setState(Object.assign({}, _state, {
        compare: {
          ids: clean,
          leftId: clean[0] || null,
          rightId: clean[1] || null,
          doughIds: arrayify(_state.compare && _state.compare.doughIds),
          fillingIds: arrayify(_state.compare && _state.compare.fillingIds)
        }
      }));
    },

    setKindCompareIds: function(kind, ids) {
      if (!_state) this.init();
      const clean = arrayify(ids).filter(Boolean).map(function(id) { return String(id); });
      const isFilling = normalizeKind(kind) === 'filling';
      const doughIds = isFilling
        ? arrayify(_state.compare && _state.compare.doughIds)
        : clean;
      const fillingIds = isFilling
        ? clean
        : arrayify(_state.compare && _state.compare.fillingIds);
      return setState(Object.assign({}, _state, {
        compare: {
          ids: clean,
          leftId: clean[0] || null,
          rightId: clean[1] || null,
          doughIds: doughIds,
          fillingIds: fillingIds
        }
      }));
    },

    createDraft: function(options) {
      if (!_state) this.init();
      const kind = normalizeKind(options && options.kind);
      const record = options && options.fromId ? this.getRecord(options.fromId) : null;
      const existingDraft = !_state || !_state.drafts ? null : _state.drafts[kind];
      const draft = record ? {
        id: record.origin === 'custom' ? record.id : null,
        kind: record.kind,
        name: record.name || '',
        description: record.description || '',
        rating: Number(record.rating) || 0,
        notes: record.notes || '',
        items: clone(record.formulaSnapshot.items || []),
        sourceId: record.sourceId || null
      } : normalizeDraft(existingDraft || createDraft(kind));
      return setState(Object.assign({}, replaceActiveDraft(draft, kind), {
        selectedId: record ? record.id : _state.selectedId
      }));
    },

    loadDraftFromRecord: function(id) {
      return this.createDraft({ fromId: id });
    },

    updateDraft: function(updates) {
      if (!_state) this.init();
      const activeDraft = this.getDraft(_state.draftKind);
      const nextDraft = normalizeDraft(Object.assign({}, activeDraft, updates || {}));
      return setState(replaceActiveDraft(nextDraft, _state.draftKind));
    },

    setDraftItems: function(items) {
      if (!_state) this.init();
      const activeDraft = this.getDraft(_state.draftKind);
      const nextDraft = Object.assign({}, activeDraft, {
        items: normalizeDraft({ kind: activeDraft.kind, items: items || [] }).items
      });
      return setState(replaceActiveDraft(nextDraft, _state.draftKind));
    },

    addDraftItem: function(ingredientId) {
      if (!_state) this.init();
      const activeDraft = this.getDraft(_state.draftKind);
      const items = arrayify(activeDraft.items).concat([{
        ingredientId: text(ingredientId) || (normalizeKind(activeDraft.kind) === 'filling' ? 'sour-cream' : 'flour'),
        weight: 0
      }]);
      return this.setDraftItems(items);
    },

    updateDraftItem: function(index, patch) {
      if (!_state) this.init();
      const items = arrayify(_state.draft.items).map(function(item, itemIndex) {
        return itemIndex === index ? Object.assign({}, item, patch || {}) : Object.assign({}, item);
      });
      return this.setDraftItems(items);
    },

    removeDraftItem: function(index) {
      if (!_state) this.init();
      const items = arrayify(_state.draft.items).filter(function(_, itemIndex) {
        return itemIndex !== index;
      });
      return this.setDraftItems(items);
    },

    saveDraft: function() {
      if (!_state) this.init();
      const draft = normalizeDraft(this.getDraft(_state.draftKind));
      const snapshot = toFormulaSnapshot({
        items: draft.items.filter(function(item) {
          return item.ingredientId && Number(item.weight) > 0;
        }),
        meta: {}
      });
      const now = new Date().toISOString();
      const record = normalizeCustomRecord({
        id: draft.id || nowId('custom_recipe'),
        kind: draft.kind,
        name: draft.name || (draft.kind === 'filling' ? 'Custom Filling' : 'Custom Dough'),
        description: draft.description,
        rating: draft.rating,
        notes: draft.notes,
        sourceId: draft.sourceId || null,
        provenanceKind: 'USER_VARIANT',
        createdAt: draft.id ? (this.getRecord(draft.id) || {}).createdAt : now,
        updatedAt: now,
        formulaSnapshot: snapshot,
        derivedMetrics: typeof global.RecipeLabAnalyzer?.analyze === 'function'
          ? (global.RecipeLabAnalyzer.analyze({
              kind: draft.kind,
              name: draft.name,
              formulaSnapshot: snapshot
            }).metrics || null)
          : null
      });

      const nextCustoms = arrayify(_state.customRecords).filter(function(item) {
        return item.id !== record.id;
      }).concat([record]);

      const nextState = replaceActiveDraft({
        id: record.id,
        kind: record.kind,
        name: record.name,
        description: record.description,
        rating: record.rating || 0,
        notes: record.notes || '',
        items: clone(record.formulaSnapshot.items),
        sourceId: record.sourceId
      }, record.kind);

      setState(Object.assign({}, nextState, {
        customRecords: nextCustoms,
        selectedId: record.id
      }));
      return clone(record);
    },

    deleteRecord: function(id) {
      if (!_state) this.init();
      const target = this.getRecord(id);
      if (!target || target.origin !== 'custom') return this.getState();
      const nextState = Object.assign({}, _state, {
        customRecords: arrayify(_state.customRecords).filter(function(item) { return item.id !== target.id; }),
        selectedId: _state.selectedId === target.id ? null : _state.selectedId,
        compare: {
          ids: arrayify(_state.compare.ids).filter(function(id) { return id !== target.id; }),
          leftId: _state.compare.leftId === target.id ? null : _state.compare.leftId,
          rightId: _state.compare.rightId === target.id ? null : _state.compare.rightId,
          doughIds: arrayify(_state.compare.doughIds).filter(function(id) { return id !== target.id; }),
          fillingIds: arrayify(_state.compare.fillingIds).filter(function(id) { return id !== target.id; })
        }
      });
      return setState(nextState);
    },

    duplicateRecord: function(id) {
      if (!_state) this.init();
      const source = this.getRecord(id);
      if (!source) return null;
      return setState(Object.assign({}, replaceActiveDraft({
          id: null,
          kind: source.kind,
          name: source.name ? source.name + ' (Copy)' : '',
          description: source.description || '',
          rating: source.rating || 0,
          notes: source.notes || '',
          items: clone(source.formulaSnapshot.items || []),
          sourceId: source.sourceId || null
        }, source.kind), {
        selectedId: source.id
      }));
    }
  };

  global.MEDOVIK_RECIPE_LAB_SCHEMA_VERSION = RECIPE_LAB_SCHEMA_VERSION;
  global.RecipeLabStore = RecipeLabStore;
})(typeof window !== 'undefined' ? window : globalThis);
