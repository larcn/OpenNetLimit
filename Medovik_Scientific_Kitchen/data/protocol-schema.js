// =============================================================================
// Medovik Workflow v4 - Protocol Contracts & Validator
// Structured protocol only. No HTML is allowed as a source of truth.
// =============================================================================
(function(global) {
  'use strict';

  const PROTOCOL_COMPLETENESS = Object.freeze({
    FULL: 'full',
    PARTIAL: 'partial',
    REFERENCE_ONLY: 'reference-only'
  });

  const PROTOCOL_CONTROL_TYPES = Object.freeze([
    'temperature', 'time', 'mass', 'speed', 'thickness', 'ph',
    'qualitative', 'sensory', 'event', 'gate'
  ]);

  const PROTOCOL_CONFIDENCE = Object.freeze({
    EXPLICIT: 'explicit',
    DERIVED: 'derived',
    EDITORIAL: 'editorial',
    UNKNOWN: 'unknown'
  });

  function arrayify(value) {
    return Array.isArray(value) ? value : [];
  }

  function text(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function makeControl(control) {
    if (!control || typeof control !== 'object') return null;
    const type = PROTOCOL_CONTROL_TYPES.includes(control.type) ? control.type : 'qualitative';
    return {
      type,
      label: text(control.label),
      value: Number.isFinite(Number(control.value)) ? Number(control.value) : null,
      min: Number.isFinite(Number(control.min)) ? Number(control.min) : null,
      max: Number.isFinite(Number(control.max)) ? Number(control.max) : null,
      unit: text(control.unit) || null,
      text: text(control.text) || null,
      confidence: Object.values(PROTOCOL_CONFIDENCE).includes(control.confidence)
        ? control.confidence
        : PROTOCOL_CONFIDENCE.UNKNOWN
    };
  }

  function normalizeProtocolStep(rawStep, defaults = {}) {
    const inputs = arrayify(rawStep?.inputs).map(item => ({
      ingredientId: text(item?.ingredientId),
      amount: Number.isFinite(Number(item?.amount)) ? Number(item.amount) : null,
      unit: text(item?.unit) || null,
      note: text(item?.note) || null
    })).filter(item => item.ingredientId || item.note);

    const sensoryCues = arrayify(rawStep?.sensoryCues).map(cue => ({
      channel: text(cue?.channel) || 'visual',
      cue: text(cue?.cue)
    })).filter(cue => cue.cue);

    const failureSignals = arrayify(rawStep?.failureSignals).map(signal => ({
      signal: text(signal?.signal),
      cause: text(signal?.cause) || null,
      fix: text(signal?.fix) || null,
      severity: text(signal?.severity) || 'unknown'
    })).filter(signal => signal.signal);

    const provenance = {
      sourceType: text(rawStep?.provenance?.sourceType || defaults.sourceType || 'compiled'),
      sourceId: text(rawStep?.provenance?.sourceId || defaults.sourceId || 'unknown'),
      completeness: Object.values(PROTOCOL_COMPLETENESS).includes(rawStep?.provenance?.completeness)
        ? rawStep.provenance.completeness
        : (defaults.completeness || PROTOCOL_COMPLETENESS.PARTIAL)
    };

    return {
      id: text(rawStep?.id),
      phaseId: text(rawStep?.phaseId || defaults.phaseId),
      operatorAction: text(rawStep?.operatorAction),
      purpose: text(rawStep?.purpose) || null,
      inputs,
      tools: arrayify(rawStep?.tools).map(text).filter(Boolean),
      controls: arrayify(rawStep?.controls).map(makeControl).filter(Boolean),
      sensoryCues,
      readinessGate: rawStep?.readinessGate ? {
        condition: text(rawStep.readinessGate.condition),
        blockers: arrayify(rawStep.readinessGate.blockers).map(text).filter(Boolean),
        warning: text(rawStep.readinessGate.warning) || null
      } : null,
      failureSignals,
      outputState: text(rawStep?.outputState) || null,
      scienceRef: text(rawStep?.scienceRef) || null,
      provenance
    };
  }

  function validateProtocolStep(step) {
    const errors = [];
    if (!text(step?.id)) errors.push('Missing protocol step id.');
    if (!text(step?.phaseId)) errors.push(`Protocol step ${step?.id || '<unknown>'} is missing phaseId.`);
    if (!text(step?.operatorAction)) errors.push(`Protocol step ${step?.id || '<unknown>'} is missing operatorAction.`);

    const controls = arrayify(step?.controls);
    controls.forEach((control, index) => {
      if (!PROTOCOL_CONTROL_TYPES.includes(control?.type)) {
        errors.push(`Protocol step ${step?.id || '<unknown>'} control[${index}] has invalid type.`);
      }
      if (!text(control?.label) && !text(control?.text) && control?.value == null) {
        errors.push(`Protocol step ${step?.id || '<unknown>'} control[${index}] is empty.`);
      }
    });

    const hasEvaluableShape = controls.length > 0 || arrayify(step?.sensoryCues).length > 0 || text(step?.readinessGate?.condition);
    if (!hasEvaluableShape) {
      errors.push(`Protocol step ${step?.id || '<unknown>'} is not evaluable: add a control, sensory cue, or readiness gate.`);
    }

    return {
      ok: errors.length === 0,
      errors
    };
  }

  function normalizeProtocolPhase(rawPhase, defaults = {}) {
    const phaseId = text(rawPhase?.id || defaults.id);
    const steps = arrayify(rawPhase?.steps).map((step, index) => normalizeProtocolStep(step, {
      phaseId,
      sourceType: rawPhase?.provenance?.sourceType || defaults.sourceType,
      sourceId: rawPhase?.provenance?.sourceId || `${phaseId || 'phase'}:${index + 1}`,
      completeness: rawPhase?.provenance?.completeness || defaults.completeness
    }));
    return {
      id: phaseId,
      title: text(rawPhase?.title) || phaseId,
      description: text(rawPhase?.description) || null,
      steps,
      provenance: rawPhase?.provenance || null
    };
  }

  function validateProtocolPhase(phase) {
    const errors = [];
    if (!text(phase?.id)) errors.push('Missing phase id.');
    if (!text(phase?.title)) errors.push(`Phase ${phase?.id || '<unknown>'} is missing title.`);
    const steps = arrayify(phase?.steps);
    if (!steps.length) errors.push(`Phase ${phase?.id || '<unknown>'} has no steps.`);
    steps.forEach(step => {
      const result = validateProtocolStep(step);
      if (!result.ok) errors.push(...result.errors);
    });
    return { ok: errors.length === 0, errors };
  }

  global.PROTOCOL_COMPLETENESS = PROTOCOL_COMPLETENESS;
  global.PROTOCOL_CONTROL_TYPES = PROTOCOL_CONTROL_TYPES;
  global.PROTOCOL_CONFIDENCE = PROTOCOL_CONFIDENCE;
  global.normalizeProtocolStep = normalizeProtocolStep;
  global.validateProtocolStep = validateProtocolStep;
  global.normalizeProtocolPhase = normalizeProtocolPhase;
  global.validateProtocolPhase = validateProtocolPhase;
})(typeof window !== 'undefined' ? window : globalThis);
