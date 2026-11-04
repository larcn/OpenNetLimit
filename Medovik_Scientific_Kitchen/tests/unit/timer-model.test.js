'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { loadMedovik } = require('../harness/load-medovik');

const EXPECTED_TIME_CUES = Object.freeze({
  '10 دقائق': [600, 600],
  '10–15 ثانية': [10, 15],
  '10–15 دقيقة': [600, 900],
  '1–2 دقيقة': [60, 120],
  '1–3 دقائق': [60, 180],
  '20 دقيقة': [1200, 1200],
  '20–30 ثانية': [20, 30],
  '20–30 دقيقة': [1200, 1800],
  '2–3 ثوانٍ': [2, 3],
  '2–3 دقائق': [120, 180],
  '2–3 ساعات': [7200, 10800],
  '2–4 دقائق': [120, 240],
  '30 دقيقة': [1800, 1800],
  '30–40 ثانية': [30, 40],
  '30–45 ثانية': [30, 45],
  '30–45 دقيقة': [1800, 2700],
  '30–60 ثانية': [30, 60],
  '3–5 دقائق': [180, 300],
  '4–6 ساعات': [14400, 21600],
  '4–8 ساعات': [14400, 28800],
  '5–10 دقائق': [300, 600],
  '6–8 ساعات': [21600, 28800],
  '8–12 ساعة': [28800, 43200]
});

function collectStringsByKey(root, key, out = new Set()) {
  if (!root || typeof root !== 'object') return out;
  if (Array.isArray(root)) {
    root.forEach((item) => collectStringsByKey(item, key, out));
    return out;
  }
  for (const [k, v] of Object.entries(root)) {
    if (k === key && Array.isArray(v)) {
      v.forEach((s) => {
        if (typeof s === 'string') out.add(s);
      });
    } else if (v && typeof v === 'object') {
      collectStringsByKey(v, key, out);
    }
  }
  return out;
}

test('parseTimeCue يحلل النصوص الـ 23 الفعلية في MASTER_FILLINGS بدقة تامة', () => {
  const ctx = loadMedovik();
  const { parseTimeCue } = ctx.MedovikTimers;

  for (const [cue, [min, max]] of Object.entries(EXPECTED_TIME_CUES)) {
    assert.deepEqual(parseTimeCue(cue), { minSeconds: min, maxSeconds: max }, `Failed on cue: ${cue}`);
  }

  const collected = collectStringsByKey(ctx.MASTER_FILLINGS, 'timeCues');
  assert.equal(collected.size, Object.keys(EXPECTED_TIME_CUES).length);
  for (const cue of collected) {
    assert.notEqual(parseTimeCue(cue), null, `Expected non-null parse for collected cue: ${cue}`);
  }
  for (const key of Object.keys(EXPECTED_TIME_CUES)) {
    assert.equal(collected.has(key), true, `Expected collected MASTER_FILLINGS timeCues to contain: ${key}`);
  }
});

test('parseTimeCue يرفض المدخلات غير الزمنية ويقبل المتغيرات المطبّعة', () => {
  const ctx = loadMedovik();
  const { parseTimeCue } = ctx.MedovikTimers;

  for (const bad of ['', 'غير معروف', '15°م', '5–3 دقائق', '10 أيام', undefined, null, 42]) {
    assert.equal(parseTimeCue(bad), null, `Expected null for: ${String(bad)}`);
  }

  assert.deepEqual(parseTimeCue('2-3 ثواني'), { minSeconds: 2, maxSeconds: 3 });
  assert.deepEqual(parseTimeCue('2–3 ثوان'), { minSeconds: 2, maxSeconds: 3 });
  assert.deepEqual(parseTimeCue('5 - 10 دقائق'), { minSeconds: 300, maxSeconds: 600 });
  assert.deepEqual(parseTimeCue('٢–٣ دقائق'), { minSeconds: 120, maxSeconds: 180 });
  assert.deepEqual(parseTimeCue('5–7دقيقة'), { minSeconds: 300, maxSeconds: 420 });
});

