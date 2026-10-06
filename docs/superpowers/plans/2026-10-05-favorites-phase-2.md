# Favoritos Fase 2 — Implementation Plan

> **For agentic workers:** Usar superpowers:executing-plans para execução nesta sessão, ou superpowers:subagent-driven-development se o usuário escolher delegação. Executar tarefa por tarefa com TDD. Não fazer commits.

**Goal:** Migrar todos os corações mobile para um único cache canônico de IDs por usuário e role.

**Architecture:** QueryClient singleton e fronteira de sessão protegem caches privados. Hooks de IDs, mutation idempotente serializada e lista paginada centralizam favoritos; bindings globais reconciliam foco e rede.

**Tech Stack:** React Native 0.83.1, React 19.2, TanStack Query v5, Axios, Zustand, Jest, react-test-renderer, TypeScript e NetInfo se confirmada ausência de equivalente.

**Spec:** ../specs/2026-10-05-favorites-phase-2-design.md (aprovada).

## Global Constraints

- Backend é autoridade absoluta; cache ["favorites", "ids", userId, role] é única fonte derivada de membership.
- Aplicar a CUSTOMER e SALON_OWNER, com TDD e QueryClient real nos testes.
- Não alterar backend, versão ou patch do carrinho; não executar commit, push, merge ou build Android/iOS.
- Não usar polling, debounce para consistência, take=500, membership local, fallback do catálogo ou listeners por tela.
- Não usar refetchType: "inactive" como estratégia principal nem query key privada sem userId.
- Não corrigir falhas externas; comprovar falhas globais preexistentes em snapshot de HEAD.

## Review Focus

- Refresh/401 de A após B entrar não pode repetir HTTP com token B nem resetar B (tarefa 1).
- Rollback em um produto não pode desfazer mutation de outro produto (tarefa 3).
- GET de foco/rede durante intenções pendentes não pode apagar otimismo (tarefas 3 e 6).
- Remoção na fronteira da página não pode pular o próximo produto (tarefa 5).
- Erro de paginação/reconciliação deve permitir retry sem anunciar vazio incorretamente (tarefa 5).

## Procedimento TDD por tarefa

Para cada comportamento listado, escrever primeiro o teste, executá-lo e
confirmar falha pela ausência do comportamento. Implementar o mínimo, executar
novamente e confirmar verde antes do próximo comportamento. Falhas por erro
de montagem/importação exigem corrigir o teste antes de considerar RED válido.
Não adicionar produção sem esse ciclo. Mocks ficam nas fronteiras HTTP/nativas;
cache, observers, mutation scope e callbacks devem ser reais.

## Tarefa 1 — QueryClient único e isolamento de sessão

**Arquivos:** criar src/core/queries/queryClient.ts e
src/core/queries/sessionScope.ts; modificar App.tsx,
src/app/AppProviders.tsx, src/stores/auth.store.ts e src/core/api/client.ts.
Testes: src/core/queries/__tests__/sessionIsolation.test.ts e
src/core/api/__tests__/client.session.test.ts.

**Interfaces:** exportar queryClient: QueryClient;
getSessionGeneration(): number e advanceSessionGeneration(): number;
clearSessionQueryState(): Promise<void> cancela queries e remove cache.
Identidade vem do sub do JWT e activeRole; geração muda na fronteira de
sessão, inclusive logout/login do mesmo usuário. Refresh legítimo conserva geração.

- [ ] Escrever testes: provider/logout usam mesma instância; A privado carregado, logout, B antes do GET sem dados A; depois do GET somente dados B; HTTP/query/mutation tardios A não repovoam cache; refresh/401 A não alteram B.
- [ ] RED: `npx jest --runInBand src/core/queries/__tests__/sessionIsolation.test.ts src/core/api/__tests__/client.session.test.ts`.
- [ ] Implementar singleton; limpar/cancelar antes de expor nova sessão; proteger reset, hydrate, setSession, login, biometria, refresh e syncMe contra resposta de sessão superada. Manter funções do carrinho existentes.
- [ ] GREEN: repetir comando anterior, exigir todos os casos passando.

## Tarefa 2 — Serviço, chaves e IDs canônicos

**Arquivos:** criar src/features/favorites/favorites.keys.ts,
favorites.service.ts, useFavoriteIds.ts e __tests__/favoriteIds.test.tsx;
modificar src/core/api/endpoints.ts.

