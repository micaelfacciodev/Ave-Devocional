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

export function montarContadorTerco(container, conjunto) {
  const sequencia = construirSequencia(conjunto);
  let passoAtual = 0;
  let avesFeitas = 0;

  container.innerHTML = `
    <div class="contador-terco">
      <div class="contador-terco__progresso">
        <div class="contador-terco__progresso-barra"></div>
      </div>
      <p class="contador-terco__passo-num"></p>
      <h3 class="contador-terco__titulo"></h3>
      <p class="contador-terco__subtitulo"></p>
      <div class="contador-terco__beads"></div>
      <button class="btn btn-primary contador-terco__avancar" type="button"></button>
    </div>
  `;

  const barra = container.querySelector('.contador-terco__progresso-barra');
  const passoNumEl = container.querySelector('.contador-terco__passo-num');
  const tituloEl = container.querySelector('.contador-terco__titulo');
  const subtituloEl = container.querySelector('.contador-terco__subtitulo');
  const beadsEl = container.querySelector('.contador-terco__beads');
  const btnAvancar = container.querySelector('.contador-terco__avancar');

  function render() {
    const passo = sequencia[passoAtual];
    barra.style.width = `${(passoAtual / (sequencia.length - 1)) * 100}%`;
    passoNumEl.textContent = passo.final ? '' : `Passo ${passoAtual + 1} de ${sequencia.length - 1}`;
    tituloEl.textContent = passo.titulo;
    subtituloEl.textContent = passo.subtitulo;
    tituloEl.style.fontStyle = passo.mistero ? 'normal' : 'normal';

    if (passo.avesTotal) {
      beadsEl.innerHTML = Array.from({ length: passo.avesTotal }, (_, i) =>
        `<span class="bead-dot ${i < avesFeitas ? 'feito' : ''}"></span>`
      ).join('');
      beadsEl.hidden = false;
      btnAvancar.textContent = `Ave Maria (${avesFeitas}/${passo.avesTotal})`;
    } else {
      beadsEl.hidden = true;
      btnAvancar.textContent = passo.final ? 'Concluir' : 'Próxima';
    }
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
