# AppFinan

Aplicativo mobile em React Native (Expo) para controle financeiro pessoal. Permite gerenciar categorias, grupos, subgrupos, estabelecimentos, transações e perfis de usuário. Suporta backup, restauração e exportação completa de dados.

---

## Descrição

AppFinan é um app simples e prático para acompanhamento das finanças pessoais. O usuário pode cadastrar categorias, grupos e subgrupos para organizar suas transações, associar estabelecimentos, e gerar relatórios/exports dos dados.

---

## Principais funcionalidades

- Gerenciar Categorias: criar / editar / excluir categorias.
- Gerenciar Grupos e Subgrupos: organizar transações por grupo/subgrupo.
- Registrar Movimentações: receitas e despesas com tipo, frequência, valor, descrição, categoria, grupo, subgrupo e estabelecimento.
- Cadastrar Estabelecimentos: associar transações a locais/lojas.
- Usuários / Autenticação: dados de perfil e sessão (armazenados localmente).
- Backup / Restauração: exportar/importar backup em formato JSON.
- Exportação Completa em CSV: gera arquivos por entidade (movimentações, categorias, grupos, subgrupos, estabelecimentos, usuários e autenticação).

---

## Tecnologias

- React Native + Expo
- React Navigation
- `@react-native-async-storage/async-storage`
- `react-native-vector-icons`
- `react-native-picker-select`
- Outras dependências listadas em `package.json`

---

## Pré-requisitos

- Node.js (recomendado LTS)
- npm ou yarn
- Expo CLI (opcional: `npx expo` funciona sem instalação global)
- Emulador Android/iOS ou app Expo Go no celular

---

## Instalação

1. Clone o repositório:

```powershell
git clone https://github.com/<seu-usuario>/AppFinan.v1.git
cd "AppFinan.v1"
```

2. Instale as dependências:

```powershell
npm install
# ou
yarn
```

---

## Executando em desenvolvimento

```powershell
npm start
# ou
npx expo start
```

Abra no emulador ou pelo app Expo Go.

---

## Estrutura do projeto (resumo)

- `App.js` — configuração do Navigation e header personalizado.
- `index.js` — ponto de entrada.
- `screens/` — telas do app (Login, Register, Home, Categories, CategoryDetail, Group, Subgroup, Transaction, Establishment, Profile, Settings, Splash etc.).
- `assets/` — imagens e ícones.
- `package.json` — dependências e scripts.
- `DOCUMENTACAO_TECNICA.md` — documentação técnica.
- `MANUAL_USUARIO.md` — manual do usuário.

---

## Chaves principais do AsyncStorage

As principais chaves usadas para armazenamento local são (sufixadas pelo email do usuário):

- `transactions_<email>` — transações do usuário.
- `categories_<email>` — categorias.
- `groups_<email>` — grupos.
- `subgroups_<email>` — subgrupos.
- `establishments_<email>` — estabelecimentos.
- `users_<email>` — lista de usuários (quando existente).
- `userData` — dados de sessão/autenticação.

Ao desenvolver novas funcionalidades que salvam dados localmente, siga este padrão de chaves para manter organização por usuário.

---

## Backup e Exportação

- Backup completo em JSON: `financas_backup_completo_<user>_<date>.json` (gerado pela tela `Settings`).
- Exportação completa em CSV: diretório `appfinan_export_completo_<date>/` com arquivos por entidade, ex.: `01_Movimentacoes.csv`, `02_Categorias.csv`, `03_Grupos.csv`, etc.
- A restauração usa o arquivo JSON exportado e aplica os dados ao `AsyncStorage` (verifique usuário antes de sobrescrever).

---

## Como contribuir

1. Fork o repositório.
2. Crie uma branch para sua feature/bugfix:

```powershell
git checkout -b feat/nova-funcionalidade
```

3. Faça commits pequenos e descritivos:

```powershell
git commit -m "feat: adicionar validação em formulário de grupo"
```

4. Abra um Pull Request.

---

## Notas para desenvolvedores

- Ao alterar estruturas de dados, atualize as rotinas de importação/backup em `SettingsScreen.js`.
- Verifique compatibilidade de formatos (arrays vs objetos mapeados) — o projeto já contém correções que aceitam ambos os formatos em leitura.
- Teste em Android e iOS; alguns comportamentos (status bar / safe area) podem variar.
- Use `console.log` e o Metro bundler para depuração rápida.

---

## Licença

Escolha a licença que preferir (ex.: MIT). Para incluir a MIT, adicione um arquivo `LICENSE` na raiz com o texto da licença.

---

## Contato

- Autor / Responsável: Seu Nome — `seu.email@exemplo.com`
- Abra issues no GitHub para bugs e solicitações de features.

---

Se quiser, eu posso também:

- Atualizar o `package.json` com um script `build` ou `start` específico.
- Gerar o arquivo `LICENSE` (MIT) automaticamente.
- Adicionar instruções adicionais no `MANUAL_USUARIO.md`.

