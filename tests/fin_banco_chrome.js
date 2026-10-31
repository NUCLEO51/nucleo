// Teste do importador do extrato do banco (Santander). Precisa de dois arquivos locais (não vão para o git):
// BANK_XLSX = extrato do banco, MOB_JSON = lançamentos atuais da conta (lista JSON). Servidor: python3 -m http.server 8099
const { chromium } = require('playwright');const fs=require('fs');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});
  const p=await b.newPage({viewport:{width:390,height:800}});
  const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.route('**/*',r=>r.request().url().startsWith('http://localhost:8099')?r.continue():r.abort());
  await p.goto('http://localhost:8099/fin/index.html');
  const mob=JSON.parse(fs.readFileSync(process.env.MOB_JSON,'utf8'));mob.push({i:'2026-11-03-x-1',d:'2026-11-03',c:150000,k:'TRANSFER',t:'x',g:''});
  await p.evaluate(m=>{
    S.sess={access:'x',refresh:'y',exp:Date.now()+3600000};S.ready=true;S.msg='';S.tab='stmt';
    S.recs=[{id:'s1',kind:'stmt',version:1,deleted_at:null,data:{account:'Santander · Conta Corrente (final 2450-3)',bank:'Santander',agency:'0334',openingC:null,overdraftC:null,entries:m}}];
    window.__upd=null;Api.update=async(rec,data)=>{window.__upd=data;rec.data=JSON.parse(JSON.stringify(data));return rec;};render();
  },mob);
  await p.setInputFiles('#stfile',process.env.BANK_XLSX);
  await p.waitForSelector('.modal');
  const txt=await p.evaluate(()=>document.querySelector('.modal').innerText);console.log(txt);
  await p.evaluate(()=>{document.querySelector('#cf-no').click();});
  const n0=await p.evaluate(()=>window.__upd);console.log('sem confirmar gravou:',n0!==null);
  await p.setInputFiles('#stfile',process.env.BANK_XLSX);await p.waitForSelector('.modal');
  await p.evaluate(()=>document.querySelector('#cf-ok').click());await p.waitForFunction(()=>window.__upd);
  const r=await p.evaluate(()=>{const d=window.__upd,t='2026-10-31';let ok=d.openingC;d.entries.forEach(e=>{if(e.d<=t)ok+=e.c});
    const sem=d.entries.filter(e=>e.d>='2026-08-03'&&e.d<='2026-10-31'&&!e.g).length;
    return {opening:d.openingC,saldoHoje:ok,n:d.entries.length,semCat:sem,futuro:d.entries.filter(e=>e.d>'2026-10-31').length,account:d.account,agency:d.agency,source:d.source};});
  console.log(JSON.stringify(r));
  /* importar de novo não duplica */
  await p.evaluate(()=>{window.__upd=null;});await p.setInputFiles('#stfile',process.env.BANK_XLSX);await p.waitForSelector('.modal');await p.evaluate(()=>document.querySelector('#cf-ok').click());await p.waitForFunction(()=>window.__upd);
  console.log('reimport n:',await p.evaluate(()=>window.__upd.entries.length),'opening:',await p.evaluate(()=>window.__upd.openingC));
  console.log('erros:',errs);await b.close();
})();
