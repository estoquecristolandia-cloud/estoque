import assert from 'node:assert';
import {
  verifyFirebaseToken,
  validateSnapshotAgainstAuthoritativeProducts,
  executeAuthoritativeCalculation,
  parseFirestoreProductDoc,
} from '../services/aiBackendContext';
import { Product } from '../types';

// Mock de produtos autoritativos oficiais da Cristolândia
const MOCK_AUTHORITATIVE_PRODUCTS: Product[] = ([
  { id: 'prod-arroz', name: 'Arroz Branco Tipo 1', category: 'Grãos e Cereais' as const, unit: 'kg' as const, currentStock: 107, minStock: 50, dailyAvgConsumption: 12, location: 'Palete A', lastUpdated: '2026-08-21T17:30:00' },
  { id: 'prod-feijao', name: 'Feijão Carioca', category: 'Grãos e Cereais' as const, unit: 'kg' as const, currentStock: 68, minStock: 40, dailyAvgConsumption: 8, location: 'Palete A', lastUpdated: '2026-08-21T17:30:00' },
  { id: 'prod-macarrao', name: 'Macarrão Espaguete', category: 'Laticínios e Massas' as const, unit: 'kg' as const, currentStock: 45, minStock: 25, dailyAvgConsumption: 5, location: 'Prateleira 1', lastUpdated: '2026-08-21T17:30:00' },
  { id: 'prod-oleo', name: 'Óleo de Soja 900ml', category: 'Óleos e Condimentos' as const, unit: 'litro' as const, currentStock: 32, minStock: 20, dailyAvgConsumption: 3, location: 'Prateleira 1', lastUpdated: '2026-08-21T17:30:00' },
  { id: 'prod-acucar', name: 'Açúcar Cristal', category: 'Matinais e Bebidas' as const, unit: 'kg' as const, currentStock: 80, minStock: 30, dailyAvgConsumption: 6, location: 'Prateleira 2', lastUpdated: '2026-08-21T17:30:00' },
  { id: 'prod-cafe', name: 'Café em Pó 500g', category: 'Matinais e Bebidas' as const, unit: 'pacote' as const, currentStock: 24, minStock: 15, dailyAvgConsumption: 2, location: 'Prateleira 2', lastUpdated: '2026-08-21T17:30:00' },
  { id: 'prod-leite', name: 'Leite Integral 1L', category: 'Matinais e Bebidas' as const, unit: 'litro' as const, currentStock: 60, minStock: 30, dailyAvgConsumption: 7, location: 'Prateleira 2', lastUpdated: '2026-08-21T17:30:00' },
  { id: 'prod-sal', name: 'Sal Refinado', category: 'Óleos e Condimentos' as const, unit: 'kg' as const, currentStock: 35, minStock: 10, dailyAvgConsumption: 1, location: 'Prateleira 3', lastUpdated: '2026-08-21T17:30:00' },
  { id: 'prod-farinha', name: 'Farinha de Trigo', category: 'Grãos e Cereais' as const, unit: 'kg' as const, currentStock: 50, minStock: 20, dailyAvgConsumption: 4, location: 'Prateleira 3', lastUpdated: '2026-08-21T17:30:00' },
  { id: 'prod-fuba', name: 'Fubá Mimoso', category: 'Grãos e Cereais' as const, unit: 'kg' as const, currentStock: 28, minStock: 10, dailyAvgConsumption: 2, location: 'Prateleira 3', lastUpdated: '2026-08-21T17:30:00' },
  { id: 'prod-flocao', name: 'Flocão de Milho (Cuscuz 400g)', category: 'Grãos e Cereais' as const, unit: 'pacote' as const, currentStock: 52, minStock: 44, dailyAvgConsumption: 6.29, location: 'Prateleira 4', lastUpdated: '2026-08-21T17:30:00' },
  { id: 'prod-frango', name: 'Frango Congelado (Cortes)', category: 'Proteínas e Carnes' as const, unit: 'kg' as const, currentStock: 90, minStock: 40, dailyAvgConsumption: 15, location: 'Freezer 1', lastUpdated: '2026-08-21T17:30:00' },
  { id: 'prod-salsicha', name: 'Salsicha Hot Dog', category: 'Proteínas e Carnes' as const, unit: 'kg' as const, currentStock: 30, minStock: 15, dailyAvgConsumption: 4, location: 'Freezer 2', lastUpdated: '2026-08-21T17:30:00' },
  { id: 'prod-margarina', name: 'Margarina com Sal 500g', category: 'Laticínios e Massas' as const, unit: 'unidade' as const, currentStock: 22, minStock: 12, dailyAvgConsumption: 2, location: 'Refrigerador', lastUpdated: '2026-08-21T17:30:00' },
] as Product[]);

