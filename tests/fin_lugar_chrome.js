// Teste: busca de lugar no Raio-X mostra entradas e saídas juntas, com totais.
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});const p=await b.newPage({viewport:{width:390,height:900},deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.route('**/*',r=>r.request().url().startsWith('http://localhost:8099')?r.continue():r.abort());
await p.goto('http://localhost:8099/fin/index.html');
const r=await p.evaluate(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));
 S.sess={access:'x',refresh:'y',exp:Date.now()+3600000};S.ready=true;
 const cur=ymOf(todayIso()),E=(i,d,t,c,k)=>({i,d:cur+'-'+d,c,k,t});
 S.recs=[{id:'s1',kind:'stmt',version:1,deleted_at:null,data:{account:'Santander · Conta Corrente (final 2450-3)',bank:'Santander',openingC:0,entries:[
  E('a','02','Compra cartao deb mc · 01/11 espaco sabores',-4500,'EXPENSE'),E('b','03','Pix enviado · Espaço Sabores Ltda',-3000,'EXPENSE'),E('c','04','Pix recebido · Espaco Sabores',2000,'INCOME'),E('d','05','Compra cartao deb mc · padaria x',-999,'EXPENSE')]}}];
 S.tab='spend';S.sp={ym:cur,per:'m',dir:'out',dim:'cat'};render();
 const inp=document.querySelector('#spq');inp.value='Espaço sabores';inp.dispatchEvent(new Event('change',{bubbles:true}));await wait(50);
 return document.body.innerText.replace(/\n+/g,' | ');});
console.log(r);console.log('erros',errs);
await p.evaluate(()=>document.querySelectorAll('#lg').forEach(e=>e.remove()));await p.screenshot({path:process.env.SHOT||'/tmp/lugar.png'});await b.close();})();
