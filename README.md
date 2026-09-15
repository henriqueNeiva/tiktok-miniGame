# Guerra da Live — POC TikTok LIVE

Atualizado em **15/09/2026**. Documento de continuidade entre pessoas, IAs e agentes.

## Regra permanente de manutenção

**Qualquer IA/agente que continuar este projeto deve ler este README primeiro e mantê-lo atualizado durante todo o projeto, a cada passo relevante. Antes de encerrar ou interromper a sessão, registrar mudanças, decisões e motivos, testes e resultados reais, limitações e próximos passos. Atualizar a data e “Retomar daqui”. Nunca registrar credenciais ou segredos.**

## Objetivo e escopo atual

O projeto já recebe comentários/comandos, curtidas e presentes da TikTok LIVE em Node.js + TypeScript e agora possui uma primeira arena jogável para navegador/OBS. O servidor continua sem persistência, API pública ou envio de mensagens ao TikTok.

Visão: [guerra_da_live_esboco.md](guerra_da_live_esboco.md). Plano amplo: [guerra_da_live_mvp.md](guerra_da_live_mvp.md). A arena usa o mesmo domínio e o mesmo adaptador da conexão real; o modo demonstrativo existe apenas para inspecionar a tela sem abrir uma live.

## Regras do MVP-0.2

Estas regras foram definidas antes da próxima implementação. O objetivo é manter a partida fácil de entender, competitiva para quem participa gratuitamente e interessante durante os cinco minutos completos.

### Partida e vitória

- Cada partida dura **5 minutos**: 20 segundos de entrada, 4 minutos de combate e 40 segundos de clímax final.
- Cada time possui um rei fixo: `Rei Azul` e `Rei Vermelho`. O rei é uma entidade do jogo, não um espectador.
- Cada rei começa com **1.000 HP**. Ataques reduzem HP, nunca abaixo de zero.
- Se um rei chegar a zero, o outro time vence imediatamente.
- Se o tempo acabar, vence o time cujo rei tiver mais HP. Em empate, vence o time com mais pontos; persistindo o empate, vence o time com maior participação válida.
- A partida entra em `LOBBY`, `ACTIVE` e `FINISHED`. A próxima partida só começa após o resultado ser exibido.

### Participação gratuita

- **Curtidas individuais:** a cada 100 curtidas de um jogador inscrito, ele ativa um ataque básico de 10 dano no rei adversário.
- **Curtidas do time:** a cada 200 curtidas, o time recupera 50 HP; a cada 500 curtidas, ativa um ataque coletivo de 50 dano.
- Cura nunca ultrapassa 1.000 HP. Cada marco só pode ser ativado uma vez.
- **Comentários:** `!entrar azul`, `!entrar vermelho` e `!entrar` escolhem o time. `!atacar` custa 2 energias, `!defender` custa 2 e adiciona 30 de escudo ao rei, e `!curar` custa 3 e recupera 50 HP.
- Cada jogador começa com 2 energias, recebe 1 a cada 25 curtidas próprias e armazena no máximo 5. Assim, todos podem usar comandos de combate sem enviar presentes.
- Jogador sem time pode ter curtidas registradas, mas elas não contam para equipe nem ativam ataque.

### Níveis e dano

- O nível é global e representa participação contínua, não dinheiro gasto.
- O ataque individual usa `10 + bônusDeNivel` de dano.
- Bônus: níveis 1–2 `+0`, 3–4 `+1`, 5–6 `+2`, 7–8 `+3`, 9–10 `+4`, nível 11 ou maior `+5` máximo.
- Ataques coletivos usam dano fixo de 50 para preservar o equilíbrio entre os times.
- Gifts não concedem XP diretamente e não podem decidir a partida sozinhos.

### Gifts e presentes

- Gifts criam cargas táticas para o time, não vitória automática.
- Uma `Rosa` gera 1 carga. Ao acumular 3 cargas, o time escolhe entre ataque fortalecido, cura emergencial ou escudo.
- A carga deve beneficiar o time inteiro e ter limite de armazenamento, cooldown e limite por usuário.
- Gifts repetidos podem sofrer redução temporária. Curtidas e comentários continuam capazes de vencer uma partida sem gasto.

### Pontuação, XP e ranking

Pontuação da partida: entrar `+10`, marco de curtidas `+10`, ativar ataque `+15`, cura ou defesa `+10`, permanecer até o fim `+20`, vitória `+50` e MVP `+25`.

