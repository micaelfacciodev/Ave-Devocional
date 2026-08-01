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
 * Gera as posições geométricas de um rosário: uma alça (loop) de 65 contas
 * (5 dezenas de 10 Ave Marias + 5 contas grandes do Pai Nosso/mistério)
 * e uma haste (cauda) de 7 contas terminando no crucifixo.
 * Retorna um array alinhado 1:1 com as contas "reais" da oração (índices 0..71).
 */
function gerarGeometriaRosario() {
  const beads = [];
  const cx = 200, cy = 195;

  // --- Cauda (7 contas): crucifixo → credo → Pai Nosso → 3 Aves → Glória
  const caudaY0 = 460, caudaY1 = 345;
  for (let i = 0; i < 7; i++) {
    const y = caudaY0 - (i / 6) * (caudaY0 - caudaY1);
    beads.push({ x: cx, y, tipo: i === 0 ? 'crucifixo' : (i === 2 || i === 6 ? 'grande' : (i === 1 ? 'media' : 'pequena')) });
  }

  // --- Alça (65 contas): 5 dezenas de [mistério(grande) + PaiNosso(grande) + 10 aves(pequenas) + glória(grande)]
  const rx = 150, ry = 145;
  const gapDeg = 26; // abertura na base onde a alça encontra a cauda
  const thetaStart = 180 + gapDeg / 2;
  const sweep = 360 - gapDeg;
  const totalLoop = 65;
  for (let i = 0; i < totalLoop; i++) {
    const theta = ((thetaStart + (i / (totalLoop - 1)) * sweep) * Math.PI) / 180;
    const x = cx + rx * Math.sin(theta);
    const y = cy - ry * Math.cos(theta);
    const posNaDezena = i % 13; // 0=mistério,1=PaiNosso,2-11=aves,12=glória
    let tipo = 'pequena';
    if (posNaDezena === 0 || posNaDezena === 1 || posNaDezena === 12) tipo = 'grande';
    beads.push({ x, y, tipo });
  }

  return beads;
}

export function montarContadorTerco(container, conjunto) {
  const sequencia = construirSequencia(conjunto);
  const geometria = gerarGeometriaRosario();
  let passoAtual = 0;
  let avesFeitas = 0;

  // offsets[i] = quantas contas físicas já foram percorridas ANTES do passo i
  const offsets = [];
  let acc = 0;
  for (let i = 0; i < sequencia.length - 2; i++) {
    offsets[i] = acc;
    acc += sequencia[i].avesTotal || 1;
  }
  const totalContas = acc; // 72

  container.innerHTML = `
    <div class="contador-terco">
      <svg class="rosario-svg" viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg"></svg>
      <p class="contador-terco__passo-num"></p>
      <h3 class="contador-terco__titulo"></h3>
      <p class="contador-terco__subtitulo"></p>
      <button class="btn btn-primary contador-terco__avancar" type="button"></button>
    </div>
  `;

  const svg = container.querySelector('.rosario-svg');
  const passoNumEl = container.querySelector('.contador-terco__passo-num');
  const tituloEl = container.querySelector('.contador-terco__titulo');
  const subtituloEl = container.querySelector('.contador-terco__subtitulo');
  const btnAvancar = container.querySelector('.contador-terco__avancar');

  function contaGlobalAtual() {
    if (passoAtual >= sequencia.length - 2) return totalContas;
    return offsets[passoAtual] + avesFeitas;
  }

  function renderSVG() {
    const atual = contaGlobalAtual();
    let path = `<path d="M ${geometria.map(b => `${b.x},${b.y}`).join(' L ')}" fill="none" stroke="rgba(224,190,85,.18)" stroke-width="1.5"/>`;
    let circles = geometria.map((b, i) => {
      const raio = b.tipo === 'crucifixo' ? 9 : b.tipo === 'grande' ? 6.5 : b.tipo === 'media' ? 5.5 : 4.2;
      const feito = i < atual;
      const ehAtual = i === atual;
      const classe = `rosario-bead ${feito ? 'feita' : ''} ${ehAtual ? 'atual' : ''} ${b.tipo === 'crucifixo' ? 'crucifixo' : ''}`;
      const clicavel = ehAtual ? `data-clicavel="1"` : '';
      if (b.tipo === 'crucifixo') {
        return `<g class="${classe}" ${clicavel} data-index="${i}" transform="translate(${b.x},${b.y})">
          <rect x="-2" y="-11" width="4" height="20" rx="1"/>
          <rect x="-8" y="-6" width="16" height="4" rx="1"/>
        </g>`;
      }
      return `<circle class="${classe}" ${clicavel} data-index="${i}" cx="${b.x}" cy="${b.y}" r="${raio}"/>`;
    }).join('');
    svg.innerHTML = path + circles;

    const beadAtualEl = svg.querySelector('[data-clicavel="1"]');
    if (beadAtualEl) {
      beadAtualEl.addEventListener('click', avancar);
    }
  }

  function render() {
    const passo = sequencia[passoAtual];
    passoNumEl.textContent = passo.final ? '' : `Conta ${Math.min(contaGlobalAtual() + 1, totalContas)} de ${totalContas}`;
    tituloEl.textContent = passo.titulo;
    subtituloEl.textContent = passo.subtitulo;

    if (passo.avesTotal) {
      btnAvancar.textContent = `Ave Maria (${avesFeitas}/${passo.avesTotal}) · tocar na conta`;
    } else {
      btnAvancar.textContent = passo.final ? 'Concluir' : 'Próxima · tocar na conta';
    }
    btnAvancar.hidden = false;

    renderSVG();
  }

  async function avancar() {
    const passo = sequencia[passoAtual];

    if (passo.avesTotal) {
      avesFeitas++;
      if (avesFeitas < passo.avesTotal) {
        render();
        return;
      }
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
  render();
}
