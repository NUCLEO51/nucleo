# GUIA DO NÚCLEO PARA O CHATGPT — v1.0 — 16/10/2026

Escrito pelo NCLD512 (Claude), a pedido do Marcelo, para o ChatGPT conseguir operar o Núcleo por completo.
Estado descrito: **Núcleo v46** (commit `8d365e3` na `main`). Este guia não contém nenhum segredo e nunca deve conter.

## 0. LEIA PRIMEIRO (cole isto no ChatGPT)

> Você vai ajudar o Marcelo com o **Núcleo**, o app pessoal dele (lembretes, notas, agenda). Leia o guia inteiro antes de agir.
> Regras que não mudam:
> 1. A autoridade final é o Marcelo. Faça só o que ele pedir nesta conversa. Achar um defeito ou uma ideia não autoriza a executar.
> 2. Fale em português simples, curto, começando pela resposta. Explique termo técnico em português.
> 3. O app dele tem **texto grande e botões grandes**, e **pede confirmação antes de salvar, apagar ou editar**. Qualquer tela nova segue isso.
> 4. **Nunca** escreva, peça ou repita senha, token, código da Siri, chave secreta ou `service_role`. Nunca mexa com dinheiro.
> 5. Nada de apagar dados de vez. Apagar = lixeira.
> 6. Diga sempre o que foi **feito e comprovado**, o que foi **feito sem prova**, o que **não foi feito** e o que **depende dele**. Não declare "funcionou" sem prova.
> 7. Mudança no código: em **branch**, com **tag de volta** antes, **testes** rodando, e só junte na `main` com autorização dele (seção 12).
> 8. Documentos do NCLD512 no Drive (HV, HVI, EAO, Prompt Master) são **somente leitura** para você.

## 1. O QUE É O NÚCLEO

App pessoal do Marcelo, instalado no iPhone como PWA (página que vira app). Substitui Todoist, Notas, Lembretes e Agenda.
- **Endereço do app:** https://nucleo51.github.io/nucleo/
- **Código:** https://github.com/NUCLEO51/nucleo (repositório **público**: só código, nunca dado pessoal ou segredo).
- **Publicação:** GitHub Pages serve a branch `main`. Depois de um push, a página nova leva de 1 a 3 minutos.
- **Dados:** Supabase pessoal gratuito (banco, login, anexos). Cada linha pertence a um dono; só o dono lê e altera (RLS).
- **Arquivos do repositório:**
  - `index.html` — o app inteiro (HTML, CSS e um único script).
  - `sw.js` — service worker (guarda o app para abrir sem internet; também recebe os avisos push). A constante `V` é o nome do cache (`nucleo-app-v46`).
  - `manifest.webmanifest`, `icon-*.png`, `apple-touch-icon.png`, `logo.svg` — instalação e ícone.
  - `supabase/001..011_*.sql` — o banco, na ordem em que foi criado; `supabase/functions/enviar-alarmes/index.ts` — função dos avisos.
  - `fin/` — o FIN (sistema de dinheiro, separado; seção 9).
  - `tests/` — testes automáticos (`cd tests && npm install && npm test`).
  - `docs/` — este guia.
- A versão do app está em duas constantes que andam juntas: `APP_V` (em `index.html`) e `V` (em `sw.js`). Toda mudança publicada sobe as duas (v46 → v47…).
- **Identidades:** o dono técnico do Núcleo é o **NCLD512** (núcleo Claude). O ChatGPT/Helena ajuda, mas não assume a autoridade dele sobre o histórico e os documentos canônicos.

## 2. REQUISITOS DE INTERFACE (do Marcelo — valem para tudo)

