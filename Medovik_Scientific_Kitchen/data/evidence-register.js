/* Data provenance is distinct from correctness of physical predictions.
 * All uninspected source references remain explicitly UNVERIFIED.
 */
(function(global){
  'use strict';
  const register={};
  function record(kind,id,{status='UNVERIFIED',sources=[],notes='',scope='metadata'}={}){
    const key=`${kind}:${id}`;
    register[key]=Object.freeze({key,status,sources:Object.freeze(sources.map(s=>Object.freeze(s))),notes,scope});
  }
  const TRACEABLE_RECIPE_PAGES = Object.freeze({
    smittenKitchen: Object.freeze({
      title: 'Smitten Kitchen — Russian Honey Cake',
      uri: 'https://smittenkitchen.com/2016/10/russian-honey-cake/',
      version: '2016-10-07 publication; page last updated 2024-11-04',
      checkedAt: '2026-10-24',
      caution: 'مطابقة جزئية لمقادير الوصفة؛ وزن البيض والملح والفانيليا بالجرام في التطبيق تحويلات تقديرية وليست قيمًا منشورة حرفيًا.'
    }),
    davidCooking: Object.freeze({
      title: 'The Cooking Foodie — Medovik Recipe',
      uri: 'https://thecookingfoodie.com/recipe/medovik-russian-honey-cake-recipe/',
      version: '2026-06-19',
      checkedAt: '2026-10-24',
      caution: 'اختلاف نسخة مثبت: التطبيق 450 جم دقيق ثابت؛ الموقع الحالي 440 جم ويذكر إضافة 85–90% مبدئيًا وإكمال المتبقي عند الحاجة. لا تُغيّر الوصفة المؤرشفة تلقائيًا.'
    })
  });
  Object.entries(global.MEDOVIK_RECIPE_PROFILES||{}).forEach(([id,recipe])=>{
    const link = TRACEABLE_RECIPE_PAGES[id];
    record('dough',id,{sources:[link ? {
      title: link.title,uri:link.uri,version:link.version,checkedAt:link.checkedAt
    } : {title:recipe.chef||recipe.name||id,uri:null,version:null,checkedAt:null}],
      // A retrievable source link does NOT independently validate every extracted quantity.
      status: 'UNVERIFIED',
      notes: link ? link.caution : 'هوية مؤلف الوصفة أو وصفها مسجلة، لكن نسخة المصدر الأولي لم تُطابق استقلاليًا.',
      scope:'original-ingredient-record'});
  });
  Object.entries(global.FILLING_CATALOG||{}).forEach(([id,item])=>{
    record('filling',id,{sources:[{title:item.name||id,uri:null,version:item.protocolSource||null,checkedAt:null}],
      notes:'الوصفة مسجلة في قاعدة الحشوات الأصلية؛ بيانات المصدر الخارجي ليست مثبتة.',scope:'original-filling-record'});
  });
  Object.entries(global.SCIENCE_CONTENT||{}).forEach(([id,note])=>{
    const sourceRefs=(note.references||[]).map(ref=>{
      const raw=String(ref.source||'');
      const uri=/^https?:\/\//i.test(raw)?raw:null;
      return {title:ref.label||raw,uri,version:raw||null,checkedAt:null};
    });
    const missingLegacy=(note.references||[]).some(ref=>/^v3\//.test(String(ref.source||'')));
    record('science',id,{status:missingLegacy?'NOT_AVAILABLE':'UNVERIFIED',sources:sourceRefs,
      notes:missingLegacy?'المراجع المحلية القديمة v3 غير موجودة في الحزمة المقدمة؛ لا يُعتمد الادعاء لمجرد إيرادها.':'لم تُراجع الأصول العلمية مراجعة مستقلة.',scope:'scientific-claim'});
  });
  global.MEDOVIK_EVIDENCE_REGISTRY=Object.freeze(register);
  global.getEvidenceRecord=function(kind,id){return register[`${kind}:${id}`]||null;};
})(typeof window!=='undefined'?window:globalThis);
