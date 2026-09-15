# Guerra da Live --- Plano de MVP

## 1. Objetivo do MVP

Validar a ideia da **Guerra da Live** com o menor esforço possível antes
de investir tempo em personagens, mapas, animações e sistemas complexos.

A principal hipótese a validar é:

> Conseguimos receber interações de uma TikTok LIVE em tempo real,
> transformá-las em eventos do jogo e criar uma experiência divertida
> que faça o público participar e permanecer na live?

O MVP será desenvolvido em etapas. Cada etapa só deve avançar quando a
anterior estiver funcionando de forma confiável.

------------------------------------------------------------------------

## 2. Fase 0 --- POC da integração com TikTok LIVE

Antes de desenvolver o jogo, criar uma aplicação simples em **Node.js +
TypeScript** capaz de se conectar à LIVE e exibir os eventos recebidos.

### Eventos que precisamos validar

-   Comentários
-   Likes e combos de likes
-   Gifts
-   Combos/streaks de Gifts
-   Follow
-   Share
-   Entrada de espectadores, se disponível

### Teste inicial

Durante uma LIVE real, o terminal deve conseguir mostrar algo semelhante
a:

``` text
[COMMENT] @joao: !vermelho
[LIKE] @maria enviou 37 likes
[GIFT] @pedro enviou Rose x5
[FOLLOW] @ana começou a seguir
[SHARE] @lucas compartilhou a LIVE
```

### Critério de sucesso

A POC está aprovada quando comentários, likes e Gifts forem capturados
com estabilidade suficiente durante uma LIVE real.

> Importante: a integração inicialmente poderá utilizar uma biblioteca
> não oficial, portanto deve ficar completamente desacoplada da lógica
> do jogo.

------------------------------------------------------------------------

## 3. Fase 1 --- Camada de abstração de eventos

O Game Engine nunca deve conhecer diretamente eventos específicos do
TikTok.

Criar uma interface de entrada:

``` text
TikTok LIVE
     ↓
TikTokLiveAdapter
     ↓
Event Bus
     ↓
Game Engine
```

O `TikTokLiveAdapter` converte eventos externos para eventos internos
padronizados.

### Exemplos

``` text
Comentário "!entrar"
→ PLAYER_JOIN

Comentário "!vermelho"
→ PLAYER_SELECT_TEAM

Likes
→ TEAM_LIKE

Gift
→ GIFT_RECEIVED

Follow
→ PLAYER_FOLLOW

Share
→ PLAYER_SHARE
```

### Motivo

Se futuramente a integração do TikTok quebrar ou surgir uma API oficial,
trocamos apenas o Adapter.

A mesma arquitetura poderá receber futuramente:

``` text
TikTokLiveAdapter
YouTubeLiveAdapter
TwitchLiveAdapter
```

------------------------------------------------------------------------

## 4. Fase 2 --- Servidor em tempo real

Criar o servidor responsável pelo estado da partida.

### Stack inicial

-   Node.js
-   TypeScript
-   Socket.IO/WebSocket
-   Supabase/PostgreSQL posteriormente

Fluxo:

``` text
TikTok LIVE
      ↓
TikTokLiveAdapter
      ↓
Event Bus
      ↓
Game Engine
      ↓
WebSocket
      ↓
Cliente do jogo
```

O servidor deve ser a fonte de verdade da partida.

------------------------------------------------------------------------

## 5. Fase 3 --- Primeiro protótipo visual

Antes da guerra completa, criar uma tela extremamente simples para
validar o fluxo ponta a ponta.

Exemplo:

``` text
🔴 EXÉRCITO VERMELHO     2.450 HP

🔵 EXÉRCITO AZUL         2.180 HP


@joao entrou no Exército Vermelho

@maria
❤️ +37 energia

@pedro enviou Rose x5
🌹 ATAQUE ESPECIAL
```

Essa página será aberta como **Browser Source no OBS**.

### Critério de sucesso

Uma interação feita no celular durante a LIVE deve produzir uma
alteração visível no OBS em poucos segundos.

------------------------------------------------------------------------

## 6. Fase 4 --- Guerra básica

Com a integração validada, implementar a primeira partida jogável.

### Estrutura

Dois exércitos:

🔴 Vermelho\
🔵 Azul

O espectador escolhe seu lado por comentário:

``` text
!vermelho
!azul
```

ou entra automaticamente e recebe uma equipe.

### Comandos gratuitos

