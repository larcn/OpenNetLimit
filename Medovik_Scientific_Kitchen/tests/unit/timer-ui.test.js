'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createMemoryStorage } = require('../harness/load-medovik');
const { loadAppWithMiniDom } = require('../helpers/mini-dom');

function createFakeTimerEnv(options = {}) {
  let now = options.initialNowMs ?? 100000;
  let nextIntervalId = 1;
  const intervals = new Map();
  let oscCreated = 0;
  let vibrateCalls = 0;
  let wakeRequests = 0;
  let wakeReleases = 0;

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
        start() {},
        stop() {}
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {}
      };
    }
  }

  const wakeSupported = options.wakeSupported !== false;
  const navigatorObj = {
    vibrate() {
      vibrateCalls += 1;
      return true;
    }
  };
  if (wakeSupported) {
    navigatorObj.wakeLock = {
      async request() {
        wakeRequests += 1;
        let releaseHandler = null;
        const sentinel = {
          released: false,
          addEventListener(type, fn) {
            if (type === 'release') releaseHandler = fn;
          },
          async release() {
            wakeReleases += 1;
            sentinel.released = true;
            if (releaseHandler) releaseHandler();
          }
        };
        return sentinel;
      }
    };
  }

  let uuidSeq = 0;
  const cryptoObj = {
    randomUUID() {
      uuidSeq += 1;
      return `timer-uuid-${uuidSeq}`;
    }
  };

  function fakeSetInterval(fn, ms) {
    const id = nextIntervalId++;
    intervals.set(id, { fn, ms });
    return id;
  }

  function fakeClearInterval(id) {
    intervals.delete(id);
  }

  function tickAllIntervals() {
    for (const entry of Array.from(intervals.values())) {
      entry.fn();
    }
  }

  const storage = options.storage || createMemoryStorage();
  const { ctx, document } = loadAppWithMiniDom({
    storage,
    extraGlobals: {
      AudioContext: FakeAudioContext,
      navigator: navigatorObj,
      crypto: cryptoObj,
      setInterval: fakeSetInterval,
      clearInterval: fakeClearInterval
    },
    beforeAppRun(c) {
      const realmDate = require('node:vm').runInContext('Date', c);
      realmDate.now = () => now;
    }
  });

  return {
    ctx,
    document,
    storage,
    setNow(ms) {
      now = ms;
    },
    advance(deltaMs) {
      now += deltaMs;
      tickAllIntervals();
    },
    getActiveIntervalCount() {
      return intervals.size;
    },
    getOscCreated() {
      return oscCreated;
    },
    getVibrateCalls() {
      return vibrateCalls;
    },
    getWakeRequests() {
      return wakeRequests;
    },
    getWakeReleases() {
      return wakeReleases;
    }
  };
}

test('واجهة المؤقتات تعرض «ابدأ مؤقتًا» لإشارات الزمن القابلة للتحليل فقط وتحدث العدّ والتنبيه دون لمس SessionStore أو فقدان التركيز', async () => {
  const env = createFakeTimerEnv({ initialNowMs: 100000 });
  const { ctx, document } = env;

  ctx.SessionStore.setFilling('classic_sourcream_frosting');
  ctx.SessionStore.setActiveStep('filling');

  const startButtons = document.querySelectorAll('[data-start-timer-cue]');
  assert.equal(startButtons.length > 0, true, 'Expected start timer buttons on classic_sourcream_frosting filling protocol');

  const targetBtn = startButtons.find((btn) => btn.getAttribute('data-start-timer-cue') === '2–3 ثوانٍ');
  assert.ok(targetBtn, 'Expected start timer button for «2–3 ثوانٍ»');

  // لا يوجد أي زر لمؤقت حراري
  assert.equal(
    startButtons.some((btn) => (btn.getAttribute('data-start-timer-cue') || '').includes('°')),
    false
  );

  // ركّز على حقل إدخال للتحقق من عدم ضياع التركيز أثناء العدّ
  const anyInput = document.querySelector('input');
  if (anyInput) {
    anyInput.focus();
  }

  targetBtn.click();
  await new Promise((r) => setImmediate(r));

  const savedTimers = ctx.SessionStore.getBench().timers;
  assert.equal(savedTimers.length, 1);
  assert.equal(savedTimers[0].cueText, '2–3 ثوانٍ');
  assert.equal(savedTimers[0].minSeconds, 2);
  assert.equal(savedTimers[0].maxSeconds, 3);
  assert.equal(env.getWakeRequests(), 1);
  assert.equal(env.getActiveIntervalCount(), 1);

  // بدء مؤقت ثانٍ لا ينشئ حلقة setInterval ثانية
  targetBtn.click();
  await Promise.resolve();
  assert.equal(ctx.SessionStore.getBench().timers.length, 2);
  assert.equal(env.getActiveIntervalCount(), 1);

  // أوقف المؤقت الثاني لنختبر الأول بوضوح
  const stopBtnsInitial = document.querySelectorAll('[data-stop-timer-id]');
  assert.equal(stopBtnsInitial.length, 2);
  stopBtnsInitial[1].click();
  assert.equal(ctx.SessionStore.getBench().timers.length, 1);

  // راقب عدم استدعاء SessionStore داخل حلقة العدّ
  let storeCallsDuringTick = 0;
  const origGetBench = ctx.SessionStore.getBench;
  const origSetBench = ctx.SessionStore.setBench;
  ctx.SessionStore.getBench = function (...args) {
    storeCallsDuringTick += 1;
    return origGetBench.apply(this, args);
  };
  ctx.SessionStore.setBench = function (...args) {
    storeCallsDuringTick += 1;
    return origSetBench.apply(this, args);
  };

  if (anyInput) {
    anyInput.focus();
  }

  const timerNode = document.querySelector('[data-timer-id="timer-uuid-1"]');
  assert.ok(timerNode, 'Expected [data-timer-id="timer-uuid-1"] node');
  assert.equal(timerNode.getAttribute('data-phase'), 'running');

  // الثانية 1: ما زال running بلا رنين
  env.advance(1000);
  assert.equal(storeCallsDuringTick, 0, 'SessionStore must not be called inside setInterval loop');
  assert.equal(timerNode.getAttribute('data-phase'), 'running');
  assert.equal(env.getOscCreated(), 0);

  // الثانية 2: دخول window ← نغمة واحدة + اهتزاز + إعلان aria-live=polite
  env.advance(1000);
  assert.equal(storeCallsDuringTick, 0);
  assert.equal(timerNode.getAttribute('data-phase'), 'window');
  assert.equal(env.getOscCreated(), 1);
  assert.equal(env.getVibrateCalls(), 1);
  const liveNode = document.querySelector('[data-timer-live="true"]');
  assert.ok(liveNode);
  assert.equal(liveNode.getAttribute('aria-live'), 'polite');
  assert.equal(liveNode.textContent.includes('2–3 ثوانٍ'), true);

  // الثانية 2.5: ما زال في window فلا يتكرر الرنين
  env.advance(500);
  assert.equal(env.getOscCreated(), 1);

  // بعد الثانية 3: دخول overdue ← 3 نغمات إضافية (المجموع 4)
  env.advance(501);
  assert.equal(timerNode.getAttribute('data-phase'), 'overdue');
  assert.equal(env.getOscCreated(), 4);
  assert.equal(env.getVibrateCalls(), 2);

  if (anyInput) {
    assert.equal(document.activeElement, anyInput, 'Focused input must remain focused across ticks');
  }

  ctx.SessionStore.getBench = origGetBench;
  ctx.SessionStore.setBench = origSetBench;

  // إيقاف آخر مؤقت يحرر Wake Lock ويوقف الحلقة
  const stopBtn = document.querySelector('[data-stop-timer-id="timer-uuid-1"]');
  assert.ok(stopBtn);
  stopBtn.click();
  await Promise.resolve();
  assert.equal(ctx.SessionStore.getBench().timers.length, 0);
  assert.equal(env.getWakeReleases() >= 1, true);
  assert.equal(env.getActiveIntervalCount(), 0);
});

