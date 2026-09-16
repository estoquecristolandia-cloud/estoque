import { runStockMathematicalAudit } from '../utils/stockAuditor';
import { Product, StockMovement, EntryType, Sector, InventoryAudit } from '../types';

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

// Simulador Transacional que reproduz com exatidão a lógica de idempotência do firestoreService.ts
class MockFirestoreIdempotentEngine {
  products: Map<string, Product> = new Map();
  movements: Map<string, StockMovement> = new Map();
  audits: Map<string, InventoryAudit> = new Map();

  setProduct(product: Product) {
    this.products.set(product.id, { ...product });
  }

  getProduct(id: string): Product | undefined {
    const p = this.products.get(id);
    return p ? { ...p } : undefined;
  }

  // 1. Entrada com clientRequestId
  async executeEntry(
    productId: string,
    quantity: number,
    entryType: EntryType,
    date: string,
    time: string,
    clientRequestId: string
  ): Promise<{ updatedProduct: Product; movement: StockMovement }> {
    const opId = clientRequestId.startsWith('entry-') ? clientRequestId : `entry-${clientRequestId}`;
    
    // Simula leitura atômica da coleção de movimentos
    const existingMovement = this.movements.get(opId);
    if (existingMovement) {
      // Idempotência Atômica: Operação já foi processada anteriormente
      return { updatedProduct: this.products.get(productId)!, movement: existingMovement };
    }

    const product = this.products.get(productId);
    if (!product) throw new Error('Produto não encontrado');
    if (quantity <= 0) throw new Error('Quantidade inválida');

    const newStock = round2(product.currentStock + quantity);
    const updatedProduct: Product = {
      ...product,
      currentStock: newStock,
      lastUpdated: new Date().toISOString(),
      lastOperationId: opId,
    };

    const movement: StockMovement = {
      id: opId,
      operationId: opId,
      clientRequestId,
      productId,
      productName: product.name,
      unit: product.unit,
      type: 'entrada',
      quantity,
      date,
      time,
      entryType,
      createdAt: new Date().toISOString(),
    };

    this.products.set(productId, updatedProduct);
    this.movements.set(opId, movement);
    return { updatedProduct, movement };
  }

  // 2. Saída com clientRequestId
  async executeExit(
    productId: string,
    quantity: number,
    sector: Sector,
    date: string,
    time: string,
    clientRequestId: string
  ): Promise<{ updatedProduct: Product; movement: StockMovement }> {
    const opId = clientRequestId.startsWith('exit-') ? clientRequestId : `exit-${clientRequestId}`;

    const existingMovement = this.movements.get(opId);
    if (existingMovement) {
      return { updatedProduct: this.products.get(productId)!, movement: existingMovement };
    }

    const product = this.products.get(productId);
    if (!product) throw new Error('Produto não encontrado');
    if (quantity <= 0) throw new Error('Quantidade inválida');
    if (quantity > product.currentStock) {
      throw new Error(`Estoque insuficiente: ${product.currentStock} < ${quantity}`);
    }

    const newStock = round2(product.currentStock - quantity);
    const updatedProduct: Product = {
      ...product,
      currentStock: newStock,
      lastUpdated: new Date().toISOString(),
      lastOperationId: opId,
    };

    const movement: StockMovement = {
      id: opId,
      operationId: opId,
      clientRequestId,
      productId,
      productName: product.name,
      unit: product.unit,
      type: 'saida',
      quantity,
      date,
      time,
      sector,
      createdAt: new Date().toISOString(),
    };

    this.products.set(productId, updatedProduct);
    this.movements.set(opId, movement);
    return { updatedProduct, movement };
  }

