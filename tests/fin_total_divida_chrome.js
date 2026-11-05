// Teste: a dívida mostra o valor total além do saldo (Tênis: 54,99 + 5 x 59,00 = 349,99; saldo 295,00).
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});const p=await b.newPage({viewport:{width:390,height:900}});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.route('**/*',r=>r.request().url().startsWith('http://localhost:8099')?r.continue():r.abort());
await p.goto('http://localhost:8099/fin/index.html');
const r=await p.evaluate(()=>{S.sess={access:'x',refresh:'y',exp:Date.now()+3600000};S.ready=true;
 const R=(id,d)=>({id,kind:'debt',version:1,deleted_at:null,data:d});
 const tenis=R('d1',{creditor:'Tênis Olimpikus azul',dir:'PAGAR',status:'ATIVA',kindD:'Outro',balanceC:29500,firstInstC:5499,installC:5900,nInst:6,dueDay:2,firstDue:'2026-11-02',paidYm:['2026-11']});
 const mp=R('d2',{creditor:'Mercado Pago da Elisa',dir:'PAGAR',status:'ATIVA',balanceC:681528,installC:56794,nInst:12,dueDay:16,firstDue:'2026-11-16'});
 const sem=R('d3',{creditor:'Sem parcelas',dir:'PAGAR',status:'ATIVA',balanceC:10000,installC:2500,dueDay:5});
 S.recs=[tenis,mp,sem];const o={tot:[tenis,mp,sem].map(r=>debtTotalC(r.data))};
 fichaDebt(tenis);o.det=document.querySelector('.modal').innerText.replace(/\n+/g,' | ').slice(0,420);document.querySelector('.modal').remove();
 S.tab='debts';render();o.lista=document.body.innerText.replace(/\n+/g,' | ').slice(0,700);return o;});
console.log(JSON.stringify(r,null,1));console.log('erros',errs);await b.close();})();
