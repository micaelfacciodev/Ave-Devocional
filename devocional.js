/**
 * Camada de lógica do devocional diário.
 * Carrega os JSONs de /data e calcula o que mostrar "hoje".
 * Uso: import { getDevocionalDeHoje } from './devocional.js'
 */

const DATA_PATH = '/data';

async function carregarJSON(nome) {
  const resp = await fetch(`${DATA_PATH}/${nome}.json`);
  if (!resp.ok) throw new Error(`Falha ao carregar ${nome}.json`);
  return resp.json();
}

/**
 * Retorna o conjunto de mistérios do dia (gozosos/dolorosos/gloriosos/luminosos)
 * com base no dia da semana da data informada (ou hoje).
 */
function getMisterioDoDia(misteriosData, data = new Date()) {
  const diaSemana = String(data.getDay()); // 0=domingo ... 6=sábado
  const chave = misteriosData.regra_dia_semana[diaSemana];
  return {
    chave,
    ...misteriosData.conjuntos[chave]
  };
}

/**
 * Verifica se há uma novena ativa na data informada.
 * Retorna null se nenhuma novena estiver em andamento.
 */
function getNovenaAtiva(novenasData, data = new Date()) {
  const ano = data.getFullYear();

  for (const novena of novenasData.novenas) {
    const dataFesta = new Date(ano, novena.festa.mes - 1, novena.festa.dia);
    const inicioNovena = new Date(dataFesta);
    inicioNovena.setDate(inicioNovena.getDate() - 9);

    // normaliza horas pra comparar só a data
    const hoje = new Date(data.getFullYear(), data.getMonth(), data.getDate());
    const inicio = new Date(inicioNovena.getFullYear(), inicioNovena.getMonth(), inicioNovena.getDate());
    const fim = new Date(dataFesta.getFullYear(), dataFesta.getMonth(), dataFesta.getDate());

    if (hoje >= inicio && hoje < fim) {
      const diaDaNovena = Math.floor((hoje - inicio) / (1000 * 60 * 60 * 24)) + 1; // 1 a 9
      return {
        ...novena,
        diaAtual: diaDaNovena,
        totalDias: 9,
        intencaoDoDia: novena.dias[diaDaNovena - 1],
        dataFesta
      };
    }
  }
  return null;
}

/**
 * Retorna a próxima festa mariana futura (pra mostrar contagem regressiva
 * quando não houver novena ativa).
 */
function getProximaFesta(novenasData, data = new Date()) {
  const hoje = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  const candidatas = novenasData.novenas.map(n => {
    let dataFesta = new Date(hoje.getFullYear(), n.festa.mes - 1, n.festa.dia);
    if (dataFesta < hoje) dataFesta = new Date(hoje.getFullYear() + 1, n.festa.mes - 1, n.festa.dia);
    const diasRestantes = Math.ceil((dataFesta - hoje) / (1000 * 60 * 60 * 24));
    return { ...n, dataFesta, diasRestantes };
  });
  candidatas.sort((a, b) => a.diasRestantes - b.diasRestantes);
  return candidatas[0];
}

/**
 * Busca o santo do dia pelo calendário. Retorna null se o dia
 * ainda não estiver preenchido em santos.json.
 */
function getSantoDoDia(santosData, data = new Date()) {
  const mm = String(data.getMonth() + 1).padStart(2, '0');
  const dd = String(data.getDate()).padStart(2, '0');
  const chave = `${mm}-${dd}`;
  return santosData.santos[chave] || null;
}

/**
 * Função principal: monta o pacote completo do "hoje" pra alimentar a home.
 */
async function getDevocionalDeHoje(data = new Date()) {
  const [misteriosData, novenasData, santosData] = await Promise.all([
    carregarJSON('misterios'),
    carregarJSON('novenas'),
    carregarJSON('santos')
  ]);

  const misterio = getMisterioDoDia(misteriosData, data);
  const novenaAtiva = getNovenaAtiva(novenasData, data);
  const proximaFesta = novenaAtiva ? null : getProximaFesta(novenasData, data);
  const santo = getSantoDoDia(santosData, data);

  return {
    data,
    misterio,
    novena: novenaAtiva,
    proximaFesta,
    santo
  };
}

export {
  getDevocionalDeHoje,
  getMisterioDoDia,
  getNovenaAtiva,
  getProximaFesta,
  getSantoDoDia
};
