# TerminalZero

Automatiza o fluxo de "motion" da Higgsfield para vídeos maiores que o limite de uma geração:

1. Você escolhe o **vídeo de movimento** e a **imagem do personagem**.
2. O app divide o vídeo em partes de **5 segundos** (a última fica com o resto: 12s → 0–5, 5–10, 10–12).
3. Para cada parte, clique em **Gerar na Higgsfield**: o app abre o navegador, loga na sua conta,
   envia a parte + personagem na página de Motion, espera terminar e baixa o resultado.
   Também dá para **enviar manualmente** um vídeo gerado.
4. **Juntar vídeos** monta tudo em sequência (opcionalmente com o áudio do vídeo original).

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

## Ajustando a automação

Os seletores da Higgsfield ficam em `src/higgsfield.js` (textos dos botões de login e de gerar, campos de
upload). Se o site mudar ou algo não for encontrado, ajuste as constantes no topo do arquivo.
