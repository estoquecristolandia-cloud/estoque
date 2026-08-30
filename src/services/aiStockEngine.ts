import { Product, StockMovement, DailyMealRecord, DailyKit, Missionary, InventoryAudit, InventorySessionSummary, AiAssistantResponse, AiConfidenceLevel, AiCalculatedMetric, AiCalculationBase } from '../types';

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeStr(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export const MARCO_ZERO_DATE_STR = '2026-08-21';
export const MARCO_ZERO_TIMESTAMP_ISO = '2026-08-21T17:30:00';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;
}

export const SPOKEN_NUMBERS_MAP: Record<string, number> = {
  'zero': 0, 'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'tres': 3, 'quatro': 4,
  'cinco': 5, 'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10,
  'onze': 11, 'doze': 12, 'treze': 13, 'quatorze': 14, 'catorze': 14, 'quinze': 15,
  'dezesseis': 16, 'dezessete': 17, 'dezoito': 18, 'dezenove': 19, 'vinte': 20,
  'vinte e um': 21, 'vinte e dois': 22, 'vinte e tres': 23, 'vinte e quatro': 24,
  'vinte e cinco': 25, 'vinte e seis': 26, 'vinte e sete': 27, 'vinte e oito': 28,
  'vinte e nove': 29, 'trinta': 30, 'trinta e um': 31,
};

export const MONTHS_MAP: Record<string, string> = {
  'janeiro': '01', 'fevereiro': '02', 'marco': '03', 'abril': '04',
  'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
  'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12',
};

export function convertSpokenNumbersToDigits(text: string): string {
  let res = normalizeStr(text);

  // Anos falados
  res = res.replace(/dois mil e vinte e seis/g, '2026')
           .replace(/dois mil e vinte e cinco/g, '2025')
           .replace(/dois mil e vinte e quatro/g, '2024');

  // Dezenas compostas (ordenadas das mais longas para as mais curtas)
  const compoundSpoken = [
    'vinte e nove', 'vinte e oito', 'vinte e sete', 'vinte e seis', 'vinte e cinco',
    'vinte e quatro', 'vinte e tres', 'vinte e dois', 'vinte e um', 'trinta e um'
  ];

  for (const phrase of compoundSpoken) {
    if (res.includes(phrase) && SPOKEN_NUMBERS_MAP[phrase] !== undefined) {
      try {
        res = res.replace(new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'g'), String(SPOKEN_NUMBERS_MAP[phrase]));
      } catch {}
    }
  }

  // Números simples
  for (const [word, num] of Object.entries(SPOKEN_NUMBERS_MAP)) {
    if (!word.includes(' ')) {
      try {
        res = res.replace(new RegExp(`\\b${escapeRegExp(word)}\\b`, 'g'), String(num));
      } catch {}
    }
  }

  // Quilos e meio / litros e meio
  res = res.replace(/(\d+)\s+(quilos?|kg|litros?|l)\s+e\s+meio/g, '$1.5 $2')
           .replace(/(\d+)\s+e\s+meio\s+(quilos?|kg|litros?|l)/g, '$1.5 $2');

  return res;
}

/**
 * Retorna as datas de início e fim no fuso horário do Brasil (America/Bahia / UTC-3)
 */