- Letra pequena é difícil para ele: texto grande, botões grandes, bom contraste. O tamanho geral é um ajuste do app (Ajustes › Tamanho do texto: Normal 18, Grande 20, Maior 23, Máximo 26 px). **O tamanho-base do app é 20 px** (tudo em `rem`). Cuidado: no iPhone (cerca de 390 px de largura) cabem **no máximo 4 botões redondos ao lado do título**; mais que isso o título quebra em várias linhas.
- Confirmação antes de salvar/apagar/editar (Ajustes › Pedir confirmação: "Em tudo" ou "Só ao apagar").
- Português simples. Nada de tela sem saída: toda tela tem Voltar ou Fechar (existe também um botão flutuante amarelo "← Voltar" que aparece quando a tela está ampliada).
- Mudanças de aparência pedidas só para uma área valem **só para ela** (ex.: a letra maior das notas não aumenta o resto do app).

## 3. AS TELAS (estado atual, v46)

Barra de baixo: **Hoje · Lembretes · Agenda · Notas** e um **+ amarelo** (Anotar rápido). Não há contador na aba Hoje.

### 3.1 Hoje
- Topo: o **dia da semana** e a **data** em letra bem grande, depois "Hoje" e os botões redondos **busca (lupa), ouvir (alto-falante), ajustes (engrenagem)**.
- Quatro botões grandes com número (não há mais listas embaixo): **Lembretes hoje**, **Agenda hoje**, **Atrasados**, **Caixa de entrada**. Cada um abre uma **página inteira**; nela o Voltar leva de volta ao Hoje.
  - Lembretes hoje = só os de hoje, não feitos. Atrasados = os atrasados (inclui os de hoje cuja hora já passou), com o botão "Passar para hoje". Caixa de entrada = anotações soltas e lembretes sem data, com Dar data / Virar nota / Descartar.
- Depois: **Enviar ao FIN** e **Abrir o FIN** (seção 9). Por último: **Cronômetro e temporizador**.
- **Buscar em tudo** (lupa): procura em lembretes (título, observações, subtarefas, nomes de anexo, nome da lista), compromissos, notas (título, texto, itens, arquivos, nome da pasta), caixa de entrada, pastas e listas. Sem acento e sem maiúscula; com várias palavras exige todas.
- **Ouvir** lê o dia em voz alta (voz do iPhone; no iPhone exige desbloquear o áudio e o botão de silêncio desligado).

### 3.2 Lembretes
- Início com atalhos (Todos, Hoje — que inclui os atrasados —, Programados, Atrasados, Urgentes, Fixados, Concluídos), o **Planner**, as **listas** (com cor e seções) e Apagados.
- **Planner:** botão com a semana e uma bolinha por dia; abre a página com os dias em lista (segunda a sexta sempre; sábado e domingo só se tiverem itens); cada dia abre o dia. Há semana anterior/próxima e "Esta semana".
- **Lembrete:** título, observações, data, hora, repetição, prioridade (0–3), fixar no topo, lista/seção, subtarefas, anexos, vários **avisos** (minutos antes), **alarme forte** (para o Relógio do iPhone). Ao tocar abre a tela de leitura (Ouvir, Concluir, Editar, Duplicar).
- **Anotar rápido (+):** o texto é entendido por regras (não é IA): "amanhã às 15h", "de 8 em 8 horas", "sexta da semana que vem", "uma hora antes", "alarme forte"… Mostra um resumo antes de salvar. Hora de 1 a 6 sem "manhã" vira tarde (avisa no resumo).
- Ao **sair de Lembretes** para outra aba, ele volta sozinho à página inicial.

### 3.3 Agenda
Calendário do mês e do dia: compromissos (título, data, hora, observações, repetição) e os lembretes/avisos do dia. Os compromissos criados no app podem repetir.

