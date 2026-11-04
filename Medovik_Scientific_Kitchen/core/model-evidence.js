/* Evidence classification concerns input provenance; it is not a confidence probability. */
(function(global){
  'use strict';
  function assessModelEvidence({claimType,compositionCoverage,hasMeasuredParameter=false,parameterSource='ENGINEERING_DEFAULT'}={}){
    const type=String(claimType||'').toUpperCase();
    const deterministic=new Set(['GEOMETRY','AREA','VOLUME','MASS_CONSERVATION','BAKERS_RATIO']);
    if (deterministic.has(type)) return {status:'DETERMINISTIC',reason:'قانون رياضي بمدخلات محددة؛ لا يثبت النتائج الحسية أو كثافة المادة.'};
    if (!Number.isFinite(compositionCoverage) || compositionCoverage<0.90) return {status:'INSUFFICIENT_EVIDENCE',reason:'التغطية التركيبية غير كافية لاستنتاج النموذج؛ حد 90% سياسة للمنتج.'};
    if (hasMeasuredParameter && parameterSource!=='ENGINEERING_DEFAULT') return {status:'MEASURED_INPUT',reason:'استُخدم قياس يورده المستخدم، ودقته وحدود تطبيقه مسؤولية مصدر القياس.'};
    if (hasMeasuredParameter) return {status:'MEASURED_INPUT',reason:'توجد قيمة مقاسة يوردها المستخدم، دون تحقق مختبري من دقتها.'};
    return {status:'BOUNDED_ESTIMATE',reason:'تقدير هندسي أو حسي مشروط بالتركيب والعملية؛ ليس نتيجة مثبتة تجريبيًا.'};
  }
  global.assessModelEvidence=assessModelEvidence;
})(typeof window!=='undefined'?window:globalThis);
