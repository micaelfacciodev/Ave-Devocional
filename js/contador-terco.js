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
 * ESTIMATIVA VISUAL das posições — não é pixel-perfeito.
 * Pra calibrar de verdade: abra /terco/calibrar.html, clique nas 72 contas
 * na ordem da oração, copie o JSON gerado e substitua o array ANCORAS abaixo
 * (pode colar as 72 direto em vez de âncoras, ajustando gerarGeometria).
 * Formato de cada âncora: [x%, y%] relativo à foto (0-100).
 */
const ANCORAS = [
  [18, 92], [34, 85], [50, 74], [72, 72], [93, 66],
  [94, 42], [85, 20], [60, 5], [33, 4], [12, 15],
  [4, 40], [10, 60], [30, 58], [55, 50], [78, 48], [88, 56],
];

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  const x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
  const y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
  return [x, y];
}

function interpolarAncoras(ancoras, totalPontos) {
  const pts = [ancoras[0], ...ancoras, ancoras[ancoras.length - 1]];
  const segmentos = ancoras.length - 1;
  const resultado = [];
  for (let i = 0; i < totalPontos; i++) {
    const g = (i / (totalPontos - 1)) * segmentos;
    const seg = Math.min(Math.floor(g), segmentos - 1);
    const t = g - seg;
    const p0 = pts[seg], p1 = pts[seg + 1], p2 = pts[seg + 2], p3 = pts[seg + 3];
    resultado.push(catmullRom(p0, p1, p2, p3, t));
  }
  return resultado;
}

/**
 * Se você já calibrou (via /terco/calibrar.html), cole aqui o array de
 * 72 pares [x,y] copiado da ferramenta, e troque a chamada abaixo:
 * const pontos = COORDENADAS_CALIBRADAS;  em vez de interpolarAncoras(...)
 */
function gerarGeometria() {
  const pontos = interpolarAncoras(ANCORAS, 72);
  return pontos.map(([xPct, yPct], i) => {
    let tipo = 'pequena';
    if (i === 0) tipo = 'crucifixo';
    else if (i === 6) tipo = 'medalha';
    else {
      const posLoop = (i - 7) % 13;
      if (posLoop === 0 || posLoop === 1 || posLoop === 12) tipo = 'grande';
    }
    return { xPct, yPct, tipo };
  });
}

export function montarContadorTerco(container, conjunto) {
  const sequencia = construirSequencia(conjunto);
  const geometria = gerarGeometria();
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
        <svg class="rosario-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"></svg>
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

  function contaGlobalAtual() {
    if (passoAtual >= sequencia.length - 2) return totalContas;
    return offsets[passoAtual] + avesFeitas;
  }

  function renderOverlay() {
    const atual = contaGlobalAtual();
    overlay.innerHTML = geometria.map((b, i) => {
      const feito = i < atual;
      const ehAtual = i === atual;
      const raio = b.tipo === 'crucifixo' ? 4.2 : b.tipo === 'medalha' ? 3.6 : b.tipo === 'grande' ? 2.6 : 2;
      const classe = `bead-fx ${feito ? 'feita' : ''} ${ehAtual ? 'atual' : ''}`;
      const glow = ehAtual ? `<circle class="bead-fx-glow" cx="${b.xPct}" cy="${b.yPct}" r="${raio + 2}"/>` : '';
      return `${glow}<circle class="${classe}" cx="${b.xPct}" cy="${b.yPct}" r="${raio}"/>`;
    }).join('');
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
