// Teste: nome de dívida comprido não quebra o selo "Ativa", e "A receber" tem título antes do resumo.
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});const p=await b.newPage({viewport:{width:390,height:900}});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.route('**/*',r=>r.request().url().startsWith('http://localhost:8099')?r.continue():r.abort());
await p.goto('http://localhost:8099/fin/index.html');
const r=await p.evaluate(()=>{S.sess={access:'x',refresh:'y',exp:Date.now()+3600000};S.ready=true;
 const R=(id,d)=>({id,kind:'debt',version:1,deleted_at:null,data:d});
 S.recs=[R('d1',{creditor:'Mercantil · Empréstimo Resolve PN (consignado INSS)',dir:'PAGAR',status:'ATIVA',kindD:'Empréstimo',balanceC:486300,firstInstC:48630,installC:48630,nInst:12,dueDay:7,firstDue:'2026-10-07',paidYm:['2026-10','2026-11']}),
  R('d2',{creditor:'Fabrício (guincho de Jeep)',dir:'RECEBER',status:'ATIVA',balanceC:150000,installC:150000,nInst:1,dueDay:6,firstDue:'2026-12-06'})];
 S.tab='debts';render();document.querySelectorAll('#lg').forEach(e=>e.remove());
 const tag=document.querySelector('.item .tag');const h=[...document.querySelectorAll('h2')].map(x=>x.innerText);
 const cards=[...document.querySelectorAll('.wrap > *')].map(x=>x.tagName+':'+(x.innerText||'').slice(0,18));
 return {tagH:Math.round(tag.getBoundingClientRect().height),tagW:Math.round(tag.getBoundingClientRect().width),h,cards};});
console.log(JSON.stringify(r));await p.screenshot({path:'/tmp/dividas85.png'});console.log('erros',errs);await b.close();})();
