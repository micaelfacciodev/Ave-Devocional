import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ---------- Auth ----------

export async function getUsuarioAtual() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

export function onAuthChange(callback) {
  supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
}

/** Envia link mágico de login por e-mail (sem senha) — mantido como alternativa */
export async function entrarComLinkMagico(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href }
  });
  if (error) throw error;
}

/** Login com Google — um clique, sem digitar nada */
export async function entrarComGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href }
  });
  if (error) throw error;
}

export async function sair() {
  await supabase.auth.signOut();
}

// ---------- Favoritos ----------

export async function alternarFavorito(tipo, itemId) {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error('Precisa estar logado pra favoritar.');

  const { data: existente } = await supabase
    .from('favoritos')
    .select('id')
    .eq('user_id', usuario.id)
    .eq('tipo', tipo)
    .eq('item_id', itemId)
    .maybeSingle();

  if (existente) {
    await supabase.from('favoritos').delete().eq('id', existente.id);
    return false; // não é mais favorito
  } else {
    await supabase.from('favoritos').insert({ user_id: usuario.id, tipo, item_id: itemId });
    return true; // agora é favorito
  }
}

export async function ehFavorito(tipo, itemId) {
  const usuario = await getUsuarioAtual();
  if (!usuario) return false;
  const { data } = await supabase
    .from('favoritos')
    .select('id')
    .eq('user_id', usuario.id)
    .eq('tipo', tipo)
    .eq('item_id', itemId)
    .maybeSingle();
  return !!data;
}

// ---------- Streak de oração ----------

/** Marca que o usuário rezou hoje; incrementa a sequência se o último dia foi ontem. */
export async function marcarOracaoDeHoje() {
  const usuario = await getUsuarioAtual();
  if (!usuario) throw new Error('Precisa estar logado.');

  const hoje = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const { data: atual } = await supabase
    .from('streak_oracao')
    .select('*')
    .eq('user_id', usuario.id)
    .maybeSingle();

  if (atual?.ultimo_dia_rezado === hoje) {
    return atual.dias_seguidos; // já registrado hoje
  }

  const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const seguidos = atual?.ultimo_dia_rezado === ontem ? (atual.dias_seguidos + 1) : 1;

  await supabase.from('streak_oracao').upsert({
    user_id: usuario.id,
    ultimo_dia_rezado: hoje,
    dias_seguidos: seguidos,
    atualizado_em: new Date().toISOString()
  });

  return seguidos;
}

export async function getStreakAtual() {
  const usuario = await getUsuarioAtual();
  if (!usuario) return null;
  const { data } = await supabase
    .from('streak_oracao')
    .select('*')
    .eq('user_id', usuario.id)
    .maybeSingle();
  return data;
}

// ---------- Newsletter ----------

export async function assinarNewsletter(email) {
  const { error } = await supabase.from('newsletter_assinantes').insert({ email });
  if (error) throw error;
}