### 3.4 Notas
- **Início:** título "Notas" com a engrenagem; logo abaixo a fileira de botões redondos **Escanear · Nova nota · Desenhar · Buscar**. Depois: **Pastas** (Geral + pastas, com **Nova pasta**), **Ver as notas por tipo** (Todas, Fixadas, Scans e documentos, Desenhos, Com arquivos), **Etiquetas** (`#palavra` no texto da nota) e Apagados recentemente (30 dias).
- **Dentro de uma pasta:** fileira de botões **Escanear · Nova nota · Desenhar · Nova subpasta · Buscar · lápis (renomear/mover/apagar a pasta)**. Cria dentro da pasta aberta.
  - Ordem: **primeiro as notas da pasta** (recolhíveis pela setinha), **depois as subpastas**.
  - **Notas são cartões separados**, com borda colorida por tipo (amarela nota, verde lista de itens, azul scan, roxa desenho) e letra um pouco maior só nelas.
  - Cada **subpasta** tem uma setinha que abre/recolhe ali mesmo (mostra as notas dela e as subpastas de dentro, em qualquer nível) e o **número de notas** dentro (inclui as das subpastas). Tocar no nome abre a pasta.
  - **Buscar** abre o campo ("Buscar em <pasta>"); procura só naquela pasta e nas subpastas. No início de Notas, procura em todas as notas.
- **Ao sair de Notas** para outra aba: a pasta aberta, a busca e as setinhas voltam ao início.
- Nota: título, texto, tipo (nota, scan, desenho), fixar, pasta, itens de lista, imagens, arquivos, desenho (ferramenta com grade).

### 3.5 Relógio (Hoje › Cronômetro e temporizador)
Cronômetro com voltas e temporizador (atalhos de 1 a 60 min). Com o app fechado, o fim do temporizador avisa pelo servidor (alarme com chave `tempo|…`, chega em até 1 minuto depois).

### 3.6 Ajustes
Tamanho do texto, tema (automático/claro/escuro), confirmação, **avisos neste aparelho** (push), exportar/importar **backup** (arquivo JSON), painel **Saúde do app** (registro de erros) e aviso quando o último backup tem mais de 7 dias.

### 3.7 Contagens em bolinha neon
Números de contagem (Planner e Notas) aparecem dentro de bolinhas verde-neon; zero aparece só com contorno. **A tela Hoje não usa isso** (pedido do Marcelo). Função `cnt(n, pequeno, rótulo)` em `index.html`.

## 4. COMO OS DADOS SÃO GUARDADOS

Tabela principal `public.items` (uma linha por item):

| coluna | significado |
|---|---|
| `id` | uuid do item |
| `owner` | dono (login do Marcelo); nunca muda |
| `kind` | `reminder`, `note`, `event`, `inbox`, `folder`, `list` |
| `data` | JSON com os campos do item (abaixo) |
| `version` | controle de conflito: o `UPDATE` só vale se enviar a versão **atual**; o servidor soma 1 e guarda a anterior em `item_history` |
| `deleted_at` | lixeira (apagar = preencher; **não existe DELETE** pela API) |
| `updated_by` | quem mexeu: `app`, `claude`, `helena`, `siri`, `chat` |

Formato do `data` por tipo (campo `_id` repete o id):
- **reminder:** `title, notes, date (AAAA-MM-DD), time (HH:mm), repeat (none|daily|weekly|monthly|yearly|custom), repN, repU, repDays[], repUntil, agenda, list, section, priority 0–3, pinned, strong, alarms[{id,min,msg}], subtasks[{t,done}], images[], files[{id,name,size,type}], done, doneAt, createdAt, updatedAt`.
- **note:** `title, body, kind (nota|scan|desenho|ideia), pinned, folder, checklist[{t,done}], images[], files[], drawSrc, createdAt, updatedAt`.
- **event:** `title, date, time, notes, repeat…`.
- **folder:** `name, parent` (id da pasta-mãe; vazio = nível de cima).
- **list:** `name, color, sections[{id,t}]`.
- **inbox:** `text, source (ex.: siri), createdAt`.

Outras tabelas (todas com RLS ligado): `item_history` (histórico por versão), `alarms` (avisos agendados; chave `key` única), `alarm_repeats` (repetições do aviso), `push_subscriptions` (aparelhos que recebem aviso), `push_config` e `app_secrets` (**chaves e código — fechadas, ninguém lê pela API; nunca copie nem mostre**), `fin_records` (FIN).
Anexos: bucket privado `anexos`, cada pessoa só na própria pasta `<id-do-dono>/<arquivo>`. Limite do app: 45 MB por arquivo.
Hora: tudo em **America/Sao_Paulo**.
Cópia local: o app guarda um cache e uma fila de alterações no aparelho (`localStorage`: `nucleo-cache`, `nucleo-q`, `nucleo-map`, `nucleo-sess`…) e sincroniza quando há internet.

