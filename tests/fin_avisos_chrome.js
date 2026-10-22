// Teste do Financeiro: avisos (alarmes no servidor) + Anotações da Siri. Precisa de servidor local na porta 8099 (raiz do repo) e playwright.
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:390,height:800}});
  const errs=[];p.on('pageerror',e=>errs.push(String(e)));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://localhost:8099'))return r.continue();return r.abort();});
  await p.goto('http://localhost:8099/fin/index.html');
  const res=await p.evaluate(async()=>{
    const out={},td=todayIso();
    const dt=new Date(Date.now()+3*3600e3);const fut=isoDate(dt),hh=pad(dt.getHours())+':'+pad(dt.getMinutes());
    const store=[{id:'L1',version:1,kind:'list',data:{_id:'L1',name:'Financeiro — vencimentos',fin:true}},
      {id:'r1',version:1,kind:'reminder',data:{title:'Pagar luz',date:fut,time:hh,list:'L1',alarms:[{id:'a-fin',min:0}]}},
      {id:'r2',version:1,kind:'reminder',data:{title:'Outro',date:fut,time:hh,list:'OUTRA',alarms:[{id:'a',min:0}]}},
      {id:'i1',version:1,kind:'inbox',data:{_id:'i1',text:'Comprar café para a mãe',source:'siri',createdAt:Date.now()}}];
    const alarms=[{id:10,key:'r1|velho|2020-01-01T00:00:00.000Z|x',item_id:'r1'},{id:11,key:'r2|a|2020-01-01T00:00:00.000Z|x',item_id:'r2'},{id:12,key:'teste|1',item_id:null}];
    window.__calls=[];
    Api.rest=async(path,opt)=>{
      opt=opt||{};const m=opt.method||'GET';window.__calls.push([path,m]);
      const ok=j=>({ok:true,status:200,json:async()=>j});
      if(path.startsWith('alarms?select')&&m==='GET')return ok(alarms);
      if(path.startsWith('alarms?id=in.')&&m==='DELETE'){const ids=path.match(/in\.\(([^)]*)\)/)[1].split(',').map(Number);window.__del=ids;return ok([]);}
      if(path.startsWith('alarms?on_conflict')&&m==='POST'){window.__add=JSON.parse(opt.body);return ok([]);}
      if(path.startsWith('alarm_repeats')&&m==='DELETE'){window.__ack=1;return ok([]);}
      if(path.startsWith('items?')&&m==='GET'){
        const kind=path.match(/kind=eq\.(\w+)/)[1];return ok(store.filter(x=>x.kind===kind&&!x.deleted_at));}
      if(path.startsWith('items?id=eq.')&&m==='PATCH'){const id=path.match(/id=eq\.([^&]+)/)[1];const it=store.find(x=>x.id===id);Object.assign(it,JSON.parse(opt.body));it.version++;return ok([it]);}
      if(path==='items'&&m==='POST'){const bb=JSON.parse(opt.body);store.push({id:bb.id,version:1,kind:bb.kind,data:bb.data});return ok([]);}
      return ok([]);
    };
    S.sess={access:'x',refresh:'y',exp:Date.now()+3600000};S.ready=true;S.recs=[];S.msg='';S.tab='rem';
    render();await loadFinRems();await new Promise(r=>setTimeout(r,300));
    out.del=window.__del;out.addKeys=(window.__add||[]).map(x=>x.item_id+'|'+x.message.slice(0,12));
    out.testeIntacto=!(window.__del||[]).includes(12);out.outroIntacto=!(window.__del||[]).includes(11);
    out.banner=document.querySelector('#app').innerText.includes('Avisos desligados')||document.querySelector('#app').innerText.includes('Este aparelho ainda não recebe');
    await ackAvisos(true);out.ack=window.__ack===1;
    S.tab='notes';render();await new Promise(r=>setTimeout(r,300));
    out.noteRows=document.querySelectorAll('#app [data-act="note-open"]').length;
    document.querySelector('[data-act="note-open"]').click();
    document.querySelector('#na-rem').click();await new Promise(r=>setTimeout(r,100));
    out.prefill=document.querySelector('#f-title').value;
    document.querySelector('#f-date').value=td;document.querySelector('#f-ok').click();await new Promise(r=>setTimeout(r,100));
    document.querySelector('#cf-ok').click();await new Promise(r=>setTimeout(r,600));
    out.inboxGone=!!store.find(x=>x.id==='i1').deleted_at;
    out.novoLembrete=!!store.find(x=>x.kind==='reminder'&&x.data.title==='Comprar café para a mãe'&&x.data.list==='L1');
    S.tab='notes';render();
    document.querySelector('[data-act="note-new"]').click();document.querySelector('#f-text').value='Teste digitado';document.querySelector('#f-ok').click();await new Promise(r=>setTimeout(r,100));document.querySelector('#cf-ok').click();await new Promise(r=>setTimeout(r,600));
    out.digitada=store.some(x=>x.kind==='inbox'&&x.data.text==='Teste digitado');
    out.header=[...document.querySelectorAll('header.hd .ibtn')].length;
    return out;
  });
  console.log(JSON.stringify(res,null,1));console.log('ERRS',errs);
  await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
