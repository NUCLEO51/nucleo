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

t('pasta Documentos (modelo em branco)', /data-act="make-docs"/.test(html) && /'make-docs':async/.test(html), true);

t('caixa de entrada: campo rápido, selo na aba, caixa única com cartões', !/id="qcapIn"/.test(html) && /f\.focus\(\{preventScroll/.test(html) && /tab-badge/.test(html) && /inb-card/.test(html) && /'loose-del'/.test(html) && !/Organizar um por um<\/button>/.test(html), true);
t('caixa de entrada sempre visível', /Tudo organizado ✓/.test(html), true);
t('notas: pastas antes dos filtros', html.indexOf('id="notesFolders"') < html.indexOf('<label for="q"') && /function notesFolders\(\)/.test(html), true);

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
  t('notas: Escanear, Nova nota e Desenhar no topo, antes do Ajustes', iS > 0 && iS < iN && iN < iD && iD < iA, true);
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

console.log(ok + ' ok, ' + bad + ' falhas');
process.exit(bad ? 1 : 0);
