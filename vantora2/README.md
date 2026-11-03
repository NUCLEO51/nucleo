# Vantora 2

App (PWA) da esteira da Vantora 2: do produto candidato até estar à venda, com as decisões que só o Marcelo toma. Fica na pasta `vantora2/`, ao lado do Financeiro (`fin/`) e da Casa (`casa/`), e usa o mesmo banco do Núcleo (tabela `van2_records`, ver `supabase/013_vantora2.sql`).

- Link: https://nucleo51.github.io/nucleo/vantora2/
- Login: o mesmo email e senha do Núcleo e do Financeiro.
- Versão: `V` em `sw.js` muda a cada publicação (a tela se atualiza sozinha quando há internet). A Lixeira fica no botão do Painel; as abas são Painel, Esteira, Nichos, Buscas e Caixa.
- Etapas (`EST` em `index.html`): candidato → avaliado → **leão** → fornecedor e amostra → **comprado** → **à venda**. Os passos em negrito só andam com a confirmação do Marcelo. Fornecedor e amostra podem ficar em branco sem travar nada.
- Tipos de registro: `produto` (a etapa fica em `data.estagio`), `busca` (o que as pessoas digitam), `nota` (Caixa; o Claude também pode gravar com `source: 'claude'`).
- Nichos (`nicho`, liberado em `supabase/014_vantora2_nichos.sql`): nome, nota de 1 a 5, motivo e o que falta medir. Só um tem `ativo: true` por vez. Ativar ou trocar pede confirmação forte (passo só do Marcelo). Buscas e produtos novos já vêm com o nome do nicho ativo. A nota é estimativa, não dado medido.
- Descartar um produto só marca `data.descartado` e o motivo. Excluir = preencher `deleted_at` (Lixeira); uma rotina diária remove o que passou de 30 dias.
- A margem é calculada na tela (preço − custo − taxa % − frete). Nenhuma taxa vem pronta no código: o Marcelo informa a vigente do Seller Center.
- Regras de interface do Marcelo: letra grande com controle A−/A+, confirmação antes de salvar, excluir ou mudar de etapa, botão Voltar em toda folha, nenhum aviso depois de salvar.
- Só código aqui: nenhum dado de negócio, senha ou chave secreta.

## Régua da Vantora 1 (v3)
Critérios lidos do POP-PFV001 v1.1 e do Manual PFV v0.6 (Drive da Vantora 1). Cada nicho mostra 14 itens, em dois blocos: jeito do produto (preço R$ 50–79, leve, sem vidro, sem eletrônico, baixa devolução, kit, premium) e prova de mercado (5–20 vendedores comparados, demanda distribuída, recência, triangulação, avaliações, diferenciação, economia). Estados: Confirmado, Plausível, Problema, Sem dado. Sem dado não é zero e não há nota somada. O dado fica em `data.regua` do nicho (`{chave: [estado, observação]}`), escrito pelo Claude. Produto ganhou classe PFV (A–D, X), vendedores comparados e pendência crítica; PFV-A só salva com 5+ vendedores comparados e sem pendência.

## v4 — o que veio da Vantora 1
- **Lucro com a comissão oficial**: a taxa da Shopee entra sozinha (tabela CNPJ/MEI desde 01/10/2026: até R$ 79,99 = 20% + R$ 4,50; R$ 80–99,99 = 14% + R$ 16; R$ 100–199,99 = 14% + R$ 20; R$ 200+ = 14% + R$ 26; abaixo de R$ 8 a fixa é metade do preço). Mostra a conta inteira e o preço mínimo para lucrar R$ 15. Os números vêm do registro `regra` no banco (o Claude atualiza); se faltar, o app usa os valores embutidos.
- **Procura é a prova do leão** (decisão de Marcelo em 27/10): produto tem "Prova de procura"; PFV-A exige procura alta, prova anotada e nenhuma pendência; comparar vendedores na Shopee é bônus. Aprovar leão mostra a prova.
- **O que falta por etapa** (gates G0–G11 resumidos): a ficha lista o que falta para a próxima etapa. Só travam: custo e preço para ir a Comprado; pendência crítica para ir a À venda. O resto pode ficar em branco.
- **Pedir caça ao Claude** (`pedido`): Marcelo pede pelo app; o Claude faz quando a conversa é aberta, muda o status para "fazendo" e "feito" e escreve o resultado.
- **Começar a vender** (`check`): 13 pendências de Marcelo tiradas do retorno da AUD de 06/10.
- **Números da Shopee e do MEI**: tabela, teto R$ 81.000, DAS R$ 82,05, metas e calculadora que não salva nada.
- **Como funciona**: o caminho do produto e quem faz cada passo.