XP é separado da pontuação da partida. O jogador recebe XP por participar, atingir marcos, usar comandos válidos, permanecer até o fim e vencer. Gift não gera XP pelo preço, apenas pela ação de jogo criada.

O ranking da partida mostra pontos, curtidas contribuídas, comandos úteis, ataques, curas e MVP. O nível global usa `100 x nível atual` como XP necessário para o próximo nível. Títulos iniciais: Recruta, Guerreiro, Veterano, Campeão e Lenda da Live.

### Princípio da tela

Ao entrar, o jogador deve entender sem tutorial longo:

1. qual é o seu time;
2. quanto HP tem cada rei;
3. quanto tempo falta;
4. qual é a próxima meta de curtidas;
5. qual ação ele pode fazer agora.

A tela deve priorizar cronômetro, HP dos reis, placar dos times, próxima meta e feed de eventos. O usuário não deve precisar conhecer todas as regras para começar; a interface revela a próxima decisão no momento certo.

### Arena visual

A arena será inspirada na leitura rápida de jogos como Clash Royale, sem copiar sua identidade visual. O campo será dividido em dois lados:

```text
Rei Azul  | jogadores azuis | centro de conflito | jogadores vermelhos | Rei Vermelho
```

- Cada jogador será uma unidade visual na arena.
- A unidade será representada por um círculo com a cor do time, nome curto e nível.
- Dentro do círculo haverá um ícone ou imagem de classe, como guerreiro, arqueiro, guardião ou suporte.
- O círculo terá estados visuais simples: pulso para curtida, brilho para carga de presente, destaque para ataque pronto e aura para cura.
- Os reis ficam nas extremidades, sempre maiores que os jogadores, com HP e barra de vida visíveis.
- Ataques atravessam o centro da arena na direção do rei adversário.
- Até 8 jogadores podem aparecer em tamanho normal; os demais serão reduzidos ou agrupados como tropa do time.
- O jogador local terá destaque visual, mas sem esconder os demais participantes.

### Eventos visuais da arena

O domínio continua emitindo eventos sem conhecer a interface. A tela transforma esses eventos em efeitos curtos e legíveis:

| Evento | Representação visual |
|---|---|
| Curtida recebida | Pulso leve no círculo do jogador e contador subindo |
| Combo individual | Projétil do jogador em direção ao rei adversário |
| Cura do time | Aura verde ao redor do rei aliado |
| Ataque coletivo | Efeito maior usando a cor do time |
| Rosa/presente | Brilho e atualização da carga tática |
| Rei derrotado | Impacto, congelamento da arena e resultado |
| Últimos 40 segundos | Cronômetro destacado e arena em estado de clímax |

Todo efeito deve responder rapidamente a três perguntas: quem agiu, qual time foi beneficiado e qual foi o resultado. A animação nunca deve esconder HP, cronômetro ou próxima meta.

### Controle da partida pelo administrador (planejado)

A partida não começa quando o primeiro jogador entra. O lobby aceita participantes, mas o combate e o cronômetro só começam quando o perfil administrador da live enviar:

```text
!iniciar
```

O administrador é o perfil usado na conexão, por exemplo `henruque_santos`. O comando `!iniciar` de qualquer outro usuário será ignorado. O comando só é válido em `LOBBY`; depois disso, novas entradas de time ficam congeladas até o fim da partida.

Eventos esperados:

```text
MATCH_STARTED { phase: "ACTIVE", durationSeconds: 300 }
MATCH_FINISHED { phase: "FINISHED", reason: "king_defeated" | "time_expired" }
```

Comandos administrativos futuros:

```text
!iniciar   -> começa a partida
!encerrar  -> encerra manualmente
!status    -> informa o estado atual
!resetar   -> prepara o próximo lobby
```

## Decisões e estrutura

**Padrões contínuos escolhidos pelo usuário: Clean Architecture, Clean Code e BDD.** Manter domínio/aplicação independentes do SDK TikTok, console e ambiente. Dependências apontam da infraestrutura para as portas da aplicação e tipos do domínio; `main.ts` faz composição e injeção. Usar módulos coesos, nomes claros e classes quando carregam estado (adaptador com deduplicação). Sem frameworks adicionais para esta POC.