test('إعادة التحميل تستأنف المؤقت بصمت، والعودة من الخلفية تعيد الحساب وWake Lock، وclockSkew وعدم دعم Wake Lock يعرضان تنبيهين هادئين', async () => {
  const sharedStorage = createMemoryStorage();

  // الجلسة الأولى على متصفح لا يدعم Wake Lock: تبدأ مؤقت «2–3 ثوانٍ» عند t=100000
  const env1 = createFakeTimerEnv({
    storage: sharedStorage,
    initialNowMs: 100000,
    wakeSupported: false
  });
  env1.ctx.SessionStore.setFilling('classic_sourcream_frosting');
  env1.ctx.SessionStore.setActiveStep('filling');

  const btn1 = env1.document
    .querySelectorAll('[data-start-timer-cue]')
    .find((b) => b.getAttribute('data-start-timer-cue') === '2–3 ثوانٍ');
  btn1.click();
  await Promise.resolve();

  const unsupNotice = env1.document.querySelector('[data-timer-wakelock-notice="true"]');
  assert.ok(unsupNotice);
  assert.equal(
    unsupNotice.textContent.includes('جهازك لا يدعم إبقاء الشاشة مضاءة؛ فعّل ذلك يدويًا'),
    true
  );

  // الجلسة الثانية (إعادة تحميل الصفحة عند t=102500 أي داخل window بالفعل): لا تعيد نغمات سابقة
  const env2 = createFakeTimerEnv({
    storage: sharedStorage,
    initialNowMs: 102500,
    wakeSupported: true
  });
  // اضبط الساعة بعد التهيئة وحرّك نبضة للتحقق من الصمت للمرحلة التي مضت عند التحميل
  const reloadedNode = env2.document.querySelector('[data-timer-id="timer-uuid-1"]');
  assert.ok(reloadedNode);
  env2.advance(100); // t=102600 ما زال في window التي كانت قائمة وقت التحميل
  assert.equal(reloadedNode.getAttribute('data-phase'), 'window');
  assert.equal(env2.getOscCreated(), 0, 'Must not chime on reload for already-entered window phase');

  // محاكاة إخفاء التبويب دقيقة ثم العودة إلى visible
  env2.document.visibilityState = 'hidden';
  env2.document.dispatchEvent({ type: 'visibilitychange' });
  env2.setNow(162600);
  env2.document.visibilityState = 'visible';
  env2.document.dispatchEvent({ type: 'visibilitychange' });
  await Promise.resolve();

  assert.equal(reloadedNode.getAttribute('data-phase'), 'overdue');
  assert.equal(env2.getWakeRequests() >= 1, true);

  // محاكاة تراجع ساعة الجهاز (clockSkew: nowMs < startedAtMs)
  env2.setNow(90000);
  env2.advance(0);
  const skewNotice = env2.document.querySelector('[data-timer-skew-notice="true"]');
  assert.ok(skewNotice);
  assert.equal(skewNotice.hidden, false);
  assert.equal(skewNotice.textContent.includes('ساعة الجهاز'), true);
});
