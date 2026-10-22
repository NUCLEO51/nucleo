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
  if (process.env.VERBOSE) console.log('· ' + nome);
  if (g === e) ok++; else { bad++; console.log('FALHOU:', nome, '\n   veio :', g, '\n   queria:', e); }
};
// 15/10/2026 (quinta-feira) 10:00
const NOW = 'new Date(2026,9,15,10,0,0)';
const cap = (txt) => ev('(function(){const r=parseCapture(' + JSON.stringify(txt) + ',' + NOW + ');return {title:r.title,date:r.date,time:r.time,repeat:r.repeat,repN:r.repN,repU:r.repU};})()');

t('ao abrir, o Núcleo mostra Lembretes (e não Hoje)', ev('__NUCLEO_TEST__.S.tab') === 'lembretes' && w.document.getElementById('tab-lembretes').classList.contains('on') && !w.document.getElementById('tab-hoje').classList.contains('on'), true);
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
  t('hoje: tem os 4 botões + Financeiro', ['s:hojeso', 'go-agenda', 's:late', 'go-caixa', 'fin-send', 'fin-open'].every(k => hoje.indexOf(k) > 0), true);
  t('hoje: o cronômetro é um botão redondo no topo, antes de Ajustes, e o botão largo de baixo saiu', /class="iconbtn" data-act="rl-open"/.test(hoje) && hoje.indexOf('rl-open') < hoje.indexOf('data-act="settings"') && hoje.indexOf('rl-open') < hoje.indexOf('go-rem') && !/⏱ Cronômetro/.test(hoje) && !/class="btn grow" data-act="rl-open"/.test(hoje), true);
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
  ev(`__NUCLEO_TEST__.S.nMenu=true;`);const raizM = TT.viewNotas();ev(`__NUCLEO_TEST__.S.nMenu=false;`);
  const iS = raizM.indexOf('data-act="scan-new"'), iN = raizM.indexOf('data-act="new-note"'), iD = raizM.indexOf('data-act="draw-new"');
  t('notas: Buscar e criar ficam na barra de baixo; o menu de criar tem Nova nota, Escanear e Desenhar; Editar e Nova pasta no topo', iN > 0 && iN < iS && iS < iD && /class="nbar"/.test(raiz) && /data-act="n-menu"/.test(raiz) && /data-act="ns-toggle"/.test(raiz) && /data-act="n-edit">Editar</.test(raiz) && /data-act="new-folder" data-parent=""/.test(raiz) && !/class="notes-tools"/.test(raiz), true);
  t('notas: botões têm nome para leitura (aria-label)', /aria-label="Nova pasta"/.test(raiz) && /aria-label="Criar: nova nota, escanear ou desenhar"/.test(raiz) && /data-act="n-edit"/.test(raiz), true);
  t('notas: sem o menu aberto, só aparece o botão de criar (3 opções escondidas)', !/data-act="scan-new"/.test(raiz) && !/data-act="draw-new"/.test(raiz) && !/data-act="new-note"/.test(raiz), true);
  t('notas: Nova nota e Desenhar não repetem o mesmo ícone', /noteplus:/.test(html) && /brush:/.test(html), true);
  // toque em Nova nota abre o formulário de nota
  doc.getElementById('tab-notas').click();
  clickAct(q('#main [data-act="n-menu"]'));clickAct(q('#main [data-act="new-note"]'));
  t('notas: tocar em Nova nota abre o formulário', ev('__NUCLEO_TEST__.S.sheet&&__NUCLEO_TEST__.S.sheet.type') === 'note', true);
  ev('__NUCLEO_TEST__.S.sheet=null');
  // dentro de uma pasta, os botões continuam no topo e criam dentro dela
  ev(`__NUCLEO_TEST__.S.folder='f1';`);
  const pasta = TT.viewNotas();
  ev(`__NUCLEO_TEST__.S.nMenu=true;`);const pastaM = TT.viewNotas();ev(`__NUCLEO_TEST__.S.nMenu=false;`);
  t('notas: dentro da pasta o menu de criar usa a pasta', /data-act="new-note" data-folder="f1"/.test(pastaM) && /data-act="scan-new" data-folder="f1"/.test(pastaM) && /data-act="draw-new" data-folder="f1"/.test(pastaM) && !/class="actbar"/.test(pasta), true);
  ev(`__NUCLEO_TEST__.S.nEdit=true;`);const pastaE = TT.viewNotas();ev(`__NUCLEO_TEST__.S.nEdit=false;`);
  t('notas: no modo Editar a pasta mostra ⋯ (editar) e ≡ (arrastar); fora dele a lista fica limpa', /data-act="edit-folder"/.test(pastaE) && /data-grip="1"/.test(pastaE) && !/data-act="edit-folder"/.test(pasta) && !/data-grip/.test(pasta), true);
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
  t('pasta: primeiro as notas da pasta, depois as subpastas', pg.indexOf('Nota da Elisa') > 0 && pg.indexOf('Nota da Elisa') < pg.indexOf('Pastas <'), true);
  t('pasta: sem o botão "Nova subpasta" dentro da lista e sem barra de busca fixa', !/txtbtn[^>]*new-folder/.test(pg) && !/Nova subpasta<\/button>/.test(pg) && !/id="q"/.test(pg), true);
  t('pasta: Nova pasta e Editar no topo, Buscar embaixo', (() => { const b = pg.indexOf('data-act="new-folder" data-parent="f1"'), e = pg.indexOf('data-act="n-edit"'), c = pg.indexOf('data-act="ns-toggle"'); return b > 0 && b < e && e < c; })(), true);
  t('pasta: botões novos têm nome para leitura', /aria-label="Nova pasta aqui dentro"/.test(pg) && /<span>Buscar<\/span>/.test(pg), true);
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
  t('recolher notas: some a lista de notas e ficam só as subpastas', !/Nota da Elisa/.test(so) && /Pastas </.test(so) && /data-act="nx-sub" data-id="f2"/.test(so), true);
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
  t('pasta: cabeçalhos Notas e Subpastas com a contagem em bolinha', /Notas <span class="cnt sm num">1</.test(pasta) && /Pastas <span class="cnt sm num">2</.test(pasta), true);
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
  t('mover lembrete: na leitura, Mover para outra lista é um botão redondo no topo, ao lado de Editar, e o botão largo saiu', !!q('#sheetRoot .sheet-hd .hd-r [data-act="move-open"].iconbtn') && /aria-label="Mover para outra lista"/.test(q('#sheetRoot').innerHTML) && !q('#sheetRoot .chip[data-act="move-open"]') && q('#sheetRoot .sheet-hd .hd-r [data-act="move-open"]').nextElementSibling.getAttribute('data-act') === 'view-edit', true);
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
  t('mover nota: na leitura, Mover para outra pasta é um botão redondo no topo, ao lado de Editar, e o botão largo saiu', !!q('#sheetRoot .sheet-hd .hd-r [data-act="move-open"].iconbtn') && /aria-label="Mover para outra pasta"/.test(q('#sheetRoot').innerHTML) && !q('#sheetRoot .chip[data-act="move-open"]') && q('#sheetRoot .sheet-hd .hd-r [data-act="move-open"]').nextElementSibling.getAttribute('data-act') === 'view-edit', true);
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


// --- Ordem das listas: motor puro (v57) ---
{
  const arg = JSON.stringify([{ id: 'a', name: 'banana', t: 2 }, { id: 'b', name: 'Abacate', t: 9 }, { id: 'c', name: 'cereja', t: 5 }, { id: 'd', name: 'Açaí', t: 1 }]);
  const run = (mode, src) => ev(`sortGroup(${src || arg},'${mode}',{name:x=>x.name,date:x=>x.t}).map(x=>x.id).join('')`);
  t('ordenar: A→Z (ignora acento e maiúscula) e Z→A', run('az') === 'bdac' && run('za') === 'cadb', true);
  t('ordenar: por data, mais recentes primeiro e mais antigas primeiro', run('new') === 'bcad' && run('old') === 'dacb', true);
  t('ordenar: padrão devolve como veio', run('def'), 'abcd');
  const withOrd = JSON.stringify([{ id: 'a', name: 'x', t: 0, ord: 2 }, { id: 'b', name: 'x', t: 0, ord: 1 }, { id: 'c', name: 'x', t: 0, ord: 3 }, { id: 'd', name: 'x', t: 0 }]);
  t('ordenar: minha ordem usa o campo ord e quem não tem fica por último', run('man', withOrd), 'bacd');
  const items4 = JSON.stringify([{ id: 'a', ord: 1000 }, { id: 'b', ord: 2000 }, { id: 'c', ord: 3000 }, { id: 'd', ord: 4000 }]);
  const mv = (id, to, src) => JSON.stringify(ev(`moveOrds(${src || items4},'${id}',${typeof to === 'string' ? "'" + to + "'" : JSON.stringify(to)})`));
  t('mover: para o primeiro muda só 1 item (ord antes do primeiro)', mv('c', 'first'), JSON.stringify([{ id: 'c', ord: 0 }]));
  t('mover: para o último muda só 1 item', mv('a', 'last'), JSON.stringify([{ id: 'a', ord: 5000 }]));
  const aplicar = (src, id, to) => ev(`(function(){const items=${src};const ups=moveOrds(items,'${id}','${to}');ups.forEach(u=>{items.find(x=>x.id===u.id).ord=u.ord;});return {n:ups.length,ordem:sortGroup(items,'man',{name:x=>x.id,date:x=>0}).map(x=>x.id).join('')};})()`);
  const su = aplicar(items4, 'c', 'up'), de = aplicar(items4, 'b', 'down');
  t('mover: subir ou descer uma posição muda só 1 item (ponto médio) e dá a ordem certa', su.n === 1 && su.ordem === 'acbd' && de.n === 1 && de.ordem === 'acbd', true);
  t('mover: já no limite não muda nada', mv('a', 'first') === '[]' && mv('d', 'last') === '[]' && mv('a', 'up') === '[]', true);
  t('mover: arrastar para uma posição escolhida (índice)', mv('a', { index: 2 }), JSON.stringify([{ id: 'a', ord: 3500 }]));
  const semOrd = JSON.stringify([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]);
  t('mover: quando ainda não há ordem, dá a ordem a todos já com a mudança (c primeiro)', mv('c', 'first', semOrd), JSON.stringify([{ id: 'c', ord: 1000 }, { id: 'a', ord: 2000 }, { id: 'b', ord: 3000 }, { id: 'd', ord: 4000 }]));
  t('arrastar mais de um item de uma vez (inverter tudo) reescreve em sequência', JSON.stringify(ev(`ordsForOrder(${items4},['d','c','b','a'])`)), JSON.stringify([{ id: 'd', ord: 1000 }, { id: 'c', ord: 2000 }, { id: 'b', ord: 3000 }, { id: 'a', ord: 4000 }]));
  t('quando os vizinhos estão colados demais, reescreve em sequência em vez de usar o ponto médio', JSON.stringify(ev(`moveOrds([{id:'a',ord:1},{id:'b',ord:1.0000001},{id:'c',ord:2},{id:'d',ord:3}],'d',{index:1})`)), JSON.stringify([{ id: 'a', ord: 1000 }, { id: 'd', ord: 2000 }, { id: 'b', ord: 3000 }, { id: 'c', ord: 4000 }]));
  const prop = ev(`(function(){const items=[];for(let i=0;i<8;i++)items.push({id:'x'+i});let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
    let ok=true,puts=0;const apply=ups=>{ups.forEach(u=>{items.find(x=>x.id===u.id).ord=u.ord;});puts+=ups.length;};
    const show=()=>sortGroup(items,'man',{name:x=>x.id,date:x=>0});let disp=show();
    for(let step=0;step<400;step++){
      const id=disp[Math.floor(rnd()*disp.length)].id,mv=['first','last','up','down'][Math.floor(rnd()*4)],exp=disp.map(x=>x.id),from=exp.indexOf(id);
      let at=mv==='first'?0:mv==='last'?exp.length-1:mv==='up'?from-1:from+1;at=Math.max(0,Math.min(exp.length-1,at));exp.splice(from,1);exp.splice(at,0,id);
      apply(moveOrds(disp,id,mv));disp=show();
      if(disp.map(x=>x.id).join()!==exp.join()){ok=false;break;}
    }
    return {ok,puts};})()`);
  t('mover: 400 movimentos aleatórios em 8 itens sempre dão a ordem esperada (e poucas gravações)', prop.ok === true && prop.puts < 700, true);
  const perm = ev(`(function(){const items=[];for(let i=0;i<7;i++)items.push({id:'y'+i});let seed=11;const rnd=()=>{seed=(seed*48271)%2147483647;return seed/2147483647;};
    const apply=ups=>{ups.forEach(u=>{items.find(x=>x.id===u.id).ord=u.ord;});};let ok=true;
    for(let k=0;k<200;k++){const disp=sortGroup(items,'man',{name:x=>x.id,date:x=>0}),ids=disp.map(x=>x.id),nw=ids.slice();for(let i=nw.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));const tmp=nw[i];nw[i]=nw[j];nw[j]=tmp;}
      apply(ordsForOrder(disp,nw));if(sortGroup(items,'man',{name:x=>x.id,date:x=>0}).map(x=>x.id).join()!==nw.join()){ok=false;break;}}
    return ok;})()`);
  t('arrastar: 200 reordenações completas aleatórias sempre resultam na ordem pedida', perm, true);
}