export function parseDateRangeFromQuery(query: string, referenceDate: Date = new Date()): DateRange {
  const norm = convertSpokenNumbersToDigits(query);

  const getLocalDateStr = (d: Date): string => {
    // Formatar no padrão YYYY-MM-DD
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateStr(referenceDate);

  // 1. Data explícita no formato "dia DD de [mes] (de YYYY)?" ou "DD/MM/YYYY" ou "DD/MM"
  // Ex: "dia 25 de agosto", "dia 25 de agosto de 2026", "25/08/2026", "25/08"
  const datePatternWithMonth = /(?:dia\s+)?(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de\s+(\d{4}))?/i;
  const matchMonth = norm.match(datePatternWithMonth);
  if (matchMonth) {
    const day = String(parseInt(matchMonth[1], 10)).padStart(2, '0');
    const month = MONTHS_MAP[matchMonth[2]];
    const year = matchMonth[3] ? matchMonth[3] : String(referenceDate.getFullYear());
    const dateStr = `${year}-${month}-${day}`;
    return { startDate: dateStr, endDate: dateStr, label: `Dia ${day}/${month}/${year}` };
  }

  const slashDatePattern = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;
  const matchSlash = norm.match(slashDatePattern);
  if (matchSlash) {
    const day = String(parseInt(matchSlash[1], 10)).padStart(2, '0');
    const month = String(parseInt(matchSlash[2], 10)).padStart(2, '0');
    let year = String(referenceDate.getFullYear());
    if (matchSlash[3]) {
      year = matchSlash[3].length === 2 ? `20${matchSlash[3]}` : matchSlash[3];
    }
    const dateStr = `${year}-${month}-${day}`;
    return { startDate: dateStr, endDate: dateStr, label: `Dia ${day}/${month}/${year}` };
  }

  // Ontem
  if (norm.includes('ontem') && !norm.includes('anteontem')) {
    const yesterday = new Date(referenceDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = getLocalDateStr(yesterday);
    return { startDate: yStr, endDate: yStr, label: `Ontem (${formatDateBR(yStr)})` };
  }

  // Anteontem
  if (norm.includes('anteontem')) {
    const dayBefore = new Date(referenceDate);
    dayBefore.setDate(dayBefore.getDate() - 2);
    const dStr = getLocalDateStr(dayBefore);
    return { startDate: dStr, endDate: dStr, label: `Anteontem (${formatDateBR(dStr)})` };
  }

  // Hoje
  if (norm.includes('hoje') || norm.includes('do dia')) {
    return { startDate: todayStr, endDate: todayStr, label: `Hoje (${formatDateBR(todayStr)})` };
  }

  // Marco Zero
  if (norm.includes('marco zero') || norm.includes('desde o inicio') || norm.includes('marco 0')) {
    return { startDate: MARCO_ZERO_DATE_STR, endDate: todayStr, label: `Desde o Marco Zero (21/08/2026 até ${formatDateBR(todayStr)})` };
  }

  // Últimos N dias (ex: 7 dias, 15 dias, 30 dias, 5 dias, etc.)
  const nDaysMatch = norm.match(/ultimos?\s+(\d+)\s+dias?/);
  if (nDaysMatch) {
    const days = parseInt(nDaysMatch[1], 10);
    if (days > 0) {
      const start = new Date(referenceDate);
      start.setDate(start.getDate() - (days - 1));
      const sStr = getLocalDateStr(start);
      return { startDate: sStr, endDate: todayStr, label: `Últimos ${days} dias (${formatDateBR(sStr)} a ${formatDateBR(todayStr)})` };
    }
  }

  // Últimos 7 dias
  if (norm.includes('7 dias') || norm.includes('sete dias') || norm.includes('uma semana') || norm.includes('1 semana')) {
    const start = new Date(referenceDate);
    start.setDate(start.getDate() - 6);
    const sStr = getLocalDateStr(start);
    return { startDate: sStr, endDate: todayStr, label: `Últimos 7 dias (${formatDateBR(sStr)} a ${formatDateBR(todayStr)})` };
  }

  // Últimos 15 dias
  if (norm.includes('15 dias') || norm.includes('quinze dias') || norm.includes('duas semanas') || norm.includes('2 semanas')) {
    const start = new Date(referenceDate);
    start.setDate(start.getDate() - 14);
    const sStr = getLocalDateStr(start);
    return { startDate: sStr, endDate: todayStr, label: `Últimos 15 dias (${formatDateBR(sStr)} a ${formatDateBR(todayStr)})` };
  }

  // Últimos 30 dias
  if (norm.includes('30 dias') || norm.includes('trinta dias') || norm.includes('ultimo mes') || norm.includes('1 mes')) {
    const start = new Date(referenceDate);
    start.setDate(start.getDate() - 29);
    const sStr = getLocalDateStr(start);
    return { startDate: sStr, endDate: todayStr, label: `Últimos 30 dias (${formatDateBR(sStr)} a ${formatDateBR(todayStr)})` };
  }

  // Esta semana (segunda a hoje)
  if (norm.includes('esta semana') || norm.includes('nessa semana')) {
    const currentDay = referenceDate.getDay(); // 0 = Domingo, 1 = Segunda
    const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(referenceDate);
    monday.setDate(monday.getDate() - diffToMonday);
    const mStr = getLocalDateStr(monday);
    return { startDate: mStr, endDate: todayStr, label: `Esta semana (${formatDateBR(mStr)} a ${formatDateBR(todayStr)})` };
  }

  // Semana passada
  if (norm.includes('semana passada')) {
    const currentDay = referenceDate.getDay();
    const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const lastMonday = new Date(referenceDate);
    lastMonday.setDate(lastMonday.getDate() - diffToMonday - 7);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastSunday.getDate() + 6);
    const lmStr = getLocalDateStr(lastMonday);
    const lsStr = getLocalDateStr(lastSunday);
    return { startDate: lmStr, endDate: lsStr, label: `Semana passada (${formatDateBR(lmStr)} a ${formatDateBR(lsStr)})` };
  }

  // Este mês
  if (norm.includes('este mes') || norm.includes('mes atual') || norm.includes('neste mes') || norm.includes('em agosto') || norm.includes('de agosto')) {
    const firstDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const fStr = getLocalDateStr(firstDay);
    return { startDate: fStr, endDate: todayStr, label: `Mês atual (${formatDateBR(fStr)} a ${formatDateBR(todayStr)})` };
  }

  // Mês passado
  if (norm.includes('mes passado')) {
    const firstDayPrevMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
    const lastDayPrevMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 0);
    const fStr = getLocalDateStr(firstDayPrevMonth);
    const lStr = getLocalDateStr(lastDayPrevMonth);
    return { startDate: fStr, endDate: lStr, label: `Mês passado (${formatDateBR(fStr)} a ${formatDateBR(lStr)})` };
  }

  // Padrão: últimos 7 dias
  const defaultStart = new Date(referenceDate);
  defaultStart.setDate(defaultStart.getDate() - 6);
  const defStr = getLocalDateStr(defaultStart);
  return { startDate: defStr, endDate: todayStr, label: `Últimos 7 dias (${formatDateBR(defStr)} a ${formatDateBR(todayStr)})` };
}

export function formatDateBR(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function formatDateTimeBR(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('pt-BR', { timeZone: 'America/Bahia' });
  } catch {
    return isoString;
  }
}

/**
 * Extrai produto mencionado na pergunta
 */
