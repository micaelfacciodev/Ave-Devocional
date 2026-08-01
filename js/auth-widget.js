import { getUsuarioAtual, onAuthChange, entrarComGoogle, sair } from './supabase-client.js';

export function montarAuthWidget(container) {
  container.innerHTML = `
    <div class="auth-widget">
      <button class="auth-widget__toggle" type="button">Entrar</button>
      <div class="auth-widget__painel" hidden>
        <div class="auth-widget__logado" hidden>
          <p class="auth-widget__email"></p>
          <button class="auth-widget__sair" type="button">Sair</button>
        </div>
        <div class="auth-widget__form">
          <p class="auth-widget__aviso">Entre pra favoritar orações e acompanhar sua sequência de dias rezados.</p>
          <button class="auth-widget__google" type="button">
            <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.5 29.5 3.5 24 3.5 12.7 3.5 3.5 12.7 3.5 24S12.7 44.5 24 44.5 44.5 35.3 44.5 24c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 5.5 29.5 3.5 24 3.5c-7.7 0-14.4 4.3-17.7 11.2z"/><path fill="#4CAF50" d="M24 44.5c5.4 0 10.3-1.9 14.1-5.1l-6.5-5.5c-2 1.5-4.6 2.4-7.6 2.4-5.3 0-9.7-3.3-11.3-8.1l-6.6 5.1C9.6 40.2 16.3 44.5 24 44.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.8l6.5 5.5C40.4 36.5 44.5 30.8 44.5 24c0-1.2-.1-2.4-.4-3.5z"/></svg>
            Entrar com Google
          </button>
          <p class="auth-widget__status"></p>
        </div>
      </div>
    </div>
  `;

  const toggle = container.querySelector('.auth-widget__toggle');
  const painel = container.querySelector('.auth-widget__painel');
  const blocoLogado = container.querySelector('.auth-widget__logado');
  const blocoForm = container.querySelector('.auth-widget__form');
  const emailEl = container.querySelector('.auth-widget__email');
  const btnGoogle = container.querySelector('.auth-widget__google');
  const btnSair = container.querySelector('.auth-widget__sair');
  const status = container.querySelector('.auth-widget__status');

  toggle.addEventListener('click', () => {
    painel.hidden = !painel.hidden;
  });

  btnGoogle.addEventListener('click', async () => {
    status.textContent = 'Abrindo login do Google...';
    try {
      await entrarComGoogle();
    } catch (e) {
      status.textContent = 'Erro ao abrir login. Tente de novo.';
    }
  });

  btnSair.addEventListener('click', async () => {
    await sair();
  });

  function atualizarUI(usuario) {
    if (usuario) {
      toggle.textContent = '👤';
      blocoLogado.hidden = false;
      blocoForm.hidden = true;
      emailEl.textContent = usuario.email;
    } else {
      toggle.textContent = 'Entrar';
      blocoLogado.hidden = true;
      blocoForm.hidden = false;
    }
  }

  getUsuarioAtual().then(atualizarUI);
  onAuthChange(atualizarUI);
}
