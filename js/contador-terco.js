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
 * Gera as posições geométricas de um rosário no formato "pousado à mão":
 * uma alça em espiral solta (não um círculo perfeito) de 65 contas, uma
 * medalha marcando a junção, e uma cauda curvada terminando no crucifixo.
 * Inspirado em fotos reais de terço deixado sobre a mesa, enrolado.
 */
function gerarGeometriaRosario() {
  const beads = [];
  const cx = 220, cy = 230;

  // --- Alça em espiral: gira ~1.35 volta, do raio externo pro interno,
  //     com uma leve ondulação pra não parecer um círculo matemático.
  const totalLoop = 65;
  const anguloInicial = -100; // graus, ponto de partida (perto do topo)
  const voltas = 1.32;
  const anguloTotal = 360 * voltas;
  const rExterno = 195, rInterno = 88;

  for (let i = 0; i < totalLoop; i++) {
    const frac = i / (totalLoop - 1);
    const anguloDeg = anguloInicial + frac * anguloTotal;
    const rad = (anguloDeg * Math.PI) / 180;
    let r = rExterno - (rExterno - rInterno) * frac;
    r *= 1 + 0.035 * Math.sin(i * 0.9) + 0.02 * Math.cos(i * 0.31);
    const x = cx + r * Math.cos(rad);
    const y = cy + r * Math.sin(rad) * 0.92; // levemente achatado, mais natural
    const posNaDezena = i % 13; // 0=mistério,1=PaiNosso,2-11=aves,12=glória
    let tipo = 'pequena';
    if (posNaDezena === 0 || posNaDezena === 1 || posNaDezena === 12) tipo = 'grande';
    beads.push({ x, y, tipo });
  }

  // --- Cauda: começa onde a espiral termina, curva solta até o crucifixo.
  // Construída de "perto da alça" até o crucifixo, depois invertida pra
  // ficar na ordem real da oração (crucifixo é o primeiro passo).
  const pontaEspiral = beads[0];
  const controle = { x: pontaEspiral.x - 70, y: pontaEspiral.y + 95 };
  const pontaCauda = { x: pontaEspiral.x - 55, y: pontaEspiral.y + 250 };

  // ordem "perto da alça" → "crucifixo"
  const tiposPertoDaAlca = ['medalha', 'pequena', 'pequena', 'pequena', 'grande', 'media', 'crucifixo'];
  const caudaBeads = [];
  for (let i = 0; i < 7; i++) {
    const t = (i + 1) / 7;
    const x = (1 - t) * (1 - t) * pontaEspiral.x + 2 * (1 - t) * t * controle.x + t * t * pontaCauda.x;
    const y = (1 - t) * (1 - t) * pontaEspiral.y + 2 * (1 - t) * t * controle.y + t * t * pontaCauda.y;
    caudaBeads.push({ x, y, tipo: tiposPertoDaAlca[i] });
  }
  caudaBeads.reverse(); // agora: crucifixo, media(credo), grande(PN), 3x pequena(aves), medalha(glória)

  return [...caudaBeads, ...beads];
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
      <svg class="rosario-svg" viewBox="0 0 440 560" xmlns="http://www.w3.org/2000/svg"></svg>
      <p class="contador-terco__toque-aviso">👆 Toque em qualquer lugar da imagem pra avançar</p>
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
    let path = `<path d="M ${geometria.map(b => `${b.x},${b.y}`).join(' L ')}" fill="none" stroke="rgba(122,46,59,.15)" stroke-width="2.5"/>`;
    let circles = geometria.map((b, i) => {
      const feito = i < atual;
      const ehAtual = i === atual;
      const classe = `rosario-bead tipo-${b.tipo} ${feito ? 'feita' : ''} ${ehAtual ? 'atual' : ''}`;

      if (b.tipo === 'crucifixo') {
        return `<g class="${classe}" transform="translate(${b.x},${b.y})">
          <rect x="-4" y="-21" width="8" height="38" rx="2"/>
          <rect x="-14" y="-10" width="28" height="8" rx="2"/>
        </g>`;
      }
      if (b.tipo === 'medalha') {
        return `<ellipse class="${classe}" cx="${b.x}" cy="${b.y}" rx="15" ry="19"/>`;
      }
      const raio = b.tipo === 'grande' ? 16 : b.tipo === 'media' ? 13 : 11;
      return `<circle class="${classe}" cx="${b.x}" cy="${b.y}" r="${raio}"/>`;
    }).join('');
    svg.innerHTML = path + circles;
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
  svg.addEventListener('click', avancar);
  render();
}