``` text
!entrar
!atacar
!defender
!curar
```

Os comandos devem possuir cooldown para impedir spam.

------------------------------------------------------------------------

## 7. Fase 5 --- Likes como energia coletiva

Likes não serão tratados como ações individuais exatas.

Eles alimentarão uma barra coletiva da LIVE.

Exemplo:

``` text
100 likes
→ pequena vantagem

500 likes
→ boost do exército

1.000 likes
→ evento aleatório

5.000 likes
→ BOSS
```

Isso deixa a participação gratuita relevante.

A lógica deve tolerar perda ou agrupamento de eventos de likes.

------------------------------------------------------------------------

## 8. Fase 6 --- Gifts

Gifts ativam acontecimentos especiais, mas não devem transformar o jogo
simplesmente em pay-to-win.

### Exemplo inicial

``` text
Gift pequeno
→ cura / energia / pequeno ataque

Combo de Gifts
→ ataque especial

Gift intermediário
→ invocação de unidade especial

Gift grande
→ meteoro

Gift especial
→ evento lendário
```

### Evento lendário

``` text
⚠️ INVASÃO LENDÁRIA ⚠️

🐉 DRAGÃO

Invocado por:
@usuario
```

O objetivo é fazer o Gift criar diversão também para quem não pagou.

------------------------------------------------------------------------

## 9. Fase 7 --- Boss comunitário

Periodicamente surge um inimigo que ameaça os dois exércitos.

Durante o Boss:

-   equipes continuam competindo;
-   todos podem atacar o Boss;
-   likes alimentam ataques coletivos;
-   comentários executam habilidades;
-   Gifts podem gerar ataques especiais.

Isso cria momentos cooperativos dentro da competição.

------------------------------------------------------------------------

## 10. Fase 8 --- Rei/Rainha da Live

O melhor jogador da rodada recebe a coroa.

``` text
👑 REI DA LIVE

@joao
37 eliminações
```

Na próxima partida:

``` text
⚔️ DERRUBE O REI
```

Quem derrotá-lo assume a coroa.

Isso cria pequenas histórias recorrentes durante a transmissão.

------------------------------------------------------------------------

## 11. Fase 9 --- Progressão durante a LIVE

Cada jogador possui:

-   nível;
-   XP;
-   eliminações;
-   assistência;
-   dano;
-   cura;
-   vitórias;
-   sequência de vitórias.

Exemplo:

``` text
@joao
Nível 7
⚔️ 32 eliminações
❤️ 14 assistências
👑 2 coroas
```

Inicialmente, a progressão pode existir apenas durante a sessão.

Persistência entre LIVEs será implementada somente depois da validação
de retenção.

------------------------------------------------------------------------

## 12. Fase 10 --- Game Master

A apresentadora não será apenas uma espectadora do jogo.

Ela terá poderes de **Game Master**.

Exemplo:

``` text
ESCOLHA DA MESTRA

🌋 ERUPÇÃO

🧟 HORDA

🐉 DRAGÃO
```

Também poderão existir votações da comunidade.

Isso cria oportunidades naturais para narração, reação e interação
humana.

------------------------------------------------------------------------

## 13. Loop da partida

Meta inicial:

**5 a 8 minutos por partida.**

Fluxo:

``` text
Lobby
 ↓
Escolha das equipes
 ↓
Contagem regressiva
 ↓
Guerra
 ↓
Evento aleatório
 ↓
Boss / evento especial
 ↓
Batalha final
 ↓
Vitória
 ↓
MVP da partida
 ↓
Novo Rei/Rainha
 ↓
Ranking
 ↓
Próxima partida
```

O espectador que entrar no meio deve entender rapidamente:

1.  quem está ganhando;
2.  qual é o seu time;
3.  como participar.

------------------------------------------------------------------------

## 14. Arquitetura alvo do MVP

``` text
                TikTok LIVE
                     │
        ┌────────────┼────────────┐
        │            │            │
     COMMENT        LIKE         GIFT
        │            │            │
        └────────────┼────────────┘
                     ↓
             TikTokLiveAdapter
                     │
                     ↓
                 Event Bus
                     │
                     ↓
                Game Engine
                     │
             ┌───────┴───────┐
             ↓               ↓
          WebSocket        Database
             │
             ↓
       Phaser / HTML5
             │
             ↓
      OBS Browser Source
             │
             ↓
         TikTok LIVE
```

------------------------------------------------------------------------

