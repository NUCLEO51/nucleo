// Todos os cartões de dívida têm as mesmas linhas: Total, Saldo, Parcela.
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});const p=await b.newPage({viewport:{width:390,height:900}});
await p.route('**/*',r=>r.request().url().startsWith('http://localhost:8099')?r.continue():r.abort());
await p.goto('http://localhost:8099/fin/index.html');
const r=await p.evaluate(()=>{S.sess={access:'x',refresh:'y',exp:Date.now()+3600000};S.ready=true;const cur=ymOf(todayIso());
 const D=(id,d)=>({id,kind:'debt',version:1,deleted_at:null,data:Object.assign({dir:'PAGAR',status:'ATIVA',paidYm:[],dueDay:10,firstDue:addMonths(cur,1)+'-10'},d)});
 S.recs=[D('a',{creditor:'Tênis',nInst:6,firstInstC:5499,installC:5900,balanceC:29500,paidYm:[cur],firstDue:cur+'-02',dueDay:2}),D('b',{creditor:'Remédio Dr. Magaldi (Poupe Já)',nInst:2,firstInstC:13600,installC:13600,balanceC:27200,note:'texto longo '.repeat(30)})];
 S.tab='debts';render();
 return [...document.querySelectorAll('[data-act="debt-edit"]')].map(el=>[...el.querySelectorAll('.row .mut')].map(x=>x.innerText));});
console.log(JSON.stringify(r));await b.close();})();
