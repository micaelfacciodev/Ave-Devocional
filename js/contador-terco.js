import { marcarOracaoDeHoje, getUsuarioAtual } from './supabase-client.js';

/**
 * 1 TOQUE = 1 CONTA FÍSICA, sempre. 61 elementos tocáveis (59 contas +
 * medalha + crucifixo): crucifixo(Sinal da Cruz+Credo) → Pai Nosso →
 * 3 Ave Marias → medalha(Glória) → 5 dezenas de 11 (Pai Nosso+mistério,
 * depois 10 Ave Marias).
 */
function construirSequencia(conjunto, oracoesPorId) {
  const texto = (id) => oracoesPorId[id]?.texto || '';
  const seq = [
    { titulo: 'Sinal da Cruz + Credo', oracaoTexto: texto('sinal-cruz-credo'), audioId: 'sinal-cruz-credo' },
    { titulo: 'Pai Nosso', oracaoTexto: texto('pai-nosso'), audioId: 'pai-nosso' },
    { titulo: '3 Ave Marias', subtitulo: 'pela Fé, Esperança e Caridade', oracaoTexto: texto('ave-maria'), audioId: 'ave-maria', avesTotal: 3 },
    { titulo: 'Glória ao Pai', subtitulo: 'Aqui começa a alça do terço.', oracaoTexto: texto('gloria'), audioId: 'gloria' },
  ];
  conjunto.misterios.forEach((m, i) => {
    seq.push({ titulo: `Pai Nosso, ${m.titulo}`, subtitulo: m.contemplacao, oracaoTexto: texto('pai-nosso'), audioMisterioIndex: i });
    seq.push({ titulo: '10 Ave Marias', subtitulo: m.titulo, oracaoTexto: texto('ave-maria'), audioId: 'ave-maria', avesTotal: 10 });
  });
  seq.push({ titulo: 'Salve Rainha', oracaoTexto: texto('salve-rainha'), audioId: 'salve-rainha' });
  seq.push({ titulo: 'Terço concluído 🙏', subtitulo: 'Que Nossa Senhora interceda por você hoje.', final: true });
  return seq;
}

function gerarSequenciaDeNomes() {
  const nomes = ['crucifixo', 'conta1', 'conta2', 'conta3', 'conta4', 'medalha'];
  let n = 5;
  for (let d = 0; d < 5; d++) {
    nomes.push(`conta${n}`);
    for (let a = 1; a <= 10; a++) nomes.push(`conta${n + a}`);
    n += 11;
  }
  return nomes; // 61 nomes
}

const MS_POR_PALAVRA = 480;    // ritmo mais pausado, contemplativo (usado quando não há áudio gravado)
const PAUSA_APOS_TEXTO = 1800; // respiro antes de avançar sozinho (sem áudio)