// --- Enviar ao Financeiro: Voltar também no topo (v49) ---
t('Enviar ao Financeiro: tem botão Voltar no topo, além do de baixo', /id="finTop"/.test(html) && /querySelector\('#finTop'\)\.onclick/.test(html) && /id="finNo"/.test(html), true);

// --- Enviar ao Financeiro com fotos, escanear, arquivos e colar (v50) ---
const __prevP = Promise.all((global.__pend || []).slice());   /* espera os testes assíncronos anteriores (usam a mesma janela de confirmação) */
global.__pend.push((async () => {
  await __prevP;
  const doc = w.document, q = s => doc.querySelector(s), wait = ms => new Promise(r => setTimeout(r, ms)), TT = w.__NUCLEO_TEST__;
  const posts = [], ups = [];
  TT.Supa.sess = { access: 'a.b.c', refresh: 'r', exp: Date.now() + 3600000 };
  TT.Supa.rest = async (path, opt) => { posts.push({ path, body: JSON.parse(opt.body) }); return { ok: true, status: 201 }; };
  TT.SupaAssets.upload = async (blob, o) => { ups.push(o); return { id: 'uid/' + ups.length + '.pdf' }; };
  TT.finSend();
  t('Enviar ao Financeiro: Voltar e Enviar no topo (aparecem mesmo com o teclado aberto)', !!q('#finSend #finTop') && !!q('#finSend #finGoTop') && q('#finSend').firstElementChild.contains(q('#finGoTop')), true);
  t('Enviar ao Financeiro: botões Tirar foto, Fotos, Escanear documento e Arquivo', !!q('#finCam') && !!q('#finLib') && !!q('#finDoc') && !!q('#finScan') && /Tirar foto/.test(q('#finCam').textContent) && /Escanear documento/.test(q('#finScan').textContent) && /Arquivo/.test(q('#finDoc').textContent), true);
  t('Enviar ao Financeiro: Escanear usa a câmera traseira e Fotos aceita várias imagens', q('#finFcam').getAttribute('capture') === 'environment' && q('#finFcam').accept === 'image/*' && q('#finFlib').multiple === true, true);
  t('Enviar ao Financeiro: avisa que o Financeiro não lê a foto sozinho', /não lê a foto sozinho/.test(q('#finSend').textContent), true);
  const f = new w.File(['conteudo'], 'boleto.pdf', { type: 'application/pdf' });
  const pe = new w.Event('paste', { bubbles: true, cancelable: true }); pe.clipboardData = { files: [f] };
  q('#finTx').dispatchEvent(pe);
  t('colar um arquivo no campo: ele entra na lista de anexos', /Anexos \(1\)/.test(q('#finFiles').textContent) && /boleto\.pdf/.test(q('#finFiles').textContent) && pe.defaultPrevented === true, true);
  q('#finFiles [data-rmf="0"]').click();
  t('anexo: o ✕ tira da lista', q('#finFiles').textContent.trim() === '', true);
  q('#finTx').dispatchEvent(Object.assign(new w.Event('paste', { bubbles: true, cancelable: true }), { clipboardData: { files: [f] } }));
  q('#finTx').value = 'Conta de luz vence dia 10';
  q('#finGoTop').click(); await wait(40);
  t('enviar: pede confirmação com o resumo (texto e arquivo)', /Enviar 2 itens ao Financeiro\?/.test(doc.body.textContent) && /boleto\.pdf/.test(doc.querySelector('#askRoot').textContent), true);
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
  t('erro ao enviar: mostra o motivo, mantém o texto e não fecha', /O Financeiro ainda não foi preparado no banco/.test(q('#finErr').textContent) && q('#finTx').value === 'Dívida Itaú 16000' && !!q('#finSend'), true);
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

// --- Área "Lembretes do Financeiro": separada dos outros, com alarme (v52) ---
const __prevP3 = Promise.all((global.__pend || []).slice());
global.__pend.push((async () => {
  await __prevP3;
  const doc = w.document, q = s => doc.querySelector(s), wait = ms => new Promise(r => setTimeout(r, ms)), TT = w.__NUCLEO_TEST__;
  const hoje = ev('isoDate(new Date())');
  const mk = (id, title, date, time, list, extra) => Object.assign({ id, title, notes: '', date, time, repeat: 'none', repN: 1, done: false, list, alarms: [], subtasks: [], images: [], files: [], priority: 0 }, extra || {});
  const seed = (lists, rems) => ev(`const S=__NUCLEO_TEST__.S;S.ready=true;S.tab='hoje';S.sheet=null;S.conf='del';S.rview=null;S.rq='';S.rfromHoje=0;S.rfromPlan=0;S.lc={};
    S.lists=${JSON.stringify(lists)};S.reminders=${JSON.stringify(rems)};S.folders=[];S.notes=[];S.events=[];S.inbox=[];
    S.raw={reminders:S.reminders.slice(),lists:S.lists.slice(),notes:[],folders:[],events:[],inbox:[]};`);
  const L = [{ id: 'lf', name: 'Financeiro — vencimentos', color: '#1FC95B', sections: [], fin: true }, { id: 'lc', name: 'Casa', color: '#5E8F6B', sections: [] }];
  const R = [
    mk('f1', 'Parcela atrasada da Elisa', '2020-01-15', '09:00', 'lf', { alarms: [{ id: 'a1', min: 0 }] }),
    mk('f2', 'Conta do Financeiro hoje à noite', hoje, '23:59', 'lf', { alarms: [{ id: 'a2', min: 0 }] }),
    mk('f3', 'Parcela distante', '2099-01-15', '09:00', 'lf', { alarms: [{ id: 'a3', min: 0 }] }),
    mk('c1', 'Consertar a torneira', '2020-01-10', '10:00', 'lc'),
    mk('c2', 'Comprar pilhas', '2099-02-01', '', '')];
  seed(L, R);
  const sm = TT.smart();
  t('separação: os atalhos gerais não contam os lembretes do Financeiro (Todos, Hoje, Atrasados, Programados)', sm.todos.length === 2 && sm.late.length === 1 && sm.late[0].id === 'c1' && sm.prog.length === 2 && !sm.hoje.some(r => r.list === 'lf'), true);
  t('separação: o Planner e a contagem do dia não contam os do Financeiro', ev(`__NUCLEO_TEST__.dayCount('${hoje}')`) === 0 && !/class="cnt num">1</.test(TT.planView()), true);
  t('Financeiro: contagem própria (atrasado, hoje e total)', JSON.stringify(TT.finCounts()) === JSON.stringify({ has: true, late: 1, hoje: 1, total: 3 }), true);
  const home = TT.viewLembretes();
  t('Lembretes: banner "Lembretes do Financeiro" com atrasados e hoje, e a lista do Financeiro some de "Minhas listas"', /class="finban" data-act="rview" data-v="fin"/.test(home) && home.indexOf('finban') < home.indexOf('Planner') && /1 atrasado · 1 hoje · 3 no total/.test(home) && !/Financeiro — vencimentos<\/div>/.test(home) && /Casa<\/div>/.test(home), true);
  const hv = TT.viewHoje();
  t('Hoje: atalho "Lembretes do Financeiro" (vermelho quando há atrasado) abre a área', /data-act="go-rem" data-v="fin"/.test(hv) && /Lembretes do Financeiro/.test(hv) && /t-red t-late/.test(hv.slice(hv.indexOf('data-v="fin"') - 80, hv.indexOf('data-v="fin"') + 160)), true);
  ev(`__NUCLEO_TEST__.S.rview='fin';`);
  const pg = TT.viewLembretes();
  t('área do Financeiro: só os lembretes do Financeiro, separados em Atrasados, Hoje e Mais adiante', /Parcela atrasada da Elisa/.test(pg) && /Conta do Financeiro hoje à noite/.test(pg) && /Parcela distante/.test(pg) && !/Consertar a torneira/.test(pg) && !/Comprar pilhas/.test(pg) && pg.indexOf('Atrasados') < pg.indexOf('Hoje <') && pg.indexOf('Hoje <') < pg.indexOf('Mais adiante'), true);
  t('área do Financeiro: botão + (novo lembrete do Financeiro), lápis da lista e aviso do alarme com a regra de 1 dia antes', /data-act="fin-new"/.test(pg) && /data-act="edit-list" data-id="lf"/.test(pg) && /mesmo com o app fechado/.test(pg) && /1 dia antes do vencimento, às 09:00/.test(pg), true);
  // fluxo: Hoje → tile → área → Voltar para Hoje
  seed(L, R);
  q('#tab-hoje').click(); await wait(10);
  q('#main [data-act="go-rem"][data-v="fin"]').click(); await wait(20);
  t('fluxo: tocar no atalho do Hoje abre a área do Financeiro, com Voltar para Hoje', ev('__NUCLEO_TEST__.S.tab') === 'lembretes' && ev('__NUCLEO_TEST__.S.rview') === 'fin' && !!q('#main [data-act="hj-back"]') && /Lembretes do Financeiro/.test(q('#main').textContent), true);
  q('#main [data-act="fin-new"]').click(); await wait(20);
  t('novo lembrete do Financeiro: abre já na lista do Financeiro, às 09:00, prioridade média e com alarme na hora', ev(`(function(){const d=__NUCLEO_TEST__.S.sheet&&__NUCLEO_TEST__.S.sheet.draft;return !!d&&d.list==='lf'&&d.time==='09:00'&&d.priority===2&&d.alarms.length===1&&d.alarms[0].min===0;})()`), true);
  ev(`__NUCLEO_TEST__.S.sheet=null;`);
  q('#main [data-act="hj-back"]').click(); await wait(10);
  t('fluxo: Voltar leva para Hoje', ev('__NUCLEO_TEST__.S.tab') === 'hoje' && ev('__NUCLEO_TEST__.S.rview') === null, true);
  // formulário da lista: caixa "Lista do Financeiro"
  seed(L, R);
  ev(`__NUCLEO_TEST__.S.tab='hoje';`); q('#tab-lembretes').click(); await wait(10);
  ev(`__NUCLEO_TEST__.S.rview='fin';`); q('#tab-hoje').click(); q('#tab-lembretes').click(); await wait(10);
  ev(`__NUCLEO_TEST__.S.rview='fin';`);
  q('#tab-hoje').click(); ev(`__NUCLEO_TEST__.S.rview='fin';`); q('#tab-lembretes').click(); await wait(10);
  q('#main [data-act="edit-list"][data-id="lf"]').click(); await wait(20);
  t('formulário da lista: caixa "Lista do Financeiro" marcada para a lista do Financeiro', !!q('#sheetRoot #f-fin') && q('#sheetRoot #f-fin').checked === true && /Lista do Financeiro: fica separada/.test(q('#sheetRoot').textContent), true);
  ev(`__NUCLEO_TEST__.S.sheet=null;`);
  // sem a área: banner para criar
  seed([{ id: 'lc', name: 'Casa', color: '#5E8F6B', sections: [] }], [mk('c2', 'Comprar pilhas', '2099-02-01', '', '')]);
  const sem = TT.viewLembretes();
  t('sem a área do Financeiro: o banner convida a criar', /data-act="fin-area-create"/.test(sem) && /Toque para criar/.test(sem), true);
  ev(`__NUCLEO_TEST__.S.tab='hoje';`); q('#tab-lembretes').click(); await wait(10);
  q('#main [data-act="fin-area-create"]').click(); await wait(80);
  t('criar a área: nasce a lista "Financeiro — vencimentos" marcada como do Financeiro e abre a área', ev(`__NUCLEO_TEST__.S.lists.some(l=>l.fin&&/Financeiro/.test(l.name))`) === true && ev('__NUCLEO_TEST__.S.rview') === 'fin', true);
  ev(`const S=__NUCLEO_TEST__.S;S.tab='hoje';S.rview=null;S.lists=[];S.reminders=[];S.raw={reminders:[],lists:[],notes:[],folders:[],events:[],inbox:[]};S.conf='all';`);
})());

// --- Scanner dentro do app: tela, páginas, PDF, Notas e Enviar ao Financeiro (v54) ---
const __prevP4 = Promise.all((global.__pend || []).slice());
global.__pend.push((async () => {
  await __prevP4;
  const doc = w.document, q = s => doc.querySelector(s), wait = ms => new Promise(r => setTimeout(r, ms)), TT = w.__NUCLEO_TEST__;
  t('entrada de arquivo já digitalizado: aceita PDF e imagem e NÃO força a câmera', !!q('#fileScan') && q('#fileScan').accept === 'application/pdf,image/*' && !q('#fileScan').hasAttribute('capture'), true);
  // Enviar ao Financeiro
  TT.Supa.sess = { access: 'a.b.c', refresh: 'r', exp: Date.now() + 3600000 };
  TT.finSend();
  t('Enviar ao Financeiro: botão Escanear documento (em destaque) com a explicação, e o botão Arquivo continua', /Escanear documento/.test(q('#finScan').textContent) && /acha as bordas do papel/.test(q('#finSend').textContent) && !q('#finFscan') && !!q('#finDoc'), true);
  q('#finScan').click(); await wait(10);
  t('Enviar ao Financeiro: Escanear documento abre a tela do scanner por cima (câmera traseira ou foto da galeria)', !!q('#scanUI') && !!q('#scCam') && !!q('#scLib') && /Escanear documento/.test(q('#scanUI').textContent) && q('#scFcam').getAttribute('capture') === 'environment' && q('#scFlib').accept === 'image/*' && !q('#scFlib').hasAttribute('capture'), true);
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
  ev('__NUCLEO_TEST__.S.nMenu=false'); q('#main [data-act="n-menu"]').click(); await wait(10);
  q('#main [data-act="scan-new"]').click(); await wait(30);
  const mv = q('#mvRoot'), ops = mv ? Array.from(mv.querySelectorAll('.mv-opt')).map(b => b.textContent) : [];
  t('Escanear (Notas): 4 opções — Escanear documento (vira PDF), Foto rápida, Foto da galeria e Arquivo (PDF já digitalizado) — e a explicação', ops.length === 4 && /Escanear documento \(vira PDF\)/.test(ops[0]) && /Foto rápida/.test(ops[1]) && /Foto da galeria/.test(ops[2]) && /Arquivo \(PDF já digitalizado\)/.test(ops[3]) && /acha as bordas do papel/.test(mv.textContent), true);
  mv.querySelectorAll('.mv-opt')[0].click(); await wait(20);
  t('escolher Escanear documento: abre o scanner do app (dentro do toque) e prepara a nota nova', !!q('#scanUI') && ev('__NUCLEO_TEST__.S.pendingNew') === true && !q('#mvRoot'), true);
  q('#scBack').click(); await wait(10);
  // arquivo já digitalizado (PDF do app Arquivos)
  ev('__NUCLEO_TEST__.S.nMenu=false'); q('#main [data-act="n-menu"]').click(); await wait(10);
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

// --- Subpastas abrem RECOLHIDAS por padrão (ex.: Autos dentro da Consulta rápida) e voltam recolhidas ao sair de Notas ---
const __prevP6 = Promise.all((global.__pend || []).slice());
global.__pend.push((async () => {
  await __prevP6;
  const doc = w.document, q = s => doc.querySelector(s), wait = ms => new Promise(r => setTimeout(r, ms)), TT = w.__NUCLEO_TEST__;
  const note = (id, title, folder) => ({ id, title, body: '# Dados\n- Placa: ', folder, kind: 'nota', checklist: [], files: [], images: [], createdAt: 1 });
  ev(`const S=__NUCLEO_TEST__.S;S.ready=true;S.tab='lembretes';S.sheet=null;S.conf='del';S.rview=null;S.nx={};S.nn={};S.q='';S.nsOpen=false;
    S.folders=[{id:'cr',name:'❇️ Consulta rápida'},{id:'au',name:'Autos',parent:'cr'},{id:'ou',name:'Outra',parent:'cr'}];
    S.notes=${JSON.stringify([note('n1', 'Marcelo', 'cr'), note('n2', 'Jeep', 'au'), note('n3', 'Camionete', 'au'), note('n4', 'Algo', 'ou')])};
    S.lists=[];S.reminders=[];S.events=[];S.inbox=[];S.folder='cr';
    S.raw={reminders:[],lists:[],notes:S.notes.slice(),folders:S.folders.slice(),events:[],inbox:[]};`);
  q('#tab-notas').click(); await wait(10);
  const h0 = q('#main').innerHTML;
  t('subpastas: Autos e Outra aparecem dentro da Consulta rápida, RECOLHIDAS (as notas delas não aparecem) e a ficha da pasta aparece', /Autos/.test(h0) && /Outra/.test(h0) && /Marcelo/.test(h0) && !/Jeep/.test(h0) && !/Camionete/.test(h0) && !/Algo/.test(h0), true);
  q('#main [data-act="nx-sub"][data-id="au"]').click(); await wait(10);
  const h1 = q('#main').innerHTML;
  t('subpastas: tocar na setinha abre só a Autos (mostra Jeep e Camionete) e a outra continua recolhida', /Jeep/.test(h1) && /Camionete/.test(h1) && !/Algo/.test(h1), true);
  ev(`__NUCLEO_TEST__.S.folder='cr';`); q('#tab-hoje').click(); await wait(10); q('#tab-notas').click(); await wait(10);
  ev(`__NUCLEO_TEST__.S.folder='cr';`); q('#tab-hoje').click(); ev(`__NUCLEO_TEST__.S.folder='cr';`); q('#tab-notas').click(); await wait(10);
  t('subpastas: ao sair de Notas e voltar, as subpastas voltam a abrir recolhidas', ev(`JSON.stringify(__NUCLEO_TEST__.S.nx)`) === '{}' && !/Jeep/.test(q('#main').innerHTML), true);
  ev(`const S=__NUCLEO_TEST__.S;S.tab='hoje';S.folder=null;S.nx={};S.nn={};S.folders=[];S.notes=[];S.raw={reminders:[],lists:[],notes:[],folders:[],events:[],inbox:[]};S.conf='all';`);
})());

// --- Ordenar e arrastar na tela: Notas, Minhas listas e lembretes (v57) ---
const __prevP7 = Promise.all((global.__pend || []).slice());
global.__pend.push((async () => {
  await __prevP7;
  const doc = w.document, q = s => doc.querySelector(s), wait = ms => new Promise(r => setTimeout(r, ms)), TT = w.__NUCLEO_TEST__;
  const nt = (id, title, ts) => ({ id, title, body: '', folder: 'cr', kind: 'nota', checklist: [], files: [], images: [], createdAt: ts, updatedAt: ts });
  try { w.localStorage.removeItem('ord-sort'); } catch (e) {}
  ev(`const S=__NUCLEO_TEST__.S;S.ready=true;S.tab='lembretes';S.sheet=null;S.conf='del';S.rview=null;S.nx={};S.nn={};S.q='';S.nsOpen=false;
    S.folders=[{id:'cr',name:'Consulta'}];
    S.notes=${JSON.stringify([nt('n1', 'Banana', 4), nt('n2', 'Abacate', 3), nt('n3', 'Cereja', 2), nt('n4', 'Damasco', 1)])};
    S.lists=[];S.reminders=[];S.events=[];S.inbox=[];S.folder='cr';
    S.raw={reminders:[],lists:[],notes:S.notes.slice(),folders:S.folders.slice(),events:[],inbox:[]};`);
  const ids = () => Array.from(q('#main .notes-cards').children).map(c => c.getAttribute('data-rid')).join('');
  const rerender = async () => { ev(`__NUCLEO_TEST__.S.tab='lembretes';`); q('#tab-notas').click(); await wait(20); };
  await rerender();
  t('notas: o botão redondo Ordenar aparece (apagado = ordem padrão), sem barra larga, e o grupo é marcado para arrastar', !!q('#main [data-sortbtn]') && q('#main [data-sortbtn]').classList.contains('iconbtn') && !q('#main [data-sortbtn]').classList.contains('on') && !doc.querySelector('.sortbar') && q('#main .notes-cards').getAttribute('data-rgroup') === 'notes:cr' && q('#main .notes-cards').getAttribute('data-rman') === '1' && ids() === 'n1n2n3n4', true);
  q('#main [data-sortbtn]').click(); await wait(30);
  const op = (txt) => Array.from(doc.querySelectorAll('#mvRoot .mv-opt')).find(b => b.textContent.indexOf(txt) >= 0);
  t('notas: a barra abre a escolha com Padrão, datas, A→Z, Z→A e Minha ordem', !!q('#mvRoot') && ['Padrão', 'Data: mais recentes', 'Data: mais antigas', 'A → Z', 'Z → A', 'Minha ordem'].every(x => !!op(x)), true);
  op('A → Z').click(); await wait(40);
  t('notas: A → Z coloca Abacate, Banana, Cereja, Damasco (e o botão continua na cor padrão dos outros)', ids() === 'n2n1n3n4' && !q('#main [data-sortbtn]').classList.contains('on') && q('#main [data-sortbtn]').classList.contains('iconbtn'), true);
  q('#main [data-sortbtn]').click(); await wait(30); op('Z → A').click(); await wait(40);
  t('notas: Z → A inverte', ids() === 'n4n3n1n2', true);
  q('#main [data-sortbtn]').click(); await wait(30); op('Data: mais antigas').click(); await wait(40);
  t('notas: Data: mais antigas primeiro (Damasco, Cereja, Abacate, Banana)', ids() === 'n4n3n2n1', true);
  t('a escolha fica guardada neste aparelho', JSON.parse(w.localStorage.getItem('ord-sort'))['notes:cr'] === 'old', true);
  q('#main [data-sortbtn]').click(); await wait(30); op('Minha ordem').click(); await wait(120);
  t('Minha ordem: todas as notas ganham um número de ordem seguindo o que estava na tela, sem mexer nas datas', ev(`__NUCLEO_TEST__.S.notes.every(n=>typeof n.ord==='number')`) === true && ev(`__NUCLEO_TEST__.S.notes.map(n=>n.updatedAt).join()`) === '4,3,2,1' && ids() === 'n4n3n2n1', true);
  // botões de reserva: escolher a nota 3 sem arrastar (segurar e soltar)
  const rowOf = id => q('#main .notes-cards [data-rid="' + id + '"]');
  const stubRects = () => { const g = q('#main .notes-cards'); Array.from(g.children).forEach(c => { c.getBoundingClientRect = () => { const i = Array.from(g.children).indexOf(c); return { top: i * 100, height: 100, bottom: i * 100 + 100, left: 0, right: 300, width: 300 }; }; }); };
  TT.roBegin(TT.roFind(rowOf('n3')));
  await TT.roEnd();
  t('segurar sem arrastar: a barra de botões aparece e o item fica em destaque', !!q('#roBar') && q('#roBar').querySelectorAll('[data-ro]').length === 5 && rowOf('n3').classList.contains('ro-sel') === true, true);
  await TT.roBtn('first'); await wait(80);
  t('botão Primeiro: a nota vai para o começo (mudando só 1 número) e continua em destaque', ids() === 'n3n4n2n1' && rowOf('n3').classList.contains('ro-sel') && !!q('#roBar'), true);
  await TT.roBtn('down'); await wait(60); await TT.roBtn('down'); await wait(60);
  t('botão Descer duas vezes', ids() === 'n4n2n3n1', true);
  await TT.roBtn('last'); await wait(60);
  t('botão Último', ids() === 'n4n2n1n3', true);
  await TT.roBtn('up'); await wait(60);
  t('botão Subir', ids() === 'n4n2n3n1', true);
  await TT.roBtn('done'); await wait(10);
  t('botão Pronto fecha a barra e tira o destaque', !q('#roBar') && !doc.querySelector('.ro-sel'), true);
  t('mexer na ordem não muda a data das notas', ev(`__NUCLEO_TEST__.S.notes.map(n=>n.updatedAt).join()`), '4,3,2,1');
  // arrastar (posições simuladas): leva a nota n4 (primeira) para entre n3 e n1
  stubRects();
  TT.roBegin(TT.roFind(rowOf('n4')));
  TT.roMove(260);
  t('arrastar: enquanto o dedo se move, a lista se reorganiza ao vivo e a nota levantada fica destacada', ids() === 'n2n3n4n1' && rowOf('n4').classList.contains('ro-drag'), true);
  await TT.roEnd(); await wait(100);
  t('arrastar: ao soltar, a nova ordem é gravada e a tela mostra a mesma ordem', ids() === 'n2n3n4n1' && ev(`__NUCLEO_TEST__.S.notes.slice().sort((a,b)=>a.ord-b.ord).map(n=>n.id).join('')`) === 'n2n3n4n1', true);
  let abriu = false; ev(`__NUCLEO_TEST__.S.sheet=null;`);
  rowOf('n4').dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  t('arrastar: soltar o dedo não "toca" na nota (não abre a leitura)', ev(`(__NUCLEO_TEST__.S.sheet||{}).type`) !== 'notev', true);
  await TT.roBtn('done'); await wait(700);
  rowOf('n2').dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); await wait(20);
  t('depois de um instante, tocar na nota volta a abri-la normalmente', ev(`(__NUCLEO_TEST__.S.sheet||{}).type`) === 'notev', true);
  ev(`__NUCLEO_TEST__.S.sheet=null;`);
  // toque longo de verdade (sem dedo: mouse): segura 450 ms e vira modo de arrastar
  await rerender();
  const r2 = rowOf('n2');
  r2.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 10, clientY: 10 }));
  await wait(120); w.document.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true }));
  t('toque curto (menos de 450 ms) não vira arrastar', !TT.RO.drag && !q('#roBar'), true);
  r2.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 10, clientY: 10 }));
  await wait(40); w.document.dispatchEvent(new w.MouseEvent('mousemove', { bubbles: true, clientX: 10, clientY: 60 }));
  await wait(520);
  t('mexer o dedo antes de 450 ms cancela (é rolagem, não arrastar)', !TT.RO.drag, true);
  w.document.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true }));
  r2.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, button: 0, clientX: 10, clientY: 10 }));
  await wait(520);
  t('segurar parado por 450 ms liga o modo de arrastar e mostra a barra de botões', !!TT.RO.drag && !!q('#roBar') && /ro-drag/.test(r2.className), true);
  w.document.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true })); await wait(40);
  await TT.roBtn('done'); await wait(700);
  // Minhas listas e lembretes dentro de uma lista
  const rm = (id, title, list, sec, ts) => ({ id, title, notes: '', date: '2030-01-1' + id.slice(1), time: '09:00', done: false, list, section: sec, alarms: [], subtasks: [], images: [], files: [], createdAt: ts });
  ev(`const S=__NUCLEO_TEST__.S;S.tab='hoje';S.rview=null;S.folder=null;S.notes=[];S.folders=[];
    S.lists=[{id:'L1',name:'Casa',color:'#5E8F6B',sections:[{id:'s1',t:'Cozinha'}]},{id:'L2',name:'Contas',color:'#B5584E',sections:[]},{id:'L3',name:'Amigos',color:'#2F8CFF',sections:[]}];
    S.reminders=${JSON.stringify([rm('r1', 'Lavar louça', 'L1', 's1', 1), rm('r2', 'Arrumar gaveta', 'L1', 's1', 2), rm('r3', 'Comprar sal', 'L1', 's1', 3), rm('r4', 'Fora de seção', 'L1', '', 4)])};
    S.raw={reminders:S.reminders.slice(),lists:S.lists.slice(),notes:[],folders:[],events:[],inbox:[]};`);
  q('#tab-lembretes').click(); await wait(20);
  const lg = q('#main [data-rgroup="lists"]');
  t('Minhas listas: barra de ordem e grupo arrastável (Lembretes padrão fica fixo no topo, sem arrastar)', !!lg && lg.getAttribute('data-rman') === '1' && !!q('#main [data-sortbtn]') && !lg.children[0].hasAttribute('data-rid') && Array.from(lg.children).slice(1).every(c => c.hasAttribute('data-rid')), true);
  t('Minhas listas: por padrão em A → Z (como era), e dá para trocar', Array.from(lg.children).slice(1).map(c => c.getAttribute('data-rid')).join('') === 'L3L1L2', true);
  ev(`__NUCLEO_TEST__.S.rview='l:L1';`); q('#tab-hoje').click(); ev(`__NUCLEO_TEST__.S.rview='l:L1';`); q('#tab-lembretes').click(); await wait(20);
  t('dentro de uma lista: o botão Ordenar fica na fileira de botões do topo e cada seção é um grupo arrastável separado', !!q('#main .notes-tools [data-sortbtn]') && !!q('#main [data-rgroup="rems:L1|s1"]') && !!q('#main [data-rgroup="rems:L1|_sem"]'), true);
  const sec = q('#main [data-rgroup="rems:L1|s1"]'), rid = () => Array.from(q('#main [data-rgroup="rems:L1|s1"]').children).map(c => c.getAttribute('data-rid')).join('');
  t('dentro de uma lista: ordem padrão da seção (por data)', rid(), 'r1r2r3');
  q('#main [data-sortbtn]').click(); await wait(30);
  Array.from(doc.querySelectorAll('#mvRoot .mv-opt')).find(b => b.textContent.indexOf('A → Z') >= 0).click(); await wait(40);
  t('dentro de uma lista: A → Z reordena os lembretes de cada seção', rid() === 'r2r3r1', true);
  ev(`const S=__NUCLEO_TEST__.S;S.sheet=null;S.tab='hoje';S.rview=null;S.lists=[];S.reminders=[];S.notes=[];S.folders=[];S.raw={reminders:[],lists:[],notes:[],folders:[],events:[],inbox:[]};S.conf='all';`);
  try { w.localStorage.removeItem('ord-sort'); } catch (e) {}
})());

