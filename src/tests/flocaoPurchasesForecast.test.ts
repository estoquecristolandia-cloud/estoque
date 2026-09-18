import assert from 'node:assert';
import { calculatePurchaseForecast } from '../utils/purchaseForecasting';
import { Product } from '../types';

const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-flocao',
    name: 'Flocão de Milho (Cuscuz 400g)',
    category: 'Grãos e Cereais',
    unit: 'pacote',
    currentStock: 52,
    minStock: 44,
    idealStock: 88,
    dailyAvgConsumption: 6.29,
    location: 'Prateleira 4',
    lastUpdated: '2026-08-21T17:30:00',
  },
  {
    id: 'prod-arroz',
    name: 'Arroz Branco Tipo 1',
    category: 'Grãos e Cereais',
    unit: 'kg',
    currentStock: 107,
    minStock: 50,
    idealStock: 150,
    dailyAvgConsumption: 12,
    location: 'Palete A',
    lastUpdated: '2026-08-21T17:30:00',
  },
  {
    id: 'prod-milho-pipoca',
    name: 'Milho para Pipoca 500g',
    category: 'Grãos e Cereais',
    unit: 'pacote',
    currentStock: 18,
    minStock: 5,
    idealStock: 20,
    dailyAvgConsumption: 0,
    location: 'Prateleira 4',
    lastUpdated: '2026-08-21T17:30:00',
  },
];

async function runTests() {
  console.log('🧪 Iniciando testes: FASE 5 — Previsão de Compras (Flocão & Horizontes)...');

  // Segunda-feira como data base: 2026-08-24 (Segunda-feira)
  const mondayBaseDate = '2026-08-24';

  // 1. Horizonte 14 dias (2 semanas exatas)
  const forecast14 = calculatePurchaseForecast(MOCK_PRODUCTS, [], 14, [], undefined, mondayBaseDate);
  const flocao14 = forecast14.allItems.find((i) => i.id === 'prod-flocao')!;
  assert.strictEqual(flocao14.occurrencesInPeriod, 4, '14 dias deve conter exatamente 4 preparos (2 quartas e 2 domingos)');
  assert.strictEqual(flocao14.projectedConsumption, 88, '14 dias deve projetar exatamente 88 pacotes (4 x 22 pacotes)');
  console.log('  ✅ 1. Horizonte 14 dias: 4 preparos x 22 pc = 88 pacotes de Flocão.');

  // 2. Horizonte 21 dias (3 semanas exatas)
  const forecast21 = calculatePurchaseForecast(MOCK_PRODUCTS, [], 21, [], undefined, mondayBaseDate);
  const flocao21 = forecast21.allItems.find((i) => i.id === 'prod-flocao')!;
  assert.strictEqual(flocao21.occurrencesInPeriod, 6, '21 dias deve conter exatamente 6 preparos (3 quartas e 3 domingos)');
  assert.strictEqual(flocao21.projectedConsumption, 132, '21 dias deve projetar exatamente 132 pacotes (6 x 22 pacotes)');
  console.log('  ✅ 2. Horizonte 21 dias: 6 preparos x 22 pc = 132 pacotes de Flocão.');

  // 3. Horizonte 8 dias começando na Segunda-feira (Qua + Dom = 2 preparos)
  const forecast8Monday = calculatePurchaseForecast(MOCK_PRODUCTS, [], 8, [], undefined, mondayBaseDate);
  const flocao8Mon = forecast8Monday.allItems.find((i) => i.id === 'prod-flocao')!;
  assert.strictEqual(flocao8Mon.occurrencesInPeriod, 2, '8 dias a partir de segunda deve conter 2 preparos (Qua + Dom)');
  assert.strictEqual(flocao8Mon.projectedConsumption, 44, '8 dias a partir de segunda deve projetar 44 pacotes (2 x 22 pc)');
  console.log('  ✅ 3. Horizonte 8 dias (início Segunda): 2 preparos x 22 pc = 44 pacotes.');

  // 4. Horizonte 8 dias começando na Quarta-feira (2026-08-26: Qua, Dom, Qua = 3 preparos)
  const wednesdayBaseDate = '2026-08-26';
  const forecast8Wed = calculatePurchaseForecast(MOCK_PRODUCTS, [], 8, [], undefined, wednesdayBaseDate);
  const flocao8Wed = forecast8Wed.allItems.find((i) => i.id === 'prod-flocao')!;
  assert.strictEqual(flocao8Wed.occurrencesInPeriod, 3, '8 dias a partir de quarta deve conter 3 preparos (Qua + Dom + Qua)');
  assert.strictEqual(flocao8Wed.projectedConsumption, 66, '8 dias a partir de quarta deve projetar 66 pacotes (3 x 22 pc)');
  console.log('  ✅ 4. Horizonte 8 dias (início Quarta): 3 preparos x 22 pc = 66 pacotes (não linear!).');

  // 5. Horizonte 30 dias
  const forecast30 = calculatePurchaseForecast(MOCK_PRODUCTS, [], 30, [], undefined, mondayBaseDate);
  const flocao30 = forecast30.allItems.find((i) => i.id === 'prod-flocao')!;
  assert(flocao30.occurrencesInPeriod >= 8 && flocao30.occurrencesInPeriod <= 9, '30 dias deve conter 8 ou 9 preparos');
  assert(flocao30.projectedConsumption === 176 || flocao30.projectedConsumption === 198, 'Consumo deve ser 8x22 ou 9x22');
  console.log(`  ✅ 5. Horizonte 30 dias: ${flocao30.occurrencesInPeriod} preparos x 22 pc = ${flocao30.projectedConsumption} pacotes.`);

  // 6. Milho de Pipoca não projeta consumo diário (eventual)
  const pipoca = forecast14.allItems.find((i) => i.id === 'prod-milho-pipoca')!;
  assert.strictEqual(pipoca.projectedConsumption, 0, 'Milho para pipoca não pode ter consumo automático projetado');
  assert.strictEqual(pipoca.usageRule, 'eventual');
  console.log('  ✅ 6. Milho de pipoca preservado como consumo eventual sob demanda (0 projetado).');

  // 7. Arroz segue projeção diária linear histórica
  const arroz = forecast14.allItems.find((i) => i.id === 'prod-arroz')!;
  assert.strictEqual(arroz.projectedConsumption, 12 * 14, 'Arroz deve projetar 12 kg/dia x 14 dias = 168 kg');
  console.log('  ✅ 7. Produtos diários normais (Arroz) preservam projeção diária linear de 168 kg.');

  console.log('\n🎯 FASE 5 — Todos os testes de projeção e horizontes passaram com sucesso!\n');
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes da Fase 5:', err);
  process.exit(1);
});
