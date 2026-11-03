# Vantora 2

App (PWA) da esteira da Vantora 2: do produto candidato até estar à venda, com as decisões que só o Marcelo toma. Fica na pasta `vantora2/`, ao lado do Financeiro (`fin/`) e da Casa (`casa/`), e usa o mesmo banco do Núcleo (tabela `van2_records`, ver `supabase/013_vantora2.sql`).

- Link: https://nucleo51.github.io/nucleo/vantora2/
- Login: o mesmo email e senha do Núcleo e do Financeiro.
- Versão: `V` em `sw.js` muda a cada publicação (a tela se atualiza sozinha quando há internet).
- Etapas (`EST` em `index.html`): candidato → avaliado → **leão** → fornecedor e amostra → **comprado** → **à venda**. Os passos em negrito só andam com a confirmação do Marcelo. Fornecedor e amostra podem ficar em branco sem travar nada.
- Tipos de registro: `produto` (a etapa fica em `data.estagio`), `busca` (o que as pessoas digitam), `nota` (Caixa; o Claude também pode gravar com `source: 'claude'`).
- Descartar um produto só marca `data.descartado` e o motivo. Excluir = preencher `deleted_at` (Lixeira); uma rotina diária remove o que passou de 30 dias.
- A margem é calculada na tela (preço − custo − taxa % − frete). Nenhuma taxa vem pronta no código: o Marcelo informa a vigente do Seller Center.
- Regras de interface do Marcelo: letra grande com controle A−/A+, confirmação antes de salvar, excluir ou mudar de etapa, botão Voltar em toda folha, nenhum aviso depois de salvar.
- Só código aqui: nenhum dado de negócio, senha ou chave secreta.
