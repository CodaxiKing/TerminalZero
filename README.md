# TerminalZero

Automatiza o fluxo de "motion" da Higgsfield para vídeos maiores que o limite de uma geração:

1. Você escolhe o **vídeo de movimento**, a **imagem do personagem** e o tamanho máximo de cada parte
   (3 a 10s, padrão 5s).
2. O app divide o vídeo no menor número de **partes iguais** que não passem desse máximo — sempre para
   menos, nunca para mais (12s com máx. 5s → 3 partes de 4s; 20s → 4 de 5s).
3. Para cada parte, clique em **Gerar na Higgsfield**, ou em **Gerar todas** para uma fila em ordem:
   o app abre o navegador, loga na sua conta, envia a parte + personagem na página de Motion, espera o
   card mais recente ficar pronto e baixa o vídeo dele. A fila para no primeiro erro ou quando os
   créditos acabam. Também dá para **enviar manualmente** um vídeo gerado.
4. **Juntar vídeos** monta tudo em sequência, no FPS original, com transição suave opcional (0,2s, sem
   mudar a duração) e opcionalmente com o áudio do vídeo original.

Divisão e junção mostram uma barra de progresso. Projetos antigos aparecem na tela inicial para
abrir de novo ou apagar.

Usa uma conta só. Cada parte consome créditos da sua conta.

## Rodando

Precisa de Node.js 20+.

```bash
npm install
npx playwright install chromium
npm start
```

Abra http://localhost:3000.

- Na primeira geração o navegador abre visível. Se aparecer captcha ou código por email, resolva na janela;
  a sessão fica salva em `data/browser` e é reaproveitada nas próximas.
- Email e senha ficam só na memória do servidor (não são gravados em disco).
- Projetos ficam em `data/jobs/<id>` (partes, resultados e `final.mp4`).

Variáveis opcionais:

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `PORT` | `3000` | Porta do servidor |
| `HEADLESS` | desligado | `1` para rodar o navegador sem janela |
| `GENERATION_TIMEOUT_MIN` | `20` | Minutos esperando cada geração |
| `CHROMIUM_PATH` | do Playwright | Caminho de outro Chromium/Chrome |
| `HIGGSFIELD_URL` | página de Motion | Endereço da página de Motion (útil para testes) |

## Ajustando a automação

Os seletores da Higgsfield ficam em `src/higgsfield.js` (textos dos botões de login e de gerar, campos de
upload, textos de "sem créditos"). Se o site mudar ou algo não for encontrado, ajuste as constantes no
topo do arquivo.

Quando uma geração falha, o app salva um **print e o HTML da página** em `data/jobs/<id>/debug` e mostra
links para eles na parte que falhou — mande esses arquivos para ajustar os seletores.
