# Guerra da Live — Esboço do Jogo Interativo

## 1. Visão do projeto

**Guerra da Live** é um jogo multiplayer social pensado para transmissões ao vivo, inicialmente no TikTok Live.

A proposta é transformar a audiência da live em participantes de uma guerra em tempo real. Qualquer espectador pode participar gratuitamente por meio de **comentários e likes**, enquanto **Gifts/presentes** ativam eventos especiais mais poderosos e visualmente marcantes.

O objetivo não é criar uma live baseada apenas em pedidos de presentes, mas um **jogo de verdade**, fácil de entender em poucos segundos, divertido de assistir e interessante mesmo para quem nunca gastar dinheiro.

---

## 2. Princípios do jogo

1. **Entendimento imediato:** alguém que entra na live deve compreender rapidamente quem está ganhando e como participar.
2. **Participação gratuita relevante:** comentários e likes precisam realmente influenciar a partida.
3. **Gifts são especiais, não obrigatórios:** presentes geram acontecimentos poderosos, mas o jogo continua divertido gratuitamente.
4. **Partidas curtas:** aproximadamente 5–8 minutos para gerar começo, tensão, clímax e vencedor frequentemente.
5. **Progressão:** participar continuamente deve gerar XP, níveis, títulos e reconhecimento durante a live.
6. **Momentos memoráveis:** bosses, viradas, invasões, coroas e eventos especiais devem produzir situações que a apresentadora possa narrar e reagir.
7. **Streamer como Game Master:** a apresentadora participa das decisões e da narrativa, em vez de apenas observar uma automação.

---

## 3. Loop principal

### Entrada

O espectador comenta:

`!entrar`

O sistema cria um personagem associado ao username e o coloca na batalha.

Exemplo:

> @henrique — Guerreiro Nv. 1

O jogador pode ser distribuído automaticamente entre equipes para manter o balanceamento ou escolher um lado enquanto houver vagas.

### Times

MVP sugerido:

- 🔴 Exército Vermelho
- 🔵 Exército Azul

Posteriormente podem existir três ou mais facções, temporadas e clãs.

### Objetivo

Cada equipe possui uma base/castelo e um exército.

Os jogadores avançam pelo campo, combatem adversários e tentam destruir as defesas e o castelo inimigo.

A partida termina quando:

- um castelo é destruído; ou
- o cronômetro termina e vence o time com maior pontuação/vida restante.

Duração inicial sugerida: **6 minutos**.

---

## 4. Interações gratuitas

### Comentários

Comandos devem ser simples e fáceis de memorizar.

| Comando | Ação |
|---|---|
| `!entrar` | Entra na partida |
| `!azul` | Escolhe o time azul |
| `!vermelho` | Escolhe o time vermelho |
| `!atacar` | Prioriza ataque |
| `!defender` | Prioriza defesa |
| `!curar` | Ajuda aliados próximos |
| `!boss` | Vota/participa do ataque ao boss |

O sistema deve possuir **cooldown** para impedir spam e evitar que quem possui automação de comentários tenha vantagem injusta.

### Likes — esforço coletivo

Likes alimentam uma barra comunitária.

Exemplo inicial de milestones:

- **100 likes:** pequena chuva de moedas/XP.
- **500 likes:** bônus temporário de velocidade para todos.
- **1.000 likes:** evento aleatório.
- **2.500 likes:** chuva de recursos para os dois exércitos.
- **5.000 likes:** Boss comunitário.

Os valores precisam ser configuráveis de acordo com o tamanho da audiência.

O objetivo é criar a sensação de:

> “Mais 300 likes e liberamos o Boss!”

---

## 5. Gifts / presentes

Presentes ativam eventos especiais, fortes e visualmente interessantes.

O valor exato e o mapeamento devem ser configuráveis e respeitar as regras vigentes da plataforma.

### Exemplos

**Gift pequeno**

- cura em área;
- pequeno boost de velocidade;
- escudo temporário;
- reforços NPC.

**Gift médio**

- meteoro;
- congelamento temporário do campo adversário;
- ressuscitar aliados;
- invocar uma unidade especial.

**Gift grande**

- dragão;
- invasão lendária;
- tempestade;
- gigante de guerra;
- ataque massivo contra estruturas.

O nome do espectador deve aparecer associado ao acontecimento:

> 🐉 **@usuario invocou um DRAGÃO!**

Um Gift poderoso deve criar conteúdo para **todos**, inclusive para quem não enviou o presente.

---

## 6. Boss comunitário

Em determinados momentos surge um Boss que ameaça ambos os times.

Exemplos:

- Dragão Ancião
- Rei Esqueleto
- Titã
- Demônio
- Colosso

Durante o Boss, os adversários temporariamente têm um objetivo comum.

A audiência usa comandos/likes para derrotá-lo antes do tempo acabar.

Recompensas possíveis:

- XP;
- bônus para os sobreviventes;
- título temporário;
- multiplicador de pontos;
- item cosmético durante a sessão.

O jogador que causar maior dano pode aparecer como:

> ⚔️ **Caçador do Boss — @usuario**

---

## 7. Rei/Rainha da Live

Uma das principais mecânicas de retenção.

O jogador de melhor desempenho recebe a **Coroa**.

Exemplo:

> 👑 REI DA LIVE
>
> @henrique — Nv. 8

O personagem ganha destaque visual e algum bônus pequeno.

Entretanto, carregar a coroa também transforma o jogador em alvo.

### Derrube o Rei

Os adversários recebem um objetivo:

> ⚔️ **DERRUBE O REI!**

Quem derrota o Rei/Rainha pode assumir a coroa.

Isso permite criar histórias naturalmente durante a transmissão:

- alguém mantendo a coroa por várias partidas;
- um novato derrubando o líder;
- um time inteiro perseguindo o Rei;
- troca de coroa nos últimos segundos.

---

## 8. Progressão

### Durante a live

O jogador ganha XP por:

- participar;
- eliminar inimigos;
- causar dano;
- defender aliados;
- derrotar Boss;
- vencer partidas;
- completar eventos.

Exemplo:

`@maria — Nv. 7 — 29 eliminações`

Essa progressão continua enquanto durar a sessão da live.

### Progressão persistente futura

Posteriormente, contas recorrentes podem possuir:

- nível global;
- skins;
- títulos;
- molduras;
- conquistas;
- estatísticas;
- histórico de vitórias;
- clãs;
- temporadas.

Evitar vantagens permanentes muito grandes. Progressão persistente deve privilegiar **status e cosméticos**, para novos espectadores ainda conseguirem competir.

---

## 9. Ranking

Durante a partida, exibir apenas informações essenciais.

Exemplo:

1. 👑 @henrique — 37 eliminações
2. ⚔️ @lucas — 31 eliminações
3. 🛡️ @maria — 28 eliminações

Outros rankings possíveis:

- maior dano;
- maior cura;
- maior defesa;
- MVP da partida;
- MVP da live;
- maior sequência de vitórias;
- maior tempo com a coroa.

---

## 10. Papel da apresentadora — Game Master

A streamer faz parte do jogo.

Em momentos específicos, o sistema apresenta escolhas para ela.

Exemplo:

### ESCOLHA DA MESTRA

- 🌋 Erupção vulcânica
- 🧟 Horda de mortos-vivos
- 🐉 Dragão

Ela escolhe uma opção e o evento acontece no jogo.

Outra possibilidade é deixar a audiência votar através dos comentários e a apresentadora anunciar o resultado.

Isso cria oportunidades naturais de conversa, provocação entre equipes, comemoração e reação.

---

## 11. Estrutura de uma partida

### 00:00 — Preparação

- jogadores entram;
- escolhem time;
- contagem regressiva;
- apresentação dos líderes.

### 00:30 — Guerra começa

Exércitos avançam e jogadores começam a utilizar comandos.

### 02:00 — Primeiro evento

Evento aleatório ou escolha da Game Master.

### 03:30 — Escalada

Mais unidades, habilidades e pressão sobre os castelos.

### 04:30 — Boss / evento especial

Grande acontecimento comunitário.

### 05:30 — Último minuto

Bônus de intensidade e aviso visual.

### 06:00 — Final

- equipe vencedora;
- MVP;
- Rei/Rainha;
- melhores jogadores;
- XP recebido.

Após uma pequena contagem regressiva, começa a próxima partida.

---

## 12. Interface da live

A tela precisa continuar compreensível em celular.

Elementos principais:

