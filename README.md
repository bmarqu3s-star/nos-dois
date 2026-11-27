# Nós Dois — publicação no Firebase Hosting (plano Spark)

App estático (um arquivo HTML) instalável no celular e no computador. Custo: R$ 0. O plano Spark não pede cartão.

## Estrutura

```
src/index.html      ← o app (é aqui que se edita)
src/sw.js           ← modelo do service worker (funciona sem internet)
scripts/build.mjs   ← copia para public/ e carimba a versão pelo hash do conteúdo
public/             ← o que vai ao ar (index.html, sw.js e version.json são gerados)
firebase.json       ← hospedagem e cabeçalhos de cache
```

## Primeira publicação (uma vez)

Precisa do Node 20 ou mais novo.

1. **Entrar:** `npm run login` (abre o navegador; entre com a conta Google de vocês).
2. **Criar o projeto** em https://console.firebase.google.com › Adicionar projeto. Sugestão de nome: `nos-dois-lua-bruno` (o nome vira o endereço, então precisa ser único). Desative o Google Analytics. O plano Spark já é o padrão.
3. **Hosting:** no console, abra Hosting › Começar e só clique em avançar até o fim (a publicação em si é pelo terminal).
4. **Ligar a pasta ao projeto:** `npm run projeto` e escolha o projeto criado.
5. **Publicar:** `npm run deploy`. No final aparece o endereço `https://<projeto>.web.app`.

## Instalar no celular

- **iPhone (Safari):** abrir o endereço › Compartilhar › Adicionar à Tela de Início.
- **Android (Chrome):** menu ⋮ › Instalar app.
- **Computador (Chrome/Edge):** ícone de instalar na barra de endereço.

## Atualizar depois

Editou `src/index.html`? Rode `npm run deploy`. Quem já instalou vê o aviso **“Nova versão disponível · Atualizar”**. Nada para reinstalar.

Para testar antes no computador: `npm run dev` e abra http://localhost:5173.

## Onde ficam os dados

Cada aparelho guarda os dados no próprio navegador (IndexedDB), e funciona sem internet. Para levar o diário de um celular para o outro: Ajustes › Backup › Baixar, e Restaurar no outro. Sincronização automática entre os dois (login Google + Firestore, como no Monitoramento Pets) é a próxima etapa.

## TMDB: explorar, pôsteres e fichas

Em Ajustes › Pôsteres brasileiros e dados (TMDB), cole uma chave gratuita de https://www.themoviedb.org/settings/api e toque em Buscar. Em Filmes › Explorar no TMDB dá para buscar qualquer filme ou pessoa, ver em cartaz e em breve, receber sugestões parecidas com os filmes de nota alta e adicionar tudo com ficha completa (sinopse, elenco, equipe, onde assistir no Brasil, trailer). O botão Completar o que falta preenche os filmes que já estão no app. A chave fica só no aparelho.
