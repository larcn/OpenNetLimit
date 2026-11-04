(function (global) {
  'use strict';

  const TIME_CUE_PATTERN = /^(\d+)(?:\s*–\s*(\d+))?\s*(ثانية|ثوان|ثواني|دقيقة|دقائق|ساعة|ساعات)$/;

  const UNIT_SECONDS = Object.freeze({
    'ثانية': 1,
    'ثوان': 1,
    'ثواني': 1,
    'دقيقة': 60,
    'دقائق': 60,
    'ساعة': 3600,
    'ساعات': 3600
  });

  function normalizeDigits(str) {
    return str
      .replace(/[\u0660-\u0669]/g, (ch) => String(ch.charCodeAt(0) - 0x0660))
      .replace(/[\u06F0-\u06F9]/g, (ch) => String(ch.charCodeAt(0) - 0x06F0));
  }

  function normalizeCueText(text) {
    return normalizeDigits(String(text))
      .replace(/[\u064B-\u0652]/g, '')
      .replace(/[-‒–—−]/g, '–')
      .trim();
  }

  function parseTimeCue(text) {
    if (typeof text !== 'string') return null;
    const normalized = normalizeCueText(text);
    if (!normalized) return null;

    const match = TIME_CUE_PATTERN.exec(normalized);
    if (!match) return null;

    const minRaw = Number(match[1]);
    const maxRaw = match[2] !== undefined ? Number(match[2]) : minRaw;
    const unitMultiplier = UNIT_SECONDS[match[3]];

    if (
      !Number.isFinite(minRaw) ||
      !Number.isFinite(maxRaw) ||
      !unitMultiplier ||
      maxRaw < minRaw
    ) {
      return null;
    }

    return {
      minSeconds: minRaw * unitMultiplier,
      maxSeconds: maxRaw * unitMultiplier
    };
  }

  function getTimerState(input) {
    if (!input || typeof input !== 'object') {
      throw new RangeError('Timer state input must be an object');
    }
    const { startedAtMs, minSeconds, maxSeconds, nowMs } = input;
    if (
      !Number.isFinite(startedAtMs) ||
      !Number.isFinite(minSeconds) ||
      !Number.isFinite(maxSeconds) ||
      !Number.isFinite(nowMs) ||
      minSeconds < 0 ||
      maxSeconds < minSeconds
    ) {
      throw new RangeError('Invalid timer bounds or timestamps');
    }

    const rawElapsed = (nowMs - startedAtMs) / 1000;
    const clockSkew = rawElapsed < 0;
    const elapsedSeconds = clockSkew ? 0 : rawElapsed;
    const remainingToMinSeconds = Math.max(0, minSeconds - elapsedSeconds);
    const remainingToMaxSeconds = Math.max(0, maxSeconds - elapsedSeconds);

    let phase;
    if (elapsedSeconds < minSeconds) {
      phase = 'running';
    } else if (minSeconds === maxSeconds || elapsedSeconds <= maxSeconds) {
      phase = 'window';
    } else {
      phase = 'overdue';
    }

    return {
      phase,
      elapsedSeconds,
      remainingToMinSeconds,
      remainingToMaxSeconds,
      clockSkew
    };
  }

  function formatDuration(seconds) {
    const num = Number(seconds);
    const totalSeconds = !Number.isFinite(num) || num <= 0 ? 0 : Math.floor(num);

    if (totalSeconds >= 3600) {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function createWakeLockController(nav, doc) {
    const supported = Boolean(
      nav &&
      nav.wakeLock &&
      typeof nav.wakeLock.request === 'function'
    );
    let wanted = false;
    let sentinel = null;
    let pendingRequest = null;

    function acquire() {
      if (!supported) return Promise.resolve(false);
      if (sentinel && !sentinel.released) return Promise.resolve(true);
      if (pendingRequest) return pendingRequest;

      let rawPromise;
      try {
        rawPromise = nav.wakeLock.request('screen');
      } catch (_) {
        sentinel = null;
        return Promise.resolve(false);
      }

      pendingRequest = Promise.resolve(rawPromise)
        .then((acquired) => {
          pendingRequest = null;
          if (!wanted) {
            if (acquired && typeof acquired.release === 'function') {
              Promise.resolve().then(() => acquired.release()).catch(() => {});
            }
            return false;
          }
          sentinel = acquired || null;
          if (sentinel && typeof sentinel.addEventListener === 'function') {
            try {
              sentinel.addEventListener('release', () => {
                if (sentinel === acquired) sentinel = null;
              });
            } catch (_) {
              // ignore listener errors on synthetic sentinels
            }
          }
          return Boolean(sentinel);
        })
        .catch(() => {
          pendingRequest = null;
          sentinel = null;
          return false;
        });

      return pendingRequest;
    }

    if (supported && doc && typeof doc.addEventListener === 'function') {
      try {
        doc.addEventListener('visibilitychange', () => {
          if (doc.visibilityState !== 'visible') {
            sentinel = null;
            return undefined;
          }
          if (wanted && (!sentinel || sentinel.released)) {
            return acquire();
          }
          return undefined;
        });
      } catch (_) {
        // ignore document listener errors
      }
    }

    return Object.freeze({
      supported,
      request() {
        if (!supported) return Promise.resolve(false);
        wanted = true;
        return acquire();
      },
      release() {
        wanted = false;
        const active = sentinel;
        sentinel = null;
        if (active && typeof active.release === 'function') {
          try {
            return Promise.resolve(active.release()).then(() => undefined, () => undefined);
          } catch (_) {
            return Promise.resolve(undefined);
          }
        }
        return Promise.resolve(undefined);
      },
      isHeld() {
        return Boolean(sentinel && !sentinel.released);
      }
    });
  }

  function createChime(AudioContextCtor) {
    let ctx = null;
    let unlocked = false;

    function scheduleTone(freqHz, startOffsetSec, durationSec) {
      const baseTime = Number(ctx.currentTime) || 0;
      const startAt = baseTime + startOffsetSec;
      const osc = ctx.createOscillator();
      const gain = typeof ctx.createGain === 'function' ? ctx.createGain() : null;

      osc.type = 'sine';
      if (osc.frequency && typeof osc.frequency.setValueAtTime === 'function') {
        osc.frequency.setValueAtTime(freqHz, startAt);
      } else if (osc.frequency) {
        osc.frequency.value = freqHz;
      }

      if (gain && ctx.destination) {
        if (gain.gain && typeof gain.gain.setValueAtTime === 'function') {
          gain.gain.setValueAtTime(0.12, startAt);
          if (typeof gain.gain.exponentialRampToValueAtTime === 'function') {
            gain.gain.exponentialRampToValueAtTime(0.001, startAt + durationSec);
          }
        }
        osc.connect(gain);
        gain.connect(ctx.destination);
      } else if (ctx.destination && typeof osc.connect === 'function') {
        osc.connect(ctx.destination);
      }

      osc.start(startAt);
      if (typeof osc.stop === 'function') {
        osc.stop(startAt + durationSec);
      }
    }

    return Object.freeze({
      async unlock() {
        if (typeof AudioContextCtor !== 'function') return false;
        try {
          if (!ctx) {
            ctx = new AudioContextCtor();
          }
          if (ctx && ctx.state === 'suspended' && typeof ctx.resume === 'function') {
            await ctx.resume();
          }
          unlocked = Boolean(ctx);
          return unlocked;
        } catch (_) {
          return false;
        }
      },
      play(kind) {
        if (!unlocked || !ctx) return false;
        if (kind !== 'window' && kind !== 'overdue') return false;
        try {
          if (kind === 'window') {
            scheduleTone(660, 0, 0.22);
          } else {
            scheduleTone(784, 0, 0.14);
            scheduleTone(784, 0.2, 0.14);
            scheduleTone(988, 0.4, 0.2);
          }
          return true;
        } catch (_) {
          return false;
        }
      }
    });
  }

  global.MedovikTimers = Object.freeze({
    parseTimeCue,
    getTimerState,
    formatDuration,
    createWakeLockController,
    createChime
  });
})(typeof window !== 'undefined' ? window : globalThis);