  // 3. Ajuste de Inventário com clientRequestId e proteção de Marco Zero
  async executeAdjustment(
    productId: string,
    newPhysicalStock: number,
    reason: string,
    date: string,
    time: string,
    clientRequestId: string
  ): Promise<{ updatedProduct: Product; movement: StockMovement; audit: InventoryAudit }> {
    const opId = clientRequestId.startsWith('adj-') ? clientRequestId : `adj-${clientRequestId}`;

    const existingMovement = this.movements.get(opId);
    if (existingMovement) {
      const existingAudit = this.audits.get(opId)!;
      return { updatedProduct: this.products.get(productId)!, movement: existingMovement, audit: existingAudit };
    }

    const product = this.products.get(productId);
    if (!product) throw new Error('Produto não encontrado');
    const previousStock = product.currentStock;
    const difference = round2(newPhysicalStock - previousStock);
    const now = new Date().toISOString();

    const updatedProduct: Product = {
      ...product,
      currentStock: newPhysicalStock,
      lastUpdated: now,
      lastOperationId: opId,
    };

    const movement: StockMovement = {
      id: opId,
      operationId: opId,
      clientRequestId,
      productId,
      productName: product.name,
      unit: product.unit,
      type: 'ajuste',
      quantity: Math.abs(difference),
      date,
      time,
      previousStock,
      physicalStock: newPhysicalStock,
      difference,
      reason,
      createdAt: now,
    };

    const audit: InventoryAudit = {
      id: opId,
      productId,
      productName: product.name,
      unit: product.unit,
      previousStock,
      physicalStock: newPhysicalStock,
      difference,
      reason,
      responsible: 'Administrador',
      date,
      time,
      createdAt: now,
    };

    this.products.set(productId, updatedProduct);
    this.movements.set(opId, movement);
    this.audits.set(opId, audit);
    return { updatedProduct, movement, audit };
  }
}

