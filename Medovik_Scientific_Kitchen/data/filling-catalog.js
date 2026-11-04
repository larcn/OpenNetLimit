// =============================================================================
// Medovik Workflow v4 - Canonical Filling Catalog
// Canonical active truth for filling selection. Legacy ids are resolved through
// aliases, but runtime selection should use canonical ids.
// =============================================================================
(function(global) {
  'use strict';

  const LEGACY_FILLING_ID_ALIASES = Object.freeze({
    classicSourCream: 'classic_sourcream_frosting',
    dulceDeLeche: 'classic_dulce_sourcream',
    shouqi: 'shouqi_1'
  });


  const APPLICATION_DEFAULTS = Object.freeze({
    classic_sourcream_frosting: Object.freeze({ gaps: true, top: 'conditional', sides: 'conditional' }),
    classic_dulce_sourcream: Object.freeze({ gaps: true, top: 'conditional', sides: 'not-recommended' }),
    shouqi_1: Object.freeze({ gaps: true, top: true, sides: 'conditional' }),
    shouqi_2: Object.freeze({ gaps: true, top: 'conditional', sides: 'conditional' }),
    shouqi_3: Object.freeze({ gaps: true, top: true, sides: true }),
    ayahabib: Object.freeze({ gaps: true, top: 'conditional', sides: 'conditional' }),
    hiba: Object.freeze({ gaps: true, top: true, sides: 'conditional' }),
    younis_cream1: Object.freeze({ gaps: true, top: true, sides: true }),
    younis_cream2: Object.freeze({ gaps: 'thin-only', top: 'conditional', sides: 'conditional' })
  });

  function stripHtml(html) {
    return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function resolveFillingId(id) {
    const raw = String(id || '').trim();
    if (!raw) return 'classic_sourcream_frosting';
    return LEGACY_FILLING_ID_ALIASES[raw] || raw;
  }

  function toCatalogRecord(item) {
    const summary = stripHtml(item?.overviewHtml || item?.origin || '');
    return {
      id: item.id,
      name: item.name || item.shortName || item.id,
      shortName: item.shortName || item.name || item.id,
      description: summary,
      designDensity: item.designDensity ?? null,
      defaultTotal: item.defaultTotal ?? null,
      base: Array.isArray(item.base) ? item.base.map(part => ({ ...part })) : [],
      profile: item.profile || null,
      calibration: item.calibration || null,
      yieldModel: item.yieldModel || null,
      masterStages: Array.isArray(item.masterStages) ? item.masterStages.map(stage => ({ ...stage })) : [],
      protocolSource: item.protocolSource || null,
      applicationSuitability: item.applicationSuitability || APPLICATION_DEFAULTS[item.id] || { gaps: true, top: 'conditional', sides: 'conditional' },
      legacyAlias: Object.keys(LEGACY_FILLING_ID_ALIASES).find(key => LEGACY_FILLING_ID_ALIASES[key] === item.id) || null,
      sourceRecord: item
    };
  }

  const MASTER_SOURCE = Array.isArray(global.MASTER_FILLINGS) ? global.MASTER_FILLINGS : ((typeof MASTER_FILLINGS !== 'undefined' && Array.isArray(MASTER_FILLINGS)) ? MASTER_FILLINGS : []);
  const FILLING_CATALOG = Object.freeze(Object.fromEntries(MASTER_SOURCE.map(item => [item.id, toCatalogRecord(item)])));

  function getFillingRecord(id) {
    const canonicalId = resolveFillingId(id);
    return FILLING_CATALOG[canonicalId] || null;
  }

  function listFillings() {
    return Object.values(FILLING_CATALOG);
  }


  global.LEGACY_FILLING_ID_ALIASES = LEGACY_FILLING_ID_ALIASES;
  global.DEFAULT_FILLING_ID = 'classic_sourcream_frosting';
  global.FILLING_CATALOG = FILLING_CATALOG;
  global.resolveFillingId = resolveFillingId;
  global.getFillingRecord = getFillingRecord;
  global.listFillings = listFillings;
})(typeof window !== 'undefined' ? window : globalThis);
