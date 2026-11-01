// Teste: grupo + categoria em dívidas e contas; a lupa acha por grupo.
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});const p=await b.newPage({viewport:{width:390,height:800}});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.route('**/*',r=>r.request().url().startsWith('http://localhost:8099')?r.continue():r.abort());
await p.addInitScript(()=>localStorage.setItem('fin-confirm','1'));await p.goto('http://localhost:8099/fin/index.html');
const r=await p.evaluate(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));
 S.sess={access:'x',refresh:'y',exp:Date.now()+3600000};S.ready=true;
 const R=(id,k,d)=>({id,kind:k,version:1,deleted_at:null,data:d});
 S.recs=[R('d1','debt',{creditor:'Mercado Pago',dir:'PAGAR',grupo:'Elisa',cat:'Outros',balanceC:100000}),R('d2','debt',{creditor:'Tênis',dir:'PAGAR',balanceC:5000}),R('b1','bill',{name:'Cartão da Elisa',grupo:'Elisa',dueDay:5})];
 S.tab='debts';render();
 const saved=[];Api.create=async(k,d)=>{saved.push(d);};
 debtForm(null);await wait(50);
 const sel=[...document.querySelectorAll('select')].find(x=>[...x.options].some(o=>o.value==='Transporte'));const opts=[...sel.options].map(o=>o.text);
 // grupo existente aparece
 const temElisa=opts.includes('Transporte');const semNovo=!opts.some(x=>/novo/i.test(x));const cats=[...document.querySelectorAll('select')].flatMap(x=>[...x.options].map(o=>o.text)).filter(t=>/Carro ·/.test(t));
 sel.value='Elisa';sel.dispatchEvent(new Event('change',{bubbles:true}));
 const inps=[...document.querySelectorAll('input')];
 return {opts,temElisa,semNovo,cats,fixCat:(()=>{const o={cat:'Carro',grupo:''};grupoFix(o);return o;})(),grupoFix:(()=>{const o={grupo:'__novo',grupoNovo:' Casa '};grupoFix(o);return o;})()};});
 S=null;
 const r3=await p.evaluate(()=>{const st=stState();st.q='';st.grps=['Casa'];st.cats=['Outros'];S.recs=[{id:'d1',kind:'debt',version:1,deleted_at:null,data:{creditor:'Mercado Pago',dir:'PAGAR',cat:'Outros',balanceC:100000}},{id:'d2',kind:'debt',version:1,deleted_at:null,data:{creditor:'Tênis',dir:'PAGAR',cat:'Roupas e calçados',balanceC:5000}}];st.grps=[grpOf({c:'Outros',s:''})];return stListHtml().replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');});
console.log('FILTRO:',r3);
const r2=await p.evaluate(()=>{st=stState();st.q='elisa';st.ym='';return stListHtml().replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');}).catch(e=>String(e));
console.log(JSON.stringify(r),'\nLUPA:',r2,'\nerros',errs);await b.close();})();
