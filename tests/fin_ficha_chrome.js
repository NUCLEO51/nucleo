// Teste do Financeiro: ficha ao tocar numa linha do Mês / Dívidas (não abre edição direto). Servidor local na porta 8099 e playwright.
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:800}});
  const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.route('**/*',r=>r.request().url().startsWith('http://localhost:8099')?r.continue():r.abort());
  await p.goto('http://localhost:8099/fin/index.html');
  const res=await p.evaluate(async()=>{
    const out={},ym=ymOf(todayIso()),fd=addMonths(ym,1)+'-10';
    S.sess={access:'x',refresh:'y',exp:Date.now()+3600000};S.ready=true;S.msg='';S.who='ALL';S.mm=null;S.mf='all';
    const R=(id,kind,data)=>({id,kind,version:1,data});
    S.recs=[R('b1','bill',{name:'Licenciamento',dueDay:20,variable:false,amountC:15000,recurring:false,account:'Bradesco',startYm:ym}),
      R('m1','billmonth',{billId:'b1',ym,amountC:15000,paidAt:null}),
      R('b2','bill',{name:'Seguro',dueDay:25,variable:true,amountC:null,recurring:true,startYm:addMonths(ym,2)}),
      R('d1','debt',{creditor:'Tênis olímpicos azul',balanceC:62000,installC:10000,firstInstC:12000,nInst:6,dueDay:10,firstDue:fd,status:'ATIVA',dir:'PAGAR',kindD:'Outro',account:'Cartão da Elisa',paidYm:[]})];
    S.tab='bills';render();
    const abre=sel=>{document.querySelector(sel).click();return document.querySelector('.modal');};
    let m=abre('[data-act="m-open"][data-k="bill"]');
    out.billFicha=m.innerText.includes('O que é')&&m.innerText.includes('Mês a mês')&&!!m.querySelector('#fb-edit')&&!m.querySelector('#f-ok');
    m.querySelector('#fb-no').click();
    S.mm=addMonths(ym,1);render();
    m=abre('[data-act="m-open"][data-k="debt"]');
    out.debtFicha=m.innerText;
    out.parcelas=(m.innerText.match(/R\$/g)||[]).length;
    out.semForm=!m.querySelector('#f-ok');
    m.querySelector('#fd-edit').click();
    out.editAbre=!!document.querySelector('#f-creditor');
    out.ordem=[...document.querySelectorAll('.modal label.f')].map(l=>l.innerText).filter(t=>/parcela/i.test(t));
    document.querySelector('#f-no').click();
    S.tab='debts';render();
    document.querySelector('[data-act="debt-edit"]').click();
    out.debtsAbreFicha=!!document.querySelector('#fd-edit')&&!document.querySelector('#f-ok');
    document.querySelector('#fd-no').click();
    S.mm=addMonths(ym,2);S.tab='bills';render();
    const bp=document.querySelector('[data-act="m-open"][data-k="billp"]');
    if(bp){bp.click();out.billpFicha=!!document.querySelector('#fb-edit')&&!document.querySelector('#f-ok');document.querySelector('#fb-no').click();}
    return out;
  });
  console.log(JSON.stringify(res,null,1));console.log('ERRS',errs);await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
