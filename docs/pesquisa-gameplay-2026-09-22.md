# Pesquisa de referências e direção do jogo
Data: 22/09/2026. Pesquisa exploratória em páginas dos próprios produtos, não análise quantitativa de mercado. Não foram medidos retenção, faturamento ou popularidade.

## Referências consultadas
| Fonte primária | O que descreve | Aplicação neste projeto |
|---|---|---|
| [TapToks / Crowns & Carnage](https://taptoks.com/) | Entrada em facções, unidades acionadas por interações e rodadas automáticas até um rei cair | Objetivo legível e ciclo automático. Não copiar identidade visual ou assets |
| [TikFinity: configuração](https://blog.tikfinity.com/tikfinity-setup/) | Eventos de live associados a ações e controles de cooldown | Cada ação precisa gerar feedback imediato e identificável. Deduplicar curtidas; manter limites visuais |
| [TikBoom](https://www.tikboom.io/) | Jogos para lives que recebem interações por integrações | Separar recepção de plataforma, regras e apresentação; preservar nosso adaptador |
| [TikTok Live Connector — likes](https://github.com/zerodytrash/TikTok-Live-Connector#like) | Eventos individuais podem não ser entregues em lives com muitos espectadores | Contabilizar pacotes recebidos, nunca prometer precisão absoluta das 100 curtidas |

## Síntese de produto (nossa interpretação)
- Menos comandos reduzem o que o espectador precisa memorizar. Entrada única, combate automático, curtidas como intervenção.
- O campo precisa continuar vivo mesmo sem novos comentários: marcha inicial, ataques periódicos, projéteis e impactos.
- Especial precisa parecer diferente do ataque comum: meteoro dourado, trilha, explosão, autor e dano.
- Mostrar objetivo imediato por jogador: carga de 0 a 100. Nenhuma mistura com total global de likes.
- Ritmo proposto: até 3 minutos de combate e 12 segundos de resultado. Valores escolhidos para experimento, não prescritos pelas fontes.
- Pontos devem ser compreensíveis: 1 ponto por HP realmente removido. XP é reconhecimento separado, sem aumentar o dano e ampliar vantagem de veteranos.
- Orientação confirmada pelo usuário: VERTICAL, com rei vermelho em cima e azul embaixo.

## Implementado
- /entrar (+ !entrar compatível), distribuição equilibrada entre equipes.
- Ataque básico de 2 HP a cada 3 segundos por jogador.
- 100 curtidas pessoais recebidas após entrada => meteoro de 40 HP. 250 curtidas => 2 meteoros e 50 de carga.
- Rodadas automáticas, destaque por dano, barras de vida e carga, efeitos distintos.
- Presentes reconhecidos, sem poder nesta etapa.

## Próximos experimentos, após testar ao vivo
1. Observar se alguém que acabou de chegar consegue explicar como entrar e usar o meteoro.
2. Medir duração real da rodada, participantes por equipe, quantos chegam ao primeiro especial e se o campo fica legível.
3. Ajustar dano/cadência conforme audiência. Hoje o DPS cresce com o número de soldados; em lives grandes pode encurtar demais as partidas.
4. Destacar temporariamente soldados fora dos seis visíveis por time quando usarem especial.
5. Som opcional e intensidade visual ajustável após feedback.
6. Só depois mapear presentes a poderes com limites claros e sem retirar o valor das curtidas.

## Não concluir ainda
A pesquisa não comprova aumento de retenção. A refatoração foi validada em simulação e testes automatizados; captura real de likes e percepção do público ainda precisam de sessão ao vivo.


