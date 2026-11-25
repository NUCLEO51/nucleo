const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:800}});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.route('**/*',r=>r.request().url().startsWith('http://localhost:8099')?r.continue():r.abort());
await p.goto('http://localhost:8099/fin/index.html');
const r=await p.evaluate(()=>{S.sess={access:'x',refresh:'y',exp:Date.now()+3600000};S.ready=true;S.recs=[];S.fr=[{id:'r1',version:1,data:{title:'Pagar remédio',date:todayIso(),time:'09:00',done:false,alarms:[],repeat:'none'}}];S.frLoaded=true;S.tab='home';render();
 const t=()=>document.body.innerText.includes('Pagar remédio');const o={aberto1:t()};
 document.querySelector('[data-act="hr-toggle"]').click();o.fechado=!t();
 document.querySelector('[data-act="hr-toggle"]').click();o.reaberto=t();return o;});
console.log(JSON.stringify(r),errs);await b.close();})();