## 15. Stack proposta

### Backend

-   Node.js
-   TypeScript
-   Socket.IO

### Jogo

-   Phaser
-   TypeScript
-   HTML5

### Persistência

Inicialmente:

-   memória do servidor

Depois:

-   Supabase/PostgreSQL

### Streaming

-   OBS
-   Browser Source

------------------------------------------------------------------------

## 16. Ordem de implementação

### Sprint 1 --- Integração

-   Projeto Node + TypeScript
-   Conectar à LIVE
-   Capturar comentários
-   Capturar likes
-   Capturar Gifts
-   Capturar combos
-   Capturar follow/share
-   Logs estruturados

### Sprint 2 --- Eventos internos

-   `TikTokLiveAdapter`
-   Event Bus
-   Tipos de eventos
-   Validação
-   Rate limit
-   Cooldowns

### Sprint 3 --- Comunicação

-   Socket.IO
-   servidor de jogo
-   cliente web
-   reconexão
-   estado da partida

### Sprint 4 --- Protótipo

-   dois times
-   HP
-   ataques
-   comentários como comandos
-   likes como energia
-   Gifts como habilidades
-   integração com OBS

### Sprint 5 --- Gameplay

-   unidades
-   batalha automática
-   Boss
-   Rei da Live
-   ranking
-   Game Master

### Sprint 6 --- Polimento

-   animações
-   efeitos
-   áudio
-   feedback visual
-   balanceamento
-   proteção contra spam

------------------------------------------------------------------------

## 17. O que NÃO desenvolver inicialmente

Para evitar desperdício de tempo, o MVP não precisa começar com:

-   login próprio;
-   painel administrativo complexo;
-   skins;
-   loja;
-   pagamentos;
-   aplicativo mobile;
-   múltiplos mapas;
-   dezenas de personagens;
-   matchmaking;
-   progressão permanente;
-   infraestrutura cloud sofisticada.

Primeiro precisamos provar que **o jogo é divertido**.

------------------------------------------------------------------------

## 18. Métricas para validar a ideia

Mais importante que quantidade de código:

### Retenção

Quanto tempo as pessoas permanecem na LIVE?

### Participação

Quantos espectadores enviam pelo menos um comando?

### Recorrência

Quantos jogadores aparecem novamente em outra LIVE?

### Likes

O jogo aumenta a quantidade de likes por espectador?

### Gifts

Os eventos especiais fazem os Gifts acontecerem naturalmente?

### Engajamento

As pessoas começam a:

-   escolher times;
-   provocar adversários;
-   reconhecer jogadores;
-   disputar ranking;
-   pedir revanche;
-   esperar a próxima partida?

Se isso acontecer, o conceito está funcionando.

------------------------------------------------------------------------

## 19. Evolução futura --- Plataforma para streamers

Se a Guerra da Live funcionar, a arquitetura pode evoluir para:

``` text
Streamer
   ↓
Cria conta
   ↓
Conecta TikTok
   ↓
Escolhe um minigame
   ↓
Personaliza
   ↓
Copia URL
   ↓
Adiciona no OBS
   ↓
LIVE
```

Possíveis jogos futuros:

-   Guerra da Live
-   Corrida da Live
-   Sobrevivência
-   Tower Defense
-   Boss Raid
-   Futebol
-   Battle Royale social

Modelo comercial possível:

``` text
Free
Pro
Creator
```

Transformando o experimento inicial em uma possível plataforma SaaS para
criadores.

------------------------------------------------------------------------

## 20. Primeiro marco

O primeiro marco do projeto **não é fazer a guerra**.

É conseguir executar esta sequência durante uma LIVE real:

``` text
@joao comentou !vermelho
        ↓
TikTokLiveAdapter
        ↓
PLAYER_SELECT_TEAM
        ↓
Game Engine
        ↓
WebSocket
        ↓
OBS
        ↓
🔴 João entrou no Exército Vermelho
```

Depois:

``` text
@maria enviou likes
        ↓
TEAM_LIKE
        ↓
❤️ Energia aumentou
```

E finalmente:

``` text
@pedro enviou Gift x5
        ↓
GIFT_RECEIVED
        ↓
☄️ ATAQUE ESPECIAL
```

Quando esses três fluxos estiverem funcionando em uma LIVE real, **a
principal incerteza técnica do MVP estará validada**.

A partir daí começa o desenvolvimento da Guerra da Live.
