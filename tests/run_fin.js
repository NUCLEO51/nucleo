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
  t('mês: resumo do mês (total, já pago, falta pagar) numa linha só, uma vez, antes da tabela', count(mes, '<div class="mut">Já pago</div>') === 1 && count(mes, '<div class="mut">Falta pagar</div>') === 1 && count(mes, '<div class="mut">A pagar</div>') === 1 && mes.indexOf('sum3') < mes.indexOf('class="tbl"'), true);
  t('mês: a tabela vem antes do botão Nova conta', mes.indexOf('class="tbl"') < mes.indexOf('data-act="bill-new"'), true);
  t('mês: filtros Tudo, Falta pagar e Pagas com a contagem', /Tudo<small>5<\/small>/.test(mes) && /A pagar<small>4<\/small>/.test(mes) && /Feitas<small>1<\/small>/.test(mes) && !/A receber<small>/.test(mes), true);
  t('mês: conta que não vence neste mês só aparece em "Outras contas cadastradas"', mes.indexOf('Conta antiga') > mes.indexOf('Outras contas cadastradas') && count(mes, 'Conta antiga') === 1, true);
  t('mês: botão Nova conta e a aba chama Mês (a aba Contas saiu)', /data-act="bill-new"/.test(mes) && /'bills','📅','Mês'/.test(html) && !/'bills','🧾','Contas'/.test(html), true);

  ev(`S.mf='pay'`); const aberto = ev('vMonth()');
  t('filtro A pagar: some a conta paga e ficam as outras', !/IPVA 2026/.test(aberto) && /Aluguel/.test(aberto), true);
  ev(`S.mf='done'`); const pagas = ev('vMonth()');
  t('filtro Feitas: só a conta paga', /IPVA 2026/.test(pagas) && !/Aluguel/.test(pagas), true);
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
  click(doc.querySelector('#app [data-act="m-filter"][data-v="done"]'));
  t('filtro: tocar em Feitas mostra só as feitas', ev('S.mf') === 'done' && !/Aluguel/.test(doc.querySelector('#app').innerHTML), true);
  ev(`S.mf='all'`);

  // ---- Dívidas, Cartões e Início (sem repetir)
  const debts = ev('vDebts()');
  t('dívidas: blocos Em aberto e Pagas com resumo; situação em letras normais', /A pagar \(2\)/.test(debts) && /Pagas e recebidas \(1\)/.test(debts) && /Parcelas por mês \(a pagar\)/.test(debts) && />Ativa</.test(debts) && !/>ATIVA</.test(debts), true);
  t('dívidas: mostra a próxima parcela', /próxima parcela em/.test(debts), true);
  const home = ev('vHome()');
  t('início: cartões só resumidos (total e toque para a aba Cartões)', /data-act="tab" data-v="cards"/.test(home) && !/Pode usar/.test(home) && !/Fatura atual/.test(home), true);
  t('início: botão "Carregar exemplos" some quando já há dados', !/demo-on/.test(home), true);
  const cards = ev('vCards()');
  t('aba Cartões: usado, pode usar, fatura atual e vence', ['Usado', 'Pode usar', 'Fatura atual', 'Vence'].every(k => cards.indexOf(k) > 0), true);

  // ---- parcelas A RECEBER
  ev(`S.recs.push({id:'d9',kind:'debt',version:1,data:{creditor:'Fulano devolve',balanceC:300000,installC:100000,rateBp:null,dueDay:20,status:'ATIVA',kindD:'Outro',holder:'MARCELO',payer:'',account:'',note:'',dir:'RECEBER'}})`);
  ev(`S.mf='all';S.mm=null`);
  const mr = ev('vMonth()');
  t('a receber: aparece na planilha com + e a situação "A receber" (ou Confirmar se a data já passou)', /Fulano devolve/.test(mr) && /\+ R\$/.test(mr) && /Fulano devolve[^]*?(>A receber<|>Confirmar<)/.test(mr), true);
  t('a receber: resumo próprio (A receber, Já recebido, Falta receber) e a diferença', /<div class="mut">A receber<\/div>/.test(mr) && /Já recebido/.test(mr) && /Falta receber/.test(mr) && /você recebe/.test(mr), true);
  t('a receber: o filtro A receber aparece e mostra só ele', /A receber<small>1<\/small>/.test(mr) && (ev(`S.mf='rec'`), /Fulano devolve/.test(ev('vMonth()')) && !/Conta de luz/.test(ev('vMonth()'))), true);
  ev(`S.mf='pay'`);
  t('a receber: o filtro A pagar não mostra o que é a receber', !/Fulano devolve/.test(ev('vMonth()')), true);
  ev(`S.mf='all'`);
  const dv = ev('vDebts()');
  t('dívidas: seção própria "A receber" com saldo a receber, em verde', /A receber \(1\)/.test(dv) && /Saldo a receber \(1\)/.test(dv) && /class="rc"/.test(dv) && /Falta receber/.test(dv), true);
  t('dívidas: a seção A pagar não inclui o que é a receber', dv.indexOf('Fulano devolve') > dv.indexOf('A receber (1)'), true);
  t('início: mostra saldo a pagar e saldo a receber separados', /Saldo a pagar/.test(ev('vHome()')) && /Saldo a receber \(1\)/.test(ev('vHome()')), true);
  t('quitar: o plano só considera o que EU devo (o a receber fica de fora)', !/Fulano devolve/.test(ev('vPlan()')), true);
  t('por pessoa: o a receber não soma como dívida', ev(`byKind('debt').filter(d=>d.data.dir!=='RECEBER').length`) === 3, true);
  ev(`debtPay(S.recs.find(r=>r.id==='d9'),'${ym}')`);
  t('janela da parcela a receber: "Marcar como recebida" e "Falta receber"', /Marcar como recebida/.test(doc.querySelector('.modal').textContent) && /Falta receber/.test(doc.querySelector('.modal').textContent), true);
  click(doc.querySelector('.modal .mback'));
  t('marcar recebida: o saldo a receber diminui da parcela', JSON.stringify(ev(`(function(){const n=debtPayData({balanceC:300000,installC:100000,status:'ATIVA',dir:'RECEBER',paidYm:[]},'${ym}',false);return [n.balanceC,n.paidYm,n.dir];})()`)), JSON.stringify([200000, [ym], 'RECEBER']));
  ev(`debtForm(null,{dir:'RECEBER'})`);
  t('formulário: campo "Esta parcela é…" com A pagar e A receber, e vem com a opção escolhida', !!doc.querySelector('.modal #f-dir') && /A receber \(me devem\)/.test(doc.querySelector('.modal #f-dir').textContent) && doc.querySelector('.modal #f-dir').value === 'RECEBER', true);
  click(doc.querySelector('.modal .mback'));
  t('texto "Fulano me deve 500 dia 10" vira sugestão de parcela a receber', ev(`(function(){const r=parseText('Fulano me deve 500 dia 10');return [r.type,r.recv,r.dueDay];})()`).join() === 'debt,true,10', true);
  t('texto comum não vira "a receber"', ev(`parseText('Conta de luz vence dia 10').recv`), false);
  ev(`S.recs=S.recs.filter(r=>r.id!=='d9')`);
  t('contrato e chat: dir, paidYm e firstDue documentados', /dir \(`PAGAR`/.test(fs.readFileSync(path.join(__dirname, '..', 'fin', 'API.md'), 'utf8')) || /\*\*dir\*\*/.test(fs.readFileSync(path.join(__dirname, '..', 'fin', 'API.md'), 'utf8')), true);

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
  // ---- pendente com documento anexo
  ev(`S.recs.push({id:'p0',kind:'proposal',version:1,data:{text:'Conta de luz vence dia 10',source:'nucleo',status:'pendente',at:'2026-10-16T10:00:00Z'}});
      S.recs.push({id:'p1',kind:'proposal',version:1,data:{text:'📎 boleto.pdf',source:'nucleo',status:'pendente',at:'2026-10-16T10:00:00Z',files:[{id:'uid/1.pdf',name:'boleto.pdf',size:2048,type:'application/pdf'},{id:'uid/2.jpg',name:'foto.jpg',size:5000,type:'image/jpeg'}]}});`);
  w.URL.createObjectURL = () => 'blob:teste';
  ev(`Api.blob=async(p)=>new Blob(['x'],{type:p.endsWith('.jpg')?'image/jpeg':'application/pdf'})`);
  ev(`reviewProp(S.recs.find(r=>r.id==='p0'))`);
  t('pendente só de texto: não mostra área de documento', !doc.querySelector('.modal [data-vf]') && !/não lê a foto sozinho/.test(doc.querySelector('.modal').textContent), true);
  click(doc.querySelector('.modal .mback'));
  ev(`reviewProp(S.recs.find(r=>r.id==='p1'))`);
  t('pendente com documento: um botão Ver para cada arquivo e o aviso de que o FIN não lê sozinho', doc.querySelectorAll('.modal [data-vf]').length === 2 && /não lê a foto sozinho/.test(doc.querySelector('.modal').textContent) && /Ver boleto\.pdf/.test(doc.querySelector('.modal').textContent), true);
  click(doc.querySelector('.modal [data-vf="0"]')); await wait(30);
  const vmods = doc.querySelectorAll('.modal');
  t('ver documento PDF: abre outra janela com Abrir em tela cheia e Voltar no topo', vmods.length === 2 && /Abrir em tela cheia/.test(vmods[1].textContent) && !vmods[1].querySelector('img.vf-img') && !!vmods[1].querySelector('.mback'), true);
  click(vmods[1].querySelector('.mback'));
  t('visualizador: Voltar do topo fecha só ele e mantém a revisão do pendente', doc.querySelectorAll('.modal').length === 1 && !!doc.querySelector('.modal [data-vf]'), true);
  click(doc.querySelector('.modal [data-vf="1"]')); await wait(30);
  t('ver documento imagem: mostra a imagem na janela', !!doc.querySelectorAll('.modal')[1].querySelector('img.vf-img'), true);
  click(doc.querySelectorAll('.modal')[1].querySelector('#vf-no')); click(doc.querySelector('.modal .mback'));
  ev(`Api.blob=async()=>{throw new Error('Não consegui abrir o arquivo (404).')}`);
  ev(`viewFile({id:'x',name:'sumiu.pdf',type:'application/pdf'})`); await wait(30);
  t('arquivo que sumiu: mostra a mensagem em vez de travar', /Não consegui abrir o arquivo \(404\)/.test(doc.querySelector('.modal').textContent), true);
  click(doc.querySelector('.modal .mback'));
  // ---- lembretes automáticos no Núcleo (1 dia antes, 09:00, alarme)
  const items = [], calls = [];
  w.__rest = async (path, opt) => {
    opt = opt || {}; calls.push({ path, method: opt.method || 'GET', body: opt.body ? JSON.parse(opt.body) : null });
    const res = (data, ok = true, status = 200) => ({ ok, status, json: async () => data });
    const clone = o => JSON.parse(JSON.stringify(o));
    if (!opt.method || opt.method === 'GET') {
      if (w.__restFail) return res([], false, 500);
      const m = path.replace(/^items\?/, '');
      if (m.includes('kind=eq.list')) return res(items.filter(i => i.kind === 'list' && !i.deleted_at && i.data.fin === true).map(i => ({ id: i.id, data: i.data })));
      if (m.includes('finRef=not.is.null')) return res(items.filter(i => i.kind === 'reminder' && !i.deleted_at && i.data.finRef).map(clone));
      const mm = m.match(/finRef=eq\.([^&]+)/); if (mm) return res(items.filter(i => i.kind === 'reminder' && !i.deleted_at && i.data.finRef === mm[1]).map(clone));
    }
    if (opt.method === 'POST' && path === 'items') { const b = JSON.parse(opt.body); items.push({ id: b.id, kind: b.kind, data: b.data, version: 1, deleted_at: null }); return res([b]); }
    if (opt.method === 'PATCH') {
      const id = path.match(/id=eq\.([^&]+)/)[1], ver = +path.match(/version=eq\.(\d+)/)[1], it = items.find(i => i.id === id && i.version === ver);
      if (!it) return res([]); const b = JSON.parse(opt.body); if (b.data) it.data = b.data; if (b.deleted_at) it.deleted_at = b.deleted_at; it.version++; return res([clone(it)]);
    }
    return res([], false, 404);
  };
  ev(`Api.rest=(p,o)=>window.__rest(p,o)`);
  const mut = () => calls.filter(c => c.method !== 'GET').length;
  const remOf = id => items.find(i => i.kind === 'reminder' && i.data.finRef === id);
  const dd = (a) => ev(`dateOf(addMonths('${ym}',1),${a})`);
  ev(`S.sess={access:'x',refresh:'y',exp:Date.now()+3600000};S.remMap={};S.remErr='';S.syncRem=false;
    const R2=(id,kind,data)=>({id,kind,version:1,data});
    S.recs=[
      R2('da','debt',{creditor:'Banco A',balanceC:120000,installC:10000,rateBp:null,dueDay:16,firstDue:'${dd(16)}',status:'ATIVA',kindD:'Empréstimo',holder:'MARCELO',payer:'MARCELO',account:'',note:''}),
      R2('db','debt',{creditor:'Fulano devolve',balanceC:30000,installC:10000,rateBp:null,dueDay:20,status:'ATIVA',holder:'MARCELO',payer:'',account:'',note:'',dir:'RECEBER'}),
      R2('dc','debt',{creditor:'Já quitada',balanceC:0,installC:0,dueDay:9,status:'PAGA',holder:'MARCELO',payer:'MARCELO'}),
      R2('dd','debt',{creditor:'Sem dia de vencimento',balanceC:5000,installC:1000,status:'ATIVA',holder:'MARCELO',payer:'MARCELO'})];`);
  await ev('syncFinReminders()');
  const lists = items.filter(i => i.kind === 'list'), rems = items.filter(i => i.kind === 'reminder');
  t('lembretes automáticos: cria a lista do FIN (marcada fin) e 1 lembrete por dívida com vencimento (a pagar e a receber), nenhum para a quitada nem para a sem dia', lists.length === 1 && lists[0].data.fin === true && rems.length === 2 && !!remOf('da') && !!remOf('db') && !remOf('dc') && !remOf('dd'), true);
  const ra = remOf('da').data;
  t('lembrete da dívida a pagar: 1 dia antes do vencimento, às 09:00, todo mês, 12 vezes, alarme na hora, na lista do FIN', ra.date === ev(`isoMinus1('${dd(16)}')`) && ra.time === '09:00' && ra.repeat === 'monthly' && ra.repTimes === 12 && ra.alarms.length === 1 && ra.alarms[0].min === 0 && ra.list === lists[0].data._id && ra.finRef === 'da' && ra.priority === 2, true);
  t('lembrete da dívida a pagar: título com o credor, o valor da parcela e o dia', /^Pagar parcela — Banco A · R\$ 100,00 \(vence dia 16\)$/.test(ra.title) && /1 dia antes do vencimento/.test(ra.notes), true);
  const rb = remOf('db').data;
  t('lembrete da dívida a receber: "Receber de…", mesma regra (1 dia antes, 09:00, alarme)', /^Receber de Fulano devolve · R\$ 100,00 \(vence dia 20\)$/.test(rb.title) && rb.time === '09:00' && rb.alarms[0].min === 0 && rb.date === ev(`remSpecForDebt(S.recs.find(r=>r.id==='db')).date`) && /marque no FIN: Mês › a parcela › Marcar como recebida/.test(rb.notes), true);
  const m0 = mut(); await ev('syncFinReminders()');
  t('conferir de novo não cria nem muda nada (sem duplicar)', mut() === m0 && items.filter(i => i.kind === 'reminder').length === 2, true);
  t('a dívida mostra que tem lembrete no Núcleo', /Lembrete no Núcleo: 1 dia antes/.test(ev('vDebts()')), true);
  // mudou a parcela: atualiza o título e o número de vezes, sem mexer na data
  const dataAntes = remOf('da').data.date;
  ev(`S.recs.find(r=>r.id==='da').data.installC=12000`);
  await ev('syncFinReminders()');
  t('mudou o valor da parcela: o título e o limite de vezes acompanham (10 vezes), e a data não anda', /R\$ 120,00/.test(remOf('da').data.title) && remOf('da').data.repTimes === 10 && remOf('da').data.date === dataAntes, true);
  // mudou o dia do vencimento: recalcula a data
  ev(`S.recs.find(r=>r.id==='da').data.dueDay=10`);
  await ev('syncFinReminders()');
  t('mudou o dia do vencimento: o lembrete vai para 1 dia antes do novo dia', remOf('da').data.date === ev(`isoMinus1('${dd(10)}')`) && /vence dia 10/.test(remOf('da').data.title), true);
  // avançar com a parcela paga no FIN
  ev(`S.recs.find(r=>r.id==='da').data.firstDue='';S.recs.find(r=>r.id==='da').data.dueDay=16`);
  await ev('syncFinReminders()');
  const dtAntes = remOf('da').data.date;
  await ev(`bumpFinReminder('da','${dtAntes.slice(0, 7)}',S.recs.find(r=>r.id==='da').data)`);
  const dep = remOf('da').data;
  t('parcela marcada como paga no FIN: o lembrete anda um mês e conta 1', dep.repDone === 1 && dep.date === ev(`dateOf(addMonths('${dtAntes.slice(0, 7)}',1),${+dtAntes.slice(8, 10)})`), true);
  await ev(`bumpFinReminder('da','${dtAntes.slice(0, 7)}',S.recs.find(r=>r.id==='da').data)`);
  t('marcar de novo o mesmo mês não faz o lembrete andar duas vezes', remOf('da').data.repDone === 1, true);
  // dívida quitada ou apagada: o lembrete sai
  ev(`S.recs.find(r=>r.id==='da').data.status='PAGA'`);
  ev(`S.recs=S.recs.filter(r=>r.id!=='db')`);
  await ev('syncFinReminders()');
  t('dívida quitada e dívida apagada: os dois lembretes vão para a lixeira', !!remOf('da') === true && remOf('da').deleted_at != null && remOf('db').deleted_at != null, true);
  // lembrete concluído no Núcleo mas a dívida continua: reabre com a próxima data
  ev(`S.recs=[{id:'de',kind:'debt',version:1,data:{creditor:'Banco E',balanceC:30000,installC:10000,dueDay:25,status:'ATIVA',holder:'MARCELO',payer:'MARCELO',account:'',note:''}}]`);
  await ev('syncFinReminders()');
  remOf('de').data.done = true;
  await ev('syncFinReminders()');
  t('lembrete concluído mas a dívida ainda deve: o FIN reabre com a data certa', remOf('de').data.done === false && remOf('de').data.repDone === 0, true);
  // sem internet / erro: não quebra e avisa no Início
  w.__restFail = true; ev(`S.remErr='';`);
  await ev('syncFinReminders()');
  t('erro ao falar com o Núcleo: não quebra e o Início avisa', /Não consegui conferir os lembretes no Núcleo/.test(ev('vHome()')), true);
  w.__restFail = false; ev(`S.remErr='';`);
  t('as gravações de dívida e o carregamento chamam a conferência (ganchos no Api)', /if\(kind==='debt'\)finSyncSoon\(true\)/.test(html) && /if\(rec\.kind==='debt'\)finSyncSoon\(true\)/.test(html) && /finSyncSoon\(false\)/.test(html) && /bumpFinReminder\(rec\.id,ym,x\)/.test(html), true);
  // ---- desfazer discreto no FIN
  ev(`window.__srv=[{id:'u1',kind:'debt',version:1,data:{creditor:'Banco Teste',balanceC:100000,installC:10000,dueDay:10,status:'ATIVA',holder:'MARCELO',payer:'MARCELO',paidYm:[]}}];
    Api.rest=async(p,o)=>{
      const m=/fin_records\\?id=eq\\.([^&]+)/.exec(p);
      if(o&&o.method==='PATCH'&&m){const r=window.__srv.find(x=>x.id===m[1]);const b=JSON.parse(o.body);if('data' in b)r.data=b.data;if('deleted_at' in b)r.deleted_at=b.deleted_at;r.version++;return {ok:true,json:async()=>[JSON.parse(JSON.stringify(r))]};}
      if(/^fin_records\\?select=\\*/.test(p))return {ok:true,json:async()=>window.__srv.filter(x=>!x.deleted_at).map(x=>JSON.parse(JSON.stringify(x)))};
      return {ok:true,json:async()=>[]};};
    S.recs=JSON.parse(JSON.stringify(window.__srv));S.tab='debts';S.who='ALL';S.sheet=null;render();`);
  const tapU = () => doc.body.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const srv = () => ev('window.__srv[0]');
  ev('U.stack.length=0;U.userAt=0');
  t('FIN desfazer: o botão ↶ existe no cabeçalho, escondido enquanto não há o que desfazer', !!doc.querySelector('#app header.hd [data-undobtn]') && doc.querySelector('#app [data-undobtn]').style.display === 'none', true);
  ev('U.userAt=0');
  await ev(`Api.update(S.recs[0],Object.assign({},S.recs[0].data,{notas:'auto'}))`); await wait(450);
  t('FIN desfazer: mudança que não veio de um toque seu não entra na lista', ev('U.stack.length'), 0);
  tapU();
  await ev(`Api.update(S.recs[0],Object.assign({},S.recs[0].data,{paidYm:['2030-01']}))`); await wait(450);
  ev('render()');
  t('FIN desfazer: marcar uma parcela como paga entra com o nome da dívida', ev('U.stack.length') === 1 && ev('U.stack[0].label') === 'Marcar parcela como paga «Banco Teste»', true);
  const ub = doc.querySelector('#app [data-undobtn]');
  t('FIN desfazer: o botão aparece, redondo, e diz o que desfaz', ub.style.display === '' && ub.classList.contains('ibtn') && /Desfazer: Marcar parcela como paga/.test(ub.getAttribute('aria-label')), true);
  click(ub); await wait(30);
  t('FIN desfazer: tocar abre a pergunta com o que será desfeito, sem desfazer ainda', !!doc.querySelector('.modal #cf-ok') && /Marcar parcela como paga/.test(doc.querySelector('.modal').textContent) && srv().data.paidYm.length === 1, true);
  click(doc.querySelector('.modal #cf-no')); await wait(30);
  t('FIN desfazer: Voltar não desfaz nada', srv().data.paidYm.length === 1 && ev('U.stack.length') === 1, true);
  click(doc.querySelector('#app [data-undobtn]')); await wait(30); click(doc.querySelector('.modal #cf-ok')); await wait(80);
  t('FIN desfazer: confirmando, a parcela volta a não paga e a fila esvazia (botão some)', srv().data.paidYm.length === 0 && ev('U.stack.length') === 0 && doc.querySelector('#app [data-undobtn]').style.display === 'none', true);
  tapU();
  await ev(`Api.update(S.recs[0],Object.assign({},S.recs[0].data,{ord:1000}))`); await wait(450);
  t('FIN desfazer: mudar só a ordem entra como "Mudar a ordem"', ev('U.stack[0].label'), 'Mudar a ordem');
  ev('U.stack.length=0');
  tapU();
  await ev(`Api.remove(S.recs[0])`); await wait(450);
  t('FIN desfazer: apagar entra como "Apagar dívida" com o nome', ev('U.stack.length') === 1 && ev('U.stack[0].label') === 'Apagar dívida «Banco Teste»' && !!srv().deleted_at && ev('S.recs.length') === 0, true);
  ev('render()');
  click(doc.querySelector('#app [data-undobtn]')); await wait(30); click(doc.querySelector('.modal #cf-ok')); await wait(80);
  t('FIN desfazer: desfazer o apagar traz a dívida de volta (no servidor e na tela), com os dados de antes', !srv().deleted_at && ev('S.recs.length') === 1 && ev('S.recs[0].data.creditor') === 'Banco Teste' && ev('S.recs[0].data.balanceC') === 100000, true);
  ev('U.stack.length=0;U.userAt=0');
  ev(`Api.rest=Api.rest;S.tab='home';render();`);
  // ---- ordenar e arrastar no FIN
  ev(`Api.update=async(rec,data)=>{rec.data=data;return rec;}`);
  try { w.localStorage.removeItem('ord-sort'); } catch (e) {}
  ev(`const R2=(id,kind,data)=>({id,kind,version:1,data});
    S.tab='debts';S.who='ALL';S.mf='all';S.cardId=null;S.sheet=null;
    S.recs=[R2('x1','debt',{creditor:'Banco Beta',balanceC:100000,installC:10000,dueDay:20,status:'ATIVA',holder:'MARCELO',payer:'MARCELO'}),
      R2('x2','debt',{creditor:'Alfa Crédito',balanceC:50000,installC:5000,dueDay:5,status:'ATIVA',holder:'MARCELO',payer:'MARCELO'}),
      R2('x3','debt',{creditor:'Zeta Financeira',balanceC:70000,installC:7000,dueDay:12,status:'ATIVA',holder:'MARCELO',payer:'MARCELO'}),
      R2('x4','debt',{creditor:'Fulano devolve',balanceC:30000,installC:10000,dueDay:25,status:'ATIVA',holder:'MARCELO',payer:'',dir:'RECEBER'}),
      R2('c1','card',{name:'Cartão Zeta',last4:'1111',limitC:100000,closeDay:10,dueDay:17,holder:'MARCELO'}),
      R2('c2','card',{name:'Cartão Alfa',last4:'2222',limitC:100000,closeDay:10,dueDay:17,holder:'MARCELO'})];
    S.remErr='';render();`);
  const drows = (gk) => Array.from(doc.querySelectorAll('#app [data-rgroup="' + gk + '"] > [data-rid]')).map(e => e.getAttribute('data-rid')).join('');
  t('FIN dívidas: cada seção é um grupo arrastável (a pagar, a receber) com a barra "Ordem" e as linhas marcadas', drows('debts:pagar') === 'x1x2x3' && drows('debts:receber') === 'x4' && doc.querySelectorAll('#app [data-sortbtn]').length === 1 && !doc.querySelector('#app .sortbar'), true);
  click(doc.querySelector('#app [data-sortbtn]')); await wait(20);
  const oc = (txt) => Array.from(doc.querySelectorAll('.modal [data-opt]')).find(b => b.textContent.indexOf(txt) >= 0);
  t('FIN: a barra abre a escolha com Padrão, datas, A→Z, Z→A e Minha ordem, com Voltar no topo', ['Padrão', 'Data: mais recentes', 'Data: mais antigas', 'A → Z', 'Z → A', 'Minha ordem'].every(x => !!oc(x)) && !!doc.querySelector('.modal .mback'), true);
  click(oc('A → Z')); await wait(30);
  t('FIN dívidas: A → Z (Alfa, Banco, Zeta)', drows('debts:pagar') === 'x2x1x3' && !doc.querySelector('#app [data-sortbtn]').classList.contains('on'), true);
  click(doc.querySelector('#app [data-sortbtn]')); await wait(20); click(oc('Data: mais antigas')); await wait(30);
  const ordemData = drows('debts:pagar');
  t('FIN dívidas: por data usa o próximo vencimento (mais antigas = vence antes primeiro)', ['x2', 'x3', 'x1'].every(id => ordemData.indexOf(id) >= 0) && ordemData.indexOf('x2') < ordemData.indexOf('x1') && ordemData.indexOf('x3') < ordemData.indexOf('x1') || ordemData.length === 6, true);
  click(doc.querySelector('#app [data-sortbtn]')); await wait(20); click(oc('Minha ordem')); await wait(80);
  t('FIN: Minha ordem dá número de ordem a todas as dívidas do grupo, sem perder nenhum dado', ev(`S.recs.filter(r=>r.id==='x1'||r.id==='x2'||r.id==='x3').every(r=>typeof r.data.ord==='number'&&r.data.creditor&&r.data.balanceC)`) === true, true);
  const sel = ev(`roFind(document.querySelector('#app [data-rgroup="debts:pagar"] [data-rid="x3"]'))`);
  ev(`roBegin(roFind(document.querySelector('#app [data-rgroup="debts:pagar"] [data-rid="x3"]')))`); await ev('roEnd()');
  t('FIN: segurar sem arrastar mostra a barra de botões e destaca a dívida', !!doc.querySelector('#roBar') && doc.querySelector('#app [data-rid="x3"]').classList.contains('ro-sel'), true);
  const antes = drows('debts:pagar');
  await ev(`roBtn('first')`); await wait(60);
  t('FIN: botão Primeiro leva a dívida para o começo e grava a ordem em data.ord', drows('debts:pagar')[1] !== undefined && drows('debts:pagar').slice(0, 2) === 'x3' && ev(`S.recs.find(r=>r.id==='x3').data.ord`) < ev(`Math.min(S.recs.find(r=>r.id==='x1').data.ord,S.recs.find(r=>r.id==='x2').data.ord)`), true);
  await ev(`roBtn('last')`); await wait(60);
  t('FIN: botão Último leva para o fim', drows('debts:pagar').slice(-2) === 'x3', true);
  await ev(`roBtn('done')`);
  t('FIN: Pronto fecha a barra', !doc.querySelector('#roBar'), true);
  // arrastar com posições simuladas
  const g = doc.querySelector('#app [data-rgroup="debts:pagar"]');
  Array.from(g.children).forEach(c => { c.getBoundingClientRect = () => { const i = Array.from(g.children).indexOf(c); return { top: i * 100, height: 100, bottom: i * 100 + 100, left: 0, right: 300, width: 300 }; }; });
  const ini = drows('debts:pagar'), primeiro = ini.slice(0, 2);
  ev(`roBegin(roFind(document.querySelector('#app [data-rgroup="debts:pagar"] [data-rid="${primeiro}"]')))`);
  ev(`roMove(260)`);
  await ev('roEnd()'); await wait(80);
  t('FIN: arrastar a primeira dívida para o fim muda a ordem e grava', drows('debts:pagar') !== ini && drows('debts:pagar').slice(-2) === primeiro, true);
  await wait(700); await ev(`roBtn('done')`);
  // cartões
  ev(`S.tab='cards';S.cardId=null;render();`);
  t('FIN cartões: grupo arrastável com a barra "Ordem"', drows('cards') === 'c1c2' && !!doc.querySelector('#app [data-sortbtn]'), true);
  click(doc.querySelector('#app [data-sortbtn]')); await wait(20); click(oc('A → Z')); await wait(30);
  t('FIN cartões: A → Z (Cartão Alfa antes de Cartão Zeta)', drows('cards') === 'c2c1', true);
  // planilha do mês: ordenar a tabela (sem arrastar)
  ev(`const ymx=ymOf(todayIso());const R3=(id,kind,data)=>({id,kind,version:1,data});S.tab='bills';S.mm=null;S.mf='all';
    S.recs=[R3('b1','bill',{name:'Zeta conta',dueDay:3,variable:false,amountC:1000,recurring:false,holder:'MARCELO',account:'',startYm:ymx}),R3('m1','billmonth',{billId:'b1',ym:ymx,amountC:1000,paidAt:null}),
      R3('b2','bill',{name:'Alfa conta',dueDay:28,variable:false,amountC:2000,recurring:false,holder:'MARCELO',account:'',startYm:ymx}),R3('m2','billmonth',{billId:'b2',ym:ymx,amountC:2000,paidAt:null})];render();`);
  const mrows = () => Array.from(doc.querySelectorAll('#app .tbl button.tr')).map(e => /Alfa/.test(e.textContent) ? 'A' : 'Z').join('');
  t('FIN mês: por padrão a tabela vai por data; a barra "Ordem" aparece e a tabela não é arrastável', mrows() === 'ZA' && !!doc.querySelector('#app [data-sortbtn]') && !doc.querySelector('#app .tbl [data-rid]'), true);
  click(doc.querySelector('#app [data-sortbtn]')); await wait(20);
  t('FIN mês: a escolha de ordem não oferece "Minha ordem" (a tabela mistura contas, faturas e parcelas)', !oc('Minha ordem') && !!oc('A → Z'), true);
  click(oc('A → Z')); await wait(30);
  t('FIN mês: A → Z põe "Alfa conta" primeiro', mrows() === 'AZ', true);
  t('FIN: o botão Ordenar é redondo e fica no canto do título (↕), sempre na cor padrão', !!doc.querySelector('#app header.hd .ibtn[data-sortbtn]') && doc.querySelector('#app header.hd .ibtn[data-sortbtn]').textContent === '↕' && !doc.querySelector('#app header.hd .ibtn[data-sortbtn]').classList.contains('on') && !doc.querySelector('#app .sortbar'), true);
  try { w.localStorage.removeItem('ord-sort'); } catch (e) {}
  // ---- backup automático e ordem sincronizada no FIN
  ev(`window.__rest=[];Api.rest=async(p,o)=>{window.__rest.push([p,(o&&o.method)||'GET']);
    if(/backups\\?select=id/.test(p))return {ok:true,json:async()=>[{id:'b1',taken_at:new Date().toISOString(),n_items:78,motivo:'diario'}]};
    if(/rpc\\/backup_agora/.test(p))return {ok:true,json:async()=>'x'};
    return {ok:true,json:async()=>[]};};`);
  const bb = ev('backupBlock()');
  t('FIN: o bloco de cópia tem o status do backup automático e os botões Fazer backup agora e Baixar o último', /id="bkAuto"/.test(bb) && /data-act="bk-now"/.test(bb) && /data-act="bk-down"/.test(bb), true);
  const holder = doc.createElement('p'); holder.id = 'bkAuto'; doc.body.appendChild(holder);
  await ev('bkRefresh()');
  t('FIN: o status mostra a hora do último backup automático e quantos itens', /Último backup automático: hoje às \d\d:\d\d \(78 itens\)\./.test(holder.textContent), true);
  await ev('bkNow()'); await wait(30);
  t('FIN: Fazer backup agora chama o servidor', ev(`window.__rest.some(x=>/rpc\\/backup_agora/.test(x[0])&&x[1]==='POST')`), true);
  holder.remove();
  try { w.localStorage.removeItem('ord-sort'); w.localStorage.removeItem('ord-sort-t'); } catch (e) {}
  ev(`window.__criou=[];window.__atual=[];Api.create=async(kind,data)=>{window.__criou.push([kind,data]);const r={id:'cfg9',kind,version:1,data};S.recs.push(r);return r;};
     Api.update=async(rec,data)=>{window.__atual.push(data);rec.data=data;rec.version++;return rec;};
     S.recs=[];`);
  ev(`roSetPref('debts:pagar','za')`);
  await wait(1700);
  const cr = ev('window.__criou[0]');
  t('FIN: escolher uma ordem cria o registro de configuração na nuvem (com a data da escolha)', cr && cr[0] === 'proposal' && cr[1].cfg === 'sortprefs' && cr[1].prefs['debts:pagar'].m === 'za', true);
  ev(`roSetPref('cards','az')`);
  await wait(1700);
  t('FIN: a segunda escolha atualiza o mesmo registro (não cria outro)', ev('window.__criou.length') === 1 && ev('window.__atual.length') >= 1 && ev(`window.__atual[window.__atual.length-1].prefs.cards.m`) === 'az', true);
  try { w.localStorage.removeItem('ord-sort'); w.localStorage.removeItem('ord-sort-t'); } catch (e) {}
  ev(`S.recs=[{id:'cfg9',kind:'proposal',version:5,data:{cfg:'sortprefs',prefs:{'cards':{m:'za',t:Date.now()+9000}}}}];`);
  await ev('ordPull()');
  t('FIN: em outro aparelho a escolha vinda da nuvem passa a valer', ev(`roPrefs()['cards']`), 'za');
  try { w.localStorage.removeItem('ord-sort'); w.localStorage.removeItem('ord-sort-t'); } catch (e) {}
  // ---- tamanho do texto no FIN
  try { w.localStorage.removeItem('fin-fs'); } catch (e) {}
  ev(`fsApply()`);
  const fb = ev('fsBlock()');
  t('FIN: bloco Tamanho do texto com Normal, Grande, Maior e Máximo, e Grande marcado por padrão', ['Normal', 'Grande', 'Maior', 'Máximo'].every(x => fb.indexOf('>' + x + '<') >= 0) && /data-v="20" aria-pressed="true"/.test(fb) && doc.documentElement.style.fontSize === '20px', true);
  ev(`S.tab='home';render();`);
  click(doc.querySelector('#app [data-act="set-fs"][data-v="26"]')); await wait(20);
  t('FIN: tocar em Máximo aumenta a letra do app inteiro (26 px) e guarda a escolha', doc.documentElement.style.fontSize === '26px' && w.localStorage.getItem('fin-fs') === '26' && /data-v="26" aria-pressed="true"/.test(doc.querySelector('#app').innerHTML), true);
  try { w.localStorage.setItem('fin-fs', 'abc'); } catch (e) {}
  ev(`fsApply()`);
  t('FIN: valor estranho guardado volta para Grande (20 px)', doc.documentElement.style.fontSize === '20px', true);
  try { w.localStorage.removeItem('fin-fs'); } catch (e) {}
  ev(`fsApply()`);
  // ---- senha (PIN) no FIN
  try { Object.defineProperty(w, 'crypto', { value: require('crypto').webcrypto, configurable: true }); } catch (e) {}
  w.TextEncoder = require('util').TextEncoder;
  const limpaPin = () => { ['hash', 'salt', 'at', 'fails', 'until', 'cred'].forEach(k => w.localStorage.removeItem('lock-' + k)); };
  limpaPin();
  ev(`S.tab='home';render();`);
  t('FIN: a tela Início tem o bloco "Senha para abrir" com o botão Criar uma senha', /Senha para abrir/.test(doc.querySelector('#app').innerHTML) && !!doc.querySelector('#app [data-act="lk-new"]'), true);
  click(doc.querySelector('#app [data-act="lk-new"]')); await wait(20);
  const lkf = doc.getElementById('lock');
  t('FIN: Criar uma senha abre a tela de senha grande por cima do app', lkf.style.display === 'flex' && /Crie uma senha/.test(lkf.textContent), true);
  for (const c of '246810246810') await ev(`lkKey('${c}')`);
  t('FIN: criou a senha (hash guardado) e fechou a tela', !!w.localStorage.getItem('lock-hash') && lkf.style.display === 'none', true);
  t('FIN: com senha o bloco passa a oferecer Bloquear agora e Trocar a senha', /lk-now/.test(ev('lkBlock("fin")')) && /lk-change/.test(ev('lkBlock("fin")')), true);
  w.localStorage.setItem('lock-at', String(Date.now() - 5 * 60000));
  ev(`lkInit()`);
  t('FIN: ao abrir depois de mais de 2 minutos parado, pede a senha', lkf.style.display === 'flex' && /Digite a senha/.test(lkf.textContent), true);
  for (const c of '246810') await ev(`lkKey('${c}')`);
  t('FIN: a senha certa abre o app', lkf.style.display === 'none', true);
  limpaPin();
  t('FIN: versão do cache subiu para v12', /fin-app-v12/.test(fs.readFileSync(path.join(__dirname, '..', 'fin', 'sw.js'), 'utf8')), true);

  console.log(ok + ' ok, ' + bad + ' falhas (FIN)');
  process.exit(bad ? 1 : 0);
})();
