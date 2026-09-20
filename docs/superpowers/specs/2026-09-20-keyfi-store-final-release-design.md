# KeyFi Store — Final Release Design

## Objetivo

Encerrar tecnicamente o projeto mobile KeyFi e preparar uma release final para Google Play e App Store, sem adicionar novas funcionalidades.

Nome final do produto:
- Loja: KeyFi Store
- Nome instalado: KeyFi Store

Identificadores permanecem:
- Android: com.keyfi.app
- iOS: br.com.keyfi.app

Release Android planejada:
- versionCode: 54
- versionName: 50.1.2

## Escopo

1. Auditoria do projeto mobile.
2. Alteração do nome para KeyFi Store em Android e iOS.
3. Diagnóstico e correção do alerta de páginas de memória de 16 KB.
4. Diagnóstico e correção dos avisos de edge-to-edge/APIs depreciadas.
5. Auditoria de R8/ProGuard e geração de mapping.txt quando aplicável.
6. Remoção de credenciais sensíveis do repositório/configuração versionada.
7. Validação da configuração Firebase e backend de produção.
8. Smoke test dos perfis Cliente, Vendedor e Salão.
9. Geração e validação do AAB Android 54.
10. Build iOS final pelo Codemagic.
11. Atualização dos nomes/metadados nas lojas.
12. Promoção final para produção.

## Restrições

- Não adicionar features.
- Não alterar package name ou bundle identifier.
- Não atualizar bibliotecas sem identificar previamente a causa de um problema.
- Não ativar R8 apenas para eliminar um warning visual do Play Console.
- Não publicar diretamente um build que não tenha passado primeiro por teste interno/TestFlight.
- Não armazenar keystore ou senhas no Git.

## Segurança

A nova chave de upload Android deve permanecer fora do Git.

Credenciais de assinatura devem ficar em configuração local ou variáveis de ambiente.

Devem ser pesquisados no repositório:
- passwords;
- tokens;
- private keys;
- credenciais;
- endpoints antigos;
- arquivos de produção indevidamente versionados.

## Android

Investigar:
- compatibilidade 16 KB;
- edge-to-edge;
- dependências nativas;
- R8/ProGuard;
- mapping.txt;
- configuração de assinatura;
- API_BASE_URL;
- Firebase;
- versionamento.

Release final esperada:
54 (50.1.2)

## iOS

Alterar somente o nome exibido para KeyFi Store.

Preservar:
- bundle br.com.keyfi.app;
- Firebase atual;
- assinatura;
- configurações Codemagic;
- iPhone-only;
- demais configurações já aprovadas.

Gerar novo build TestFlight antes da submissão final.

## Critério de conclusão

O projeto só será considerado fechado quando:

- Android e iOS exibirem KeyFi Store;
- builds finais forem reproduzíveis;
- nenhuma credencial privada estiver versionada;
- alertas técnicos relevantes tiverem sido resolvidos ou documentados;
- smoke tests críticos passarem;
- Android 54 estiver validado;
- iOS final estiver validado no TestFlight;
- Google Play e App Store estiverem preparados para produção;
- repositório estiver limpo;
- keystore e configurações críticas tiverem backup.
