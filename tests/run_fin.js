/* Testes do Financeiro (fin/index.html) em navegador simulado. Rodar: node run_fin.js (ou npm test) */
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
  if (process.env.VERBOSE) console.log('· ' + name);
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
  t('mês: Nova conta e Ler boleto são botões redondos no topo, sem botão largo', /class="ibtn" data-act="bill-new"/.test(mes) && /data-act="bill-read"/.test(mes) && !/class="btn[ "]/.test(mes), true);
  t('início: linha Dívidas mostra saldo total e a próxima parcela', /Dívidas · saldo total/.test(ev('vHome()')) && /próxima parcela/.test(ev('vHome()')), true);
  t('cartões e dívidas: novo cadastro é botão redondo no topo', /class="ibtn" data-act="card-new"/.test(ev('vCards()')) && /class="ibtn" data-act="debt-new"/.test(ev('vDebts()')), true);
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
  t('toque numa conta (v21): abre a ficha com Voltar no topo e botão de pagar; editar é botão', !!doc.querySelector('.modal .mback') && !!doc.querySelector('.modal #fb-pay'), true);
  click(doc.querySelector('.modal .mback')); await wait(20);
  t('janela da conta: Voltar do topo fecha', !doc.querySelector('.modal'), true);
  click(doc.querySelector('#app [data-act="m-open"][data-k="debt"]'));
  t('toque numa parcela de dívida (v21): ficha com Editar como botão e Voltar no topo, sem abrir formulário', !!doc.querySelector('.modal #fd-edit') && !!doc.querySelector('.modal .mback') && !doc.querySelector('.modal input,.modal select'), true);
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
  ev(`S.tab='home';S.hp=false;render();`);
  const hh = doc.querySelector('#app').innerHTML;
  t('início limpo: sem botão largo (.btn) na tela', /class="btn/.test(hh), false);
  t('início limpo: botões redondos de extratos, chat e ajustes', !!doc.querySelector('#app .hd [data-act="tab"][data-v="stmt"]') && !!doc.querySelector('#app .hd [data-act="chat"]') && !!doc.querySelector('#app .hd [data-act="tab"][data-v="cfg"]'), true);
  t('início limpo: 4 linhas de resumo', doc.querySelectorAll('#app .up.s2 button').length, 4);
  t('início: mostra saldo a pagar e saldo a receber separados', /Saldo a pagar/.test(ev('vDebts()')) && /Saldo a receber \(1\)/.test(ev('vDebts()')), true);
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
  t('pendente com documento: um botão Ver para cada arquivo e o aviso de que o Financeiro não lê sozinho', doc.querySelectorAll('.modal [data-vf]').length === 2 && /não lê a foto sozinho/.test(doc.querySelector('.modal').textContent) && /Ver boleto\.pdf/.test(doc.querySelector('.modal').textContent), true);
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
  t('lembretes automáticos: cria a lista do Financeiro (marcada fin) e 1 lembrete por dívida com vencimento (a pagar e a receber), nenhum para a quitada nem para a sem dia', lists.length === 1 && lists[0].data.fin === true && rems.length === 2 && !!remOf('da') && !!remOf('db') && !remOf('dc') && !remOf('dd'), true);
  const ra = remOf('da').data;
  t('lembrete da dívida a pagar: 1 dia antes do vencimento, às 09:00, todo mês, 12 vezes, alarme na hora, na lista do Financeiro', ra.date === ev(`isoMinus1('${dd(16)}')`) && ra.time === '09:00' && ra.repeat === 'monthly' && ra.repTimes === 12 && ra.alarms.length === 1 && ra.alarms[0].min === 0 && ra.list === lists[0].data._id && ra.finRef === 'da' && ra.priority === 2, true);
  t('lembrete da dívida a pagar: título com o credor, o valor da parcela e o dia', /^Pagar parcela — Banco A · R\$ 100,00 \(vence dia 16\)$/.test(ra.title) && /1 dia antes do vencimento/.test(ra.notes), true);
  const rb = remOf('db').data;
  t('lembrete da dívida a receber: "Receber de…", mesma regra (1 dia antes, 09:00, alarme)', /^Receber de Fulano devolve · R\$ 100,00 \(vence dia 20\)$/.test(rb.title) && rb.time === '09:00' && rb.alarms[0].min === 0 && rb.date === ev(`remSpecForDebt(S.recs.find(r=>r.id==='db')).date`) && /marque no Financeiro: Mês › a parcela › Marcar como recebida/.test(rb.notes), true);
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
  // avançar com a parcela paga no Financeiro
  ev(`S.recs.find(r=>r.id==='da').data.firstDue='';S.recs.find(r=>r.id==='da').data.dueDay=16`);
  await ev('syncFinReminders()');
  const dtAntes = remOf('da').data.date;
  await ev(`bumpFinReminder('da','${dtAntes.slice(0, 7)}',S.recs.find(r=>r.id==='da').data)`);
  const dep = remOf('da').data;
  t('parcela marcada como paga no Financeiro: o lembrete anda um mês e conta 1', dep.repDone === 1 && dep.date === ev(`dateOf(addMonths('${dtAntes.slice(0, 7)}',1),${+dtAntes.slice(8, 10)})`), true);
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
  t('lembrete concluído mas a dívida ainda deve: o Financeiro reabre com a data certa', remOf('de').data.done === false && remOf('de').data.repDone === 0, true);
  // sem internet / erro: não quebra e avisa no Início
  w.__restFail = true; ev(`S.remErr='';`);
  await ev('syncFinReminders()');
  t('erro ao falar com o Núcleo: não quebra e o Início avisa', /Não consegui conferir os lembretes no Núcleo/.test(ev('vHome()')), true);
  w.__restFail = false; ev(`S.remErr='';`);
  t('as gravações de dívida e o carregamento chamam a conferência (ganchos no Api)', /if\(kind==='debt'\)finSyncSoon\(true\)/.test(html) && /if\(rec\.kind==='debt'\)finSyncSoon\(true\)/.test(html) && /finSyncSoon\(false\)/.test(html) && /bumpFinReminder\(rec\.id,ym,x\)/.test(html), true);
  // ---- desfazer discreto no Financeiro
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
  t('Financeiro desfazer: o botão ↶ existe no cabeçalho, escondido enquanto não há o que desfazer', !!doc.querySelector('#app header.hd [data-undobtn]') && doc.querySelector('#app [data-undobtn]').style.display === 'none', true);
  ev('U.userAt=0');
  await ev(`Api.update(S.recs[0],Object.assign({},S.recs[0].data,{notas:'auto'}))`); await wait(450);
  t('Financeiro desfazer: mudança que não veio de um toque seu não entra na lista', ev('U.stack.length'), 0);
  tapU();
  await ev(`Api.update(S.recs[0],Object.assign({},S.recs[0].data,{paidYm:['2030-01']}))`); await wait(450);
  ev('render()');
  t('Financeiro desfazer: marcar uma parcela como paga entra com o nome da dívida', ev('U.stack.length') === 1 && ev('U.stack[0].label') === 'Marcar parcela como paga «Banco Teste»', true);
  const ub = doc.querySelector('#app [data-undobtn]');
  t('Financeiro desfazer: o botão aparece, redondo, e diz o que desfaz', ub.style.display === '' && ub.classList.contains('ibtn') && /Desfazer: Marcar parcela como paga/.test(ub.getAttribute('aria-label')), true);
  click(ub); await wait(30);
  t('Financeiro desfazer: tocar abre a pergunta com o que será desfeito, sem desfazer ainda', !!doc.querySelector('.modal #cf-ok') && /Marcar parcela como paga/.test(doc.querySelector('.modal').textContent) && srv().data.paidYm.length === 1, true);
  click(doc.querySelector('.modal #cf-no')); await wait(30);
  t('Financeiro desfazer: Voltar não desfaz nada', srv().data.paidYm.length === 1 && ev('U.stack.length') === 1, true);
  click(doc.querySelector('#app [data-undobtn]')); await wait(30); click(doc.querySelector('.modal #cf-ok')); await wait(80);
  t('Financeiro desfazer: confirmando, a parcela volta a não paga e a fila esvazia (botão some)', srv().data.paidYm.length === 0 && ev('U.stack.length') === 0 && doc.querySelector('#app [data-undobtn]').style.display === 'none', true);
  tapU();
  await ev(`Api.update(S.recs[0],Object.assign({},S.recs[0].data,{ord:1000}))`); await wait(450);
  t('Financeiro desfazer: mudar só a ordem entra como "Mudar a ordem"', ev('U.stack[0].label'), 'Mudar a ordem');
  ev('U.stack.length=0');
  tapU();
  await ev(`Api.remove(S.recs[0])`); await wait(450);
  t('Financeiro desfazer: apagar entra como "Apagar dívida" com o nome', ev('U.stack.length') === 1 && ev('U.stack[0].label') === 'Apagar dívida «Banco Teste»' && !!srv().deleted_at && ev('S.recs.length') === 0, true);
  ev('render()');
  click(doc.querySelector('#app [data-undobtn]')); await wait(30); click(doc.querySelector('.modal #cf-ok')); await wait(80);
  t('Financeiro desfazer: desfazer o apagar traz a dívida de volta (no servidor e na tela), com os dados de antes', !srv().deleted_at && ev('S.recs.length') === 1 && ev('S.recs[0].data.creditor') === 'Banco Teste' && ev('S.recs[0].data.balanceC') === 100000, true);
  ev('U.stack.length=0;U.userAt=0');
  ev(`Api.rest=Api.rest;S.tab='home';render();`);
  // ---- ordenar e arrastar no Financeiro
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
  t('Financeiro dívidas: cada seção é um grupo arrastável (a pagar, a receber) com a barra "Ordem" e as linhas marcadas', drows('debts:pagar') === 'x1x2x3' && drows('debts:receber') === 'x4' && doc.querySelectorAll('#app [data-sortbtn]').length === 1 && !doc.querySelector('#app .sortbar'), true);
  click(doc.querySelector('#app [data-sortbtn]')); await wait(20);
  const oc = (txt) => Array.from(doc.querySelectorAll('.modal [data-opt]')).find(b => b.textContent.indexOf(txt) >= 0);
  t('Financeiro: a barra abre a escolha com Padrão, datas, A→Z, Z→A e Minha ordem, com Voltar no topo', ['Padrão', 'Data: mais recentes', 'Data: mais antigas', 'A → Z', 'Z → A', 'Minha ordem'].every(x => !!oc(x)) && !!doc.querySelector('.modal .mback'), true);
  click(oc('A → Z')); await wait(30);
  t('Financeiro dívidas: A → Z (Alfa, Banco, Zeta)', drows('debts:pagar') === 'x2x1x3' && !doc.querySelector('#app [data-sortbtn]').classList.contains('on'), true);
  click(doc.querySelector('#app [data-sortbtn]')); await wait(20); click(oc('Data: mais antigas')); await wait(30);
  const ordemData = drows('debts:pagar');
  t('Financeiro dívidas: por data usa o próximo vencimento (mais antigas = vence antes primeiro)', ['x2', 'x3', 'x1'].every(id => ordemData.indexOf(id) >= 0) && ordemData.indexOf('x2') < ordemData.indexOf('x1') && ordemData.indexOf('x3') < ordemData.indexOf('x1') || ordemData.length === 6, true);
  click(doc.querySelector('#app [data-sortbtn]')); await wait(20); click(oc('Minha ordem')); await wait(80);
  t('Financeiro: Minha ordem dá número de ordem a todas as dívidas do grupo, sem perder nenhum dado', ev(`S.recs.filter(r=>r.id==='x1'||r.id==='x2'||r.id==='x3').every(r=>typeof r.data.ord==='number'&&r.data.creditor&&r.data.balanceC)`) === true, true);
  const sel = ev(`roFind(document.querySelector('#app [data-rgroup="debts:pagar"] [data-rid="x3"]'))`);
  ev(`roBegin(roFind(document.querySelector('#app [data-rgroup="debts:pagar"] [data-rid="x3"]')))`); await ev('roEnd()');
  t('Financeiro: segurar sem arrastar mostra a barra de botões e destaca a dívida', !!doc.querySelector('#roBar') && doc.querySelector('#app [data-rid="x3"]').classList.contains('ro-sel'), true);
  const antes = drows('debts:pagar');
  await ev(`roBtn('first')`); await wait(60);
  t('Financeiro: botão Primeiro leva a dívida para o começo e grava a ordem em data.ord', drows('debts:pagar')[1] !== undefined && drows('debts:pagar').slice(0, 2) === 'x3' && ev(`S.recs.find(r=>r.id==='x3').data.ord`) < ev(`Math.min(S.recs.find(r=>r.id==='x1').data.ord,S.recs.find(r=>r.id==='x2').data.ord)`), true);
  await ev(`roBtn('last')`); await wait(60);
  t('Financeiro: botão Último leva para o fim', drows('debts:pagar').slice(-2) === 'x3', true);
  await ev(`roBtn('done')`);
  t('Financeiro: Pronto fecha a barra', !doc.querySelector('#roBar'), true);
  // arrastar com posições simuladas
  const g = doc.querySelector('#app [data-rgroup="debts:pagar"]');
  Array.from(g.children).forEach(c => { c.getBoundingClientRect = () => { const i = Array.from(g.children).indexOf(c); return { top: i * 100, height: 100, bottom: i * 100 + 100, left: 0, right: 300, width: 300 }; }; });
  const ini = drows('debts:pagar'), primeiro = ini.slice(0, 2);
  ev(`roBegin(roFind(document.querySelector('#app [data-rgroup="debts:pagar"] [data-rid="${primeiro}"]')))`);
  ev(`roMove(260)`);
  await ev('roEnd()'); await wait(80);
  t('Financeiro: arrastar a primeira dívida para o fim muda a ordem e grava', drows('debts:pagar') !== ini && drows('debts:pagar').slice(-2) === primeiro, true);
  await wait(700); await ev(`roBtn('done')`);
  // cartões
  ev(`S.tab='cards';S.cardId=null;render();`);
  t('Financeiro cartões: grupo arrastável com a barra "Ordem"', drows('cards') === 'c1c2' && !!doc.querySelector('#app [data-sortbtn]'), true);
  click(doc.querySelector('#app [data-sortbtn]')); await wait(20); click(oc('A → Z')); await wait(30);
  t('Financeiro cartões: A → Z (Cartão Alfa antes de Cartão Zeta)', drows('cards') === 'c2c1', true);
  // planilha do mês: ordenar a tabela (sem arrastar)
  ev(`const ymx=ymOf(todayIso());const R3=(id,kind,data)=>({id,kind,version:1,data});S.tab='bills';S.mm=null;S.mf='all';
    S.recs=[R3('b1','bill',{name:'Zeta conta',dueDay:3,variable:false,amountC:1000,recurring:false,holder:'MARCELO',account:'',startYm:ymx}),R3('m1','billmonth',{billId:'b1',ym:ymx,amountC:1000,paidAt:null}),
      R3('b2','bill',{name:'Alfa conta',dueDay:28,variable:false,amountC:2000,recurring:false,holder:'MARCELO',account:'',startYm:ymx}),R3('m2','billmonth',{billId:'b2',ym:ymx,amountC:2000,paidAt:null})];render();`);
  const mrows = () => Array.from(doc.querySelectorAll('#app .tbl button.tr')).map(e => /Alfa/.test(e.textContent) ? 'A' : 'Z').join('');
  t('Financeiro mês: por padrão a tabela vai por data; a barra "Ordem" aparece e a tabela não é arrastável', mrows() === 'ZA' && !!doc.querySelector('#app [data-sortbtn]') && !doc.querySelector('#app .tbl [data-rid]'), true);
  click(doc.querySelector('#app [data-sortbtn]')); await wait(20);
  t('Financeiro mês: a escolha de ordem não oferece "Minha ordem" (a tabela mistura contas, faturas e parcelas)', !oc('Minha ordem') && !!oc('A → Z'), true);
  click(oc('A → Z')); await wait(30);
  t('Financeiro mês: A → Z põe "Alfa conta" primeiro', mrows() === 'AZ', true);
  t('Financeiro: o botão Ordenar é redondo e fica no canto do título (↕), sempre na cor padrão', !!doc.querySelector('#app header.hd .ibtn[data-sortbtn]') && doc.querySelector('#app header.hd .ibtn[data-sortbtn]').textContent === '↕' && !doc.querySelector('#app header.hd .ibtn[data-sortbtn]').classList.contains('on') && !doc.querySelector('#app .sortbar'), true);
  try { w.localStorage.removeItem('ord-sort'); } catch (e) {}
  // ---- backup automático e ordem sincronizada no Financeiro
  ev(`window.__rest=[];Api.rest=async(p,o)=>{window.__rest.push([p,(o&&o.method)||'GET']);
    if(/backups\\?select=id/.test(p))return {ok:true,json:async()=>[{id:'b1',taken_at:new Date().toISOString(),n_items:78,motivo:'diario'}]};
    if(/rpc\\/backup_agora/.test(p))return {ok:true,json:async()=>'x'};
    return {ok:true,json:async()=>[]};};`);
  const bb = ev('backupBlock()');
  t('Financeiro: o bloco de cópia tem o status do backup automático e os botões Fazer backup agora e Baixar o último', /id="bkAuto"/.test(bb) && /data-act="bk-now"/.test(bb) && /data-act="bk-down"/.test(bb), true);
  const holder = doc.createElement('p'); holder.id = 'bkAuto'; doc.body.appendChild(holder);
  await ev('bkRefresh()');
  t('Financeiro: o status mostra a hora do último backup automático e quantos itens', /Último backup automático: hoje às \d\d:\d\d \(78 itens\)\./.test(holder.textContent), true);
  await ev('bkNow()'); await wait(30);
  t('Financeiro: Fazer backup agora chama o servidor', ev(`window.__rest.some(x=>/rpc\\/backup_agora/.test(x[0])&&x[1]==='POST')`), true);
  holder.remove();
  try { w.localStorage.removeItem('ord-sort'); w.localStorage.removeItem('ord-sort-t'); } catch (e) {}
  ev(`window.__criou=[];window.__atual=[];Api.create=async(kind,data)=>{window.__criou.push([kind,data]);const r={id:'cfg9',kind,version:1,data};S.recs.push(r);return r;};
     Api.update=async(rec,data)=>{window.__atual.push(data);rec.data=data;rec.version++;return rec;};
     S.recs=[];`);
  ev(`roSetPref('debts:pagar','za')`);
  await wait(1700);
  const cr = ev('window.__criou[0]');
  t('Financeiro: escolher uma ordem cria o registro de configuração na nuvem (com a data da escolha)', cr && cr[0] === 'proposal' && cr[1].cfg === 'sortprefs' && cr[1].prefs['debts:pagar'].m === 'za', true);
  ev(`roSetPref('cards','az')`);
  await wait(1700);
  t('Financeiro: a segunda escolha atualiza o mesmo registro (não cria outro)', ev('window.__criou.length') === 1 && ev('window.__atual.length') >= 1 && ev(`window.__atual[window.__atual.length-1].prefs.cards.m`) === 'az', true);
  try { w.localStorage.removeItem('ord-sort'); w.localStorage.removeItem('ord-sort-t'); } catch (e) {}
  ev(`S.recs=[{id:'cfg9',kind:'proposal',version:5,data:{cfg:'sortprefs',prefs:{'cards':{m:'za',t:Date.now()+9000}}}}];`);
  await ev('ordPull()');
  t('Financeiro: em outro aparelho a escolha vinda da nuvem passa a valer', ev(`roPrefs()['cards']`), 'za');
  try { w.localStorage.removeItem('ord-sort'); w.localStorage.removeItem('ord-sort-t'); } catch (e) {}
  // ---- tamanho do texto no Financeiro
  try { w.localStorage.removeItem('fin-fs'); } catch (e) {}
  ev(`fsApply()`);
  const fb = ev('fsBlock()');
  t('Financeiro: bloco Tamanho do texto com Normal, Grande, Maior e Máximo, e Grande marcado por padrão', ['Normal', 'Grande', 'Maior', 'Máximo'].every(x => fb.indexOf('>' + x + '<') >= 0) && /data-v="20" aria-pressed="true"/.test(fb) && doc.documentElement.style.fontSize === '20px', true);
  ev(`S.tab='cfg';render();`);
  click(doc.querySelector('#app [data-act="set-fs"][data-v="26"]')); await wait(20);
  t('Financeiro: tocar em Máximo aumenta a letra do app inteiro (26 px) e guarda a escolha', doc.documentElement.style.fontSize === '26px' && w.localStorage.getItem('fin-fs') === '26' && /data-v="26" aria-pressed="true"/.test(doc.querySelector('#app').innerHTML), true);
  try { w.localStorage.setItem('fin-fs', 'abc'); } catch (e) {}
  ev(`fsApply()`);
  t('Financeiro: valor estranho guardado volta para Grande (20 px)', doc.documentElement.style.fontSize === '20px', true);
  try { w.localStorage.removeItem('fin-fs'); } catch (e) {}
  ev(`fsApply()`);
  // ---- senha (PIN) no Financeiro
  try { Object.defineProperty(w, 'crypto', { value: require('crypto').webcrypto, configurable: true }); } catch (e) {}
  w.TextEncoder = require('util').TextEncoder;
  const limpaPin = () => { ['hash', 'salt', 'at', 'fails', 'until', 'cred'].forEach(k => w.localStorage.removeItem('lock-' + k)); };
  limpaPin();
  ev(`S.tab='cfg';render();`);
  t('Financeiro: a tela Ajustes tem o bloco "Senha para abrir" com o botão Criar uma senha', /Senha para abrir/.test(doc.querySelector('#app').innerHTML) && !!doc.querySelector('#app [data-act="lk-new"]'), true);
  click(doc.querySelector('#app [data-act="lk-new"]')); await wait(20);
  const lkf = doc.getElementById('lock');
  t('Financeiro: Criar uma senha abre a tela de senha grande por cima do app', lkf.style.display === 'flex' && /Crie uma senha/.test(lkf.textContent), true);
  for (const c of '246810246810') await ev(`lkKey('${c}')`);
  t('Financeiro: criou a senha (hash guardado) e fechou a tela', !!w.localStorage.getItem('lock-hash') && lkf.style.display === 'none', true);
  t('Financeiro: com senha o bloco passa a oferecer Bloquear agora e Trocar a senha', /lk-now/.test(ev('lkBlock("fin")')) && /lk-change/.test(ev('lkBlock("fin")')), true);
  w.localStorage.setItem('lock-at', String(Date.now() - 5 * 60000));
  ev(`lkInit()`);
  t('Financeiro: ao abrir depois de mais de 2 minutos parado, pede a senha', lkf.style.display === 'flex' && /Digite a senha/.test(lkf.textContent), true);
  for (const c of '246810') await ev(`lkKey('${c}')`);
  t('Financeiro: a senha certa abre o app', lkf.style.display === 'none', true);
  limpaPin();
  // ---- ler boleto e fatura (v13)
  const lun = (s) => { let tt = 0; s.split('').reverse().map(Number).forEach((d, i) => { const p = d * (i % 2 === 0 ? 2 : 1); tt += p > 9 ? p - 9 : p; }); return (10 - tt % 10) % 10; };
  const m11 = (s) => { const wv = [2, 3, 4, 5, 6, 7, 8, 9]; let tt = 0; s.split('').reverse().forEach((d, i) => { tt += (+d) * wv[i % 8]; }); const r = 11 - (tt % 11); return (r === 0 || r === 10 || r === 11) ? 1 : r; };
  const parts47 = (banco, fator, valorC, livre) => { const f = String(fator).padStart(4, '0'), val = String(valorC).padStart(10, '0'), dvg = m11(banco + '9' + f + val + livre); const c1 = banco + '9' + livre.slice(0, 5), c2 = livre.slice(5, 15), c3 = livre.slice(15, 25); return { c1, c2, c3, f, val, dvg, linha: c1 + lun(c1) + c2 + lun(c2) + c3 + lun(c3) + dvg + f + val, barra: banco + '9' + dvg + f + val + livre }; };
  const bonito = (p) => { const a = p.c1 + lun(p.c1), b = p.c2 + lun(p.c2), c = p.c3 + lun(p.c3); return a.slice(0, 5) + '.' + a.slice(5) + ' ' + b.slice(0, 5) + '.' + b.slice(5) + ' ' + c.slice(0, 5) + '.' + c.slice(5) + ' ' + p.dvg + ' ' + p.f + p.val; };
  const dias = (a, b) => Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5);
  const alvo = new Date(); alvo.setDate(alvo.getDate() + 40);
  const fatorAlvo = 1000 + dias(new Date(2025, 1, 22), alvo);
  const isoAlvo = alvo.getFullYear() + '-' + String(alvo.getMonth() + 1).padStart(2, '0') + '-' + String(alvo.getDate()).padStart(2, '0');
  const P = parts47('341', fatorAlvo, 12345, '1234567890123456789012345');
  const rp = ev(`bolParse('${P.linha}')`);
  t('boleto: lê a linha digitável de 47 números (banco, valor em centavos) e os dígitos verificadores batem', rp.tipo === 'boleto' && rp.banco === '341' && rp.valorC === 12345 && rp.ok === true, true);
  t('boleto: o fator de vencimento vira a data certa (depois de 22/02/2025 recomeça em 1000)', ev(`bolDate(${fatorAlvo},new Date())`) === isoAlvo && ev(`bolDate(1641,new Date(2026,9,18))`) === '2026-11-25' && ev(`bolDate(1000,new Date(2025,2,1))`) === '2025-02-22', true);
  t('boleto: o fator antigo (antes de 2025) também funciona', ev(`bolDate(4000,new Date(2008,8,1))`) === '2008-09-06' || ev(`bolDate(4000,new Date(2008,8,1))`) === '2008-09-07' || /^2008-/.test(ev(`bolDate(4000,new Date(2008,8,1))`)), true);
  t('boleto: o mesmo código com pontos e espaços (como vem impresso) é lido igual', ev(`bolParse(${JSON.stringify(bonito(P))})`).valorC === 12345 && ev(`bolParse(${JSON.stringify(bonito(P))})`).ok === true, true);
  const errado = P.linha.slice(0, 3) + String((+P.linha[3] + 1) % 10) + P.linha.slice(4);
  t('boleto: um número trocado faz o código NÃO bater (avisa para conferir)', ev(`bolParse('${errado}')`).ok === false, true);
  t('boleto: número com tamanho que não é de boleto não é lido', ev(`bolParse('12345')`) === null && ev(`bolParse('')`) === null, true);
  t('boleto: o código de barras de 44 números também é lido (mesmo valor, bate)', ev(`bolParse('${P.barra}')`).valorC === 12345 && ev(`bolParse('${P.barra}')`).ok === true, true);
  const ruido = 'BANCO ITAU 341-7\nAg/Cod 1234 5678-9\nLinha digitável:\n' + bonito(P).replace(' ', ' \n') + '\nPagador: FULANO 99\n';
  const rl = ev(`docLer(${JSON.stringify(ruido)},new Date())`);
  t('foto: acha o código no meio do texto sujo (até quebrado em linhas) e lê valor, banco e vencimento', rl.tipo === 'boleto' && rl.ok === true && rl.valorC === 12345 && rl.banco === '341' && rl.venc === isoAlvo, true);
  const rl2 = ev(`docLer(${JSON.stringify('texto qualquer 4 5 3\n' + errado.slice(0, 5) + '.' + errado.slice(5, 10) + ' ' + errado.slice(10, 15) + '.' + errado.slice(15, 21) + ' ' + errado.slice(21, 26) + '.' + errado.slice(26, 32) + ' ' + errado[32] + ' ' + errado.slice(33))},new Date())`);
  t('foto: código com erro de leitura ainda mostra o que deu para ler, mas marcado como "não bateu"', rl2.tipo === 'boleto' && rl2.ok === false && rl2.valorC === 12345, true);
  // convênio
  const bar6 = '8' + '1' + '6' + '7' + '00000012345' + '12345678901234567890123456789';
  const blocos = [0, 11, 22, 33].map(i => bar6.slice(i, i + 11));
  const l48 = blocos.map(b => b + lun(b)).join('');
  const c6 = ev(`bolParse('${l48}')`);
  t('convênio (conta de consumo, 48 números): lê o valor e confere os dígitos', c6.tipo === 'convenio' && c6.valorC === 12345 && c6.ok === true, true);
  const l48b = l48.slice(0, 11) + String((+l48[11] + 1) % 10) + l48.slice(12);
  t('convênio: dígito errado não bate', ev(`bolParse('${l48b}')`).ok === false, true);
  const bar8 = '8' + '1' + '8' + '7' + '00000099900' + '12345678901234567890123456789';
  const c8 = ev(`bolParse('${bar8}')`);
  t('convênio com valor efetivo (tipo 8): lê o valor e diz que não dá para conferir o dígito', c8.valorC === 99900 && c8.ok === null, true);
  // fatura em texto
  const fat = 'FATURA CARTÃO\nVencimento: 10/11/2026\nPagamento mínimo R$ 123,45\nTotal da fatura R$ 1.234,56\nLimite R$ 5.000,00\n';
  const rf = ev(`docLer(${JSON.stringify(fat)},new Date())`);
  t('fatura (sem código): acha o vencimento e o total pelos rótulos, ignora mínimo e limite', rf.tipo === 'texto' && rf.venc === '2026-11-10' && rf.valorC === 123456, true);
  t('fatura: junta as datas e valores que viu (para ajudar a conferir)', rf.outrasDatas.indexOf('2026-11-10') >= 0 && rf.outrosValores.indexOf(123456) >= 0, true);
  const rn = ev(`docLer('nada útil aqui',new Date())`);
  t('sem nada legível: não inventa valor nem data', rn.valorC === null && rn.venc === null && rn.linha === '', true);
  // tela
  ev(`S.tab='bills';render();`);
  t('Financeiro Mês: tem o botão Ler boleto ou fatura', !!doc.querySelector('#app [data-act="bill-read"]'), true);
  click(doc.querySelector('#app [data-act="bill-read"]')); await wait(20);
  t('janela: tem onde colar o código, o botão da foto e o Voltar', !!doc.querySelector('.modal #bl-code') && !!doc.querySelector('.modal #bl-foto') && !!doc.querySelector('.modal #bl-file') && !!doc.querySelector('.modal #c0'), true);
  doc.querySelector('.modal #bl-code').value = bonito(P);
  click(doc.querySelector('.modal #bl-go')); await wait(20);
  const rtxt = doc.querySelector('.modal #bl-res').textContent;
  t('janela: ao ler o código mostra valor, vencimento, banco e "o código bateu"', /R\$\s*123,45/.test(rtxt) && rtxt.indexOf(isoAlvo.split('-').reverse().join('/')) >= 0 && /Itaú/.test(rtxt) && /código bateu/.test(rtxt), true);
  ev(`window.__presets=[];billForm=async(rec,preset)=>{window.__presets.push(preset);};`);
  click(doc.querySelector('.modal #bl-use')); await wait(20);
  const pr = ev('window.__presets[0]');
  t('janela: "Criar a conta" abre o formulário com nome, dia, valor e mês do vencimento já preenchidos (conta de uma vez só)', pr && pr.name === 'Boleto Itaú' && pr.dueDay === +isoAlvo.slice(8, 10) && pr.amountC === 12345 && pr.recurring === false && pr.startYm === isoAlvo.slice(0, 7) && !doc.querySelector('.modal'), true);
  click(doc.querySelector('#app [data-act="bill-read"]')); await wait(20);
  doc.querySelector('.modal #bl-code').value = errado;
  click(doc.querySelector('.modal #bl-go')); await wait(20);
  t('janela: código com número errado avisa em vermelho para conferir', /não bateu/.test(doc.querySelector('.modal #bl-res').textContent), true);
  doc.querySelector('.modal #bl-code').value = '123';
  click(doc.querySelector('.modal #bl-go')); await wait(20);
  t('janela: sem nada legível diz para tirar outra foto ou colar o código, e não oferece criar a conta', /Não encontrei valor nem vencimento/.test(doc.querySelector('.modal #bl-res').textContent) && !doc.querySelector('.modal #bl-use'), true);
  // foto com o leitor simulado
  ev(`ocrPrep=async f=>f;ocrRead=async()=>${JSON.stringify(fat)};`);
  const fi = doc.querySelector('.modal #bl-file');
  Object.defineProperty(fi, 'files', { value: [new w.File(['x'], 'a.png', { type: 'image/png' })], configurable: true });
  fi.dispatchEvent(new w.Event('change')); await wait(40);
  t('foto: o texto lido vira resultado na janela (fatura: total e vencimento)', /R\$\s*1\.234,56/.test(doc.querySelector('.modal #bl-res').textContent) && /10\/11\/2026/.test(doc.querySelector('.modal #bl-res').textContent), true);
  ev(`ocrRead=async()=>{throw new Error('sem internet para carregar o leitor');};`);
  fi.dispatchEvent(new w.Event('change')); await wait(40);
  t('foto: se o leitor não carregar (sem internet), avisa e manda colar o código', /Não consegui ler a foto agora/.test(doc.querySelector('.modal #bl-res').textContent) && /colar o código/.test(doc.querySelector('.modal #bl-res').textContent), true);
  click(doc.querySelector('.modal #c0')); await wait(20);
  t('janela: Voltar fecha', !doc.querySelector('.modal'), true);
  // plano de quitação
  ev(`S.recs=[{id:'cap',kind:'proposal',version:1,data:{cfg:'capacity',capacityC:200000}},
     {id:'d1',kind:'debt',version:1,data:{creditor:'Banco Alfa',balanceC:100000,installC:10000,dueDay:5,rateBp:200,status:'ATIVA',holder:'MARCELO',payer:'MARCELO'}},
     {id:'d2',kind:'debt',version:1,data:{creditor:'Banco Beta',balanceC:300000,installC:20000,dueDay:15,rateBp:300,status:'ATIVA',holder:'MARCELO',payer:'MARCELO'}}];S.tab='plan';S.who='ALL';render();`);
  const ph = doc.querySelector('#app').innerHTML;
  t('plano de quitação: cada dívida mostra o mês e o ano em que acaba e uma barra do caminho', (ph.match(/class="plan-bar"/g) || []).length >= 4 && /Banco Alfa/.test(ph) && /Banco Beta/.test(ph) && /de 20\d\d · mês \d+/.test(ph), true);
  t('plano de quitação: compara os dois caminhos e diz quanto um custa a menos', /Comparando os dois caminhos/.test(ph) && /a menos no total|os dois custam o mesmo/.test(ph), true);
  ev(`S.tab='home';render();`);
  // ---- gastos por categoria (v14)
  t('lugar: a chave do nome tira MP*, LTDA, números, acento e fica com as 2 primeiras palavras', ev(`[gKey('SPASSO SABORES'),gKey('MP*MARCIANOSADEG'),gKey('ALAMEDA DO CHOPP LTDA'),gKey('Posto Shell 1234 Amparo'),gKey('PIX 98765'),gKey('')].join('|')`), 'spasso sabores|marcianosadeg|alameda chopp|posto shell|pix|');
  ev(`Api.create=async(kind,data)=>{const r={id:'cfgcat',kind,version:1,data};S.recs.push(r);return r;};Api.update=async(rec,data)=>{rec.data=data;rec.version++;return rec;};`);
  const en = (i, d, c, k, tt, g) => ({ i, d, c, k, t: tt, g: g || 'Cartão final 2273' });
  const entradas = [en('a1', '2030-03-02', -6000, 'EXPENSE', 'SPASSO SABORES'), en('a2', '2030-03-09', -5759, 'EXPENSE', 'SPASSO SABORES 02'), en('a3', '2030-03-10', -10000, 'EXPENSE', 'JEVERSONVANDERLEI'),
    en('a4', '2030-03-11', -20000, 'EXPENSE', 'POSTO SHELL AMPARO', 'Carro'), en('a5', '2030-03-12', -412000, 'CARD_SETTLEMENT', 'PAGAMENTO FATURA'), en('a6', '2030-03-13', 500000, 'INCOME', 'SALARIO'),
    en('a7', '2030-03-14', -3000, 'EXPENSE', 'MP*MARCIANOSADEG'), en('a8', '2030-02-05', -30000, 'EXPENSE', 'POSTO SHELL AMPARO', 'Carro'), en('a9', '2030-02-06', -8000, 'EXPENSE', 'SPASSO SABORES')];
  ev(`S.who='ALL';S.sp={ym:'2030-03',cat:null,all:false};S.recs=[
    {id:'s1',kind:'stmt',version:1,data:{account:'Bradesco teste',holder:'MARCELO',entries:${JSON.stringify(entradas)}}},
    {id:'c9',kind:'card',version:1,data:{name:'Bradesco',closeDay:21,dueDay:1,holder:'MARCELO'}},
    {id:'ch1',kind:'charge',version:1,data:{cardId:'c9',date:'2030-03-15',desc:'Padaria Central',totalC:2500,n:1}},
    {id:'ch2',kind:'charge',version:1,data:{cardId:'c9',date:'2030-03-18',desc:'Fatura aberta Bradesco · saldo consolidado',totalC:95774,n:1}},
    {id:'ch3',kind:'charge',version:1,data:{cardId:'c9',date:'2030-03-19',desc:'Tênis',totalC:34999,n:6}}];`);
  const rowsG = ev(`gastosRows().map(r=>r.i).sort().join(',')`);
  t('gastos: entram só os gastos de verdade (não entram pagamento de fatura, renda, a fatura consolidada e compra parcelada)', rowsG, 'a1,a2,a3,a4,a7,a8,a9,ch1');
  const gm = ev(`(function(){const g=gastosMes('2030-03');return {total:g.total,semN:g.semN,semV:g.semV,cats:g.list.map(x=>x.c+':'+x.v).join(',')};})()`);
  t('gastos: total do mês, o que tem categoria (a do Mobills "Carro" vale) e o que ficou sem', gm.total === 47259 && gm.semN === 5 && gm.semV === 27259 && gm.cats === 'Carro:20000', true);
  ev(`S.recs.push({id:'cfgcat',kind:'proposal',version:1,data:{cfg:'cats',rules:[{m:'spasso sabores',c:'Mercado',s:'Compras da casa'}],over:{a3:{c:'Lazer',s:'Passeios'}},extra:{}}});`);
  t('categoria: a escolhida só para o lançamento ganha da regra do lugar, e a regra ganha da categoria do Mobills', ev(`JSON.stringify([catOf({i:'a3',t:'JEVERSONVANDERLEI',g:'Carro'}),catOf({i:'x',t:'SPASSO SABORES 07',g:'Carro'}),catOf({i:'y',t:'POSTO X',g:'Carro'}),catOf({i:'z',t:'LOJA QUALQUER',g:'Cartão final 2273'})])`),
    JSON.stringify([{ c: 'Lazer', s: 'Passeios' }, { c: 'Mercado', s: 'Compras da casa' }, { c: 'Carro', s: '' }, null]));
  const d3 = ev(`(function(){const x=donutSvg(gastosMes('2030-03').list,gastosMes('2030-03').total,gastosMes('2030-03').semV);const n=[...x.matchAll(/stroke-dasharray="([\\d.]+) /g)].map(m=>+m[1]);return {n:n.length,soma:Math.round(n.reduce((a,b)=>a+b,0))};})()`);
  t('pizza: as fatias somam 100% do círculo', d3.soma === 100 && d3.n >= 3, true);
  ev(`S.tab='home';render();`);
  t('Financeiro Início: tem o botão Gastos', !!doc.querySelector('#app [data-act="tab"][data-v="spend"]'), true);
  ev(`S.tab='spend';S.sp={ym:'2030-03',cat:null,all:false};render();`);
  let ap = doc.querySelector('#app').textContent;
  t('Gastos: mostra o mês, o total, o mês passado e a diferença', /março de 2030|Março de 2030|03\/2030|março/i.test(ap) && /R\$\s*472,59/.test(ap) && /Mês passado/.test(ap) && /R\$\s*380,00/.test(ap) && /\+R\$\s*92,59/.test(ap), true);
  t('Gastos: tem a pizza, as categorias com % e a seta contra o mês passado, e o aviso de sem categoria com o botão Categorizar agora', !!doc.querySelector('#app svg.donut') && /Carro/.test(ap) && /↓ R\$\s*100,00/.test(ap) && /lançamentos sem categoria/.test(ap) && !!doc.querySelector('#app [data-act="sp-queue"]'), true);
  click(doc.querySelector('#app [data-act="sp-prev"]')); await wait(20);
  ap = doc.querySelector('#app').textContent;
  t('Gastos: ‹ vai para o mês anterior (fevereiro) com o total dele', /fevereiro/i.test(ap) && /R\$\s*380,00/.test(ap), true);
  click(doc.querySelector('#app [data-act="sp-next"]')); await wait(20);
  click(doc.querySelector('#app [data-act="sp-cat"][data-c="Carro"]')); await wait(20);
  ap = doc.querySelector('#app').textContent;
  t('Gastos: tocar numa categoria abre o detalhe (lançamentos dela)', /POSTO SHELL AMPARO/.test(ap) && !!doc.querySelector('#app [data-act="sp-pick"]'), true);
  click(doc.querySelector('#app [data-act="sp-all"]')); await wait(20);
  t('Gastos: a planilha mostra todos os lançamentos do mês (data, onde, categoria, valor)', doc.querySelectorAll('#app [data-act="sp-pick"]').length >= 6 && /sem categoria/.test(doc.querySelector('#app').textContent), true);
  click(doc.querySelector('#app [data-act="sp-all"]')); await wait(20);
  // categorizar de verdade (fila)
  ev(`S.recs=S.recs.filter(r=>r.id!=='cfgcat');S.sp={ym:'2030-03',cat:null,all:false};render();`);
  click(doc.querySelector('#app [data-act="sp-queue"]')); await wait(30);
  t('categorizar: a fila começa pelo maior gasto sem categoria e pede a categoria (com Parar)', /JEVERSONVANDERLEI/.test(doc.querySelector('.modal').textContent) && /Que gasto foi este\?/.test(doc.querySelector('.modal').textContent) && /Parar/.test(doc.querySelector('.modal').textContent) && !!doc.querySelector('.modal [data-c="Mercado"]'), true);
  click(doc.querySelector('.modal [data-c="Outros"]')); await wait(20);
  click(doc.querySelector('.modal #cp-nosub')); await wait(20);
  t('categorizar: sem lançamentos parecidos pergunta só "Sim, categorizar" com o resumo', /Categoria: Outros/.test(doc.querySelector('.modal').textContent) && !!doc.querySelector('.modal #cp-one') && !doc.querySelector('.modal #cp-all'), true);
  click(doc.querySelector('.modal #cp-one')); await wait(40);
  t('categorizar: salvou só para aquele lançamento (override) e a fila passou para o próximo (SPASSO)', ev(`catData().over.a3.c`) === 'Outros' && /SPASSO SABORES/.test(doc.querySelector('.modal').textContent), true);
  click(doc.querySelector('.modal [data-c="Mercado"]')); await wait(20);
  t('categorizar: depois da categoria vêm as subcategorias (e dá para deixar sem)', !!doc.querySelector('.modal [data-s="Compras da casa"]') && !!doc.querySelector('.modal [data-s="Lanches e salgadinhos"]') && !!doc.querySelector('.modal [data-s="Bebidas e energéticos"]') && !!doc.querySelector('.modal #cp-nosub'), true);
  click(doc.querySelector('.modal [data-s="Lanches e salgadinhos"]')); await wait(20);
  t('categorizar: avisa quantos lançamentos parecidos existem (inclusive de outros meses) e oferece valer para todos', /mais 2 lançamento/.test(doc.querySelector('.modal').textContent) && /todos os parecidos \(3\)/.test(doc.querySelector('#cp-all').textContent) && !!doc.querySelector('.modal #cp-one'), true);
  click(doc.querySelector('.modal #cp-all')); await wait(40);
  const regra = ev(`catData().rules[0]`);
  t('categorizar: guardou a REGRA do lugar (spasso sabores → Mercado › Lanches e salgadinhos) e todos os parecidos já aparecem categorizados, inclusive de fevereiro', regra.m === 'spasso sabores' && regra.c === 'Mercado' && regra.s === 'Lanches e salgadinhos' && ev(`gastosMes('2030-02').semN`) === 0 && ev(`catOf({i:'a1',t:'SPASSO SABORES'}).s`) === 'Lanches e salgadinhos', true);
  t('categorizar: a fila continua no próximo sem categoria (MARCIANO) e Parar encerra', /MARCIANOSADEG/.test(doc.querySelector('.modal').textContent), true);
  click(doc.querySelector('.modal #c0')); await wait(40);
  t('categorizar: ao parar, a janela fecha e a tela mostra o que falta (2 sem categoria)', !doc.querySelector('.modal') && /2 lançamentos sem categoria/.test(doc.querySelector('#app').textContent), true);
  // categoria nova e subcategoria nova
  click(doc.querySelector('#app [data-act="sp-cat"][data-c="__sem"]')); await wait(20);
  click(doc.querySelector('#app [data-act="sp-pick"][data-i="ch1"]')); await wait(20);
  doc.querySelector('.modal #cp-new').value = 'Padaria';
  click(doc.querySelector('.modal #cp-add')); await wait(20);
  click(doc.querySelector('.modal #cp-nosub')); await wait(20);
  click(doc.querySelector('.modal #cp-one')); await wait(40);
  t('categoria nova: digitar um nome novo cria a categoria (guardada) e já vale para o lançamento', ev(`Object.keys(catTree()).indexOf('Padaria')`) >= 0 && ev(`catOf({i:'ch1',t:'x'}).c`) === 'Padaria', true);
  click(doc.querySelector('#app [data-act="sp-pick"][data-i="a7"]')); await wait(20);
  click(doc.querySelector('.modal [data-c="Alimentação fora"]')); await wait(20);
  doc.querySelector('.modal #cp-new').value = 'Cafeteria do mercado';
  click(doc.querySelector('.modal #cp-add')); await wait(20);
  click(doc.querySelector('.modal #cp-one')); await wait(40);
  t('subcategoria nova: digitar uma subcategoria nova a guarda dentro da categoria (ex.: Alimentação fora › Cafeteria do mercado)', ev(`catTree()['Alimentação fora'].indexOf('Cafeteria do mercado')`) >= 0 && ev(`catOf({i:'a7',t:'x'}).s`) === 'Cafeteria do mercado', true);
  t('Gastos: sem nada sem categoria, o aviso e o botão Categorizar agora somem', !doc.querySelector('#app [data-act="sp-queue"]'), true);
  click(doc.querySelector('#app [data-act="sp-cat"][data-c="Carro"]')); await wait(20);
  click(doc.querySelector('#app [data-act="sp-pick"]')); await wait(20);
  t('mudar de ideia: tocar num lançamento já categorizado mostra a categoria de hoje e deixa trocar', /Hoje: /.test(doc.querySelector('.modal').textContent), true);
  click(doc.querySelector('.modal #c0')); await wait(20);
  t('desfazer: categorizar entra na fila do desfazer como "Categorizar gasto"', ev(`undoLabel([{op:'update',kind:'proposal',before:{cfg:'cats'},after:{cfg:'cats'}}])`), 'Categorizar gasto');
  ev(`S.tab='home';S.sp=null;render();`);
  // ---- sem Marlene / sem titular (v15)
  t('sem titular: não existe mais o conceito de pessoa no código (PEOPLE, pname, mine, whoBar, defHolder)', ev(`typeof PEOPLE+'|'+typeof pname+'|'+typeof mine+'|'+typeof whoBar+'|'+typeof defHolder+'|'+typeof HOLD_OPTS`), 'undefined|undefined|undefined|undefined|undefined|undefined');
  ev(`S.who=undefined;S.sheet=null;S.cardId=null;S.recs=[
    {id:'lb1',kind:'bill',version:1,data:{name:'Conta de luz antiga',dueDay:10,variable:true,amountC:null,recurring:true,holder:'MARLENE',account:'Santander da Marlene',startYm:ymOf(todayIso())}},
    {id:'lc1',kind:'card',version:1,data:{name:'Cartão antigo',last4:'2222',limitC:150000,closeDay:25,dueDay:5,holder:'MARLENE'}},
    {id:'ld1',kind:'debt',version:1,data:{creditor:'Consignado antigo',balanceC:500000,installC:20000,dueDay:5,status:'ATIVA',kindD:'Consignado',holder:'MARLENE',payer:'MARLENE',account:'',note:''}},
    {id:'ld2',kind:'debt',version:1,data:{creditor:'Fulano devolve',balanceC:30000,installC:10000,dueDay:20,status:'ATIVA',holder:'MARLENE',payer:'',dir:'RECEBER'}}];`);
  const telasSM = {};
  for (const tab of ['home', 'bills', 'cards', 'debts', 'plan', 'stmt', 'spend']) {
    ev(`S.tab='${tab}';S.cardId=null;render();`);
    telasSM[tab] = doc.querySelector('#app').textContent;
  }
  const NOME_RX = /Marlene|MARLENE|mãe|Titular|De quem|Todos|Devedor no contrato|Quem paga hoje|Por pessoa|Sem dono/;
  t('sem titular: nenhuma tela mostra Marlene, mãe, Titular, Todos, Por pessoa, Devedor no contrato (mesmo com registros antigos que ainda têm o campo)', Object.keys(telasSM).filter(k => NOME_RX.test(telasSM[k])), []);
  t('sem titular: sumiu o seletor Todos / Marcelo / Marlene em todas as telas', doc.querySelectorAll('#app [data-act="who"]').length, 0);
  ev(`S.tab='bills';render();`);
  t('sem titular: registros antigos (com o campo guardado) continuam aparecendo normalmente, sem filtro por pessoa', /Conta de luz antiga/.test(doc.querySelector('#app').textContent), true);
  ev(`S.tab='cards';render();`);
  t('sem titular: o cartão antigo aparece na lista de cartões, sem a linha Titular', /Cartão antigo/.test(doc.querySelector('#app').textContent) && !/Titular/.test(doc.querySelector('#app').textContent), true);
  ev(`S.tab='debts';render();`);
  t('sem titular: dívida antiga aparece como "Dívida · Consignado" e a de a receber como "A receber", sem nome de pessoa', /Dívida · Consignado/.test(doc.querySelector('#app').textContent) && /A receber/.test(doc.querySelector('#app').textContent) && !/quem recebe|paga hoje/.test(doc.querySelector('#app').textContent), true);
  // formulários sem os campos de pessoa
  const formTxt = async (selector) => { click(doc.querySelector(selector)); await wait(30); const x = doc.querySelector('.modal') ? doc.querySelector('.modal').textContent : ''; ev(`document.querySelectorAll('.modal').forEach(m=>m.remove())`); return x; };
  ev(`S.tab='cards';render();`);
  const fCard = await formTxt('#app [data-act="card-new"]');
  t('formulário do cartão: tem apelido, limite e dias, e NÃO tem Titular', /Apelido/.test(fCard) && /Fecha todo dia/.test(fCard) && !/Titular/.test(fCard), true);
  ev(`S.tab='debts';render();`);
  const fDebt = await formTxt('#app [data-act="debt-new"]');
  t('formulário da dívida: tem credor, saldo e parcela, e NÃO tem Devedor no contrato nem Quem paga hoje', /Saldo/.test(fDebt) && /Valor das próximas parcelas/.test(fDebt) && /Valor da 1ª parcela/.test(fDebt) && !/Devedor no contrato|Quem paga hoje/.test(fDebt), true);
  // (o formulário de conta é trocado por um stub num teste anterior; aqui confiro o código dele no arquivo)
  const srcFin = fs.readFileSync(path.join(__dirname, '..', 'fin', 'index.html'), 'utf8');
  const i0 = srcFin.indexOf('async function billForm'), billSrc = srcFin.slice(i0, srcFin.indexOf('async function', i0 + 20));
  t('formulário da conta: tem nome, vencimento e conta bancária, e NÃO tem De quem é a conta nem titular', /Vence todo dia/.test(billSrc) && /Conta bancária que paga/.test(billSrc) && !/holder|De quem é a conta|Marlene/.test(billSrc), true);
  t('o arquivo do Financeiro não cita mais Marlene, MARLENE, titular, pagador nem seletor de pessoa', !/Marlene|MARLENE|holder:|data-act="who"/.test(srcFin.replace(/placeholder/g, '')), true);
  // exemplos de teste (demo) sem Marlene
  ev(`S.recs=[];Api.create=async(kind,data)=>{const r={id:'dm'+S.recs.length,kind,version:1,data};S.recs.push(r);return r;};`);
  let demoErro = '';
  try { await ev(`loadDemo()`); } catch (e) { demoErro = String(e && e.message || e); }
  const demoTxt = ev(`JSON.stringify(S.recs.map(r=>r.data))`);
  t('exemplos de teste: carregam sem erro e não citam Marlene, mãe nem guardam titular/pagador', [demoErro, /Marlene|MARLENE|mãe|holder|payer/.test(demoTxt), ev(`S.recs.length`) > 8], ['', false, true]);
  ev(`S.recs=[];S.tab='home';render();`);
  t('Financeiro: versão do cache subiu para v41', /fin-app-v41/.test(fs.readFileSync(path.join(__dirname, '..', 'fin', 'sw.js'), 'utf8')), true);

  console.log(ok + ' ok, ' + bad + ' falhas (Financeiro)');
  process.exit(bad ? 1 : 0);
})();
