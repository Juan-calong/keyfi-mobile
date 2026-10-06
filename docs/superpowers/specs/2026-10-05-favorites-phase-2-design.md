# Favoritos mobile — Fase 2

Status: desenho aprovado pelo usuário; implementação ainda não iniciada.

## Objetivo e limites

Backend é autoridade absoluta. O cache React Query de IDs, com chave
`["favorites", "ids", userId, role]`, é a única fonte derivada de membership.
Home, Shop, Details, relacionados e Favoritos observam esse cache.
Aplicar a CUSTOMER e SALON_OWNER, com TDD e QueryClient real nos testes.

Não alterar backend, versão ou patch do carrinho; não executar commit, push,
merge ou build Android/iOS. Não usar polling, debounce para consistência,
take=500, membership local, fallback do catálogo ou listeners por tela.

## Evidência da inspeção

- App.tsx cria um QueryClient próprio; AppProviders.tsx exporta outro.
- auth.store.ts limpa o cliente de AppProviders, que não é o de App.tsx.
- ProductFavoriteButton usa estado local, POST toggle e varredura de caches.
- Home/Buy de ambos os perfis e SharedProductDetails consultam lista detalhada
  para construir Sets e aceitam flags do catálogo como fallback.
- CustomerFavoritesScreen e OwnerFavoritesScreen consultam uma página sem
  controles para continuar; SharedFavoritesScreen não tem onEndReached.
- Axios já possui timeout de 15 segundos e interceptor de refresh de sessão.
- package.json e a busca em código/lockfiles não revelaram NetInfo,
  expo-network ou equivalente de conectividade.
- HEAD é 674dbe0, contendo o patch do carrinho; árvore estava limpa.

## Abordagem escolhida

Usar QueryClient singleton, hooks compartilhados e mutations serializadas
por sessão/produto com controle de ordem das intenções. Isso conserva o
modelo React Query existente e atende aos endpoints idempotentes.

Alternativas consideradas: bloquear todas as interações enquanto há mutation
reduziria a representação de intenção; store adicional de favoritos criaria
outra fonte de membership. Nenhuma delas atende tão bem aos requisitos.

## QueryClient e sessão

Criar src/core/queries/queryClient.ts com a única instância de produção.
App.tsx e AppProviders.tsx importam essa instância; auth.store.ts importa
diretamente o módulo sem dependência de componente/provider.

Transições de identidade invalidam uma geração de sessão antes de expor a
nova sessão. Cancelar queries e remover cache privado antes de renderizar B.
Queries de favoritos passam AbortSignal ao Axios. Callbacks de mutations
verificam geração, userId e role antes de escrever cache. Mutations pausadas
da sessão anterior não podem enviar requisições com o token da nova sessão.

Revisar também o interceptor de refresh: resposta 401 ou refresh tardio de A
não pode renovar/resetar a sessão de B nem repetir a requisição com token B.
Refresh do mesmo usuário não deve ser confundido com troca de identidade.
Todas as entradas de sessão (login, biometria, setSession, reset, logout e
mudança de role) precisam respeitar a fronteira.

## Chaves, serviço e hook de IDs

Centralizar favoritesKeys.ids(userId, role) e
favoritesKeys.list(userId, role), com variantes de paginação quando necessárias.
Sem usuário válido, queries ficam desabilitadas e não apresentam cache privado.

Serviço chama GET /products/favorites/ids e valida/normaliza o contrato de
resposta. O formato exato de IDs deve ser confirmado pelo contrato disponível
antes da implementação; não deduzir silenciosamente de flags do catálogo.

useFavoriteIds expõe productIds, favoriteIdsSet, isFavorite, isLoading,
isFetching e erro. Memorizar o Set por referência do array compartilhado
para evitar sua reconstrução em cada card. Membership antes do primeiro
resultado é desconhecido: coração mostra indicador neutro/loading e fica
indisponível até existir base canônica. Erro inicial oferece retry, sem
representar todos os produtos como não favoritos.

## Mutations e concorrência

Mutation recebe { productId, favorited }. true usa PUT; false usa DELETE.
Usar scope do TanStack Query v5 por sessão/userId/role/productId para
serializar requisições de botões diferentes. Scope sozinho não resolve
callbacks otimistas de mutations enfileiradas: controlar sequência e quantidade
pendente compartilhadas por produto, sem armazenar membership nesse controle.

onMutate registra intenção, cancela IDs/lista detalhada, guarda snapshot e
altera somente o produto no cache de IDs. O clique deriva a próxima intenção
do cache atual para aceitar double tap, inclusive entre componentes.

onError faz rollback somente da membership daquele produto, se não houver
intenção posterior e a sessão ainda for a mesma. Nunca restaurar o array
inteiro e apagar alterações de outros produtos.

