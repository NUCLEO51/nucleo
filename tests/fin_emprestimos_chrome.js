// Tela Empréstimos: resumo, conferência no extrato, entradas de empréstimo e baixa ligada.
const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});const p=await b.newPage({viewport:{width:390,height:900}});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.route('**/*',r=>r.request().url().startsWith('http://localhost:8099')?r.continue():r.abort());
await p.addInitScript(()=>localStorage.setItem('fin-confirm','1'));await p.goto('http://localhost:8099/fin/index.html');
const r=await p.evaluate(async()=>{S.sess={access:'x',refresh:'y',exp:Date.now()+3600000};S.ready=true;
 const E=(d,c,k,t)=>({i:d+t+c,d,c,k,t,g:''});
 const loan={id:'l1',kind:'debt',version:2,deleted_at:null,data:{cat:'Empréstimo',dir:'PAGAR',grupo:'Empréstimo',kindD:'Empréstimo',nInst:12,dueDay:7,paidYm:['2026-10','2026-11'],status:'ATIVA',account:'Mercantil · Conta Corrente (final 9171-7)',balanceC:486300,creditor:'Mercantil · Empréstimo Resolve PN (consignado INSS)',firstDue:'2026-10-07',installC:48630,firstInstC:48630,liberadoC:298407,contratadoC:330328,match:'resolve pn'}};
 const other={id:'o1',kind:'debt',version:1,deleted_at:null,data:{dir:'PAGAR',creditor:'Tênis',status:'ATIVA',kindD:'Outro',balanceC:29500,installC:5900,nInst:6,paidYm:[],dueDay:2,firstDue:'2026-12-02'}};
 const mer={id:'m',kind:'stmt',version:1,deleted_at:null,data:{account:'Mercantil · Conta Corrente (final 9171-7)',bank:'Mercantil',tipo:'conta_corrente',openingC:0,entries:[E('2026-07-31',298407,'LOAN_DISBURSEMENT','Contrato emprestimo · Resolve PN'),E('2026-10-07',-48630,'EXPENSE','Pagamento emprestimo · Resolve PN'),E('2026-11-09',-48630,'EXPENSE','Pagamento emprestimo · Resolve PN')]}};
 S.recs=[loan,other,mer];S.fr=[];S.frLoaded=true;
 const o={};S.tab='debts';render();o.botao=/Empréstimos \(1\)/.test(document.body.innerText);
 S.tab='loans';render();const t=document.body.innerText.replace(/\s+/g,' ');
 o.soEmprestimo=t.includes('Resolve PN')&&!t.includes('Tênis');o.liberado=t.includes('2.984,07');o.conf=(t.match(/✔ saiu no extrato/g)||[]).length;o.entrou=/Total que entrou nas contas R\$ 2\.984,07/.test(t);o.falta=t.includes('4.863,00');
 o.tabAtiva=document.querySelector('nav.tabs button.on').innerText.includes('Dívidas');
 Api.update=async(rec,data)=>{const i=S.recs.findIndex(x=>x.id===rec.id);S.recs[i]=Object.assign({},rec,{data,version:rec.version+1});return S.recs[i];};
 await Api.update(S.recs[0],debtPayData(S.recs[0].data,'2026-12',false));render();o.depoisBaixa=document.body.innerText.replace(/\s+/g,' ').includes('3 de 12');
 return o;});
console.log(JSON.stringify(r));console.log('erros',errs);await b.close();})();