## 5. ALARMES COM O APP FECHADO (comprovado no iPhone em 14/10/2026)

1. O app grava em `alarms` um registro por aviso (chave = item + aviso + horário + resumo da mensagem). O app apaga os que não reconhece (exceto chaves `teste|…` e `tempo|…`).
2. O banco tem um agendador (**pg_cron**, trabalho `nucleo-alarmes`) que **a cada minuto** chama `public.chamar_alarmes()`.
3. Essa função chama a função de borda **`enviar-alarmes`** (Supabase Edge Function, versão 6, sem verificação de login; protegida por um código guardado no banco).
4. Ela lê `push_config` (assunto, chave pública e privada do Web Push) e envia o aviso ao iPhone. Remove inscrições inválidas (401/403/404/410).
5. **Repetição:** o aviso repete até 10 vezes, de 2 em 2 minutos, até o Marcelo abrir o app (o app apaga as repetições ao abrir). Limite de 50 alarmes atrasados por rodada.
6. O iPhone mostra uma **notificação com som curto** — não é um despertador. Para despertador forte existe o caminho do Relógio (seção 7).
- Não confirmado no iPhone: a repetição de 2 em 2 minutos chegando, e o aviso do temporizador de ponta a ponta.

## 6. SIRI → CAIXA DE ENTRADA (comprovado por relato do Marcelo)

Atalho **"Anotar"** no app Atalhos (montado pelo Marcelo): dita o texto e faz `POST` na função `public.siri_captura(p_token, p_texto)` (via `/rest/v1/rpc/siri_captura`, com `apikey` e `Content-Type`). A função só sabe **inserir um item `inbox`** (`source:'siri'`). O app converte em lembrete ao abrir (entende data e hora). O código (`p_token`) é secreto e fica só no banco e no atalho dele.
"Me lembre" é comando da própria Siri (vai para o app Lembretes da Apple); por isso o atalho se chama **Anotar**.

## 7. ALARME FORTE NO RELÓGIO DO IPHONE (montado, não comprovado)

O Relógio do iPhone não aceita data. Lembretes com `strong:true` entram na função `public.alarmes_fortes(p_token, p_horas default 23)`, que devolve linhas `MINUTOS|Título` (minutos a partir de agora). Dois atalhos do Marcelo: **"Alarme Nucleo"** (cria um alarme no Relógio somando os minutos à hora atual) e **"Sincronizar Alarmes Nucleo"** (chama a função e repete o primeiro para cada item). Ainda **não confirmado no iPhone**; o Marcelo precisa ajustar o atalho (usar "Ajustar data" e proteger o "Apagar alarmes" com "se tem algum valor").

## 8. BACKUP

- **Manual (existe):** Ajustes › Exportar backup → arquivo JSON com `exportadoEm, lembretes, listas, notas, pastas, compromissos, caixaDeEntrada`. "Importar backup" lê o mesmo arquivo.
- **Automático (NÃO existe):** `supabase/011_backup_e_limpeza.sql` está pronto mas **não foi aplicado** (o sistema cancelou a escrita no banco em 15/10). Não trate como backup ativo.
- Anexo perdido: `CNH ELISA 2.pdf` foi apagado do armazenamento (causa provável: apagar de vez uma cópia que compartilhava o arquivo; corrigido na v36). Não há cópia; o Marcelo precisa anexar de novo ao lembrete `14ad44cf-505a-402e-82c8-f96c4a9bce4d`.

## 9. FIN (dinheiro) — SISTEMA SEPARADO, AO LADO DO NÚCLEO

