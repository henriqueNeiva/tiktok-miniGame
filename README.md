# Guerra da Live — arena vertical
Atualizado em **22/09/2026**. Fonte de continuidade entre pessoas, IAs e agentes.

## Regra permanente
**Leia este README antes de trabalhar. Qualquer IA/agente deve mantê-lo atualizado a cada marco relevante e antes de encerrar/interromper: mudanças, decisões, verificações com resultados reais, limitações e “Retomar daqui”. Nunca registrar segredos.**
Padrões contínuos: **Clean Architecture, Clean Code e BDD**. Domínio e aplicação não dependem de TikTok, console, HTTP ou navegador.

## Estado e escopo atuais
Arena de batalha para TikTok LIVE, com servidor autoritativo em Node.js/TypeScript e cliente Canvas/SSE para navegador/OBS. A orientação correta, confirmada pelo usuário em 22/09, é **vertical, reis em cima e embaixo**.
Recepção de comentários, curtidas e presentes. Sem persistência, mensagens enviadas ao TikTok ou compra de presentes.

Os documentos [visão](guerra_da_live_esboco.md) e [plano amplo](guerra_da_live_mvp.md) são referências futuras, não a especificação atual.
O [histórico até 15/09](docs/historico-ate-2026-09-15.md) preserva tentativas e decisões antigas; regras antigas de energia/cura/cargas e lista de pendências foram substituídas pelas regras abaixo.

## Regras atuais
| Entrada/ação | Resultado |
|---|---|
| `/entrar` | Cria um soldado no time menor; empate usa sorteio |
| `!entrar` | Alias compatível da mesma ação |
| Tempo | Soldado marcha e ataca o rei adversário automaticamente: **2 HP a cada 3 s** |
| **100 curtidas individuais recebidas** | Dispara um **meteoro de 40 HP**, com efeito distinto |
| 250 curtidas recebidas | Dois meteoros + 50 de carga restante |
| Rosa / Rose | Rajada de pétalas: **20 HP por unidade**, combo processado só no final |
| Rosquinha / Doughnut / Donut | Aura roxa e **dano 3× por 120 s**, limitado ao fim da rodada |
| Pontos | **1 ponto por HP efetivamente removido**, inclusive dano final limitado ao HP restante |

- Comandos de ataque, defesa, cura e escolha de time foram removidos. Repetir entrada não cria soldado nem pontos.
- Curtidas antes da entrada não carregam poder retroativo. Curtidas de usuários diferentes não se misturam. Total de likes da sala é apenas informativo.
- Pacotes com mesmo ID são descartados; sem ID não há garantia de deduplicação.
- Reis com 1.000 HP; partida de até 180 s. Vence quem derruba o rei ou mantém mais HP. HP igual resulta em empate.
- Primeira entrada inicia combate; novos jogadores podem entrar durante a partida. Entrada no intervalo participa da rodada seguinte.
- Resultado por 12 s, depois nova rodada automática. Jogadores/times/XP permanecem; HP, pontos, carga e curtidas da rodada zeram.
- XP: 1 por ataque básico efetivo, 10 por especial; nível a cada 100 XP. Nível não altera dano.
- Valores centralizados em `src/domain/game-rules.ts`; são hipóteses iniciais de balanceamento.

## Pesquisa e decisões de experiência
Veja [pesquisa e próximos experimentos](docs/pesquisa-gameplay-2026-09-22.md), com fontes primárias de TapToks, TikFinity, TikBoom e do conector.
Aplicados: interação única de entrada, batalha automática, carga pessoal visível, especial com autor/impacto, objetivo de derrubar o rei e rodadas curtas.
Tela: reis fixos verticalmente, soldados com marcha inicial, ataques básicos discretos, meteoro dourado, HP, cronômetro, líder por dano e instrução permanente. Até seis soldados visíveis por time; excedentes continuam combatendo e aparecem no contador.
Identificação explícita entre demonstração e conexão real. SSE reconectado recebe estado, sem reproduzir ataques históricos.

## Arquitetura
- `src/domain/game-rules.ts`: parâmetros.
- `src/domain/match-state.ts`: equipes, relógio determinístico, ataques, carga, pontuação, rodadas e eventos de combate. Sem I/O.
- `src/domain/events.ts`: eventos de entrada normalizados.
- `src/application/handle-live-event.ts`: caso de uso, interpretação de entrada e publicação nas portas `Log`/`HandleLiveEvent`.
- `src/infrastructure/tiktok-adapter.ts`: validação, normalização, combos e deduplicação.
- `src/infrastructure/tiktok-live.ts`: conexão/erros/chat/gifts/likes.
- `src/infrastructure/arena-server.ts`: HTTP/SSE e estado da conexão.
- `src/infrastructure/arena-demo.ts` e `simulation.ts`: dados sintéticos pelo mesmo adaptador.
- `src/main.ts`: composição, injeção, configuração e relógio de execução.
- `public/arena.js`: HUD e eventos SSE; `renderer.js`: campo, soldados e efeitos; HTML/CSS: layout.
- `test/`: BDD e testes de fronteira/normalização.

## Executar
Node.js >=22; ambiente usado Node 24.20.0. Dependências fixadas em lockfile.

```powershell
npm ci
npm run check
npm test
npm run arena:demo
```