test('getTimerState يحسب المراحل وفارق الساعة ويرمي RangeError عند المدخلات التالفة', () => {
  const ctx = loadMedovik();
  const { getTimerState } = ctx.MedovikTimers;

  const s0 = getTimerState({ startedAtMs: 0, minSeconds: 600, maxSeconds: 900, nowMs: 0 });
  assert.equal(s0.phase, 'running');
  assert.equal(s0.remainingToMinSeconds, 600);
  assert.equal(s0.clockSkew, false);

  assert.equal(
    getTimerState({ startedAtMs: 0, minSeconds: 600, maxSeconds: 900, nowMs: 599000 }).phase,
    'running'
  );
  assert.equal(
    getTimerState({ startedAtMs: 0, minSeconds: 600, maxSeconds: 900, nowMs: 600000 }).phase,
    'window'
  );
  assert.equal(
    getTimerState({ startedAtMs: 0, minSeconds: 600, maxSeconds: 900, nowMs: 900000 }).phase,
    'window'
  );
  assert.equal(
    getTimerState({ startedAtMs: 0, minSeconds: 600, maxSeconds: 900, nowMs: 900001 }).phase,
    'overdue'
  );

  // للقيمة المنفردة تبقى window بعد بلوغها ولا تتحول إلى overdue
  assert.equal(
    getTimerState({ startedAtMs: 0, minSeconds: 600, maxSeconds: 600, nowMs: 600000 }).phase,
    'window'
  );
  assert.equal(
    getTimerState({ startedAtMs: 0, minSeconds: 600, maxSeconds: 600, nowMs: 7200000 }).phase,
    'window'
  );

  // clockSkew عند تراجع الساعة
  const skew = getTimerState({ startedAtMs: 5000, minSeconds: 60, maxSeconds: 120, nowMs: 4000 });
  assert.equal(skew.phase, 'running');
  assert.equal(skew.elapsedSeconds, 0);
  assert.equal(skew.clockSkew, true);

  assert.throws(
    () => getTimerState({ startedAtMs: 0, minSeconds: 300, maxSeconds: 200, nowMs: 0 }),
    ctx.RangeError
  );
});

test('formatDuration ينسق المدد بأرقام لاتينية كـ MM:SS أو H:MM:SS', () => {
  const ctx = loadMedovik();
  const { formatDuration } = ctx.MedovikTimers;

  assert.equal(formatDuration(3725), '1:02:05');
  assert.equal(formatDuration(65), '01:05');
  assert.equal(formatDuration(0), '00:00');
  assert.equal(formatDuration(-5), '00:00');
  assert.equal(formatDuration(59.9), '00:59');
});

