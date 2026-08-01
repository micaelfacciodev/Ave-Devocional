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
 * DUAS alças que se cruzam — uma grande por fora, uma menor por dentro
 * se sobrepondo — como um terço de verdade deixado enrolado sobre a mesa,
 * não uma espiral matemática única.
 */
function gerarGeometriaRosario() {
  const beads = [];

  // --- Alça externa (maior): ~40 contas, elipse grande
  const c1 = { x: 225, y: 175 };
  const rx1 = 175, ry1 = 145;
  const totalExterna = 40;
  const inicioExt = -96; // graus
  const sweepExt = 335;
  for (let i = 0; i < totalExterna; i++) {
    const frac = i / (totalExterna - 1);
    const deg = inicioExt + frac * sweepExt;
    const rad = (deg * Math.PI) / 180;
    const ondulacao = 1 + 0.03 * Math.sin(i * 1.1);
    const x = c1.x + rx1 * ondulacao * Math.cos(rad);
    const y = c1.y + ry1 * ondulacao * Math.sin(rad);
    beads.push({ x, y });
  }

  // --- Alça interna (menor): ~25 contas, elipse menor, deslocada pra
  //     se sobrepor à externa (o efeito de "cruzar por dentro")
  const c2 = { x: 178, y: 255 };
  const rx2 = 95, ry2 = 82;
  const totalInterna = 25;
  const inicioInt = -60;
  const sweepInt = 300;
  for (let i = 0; i < totalInterna; i++) {
    const frac = i / (totalInterna - 1);
    const deg = inicioInt + frac * sweepInt;
    const rad = (deg * Math.PI) / 180;
    const ondulacao = 1 + 0.04 * Math.sin(i * 1.3 + 2);
    const x = c2.x + rx2 * ondulacao * Math.cos(rad);
    const y = c2.y + ry2 * ondulacao * Math.sin(rad);
    beads.push({ x, y });
  }

  // marca os tipos (grande a cada 13ª conta = mistério/Pai Nosso/Glória)
  beads.forEach((b, i) => {
    const posNaDezena = i % 13;
    b.tipo = (posNaDezena === 0 || posNaDezena === 1 || posNaDezena === 12) ? 'grande' : 'pequena';
  });

  // --- Cauda: sai do fim da alça interna, curva solta até o crucifixo
  const pontaAlca = beads[beads.length - 1];
  const controle = { x: pontaAlca.x - 55, y: pontaAlca.y + 100 };
  const pontaCauda = { x: pontaAlca.x - 40, y: pontaAlca.y + 245 };

  const tiposPertoDaAlca = ['medalha', 'pequena', 'pequena', 'pequena', 'grande', 'media', 'crucifixo'];
  const caudaBeads = [];
  for (let i = 0; i < 7; i++) {
    const t = (i + 1) / 7;
    const x = (1 - t) * (1 - t) * pontaAlca.x + 2 * (1 - t) * t * controle.x + t * t * pontaCauda.x;
    const y = (1 - t) * (1 - t) * pontaAlca.y + 2 * (1 - t) * t * controle.y + t * t * pontaCauda.y;
    caudaBeads.push({ x, y, tipo: tiposPertoDaAlca[i] });
  }
  caudaBeads.reverse(); // crucifixo, media(credo), grande(PN), 3x pequena(aves), medalha(glória)

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
      <svg class="rosario-svg" viewBox="0 0 440 560" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="gradMadeira" cx="35%" cy="28%" r="75%">
            <stop offset="0%" stop-color="#d9b384"/>
            <stop offset="55%" stop-color="#8a5a34"/>
            <stop offset="100%" stop-color="#4f3018"/>
          </radialGradient>
          <radialGradient id="gradDourado" cx="35%" cy="28%" r="75%">
            <stop offset="0%" stop-color="#f7e6a8"/>
            <stop offset="50%" stop-color="#c9a227"/>
            <stop offset="100%" stop-color="#6e5210"/>
          </radialGradient>
          <radialGradient id="gradBronze" cx="35%" cy="25%" r="80%">
            <stop offset="0%" stop-color="#e2c98a"/>
            <stop offset="55%" stop-color="#8a6a2e"/>
            <stop offset="100%" stop-color="#3d2c10"/>
          </radialGradient>
        </defs>
        <g class="rosario-conteudo"></g>
      </svg>
      <p class="contador-terco__toque-aviso">👆 Toque em qualquer lugar da imagem pra avançar</p>
      <p class="contador-terco__passo-num"></p>
      <h3 class="contador-terco__titulo"></h3>
      <p class="contador-terco__subtitulo"></p>
      <button class="btn btn-primary contador-terco__avancar" type="button"></button>
    </div>
  `;

  const svg = container.querySelector('.rosario-svg');
  const grupoConteudo = container.querySelector('.rosario-conteudo');
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
    const cordao = `<path d="M ${geometria.map(b => `${b.x},${b.y}`).join(' L ')}" fill="none" stroke="#3d2818" stroke-width="2.5" opacity=".55"/>`;

    const gradientePorTipo = {
      pequena: 'url(#gradMadeira)',
      grande: 'url(#gradDourado)',
      media: 'url(#gradDourado)',
      medalha: 'url(#gradDourado)',
      crucifixo: 'url(#gradBronze)',
    };

    let contas = geometria.map((b, i) => {
      const feito = i < atual;
      const ehAtual = i === atual;
      const classe = `rosario-bead tipo-${b.tipo} ${feito ? 'feita' : ''} ${ehAtual ? 'atual' : ''}`;
      const fill = gradientePorTipo[b.tipo];

      let brilho = '';
      if (ehAtual) {
        brilho = `<circle class="rosario-glow" cx="${b.x}" cy="${b.y}" r="${b.tipo === 'crucifixo' ? 30 : 24}" fill="none" stroke="var(--gold-bright)" stroke-width="3" opacity=".6"/>`;
      }

      if (b.tipo === 'crucifixo') {
        return `${brilho}<g class="${classe}" transform="translate(${b.x},${b.y})">
          <rect x="-4.5" y="-22" width="9" height="40" rx="2.5" fill="${fill}"/>
          <rect x="-15" y="-11" width="30" height="9" rx="2.5" fill="${fill}"/>
        </g>`;
      }
      if (b.tipo === 'medalha') {
        return `${brilho}<ellipse class="${classe}" cx="${b.x}" cy="${b.y}" rx="16" ry="20" fill="${fill}"/>`;
      }
      const raio = b.tipo === 'grande' ? 17 : b.tipo === 'media' ? 14 : 11.5;
      return `${brilho}<circle class="${classe}" cx="${b.x}" cy="${b.y}" r="${raio}" fill="${fill}"/>`;
    }).join('');

    grupoConteudo.innerHTML = cordao + contas;
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