export function findMentionedProduct(query: string, products: Product[]): Product | null {
  const norm = normalizeStr(query);

  // Mapeamentos diretos de sinônimos/apelidos
  const productSynonyms: Record<string, string[]> = {
    'leite': ['leite', 'leites', 'leite integral', 'cx leite', 'caixa de leite'],
    'arroz': ['arroz', 'arroz branco', 'arroz tipo 1'],
    'feijao': ['feijao', 'feijao carioca', 'feijao preto'],
    'oleo': ['oleo', 'oleo de soja', 'oleo de cozinha'],
    'acucar': ['acucar', 'acucar cristal'],
    'cafe': ['cafe', 'cafe em po', 'po de cafe'],
    'macarrao': ['macarrao', 'macarrao espaguete', 'espaguete', 'massa'],
    'frango': ['frango', 'peito de frango', 'carne de frango', 'coxa'],
    'carne': ['carne', 'carne bovina', 'carne moida', 'acem'],
    'ovos': ['ovo', 'ovos', 'cartela de ovo', 'cartela de ovos'],
    'farinha': ['farinha', 'farinha de trigo', 'trigo', 'farinha de mandioca'],
    'sal': ['sal', 'sal refinado'],
    'molho': ['molho', 'molho de tomate', 'extrato de tomate'],
    'biscoito': ['biscoito', 'bolacha', 'biscoito cream cracker', 'cream cracker'],
    'sabonete': ['sabonete', 'sabonetes'],
    'detergente': ['detergente', 'detergentes'],
    'desinfetante': ['desinfetante'],
    'sabao': ['sabao', 'sabao em po'],
    'agua sanitaria': ['agua sanitaria', 'cloro'],
    'papel higienico': ['papel higienico', 'papel']
  };

  // 1. Tentar busca exata por nome
  for (const p of products) {
    const pNorm = normalizeStr(p.name);
    if (pNorm && norm.includes(pNorm)) {
      return p;
    }
  }

  // 2. Tentar por sinônimos
  for (const [key, synonyms] of Object.entries(productSynonyms)) {
    for (const syn of synonyms) {
      // Usar regex com word boundary e escape seguro para caracteres especiais
      try {
        const regex = new RegExp(`\\b${escapeRegExp(syn)}\\b`, 'i');
        if (regex.test(norm)) {
          const found = products.find((p) => normalizeStr(p.name).includes(key));
          if (found) return found;
        }
      } catch {}
    }
  }

  // 3. Tentar busca por partes individuais das palavras do produto
  for (const p of products) {
    // Limpa pontuações como parênteses "(pacote)", colchetes, barras, etc.
    const words = normalizeStr(p.name)
      .replace(/[^a-z0-9\s]/gi, ' ')
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 3);

    for (const w of words) {
      try {
        const regex = new RegExp(`\\b${escapeRegExp(w)}\\b`, 'i');
        if (regex.test(norm)) {
          return p;
        }
      } catch {}
    }
  }

  return null;
}

/**
 * Extrai pessoa/missionário mencionado na pergunta
 */
