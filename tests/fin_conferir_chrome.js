// Teste: conferir com o saldo do topo do banco; diferença igual ao cheque retido libera o cheque.
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});const p=await b.newPage({viewport:{width:390,height:900}});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.route('**/*',r=>r.request().url().startsWith('http://localhost:8099')?r.continue():r.abort());
await p.addInitScript(()=>localStorage.setItem('fin-confirm','1'));await p.goto('http://localhost:8099/fin/index.html');
const r=await p.evaluate(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));const out={};
 S.sess={access:'x',refresh:'y',exp:Date.now()+3600000};S.ready=true;
 const t=todayIso(),amanha=isoDate(new Date(Date.now()+86400000));
 const mk=()=>({id:'s1',kind:'stmt',version:1,deleted_at:null,data:{account:'Santander · Conta Corrente (final 2450-3)',bank:'Santander',openingC:-100000,entries:[{i:'a',d:t,c:-796655,k:'EXPENSE',t:'x'},{i:'ch',d:amanha,dd:t,c:150000,k:'TRANSFER',t:'Dep cheque atm'}]}});
 S.recs=[mk()];const upd=[];Api.update=async(r,d)=>{upd.push(d);r.data=d;};
 S.tab='contas';S.contaId='s1';render();out.card=document.body.innerText.includes('Cheque ainda retido');
 const rodar=async(v,sg)=>{contaChk(S.recs[0]);await wait(60);const iv=document.querySelector('#f-v'),se=document.querySelector('#f-sg');iv.value=v;se.value=sg;document.querySelector('#f-ok').click();await wait(80);
   const txt=[...document.querySelectorAll('.modal')].map(m=>m.innerText.replace(/\n+/g,' | ')).pop().slice(0,330);document.querySelector('#cf-ok').click();await wait(120);return txt;};
 out.r1=await rodar('8966,55','neg');out.upd1=upd.length;out.cheque1=S.recs[0].data.entries.find(e=>e.i==='ch').d===amanha;
 out.r2=await rodar('7466,55','neg');out.cheque2=S.recs[0].data.entries.find(e=>e.i==='ch').d===t;out.chk=S.recs[0].data.chk;
 out.saldoApp=contaSaldo(S.recs[0].data).ok;
 out.r3=await rodar('9000,00','neg');
 return out;});
console.log(JSON.stringify(r,null,1));console.log('erros',errs);await b.close();})();
