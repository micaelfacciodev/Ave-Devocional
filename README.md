# Ave — Devocional Mariano Diário

Terço do dia, novenas marianas e santo do dia, calculados automaticamente a partir de `/data/*.json`.

## Estrutura
```
/
├── index.html            → /
├── terco/index.html       → /terco
├── novenas/index.html     → /novenas
├── santos/index.html      → /santos
├── titulos/index.html     → /titulos
├── css/style.css
├── js/devocional.js       → lógica de "o que mostrar hoje"
└── data/
    ├── misterios.json
    ├── novenas.json
    ├── santos.json         (só agosto preenchido — ver observação no arquivo)
    └── titulos-marianos.json
```

## Caminhos
Todos os links e `fetch()` usam caminhos relativos, então o site funciona tanto em
`usuario.github.io/Ave-Devocional/` (subpasta) quanto num domínio próprio, sem precisar
ajustar nada em nenhum dos dois casos.

## Áudios das orações
Os áudios NÃO ficam no repositório (git não é lugar pra mídia). Fluxo:

1. No Supabase, crie um bucket **público** chamado `oracoes` (Storage → New bucket → marcar "Public").
2. Suba os arquivos `.mp3` com nomes: `{id}-ele.mp3` e `{id}-ela.mp3` (ids em `data/oracoes.json` e, pro terço, `{conjunto}-{indice}-ele.mp3` ex.: `dolorosos-0-ele.mp3` pro 1º mistério doloroso).
3. Copie a URL pública de cada arquivo (Supabase mostra em "Get URL" ao clicar no arquivo) e cole no campo `audio_ele`/`audio_ela` correspondente em `data/oracoes.json` ou `data/misterios.json`.
4. Se não tiver áudio ainda, deixe o campo como `null` — a página mostra "áudio em breve" automaticamente, sem quebrar.

## Deploy
1. Settings → Pages → Source: branch `main`, pasta `/ (root)`.
2. (Recomendado) Settings → Pages → Custom domain → apontar um domínio seu.
3. O arquivo `.nojekyll` na raiz evita que o GitHub processe o site como Jekyll.

## Pendências de conteúdo
- `data/santos.json` só tem agosto, e só com celebrações confirmadas no
  Calendário Romano Geral. Precisa validar e completar o ano inteiro.
- Páginas individuais por novena (`/novenas/assuncao` etc.) e por título
  mariano (`/titulos/aparecida` etc.) ainda não foram criadas — as páginas
  de listagem atuais mostram tudo numa página só.
- Supabase: schema em `supabase/schema.sql`, ainda não conectado no front.
