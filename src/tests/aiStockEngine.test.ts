/**
 * BATERIA DE TESTES DO MOTOR DETERMINÍSTICO DO ASSISTENTE IA — ESTOQUE CRISTOLÂNDIA
 */
import { Product, StockMovement, DailyMealRecord, DailyKit, Missionary } from '../types';
import { executeDeterministicStockQuery, parseDateRangeFromQuery, findMentionedProduct, findMentionedPerson, findMentionedSector } from '../services/aiStockEngine';

const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Leite Integral',
    category: 'Laticínios e Massas',
    unit: 'litro',
    currentStock: 42,
    minStock: 20,
    idealStock: 60,
    dailyAvgConsumption: 3,
    location: 'Despensa 1',
    lastUpdated: '2026-08-28T10:00:00Z',
  },
  {
    id: 'prod-2',
    name: 'Arroz Branco Tipo 1',
    category: 'Grãos e Cereais',
    unit: 'kg',
    currentStock: 15,
    minStock: 50, // CRÍTICO!
    idealStock: 100,
    dailyAvgConsumption: 5,
    location: 'Palete A',
    lastUpdated: '2026-08-28T10:00:00Z',
  },
  {
    id: 'prod-3',
    name: 'Feijão Carioca',
    category: 'Grãos e Cereais',
    unit: 'kg',
    currentStock: 30,
    minStock: 25,
    idealStock: 60,
    dailyAvgConsumption: 2,
    location: 'Palete B',
    lastUpdated: '2026-08-28T10:00:00Z',
  },
];

const mockMissionaries: Missionary[] = [
  { id: 'm-1', name: 'Renê Lima', role: 'Missionário', sector: 'Cozinha' },
  { id: 'm-2', name: 'Pr. Marconi Castro', role: 'Gestor do Estoque', sector: 'Administração' },
  { id: 'm-3', name: 'Alexandre Souza', role: 'Missionário', sector: 'Cozinha' },
];

const mockMovements: StockMovement[] = [
  {
    id: 'mov-1',
    productId: 'prod-1',
    productName: 'Leite Integral',
    unit: 'litro',
    type: 'saida',
    quantity: 5,
    date: '2026-08-24',
    time: '08:00',
    retrievedBy: 'Renê Lima',
    deliveredBy: 'Pr. Marconi',
    sector: 'Cozinha',
    createdAt: '2026-08-24T08:00:00Z',
  },
  {
    id: 'mov-2',
    productId: 'prod-1',
    productName: 'Leite Integral',
    unit: 'litro',
    type: 'saida',
    quantity: 3,
    date: '2026-08-25',
    time: '08:15',
    retrievedBy: 'Renê Lima',
    deliveredBy: 'Pr. Marconi',
    sector: 'Cozinha',
    createdAt: '2026-08-25T08:15:00Z',
  },
  {
    id: 'mov-3',
    productId: 'prod-1',
    productName: 'Leite Integral',
    unit: 'litro',
    type: 'saida',
    quantity: 4,
    date: '2026-08-26',
    time: '07:45',
    retrievedBy: 'Renê Lima',
    deliveredBy: 'Pr. Marconi',
    sector: 'Cozinha',
    createdAt: '2026-08-26T07:45:00Z',
  },
  {
    id: 'mov-4',
    productId: 'prod-1',
    productName: 'Leite Integral',
    unit: 'litro',
    type: 'saida',
    quantity: 6,
    date: '2026-08-28',
    time: '08:30',
    retrievedBy: 'Renê Lima',
    deliveredBy: 'Pr. Marconi',
    sector: 'Cozinha',
    createdAt: '2026-08-28T08:30:00Z',
  },
  {
    id: 'mov-5',
    productId: 'prod-2',
    productName: 'Arroz Branco Tipo 1',
    unit: 'kg',
    type: 'saida',
    quantity: 10,
    date: '2026-08-27',
    time: '11:00',
    retrievedBy: 'Alexandre Souza',
    deliveredBy: 'Pr. Marconi',
    sector: 'Cozinha',
    createdAt: '2026-08-27T11:00:00Z',
  },
];

