# GUIA DO NÚCLEO E DO Financeiro PARA O CHATGPT — v2.0 — 16/10/2026

Escrito pelo NCLD512 (Claude), a pedido do Marcelo, para o ChatGPT conseguir operar o **Núcleo** e o **Financeiro** por completo.
Estado descrito: **Núcleo v48** (commit `a79c756` na `main`, 145 testes automáticos) e **Financeiro v1** (código de 14/10/2026).
Este guia **não contém nenhum segredo** e nunca deve conter. Substitui a v1.0 de hoje cedo.
Cópias: repositório `docs/GUIA-CHATGPT-NUCLEO.md` (https://github.com/NUCLEO51/nucleo) e Documento no Drive, pasta `02_OPERACAO_NUCLEO`. Em caso de diferença, vale a mais recente.

## SUMÁRIO
- Parte 0 — Leia primeiro (bloco para colar no ChatGPT)
- Parte 1 — O ecossistema e onde está cada coisa
- Parte 2 — NÚCLEO: arquitetura, regras de interface e navegação
- Parte 3 — NÚCLEO: cada tela, com todos os detalhes
- Parte 4 — NÚCLEO: dados, sincronização e segurança
- Parte 5 — NÚCLEO: alarmes, Siri, Relógio e backup
- Parte 6 — Financeiro: o sistema de dinheiro, completo
- Parte 7 — Trabalho com código: testes, publicação e regras
- Parte 8 — Histórico completo de versões
- Parte 9 — Estado atual, comprovado e não comprovado, pendências
- Parte 10 — Armadilhas, receitas e perguntas frequentes

---

## PARTE 0 — LEIA PRIMEIRO (cole isto no ChatGPT)

> Você vai ajudar o Marcelo com dois sistemas pessoais dele: o **Núcleo** (lembretes, notas, agenda) e o **Financeiro** (contas do mês, cartões, dívidas). Leia o guia inteiro antes de agir.
> Regras que não mudam:
> 1. A autoridade final é o Marcelo. Faça só o que ele pedir **nesta conversa**. Achar um defeito ou ter uma ideia não autoriza a executar.
> 2. Fale em **português simples e curto**, começando pela resposta. Explique termo técnico em português. Ele tem dificuldade com letra pequena: nas telas que você criar, **texto grande e botões grandes**.
> 3. O app dele **pede confirmação antes de salvar, apagar ou editar**. Qualquer tela nova segue isso.
> 4. **Nunca** escreva, peça ou repita senha, token, código da Siri, chave secreta ou `service_role`. Nunca guarde número inteiro de cartão, validade ou código de segurança.
> 5. **Dinheiro:** nem o Financeiro nem você pagam, transferem, contratam ou negociam nada. Só organizam e lembram; quem paga é o Marcelo. Valores em **centavos inteiros**; dado que não se sabe é `null`, **nunca zero**.
> 6. Nada de apagar de vez. Apagar = lixeira (`deleted_at`).
> 7. Diga sempre o que foi **feito e comprovado**, o que foi **feito sem prova**, o que **não foi feito** e o que **depende dele**. Não declare "funcionou" sem prova.
> 8. Mudança no código: em **branch**, com **tag de volta** antes, **testes** rodando, e só junte na `main` com autorização dele (Parte 7).
> 9. Documentos do NCLD512 no Drive (HV, HVI, EAO, Prompt Master) são **somente leitura** para você.
> 10. Dados reais do Marcelo e da família dele são **privados**. Não os copie para lugares públicos (o repositório é público).
> 11. Na dúvida entre duas leituras do pedido, faça **uma pergunta curta** ou escolha a mais segura e diga qual escolheu.
> 12. Ao terminar, diga o que ele precisa **conferir no iPhone**, em passos curtos ("feche e abra o Núcleo, toque em…").

---

## PARTE 1 — O ECOSSISTEMA E ONDE ESTÁ CADA COISA

### 1.1 Pessoas
- **Marcelo** — dono de tudo. Autoridade final. Usa iPhone. Prefere letras grandes, botões grandes, confirmação antes de salvar, português simples.
- **Marlene (mãe)** — a mãe do Marcelo. No Financeiro aparece como `MARLENE` («Marlene (mãe)»). As finanças dela e as dele são **separadas** no Financeiro por titular (`holder`) e por quem paga (`payer`).
- **Elisa** — pessoa para quem o Marcelo mantém uma lista de lembretes própria no Núcleo.

### 1.2 Sistemas
| Sistema | O que é | Onde |
|---|---|---|
| **Núcleo** | App pessoal (PWA): lembretes, notas, agenda, relógio, busca | https://nucleo51.github.io/nucleo/ |
| **Financeiro** | App de dinheiro, **separado** do Núcleo: contas do mês, cartões, dívidas, extratos, plano de quitação | https://nucleo51.github.io/nucleo/fin/ |
| **Código** | Repositório público do Núcleo e do Financeiro | https://github.com/NUCLEO51/nucleo (branch `main` = publicado) |
| **Banco** | Supabase pessoal gratuito: banco, login e arquivos (anexos) | endereço e chave **pública** na constante `CFG` de `index.html` e de `fin/index.html` |
| **Drive** | Casa do NCLD512: identidade, regras e histórico | pasta `1HLATmmVC9ZKolS5nNV-Zh4w2KubMzwo9` |
| **Trello** | Painel de acompanhamento do NCLD512 (só projeção; a verdade está no Drive) | quadro «NCLD512» |
| **Mac do Marcelo** | Cópia do código para trabalhar | `~/Projects/nucleo` (git e `gh` já logados) |

### 1.3 Agentes (quem faz o quê)
- **NCLD512** — núcleo técnico Claude. **Dono técnico do Núcleo** e do app Financeiro. Mantém HV/HVI/EAO no Drive. Escreveu este guia.
- **ChatGPT / Helena** — ajuda o Marcelo; **não** assume a autoridade do NCLD512 sobre o histórico e os documentos canônicos.
- **FIN512** — o *owner financeiro do ecossistema* (outro agente). **Não é o app Financeiro.** Construir o app Financeiro não dá autoridade sobre as finanças do Marcelo.
- Outros (COM, GDA512 etc.) existem no ecossistema CEO512 OS; o COM coordena os chats. Só o NCLD512 escreve nos documentos dele.

### 1.4 Documentos canônicos do NCLD512 no Drive (só leitura para você)
CHAVE, ENTRADA, IDENTIDADE, Prompt Master v1.2, EAO (ponteiro de estado), HVI (índice do histórico), HV B001 (histórico vivo), BOOT RUNTIME, MAPA OPERACIONAL. O comando `@BOOT` faz o NCLD512 reconstruir identidade e estado a partir deles.

---

## PARTE 2 — NÚCLEO: ARQUITETURA, REGRAS DE INTERFACE E NAVEGAÇÃO

### 2.1 O que é
App pessoal do Marcelo, instalado no iPhone como **PWA** (página que vira app). Substitui Todoist, Notas, Lembretes e Agenda. Ao abrir pede **e-mail e senha** (login do Supabase). Os dados ficam na nuvem; sem internet o que ele salvar fica numa **fila** no aparelho e sobe depois.

### 2.2 Arquivos do repositório
- `index.html` — o Núcleo inteiro (HTML, CSS e scripts). Cerca de 3.100 linhas.
- `sw.js` — service worker: guarda o app para abrir sem internet e recebe os avisos (push). A constante `V` é o nome do cache (`nucleo-app-v48`).
- `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `logo.svg` — instalação e ícone (caveira verde neon).
- `fin/` — o Financeiro (Parte 6): `index.html`, `sw.js`, `manifest.webmanifest`, ícones e `API.md`.
- `supabase/001..011_*.sql` — o banco, na ordem em que foi criado (Parte 4 e 6), e `supabase/functions/enviar-alarmes/index.ts` (função dos avisos).
- `tests/` — testes automáticos (`cd tests && npm install && npm test`); `tests/run.js` é o arquivo único dos testes.
- `docs/` — este guia. `README.md` aponta para ele.

### 2.3 Como o `index.html` é montado (importante para mexer no código)
- **Três scripts.** (1) o script com `id="lib"`: funções puras que os testes enxergam direto (`parseCapture` — entende frases de data/hora; `repNext` — próxima repetição etc.). (2) O **script principal**, dentro de uma função isolada com `'use strict'`: estado, banco, telas, ações. (3) Um pequeno script do botão flutuante «← Voltar».
- **Estado global `S`:** aba atual (`S.tab`), página aberta em Lembretes (`S.rview`), pasta aberta em Notas (`S.folder`), busca (`S.q`, `S.nsOpen`), setinhas abertas (`S.nx`, `S.nn`, `S.lc`), ajustes (`S.fs` tamanho, `S.conf` confirmação, `S.theme`), folha aberta (`S.sheet`), etc. Os itens ficam em `S.reminders`, `S.notes`, `S.events`, `S.inbox`, `S.folders`, `S.lists` (versões filtradas de `S.raw`, que guarda tudo; `partition()` recalcula uma a partir da outra).
- **`render()`** redesenha a aba atual e **preserva a rolagem**. **`go(fn)`** executa `fn`, redesenha e **volta ao topo**. Para abrir/recolher sem pular a tela, use `render()` direto.
- **Ações por toque:** todo botão tem `data-act="nome"` e um objeto de ações (`A`) trata o clique por delegação (um único ouvinte no documento). Para criar um botão novo: `data-act` + uma entrada em `A`.
- **Folhas (`sheet`):** telas que sobem por cima (formulários, leitura, Ajustes). Tipos: `rem` (lembrete), `remv` (leitura do lembrete), `note`, `notev`, `ev`, `cap` (Anotar), `set` (Ajustes), `folder`, `list`. A confirmação usa `ask({title,msg,ok})`; a escolha de destino usa `pickMove({title,options})`.
- **Gancho de teste:** `window.__NUCLEO_TEST__` (só existe quando os testes o definem antes de carregar) expõe `S` e algumas funções (`viewHoje`, `viewNotas`, `viewLembretes`, `planView`, `gsFind`…). Para testar uma função nova, acrescente-a ao objeto (perto de `buildTabs();render();Store.init();`).
- **Versão:** duas constantes que andam juntas — `APP_V` em `index.html` e `V` em `sw.js`. Toda mudança publicada sobe as duas (v48 → v49…), para o iPhone trocar o cache.
- **Ícones:** todos em SVG dentro de um objeto `ICONS`, chamados por `ic('nome', tamanho, traço)`. Nomes: speaker, gear, plus, check, pin, repeat, bell, left, right, folder, folderPlus, note, noteplus, brush, eye, eyeoff, list, scan, edit, clip, trash, inbox, cal, calgrid, alert, search, undo, redo, close…

### 2.4 Requisitos de interface (do Marcelo — valem para tudo)
- **Letra pequena é difícil para ele:** texto grande, botões grandes, bom contraste. Tamanho geral em Ajustes › Tamanho do texto: Normal 18, Grande 20 (padrão), Maior 23, Máximo 26 px. **O tamanho-base é 20 px** e tudo é em `rem`.
- **Largura do iPhone (cerca de 390 px):** cabem **no máximo 4 botões redondos ao lado do título**; mais que isso o título quebra em várias linhas. Por isso a fileira de botões de Notas fica **abaixo** do título.
- **Confirmação:** Ajustes › Pedir confirmação: «Em tudo» (pergunta antes de salvar, concluir, apagar ou descartar) ou «Só ao apagar». Sair sem salvar e apagar sempre perguntam. A pergunta tem um **atraso de 0,45 s** para um toque sem querer não confirmar.
- **Sem tela sem saída:** toda tela tem Voltar ou Fechar. Se a tela estiver ampliada (zoom), aparece um botão amarelo flutuante «← Voltar» no canto visível.
- **Mudança de aparência pedida para uma área vale só para ela** (a letra maior das notas não aumenta o resto do app).
- Português simples em tudo; sem jargão.

### 2.5 Navegação geral
- **Barra de baixo:** Hoje · Lembretes · Agenda · Notas, mais o **+ amarelo** no meio (Anotar rápido). Não há contador na aba Hoje.
- **Reinício ao sair:** ao trocar de aba, **Notas e Lembretes voltam sozinhos à página inicial** (pasta, busca, setinhas, página de lista/dia/Planner são zerados). Tocar de novo na aba em que já está também volta ao início.
- Páginas abertas a partir do Hoje (Lembretes hoje, Atrasados) têm o Voltar «Hoje» e retornam para lá.
- A tela **Relógio**, a **Busca geral** e a **Caixa de entrada** são telas cheias abertas a partir do Hoje, com Voltar «Hoje».

---

## PARTE 3 — NÚCLEO: CADA TELA, COM TODOS OS DETALHES

### 3.1 Hoje
- **Topo:** o **dia da semana** (ex.: «Sexta-feira») e a **data** («16 de outubro») em letra bem grande, e o «Salvo ✓» pequeno. Depois o título «Hoje» e três botões redondos: **busca (lupa)**, **ouvir (alto-falante)** e **ajustes (engrenagem)**.
- **Quatro botões grandes com número** (não há mais listas embaixo; cada um abre uma **página inteira**, com Voltar «Hoje»):
  - **Lembretes hoje** — só os de hoje, não feitos.
  - **Agenda hoje** — abre a Agenda no dia de hoje.
  - **Atrasados** — os atrasados (inclui os de hoje cuja hora já passou), com o botão «Passar os atrasados para hoje» (só move os de dias anteriores).
  - **Caixa de entrada** — anotações soltas e lembretes sem data (3.5).
- Depois: **Enviar ao Financeiro** e **Abrir o Financeiro** (Parte 6) e, por último, o botão **Cronômetro e temporizador** (3.12).
- **Ouvir** lê o dia em voz alta com a voz do iPhone (exige áudio liberado e botão de silêncio desligado).
- A tela Hoje **não** usa as bolinhas neon (pedido do Marcelo: «está perfeito»).

### 3.2 Anotar rápido (botão + amarelo)
- Abre a folha «Anotar» com um campo grande e botões «Salvar como»: **Automático, Lembrete, Compromisso, Nota, Caixa de entrada**. O modo automático decide pelo texto.
- O texto é entendido por **regras** (não é IA): `parseCapture` em `index.html`, coberto por testes. Exemplos que **funcionam e têm teste**: «Dentista amanhã às 15h», «Tomar remédio de 8 em 8 horas», «Regar planta a cada 2 dias», «Consulta sexta da semana que vem», «Pagar conta semana que vem» (= a segunda seguinte), «Pagar aluguel todo dia 31». Também reconhece datas escritas («dia 20», «20/10»), dias da semana, horário («às 15h», «15:30»), **avisos antes** («uma hora antes», «30 minutos antes», «um dia antes», «meia hora antes») e **alarme forte** («alarme forte», «alarme no relógio», «despertador»). **Hora de 1 a 6 sem «manhã» vira tarde** e o resumo avisa. Para saber se uma frase nova funciona, rode-a em `parseCapture` (ou veja os testes) em vez de supor.
- Mostra um **resumo** («Lembrete · amanhã · 10:00 · avisa 1 hora antes») **antes de salvar**.
- Botões «Lembrete completo», «Compromisso completo» e «Nota completa» abrem o formulário completo levando o texto já escrito. O botão «Criar também no Relógio» liga o alarme forte.
- Dica de voz: o teclado do iPhone tem ditado por microfone.

### 3.3 Busca geral (lupa do Hoje)
Tela «Buscar em tudo» com campo grande; o teclado abre sozinho. Procura, **sem acento e sem diferenciar maiúscula**, e com várias palavras **exige todas**: lembretes (título, observações, subtarefas, nomes de anexo, nome da lista), compromissos (título, observações), notas (título, texto, itens, nomes de arquivo, nome da pasta), caixa de entrada, pastas e listas. Resultados em grupos com contagem; cada resultado mostra um trecho de onde achou; tocar abre o item. Mínimo de 2 letras; até 40 por grupo.

### 3.4 Lembretes — início
- Campo «Buscar lembretes», o botão **Planner** (3.6), os **atalhos** com número: **Todos, Hoje (inclui os atrasados), Programados, Atrasados, Urgentes, Fixados, Concluídos**, as **Listas** (3.7) e Apagados.
- **Lembrete sem lista** pertence à lista padrão «Lembretes».
- Ao sair de Lembretes para outra aba, volta sozinho a esta página.

### 3.5 Caixa de entrada
Tela cheia («Caixa de entrada», «N itens para decidir»). Contém: (a) **anotações soltas** (do Anotar com «Caixa de entrada» ou da **Siri**, com «via siri»), cada uma com **Dar data / Virar nota / Descartar**; (b) **lembretes sem data e sem lista** que ainda não foram «guardados», com **Dar data / Virar nota (só os simples) / Deixar assim / Descartar**. «Deixar assim» tira da caixa e deixa o lembrete guardado em Lembretes › Todos. Um lembrete que está dentro de uma **lista** não aparece na caixa.

### 3.6 Planner (dentro de Lembretes)
- **Botão Planner** na página inicial: mostra a semana («12 a 18 de outubro»), o «Hoje N» e uma **bolinha por dia** (S T Q Q S S D; cheia e verde neon quando o dia tem itens; hoje com contorno amarelo).
- **Página do Planner:** os dias em lista (segunda a sexta sempre; **sábado e domingo só se tiverem itens**), cada um com o nome do dia, a data e o número em bolinha neon. Botões semana anterior / «Esta semana» / próxima. Tocar num dia abre a **página do dia** (lembretes, avisos e compromissos daquele dia, com anterior/próximo/hoje), e o Voltar volta ao Planner.
- Ainda **não existe** visão de mês do Planner (pendência).

### 3.7 Listas e páginas de lista
- **Listas** têm **nome, cor e seções**. Criar: Lembretes › Listas › Nova lista; editar: lápis na página da lista (renomear, cor, seções, apagar).
- **Paleta viva (v48):** amarelo `#FFB300`, vermelho `#FF3B30`, laranja `#FF7A00`, verde `#1FC95B`, roxo `#A855F7`, azul `#2F8CFF`, cinza `#98A2B3`, rosa `#FF2D87`. Listas antigas gravadas com cores apagadas passam a mostrar a viva por **tradução** (`MIDL`/`OLDL` → `LCOL`), sem mexer no banco. Em cor clara o ícone do quadradinho fica escuro (`inkOn`).
- **Página de lista (v47):** título colorido, **botões no topo** — **+** novo lembrete (já dentro da lista), **olho** ocultar/mostrar concluídos, **lápis** editar a lista —, e logo abaixo as **seções**. **Cada seção, «Sem seção» e «Concluídos» tem uma setinha que recolhe e abre**, com a contagem em bolinha. Lista sem seções mostra os lembretes direto e o botão «Criar seções nesta lista». O estado das setinhas zera ao sair de Lembretes.
- **Ocultar concluídos** é por lista e fica guardado neste aparelho.

### 3.8 O lembrete
- **Campos:** título; observações; data; hora; repetição (nenhuma, diária, semanal, mensal, anual, personalizada com dias/intervalo e «até»); prioridade (Nenhuma, Baixa !, Média !!, Alta !!!); **fixar no topo**; **lista e seção**; **subtarefas** (marcáveis); **avisos** (vários, «X minutos/horas/dias antes», com mensagem opcional); **alarme forte** (cria também no Relógio do iPhone, 5.4); fotos; arquivos; «aparecer na agenda».
- **Tela de leitura (ao tocar):** título grande, etiquetas (Feito, Fixado, Alarme forte, Prioridade), caixa com Quando / Repetição / Lista (›seção) / Prioridade, o botão **Mover para outra lista**, os alarmes (com o horário real de cada um e botão de criar no Relógio), subtarefas, observações, fotos, arquivos. Rodapé: **Ouvir · Concluir/Reabrir · Editar**.
- **Mover (v48):** «Mover para outra lista» abre uma escolha em **botões grandes com a cor de cada lista**, com as **seções recuadas** e a posição atual marcada «agora». Com «Pedir confirmação: Em tudo», pergunta «Mover para…?» antes. Depois, a tela de leitura mostra o lugar novo e um aviso diz para onde foi. Escolher onde já está não faz nada.
- **Concluir** pede confirmação (conforme o ajuste); lembrete repetido, ao concluir, vai para a próxima data. **Apagar** vai para «Apagados» (30 dias).
- **Sem data** é permitido: o lembrete vira «só para lembrar» (aparece em Todos, e na Caixa se não estiver em lista).

### 3.9 Agenda
Título «Agenda · só para consultar». **Calendário do mês** (semana começa na segunda), setas de mês, «Este mês»/«Voltar para hoje». Cada dia tem um pontinho quando há itens. Tocar num dia mostra a lista dele (compromissos e lembretes com horário), o botão **Marcar compromisso** (título, data, hora, observações, repetição) e a seção **Próximos 7 dias**.

### 3.10 Notas
- **Início:** título «Notas» com a engrenagem; logo abaixo a **fileira de botões redondos: Escanear · Nova nota · Desenhar · Buscar**. Depois: **Pastas** (Geral + pastas, cada uma com a contagem em bolinha, e **Nova pasta**), **Ver as notas por tipo** (Todas, Fixadas, Scans e documentos, Desenhos, Com arquivos), **Etiquetas** (`#palavra` no texto da nota, com contagem) e **Apagados recentemente** (30 dias).
- **Dentro de uma pasta:** título, fileira **Escanear · Nova nota · Desenhar · Nova subpasta · Buscar · lápis** (renomear, mover ou apagar a pasta). Tudo é criado **dentro** da pasta aberta (em «Todas as notas», Fixadas etc. cria sem pasta).
  - **Ordem:** primeiro as **notas da pasta**, em um bloco com setinha para **recolher** (mostra a contagem); depois as **subpastas**.
  - **Notas são cartões separados**, com espaço entre eles, **borda colorida por tipo** (amarela nota, verde lista de itens, azul scan, roxa desenho) e letra um pouco maior só nelas (título 1,15 rem, linha da data 0,95 rem).
  - **Subpastas:** cada uma tem uma **setinha que abre e recolhe ali mesmo** (mostra as notas dela e as subpastas de dentro, em **qualquer nível**) e o **número de notas** dentro (inclui as das subpastas), em bolinha neon. Tocar no **nome** abre a pasta numa página própria.
  - **Buscar** abre o campo («Buscar em NOME DA PASTA») com o teclado; procura **só naquela pasta e nas subpastas**; o X fecha e limpa. No início de Notas procura em todas as notas.
- **Nota:** título, texto, tipo (nota, scan, desenho, ideia), fixar, pasta, **itens de lista** (marcáveis), imagens, arquivos e desenho. Tela de leitura com **Mover para outra pasta** (escolha com «Geral (sem pasta)» e todas as pastas com o caminho, ex.: «Elisa › Documentos»), Ouvir e Editar.
- **Escanear:** abre a câmera do iPhone (`capture="environment"`); a foto vira uma nota de tipo scan na pasta aberta. Precisa de permissão de edição de arquivos.
- **Desenhar:** editor com grade. Ferramentas: caneta, lápis, marca-texto, borracha, linha, seta, retângulo, círculo; 9 cores; espessura; fundos (quadriculado, pontilhado, pautado, liso, quadro escuro); desfazer/refazer; reabre para editar um desenho já salvo.
- **Pastas:** nome e pasta-mãe (qualquer profundidade); apagar pasta vai para a lixeira.
- **Etiquetas:** escreva `#saude` no texto; a etiqueta aparece no início de Notas.
- Ao sair de Notas, tudo volta ao início.

### 3.11 Bolinhas neon (contagens)
Números de contagem no **Planner** e em **Notas** aparecem dentro de bolinhas **verde-neon `#39FF14` com o número PRETO** (`#000`); **zero** aparece só com contorno neon. Função `cnt(n, pequeno, rótulo)`. A tela Hoje e os números das listas/atalhos de Lembretes **não** usam (decisão do Marcelo; podem passar a usar se ele pedir).

### 3.12 Relógio (Hoje › Cronômetro e temporizador)
- **Cronômetro:** Iniciar/Parar/Continuar/Zerar e **Volta** (tabela de voltas com melhor e pior).
- **Temporizador:** atalhos 1, 5, 10, 15, 30, 45 min e 1 h; ajuste ±1 min; Iniciar/Pausar/Zerar; «⏱ Acabou!». Com o app **fechado**, o fim do temporizador avisa pelo servidor (alarme com chave `tempo|…`), **em até 1 minuto depois** — precisa dos avisos ligados em Ajustes.

### 3.13 Ajustes (engrenagem)
Tamanho do texto · Pedir confirmação · Aparência (Automático, Claro, Escuro) · Onde ficam os dados · **Envio para a nuvem** (última vez salvo, itens esperando internet, itens com erro, «Enviar agora», «Tentar de novo») · **Avisos de alarme com o app fechado** (estado, «Ligar avisos neste aparelho», «Testar») · painel **Saúde do app** (registro de erros) · **Financeiro** (botão «Abrir o Financeiro») · **Exportar backup (arquivo)** e **Importar backup (arquivo)** (aviso quando o último backup tem mais de 7 dias) · **Sair da conta**.

### 3.14 Anexos e arquivos
Fotos e arquivos de lembretes e notas ficam no **bucket privado `anexos`** do Supabase, cada pessoa só na própria pasta (`id-do-dono/arquivo`). Limite do app: **45 MB** por arquivo. Apagar de vez um lembrete/nota **não apaga** um arquivo que outro item ainda usa (proteção da v36). Um anexo que sumiu mostra uma mensagem clara.

---

## PARTE 4 — NÚCLEO: DADOS, SINCRONIZAÇÃO E SEGURANÇA

### 4.1 A tabela `public.items` (uma linha por item)
| coluna | significado |
|---|---|
| `id` | uuid da linha |
| `owner` | dono (login do Marcelo); **nunca muda** (o gatilho `items_guard` força) |
| `kind` | `reminder`, `note`, `event`, `inbox`, `folder`, `list` |
| `data` | JSON com os campos do item (4.2) |
| `version` | controle de conflito: o `UPDATE` só vale se enviar a versão **atual**; o servidor soma 1 e guarda a anterior em `item_history` |
| `deleted_at` | lixeira (apagar = preencher; **não existe DELETE** pela API) |
| `updated_by` | quem mexeu: `app`, `claude`, `helena`, `siri`, `chat` |
| `created_at`, `updated_at` | datas |

**Regras do banco:** RLS ligado em todas as tabelas — só o dono lê e altera. Gatilhos: `items_guard` (soma versão, grava histórico, protege `owner`), `fin_guard` (o mesmo para o Financeiro). Não há política de DELETE: nada some de verdade.

### 4.2 Formato do `data` por tipo (o campo `_id` pode repetir o id local)
- **reminder:** `title, notes, date (AAAA-MM-DD ou vazio), time (HH:mm ou vazio), repeat (none|daily|weekly|monthly|yearly|custom), repN, repU (day|week|month|year), repDays[], repUntil, repAnchor?, agenda (bool), list (id da lista ou vazio), section (id da seção ou vazio), flag, priority 0–3, pinned, strong (alarme forte), alarms[{id,min,msg}], subtasks[{t,done}], images[], files[{id,name,size,type}], done, doneAt, noInbox (true = «Deixar assim», some da Caixa de entrada), createdAt, updatedAt`.
- **note:** `title, body, kind (nota|scan|desenho|ideia), pinned, folder (id da pasta ou vazio), checklist[{t,done}], images[], files[], drawSrc{imagem→traços}, createdAt, updatedAt`.
- **event:** `title, date, time, notes, repeat…` (mesmos campos de repetição do lembrete).
- **folder:** `name, parent` (id da pasta-mãe; vazio = nível de cima).
- **list:** `name, color (hex), sections[{id,t,done}]`.
- **inbox:** `text, source (siri ou vazio), createdAt`.
- Datas sempre `AAAA-MM-DD`; horas `HH:mm`; tempos em milissegundos desde 1970 (`Date.now()`).

### 4.3 Como o app sincroniza (`Supa`)
Login por e-mail/senha (sessão em `localStorage`). Cada alteração vai para uma **fila** (`nucleo-q`) e é enviada por REST (`/rest/v1/items`) com a `version` atual; se outro aparelho mudou o item, o envio é recusado e o app recarrega. Itens que falham várias vezes vão para a lista «com erro» (Ajustes). O app mantém uma **cópia local** (`nucleo-cache`), um mapa de ids local↔servidor (`nucleo-map`) e a sessão (`nucleo-sess`). Outros guardados no aparelho: `nucleo-hidedone` (concluídos ocultos por lista), `nucleo-draw` (preferências do desenho), tamanho do texto, tema e confirmação.

### 4.4 Outras tabelas (todas com RLS)
`item_history` (cada versão antiga), `alarms` (avisos agendados; chave `key` única), `alarm_repeats` (repetições de aviso), `push_subscriptions` (aparelhos que recebem aviso), `push_config` e `app_secrets` (**chaves e código — fechadas: ninguém lê pela API; nunca copie nem mostre**), `fin_records` (Financeiro, Parte 6).
**Funções do banco (schema public):** `alarmes_fortes`, `chamar_alarmes`, `siri_captura`, `fin_guard`, `items_guard`, `rls_auto_enable` (ajuda do próprio Supabase). **Função de borda:** `enviar-alarmes` (versão 6). **Não existe** a função `fin_chat` (o SQL 006 não foi aplicado).

### 4.5 Estado do banco em 16/10/2026 (somente contagens, lidas hoje)
`items` cerca de 90 linhas · `item_history` 122 · `alarms` 15 · `push_subscriptions` 4 · `app_secrets` 1 · `push_config` 1 · `alarm_repeats` 0 · `fin_records` 19. Hoje o NCLD512 criou, **a pedido do Marcelo**, 5 listas novas com cor e seções (Contas e dinheiro, Documentos, Casa, Saúde, Quando der) e um lembrete sem data; as listas antigas (TAREFAS, ELISA, THOR) não foram tocadas.

### 4.6 Como ler e escrever com segurança (se você tiver acesso ao banco)
1. **Só com ordem do Marcelo para aquele ato.** Comece por uma leitura e, para escrever, por **um item de teste que ele veja**. **Escrita do ChatGPT no banco nunca foi testada.**
2. Escrever em `items`: `owner` = o dono (usuário do Marcelo), `kind` correto, `data` no formato 4.2, `updated_by` = `helena` (ou `chat`). Para **alterar**, envie a `version` atual. **Nunca DELETE**; apagar = `deleted_at`.
3. **Uma única instrução SQL** com tudo que precisa (tudo ou nada) é mais segura que várias. Exemplo de molde (listas e um lembrete dentro de uma lista), sem dados reais:
   - inserir `kind='list'` com `data` = `{"_id": id, "name": "...", "color": "#B5584E", "sections": [{"t": "...", "id": "sec-x", "done": false}], "createdAt": ms, "updatedAt": ms}`;
   - inserir `kind='reminder'` com `data.list` = id da lista e `data.section` = id da seção; `data.date` e `data.time` vazios = «sem data».
4. Depois de gravar, **releia** e confira (nome, cor, seção, lugar do lembrete). O app mostra os itens novos quando for **fechado e aberto** de novo.
5. SQL que **cria tabela, função, gatilho ou apaga dados** (migrações) só o Marcelo executa ou autoriza, **um por um**. Não use `service_role`. O sistema às vezes **cancela migrações** feitas por conectores; leituras e SQL simples funcionam.

---

## PARTE 5 — NÚCLEO: ALARMES, SIRI, RELÓGIO E BACKUP

### 5.1 Alarmes com o app fechado (comprovado no iPhone em 14/10/2026)
1. O app grava em `alarms` um registro por aviso (chave = item + aviso + horário + resumo da mensagem). Apaga os que não reconhece (exceto chaves `teste|…` e `tempo|…`).
2. Um agendador do banco (**pg_cron**, trabalho `nucleo-alarmes`) chama `public.chamar_alarmes()` **a cada minuto**.
3. Ela chama a função de borda **`enviar-alarmes`** (sem verificação de login; protegida por um código guardado no banco).
4. A função lê `push_config` (assunto, chave pública e privada do Web Push) e envia o aviso ao iPhone. Remove inscrições inválidas (401/403/404/410).
5. **Repetição:** o aviso repete até **10 vezes, de 2 em 2 minutos**, até o Marcelo abrir o app (o app apaga as repetições ao abrir). Limite de 50 alarmes atrasados por rodada.
6. O iPhone mostra **notificação com som curto** — não é despertador. Despertador forte é o caminho do Relógio (5.3).
- **Não confirmado no iPhone:** a repetição de 2 em 2 minutos chegando; o aviso do temporizador de ponta a ponta.

### 5.2 Siri → Caixa de entrada (comprovado por relato do Marcelo)
Atalho **«Anotar»** no app Atalhos (montado por ele): dita o texto e faz `POST` em `/rest/v1/rpc/siri_captura` (função `public.siri_captura(p_token, p_texto)`, com `apikey` e `Content-Type`). A função só sabe **inserir um item `inbox`** (`source:'siri'`). O app transforma em lembrete ao abrir (entende data e hora). O código `p_token` é **secreto**: fica só no banco e no atalho dele. «Me lembre» é comando da própria Siri (vai para o app Lembretes da Apple), por isso o atalho se chama **Anotar**.

### 5.3 Alarme forte no Relógio do iPhone (montado, **não comprovado**)
O Relógio do iPhone não aceita data. Lembretes com `strong:true` entram na função `public.alarmes_fortes(p_token, p_horas default 23)`, que devolve linhas `MINUTOS|Título` (minutos a partir de agora). Dois atalhos do Marcelo: **«Alarme Nucleo»** (cria um alarme somando os minutos à hora atual) e **«Sincronizar Alarmes Nucleo»** (chama a função e repete o primeiro para cada item). **Pendência dele:** ajustar o atalho (usar «Ajustar data» e proteger o «Apagar alarmes» com «se tem algum valor»).

### 5.4 Backup
- **Manual (existe):** Ajustes › Exportar backup → arquivo JSON com `exportadoEm, lembretes, listas, notas, pastas, compromissos, caixaDeEntrada`. «Importar backup» lê o mesmo arquivo. O app avisa se o último passou de 7 dias.
- **Automático: NÃO existe.** `supabase/011_backup_e_limpeza.sql` está pronto mas **não foi aplicado** (o sistema cancelou a escrita no banco em 15/10). Não trate como backup ativo.
- **Anexo perdido:** `CNH ELISA 2.pdf` sumiu do armazenamento (causa provável: apagar de vez uma cópia que compartilhava o arquivo; corrigido na v36). Não há cópia; o Marcelo precisa **anexar de novo** ao lembrete correspondente.

---

## PARTE 6 — Financeiro: O SISTEMA DE DINHEIRO, COMPLETO

### 6.1 O que é e os princípios
O **Financeiro** é um app **separado** do Núcleo, na pasta `fin/` do mesmo repositório (https://nucleo51.github.io/nucleo/fin/). Organiza **contas do mês, cartões de crédito, dívidas e extratos**, e simula um plano de quitação. O Marcelo escolheu que o dinheiro fique **fora** do Núcleo (e fora de qualquer app de notas): o Núcleo só **envia pendências** ao Financeiro.
Princípios que valem sempre:
1. **O Financeiro nunca paga, transfere, contrata ou negocia nada.** «Marcar como paga» só registra que o Marcelo pagou no banco.
2. **Valores em centavos inteiros** (R$ 10,50 = `1050`). **Dado que não se sabe = `null`, nunca `0`.** Na tela aparece «Não informado».
3. **Apagar = lixeira** (`deleted_at`), reversível. Não há DELETE.
4. **Confirmação antes de salvar** (janela «Confira antes de salvar» com o resumo) e antes de apagar.
5. **Projeção parcial não é dinheiro disponível.** O app avisa isso na tela.
6. **Separar pessoas:** cada item tem titular (`holder`) e, nas dívidas, quem paga hoje (`payer`).
7. Nunca guardar **número completo de cartão, validade, código de segurança, senha de banco**. Só os **4 últimos dígitos**.

### 6.2 Acesso, instalação e funcionamento sem internet
- **Login:** a mesma conta do Núcleo («Entre com o mesmo e-mail e a mesma senha do Núcleo»); sessão guardada no aparelho (`fin-sess`).
- **Instalação:** PWA própria (nome «Financeiro», cor verde `#1F7A5C`, ícone próprio). O `fin/sw.js` guarda **só a tela do app**; **os dados não passam pelo service worker**.
- **Dados:** carregados do banco (`fin_records`) e guardados num cache local (`fin-cache`). Sem internet o app **mostra o que está guardado** com o aviso «Sem internet. Mostrando o que está guardado neste aparelho.»; **salvar exige internet**.
- Ao voltar ao app (aba visível) ele recarrega os dados sozinho (se não houver janela aberta).
- **Conflito de edição:** cada gravação envia a `version` atual; se o item mudou em outro aparelho, o app recarrega e diz «Este item mudou em outro aparelho. Atualizei a tela. Tente de novo.»
- O botão flutuante «← Voltar» (para tela ampliada) existe no Financeiro também.

### 6.3 Quem é quem: titular e pagador
- Pessoas: `MARCELO` e `MARLENE` («Marlene (mãe)»). Sem dono = vazio («Não definido»).
- Filtro no topo das telas: **Todos · Marcelo · Marlene (mãe)**. O filtro muda o que se vê e já preenche o titular dos cadastros novos.
- **Dívida:** `holder` = **devedor no contrato** (quem assinou); `payer` = **quem paga hoje** (podem ser diferentes). `account` = conta bancária de onde sai o pagamento (texto livre).
- **Conta do mês e cartão:** `holder` = de quem é.

### 6.4 As telas do Financeiro
Barra de baixo: **🏠 Início · 🧾 Contas · 💳 Cartões · 📉 Dívidas · 🎯 Quitar**. Extratos e Chat financeiro abrem a partir do Início.

**Início**
- Cabeçalho «Financeiro» e o mês («outubro de 2026»), o filtro de pessoa.
- **📥 «N pendente(s) do Núcleo»** (até 20 listados; tocar abre a revisão, 6.7).
- Cartão «Contas do mês ainda a pagar (valores conhecidos)» com o total, e etiquetas «N sem valor» e «N em atraso».
- Com o filtro «Todos»: **«Por pessoa»** — dívidas (saldo conhecido), usado nos cartões e contas do mês a pagar de cada um.
- **Próximos vencimentos (30 dias):** contas do mês, faturas de cartão e parcelas de dívida, ordenados por data, com «Em atraso» quando for o caso.
- **Cartões:** cada um com barra de uso (a barra fica vermelha a partir de 80% do limite), usado, pode usar, fatura atual e vencimento; total usado.
- **Dívidas:** saldo conhecido e aviso «Algum saldo está Não informado».
- Aviso «Projeção parcial não é dinheiro disponível. O Financeiro só organiza e lembra: quem paga é você.»
- Botões: **Carregar / Apagar exemplos de teste**, **📄 Extratos do banco**, **🤝 Chat financeiro**, **💾 Baixar cópia dos dados** (com aviso de dias desde a última), Atualizar, Sair, link «Abrir o Núcleo».

**Contas (do mês)**
- Botão **+ Nova conta**. Lista do mês com estado: **Em atraso, Sem valor, A pagar, Paga** (ordenadas nessa ordem e por dia de vencimento). Cada uma mostra vencimento, valor, de quem é e a conta bancária.
- Tocar numa conta abre: **Informar/Mudar o valor**, **Marcar como paga / Desfazer «paga»** (exige o valor antes), Editar a conta.
- Totais: total conhecido, já pago, faltam pagar. Abaixo, **Contas cadastradas** (todo mês ou só neste mês).
- Conta que **muda todo mês** (luz, água) entra **sem valor** e o app cobra o valor.

**Cartões**
- **+ Novo cartão** (apelido, últimos 4 dígitos, limite — pode ficar vazio —, dia de fechamento, dia de vencimento, titular). Lista com «Pode usar» e «Melhor dia de compra».
- **Detalhe do cartão:** limite, barra de uso, usado, pode usar, fecha/vence todo dia, melhor dia de compra; **Faturas** por mês com situação (**Paga, Aberta, Futura, Fechada · a pagar, Em atraso**); **Lançamentos** da fatura escolhida; **+ Novo lançamento**; **Marcar esta fatura como paga / Desfazer**.
- **Lançamento:** data, descrição, valor total, nº de parcelas (1 a 48), valor da 1ª parcela (se diferente), «É estorno ou crédito», «Quem gastou» (cartão adicional).

**Dívidas**
- **+ Nova dívida**: quem você deve, saldo devedor, valor da parcela, **juros ao mês em %** (ex.: 1,99), dia de vencimento, **situação** (Ativa, Atrasada, Paga, Não sei), **tipo** (Consignado, Empréstimo, Cartão, Loja/carnê, Outro), devedor no contrato, quem paga hoje, conta de onde sai, observação. A lista mostra cada dívida com a etiqueta da situação.

**Quitar (plano de quitação)** — simulação, **não é promessa e não negocia nada**: ver 6.6.

**Extratos** — importação do Mobills (6.8).

### 6.5 Os dados do Financeiro (`fin_records`)
Tabela `public.fin_records`: `id, owner, kind, data (JSON), version, deleted_at, created_at, updated_at, updated_by`. Tipos aceitos (`kind`): `card, charge, invpay, bill, billmonth, debt, proposal, stmt`.

| kind | para que serve | campos de `data` |
|---|---|---|
| `card` | cartão | `name, last4, limitC (centavos ou null), closeDay, dueDay, holder` |
| `charge` | compra no cartão | `cardId, date (AAAA-MM-DD), desc, totalC (negativo = estorno), n (parcelas), firstC (1ª parcela ou null), by` |
| `invpay` | fatura marcada como paga | `cardId, ym (AAAA-MM)` |
| `bill` | conta recorrente (o «molde») | `name, dueDay, variable (valor muda), amountC (ou null), recurring, holder, account, startYm` |
| `billmonth` | o valor e a situação da conta em cada mês | `billId, ym, amountC (ou null), paidAt (data ou null)` |
| `debt` | dívida | `creditor, balanceC, installC, rateBp, dueDay, status (ATIVA\|ATRASADA\|PAGA\|DESCONHECIDA), kindD, holder, payer, account, note` |
| `proposal` | (a) pendência vinda do Núcleo; (b) configuração | (a) `text, source:'nucleo', status (pendente\|feito\|ignorado), at`; (b) `cfg:'capacity', capacityC` = quanto dá para pagar por mês nas dívidas (um só registro) |
| `stmt` | extrato importado de **uma conta** | `account, holder, source:'mobills', entries[{i,d,c,k,t,g}]` |

- `rateBp` = juros **ao mês** em centésimos de ponto percentual: `199` = 1,99% ao mês; `null` = não informado.
- Qualquer registro de teste carrega `demo:true` e, na maioria, o nome termina com «(teste)».
- `holder`/`payer`: `"MARCELO"`, `"MARLENE"` ou `""`.

### 6.6 Regras de cálculo (o que o Financeiro faz de verdade)
**Faturas de cartão**
- Uma compra entra na fatura do **mês em que o dia da compra é menor ou igual ao dia de fechamento**; se for maior, entra na do **mês seguinte** (`invYmFor`).
- **Parcelas:** valor da parcela = total dividido por `n` (inteiro); a **1ª parcela leva o resto**. Se houver `firstC`, a 1ª é essa e as outras dividem o que sobra. As parcelas caem nos meses seguintes. **Estorno** (`totalC` negativo) diminui a fatura.
- **Vencimento:** se `dueDay` > `closeDay`, vence no mesmo mês da fatura; senão, no mês seguinte.
- **Usado** = soma de todas as faturas **não pagas** (inclui parcelas futuras: elas ocupam o limite até serem pagas). **Pode usar** = limite − usado (sem limite informado, não se calcula).
- **Situação da fatura:** Paga (existe `invpay`), Aberta (mês atual), Futura, Fechada · a pagar (passou do fechamento e não venceu), Em atraso (passou do vencimento).
- **Melhor dia de compra:** o dia seguinte ao fechamento.

**Contas do mês**
- Ao abrir o app (`ensureMonth`), para cada `bill`: se for **recorrente**, cria o `billmonth` do mês atual (a partir de `startYm`); se não for, só no mês de início. Conta de **valor variável** nasce com `amountC: null` («Sem valor»).
- Situação: **Paga** (`paidAt`), **Em atraso** (vencimento já passou), **Sem valor**, **A pagar**.

**Plano de quitação (`simulate`)**
- Entrada: dívidas **não pagas, com saldo**, do filtro atual, e «quanto dá para pagar por mês» (`capacityC`, informado pelo Marcelo; ele pode mudar). Dívida **sem saldo** fica fora; dívida **sem juros informados** entra **sem juros** e o app avisa que o tempo e o custo reais podem ser maiores («custo total: Não informado»).
- Cada mês: aplica os juros do mês ao saldo (`arredonda(saldo × juros)`), paga as **parcelas mínimas** por ordem de prioridade e usa a sobra na dívida prioritária. Até 600 meses.
- **Dois cenários:** **Menor saldo primeiro** (quita as pequenas rápido) e **Maior juros primeiro** (costuma custar menos quando os juros são conhecidos). Para cada um: em quanto tempo quita tudo, «por volta de» que mês, total pago (estimado), juros no caminho e a **ordem em que cada dívida some**.
- Avisos: «**Falta dinheiro**» quando as parcelas somam mais que o valor por mês; «não quita em 50 anos» quando o valor mal cobre os juros; «Isto é só conta. Não inclui desconto de negociação nem multa. Antes de pagar ou renegociar, confira com o banco. O Financeiro não paga nada.»

### 6.7 Pendências vindas do Núcleo («Enviar ao Financeiro»)
- **No Núcleo:** Hoje › **Enviar ao Financeiro**. Tela cheia: «Escreva ou cole. **Cada linha** vira um pendente no Financeiro.» Exemplos que ela mostra: «Mercado 230,50 no cartão Bradesco», «Tênis 6x 349,99 cartão Santander», «Conta de luz vence dia 10», «Dívida Itaú 16000». Até **40 linhas**; pede confirmação («Enviar N itens ao Financeiro?»); grava cada linha em `fin_records` como `proposal` (`text`, `source:'nucleo'`, `status:'pendente'`, `at`). Exige estar com o login ativo (modo nuvem). Se a tabela do Financeiro não existir, avisa «O Financeiro ainda não foi preparado no banco.» Fotos de extrato **ainda não**: por enquanto é texto.
- **No Financeiro:** os pendentes aparecem no Início. Tocar abre **«Veio do Núcleo»** com o texto e três escolhas — **💳 Compra no cartão, 🧾 Conta do mês, 📉 Dívida** — mais **Ignorar** e Voltar. O app **sugere** o tipo e **pré-preenche** o formulário lendo o texto (`parseText`): valor (ex.: «230,50»), número de parcelas («6x»), dia («vence dia 10»), data («ontem», «12/10»), cartão (casa o nome com os cartões cadastrados) e descrição. Palavras como «dívida/devo/empréstimo/consignado» sugerem dívida; «cartão/parcelas/fatura» sugerem compra; «conta/boleto/luz/água/gás/internet/aluguel/telefone» sugerem conta. **Nada é cadastrado sozinho**: o Marcelo confere e salva (aí o pendente vira `feito`; «Ignorar» vira `ignorado`).

### 6.8 Importar extrato do Mobills (.xlsx)
- Início › **📄 Extratos do banco** › **📥 Importar arquivo do Mobills (.xlsx)**. No Mobills: *Relatório de transações → exportar em Excel*.
- O Financeiro lê o `.xlsx` **no próprio aparelho** (leitor mínimo; precisa do Safari atualizado). Limites: **5 MB** e **10.000 lançamentos**. Colunas exigidas, nesta ordem: **Data (dd/mm/aaaa), Descrição, Valor, Conta, Categoria, Subcategoria, Tags**. Linha inválida (data, valor, conta) **cancela tudo** com a linha do erro.
- **Classificação** de cada lançamento: valor positivo → **Renda** (categoria Salário ou Renda extra), **Empréstimo recebido** (descrição começa com «crédito liberado») ou **Transferência**; valor negativo → **Transferência** (categoria transferência enviada, pix ou investimento), **Pagou fatura** (descrição contém «fatura») ou **Gasto**.
- Pergunta **«De quem são estas contas?»** (Marcelo ou Marlene), mostra um resumo e pede confirmação («Nada é pago nem alterado no banco»). Cada **conta** do arquivo vira um registro `stmt` com seus lançamentos.
- **Importar de novo o mesmo período não duplica:** cada lançamento tem um id (`data-hash-ocorrência`). Se um lançamento já salvo vier **diferente**, a importação para: «Conflito… Nada foi gravado.» Uma conta já salva como de uma pessoa não pode ser importada como de outra.
- **Tela Extratos:** resumo dos 6 últimos meses (Renda, Gastos, Fatura de cartão paga, Empréstimo recebido, Transferências) e os **40 últimos lançamentos**. Renda, empréstimo, transferência e fatura paga **não** entram em «Gastos».

### 6.9 Chat financeiro (como o ChatGPT mexe nos dados do Financeiro)
O Financeiro foi pensado para um **chat financeiro** (você) ler tudo e propor mudanças, **sempre com o Marcelo conferindo**.
**Caminho A — copiar e colar (existe e funciona sem internet para você):**
1. No Financeiro: Início › **🤝 Chat financeiro** › **Copiar tudo para o chat**. Copia um JSON `{"fin_snapshot":1, "gerado_em":…, "regras":[…], "registros":[{id,kind,version,data}…]}` com **todos** os registros (sem os apagados). Ele cola isso na conversa com você.
2. Você responde com **um único JSON** neste formato:
   `{"fin_ops":1,"ops":[ {"op":"create","kind":"debt","data":{…}}, {"op":"update","id":"UUID","data":{…}}, {"op":"delete","id":"UUID"} ]}`
3. Ele cola em **Colar mudanças do chat**. O Financeiro confere o formato e mostra uma lista legível («CRIAR debt: …», «EDITAR debt “…”: …», «APAGAR …») e pede confirmação («Aplicar N mudança(s)?»). Só então grava.
- **Regras do pacote:** no máximo **60 operações**; `kind` tem de ser um dos oito tipos; `update` **mescla** os campos enviados nos que já existem (mande só o que muda) e usa o `id` do snapshot; `delete` vai para a lixeira; **o app grava uma a uma e, se uma falhar, para** («Parei no meio») e recarrega.
- **Exemplo (valores fictícios):**
  `{"fin_ops":1,"ops":[{"op":"create","kind":"debt","data":{"creditor":"Banco Exemplo","balanceC":1200000,"installC":48000,"rateBp":199,"dueDay":5,"status":"ATIVA","kindD":"Consignado","holder":"MARLENE","payer":"MARLENE","account":"","note":""}},{"op":"update","id":"UUID-DO-CARTAO","data":{"limitC":300000}}]}`
- **Cuidados ao montar o JSON:** centavos inteiros; `null` quando não souber; `holder`/`payer` só `MARCELO` ou `MARLENE`; **um só** registro `proposal` com `cfg:'capacity'` (atualize o existente em vez de criar outro); não invente saldo, juros ou data — pergunte; não crie `demo:true`.
**Caminho B — chamada HTTP (`fin_chat`): NÃO está ativo.** O contrato existe em `fin/API.md` e em `supabase/006_fin_chat.sql` (função `public.fin_chat(p_token, p_cmd)` com código secreto, «tudo ou nada», 60 ops, edições com `updated_by='chat'`), mas **o SQL 006 nunca foi aplicado** (a função não existe no banco e não há código `fin_chat_token` guardado). **Não tente usar; não peça o código.** Só o Marcelo decide ativar.

### 6.10 O banco do Financeiro
- Tabela criada pelo `supabase/005_fin.sql`; o tipo `stmt` foi liberado pelo `007_fin_extrato.sql` (**ambos aplicados**: a restrição de tipos do banco inclui `stmt`). O `006_fin_chat.sql` **não** foi aplicado.
- **Segurança:** RLS (só o dono lê/insere/altera), **sem política de DELETE**, gatilho `fin_guard` (soma versão, atualiza data, protege o dono). Valores ficam como números inteiros dentro do JSON.
- **Estado em 16/10/2026 (contagens):** 19 registros ativos — 4 `bill`, 4 `billmonth`, 2 `card`, 6 `charge`, 2 `debt`, 1 `proposal`; **18 estão marcados como `demo` (exemplos de teste)** e 1 não está marcado: é um pendente enviado do Núcleo; 0 na lixeira. **Todos os cartões, compras, contas e dívidas cadastrados são exemplos de teste.** Antes de cadastrar os de verdade: Início › **Apagar os exemplos de teste** (só some o que é `demo`).
- **Cópia de segurança:** Início › **💾 Baixar cópia dos dados** gera `Financeiro-copia-AAAA-MM-DD.json` (formato `{app:'Financeiro', formato:1, geradoEm, total, registros}`), **inclui os apagados**, pelo compartilhar do iPhone ou download; avisa quando passam 7 dias. O arquivo tem informação financeira: guardar em lugar seguro. Não existe backup automático do Financeiro.

### 6.11 Segurança e limites do Financeiro
- Sem conexão com bancos (não usa Open Finance, não guarda senha de banco). Entrada de dados: **digitação, pendentes do Núcleo, extrato .xlsx do Mobills e pacotes do chat**.
- O Financeiro **não notifica** (não há alarme de vencimento no Financeiro; o Núcleo é quem tem alarmes). Hoje o Marcelo vê os vencimentos no Início do Financeiro.
- Datas e dias de vencimento são do calendário brasileiro (fuso America/Sao_Paulo).
- Confie nos números só enquanto os dados de entrada estiverem completos: saldo ou juros ausentes são avisados, nunca preenchidos.

### 6.12 Como o ChatGPT deve ajudar com o Financeiro (roteiros)
1. **Cadastrar dívidas/contas/cartões de uma lista que o Marcelo ditar:** peça o que falta (saldo, parcela, juros, vencimento, titular, quem paga); monte o pacote `fin_ops`; mostre um **resumo em português** antes; entregue o JSON para ele colar. Nunca invente valores.
2. **Plano de quitação:** peça o snapshot; confira se há dívidas sem saldo/juros; use os dois cenários do app como referência; explique em palavras simples; **não prometa** economia e lembre que **negociação e pagamento são com o banco**.
3. **Revisar pendentes do Núcleo:** liste os `proposal` com `status:'pendente'`, sugira o tipo e os campos, e monte as operações (criar o registro e marcar o pendente como `feito`).
4. **Conferir o mês:** com o snapshot, liste contas em atraso, sem valor e a pagar, faturas a vencer e o total do mês, separando Marcelo e Marlene.
5. **Extrato:** explique o passo a passo do Mobills (Relatório de transações → Excel → Financeiro › Extratos); o ChatGPT **não** lê o `.xlsx` pelo Financeiro, só o Marcelo importa.
6. **Sempre:** diga o que depende dele conferir no iPhone; **não** peça acesso a banco; **não** guarde dados reais no repositório público nem em arquivos de documentação.

### 6.13 Limitações conhecidas e ideias pendentes do Financeiro
- Sem alarme/notificação de vencimento; sem gráfico de evolução; sem categoria por gasto nos cartões; sem foto de extrato; sem backup automático; chat por HTTP desativado; Quitar não considera descontos de negociação nem multa; exemplos de teste ainda carregados. O Financeiro **não foi mexido** desde 14/10/2026 (v1).
- Pendências de decisão do Marcelo: apagar os exemplos e começar os dados reais; ativar (ou não) o chat por HTTP; alarmes de vencimento no Núcleo para contas do Financeiro.

---

## PARTE 7 — TRABALHO COM CÓDIGO: TESTES, PUBLICAÇÃO E REGRAS

### 7.1 Política de branch do Núcleo
Decidida pelo Marcelo em 14/10/2026 **para o NCLD512**. **Para o ChatGPT, a versão abaixo é uma sugestão que o Marcelo ainda precisa confirmar.**
1. **Ler o estado:** `git fetch`, `main` atualizada, último commit, README e este guia.
2. **Criar a branch** a partir da `main`: `chatgpt/AAAAMMDD-assunto` (o NCLD512 usa `ncld/AAAAMMDD-assunto`).
3. **Tag de volta** na `main` atual, antes de qualquer mudança: `antes-AAAAMMDD-assunto`, e enviar a tag ao remoto.
4. **Mexer o mínimo.** Subir `APP_V` em `index.html` **e** `V` em `sw.js`.
5. **Testes:** `cd tests && npm install && npm test`. Hoje são **145 testes** e **todos** precisam passar. Escreva teste novo para cada mudança.
6. **Conferir a aparência numa tela de 390 px** (a letra e os botões grandes são requisito).
7. **Não juntar na `main` sem o Marcelo autorizar** (sugestão: Pull Request). Depois do merge: conferir o remoto (`git ls-remote origin refs/heads/main`) e a página publicada (`gh api repos/NUCLEO51/nucleo/pages/builds/latest` deve dizer `built` no commit certo; `sw.js` publicado deve ter a versão nova).
8. **Se der problema:** voltar a `main` para a tag e avisar o Marcelo.
9. Registrar o que fez no texto do commit e dizer ao Marcelo; o NCLD512 reconcilia o histórico (HV/HVI/EAO) depois.

### 7.2 Os testes (`tests/run.js`)
- Rodam em **jsdom** (navegador simulado) carregando `index.html`. As funções puras do `lib` são chamadas direto; as demais, pelo gancho `window.__NUCLEO_TEST__` (7.3).
- **Cada teste** é `t('descrição', valorObtido, valorEsperado)`. Os **fluxos de toque** disparam `click`/`input` em elementos reais (`#tab-notas`, `[data-act="…"]`) e conferem a tela.
- **Testes assíncronos** (escolha de destino, confirmação com atraso de 0,45 s) ficam dentro de `global.__pend.push((async()=>{ … })())`; o arquivo só termina depois que todos acabam.
- **Preparar dados:** preencha `S.reminders`, `S.lists`, `S.notes`, `S.folders`… **e também `S.raw`** com as mesmas listas. Se só `S.*` for preenchido, a primeira gravação chama `partition()` e apaga tudo (já deu falso defeito uma vez).
- Para **pular a confirmação** num teste, use `S.conf='del'`.
- Há testes para: busca geral, tela Hoje e seus botões, Caixa de entrada, Notas (botões, cartões, árvore, busca, reinício), contagens neon e cor preta, página de lista (seções, setinhas, ocultar concluídos), Mover, cores, Planner, anexos, alarmes e `parseCapture`.

### 7.3 Foto de tela para conferir o visual
Chrome sem tela: abrir uma **cópia** de `index.html` com `window.__NUCLEO_TEST__=true` antes dos scripts, esconder a tela de login (`#lg{display:none}`), preencher `S` por um script no fim, clicar nos botões e salvar PNG (`--screenshot`, `--window-size=390,844`, `--virtual-time-budget=4000`). **Demora de 1 a 5 minutos** e a janela mínima do Chrome é maior que 390 px (a largura foi fixada por CSS só na cópia). Se travar, encerre os processos `headless` e repita.

### 7.4 Publicação
GitHub Pages serve a `main`. Após o push a página nova leva **1 a 3 minutos**. Antes de dizer «publicado», confira `built` no commit certo **e** o `sw.js` da página com a versão nova. O app do iPhone só troca de versão quando o Marcelo **fecha e abre** o Núcleo.

### 7.5 Regras extras
- **SQL no banco:** só o Marcelo executa ou autoriza, **um por um**; SQL que apaga dados exige confirmação explícita. Não use `service_role`.
- **Dados reais:** só leia ou escreva com ordem dele para aquele ato (4.6).
- **Nunca** commitar dado pessoal, senha, token, chave ou código (o repositório é público).
- **Financeiro:** mexer no código do Financeiro segue as mesmas regras; **nunca** criar função que pague ou mova dinheiro.

---

## PARTE 8 — HISTÓRICO COMPLETO DE VERSÕES

### 8.1 Até a v38 (resumo)
- **v9 (13/10):** base do app — lembretes, notas, agenda, desenho, anexos, Siri, avisos.
- **13–14/10:** Financeiro (contas, cartões, dívidas, plano de quitação, pendentes do Núcleo, chat financeiro por copiar/colar, extratos do Mobills, cópia de segurança); botão Baixar cópia; **alarmes com o app fechado** (servidor, chaves no banco, relógio por minuto); botão flutuante «← Voltar»; ícone caveira verde neon; Anotar com formulário completo e avisos «antes»; aviso que repete.
- **v16–v25 (14–15/10):** listas com concluídos, Siri/Atalhos, alarme forte, Relógio (cronômetro/temporizador), fixar no topo, limpeza de caixas e bandeira removida.
- **v26 (15/10):** auditoria geral e melhorias. **v27–v36:** caixa de entrada única; anexo compartilhado protegido (v36).
- **v37–v38 (16/10):** Planner em botão e página própria; número nas bolinhas; páginas com dias em lista.

### 8.2 v39 a v48 e este guia (16/10/2026)
| versão | commit | o que mudou | tag de volta |
|---|---|---|---|
| v39 | `786da62` | busca geral na tela Hoje | `antes-20261016-busca-geral` |
| v40 | `682770f` | Hoje só com botões (cada um abre página inteira), Atrasados e Lembretes hoje com página certa, Caixa de entrada em página própria, Voltar para Hoje, cronômetro no fim, data grande | `antes-20261016-hoje-botoes` |
| v41 | `988bf32` | botões Escanear / Nova nota / Desenhar de Notas no topo | `antes-20261016-notas-botoes` |
| v42 | `24f9406` | notas em cartões (borda colorida, letra maior só nelas); botões da pasta numa fileira abaixo do título; Notas e Lembretes voltam ao início ao sair | `antes-20261016-notas-cartoes` |
| v43 | `8a9ac59` | sem o botão «Criar a pasta Documentos» | `antes-20261016-sem-botao-documentos` |
| v44 | `a486aca` | sem o contador na aba Hoje | `antes-20261016-sem-contador-hoje` |
| v45 | `e3322e4` | pasta em árvore: notas primeiro (recolhíveis), subpastas com setinha e contagem, **Nova subpasta** e **Buscar** no topo, busca só na pasta | `antes-20261016-pasta-arvore` |
| v46 | `8d365e3` | contagens em bolinha neon (Planner e Notas); botões do início de Notas numa fileira abaixo do título | `antes-20261016-contagem-neon` |
| (docs) | `aaa030e` | guia v1.0 | `antes-20261016-guia-chatgpt` |
| v47 | `0649dc9` | página de lista: botões no topo, seções logo abaixo e recolhíveis; **número da bolinha neon sempre preto** (corrigido um conflito de nome que deixava cinza) | `antes-20261016-lista-secoes` |
| v48 | `a79c756` | **Mover** lembrete de lista e nota de pasta; **cores das listas vivas**; ícone escuro sobre cor clara | `antes-20261016-mover-cores` |
| (docs) | este commit | guia v2.0 (Núcleo + Financeiro completos) | `antes-20261016-guia-v2` |
- **Testes:** 24 (v38) → 117 (v46) → 130 (v47) → 145 (v48).
- **Defeitos que os testes e as fotos acharam e foram corrigidos:** fechar a busca de Notas com o teclado aberto não redesenhava; nome da pasta quebrando em três linhas com quatro botões; título «Notas» quebrando com cinco botões; número cinza na bolinha neon (conflito de nome de classe).
- **Dados criados a pedido do Marcelo (16/10, direto no banco):** 5 listas e 1 lembrete sem data (4.5).

---

## PARTE 9 — ESTADO ATUAL, COMPROVADO E NÃO COMPROVADO, PENDÊNCIAS

**Comprovado no iPhone (relato/print do Marcelo):** captura por Siri; aviso com o app fechado (print de 14/10 19:14); Planner v37 aprovado.
**Comprovado por testes automáticos, foto de tela simulada e página publicada (não no iPhone):** tudo de v39 a v48.
**Não confirmado no iPhone:** teclado do «+» (v35) e Planner v38; botão flutuante Voltar; botão Baixar cópia do Financeiro; importador do Mobills; som do «Ouvir»; repetição do aviso de 2 em 2 minutos; atalhos de alarme do Relógio; **todas as telas novas de hoje (v39–v48)**, as 5 listas novas e o lembrete criado no banco.
**Nunca testado:** o ChatGPT lendo ou escrevendo no Núcleo ou no Financeiro; o ChatGPT operando bem só com este guia.

**Pendências do Marcelo / decisões:**
1. Fechar e abrir o Núcleo no iPhone e conferir as telas novas.
2. **Entregar este guia ao ChatGPT** (colar a Parte 0 e dar o link ou o arquivo) e **decidir** se o ChatGPT segue branch `chatgpt/…` e Pull Request.
3. Reanexar a `CNH ELISA 2.pdf`.
4. Liberar escritas no Supabase para o **backup diário** (SQL 011) e a **limpeza de 2 inscrições push antigas**.
5. Ajustar os **atalhos de alarme** do Relógio.
6. **Visão de mês do Planner** (pedido antigo).
7. Financeiro: **apagar os exemplos de teste** e começar os dados reais; decidir sobre o chat por HTTP e alarmes de vencimento.
8. Revisão do GDA512/COM do bloco do NCLD512 no registro global.

---

## PARTE 10 — ARMADILHAS, RECEITAS E PERGUNTAS FREQUENTES

### 10.1 Armadilhas conhecidas (economizam horas)
- **Script isolado:** os testes só enxergam funções de dentro dele pelo gancho `__NUCLEO_TEST__`.
- **`go()` volta ao topo; `render()` preserva a rolagem.** Para abrir/recolher no lugar, use `render()`.
- **Teclado aberto:** não redesenhe tudo enquanto o campo de busca tem foco (o `render()` já trata `rq`, `q` e `gq`); ao fechar a busca, tire o foco antes. No iPhone o teclado só abre se o `focus()` acontece **dentro do toque**.
- **Nomes de classe CSS:** procure antes se o nome já existe (a v46 reaproveitou `cnt` e herdou uma regra velha que deixou o número cinza).
- **Largura:** no máximo 4 botões redondos ao lado do título em 390 px.
- **`partition()`** recalcula `S.reminders` etc. a partir de `S.raw`; nos testes preencha os dois.
- **Mac:** `sed -i` precisa de `sed -i ''`. A leitura de documentos grandes do Drive (como o registro global) **corta em 100 mil caracteres**; o Drive **apaga o que estiver entre sinais de menor e maior** ao converter texto em documento.
- **GitHub Pages** demora 1–3 minutos; confira `built` no commit certo.
- **Supabase:** migrações feitas por conectores podem ser **canceladas pelo sistema**; leituras e SQL simples funcionam.
- Chrome sem tela para fotos: lento e com janela mínima maior que 390 px.

### 10.2 Receitas
- **Botão novo no Núcleo:** HTML com `data-act="meu-botao"` (e `aria-label`); ação `'meu-botao':()=>{…}` no objeto de ações; se mudar a tela sem sair do lugar, `render()`; teste com `clickAct`.
- **Tela nova de página cheia:** nova aba interna (como `busca`, `caixa`, `relogio`): entrada no mapa de `render()` (`{busca:viewBusca,…}`), uma `viewXxx()`, uma ação de abrir e outra de voltar; zerar o estado ao sair em `tab`.
- **Campo novo num item:** acrescente ao formulário (`sheetRem`/`sheetNote`), ao `data` (4.2) e ao Resumo/leitura; itens antigos não têm o campo, então trate ausente.
- **Tipo novo no Financeiro:** exige alterar a restrição de tipos no banco (SQL, só o Marcelo), `CHAT_KINDS` no Financeiro e `fin/API.md`.
- **Cor ou texto de uma área só:** use uma classe própria da área (ex.: `.notes-cards .li.note`) para não afetar o resto.

### 10.3 Perguntas frequentes do Marcelo (respostas curtas)
- **Onde coloco uma tarefa de dinheiro, sem data, só para lembrar?** Num lembrete **sem data** dentro de uma lista (ex.: «Contas e dinheiro», seção «Atrasadas»). Sem lista, ele aparece na Caixa de entrada.
- **Como mudo um lembrete de lista?** Abra o lembrete › **Mover para outra lista**. Nota: abra a nota › **Mover para outra pasta**.
- **Como crio uma lista com seções?** Lembretes › Listas › Nova lista; depois o lápis da lista › Seções.
- **Como mando algo ao Financeiro?** Hoje › Enviar ao Financeiro, uma linha por item; no Financeiro, toque no pendente e confirme.
- **Não apareceu o que criaram no banco/outro aparelho.** Feche e abra o Núcleo; veja Ajustes › Envio para a nuvem.
- **Quero letra maior só numa área.** Peça ao NCLD512/ChatGPT para mexer só naquela área (como nas notas).

### 10.4 Glossário
**PWA** — página que vira app no iPhone. **Folha (sheet)** — tela que sobe por cima. **Lista / seção** — grupos de lembretes (a seção fica dentro da lista). **Pasta / subpasta** — grupos de notas. **Caixa de entrada** — onde caem anotações soltas. **Planner** — visão da semana. **Tag de volta** — marca no Git que guarda o estado anterior para desfazer. **HV / HVI / EAO** — histórico vivo, índice do histórico e ponteiro de estado do NCLD512 no Drive. **Centavos inteiros** — R$ 10,50 = 1050. **Titular (`holder`)** — de quem é; **pagador (`payer`)** — quem paga hoje.

FIM DO GUIA — v2.0 — 16/10/2026 — NCLD512

## Financeiro: aba Lembretes e Planner (22/10/2026)
- O app **Financeiro** (pasta `fin/`) tem a aba 🔔 **Lembretes** com 3 visões: lista, **Semana** e **Mês** (planner só do Financeiro).
- Mostra só os lembretes da lista do Financeiro (`items` com `kind=reminder` e `data.list` = lista `fin:true`). Os de dívidas (`finRef`) são automáticos e só leitura; os manuais podem ser criados, editados, concluídos e apagados (sempre com confirmação). Alarme: `alarms:[{id:'a-fin',min:0}]`, o mesmo backend do Núcleo.
- Nomes técnicos NÃO mudaram (tabela `fin_records`, `data.fin`, `finRef`, chaves `fin-*`, funções do Supabase). Só o texto visível passou de "FIN" para "Financeiro".
