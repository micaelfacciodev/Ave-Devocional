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

## Importante: caminhos absolutos
Os links de navegação e os `fetch()` usam caminhos absolutos (`/data/...`, `/css/style.css`).
Isso funciona perfeitamente com um **domínio próprio** apontado pro GitHub Pages
(Settings → Pages → Custom domain).

Se for publicar em `usuario.github.io/Ave-Devocional/` (sem domínio próprio),
os caminhos absolutos vão quebrar, porque o site fica numa subpasta.
Nesse caso, ou adiciona um domínio próprio, ou troca os caminhos absolutos
por relativos antes de publicar.

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
