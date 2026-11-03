// Teste: cheque retido (dd) não duplica na reimportação e o saldo continua igual ao saldo disponível do banco.
const { chromium } = require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.route('**/*',r=>r.request().url().startsWith('http://localhost:8099')?r.continue():r.abort());
await p.goto('http://localhost:8099/fin/index.html');
const r=await p.evaluate(async(b64)=>{const u=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const rows=await xlsxRows(u.buffer);const bk=bankParse(rows);
 const mk=(ents)=>({id:'s1',kind:'stmt',version:1,deleted_at:null,data:{account:'Santander · Conta Corrente (final 2450-3)',bank:'Santander',openingC:-514645,entries:ents}});
 const held={i:'2026-10-30-b28ccd267-1',d:'2026-11-04',dd:'2026-10-30',c:150000,k:'TRANSFER',t:'Dep cheque atm',g:''};
 S.recs=[mk([{i:'x',d:'2026-10-01',c:-100,k:'EXPENSE',t:'antigo'},held])];
 const pl=bankPlan(bk);const ch=pl.merged.filter(e=>e.t==='Dep cheque atm');
 const hoje='2026-11-03';const bal=pl.opening+pl.merged.filter(e=>e.d<=hoje).reduce((a,e)=>a+e.c,0);
 // sem cheque retido: aparece no dia do depósito
 S.recs=[mk([{i:'x',d:'2026-10-01',c:-100,k:'EXPENSE',t:'antigo'}])];const pl2=bankPlan(bk);const bal2=pl2.opening+pl2.merged.filter(e=>e.d<=hoje).reduce((a,e)=>a+e.c,0);
 return {cheques:ch.map(e=>e.d+'|'+(e.dd||'')+'|'+e.c),saldoRetido:bal,endBal:bk.endBal,saldoSemRetido:bal2,total:pl.merged.length};},fs.readFileSync(process.argv[2]).toString('base64'));
console.log(JSON.stringify(r));console.log('erros',errs);await b.close();})();
