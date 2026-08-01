import { ehFavorito, alternarFavorito, getUsuarioAtual } from './supabase-client.js';

export async function montarBotaoFavorito(container, { tipo, itemId }) {
  container.innerHTML = `<button class="fav-btn" type="button" aria-label="Favoritar">♡</button>`;
  const btn = container.querySelector('.fav-btn');

  const favoritado = await ehFavorito(tipo, itemId);
  if (favoritado) {
    btn.textContent = '♥';
    btn.classList.add('ativo');
  }

  btn.addEventListener('click', async () => {
    const usuario = await getUsuarioAtual();
    if (!usuario) {
      alert('Entre com seu e-mail (canto superior direito) pra favoritar.');
      return;
    }
    try {
      const agora = await alternarFavorito(tipo, itemId);
      btn.textContent = agora ? '♥' : '♡';
      btn.classList.toggle('ativo', agora);
    } catch (e) {
      console.error(e);
    }
  });
}
