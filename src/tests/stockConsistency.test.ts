import { runStockMathematicalAudit } from '../utils/stockAuditor';
import { Product, StockMovement, EntryType, Sector, InventoryAudit } from '../types';

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

// In-memory atomic transaction simulation mirroring firestoreService.ts logic
class MockFirestoreStockEngine {
  products: Map<string, Product> = new Map();
  movements: Map<string, StockMovement> = new Map();
  audits: Map<string, InventoryAudit> = new Map();
  processedOperations: Set<string> = new Set();

  setProduct(product: Product) {
    this.products.set(product.id, { ...product });
  }

  getProduct(id: string): Product | undefined {
    const p = this.products.get(id);
    return p ? { ...p } : undefined;
  }

  // 1. Entrada transaction
  async executeEntry(
    opId: string,
    productId: string,
    quantity: number,
    entryType: EntryType,
    date: string,
    time: string
  ): Promise<{ updatedProduct: Product; movement: StockMovement }> {
    if (this.processedOperations.has(opId)) {
      // Idempotency: Return existing state without re-applying
      const existingMov = this.movements.get(opId)!;
      return { updatedProduct: this.products.get(productId)!, movement: existingMov };
    }
    this.processedOperations.add(opId);

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

  // 2. Saída transaction
  async executeExit(
    opId: string,
    productId: string,
    quantity: number,
    sector: Sector,
    date: string,
    time: string
  ): Promise<{ updatedProduct: Product; movement: StockMovement }> {
    if (this.processedOperations.has(opId)) {
      const existingMov = this.movements.get(opId)!;
      return { updatedProduct: this.products.get(productId)!, movement: existingMov };
    }
    this.processedOperations.add(opId);

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

  // 3. Update Product Catalog without touching currentStock
  async updateCatalog(productId: string, catalogUpdates: Partial<Product>) {
    const product = this.products.get(productId);
    if (!product) throw new Error('Produto não encontrado');
    
    // Explicitly exclude currentStock from catalog updates
    const { currentStock, lastOperationId, ...safeCatalog } = catalogUpdates as any;
    const updated = {
      ...product,
      ...safeCatalog,
      currentStock: product.currentStock, // untouched!
      lastUpdated: new Date().toISOString(),
    };
    this.products.set(productId, updated);
    return updated;
  }

  // 4. Revert / Delete Movement
  async deleteMovement(movementId: string) {
    const mov = this.movements.get(movementId);
    if (!mov) throw new Error('Movimentação não encontrada');
    const product = this.products.get(mov.productId);
    if (!product) throw new Error('Produto não encontrado');

    const restoredStock = round2(
      mov.type === 'entrada' ? product.currentStock - mov.quantity : product.currentStock + mov.quantity
    );
    if (restoredStock < 0) throw new Error('Estoque ficaria negativo');

    const updatedProduct = {
      ...product,
      currentStock: restoredStock,
      lastUpdated: new Date().toISOString(),
    };

    this.products.set(product.id, updatedProduct);
    this.movements.delete(movementId);
    return { updatedProduct, deletedMovementId: movementId };
  }

  // 5. Inventory Adjustment / Marco Zero
  async executeAdjustment(
    opId: string,
    productId: string,
    physicalStock: number,
    reason: string,
    date: string,
    time: string
  ) {
    const product = this.products.get(productId);
    if (!product) throw new Error('Produto não encontrado');
    if (physicalStock < 0) throw new Error('Estoque não pode ser negativo');

    const current = product.currentStock;
    const diff = round2(physicalStock - current);

    const movement: StockMovement = {
      id: opId,
      operationId: opId,
      productId,
      productName: product.name,
      unit: product.unit,
      type: 'ajuste',
      quantity: Math.abs(diff),
      date,
      time,
      reason,
      previousStock: current,
      physicalStock,
      difference: diff,
      createdAt: new Date().toISOString(),
    };

    const audit: InventoryAudit = {
      id: opId,
      productId,
      productName: product.name,
      unit: product.unit,
      previousStock: current,
      physicalStock,
      difference: diff,
      reason,
      responsible: 'Administrador',
      date,
      time,
      createdAt: new Date().toISOString(),
    };

    const updatedProduct = {
      ...product,
      currentStock: physicalStock,
      lastUpdated: new Date().toISOString(),
      lastOperationId: opId,
    };

    this.products.set(productId, updatedProduct);
    this.movements.set(opId, movement);
    this.audits.set(opId, audit);

    return { updatedProduct, movement, audit };
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('   AUDITORIA TÉCNICA E TESTES DO MOTOR DE ESTOQUE (FASE 7)   ');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${details || ''}`);
      failed++;
    }
  }

  const engine = new MockFirestoreStockEngine();

  // Initial Seed Product
  const feijao: Product = {
    id: 'prod-feijao',
    name: 'Feijão Carioca',
    category: 'Grãos e Cereais',
    unit: 'kg',
    currentStock: 0,
    minStock: 27,
    dailyAvgConsumption: 9,
    location: 'Depósito',
    lastUpdated: '2026-08-01T00:00:00.000Z',
  };

  const arroz: Product = {
    id: 'prod-arroz',
    name: 'Arroz Branco Tipo 1',
    category: 'Grãos e Cereais',
    unit: 'kg',
    currentStock: 0,
    minStock: 30,
    dailyAvgConsumption: 10,
    location: 'Depósito',
    lastUpdated: '2026-08-01T00:00:00.000Z',
  };

  engine.setProduct(feijao);
  engine.setProduct(arroz);

  console.log('--- TESTE 1: Entrada Normal ---');
  await engine.executeEntry('op-e1', 'prod-feijao', 100, 'Compra', '2026-08-10', '08:00');
  const p1 = engine.getProduct('prod-feijao')!;
  assert(p1.currentStock === 100, 'Entrada de 100kg atualizou currentStock de 0 para 100');

  console.log('\n--- TESTE 2: Saída Normal ---');
  await engine.executeExit('op-s1', 'prod-feijao', 30, 'Cozinha', '2026-08-11', '10:00');
  const p2 = engine.getProduct('prod-feijao')!;
  assert(p2.currentStock === 70, 'Saída de 30kg atualizou currentStock de 100 para 70');

  console.log('\n--- TESTE 3: Duas Saídas Concorrentes / Sequenciais com Validação de Saldo ---');
  await engine.executeExit('op-s2', 'prod-feijao', 40, 'Cozinha', '2026-08-12', '09:00');
  const p3 = engine.getProduct('prod-feijao')!;
  assert(p3.currentStock === 30, 'Primeira saída de 40kg reduziu saldo para 30kg');

  let failedInsufficient = false;
  try {
    // Tenta retirar 35kg quando só restam 30kg
    await engine.executeExit('op-s3-fail', 'prod-feijao', 35, 'Cozinha', '2026-08-12', '09:01');
  } catch (e: any) {
    failedInsufficient = true;
  }
  assert(failedInsufficient, 'Segunda saída concorrente de 35kg foi BLOQUEADA por saldo insuficiente (prevenção de saldo negativo)');
  assert(engine.getProduct('prod-feijao')!.currentStock === 30, 'Saldo preservou 30kg íntegros sem corrupção');

  console.log('\n--- TESTE 4: Entrada e Saída Sequenciais / Concorrentes ---');
  await engine.executeEntry('op-e2', 'prod-feijao', 50, 'Doação', '2026-08-13', '14:00');
  await engine.executeExit('op-s4', 'prod-feijao', 20, 'Padaria', '2026-08-13', '14:05');
  const p4 = engine.getProduct('prod-feijao')!;
  assert(p4.currentStock === 60, 'Saldo após +50kg e -20kg resultou exatamente em 60kg (30 + 50 - 20)');

  console.log('\n--- TESTE 5: Duplo-Clique / Repetição de Submissão com Idempotência ---');
  // Tentando executar 'op-e2' novamente com mesmos parâmetros
  await engine.executeEntry('op-e2', 'prod-feijao', 50, 'Doação', '2026-08-13', '14:00');
  const p5 = engine.getProduct('prod-feijao')!;
  assert(p5.currentStock === 60, 'Re-execução com mesmo operationId não duplicou o estoque (idempotência confirmada)');

  console.log('\n--- TESTE 6: Edição Cadastral durante Movimentação ---');
  // Usuário altera nome, categoria e localização do produto sem tocar em currentStock
  await engine.updateCatalog('prod-feijao', {
    name: 'Feijão Carioca Extra Selecionado',
    location: 'Depósito - Prateleira A1',
    alertDays: 5,
    currentStock: 9999, // payload antigo simulado
  });
  const p6 = engine.getProduct('prod-feijao')!;
  assert(p6.name === 'Feijão Carioca Extra Selecionado', 'Nome cadastral atualizado com sucesso');
  assert(p6.currentStock === 60, 'currentStock permaneceu 60kg intocado e imune a sobrescrita por edição de cadastro');

  console.log('\n--- TESTE 7: Estorno de Movimentação (Exclusão) ---');
  // Estorna a saída de 20kg (op-s4)
  await engine.deleteMovement('op-s4');
  const p7 = engine.getProduct('prod-feijao')!;
  assert(p7.currentStock === 80, 'Estorno da saída op-s4 restabeleceu o saldo para 80kg (60 + 20)');

  console.log('\n--- TESTE 8: Marco Zero / Ajuste Físico de Inventário ---');
  // Realiza balanço físico auditado: apura 24kg reais em 19/08/2026
  await engine.executeAdjustment('op-marco-zero', 'prod-feijao', 24, 'Inventário Físico Oficial - Marco Zero', '2026-08-19', '18:00');
  const p8 = engine.getProduct('prod-feijao')!;
  assert(p8.currentStock === 24, 'Marco Zero estabeleceu o saldo físico em 24kg com registro de auditoria');

  // Adiciona movimentação pós-Marco Zero: Entrada de 10kg
  await engine.executeEntry('op-pos-e1', 'prod-feijao', 10, 'Compra', '2026-08-20', '09:00');
  // Adiciona saída pós-Marco Zero: Saída de 4kg
  await engine.executeExit('op-pos-s1', 'prod-feijao', 4, 'Cozinha', '2026-08-20', '11:00');
  const p8Final = engine.getProduct('prod-feijao')!;
  assert(p8Final.currentStock === 30, 'Saldo pós-Marco Zero calculado: 24 (Marco Zero) + 10 (entrada) - 4 (saída) = 30kg');

  console.log('\n--- TESTE 9: Verificação pelo Módulo de Auditoria Matemática ---');
  const auditReport = runStockMathematicalAudit(
    [p8Final],
    Array.from(engine.movements.values()),
    Array.from(engine.audits.values()),
    []
  );

  const diag = auditReport.diagnostics[0];
  assert(diag.status === 'OK', 'Auditor Matemático reportou status OK');
  assert(diag.hasMarcoZero === true, 'Auditor detectou e ancorou no Marco Zero');
  assert(diag.marcoZeroStock === 24, 'Auditor registrou base de 24kg no Marco Zero');
  assert(diag.totalEntries === 10, 'Auditor computou 10kg de entradas pós-Marco Zero');
  assert(diag.totalExits === 4, 'Auditor computou 4kg de saídas pós-Marco Zero');
  assert(diag.reconstructedBalance === 30, 'Auditor reconstruiu saldo exato de 30kg');
  assert(diag.discrepancy === 0, 'Discrepância matemática igual a 0.00');

  console.log('\n===============================================================');
  console.log(`   RESULTADO FINAL DOS TESTES: ${passed} PASSOU / ${failed} FALHOU   `);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
