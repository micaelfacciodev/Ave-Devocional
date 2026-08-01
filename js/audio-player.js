/**
 * Player de áudio customizado, com alternância entre duas vozes (ele/ela).
 * Uso:
 *   import { montarPlayer } from '../js/audio-player.js';
 *   montarPlayer(containerEl, { audio_ele: '...', audio_ela: '...' });
 *
 * Se ambos forem null/undefined, mostra estado "em breve" em vez de player quebrado.
 */

function formatarTempo(segundos) {
  if (!isFinite(segundos)) return '0:00';
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function montarPlayer(container, { audio_ele = null, audio_ela = null } = {}) {
  const temEle = !!audio_ele;
  const temEla = !!audio_ela;

  if (!temEle && !temEla) {
    container.innerHTML = `<div class="audio-player audio-player--em-breve">🎙️ Áudio guiado em breve</div>`;
    return;
  }

  const vozInicial = temEle ? 'ele' : 'ela';

  container.innerHTML = `
    <div class="audio-player">
      <button class="audio-player__play" type="button" aria-label="Reproduzir">▶</button>
      <div class="audio-player__body">
        <div class="audio-player__bar"><div class="audio-player__progress"></div></div>
        <div class="audio-player__time">
          <span class="audio-player__atual">0:00</span>
          <span class="audio-player__total">0:00</span>
        </div>
      </div>
      ${temEle && temEla ? `
        <div class="audio-player__vozes">
          <button class="audio-player__voz ${vozInicial === 'ele' ? 'ativa' : ''}" data-voz="ele" type="button">Ele</button>
          <button class="audio-player__voz ${vozInicial === 'ela' ? 'ativa' : ''}" data-voz="ela" type="button">Ela</button>
        </div>
      ` : ''}
    </div>
  `;

  const audioEl = new Audio(vozInicial === 'ele' ? audio_ele : audio_ela);
  const btnPlay = container.querySelector('.audio-player__play');
  const bar = container.querySelector('.audio-player__bar');
  const progress = container.querySelector('.audio-player__progress');
  const atualEl = container.querySelector('.audio-player__atual');
  const totalEl = container.querySelector('.audio-player__total');
  const botoesVoz = container.querySelectorAll('.audio-player__voz');

  let tocando = false;

  function play() {
    audioEl.play();
    tocando = true;
    btnPlay.textContent = '❚❚';
  }
  function pause() {
    audioEl.pause();
    tocando = false;
    btnPlay.textContent = '▶';
  }

  btnPlay.addEventListener('click', () => (tocando ? pause() : play()));

  audioEl.addEventListener('loadedmetadata', () => {
    totalEl.textContent = formatarTempo(audioEl.duration);
  });
  audioEl.addEventListener('timeupdate', () => {
    atualEl.textContent = formatarTempo(audioEl.currentTime);
    const pct = (audioEl.currentTime / audioEl.duration) * 100 || 0;
    progress.style.width = `${pct}%`;
  });
  audioEl.addEventListener('ended', () => pause());

  bar.addEventListener('click', (e) => {
    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioEl.currentTime = pct * (audioEl.duration || 0);
  });

  botoesVoz.forEach(btn => {
    btn.addEventListener('click', () => {
      const voz = btn.dataset.voz;
      const novaSrc = voz === 'ele' ? audio_ele : audio_ela;
      if (!novaSrc) return;
      const estavaTocando = tocando;
      audioEl.src = novaSrc;
      botoesVoz.forEach(b => b.classList.toggle('ativa', b === btn));
      if (estavaTocando) play();
    });
  });
}
