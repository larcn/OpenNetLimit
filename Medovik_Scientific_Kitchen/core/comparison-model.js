(function(global) {
  'use strict';

  function toFiniteOrNull(val) {
    return typeof val === 'number' && Number.isFinite(val) ? val : null;
  }

  function cleanNumber(val) {
    const r = Number(val.toFixed(12));
    return Object.is(r, -0) ? 0 : r;
  }

  function buildMetricRow(spec) {
    const safeSpec = spec && typeof spec === 'object' ? spec : {};
    const key = String(safeSpec.key || '');
    const label = String(safeSpec.label || key);
    const unit = safeSpec.unit ? String(safeSpec.unit) : '';
    const decimals = Number.isInteger(safeSpec.decimals) && safeSpec.decimals >= 0 ? safeSpec.decimals : 1;
    const tieTol = 0.5 * Math.pow(10, -decimals);

    const rawValues = Array.isArray(safeSpec.values) ? safeSpec.values : [];
    const normalized = rawValues.map(function(entry) {
      return {
        id: String((entry && entry.id) || ''),
        name: String((entry && entry.name) || (entry && entry.id) || ''),
        value: toFiniteOrNull(entry && entry.value)
      };
    });

    const nonNull = normalized.filter(function(entry) {
      return entry.value !== null;
    });

    let minVal = null;
    let maxVal = null;
    let allTied = false;

    if (nonNull.length >= 2) {
      minVal = Math.min.apply(null, nonNull.map(function(e) { return e.value; }));
      maxVal = Math.max.apply(null, nonNull.map(function(e) { return e.value; }));
      allTied = (maxVal - minVal) <= (tieTol + 1e-12);
    }

    const cells = normalized.map(function(entry) {
      if (entry.value === null || nonNull.length < 2) {
        return { id: entry.id, value: entry.value, mark: null };
      }
      if (allTied) {
        return { id: entry.id, value: entry.value, mark: 'tie' };
      }
      if (Math.abs(entry.value - maxVal) <= 1e-12) {
        return { id: entry.id, value: entry.value, mark: 'max' };
      }
      if (Math.abs(entry.value - minVal) <= 1e-12) {
        return { id: entry.id, value: entry.value, mark: 'min' };
      }
      return { id: entry.id, value: entry.value, mark: null };
    });

    let delta = null;
    if (normalized.length === 2 && normalized[0].value !== null && normalized[1].value !== null) {
      const a = normalized[0];
      const b = normalized[1];
      const absDiff = cleanNumber(Math.abs(a.value - b.value));
      const smallerAbs = Math.min(Math.abs(a.value), Math.abs(b.value));
      const relPct = smallerAbs > 1e-9 ? cleanNumber((absDiff / smallerAbs) * 100) : null;

      if (absDiff <= tieTol + 1e-12) {
        delta = {
          abs: absDiff,
          relPct,
          higherId: null,
          sentence: `الوصفتان متساويتان تقريبًا في ${label}`
        };
      } else {
        const higher = a.value > b.value ? a : b;
        const formattedAbs = Number(absDiff.toFixed(decimals));
        const unitPart = unit ? ` ${unit}` : '';
        delta = {
          abs: absDiff,
          relPct,
          higherId: higher.id,
          sentence: `${higher.name} أعلى في ${label} بمقدار ${formattedAbs}${unitPart}`
        };
      }
    }

    return {
      key,
      label,
      cells,
      delta
    };
  }

  function buildComparisonModel(input) {
    const safeInput = input && typeof input === 'object' ? input : {};
    const analyses = Array.isArray(safeInput.analyses) ? safeInput.analyses : [];
    const metricSpecs = Array.isArray(safeInput.metricSpecs) ? safeInput.metricSpecs : [];

    const familyIds = [];
    for (let i = 0; i < analyses.length; i += 1) {
      const fam = analyses[i] && analyses[i].familyId ? String(analyses[i].familyId).trim() : '';
      if (fam && familyIds.indexOf(fam) === -1) {
        familyIds.push(fam);
      }
    }

    const rows = metricSpecs.map(function(spec) {
      return buildMetricRow({
        key: spec.key,
        label: spec.label,
        unit: spec.unit || '',
        decimals: spec.decimals,
        values: analyses.map(function(entry) {
          const rawMetric = entry && entry.metrics ? entry.metrics[spec.key] : null;
          return {
            id: entry && entry.id,
            name: entry && entry.name,
            value: toFiniteOrNull(rawMetric)
          };
        })
      });
    });

    return {
      rows,
      crossFamily: familyIds.length > 1,
      familyIds
    };
  }

  function rankInLibrary(spec) {
    const safeSpec = spec && typeof spec === 'object' ? spec : {};
    const label = String(safeSpec.label || 'المؤشر');
    const targetValue = toFiniteOrNull(safeSpec.value);
    const familyId = safeSpec.familyId ? String(safeSpec.familyId).trim() : '';
    const rawPeers = Array.isArray(safeSpec.peers) ? safeSpec.peers : [];

    if (targetValue === null) {
      return {
        status: 'NO_VALUE',
        lowerCount: 0,
        peerCount: 0,
        scope: 'same-kind',
        sentence: `لا تتوفر قيمة صالحة لـ«${label}» لحساب الترتيب النسبي داخل المكتبة.`
      };
    }

    const validPeers = rawPeers
      .map(function(peer) {
        return {
          id: String((peer && peer.id) || ''),
          value: toFiniteOrNull(peer && peer.value),
          familyId: peer && peer.familyId ? String(peer.familyId).trim() : ''
        };
      })
      .filter(function(peer) {
        return peer.value !== null;
      });

    const sameFamilyPeers = familyId
      ? validPeers.filter(function(peer) { return peer.familyId === familyId; })
      : [];

    const useSameFamily = Boolean(familyId && sameFamilyPeers.length >= 2);
    const scope = useSameFamily ? 'same-family' : 'same-kind';
    const pool = useSameFamily ? sameFamilyPeers : validPeers;

    if (pool.length < 2) {
      return {
        status: 'INSUFFICIENT_PEERS',
        lowerCount: 0,
        peerCount: pool.length,
        scope,
        sentence: 'عدد الوصفات المرجعية غير كافٍ لحساب ترتيب نسبي داخل المكتبة.'
      };
    }

    const lowerCount = pool.filter(function(peer) {
      return peer.value < targetValue - 1e-12;
    }).length;
    const peerCount = pool.length;
    const scopeLabel = scope === 'same-family' ? 'ضمن العائلة نفسها' : 'ضمن النوع نفسه في المكتبة';

    return {
      status: 'RANKED',
      lowerCount,
      peerCount,
      scope,
      sentence: `أعلى في «${label}» من ${lowerCount} من أصل ${peerCount} وصفات (${scopeLabel}) — ترتيب نسبي داخل مكتبتك وليس لزوجة.`
    };
  }

  const MedovikComparison = Object.freeze({
    buildMetricRow,
    buildComparisonModel,
    rankInLibrary
  });

  global.MedovikComparison = MedovikComparison;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MedovikComparison;
  }
})(typeof window !== 'undefined' ? window : globalThis);
