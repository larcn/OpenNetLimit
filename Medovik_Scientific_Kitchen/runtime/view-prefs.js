/* Presentation preference only: no recipe/session/calculation changes. */
(function(global){
 'use strict';
 let mode='cook';
 global.MedovikViewPrefs=Object.freeze({
   getMode(){return mode;},
   setMode(value){if(value!=='cook'&&value!=='advanced')return false;mode=value;return true;}
 });
})(typeof window!=='undefined'?window:globalThis);