- App em `fin/` (https://nucleo51.github.io/nucleo/fin/), tabela `fin_records` (kind + data JSON; valores em **centavos inteiros**; dado ausente = `null`). Contrato completo em `fin/API.md`.
- **Nunca paga, nunca move dinheiro, nunca contrata.** Separa Marcelo e Marlene por titular e por quem paga. Dados de teste falsos devem ser apagados antes dos reais.
- Botão **Baixar cópia dos dados** (avisa após 7 dias) e importador de extrato do Mobills (.xlsx). O chat financeiro por chamada HTTP (`fin_chat`, SQL 006) **não foi ativado**.
- FIN (app) **não é** o FIN512 (owner financeiro do ecossistema). Construir o app não dá autoridade sobre as finanças.

## 10. ONDE ESTÁ CADA COISA

| o quê | onde |
|---|---|
| Código e testes | GitHub `NUCLEO51/nucleo` (`main` = publicado) |
| App | https://nucleo51.github.io/nucleo/ |
| Banco, login, anexos, função de avisos | Supabase pessoal (endereço e chave **pública** na constante `CFG` de `index.html`) |
| Cópia do código no Mac do Marcelo | `~/Projects/nucleo` (git e `gh` já logados) |
| Identidade, regras e histórico do NCLD512 | Google Drive, casa `1HLATmmVC9ZKolS5nNV-Zh4w2KubMzwo9` (CHAVE, ENTRADA, IDENTIDADE, Prompt Master v1.2, EAO, HVI, HV B001) — **só leitura para você** |
| Este guia (cópia no Drive) | pasta `02_OPERACAO_NUCLEO` da casa do NCLD512 |
| Painel de acompanhamento | Trello "NCLD512" (só projeção; a verdade está no Drive) |

## 11. HISTÓRICO RESUMIDO (versões do app)

- v9 (13/10): base do app (lembretes, notas, agenda, desenho, anexos, Siri, avisos).
- 13–14/10: FIN; botão Baixar cópia; alarmes com app fechado (servidor, chaves no banco, relógio por minuto); botão Voltar flutuante; ícone caveira verde neon; Anotar com formulário completo e avisos "antes"; aviso que repete.
- v16–v25 (14–15/10): listas com concluídos, Siri/Atalhos, alarme forte, Relógio (cronômetro/temporizador), fixar no topo, limpeza de caixas e bandeira removida.
- v26 (15/10): auditoria geral e melhorias; v27–v36: caixa de entrada única, anexo compartilhado protegido.
- v37–v38 (16/10): Planner em botão e página própria.
- **v39:** busca geral. **v40:** tela Hoje só com botões, Caixa de entrada em página própria, data grande. **v41:** botões de Notas no topo. **v42:** notas em cartões; Notas e Lembretes voltam ao início ao sair. **v43:** sem o botão "Criar a pasta Documentos". **v44:** sem contador na aba Hoje. **v45:** pasta em árvore recolhível, Nova subpasta e Buscar no topo. **v46:** contagens em bolinha neon.
- Cada mudança tem uma **tag de volta** `antes-AAAAMMDD-assunto` (ex.: `antes-20261016-contagem-neon`) apontando para o estado anterior.

## 12. COMO FAZER UMA MUDANÇA (regras de trabalho)

Política de branch do Núcleo (decidida pelo Marcelo em 14/10/2026 para o NCLD512; **para o ChatGPT vale a versão abaixo, que precisa ser confirmada por ele**):
1. Ler o estado: `git fetch`, `main` atualizada, último commit, README e este guia.
2. Criar branch a partir da `main`: `chatgpt/AAAAMMDD-assunto` (o NCLD512 usa `ncld/…`).
3. Criar a **tag de volta** na `main` atual: `antes-AAAAMMDD-assunto` e enviá-la.
4. Mexer o mínimo. Subir `APP_V` em `index.html` **e** `V` em `sw.js`.
5. Rodar `cd tests && npm install && npm test`. Hoje são **117 testes** e todos precisam passar. Teste novo para cada mudança.
6. Conferir a aparência numa tela de **390 px** (a letra e os botões grandes são requisito).
7. **Não juntar na `main` sem o Marcelo autorizar** (sugestão: abrir Pull Request). Depois do merge, conferir no remoto e na página publicada (`sw.js` com a versão nova; `gh api repos/NUCLEO51/nucleo/pages/builds/latest`).
8. Se der problema: voltar a `main` para a tag e dizer ao Marcelo.
- **SQL no banco:** só o Marcelo executa ou autoriza, **um por um**; SQL que apaga dados exige confirmação explícita. Não use `service_role`.
- **Dados reais:** só leia ou escreva dados do Marcelo com ordem dele para aquele ato. Ao gravar em `items`: envie a `version` atual, use `updated_by:'helena'` (ou `'chat'`), nunca faça DELETE, nunca mude `owner`. **Escrita do ChatGPT no banco nunca foi testada** — comece por uma leitura e um item de teste que o Marcelo veja.
- Registre o que fez no texto do commit e diga ao Marcelo; o NCLD512 reconcilia o histórico depois.

## 13. ARMADILHAS CONHECIDAS (economizam horas)

- **O script do app é um único bloco isolado.** Os testes só enxergam funções de dentro dele pelo gancho `window.__NUCLEO_TEST__` (definido antes do carregamento; no uso normal não existe). Para testar uma função nova, acrescente-a ao objeto do gancho (perto de `buildTabs();render();Store.init();`).
- Estado global `S` (aba atual, pasta aberta, busca, setinhas abertas…). `render()` redesenha a aba atual e **preserva a rolagem**; `go(fn)` faz `fn`, redesenha e **volta ao topo** — use `render()` direto para abrir/recolher no lugar.
- Não redesenhe tudo enquanto o campo de busca está com o teclado aberto (o `render()` já trata isso para `rq` e `q`); ao fechar a busca, tire o foco do campo antes.
- No iPhone o teclado só abre se o `focus()` acontece **dentro do toque**; por isso a lupa e o "+" focam o campo no mesmo clique.
- Ao **sair de Notas ou Lembretes** (ação `tab`) o estado interno é zerado (pasta, busca, setinhas, página do Lembretes).
- Mac: `sed -i` precisa de `sed -i ''`. A leitura de documentos grandes do Drive (como o registro global `HV-REG001`) corta em 100 mil caracteres.
- GitHub Pages demora 1–3 minutos; confira `built` no commit certo antes de dizer "publicado".
- O Supabase às vezes **cancela escritas** (migrações/SQL) vindas de conectores; leituras funcionam.

## 14. O QUE ESTÁ COMPROVADO E O QUE NÃO ESTÁ (em 16/10/2026)

Comprovado no iPhone (Marcelo): captura por Siri; aviso com app fechado (print de 14/10 19:14); Planner v37.
Comprovado por testes automáticos e foto de tela (não no iPhone): tudo de v39 a v46.
**Não confirmado no iPhone:** teclado do "+" (v35) e Planner v38; Voltar flutuante; botão Baixar cópia do FIN; importador do Mobills; som do "Ouvir"; repetição de 2 em 2 minutos; atalhos de alarme do Relógio; **todas as telas novas de hoje (v39–v46)**.
**Pendências do Marcelo/decisões:** anexar de novo a CNH ELISA 2.pdf; liberar escritas no Supabase para o backup diário e limpeza de 2 inscrições push antigas; visão de mês do Planner; revisão do GDA512 sobre o bloco do NCLD512 no registro global; ajustar os atalhos de alarme.

## 15. COMO COMEÇAR UMA CONVERSA COM O MARCELO

1. Cumprimente curto e pergunte o que ele quer **agora** (não proponha lista de tarefas).
2. Se for mudar o app: confirme o pedido em uma frase, mostre o que vai mudar e só então faça (em branch).
3. Ao terminar: diga o que ficou pronto, o que foi testado e **o que ele precisa conferir no iPhone** (passo a passo curto: "feche e abra o Núcleo, toque em…").
4. Nunca peça a ele passos técnicos que você consegue fazer. Quando só ele pode (SQL, teste no iPhone), dê o passo a passo curto.

FIM DO GUIA — v1.0 — 16/10/2026 — NCLD512