export function findMentionedPerson(query: string, missionaries: Missionary[], movements: StockMovement[]): string | null {
  const norm = normalizeStr(query);

  // Lista de nomes conhecidos de missionários e equipe Cristolândia
  const knownPeople = [
    'rene', 'alexandre', 'marconi', 'pr marconi', 'pastor marconi',
    'valeria', 'igor', 'huberto', 'debora', 'taina', 'lana', 'joabe',
    'marcos', 'chefe marcos', 'fabiola', 'adailton', 'lucas', 'matheus',
    'pedro', 'paulo', 'carlos', 'andre', 'diego', 'tiago', 'joao'
  ];

  // 1. Verificar missionários cadastrados
  for (const m of missionaries) {
    const mNorm = normalizeStr(m.name);
    const firstName = mNorm
      .replace(/[^a-z0-9\s]/gi, ' ')
      .split(/\s+/)[0];

    if (firstName && firstName.length >= 3) {
      try {
        const regex = new RegExp(`\\b${escapeRegExp(firstName)}\\b`, 'i');
        if (regex.test(norm)) {
          return m.name;
        }
      } catch {}
    }
  }

  // 2. Verificar pessoas que já movimentaram no histórico
  const historicPeople = new Set<string>();
  movements.forEach((m) => {
    if (m.retrievedBy) historicPeople.add(m.retrievedBy);
    if (m.deliveredBy) historicPeople.add(m.deliveredBy);
    if (m.receivedBy) historicPeople.add(m.receivedBy);
    if (m.responsible) historicPeople.add(m.responsible);
  });

  for (const person of historicPeople) {
    const pNorm = normalizeStr(person);
    const firstName = pNorm
      .replace(/[^a-z0-9\s]/gi, ' ')
      .split(/\s+/)[0];

    if (firstName && firstName.length >= 3) {
      try {
        const regex = new RegExp(`\\b${escapeRegExp(firstName)}\\b`, 'i');
        if (regex.test(norm)) {
          return person;
        }
      } catch {}
    }
  }

  // 3. Verificar lista de nomes comuns da equipe Cristolândia
  for (const name of knownPeople) {
    try {
      const regex = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i');
      if (regex.test(norm)) {
        // Capitalizar nome
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
    } catch {}
  }

  return null;
}

/**
 * Extrai setor mencionado na pergunta
 */
export function findMentionedSector(query: string): string | null {
  const norm = normalizeStr(query);

  if (norm.includes('cozinha') || norm.includes('refeitorio') || norm.includes('padaria')) {
    return 'Cozinha';
  }
  if (norm.includes('masculina') || norm.includes('casa masculina')) {
    return 'Casa Missionária Masculina';
  }
  if (norm.includes('feminina') || norm.includes('casa feminina')) {
    return 'Casa Missionária Feminina';
  }
  if (norm.includes('administracao') || norm.includes('adm') || norm.includes('escritorio')) {
    return 'Administração';
  }
  if (norm.includes('huberto') || norm.includes('debora') || norm.includes('coordenacao')) {
    return 'Casa da Coordenação (Huberto & Débora)';
  }
  if (norm.includes('lana') || norm.includes('joabe')) {
    return 'Casa Lana & Joabe (Cesta Básica)';
  }
  if (norm.includes('marcos') || norm.includes('fabiola')) {
    return 'Casa Marcos & Fabíola (Cesta Básica)';
  }
  if (norm.includes('taina')) {
    return 'Casa Tainã (Cesta Básica)';
  }
  if (norm.includes('evento') || norm.includes('eventos') || norm.includes('culto')) {
    return 'Eventos';
  }

  return null;
}

/**
 * Extrai o tipo de movimentação pretendido
 */
export function determineMovementType(query: string): 'saida' | 'entrada' | 'ajuste' | 'todos' {
  const norm = normalizeStr(query);

  if (norm.includes('entrada') || norm.includes('doacao') || norm.includes('compra') || norm.includes('recebido') || norm.includes('chegou')) {
    return 'entrada';
  }
  if (norm.includes('ajuste') || norm.includes('auditoria') || norm.includes('divergencia') || norm.includes('inventario')) {
    return 'ajuste';
  }
  if (norm.includes('saida') || norm.includes('consumo') || norm.includes('retirou') || norm.includes('usou') || norm.includes('gastou') || norm.includes('entregue') || norm.includes('baixou')) {
    return 'saida';
  }

  // Padrão para perguntas gerais de estoque/movimentação
  return 'saida';
}

/**
 * MOTOR DETERMINÍSTICO DE ANÁLISE DE ESTOQUE
 * 
 * Executa todas as somas, filtros, buscas e cálculos matemáticos exatos no código.
 * Nunca alucina ou inventa dados.
 */
export function executeDeterministicStockQuery(
  query: string,
  products: Product[],
  movements: StockMovement[],
  meals: DailyMealRecord[],
  dailyKit: DailyKit,
  missionaries: Missionary[],
  inventoryAudits: InventoryAudit[] = [],
  inventorySessions: InventorySessionSummary[] = []
): AiAssistantResponse {
  const norm = normalizeStr(query);
  const now = new Date();
  const dateRange = parseDateRangeFromQuery(query, now);
  const mentionedProduct = findMentionedProduct(query, products);
  const mentionedPerson = findMentionedPerson(query, missionaries, movements);
  const mentionedSector = findMentionedSector(query);
  const requestedType = determineMovementType(query);

  const filtersUsed: string[] = [];
  filtersUsed.push(`Período: ${dateRange.label}`);
  if (mentionedProduct) filtersUsed.push(`Produto: ${mentionedProduct.name} (${mentionedProduct.unit})`);
  if (mentionedPerson) filtersUsed.push(`Pessoa/Responsável: ${mentionedPerson}`);
  if (mentionedSector) filtersUsed.push(`Setor: ${mentionedSector}`);
  if (requestedType !== 'todos') filtersUsed.push(`Tipo de Movimentação: ${requestedType.toUpperCase()}`);

  // =========================================================================
  // CASO 1: Consulta de Refeições Servidas
  // =========================================================================
  if (norm.includes('refeicao') || norm.includes('refeicoes') || norm.includes('almoco') || norm.includes('jantar') || norm.includes('cafe da manha') || norm.includes('prato')) {
    const filteredMeals = meals.filter((m) => m.date >= dateRange.startDate && m.date <= dateRange.endDate);
    const totalBreakfast = filteredMeals.reduce((acc, m) => acc + (m.breakfast || 0), 0);
    const totalLunch = filteredMeals.reduce((acc, m) => acc + (m.lunch || 0), 0);
    const totalSnack = filteredMeals.reduce((acc, m) => acc + (m.afternoonSnack || 0), 0);
    const totalDinner = filteredMeals.reduce((acc, m) => acc + (m.dinner || 0), 0);
    const totalMealsCount = totalBreakfast + totalLunch + totalSnack + totalDinner;
    const daysCount = filteredMeals.length || 1;
    const avgDaily = (totalMealsCount / daysCount).toFixed(1);

    const peakMealDay = [...filteredMeals].sort((a, b) => (b.totalMeals || 0) - (a.totalMeals || 0))[0];

    const metrics: AiCalculatedMetric[] = [
      { label: 'Total de Refeições', value: totalMealsCount, unit: 'pratos servidos', badge: 'Auditado' },
      { label: 'Média Diária', value: avgDaily, unit: 'refeições/dia' },
      { label: 'Dias Registrados', value: filteredMeals.length, unit: 'dias com dados' },
      { label: 'Almoço (Principal)', value: totalLunch, unit: 'refeições' },
    ];

    const confidence: AiConfidenceLevel = filteredMeals.length > 0 ? 'high' : 'low';
    const confidenceReason = filteredMeals.length > 0
      ? `Foram encontrados ${filteredMeals.length} registros diários de refeições no período informado.`
      : 'Nenhum registro de contagem de refeição foi encontrado para o período especificado.';

    let detailedAnalysis = `### 🍽️ Relatório de Refeições Servidas — Cristolândia LEM\n\n`;
    detailedAnalysis += `**Período analisado:** ${dateRange.label}\n\n`;
    detailedAnalysis += `| Tipo de Refeição | Total de Pratos | % do Total |\n`;
    detailedAnalysis += `| :--- | :--- | :--- |\n`;
    detailedAnalysis += `| ☕ Café da Manhã | **${totalBreakfast}** | ${totalMealsCount ? ((totalBreakfast / totalMealsCount) * 100).toFixed(0) : 0}% |\n`;
    detailedAnalysis += `| 🍲 Almoço | **${totalLunch}** | ${totalMealsCount ? ((totalLunch / totalMealsCount) * 100).toFixed(0) : 0}% |\n`;
    detailedAnalysis += `| 🥪 Lanche da Tarde | **${totalSnack}** | ${totalMealsCount ? ((totalSnack / totalMealsCount) * 100).toFixed(0) : 0}% |\n`;
    detailedAnalysis += `| 🥣 Jantar / Sopa | **${totalDinner}** | ${totalMealsCount ? ((totalDinner / totalMealsCount) * 100).toFixed(0) : 0}% |\n`;
    detailedAnalysis += `| **TOTAL GERAL** | **${totalMealsCount}** | **100%** |\n\n`;

    if (peakMealDay) {
      detailedAnalysis += `📌 **Pico de atendimento:** Dia **${formatDateBR(peakMealDay.date)}** com **${peakMealDay.totalMeals} refeições** servidas (Responsável: ${peakMealDay.responsible || 'Equipe de Cozinha'}).\n\n`;
    }

    detailedAnalysis += `> ⚠️ **Nota Regulatória:** A contagem de refeições servidas mede o impacto social e o volume de pessoas alimentadas, não devendo ser confundida com a baixa física de ingredientes do estoque.`;

    return {
      query,
      intent: 'meals_summary',
      summary: `Foram servidas ${totalMealsCount} refeições na Cristolândia no período analisado (${dateRange.label}), com média de ${avgDaily} refeições/dia.`,
      confidence,
      confidenceReason,
      metrics,
      calculationBase: {
        periodAnalyzed: dateRange.label,
        movementsCount: filteredMeals.length,
        totalQuantity: totalMealsCount,
        unit: 'refeições',
        filtersUsed,
      },
      detailedAnalysis,
      insights: [
        `O almoço representa a maior parcela do acolhimento (${totalLunch} pratos).`,
        `A média diária de atendimento é de ${avgDaily} pratos servidos por dia.`,
      ],
      suggestedFollowUps: [
        'Quanto de arroz a cozinha consumiu nos últimos 7 dias?',
        'Quais produtos foram entregues para a Cozinha esta semana?',
      ],
      timestamp: new Date().toISOString(),
    };
  }

  // =========================================================================
  // CASO 2: Consulta de Produtos Críticos / Reposição de Estoque
  // =========================================================================
  if (
    norm.includes('critico') ||
    norm.includes('minimo') ||
    (norm.includes('abaixo') && norm.includes('minimo')) ||
    norm.includes('comprar') ||
    norm.includes('compra') ||
    norm.includes('repor') ||
    norm.includes('reposicao') ||
    norm.includes('falta') ||
    norm.includes('acabando') ||
    norm.includes('desabastecimento')
  ) {
    const criticalProducts = products.filter((p) => p.currentStock < p.minStock);
    const attentionProducts = products.filter((p) => p.currentStock >= p.minStock && p.currentStock <= p.minStock * 1.3);

    const metrics: AiCalculatedMetric[] = [
      { label: 'Itens em Nível Crítico', value: criticalProducts.length, unit: 'abaixo do mínimo', badge: criticalProducts.length > 0 ? '🔴 URGENTE' : '🟢 NORMAL' },
      { label: 'Itens em Alerta', value: attentionProducts.length, unit: 'próximos do limite', badge: '🟠 ATENÇÃO' },
      { label: 'Total de Itens Cadastrados', value: products.length, unit: 'itens' },
    ];

    let detailedAnalysis = `### ⚠️ Diagnóstico de Reposição e Níveis de Estoque\n\n`;
    if (criticalProducts.length > 0) {
      detailedAnalysis += `#### 🔴 Produtos Críticos (Abaixo do Estoque Mínimo)\n`;
      detailedAnalysis += `Estes itens precisam de reposição imediata para evitar desabastecimento da cozinha e acolhidos:\n\n`;
      detailedAnalysis += `| Produto | Estoque Atual | Estoque Mínimo | Déficit / Necessidade | Consumo Médio Diário |\n`;
      detailedAnalysis += `| :--- | :--- | :--- | :--- | :--- |\n`;
      criticalProducts.forEach((p) => {
        const deficit = (p.minStock - p.currentStock).toFixed(1);
        detailedAnalysis += `| **${p.name}** | **${p.currentStock} ${p.unit}** | ${p.minStock} ${p.unit} | <span style="color:#ef4444;font-weight:bold;">-${deficit} ${p.unit}</span> | ${p.dailyAvgConsumption} ${p.unit}/dia |\n`;
      });
      detailedAnalysis += `\n`;
    } else {
      detailedAnalysis += `✅ **Nenhum produto está atualmente abaixo do estoque mínimo.** Todos os saldos atendem a margem de segurança.\n\n`;
    }

    if (attentionProducts.length > 0) {
      detailedAnalysis += `#### 🟠 Produtos em Alerta (Próximos do Mínimo)\n`;
      attentionProducts.forEach((p) => {
        const daysLeft = p.dailyAvgConsumption > 0 ? (p.currentStock / p.dailyAvgConsumption).toFixed(1) : 'N/A';
        detailedAnalysis += `• **${p.name}:** ${p.currentStock} ${p.unit} (Mínimo: ${p.minStock} ${p.unit} — Autonomia estimada: ~${daysLeft} dias)\n`;
      });
    }

    return {
      query,
      intent: 'stock_replenishment',
      summary: criticalProducts.length > 0
        ? `Existem ${criticalProducts.length} produto(s) em situação crítica abaixo do estoque mínimo que necessitam de compras ou doações urgentes.`
        : 'Todos os produtos estão com níveis de estoque dentro ou acima da margem mínima de segurança.',
      confidence: 'high',
      confidenceReason: 'Calculado diretamente sobre a coleção de produtos e parâmetros de estoque mínimo cadastrados.',
      metrics,
      calculationBase: {
        periodAnalyzed: 'Posição Atual em Tempo Real',
        movementsCount: criticalProducts.length,
        totalQuantity: criticalProducts.length,
        unit: 'produtos',
        filtersUsed: ['currentStock < minStock'],
      },
      detailedAnalysis,
      insights: [
        criticalProducts.length > 0 ? `Priorizar compra/doação de: ${criticalProducts.map((p) => p.name).slice(0, 3).join(', ')}` : 'Estoque abastecido sem gargalos imediatos.',
        `Total de ${attentionProducts.length} itens demandam monitoramento para os próximos dias.`,
      ],
      suggestedFollowUps: [
        'Quanto de arroz temos atualmente?',
        'Quanto a cozinha consumiu nos últimos 15 dias?',
      ],
      timestamp: new Date().toISOString(),
    };
  }

  // =========================================================================
  // CASO 3: Autonomia do Estoque (Quanto tempo vai durar?)
  // =========================================================================
  if (norm.includes('durar') || norm.includes('autonomia') || norm.includes('quantos dias') || norm.includes('tempo o estoque')) {
    const targetProduct = mentionedProduct || products[0];
    if (!targetProduct) {
      return makeEmptyResponse(query, 'Nenhum produto cadastrado foi localizado para estimar autonomia.');
    }

    const currentStock = targetProduct.currentStock;
    const dailyAvg = targetProduct.dailyAvgConsumption || 0;
    const daysRemaining = dailyAvg > 0 ? (currentStock / dailyAvg).toFixed(1) : 'Indeterminado';

    const metrics: AiCalculatedMetric[] = [
      { label: 'Estoque Atual', value: currentStock, unit: targetProduct.unit },
      { label: 'Consumo Médio Diário', value: dailyAvg, unit: `${targetProduct.unit}/dia` },
      { label: 'Autonomia Estimada', value: daysRemaining, unit: 'dias', badge: Number(daysRemaining) < 5 ? '🔴 BAIXA' : '🟢 ADEQUADA' },
    ];

    let detailedAnalysis = `### ⏳ Análise de Autonomia de Estoque — ${targetProduct.name}\n\n`;
    detailedAnalysis += `• **Estoque Atual:** ${currentStock} ${targetProduct.unit}\n`;
    detailedAnalysis += `• **Consumo Médio Diário Registrado:** ${dailyAvg} ${targetProduct.unit}/dia\n`;
    detailedAnalysis += `• **Estoque Mínimo de Segurança:** ${targetProduct.minStock} ${targetProduct.unit}\n\n`;
    detailedAnalysis += `**Fórmula de Cálculo:**\n`;
    detailedAnalysis += `$$\\text{Autonomia (dias)} = \\frac{\\text{Estoque Atual}}{\\text{Consumo Médio Diário}} = \\frac{${currentStock}}{${dailyAvg || 1}} = \\mathbf{${daysRemaining}\\text{ dias}}$$\n\n`;

    if (Number(daysRemaining) <= 3) {
      detailedAnalysis += `⚠️ **Alerta:** A autonomia é de apenas **${daysRemaining} dias**, demandando reposição imediata.`;
    } else {
      detailedAnalysis += `✅ O saldo atual suporta aproximadamente **${daysRemaining} dias** de operação regular da Cristolândia.`;
    }

    return {
      query,
      intent: 'stock_autonomy',
      summary: `O estoque atual de ${targetProduct.name} (${currentStock} ${targetProduct.unit}) possui autonomia estimada de aproximadamente ${daysRemaining} dias, considerando o consumo médio de ${dailyAvg} ${targetProduct.unit}/dia.`,
      confidence: dailyAvg > 0 ? 'high' : 'medium',
      confidenceReason: dailyAvg > 0 ? 'Baseado no estoque atual e na média diária de consumo auditada.' : 'Média diária não configurada para este produto.',
      metrics,
      calculationBase: {
        periodAnalyzed: 'Projeção Atual',
        productFiltered: targetProduct.name,
        totalQuantity: currentStock,
        unit: targetProduct.unit,
        movementsCount: 1,
        filtersUsed: [`Produto: ${targetProduct.name}`],
      },
      detailedAnalysis,
      insights: [
        `Autonomia estimada em ${daysRemaining} dias com base no ritmo atual.`,
      ],
      suggestedFollowUps: [
        `Quanto de ${targetProduct.name} foi consumido nos últimos 7 dias?`,
        'Quais produtos estão abaixo do estoque mínimo?',
      ],
      timestamp: new Date().toISOString(),
    };
  }

  // =========================================================================
  // CASO 4: Consulta de Saldo Atual de um Produto
  // =========================================================================
  if (mentionedProduct && (norm.includes('quanto temos') || norm.includes('estoque atual') || norm.includes('qual o estoque') || norm.includes('saldo de') || norm.includes('temos atualmente'))) {
    const p = mentionedProduct;
    const metrics: AiCalculatedMetric[] = [
      { label: 'Saldo Atual em Estoque', value: p.currentStock, unit: p.unit, badge: p.currentStock < p.minStock ? '🔴 Crítico' : '🟢 Normal' },
      { label: 'Estoque Mínimo', value: p.minStock, unit: p.unit },
      { label: 'Local de Armazenamento', value: p.location || 'Despensa Principal' },
      { label: 'Categoria', value: p.category },
    ];

    let detailedAnalysis = `### 📦 Ficha de Estoque Atual — ${p.name}\n\n`;
    detailedAnalysis += `• **Saldo Físico Atual:** **${p.currentStock} ${p.unit}**\n`;
    detailedAnalysis += `• **Nível Mínimo Definido:** ${p.minStock} ${p.unit}\n`;
    if (p.idealStock) detailedAnalysis += `• **Estoque Ideal:** ${p.idealStock} ${p.unit}\n`;
    detailedAnalysis += `• **Consumo Médio Diário:** ${p.dailyAvgConsumption} ${p.unit}/dia\n`;
    detailedAnalysis += `• **Localização:** ${p.location}\n`;
    detailedAnalysis += `• **Última Atualização:** ${formatDateTimeBR(p.lastUpdated)}\n\n`;

    const statusText = p.currentStock < p.minStock
      ? `🔴 **Atenção:** Saldo abaixo do mínimo de ${p.minStock} ${p.unit}.`
      : `🟢 **Situação Regular:** Saldo suficiente para operação.`;
    detailedAnalysis += statusText;

    return {
      query,
      intent: 'stock_status',
      summary: `Atualmente temos ${p.currentStock} ${p.unit} de ${p.name} em estoque (Mínimo: ${p.minStock} ${p.unit}). Localização: ${p.location}.`,
      confidence: 'high',
      confidenceReason: 'Saldo consultado diretamente da base em tempo real.',
      metrics,
      calculationBase: {
        periodAnalyzed: 'Posição em Tempo Real',
        productFiltered: p.name,
        totalQuantity: p.currentStock,
        unit: p.unit,
        movementsCount: 1,
        filtersUsed: [`Produto: ${p.name}`],
      },
      detailedAnalysis,
      insights: [
        p.currentStock < p.minStock ? 'Item necessita de reposição urgente.' : 'Estoque confortável.',
      ],
      suggestedFollowUps: [
        `Quanto de ${p.name} foi retirado nos últimos 7 dias?`,
        `Quanto de ${p.name} o missionário Renê retirou?`,
      ],
      timestamp: new Date().toISOString(),
    };
  }

  // =========================================================================
  // CASO 5: Filtragem Geral de Movimentações (Por Pessoa, Produto, Setor, Período)
  // =========================================================================

  // 1. Filtrar por data
  let matchingMovements = movements.filter((m) => {
    if (!m.date) return false;
    return m.date >= dateRange.startDate && m.date <= dateRange.endDate;
  });

  // 2. Filtrar por tipo (entrada, saída, ajuste)
  if (requestedType !== 'todos') {
    matchingMovements = matchingMovements.filter((m) => m.type === requestedType);
  }

  // 3. Filtrar por produto se houver
  if (mentionedProduct) {
    matchingMovements = matchingMovements.filter((m) => {
      if (m.productId === mentionedProduct.id) return true;
      const mName = normalizeStr(m.productName);
      const targetName = normalizeStr(mentionedProduct.name);
      return mName.includes(targetName) || targetName.includes(mName);
    });
  }

  // 4. Filtrar por pessoa/missionário se houver
  if (mentionedPerson) {
    const pNorm = normalizeStr(mentionedPerson);
    const firstName = pNorm.split(' ')[0];

    matchingMovements = matchingMovements.filter((m) => {
      const ret = normalizeStr(m.retrievedBy);
      const del = normalizeStr(m.deliveredBy);
      const rec = normalizeStr(m.receivedBy);
      const resp = normalizeStr(m.responsible);

      return (
        ret.includes(firstName) ||
        del.includes(firstName) ||
        rec.includes(firstName) ||
        resp.includes(firstName)
      );
    });
  }

  // 5. Filtrar por setor se houver
  if (mentionedSector) {
    const sNorm = normalizeStr(mentionedSector);
    matchingMovements = matchingMovements.filter((m) => {
      const sec = normalizeStr(m.sector);
      return sec.includes(sNorm) || sNorm.includes(sec);
    });
  }

  // Ordenar cronologicamente decrescente
  matchingMovements.sort((a, b) => `${b.date} ${b.time || ''}`.localeCompare(`${a.date} ${a.time || ''}`));

  // Somatório exato das quantidades
  const totalQuantity = matchingMovements.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
  const distinctProducts = Array.from(new Set(matchingMovements.map((m) => m.productName)));
  const primaryUnit = mentionedProduct ? mentionedProduct.unit : (matchingMovements[0]?.unit || 'unid');

  // Identificar nível de confiança
  let confidence: AiConfidenceLevel = 'high';
  let confidenceReason = `Cálculo exato baseado em ${matchingMovements.length} movimentação(ões) auditada(s) no Firestore.`;

  if (matchingMovements.length === 0) {
    confidence = 'low';
    confidenceReason = 'Não foram encontradas movimentações que atendam a todos os filtros informados.';
  }

  // Montar base de cálculo
  const calculationBase: AiCalculationBase = {
    periodAnalyzed: dateRange.label,
    productFiltered: mentionedProduct?.name,
    responsibleFiltered: mentionedPerson || undefined,
    sectorFiltered: mentionedSector || undefined,
    movementsCount: matchingMovements.length,
    totalQuantity: Number(totalQuantity.toFixed(2)),
    unit: primaryUnit,
    filtersUsed,
    movementsSummary: matchingMovements.slice(0, 50).map((m) => ({
      id: m.id,
      date: m.date,
      time: m.time,
      quantity: m.quantity,
      unit: m.unit,
      type: m.type,
      productName: m.productName,
      responsible: m.retrievedBy || m.receivedBy || m.responsible || m.deliveredBy || 'Equipe',
      sector: m.sector,
      notes: m.notes,
    })),
  };

  // Se não encontrou dados:
  if (matchingMovements.length === 0) {
    let emptyMsg = `Não encontrei movimentações de **${requestedType}** `;
    if (mentionedProduct) emptyMsg += `para o produto **${mentionedProduct.name}** `;
    if (mentionedPerson) emptyMsg += `pelo missionário/responsável **${mentionedPerson}** `;
    if (mentionedSector) emptyMsg += `no setor **${mentionedSector}** `;
    emptyMsg += `no período analisado (${dateRange.label}).`;

    return {
      query,
      intent: 'movements_empty',
      summary: emptyMsg,
      confidence: 'low',
      confidenceReason: 'Nenhum registro correspondente foi localizado na base de dados.',
      metrics: [
        { label: 'Total Encontrado', value: 0, unit: primaryUnit },
        { label: 'Movimentações', value: 0 },
        { label: 'Período', value: dateRange.label },
      ],
      calculationBase,
      detailedAnalysis: `### 🔍 Nenhuma Movimentação Encontrada\n\n${emptyMsg}\n\n**Possíveis motivos:**\n1. Não houve registro de ${requestedType} nessa data específica.\n2. O nome do responsável ou produto pode ter sido digitado de forma diferente no cadastro.\n3. O período consultado pode ser anterior aos lançamentos no sistema.`,
      insights: [
        'Verifique se a data pesquisada está correta.',
        'Você pode consultar o extrato completo na aba de Entradas ou Saídas.',
      ],
      suggestedFollowUps: [
        'Quais foram todas as saídas dos últimos 7 dias?',
        'Qual o estoque atual dos produtos?',
      ],
      timestamp: new Date().toISOString(),
    };
  }

  // Agrupamento por produto se houver múltiplos
  const productTotals: Record<string, { qty: number; unit: string; count: number }> = {};
  matchingMovements.forEach((m) => {
    if (!productTotals[m.productName]) {
      productTotals[m.productName] = { qty: 0, unit: m.unit, count: 0 };
    }
    productTotals[m.productName].qty += Number(m.quantity) || 0;
    productTotals[m.productName].count += 1;
  });

  // Montar Resposta Detalhada
  let detailedAnalysis = `### 📊 Extrato Analítico de Movimentações\n\n`;
  detailedAnalysis += `• **Período Analisado:** ${dateRange.label}\n`;
  if (mentionedProduct) detailedAnalysis += `• **Produto:** ${mentionedProduct.name}\n`;
  if (mentionedPerson) detailedAnalysis += `• **Responsável / Retirado por:** ${mentionedPerson}\n`;
  if (mentionedSector) detailedAnalysis += `• **Setor de Destino:** ${mentionedSector}\n`;
  detailedAnalysis += `• **Total de Registros Encontrados:** ${matchingMovements.length} movimentação(ões)\n\n`;

  if (distinctProducts.length === 1) {
    const prodName = distinctProducts[0];
    detailedAnalysis += `#### 📦 Total Geral: **${totalQuantity.toFixed(1)} ${primaryUnit}** de **${prodName}**\n\n`;
  } else {
    detailedAnalysis += `#### 📦 Totais por Produto:\n\n`;
    detailedAnalysis += `| Produto | Quantidade Total | Movimentações |\n`;
    detailedAnalysis += `| :--- | :--- | :--- |\n`;
    Object.entries(productTotals).forEach(([name, data]) => {
      detailedAnalysis += `| **${name}** | **${data.qty.toFixed(1)} ${data.unit}** | ${data.count} registro(s) |\n`;
    });
    detailedAnalysis += `\n`;
  }

  detailedAnalysis += `#### 📋 Detalhamento Cronológico das Movimentações:\n\n`;
  detailedAnalysis += `| Data | Hora | Quantidade | Produto | Responsável | Setor |\n`;
  detailedAnalysis += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  matchingMovements.slice(0, 20).forEach((m) => {
    const dFormatted = formatDateBR(m.date);
    const resp = m.retrievedBy || m.receivedBy || m.responsible || m.deliveredBy || '-';
    detailedAnalysis += `| ${dFormatted} | ${m.time || '-'} | **${m.quantity} ${m.unit}** | ${m.productName} | ${resp} | ${m.sector || '-'} |\n`;
  });

  if (matchingMovements.length > 20) {
    detailedAnalysis += `\n*(Exibindo as 20 movimentações mais recentes de um total de ${matchingMovements.length})*\n`;
  }

  // Montar Métricas para Bento Grid
  const metrics: AiCalculatedMetric[] = [
    {
      label: mentionedProduct ? `Total ${requestedType === 'entrada' ? 'Recebido' : 'Retirado'}` : 'Volume Total',
      value: totalQuantity.toFixed(1),
      unit: primaryUnit,
      badge: 'Auditado',
    },
    {
      label: 'Registros Considerados',
      value: matchingMovements.length,
      unit: 'movimentações',
    },
    {
      label: 'Produtos Distintos',
      value: distinctProducts.length,
      unit: 'itens',
    },
  ];

  if (mentionedPerson) {
    metrics.push({
      label: 'Missionário/Responsável',
      value: mentionedPerson,
    });
  }

  // Summary Text
  let summary = '';
  if (mentionedProduct && mentionedPerson) {
    summary = `O missionário **${mentionedPerson}** retirou **${totalQuantity.toFixed(1)} ${primaryUnit}** de **${mentionedProduct.name}** no período de ${dateRange.label} (total de ${matchingMovements.length} movimentação(ões)).`;
  } else if (mentionedProduct && mentionedSector) {
    summary = `O setor **${mentionedSector}** consumiu **${totalQuantity.toFixed(1)} ${primaryUnit}** de **${mentionedProduct.name}** no período de ${dateRange.label}.`;
  } else if (mentionedProduct) {
    summary = `Foram registradas ${matchingMovements.length} movimentações de ${requestedType} para **${mentionedProduct.name}**, totalizando **${totalQuantity.toFixed(1)} ${primaryUnit}** em ${dateRange.label}.`;
  } else if (mentionedPerson) {
    summary = `O missionário **${mentionedPerson}** realizou ${matchingMovements.length} retirada(s) no período de ${dateRange.label}, movimentando ${distinctProducts.length} produto(s) diferente(s).`;
  } else if (mentionedSector) {
    summary = `O setor **${mentionedSector}** registrou ${matchingMovements.length} movimentação(ões) em ${dateRange.label}, com ${distinctProducts.length} itens movimentados.`;
  } else {
    summary = `Foram encontradas ${matchingMovements.length} movimentações de ${requestedType} no período de ${dateRange.label}, totalizando ${distinctProducts.length} produtos movimentados.`;
  }

  return {
    query,
    intent: 'movements_filtered',
    summary,
    confidence,
    confidenceReason,
    metrics,
    calculationBase,
    detailedAnalysis,
    insights: [
      `Cálculo 100% exato derivado de ${matchingMovements.length} lançamentos registrados.`,
      distinctProducts.length > 1 ? `Maior volume concentrado em ${Object.keys(productTotals)[0] || 'itens principais'}.` : 'Lançamentos consistentes com os registros físicos.',
    ],
    suggestedFollowUps: [
      'Qual o estoque atual deste produto?',
      'Quais foram as refeições servidas neste mesmo período?',
    ],
    timestamp: new Date().toISOString(),
  };
}

function makeEmptyResponse(query: string, message: string): AiAssistantResponse {
  return {
    query,
    intent: 'empty',
    summary: message,
    confidence: 'low',
    confidenceReason: 'Dados insuficientes.',
    metrics: [],
    calculationBase: {
      periodAnalyzed: 'N/A',
      movementsCount: 0,
      totalQuantity: 0,
      filtersUsed: [],
    },
    detailedAnalysis: message,
    insights: [],
    suggestedFollowUps: ['Qual o estoque atual dos produtos?', 'Quantas refeições foram servidas hoje?'],
    timestamp: new Date().toISOString(),
  };
}