- campo de batalha central;
- castelo vermelho × castelo azul;
- vida dos castelos;
- cronômetro;
- placar;
- barra de likes/evento comunitário;
- Rei/Rainha atual;
- últimos eventos importantes;
- instrução curta de como participar.

Exemplo permanente:

> 💬 Comente **!entrar** para jogar

Evitar excesso de texto, menus e estatísticas durante a batalha.

---

## 13. Arquitetura inicial

```text
TikTok Live
     │
     ▼
Live Event Provider
     │
     ├── comentários
     ├── likes
     ├── gifts
     └── entrada/saída de espectadores
     │
     ▼
Backend / Game Server
     │
     ├── regras
     ├── jogadores
     ├── cooldowns
     ├── equipes
     ├── pontuação
     └── eventos
     │
     ▼
WebSocket / Socket.IO
     │
     ▼
Game Client (Phaser)
     │
     ▼
OBS Browser Source
     │
     ▼
TikTok Live
```

### Stack sugerida para MVP

- **TypeScript**
- **Node.js**
- **Phaser** — engine 2D
- **Socket.IO/WebSocket** — comunicação em tempo real
- **OBS Browser Source** — captura do jogo
- **PostgreSQL/Supabase** — persistência futura

---

## 14. Abstração das plataformas

Evitar acoplar o Game Server diretamente ao TikTok.

```text
                 ┌─ TikTokLiveProvider
                 │
LiveEventProvider├─ YouTubeLiveProvider (futuro)
                 │
                 └─ TwitchProvider (futuro)
                         │
                         ▼
                    Game Server
```

Interface conceitual:

```ts
interface LiveEventProvider {
  onComment(callback): void;
  onLike(callback): void;
  onGift(callback): void;
  onViewerJoin(callback): void;
}
```

Dessa forma, as regras do jogo não precisam saber de onde o evento veio.

---

## 15. MVP — primeira versão

O primeiro MVP não precisa ter dezenas de mecânicas.

### Implementar

- dois times;
- `!entrar`;
- personagens básicos;
- combate automático;
- `!atacar` e `!defender`;
- sistema de vida;
- dois castelos;
- likes coletivos;
- três eventos de Gift;
- XP da sessão;
- ranking;
- Rei/Rainha;
- um Boss;
- partidas automáticas de aproximadamente 6 minutos;
- painel simples para a Game Master.

### Não implementar inicialmente

- marketplace;
- dezenas de classes;
- inventário complexo;
- sistema econômico;
- guildas;
- PvP individual elaborado;
- dezenas de mapas;
- progressão permanente complexa.

Primeiro objetivo: **descobrir se as pessoas entram, entendem, interagem e permanecem assistindo.**

---

## 16. Métricas importantes

Mais importante do que quantidade de features:

- espectadores que comentaram `!entrar`;
- % da audiência que participou;
- tempo médio assistido;
- jogadores que permaneceram para a próxima partida;
- comentários por minuto;
- likes por minuto;
- usuários recorrentes;
- número de partidas assistidas por usuário;
- momentos com maior saída/entrada de espectadores;
- Gifts por partida, sem comprometer a experiência gratuita.

---

## 17. Possível evolução comercial

Se o jogo funcionar na live inicial, a arquitetura pode evoluir para uma plataforma para outros criadores.

Fluxo futuro:

```text
Streamer cria conta
       ↓
Conecta plataforma
       ↓
Escolhe um minigame
       ↓
Personaliza regras/visual
       ↓
Recebe URL do overlay
       ↓
Adiciona no OBS
       ↓
Inicia a live
```

Possíveis modelos de negócio:

- plano gratuito limitado;
- assinatura mensal;
- plano Pro com personalização;
- pacote de minigames;
- skins/temas para streamers;
- analytics avançado.

Assim, o projeto pode ter duas frentes:

1. **Monetização da própria live.**
2. **SaaS de jogos interativos para criadores.**

---

## 18. Direção do projeto

A prioridade deve ser criar **entretenimento interativo**, não uma tela feita para pressionar espectadores a enviar presentes.

A fórmula central é:

> **Comentários dão controle + likes criam objetivos coletivos + Gifts provocam grandes acontecimentos + progressão gera retenção + a streamer cria a narrativa.**

Se essa combinação funcionar, o jogo consegue ser divertido para quem joga gratuitamente, interessante para quem apenas assiste e capaz de criar momentos especiais quando alguém envia um Gift.
