-- Schema inicial pro Supabase do site devocional mariano.
-- Rodar no SQL editor do projeto Supabase depois de criar a conta.
-- Os JSONs de misterios/novenas/santos NÃO precisam ir pro banco:
-- ficam como arquivos estáticos no repo (mais rápido, sem custo de leitura).
-- O banco serve só pro que é específico de cada usuário.

-- Favoritos (orações, títulos marianos, santos que o usuário salvou)
create table if not exists favoritos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tipo text not null check (tipo in ('oracao', 'titulo_mariano', 'santo', 'novena')),
  item_id text not null,
  criado_em timestamptz default now(),
  unique (user_id, tipo, item_id)
);

alter table favoritos enable row level security;

drop policy if exists "usuário vê só os próprios favoritos" on favoritos;
create policy "usuário vê só os próprios favoritos"
  on favoritos for select
  using (auth.uid() = user_id);

drop policy if exists "usuário insere só os próprios favoritos" on favoritos;
create policy "usuário insere só os próprios favoritos"
  on favoritos for insert
  with check (auth.uid() = user_id);

drop policy if exists "usuário remove só os próprios favoritos" on favoritos;
create policy "usuário remove só os próprios favoritos"
  on favoritos for delete
  using (auth.uid() = user_id);


-- Sequência de dias rezados (streak), pra incentivar recorrência diária
create table if not exists streak_oracao (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ultimo_dia_rezado date,
  dias_seguidos integer default 0,
  atualizado_em timestamptz default now()
);

alter table streak_oracao enable row level security;

drop policy if exists "usuário vê só o próprio streak" on streak_oracao;
create policy "usuário vê só o próprio streak"
  on streak_oracao for select
  using (auth.uid() = user_id);

drop policy if exists "usuário atualiza só o próprio streak" on streak_oracao;
create policy "usuário atualiza só o próprio streak"
  on streak_oracao for update
  using (auth.uid() = user_id);

drop policy if exists "usuário cria só o próprio streak" on streak_oracao;
create policy "usuário cria só o próprio streak"
  on streak_oracao for insert
  with check (auth.uid() = user_id);


-- Newsletter (não precisa de auth — captura de e-mail simples)
create table if not exists newsletter_assinantes (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  criado_em timestamptz default now(),
  ativo boolean default true
);

alter table newsletter_assinantes enable row level security;

drop policy if exists "qualquer um pode se inscrever" on newsletter_assinantes;
create policy "qualquer um pode se inscrever"
  on newsletter_assinantes for insert
  with check (true);
-- leitura fica bloqueada por padrão (sem policy de select) —
-- só acessível via service_role no backend/admin.


-- Storage: bucket 'oracoes' (crie manualmente em Storage → New bucket → Public,
-- se ainda não existir). As policies abaixo liberam upload só pra quem estiver
-- logado (qualquer conta Google autenticada) — o admin hub usa o mesmo login.
drop policy if exists "leitura publica do bucket oracoes" on storage.objects;
create policy "leitura publica do bucket oracoes"
  on storage.objects for select
  using (bucket_id = 'oracoes');

drop policy if exists "upload autenticado no bucket oracoes" on storage.objects;
create policy "upload autenticado no bucket oracoes"
  on storage.objects for insert
  with check (bucket_id = 'oracoes' and auth.role() = 'authenticated');

drop policy if exists "atualizacao autenticada no bucket oracoes" on storage.objects;
create policy "atualizacao autenticada no bucket oracoes"
  on storage.objects for update
  using (bucket_id = 'oracoes' and auth.role() = 'authenticated');