**Interfaces:** favoritesKeys.ids(userId: string, role: Role) retorna
["favorites", "ids", userId, role]; favoritesKeys.list retorna equivalente
com "list". getFavoriteIds(signal: AbortSignal): Promise<string[]>;
getFavoritesPage(page: number, limit: number, signal: AbortSignal):
Promise<FavoritePage>; setProductFavorite(productId: string, favorited: boolean):
Promise<{ favorited: boolean }>.
FavoritePage contém items, page, limit, total e hasMore conforme endpoint.
useFavoriteIds() retorna productIds, favoriteIdsSet, isFavorite(id),
isLoading, isFetching, isError e refetch. Membership desconhecido retorna
undefined até primeiro resultado; reutilizar Set por referência dos IDs.

- [ ] Confirmar formato do GET IDs em contrato/documentação disponível, somente leitura; rejeitar payload inválido sem convertê-lo em lista vazia.
- [ ] Escrever testes parametrizados CUSTOMER/SALON_OWNER: vazio, um, loading desconhecido, erro inicial, chave por usuário/role, sem sessão desabilitado, cancelamento AbortSignal e Set estável entre observers.
- [ ] RED: `npx jest --runInBand src/features/favorites/__tests__/favoriteIds.test.tsx`.
- [ ] Implementar serviço e hooks com staleTime finito e reconciliação por foco/rede.
- [ ] GREEN: repetir comando anterior.

## Tarefa 3 — Mutation otimista e concorrência

**Arquivos:** criar src/features/favorites/useSetFavorite.ts,
favoriteMutations.ts e __tests__/favoriteMutations.test.tsx.

**Interfaces:** useSetFavorite(productId: string) expõe mutation de
{ productId: string, favorited: boolean } e ação de clique derivada do cache
atual. Coordenador por QueryClient/sessão/produto mantém sequência e contagem
pendente, sem membership; permite bloquear reconciliação que apagaria otimismo.
Scope serializa rede por geração/userId/role/productId entre todos os observers.

- [ ] Escrever testes: favoritar de zero, otimismo antes do HTTP, PUT/DELETE e confirmação canônica, rollback PUT/DELETE, timeout seguido de GET, double tap PUT→DELETE, dois componentes mesmo produto, erro/sucesso antigo sem apagar intenção nova, produtos diferentes sem rollback cruzado e sessão antiga/paused sem envio com token B.
- [ ] Escrever teste de GET concorrente que chega durante mutation e preserva intenção até reconciliação final.
- [ ] RED: `npx jest --runInBand src/features/favorites/__tests__/favoriteMutations.test.tsx`.
- [ ] Implementar cancelamento/snapshot/otimismo; rollback por produto condicionado à sequência e sessão; confirmação canônica condicionada; invalidar/refazer IDs e lista ativa quando pendências terminarem. Timeout não dispensa GET.
- [ ] GREEN: repetir comando anterior com promises controladas para comprovar ordem, sem timers de consistência.

## Tarefa 4 — Corações e integração das telas

**Arquivos:** modificar src/features/components/product-details/ProductFavoriteButton.tsx,
SharedProductDetails.tsx e productDetails.types.ts; src/screens/customer/
CustomerHomeScreen.tsx, CustomerBuyScreen.tsx e components/CustomerProductGridCard.tsx;
src/screens/owner/OwnerHomeScreen.tsx, OwnerBuyScreen.tsx e
components/OwnerProductGridCard.tsx. Atualizar demais callsites encontrados por rg.
Testes: src/features/favorites/__tests__/favoriteScreens.test.tsx.

**Interfaces:** botão recebe productId e props visuais; remove initialFavorited.
Produto/catálogo deixa de determinar membership. Coração desconhecido usa
indicador neutro/loading; ação depende da base de IDs e retry em erro inicial.

- [ ] Escrever testes de renderização para Home + Shop e Home + Details observando o mesmo produto, relacionados, ambos os perfis; HTTP controlado comprova coração imediato em todos; catálogo contraditório não afeta coração.
- [ ] RED: `npx jest --runInBand src/features/favorites/__tests__/favoriteScreens.test.tsx`.
- [ ] Migrar botão e callsites; remover POST, estados locais, varreduras de caches, Sets locais, consultas detalhadas apenas para IDs, take=500 e fallbacks. Ajustar loading/refresh das telas para hook compartilhado.
- [ ] GREEN: repetir comando anterior e suites de IDs/mutations.