// --- Botão redondo Ordenar nas barras do topo (v58) ---
const __prevP8 = Promise.all((global.__pend || []).slice());
global.__pend.push((async () => {
  await __prevP8;
  const doc = w.document, q = s => doc.querySelector(s), wait = ms => new Promise(r => setTimeout(r, ms));
  try { w.localStorage.removeItem('ord-sort'); } catch (e) {}
  ev(`const S=__NUCLEO_TEST__.S;S.ready=true;S.tab='hoje';S.sheet=null;S.conf='del';S.rview=null;S.folder=null;S.nx={};S.nn={};S.q='';S.nsOpen=false;
    S.folders=[{id:'f1',name:'Autos'},{id:'f2',name:'Sub',parent:'f1'}];
    S.notes=[{id:'n1',title:'Jeep',body:'',folder:'f1',kind:'nota',checklist:[],files:[],images:[],createdAt:2,updatedAt:2}];
    S.lists=[{id:'L1',name:'Casa',color:'#5E8F6B',sections:[]}];S.reminders=[];S.events=[];S.inbox=[];
    S.raw={reminders:[],lists:S.lists.slice(),notes:S.notes.slice(),folders:S.folders.slice(),events:[],inbox:[]};`);
  q('#tab-notas').click(); await wait(20);
  const b1 = q('#main .hd-r [data-sortbtn]');
  t('Notas (início): o botão Ordenar é redondo e fica no canto do título, ao lado de Ajustes', !!b1 && b1.classList.contains('iconbtn') && b1.nextElementSibling && b1.nextElementSibling.getAttribute('data-act') === 'settings', true);
  ev(`__NUCLEO_TEST__.S.tab='lembretes';__NUCLEO_TEST__.S.folder='f1';`); q('#tab-notas').click(); await wait(20);
  const tools = q('#main .notes-tools');
  t('Notas (dentro da pasta): o botão Ordenar entra na fileira de botões redondos e, com 7 botões, a fileira fica compacta para caber', !!tools.querySelector('[data-sortbtn]') && tools.querySelectorAll('.iconbtn').length === 7 && tools.classList.contains('dense'), true);
  ev(`__NUCLEO_TEST__.S.tab='hoje';__NUCLEO_TEST__.S.folder=null;`); q('#tab-lembretes').click(); await wait(20);
  const b3 = q('#main .hd-r [data-sortbtn]');
  t('Lembretes (início): o botão Ordenar fica ao lado de Ajustes', !!b3 && b3.nextElementSibling && b3.nextElementSibling.getAttribute('data-act') === 'settings', true);
  ev(`__NUCLEO_TEST__.S.tab='hoje';__NUCLEO_TEST__.S.rview='l:L1';`); q('#tab-lembretes').click(); await wait(20);
  t('dentro de uma lista de lembretes: o botão Ordenar fica na fileira do topo, antes do lápis de editar', !!q('#main .notes-tools [data-sortbtn]') && q('#main .notes-tools [data-sortbtn]').nextElementSibling.getAttribute('data-act') === 'edit-list', true);
  t('o ícone do botão existe e não sobrou nenhuma barra larga "Ordem" em lugar nenhum', /<path d="M7 4v16M3.5 7.5 7 4l3.5 3.5M17 20V4M13.5 16.5 17 20l3.5-3.5"\/>/.test(doc.documentElement.outerHTML) && !doc.querySelector('.sortbar'), true);
  ev(`const S=__NUCLEO_TEST__.S;S.sheet=null;S.tab='hoje';S.rview=null;S.folder=null;S.lists=[];S.folders=[];S.notes=[];S.raw={reminders:[],lists:[],notes:[],folders:[],events:[],inbox:[]};S.conf='all';`);
})());

