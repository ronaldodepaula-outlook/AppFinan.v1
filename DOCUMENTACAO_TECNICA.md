# Documentação Técnica do Projeto AppFinan

## Visão Geral
O AppFinan é um aplicativo desenvolvido em React Native para controle financeiro pessoal, permitindo o gerenciamento de categorias, transações, grupos, estabelecimentos e perfis de usuário.

## Estrutura do Projeto
- `App.js`: Arquivo principal do app.
- `index.js`: Ponto de entrada da aplicação.
- `screens/`: Contém todas as telas do app (Login, Cadastro, Home, Categorias, Detalhes, Estabelecimentos, Grupos, Perfil, Configurações, Splash, Subgrupos, Transações).
- `assets/`: Imagens e ícones utilizados no app.
- `package.json`: Dependências e scripts do projeto.

## Principais Dependências
- React Native
- React Navigation
- Outras dependências listadas em `package.json`

## Navegação
A navegação entre telas é feita utilizando React Navigation, com rotas para cada tela principal.

## Estrutura das Telas
Cada tela está localizada em `screens/` e implementa funcionalidades específicas:
- `LoginScreen.js` e `RegisterScreen.js`: Autenticação de usuários.
- `HomeScreen.js`: Dashboard principal.
- `CategoriesScreen.js`, `CategoryDetailScreen.js`, `SubgroupScreen.js`: Gerenciamento de categorias e subgrupos.
- `TransactionScreen.js`: Cadastro e visualização de transações.
- `GroupScreen.js`: Gerenciamento de grupos.
- `EstablishmentScreen.js`: Cadastro de estabelecimentos.
- `ProfileScreen.js`: Perfil do usuário.
- `SettingsScreen.js`: Configurações gerais.

## Como Executar o Projeto
1. Instale as dependências:
   ```
   npm install
   ```
2. Execute o app:
   ```
   npx react-native run-android # ou run-ios
   ```

## Estrutura de Dados
As telas utilizam estados locais e/ou integração com backend (caso implementado) para manipulação dos dados financeiros.

## Customização
- As imagens podem ser alteradas na pasta `assets/`.
- Novas telas podem ser adicionadas em `screens/` seguindo o padrão existente.

## Contato
Para dúvidas técnicas, entre em contato com o desenvolvedor responsável.