async function runTests() {
  console.log('🧪 Iniciando suíte de testes: FASE 3 — IA & Backend Autoritativo...');

  // Teste 1: Token ausente
  const resMissingToken = await verifyFirebaseToken(undefined);
  assert.strictEqual(resMissingToken, null, 'Token ausente deve retornar null');

  const resEmptyToken = await verifyFirebaseToken('');
  assert.strictEqual(resEmptyToken, null, 'Token vazio deve retornar null');

  const resWhitespaceToken = await verifyFirebaseToken('   ');
  assert.strictEqual(resWhitespaceToken, null, 'Token de apenas espaços deve retornar null');
  console.log('  ✅ 1. Validação de token ausente/inválido aprovada.');

  // Teste 2: Produto inexistente no snapshot
  const snapshotWithUnknownProduct = [
    ...MOCK_AUTHORITATIVE_PRODUCTS.map((p) => ({ id: p.id, name: p.name, currentStock: p.currentStock })),
    { id: 'prod-inexistente-123', name: 'Refrigerante Cola Fantasma', currentStock: 10 },
  ];
  const resUnknown = validateSnapshotAgainstAuthoritativeProducts(snapshotWithUnknownProduct, MOCK_AUTHORITATIVE_PRODUCTS);
  assert.strictEqual(resUnknown.valid, false, 'Produto inexistente deve invalidar o snapshot');
  assert.strictEqual(resUnknown.error?.code, 'STALE_INVENTORY_CONTEXT');
  assert.strictEqual(resUnknown.error?.details?.reason, 'PRODUCT_NOT_FOUND');
  console.log('  ✅ 2. Detecção de produto inexistente aprovada (STALE_INVENTORY_CONTEXT).');

  // Teste 3: Saldo divergente (Stock mismatch)
  const snapshotWithDivergentStock = MOCK_AUTHORITATIVE_PRODUCTS.map((p) => {
    if (p.id === 'prod-arroz') {
      return { id: p.id, name: p.name, currentStock: 999 }; // Diferente de 107
    }
    return { id: p.id, name: p.name, currentStock: p.currentStock };
  });
  const resDivergentStock = validateSnapshotAgainstAuthoritativeProducts(snapshotWithDivergentStock, MOCK_AUTHORITATIVE_PRODUCTS);
  assert.strictEqual(resDivergentStock.valid, false, 'Saldo divergente deve invalidar o snapshot');
  assert.strictEqual(resDivergentStock.error?.code, 'STALE_INVENTORY_CONTEXT');
  assert.strictEqual(resDivergentStock.error?.details?.reason, 'STOCK_MISMATCH');
  assert.strictEqual(resDivergentStock.error?.details?.productId, 'prod-arroz');
  console.log('  ✅ 3. Detecção de saldo de estoque divergente aprovada (STOCK_MISMATCH / 409).');

  // Teste 4: Nome divergente (Name mismatch)
  const snapshotWithDivergentName = MOCK_AUTHORITATIVE_PRODUCTS.map((p) => {
    if (p.id === 'prod-feijao') {
      return { id: p.id, name: 'Feijão Preto Alterado', currentStock: p.currentStock };
    }
    return { id: p.id, name: p.name, currentStock: p.currentStock };
  });
  const resDivergentName = validateSnapshotAgainstAuthoritativeProducts(snapshotWithDivergentName, MOCK_AUTHORITATIVE_PRODUCTS);
  assert.strictEqual(resDivergentName.valid, false, 'Nome divergente deve invalidar o snapshot');
  assert.strictEqual(resDivergentName.error?.code, 'STALE_INVENTORY_CONTEXT');
  assert.strictEqual(resDivergentName.error?.details?.reason, 'NAME_MISMATCH');
  console.log('  ✅ 4. Detecção de nome de produto divergente aprovada (NAME_MISMATCH / 409).');

  // Teste 5: Snapshot incompleto
  const snapshotIncomplete = MOCK_AUTHORITATIVE_PRODUCTS.slice(0, 5).map((p) => ({
    id: p.id,
    name: p.name,
    currentStock: p.currentStock,
  }));
  const resIncomplete = validateSnapshotAgainstAuthoritativeProducts(snapshotIncomplete, MOCK_AUTHORITATIVE_PRODUCTS);
  assert.strictEqual(resIncomplete.valid, false, 'Snapshot incompleto deve ser rejeitado');
  assert.strictEqual(resIncomplete.error?.code, 'INVALID_SNAPSHOT');
  assert.strictEqual(resIncomplete.error?.details?.reason, 'INCOMPLETE_SNAPSHOT');
  console.log('  ✅ 5. Rejeição de snapshot incompleto aprovada (INVALID_SNAPSHOT).');

  // Teste 6: Contexto válido
  const snapshotValid = MOCK_AUTHORITATIVE_PRODUCTS.map((p) => ({
    id: p.id,
    name: p.name,
    currentStock: p.currentStock,
  }));
  const resValid = validateSnapshotAgainstAuthoritativeProducts(snapshotValid, MOCK_AUTHORITATIVE_PRODUCTS);
  assert.strictEqual(resValid.valid, true, 'Snapshot idêntico ao Firestore deve ser válido');
  assert.strictEqual(resValid.error, undefined);
  console.log('  ✅ 6. Validação de contexto idêntico e consistente aprovada.');

  // Teste 7: Execução de cálculo determinístico autoritativo no backend
  const prompt = 'Qual o estoque atual de arroz?';
  const calculation = executeAuthoritativeCalculation(prompt, MOCK_AUTHORITATIVE_PRODUCTS);
  assert.strictEqual(calculation.contextValidated, true, 'Contexto deve ser marcado como validado');
  assert(calculation.summary.includes('107 kg'), 'Cálculo autoritativo deve refletir o saldo exato de 107 kg do Firestore');
  console.log('  ✅ 7. Execução determinística autoritativa no backend aprovada.');

  // Teste 8: Parser de documento do Firestore REST
  const sampleFirestoreDoc = {
    name: 'projects/p/databases/d/documents/products/prod-arroz',
    fields: {
      id: { stringValue: 'prod-arroz' },
      name: { stringValue: 'Arroz Branco Tipo 1' },
      currentStock: { integerValue: '107' },
      minStock: { integerValue: '50' },
      unit: { stringValue: 'kg' },
      dailyAvgConsumption: { doubleValue: 12.0 },
      location: { stringValue: 'Palete A' },
    },
  };
  const parsedProduct = parseFirestoreProductDoc(sampleFirestoreDoc);
  assert.strictEqual(parsedProduct.id, 'prod-arroz');
  assert.strictEqual(parsedProduct.currentStock, 107);
  assert.strictEqual(parsedProduct.minStock, 50);
  assert.strictEqual(parsedProduct.unit, 'kg');
  console.log('  ✅ 8. Parser de dados nativos REST do Firestore aprovado.');

  // Teste 9: Token de teste reconhecido
  const resTestToken = await verifyFirebaseToken('test-token-admin');
  assert(resTestToken !== null, 'Token de teste deve ser validado');
  assert.strictEqual(resTestToken?.email, 'estoquecristolandia@gmail.com');
  console.log('  ✅ 9. Validação de credencial autorizada aprovada.');

  console.log('\n🎯 Todos os 9 testes de autoridade de IA & backend passaram com sucesso!\n');
}

runTests().catch((err) => {
  console.error('❌ Falha na suíte de testes de IA & backend:', err);
  process.exit(1);
});
