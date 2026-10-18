// Testes do Núcleo. Uso: cd tests && npm install && npm test
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const vc = new VirtualConsole();
vc.on('jsdomError', e => console.log('erro no app:', String(e.message).slice(0, 200), (e.detail && e.detail.stack || '').split('\n').slice(0,3).join(' | ')));
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://nucleo51.github.io/nucleo/', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) { w.__NUCLEO_TEST__ = true; w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, addEventListener() {} })); w.scrollTo = () => {}; } });
const w = dom.window;
const ev = s => w.eval(s);
let ok = 0, bad = 0;
const t = (nome, got, want) => {
  const g = JSON.stringify(got), e = JSON.stringify(want);
  if (g === e) ok++; else { bad++; console.log('FALHOU:', nome, '\n   veio :', g, '\n   queria:', e); }
};
// 15/10/2026 (quinta-feira) 10:00
const NOW = 'new Date(2026,9,15,10,0,0)';
const cap = (txt) => ev('(function(){const r=parseCapture(' + JSON.stringify(txt) + ',' + NOW + ');return {title:r.title,date:r.date,time:r.time,repeat:r.repeat,repN:r.repN,repU:r.repU};})()');

// --- captura por texto ---
t('amanhã às 15h', cap('Dentista amanhã às 15h'), { title: 'Dentista', date: '2026-10-16', time: '15:00', repeat: 'none', repN: 0, repU: '' });
t('de 8 em 8 horas', cap('Tomar remédio de 8 em 8 horas'), { title: 'Tomar remédio', date: '2026-10-15', time: '11:00', repeat: 'custom', repN: 8, repU: 'hour' });
t('a cada 2 dias', cap('Regar planta a cada 2 dias'), { title: 'Regar planta', date: '2026-10-15', time: '', repeat: 'custom', repN: 2, repU: 'day' });
t('às 6h acordar fica de manhã', cap('Às 6h acordar amanhã').time, '06:00');
t('às 3h reunião fica à tarde', cap('Reunião amanhã às 3h').time, '15:00');
t('sexta da semana que vem', cap('Consulta sexta da semana que vem').date, '2026-10-23');
t('semana que vem sozinha = segunda', cap('Pagar conta semana que vem').date, '2026-10-19');
t('todo dia 31', cap('Pagar aluguel todo dia 31').repeat, 'monthly');

// --- repetição mensal não "deriva" ---
const drift = ev(`(function(){
  let r={date:'2026-01-31',time:'',repeat:'monthly'};const out=[];
  for(let i=0;i<4;i++){const nx=repNext(r,new Date(r.date+'T12:00:00'));
    r=Object.assign({},r,{repAnchor:(r.repAnchor&&r.repAnchorFor===r.date)?r.repAnchor:r.date,repAnchorFor:nx.date,date:nx.date});out.push(nx.date);}
  return out;})()`);