// --- Backup no app, ordem sincronizada e vencimentos das fichas (v61) ---
const __prevP9 = Promise.all((global.__pend || []).slice());
global.__pend.push((async () => {
  await __prevP9;
  const doc = w.document, wait = ms => new Promise(r => setTimeout(r, ms)), TT = w.__NUCLEO_TEST__;
  // ---------- backup automático ----------
  ev(`window.__rest=[];Supa.rest=async(p,o)=>{window.__rest.push([p,(o&&o.method)||'GET']);
    if(/backups\\?select=id/.test(p))return {ok:true,json:async()=>[{id:'b1',taken_at:new Date().toISOString(),n_items:78,motivo:'diario'}]};
    if(/rpc\\/backup_agora/.test(p))return {ok:true,json:async()=>'x'};
    if(/backups\\?select=data/.test(p))return {ok:true,json:async()=>[{data:{lembretes:[],notas:[],fin:[]},taken_at:new Date().toISOString()}]};
    return {ok:true,json:async()=>[]};};`.replace('Supa.rest', '__NUCLEO_TEST__.Supa.rest'));
  const sx = TT.sheetSaude();
  t('Ajustes › Saúde do app: mostra o status do backup automático e os botões Fazer backup agora e Baixar o último', /id="bkAuto"/.test(sx) && /data-act="bk-now"/.test(sx) && /data-act="bk-down"/.test(sx), true);
  const holder = doc.createElement('div'); holder.id = 'bkAuto'; doc.body.appendChild(holder);
  await TT.bkRefresh();
  t('o status mostra a hora do último backup automático e quantos itens', /Último backup automático: hoje às \d\d:\d\d \(78 itens\)\./.test(holder.textContent), true);
  await TT.bkNow(); await wait(30);
  t('Fazer backup agora chama o servidor (backup_agora) e depois confere o status de novo', ev(`window.__rest.some(x=>/rpc\\/backup_agora/.test(x[0])&&x[1]==='POST')`) === true, true);
  let baixou = null;
  w.URL.createObjectURL = () => 'blob:teste'; w.URL.revokeObjectURL = () => {};
  const clickOrig = w.HTMLAnchorElement.prototype.click; w.HTMLAnchorElement.prototype.click = function () { baixou = this.download; };
  await TT.bkDown(); await wait(30);
  w.HTMLAnchorElement.prototype.click = clickOrig;
  t('Baixar o último backup automático gera um arquivo .json com a data do backup', /^nucleo-backup-automatico-\d{4}-\d\d-\d\d\.json$/.test(baixou || ''), true);
  holder.remove();
  // ---------- ordem sincronizada ----------
  try { w.localStorage.removeItem('ord-sort'); w.localStorage.removeItem('ord-sort-t'); } catch (e) {}
  ev(`window.__saves=[];window.__remoto=null;__NUCLEO_TEST__.ROH.syncSave=async(rec,data)=>{window.__saves.push(data);return {id:'cfg1',version:(rec?rec.version:0)+1,data};};
     __NUCLEO_TEST__.ROH.syncLoad=async()=>window.__remoto;`);
  ev(`__NUCLEO_TEST__.roSetPref('notes:abc','az')`);
  await wait(1700);
  const sv = ev('window.__saves[window.__saves.length-1]');
  t('escolher uma ordem manda a escolha para a nuvem (registro de configuração com a data da escolha)', sv && sv.cfg === 'sortprefs' && sv.prefs['notes:abc'].m === 'az' && typeof sv.prefs['notes:abc'].t === 'number', true);
  try { w.localStorage.removeItem('ord-sort'); w.localStorage.removeItem('ord-sort-t'); } catch (e) {}
  ev(`window.__remoto={id:'cfg1',version:3,data:{cfg:'sortprefs',prefs:{'notes:xyz':{m:'za',t:Date.now()+5000}}}};`);
  await TT.ordPull();
  t('em outro aparelho: a escolha guardada na nuvem passa a valer aqui', ev(`__NUCLEO_TEST__.roPrefs()['notes:xyz']`), 'za');
  ev(`window.__saves=[];__NUCLEO_TEST__.roSetPref('notes:xyz','man');`);
  await wait(1700);
  ev(`window.__remoto={id:'cfg1',version:4,data:{cfg:'sortprefs',prefs:{'notes:xyz':{m:'az',t:1000}}}};`);
  await TT.ordPull(); await wait(1700);
  t('a escolha mais nova ganha: a daqui (mais nova) não é trocada pela velha da nuvem, e é reenviada', ev(`__NUCLEO_TEST__.roPrefs()['notes:xyz']`) === 'man' && ev('window.__saves.length') >= 1, true);
  try { w.localStorage.removeItem('ord-sort'); w.localStorage.removeItem('ord-sort-t'); } catch (e) {}
  // ---------- vencimentos das fichas ----------
  const ds = ev(`__NUCLEO_TEST__.ficDates({body:'# Dados\\n- Vencimento do IPVA: 20/11/2030\\n- Validade da CNH: 5/3/31\\n- Seguro: 10/10/2030\\n- Vencimento do licenciamento: 31/02/2030\\n- Vence: 01.12.2030\\n- Vencimento do IPVA: 21/11/2030'})`);
  t('fichas: lê "Vencimento…" e "Validade…" com data (ano de 2 dígitos vale, data impossível e outros campos não, repetido só conta uma vez)', Array.from(ds).map(x => x.label + '=' + x.due).join('|') === 'Vencimento do IPVA=2030-11-20|Validade da CNH=2031-03-05|Vence=2030-12-01', true);
  ev(`const S=__NUCLEO_TEST__.S;S.ready=true;S.lists=[];S.raw.lists=[];S.reminders=[];S.raw.reminders=[];S.trash=[];
     S.raw.notes=[{id:'f1',title:'Jeep',body:'# Vencimentos\\n- Vencimento do IPVA: 20/11/2030\\n- Seguro: ',folder:'',kind:'nota',checklist:[],files:[],images:[],createdAt:1}];S.notes=S.raw.notes.slice();`);
  const wn = ev(`__NUCLEO_TEST__.ficWanted('2026-10-18')`);
  const k0 = Object.keys(wn)[0];
  t('fichas: o lembrete é 1 dia antes do vencimento e o título diz de qual ficha e campo', wn[k0] && wn[k0].date === '2030-11-19' && wn[k0].title === 'Jeep — Vencimento do IPVA (20/11/2030)', true);
  const hoje = ev(`isoDate(new Date())`);
  ev(`__NUCLEO_TEST__.S.notes[0].body='- Vencimento do IPVA: '+(function(){const d=new Date();return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();})();`);
  const w2 = ev(`__NUCLEO_TEST__.ficWanted(isoDate(new Date()))`);
  t('fichas: vence hoje: o lembrete é para hoje (não fica no passado)', w2[Object.keys(w2)[0]].date === hoje, true);
  ev(`const S=__NUCLEO_TEST__.S;S.raw.notes[0].body='# Vencimentos\\n- Vencimento do IPVA: 20/11/2030\\n- Seguro: ';S.notes=S.raw.notes.slice();`);
  await TT.ficSync(true); await wait(30);
  const rs = ev(`__NUCLEO_TEST__.S.reminders.filter(r=>r.ficRef)`);
  const lst = ev(`__NUCLEO_TEST__.S.lists.filter(l=>l.name==='Vencimentos das fichas')`);
  t('fichas: cria a lista "Vencimentos das fichas" e 1 lembrete às 09:00, com alarme na hora e prioridade média', lst.length === 1 && rs.length === 1 && rs[0].date === '2030-11-19' && rs[0].time === '09:00' && rs[0].alarms[0].min === 0 && rs[0].priority === 2 && rs[0].list === lst[0].id && rs[0].done === false, true);
  await TT.ficSync(true); await wait(30);
  t('fichas: rodar de novo não duplica nada', ev(`__NUCLEO_TEST__.S.reminders.filter(r=>r.ficRef).length`) === 1 && ev(`__NUCLEO_TEST__.S.lists.filter(l=>l.name==='Vencimentos das fichas').length`) === 1, true);
  ev(`const S=__NUCLEO_TEST__.S;S.raw.notes[0].body='- Vencimento do IPVA: 25/11/2030';S.notes=S.raw.notes.slice();`);
  await TT.ficSync(true); await wait(30);
  const r2 = ev(`__NUCLEO_TEST__.S.reminders.filter(r=>r.ficRef)`);
  t('fichas: mudou a data na ficha: o lembrete antigo vai para a lixeira e nasce o novo (24/11)', r2.length === 1 && r2[0].date === '2030-11-24' && ev(`__NUCLEO_TEST__.S.trash.filter(t=>t.c==='reminders'&&t.x.ficRef).length`) === 1, true);
  ev(`const S=__NUCLEO_TEST__.S;S.raw.reminders.forEach(r=>{if(r.ficRef)r.deletedAt=Date.now();});`);
  ev(`__NUCLEO_TEST__.S.raw.reminders=__NUCLEO_TEST__.S.raw.reminders.slice();`);
  t('(preparação) o lembrete da ficha foi apagado à mão', true, true);
  ev(`const S=__NUCLEO_TEST__.S;S.reminders=S.raw.reminders.filter(x=>!x.deletedAt);S.trash=S.raw.reminders.filter(x=>x.deletedAt).map(x=>({c:'reminders',x}));`);
  await TT.ficSync(true); await wait(30);
  t('fichas: se você apagou o lembrete de propósito, ele não é recriado', ev(`__NUCLEO_TEST__.S.reminders.filter(r=>r.ficRef&&r.ficDue==='2030-11-25').length`), 0);
  ev(`const S=__NUCLEO_TEST__.S;S.raw.notes[0].body='# Vencimentos\\n- Seguro: ';S.notes=S.raw.notes.slice();`);
  await TT.ficSync(true); await wait(30);
  ev(`const S=__NUCLEO_TEST__.S;S.raw.notes[0].body='- Vencimento do IPVA: 10/01/2020';S.notes=S.raw.notes.slice();`);
  await TT.ficSync(true); await wait(30);
  t('fichas: data já vencida há tempo não cria lembrete novo', ev(`__NUCLEO_TEST__.S.reminders.filter(r=>r.ficRef&&r.ficDue==='2020-01-10').length`), 0);
  ev(`const S=__NUCLEO_TEST__.S;S.lists=[];S.raw.lists=[];S.reminders=[];S.raw.reminders=[];S.trash=[];S.raw.notes=[];S.notes=[];`);
})());

