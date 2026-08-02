import { marcarOracaoDeHoje, getUsuarioAtual } from './supabase-client.js';

function construirSequencia(conjunto) {
  const seq = [
    { titulo: 'Sinal da Cruz', subtitulo: 'Em nome do Pai, do Filho e do Espírito Santo.' },
    { titulo: 'Credo', subtitulo: 'Creio em Deus Pai todo-poderoso...' },
    { titulo: 'Pai Nosso', subtitulo: '' },
    { titulo: '3 Ave Marias', subtitulo: 'pela Fé, Esperança e Caridade', avesTotal: 3 },
    { titulo: 'Glória ao Pai', subtitulo: '' },
  ];
  conjunto.misterios.forEach((m, i) => {
    seq.push({ titulo: m.titulo, subtitulo: m.contemplacao, mistero: true });
    seq.push({ titulo: 'Pai Nosso', subtitulo: `${i + 1}ª dezena` });
    seq.push({ titulo: '10 Ave Marias', subtitulo: m.titulo, avesTotal: 10 });
    seq.push({ titulo: 'Glória ao Pai', subtitulo: '' });
  });
  seq.push({ titulo: 'Salve Rainha', subtitulo: '' });
  seq.push({ titulo: 'Terço concluído 🙏', subtitulo: 'Que Nossa Senhora interceda por você hoje.', final: true });
  return seq;
}

/**
 * Mapeia cada um dos 72 "toques" da oração pro NOME da máscara real
 * (layer do PSD). Estrutura física de um terço de 59 contas: crucifixo →
 * 1 grande + 3 pequenas (intro) → medalha (Glória) → 5 dezenas de 11
 * contas (1 grande + 10 pequenas — sem conta própria pra Glória, ela
 * reaproveita a última Ave da dezena).
 */
function gerarSequenciaDeNomes() {
  const nomes = ['crucifixo', 'crucifixo', 'conta1', 'conta2', 'conta3', 'conta4', 'medalha'];
  let n = 5;
  for (let d = 0; d < 5; d++) {
    nomes.push(`conta${n}`);      // anúncio do mistério (reaproveita a conta do PN)
    nomes.push(`conta${n}`);      // Pai Nosso da dezena
    for (let a = 1; a <= 10; a++) nomes.push(`conta${n + a}`); // 10 Ave Marias
    nomes.push(`conta${n + 10}`); // Glória (reaproveita a última Ave)
    n += 11;
  }
  return nomes; // 72 nomes
}

export async function montarContadorTerco(container, conjunto) {
  const sequencia = construirSequencia(conjunto);
  const nomesContas = gerarSequenciaDeNomes();

  const resp = await fetch('../data/mascaras-posicoes.json');
  const posicoes = await resp.json();

  let passoAtual = 0;
  let avesFeitas = 0;

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
      <p class="contador-terco__toque-aviso">👆 Toque em qualquer lugar da imagem pra avançar</p>
      <p class="contador-terco__passo-num"></p>
      <h3 class="contador-terco__titulo"></h3>
      <p class="contador-terco__subtitulo"></p>
      <button class="btn btn-primary contador-terco__avancar" type="button"></button>
    </div>
  `;

  const caixa = container.querySelector('#rosarioFotoBox');
  const overlay = container.querySelector('.rosario-overlay');
  const passoNumEl = container.querySelector('.contador-terco__passo-num');
  const tituloEl = container.querySelector('.contador-terco__titulo');
  const subtituloEl = container.querySelector('.contador-terco__subtitulo');
  const btnAvancar = container.querySelector('.contador-terco__avancar');

  // monta os 72 divs de máscara uma vez só (reaproveita a mesma imagem de
  // máscara quando o nome se repete, ex.: crucifixo 2x, conta do meio 2x)
  overlay.innerHTML = nomesContas.map((nome, i) => {
    const p = posicoes[nome];
    if (!p) return '';
    return `<div class="bead-fx" data-i="${i}" style="left:${p.left}%; top:${p.top}%; width:${p.width}%; height:${p.height}%; -webkit-mask-image:url(../img/mascaras/${nome}.png); mask-image:url(../img/mascaras/${nome}.png);"></div>`;
  }).join('');
  const beadEls = overlay.querySelectorAll('.bead-fx');

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

  function render() {
    const passo = sequencia[passoAtual];
    passoNumEl.textContent = passo.final ? '' : `Conta ${Math.min(contaGlobalAtual() + 1, totalContas)} de ${totalContas}`;
    tituloEl.textContent = passo.titulo;
    subtituloEl.textContent = passo.subtitulo;
    btnAvancar.textContent = passo.avesTotal
      ? `Ave Maria (${avesFeitas}/${passo.avesTotal}) · tocar na imagem`
      : (passo.final ? 'Concluir' : 'Próxima · tocar na imagem');
    btnAvancar.hidden = false;
    renderOverlay();
  }

  async function avancar() {
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
      return;
    }
    passoAtual++;
    render();
  }

  btnAvancar.addEventListener('click', avancar);
  caixa.addEventListener('click', avancar);
  render();
}
