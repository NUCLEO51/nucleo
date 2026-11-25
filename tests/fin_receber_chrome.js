// Teste: aba A receber no rodapé (sem Lembretes), receber fora de Dívidas, Lembretes no Início, previsão de entradas, calendário e baixa ligada entre Mês e Dívidas.
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});const p=await b.newPage({viewport:{width:390,height:900}});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.route('**/*',r=>r.request().url().startsWith('http://localhost:8099')?r.continue():r.abort());
await p.goto('http://localhost:8099/fin/index.html');
const r=await p.evaluate(async()=>{S.sess={access:'x',refresh:'y',exp:Date.now()+3600000};S.ready=true;
 const td=todayIso(),cur=ymOf(td),pv=addMonths(cur,-1),pv2=addMonths(cur,-2);
 const D=(id,d)=>({id,kind:'debt',version:1,deleted_at:null,data:d});
 const mp=D('d1',{creditor:'Mercado Pago da Elisa',dir:'PAGAR',status:'ATIVA',kindD:'Empréstimo',balanceC:681528,firstInstC:56794,installC:56794,nInst:12,dueDay:16,firstDue:cur+'-16',paidYm:[]});
 const fab=D('d2',{creditor:'Fabrício (guincho de Jeep)',dir:'RECEBER',status:'ATIVA',balanceC:150000,installC:150000,nInst:1,dueDay:6,firstDue:addMonths(cur,1)+'-06',paidYm:[]});
 const E=(d,c,k,t)=>({i:d+t,d,c,k,t,g:''});
 const st={id:'s1',kind:'stmt',version:1,deleted_at:null,data:{account:'Mercantil · Conta Corrente (final 9171-7)',bank:'Mercantil',tipo:'conta_corrente',holder:'MARCELO',status:'aberta',openingC:0,entries:[E(pv2+'-07',149230,'INCOME','Cred. beneficio INSS'),E(pv+'-09',233012,'INCOME','Pagamento de beneficios do inss · Nb:1'),E(pv2+'-12',95845,'INCOME','Liquido de vencimento · Funcesp'),E(pv+'-11',95845,'INCOME','Liquido de vencimento · Funcesp')]}};
 S.recs=[mp,fab,st];
 S.fr=[{id:'r1',version:1,data:{title:'Pagar parcela do remédio',date:td,time:'09:00',done:false,alarms:[{id:'a',min:0}],repeat:'none'}}];S.frLoaded=true;
 const o={};
 S.tab='home';render();o.tabs=[...document.querySelectorAll('nav.tabs button')].map(x=>x.innerText.replace(/\n/g,' '));
 o.home=document.body.innerText.includes('🔔 Lembretes')&&document.body.innerText.includes('Pagar parcela do remédio');
 S.tab='debts';render();const dv=document.body.innerText;o.debNaoTemReceber=!dv.includes('Fabrício (guincho')&&!dv.includes('Saldo a receber');o.debNota=dv.includes('ficou na aba A receber');
 S.tab='recv';render();const rv=document.body.innerText;o.recv={fab:rv.includes('Fabrício (guincho'),inss:rv.includes('INSS'),func:rv.includes('Funcesp'),prev:rv.includes('Previsão feita')};
 o.recorr=recvRecorrentes().map(x=>[x.label,x.nextD,x.lastC]);
 const nm=addMonths(cur,1);o.cal=calEvents(cur).concat(calEvents(nm)).filter(e=>e.tipo==='Previsão pelos meses anteriores').map(e=>[e.t,e.d,e.kind]);
 /* baixa pelo Mês e conferência na lista de Dívidas */
 Api.update=async(rec,nx)=>{rec.data=nx;};
 const item=monthItems(cur).find(i=>i.id==='d1');o.antes=item&&item.state;
 await Api.update(mp,debtPayData(mp.data,cur,false));
 o.depois=monthItems(cur).find(i=>i.id==='d1').state;
 S.tab='debts';render();o.debSaldo=document.body.innerText.replace(/\s/g,' ').includes('6.247,34');o.debTxt=document.body.innerText.replace(/\s+/g,' ').slice(0,500);o.paidYm=mp.data.paidYm;
 return o;});
console.log(JSON.stringify(r,null,1));console.log('erros',errs);await b.close();})();