test('createWakeLockController يدعم الحالات غير المدعومة والرفض والنجاح وإعادة الطلب عند العودة إلى visible', async () => {
  const ctx = loadMedovik();
  const { createWakeLockController } = ctx.MedovikTimers;

  // غير مدعوم
  const dummyDoc = { visibilityState: 'visible', addEventListener() {} };
  const unsup = createWakeLockController(undefined, dummyDoc);
  assert.equal(unsup.supported, false);
  assert.equal(await unsup.request(), false);
  assert.equal(unsup.isHeld(), false);

  // يرفض
  const rejectingNav = {
    wakeLock: {
      async request() {
        throw new Error('Denied');
      }
    }
  };
  const rejCtrl = createWakeLockController(rejectingNav, dummyDoc);
  assert.equal(rejCtrl.supported, true);
  assert.equal(await rejCtrl.request(), false);
  assert.equal(rejCtrl.isHeld(), false);

  // ينجح ويعيد الطلب عند العودة إلى visible ولا يعيد بعد release()
  let reqCount = 0;
  let releaseCount = 0;
  let visHandler = null;
  let sentinelReleaseListener = null;
  const mockDoc = {
    visibilityState: 'visible',
    addEventListener(type, fn) {
      if (type === 'visibilitychange') visHandler = fn;
    }
  };
  const mockNav = {
    wakeLock: {
      async request(type) {
        assert.equal(type, 'screen');
        reqCount += 1;
        const sentinel = {
          released: false,
          addEventListener(evt, fn) {
            if (evt === 'release') sentinelReleaseListener = fn;
          },
          async release() {
            releaseCount += 1;
            sentinel.released = true;
            if (sentinelReleaseListener) sentinelReleaseListener();
          }
        };
        return sentinel;
      }
    }
  };

  const okCtrl = createWakeLockController(mockNav, mockDoc);
  assert.equal(await okCtrl.request(), true);
  assert.equal(okCtrl.isHeld(), true);
  assert.equal(reqCount, 1);

  // المتصفح يحرر القفل عند الاختفاء ثم يعيد المراقب طلبه عند الظهور
  mockDoc.visibilityState = 'hidden';
  if (sentinelReleaseListener) sentinelReleaseListener();
  if (visHandler) await visHandler();
  assert.equal(reqCount, 1);

  mockDoc.visibilityState = 'visible';
  if (visHandler) await visHandler();
  assert.equal(reqCount, 2);
  assert.equal(okCtrl.isHeld(), true);

  // بعد release() الصريح لا يُعاد الطلب
  await okCtrl.release();
  assert.equal(releaseCount >= 1, true);
  assert.equal(okCtrl.isHeld(), false);

  mockDoc.visibilityState = 'hidden';
  if (visHandler) await visHandler();
  mockDoc.visibilityState = 'visible';
  if (visHandler) await visHandler();
  assert.equal(reqCount, 2);
});

test('createChime لا يرمي عند غياب AudioContext ولا يرن قبل unlock ويرن بعده', async () => {
  const ctx = loadMedovik();
  const { createChime } = ctx.MedovikTimers;

  const noAudio = createChime(undefined);
  assert.equal(await noAudio.unlock(), false);
  assert.equal(noAudio.play('window'), false);

  let oscCreated = 0;
  let oscStarted = 0;
  class FakeAudioContext {
    constructor() {
      this.state = 'suspended';
      this.currentTime = 0;
      this.destination = {};
    }
    async resume() {
      this.state = 'running';
    }
    createOscillator() {
      oscCreated += 1;
      return {
        type: 'sine',
        frequency: { setValueAtTime() {} },
        connect() {},
        start() {
          oscStarted += 1;
        },
        stop() {}
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
          linearRampToValueAtTime() {}
        },
        connect() {}
      };
    }
  }

  const chime = createChime(FakeAudioContext);
  assert.equal(chime.play('window'), false);
  assert.equal(await chime.unlock(), true);
  assert.equal(chime.play('window'), true);
  assert.equal(oscCreated, 1);
  assert.equal(oscStarted, 1);

  assert.equal(chime.play('overdue'), true);
  assert.equal(oscCreated, 4); // 1 + 3 نغمات لـ overdue
  assert.equal(oscStarted, 4);
});

test('ProtocolAuthority يمرر إشارات الزمن (timeCues) في خطوات الحشو المشتقة من MASTER_FILLINGS', () => {
  const ctx = loadMedovik();
  ctx.SessionStore.init();
  ctx.SessionStore.setFilling('shouqi_2');
  const runbook = ctx.SessionStore.getRunbook();
  const fillingPhase = runbook.phases.find((p) => p.id === 'filling');
  const allControls = fillingPhase.steps.flatMap((s) => s.controls || []);
  assert.equal(
    allControls.some((c) => ctx.MedovikTimers.parseTimeCue(c.text) !== null),
    true,
    'Expected MASTER_FILLINGS fallback steps (e.g. shouqi_2) to carry parseable timeCues controls'
  );
});