const mockDailyKit: DailyKit = {
  id: 'kit-padrao',
  name: 'Kit Cozinha Padrão',
  sector: 'Cozinha',
  items: [
    { productId: 'prod-1', productName: 'Leite Integral', quantity: 3, unit: 'litro' },
    { productId: 'prod-2', productName: 'Arroz Branco Tipo 1', quantity: 5, unit: 'kg' },
  ],
  defaultRetriever: 'Renê Lima',
  defaultDeliverer: 'Pr. Marconi',
};

const mockMeals: DailyMealRecord[] = [
  {
    id: 'meal-1',
    date: '2026-08-27',
    breakfast: 25,
    lunch: 40,
    afternoonSnack: 20,
    dinner: 35,
    totalMeals: 120,
    responsible: 'Renê Lima',
    createdAt: '2026-08-27T20:00:00Z',
  },
  {
    id: 'meal-2',
    date: '2026-08-28',
    breakfast: 26,
    lunch: 42,
    afternoonSnack: 22,
    dinner: 38,
    totalMeals: 128,
    responsible: 'Alexandre Souza',
    createdAt: '2026-08-28T20:00:00Z',
  },
];

export function runAllAiEngineTests(): { passed: number; failed: number; results: string[] } {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string) => {
    if (condition) {
      passed++;
      results.push(`✅ [PASSOU] ${testName}`);
    } else {
      failed++;
      results.push(`❌ [FALHOU] ${testName}`);
    }
  };

  // Teste 1: Reconhecimento de Entidades
  const foundProd = findMentionedProduct('quanto de leite temos?', mockProducts);
  assert(foundProd?.name === 'Leite Integral', 'Reconhecimento de Produto por sinônimo (leite -> Leite Integral)');

  const foundPerson = findMentionedPerson('quanto o missionário Renê retirou?', mockMissionaries, mockMovements);
  assert(foundPerson?.includes('Renê') === true, 'Reconhecimento de Pessoa/Missionário (Renê)');

  const foundSector = findMentionedSector('quanto a cozinha gastou?');
  assert(foundSector === 'Cozinha', 'Reconhecimento de Setor (Cozinha)');

  // Teste 2: Exemplo Crítico — "Quanto de leite o missionário Renê retirou nos últimos 7 dias?"
  const resRene = executeDeterministicStockQuery(
    'Quanto de leite o missionário Renê retirou nos últimos 7 dias?',
    mockProducts,
    mockMovements,
    mockMeals,
    mockDailyKit,
    mockMissionaries
  );
  // Total esperado: 5 + 3 + 4 + 6 = 18 litros em 4 movimentações
  assert(resRene.calculationBase.totalQuantity === 18, `Cálculo exato de leite do Renê: esperado 18L, obtido ${resRene.calculationBase.totalQuantity}L`);
  assert(resRene.calculationBase.movementsCount === 4, `Contagem de movimentações do Renê: esperado 4, obtido ${resRene.calculationBase.movementsCount}`);
  assert(resRene.confidence === 'high', 'Nível de confiança alto para dados encontrados');

  // Teste 3: Consulta sem dados — "Quanto de açúcar João retirou ontem?"
  const resSemDados = executeDeterministicStockQuery(
    'Quanto de açúcar João retirou ontem?',
    mockProducts,
    mockMovements,
    mockMeals,
    mockDailyKit,
    mockMissionaries
  );
  assert(resSemDados.calculationBase.movementsCount === 0, 'Consulta sem dados retorna 0 movimentações');
  assert(resSemDados.confidence === 'low', 'Consulta sem dados classifica confiança como low');
  assert(resSemDados.summary.includes('Não encontrei'), 'Mensagem transparente de ausência de dados');

  // Teste 4: Consulta de Refeições
  const resMeals = executeDeterministicStockQuery(
    'Quantas refeições foram servidas esta semana?',
    mockProducts,
    mockMovements,
    mockMeals,
    mockDailyKit,
    mockMissionaries
  );
  assert(resMeals.intent === 'meals_summary', 'Intenção de refeições reconhecida');
  assert(resMeals.calculationBase.totalQuantity === 248, `Total de refeições servidas: esperado 248 (120+128), obtido ${resMeals.calculationBase.totalQuantity}`);

  // Teste 5: Diagnóstico de Produtos Críticos
  const resCriticos = executeDeterministicStockQuery(
    'Quais produtos estão abaixo do estoque mínimo?',
    mockProducts,
    mockMovements,
    mockMeals,
    mockDailyKit,
    mockMissionaries
  );
  assert(resCriticos.intent === 'stock_replenishment', 'Intenção de reposição de estoque');
  assert(resCriticos.metrics.some((m) => m.label.includes('Crítico') && m.value === 1), 'Detectado 1 produto crítico (Arroz: 15 < 50)');

  // Teste 6: Autonomia de Estoque
  const resAutonomia = executeDeterministicStockQuery(
    'Quanto tempo vai durar o estoque de arroz?',
    mockProducts,
    mockMovements,
    mockMeals,
    mockDailyKit,
    mockMissionaries
  );
  // Arroz: 15kg / 5kg/dia = 3 dias
  assert(resAutonomia.intent === 'stock_autonomy', 'Intenção de autonomia de estoque');
  assert(resAutonomia.metrics.some((m) => m.label.includes('Autonomia') && m.value === '3.0'), 'Cálculo de autonomia do arroz (15 / 5 = 3.0 dias)');

  // Teste 7: Imutabilidade e Read-Only (Garantia de que produtos não foram modificados)
  assert(mockProducts[0].currentStock === 42, 'Imutabilidade: estoque do Leite inalterado (42)');
  assert(mockProducts[1].currentStock === 15, 'Imutabilidade: estoque do Arroz inalterado (15)');
  assert(mockMovements.length === 5, 'Imutabilidade: lista de movimentações inalterada (5)');

  // Teste 8: Entrada por Voz — Spoken Numbers e Datas por Extenso
  const rangeSpoken7 = parseDateRangeFromQuery('Quanto de leite o missionário Renê retirou nos últimos sete dias?', new Date('2026-08-28T12:00:00'));
  assert(rangeSpoken7.startDate === '2026-08-22' && rangeSpoken7.endDate === '2026-08-28', 'Conversão de voz: "últimos sete dias"');

  const rangeSpoken15 = parseDateRangeFromQuery('Quanto arroz a cozinha consumiu nos últimos quinze dias?', new Date('2026-08-28T12:00:00'));
  assert(rangeSpoken15.startDate === '2026-08-14' && rangeSpoken15.endDate === '2026-08-28', 'Conversão de voz: "últimos quinze dias"');

  const rangeSpokenDate = parseDateRangeFromQuery('Mostre as saídas do dia vinte e cinco de agosto de dois mil e vinte e seis.', new Date('2026-08-28T12:00:00'));
  assert(rangeSpokenDate.startDate === '2026-08-25' && rangeSpokenDate.endDate === '2026-08-25', 'Conversão de voz: "dia vinte e cinco de agosto de dois mil e vinte e seis"');

  // Teste 9: Robustez contra caracteres especiais em nomes de produtos "(pacote)", "[1L]", etc.
  const productsWithSpecialChars: Product[] = [
    ...mockProducts,
    {
      id: 'prod-special-1',
      name: 'Açúcar Cristal (pacote 5kg)',
      category: 'Óleos e Condimentos',
      unit: 'pacote',
      currentStock: 20,
      minStock: 10,
      dailyAvgConsumption: 1,
      location: 'Despensa 2',
      lastUpdated: '2026-08-28T10:00:00Z',
    },
    {
      id: 'prod-special-2',
      name: 'Detergente Neutro [500ml]',
      category: 'Higiene e Limpeza',
      unit: 'unidade',
      currentStock: 12,
      minStock: 5,
      dailyAvgConsumption: 0.5,
      location: 'Armário de Limpeza',
      lastUpdated: '2026-08-28T10:00:00Z',
    }
  ];

  // Teste de consulta: "O QUE SAIU NA DATA DE HOJE?" não deve gerar erro de regex
  const resHoje = executeDeterministicStockQuery(
    'O QUE SAIU NA DATA DE HOJE?',
    productsWithSpecialChars,
    mockMovements,
    mockMeals,
    mockDailyKit,
    mockMissionaries
  );
  assert(resHoje !== null && resHoje.intent !== undefined, 'Execução de "O QUE SAIU NA DATA DE HOJE?" sem erro de regex');

  const prodFoundSpecial = findMentionedProduct('qual o estoque de açucar pacote 5kg?', productsWithSpecialChars);
  assert(prodFoundSpecial?.id === 'prod-special-1', 'Reconhecimento de produto com parênteses no nome sem quebra de regex');

  return { passed, failed, results };
}
