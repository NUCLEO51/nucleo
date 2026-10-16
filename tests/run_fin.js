/* Testes do FIN (fin/index.html) em navegador simulado. Rodar: node run_fin.js (ou npm test) */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync(path.join(__dirname, '..', 'fin', 'index.html'), 'utf8');
const vc = new VirtualConsole();
vc.on('jsdomError', e => console.log('ERRO NA PÁGINA:', String(e.message).slice(0, 200)));
const dom = new JSDOM(html, {
  runScripts: 'dangerously', url: 'https://nucleo51.github.io/nucleo/fin/', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) { w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, addEventListener() {} })); w.scrollTo = () => {}; }
});
const w = dom.window, ev = c => w.eval(c), doc = w.document;
let ok = 0, bad = 0;
function t(name, got, want) {
  const a = JSON.stringify(got), b = JSON.stringify(want);
  if (a === b) ok++; else { bad++; console.log('FALHOU:', name, '\n   veio :', a, '\n   queria:', b); }
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const count = (h, s) => h.split(s).length - 1;

(async () => {
  const ym = ev('ymOf(todayIso())');
  ev(`S.sess={access:'x',refresh:'y',exp:Date.now()+3600000};S.ready=true;S.tab='bills';S.who='ALL';S.msg='';
    const R=(id,kind,data)=>({id,kind,version:1,data});
    S.recs=[
      R('b1','bill',{name:'IPVA 2026 (cota única)',dueDay:16,variable:false,amountC:449036,recurring:false,holder:'MARCELO',account:'Mercado Pago da Elisa',startYm:'${ym}'}),
      R('m1','billmonth',{billId:'b1',ym:'${ym}',amountC:449036,paidAt:'2026-10-16'}),
      R('b2','bill',{name:'Conta de luz',dueDay:10,variable:true,amountC:null,recurring:true,holder:'MARLENE',account:'',startYm:'${ym}'}),
      R('m2','billmonth',{billId:'b2',ym:'${ym}',amountC:null,paidAt:null}),
      R('b3','bill',{name:'Aluguel',dueDay:5,variable:false,amountC:120000,recurring:true,holder:'MARCELO',account:'',startYm:'${ym}'}),
      R('m3','billmonth',{billId:'b3',ym:'${ym}',amountC:120000,paidAt:null}),
      R('b4','bill',{name:'Conta antiga',dueDay:3,variable:false,amountC:1000,recurring:false,holder:'MARCELO',account:'',startYm:'2020-01'}),
      R('d1','debt',{creditor:'Banco A',balanceC:100000,installC:10000,rateBp:null,dueDay:16,status:'ATIVA',kindD:'Empréstimo',holder:'MARCELO',payer:'MARCELO',account:'',note:'observação do empréstimo'}),
      R('d2','debt',{creditor:'Banco B',balanceC:0,installC:0,rateBp:null,status:'PAGA',holder:'MARCELO',payer:'MARCELO',account:'',note:''}),
      R('c1','card',{name:'Cartão X',last4:'1234',limitC:300000,closeDay:10,dueDay:17,holder:'MARCELO'}),
      R('ch1','charge',{cardId:'c1',date:todayIso(),desc:'Compra',totalC:5000,n:1,firstC:null,by:''})];`);

  // ---- Contas: cada conta aparece UMA vez, em blocos
  const bills = ev('vBills()');
  t('contas: a conta IPVA aparece uma vez só', count(bills, 'IPVA 2026'), 1);
  t('contas: luz, aluguel e conta antiga aparecem uma vez só cada', count(bills, 'Conta de luz') === 1 && count(bills, 'Aluguel') === 1 && count(bills, 'Conta antiga') === 1, true);
  t('contas: sumiu a lista repetida "Contas cadastradas"', !/<h2>Contas cadastradas/.test(bills), true);
  t('contas: blocos na ordem Para pagar, Pagas, Outras', bills.indexOf('Para pagar (2)') > 0 && bills.indexOf('Para pagar (2)') < bills.indexOf('Pagas (1)') && bills.indexOf('Pagas (1)') < bills.indexOf('Outras contas cadastradas'), true);
  t('contas: a conta que não é deste mês só aparece em "Outras"', bills.indexOf('Conta antiga') > bills.indexOf('Outras contas cadastradas'), true);
  t('contas: o resumo do mês vem antes dos blocos', bills.indexOf('Total conhecido do mês') > 0 && bills.indexOf('Total conhecido do mês') < bills.indexOf('Para pagar'), true);
  t('contas: conta paga mostra a data em que foi paga', /Paga em 16\/10\/2026/.test(bills), true);
  t('contas: a conta sem valor continua sendo cobrada (Sem valor ou Em atraso)', /Sem valor|Em atraso/.test(bills.slice(bills.indexOf('Conta de luz') - 200, bills.indexOf('Conta de luz') + 400)), true);

  // ---- Dívidas: em aberto e pagas, com resumo e nome legível
  const debts = ev('vDebts()');
  t('dívidas: blocos Em aberto e Pagas com resumo', /Em aberto \(1\)/.test(debts) && /Pagas \(1\)/.test(debts) && /Soma das parcelas por mês/.test(debts), true);
  t('dívidas: situação escrita normal (Ativa, Paga), não em maiúsculas', />Ativa</.test(debts) && />Paga</.test(debts) && !/>ATIVA</.test(debts), true);
  t('dívidas: a observação da dívida aparece', /observação do empréstimo/.test(debts), true);

  // ---- Início: resume, não repete
  const home = ev('vHome()');
  t('início: cartões só resumidos (total e toque para a aba Cartões)', /data-act="tab" data-v="cards"/.test(home) && !/Pode usar/.test(home) && !/Fatura atual/.test(home), true);
  t('início: botão "Carregar exemplos" some quando já há dados', !/demo-on/.test(home), true);
  const cards = ev('vCards()');
  t('aba Cartões: tem tudo de cada cartão (usado, pode usar, fatura atual, vence)', ['Usado', 'Pode usar', 'Fatura atual', 'Vence'].every(k => cards.indexOf(k) > 0), true);

  // ---- Voltar no topo de TODA janela
  ev(`S.tab='bills';render();`);
  click(doc.querySelector('#app [data-act="bill-open"]'));
  t('janela da conta: tem "← Voltar" no topo', !!doc.querySelector('.modal .sheet .mbar .mback'), true);
  t('janela: o Voltar do topo é o primeiro item da janela', doc.querySelector('.modal .sheet').firstElementChild.className === 'mbar', true);
  click(doc.querySelector('.modal .mback')); await wait(20);
  t('janela da conta: Voltar do topo fecha a janela', !doc.querySelector('.modal'), true);

  const pc = ev('confirmBox("Titulo",["linha"],"Sim")');
  t('confirmação: tem Voltar no topo', !!doc.querySelector('.modal .mback'), true);
  click(doc.querySelector('.modal .mback'));
  t('confirmação: Voltar do topo responde "não"', await pc, false);

  const pf = ev(`form('Editar conta',[{k:'name',label:'Nome',type:'text',req:true},{k:'dueDay',label:'Dia',type:'int',min:1,max:31,req:true}],{name:'x',dueDay:5},{save:async()=>{}})`);
  t('formulário: tem Voltar no topo', !!doc.querySelector('.modal .mback'), true);
  click(doc.querySelector('.modal .mback'));
  t('formulário: Voltar do topo fecha sem salvar', await pf, null);

  const pi = ev('info("Aviso","texto")');
  click(doc.querySelector('.modal .mback')); await pi;
  t('aviso: Voltar do topo fecha', !doc.querySelector('.modal'), true);

  // janela do chat financeiro (tem dois botões parecidos: o Voltar do topo precisa fechar, não aplicar)
  ev('chatMenu()');
  t('chat financeiro: tem Voltar no topo', !!doc.querySelector('.modal .mback'), true);
  click(doc.querySelector('.modal .mback'));
  t('chat financeiro: Voltar do topo fecha', !doc.querySelector('.modal'), true);

  const mc = ev(`modal('<h3>Colar mudanças</h3><textarea id="tx"></textarea><button id="ok">Conferir</button><button id="no" class="sec">Voltar</button>')`);
  mc.querySelector('#no').onclick = () => mc.remove();   /* como na janela real */
  let confere = false; doc.querySelector('#ok').addEventListener('click', () => { confere = true; });
  click(doc.querySelector('.modal .mback'));
  t('colar mudanças: o Voltar do topo NÃO aciona o "Conferir", só sai', confere === false && !doc.querySelector('.modal'), true);

  // janela sem botão de sair próprio também fecha
  ev(`modal('<h3>Sem botão</h3>')`);
  click(doc.querySelector('.modal .mback'));
  t('janela sem botão próprio: Voltar do topo fecha', !doc.querySelector('.modal'), true);

  t('código: o Voltar do topo está na função modal() e o CSS é fixo no topo', /class="mbar"/.test(html) && /\.mbar\{position:sticky;top:0/.test(html), true);
  t('FIN: versão do cache subiu para v2', /fin-app-v2/.test(fs.readFileSync(path.join(__dirname, '..', 'fin', 'sw.js'), 'utf8')), true);

  console.log(ok + ' ok, ' + bad + ' falhas (FIN)');
  process.exit(bad ? 1 : 0);
})();