export async function montarContadorTerco(container, conjunto) {
  const [respMascaras, respOracoes] = await Promise.all([
    fetch('../data/mascaras-posicoes.json'),
    fetch('../data/oracoes.json'),
  ]);
  const posicoes = await respMascaras.json();
  const oracoesData = await respOracoes.json();
  const oracoesPorId = {};
  oracoesData.oracoes.forEach(o => { oracoesPorId[o.id] = o; });

  const sequencia = construirSequencia(conjunto, oracoesPorId);
  const nomesContas = gerarSequenciaDeNomes();

  let passoAtual = 0;
  let avesFeitas = 0;
  let autoPlayAtivo = true;
  let comecou = false;
  let vozAtual = 'ele';
  let timerAuto = null;
  let intervalDigitando = null;

  const offsets = [];
  let acc = 0;
  for (let i = 0; i < sequencia.length - 2; i++) {
    offsets[i] = acc;
    acc += sequencia[i].avesTotal || 1;
  }
  const totalContas = acc;

  container.innerHTML = `
    <div class="contador-terco">
      <div class="rosario-foto-box" id="rosarioFotoBox">
        <img src="../img/rosario.webp" class="rosario-foto" alt="Rosário" draggable="false" />
        <div class="rosario-overlay"></div>
      </div>
      <p class="contador-terco__toque-aviso">👆 Toque pra começar. Depois é só acompanhar</p>
      <div class="contador-terco__cabecalho">
        <p class="contador-terco__passo-num"></p>
        <div class="contador-terco__vozes">
          <button class="contador-terco__voz ativa" data-voz="ele" type="button">🙋‍♂️ Ele</button>
          <button class="contador-terco__voz" data-voz="ela" type="button">🙋‍♀️ Ela</button>
        </div>
        <button class="contador-terco__pausar" type="button">⏸ Pausar</button>
      </div>
      <h3 class="contador-terco__titulo"></h3>
      <p class="contador-terco__subtitulo"></p>
      <div class="contador-terco__oracao-box"><p class="contador-terco__oracao"></p></div>
      <button class="btn btn-primary contador-terco__avancar" type="button">Toque pra começar</button>
    </div>
  `;

  const caixa = container.querySelector('#rosarioFotoBox');
  const overlay = container.querySelector('.rosario-overlay');
  const passoNumEl = container.querySelector('.contador-terco__passo-num');
  const tituloEl = container.querySelector('.contador-terco__titulo');
  const subtituloEl = container.querySelector('.contador-terco__subtitulo');
  const oracaoBox = container.querySelector('.contador-terco__oracao-box');
  const oracaoEl = container.querySelector('.contador-terco__oracao');
  const btnAvancar = container.querySelector('.contador-terco__avancar');
  const btnPausar = container.querySelector('.contador-terco__pausar');
  const botoesVoz = container.querySelectorAll('.contador-terco__voz');

  const audioEl = new Audio();
  audioEl.preload = 'auto';
  audioEl.addEventListener('ended', () => {
    if (autoPlayAtivo && comecou && !sequencia[passoAtual].final) avancar();
  });

  overlay.innerHTML = nomesContas.map((nome, i) => {
    const p = posicoes[nome];
    if (!p) return '';
    return `<div class="bead-fx" data-i="${i}" style="left:${p.left}%; top:${p.top}%; width:${p.width}%; height:${p.height}%; -webkit-mask-image:url(../img/mascaras/${nome}.png); mask-image:url(../img/mascaras/${nome}.png);"></div>`;
  }).join('');
  const beadEls = overlay.querySelectorAll('.bead-fx');

  function getAudioSrc(passo) {
    const campo = vozAtual === 'ele' ? 'audio_ele' : 'audio_ela';
    if (passo.audioMisterioIndex !== undefined) {
      return conjunto.misterios[passo.audioMisterioIndex]?.[campo] || null;
    }
    if (passo.audioId) {
      return oracoesPorId[passo.audioId]?.[campo] || null;
    }
    return null;
  }

  function contaGlobalAtual() {
    if (passoAtual >= sequencia.length - 2) return totalContas;
    return offsets[passoAtual] + avesFeitas;
  }

  function renderOverlay() {
    const atual = contaGlobalAtual();
    beadEls.forEach((el, i) => {
      el.classList.toggle('feita', i < atual);
      el.classList.toggle('atual', i === atual);
    });
  }

  function pararTudo() {
    if (timerAuto) { clearTimeout(timerAuto); timerAuto = null; }
    if (intervalDigitando) { clearInterval(intervalDigitando); intervalDigitando = null; }
    audioEl.pause();
  }

  // texto "sumindo": caixa de altura fixa, rola internamente (tipo teleprompter)
  // em vez de crescer e empurrar o resto da página pra cima.
  function digitar(texto, aoTerminar) {
    oracaoEl.textContent = '';
    oracaoEl.classList.add('digitando');
    if (!texto) { oracaoEl.classList.remove('digitando'); if (aoTerminar) aoTerminar(); return; }
    const palavras = texto.split(' ');
    let i = 0;
    intervalDigitando = setInterval(() => {
      if (i >= palavras.length) {
        clearInterval(intervalDigitando);
        intervalDigitando = null;
        oracaoEl.classList.remove('digitando');
        if (aoTerminar) aoTerminar();
        return;
      }
      oracaoEl.textContent += (i === 0 ? '' : ' ') + palavras[i];
      oracaoBox.scrollTop = oracaoBox.scrollHeight; // rola pra baixo, caixa não cresce
      i++;
    }, MS_POR_PALAVRA);
  }

  function render() {
    pararTudo();
    const passo = sequencia[passoAtual];
    passoNumEl.textContent = passo.final ? '' : `Conta ${Math.min(contaGlobalAtual() + 1, totalContas)} de ${totalContas}`;
    tituloEl.textContent = passo.titulo;
    subtituloEl.textContent = passo.subtitulo || '';
    if (comecou) {
      btnAvancar.textContent = passo.avesTotal
        ? `Ave Maria (${avesFeitas}/${passo.avesTotal}) · tocar pra adiantar`
        : (passo.final ? 'Concluir' : 'Tocar pra adiantar');
    }
    renderOverlay();

    const audioSrc = getAudioSrc(passo);

    digitar(passo.oracaoTexto, () => {
      // só agenda avanço pelo tempo de leitura quando NÃO tem áudio.
      // Com áudio, quem manda avançar é o fim da gravação (evento 'ended').
      if (autoPlayAtivo && !passo.final && !audioSrc) {
        timerAuto = setTimeout(avancar, PAUSA_APOS_TEXTO);
      }
    });

    if (audioSrc) {
      audioEl.src = audioSrc;
      audioEl.currentTime = 0;
      audioEl.play().catch(() => { /* autoplay pode ser bloqueado até 1º toque do usuário */ });
    }
  }

  async function avancar() {
    pararTudo();

    if (!comecou) {
      comecou = true;
      render(); // primeiro toque só começa o passo atual, não avança
      return;
    }

    const passo = sequencia[passoAtual];
    if (passo.avesTotal) {
      avesFeitas++;
      if (avesFeitas < passo.avesTotal) { render(); return; }
      avesFeitas = 0;
    }
    if (passo.final) {
      const usuario = await getUsuarioAtual();
      if (usuario) {
        try {
          const dias = await marcarOracaoDeHoje();
          subtituloEl.textContent = `Que Nossa Senhora interceda por você hoje. 🔥 ${dias} dia(s) seguidos.`;
        } catch (e) { /* silencioso */ }
      }
      btnAvancar.hidden = true;
      btnPausar.hidden = true;
      return;
    }
    passoAtual++;
    render();
  }

  btnAvancar.addEventListener('click', avancar);
  caixa.addEventListener('click', avancar);

  botoesVoz.forEach(btn => {
    btn.addEventListener('click', () => {
      vozAtual = btn.dataset.voz;
      botoesVoz.forEach(b => b.classList.toggle('ativa', b === btn));
      if (comecou) render(); // troca a voz e já reinicia o passo atual com o novo áudio
    });
  });

  btnPausar.addEventListener('click', () => {
    autoPlayAtivo = !autoPlayAtivo;
    btnPausar.textContent = autoPlayAtivo ? '⏸ Pausar' : '▶ Continuar sozinho';
    if (!autoPlayAtivo) {
      if (timerAuto) { clearTimeout(timerAuto); timerAuto = null; }
      audioEl.pause();
    } else if (comecou && !sequencia[passoAtual].final) {
      const audioSrc = getAudioSrc(sequencia[passoAtual]);
      if (audioSrc && audioEl.src && !audioEl.ended) {
        audioEl.play().catch(() => {});
      } else if (!audioSrc && !intervalDigitando) {
        timerAuto = setTimeout(avancar, PAUSA_APOS_TEXTO);
      }
    }
  });

  // estado inicial: mostra o crucifixo e o título do primeiro passo,
  // mas NÃO começa a digitar/avançar/tocar áudio até o primeiro toque.
  renderOverlay();
  passoNumEl.textContent = `Conta 1 de ${totalContas}`;
  tituloEl.textContent = sequencia[0].titulo;
  subtituloEl.textContent = sequencia[0].subtitulo || '';
}
