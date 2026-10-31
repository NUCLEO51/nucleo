// Teste do Financeiro: tela Lixeira (listar o que foi apagado, restaurar com confirmação, erro quando falta o pai).
// Servidor local na porta 8099 (python3 -m http.server 8099 na raiz do repo) e playwright. Banco simulado, nada real.
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});
  const p=await b.newPage({viewport:{width:390,height:800}});
  const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.route('**/*',r=>r.request().url().startsWith('http://localhost:8099')?r.continue():r.abort());
  await p.addInitScript(()=>localStorage.setItem('fin-confirm','1'));await p.goto('http://localhost:8099/fin/index.html');
  const res=await p.evaluate(async()=>{
    const out={};const wait=ms=>new Promise(r=>setTimeout(r,ms));
    const dias=n=>new Date(Date.now()-n*86400000).toISOString();
    const store=[
      {id:'c1',kind:'card',version:2,data:{name:'Cartão (teste)'},deleted_at:dias(3)},
      {id:'ch1',kind:'charge',version:2,data:{desc:'Mercado (teste)',amountC:12345,cardId:'c1'},deleted_at:dias(3)},
      {id:'d1',kind:'debt',version:3,data:{creditor:'Dívida (teste)',balanceC:50000},deleted_at:dias(10)},
      {id:'b1',kind:'bill',version:2,data:{name:'Luz (teste)'},deleted_at:dias(2)},
      {id:'bm1',kind:'billmonth',version:2,data:{billId:'b1',ym:'2026-11',amountC:9000},deleted_at:dias(2)},
      {id:'a1',kind:'bill',version:1,data:{name:'Ativa'},deleted_at:null}
    ];
    const ok=j=>({ok:true,status:200,json:async()=>JSON.parse(JSON.stringify(j))}); /* cópia, como o servidor de verdade */
    const log=[];
    Api.rest=async(path,opt)=>{opt=opt||{};const m=opt.method||'GET';log.push(m+' '+path);
      if(path.startsWith('fin_records?')&&m==='GET'&&path.includes('deleted_at=not.is.null'))return ok(store.filter(x=>x.deleted_at).sort((a,c)=>c.deleted_at.localeCompare(a.deleted_at)));
      if(path.startsWith('fin_records?')&&m==='GET')return ok(store.filter(x=>!x.deleted_at));
      if(path.startsWith('fin_records?id=eq.')&&m==='PATCH'){
        const id=path.match(/id=eq\.([^&]+)/)[1];const v=+path.match(/version=eq\.(\d+)/)[1];
        const it=store.find(x=>x.id===id);
        if(!it||it.version!==v||!it.deleted_at)return ok([]);
        if(it.kind==='charge'&&store.find(x=>x.id===it.data.cardId).deleted_at)return {ok:false,status:400,json:async()=>({message:'cardId '+it.data.cardId+' não existe (ou está na lixeira) para este dono'})};
        Object.assign(it,JSON.parse(opt.body));it.version++;return ok([it]);}
      return ok([]);};
    S.sess={access:'x',refresh:'y',exp:Date.now()+3600000};S.ready=true;S.recs=store.filter(x=>!x.deleted_at);S.msg='';S.tab='cfg';
    render();
    const app=()=>document.querySelector('#app').innerText;
    out.ajustesTemLixeira=app().includes('Lixeira')&&!!document.querySelector('[data-act="tab"][data-v="trash"]');
    document.querySelector('[data-act="tab"][data-v="trash"]').click();await wait(200);
    out.tab=S.tab;
    out.titulo=document.querySelector('header h1').innerText;
    out.aviso=app().includes('ainda não está ligada');
    out.linhas=[...document.querySelectorAll('[data-act="tr-open"]')].map(x=>x.innerText.replace(/\n+/g,' | '));
    out.quantidade=out.linhas.length;
    out.semAtiva=!app().includes('Ativa');
    out.nomeDoMes=out.linhas.some(l=>l.includes('Luz (teste) · 2026-11'));
    // abre o item e volta sem restaurar
    document.querySelector('[data-act="tr-open"][data-id="d1"]').click();await wait(50);
    out.modalTitulo=document.querySelector('.modal h3').innerText;
    out.modalBotoes=[...document.querySelectorAll('.modal .btn')].map(x=>x.innerText);
    document.querySelector('.modal #no').click();await wait(50);
    out.fechou=!document.querySelector('.modal');
    out.naoRestaurou=!!store.find(x=>x.id==='d1').deleted_at;
    // restaurar: pede confirmação; Voltar na confirmação não restaura
    document.querySelector('[data-act="tr-open"][data-id="d1"]').click();await wait(50);
    document.querySelector('#tr-ok').click();await wait(50);
    out.confirmaTitulo=document.querySelector('.modal h3').innerText;
    document.querySelector('#cf-no').click();await wait(50);
    out.semConfirmarNaoRestaura=!!store.find(x=>x.id==='d1').deleted_at;
    // confirmar restaura de verdade
    document.querySelector('[data-act="tr-open"][data-id="d1"]').click();await wait(50);
    document.querySelector('#tr-ok').click();await wait(50);
    document.querySelector('#cf-ok').click();await wait(400);
    out.restaurou=store.find(x=>x.id==='d1').deleted_at===null;
    out.versaoSubiu=store.find(x=>x.id==='d1').version===4;
    out.voltouParaApp=S.recs.some(x=>x.id==='d1');
    out.saiuDaLista=!document.querySelector('[data-act="tr-open"][data-id="d1"]');
    // erro: restaurar compra com o cartão ainda na lixeira
    document.querySelector('[data-act="tr-open"][data-id="ch1"]').click();await wait(50);
    document.querySelector('#tr-ok').click();await wait(50);
    document.querySelector('#cf-ok').click();await wait(400);
    out.compraContinuaNaLixeira=!!store.find(x=>x.id==='ch1').deleted_at;
    out.msgErro=(document.querySelector('.err')||{}).innerText||'';
    // depois do cartão, a compra volta
    S.msg='';
    document.querySelector('[data-act="tr-open"][data-id="c1"]').click();await wait(50);
    document.querySelector('#tr-ok').click();await wait(50);document.querySelector('#cf-ok').click();await wait(400);
    document.querySelector('[data-act="tr-open"][data-id="ch1"]').click();await wait(50);
    document.querySelector('#tr-ok').click();await wait(50);document.querySelector('#cf-ok').click();await wait(400);
    out.cartaoECompraVoltaram=store.find(x=>x.id==='c1').deleted_at===null&&store.find(x=>x.id==='ch1').deleted_at===null;
    // conflito de versão (mudou em outro aparelho)
    store.find(x=>x.id==='b1').version=9;
    document.querySelector('[data-act="tr-open"][data-id="b1"]').click();await wait(50);
    document.querySelector('#tr-ok').click();await wait(50);document.querySelector('#cf-ok').click();await wait(400);
    out.conflito=(document.querySelector('.err')||{}).innerText||'';
    out.conflitoNaoRestaurou=!!store.find(x=>x.id==='b1').deleted_at;
    out.apenasLeituraNaLista=log.filter(l=>l.startsWith('PATCH')).every(l=>l.includes('version=eq.')&&l.includes('deleted_at=not.is.null'));
    return out;
  });
  console.log(JSON.stringify(res,null,1));console.log('ERRS',errs);await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
