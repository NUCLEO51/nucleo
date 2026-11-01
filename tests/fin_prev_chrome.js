// Teste da tela de Previsões: categorias separadas, média dos 3 meses, fora da soma de "falta pagar".
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});
  const p=await b.newPage({viewport:{width:390,height:800}});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.route('**/*',r=>r.request().url().startsWith('http://localhost:8099')?r.continue():r.abort());
  await p.goto('http://localhost:8099/fin/index.html');
  const r=await p.evaluate(()=>{
    S.sess={access:'x',refresh:'y',exp:Date.now()+3600000};S.ready=true;
    const cur=ymOf(todayIso()),m=n=>addMonths(cur,-n);
    const E=(n,day,t,c,k)=>({i:'e'+n+t,d:m(n)+'-'+day,c,k:k||'EXPENSE',t});
    const es=[];[1,2,3].forEach(n=>{es.push(E(n,'10','Juros saldo utilizado',-(1000*n)));es.push(E(n,'12','IOF',-300));es.push(E(n,'05','Tarifa pacote mensalidade',-500));});
    S.recs=[{id:'s1',kind:'stmt',version:1,deleted_at:null,data:{account:'Santander · Conta Corrente (final 2450-3)',bank:'Santander',entries:es,openingC:0}}];
    S.tab='prev';render();
    const t=document.body.innerText.replace(/\n+/g,' | ');
    S.tab='pagar';render();const pg=document.body.innerText.replace(/\n+/g,' | ');
    return {prev:t,link:/Previsões de juros/.test(pg),falta:(/Falta pagar[^|]*\|[^|]*/.exec(pg)||[''])[0]};});
  console.log(JSON.stringify(r,null,1));console.log('erros',errs);await b.close();
})();