onSuccess aplica favorited retornado pelo servidor somente se a intenção não
foi superada. Resposta antiga não pode apagar a intenção otimista seguinte.

onSettled invalida IDs e lista detalhada; o GET reconciliador ocorre quando
não há intenções pendentes que ele possa sobrescrever. Coordenar fetch de IDs
durante mutations e mudança de conectividade/foco para proteger essa regra.
Queries ativas refazem fetch; inativas ficam stale para a próxima abertura.
Timeout/resultado incerto exige GET posterior, inclusive após reconexão.

## Componentes e telas

ProductFavoriteButton recebe productId e lê useFavoriteIds; remove
initialFavorited, estado local e patch/varredura em caches de catálogo.
Animação/loading temporários podem continuar. Cards de ambos os perfis,
Details e relacionados passam apenas identidade e propriedades visuais.

Home/Buy de CUSTOMER e SALON_OWNER removem consulta detalhada usada para
membership, buildFavoriteIds, take=500 e resolveFavoriteFlag. Produto e
promoção continuam sendo metadados. Refresh explícito do usuário pode
reconciliar através dos hooks compartilhados; sem refetch automático por tela.

## Lista detalhada e paginação

useFavoritesList usa useInfiniteQuery com GET /products/favorites,
page iniciando em 1 e limit=20. Continuar pelo hasMore/page do servidor,
com proteção contra fetch duplicado e deduplicação de produtos por ID.
FlatList recebe onEndReached, loading da próxima página e retry de paginação.

Objetos de produto vêm exclusivamente da lista detalhada. Filtrar renderização
pela membership de IDs para remoção otimista imediata. Ao remover, metadados
derivados de total visível são ajustados sem alterar offsets de páginas
arbitrariamente; após assentamento, refazer páginas para reconciliar total e
hasMore do servidor. Testar remoção na fronteira de páginas, sem omitir itens.

Favoritar em Home e abrir Favoritos enquanto a lista ainda não contém o novo
objeto mostra reconciliação/loading; nunca declarar vazio quando há IDs ou
mutation de inclusão pendente. Não inventar objeto completo a partir do ID.
Paginação parcial não implica que todos os IDs devem estar na primeira página.
Estado vazio só é definitivo após IDs/lista reconciliados sem inclusão pendente.
Produto inativo desaparece quando o GET canônico remove seu ID.

## Lifecycle e rede

Registrar um único listener global AppState para focusManager, com cleanup.
active significa foco; background/inactive suspende reconciliação por foco.
Usar staleTime finito e refetchOnWindowFocus/refetchOnReconnect nas queries.

Como não foi encontrada solução de rede, o desenho propõe adicionar
@react-native-community/netinfo e ligar seu único listener ao onlineManager.
Confirmar ausência também nos módulos instalados antes da adição. Atualizar
lockfile apropriado sem executar builds; eventual atualização nativa precisa
ser reportada como requisito da futura build. Sem timers ou polling de rede.
Mutations pausadas retomam somente se ainda pertencem à sessão atual.

## Testes e validação

Executar ciclos RED → GREEN por unidade de comportamento com QueryClient
real, react-test-renderer e promises HTTP controláveis. Mockar fronteiras
nativas/HTTP, mantendo cache, observers, mutations e serialização reais.

Cobertura exigida:

1. IDs vazio/um e inclusão partindo de zero, ambos os perfis.
2. Atualização imediata, PUT/DELETE canônicos e rollback de ambos.
3. Timeout, double tap, respostas antigas, mesma identidade/produto em
   componentes distintos e mutations simultâneas em produtos diferentes.
4. Home + Shop, Home + Details e relacionados observando o mesmo cache.
5. Favoritos removendo e abertura imediatamente após inclusão.
6. Paginação de 0, 1, 20, 21 e 100, total/hasMore e remoção entre páginas.
7. Produto inativo após reconciliação.
8. A carregado → logout → B antes/depois do fetch; query, mutation e refresh
   tardios de A, além de mutation offline antiga.
9. background → foreground e offline → online pelo binding global.
10. Regressões do carrinho existente sem alteração funcional.

Rodar testes novos, relacionados e suíte completa; TypeScript (tsc --noEmit),
ESLint configurado e git diff --check. Para falhas globais, executar os mesmos
comandos sobre snapshot de HEAD em /tmp com dependências equivalentes; não
corrigir falhas externas. Registrar nomes e comparação de resultados.

## Entrega

Sem commit. Entregar matriz READY/NEEDS_CHANGES e PASS/FAIL solicitada pelo
usuário, arquivos alterados, testes executados, falhas preexistentes comprovadas
e riscos reais. Esta revisão do desenho ainda não é o veredito da implementação.