- `tiktok-live-connector@2.4.4`, versão publicada consultada no npm em 15/09/2026, fixada no lockfile. Biblioteca não oficial. Documentação primária consultada: [repositório](https://github.com/zerodytrash/TikTok-Live-Connector), [eventos de gifts](https://github.com/zerodytrash/TikTok-Live-Connector#gift). O serviço de assinatura usado internamente é Euler Stream; a disponibilidade externa ainda precisa ser validada.
- `src/infrastructure/tiktok-live.ts`: conexão, eventos de transporte, erro, desconexão e encerramento; histórico inicial desativado para evitar ações anteriores à conexão. Sem reconexão automática nesta POC; reiniciar manualmente após falha.
- `src/infrastructure/tiktok-adapter.ts`: validação e normalização TikTok → `COMMENT` / `GIFT_RECEIVED`. Combos tipo 1 geram logs de progresso e só produzem evento interno quando `repeatEnd=1` (ou `true`). Contagem final é acumulada, não soma dos parciais. Sem final, não há crédito presumido.
- `src/infrastructure/tiktok-adapter.ts`: validação e normalização TikTok → `COMMENT` / `LIKE_RECEIVED` / `GIFT_RECEIVED`. Curtidas informam `count` por pacote e o interpretador usa o `total` acumulado do TikTok quando disponível, com fallback para soma local. Combos tipo 1 geram logs de progresso e só produzem evento interno quando `repeatEnd=1` (ou `true`). Contagem final é acumulada, não soma dos parciais. Sem final, não há crédito presumido.
- Deduplicação em memória dos últimos 10.000 IDs: grupo+usuário+gift para combo, ID de mensagem nos demais casos. Sem identificador, avisa `DEDUP_UNAVAILABLE`; não garante exatamente uma entrega, nem recuperação após reinício.
- `src/application/handle-live-event.ts`: `!entrar azul` e `!entrar vermelho` entram no time solicitado; `!entrar` escolhe aleatoriamente quando há empate e escolhe o time menor quando há desequilíbrio. O estado de jogadores fica em memória e uma segunda entrada do mesmo usuário é ignorada. A próxima regra de controle será restringir o início ao `!iniciar` do perfil administrador.
- `src/application/handle-live-event.ts`: curtidas geram `LIKE_ACKNOWLEDGED` com acumulado da sessão; `!entrar azul` e `!entrar vermelho` escolhem o time explicitamente, enquanto `!entrar` equilibra os times (aleatório no empate). Os demais comandos continuam exatos e sem argumentos. As regras de timer, XP, ranking e Gifts do MVP-0.2 estão definidas acima, mas ainda não implementadas.
- `src/domain/match-state.ts`: estado em memória de jogadores, times, curtidas individuais e por time. Cada 100 curtidas pessoais de um jogador já inscrito dispara `RULE_TRIGGERED` com ação `PLAYER_ATTACK`; curtidas sem time não entram no placar de equipe nem disparam ataque.
- `src/domain/match-state.ts`: cada rei começa com `1.000 HP`; `PLAYER_ATTACK` causa `10 + bônus de nível` no rei adversário, limitado a `+5`, e o HP nunca fica abaixo de zero. O domínio controla fases, cronômetro de 300 segundos, metas de cura, ataque coletivo, XP, nível e ranking. O interpretador registra `DAMAGE_APPLIED` e `KING_DEFEATED` quando aplicável.
- `src/domain/match-state.ts`: snapshots incluem jogadores, nível, energia, HP, escudos, curtidas e cargas táticas. Ataque, defesa e cura gastam energia obtida gratuitamente pelas curtidas.
- `src/infrastructure/arena-server.ts`: servidor HTTP sem dependências adicionais, com Server-Sent Events para transmitir snapshots e atividades do jogo ao navegador.
- `public/`: overlay 16:9 desenhado em Canvas, com castelos, rio, pontes, unidades, HUD, feed, legenda permanente e efeitos de ataque/cura/escudo. Até 8 unidades aparecem por time e o excedente é agrupado.
- `src/domain/events.ts`: tipos internos puros. `src/application/ports.ts`: portas funcionais `Log` e `HandleLiveEvent`. `src/infrastructure/console-log.ts`: implementação JSON por linha com horário, origem e etapa. `RESULT` contém resposta observável e contadores da sessão. Sem cooldown nesta fase de confirmação em logs.
- `src/infrastructure/simulation.ts`: fixtures que atravessam o mesmo adaptador e interpretador. `src/config/config.ts`: validação do perfil. `src/main.ts`: composição/CLI. `test/`: testes automatizados.
- `src/infrastructure/tiktok-live.ts`: registra listeners de chat, gifts e likes no conector real. `src/infrastructure/simulation.ts`: fixtures que atravessam o mesmo adaptador e interpretador. `src/config/config.ts`: validação do perfil. `src/main.ts`: composição/CLI. `test/`: testes automatizados.
- `npm test` (inclui build): **19 testes aprovados, zero falhas** após incluir ciclo da partida, XP, ranking, metas, cargas e energia/comandos.
- Atenção à divergência do README upstream: o schema v3 publicado em 2.4.4 usa `user.displayId`, comentário `content`, `gift.type`, `gift.name` e `repeatEnd` numérico. Implementação lê esses campos e tolera aliases anteriores. Testes de aceitação verificam os campos contra as tipagens instaladas. Há adaptação tipada de `on` apenas na fronteira do SDK devido ao `typed-emitter` publicado com import incompatível com NodeNext; inicialização e método real foram verificados sem conexão.
- Execução usa TypeScript compilado + test runner nativo Node. `tsx` foi removido após falha de `os.userInfo` no sandbox Windows; não é necessário para executar o projeto.
- `enableExtendedGiftInfo: false`: consulta extra ao catálogo de presentes exigiu assinatura Business no teste real. A POC utiliza os campos dos próprios eventos (`gift.type/name`) e fallback de nome por ID; conexão básica funcionou com catálogo desativado, sem configurar nova chave.

## Aceitação BDD

Cenários executáveis em `test/acceptance.test.ts`, sem Cucumber ou conexão externa:

| ID | Dado | Quando | Então |
|---|---|---|---|
| BDD-01 | Comentário `!entrar vermelho` | Recebido/interpretado | Registra entrada no time vermelho e resposta local |
| BDD-02 | Comando desconhecido | Interpretado | Registra motivo e não confirma ação |
| BDD-03 | Uma rosa em combo | Finaliza e final é repetido | Confirma uma unidade uma única vez |

`test/pipeline.test.ts` complementa com total da simulação, presente sem combo, combos independentes, payload inválido, comentário comum, repetição e configuração ausente. Escopo enxuto: não há suíte de reconexão ou outros eventos.

## Como executar

Requer Node.js 22 ou superior e npm. Ambiente usado: Node 24.20.0 / npm 11.19.0.

```powershell
cd D:\projetos\miniGame-tiktok
npm ci
npm run check
npm test
npm run build
npm run simulate
```

Ou, após build: `npm start -- simulate`. A simulação não acessa TikTok: todos os logs têm `source: "simulation"`. Exibe dois comandos aceitos, uma curtida de 100 que dispara ataque e cinco unidades de presentes: combo Rose x3, outra Rose x1 e presente simples x1; final duplicado é descartado.

### Abrir a arena no navegador ou OBS

Para conferir o visual com jogadores e interações sintéticas, sem acessar o TikTok:

```powershell
npm run arena:demo
```

Abra `http://localhost:3000`. No OBS, adicione essa URL como Browser Source em proporção 16:9 (por exemplo, 1600 × 900 ou 1920 × 1080).

Para usar a arena com a live real, este é o comando principal:

```powershell
npm run live -- @nome_do_perfil
```

A porta padrão é 3000 e pode ser alterada pela variável `ARENA_PORT`. Em seguida, abra `http://localhost:3000` no navegador ou como Browser Source no OBS. O servidor transmite apenas estado e eventos locais por SSE; o navegador não se conecta diretamente ao TikTok.

`npm run arena -- @nome_do_perfil` continua como alias compatível. Para executar somente os logs técnicos, sem abrir a arena, use `npm run logs -- @nome_do_perfil`.

### Conectar à live real sem overlay

Com o perfil transmitindo ao vivo:

```powershell
npm run logs -- @nome_do_perfil
```

Alternativa: `$env:TIKTOK_USERNAME = 'nome_do_perfil'` e `npm run live`. Após build: `npm start -- live @nome_do_perfil`. Ctrl+C encerra. `.env` não é carregado automaticamente.

Se o serviço de assinatura solicitar uma chave, configure `EULER_API_KEY` somente no ambiente local e execute novamente. Não colocar chave no README, logs compartilhados ou código. Não é necessário fornecer senha ou cookie do TikTok nesta POC.

Esperar `CONNECTED` com roomId; de outro espectador, comentar `!entrar azul`, `!entrar vermelho` ou `!entrar`. Conferir `RECEIVED` → `INTERNAL_EVENT` → `COMMAND` → `RESULT`. Para presente, conferir `GIFT_PROGRESS` e um único `GIFT_RECEIVED` com total ao concluir combo. Os logs reais têm `source: "tiktok"`. Uma falha não aciona simulação silenciosa. Logs de comentários contêm usernames/textos: revisar antes de compartilhar.

## Progresso e verificações

- Lidos os dois documentos de planejamento e confirmado escopo restrito.
- Consultada documentação primária atual e instalado conector 2.4.4 com dependências fixadas. Instalação informou zero vulnerabilidades.
- Implementados normalização, interpretação, logs, simulação e entrada real.
- `npm run check`: aprovado. `npm test` (inclui build): **19 testes aprovados, zero falhas**. Casos de uso testados diretamente com porta de log em memória e com adaptador simulado.
- `npm run arena:demo`: servidor respondeu em `/health` e a página carregou em 1600 × 900 sem erros no console do navegador. Foram conferidos HUD, personagens, meta, energia, comandos, feed e efeitos via SSE.
- `npm run simulate`: aprovado, dois comandos aceitos e total de cinco presentes; final repetido ignorado. Build impede emissão em caso de erro.
- Importação, construção do SDK e `disconnect()` local: aprovados, sem chamar `connect()`. Construtor precisa de objeto de opções nesta versão; implementação o fornece.
- **Primeira tentativa real em 15/09/2026, 12:37 (São Paulo):** usuário informou que abriu a live; arroba recebido por voz foi interpretado provisoriamente como `henrique_santos`. Executado `npm run live -- henrique_santos`. Build aprovado; `CONNECTING` às 15:37:38 UTC seguido de `CONNECT_FAILED` às 15:37:39 UTC: `Failed to retrieve Room ID from all sources.` Processo encerrou com código 1, sem `CONNECTED` ou eventos reais.
- Diagnóstico somente do mesmo candidato via `fetchRoomId()`: API TikTok retornou **19881007 (`user_not_found`)**; rota HTML não extraiu `SIGI_STATE` (mensagem indica possível bloqueio TikTok); fallback Euler informou falta de permissão. Isso não comprova live offline. Próximo passo é confirmar arroba/link exato antes de investigar autenticação/assinatura. Nenhuma variação de perfil foi tentada e nenhuma mensagem/presente foi enviado. Diagnóstico também encerrado; **não há receptor ativo**.
- **Captura real ainda não validada:** testes locais continuam aprovados, mas nenhuma conexão à sala ou recepção real foi obtida.
- **Segunda tentativa real em 15/09/2026, 12:39 (São Paulo):** usuário corrigiu e confirmou o arroba exato **`henruque_santos`**. Executado `npm run live -- henruque_santos`; build aprovado. `CONNECTING` às 15:39:52 UTC → `CONNECT_FAILED` às 15:39:54 UTC com **`The requested user isn't online :(`**. Processo encerrou com código 1, sem conexão/eventos. O usuário informou que encerraria e reiniciaria a live após convite acidental; estado pode estar transitório. Aguardar confirmação do reinício e tentar somente este perfil. Não interpretar esse resultado como arroba incorreto. **Nenhum receptor ativo.**
- **Conexão real obtida em 15/09/2026, 12:42:15 (São Paulo):** após confirmação de live reiniciada, pública e com comentários habilitados, primeira tentativa falhou na assinatura da consulta opcional de catálogo (Business exigido). Desativado `enableExtendedGiftInfo`; nova execução registrou `CONNECTED` com `username: henruque_santos`, **roomId `7685787361223166740`**, às `2026-09-15T15:42:15.361Z`. Não foi necessário configurar nova chave. `npm test` após ajuste: **9/9 aprovados**.
- **Estado mais recente:** a conexão real foi validada anteriormente, mas não há receptor TikTok ativo nesta etapa. O processo ativo é somente `arena:demo`, sem acesso externo, para inspeção visual no Preview.
- **Curtidas observadas em 15/09/2026:** a captura real recebeu comentários, mas ainda não havia listener para `WebcastEvent.LIKE`; por isso nenhuma curtida aparecia nos logs. Adicionado listener real, normalização de `count` e confirmação local `LIKE_ACKNOWLEDGED`; falta validar uma nova curtida na próxima live.

## Retomar daqui

1. Implementar `!iniciar` restrito ao perfil administrador, manter o lobby por 20 segundos e congelar entradas após o início.
2. Validar a arena em uma live real e ajustar densidade/tamanho das unidades com espectadores reais.
3. Adicionar cooldowns explícitos aos comandos e uso das cargas táticas com limites anti-pay-to-win.
4. Capturar foto de perfil do payload do TikTok como opção de avatar, mantendo o personagem desenhado como fallback.
5. Persistir XP e ranking global somente depois de validar a experiência da primeira tela.
