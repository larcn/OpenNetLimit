// =============================================================================
// Medovik Workflow v4 - Workflow Context Service
// Single contextual authority for analysis + science + troubleshooting +
// phase readiness. This replaces layered runtime wrappers.
// =============================================================================
(function(global) {
  'use strict';

  const PHASE_ALIASES = Object.freeze({
    planning: 'setup',
    plan: 'setup',
    review: 'review',
    finish: 'review',
    execution: 'baking'
  });

  function arrayify(value) {
    return Array.isArray(value) ? value : [];
  }

  function text(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function uniqBy(items, keyFn) {
    const out = [];
    const seen = new Set();
    arrayify(items).forEach(item => {
      const key = keyFn(item);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(item);
    });
    return out;
  }

  function normalizePhaseId(phaseId) {
    const raw = text(phaseId) || 'plan';
    return PHASE_ALIASES[raw] || raw;
  }

  function getSession(session = null) {
    if (session && typeof session === 'object') return session;
    return global.SessionStore?.get?.() || null;
  }

  function getRunbook(session = null) {
    const active = getSession(session);
    if (!active) return null;
    if (typeof global.SessionStore?.getRunbook === 'function') {
      const cached = global.SessionStore.getRunbook(active);
      if (cached?.phases?.length) return cached;
    }
    if (typeof global.RunbookCompiler?.compile === 'function') {
      try {
        return global.RunbookCompiler.compile(active);
      } catch (error) {
        console.warn('WorkflowContext failed to compile a fresh runbook:', error);
      }
    }
    return active.compiledRunbook?.phases?.length ? active.compiledRunbook : null;
  }


  function getPhaseObservations(phaseId, session = null) {
    const active = getSession(session);
    return arrayify(active?.execution?.observations || active?.executionState?.observations).filter(item => normalizePhaseId(item?.phaseId) === normalizePhaseId(phaseId));
  }

  function getPhaseDeviations(phaseId, session = null) {
    const active = getSession(session);
    return arrayify(active?.execution?.deviations || active?.executionState?.deviations).filter(item => normalizePhaseId(item?.phaseId) === normalizePhaseId(phaseId));
  }

  function getPhase(phaseId, session = null) {
    const runbook = getRunbook(session);
    const normalized = normalizePhaseId(phaseId);
    return arrayify(runbook?.phases).find(phase => phase.id === normalized) || null;
  }

  function getRecipe(session = null) {
    const active = getSession(session);
    return global.SessionStore?.resolveActiveRecipeProfile?.(active) || null;
  }

  function getFilling(session = null) {
    const active = getSession(session);
    return global.SessionStore?.resolveActiveFillingProfile?.(active) || null;
  }

  function getConfig(session = null) {
    return global.SessionStore?.resolveProductSpec?.(getSession(session)) || {};
  }

  function getSweetnessSettings(session = null) {
    return global.SessionStore?.resolveSweetnessSettings?.(getSession(session)) || {
      adjustmentPct: 0,
      target: 'filling'
    };
  }

  function getCurrentAnalysis(session = null) {
    const active = getSession(session);
    if (!active) return null;
    try {
      const recipe = getRecipe(active);
      const filling = getFilling(active);
      const config = getConfig(active);
      const sweetnessSettings = getSweetnessSettings(active);
      const combined = typeof global.FullAnalysis?.run === 'function'
        ? global.FullAnalysis.run(config, recipe, filling, sweetnessSettings.adjustmentPct, sweetnessSettings.target)
        : null;
      const batch = combined?.batch || null;
      const fillingBatch = combined?.filling || null;
      const sweetness = combined?.sweetness || null;
      const dough = combined?.dough || null;
      const context = batch?.context || dough?.context || sweetness?.context || null;
      const summary = context ? {
        keyPoints: arrayify(context?.notes || []).slice(0, 3),
        notes: arrayify(context?.notes || []),
        issues: arrayify(context?.issues || [])
      } : { keyPoints: [], notes: [], issues: [] };
      return {
        batch,
        filling: fillingBatch,
        sweetness,
        dough,
        structure: context?.structure || null,
        fillingAudit: context?.fillingAudit || null,
        timestamp: new Date().toISOString(),
        summary,
        context,
        recipe,
        fillingRecord: filling,
        config,
        adjustment: sweetnessSettings.adjustmentPct,
        sweetnessSettings,
        session: active,
        generatedFrom: 'WorkflowContext'
      };
    } catch (error) {
      console.warn('WorkflowContext: failed to build analysis', error);
      return null;
    }
  }

  function getAnalysisContext(session = null) {
    return getCurrentAnalysis(session);
  }

  function summarizeAnalysisForPhase(analysis, phaseId) {
    const phase = normalizePhaseId(phaseId);
    if (!analysis) return { warnings: [], notes: [], issues: [] };
    if (phase === 'dough' || phase === 'baking') {
      return {
        warnings: arrayify(analysis.dough?.issues).map(issue => issue?.message || issue?.label).filter(Boolean),
        notes: arrayify(analysis.summary?.notes),
        issues: arrayify(analysis.summary?.issues)
      };
    }
    if (phase === 'filling' || phase === 'assembly') {
      return {
        warnings: [analysis.fillingAudit?.summary].filter(Boolean).concat(arrayify(analysis.filling?.yieldAudit?.notes)),
        notes: arrayify(analysis.filling?.densityAudit?.notes),
        issues: arrayify(analysis.summary?.issues)
      };
    }
    return {
      warnings: arrayify(analysis.summary?.warnings),
      notes: arrayify(analysis.summary?.notes),
      issues: arrayify(analysis.summary?.issues)
    };
  }

  function getIngredientRowsForPhase(analysis, phaseId) {
    const phase = normalizePhaseId(phaseId);
    if (!analysis) return [];
    if (phase === 'filling' || phase === 'assembly') {
      return arrayify(analysis.filling?.ingredientRows || analysis.filling?.usableRows).slice(0, 8);
    }
    return arrayify(analysis.batch?.ingredientRows).slice(0, 8);
  }

  function getScienceNotes(phase) {
    const scienceIds = uniqBy(arrayify(phase?.steps).map(step => step?.scienceRef).filter(Boolean), item => item);
    return scienceIds.map(id => global.getScienceNote?.(id)).filter(Boolean);
  }

  function getProtocolFailureCards(phase) {
    const cards = [];
    arrayify(phase?.steps).forEach(step => {
      arrayify(step?.failureSignals).forEach((signal, index) => {
        if (!text(signal?.signal)) return;
        cards.push({
          id: `${step.id || 'step'}:failure:${index + 1}`,
          title: signal.signal,
          reason: signal.cause || step.purpose || 'إشارة انحراف مرتبطة بهذه الخطوة.',
          actions: signal.fix ? [signal.fix] : [],
          reference: step.operatorAction || null,
          severity: signal.severity || 'warning',
          source: 'protocol'
        });
      });
    });
    return cards;
  }

  function getAnalysisCards(analysis, phaseId) {
    const phase = normalizePhaseId(phaseId);
    if (!analysis) return [];
    const cards = [];

    if ((phase === 'dough' || phase === 'baking') && arrayify(analysis.dough?.issues).length) {
      cards.push({
        id: `analysis:${phase}:dough-band`,
        title: analysis.dough?.overall?.label || 'ملاحظة على نظام العجين',
        reason: analysis.context?.dough?.doughAudit?.summary || 'قراءة band audit تشير إلى حاجة لمراجعة.',
        actions: arrayify(analysis.dough?.issues).map(issue => issue?.message || issue?.label).filter(Boolean),
        reference: 'تحليل العجين الحالي',
        severity: analysis.dough?.overall?.level === 'needs-adjustment' ? 'critical' : 'warning',
        source: 'analysis'
      });
    }

    if ((phase === 'filling' || phase === 'assembly') && analysis.fillingAudit?.summary) {
      const densityStatus = analysis.filling?.densityAudit?.densityBand?.status;
      cards.push({
        id: `analysis:${phase}:filling-band`,
        title: densityStatus === 'ok' ? 'الحشو قريب من المرجع' : 'الحشو يحتاج مراجعة',
        reason: analysis.fillingAudit.summary,
        actions: arrayify(analysis.filling?.yieldAudit?.notes || analysis.filling?.densityAudit?.notes).filter(Boolean),
        reference: analysis.filling?.fillingName || 'تحليل الحشو',
        severity: densityStatus === 'ok' ? 'info' : 'warning',
        source: 'analysis'
      });
    }

    if (phase === 'review' && arrayify(analysis.summary?.keyPoints).length) {
      cards.push({
        id: 'analysis:review:summary',
        title: 'ملخص تحليلي للجلسة الحالية',
        reason: 'هذه النقاط مشتقة من الحسابات الحالية وليست مراجعة بشرية نهائية.',
        actions: arrayify(analysis.summary.keyPoints),
        reference: null,
        severity: 'info',
        source: 'analysis'
      });
    }

    return cards;
  }

  function countRequiredSteps(steps) {
    return arrayify(steps).filter(step => (step?.provenance?.completeness || 'partial') !== 'reference-only').length;
  }

  function countCompletedSteps(steps, session = null) {
    const active = getSession(session);
    const exec = active?.execution || active?.executionState || {};
    const completed = new Set(arrayify(exec.completedStepIds));
    return arrayify(steps).filter(step => step?.id && completed.has(step.id)).length;
  }

  function getScienceContext(phaseId = null, session = null) {
    const active = getSession(session);
    const exec = active?.execution || active?.executionState || {};
    const resolvedPhaseId = normalizePhaseId(phaseId || exec.currentPhase || 'plan');
    const phase = getPhase(resolvedPhaseId, active);
    const analysis = getAnalysisContext(active);
    return {
      phaseId: resolvedPhaseId,
      phase,
      notes: getScienceNotes(phase),
      ingredients: getIngredientRowsForPhase(analysis, resolvedPhaseId),
      analysis,
      filling: getFilling(active),
      recipe: getRecipe(active)
    };
  }

  function getTroubleshootingCards(phaseId = null, session = null) {
    const active = getSession(session);
    const exec = active?.execution || active?.executionState || {};
    const resolvedPhaseId = normalizePhaseId(phaseId || exec.currentPhase || 'plan');
    const phase = getPhase(resolvedPhaseId, active);
    const analysis = getAnalysisContext(active);
    const observationCards = getPhaseObservations(resolvedPhaseId, active).map(item => ({ id: item.id, title: item.text, reason: 'ملاحظة تشغيلية مسجلة داخل الجلسة.', actions: [], reference: null, severity: item.severity || 'info', source: 'observation' }));
    const deviationCards = getPhaseDeviations(resolvedPhaseId, active).map(item => ({ id: item.id, title: item.text, reason: 'انحراف تشغيلي مسجل داخل الجلسة.', actions: [], reference: null, severity: item.impact || 'warning', source: 'deviation' }));
    const cards = [
      ...observationCards,
      ...deviationCards,
      ...getProtocolFailureCards(phase),
      ...getAnalysisCards(analysis, resolvedPhaseId)
    ];
    return uniqBy(cards, card => `${card.title}|${card.reason}|${arrayify(card.actions).join('|')}`);
  }

  function getDiagnosticsContext(phaseId = null, session = null) {
    const active = getSession(session);
    const exec = active?.execution || active?.executionState || {};
    const resolvedPhaseId = normalizePhaseId(phaseId || exec.currentPhase || 'plan');
    const phase = getPhase(resolvedPhaseId, active);
    const analysis = summarizeAnalysisForPhase(getAnalysisContext(active), resolvedPhaseId);
    const troubleshootingCards = getTroubleshootingCards(resolvedPhaseId, active);
    const observations = getPhaseObservations(resolvedPhaseId, active);
    const deviations = getPhaseDeviations(resolvedPhaseId, active);
    return {
      phaseId: resolvedPhaseId,
      phase,
      analysis,
      observations,
      deviations,
      troubleshootingCards,
      warnings: arrayify(analysis?.warnings),
      notes: arrayify(analysis?.notes),
      issues: arrayify(analysis?.issues)
    };
  }

  function getPhaseSnapshot(phaseId = null, session = null) {
    const active = getSession(session);
    const exec = active?.execution || active?.executionState || {};
    const resolvedPhaseId = normalizePhaseId(phaseId || exec.currentPhase || 'plan');
    const phase = getPhase(resolvedPhaseId, active);
    const steps = arrayify(phase?.steps);
    const analysis = summarizeAnalysisForPhase(getAnalysisContext(active), resolvedPhaseId);
    const requiredSteps = countRequiredSteps(steps);
    const completedSteps = countCompletedSteps(steps, active);
    const partialSteps = steps.filter(step => (step?.provenance?.completeness || 'partial') !== 'full').length;
    return {
      phaseId: resolvedPhaseId,
      phase,
      requiredSteps,
      completedSteps,
      partialSteps,
      completionRatio: requiredSteps > 0 ? (completedSteps / requiredSteps) : 1,
      readyToAdvance: requiredSteps === 0 ? true : completedSteps >= requiredSteps,
      analysis,
      observations: getPhaseObservations(resolvedPhaseId, active),
      deviations: getPhaseDeviations(resolvedPhaseId, active),
      troubleshootingCards: getTroubleshootingCards(resolvedPhaseId, active),
      science: getScienceContext(resolvedPhaseId, active)
    };
  }

  const WorkflowContext = {
    normalizePhaseId,
    getSession,
    getRunbook,
    getCurrent: getAnalysisContext,
    getPhaseSummary(phaseId, session = null) {
      return summarizeAnalysisForPhase(getAnalysisContext(getSession(session)), phaseId);
    },
    getAnalysisContext,
    getScienceContext,
    getDiagnosticsContext,
    getTroubleshootingCards,
    getPhaseSnapshot,
    getPhaseObservations,
    getPhaseDeviations,
    getCurrentPhaseSnapshot(session = null) {
      const active = getSession(session);
      return getPhaseSnapshot((active?.execution || active?.executionState || {})?.currentPhase || 'plan', active);
    },
    getWorkflowSummary(session = null) {
      const active = getSession(session);
      const order = arrayify(global.SessionStore?.PHASE_ORDER || []);
      return order.map(phaseId => getPhaseSnapshot(phaseId, active));
    }
  };

  global.WorkflowContext = WorkflowContext;
})(typeof window !== 'undefined' ? window : globalThis);
