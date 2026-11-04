const assert = require('assert');
const fs=require('fs');const vm=require('vm');const path=require('path');
const root=path.resolve(__dirname,'..');const ctx={console};vm.createContext(ctx);
for(const p of ['data/recipes.js','data/filling-catalog.js','data/science-content.js','data/evidence-register.js'])vm.runInContext(fs.readFileSync(path.join(root,p),'utf8'),ctx,{filename:p});
const refs=[
 ['smittenKitchen','https://smittenkitchen.com/2016/10/russian-honey-cake/'],
 ['davidCooking','https://thecookingfoodie.com/recipe/medovik-russian-honey-cake-recipe/']
];
for(const [id,uri] of refs){const item=ctx.getEvidenceRecord('dough',id);assert(item);assert(item.sources.some(x=>x.uri===uri),id+' source URL is absent');assert.notStrictEqual(item.status,'VERIFIED_PRIMARY',id+' not fully audited');}
assert.strictEqual(ctx.getEvidenceRecord('dough','ayaHabib').sources[0].uri,null);
console.log('PASS: primary source links documented without promoting unsupported recipe equivalence');
