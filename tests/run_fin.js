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
  const ym = ev('ymOf(todayIso())'), ym1 = ev(`addMonths('${ym}',1)`);
  ev(`S.sess={access:'x',refresh:'y',exp:Date.now()+3600000};S.ready=true;S.tab='bills';S.who='ALL';S.msg='';S.mm=null;S.mf='all';
    const R=(id,kind,data)=>({id,kind,version:1,data});
    S.recs=[
      R('b1','bill',{name:'IPVA 2026 (cota única)',dueDay:16,variable:false,amountC:449036,recurring:false,holder:'MARCELO',account:'Mercado Pago da Elisa',startYm:'${ym}'}),
      R('m1','billmonth',{billId:'b1',ym:'${ym}',amountC:449036,paidAt:'2026-10-16'}),
      R('b2','bill',{name:'Conta de luz',dueDay:10,variable:true,amountC:null,recurring:true,holder:'MARLENE',account:'',startYm:'${ym}'}),
      R('m2','billmonth',{billId:'b2',ym:'${ym}',amountC:null,paidAt:null}),
      R('b3','bill',{name:'Aluguel',dueDay:5,variable:false,amountC:120000,recurring:true,holder:'MARCELO',account:'',startYm:'${ym}'}),
      R('m3','billmonth',{billId:'b3',ym:'${ym}',amountC:120000,paidAt:null}),
      R('b4','bill',{name:'Conta antiga',dueDay:3,variable:false,amountC:1000,recurring:false,holder:'MARCELO',account:'',startYm:'2020-01'}),
      R('d1','debt',{creditor:'Banco A',balanceC:100000,installC:10000,rateBp:null,dueDay:28,status:'ATIVA',kindD:'Empréstimo',holder:'MARCELO',payer:'MARCELO',account:'',note:'observação do empréstimo'}),
      R('d2','debt',{creditor:'Banco B',balanceC:0,installC:0,rateBp:null,dueDay:9,status:'PAGA',holder:'MARCELO',payer:'MARCELO',account:'',note:''}),
      R('d3','debt',{creditor:'Mercado Pago da Elisa',balanceC:681528,installC:56794,rateBp:null,dueDay:16,firstDue:'${ym1}-16',status:'ATIVA',kindD:'Empréstimo',holder:'MARCELO',payer:'MARCELO',account:'',note:''}),
      R('c1','card',{name:'Cartão X',last4:'1234',limitC:300000,closeDay:10,dueDay:17,holder:'MARCELO'}),
      R('ch1','charge',{cardId:'c1',date:'${ym}-05',desc:'Compra',totalC:5000,n:1,firstC:null,by:''})];`);

  // ---- Planilha do mês
  const mes = ev('vMonth()');
  t('mês: é uma tabela com Dia, O que e Valor', /class="tbl"/.test(mes) && />Dia</.test(mes) && />O que</.test(mes) && />Valor</.test(mes), true);
  t('mês: cada conta aparece uma vez só', count(mes, 'IPVA 2026') === 1 && count(mes, 'Conta de luz') === 1 && count(mes, 'Aluguel') === 1, true);
  t('mês: reúne contas, fatura do cartão e parcela de dívida', /Fatura Cartão X/.test(mes) && /Banco A/.test(mes) && /IPVA 2026/.test(mes), true);
  t('mês: dívida paga (Banco B) e dívida que começa no mês que vem (Mercado Pago) não aparecem neste mês', !/Banco B/.test(mes) && !/Mercado Pago da Elisa</.test(mes.replace(/conta Mercado Pago da Elisa/g, '')), true);
  t('mês: ordenado por data (luz dia 10 antes do IPVA dia 16)', mes.indexOf('Conta de luz') < mes.indexOf('IPVA 2026'), true);
  t('mês: cada linha mostra dia e dia da semana', /<span class="d"><b>16<\/b><i>(dom|seg|ter|qua|qui|sex|sáb)<\/i>/.test(mes), true);
  t('mês: IPVA aparece como Paga e a luz sem valor como Em atraso ou Sem valor', /IPVA 2026[^]*?>Paga</.test(mes) && /Conta de luz[^]*?(Em atraso|Sem valor)/.test(mes), true);
  t('mês: resumo do mês (total, já pago, falta pagar) numa linha só, uma vez, antes da tabela', count(mes, 'Total do mês') === 1 && count(mes, 'Já pago') === 1 && count(mes, '<div class="mut">Falta pagar</div>') === 1 && mes.indexOf('sum3') < mes.indexOf('class="tbl"'), true);
  t('mês: a tabela vem antes do botão Nova conta', mes.indexOf('class="tbl"') < mes.indexOf('data-act="bill-new"'), true);
  t('mês: filtros Tudo, Falta pagar e Pagas com a contagem', /Tudo \(5\)/.test(mes) && /Falta pagar \(4\)/.test(mes) && /Pagas \(1\)/.test(mes), true);
  t('mês: conta que não vence neste mês só aparece em "Outras contas cadastradas"', mes.indexOf('Conta antiga') > mes.indexOf('Outras contas cadastradas') && count(mes, 'Conta antiga') === 1, true);
  t('mês: botão Nova conta e a aba chama Mês (a aba Contas saiu)', /data-act="bill-new"/.test(mes) && /'bills','📅','Mês'/.test(html) && !/'bills','🧾','Contas'/.test(html), true);

  ev(`S.mf='open'`); const aberto = ev('vMonth()');
  t('filtro Falta pagar: some a conta paga e ficam as outras', !/IPVA 2026/.test(aberto) && /Aluguel/.test(aberto), true);
  ev(`S.mf='paid'`); const pagas = ev('vMonth()');
  t('filtro Pagas: só a conta paga', /IPVA 2026/.test(pagas) && !/Aluguel/.test(pagas), true);
  ev(`S.mf='all'; S.mm=addMonths('${ym}',1)`); const prox = ev('vMonth()');
  t('mês que vem: contas fixas como Previsto, luz sem valor e a 1ª parcela da dívida do Mercado Pago', /Aluguel[^]*?>Previsto</.test(prox) && /Conta de luz[^]*?>Sem valor</.test(prox) && /Mercado Pago da Elisa/.test(prox) && prox.indexOf('IPVA 2026') > prox.indexOf('Outras contas cadastradas'), true);
  ev(`S.mm=null`);

  // ---- as parcelas das dívidas (funções puras)
  t('dívida: com 3 parcelas de saldo, deve este mês e os 2 seguintes, e não o 4º', ev(`debtOwes({dueDay:5,balanceC:30000,installC:10000},'${ym}')`) === true && ev(`debtOwes({dueDay:5,balanceC:30000,installC:10000},addMonths('${ym}',2))`) === true && ev(`debtOwes({dueDay:5,balanceC:30000,installC:10000},addMonths('${ym}',3))`) === false, true);
  t('dívida: 1ª parcela no mês que vem não deve este mês', ev(`debtOwes({dueDay:16,balanceC:100000,installC:10000,firstDue:'${ym1}-16'},'${ym}')`) === false && ev(`debtOwes({dueDay:16,balanceC:100000,installC:10000,firstDue:'${ym1}-16'},'${ym1}')`) === true, true);
  t('dívida: marcar paga tira a parcela do saldo e guarda o mês', JSON.stringify(ev(`(function(){const n=debtPayData({balanceC:30000,installC:10000,status:'ATIVA',paidYm:[]},'${ym}',false);return [n.balanceC,n.paidYm,n.status];})()`)), JSON.stringify([20000, [ym], 'ATIVA']));
  t('dívida: desfazer devolve o saldo e tira o mês', JSON.stringify(ev(`(function(){const x=debtPayData({balanceC:30000,installC:10000,status:'ATIVA',paidYm:[]},'${ym}',false);const n=debtPayData(x,'${ym}',true);return [n.balanceC,n.paidYm];})()`)), JSON.stringify([30000, []]));
  t('dívida: na última parcela vira Paga, e ao desfazer volta a Ativa', JSON.stringify(ev(`(function(){const x=debtPayData({balanceC:10000,installC:10000,status:'ATIVA',paidYm:[]},'${ym}',false);const n=debtPayData(x,'${ym}',true);return [x.balanceC,x.status,n.balanceC,n.status];})()`)), JSON.stringify([0, 'PAGA', 10000, 'ATIVA']));
  t('dívida: desfazer um mês que não estava pago não mexe no saldo', ev(`debtPayData({balanceC:30000,installC:10000,status:'ATIVA',paidYm:[]},'${ym}',true).balanceC`), 30000);
  t('dívida: parcela já paga neste mês faz a próxima ser a do mês seguinte', ev(`debtNext({dueDay:5,balanceC:30000,installC:10000,paidYm:['${ym}']},false)`) === ev(`dateOf(addMonths('${ym}',1),5)`), true);

  // ---- toque nas linhas da planilha
  ev(`S.tab='bills';render();`);
  click(doc.querySelector('#app [data-act="m-open"][data-k="bill"]'));
  t('toque numa conta: abre a janela da conta com Voltar no topo', !!doc.querySelector('.modal .mback') && /Marcar como paga|Desfazer/.test(doc.querySelector('.modal').textContent), true);
  click(doc.querySelector('.modal .mback')); await wait(20);
  t('janela da conta: Voltar do topo fecha', !doc.querySelector('.modal'), true);
  click(doc.querySelector('#app [data-act="m-open"][data-k="debt"]'));
  t('toque numa parcela de dívida: janela com Marcar como paga, Editar e Voltar no topo', !!doc.querySelector('.modal #d-pay') && !!doc.querySelector('.modal #d-edit') && !!doc.querySelector('.modal .mback'), true);
  click(doc.querySelector('.modal .mback')); await wait(20);
  t('janela da parcela: Voltar do topo fecha', !doc.querySelector('.modal'), true);
  click(doc.querySelector('#app [data-act="m-open"][data-k="inv"]'));
  t('toque numa fatura: vai para a tela do cartão', ev('S.tab') === 'cards' && ev('S.cardId') === 'c1', true);
  ev(`S.tab='bills';S.cardId=null;render();`);
  click(doc.querySelector('#app [data-act="m-next"]'));
  t('seta ›: vai para o mês seguinte', ev('S.mm') === ym1, true);
  click(doc.querySelector('#app [data-act="m-prev"]')); click(doc.querySelector('#app [data-act="m-prev"]'));
  t('seta ‹: volta um mês e o botão do meio volta para este mês', ev('S.mm') === ev(`addMonths('${ym}',-1)`), true);
  click(doc.querySelector('#app [data-act="m-today"]'));
  t('botão do mês: volta para este mês', ev('S.mm') === null, true);
  click(doc.querySelector('#app [data-act="m-filter"][data-v="paid"]'));
  t('filtro: tocar em Pagas mostra só as pagas', ev('S.mf') === 'paid' && !/Aluguel/.test(doc.querySelector('#app').innerHTML), true);
  ev(`S.mf='all'`);

  // ---- Dívidas, Cartões e Início (sem repetir)
  const debts = ev('vDebts()');
  t('dívidas: blocos Em aberto e Pagas com resumo; situação em letras normais', /Em aberto \(2\)/.test(debts) && /Pagas \(1\)/.test(debts) && /Soma das parcelas por mês/.test(debts) && />Ativa</.test(debts) && !/>ATIVA</.test(debts), true);
  t('dívidas: mostra a próxima parcela', /próxima parcela em/.test(debts), true);
  const home = ev('vHome()');
  t('início: cartões só resumidos (total e toque para a aba Cartões)', /data-act="tab" data-v="cards"/.test(home) && !/Pode usar/.test(home) && !/Fatura atual/.test(home), true);
  t('início: botão "Carregar exemplos" some quando já há dados', !/demo-on/.test(home), true);
  const cards = ev('vCards()');
  t('aba Cartões: usado, pode usar, fatura atual e vence', ['Usado', 'Pode usar', 'Fatura atual', 'Vence'].every(k => cards.indexOf(k) > 0), true);

  // ---- Voltar no topo de TODA janela
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
  ev('chatMenu()');
  t('chat financeiro: tem Voltar no topo', !!doc.querySelector('.modal .mback'), true);
  click(doc.querySelector('.modal .mback'));
  t('chat financeiro: Voltar do topo fecha', !doc.querySelector('.modal'), true);
  const mc = ev(`modal('<h3>Colar mudanças</h3><textarea id="tx"></textarea><button id="ok">Conferir</button><button id="no" class="sec">Voltar</button>')`);
  mc.querySelector('#no').onclick = () => mc.remove();   /* como na janela real */
  let confere = false; doc.querySelector('#ok').addEventListener('click', () => { confere = true; });
  click(doc.querySelector('.modal .mback'));
  t('colar mudanças: o Voltar do topo NÃO aciona o "Conferir", só sai', confere === false && !doc.querySelector('.modal'), true);
  ev(`modal('<h3>Sem botão</h3>')`);
  click(doc.querySelector('.modal .mback'));
  t('janela sem botão próprio: Voltar do topo fecha', !doc.querySelector('.modal'), true);
  ev(`debtForm(S.recs.find(r=>r.id==='d3'))`);
  t('formulário da dívida: tem o campo 1ª parcela e o Voltar no topo', !!doc.querySelector('.modal #f-firstDue') && !!doc.querySelector('.modal .mback'), true);
  click(doc.querySelector('.modal .mback'));

  t('código: Voltar fixo no topo em modal() e salvar da dívida não perde campos', /\.mbar\{position:sticky;top:0/.test(html) && /Object\.assign\(\{\},rec\.data,o\)/.test(html), true);
  t('FIN: versão do cache subiu para v3', /fin-app-v3/.test(fs.readFileSync(path.join(__dirname, '..', 'fin', 'sw.js'), 'utf8')), true);

  console.log(ok + ' ok, ' + bad + ' falhas (FIN)');
  process.exit(bad ? 1 : 0);
})();
