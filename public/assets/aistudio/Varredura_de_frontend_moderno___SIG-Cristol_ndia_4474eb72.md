# Varredura de frontend moderno — SIG-Cristolândia

**Repositório analisado:** `estoquecristolandia-cloud/estoque`  
**Branch:** `main`  
**Commit analisado:** `ac82211`  
**Última atualização observada:** 23/10/2026  
**Escopo:** melhorias modernas de frontend que tragam ganho operacional real, principalmente em celular, velocidade, responsividade, estoque ao vivo e usabilidade.

## Conclusão direta

O sistema já tem uma base funcional forte: React 19, Vite, Tailwind 4, PWA, Firebase/Firestore em tempo real, dark mode, Command Palette, scanner de código de barras, leitura de nota fiscal, voz, IA e dashboard analítico. O próximo salto não é trocar toda a stack. É transformar o frontend em uma aplicação operacional mais rápida, modular, resiliente e confortável para uso em celular.

As três maiores oportunidades são:

1. dividir o carregamento inicial, porque `src/App.tsx` importa praticamente todos os módulos e há componentes muito grandes;
2. substituir o cache paralelo em `localStorage` por uma estratégia offline estruturada com persistência nativa do Firestore ou IndexedDB para dados de trabalho;
3. modernizar as superfícies de operação — tabela de estoque, filtros, formulários e navegação — com virtualização, transições não bloqueantes, container queries, acessibilidade real e feedback de sincronização.

## O que já está moderno no repositório

O projeto já possui bons elementos atuais:

- React 19 e `motion` para animações;
- Tailwind CSS 4;
- PWA com manifest, service worker e instalação;
- listeners reativos do Firestore;
- cache local e liberação da tela em modo offline;
- Command Palette com atalho `Ctrl/Cmd + K`;
- scanner de código de barras e leitor de nota fiscal;
- suporte a voz e transcrição;
- dashboard com KPIs, gráficos e alertas;
- tema claro/escuro;
- foco visível global em `src/index.css`;
- regras de negócio e auditoria matemática cobertas por testes.

Os commits mais recentes também mostram evolução funcional: novos setores, melhoria de responsividade, contexto de reconciliação para IA e reforço de autenticação/estoque.

## Diagnóstico atual do frontend

### 1. O shell principal está muito acoplado

`src/App.tsx` importa diretamente o dashboard, produtos, entradas, saídas, refeições, relatórios, IA, inventário físico, scanners, modais, exportações e outros módulos. Isso torna o primeiro bundle pesado e faz o navegador baixar código de telas que o usuário talvez nunca abra.

O projeto também possui componentes muito grandes. Entre os maiores estão:

- `PurchaseForecastReport.tsx`;
- `MealManager.tsx`;
- `ReportsView.tsx`;
- `MovementsHistory.tsx`;
- `AiAssistantView.tsx`;
- `PhysicalInventoryModal.tsx`;
- `FirestoreLiveAuditReport.tsx`;
- `ProductManager.tsx`;
- `Header.tsx`.

Isso sugere uma modernização incremental por módulos, não uma reescrita total.

### 2. O PWA está funcional, mas ainda é um cache de arquivos

`public/sw.js` usa uma estratégia simples de cache-first/fallback para arquivos e páginas. Ele não intercepta Firestore, Firebase ou `/api`, o que é correto para não congelar dados remotos no service worker.

Entretanto, o sistema usa `localStorage` em paralelo para produtos, movimentos, refeições e kits. O próprio web.dev recomenda Cache Storage para recursos acessados por URL e IndexedDB para dados estruturados pesquisáveis e persistentes. `localStorage` é síncrono e não é recomendado para armazenamento complexo [4].

O Firebase documenta persistência offline nativa do Firestore na web por meio de `persistentLocalCache`, com suporte a gerenciamento single-tab ou multi-tab [5]. O sistema deve avaliar essa capacidade antes de criar uma segunda camada de sincronização própria.

### 3. A responsividade ainda é baseada principalmente no viewport

O projeto usa muitos breakpoints Tailwind e ajustes em `App.tsx`, `Header.tsx` e componentes de dashboard. Isso funciona, mas cartões reutilizáveis e painéis encaixados em diferentes regiões se beneficiariam de CSS Container Queries.

Container queries permitem que um componente responda ao tamanho do próprio contêiner, e não somente ao tamanho total da tela [6]. Isso é especialmente adequado para:

- cards de KPI;
- painéis de alerta;
- tabela de estoque dentro de um painel estreito;
- cards de produtos em desktop, tablet e celular;
- conteúdo dentro de modais.

### 4. A tabela de estoque ainda renderiza todos os produtos filtrados

`CurrentStockOverview.tsx` filtra e renderiza os produtos diretamente em um `<table>`. Com os atuais 14 produtos isso não é um problema imediato, mas o sistema tende a crescer com DML, novos setores, kits, itens de higiene e histórico.

O TanStack Virtual calcula quais itens estão no viewport e mantém o contrato de rolagem sem montar milhares de nós no DOM [3]. Ele seria útil para:

- histórico de movimentações;
- auditoria Firestore;
- tabela de produtos;
- resultados da IA;
- logs e relatórios extensos.

Não recomendo virtualizar o dashboard inteiro. Recomendo começar pelas listas longas.

## Recomendações priorizadas

## Prioridade 1 — fazer primeiro

### A. Code splitting por módulo operacional

Usar `React.lazy` e `Suspense` para carregar sob demanda:

- Relatórios;
- Assistente IA;
- Inventário físico;
- Auditoria Firestore;
- Previsão de compras;
- Scanner de nota fiscal;
- Exportação PDF;
- Gestão de refeições;
- Modais secundários.

O React documenta `lazy` como forma de adiar o carregamento do código do componente até a primeira renderização, usando `Suspense` para o estado de carregamento [7]. O web.dev explica que JavaScript grande bloqueia parsing, compilação e resposta inicial; `import()` e code splitting reduzem o trabalho no startup [8].

**Ganho esperado:** inicialização mais rápida, menor pressão no celular e menor custo de CPU.

### B. Estrutura de navegação por módulos

Hoje a navegação troca a aba dentro de um `App.tsx` muito grande. O sistema não precisa necessariamente migrar para outro framework, mas deve separar cada área em módulos de tela:

```text
src/features/
  dashboard/
  products/
  movements/
  meals/
  inventory/
  reports/
  ai/
  administration/
```

Cada módulo deve possuir:

- tela;
- componentes locais;
- hooks específicos;
- tipos locais;
- testes;
- estado de carregamento;
- estado vazio;
- estado de erro.

### C. Barra de estado operacional visível

Adicionar uma faixa persistente e discreta informando:

- Online;
- Offline;
- Sincronizando;
- Alterações pendentes;
- Última sincronização;
- Erro de sincronização;
- Dados exibidos do cache.

Hoje o sistema libera a tela em offline e mantém cache local, mas isso precisa ser transparente para o operador. Em estoque, o usuário deve saber se está vendo o saldo confirmado no Firestore ou uma cópia local.

### D. Persistência offline estruturada

Avaliar uma destas estratégias:

1. Firestore com `persistentLocalCache` e `persistentMultipleTabManager` quando o fluxo permitir;
2. IndexedDB para fila local de operações, com identificador de operação, estado de sincronização e retry;
3. Manter `localStorage` somente para preferências pequenas, como tema, filtros e preferências da interface.

Não remover o backup JSON existente antes de validar recuperação e migração.

## Prioridade 2 — grande ganho operacional

### E. Operações otimistas com reconciliação explícita

O React documenta `useTransition` para manter a interface responsiva durante ações assíncronas e `useOptimistic` para mostrar feedback imediato enquanto uma alteração ainda está sendo confirmada [1].

Aplicações adequadas no SIG:

- registrar uma saída;
- registrar entrada;
- confirmar kit;
- salvar refeição;
- alternar filtro de departamento;
- abrir uma tela pesada;
- atualizar uma quantidade no inventário.

Para operações que alteram saldo, a atualização otimista deve sempre apresentar estado `pendente` e ser revertida se a transação falhar. Nunca deve mascarar falha de escrita.

### F. Virtualização das listas longas

Adotar TanStack Virtual primeiro em:

- `MovementsHistory`;
- `FirestoreLiveAuditReport`;
- `ReportsView`;
- tabela de produtos quando o catálogo crescer.

A tecnologia é apropriada porque preserva a liberdade de construir a aparência da linha e só reduz o número de elementos montados [3].

### G. Container Queries nos componentes reutilizáveis

Adicionar `container-type: inline-size` em cards e painéis principais e usar `@container` para adaptar:

- KPIs;
- cabeçalhos de tabela;
- painéis de alerta;
- cards de produto;
- painéis de IA;
- modais largos ou estreitos.

Isso evita que um componente fique correto no desktop completo, mas quebre quando aparece dentro de um modal, sidebar ou painel dividido [6].

### H. Formulários operacionais de uma mão no celular

Modernizar entradas e saídas com:

- teclado numérico para quantidade;
- foco automático no primeiro campo;
- navegação por `Enter`;
- botão primário fixo na parte inferior do celular;
- resumo da operação antes da confirmação;
- confirmação curta para ações destrutivas;
- leitura de código abrindo diretamente a operação apropriada;
- suporte a grandes áreas de toque;
- prevenção de perda de dados se o teclado fechar.

Esse ganho é mais importante que adicionar efeitos visuais.

## Prioridade 3 — acabamento moderno de alto valor

### I. View Transition API para mudanças de módulo

A View Transition API foi criada para animar mudanças entre estados e views em SPAs e reduzir a sensação de espera, mantendo o usuário no contexto [2].

Usaria de forma moderada:

- dashboard → produtos;
- produtos → timeline;
- produto → entrada/saída;
- relatório → detalhe;
- troca Alimentação ↔ DML.

Deve haver fallback sem animação e respeito a `prefers-reduced-motion`. Não usaria transição em cada clique de botão ou em atualização de saldo.

### J. Design system baseado em tokens de estado

