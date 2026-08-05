# Ave, Devocional Mariano Diário

Terço do dia, novenas marianas e santo do dia, calculados automaticamente a partir de `/data/*.json`.

## Estrutura
```
/
├── index.html              → /
├── terco/index.html         → /terco (contador de terço guiado, com foto real de rosário)
├── terco/calibrar.html      → ferramenta interna pra calibrar posição das contas numa foto nova
├── novenas/index.html       → /novenas
├── santos/index.html        → /santos
├── titulos/index.html       → /titulos
├── oracoes/index.html       → /oracoes (orações curtas com áudio)
├── admin/audios.html        → painel não-listado pra upload de áudio (login Google restrito)
├── css/style.css
├── js/
│   ├── devocional.js        → lógica de "o que mostrar hoje" (mistério, novena, santo)
│   ├── contador-terco.js    → contador guiado do terço (61 contas, texto+áudio, velocidade)
│   ├── audio-player.js      → player reutilizável (orações curtas, mistérios)
│   ├── tamanho-fonte.js     → toggle A/A+/A++ (acessibilidade)
│   ├── supabase-client.js   → cliente Supabase (auth, favoritos, streak)
│   ├── supabase-config.js   → URL + chave pública do projeto Supabase
│   ├── auth-widget.js       → login com Google no menu
│   └── favorito-btn.js      → botão de favoritar (♡/♥)
├── img/
│   ├── hodegetria.webp      → ícone da home
│   ├── rosario.webp         → foto real usada no contador do terço
│   ├── estrelas.svg         → textura de fundo (ver nota sobre Safari abaixo)
│   └── mascaras/            → 61 PNGs (uma por conta física), extraídos do PSD do rosário
├── data/
│   ├── misterios.json       → mistérios do terço, com áudio por mistério
│   ├── novenas.json
│   ├── santos.json          (só agosto preenchido, ver observação no arquivo)
│   ├── titulos-marianos.json
│   ├── oracoes.json         → orações fixas (Pai Nosso, Ave Maria, Glória etc.), com áudio
│   └── mascaras-posicoes.json → posição (x/y/largura/altura em %) de cada conta na foto do terço
└── supabase/schema.sql      → tabelas (favoritos, streak, newsletter) + policies de Storage
```

## Caminhos
Todos os links e `fetch()` usam caminhos relativos, então o site funciona tanto em
`usuario.github.io/Ave-Devocional/` (subpasta) quanto num domínio próprio, sem precisar
ajustar nada em nenhum dos dois casos.

## Cache do CSS
O link do `style.css` usa `?v=N` (cache-busting). Se editar o CSS e a mudança não aparecer
pra alguém (principalmente Safari, que segura cache com mais teimosia), sobe o número da
versão no link de todas as páginas.

## Nota técnica: Safari e gradientes minúsculos
O fundo estrelado usava gradientes radiais de 1-2px ao vivo (CSS puro) e isso causava um bug
sério só no Safari: em vez de pontinhos transparentes, a tela inteira ficava cinza. Trocamos
por `img/estrelas.svg`, uma imagem estática repetida em mosaico. Evite recriar efeitos com
gradientes radiais muito pequenos (<3px) direto em CSS: teste no Safari antes de confiar.

## Terço guiado (contador)
`js/contador-terco.js` conduz a oração inteira: 61 toques (59 contas + medalha + crucifixo),
cada um numa posição real da foto em `img/rosario.webp`, usando as máscaras de
`img/mascaras/` (recorte exato de cada conta, extraído das layers do PSD original) e as
posições de `data/mascaras-posicoes.json`.

Pra cada passo, mostra o texto completo da oração (aparecendo aos poucos) e toca o áudio
gravado (se existir, na voz escolhida). Quando o áudio termina (ou, sem áudio, depois de um
tempo de leitura), avança sozinho pra próxima conta — dá pra pausar, ajustar a velocidade
(5 níveis) e trocar de voz a qualquer momento.

Se um dia trocar a foto do rosário, use `terco/calibrar.html` pra marcar a posição de cada
conta na imagem nova (clicando em ordem) e gera as coordenadas atualizadas.

## Áudios das orações
Os áudios NÃO ficam no repositório (git não é lugar pra mídia). Dois jeitos de subir:

**Pelo admin hub (recomendado):** `admin/audios.html` — login com Google (só
`micaelfacciodev@gmail.com` tem permissão, tanto na tela quanto na policy do Supabase),
escolhe o arquivo pra cada oração/mistério, sobe direto com o nome certo. No fim, copia o
resumo de URLs geradas.

**Manual:**
1. No Supabase, bucket **público** chamado `oracoes` (Storage → New bucket → marcar "Public").
2. Sobe os `.mp3` com nomes: `{id}-ele.mp3` e `{id}-ela.mp3` (ids em `data/oracoes.json` e,
   pros mistérios, `{conjunto}-{indice}-ele.mp3`, ex.: `dolorosos-0-ele.mp3`).
3. Copia a URL pública e cola no campo `audio_ele`/`audio_ela` correspondente em
   `data/oracoes.json` ou `data/misterios.json`.
4. Sem áudio ainda, deixa `null` — a página mostra "Áudio guiado em breve" sem quebrar.

## Supabase
Projeto na região São Paulo. `supabase/schema.sql` é idempotente (pode rodar de novo sem
erro) e cria: tabela de favoritos, streak de dias rezados, newsletter, e as policies de
Storage pro bucket `oracoes` (leitura pública, upload só pro email autorizado).

Login é só com Google (sem senha, sem magic link por email). Precisa configurar o provider
Google no painel do Supabase (Authentication → Providers) com Client ID/Secret do Google
Cloud Console, e a URL de callback:
`https://aewqijndqlnmtpkxnvrv.supabase.co/auth/v1/callback`.

## Acessibilidade
- Toggle de tamanho de texto (A/A+/A++) em todas as páginas, salvo em `localStorage`.
  Escala o `<html>` inteiro via `rem`, não só um bloco de texto.
- Contador do terço: toque em qualquer lugar da imagem avança (não precisa mirar numa conta
  específica), contas grandes o bastante pra toque fácil, texto sempre visível em 4 linhas
  com esmaecimento suave.

## Deploy
1. Settings → Pages → Source: branch `main`, pasta `/ (root)`.
2. (Recomendado) Settings → Pages → Custom domain → apontar um domínio seu.
3. O arquivo `.nojekyll` na raiz evita que o GitHub processe o site como Jekyll.

## Pendências de conteúdo
- `data/santos.json` só tem agosto, e só com celebrações confirmadas no Calendário Romano
  Geral. Precisa validar e completar o ano inteiro.
- Páginas individuais por novena (`/novenas/assuncao` etc.) e por título mariano
  (`/titulos/aparecida` etc.) ainda não foram criadas, as páginas de listagem atuais mostram
  tudo numa página só.
- Maioria dos áudios ainda não foi gravada (campos `audio_ele`/`audio_ela` como `null`).
