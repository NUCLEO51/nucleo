// Teste do Financeiro: Anotações -> dívida com 1ª parcela diferente e total de parcelas. Servidor local na porta 8099 e playwright.
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:800}});
  const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.route('**/*',r=>r.request().url().startsWith('http://localhost:8099')?r.continue():r.abort());
  await p.goto('http://localhost:8099/fin/index.html');
  const res=await p.evaluate(async()=>{
    const out={};const store=[{id:'i1',version:1,kind:'inbox',data:{_id:'i1',text:'tênis olímpicos azul',source:'siri',createdAt:Date.now()}}];
    const created=[];
    Api.rest=async(path,opt)=>{opt=opt||{};const m=opt.method||'GET';const ok=j=>({ok:true,status:200,json:async()=>j});
      if(path.startsWith('items?')&&m==='GET'){const k=path.match(/kind=eq\.(\w+)/)[1];return ok(store.filter(x=>x.kind===k&&!x.deleted_at));}
      if(path.startsWith('items?id=eq.')&&m==='PATCH'){const id=path.match(/id=eq\.([^&]+)/)[1];const it=store.find(x=>x.id===id);Object.assign(it,JSON.parse(opt.body));it.version++;return ok([it]);}
      return ok([]);};
    Api.create=async(kind,data)=>{created.push([kind,data]);const r={id:'n'+created.length,kind,version:1,data};S.recs.push(r);return r;};
    S.sess={access:'x',refresh:'y',exp:Date.now()+3600000};S.ready=true;S.recs=[];S.msg='';S.tab='home';
    await loadInbox();render();
    out.homeBanner=document.querySelector('#app').innerText.includes('Anotações para decidir');
    out.semNucleo=!document.querySelector('#app').innerText.includes('do Núcleo');
    S.tab='notes';render();document.querySelector('[data-act="note-open"]').click();
    out.titulo=document.querySelector('.modal h3').innerText;
    out.opcoes=[...document.querySelectorAll('.modal .btn')].map(x=>x.innerText);
    document.querySelector('#p-de').click();await new Promise(r=>setTimeout(r,100));
    const set=(k,v)=>{document.querySelector('#f-'+k).value=v;};
    out.nome=document.querySelector('#f-creditor').value;
    set('creditor','Tênis olímpicos azul');
    set('installC','100,00');set('firstInstC','120,00');set('nInst','6');
    const fd=new Date();fd.setMonth(fd.getMonth()+1);fd.setDate(10);set('dueDay','10');set('firstDue',isoDate(fd));
    document.querySelector('#f-ok').click();await new Promise(r=>setTimeout(r,100));
    out.resumo=document.querySelector('.modal .sum')&&document.querySelector('.modal .sum').innerText;
    document.querySelector('#cf-ok').click();await new Promise(r=>setTimeout(r,500));
    const d=created[0]&&created[0][1];out.salvo=d&&JSON.stringify([d.balanceC,d.installC,d.firstInstC,d.nInst]);
    out.anotacaoSaiu=!!store[0].deleted_at;
    const x=d;const fy=ymOf(x.firstDue);
    out.valores=[debtAmt(x,fy),debtAmt(x,addMonths(fy,1)),debtOwes(x,addMonths(fy,5)),debtOwes(x,addMonths(fy,6))];
    const pg=debtPayData(x,fy,false);out.saldoApos1=pg.balanceC;
    return out;
  });
  console.log(JSON.stringify(res,null,1));console.log('ERRS',errs);await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