O CSS já possui bons tokens de canvas, surface, texto, sucesso, alerta, crítico e informação. O próximo passo seria formalizar tokens para:

- `pending`; 
- `offline`; 
- `syncing`; 
- `stale`; 
- `readonly`; 
- `admin`; 
- `physical-discrepancy`; 
- `ai-confidence-high/medium/low`.

Isso impediria que cada componente inventasse suas próprias cores e tornaria a operação mais legível.

### K. Acessibilidade de nível operacional

O W3C recomenda padrões específicos para nomes acessíveis, landmarks, foco e interações de teclado em componentes ricos [4]. O sistema já tem foco visível global, mas deve auditar:

- menus mobile;
- modais;
- Command Palette;
- selects e filtros;
- tabelas;
- alertas de estoque;
- leitor de código;
- botões somente com ícone;
- anúncio de sucesso/erro para leitor de tela;
- retorno de foco ao fechar modal.

O objetivo é permitir que operações críticas sejam feitas por teclado e que status importantes sejam anunciados, sem depender somente de cor, emoji ou animação.

## O que eu não recomendo agora

### 1. Reescrever em Next.js apenas por estar na moda

O sistema é operacional e autenticado, não depende principalmente de SEO. Migrar de Vite/Express/Firebase para Next.js agora traria risco e retrabalho sem ganho proporcional.

### 2. Trocar Firebase por outro backend

O Firestore já sustenta listeners, autorização, transações e regras específicas. O problema atual é a experiência de sincronização e a organização do frontend, não a necessidade de trocar o banco.

### 3. Adicionar uma biblioteca visual pesada

O projeto já tem Tailwind, Lucide e Motion. Recomendo consolidar tokens e componentes antes de introduzir uma segunda linguagem visual.

### 4. Usar IA para cálculos de saldo

A separação atual entre motor determinístico e Gemini é correta. IA deve explicar, resumir e sugerir; o saldo oficial deve continuar vindo de cálculo determinístico e Firestore.

### 5. Transformar tudo em animação

Estoque é uma ferramenta de trabalho. Animações devem orientar mudança de contexto, não atrasar entrada, saída ou conferência física.

### 6. React Compiler como primeira intervenção

O React Compiler pode reduzir a necessidade de `useMemo`, `useCallback` e `React.memo`, e possui estratégia de adoção incremental [9]. Porém, ele não resolve automaticamente o bundle grande, a arquitetura monolítica, o cache offline ou a experiência de operação. Eu o avaliaria depois do code splitting e da separação dos módulos.

## Roadmap recomendado

### Fase 1 — performance e segurança de percepção

- separar telas com `lazy`/`Suspense`;
- medir bundle e Core Web Vitals;
- criar fallback de carregamento por módulo;
- adicionar faixa de estado online/offline/sync;
- manter operações de saldo com confirmação autoritativa.

### Fase 2 — operação em celular

- revisar entradas e saídas para uso com uma mão;
- botões de toque maiores;
- teclado adequado por tipo de campo;
- confirmação resumida;
- filtros rápidos e busca por voz/código;
- tabela responsiva com modo card no celular.

### Fase 3 — dados grandes

- virtualizar movimentações e auditorias;
- separar carregamento de relatórios;
- limitar consultas e histórico exibido;
- preservar posição de rolagem ao retornar de um detalhe.

### Fase 4 — offline verdadeiro

- testar persistência nativa do Firestore;
- migrar preferências e fila operacional para IndexedDB quando necessário;
- definir conflitos e estados de retry;
- adicionar indicador de operação pendente;
- testar duas abas e reconexão.

### Fase 5 — acabamento e acessibilidade

- container queries;
- View Transition API com fallback;
- auditoria de teclado e leitor de tela;
- tokens completos de estado;
- adoção gradual do React Compiler, se os testes justificarem.

## Minha recomendação final

Se o objetivo é deixar o SIG-Cristolândia com aparência e comportamento de produto moderno, eu faria primeiro **code splitting + barra de sincronização + operação mobile-first + virtualização de histórico**. Essas quatro melhorias são mais valiosas que adicionar outra biblioteca ou reconstruir o sistema em uma stack diferente.

O frontend atual já tem a matéria-prima de um bom produto: domínio rico, dados em tempo real, PWA e muitos fluxos operacionais. O que falta é uma camada de engenharia de produto que torne essa riqueza mais rápida, previsível e fácil de usar no cotidiano.

## Referências

[1]: https://react.dev/reference/react/useTransition "React useTransition"
[2]: https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API "MDN View Transition API"
[3]: https://tanstack.com/virtual/latest "TanStack Virtual"
[4]: https://web.dev/learn/pwa/offline-data "web.dev Offline data"
[5]: https://firebase.google.com/docs/firestore/manage-data/enable-offline "Firebase Firestore offline persistence"
[6]: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries "MDN CSS container queries"
[7]: https://react.dev/reference/react/lazy "React lazy"
[8]: https://web.dev/learn/performance/code-split-javascript "web.dev Code-split JavaScript"
[9]: https://react.dev/learn/react-compiler "React Compiler"