// --- Senha (PIN) para abrir o app (v62) ---
const __prevP10 = Promise.all((global.__pend || []).slice());
global.__pend.push((async () => {
  await __prevP10;
  const doc = w.document, wait = ms => new Promise(r => setTimeout(r, ms)), TT = w.__NUCLEO_TEST__;
  try { Object.defineProperty(w, 'crypto', { value: require('crypto').webcrypto, configurable: true }); } catch (e) {}
  w.TextEncoder = require('util').TextEncoder;
  const limpa = () => { ['hash', 'salt', 'at', 'fails', 'until', 'cred'].forEach(k => w.localStorage.removeItem('lock-' + k)); };
  const keys = async (s) => { for (const c of s) await TT.lkKey(c); };
  limpa();
  ev(`window.__reloads=0;__NUCLEO_TEST__.LKH.reload=()=>{window.__reloads++;};`);
  const b0 = TT.lkBlock('nuc');
  t('senha: sem senha, o bloco oferece só "Criar uma senha"', /data-act="lk-new"/.test(b0) && !/lk-now|lk-remove/.test(b0), true);
  await TT.lkSetPin('123456');
  const h1 = TT.lkGet('hash'), s1 = TT.lkGet('salt');
  t('senha: guarda só o hash (64 letras/números) e um sal, nunca o número', /^[0-9a-f]{64}$/.test(h1) && /^[0-9a-f]{32}$/.test(s1) && h1.indexOf('123456') < 0 && !Object.keys(w.localStorage).some(k => w.localStorage.getItem(k) === '123456'), true);
  t('senha: confere a certa e recusa a errada', (await TT.lkCheck('123456')) === true && (await TT.lkCheck('654321')) === false, true);
  await TT.lkSetPin('123456');
  t('senha: o mesmo número gera um hash diferente a cada vez (sal novo)', TT.lkGet('hash') !== h1 && TT.lkGet('salt') !== s1, true);
  const b1 = TT.lkBlock('nuc');
  t('senha: com senha, o bloco oferece Bloquear agora, Trocar, Face ID e Tirar', ['lk-now', 'lk-change', 'lk-face', 'lk-remove'].every(a => b1.indexOf('data-act="' + a + '"') >= 0) && !/lk-new/.test(b1), true);
  t('senha: logo depois de usar, não pede de novo; depois de 3 minutos parado, pede', TT.lkNeeded() === false && (w.localStorage.setItem('lock-at', String(Date.now() - 3 * 60000)), TT.lkNeeded()) === true, true);
  // tela de senha
  TT.lkOpen('unlock');
  const lk = doc.getElementById('lock');
  t('tela de senha: cobre o app, tem 6 bolinhas e o teclado de 0 a 9', lk.style.display === 'flex' && doc.documentElement.classList.contains('lk-on') && lk.querySelectorAll('.lk-dots span').length === 6 && lk.querySelectorAll('.lk-pad [data-k]').length === 12 && /Digite a senha/.test(lk.textContent), true);
  await keys('123'); 
  t('tela de senha: cada número digitado acende uma bolinha', lk.querySelectorAll('.lk-dots span.on').length === 3, true);
  await TT.lkKey('del');
  t('tela de senha: apagar tira a última', lk.querySelectorAll('.lk-dots span.on').length === 2, true);
  await TT.lkKey('del'); await TT.lkKey('del');
  await keys('000000');
  t('tela de senha: senha errada avisa quantas tentativas faltam e limpa as bolinhas', /Senha errada\. Faltam 4/.test(lk.textContent) && lk.querySelectorAll('.lk-dots span.on').length === 0 && lk.style.display === 'flex', true);
  await keys('000000'); await keys('000000'); await keys('000000'); await keys('000000');
  t('tela de senha: na 5ª errada trava por um tempo e avisa quantos segundos', /Muitas tentativas\. Espere \d+ segundos/.test(lk.textContent) && (+TT.lkGet('until')) > Date.now(), true);
  await keys('123456');
  t('tela de senha: durante a espera nem a senha certa entra', lk.style.display === 'flex', true);
  w.localStorage.removeItem('lock-until'); w.localStorage.removeItem('lock-fails');
  await keys('123456');
  t('tela de senha: a senha certa abre o app e tira a cobertura', lk.style.display === 'none' && !doc.documentElement.classList.contains('lk-on') && TT.lkNeeded() === false, true);
  // criar senha do zero
  limpa();
  await TT.lkAct('lk-new');
  t('criar senha: abre a tela "Crie uma senha"', lk.style.display === 'flex' && /Crie uma senha/.test(lk.textContent) && lk.querySelector('#lkCancel').style.display === '', true);
  await keys('111111'); 
  t('criar senha: pede para repetir', /Repita a senha/.test(lk.textContent), true);
  await keys('222222');
  t('criar senha: se não bater, volta ao começo e não grava nada', /Não bateu/.test(lk.textContent) && /Crie uma senha/.test(lk.textContent) && !TT.lkGet('hash'), true);
  await keys('111111'); await keys('111111');
  t('criar senha: batendo, grava e fecha', !!TT.lkGet('hash') && lk.style.display === 'none' && (await TT.lkCheck('111111')) === true, true);
  // trocar senha
  await TT.lkAct('lk-change');
  t('trocar senha: primeiro pede a senha atual', /Digite a senha atual/.test(lk.textContent), true);
  await keys('111111');
  t('trocar senha: com a atual certa, pede a nova', /Crie uma senha/.test(lk.textContent), true);
  await keys('333333'); await keys('333333');
  t('trocar senha: a nova passa a valer e a antiga deixa de valer', (await TT.lkCheck('333333')) === true && (await TT.lkCheck('111111')) === false, true);
  // tirar senha
  await TT.lkAct('lk-remove');
  await keys('999999');
  t('tirar senha: com a senha errada não tira', TT.lkOn() === true && lk.style.display === 'flex', true);
  await TT.lkKey('cancel');
  await TT.lkAct('lk-remove'); await keys('333333');
  t('tirar senha: com a senha certa tira tudo (hash, sal e Face ID)', TT.lkOn() === false && !TT.lkGet('salt') && !TT.lkGet('cred'), true);
  // Face ID
  await TT.lkSetPin('123456');
  ev(`navigator.credentials={create:async()=>({rawId:new Uint8Array([1,2,3,4]).buffer}),get:async()=>({ok:1})};`);
  await TT.lkAct('lk-face');
  t('Face ID: ligar guarda a credencial e o botão passa a dizer LIGADO', !!TT.lkGet('cred') && /Face ID: LIGADO/.test(TT.lkBlock('nuc')), true);
  w.localStorage.setItem('lock-at', '0'); TT.lkOpen('unlock');
  t('Face ID: na tela de senha aparece o botão Face ID', doc.getElementById('lkFace').style.visibility === 'visible', true);
  await TT.lkKey('face'); await wait(20);
  t('Face ID: se o aparelho confirma, o app abre sem digitar', lk.style.display === 'none', true);
  ev(`navigator.credentials.get=async()=>{throw new Error('no')};`);
  TT.lkOpen('unlock'); await TT.lkKey('face'); await wait(20);
  t('Face ID: se falhar, avisa e a senha continua valendo', lk.style.display === 'flex' && /Não consegui pelo Face ID/.test(lk.textContent), true);
  await TT.lkAct('lk-face');
  t('Face ID: tocar de novo desliga', !TT.lkGet('cred'), true);
  ev(`navigator.credentials.create=async()=>{throw new Error('no')};`);
  await TT.lkAct('lk-face');
  t('Face ID: se o iPhone não deixar ligar, a credencial não é guardada', !TT.lkGet('cred'), true);
  // esqueci a senha
  TT.lkOpen('unlock');
  await TT.lkKey('forgot');
  t('esqueci a senha: mostra o aviso de que vai sair da conta, com os botões Sair e entrar de novo / Voltar', doc.getElementById('lkFg').style.display === '' && /Sair e entrar de novo/.test(doc.getElementById('lkFg').textContent), true);
  await TT.lkKey('forgot-no');
  t('esqueci a senha: Voltar volta ao teclado sem apagar nada', doc.getElementById('lkFg').style.display === 'none' && TT.lkOn() === true, true);
  w.localStorage.setItem('nucleo-sess', '{"a":1}'); w.localStorage.setItem('fin-sess', '{"b":2}'); w.localStorage.setItem('nucleo-cache', 'dados'); w.localStorage.setItem('fin-cache', 'dados');
  await TT.lkKey('forgot'); await TT.lkKey('forgot-ok');
  t('esqueci a senha: apaga a senha e as duas sessões (Núcleo e Financeiro) e as cópias guardadas, e recarrega', !TT.lkOn() && w.localStorage.getItem('nucleo-sess') === '' && w.localStorage.getItem('fin-sess') === '' && w.localStorage.getItem('nucleo-cache') === '' && w.localStorage.getItem('fin-cache') === '' && ev('window.__reloads') === 1, true);
  // voltar do segundo plano
  limpa(); await TT.lkSetPin('123456'); TT.lkOpen('unlock'); await keys('123456');
  const realNow = w.Date.now;
  Object.defineProperty(doc, 'hidden', { get: () => true, configurable: true });
  doc.dispatchEvent(new w.Event('visibilitychange'));
  w.Date.now = () => realNow() + 3 * 60000;
  Object.defineProperty(doc, 'hidden', { get: () => false, configurable: true });
  doc.dispatchEvent(new w.Event('visibilitychange'));
  t('voltar do segundo plano: depois de mais de 2 minutos fora, pede a senha', lk.style.display === 'flex' && TT.LK.mode === 'unlock', true);
  w.Date.now = realNow;
  await keys('123456');
  Object.defineProperty(doc, 'hidden', { get: () => true, configurable: true });
  doc.dispatchEvent(new w.Event('visibilitychange'));
  Object.defineProperty(doc, 'hidden', { get: () => false, configurable: true });
  doc.dispatchEvent(new w.Event('visibilitychange'));
  t('voltar do segundo plano: logo em seguida não pede de novo', lk.style.display === 'none', true);
  limpa();
})());