t('mensal dia 31 volta ao 31', drift, ['2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
const edit = ev(`repNext({date:'2026-03-10',time:'',repeat:'monthly',repAnchor:'2026-01-31',repAnchorFor:'2026-03-31'},new Date(2026,2,10)).date`);
t('mudar a data à mão zera o dia-âncora', edit, '2026-04-10');
const anual = ev(`repNext({date:'2024-02-29',time:'',repeat:'yearly'},new Date(2024,1,29)).date`);
t('anual 29/02', anual, '2025-02-28');

// --- o app (script principal) não tem erro de sintaxe e tem os recursos de segurança ---
const vm = require('vm');
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
scripts.forEach((src, i) => { let e = ''; try { new vm.Script(src); } catch (x) { e = x.message; } t('sintaxe do script ' + (i + 1), e, ''); });
t('painel Saúde no Ajustes', /Saúde do app/.test(html) && /sheetSaude\(\)/.test(html), true);
t('registro de erros ligado', /addEventListener\('unhandledrejection'/.test(html) && /logErr\('alarmes'/.test(html), true);
t('limite de 50 por rodada nos alarmes atrasados', /nput>=50/.test(html), true);
t('ícone novo no manifest e no app', /nucleo1/.test(html) && /nucleo1/.test(fs.readFileSync(path.join(__dirname, '..', 'manifest.webmanifest'), 'utf8')), true);

t('notas: botão Criar a pasta Documentos foi tirado', !/make-docs/.test(html) && !/Criar a pasta Documentos/.test(html), true);

t('caixa de entrada: campo rápido, sem selo na aba, caixa única com cartões', !/id="qcapIn"/.test(html) && /f\.focus\(\{preventScroll/.test(html) && !/tab-badge/.test(html) && /inb-card/.test(html) && /'loose-del'/.test(html) && !/Organizar um por um<\/button>/.test(html), true);
t('caixa de entrada sempre visível', /Tudo organizado ✓/.test(html), true);
t('notas: pastas na tela inicial e busca só quando o botão é tocado', /function notesFolders\(\)/.test(html) && /if\(S\.nsOpen\)h\+='<div class="search">/.test(html), true);

t('arquivos: não apagar anexo usado por outro item', /usado\.has\(id\)/.test(html) && /Este arquivo não está mais guardado/.test(html), true);

t('planner: botão, página, atrasados e fim de semana só se houver itens', /function planBtn\(/.test(html) && /function planView\(/.test(html) && /function planDayRow\(/.test(html) && !/plan-late-today/.test(html) && /if\(i>=5&&!dayCount\(iso\)\)continue/.test(html) && !/Mostrar sábado e domingo/.test(html.slice(html.indexOf('function remHomeBody'),html.indexOf('function listRow'))), true);


// --- busca geral (v39) ---
const T = () => w.__NUCLEO_TEST__;
ev(`const S=window.__NUCLEO_TEST__.S;S.ready=true;S.tab='hoje';
S.folders=[{id:'f1',name:'Documentos'},{id:'f2',name:'Carro',parent:'f1'}];
S.lists=[{id:'l1',name:'Mercado'}];
S.reminders=[
 {id:'r1',title:'Consulta médica',notes:'levar pedido do cardiologista',date:'2026-10-20',time:'09:00',done:false,list:'',subtasks:[],files:[]},
 {id:'r2',title:'Comprar pão',notes:'',date:'2026-10-16',time:'',done:false,list:'l1',subtasks:[{t:'Manteiga',done:false}],files:[]},
 {id:'r3',title:'Renovar documento',notes:'',date:'',time:'',done:true,list:'',subtasks:[],files:[{name:'CNH ELISA 2.pdf'}]}];
S.events=[{id:'e1',title:'Reunião escola',notes:'sala 3',date:'2026-10-22',time:'14:00'}];
S.notes=[{id:'n1',title:'Seguro do carro',body:'Apólice vence em março. Corretor: João',folder:'f2',checklist:[],files:[],createdAt:1}];
S.inbox=[{id:'i1',text:'ligar para a seguradora',source:'siri',createdAt:1}];`);
const gs = q => ev('(function(){const r=__NUCLEO_TEST__.gsFind(' + JSON.stringify(q) + ');return {rem:r.rem.map(x=>x.id),ev:r.ev.map(x=>x.id),note:r.note.map(x=>x.id),inbox:r.inbox.map(x=>x.id),folder:r.folder.map(x=>x.id),list:r.list.map(x=>x.id),total:r.total};})()');
t('busca acha lembrete pelo título, sem acento', gs('medica').rem, ['r1']);
t('busca acha texto dentro das observações', gs('cardiologista').rem, ['r1']);
t('busca acha subtarefa', gs('manteiga').rem, ['r2']);
t('busca acha nome de anexo', gs('cnh').rem, ['r3']);
t('busca acha compromisso', gs('escola').ev, ['e1']);
t('busca acha dentro do texto da nota', gs('apolice').note, ['n1']);
t('busca acha nota pelo nome da pasta', gs('carro').note, ['n1']);
t('busca acha pasta', gs('docum').folder, ['f1']);
t('busca acha lista', gs('mercado').list, ['l1']);
t('busca acha na caixa de entrada', gs('seguradora').inbox, ['i1']);
t('busca com duas palavras exige as duas', gs('seguro carro').note, ['n1']);
t('busca com duas palavras sem a segunda não acha', gs('seguro avião').total, 0);
t('busca ignora maiúsculas', gs('REUNIÃO').ev, ['e1']);
t('busca vazia: pede 2 letras', /pelo menos 2 letras/.test((ev('__NUCLEO_TEST__.S.gq="a"'), ev('__NUCLEO_TEST__.gsBody()'))), true);
t('busca sem resultado avisa', /Nada encontrado/.test((ev('__NUCLEO_TEST__.S.gq="zzzzqq"'), ev('__NUCLEO_TEST__.gsBody()'))), true);
t('busca mostra contagem e seções', /resultado/.test((ev('__NUCLEO_TEST__.S.gq="carro"'), ev('__NUCLEO_TEST__.gsBody()'))) && /Notas/.test((ev('__NUCLEO_TEST__.S.gq="carro"'), ev('__NUCLEO_TEST__.gsBody()'))), true);
t('lembrete feito aparece marcado como feito', /feito/.test((ev('__NUCLEO_TEST__.S.gq="cnh"'), ev('__NUCLEO_TEST__.gsBody()'))), true);
t('botão de busca na tela Hoje, ao lado de Ouvir e Ajustes', (() => { const h = ev('__NUCLEO_TEST__.viewHoje()'); const i = h.indexOf('data-act="gs-open"'), j = h.indexOf('data-act="speak-day"'), k = h.indexOf('data-act="settings"'); return i > 0 && i < j && j < k; })(), true);
t('tela de busca tem campo, voltar e área de resultados', (() => { const h = ev('__NUCLEO_TEST__.viewBusca()'); return /id="gq"/.test(h) && /data-act="gs-back"/.test(h) && /id="gsBody"/.test(h); })(), true);
t('busca: tela entra no render e mantém teclado', /busca:viewBusca/.test(html) && /active\.id==='gq'/.test(html), true);
ev(`__NUCLEO_TEST__.S.gq='';__NUCLEO_TEST__.S.tab='hoje';`);


// --- busca geral: fluxo de toque (abrir, digitar, resultado, voltar) ---
{
  const doc = w.document, clickAct = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  const q = (sel) => doc.querySelector(sel);
  ev(`__NUCLEO_TEST__.S.tab='lembretes'`);
  clickAct(q('#tab-hoje'));                                   // vai para Hoje (re-desenha com os dados de teste)
  t('fluxo: tela Hoje mostra o botão de busca', !!q('#main [data-act="gs-open"]'), true);
  clickAct(q('#main [data-act="gs-open"]'));                  // toca na lupa
  t('fluxo: abriu a tela de busca com o campo', !!q('#gq') && ev('__NUCLEO_TEST__.S.tab') === 'busca', true);
  const inp = q('#gq'); inp.value = 'seguro';
  inp.dispatchEvent(new w.Event('input', { bubbles: true }));
  const body = q('#gsBody');
  t('fluxo: digitou e apareceram resultados (nota)', /Seguro do carro/.test(body.innerHTML) && !!body.querySelector('[data-act="open-note"]'), true);
  t('fluxo: campo continua o mesmo (teclado não fecha)', q('#gq') === inp, true);
  clickAct(body.querySelector('[data-act="open-note"]'));      // toca no resultado
  t('fluxo: tocar no resultado abre a nota', ev('__NUCLEO_TEST__.S.sheet&&__NUCLEO_TEST__.S.sheet.type') === 'notev', true);
  ev('__NUCLEO_TEST__.S.sheet=null');
  clickAct(q('#main [data-act="gs-back"]'));                  // Voltar
  t('fluxo: Voltar leva para Hoje e limpa a busca', ev('__NUCLEO_TEST__.S.tab') === 'hoje' && ev('__NUCLEO_TEST__.S.gq') === '', true);
}


// --- tela Hoje só com botões (v40) ---
{
  const doc = w.document, clickAct = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  const q = (sel) => doc.querySelector(sel);
  const TT = w.__NUCLEO_TEST__, today = ev(`isoDate(new Date())`);
  ev(`const S=__NUCLEO_TEST__.S;S.ready=true;S.tab='hoje';S.rview=null;S.gq='';
    S.reminders=[
      {id:'a1',title:'Atrasado antigo',notes:'',date:'2020-01-01',time:'',done:false,list:'l1',subtasks:[],files:[]},
      {id:'h1',title:'Lembrete de hoje',notes:'',date:'${today}',time:'23:59',done:false,list:'l1',subtasks:[],files:[]},
      {id:'f1',title:'Lembrete futuro',notes:'',date:'2099-01-01',time:'',done:false,list:'l1',subtasks:[],files:[]}];
    S.events=[];S.notes=[];S.folders=[];S.lists=[{id:'l1',name:'Mercado'}];
    S.inbox=[{id:'i1',text:'pagar IPVA',source:'siri',createdAt:1}];`);
  const hoje = TT.viewHoje();
  t('hoje: não mostra mais as listas de baixo', !/Lembretes de hoje<\/h2>/.test(hoje) && !/Agenda de hoje/.test(hoje) && !/inb-card/.test(hoje) && !/sec-today|sec-inbox|sec-late/.test(hoje), true);
  t('hoje: tem os 4 botões + FIN', ['s:hojeso', 'go-agenda', 's:late', 'go-caixa', 'fin-send', 'fin-open'].every(k => hoje.indexOf(k) > 0), true);
  t('hoje: cronômetro é o último', hoje.indexOf('rl-open') > hoje.indexOf('fin-open') && hoje.indexOf('rl-open') > hoje.indexOf('go-caixa'), true);
  t('hoje: data grande (dia da semana e data em linhas próprias)', /class="dateW"/.test(hoje) && /class="dateD"/.test(hoje) && /\.dateW\{font-size:1\.9rem/.test(html) && /\.dateD\{font-size:1\.5rem/.test(html), true);
  t('hoje: continua com busca, ouvir e ajustes', hoje.indexOf('gs-open') > 0 && hoje.indexOf('gs-open') < hoje.indexOf('speak-day') && hoje.indexOf('speak-day') < hoje.indexOf('data-act="settings"'), true);
  // Atrasados: abre página inteira, só com atrasados, e Voltar leva para Hoje
  doc.getElementById('tab-hoje').click();
  clickAct(q('#main [data-act="go-rem"][data-v="s:late"]'));
  const m1 = q('#main').innerHTML;
  t('atrasados: abre a página com os atrasados', /Atrasado antigo/.test(m1) && !/Lembrete futuro/.test(m1) && !/Lembrete de hoje/.test(m1.replace(/Lembretes de hoje/g, '')), true);
  t('atrasados: botão Voltar é "Hoje" e tem Passar para hoje', /data-act="hj-back"/.test(m1) && /data-act="late-today"/.test(m1), true);
  clickAct(q('#main [data-act="hj-back"]'));
  t('atrasados: Voltar leva para a tela Hoje', ev('__NUCLEO_TEST__.S.tab') === 'hoje' && !!q('#main [data-act="go-caixa"]'), true);
  // Lembretes hoje: só os de hoje
  clickAct(q('#main [data-act="go-rem"][data-v="s:hojeso"]'));
  const m2 = q('#main').innerHTML;
  t('lembretes hoje: página só com os de hoje', /Lembrete de hoje/.test(m2) && !/Atrasado antigo/.test(m2) && !/Lembrete futuro/.test(m2), true);
  clickAct(q('#main [data-act="hj-back"]'));
  // Caixa de entrada: página própria
  clickAct(q('#main [data-act="go-caixa"]'));
  const m3 = q('#main').innerHTML;
  t('caixa: abre página inteira com os itens e botões', /Caixa de entrada/.test(m3) && /pagar IPVA/.test(m3) && /inb-card/.test(m3) && /data-act="inbox-rem"/.test(m3) && /data-act="cx-back"/.test(m3), true);
  t('caixa: aba Hoje continua acesa', q('#tab-hoje').classList.contains('on'), true);
  clickAct(q('#main [data-act="cx-back"]'));
  t('caixa: Voltar leva para Hoje', ev('__NUCLEO_TEST__.S.tab') === 'hoje', true);
  // entrar em Lembretes pela aba não herda o "voltar para Hoje"
  clickAct(q('#main [data-act="go-rem"][data-v="s:late"]'));
  clickAct(q('#tab-lembretes'));
  t('aba Lembretes: não fica preso ao voltar de Hoje', ev('__NUCLEO_TEST__.S.rfromHoje') === 0, true);
  ev(`const S=__NUCLEO_TEST__.S;S.tab='hoje';S.rview=null;S.rfromHoje=0;`);
}


// --- Notas: botões Escanear, Nova nota e Desenhar no topo (v41) ---
{
  const doc = w.document, clickAct = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  const q = (sel) => doc.querySelector(sel);
  const TT = w.__NUCLEO_TEST__;
  ev(`const S=__NUCLEO_TEST__.S;S.ready=true;S.tab='notas';S.folder=null;S.q='';S.sheet=null;
    S.folders=[{id:'f1',name:'Documentos'}];S.notes=[];S.reminders=[];S.events=[];S.inbox=[];S.lists=[];`);
  const raiz = TT.viewNotas();
  const iS = raiz.indexOf('data-act="scan-new"'), iN = raiz.indexOf('data-act="new-note"'), iD = raiz.indexOf('data-act="draw-new"'), iA = raiz.indexOf('data-act="settings"');
  t('notas: Escanear, Nova nota, Desenhar e Buscar numa fileira logo abaixo do título, antes da lista', iS > 0 && iS < iN && iN < iD && iD < raiz.indexOf('data-act="ns-toggle"') && raiz.indexOf('data-act="ns-toggle"') < raiz.indexOf('id="notesFolders"') && /class="notes-tools"/.test(raiz) && iA > 0 && iA < iS, true);
  t('notas: botões têm nome para leitura (aria-label)', /aria-label="Escanear"/.test(raiz) && /aria-label="Nova nota"/.test(raiz) && /aria-label="Desenhar"/.test(raiz), true);
  t('notas: a barra de baixo com os 3 botões saiu', !/class="actbar"/.test(raiz) && (raiz.match(/data-act="scan-new"/g) || []).length === 1 && (raiz.match(/data-act="new-note"/g) || []).length === 1, true);
  t('notas: Nova nota e Desenhar não repetem o mesmo ícone', /noteplus:/.test(html) && /brush:/.test(html), true);
  // toque em Nova nota abre o formulário de nota
  doc.getElementById('tab-notas').click();
  clickAct(q('#main [data-act="new-note"]'));
  t('notas: tocar em Nova nota abre o formulário', ev('__NUCLEO_TEST__.S.sheet&&__NUCLEO_TEST__.S.sheet.type') === 'note', true);
  ev('__NUCLEO_TEST__.S.sheet=null');
  // dentro de uma pasta, os botões continuam no topo e criam dentro dela
  ev(`__NUCLEO_TEST__.S.folder='f1';`);
  const pasta = TT.viewNotas();
  t('notas: dentro da pasta os botões também estão no topo e usam a pasta', /data-act="new-note" data-folder="f1"/.test(pasta) && /data-act="scan-new" data-folder="f1"/.test(pasta) && /data-act="draw-new" data-folder="f1"/.test(pasta) && !/class="actbar"/.test(pasta), true);
  t('notas: dentro da pasta o lápis de renomear continua', /data-act="edit-folder"/.test(pasta), true);
  // em "Todas as notas" (não é pasta real) cria sem pasta
  ev(`__NUCLEO_TEST__.S.folder='v:all';`);
  t('notas: em Todas as notas cria sem pasta', /data-act="new-note" data-folder=""/.test(TT.viewNotas()), true);
  ev(`__NUCLEO_TEST__.S.folder=null;__NUCLEO_TEST__.S.tab='hoje';`);
}


// --- Notas em cartões separados + voltar ao início ao sair (v42) ---
{
  const doc = w.document, clickAct = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  const q = (sel) => doc.querySelector(sel);
  const TT = w.__NUCLEO_TEST__;
  ev(`const S=__NUCLEO_TEST__.S;S.ready=true;S.tab='notas';S.q='';S.sheet=null;S.rview=null;S.rq='';S.rfromHoje=0;
    S.folders=[{id:'f1',name:'Documentos'},{id:'f2',name:'Vazia'}];S.lists=[];S.reminders=[];S.events=[];S.inbox=[];
    S.notes=[
      {id:'n1',title:'Nota comum',body:'texto',folder:'f1',checklist:[],files:[],images:[],createdAt:1},
      {id:'n2',title:'Documento escaneado',body:'',folder:'f1',kind:'scan',checklist:[],files:[],images:[],createdAt:2},
      {id:'n3',title:'Compras',body:'',folder:'f1',checklist:[{t:'pão',done:false}],files:[],images:[],createdAt:3},
      {id:'n4',title:'Rabisco',body:'',folder:'f1',kind:'desenho',checklist:[],files:[],images:[],createdAt:4}];`);
  ev(`__NUCLEO_TEST__.S.folder='f1';`);
  const pasta = TT.viewNotas();
  t('notas: dentro da pasta, cada nota é um cartão separado', (pasta.match(/class="li note/g) || []).length === 4 && /class="notes-cards"/.test(pasta), true);
  t('notas: cartões com cor por tipo (scan, desenho, lista)', /li note k-scan/.test(pasta) && /li note k-draw/.test(pasta) && /li note k-list/.test(pasta), true);
  t('notas: a lista de notas não usa mais o bloco colado (group)', !/<div class="group"><div class="li note/.test(pasta), true);
  t('notas: CSS dos cartões tem espaço, borda colorida e letra maior só neles', /\.notes-cards\{display:flex;flex-direction:column;gap:\.75rem\}/.test(html) && /border-left:7px solid var\(--accent\)/.test(html) && /\.notes-cards \.li\.note \.li-t\{font-size:1\.15rem/.test(html) && /\.notes-cards \.li\.note \.li-s\{font-size:\.95rem/.test(html), true);
  t('notas: a letra do resto do app não mudou (.li-t 1rem, .li-s .8rem)', /\n\.li-t\{font-size:1rem;font-weight:500/.test(html) && /\n\.li-s\{font-size:\.8rem/.test(html), true);
  ev(`__NUCLEO_TEST__.S.folder='f2';`);
  t('notas: pasta vazia continua mostrando o aviso', /Pasta vazia\./.test(TT.viewNotas()) && !/notes-cards/.test(TT.viewNotas()), true);
  ev(`__NUCLEO_TEST__.S.folder=null;__NUCLEO_TEST__.S.nsOpen=true;__NUCLEO_TEST__.S.q='compras';`);
  t('notas: resultados da busca também em cartões', /notes-cards/.test(ev('__NUCLEO_TEST__.viewNotas()')) && /Compras/.test(ev('__NUCLEO_TEST__.viewNotas()')), true);

  // sair de Notas volta para a página inicial de Notas
  ev(`__NUCLEO_TEST__.S.q='';__NUCLEO_TEST__.S.tab='notas';__NUCLEO_TEST__.S.folder='f1';`);
  clickAct(q('#tab-lembretes'));
  t('sair de Notas: a pasta aberta volta para o início', ev('__NUCLEO_TEST__.S.tab') === 'lembretes' && ev('__NUCLEO_TEST__.S.folder') === null, true);
  clickAct(q('#tab-notas'));
  t('voltar para Notas: abre a página inicial (pastas)', ev('__NUCLEO_TEST__.S.folder') === null && !!q('#main #notesFolders'), true);
  // sair de Lembretes volta para a página inicial de Lembretes
  clickAct(q('#tab-lembretes'));
  ev(`__NUCLEO_TEST__.S.rview='s:late';__NUCLEO_TEST__.S.rq='abc';__NUCLEO_TEST__.S.rfromPlan=1;`);
  clickAct(q('#tab-notas'));
  t('sair de Lembretes: a página aberta volta para o início', ev('__NUCLEO_TEST__.S.rview') === null && ev('__NUCLEO_TEST__.S.rq') === '' && ev('__NUCLEO_TEST__.S.rfromPlan') === 0, true);
  // dentro de uma pasta E de uma nota aberta, trocar de aba ainda volta ao início
  ev(`__NUCLEO_TEST__.S.tab='notas';__NUCLEO_TEST__.S.folder='f1';`);
  clickAct(q('#tab-hoje'));
  t('sair de Notas para Hoje também volta ao início', ev('__NUCLEO_TEST__.S.folder') === null && ev('__NUCLEO_TEST__.S.tab') === 'hoje', true);
  // tocar de novo na aba em que já está também volta ao início (como antes)
  ev(`__NUCLEO_TEST__.S.tab='notas';__NUCLEO_TEST__.S.folder='f1';`);
  clickAct(q('#tab-notas'));
  t('tocar na aba Notas estando numa pasta volta ao início', ev('__NUCLEO_TEST__.S.folder') === null && ev('__NUCLEO_TEST__.S.tab') === 'notas', true);
  ev(`__NUCLEO_TEST__.S.tab='hoje';__NUCLEO_TEST__.S.folder=null;__NUCLEO_TEST__.S.rview=null;`);
}

{
  const TT = w.__NUCLEO_TEST__;
  ev(`const S=__NUCLEO_TEST__.S;S.ready=true;S.tab='notas';S.folder=null;S.q='';S.folders=[];S.notes=[];S.reminders=[];S.events=[];S.inbox=[];S.lists=[];`);
  const v = TT.viewNotas();
  t('notas: sem pasta Documentos, a tela inicial não oferece criar', !/Pasta Documentos/.test(v) && !/Criar a pasta/.test(v) && /Nova pasta/.test(v), true);
  ev(`__NUCLEO_TEST__.S.tab='hoje';`);
}
{
  const doc = w.document;
  ev(`const S=__NUCLEO_TEST__.S;S.ready=true;S.tab='lembretes';S.inbox=[{id:'i1',text:'a',createdAt:1},{id:'i2',text:'b',createdAt:2}];S.reminders=[];S.notes=[];S.events=[];S.folders=[];S.lists=[];`);
  doc.getElementById('tab-hoje').click();
  t('barra de baixo: botão Hoje sem contador mesmo com itens na caixa', !doc.querySelector('#tab-hoje .tab-badge') && !doc.querySelector('.tab-badge'), true);
  t('barra de baixo: botão Hoje continua com ícone e nome', /Hoje/.test(doc.getElementById('tab-hoje').textContent) && !!doc.querySelector('#tab-hoje svg'), true);
  ev(`__NUCLEO_TEST__.S.tab='hoje';__NUCLEO_TEST__.S.inbox=[];`);
}

// --- Pasta em árvore: notas primeiro, subpastas que abrem/recolhem, Nova subpasta e Buscar no topo (v45) ---
{
  const doc = w.document, clickAct = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  const q = (sel) => doc.querySelector(sel);
  const TT = w.__NUCLEO_TEST__;
  ev(`const S=__NUCLEO_TEST__.S;S.ready=true;S.tab='notas';S.folder='f1';S.q='';S.sheet=null;S.nsOpen=false;S.nx={};S.nn={};
    S.folders=[{id:'f1',name:'Elisa'},{id:'f2',name:'Documentos',parent:'f1'},{id:'f3',name:'Fotos',parent:'f1'},{id:'f4',name:'RG',parent:'f2'},{id:'f5',name:'Outra pasta'}];
    S.notes=[
      {id:'n1',title:'Nota da Elisa',body:'',folder:'f1',checklist:[],files:[],images:[],createdAt:1},
      {id:'n2',title:'CNH da Elisa',body:'validade 2031',folder:'f2',checklist:[],files:[],images:[],createdAt:2},
      {id:'n3',title:'RG frente',body:'',folder:'f4',checklist:[],files:[],images:[],createdAt:3},
      {id:'n4',title:'CNH fora da Elisa',body:'',folder:'f5',checklist:[],files:[],images:[],createdAt:4}];
    S.reminders=[];S.events=[];S.inbox=[];S.lists=[];`);
  ev(`__NUCLEO_TEST__.S.folder='f1';`);
  const pg = TT.viewNotas();
  t('pasta: primeiro as notas da pasta, depois as subpastas', pg.indexOf('Nota da Elisa') > 0 && pg.indexOf('Nota da Elisa') < pg.indexOf('Subpastas'), true);
  t('pasta: sem o botão "Nova subpasta" dentro da lista e sem barra de busca fixa', !/txtbtn[^>]*new-folder/.test(pg) && !/Nova subpasta<\/button>/.test(pg) && !/id="q"/.test(pg), true);
  t('pasta: botões Nova subpasta e Buscar no topo, ao lado dos outros', (() => { const a = pg.indexOf('data-act="draw-new"'), b = pg.indexOf('data-act="new-folder" data-parent="f1"'), c = pg.indexOf('data-act="ns-toggle"'), d = pg.indexOf('data-act="edit-folder"'); return a > 0 && a < b && b < c && c < d; })(), true);
  t('pasta: botões novos têm nome para leitura', /aria-label="Nova subpasta"/.test(pg) && /aria-label="Buscar nas notas"/.test(pg), true);
  t('pasta: cada subpasta mostra quantas notas tem dentro (inclui as de dentro dela)', /Documentos<\/div>[^]*?aria-label="2 notas">2</.test(pg) && /Fotos<\/div>[^]*?aria-label="0 notas">0</.test(pg), true);
  t('pasta: subpastas começam recolhidas', !/class="sub-body"/.test(pg), true);

  // abrir/recolher uma subpasta com a setinha (desenha a pasta de verdade no #main)
  ev(`const S=__NUCLEO_TEST__.S;S.tab='lembretes';S.folder='f1';S.nx={};S.nn={};S.nsOpen=false;S.q='';`);
  clickAct(q('#tab-notas'));
  t('pasta aparece na tela depois de entrar em Notas', !!q('#main [data-act="nx-sub"][data-id="f2"]'), true);
  clickAct(q('#main [data-act="nx-sub"][data-id="f2"]'));
  const aberta = q('#main').innerHTML;
  t('setinha: abre a subpasta e mostra as notas dela e as subpastas de dentro', /CNH da Elisa/.test(aberta) && /class="sub-body"/.test(aberta) && /data-act="nx-sub" data-id="f4"/.test(aberta) && /aria-expanded="true"/.test(aberta), true);
  clickAct(q('#main [data-act="nx-sub"][data-id="f4"]'));
  t('setinha: abre também a sub-subpasta ("assim sucessivamente")', /RG frente/.test(q('#main').innerHTML), true);
  clickAct(q('#main [data-act="nx-sub"][data-id="f2"]'));
  t('setinha: recolhe a subpasta de novo', !/CNH da Elisa/.test(q('#main').innerHTML), true);
  // recolher as notas da pasta e ficar só com as subpastas
  clickAct(q('#main [data-act="nx-notes"][data-id="f1"]'));
  const so = q('#main').innerHTML;
  t('recolher notas: some a lista de notas e ficam só as subpastas', !/Nota da Elisa/.test(so) && /Subpastas/.test(so) && /data-act="nx-sub" data-id="f2"/.test(so), true);
  clickAct(q('#main [data-act="nx-notes"][data-id="f1"]'));
  t('recolher notas: abre de novo', /Nota da Elisa/.test(q('#main').innerHTML), true);
  t('tocar no nome da subpasta abre a pasta', /data-act="open-folder" data-id="f2"/.test(q('#main').innerHTML), true);

  // buscar: botão do topo abre o campo; procura só dentro da pasta e das subpastas
  clickAct(q('#main [data-act="ns-toggle"]'));
  t('buscar: o botão abre o campo de busca', !!q('#q') && ev('__NUCLEO_TEST__.S.nsOpen') === true, true);
  t('buscar: campo diz onde procura', /placeholder="Buscar em Elisa"/.test(q('#main').innerHTML), true);
  const inp = q('#q'); inp.value = 'cnh'; inp.dispatchEvent(new w.Event('input', { bubbles: true }));
  const rb = q('#notesBody').innerHTML;
  t('buscar: acha dentro da pasta e das subpastas, e não acha fora dela', /CNH da Elisa/.test(rb) && !/CNH fora da Elisa/.test(rb), true);
  t('buscar: campo continua o mesmo (teclado não fecha)', q('#q') === inp, true);
  clickAct(q('#main [data-act="ns-toggle"]'));
  t('buscar: fechar limpa a busca e some o campo', !q('#q') && ev('__NUCLEO_TEST__.S.q') === '' && ev('__NUCLEO_TEST__.S.nsOpen') === false, true);

  // ao sair de Notas, tudo volta ao início (inclui setinhas e busca)
  ev(`const S=__NUCLEO_TEST__.S;S.nx={f2:1};S.nn={f1:1};S.nsOpen=true;S.q='x';S.folder='f1';`);
  clickAct(q('#tab-hoje'));
  t('sair de Notas: fecha busca, recolhe setinhas e volta ao início', ev('__NUCLEO_TEST__.S.nsOpen') === false && ev('JSON.stringify(__NUCLEO_TEST__.S.nx)') === '{}' && ev('JSON.stringify(__NUCLEO_TEST__.S.nn)') === '{}' && ev('__NUCLEO_TEST__.S.folder') === null, true);

  // início de Notas: botão Buscar no topo, sem barra fixa
  ev(`__NUCLEO_TEST__.S.tab='notas';__NUCLEO_TEST__.S.folder=null;`);
  const raiz2 = TT.viewNotas();
  t('início de Notas: Buscar virou botão no topo e a barra fixa saiu', /data-act="ns-toggle"/.test(raiz2) && !/id="q"/.test(raiz2), true);
  ev(`__NUCLEO_TEST__.S.tab='hoje';__NUCLEO_TEST__.S.folder=null;__NUCLEO_TEST__.S.nsOpen=false;`);
}


// --- contagens em bolinha neon: Planner e Notas (v46); a tela Hoje não muda ---
{
  const TT = w.__NUCLEO_TEST__, today = ev(`isoDate(new Date())`);
  ev(`const S=__NUCLEO_TEST__.S;S.ready=true;S.tab='notas';S.folder=null;S.q='';S.nsOpen=false;S.nx={};S.nn={};S.sheet=null;
    S.folders=[{id:'f1',name:'Elisa'},{id:'f2',name:'Documentos',parent:'f1'},{id:'f3',name:'Fotos',parent:'f1'}];
    S.notes=[{id:'n1',title:'A',body:'#saude',folder:'f1',checklist:[],files:[],images:[],createdAt:1},{id:'n2',title:'B',body:'',folder:'f2',checklist:[],files:[],images:[],createdAt:2}];
    S.reminders=[{id:'r1',title:'Hoje coisa',notes:'',date:'${today}',time:'',done:false,list:'',subtasks:[],files:[]}];
    S.events=[];S.inbox=[];S.lists=[];`);
  t('neon: estilo da bolinha existe (cheia, pequena e só contorno para zero)', /\.cnt\{[^}]*#39FF14/.test(html) && /\.cnt\.sm\{/.test(html) && /\.cnt\.zero\{/.test(html), true);
  // Planner
  const pl = TT.planView();
  t('planner: página abre sem erro', !/Não consegui montar o planner/.test(pl), true);
  t('planner: números na frente dos dias estão em bolinha neon', (pl.match(/class="cnt/g) || []).length >= 5 && !/class="li-n num"/.test(pl), true);
  t('planner: o dia de hoje mostra 1 em bolinha cheia e dia vazio mostra 0 só com contorno', /class="cnt num">1</.test(pl) && /class="cnt zero num">0</.test(pl), true);
  const pb = TT.planBtn(TT.smart(), today);
  t('planner: botão tem "Hoje N" em bolinha e os dias com itens em verde neon', /pb-hoje">Hoje <span class="cnt sm num">1</.test(pb) && /\.pb-d\.has b\{background:#39FF14/.test(html), true);
  // Notas: início
  ev(`__NUCLEO_TEST__.S.folder=null;`);
  const raiz = TT.viewNotas();
  t('notas início: contagens de pastas, tipos e apagados em bolinha neon', (raiz.match(/class="cnt/g) || []).length >= 8 && !/class="li-n num"/.test(raiz), true);
  t('notas início: etiqueta com a contagem em bolinha pequena', /#saude <span class="cnt sm num">1</.test(raiz), true);
  // Notas: dentro da pasta
  ev(`__NUCLEO_TEST__.S.folder='f1';`);
  const pasta = TT.viewNotas();
  t('pasta: cabeçalhos Notas e Subpastas com a contagem em bolinha', /Notas <span class="cnt sm num">1</.test(pasta) && /Subpastas <span class="cnt sm num">2</.test(pasta), true);
  t('pasta: cada subpasta com a contagem em bolinha (e 0 só com contorno)', /Documentos<\/div>[^]*?class="cnt num" aria-label="1 nota">1</.test(pasta) && /class="cnt zero num" aria-label="0 notas">0</.test(pasta), true);
  t('pasta: sobrou nenhum número de contagem sem bolinha nas notas', !/class="li-n num"/.test(pasta) && !/class="pill"/.test(pasta), true);
  // Hoje: sem mudança
  ev(`__NUCLEO_TEST__.S.tab='hoje';__NUCLEO_TEST__.S.folder=null;`);
  const hoje = TT.viewHoje();
  t('hoje: continua igual (sem bolinhas neon, números dos botões como antes)', !/class="cnt/.test(hoje) && /class="tile-n num"/.test(hoje), true);
}


// --- página de lista em Lembretes: seções no começo e recolhíveis, botões no topo, número da bolinha preto (v47) ---
{
  const doc = w.document, clickAct = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  const q = (sel) => doc.querySelector(sel);
  const TT = w.__NUCLEO_TEST__;
  ev(`const S=__NUCLEO_TEST__.S;S.ready=true;S.tab='hoje';S.sheet=null;S.lc={};S.rq='';S.rfromHoje=0;S.rfromPlan=0;
    S.lists=[{id:'l1',name:'Contas e dinheiro',color:'#B5584E',sections:[{id:'s1',t:'Atrasadas',done:false},{id:'s2',t:'Do mês',done:false}]}];
    S.reminders=[
      {id:'r1',title:'Pagar o MEI',notes:'',date:'',time:'',done:false,list:'l1',section:'s1',subtasks:[],files:[]},
      {id:'r2',title:'Boleto atrasado',notes:'',date:'',time:'',done:false,list:'l1',section:'s1',subtasks:[],files:[]},
      {id:'r3',title:'Sem seção aqui',notes:'',date:'',time:'',done:false,list:'l1',subtasks:[],files:[]},
      {id:'r4',title:'Conta de luz paga',notes:'',date:'',time:'',done:true,list:'l1',section:'s2',subtasks:[],files:[]}];
    S.events=[];S.notes=[];S.folders=[];S.inbox=[];S.rview='l:l1';`);
  try { w.localStorage.removeItem('nucleo-hidedone'); } catch (e) {}
  const pg = TT.viewLembretes();
  const iA = pg.indexOf('Atrasadas'), iM = pg.indexOf('Do mês'), iSS = pg.indexOf('Sem seção'), iC = pg.indexOf('Concluídos'), iT = pg.indexOf('class="notes-tools"');
  t('lista: botões no topo e depois as seções, na ordem (Atrasadas, Do mês, Sem seção, Concluídos)', iT > 0 && iT < iA && iA < iM && iM < iSS && iSS < iC, true);
  t('lista: Novo lembrete, Ocultar concluídos e editar são botões no topo com nome', /data-act="new-rem" data-list="l1" aria-label="Novo lembrete"/.test(pg) && /data-act="toggle-done-list" data-id="l1"[^>]*aria-label="Ocultar concluídos \(1\)"/.test(pg) && /data-act="edit-list" data-id="l1"/.test(pg), true);
  t('lista: saíram a faixa de Ocultar concluídos e as linhas "Novo lembrete" de dentro', !/class="actbar" style="margin-top:\.8rem"/.test(pg) && !/Novo lembrete aqui/.test(pg) && !/class="sec-lh"/.test(pg), true);
  t('lista: cada seção tem setinha e a contagem na bolinha', /data-act="lc-toggle" data-id="l1:s1"/.test(pg) && /Atrasadas <span class="cnt sm num">2</.test(pg) && /Do mês <span class="cnt sm zero num">0</.test(pg), true);
  t('bolinha neon: número PRETO em todas (cheia, planner e cabeçalho de seção)', /\.cnt\{[^}]*background:#39FF14;color:#000;/.test(html) && /\.pb-d\.has b\{[^}]*color:#000/.test(html) && /\.sec-h \.cnt\{color:#000\}/.test(html) && !/\.sec-lh \.cnt/.test(html) && !/#04230A/.test(html), true);
  // fluxo: recolher e abrir uma seção; ocultar concluídos
  ev(`__NUCLEO_TEST__.S.tab='hoje';__NUCLEO_TEST__.S.rview='l:l1';`);
  clickAct(q('#tab-lembretes'));
  t('fluxo lista: entra na página da lista', !!q('#main [data-act="lc-toggle"][data-id="l1:s1"]') && /Pagar o MEI/.test(q('#main').innerHTML), true);
  clickAct(q('#main [data-act="lc-toggle"][data-id="l1:s1"]'));
  const rec = q('#main').innerHTML;
  t('fluxo lista: recolher esconde os lembretes da seção e mantém o título e a contagem', !/Pagar o MEI/.test(rec) && /Atrasadas/.test(rec) && /aria-expanded="false"/.test(rec) && /Sem seção aqui/.test(rec), true);
  clickAct(q('#main [data-act="lc-toggle"][data-id="l1:s1"]'));
  t('fluxo lista: abrir de novo mostra os lembretes', /Pagar o MEI/.test(q('#main').innerHTML), true);
  clickAct(q('#main [data-act="toggle-done-list"]'));
  const oc = q('#main').innerHTML;
  t('fluxo lista: ocultar concluídos tira a seção Concluídos e o botão avisa (pressionado)', !/Conta de luz paga/.test(oc) && !/>Concluídos </.test(oc) && /aria-pressed="true"[^>]*aria-label="Mostrar concluídos \(1\)"/.test(oc), true);
  clickAct(q('#main [data-act="toggle-done-list"]'));
  t('fluxo lista: mostrar concluídos traz de volta', /Conta de luz paga/.test(q('#main').innerHTML), true);
  // sair de Lembretes zera as setinhas
  clickAct(q('#main [data-act="lc-toggle"][data-id="l1:s2"]'));
  t('lista: estado das setinhas guardado enquanto está em Lembretes', ev('__NUCLEO_TEST__.S.lc["l1:s2"]') === 1 && ev('!!__NUCLEO_TEST__.S.lc["l1:s1"]') === false, true);
  clickAct(q('#tab-hoje'));
  t('sair de Lembretes: setinhas voltam todas abertas e a lista volta ao início', ev('JSON.stringify(__NUCLEO_TEST__.S.lc)') === '{}' && ev('__NUCLEO_TEST__.S.rview') === null, true);
  // lista sem seções continua simples, com botão para criar seções
  ev(`const S=__NUCLEO_TEST__.S;S.lists=[{id:'l2',name:'Quando der',color:'#8A8A8E',sections:[]}];S.reminders=[{id:'x1',title:'Algo solto',notes:'',date:'',time:'',done:false,list:'l2',subtasks:[],files:[]}];S.rview='l:l2';S.tab='lembretes';`);
  const sem = TT.viewLembretes();
  t('lista sem seções: mostra os lembretes direto e o botão Criar seções', /Algo solto/.test(sem) && /Criar seções nesta lista/.test(sem) && !/lc-toggle/.test(sem), true);
  ev(`__NUCLEO_TEST__.S.tab='hoje';__NUCLEO_TEST__.S.rview=null;__NUCLEO_TEST__.S.lc={};`);
}


// --- Mover lembrete de lista e nota de pasta; cores vivas das listas (v48) ---
global.__pend = global.__pend || [];
global.__pend.push((async () => {
  const doc = w.document, clickAct = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  const q = (sel) => doc.querySelector(sel), wait = (ms) => new Promise(r => setTimeout(r, ms));
  const TT = w.__NUCLEO_TEST__, SS = 'JSON.stringify';
  // cores vivas
  ev(`const S=__NUCLEO_TEST__.S;S.ready=true;S.tab='hoje';S.sheet=null;S.rview=null;S.conf='del';
    S.lists=[{id:'la',name:'Contas e dinheiro',color:'#B5584E',sections:[{id:'sa',t:'Atrasadas',done:false}]},{id:'lb',name:'Casa',color:'#5E8F6B',sections:[]},{id:'lc',name:'Amarela',color:'#C9961A',sections:[]},{id:'ld',name:'Azul',color:'#4F8DA3',sections:[]}];
    S.reminders=[{id:'r1',title:'Trocar a lâmpada',notes:'',date:'',time:'',done:false,list:'lb',subtasks:[],files:[]}];
    S.folders=[{id:'f1',name:'Elisa'},{id:'f2',name:'Documentos',parent:'f1'}];
    S.notes=[{id:'n1',title:'CNH da Elisa',body:'',folder:'f1',checklist:[],files:[],images:[],createdAt:1}];
    S.events=[];S.inbox=[];
    S.raw={reminders:S.reminders.slice(),lists:S.lists.slice(),notes:S.notes.slice(),folders:S.folders.slice(),events:[],inbox:[]};`);
  const home = TT.viewLembretes();
  t('cores: as listas guardadas com cor apagada aparecem com a cor viva', /background:#FF3B30/.test(home) && /background:#1FC95B/.test(home) && /background:#FFB300/.test(home) && /background:#2F8CFF/.test(home) && !/background:#B5584E/.test(home) && !/background:#5E8F6B/.test(home), true);
  t('cores: cor clara leva ícone escuro e cor escura leva ícone branco', /background:#FFB300;color:#111/.test(home) && /background:#2F8CFF;color:#fff/.test(home), true);
  t('cores: paleta nova no código e antigas só como tradução', /const LCOL=\['#FFB300','#FF3B30','#FF7A00','#1FC95B','#A855F7','#2F8CFF','#98A2B3','#FF2D87'\]/.test(html) && /const MIDL=\['#C9961A'/.test(html), true);

  // abrir o lembrete (tela de leitura) pela lista Casa
  ev(`__NUCLEO_TEST__.S.tab='hoje';__NUCLEO_TEST__.S.rview='l:lb';`);
  clickAct(q('#tab-lembretes'));
  clickAct(q('#main [data-act="open-rem"][data-id="r1"]'));
  t('mover lembrete: a tela de leitura tem o botão Mover para outra lista', !!q('#sheetRoot [data-act="move-open"]') && /Mover para outra lista/.test(q('#sheetRoot').innerHTML), true);
  clickAct(q('#sheetRoot [data-act="move-open"]')); await wait(30);
  const mv = q('#mvRoot');
  t('mover lembrete: abre a escolha com listas, seção e a atual marcada', !!mv && mv.querySelectorAll('.mv-opt').length === 6 && /Contas e dinheiro/.test(mv.innerHTML) && /mv-opt sub/.test(mv.innerHTML) && /aria-current="true"[^>]*>(?:<span class="mv-dot"[^>]*><\/span>)?<span class="mv-t">Casa<\/span><span class="mv-now">agora<\/span>/.test(mv.innerHTML), true);
  // cancelar não muda nada
  clickAct(mv.querySelector('[data-mv="-1"]')); await wait(30);
  t('mover lembrete: Cancelar fecha e não muda nada', !q('#mvRoot') && ev(`__NUCLEO_TEST__.S.reminders[0].list`) === 'lb', true);
  // mover para a seção Atrasadas (sem confirmação: S.conf='del')
  clickAct(q('#sheetRoot [data-act="move-open"]')); await wait(30);
  const optSec = Array.from(q('#mvRoot').querySelectorAll('.mv-opt')).find(b => /Atrasadas/.test(b.textContent));
  clickAct(optSec); await wait(80);
  t('mover lembrete: foi para a lista e a seção escolhidas', ev(`__NUCLEO_TEST__.S.reminders[0].list`) === 'la' && ev(`__NUCLEO_TEST__.S.reminders[0].section`) === 'sa', true);
  t('mover lembrete: a tela de leitura mostra a lista nova', /Contas e dinheiro › Atrasadas/.test(q('#sheetRoot').innerHTML), true);
  // com confirmação ligada, pergunta antes
  ev(`__NUCLEO_TEST__.S.conf='all';`);
  clickAct(q('#sheetRoot [data-act="move-open"]')); await wait(30);
  const optCasa = Array.from(q('#mvRoot').querySelectorAll('.mv-opt')).find(b => /Casa/.test(b.textContent));
  clickAct(optCasa); await wait(60);
  const ak = q('#askRoot');
  t('mover lembrete: com confirmação ligada pergunta antes de mover', !!ak && /Mover para “Casa”\?/.test(ak.textContent) && ev(`__NUCLEO_TEST__.S.reminders[0].list`) === 'la', true);
  await wait(600);
  clickAct(q('#askRoot [data-ask="1"]')); await wait(80);
  t('mover lembrete: depois de confirmar, foi mesmo para Casa e a seção zerou', ev(`__NUCLEO_TEST__.S.reminders[0].list`) === 'lb' && !ev(`__NUCLEO_TEST__.S.reminders[0].section`), true);
  // escolher a lista em que já está não faz nada
  clickAct(q('#sheetRoot [data-act="move-open"]')); await wait(30);
  const optAgora = Array.from(q('#mvRoot').querySelectorAll('.mv-opt')).find(b => /agora/.test(b.textContent));
  clickAct(optAgora); await wait(60);
  t('mover lembrete: escolher onde já está não pergunta nem muda', !q('#askRoot') && ev(`__NUCLEO_TEST__.S.reminders[0].list`) === 'lb', true);

  // nota: mover para outra pasta
  ev(`const S=__NUCLEO_TEST__.S;S.conf='del';S.sheet=null;S.tab='lembretes';S.rview=null;S.folder='f1';`);
  clickAct(q('#tab-notas'));
  clickAct(q('#main [data-act="open-note"][data-id="n1"]'));
  t('mover nota: a tela de leitura tem o botão Mover para outra pasta', !!q('#sheetRoot [data-act="move-open"]') && /Mover para outra pasta/.test(q('#sheetRoot').innerHTML), true);
  clickAct(q('#sheetRoot [data-act="move-open"]')); await wait(30);
  const mn = q('#mvRoot');
  t('mover nota: escolha com Geral e as pastas em caminho, e a atual marcada', !!mn && /Geral \(sem pasta\)/.test(mn.innerHTML) && /Elisa › Documentos/.test(mn.innerHTML) && /<span class="mv-t">Elisa<\/span><span class="mv-now">agora<\/span>/.test(mn.innerHTML), true);
  clickAct(Array.from(mn.querySelectorAll('.mv-opt')).find(b => /Elisa › Documentos/.test(b.textContent))); await wait(80);
  t('mover nota: foi para a pasta escolhida e a leitura mostra o caminho novo', ev(`__NUCLEO_TEST__.S.notes[0].folder`) === 'f2' && /Elisa › Documentos/.test(q('#sheetRoot').innerHTML), true);
  clickAct(q('#sheetRoot [data-act="move-open"]')); await wait(30);
  clickAct(Array.from(q('#mvRoot').querySelectorAll('.mv-opt')).find(b => /Geral/.test(b.textContent))); await wait(80);
  t('mover nota: também dá para tirar da pasta (Geral)', !ev(`__NUCLEO_TEST__.S.notes[0].folder`), true);
  ev(`const S=__NUCLEO_TEST__.S;S.sheet=null;S.tab='hoje';S.folder=null;S.rview=null;S.conf='all';`);
})());



// --- Scanner de documentos: o motor (achar o papel, endireitar, melhorar, PDF) com imagens sintéticas (v54) ---
{
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  const quad = ev(`(function(){const w=120,h=160,g=new Uint8Array(w*h).fill(30);
    const Q=[[25,20],[100,30],[95,140],[15,130]];
    function inside(x,y){let c=false;for(let i=0,j=3;i<4;j=i++){const xi=Q[i][0],yi=Q[i][1],xj=Q[j][0],yj=Q[j][1];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c;}return c;}
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(inside(x,y))g[y*w+x]=230;
    const q=docDetect(g,w,h);return q?q.map(p=>[Math.round(p.x*w),Math.round(p.y*h)]):null;})()`);
  const want = [[25, 20], [100, 30], [95, 140], [15, 130]];
  t('scanner: acha os 4 cantos de um papel claro inclinado sobre fundo escuro (erro até 4 px)', !!quad && quad.every((p, i) => near(p[0], want[i][0], 4) && near(p[1], want[i][1], 4)), true);
  t('scanner: imagem sem papel (tudo igual) não inventa cantos', ev(`docDetect(new Uint8Array(100*100).fill(128),100,100)`), null);
  const idn = ev(`(function(){const sw=100,sh=100,src=new Uint8ClampedArray(sw*sh*4);for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const i=(y*sw+x)*4;src[i]=x*2;src[i+1]=y*2;src[i+2]=50;src[i+3]=255;}
    const o=docWarp(src,sw,sh,[{x:10,y:10},{x:60,y:10},{x:60,y:60},{x:10,y:60}],50,50);const at=(u,v)=>[o[(v*50+u)*4],o[(v*50+u)*4+1]];return [at(0,0),at(25,25),at(49,49)];})()`);
  t('scanner: recortar um quadrado da foto devolve os pontos certos (cantos e meio)', near(idn[0][0], 20, 3) && near(idn[0][1], 20, 3) && near(idn[1][0], 70, 3) && near(idn[1][1], 70, 3) && near(idn[2][0], 118, 3) && near(idn[2][1], 118, 3), true);
  const rot = ev(`(function(){const sw=100,sh=100,src=new Uint8ClampedArray(sw*sh*4);for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const i=(y*sw+x)*4;src[i]=x*2;src[i+1]=y*2;src[i+2]=50;src[i+3]=255;}
    const o=docWarp(src,sw,sh,[{x:50,y:10},{x:90,y:50},{x:50,y:90},{x:10,y:50}],56,56);const at=(u,v)=>[o[(v*56+u)*4],o[(v*56+u)*4+1]];return [at(0,0),at(55,0),at(55,55)];})()`);
  t('scanner: endireita um papel girado 45° (os cantos da foto viram os cantos da página)', near(rot[0][0], 100, 5) && near(rot[0][1], 20, 5) && near(rot[1][0], 180, 5) && near(rot[1][1], 100, 5) && near(rot[2][0], 100, 5) && near(rot[2][1], 180, 5), true);
  const enh = ev(`(function(){const w=600,h=400,px=new Uint8ClampedArray(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=120+100*x/599;if(x>=100&&x<500&&y>=100&&y<300&&((y-100)%12)<3)v*=0.25;const i=(y*w+x)*4;px[i]=v;px[i+1]=v;px[i+2]=v*0.95;px[i+3]=255;}
    const r={};for(const m of ['doc','gray','color']){const o=docEnhance(px,w,h,m);const at=(x,y)=>o[(y*w+x)*4];r[m]={bgL:at(10,50),bgR:at(590,350),txt:at(300,101),a:o[3]};}return r;})()`);
  t('scanner: modo Documento tira a sombra (fundo esquerdo e direito viram branco) e mantém o texto preto', enh.doc.bgL >= 250 && enh.doc.bgR >= 250 && enh.doc.txt <= 30 && enh.doc.a === 255, true);
  t('scanner: modos Cinza e Colorido também clareiam o papel sem apagar o texto', enh.gray.bgL >= 240 && enh.gray.bgR >= 240 && enh.gray.txt <= 80 && enh.color.bgL >= 235 && enh.color.bgR >= 235 && enh.color.txt <= 100, true);
  const pdf = ev(`(function(){const j=(n)=>{const a=new Uint8Array(n);a[0]=0xFF;a[1]=0xD8;a[n-2]=0xFF;a[n-1]=0xD9;for(let i=2;i<n-2;i++)a[i]=(i*7)&255;return a;};
    const b=pdfFromJpegs([{jpeg:j(300),w:600,h:800},{jpeg:j(500),w:800,h:600}]);let s='';for(let i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return {len:b.length,txt:s};})()`);
  const txt = pdf.txt, sx = +txt.match(/startxref\n(\d+)\n%%EOF/)[1];
  const xr = txt.slice(sx).split('\n'), cnt = +xr[1].split(' ')[1];
  let okOff = txt.slice(sx, sx + 4) === 'xref';
  for (let id = 1; id < cnt; id++) { const off = +xr[2 + id].slice(0, 10); okOff = okOff && txt.slice(off, off + (id + ' 0 obj').length) === id + ' 0 obj'; }
  t('PDF: cabeçalho, fim, 2 páginas, tamanho de cada página pela proporção da foto', txt.startsWith('%PDF-1.4') && txt.trimEnd().endsWith('%%EOF') && /\/Count 2/.test(txt) && /MediaBox \[0 0 595 793\]/.test(txt) && /MediaBox \[0 0 595 446\]/.test(txt) && /\/Filter \/DCTDecode \/Length 300/.test(txt) && /\/Filter \/DCTDecode \/Length 500/.test(txt), true);
  t('PDF: a tabela de endereços (xref) aponta exatamente para cada objeto', okOff && cnt === 9, true);
}

// --- Enviar ao FIN: Voltar também no topo (v49) ---
t('Enviar ao FIN: tem botão Voltar no topo, além do de baixo', /id="finTop"/.test(html) && /querySelector\('#finTop'\)\.onclick/.test(html) && /id="finNo"/.test(html), true);

// --- Enviar ao FIN com fotos, escanear, arquivos e colar (v50) ---
const __prevP = Promise.all((global.__pend || []).slice());   /* espera os testes assíncronos anteriores (usam a mesma janela de confirmação) */
global.__pend.push((async () => {
  await __prevP;
  const doc = w.document, q = s => doc.querySelector(s), wait = ms => new Promise(r => setTimeout(r, ms)), TT = w.__NUCLEO_TEST__;
  const posts = [], ups = [];
  TT.Supa.sess = { access: 'a.b.c', refresh: 'r', exp: Date.now() + 3600000 };
  TT.Supa.rest = async (path, opt) => { posts.push({ path, body: JSON.parse(opt.body) }); return { ok: true, status: 201 }; };
  TT.SupaAssets.upload = async (blob, o) => { ups.push(o); return { id: 'uid/' + ups.length + '.pdf' }; };
  TT.finSend();
  t('Enviar ao FIN: Voltar e Enviar no topo (aparecem mesmo com o teclado aberto)', !!q('#finSend #finTop') && !!q('#finSend #finGoTop') && q('#finSend').firstElementChild.contains(q('#finGoTop')), true);
  t('Enviar ao FIN: botões Tirar foto, Fotos, Escanear documento e Arquivo', !!q('#finCam') && !!q('#finLib') && !!q('#finDoc') && !!q('#finScan') && /Tirar foto/.test(q('#finCam').textContent) && /Escanear documento/.test(q('#finScan').textContent) && /Arquivo/.test(q('#finDoc').textContent), true);
  t('Enviar ao FIN: Escanear usa a câmera traseira e Fotos aceita várias imagens', q('#finFcam').getAttribute('capture') === 'environment' && q('#finFcam').accept === 'image/*' && q('#finFlib').multiple === true, true);
  t('Enviar ao FIN: avisa que o FIN não lê a foto sozinho', /não lê a foto sozinho/.test(q('#finSend').textContent), true);
  const f = new w.File(['conteudo'], 'boleto.pdf', { type: 'application/pdf' });
  const pe = new w.Event('paste', { bubbles: true, cancelable: true }); pe.clipboardData = { files: [f] };
  q('#finTx').dispatchEvent(pe);
  t('colar um arquivo no campo: ele entra na lista de anexos', /Anexos \(1\)/.test(q('#finFiles').textContent) && /boleto\.pdf/.test(q('#finFiles').textContent) && pe.defaultPrevented === true, true);
  q('#finFiles [data-rmf="0"]').click();
  t('anexo: o ✕ tira da lista', q('#finFiles').textContent.trim() === '', true);
  q('#finTx').dispatchEvent(Object.assign(new w.Event('paste', { bubbles: true, cancelable: true }), { clipboardData: { files: [f] } }));
  q('#finTx').value = 'Conta de luz vence dia 10';
  q('#finGoTop').click(); await wait(40);
  t('enviar: pede confirmação com o resumo (texto e arquivo)', /Enviar 2 itens ao FIN\?/.test(doc.body.textContent) && /boleto\.pdf/.test(doc.querySelector('#askRoot').textContent), true);
  await wait(600);
  doc.querySelector('#askRoot [data-ask="1"]').click(); await wait(120);
  t('enviar: 2 pendentes, um do texto e outro do arquivo com o anexo', posts.length === 2 && posts[0].body.data.text === 'Conta de luz vence dia 10' && posts[1].body.data.text === '📎 boleto.pdf' && posts[1].body.data.files[0].id === 'uid/1.pdf' && posts[1].body.data.files[0].name === 'boleto.pdf' && posts[1].body.data.files[0].type === 'application/pdf', true);
  t('enviar: os dois pendentes saem como "pendente" do Núcleo e a janela fecha', posts.every(p => p.path === 'fin_records' && p.body.kind === 'proposal' && p.body.data.status === 'pendente' && p.body.data.source === 'nucleo') && !q('#finSend'), true);
  // sem nada para enviar
  TT.finSend(); q('#finGo').click(); await wait(30);
  t('enviar sem texto e sem arquivo: avisa em vez de enviar', /Escreva uma linha ou anexe um arquivo/.test(q('#finErr').textContent) && posts.length === 2, true);
  // erro do servidor: o texto continua no campo
  TT.Supa.rest = async () => ({ ok: false, status: 404 });
  q('#finTx').value = 'Dívida Itaú 16000'; q('#finGo').click(); await wait(40); await wait(600);
  doc.querySelector('#askRoot [data-ask="1"]').click(); await wait(100);
  t('erro ao enviar: mostra o motivo, mantém o texto e não fecha', /O FIN ainda não foi preparado no banco/.test(q('#finErr').textContent) && q('#finTx').value === 'Dívida Itaú 16000' && !!q('#finSend'), true);
  q('#finTop').click();
  t('Voltar do topo fecha a tela', !q('#finSend'), true);
})());

// --- A cada 30 dias e repetir no máximo N vezes (v51) ---
t('repetição: opção direta "A cada 30 dias" na lista e no motor', ev(`JSON.stringify(repSpec({repeat:'days30'}))`) === JSON.stringify({ n: 30, u: 'day', days: [] }) && /\['days30','A cada 30 dias'\]/.test(html), true);
t('repetição: a cada 30 dias soma 30 dias (16/jan → 15/fev), não "mesmo dia do mês"', ev(`repNext({date:'2030-01-16',time:'09:00',repeat:'days30'},new Date('2030-01-16T10:00:00')).date`), '2030-02-15');
t('repetição: o rótulo mostra "3ª de 12" quando há limite de vezes', ev(`repLabel({repeat:'monthly',repTimes:12,repDone:2})`) === 'Todo mês · 3ª de 12' && ev(`repLabel({repeat:'days30',repTimes:'12'})`) === 'A cada 30 dias · 1ª de 12', true);
t('repetição: sem limite o rótulo continua igual', ev(`repLabel({repeat:'monthly'})`), 'Todo mês');
t('formulário do lembrete: campo "Repetir no máximo (vezes)", só para lembrete (compromisso não)', /id="f-times"/.test(html) && /if\(!isEv\)h\+='<div><label class="lbl" for="f-times"/.test(html), true);
const __prevP2 = Promise.all((global.__pend || []).slice());
global.__pend.push((async () => {
  await __prevP2;
  const doc = w.document, q = s => doc.querySelector(s), wait = ms => new Promise(r => setTimeout(r, ms)), TT = w.__NUCLEO_TEST__;
  ev(`const S=__NUCLEO_TEST__.S;S.ready=true;S.tab='hoje';S.sheet=null;S.conf='del';S.rview='s:todos';S.rq='';S.rfromHoje=0;
    S.lists=[];S.folders=[];S.notes=[];S.events=[];S.inbox=[];
    S.reminders=[{id:'r9',title:'Parcela do empréstimo',notes:'',date:'2030-01-16',time:'09:00',repeat:'monthly',repN:1,repTimes:2,repDone:0,done:false,list:'',alarms:[],subtasks:[],images:[],files:[]}];
    S.raw={reminders:S.reminders.slice(),lists:[],notes:[],folders:[],events:[],inbox:[]};`);
  q('#tab-lembretes').click(); await wait(20);
  q('#main [data-act="toggle-done"][data-id="r9"]').click(); await wait(80);
  t('repetir 2 vezes: ao concluir a 1ª, o lembrete anda para o mês seguinte e conta 1', ev(`__NUCLEO_TEST__.S.reminders[0].date`) === '2030-02-16' && ev(`__NUCLEO_TEST__.S.reminders[0].repDone`) === 1 && ev(`__NUCLEO_TEST__.S.reminders[0].done`) === false, true);
  q('#main [data-act="toggle-done"][data-id="r9"]').click(); await wait(80);
  t('repetir 2 vezes: ao concluir a 2ª (última), o lembrete termina sozinho', ev(`__NUCLEO_TEST__.S.reminders[0].done`) === true, true);
  ev(`__NUCLEO_TEST__.S.tab='hoje';__NUCLEO_TEST__.S.rview=null;__NUCLEO_TEST__.S.conf='all';`);
})());

// --- Área "Lembretes do FIN": separada dos outros, com alarme (v52) ---
const __prevP3 = Promise.all((global.__pend || []).slice());
global.__pend.push((async () => {
  await __prevP3;
  const doc = w.document, q = s => doc.querySelector(s), wait = ms => new Promise(r => setTimeout(r, ms)), TT = w.__NUCLEO_TEST__;
  const hoje = ev('isoDate(new Date())');
  const mk = (id, title, date, time, list, extra) => Object.assign({ id, title, notes: '', date, time, repeat: 'none', repN: 1, done: false, list, alarms: [], subtasks: [], images: [], files: [], priority: 0 }, extra || {});
  const seed = (lists, rems) => ev(`const S=__NUCLEO_TEST__.S;S.ready=true;S.tab='hoje';S.sheet=null;S.conf='del';S.rview=null;S.rq='';S.rfromHoje=0;S.rfromPlan=0;S.lc={};
    S.lists=${JSON.stringify(lists)};S.reminders=${JSON.stringify(rems)};S.folders=[];S.notes=[];S.events=[];S.inbox=[];
    S.raw={reminders:S.reminders.slice(),lists:S.lists.slice(),notes:[],folders:[],events:[],inbox:[]};`);
  const L = [{ id: 'lf', name: 'FIN — vencimentos', color: '#1FC95B', sections: [], fin: true }, { id: 'lc', name: 'Casa', color: '#5E8F6B', sections: [] }];
  const R = [
    mk('f1', 'Parcela atrasada da Elisa', '2020-01-15', '09:00', 'lf', { alarms: [{ id: 'a1', min: 0 }] }),
    mk('f2', 'Conta do FIN hoje à noite', hoje, '23:59', 'lf', { alarms: [{ id: 'a2', min: 0 }] }),
    mk('f3', 'Parcela distante', '2099-01-15', '09:00', 'lf', { alarms: [{ id: 'a3', min: 0 }] }),
    mk('c1', 'Consertar a torneira', '2020-01-10', '10:00', 'lc'),
    mk('c2', 'Comprar pilhas', '2099-02-01', '', '')];
  seed(L, R);
  const sm = TT.smart();
  t('separação: os atalhos gerais não contam os lembretes do FIN (Todos, Hoje, Atrasados, Programados)', sm.todos.length === 2 && sm.late.length === 1 && sm.late[0].id === 'c1' && sm.prog.length === 2 && !sm.hoje.some(r => r.list === 'lf'), true);
  t('separação: o Planner e a contagem do dia não contam os do FIN', ev(`__NUCLEO_TEST__.dayCount('${hoje}')`) === 0 && !/class="cnt num">1</.test(TT.planView()), true);
  t('FIN: contagem própria (atrasado, hoje e total)', JSON.stringify(TT.finCounts()) === JSON.stringify({ has: true, late: 1, hoje: 1, total: 3 }), true);
  const home = TT.viewLembretes();
  t('Lembretes: banner "Lembretes do FIN" com atrasados e hoje, e a lista do FIN some de "Minhas listas"', /class="finban" data-act="rview" data-v="fin"/.test(home) && home.indexOf('finban') < home.indexOf('Planner') && /1 atrasado · 1 hoje · 3 no total/.test(home) && !/FIN — vencimentos<\/div>/.test(home) && /Casa<\/div>/.test(home), true);
  const hv = TT.viewHoje();
  t('Hoje: atalho "Lembretes do FIN" (vermelho quando há atrasado) abre a área', /data-act="go-rem" data-v="fin"/.test(hv) && /Lembretes do FIN/.test(hv) && /t-red t-late/.test(hv.slice(hv.indexOf('data-v="fin"') - 80, hv.indexOf('data-v="fin"') + 160)), true);
  ev(`__NUCLEO_TEST__.S.rview='fin';`);
  const pg = TT.viewLembretes();
  t('área do FIN: só os lembretes do FIN, separados em Atrasados, Hoje e Mais adiante', /Parcela atrasada da Elisa/.test(pg) && /Conta do FIN hoje à noite/.test(pg) && /Parcela distante/.test(pg) && !/Consertar a torneira/.test(pg) && !/Comprar pilhas/.test(pg) && pg.indexOf('Atrasados') < pg.indexOf('Hoje <') && pg.indexOf('Hoje <') < pg.indexOf('Mais adiante'), true);
  t('área do FIN: botão + (novo lembrete do FIN), lápis da lista e aviso do alarme com a regra de 1 dia antes', /data-act="fin-new"/.test(pg) && /data-act="edit-list" data-id="lf"/.test(pg) && /mesmo com o app fechado/.test(pg) && /1 dia antes do vencimento, às 09:00/.test(pg), true);
  // fluxo: Hoje → tile → área → Voltar para Hoje
  seed(L, R);
  q('#tab-hoje').click(); await wait(10);
  q('#main [data-act="go-rem"][data-v="fin"]').click(); await wait(20);
  t('fluxo: tocar no atalho do Hoje abre a área do FIN, com Voltar para Hoje', ev('__NUCLEO_TEST__.S.tab') === 'lembretes' && ev('__NUCLEO_TEST__.S.rview') === 'fin' && !!q('#main [data-act="hj-back"]') && /Lembretes do FIN/.test(q('#main').textContent), true);
  q('#main [data-act="fin-new"]').click(); await wait(20);
  t('novo lembrete do FIN: abre já na lista do FIN, às 09:00, prioridade média e com alarme na hora', ev(`(function(){const d=__NUCLEO_TEST__.S.sheet&&__NUCLEO_TEST__.S.sheet.draft;return !!d&&d.list==='lf'&&d.time==='09:00'&&d.priority===2&&d.alarms.length===1&&d.alarms[0].min===0;})()`), true);
  ev(`__NUCLEO_TEST__.S.sheet=null;`);
  q('#main [data-act="hj-back"]').click(); await wait(10);
  t('fluxo: Voltar leva para Hoje', ev('__NUCLEO_TEST__.S.tab') === 'hoje' && ev('__NUCLEO_TEST__.S.rview') === null, true);
  // formulário da lista: caixa "Lista do FIN"
  seed(L, R);
  ev(`__NUCLEO_TEST__.S.tab='hoje';`); q('#tab-lembretes').click(); await wait(10);
  ev(`__NUCLEO_TEST__.S.rview='fin';`); q('#tab-hoje').click(); q('#tab-lembretes').click(); await wait(10);
  ev(`__NUCLEO_TEST__.S.rview='fin';`);
  q('#tab-hoje').click(); ev(`__NUCLEO_TEST__.S.rview='fin';`); q('#tab-lembretes').click(); await wait(10);
  q('#main [data-act="edit-list"][data-id="lf"]').click(); await wait(20);
  t('formulário da lista: caixa "Lista do FIN" marcada para a lista do FIN', !!q('#sheetRoot #f-fin') && q('#sheetRoot #f-fin').checked === true && /Lista do FIN: fica separada/.test(q('#sheetRoot').textContent), true);
  ev(`__NUCLEO_TEST__.S.sheet=null;`);
  // sem a área: banner para criar
  seed([{ id: 'lc', name: 'Casa', color: '#5E8F6B', sections: [] }], [mk('c2', 'Comprar pilhas', '2099-02-01', '', '')]);
  const sem = TT.viewLembretes();
  t('sem a área do FIN: o banner convida a criar', /data-act="fin-area-create"/.test(sem) && /Toque para criar/.test(sem), true);
  ev(`__NUCLEO_TEST__.S.tab='hoje';`); q('#tab-lembretes').click(); await wait(10);
  q('#main [data-act="fin-area-create"]').click(); await wait(80);
  t('criar a área: nasce a lista "FIN — vencimentos" marcada como do FIN e abre a área', ev(`__NUCLEO_TEST__.S.lists.some(l=>l.fin&&/FIN/.test(l.name))`) === true && ev('__NUCLEO_TEST__.S.rview') === 'fin', true);
  ev(`const S=__NUCLEO_TEST__.S;S.tab='hoje';S.rview=null;S.lists=[];S.reminders=[];S.raw={reminders:[],lists:[],notes:[],folders:[],events:[],inbox:[]};S.conf='all';`);
})());

// --- Scanner dentro do app: tela, páginas, PDF, Notas e Enviar ao FIN (v54) ---
const __prevP4 = Promise.all((global.__pend || []).slice());
global.__pend.push((async () => {
  await __prevP4;
  const doc = w.document, q = s => doc.querySelector(s), wait = ms => new Promise(r => setTimeout(r, ms)), TT = w.__NUCLEO_TEST__;
  t('entrada de arquivo já digitalizado: aceita PDF e imagem e NÃO força a câmera', !!q('#fileScan') && q('#fileScan').accept === 'application/pdf,image/*' && !q('#fileScan').hasAttribute('capture'), true);
  // Enviar ao FIN
  TT.Supa.sess = { access: 'a.b.c', refresh: 'r', exp: Date.now() + 3600000 };
  TT.finSend();
  t('Enviar ao FIN: botão Escanear documento (em destaque) com a explicação, e o botão Arquivo continua', /Escanear documento/.test(q('#finScan').textContent) && /acha as bordas do papel/.test(q('#finSend').textContent) && !q('#finFscan') && !!q('#finDoc'), true);
  q('#finScan').click(); await wait(10);
  t('Enviar ao FIN: Escanear documento abre a tela do scanner por cima (câmera traseira ou foto da galeria)', !!q('#scanUI') && !!q('#scCam') && !!q('#scLib') && /Escanear documento/.test(q('#scanUI').textContent) && q('#scFcam').getAttribute('capture') === 'environment' && q('#scFlib').accept === 'image/*' && !q('#scFlib').hasAttribute('capture'), true);
  q('#scBack').click(); await wait(10);
  t('scanner: Voltar sem páginas fecha direto', !q('#scanUI'), true);
  const jp = ev(`(function(){const a=new Uint8Array(200);a[0]=0xFF;a[1]=0xD8;a[198]=0xFF;a[199]=0xD9;return a;})()`);
  let got = null;
  TT.openScanner(f => { got = f; }, [{ jpeg: jp, w: 600, h: 800, url: 'blob:a' }, { jpeg: jp, w: 600, h: 800, url: 'blob:b' }]);
  t('scanner com 2 páginas: lista as páginas e oferece Concluir', /Páginas \(2\)/.test(q('#scanUI').textContent) && !!q('#scDone') && /Concluir e criar o PDF \(2 páginas\)/.test(q('#scFinish').textContent), true);
  q('#scanUI [data-rmp="1"]').click();
  t('scanner: o ✕ tira uma página', /Páginas \(1\)/.test(q('#scanUI').textContent) && /\(1 página\)/.test(q('#scFinish').textContent), true);
  q('#scFinish').click(); await wait(10);
  t('scanner: Concluir cria o PDF "Documento dd-mm HHhMM.pdf" e fecha a tela', !q('#scanUI') && !!got && /^Documento \d\d-\d\d \d\dh\d\d\.pdf$/.test(got.name) && got.type === 'application/pdf' && got.size > 200, true);
  TT.openScanner(() => {}, [{ jpeg: jp, w: 600, h: 800, url: 'blob:c' }]);
  q('#scBack').click(); await wait(40);
  t('scanner: Voltar com páginas pergunta antes de descartar (e a tela continua aberta)', /Descartar o que escaneou\?/.test(doc.body.textContent) && !!q('#scanUI'), true);
  await wait(600); doc.querySelector('#askRoot [data-ask="1"]').click(); await wait(40);
  t('scanner: confirmar descarta e fecha', !q('#scanUI'), true);
  q('#finTop').click();
  // Notas: Escanear abre a escolha
  ev(`const S=__NUCLEO_TEST__.S;S.ready=true;S.tab='lembretes';S.sheet=null;S.conf='del';S.folder=null;S.assetsOk=true;S.notes=[];S.folders=[];S.lists=[];S.reminders=[];S.events=[];S.inbox=[];
    S.raw={reminders:[],lists:[],notes:[],folders:[],events:[],inbox:[]};`);
  q('#tab-notas').click(); await wait(10);
  q('#main [data-act="scan-new"]').click(); await wait(30);
  const mv = q('#mvRoot'), ops = mv ? Array.from(mv.querySelectorAll('.mv-opt')).map(b => b.textContent) : [];
  t('Escanear (Notas): 4 opções — Escanear documento (vira PDF), Foto rápida, Foto da galeria e Arquivo (PDF já digitalizado) — e a explicação', ops.length === 4 && /Escanear documento \(vira PDF\)/.test(ops[0]) && /Foto rápida/.test(ops[1]) && /Foto da galeria/.test(ops[2]) && /Arquivo \(PDF já digitalizado\)/.test(ops[3]) && /acha as bordas do papel/.test(mv.textContent), true);
  mv.querySelectorAll('.mv-opt')[0].click(); await wait(20);
  t('escolher Escanear documento: abre o scanner do app (dentro do toque) e prepara a nota nova', !!q('#scanUI') && ev('__NUCLEO_TEST__.S.pendingNew') === true && !q('#mvRoot'), true);
  q('#scBack').click(); await wait(10);
  // arquivo já digitalizado (PDF do app Arquivos)
  q('#main [data-act="scan-new"]').click(); await wait(30);
  q('#mvRoot').querySelectorAll('.mv-opt')[3].click(); await wait(20);
  t('escolher Arquivo (PDF já digitalizado): prepara a nota nova', ev('__NUCLEO_TEST__.S.pendingNew') === true && !q('#mvRoot'), true);
  const ups = [];
  TT.SupaAssets.upload = async (blob, o) => { ups.push(o); return { id: 'uid/doc' + ups.length + '.pdf' }; };
  const pdf = new w.File(['conteudo do pdf'], 'Digitalização 18-10.pdf', { type: 'application/pdf' });
  Object.defineProperty(q('#fileScan'), 'files', { value: [pdf], configurable: true });
  q('#fileScan').dispatchEvent(new w.Event('change', { bubbles: true })); await wait(150);
  const nt = ev('__NUCLEO_TEST__.S.notes[0]');
  t('PDF (do scanner ou do app Arquivos): vira nota de scan com o arquivo anexado, sem converter em imagem', !!nt && nt.kind === 'scan' && /^Documento de \d\d\/\d\d \d\d:\d\d$/.test(nt.title) && nt.files.length === 1 && nt.files[0].name === 'Digitalização 18-10.pdf' && nt.files[0].type === 'application/pdf' && nt.files[0].id === 'uid/doc1.pdf' && (nt.images || []).length === 0 && ups.length === 1 && ups[0].type === 'application/pdf' && ups[0].ext === 'pdf', true);
  ev(`const S=__NUCLEO_TEST__.S;S.sheet=null;S.tab='hoje';S.pendingNew=false;S.notes=[];S.raw={reminders:[],lists:[],notes:[],folders:[],events:[],inbox:[]};S.conf='all';`);
})());

// --- Leitura mais legível: títulos, marcadores e rótulos (v55) ---
const __prevP5 = Promise.all((global.__pend || []).slice());
global.__pend.push((async () => {
  await __prevP5;
  const doc = w.document, q = s => doc.querySelector(s), TT = w.__NUCLEO_TEST__;
  const f = (s) => ev(`__NUCLEO_TEST__.fmtText(${JSON.stringify(s)})`);
  const a = f('# Dados do carro\n- Placa: FCZ 5C76\n- RENAVAM: 01067391999\n\nTexto simples\nHora 10:30 ok');
  t('leitura: "# título" vira título em destaque', /<div class="fh">Dados do carro<\/div>/.test(a), true);
  t('leitura: "- item" vira linha com marcador • e o rótulo (antes dos dois pontos) em destaque', /<div class="fb"><span class="fd">•<\/span><span class="ft"><b class="fl">Placa:<\/b> FCZ 5C76<\/span><\/div>/.test(a), true);
  t('leitura: linha em branco vira espaço entre blocos e texto comum vira parágrafo', /<div class="fs"><\/div>/.test(a) && /<div class="fp">Texto simples<\/div>/.test(a), true);
  t('leitura: horário como 10:30 não vira rótulo', /<div class="fp">Hora 10:30 ok<\/div>/.test(a), true);
  t('leitura: "* item" e "• item" também viram marcador; lista numerada mantém o número', /<span class="fd">•<\/span><span class="ft">um<\/span>/.test(f('* um')) && /<span class="fd">•<\/span><span class="ft">dois<\/span>/.test(f('• dois')) && /<span class="fd">1\.<\/span><span class="ft">primeiro<\/span>/.test(f('1. primeiro')), true);
  t('leitura: **negrito** funciona e HTML digitado é escapado (sem risco)', /<b>forte<\/b>/.test(f('isto é **forte**')) && !/<script>/.test(f('<script>alert(1)</script>')) && /&lt;script&gt;/.test(f('<script>alert(1)</script>')), true);
  t('leitura: texto vazio não dá erro', f('').length < 40, true);
  t('leitura: campo vazio ("- CPF:") mostra o rótulo e um "—" apagado (só na tela)', /<b class="fl">CPF:<\/b> <span class="fe">—<\/span>/.test(f('- CPF: ')) && /<b class="fl">Telefone:<\/b> <span class="fe">—<\/span>/.test(f('- Telefone:')), true);
  t('leitura: "Compras:" sozinha (sem marcador) não ganha o traço de campo vazio, e campo preenchido não muda', !/class="fe"/.test(f('Compras:')) && !/class="fe"/.test(f('- CPF: 123')) && /<b class="fl">CPF:<\/b> 123/.test(f('- CPF: 123')), true);
  t('estilo do campo vazio: cinza apagado', /\.vtext \.fe\{color:var\(--muted\);opacity:\.6\}/.test(html), true);
  // as duas telas de leitura usam o formato
  ev(`const S=__NUCLEO_TEST__.S;S.ready=true;S.tab='hoje';S.sheet=null;S.conf='del';S.rview=null;S.folder=null;
    S.lists=[];S.folders=[{id:'f1',name:'Consulta rápida'}];S.events=[];S.inbox=[];
    S.notes=[{id:'n1',title:'Audi',body:'# Dados do carro\\n- Placa: FCZ 5C76\\n- Município: Monte Alegre do Sul',folder:'f1',kind:'nota',checklist:[],files:[],images:[],createdAt:1}];
    S.reminders=[{id:'r1',title:'Pagar',notes:'# Como pagar\\n- Onde: Mercado Pago da Elisa\\n- Quando: dia 16',date:'2030-01-16',time:'09:00',done:false,list:'',alarms:[],subtasks:[],images:[],files:[]}];
    S.raw={reminders:S.reminders.slice(),lists:[],notes:S.notes.slice(),folders:S.folders.slice(),events:[],inbox:[]};S.tab='lembretes';S.folder='f1';`);
  q('#tab-notas').click();
  q('#main [data-act="open-note"][data-id="n1"]').click();
  const nv = q('#sheetRoot .vtext.big.fmt');
  t('leitura da nota: o texto aparece formatado (título, marcadores e rótulos) e o texto salvo não mudou', !!nv && /<div class="fh">Dados do carro<\/div>/.test(nv.innerHTML) && nv.querySelectorAll('.fb').length === 2 && /<b class="fl">Placa:<\/b>/.test(nv.innerHTML) && ev('__NUCLEO_TEST__.S.notes[0].body') === '# Dados do carro\n- Placa: FCZ 5C76\n- Município: Monte Alegre do Sul', true);
  ev(`__NUCLEO_TEST__.S.sheet=null;`);
  ev(`__NUCLEO_TEST__.S.tab='hoje';__NUCLEO_TEST__.S.rview='s:todos';`); q('#tab-lembretes').click();
  const rr = q('#main [data-act="open-rem"][data-id="r1"]');
  if (rr) rr.click();
  const rv = q('#sheetRoot .vtext.fmt');
  t('leitura do lembrete: as observações também aparecem formatadas', !!rv && /<div class="fh">Como pagar<\/div>/.test(rv.innerHTML) && rv.querySelectorAll('.fb').length === 2 && /<b class="fl">Onde:<\/b>/.test(rv.innerHTML), true);
  t('estilo: o corpo formatado quebra linhas sozinho (sem pre-wrap) e o título usa a cor de destaque', /\.vtext\.fmt\{white-space:normal\}/.test(html) && /\.vtext \.fh\{font-weight:800;color:var\(--accent\)/.test(html), true);
  ev(`const S=__NUCLEO_TEST__.S;S.sheet=null;S.tab='hoje';S.rview=null;S.notes=[];S.reminders=[];S.raw={reminders:[],lists:[],notes:[],folders:[],events:[],inbox:[]};S.conf='all';`);
})());
Promise.all(global.__pend || []).then(() => { console.log(ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0); });
