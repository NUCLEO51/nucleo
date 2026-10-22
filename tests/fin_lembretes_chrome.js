// Teste do Financeiro: aba Lembretes + Planner (semana/mês). Precisa de: servidor local na porta 8099 na raiz do repo e playwright. Rodar: node tests/fin_lembretes_chrome.js
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}).catch(async()=>chromium.launch());
  const p=await b.newPage({viewport:{width:390,height:800}});
  const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://localhost:8099'))return r.continue();return r.abort();});
  await p.goto('http://localhost:8099/fin/index.html');
  const res=await p.evaluate(async()=>{
    const out={};
    const td=todayIso(),tm=plusDays(td,1);
    const store=[{id:'L1',version:1,kind:'list',data:{_id:'L1',name:'FIN — vencimentos',fin:true}},
      {id:'r1',version:1,kind:'reminder',data:{title:'Pagar parcela — Banco A',date:td,time:'09:00',list:'L1',finRef:'d1',alarms:[{id:'a-fin',min:0}],repeat:'monthly'}},
      {id:'r2',version:1,kind:'reminder',data:{title:'Outro app',date:td,list:'OUTRA'}}];
    window.__calls=[];
    Api.rest=async(path,opt)=>{
      opt=opt||{};window.__calls.push([path,opt.method||'GET',opt.body||'']);
      const ok=(j)=>({ok:true,status:200,json:async()=>j});
      if(path.startsWith('items?')&&!opt.method){
        if(path.includes('kind=eq.list'))return ok(store.filter(x=>x.kind==='list'&&!x.deleted_at));
        return ok(store.filter(x=>x.kind==='reminder'&&!x.deleted_at));
      }
      if(path.startsWith('items?id=eq.')&&opt.method==='PATCH'){const id=path.match(/id=eq\.([^&]+)/)[1];const it=store.find(x=>x.id===id);const body=JSON.parse(opt.body);Object.assign(it,body);it.version++;return ok([it]);}
      if(path==='items'&&opt.method==='POST'){const b=JSON.parse(opt.body);store.push({id:b.id,version:1,kind:b.kind,data:b.data});return ok([]);}
      return ok([]);
    };
    S.sess={access:'x',refresh:'y',exp:Date.now()+3600000};S.ready=true;S.recs=[];S.msg='';S.tab='rem';
    render();
    await new Promise(r=>setTimeout(r,500));
    out.listHtml=document.querySelector('#app').innerText.slice(0,400);
    out.fr=S.fr.length;out.listRenamed=store[0].data.name;
    S.lt='week';render();out.weekHasRow=document.querySelectorAll('#app [data-act="rem-open"]').length;
    S.lt='month';render();out.monthDays=document.querySelectorAll('#app .fd').length;
    document.querySelector('.fd.today').click();out.dayRows=document.querySelectorAll('#app [data-act="rem-open"]').length;
    S.lt='list';render();
    document.querySelector('[data-act="rem-open"]').click();
    out.autoModal=document.querySelector('.modal').innerText.slice(0,200);out.autoBtns=document.querySelectorAll('.modal .btn').length;
    document.querySelector('#ra-no').click();
    document.querySelector('[data-act="rem-new"]').click();
    document.querySelector('#f-title').value='Teste manual';document.querySelector('#f-date').value=tm;document.querySelector('#f-time').value='08:30';
    document.querySelector('#f-ok').click();await new Promise(r=>setTimeout(r,200));
    out.confirm=document.querySelector('.modal .sum')&&document.querySelector('.modal .sum').innerText;
    document.querySelector('#cf-ok').click();await new Promise(r=>setTimeout(r,600));
    out.after=S.fr.map(x=>x.data.title);
    const man=store.find(x=>x.data.title==='Teste manual');out.manual=man&&JSON.stringify([man.data.list,man.data.time,man.data.date===tm,man.data.alarms.length,man.data.repeat]);
    // concluir
    const rec=S.fr.find(x=>x.data.title==='Teste manual');frActions(rec);document.querySelector('#ra-done').click();await new Promise(r=>setTimeout(r,100));document.querySelector('#cf-ok').click();await new Promise(r=>setTimeout(r,500));
    out.done=store.find(x=>x.data.title==='Teste manual').data.done;
    const rec2=S.fr.find(x=>x.data.title==='Teste manual');frActions(rec2);document.querySelector('#ra-del').click();await new Promise(r=>setTimeout(r,100));document.querySelector('#cf-ok').click();await new Promise(r=>setTimeout(r,500));
    out.deleted=!!store.find(x=>x.data.title==='Teste manual').deleted_at;out.finalFr=S.fr.length;
    // hora inválida
    document.querySelector('[data-act="rem-new"]').click();document.querySelector('#f-title').value='x';document.querySelector('#f-date').value=td;document.querySelector('#f-time').value='25:99';document.querySelector('#f-ok').click();await new Promise(r=>setTimeout(r,100));
    out.err=document.querySelector('#f-err').textContent;
    out.tabs=[...document.querySelectorAll('nav.tabs button')].map(x=>x.innerText.replace(/\s+/g,' '));
    return out;
  });
  console.log(JSON.stringify(res,null,1));console.log('ERRS',errs);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