// --- Planner: visão de mês (v63) ---
const __prevP11 = Promise.all((global.__pend || []).slice());
global.__pend.push((async () => {
  await __prevP11;
  const doc = w.document, q = s => doc.querySelector(s), wait = ms => new Promise(r => setTimeout(r, ms));
  try { w.localStorage.removeItem('plan-mode'); } catch (e) {}
  const rm = (id, d, n) => ({ id, title: 'L' + id, notes: '', date: d, time: '09:00', done: false, list: '', section: '', alarms: [], subtasks: [], images: [], files: [], createdAt: n || 1 });
  const many = []; for (let i = 0; i < 11; i++) many.push(rm('m' + i, '2030-03-12', i));
  ev(`const S=__NUCLEO_TEST__.S;S.ready=true;S.tab='hoje';S.sheet=null;S.conf='del';S.rview='plan';S.pmode='week';S.pm={y:2030,m:2};S.lists=[];S.events=[];S.inbox=[];S.notes=[];S.folders=[];
    S.reminders=${JSON.stringify([rm('a', '2030-03-05'), rm('b', '2030-03-05'), rm('c', '2030-03-20')].concat(many))};
    S.raw={reminders:S.reminders.slice(),lists:[],notes:[],folders:[],events:[],inbox:[]};`);
  q('#tab-lembretes').click(); await wait(20);
  t('planner: tem o seletor Semana | Mês e começa na semana', !!q('#main .plan-seg') && q('#main .plan-seg button.on').textContent === 'Semana' && !q('#main .cal'), true);
  q('#main [data-act="plan-mode"][data-v="month"]').click(); await wait(20);
  t('planner: tocar em Mês mostra a grade do mês com o nome do mês no título e guarda a escolha', !!q('#main .cal') && /Março 2030/.test(q('#main').textContent) && q('#main .plan-seg button.on').textContent === 'Mês' && w.localStorage.getItem('plan-mode') === 'month', true);
  const cell = d => q('#main .cal [data-v="' + d + '"]');
  t('planner mês: cada dia mostra quantos itens tem (2, 1, e "9+" quando passa de 9; sem nada fica sem número)', cell('2030-03-05').querySelector('.pm-n').textContent === '2' && cell('2030-03-20').querySelector('.pm-n').textContent === '1' && cell('2030-03-12').querySelector('.pm-n').textContent === '9+' && cell('2030-03-07').querySelector('.pm-n').classList.contains('no'), true);
  t('planner mês: o dia 1º cai na coluna certa (março de 2030 começa numa sexta: 4 espaços antes) e há 31 dias', Array.from(q('#main .cal').children).filter(c => c.tagName === 'DIV' && !c.classList.contains('cal-h')).length === 4 && q('#main .cal').querySelectorAll('button.cal-d').length === 31, true);
  t('planner mês: o resumo diz quantos itens há no mês', /14 itens neste mês/.test(q('#main').textContent), true);
  t('planner mês: o botão de cada dia diz o dia e a quantidade para leitura de tela', /5 de março, 2 itens/i.test(cell('2030-03-05').getAttribute('aria-label')) && /nada marcado/.test(cell('2030-03-07').getAttribute('aria-label')), true);
  q('#main [data-act="pmonth-next"]').click(); await wait(20);
  t('planner mês: Próximo mês vai para Abril de 2030 (sem itens)', /Abril 2030/.test(q('#main').textContent) && /Nada marcado neste mês/.test(q('#main').textContent), true);
  q('#main [data-act="pmonth-prev"]').click(); await wait(20); q('#main [data-act="pmonth-prev"]').click(); await wait(20);
  t('planner mês: Mês anterior volta para Fevereiro de 2030', /Fevereiro 2030/.test(q('#main').textContent), true);
  q('#main [data-act="pmonth-today"]').click(); await wait(20);
  const n0 = new Date();
  t('planner mês: Ir para este mês volta para o mês de hoje', new RegExp(String(n0.getFullYear())).test(q('#main .sub-hd, #main h1, #main').textContent) && /Este mês/.test(q('#main').textContent), true);
  ev(`__NUCLEO_TEST__.S.pm={y:2030,m:2};`); q('#tab-hoje').click(); ev(`__NUCLEO_TEST__.S.rview='plan';`); q('#tab-lembretes').click(); await wait(20);
  cell('2030-03-05').click(); await wait(20);
  t('planner mês: tocar num dia abre a lista daquele dia (como na semana)', ev(`__NUCLEO_TEST__.S.rview`) === 'd:2030-03-05' && ev(`__NUCLEO_TEST__.S.rfromPlan`) === 1, true);
  ev(`__NUCLEO_TEST__.S.rview='plan';`); q('#tab-hoje').click(); ev(`__NUCLEO_TEST__.S.rview='plan';`); q('#tab-lembretes').click(); await wait(20);
  t('planner: ao voltar do dia, continua na visão de mês', !!q('#main .cal') && q('#main .plan-seg button.on').textContent === 'Mês', true);
  q('#main [data-act="plan-mode"][data-v="week"]').click(); await wait(20);
  t('planner: tocar em Semana volta para a lista de dias da semana e guarda a escolha', !q('#main .cal') && !!q('#main .dayrow') && w.localStorage.getItem('plan-mode') === 'week', true);
  try { w.localStorage.removeItem('plan-mode'); } catch (e) {}
  ev(`const S=__NUCLEO_TEST__.S;S.sheet=null;S.tab='hoje';S.rview=null;S.pmode='week';S.reminders=[];S.raw={reminders:[],lists:[],notes:[],folders:[],events:[],inbox:[]};S.conf='all';`);
})());