Abra [arena local](http://localhost:3000). Demonstração não acessa TikTok.
Para ver o resultado desta sessão, o processo demo foi aberto em **[localhost:3001](http://localhost:3001)** (sessão exec 16928). Esse estado é transitório; verificar antes de reutilizar.

```powershell
npm run live -- henruque_santos
# somente logs
npm run logs -- henruque_santos
# simulação curta, sem servidor
npm run simulate
```

`npm run arena -- @perfil` também funciona. `ARENA_PORT` muda a porta (padrão 3000). `TIKTOK_USERNAME` é alternativa ao argumento. Ctrl+C encerra. `.env` não é carregado automaticamente.
No OBS/TikTok Live Studio, usar Browser Source **1080 × 1920**; não capturar editor/desktop. Conferir áreas de controles e comentários na transmissão real. O navegador em PC também exibe o tabuleiro vertical.

## Integração TikTok
Biblioteca não oficial `tiktok-live-connector@2.4.4`. Os campos do schema instalado diferem de alguns exemplos upstream: `content`, `user.displayId`, `gift.type/name`, `repeatEnd` 0/1.
Catálogo opcional `enableExtendedGiftInfo` permanece desativado: exigiu assinatura Business no teste de 15/09; eventos já contêm os dados necessários.
Chave `EULER_API_KEY`, se exigida pelo serviço, somente em ambiente local; não colocar em código/docs.
Conexão real a `henruque_santos` e comentários foram registrados na etapa anterior. **Esta refatoração ainda não foi validada em nova live.**
Segundo o [conector](https://github.com/zerodytrash/TikTok-Live-Connector#like), TikTok pode não entregar todos os eventos de likes. “100” significa 100 curtidas pessoais recebidas, não garantia de 100 toques físicos.

## Verificações desta refatoração
- `npm test`: **28 aprovados, zero falhas**, incluindo build e suporte a foto de perfil.
- Foto de perfil: `tiktok-avatar.ts` extrai URL HTTPS de `avatarThumb.urlList`, com alternativas medium/large. Evento interno e snapshot carregam `avatarUrl`; novos eventos podem atualizar a foto sem duplicar o jogador. `avatar-cache.js` carrega imagens no navegador, com cache limitado e fallback ao soldado enquanto carrega ou em caso de erro. Recorte circular preserva borda do time e carga. Tipos conferidos no SDK instalado; foto real ainda depende de validação em live.
- BDD: entrada/alias, comandos removidos, ataque sem comentários, 99+151 likes, independência por usuário, pacote repetido, presente desconhecido sem dano, fim/reinício, XP, tempo fracionado e em lote.
- Proteções mantidas: combo de presentes só no final, replay de gifts, payload inválido, CLI sem perfil.
- `node --check`: scripts do navegador aprovados.
- Demo serve estado real da simulação via SSE; observados ataques automáticos, meteoros e resultado de rodada.
- Inspeção visual em 390 × 844 e 1080 × 1920; corrigidos erro de Canvas e sobreposição de soldados. Revisão final aprovada: sem rolagem/overflow em 390 × 844 e 1080 × 1920; rodapé da cena em ~1537 px, preservando espaço inferior. Nenhum novo erro de navegador após correção.

## Limitações
- Estado em memória; reiniciar perde XP/jogadores. Sem reconexão automática do TikTok.
- Dano cresce com tamanho do exército; balanceamento de audiência grande pendente.
- Curtidas dependem da entrega do TikTok. Não usar total global para tentar compensar um usuário.
- Mais de seis unidades por time são agrupadas visualmente. Não há colisão/PvP entre soldados: alvo é o rei.
- O relógio avança por ticks locais de 1 s; suspensão do PC pausa o ritmo.
- Efeitos limitados a 180 simultâneos para proteger o cliente; essa limitação não altera o dano no servidor.

## Retomar daqui
1. Abrir a demonstração em localhost:3001 e avaliar o novo ritmo; implementação e revisão local concluídas.
2. Testar com live ativa de `henruque_santos`: comentário `/entrar`, foto de perfil na bolinha, ataques automáticos e 100 likes individuais recebidos; registrar resultados sem inferir sucesso.
3. Observar tempo até primeiro meteoro, duração de rodada, leitura no celular e assimetria dos times; ajustar `game-rules.ts` conforme evidência.
4. Validar nomes dos presentes no payload real (sem inventar IDs); depois adicionar outros poderes conforme pedido.




## Poderes de presentes — implementação atual
- Rosa: rajada rosa com pétalas, 20 de dano por presente. Combo final x3 = 60, sem somar parciais. Dano real limitado ao HP do rei; pontua pelo dano, não concede XP direto.
- Rosquinha: aura roxa com indicador `3×` e segundos restantes. Triplica básicos (2 → 6), meteoros (40 → 120) e Rosas (20 → 60). Prazo de 120 segundos de combate, encerrado no fim da rodada.
- Repetir Rosquinha renova 120 segundos a partir do recebimento; não soma tempo por quantidade nem multiplica para 9×. Nova rodada remove o bônus.
- Exige jogador inscrito e partida ACTIVE. Sem entrada, no intervalo ou presente desconhecido: loga motivo, sem efeito retroativo.
- Configuração: valores em `src/domain/game-rules.ts`; nomes exatos normalizados em `src/application/gift-powers.ts`. Nomes locais/ingleses; IDs regionais ainda não confirmados ao vivo.
- Demo gera ambos os presentes. Testes cobrem combo/replay, 3× em todos os ataques, expiração exata, renovação, reset, jogador ausente e fim da partida. 28 testes aprovados. Validação de presentes reais ainda pendente.
