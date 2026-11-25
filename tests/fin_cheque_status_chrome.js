const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:900}});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.route('**/*',r=>r.request().url().startsWith('http://localhost:8099')?r.continue():r.abort());
await p.goto('http://localhost:8099/fin/index.html');
const r=await p.evaluate(()=>{const a=chequeSt({c:150000,t:'Dep cheque atm',d:'2026-10-30'}),f=chequeSt({c:150000,t:'Dep cheque atm',d:'2999-01-01',dd:'2026-10-30'}),n=chequeSt({c:-5000,t:'cheque pago',d:'2026-10-30'});
return {comp:a&&a.ok,ret:f&&!f.ok,tagOk:/tag ok/.test(chequeTag({c:1,t:'cheque',d:'2026-01-01'})),tagBad:/tag bad/.test(chequeTag({c:1,t:'cheque',d:'2999-01-01',dd:'2026-01-01'})),saida:n===null};});
console.log(JSON.stringify(r),errs);await b.close();})();
