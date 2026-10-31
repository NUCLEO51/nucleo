// Teste de "Zerar o aplicativo": tudo vai para a Lixeira, ficam dívidas e configurações. Banco simulado.
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});
  const p=await b.newPage({viewport:{width:390,height:800}});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.route('**/*',r=>r.request().url().startsWith('http://localhost:8099')?r.continue():r.abort());
  await p.addInitScript(()=>localStorage.setItem('fin-confirm','1'));await p.goto('http://localhost:8099/fin/index.html');
  const r=await p.evaluate(async()=>{
    const wait=ms=>new Promise(r=>setTimeout(r,ms));const out={};
    S.sess={access:'x',refresh:'y',exp:Date.now()+3600000};S.ready=true;S.msg='';S.tab='cfg';
    const R=(id,kind,data)=>({id,kind,version:1,deleted_at:null,data});
    S.recs=[R('d1','debt',{creditor:'Tênis',dir:'PAGAR'}),R('d2','debt',{creditor:'Mercado Pago da Elisa',dir:'PAGAR'}),R('b1','bill',{name:'IPVA'}),R('m1','billmonth',{billId:'b1',ym:'2026-10'}),R('c1','card',{name:'Bradesco'}),R('ch1','charge',{name:'Fatura'}),
      R('s1','stmt',{account:'Santander · Conta Corrente (final 2450-3)',bank:'Santander',agency:'0334',entries:[{i:'a',d:'2026-10-01',c:100}]}),R('s2','stmt',{account:'Bradesco · fatura 2026-11-01',cardId:'c1',entries:[]}),
      R('p1','proposal',{cfg:'cats'}),R('p2','proposal',{cfg:'sortprefs'}),R('p3','proposal',{text:'nota'})];
    const rem=[],cre=[];Api.remove=async r=>{rem.push(r.id);S.recs=S.recs.filter(x=>x.id!==r.id);};Api.create=async(k,d)=>{cre.push([k,d]);S.recs.push(R('new'+cre.length,k,d));};
    render();
    document.querySelector('[data-act="zero"]').click();await wait(60);
    out.lista=document.querySelector('.modal').innerText;
    document.querySelector('#cf-no').click();await wait(40);out.cancelou=rem.length===0&&cre.length===0;
    document.querySelector('[data-act="zero"]').click();await wait(60);document.querySelector('#cf-ok').click();await wait(200);
    out.removidos=rem.sort();out.criou=cre.map(c=>c[0]+':'+c[1].entries.length+':'+c[1].openingC);out.ficou=S.recs.map(x=>x.id).sort();out.msg=S.msg;return out;});
  console.log(JSON.stringify(r,null,1));console.log('erros',errs);await b.close();
})();
