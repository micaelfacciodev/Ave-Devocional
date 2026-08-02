import { marcarOracaoDeHoje, getUsuarioAtual } from './supabase-client.js';

const ORACOES_TEXTO = {
  sinalCruz: 'Em nome do Pai, e do Filho, e do Espírito Santo. Amém.',
  credo: 'Creio em Deus Pai todo-poderoso, criador do céu e da terra. E em Jesus Cristo, seu único filho, Nosso Senhor, que foi concebido pelo poder do Espírito Santo, nasceu da Virgem Maria, padeceu sob Pôncio Pilatos, foi crucificado, morto e sepultado, desceu à mansão dos mortos, ressuscitou ao terceiro dia, subiu aos céus, está sentado à direita de Deus Pai todo-poderoso, donde há de vir a julgar os vivos e os mortos. Creio no Espírito Santo, na Santa Igreja Católica, na comunhão dos santos, na remissão dos pecados, na ressurreição da carne, na vida eterna. Amém.',
  paiNosso: 'Pai nosso que estais nos Céus, santificado seja o Vosso nome; venha a nós o Vosso reino; seja feita a Vossa vontade, assim na terra como no Céu. O pão nosso de cada dia nos dai hoje; perdoai-nos as nossas ofensas, assim como nós perdoamos a quem nos tem ofendido; e não nos deixeis cair em tentação; mas livrai-nos do mal. Amém.',
  aveMaria: 'Ave Maria, cheia de graça, o Senhor é convosco, bendita sois vós entre as mulheres e bendito é o fruto do vosso ventre, Jesus. Santa Maria, Mãe de Deus, rogai por nós pecadores, agora e na hora de nossa morte. Amém.',
  gloria: 'Glória ao Pai, ao Filho e ao Espírito Santo. Como era no princípio, agora e sempre, e por todos os séculos dos séculos. Amém.',
  salveRainha: 'Salve, Rainha, Mãe de misericórdia, vida, doçura, esperança nossa, salve! A vós bradamos, os degredados filhos de Eva. A vós suspiramos, gemendo e chorando neste vale de lágrimas. Eia, pois, advogada nossa, esses vossos olhos misericordiosos a nós volvei. E depois deste desterro, mostrai-nos Jesus, bendito fruto do vosso ventre. Ó clemente, ó piedosa, ó doce sempre Virgem Maria.',
};

/**
 * 1 TOQUE = 1 CONTA FÍSICA, sempre. 61 elementos tocáveis (59 contas +
 * medalha + crucifixo): crucifixo(Sinal da Cruz+Credo) → Pai Nosso →
 * 3 Ave Marias → medalha(Glória) → 5 dezenas de 11 (Pai Nosso+mistério,
 * depois 10 Ave Marias).
 */
function construirSequencia(conjunto) {
  const seq = [
    { titulo: 'Sinal da Cruz + Credo', oracaoTexto: ORACOES_TEXTO.sinalCruz + ' ' + ORACOES_TEXTO.credo },
    { titulo: 'Pai Nosso', oracaoTexto: ORACOES_TEXTO.paiNosso },
    { titulo: '3 Ave Marias', subtitulo: 'pela Fé, Esperança e Caridade', oracaoTexto: ORACOES_TEXTO.aveMaria, avesTotal: 3 },
    { titulo: 'Glória ao Pai', subtitulo: 'Aqui começa a alça do terço.', oracaoTexto: ORACOES_TEXTO.gloria },
  ];
  conjunto.misterios.forEach((m, i) => {
    seq.push({ titulo: `Pai Nosso — ${m.titulo}`, subtitulo: m.contemplacao, oracaoTexto: ORACOES_TEXTO.paiNosso });
    seq.push({ titulo: '10 Ave Marias', subtitulo: m.titulo, oracaoTexto: ORACOES_TEXTO.aveMaria, avesTotal: 10 });
  });
  seq.push({ titulo: 'Salve Rainha', oracaoTexto: ORACOES_TEXTO.salveRainha });
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

const MS_POR_PALAVRA = 340;   // ritmo de leitura contemplativa
const PAUSA_APOS_TEXTO = 900; // respiro antes de avançar sozinho

export async function montarContadorTerco(container, conjunto) {
  const sequencia = construirSequencia(conjunto);
  const nomesContas = gerarSequenciaDeNomes();

  const resp = await fetch('../data/mascaras-posicoes.json');
  const posicoes = await resp.json();

  let passoAtual = 0;
  let avesFeitas = 0;
  let autoPlayAtivo = true;
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
      <p class="contador-terco__toque-aviso">👆 Toque a qualquer momento pra adiantar — ou deixe rodar sozinho</p>
      <div class="contador-terco__cabecalho">
        <p class="contador-terco__passo-num"></p>
        <button class="contador-terco__pausar" type="button">⏸ Pausar</button>
      </div>
      <h3 class="contador-terco__titulo"></h3>
      <p class="contador-terco__subtitulo"></p>
      <p class="contador-terco__oracao"></p>
      <button class="btn btn-primary contador-terco__avancar" type="button"></button>
    </div>
  `;

  const caixa = container.querySelector('#rosarioFotoBox');
  const overlay = container.querySelector('.rosario-overlay');
  const passoNumEl = container.querySelector('.contador-terco__passo-num');
  const tituloEl = container.querySelector('.contador-terco__titulo');
  const subtituloEl = container.querySelector('.contador-terco__subtitulo');
  const oracaoEl = container.querySelector('.contador-terco__oracao');
  const btnAvancar = container.querySelector('.contador-terco__avancar');
  const btnPausar = container.querySelector('.contador-terco__pausar');

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

  function pararTudo() {
    if (timerAuto) { clearTimeout(timerAuto); timerAuto = null; }
    if (intervalDigitando) { clearInterval(intervalDigitando); intervalDigitando = null; }
  }

  function digitar(texto, aoTerminar) {
    pararTudo();
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
      i++;
    }, MS_POR_PALAVRA);
  }

  function render() {
    const passo = sequencia[passoAtual];
    passoNumEl.textContent = passo.final ? '' : `Conta ${Math.min(contaGlobalAtual() + 1, totalContas)} de ${totalContas}`;
    tituloEl.textContent = passo.titulo;
    subtituloEl.textContent = passo.subtitulo || '';
    btnAvancar.textContent = passo.avesTotal
      ? `Ave Maria (${avesFeitas}/${passo.avesTotal}) · tocar pra adiantar`
      : (passo.final ? 'Concluir' : 'Tocar pra adiantar');
    btnAvancar.hidden = false;
    renderOverlay();

    digitar(passo.oracaoTexto, () => {
      if (autoPlayAtivo && !passo.final) {
        timerAuto = setTimeout(avancar, PAUSA_APOS_TEXTO);
      }
    });
  }

  async function avancar() {
    pararTudo();
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
  btnPausar.addEventListener('click', () => {
    autoPlayAtivo = !autoPlayAtivo;
    btnPausar.textContent = autoPlayAtivo ? '⏸ Pausar' : '▶ Continuar sozinho';
    if (autoPlayAtivo && !intervalDigitando && !sequencia[passoAtual].final) {
      timerAuto = setTimeout(avancar, PAUSA_APOS_TEXTO);
    } else if (!autoPlayAtivo && timerAuto) {
      clearTimeout(timerAuto);
      timerAuto = null;
    }
  });

  render();
}
