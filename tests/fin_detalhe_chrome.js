// Teste da tela "O que é este lançamento": tipo, origem/destino, data de depósito e situação.
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined});
  const p=await b.newPage({viewport:{width:390,height:800}});const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.route('**/*',r=>r.request().url().startsWith('http://localhost:8099')?r.continue():r.abort());
  await p.goto('http://localhost:8099/fin/index.html');
  const r=await p.evaluate(()=>{
    const f=x=>{detalheModal(x);const t=document.querySelector('.modal').innerText;document.querySelector('.modal').remove();return t.replace(/\n+/g,' | ');};
    const fut='2999-11-03',pas='2020-10-30';
    return {
      cheque:f({t:'Dep cheque atm',d:fut,dd:pas,k:'INCOME',c:150000,tipo:'Entrada'}),
      pixr:f({t:'Pix recebido · maria silva',d:pas,c:5000}),
      pixe:f({t:'Pix enviado · joao',d:pas,c:-5000}),
      deb:f({t:'Compra cartao deb mc · 30/10 padaria x',d:'2020-11-01',c:-1200}),
      juros:f({t:'Juros saldo utilizado · 30/10',d:pas,c:-900}),
      aut:f({t:'Debito aut. luz · Casa',d:pas,c:-15000}),
      outro:f({t:'Coisa estranha',d:pas,c:-1})
    };});
  console.log(JSON.stringify(r,null,1));console.log('erros',errs);await b.close();
})();
