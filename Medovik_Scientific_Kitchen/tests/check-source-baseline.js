#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm');
const root=path.resolve(__dirname,'..'),fixture=path.join(__dirname,'fixtures/medovik-v6-source-baseline.json');
const files=['data/recipes.js','data/master-fillings-data.js','data/science-content.js','data/protocol-authority.js'];
function sha(p){return crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p),'utf8').replace(/\r\n/g,'\n')).digest('hex');}
const context={};context.window=context;context.globalThis=context;vm.createContext(context);
for (const file of ['data/recipes.js','data/master-fillings-data.js','data/filling-catalog.js','data/science-content.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
const actual={sourceHashes:Object.fromEntries(files.map(f=>[f,sha(f)])),doughIds:Object.keys(context.MEDOVIK_RECIPE_PROFILES).sort(),fillingIds:Object.keys(context.FILLING_CATALOG).sort(),scienceIds:Object.keys(context.SCIENCE_CONTENT).sort()};
if(process.argv.includes('--write-baseline')){fs.writeFileSync(fixture,JSON.stringify(actual,null,2)+'\n'); console.log('BASELINE_CREATED',fixture);process.exit(0);}
if(!fs.existsSync(fixture)){console.error('FAIL: source baseline fixture not found');process.exit(1);}
const expected=JSON.parse(fs.readFileSync(fixture,'utf8'));
if(actual.doughIds.length!==9||actual.fillingIds.length!==9||JSON.stringify(expected)!==JSON.stringify(actual)){console.error('FAIL: source hashes or IDs changed against original approved ZIP baseline');process.exit(1);}
console.log('PASS: exact original hashes and identities preserved (9 dough, 9 fillings).');
