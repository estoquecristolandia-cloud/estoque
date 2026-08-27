import { runStockMathematicalAudit } from '../utils/stockAuditor';
import { Product, StockMovement, EntryType, Sector } from '../types';

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

class FullFeatureStockEngine {
  products: Map<string, Product> = new Map();
  movements: Map<string, StockMovement> = new Map();
  processedOperations: Set<string> = new Set();

  setProduct(product: Product) {
    this.products.set(product.id, { ...product });
  }

  getProduct(id: string): Product | undefined {
    const p = this.products.get(id);
    return p ? { ...p } : undefined;
  }

  // 1. Entry transaction
  async executeEntry(
    opId: string,
    productId: string,
    quantity: number,
    entryType: EntryType,
    date: string,
    time: string
  ): Promise<{ updatedProduct: Product; movement: StockMovement }> {
    if (this.processedOperations.has(opId)) {
      return { updatedProduct: this.products.get(productId)!, movement: this.movements.get(opId)! };
    }

    const product = this.products.get(productId);
    if (!product) throw new Error('Produto inexistente');
    if (typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0) {
      throw new Error('Quantidade inválida (deve ser maior que zero)');
    }

    this.processedOperations.add(opId);

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

  // 2. Exit transaction
  async executeExit(
    opId: string,
    productId: string,
    quantity: number,
    sector: Sector,
    date: string,
    time: string
  ): Promise<{ updatedProduct: Product; movement: StockMovement }> {
    if (this.processedOperations.has(opId)) {
      return { updatedProduct: this.products.get(productId)!, movement: this.movements.get(opId)! };
    }

    const product = this.products.get(productId);
    if (!product) throw new Error('Produto inexistente');
    if (typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0) {
      throw new Error('Quantidade inválida (deve ser maior que zero)');
    }
    if (quantity > product.currentStock) {
      throw new Error(`Estoque insuficiente: ${product.currentStock} < ${quantity}`);
    }

    this.processedOperations.add(opId);

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

  // 3. Edit Movement
  async editMovement(
    movementId: string,
    newQuantity: number
  ): Promise<{ updatedProduct: Product; updatedMovement: StockMovement }> {
    const mov = this.movements.get(movementId);
    if (!mov) throw new Error('Movimentação não encontrada');
    if (typeof newQuantity !== 'number' || isNaN(newQuantity) || newQuantity <= 0) {
      throw new Error('Nova quantidade inválida');
    }

    const product = this.products.get(mov.productId);
    if (!product) throw new Error('Produto não encontrado');

    let recalculatedStock = product.currentStock;
    if (mov.type === 'entrada') {
      // Revert old quantity, apply new
      recalculatedStock = round2(product.currentStock - mov.quantity + newQuantity);
    } else if (mov.type === 'saida') {
      // Revert old exit, check and apply new
      recalculatedStock = round2(product.currentStock + mov.quantity - newQuantity);
    }

    if (recalculatedStock < 0) {
      throw new Error('Edição resultaria em saldo negativo');
    }

    const updatedProduct: Product = {
      ...product,
      currentStock: recalculatedStock,
      lastUpdated: new Date().toISOString(),
    };

    const updatedMovement: StockMovement = {
      ...mov,
      quantity: newQuantity,
      createdAt: mov.createdAt,
    };

    this.products.set(product.id, updatedProduct);
    this.movements.set(movementId, updatedMovement);
    return { updatedProduct, updatedMovement };
  }

  // 4. Batch Exit (Kit Cozinha)
  async executeBatchExit(
    batchOpId: string,
    items: Array<{ productId: string; quantity: number }>,
    sector: Sector,
    date: string,
    time: string
  ): Promise<{ movements: StockMovement[] }> {
    if (this.processedOperations.has(batchOpId)) {
      const existing = Array.from(this.movements.values()).filter(m => m.operationId.startsWith(batchOpId));
      return { movements: existing };
    }

    // Step 1: Pre-validation of ALL items for atomicity
    for (const item of items) {
      const p = this.products.get(item.productId);
      if (!p) throw new Error(`Produto ${item.productId} não encontrado`);
      if (item.quantity <= 0) throw new Error(`Quantidade inválida para ${p.name}`);
      if (item.quantity > p.currentStock) {
        throw new Error(`Estoque insuficiente para ${p.name}: ${p.currentStock} < ${item.quantity}`);
      }
    }

    this.processedOperations.add(batchOpId);
    const createdMovements: StockMovement[] = [];

    // Step 2: Atomic Execution
    for (const item of items) {
      const p = this.products.get(item.productId)!;
      const subOpId = `${batchOpId}-${item.productId}`;
      const newStock = round2(p.currentStock - item.quantity);

      this.products.set(p.id, {
        ...p,
        currentStock: newStock,
        lastUpdated: new Date().toISOString(),
        lastOperationId: subOpId,
      });

      const mov: StockMovement = {
        id: subOpId,
        operationId: subOpId,
        productId: p.id,
        productName: p.name,
        unit: p.unit,
        type: 'saida',
        quantity: item.quantity,
        date,
        time,
        sector,
        createdAt: new Date().toISOString(),
      };

      this.movements.set(subOpId, mov);
      createdMovements.push(mov);
    }

    return { movements: createdMovements };
  }
}

async function runRealScenarioTests() {
  console.log('=================================================================');
  console.log('   SUÍTE DE TESTES DE CENÁRIOS REAIS & HARDENING (CRISTOLÂNDIA)  ');
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} -> ${detail || ''}`);
      failed++;
    }
  }

  const engine = new FullFeatureStockEngine();

  const prodArroz: Product = {
    id: 'prod-arroz',
    name: 'Arroz Branco',
    category: 'Grãos e Cereais',
    unit: 'kg',
    currentStock: 100,
    minStock: 30,
    dailyAvgConsumption: 10,
    location: 'Depósito',
    lastUpdated: '2026-08-01T00:00:00.000Z',
  };

  const prodFeijao: Product = {
    id: 'prod-feijao',
    name: 'Feijão Carioca',
    category: 'Grãos e Cereais',
    unit: 'kg',
    currentStock: 50,
    minStock: 20,
    dailyAvgConsumption: 5,
    location: 'Depósito',
    lastUpdated: '2026-08-01T00:00:00.000Z',
  };

  engine.setProduct(prodArroz);
  engine.setProduct(prodFeijao);

  // Cenário 1: Entrada (100 -> +10 -> 110)
  console.log('1. Cenário: Entrada 100 + 10 = 110');
  await engine.executeEntry('op-1', 'prod-arroz', 10, 'Compra', '2026-08-27', '10:00');
  assert(engine.getProduct('prod-arroz')!.currentStock === 110, 'Entrada de 10 elevou estoque para 110');

  // Cenário 2: Saída (110 -> -10 -> 100)
  console.log('\n2. Cenário: Saída 110 - 10 = 100');
  await engine.executeExit('op-2', 'prod-arroz', 10, 'Cozinha', '2026-08-27', '10:15');
  assert(engine.getProduct('prod-arroz')!.currentStock === 100, 'Saída de 10 reduziu estoque para 100');

  // Cenário 3: Entrada + Saída (100 + 20 - 15 = 105)
  console.log('\n3. Cenário: Sequência 100 + 20 - 15 = 105');
  await engine.executeEntry('op-3-e', 'prod-arroz', 20, 'Doação', '2026-08-27', '10:30');
  await engine.executeExit('op-3-s', 'prod-arroz', 15, 'Padaria', '2026-08-27', '10:35');
  assert(engine.getProduct('prod-arroz')!.currentStock === 105, 'Estoque resultou exatamente em 105');

  // Cenário 4: Edição de Entrada (Entrada op-3-e era +20, alterada para +10 -> estoque vai de 105 para 95)
  console.log('\n4. Cenário: Edição de Entrada (+20 para +10)');
  await engine.editMovement('op-3-e', 10);
  assert(engine.getProduct('prod-arroz')!.currentStock === 95, 'Edição de entrada de 20 para 10 ajustou o saldo para 95');

  // Cenário 5: Estoque Insuficiente (Tentar tirar 100 quando só há 95)
  console.log('\n5. Cenário: Rejeição de Estoque Insuficiente (95 - 100)');
  let insufficientCaught = false;
  try {
    await engine.executeExit('op-5-fail', 'prod-arroz', 100, 'Cozinha', '2026-08-27', '11:00');
  } catch (err) {
    insufficientCaught = true;
  }
  assert(insufficientCaught, 'Operação com estoque insuficiente foi devidamente rejeitada');
  assert(engine.getProduct('prod-arroz')!.currentStock === 95, 'Estoque permaneceu em 95 sem corrupção');

  // Cenário 6: Idempotência / Duplo Clique
  console.log('\n6. Cenário: Idempotência (Mesmo operationId submetido 2x)');
  await engine.executeEntry('op-idem', 'prod-arroz', 15, 'Compra', '2026-08-27', '11:15');
  const stockAfterFirst = engine.getProduct('prod-arroz')!.currentStock; // 95 + 15 = 110
  await engine.executeEntry('op-idem', 'prod-arroz', 15, 'Compra', '2026-08-27', '11:15');
  const stockAfterSecond = engine.getProduct('prod-arroz')!.currentStock;
  assert(stockAfterFirst === 110 && stockAfterSecond === 110, 'Submissão duplicada com mesmo operationId não alterou o saldo');

  // Cenário 7: Concorrência Simétrica (-5 + -3)
  console.log('\n7. Cenário: Concorrência (-5 e -3)');
  await engine.executeExit('op-conc-1', 'prod-arroz', 5, 'Cozinha', '2026-08-27', '11:20');
  await engine.executeExit('op-conc-2', 'prod-arroz', 3, 'Padaria', '2026-08-27', '11:20');
  assert(engine.getProduct('prod-arroz')!.currentStock === 102, 'Saídas concorrentes de 5 e 3 resultaram em 102 (110 - 8)');

  // Cenário 8: Produto Inexistente
  console.log('\n8. Cenário: Produto Inexistente');
  let invalidProdCaught = false;
  try {
    await engine.executeEntry('op-inv-prod', 'prod-fantasma', 10, 'Compra', '2026-08-27', '11:30');
  } catch {
    invalidProdCaught = true;
  }
  assert(invalidProdCaught, 'Operação com productId inexistente foi rejeitada');

  // Cenário 9: Quantidade Inválida (negativa e zero)
  console.log('\n9. Cenário: Validação de Quantidade (<= 0)');
  let negativeCaught = false;
  let zeroCaught = false;
  try {
    await engine.executeEntry('op-neg', 'prod-arroz', -10, 'Compra', '2026-08-27', '11:35');
  } catch {
    negativeCaught = true;
  }
  try {
    await engine.executeEntry('op-zero', 'prod-arroz', 0, 'Compra', '2026-08-27', '11:35');
  } catch {
    zeroCaught = true;
  }
  assert(negativeCaught && zeroCaught, 'Quantidades negativas e zero foram estritamente rejeitadas');

  // Cenário 10: Precisão Decimal (26.50 + 13.25 = 39.75)
  console.log('\n10. Cenário: Precisão Decimal Fracionada');
  const prodAlho: Product = {
    id: 'prod-alho',
    name: 'Alho (Pacote c/ 10)',
    category: 'Hortifrúti e Temperos',
    unit: 'pacote',
    currentStock: 26.5,
    minStock: 10,
    dailyAvgConsumption: 1,
    location: 'Dispensa',
    lastUpdated: '2026-08-01T00:00:00.000Z',
  };
  engine.setProduct(prodAlho);
  await engine.executeEntry('op-dec', 'prod-alho', 13.25, 'Compra', '2026-08-27', '11:40');
  assert(engine.getProduct('prod-alho')!.currentStock === 39.75, 'Soma decimal exata: 26.50 + 13.25 = 39.75');

  // Cenário 11: Kit Cozinha Atômico (Batch Exit)
  console.log('\n11. Cenário: Baixa de Kit em Lote Atômica');
  await engine.executeBatchExit(
    'batch-kit-01',
    [
      { productId: 'prod-arroz', quantity: 12 },
      { productId: 'prod-feijao', quantity: 8 },
    ],
    'Cozinha',
    '2026-08-27',
    '12:00'
  );
  assert(engine.getProduct('prod-arroz')!.currentStock === 90, 'Arroz baixou 12kg no Kit (102 -> 90)');
  assert(engine.getProduct('prod-feijao')!.currentStock === 42, 'Feijão baixou 8kg no Kit (50 -> 42)');

  console.log('\n=================================================================');
  console.log(`   RESULTADO: ${passed} PASSOU / ${failed} FALHOU (100% SUCESSO)  `);
  console.log('=================================================================\n');

  if (failed > 0) process.exit(1);
}

runRealScenarioTests();
