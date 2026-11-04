/* Checks mass-volume-area consistency; absence of density is never fabricated. */
(function(global) {
  'use strict';
  function positive(n) { return typeof n === 'number' && Number.isFinite(n) && n > 0; }
  function auditThicknessConsistency({areaCm2,layers,rawThicknessMm,targetBakedThicknessMm,netRawMass,bakedMass,rawDensity=null,bakedDensity=null,toleranceRel=0.05}={}) {
    const warnings=[];
    let checked=0, conflicts=0;
    const area=Number(areaCm2)*Number(layers);
    const expected=(mass,density)=>positive(mass)&&positive(density)&&positive(area) ? 10*mass/(density*area) : null;
    const predictedRawThicknessMm=expected(netRawMass,rawDensity);
    const predictedBakedThicknessMm=expected(bakedMass,bakedDensity);
    const compare=(given,predicted,label)=>{
      if (!positive(given)||!positive(predicted)) return;
      checked++;
      const gap=Math.abs(given-predicted)/predicted;
      if (gap>Math.max(0,toleranceRel)) {
        conflicts++;
        warnings.push(`${label}: السماكة المدخلة ${given.toFixed(2)} مم لا تتفق مع حساب الكتلة/المساحة/الكثافة (${predicted.toFixed(2)} مم).`);
      }
    };
    compare(rawThicknessMm,predictedRawThicknessMm,'الفرد الخام');
    compare(targetBakedThicknessMm,predictedBakedThicknessMm,'الطبقة المخبوزة');
    if (!positive(rawDensity)) warnings.push('كثافة العجين الخام غير متاحة، لذلك لا يمكن إثبات اتساق سمك الفرد الخام.');
    if (!positive(bakedDensity)) warnings.push('كثافة المخبوز المقاسة غير متاحة؛ لا يصح إصدار حكم اتساق للسمك المخبوز.');
    return {status:conflicts?'CONFLICT':checked?'CONSISTENT':'INSUFFICIENT_DATA',predictedRawThicknessMm,predictedBakedThicknessMm,warnings};
  }
  global.auditThicknessConsistency=auditThicknessConsistency;
})(typeof window!=='undefined'?window:globalThis);
