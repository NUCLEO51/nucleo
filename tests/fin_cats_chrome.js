// Teste do Financeiro: criar/renomear/mover/esconder grupos e categorias. Banco simulado.
// Servidor local na porta 8099 (python3 -m http.server 8099 na raiz do repo) e playwright.
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});
  const p=await b.newPage({viewport:{width:390,height:800}});
  const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.route('**/*',r=>r.request().url().startsWith('http://localhost:8099')?r.continue():r.abort());
  await p.addInitScript(()=>localStorage.setItem('fin-confirm','1'));await p.goto('http://localhost:8099/fin/index.html');
  const res=await p.evaluate(async()=>{
    const out={};const wait=ms=>new Promise(r=>setTimeout(r,ms));
    S.sess={access:'x',refresh:'y',exp:Date.now()+3600000};S.ready=true;S.recs=[];S.msg='';S.tab='cfg';
    Api.create=async(kind,data)=>{const r={id:'cfg1',kind,version:1,data:JSON.parse(JSON.stringify(data)),deleted_at:null};S.recs.push(r);return r;};
    Api.update=async(rec,data)=>{rec.data=JSON.parse(JSON.stringify(data));rec.version++;return rec;};
    const app=()=>document.querySelector('#app').innerText;
    const click=async sel=>{const e=document.querySelector(sel);if(!e)throw new Error('sem '+sel);e.click();await wait(60);};
    const type=async(v)=>{const i=document.querySelector('#at-v');i.value=v;await click('#at-ok');};
    render();
    out.cfgTemBotao=!!document.querySelector('[data-act="cg-open"]');
    await click('[data-act="cg-open"]');out.tab=S.tab;out.titulo=document.querySelector('header h1').innerText;
    out.grupos=[...document.querySelectorAll('h2')].map(x=>x.innerText);
    out.temMercado=app().includes('Mercado');
    /* nova categoria "Pet" no grupo "Casa": pede confirmação */
    await click('[data-act="cg-newcat"]');await type('Pet');
    await click('[data-i="1"]'); /* grupo Casa */
    out.confirmaCriar=document.querySelector('.modal h3').innerText;
    await click('#cf-no');await wait(60);out.semConfirmarNaoCriou=!catTreeFull().Pet;
    await click('[data-act="cg-newcat"]');await type('Pet');await click('[data-i="1"]');await click('#cf-ok');await wait(100);
    out.criou=!!catTree().Pet;out.petNoGrupo=grpOf({c:'Pet',s:''});
    /* nome repetido é recusado */
    await click('[data-act="cg-newcat"]');await type('pet');out.erroRepetido=document.querySelector('.modal p').innerText;await click('#ok');await click('#no');
    /* renomear categoria padrão e ver o lançamento antigo */
    S.recs.push({id:'p1',kind:'proposal',version:1,data:{cfg:'x'}});
    const antes=catOf({i:'z1',t:'Drogaria Raia',g:''});out.antes=antes&&antes.c;
    catData().rules.push({m:'drogaria raia',c:'Saúde',s:'Farmácia'});
    await Api.update(catCfg(),Object.assign({},catData(),{rules:[{m:'drogaria raia',c:'Saúde',s:'Farmácia'}]}));
    await cgSave(d=>mCatRename(d,'Saúde','Saúde e bem-estar'));
    const k=catOf({i:'z1',t:'Drogaria Raia',g:''});out.depoisRenomear=k.c+' > '+k.s;
    out.arvoreSemAntigo=!catTree()['Saúde']&&!!catTree()['Saúde e bem-estar'];
    out.grupoRenomeada=grpOf({c:'Saúde e bem-estar',s:'Farmácia'});
    out.erroNomeAntigo=cgCatErr('Saúde');
    await cgSave(d=>mCatRename(d,'Saúde e bem-estar','Saúde')); /* volta ao original */
    out.voltou=catOf({i:'z1',t:'Drogaria Raia',g:''}).c;out.renVazio=Object.keys(catData().ren).length;
    /* subcategoria */
    await cgSave(d=>mSubRename(d,'Carro','Pedágio','Pedágios'));
    out.subRenomeada=catTree().Carro.includes('Pedágios')&&!catTree().Carro.includes('Pedágio');
    out.erroSub=cgSubErr('Carro','Pedágio');
    /* mover categoria de grupo e renomear grupo */
    await cgSave(d=>{d.gmap['Lazer']='Pets e lazer';d.grps.push('Pets e lazer');});
    out.moveu=grpOf({c:'Lazer',s:'Viagens'});
    await cgSave(d=>mGrpRename(d,'Pets e lazer','Lazer e pets'));
    out.grupoCustomRenomeado=grpOf({c:'Lazer',s:'Viagens'});
    await cgSave(d=>mGrpRename(d,'Transporte','Locomoção'));
    out.grupoBaseRenomeado=grpOf({c:'Carro',s:'Combustível'});
    out.gastosFixosAinda=grpOf({c:'Casa',s:'Contas (luz, água, internet)'});
    /* esconder */
    await cgSave(d=>{d.hide.push('Seguros');});
    out.seguroSomeuDaLista=!catTree().Seguros;
    out.sugestaoAutoSumiu=catOf({i:'s1',t:'Seguro auto',g:''})===null;
    await cgSave(d=>{d.hide=d.hide.filter(x=>x!=='Seguros');});
    out.seguroVolta=catOf({i:'s1',t:'Seguro auto',g:''}).c;
    /* a tela aberta mostra tudo sem erro */
    S.tab='cats';render();
    out.telaTem=['Pet','Locomoção','Lazer e pets','Gastos fixos'].map(x=>app().includes(x));
    /* abrir uma categoria: menu e voltar */
    await click('[data-act="cg-cat"][data-c="Pet"]');out.menuBotoes=[...document.querySelectorAll('.modal .btn')].map(x=>x.innerText);await click('#no');
    await click('[data-act="cg-grp"][data-g="Lazer e pets"]');out.grupoBotoes=[...document.querySelectorAll('.modal .btn')].map(x=>x.innerText);await click('#no');
    return out;
  });
  console.log(JSON.stringify(res,null,1));console.log('ERRS',errs);await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
