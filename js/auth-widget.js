import { getUsuarioAtual, onAuthChange, entrarComLinkMagico, sair } from './supabase-client.js';

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
          <p class="auth-widget__aviso">Entre com seu e-mail pra favoritar orações e acompanhar sua sequência de dias rezados.</p>
          <input type="email" class="auth-widget__input" placeholder="seu@email.com" />
          <button class="auth-widget__enviar" type="button">Enviar link de acesso</button>
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
  const input = container.querySelector('.auth-widget__input');
  const btnEnviar = container.querySelector('.auth-widget__enviar');
  const btnSair = container.querySelector('.auth-widget__sair');
  const status = container.querySelector('.auth-widget__status');

  toggle.addEventListener('click', () => {
    painel.hidden = !painel.hidden;
  });

  btnEnviar.addEventListener('click', async () => {
    const email = input.value.trim();
    if (!email) return;
    status.textContent = 'Enviando...';
    try {
      await entrarComLinkMagico(email);
      status.textContent = 'Link enviado! Confira seu e-mail.';
    } catch (e) {
      status.textContent = 'Erro ao enviar. Tente de novo.';
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