// --- Desfazer discreto (v64) ---
const __prevP12 = Promise.all((global.__pend || []).slice());
global.__pend.push((async () => {
  await __prevP12;
  const doc = w.document, q = s => doc.querySelector(s), wait = ms => new Promise(r => setTimeout(r, ms)), TT = w.__NUCLEO_TEST__;
  const nt = (id, title, ts, folder) => ({ id, title, body: '', folder: folder || 'f1', kind: 'nota', checklist: [], files: [], images: [], createdAt: ts, updatedAt: ts });
  const rm = (id, title) => ({ id, title, notes: '', date: '2030-05-01', time: '09:00', done: false, list: '', section: '', alarms: [], subtasks: [], images: [], files: [], createdAt: 1 });
  ev(`const S=__NUCLEO_TEST__.S;S.ready=true;S.tab='hoje';S.sheet=null;S.conf='del';S.rview=null;S.folder=null;S.nx={};S.nn={};S.q='';S.nsOpen=false;
    S.folders=[{id:'f1',name:'Autos'},{id:'f2',name:'Casa'}];S.lists=[];S.events=[];S.inbox=[];
    S.raw={reminders:${JSON.stringify([rm('r1', 'Pagar luz')])},lists:[],notes:${JSON.stringify([nt('n1', 'Jeep', 3), nt('n2', 'Camionete', 2), nt('n3', 'Carretinha', 1)])},folders:S.folders.slice(),events:[],inbox:[]};
    S.reminders=S.raw.reminders.slice();S.notes=S.raw.notes.slice();`);
  const U = TT.U, tap = () => doc.body.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const nota = id => ev(`__NUCLEO_TEST__.S.raw.notes.find(n=>n.id==='${id}')`);
  U.stack.length = 0;
  t('desfazer: o cabeçalho com 5 botões (Hoje) fica com botões menores e o título numa linha só, para o título não quebrar', /\.hd h1\{white-space:nowrap\}/.test(html) && /\.hd-r:has\(> \.iconbtn:nth-child\(5\)\) > \.iconbtn\{width:2\.3rem;height:2\.3rem\}/.test(html), true);
  t('desfazer: no começo não há nada a desfazer e o botão fica escondido', U.stack.length === 0, true);
  q('#tab-hoje').click(); await wait(20);
  t('desfazer: o botão redondo existe no topo de Hoje mas escondido enquanto não há o que desfazer', !!q('#main [data-undobtn]') && q('#main [data-undobtn]').style.display === 'none', true);
  // mudança sem o dedo (automática): não conta
  U.userAt = 0;
  await TT.softDelete('notes', nota('n3')); await wait(450);
  t('desfazer: mudança que não veio de um toque seu (automática) não entra na lista', U.stack.length === 0, true);
  ev(`__NUCLEO_TEST__.Store.put('notes',Object.assign({},__NUCLEO_TEST__.S.raw.notes.find(n=>n.id==='n3'),{deletedAt:undefined}));`); delete 0;
  ev(`(function(){const n=__NUCLEO_TEST__.S.raw.notes.find(x=>x.id==='n3');delete n.deletedAt;})();`);
  // apagar
  tap();
  await TT.softDelete('notes', nota('n1')); await wait(450);
  t('desfazer: apagar uma nota entra na lista com o nome dela', U.stack.length === 1 && U.stack[0].label === 'Apagar nota «Jeep»', true);
  const bt = q('#main [data-undobtn]');
  t('desfazer: depois disso o botão aparece (cor padrão, redondo) e diz o que desfaz para leitura de tela', !!bt && bt.style.display === '' && bt.classList.contains('iconbtn') && /Desfazer: Apagar nota «Jeep»/.test(bt.getAttribute('aria-label')), true);
  // concluir
  tap();
  ev(`__NUCLEO_TEST__.Store.put('reminders',Object.assign({},__NUCLEO_TEST__.S.raw.reminders[0],{done:true}));`); await wait(450);
  t('desfazer: concluir um lembrete entra como "Concluir lembrete"', U.stack.length === 2 && U.stack[1].label === 'Concluir lembrete «Pagar luz»', true);
  // mover
  tap();
  ev(`__NUCLEO_TEST__.Store.put('notes',Object.assign({},__NUCLEO_TEST__.S.raw.notes.find(n=>n.id==='n2'),{folder:'f2'}));`); await wait(450);
  t('desfazer: mover uma nota entra como "Mover nota"', U.stack[2].label === 'Mover nota «Camionete»', true);
  // ordem (3 itens de uma vez = 1 entrada)
  tap();
  ev(`['n1','n2','n3'].forEach((id,i)=>__NUCLEO_TEST__.Store.put('notes',Object.assign({},__NUCLEO_TEST__.S.raw.notes.find(n=>n.id===id),{ord:(i+1)*1000})));`); await wait(450);
  t('desfazer: mudar a ordem de vários itens de uma vez é uma entrada só ("Mudar a ordem")', U.stack.length === 4 && U.stack[3].label === 'Mudar a ordem', true);
  // vários apagados juntos
  tap();
  ev(`['n2','n3'].forEach(id=>__NUCLEO_TEST__.Store.put('notes',Object.assign({},__NUCLEO_TEST__.S.raw.notes.find(n=>n.id===id),{deletedAt:Date.now()})));`); await wait(450);
  t('desfazer: apagar 2 itens de uma vez é uma entrada só', U.stack[4].label === 'Apagar 2 itens', true);
  // editar
  tap();
  ev(`__NUCLEO_TEST__.Store.put('lists',{id:'L9',name:'Mercado',sections:[],color:'#FFB300',createdAt:1});`); await wait(450);
  tap();
  ev(`__NUCLEO_TEST__.Store.put('lists',Object.assign({},__NUCLEO_TEST__.S.raw.lists.find(l=>l.id==='L9'),{name:'Feira'}));`); await wait(450);
  t('desfazer: criar algo novo não entra; editar entra como "Editar lista"', U.stack.length === 6 && U.stack[5].label === 'Editar lista «Feira»', true);
  // mudança sem efeito
  tap();
  ev(`__NUCLEO_TEST__.Store.put('lists',Object.assign({},__NUCLEO_TEST__.S.raw.lists.find(l=>l.id==='L9')));`); await wait(450);
  t('desfazer: gravar sem mudar nada não entra', U.stack.length === 6, true);
  // botão em cada tela
  q('#tab-lembretes').click(); await wait(20);
  t('desfazer: o botão aparece no topo de Lembretes, ao lado do Ordenar e de Ajustes', !!q('#main .hd-r [data-undobtn]') && q('#main .hd-r [data-undobtn]').style.display === '' && q('#main .hd-r [data-undobtn]').nextElementSibling.hasAttribute('data-sortbtn'), true);
  ev(`__NUCLEO_TEST__.S.tab='lembretes';__NUCLEO_TEST__.S.folder='f1';`); q('#tab-notas').click(); await wait(20);
  t('desfazer: dentro de uma pasta de notas o botão fica no cabeçalho (a fileira de botões já está cheia)', !!q('#main header.hd [data-undobtn]') && q('#main header.hd [data-undobtn]').style.display === '', true);
  ev(`__NUCLEO_TEST__.S.tab='hoje';__NUCLEO_TEST__.S.folder=null;__NUCLEO_TEST__.S.rview='l:L9';`); q('#tab-lembretes').click(); await wait(20);
  t('desfazer: dentro de uma lista de lembretes o botão fica na fileira de botões', !!q('#main .notes-tools [data-undobtn]'), true);
  // desfazer de verdade
  ev(`__NUCLEO_TEST__.S.tab='hoje';__NUCLEO_TEST__.S.rview=null;`); q('#tab-lembretes').click(); await wait(20);
  q('#main [data-undobtn]').click(); await wait(30);
  const caixa = q('#askRoot');
  t('desfazer: tocar no botão abre uma pergunta com o que será desfeito (nada acontece sem confirmar)', !!caixa && /Desfazer\?/.test(caixa.textContent) && /Editar lista «Feira»/.test(caixa.textContent) && U.stack.length === 6, true);
  q('#askRoot [data-ask="0"]').click(); await wait(520);
  q('#askRoot [data-ask="0"]') && q('#askRoot [data-ask="0"]').click(); await wait(30);
  t('desfazer: "Agora não" não desfaz nada', U.stack.length === 6 && ev(`__NUCLEO_TEST__.S.raw.lists.find(l=>l.id==='L9').name`) === 'Feira', true);
  q('#main [data-undobtn]').click(); await wait(520);
  q('#askRoot [data-ask="1"]').click(); await wait(80);
  t('desfazer: confirmando, a lista volta para o nome de antes (Mercado) e a ação sai da fila', ev(`__NUCLEO_TEST__.S.raw.lists.find(l=>l.id==='L9').name`) === 'Mercado' && U.stack.length === 5, true);
  t('desfazer: desfazer não cria nova entrada (não dá para desfazer o desfazer por engano)', U.stack.length === 5, true);
  // apagar 2 itens -> voltar
  q('#main [data-undobtn]').click(); await wait(520); q('#askRoot [data-ask="1"]').click(); await wait(80);
  t('desfazer: "Apagar 2 itens" devolve as duas notas', !nota('n2').deletedAt && !nota('n3').deletedAt && U.stack.length === 4, true);
  // ordem
  q('#main [data-undobtn]').click(); await wait(520); q('#askRoot [data-ask="1"]').click(); await wait(80);
  t('desfazer: "Mudar a ordem" tira os números de ordem de volta', nota('n1').ord === undefined && nota('n2').ord === undefined && U.stack.length === 3, true);
  // mover
  q('#main [data-undobtn]').click(); await wait(520); q('#askRoot [data-ask="1"]').click(); await wait(80);
  t('desfazer: "Mover nota" devolve a nota para a pasta de antes (Autos)', nota('n2').folder === 'f1', true);
  // concluir
  q('#main [data-undobtn]').click(); await wait(520); q('#askRoot [data-ask="1"]').click(); await wait(80);
  t('desfazer: "Concluir lembrete" reabre o lembrete', ev(`__NUCLEO_TEST__.S.raw.reminders[0].done`) === false, true);
  // apagar nota
  q('#main [data-undobtn]').click(); await wait(520); q('#askRoot [data-ask="1"]').click(); await wait(80);
  t('desfazer: "Apagar nota" traz a nota de volta e, com a fila vazia, o botão some', !nota('n1').deletedAt && U.stack.length === 0 && q('#main [data-undobtn]').style.display === 'none', true);
  // limite
  for (let i = 0; i < 14; i++) { tap(); ev(`__NUCLEO_TEST__.Store.put('lists',Object.assign({},__NUCLEO_TEST__.S.raw.lists.find(l=>l.id==='L9'),{name:'V${i}'}));`); await wait(400); }
  t('desfazer: guarda só as últimas 12 ações', U.stack.length === 12, true);
  U.stack.length = 0;
  ev(`const S=__NUCLEO_TEST__.S;S.sheet=null;S.tab='hoje';S.rview=null;S.folder=null;S.lists=[];S.folders=[];S.notes=[];S.reminders=[];S.raw={reminders:[],lists:[],notes:[],folders:[],events:[],inbox:[]};S.conf='all';`);
})());
// --- etiquetas: #número não é etiqueta (v65) ---
t('etiquetas: #589 e #882 (só número) não viram etiqueta', JSON.stringify(ev('__NUCLEO_TEST__.tagsOf({title:"x #589",body:"ref #882 e #12"})')), '[]');
t('etiquetas: #consulta e #2026-meta continuam valendo', JSON.stringify(ev('__NUCLEO_TEST__.tagsOf({title:"",body:"#consulta #2026-meta #589"})')), '["consulta","2026-meta"]');
// --- editar nota e pasta direto da lista (v66) ---
t('lista: no modo Editar cada nota e cada pasta tem botão ⋯', /editBtn\('edit-note'/.test(html) && /editBtn\('edit-folder'/.test(html), true);
// --- títulos editáveis das partes de cada pasta (v67) ---
t('pasta: títulos das partes (notas e pastas) podem ser mudados', /fo\.secN/.test(html) && /data-bind="secN"/.test(html) && /data-bind="secP"/.test(html), true);
Promise.all(global.__pend || []).then(() => { console.log(ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0); });
