# MotionFlow

Aplicativo local para dividir vídeos em trechos de 5 segundos, associar um personagem e uma conta Higgsfield a cada trecho e reunir os resultados na ordem original.

## Iniciar

Requisitos: Node.js 22 ou posterior e Microsoft Edge instalado para abrir as sessões das contas.

```sh
npm install
npm start
```

Abra http://127.0.0.1:4317. FFmpeg e FFprobe são dependências do projeto. Se o npm bloquear scripts de instalação, autorize o script de `ffmpeg-static` para baixar seu executável.

## Fluxo disponível

1. Cadastre suas contas. A senha é opcional; use **Abrir login** para autenticar diretamente no Higgsfield. Cada conta tem seu próprio perfil persistente do Edge.
2. Selecione vídeo, imagem do personagem e uma conta diferente por trecho. Para 12 segundos, selecione três contas: 0–5, 5–10 e 10–12 segundos.
3. Clique em **Preparar os trechos**. Os cortes são reais, recodificados com FFmpeg; o último preserva sua duração restante.
4. Baixe os trechos e o personagem, processe nas respectivas contas e importe cada resultado no cartão correto.
5. Clique em **Unir resultados**. Os vídeos são normalizados para o tamanho original e 30 fps, cortados à duração de cada trecho e unidos com o áudio original. Resultados mais curtos são rejeitados.

## Integração automática: ainda não validada

O corte, cadastro, importação e união funcionam localmente. **Não foi validado login automático, envio, geração ou download no Higgsfield com contas reais.** A página pública exige autenticação para inspecionar os controles relevantes. Não há seletores inventados nem gerações simuladas.

Existe um adaptador Playwright para sessões independentes, envio da imagem e vídeo, geração e download. Para habilitá-lo, copie `automation.example.json` para `data/automation.json` e preencha seletores Playwright reais, inspecionados na página autenticada. Os quatro primeiros campos são obrigatórios. Os três de login são opcionais; sessões autenticadas podem ser usadas diretamente. A presença do arquivo habilita o botão, mas não comprova compatibilidade.

O adaptador processa uma conta por vez, aguarda até 30 minutos e requer um botão de download que produza um evento de download do navegador. Exige uma geração vazia, sem resultado anterior visível, para não baixar o vídeo errado. Mudanças de página, CAPTCHA, MFA, geração mínima aceita pelo serviço ou downloads com outro comportamento exigem intervenção/ajustes. Um trecho final de 2 segundos pode exigir tratamento específico do modelo no serviço; os cortes locais permanecem exatos.

Em falhas após o início do envio, não repete automaticamente: confira a conta e importe o resultado para evitar duplicar gerações/créditos. A geração automática usa créditos das contas e pede confirmação na interface. Não foram feitas gerações pagas durante o desenvolvimento.

## Dados locais

`data/` contém projetos, arquivos, perfis de navegador e credenciais. É ignorada pelo Git. Senhas usam AES-256-GCM com chave local em `data/key`; isso não protege contra alguém com acesso completo à pasta. Não compartilhe essa pasta. O servidor escuta apenas em 127.0.0.1 e rejeita origens externas. Não exponha esse servidor à internet.

Limites: vídeos de até 30 minutos e arquivos de até 1 GB. A aplicação não retoma operações interrompidas automaticamente. Projetos e resultados são persistidos. Dados antigos do repositório foram removidos a pedido; o histórico Git foi preservado.

## Verificação

```sh
npm run check
npm test
```

Os testes geram um vídeo real de 12 segundos com áudio, verificam cortes 5 + 5 + 2 e a duração após união. Os testes não acessam contas Higgsfield.
