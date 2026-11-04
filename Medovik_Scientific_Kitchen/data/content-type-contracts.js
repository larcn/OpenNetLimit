// =============================================================================
// Medovik Workflow v4 - Content Type Contracts
// Explicit separation of content domains. These contracts exist so the runtime
// does not mix protocol instructions, troubleshooting, science notes, and
// reference profiles into one ambiguous object.
// =============================================================================
(function(global) {
  'use strict';

  const CONTENT_TYPES = Object.freeze({
    PROTOCOL_STEP: 'ProtocolStep',
    TROUBLESHOOTING_RULE: 'TroubleshootingRule',
    SCIENCE_NOTE: 'ScienceNote',
    REFERENCE_PROFILE: 'ReferenceProfile'
  });

  const CONTENT_CONTRACTS = Object.freeze({
    ProtocolStep: {
      required: ['id', 'phaseId', 'operatorAction'],
      optional: ['purpose', 'inputs', 'tools', 'controls', 'sensoryCues', 'readinessGate', 'failureSignals', 'outputState', 'scienceRef', 'provenance']
    },
    TroubleshootingRule: {
      required: ['id', 'label'],
      optional: ['appliesTo', 'signals', 'causes', 'actions', 'severity', 'provenance']
    },
    ScienceNote: {
      required: ['id', 'title'],
      optional: ['summary', 'details', 'references', 'relatedIds', 'provenance']
    },
    ReferenceProfile: {
      required: ['id'],
      optional: ['processClass', 'mixingFamily', 'criticalControls', 'stopCues', 'failureSignals', 'targetDensityBand', 'expectedAirBand', 'confidence', 'calibrationNotes']
    }
  });

  global.CONTENT_TYPES = CONTENT_TYPES;
  global.CONTENT_CONTRACTS = CONTENT_CONTRACTS;
})(typeof window !== 'undefined' ? window : globalThis);