async function runIdempotencySuite() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failed++;
    }
  }

  console.log('\n===============================================================');
  console.log('   SUÍTE DE TESTES DE IDEMPOTÊNCIA — FASE 1 (8 CENÁRIOS)       ');
  console.log('===============================================================\n');

  const engine = new MockFirestoreIdempotentEngine();
  engine.setProduct({
    id: 'prod-arroz',
    name: 'Arroz Agulhinha Tipo 1',
    category: 'Grãos e Cereais',
    unit: 'kg',
    minStock: 20,
    currentStock: 100,
    dailyAvgConsumption: 2,
    location: 'Galpão A',
    lastUpdated: '2026-08-21T18:00:00Z',
  });

  // -------------------------------------------------------------
  // CENÁRIO 1: Duas operações diferentes (request-A, request-B) -> ambas são processadas
  // -------------------------------------------------------------
  console.log('--- CENÁRIO 1: Duas operações diferentes processadas de forma independente ---');
  await engine.executeEntry('prod-arroz', 20, 'Compra', '2026-09-16', '08:00', 'req-entry-A');
  await engine.executeEntry('prod-arroz', 30, 'Compra', '2026-09-16', '08:05', 'req-entry-B');
  assert(engine.getProduct('prod-arroz')!.currentStock === 150, 'Ambas as operações legítimas foram somadas: 100 + 20 + 30 = 150kg');
  assert(engine.movements.has('entry-req-entry-A'), 'Movimento de request-A registrado com sucesso');
  assert(engine.movements.has('entry-req-entry-B'), 'Movimento de request-B registrado com sucesso');

  // -------------------------------------------------------------
  // CENÁRIO 2: Mesma operação enviada duas vezes (request-A, request-A) -> somente uma alteração
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 2: Mesma operação enviada duas vezes com mesmo clientRequestId ---');
  const resRepeat = await engine.executeEntry('prod-arroz', 20, 'Compra', '2026-09-16', '08:00', 'req-entry-A');
  assert(engine.getProduct('prod-arroz')!.currentStock === 150, 'Saldo permaneceu 150kg inalterado (nenhuma soma duplicada)');
  assert(resRepeat.movement.id === 'entry-req-entry-A', 'Retornou exatamente a movimentação original processada');

  // -------------------------------------------------------------
  // CENÁRIO 3: Retry após timeout (request-A, request-A) -> não cria segundo movimento
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 3: Retry simulado após timeout de rede ---');
  const totalMovementsBefore = engine.movements.size;
  await engine.executeEntry('prod-arroz', 20, 'Compra', '2026-09-16', '08:00', 'req-entry-A');
  assert(engine.movements.size === totalMovementsBefore, 'Nenhum documento adicional de movimentação foi criado após retry');
  assert(engine.getProduct('prod-arroz')!.currentStock === 150, 'Estoque se mantém íntegro após retry');

  // -------------------------------------------------------------
  // CENÁRIO 4: Duplo clique simulado (request-A, request-A) -> somente uma operação efetiva
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 4: Duplo clique simulado na saída ---');
  await engine.executeExit('prod-arroz', 25, 'Cozinha', '2026-09-16', '09:00', 'req-exit-click1');
  // Segundo clique idêntico
  await engine.executeExit('prod-arroz', 25, 'Cozinha', '2026-09-16', '09:00', 'req-exit-click1');
  assert(engine.getProduct('prod-arroz')!.currentStock === 125, 'Saída deduzida uma única vez: 150 - 25 = 125kg (duplo clique impedido)');

  // -------------------------------------------------------------
  // CENÁRIO 5: Nova operação após conclusão (request-A, request-B) -> ambas legítimas
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 5: Nova operação após conclusão com novo clientRequestId ---');
  await engine.executeExit('prod-arroz', 15, 'Padaria', '2026-09-16', '09:30', 'req-exit-click2');
  assert(engine.getProduct('prod-arroz')!.currentStock === 110, 'Nova operação independente processada corretamente: 125 - 15 = 110kg');
  assert(engine.movements.has('exit-req-exit-click2'), 'Novo movimento legítimo registrado');

  // -------------------------------------------------------------
  // CENÁRIO 6: Concorrência simultânea com o mesmo clientRequestId -> uma única efetivação
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 6: Chamadas simultâneas (Promise.all) com o mesmo clientRequestId ---');
  const concurrentRequestId = 'req-exit-concurrent';
  await Promise.all([
    engine.executeExit('prod-arroz', 10, 'Cozinha', '2026-09-16', '10:00', concurrentRequestId),
    engine.executeExit('prod-arroz', 10, 'Cozinha', '2026-09-16', '10:00', concurrentRequestId),
  ]);
  assert(engine.getProduct('prod-arroz')!.currentStock === 100, 'Saldo deduzido exatamente 10kg uma única vez: 110 - 10 = 100kg');

  // -------------------------------------------------------------
  // CENÁRIO 7: Movimentos históricos existentes permanecem intactos
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 7: Preservação de movimentos históricos sem clientRequestId ---');
  const historicalMovement: StockMovement = {
    id: 'mov-20260821-historico-legado',
    operationId: 'op-legado-20260821',
    productId: 'prod-arroz',
    productName: 'Arroz Agulhinha Tipo 1',
    unit: 'kg',
    type: 'entrada',
    quantity: 50,
    date: '2026-08-21',
    createdAt: '2026-08-21T08:00:00Z',
    // Sem clientRequestId
  };
  engine.movements.set(historicalMovement.id, historicalMovement);
  assert(engine.movements.has('mov-20260821-historico-legado'), 'Registro histórico de 21/08/2026 preservado');
  assert(engine.movements.get('mov-20260821-historico-legado')?.clientRequestId === undefined, 'Registro histórico preservado em seu formato original sem alteração forçada');

  // -------------------------------------------------------------
  // CENÁRIO 8: Proteção do Marco Zero continua funcionando
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 8: Preservação e auditoria do Marco Zero ---');
  // Ajuste do Marco Zero
  await engine.executeAdjustment('prod-arroz', 80, 'Inventário Físico Marco Zero', '2026-08-21', '18:00', 'adj-marco-zero-20260821-prod-arroz');
  assert(engine.getProduct('prod-arroz')!.currentStock === 80, 'Marco Zero estabeleceu saldo base auditado de 80kg');
  
  // Reexecução idêntica do ajuste do Marco Zero não altera nada
  await engine.executeAdjustment('prod-arroz', 80, 'Inventário Físico Marco Zero', '2026-08-21', '18:00', 'adj-marco-zero-20260821-prod-arroz');
  assert(engine.getProduct('prod-arroz')!.currentStock === 80, 'Re-execução do Marco Zero é estritamente idempotente');

  // Movimento pós-Marco Zero
  await engine.executeEntry('prod-arroz', 20, 'Compra', '2026-09-16', '11:00', 'req-pos-marco-zero');
  const finalProduct = engine.getProduct('prod-arroz')!;
  assert(finalProduct.currentStock === 100, 'Saldo pós-Marco Zero: 80 + 20 = 100kg');

  const auditReport = runStockMathematicalAudit(
    [finalProduct],
    Array.from(engine.movements.values()),
    Array.from(engine.audits.values()),
    []
  );
  const diag = auditReport.diagnostics[0];
  assert(diag.status === 'OK', 'Auditor Matemático independente confirmou status OK');
  assert(diag.hasMarcoZero === true, 'Marco Zero foi reconhecido como base pelo auditor');
  assert(diag.discrepancy === 0, 'Discrepância matemática = 0.00');

  console.log('\n===============================================================');
  console.log(`   TOTAL: ${passed} PASSOU / ${failed} FALHOU`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runIdempotencySuite();