## Tarefa 5 — Favoritos completos com paginação

**Arquivos:** criar src/features/favorites/useFavoritesList.ts e
__tests__/favoritesPagination.test.tsx; modificar
src/screens/customer/CustomerFavoritesScreen.tsx,
src/screens/owner/OwnerFavoritesScreen.tsx e
src/features/favorites/components/SharedFavoritesScreen.tsx.

**Interfaces:** useFavoritesList() retorna items, total, hasMore, isLoading,
isReconciling, isError, isFetchingNextPage, fetchNextPage e retry.
useInfiniteQuery inicia page=1, limit=20; getNextPageParam usa hasMore/page.
SharedFavoritesScreen recebe onLoadMore, hasMore, loading da próxima página,
estado de reconciliação e retry; lista de produtos é metadado, IDs filtram render.

- [ ] Escrever testes parametrizados de 0/1/20/21/100, ambos os perfis: todas as páginas alcançáveis, page/limit corretos, total/hasMore coerentes, deduplicação e onEndReached sem requests simultâneos duplicados.
- [ ] Escrever testes de remoção imediata, remoção no limite da página seguida de refetch sem itens omitidos, abrir imediatamente após favoritar, falha/retry de próxima página e produto inactive removido por GET IDs.
- [ ] RED: `npx jest --runInBand src/features/favorites/__tests__/favoritesPagination.test.tsx`.
- [ ] Implementar paginação real, filtro canônico, total derivado durante otimismo e reconciliação de páginas; indicar busca de metadados pendentes sem estado vazio falso e sem exigir todos os IDs na primeira página.
- [ ] GREEN: repetir comando anterior e favoriteScreens.

## Tarefa 6 — Foco e conectividade globais

**Arquivos:** criar src/core/queries/queryLifecycle.ts e
__tests__/queryLifecycle.test.tsx; modificar App.tsx; package.json e
package-lock.json somente se necessário instalar NetInfo.

**Interfaces:** bindQueryLifecycle(): () => void registra AppState/focusManager
e NetInfo/onlineManager uma vez, retorna cleanup. Sem listeners em telas.

- [ ] Confirmar ausência de NetInfo/expo-network/equivalente em node_modules e contratos existentes; reutilizar equivalente se encontrado, senão adicionar @react-native-community/netinfo sem build e sem mudar versão do app.
- [ ] Escrever testes com managers/QueryClient reais: stale background→foreground refaz GET; offline→online reconcilia e retoma mutation atual; timeout acaba em GET; sessão antiga paused nunca envia; eventos durante mutation respeitam intenção.
- [ ] RED: `npx jest --runInBand src/core/queries/__tests__/queryLifecycle.test.tsx`.
- [ ] Implementar binding global e cleanup; bootstrap no App com singleton.
- [ ] GREEN: repetir comando anterior e testes de concorrência/sessão.

## Tarefa 7 — Verificação e entrega sem commit

- [ ] Rodar `npx jest --runInBand src/features/favorites src/core/queries src/core/api/__tests__/client.session.test.ts` e confirmar verde.
- [ ] Rodar `npx jest --runInBand` incluindo regressões existentes do carrinho/telas.
- [ ] Rodar `npx tsc --noEmit`, `npm run lint` e `git diff --check`.
- [ ] Se houver falhas globais, criar snapshot de HEAD em /tmp, disponibilizar mesmas dependências e rodar comandos afetados; registrar cada falha e evidência preexistente, sem corrigi-la.
- [ ] Revisar diff contra todos os requisitos, inclusive ausência de POST toggle, take=500, membership local, strings legadas e QueryClients extras. Conferir carrinho/versão/backend intactos.
- [ ] Produzir matriz de entrega solicitada, arquivos alterados, resultados exatos, falhas preexistentes e riscos. Não executar commit/push/merge/build.

## Execução proposta

Executar diretamente nesta sessão. As tarefas compartilham interfaces e estado
de sessão; execução sequencial facilita validar cada fronteira antes de migrar
as telas. Delegação pode ser escolhida explicitamente pelo usuário na revisão.

Auto-revisão: requisitos do desenho mapeados às sete tarefas; os cinco casos
de Review Focus têm testes atribuídos; interfaces e chaves consistentes;
restrições do usuário prevalecem sobre instruções de commit das skills.
