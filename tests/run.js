// Testes do Núcleo. Uso: cd tests && npm install && npm test
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const vc = new VirtualConsole();
vc.on('jsdomError', e => console.log('erro no app:', String(e.message).slice(0, 200), (e.detail && e.detail.stack || '').split('\n').slice(0,3).join(' | ')));
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://nucleo51.github.io/nucleo/', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) { w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, addEventListener() {} })); w.scrollTo = () => {}; } });
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

console.log(ok + ' ok, ' + bad + ' falhas');
process.exit(bad ? 1 : 0);
