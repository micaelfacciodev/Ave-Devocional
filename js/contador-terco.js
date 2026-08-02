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
 * Coordenadas reais, extraídas das layers do PSD que você mandou
 * (posição central de cada conta, em % da foto). Nada de estimativa
 * visual aqui — veio direto do arquivo.
 */
const POSICOES = {
  crucifixo: [20.1, 85.82],
  medalha: [78.85, 72.92],
  conta1: [32.42, 69.5], conta2: [47.77, 73.38], conta3: [53.24, 78.2], conta4: [57.53, 83.35],
  conta5: [73.92, 85.55], conta6: [75.14, 60.98], conta7: [67.44, 58.13], conta8: [59.26, 55.9],
  conta9: [51.73, 53.4], conta10: [43.7, 51.65], conta11: [35.73, 49.23], conta12: [29.36, 45.77],
  conta13: [22.15, 43.0], conta14: [20.53, 37.25], conta15: [27.7, 33.52], conta16: [41.07, 36.9],
  conta17: [54.18, 43.08], conta18: [61.64, 45.9], conta19: [69.67, 48.2], conta20: [77.41, 50.68],
  conta21: [86.74, 50.05], conta22: [93.23, 45.65], conta23: [92.98, 40.02], conta24: [92.9, 34.5],
  conta25: [89.7, 29.75], conta26: [85.95, 25.2], conta27: [79.29, 16.55], conta28: [69.38, 9.47],
  conta29: [62.61, 6.75], conta30: [55.84, 4.28], conta31: [48.02, 3.5], conta32: [40.06, 3.17],
  conta33: [32.06, 3.75], conta34: [25.79, 7.25], conta35: [28.82, 12.0], conta36: [36.46, 13.43],
  conta37: [44.6, 14.07], conta38: [58.21, 17.0], conta39: [71.04, 23.2], conta40: [77.2, 26.62],
  conta41: [77.7, 32.35], conta42: [70.86, 36.05], conta43: [62.0, 35.9], conta44: [54.11, 34.1],
  conta45: [46.97, 31.65], conta46: [40.17, 28.8], conta47: [32.78, 26.4], conta48: [25.14, 24.4],
  conta49: [11.64, 25.07], conta50: [6.3, 33.67], conta51: [7.67, 38.57], conta52: [8.57, 43.9],
  conta53: [13.65, 48.33], conta54: [20.28, 51.8], conta55: [27.05, 55.02], conta56: [35.34, 56.85],
  conta57: [43.34, 59.23], conta58: [51.33, 61.88], conta59: [59.55, 63.98],
};

/**
 * Mapeia cada um dos 72 "toques" da oração pra uma conta FÍSICA real.
 * Estrutura real de um terço de 59 contas: crucifixo → 1 grande + 3 pequenas
 * (intro) → medalha (Glória) → 5 dezenas de 11 contas (1 grande + 10 pequenas,
 * sem conta própria pra Glória — ela é dita na transição, reaproveita a
 * última conta da dezena).
 */
function gerarGeometria() {
  const geo = [];
  geo.push({ ...pos('crucifixo'), tipo: 'crucifixo' }); // Sinal da Cruz
  geo.push({ ...pos('crucifixo'), tipo: 'crucifixo' }); // Credo
  geo.push({ ...pos('conta1'), tipo: 'grande' });        // Pai Nosso intro
  geo.push({ ...pos('conta2'), tipo: 'pequena' });
  geo.push({ ...pos('conta3'), tipo: 'pequena' });
  geo.push({ ...pos('conta4'), tipo: 'pequena' });
  geo.push({ ...pos('medalha'), tipo: 'medalha' });       // Glória intro

  let n = 5;
  for (let d = 0; d < 5; d++) {
    geo.push({ ...pos(`conta${n}`), tipo: 'grande' });    // anúncio do mistério (reaproveita a conta do PN)
    geo.push({ ...pos(`conta${n}`), tipo: 'grande' });    // Pai Nosso da dezena
    for (let a = 1; a <= 10; a++) {
      geo.push({ ...pos(`conta${n + a}`), tipo: 'pequena' }); // 10 Ave Marias
    }
    geo.push({ ...pos(`conta${n + 10}`), tipo: 'pequena' }); // Glória (reaproveita a última Ave)
    n += 11;
  }
  return geo;

  function pos(nome) {
    const [xPct, yPct] = POSICOES[nome];
    return { xPct, yPct };
  }
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
      const raio = b.tipo === 'crucifixo' ? 5.2 : b.tipo === 'medalha' ? 4.6 : b.tipo === 'grande' ? 3.4 : 2.8;
      const classe = `bead-fx ${feito ? 'feita' : ''} ${ehAtual ? 'atual' : ''}`;
      const glow = ehAtual ? `<circle class="bead-fx-glow" cx="${b.xPct}" cy="${b.yPct}" r="${raio + 1.5}"/>` : '';
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
