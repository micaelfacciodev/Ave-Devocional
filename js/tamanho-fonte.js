const CHAVE = 'ave-tamanho-fonte';
const TAMANHOS = [
  { id: 'normal', label: 'A', titulo: 'Tamanho normal' },
  { id: 'medio', label: 'A+', titulo: 'Tamanho médio' },
  { id: 'grande', label: 'A++', titulo: 'Tamanho grande' },
];

function aplicar(tamanhoId) {
  document.documentElement.classList.remove('fonte-medio', 'fonte-grande');
  if (tamanhoId === 'medio') document.documentElement.classList.add('fonte-medio');
  if (tamanhoId === 'grande') document.documentElement.classList.add('fonte-grande');
}

export function montarTamanhoFonte(container) {
  const salvo = localStorage.getItem(CHAVE) || 'normal';

  container.innerHTML = `
    <div class="tamanho-fonte" role="group" aria-label="Tamanho do texto">
      ${TAMANHOS.map(t => `
        <button type="button" class="tamanho-fonte__btn ${t.id === salvo ? 'ativo' : ''}" data-id="${t.id}" title="${t.titulo}" aria-label="${t.titulo}">${t.label}</button>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('.tamanho-fonte__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      localStorage.setItem(CHAVE, id);
      aplicar(id);
      container.querySelectorAll('.tamanho-fonte__btn').forEach(b => b.classList.toggle('ativo', b === btn));
    });
  });
}
