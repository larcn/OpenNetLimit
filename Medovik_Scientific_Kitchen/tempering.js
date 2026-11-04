/* Medovik v6 — volumetric thermal-equilibrium estimate for egg/hot-base mixing */
(function(global) {
  'use strict';
  const CP_EGG = 3.6;
  const CP_HOT = 2.2;

  function finite(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function mixTemperature(m1, cp1, t1, m2, cp2, t2) {
    const capacity = m1 * cp1 + m2 * cp2;
    return capacity > 0 ? (m1 * cp1 * t1 + m2 * cp2 * t2) / capacity : null;
  }

  function calcThermalMixing({ eggMass, eggTemp, hotMass, hotTemp, batches = 4, direction = 'HOT_BASE_INTO_EGG' } = {}) {
    const em = Math.max(0, finite(eggMass, 0));
    const hm = Math.max(0, finite(hotMass, 0));
    const et = finite(eggTemp, 20);
    const ht = finite(hotTemp, 80);
    const count = Math.max(1, Math.round(finite(batches, 4)));
    const steps = [];

    if (direction === 'EGG_INTO_HOT_BASE') {
      let currentMass = hm;
      let currentCp = CP_HOT;
      let currentTemp = ht;
      const batchMass = em / count;
      for (let i = 1; i <= count; i += 1) {
        const nextTemp = mixTemperature(currentMass, currentCp, currentTemp, batchMass, CP_EGG, et);
        const totalCapacity = currentMass * currentCp + batchMass * CP_EGG;
        currentMass += batchMass;
        currentCp = totalCapacity / currentMass;
        currentTemp = nextTemp;
        steps.push({ i, temp: nextTemp, addedMass: batchMass, direction });
      }
    } else {
      let currentMass = em;
      let currentCp = CP_EGG;
      let currentTemp = et;
      const batchMass = hm / count;
      for (let i = 1; i <= count; i += 1) {
        const nextTemp = mixTemperature(currentMass, currentCp, currentTemp, batchMass, CP_HOT, ht);
        const totalCapacity = currentMass * currentCp + batchMass * CP_HOT;
        currentMass += batchMass;
        currentCp = totalCapacity / currentMass;
        currentTemp = nextTemp;
        steps.push({ i, temp: nextTemp, addedMass: batchMass, direction: 'HOT_BASE_INTO_EGG' });
      }
    }

    const finalTemp = mixTemperature(em, CP_EGG, et, hm, CP_HOT, ht);
    return { steps, finalTemp, direction, cpEgg: CP_EGG, cpHot: CP_HOT };
  }

  function calcTempering(eggM, eggT, syrupM, syrupT, batches, direction) {
    return calcThermalMixing({ eggMass: eggM, eggTemp: eggT, hotMass: syrupM, hotTemp: syrupT, batches, direction }).steps;
  }

  global.calcThermalMixing = calcThermalMixing;
  global.calcTempering = calcTempering;
})(typeof window !== 'undefined' ? window : globalThis);
