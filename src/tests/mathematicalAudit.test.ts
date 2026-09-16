/**
 * BATERIA DE TESTES OBRIGATÓRIA DA FASE 2:
 * AUDITORIA MATEMÁTICA INDEPENDENTE E INTEGRIDADE DO ESTOQUE
 * Cristolândia LEM/BA
 *
 * Cobertura de todos os 18 cenários obrigatórios:
 * 1. Reconstrução exata com apenas Marco Zero.
 * 2. Reconstrução com Marco Zero + entradas.
 * 3. Reconstrução com Marco Zero + saídas.
 * 4. Reconstrução com Marco Zero + ajustes positivos.
 * 5. Reconstrução com Marco Zero + ajustes negativos.
 * 6. Reconstrução com mistura de entradas, saídas e ajustes.
 * 7. Detecção de divergência quando currentStock for diferente do reconstruído.
 * 8. Detecção de duplicidade de id.
 * 9. Detecção de duplicidade de operationId.
 * 10. Detecção de duplicidade de clientRequestId.
 * 11. Movimentação órfã (produto inexistente).
 * 12. Movimentação com tipo inválido.
 * 13. Movimentação com quantidade zero ou negativa.
 * 14. Ajuste com quantity != abs(difference).
 * 15. Movimentações anteriores ao Marco Zero não alterando o saldo pós-Marco Zero.
 * 16. Movimento de implantação do Marco Zero não duplicando o saldo inicial.
 * 17. Preservação de histórico com operação compensatória (sem apagar movimento original).
 * 18. Compensação idempotente (mesmo clientRequestId não duplica o estorno).
 */

import { Product, StockMovement, InventoryAudit } from '../types';
import { runStockMathematicalAudit, round2, OFFICIAL_MARCO_ZERO } from '../utils/stockAuditor';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

// Simulador atômico em memória para operações de compensação e idempotência
class MockStockDatabase {
  products = new Map<string, Product>();
  movements = new Map<string, StockMovement>();

  addProduct(product: Product) {
    this.products.set(product.id, { ...product });
  }

  addMovement(movement: StockMovement) {
    this.movements.set(movement.id, { ...movement });
  }

  // Protocolo seguro de compensação atômica da Fase 2
  async compensateMovement(movementId: string, reason?: string, clientRequestId?: string) {
    if (movementId.startsWith('adj-marco-zero-20260821-') || movementId.startsWith('adj-20260821-')) {
      throw new Error('Marco Zero é imutável e não pode ser compensado.');
    }

    const compId = clientRequestId || `comp-${movementId}`;

    // Idempotência
    if (this.movements.has(compId)) {
      return {
        updatedProduct: this.products.get(this.movements.get(movementId)!.productId)!,
        compensationMovement: this.movements.get(compId)!,
      };
    }

    const orig = this.movements.get(movementId);
    if (!orig) throw new Error('Movimento original não encontrado');
    if (orig.isCompensated) throw new Error('Movimento já compensado');

    const prod = this.products.get(orig.productId);
    if (!prod) throw new Error('Produto não encontrado');

    let reverseImpact = 0;
    let reverseType: 'entrada' | 'saida' | 'ajuste' = 'saida';
    let reverseDiff: number | undefined = undefined;

    if (orig.type === 'entrada') {
      reverseImpact = -orig.quantity;
      reverseType = 'saida';
    } else if (orig.type === 'saida') {
      reverseImpact = orig.quantity;
      reverseType = 'entrada';
    } else if (orig.type === 'ajuste') {
      const diff = orig.difference !== undefined ? orig.difference : 0;
      reverseImpact = -diff;
      reverseType = 'ajuste';
      reverseDiff = -diff;
    }

    const restoredStock = round2(prod.currentStock + reverseImpact);
    if (restoredStock < 0) throw new Error('Saldo ficaria negativo');

    const compMovement: StockMovement = {
      id: compId,
      operationId: compId,
      clientRequestId: compId,
      productId: prod.id,
      productName: prod.name,
      unit: prod.unit,
      type: reverseType,
      quantity: Math.abs(reverseDiff !== undefined ? reverseDiff : orig.quantity),
      difference: reverseDiff,
      date: '2026-08-25',
      time: '12:00',
      sector: 'Outros',
      notes: `[Compensação do movimento ${movementId}]: ${reason || 'Estorno'}`,
      compensatesMovementId: movementId,
      movementRole: 'compensation',
      createdAt: '2026-08-25T12:00:00Z',
    };

    const updatedOrig: StockMovement = {
      ...orig,
      isCompensated: true,
      compensatedByMovementId: compId,
    };

    const updatedProduct: Product = {
      ...prod,
      currentStock: restoredStock,
      lastUpdated: '2026-08-25T12:00:00Z',
    };

    // Histórico é 100% preservado: o original NÃO é apagado
    this.movements.set(orig.id, updatedOrig);
    this.movements.set(compId, compMovement);
    this.products.set(prod.id, updatedProduct);

    return { updatedProduct, compensationMovement: compMovement };
  }
}

async function runPhase2AuditTestSuite() {
  console.log('===============================================================');
  console.log('   BATERIA DE TESTES DA FASE 2: AUDITORIA MATEMÁTICA           ');
  console.log('===============================================================');

  // -------------------------------------------------------------
  // CENÁRIO 1: Reconstrução exata com apenas Marco Zero
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 1: Reconstrução exata com apenas Marco Zero ---');
  {
    const prodArroz: Product = {
      id: 'prod-arroz',
      name: 'Arroz Branco',
      category: 'Grãos e Cereais',
      unit: 'kg',
      currentStock: 107,
      minStock: 50,
      idealStock: 100,
      dailyAvgConsumption: 5,
      location: 'Palete A',
      lastUpdated: '2026-08-21T17:30:00Z',
    };
    const report = runStockMathematicalAudit([prodArroz], []);
    const diag = report.diagnostics[0];

    assert(diag.status === 'OK', 'Status OK com apenas Marco Zero');
    assert(diag.hasMarcoZero === true, 'Reconheceu Marco Zero oficial');
    assert(diag.marcoZeroStock === 107, 'Marco Zero oficial ancorado em 107kg');
    assert(diag.reconstructedBalance === 107, 'Saldo reconstruído exatamente igual a 107kg');
    assert(diag.discrepancy === 0, 'Discrepância zero');
  }

  // -------------------------------------------------------------
  // CENÁRIO 2: Reconstrução com Marco Zero + entradas
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 2: Reconstrução com Marco Zero + entradas ---');
  {
    const prodArroz: Product = {
      id: 'prod-arroz',
      name: 'Arroz Branco',
      category: 'Grãos e Cereais',
      unit: 'kg',
      currentStock: 157, // 107 + 50
      minStock: 50,
      idealStock: 100,
      dailyAvgConsumption: 5,
      location: 'Palete A',
      lastUpdated: '2026-08-22T10:00:00Z',
    };
    const movEntrada: StockMovement = {
      id: 'mov-e1',
      productId: 'prod-arroz',
      productName: 'Arroz Branco',
      unit: 'kg',
      type: 'entrada',
      quantity: 50,
      date: '2026-08-22',
      time: '10:00',
      createdAt: '2026-08-22T10:00:00Z',
    };

    const report = runStockMathematicalAudit([prodArroz], [movEntrada]);
    const diag = report.diagnostics[0];

    assert(diag.status === 'OK', 'Status OK após entrada pós-Marco Zero');
    assert(diag.totalEntries === 50, 'Total de entradas igual a 50kg');
    assert(diag.reconstructedBalance === 157, 'Saldo reconstruído igual a 157kg (107 + 50)');
    assert(diag.discrepancy === 0, 'Discrepância zero');
  }

  // -------------------------------------------------------------
  // CENÁRIO 3: Reconstrução com Marco Zero + saídas
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 3: Reconstrução com Marco Zero + saídas ---');
  {
    const prodArroz: Product = {
      id: 'prod-arroz',
      name: 'Arroz Branco',
      category: 'Grãos e Cereais',
      unit: 'kg',
      currentStock: 77, // 107 - 30
      minStock: 50,
      idealStock: 100,
      dailyAvgConsumption: 5,
      location: 'Palete A',
      lastUpdated: '2026-08-22T11:00:00Z',
    };
    const movSaida: StockMovement = {
      id: 'mov-s1',
      productId: 'prod-arroz',
      productName: 'Arroz Branco',
      unit: 'kg',
      type: 'saida',
      quantity: 30,
      date: '2026-08-22',
      time: '11:00',
      createdAt: '2026-08-22T11:00:00Z',
    };

    const report = runStockMathematicalAudit([prodArroz], [movSaida]);
    const diag = report.diagnostics[0];

    assert(diag.status === 'OK', 'Status OK após saída pós-Marco Zero');
    assert(diag.totalExits === 30, 'Total de saídas igual a 30kg');
    assert(diag.reconstructedBalance === 77, 'Saldo reconstruído igual a 77kg (107 - 30)');
    assert(diag.discrepancy === 0, 'Discrepância zero');
  }

  // -------------------------------------------------------------
  // CENÁRIO 4: Reconstrução com Marco Zero + ajustes positivos
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 4: Reconstrução com Marco Zero + ajustes positivos ---');
  {
    const prodArroz: Product = {
      id: 'prod-arroz',
      name: 'Arroz Branco',
      category: 'Grãos e Cereais',
      unit: 'kg',
      currentStock: 112, // 107 + 5
      minStock: 50,
      idealStock: 100,
      dailyAvgConsumption: 5,
      location: 'Palete A',
      lastUpdated: '2026-08-23T15:00:00Z',
    };
    const movAjustePos: StockMovement = {
      id: 'mov-adj-pos',
      productId: 'prod-arroz',
      productName: 'Arroz Branco',
      unit: 'kg',
      type: 'ajuste',
      quantity: 5,
      difference: 5,
      previousStock: 107,
      physicalStock: 112,
      date: '2026-08-23',
      time: '15:00',
      reason: 'Ajuste positivo por sobra apurada',
      createdAt: '2026-08-23T15:00:00Z',
    };

    const report = runStockMathematicalAudit([prodArroz], [movAjustePos]);
    const diag = report.diagnostics[0];

    assert(diag.status === 'OK', 'Status OK com ajuste positivo');
    assert(diag.totalAdjustments === 5, 'Total de ajustes computou +5kg via difference');
    assert(diag.reconstructedBalance === 112, 'Saldo reconstruído igual a 112kg');
    assert(diag.discrepancy === 0, 'Discrepância zero');
  }

  // -------------------------------------------------------------
  // CENÁRIO 5: Reconstrução com Marco Zero + ajustes negativos
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 5: Reconstrução com Marco Zero + ajustes negativos ---');
  {
    const prodArroz: Product = {
      id: 'prod-arroz',
      name: 'Arroz Branco',
      category: 'Grãos e Cereais',
      unit: 'kg',
      currentStock: 102, // 107 - 5
      minStock: 50,
      idealStock: 100,
      dailyAvgConsumption: 5,
      location: 'Palete A',
      lastUpdated: '2026-08-23T16:00:00Z',
    };
    const movAjusteNeg: StockMovement = {
      id: 'mov-adj-neg',
      productId: 'prod-arroz',
      productName: 'Arroz Branco',
      unit: 'kg',
      type: 'ajuste',
      quantity: 5,
      difference: -5,
      previousStock: 107,
      physicalStock: 102,
      date: '2026-08-23',
      time: '16:00',
      reason: 'Ajuste negativo por avaria',
      createdAt: '2026-08-23T16:00:00Z',
    };

    const report = runStockMathematicalAudit([prodArroz], [movAjusteNeg]);
    const diag = report.diagnostics[0];

    assert(diag.status === 'OK', 'Status OK com ajuste negativo');
    assert(diag.totalAdjustments === -5, 'Total de ajustes computou -5kg via difference');
    assert(diag.reconstructedBalance === 102, 'Saldo reconstruído igual a 102kg');
    assert(diag.discrepancy === 0, 'Discrepância zero');
  }

  // -------------------------------------------------------------
  // CENÁRIO 6: Reconstrução com mistura de entradas, saídas e ajustes
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 6: Reconstrução com mistura de entradas, saídas e ajustes ---');
  {
    // Marco Zero: 107
    // + Entrada: 50
    // - Saída: 30
    // + Ajuste: -2
    // Reconstruído = 107 + 50 - 30 - 2 = 125kg
    const prodArroz: Product = {
      id: 'prod-arroz',
      name: 'Arroz Branco',
      category: 'Grãos e Cereais',
      unit: 'kg',
      currentStock: 125,
      minStock: 50,
      idealStock: 100,
      dailyAvgConsumption: 5,
      location: 'Palete A',
      lastUpdated: '2026-08-25T12:00:00Z',
    };
    const movements: StockMovement[] = [
      {
        id: 'mov-mix-1',
        productId: 'prod-arroz',
        productName: 'Arroz Branco',
        unit: 'kg',
        type: 'entrada',
        quantity: 50,
        date: '2026-08-22',
        time: '09:00',
        createdAt: '2026-08-22T09:00:00Z',
      },
      {
        id: 'mov-mix-2',
        productId: 'prod-arroz',
        productName: 'Arroz Branco',
        unit: 'kg',
        type: 'saida',
        quantity: 30,
        date: '2026-08-23',
        time: '10:00',
        createdAt: '2026-08-23T10:00:00Z',
      },
      {
        id: 'mov-mix-3',
        productId: 'prod-arroz',
        productName: 'Arroz Branco',
        unit: 'kg',
        type: 'ajuste',
        quantity: 2,
        difference: -2,
        previousStock: 127,
        physicalStock: 125,
        date: '2026-08-24',
        time: '14:00',
        reason: 'Ajuste de pesagem',
        createdAt: '2026-08-24T14:00:00Z',
      },
    ];

    const report = runStockMathematicalAudit([prodArroz], movements);
    const diag = report.diagnostics[0];

    assert(diag.status === 'OK', 'Status OK com operações mistas');
    assert(diag.reconstructedBalance === 125, 'Saldo reconstruído igual a 125kg');
    assert(diag.trajectory.length === 4, 'Trajetória contém exatamente 4 passos (Marco Zero + 3 movs)');
    assert(diag.trajectory[0].type === 'marco_zero' && diag.trajectory[0].resultingBalance === 107, 'Passo 1: Marco Zero = 107kg');
    assert(diag.trajectory[1].type === 'entrada' && diag.trajectory[1].resultingBalance === 157, 'Passo 2: Entrada +50 = 157kg');
    assert(diag.trajectory[2].type === 'saida' && diag.trajectory[2].resultingBalance === 127, 'Passo 3: Saída -30 = 127kg');
    assert(diag.trajectory[3].type === 'ajuste' && diag.trajectory[3].resultingBalance === 125, 'Passo 4: Ajuste -2 = 125kg');
  }

  // -------------------------------------------------------------
  // CENÁRIO 7: Detecção de divergência quando currentStock for diferente do reconstruído
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 7: Detecção de divergência quando currentStock != reconstruído ---');
  {
    // Reconstruído = 125, mas currentStock corrompido em 120
    const prodArroz: Product = {
      id: 'prod-arroz',
      name: 'Arroz Branco',
      category: 'Grãos e Cereais',
      unit: 'kg',
      currentStock: 120, // Discrepância de +5kg
      minStock: 50,
      idealStock: 100,
      dailyAvgConsumption: 5,
      location: 'Palete A',
      lastUpdated: '2026-08-25T12:00:00Z',
    };
    const movements: StockMovement[] = [
      { id: 'm1', productId: 'prod-arroz', productName: 'Arroz Branco', unit: 'kg', type: 'entrada', quantity: 50, date: '2026-08-22', time: '09:00', createdAt: '2026-08-22T09:00:00Z' },
      { id: 'm2', productId: 'prod-arroz', productName: 'Arroz Branco', unit: 'kg', type: 'saida', quantity: 30, date: '2026-08-23', time: '10:00', createdAt: '2026-08-23T10:00:00Z' },
      { id: 'm3', productId: 'prod-arroz', productName: 'Arroz Branco', unit: 'kg', type: 'ajuste', quantity: 2, difference: -2, date: '2026-08-24', time: '14:00', createdAt: '2026-08-24T14:00:00Z' },
    ];

    const report = runStockMathematicalAudit([prodArroz], movements);
    const diag = report.diagnostics[0];

    assert(diag.status === 'DIVERGENTE', 'Auditor detectou status DIVERGENTE');
    assert(diag.discrepancy === 5, 'Discrepância calculada exatamente em +5kg (125 - 120)');
    assert(report.divergentProductsCount === 1, 'Total de produtos divergentes contabilizado como 1');
    assert(report.overallStatus === 'DIVERGENTE', 'Status geral do relatório é DIVERGENTE');
  }

  // -------------------------------------------------------------
  // CENÁRIO 8: Detecção de duplicidade de id
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 8: Detecção de duplicidade de id ---');
  {
    const prod: Product = { id: 'prod-feijao', name: 'Feijão', category: 'Grãos e Cereais', unit: 'kg', currentStock: 44, minStock: 20, idealStock: 60, dailyAvgConsumption: 2, location: 'P', lastUpdated: '2026-08-21T17:30:00Z' };
    const movements: StockMovement[] = [
      { id: 'dup-id-1', productId: 'prod-feijao', productName: 'Feijão', unit: 'kg', type: 'entrada', quantity: 10, date: '2026-08-22', time: '09:00', createdAt: '2026-08-22T09:00:00Z' },
      { id: 'dup-id-1', productId: 'prod-feijao', productName: 'Feijão', unit: 'kg', type: 'entrada', quantity: 10, date: '2026-08-22', time: '09:00', createdAt: '2026-08-22T09:00:00Z' },
    ];

    const report = runStockMathematicalAudit([prod], movements);
    const hasDupId = report.duplicates.some((d) => d.type === 'DUPLICATE_ID' && d.identifier === 'dup-id-1');
    assert(hasDupId, 'Auditor detectou duplicidade de ID (DUPLICATE_ID)');
    assert(report.invalidMovements.some((inv) => inv.code === 'DUPLICATE_ID'), 'Invalid movements lista o código DUPLICATE_ID');
  }

  // -------------------------------------------------------------
  // CENÁRIO 9: Detecção de duplicidade de operationId
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 9: Detecção de duplicidade de operationId ---');
  {
    const prod: Product = { id: 'prod-feijao', name: 'Feijão', category: 'Grãos e Cereais', unit: 'kg', currentStock: 44, minStock: 20, idealStock: 60, dailyAvgConsumption: 2, location: 'P', lastUpdated: '2026-08-21T17:30:00Z' };
    const movements: StockMovement[] = [
      { id: 'mov-op-1', operationId: 'op-shared-xyz', productId: 'prod-feijao', productName: 'Feijão', unit: 'kg', type: 'entrada', quantity: 10, date: '2026-08-22', time: '09:00', createdAt: '2026-08-22T09:00:00Z' },
      { id: 'mov-op-2', operationId: 'op-shared-xyz', productId: 'prod-feijao', productName: 'Feijão', unit: 'kg', type: 'entrada', quantity: 10, date: '2026-08-22', time: '09:00', createdAt: '2026-08-22T09:00:00Z' },
    ];

    const report = runStockMathematicalAudit([prod], movements);
    const hasDupOp = report.duplicates.some((d) => d.type === 'DUPLICATE_OPERATION_ID' && d.identifier === 'op-shared-xyz');
    assert(hasDupOp, 'Auditor detectou duplicidade de operationId (DUPLICATE_OPERATION_ID)');
  }

  // -------------------------------------------------------------
  // CENÁRIO 10: Detecção de duplicidade de clientRequestId
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 10: Detecção de duplicidade de clientRequestId ---');
  {
    const prod: Product = { id: 'prod-feijao', name: 'Feijão', category: 'Grãos e Cereais', unit: 'kg', currentStock: 44, minStock: 20, idealStock: 60, dailyAvgConsumption: 2, location: 'P', lastUpdated: '2026-08-21T17:30:00Z' };
    const movements: StockMovement[] = [
      { id: 'mov-req-1', clientRequestId: 'req-dup-999', productId: 'prod-feijao', productName: 'Feijão', unit: 'kg', type: 'entrada', quantity: 10, date: '2026-08-22', time: '09:00', createdAt: '2026-08-22T09:00:00Z' },
      { id: 'mov-req-2', clientRequestId: 'req-dup-999', productId: 'prod-feijao', productName: 'Feijão', unit: 'kg', type: 'entrada', quantity: 10, date: '2026-08-22', time: '09:00', createdAt: '2026-08-22T09:00:00Z' },
    ];

    const report = runStockMathematicalAudit([prod], movements);
    const hasDupReq = report.duplicates.some((d) => d.type === 'DUPLICATE_CLIENT_REQUEST_ID' && d.identifier === 'req-dup-999');
    assert(hasDupReq, 'Auditor detectou duplicidade de clientRequestId (DUPLICATE_CLIENT_REQUEST_ID)');
  }

  // -------------------------------------------------------------
  // CENÁRIO 11: Movimentação órfã (produto inexistente)
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 11: Movimentação órfã (produto inexistente) ---');
  {
    const prod: Product = { id: 'prod-feijao', name: 'Feijão', category: 'Grãos e Cereais', unit: 'kg', currentStock: 44, minStock: 20, idealStock: 60, dailyAvgConsumption: 2, location: 'P', lastUpdated: '2026-08-21T17:30:00Z' };
    const movements: StockMovement[] = [
      { id: 'mov-orfa', productId: 'prod-fantasma-999', productName: 'Item Fantasma', unit: 'kg', type: 'entrada', quantity: 10, date: '2026-08-22', time: '09:00', createdAt: '2026-08-22T09:00:00Z' },
    ];

    const report = runStockMathematicalAudit([prod], movements);
    const isOrphan = report.invalidMovements.some((inv) => inv.code === 'ORPHAN_MOVEMENT' && inv.movementId === 'mov-orfa');
    assert(isOrphan, 'Auditor classificou movimento referenciando produto inexistente como ORPHAN_MOVEMENT');
  }

  // -------------------------------------------------------------
  // CENÁRIO 12: Movimentação com tipo inválido
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 12: Movimentação com tipo inválido ---');
  {
    const prod: Product = { id: 'prod-feijao', name: 'Feijão', category: 'Grãos e Cereais', unit: 'kg', currentStock: 44, minStock: 20, idealStock: 60, dailyAvgConsumption: 2, location: 'P', lastUpdated: '2026-08-21T17:30:00Z' };
    const movements: StockMovement[] = [
      { id: 'mov-bad-type', productId: 'prod-feijao', productName: 'Feijão', unit: 'kg', type: 'transferencia_invalida' as any, quantity: 10, date: '2026-08-22', time: '09:00', createdAt: '2026-08-22T09:00:00Z' },
    ];

    const report = runStockMathematicalAudit([prod], movements);
    const hasBadType = report.invalidMovements.some((inv) => inv.code === 'INVALID_TYPE' && inv.movementId === 'mov-bad-type');
    assert(hasBadType, 'Auditor classificou tipo diferente de entrada/saida/ajuste como INVALID_TYPE');
  }

  // -------------------------------------------------------------
  // CENÁRIO 13: Movimentação com quantidade zero ou negativa
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 13: Movimentação com quantidade zero ou negativa ---');
  {
    const prod: Product = { id: 'prod-feijao', name: 'Feijão', category: 'Grãos e Cereais', unit: 'kg', currentStock: 44, minStock: 20, idealStock: 60, dailyAvgConsumption: 2, location: 'P', lastUpdated: '2026-08-21T17:30:00Z' };
    const movements: StockMovement[] = [
      { id: 'mov-qty-zero', productId: 'prod-feijao', productName: 'Feijão', unit: 'kg', type: 'saida', quantity: 0, date: '2026-08-22', time: '09:00', createdAt: '2026-08-22T09:00:00Z' },
      { id: 'mov-qty-neg', productId: 'prod-feijao', productName: 'Feijão', unit: 'kg', type: 'entrada', quantity: -15, date: '2026-08-22', time: '09:00', createdAt: '2026-08-22T09:00:00Z' },
    ];

    const report = runStockMathematicalAudit([prod], movements);
    const zeroDetected = report.invalidMovements.some((inv) => inv.code === 'INVALID_QUANTITY' && inv.movementId === 'mov-qty-zero');
    const negDetected = report.invalidMovements.some((inv) => inv.code === 'INVALID_QUANTITY' && inv.movementId === 'mov-qty-neg');
    assert(zeroDetected, 'Auditor classificou quantidade zero como INVALID_QUANTITY');
    assert(negDetected, 'Auditor classificou quantidade negativa como INVALID_QUANTITY');
  }

  // -------------------------------------------------------------
  // CENÁRIO 14: Ajuste com quantity != abs(difference)
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 14: Ajuste com quantity != abs(difference) ---');
  {
    const prod: Product = { id: 'prod-feijao', name: 'Feijão', category: 'Grãos e Cereais', unit: 'kg', currentStock: 44, minStock: 20, idealStock: 60, dailyAvgConsumption: 2, location: 'P', lastUpdated: '2026-08-21T17:30:00Z' };
    const movements: StockMovement[] = [
      {
        id: 'mov-adj-inconsistente',
        productId: 'prod-feijao',
        productName: 'Feijão',
        unit: 'kg',
        type: 'ajuste',
        quantity: 10,
        difference: 5, // 10 !== abs(5)
        previousStock: 40,
        physicalStock: 45,
        date: '2026-08-22',
        time: '09:00',
        createdAt: '2026-08-22T09:00:00Z',
      },
    ];

    const report = runStockMathematicalAudit([prod], movements);
    const hasInconsistentAdj = report.invalidMovements.some((inv) => inv.code === 'INCONSISTENT_ADJUSTMENT' && inv.movementId === 'mov-adj-inconsistente');
    assert(hasInconsistentAdj, 'Auditor detectou inconsistência entre quantity e difference (INCONSISTENT_ADJUSTMENT)');
  }

  // -------------------------------------------------------------
  // CENÁRIO 15: Movimentações anteriores ao Marco Zero não alterando o saldo pós-Marco Zero
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 15: Movimentações anteriores ao Marco Zero não alterando o saldo pós-Marco Zero ---');
  {
    // Arroz Branco Marco Zero: 107kg em 2026-08-21 17:30
    // Movimento anterior em 2026-08-15 de +100kg
    // Movimento posterior em 2026-08-22 de +10kg
    // Saldo esperado: 107 + 10 = 117kg (o +100kg anterior não pode ser adicionado ao Marco Zero)
    const prodArroz: Product = {
      id: 'prod-arroz',
      name: 'Arroz Branco',
      category: 'Grãos e Cereais',
      unit: 'kg',
      currentStock: 117,
      minStock: 50,
      idealStock: 100,
      dailyAvgConsumption: 5,
      location: 'Palete A',
      lastUpdated: '2026-08-22T10:00:00Z',
    };
    const movements: StockMovement[] = [
      {
        id: 'mov-pre-marco-zero',
        productId: 'prod-arroz',
        productName: 'Arroz Branco',
        unit: 'kg',
        type: 'entrada',
        quantity: 100,
        date: '2026-08-15', // Anterior ao Marco Zero
        time: '10:00',
        createdAt: '2026-08-15T10:00:00Z',
      },
      {
        id: 'mov-pos-marco-zero',
        productId: 'prod-arroz',
        productName: 'Arroz Branco',
        unit: 'kg',
        type: 'entrada',
        quantity: 10,
        date: '2026-08-22', // Posterior ao Marco Zero
        time: '10:00',
        createdAt: '2026-08-22T10:00:00Z',
      },
    ];

    const report = runStockMathematicalAudit([prodArroz], movements);
    const diag = report.diagnostics[0];

    assert(diag.status === 'OK', 'Status OK mantendo histórico anterior intacto');
    assert(diag.priorMovementsCount === 1, 'Auditor identificou 1 movimentação anterior ao Marco Zero');
    assert(diag.reconstructedBalance === 117, 'Saldo reconstruído excluiu movimentação anterior e somou apenas Marco Zero (107) + posterior (10) = 117kg');
    assert(diag.discrepancy === 0, 'Discrepância zero confirmada');
  }

  // -------------------------------------------------------------
  // CENÁRIO 16: Movimento de implantação do Marco Zero não duplicando o saldo inicial
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 16: Movimento de implantação do Marco Zero não duplicando o saldo inicial ---');
  {
    // Marco Zero oficial do Arroz: 107kg
    // O movimento adj-marco-zero-20260821-prod-arroz estabeleceu os 107kg (difference: +27, previous: 80, physical: 107)
    // Não pode somar 107 + 27 ou 107 + 107!
    const prodArroz: Product = {
      id: 'prod-arroz',
      name: 'Arroz Branco',
      category: 'Grãos e Cereais',
      unit: 'kg',
      currentStock: 107,
      minStock: 50,
      idealStock: 100,
      dailyAvgConsumption: 5,
      location: 'Palete A',
      lastUpdated: '2026-08-21T17:30:00Z',
    };
    const mzMovement: StockMovement = {
      id: 'adj-marco-zero-20260821-prod-arroz',
      operationId: 'adj-marco-zero-20260821-prod-arroz',
      productId: 'prod-arroz',
      productName: 'Arroz Branco',
      unit: 'kg',
      type: 'ajuste',
      quantity: 27,
      difference: 27,
      previousStock: 80,
      physicalStock: 107,
      date: '2026-08-21',
      time: '17:30',
      reason: 'Conciliação física e estabelecimento de Marco Zero',
      createdAt: '2026-08-21T17:30:00Z',
    };

    const report = runStockMathematicalAudit([prodArroz], [mzMovement]);
    const diag = report.diagnostics[0];

    assert(diag.status === 'OK', 'Status OK com movimento de implantação do Marco Zero');
    assert(diag.reconstructedBalance === 107, 'Saldo reconstruído manteve 107kg sem duplicar a base inicial');
    assert(diag.movementsCount === 0, 'Movimento de implantação é reconhecido como base e NÃO computado como posterior');
    assert(report.totalMarcoZeroEstablishmentMovements === 1, 'Total de movimentos de estabelecimento registrado como 1');
    assert(diag.discrepancy === 0, 'Discrepância zero');
  }

  // -------------------------------------------------------------
  // CENÁRIO 17: Preservação de histórico com operação compensatória (sem apagar movimento original)
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 17: Preservação de histórico com operação compensatória ---');
  {
    const db = new MockStockDatabase();
    const prod: Product = {
      id: 'prod-cafe',
      name: 'Café',
      category: 'Matinais e Bebidas',
      unit: 'pacote',
      currentStock: 12, // Marco zero oficial
      minStock: 5,
      idealStock: 20,
      dailyAvgConsumption: 1,
      location: 'P',
      lastUpdated: '2026-08-21T17:30:00Z',
    };
    db.addProduct(prod);

    // Movimento original: Entrada de 50 pacotes lançada por engano
    const origMov: StockMovement = {
      id: 'mov-cafe-engano',
      productId: 'prod-cafe',
      productName: 'Café',
      unit: 'pacote',
      type: 'entrada',
      quantity: 50,
      date: '2026-08-24',
      time: '09:00',
      createdAt: '2026-08-24T09:00:00Z',
    };
    db.addMovement(origMov);
    db.products.get('prod-cafe')!.currentStock = 62; // 12 + 50

    // Executa compensação atômica (estorno da entrada via saída compensatória de 50)
    const result = await db.compensateMovement('mov-cafe-engano', 'Estorno de digitação incorreta');

    assert(db.movements.has('mov-cafe-engano'), 'Movimento original NÃO foi deletado do banco de dados');
    assert(db.movements.get('mov-cafe-engano')!.isCompensated === true, 'Movimento original marcado como isCompensated = true');
    assert(result.compensationMovement.type === 'saida', 'Movimento compensatório criado com efeito reverso (saída)');
    assert(result.compensationMovement.quantity === 50, 'Quantidade compensatória igual a 50 pacotes');
    assert(result.updatedProduct.currentStock === 12, 'Saldo de estoque restaurado exatamente para 12 pacotes (62 - 50)');

    // Executa auditoria matemática independente com ambos os registros presentes
    const report = runStockMathematicalAudit(
      [result.updatedProduct],
      Array.from(db.movements.values())
    );
    const diag = report.diagnostics[0];

    assert(diag.status === 'OK', 'Auditor confirma status OK com original + compensação preservados');
    assert(diag.totalEntries === 50, 'Total de entradas computa 50');
    assert(diag.totalExits === 50, 'Total de saídas computa 50');
    assert(diag.reconstructedBalance === 12, 'Saldo líquido reconstruído é 12 + 50 - 50 = 12 pacotes');
    assert(diag.discrepancy === 0, 'Discrepância zero');
  }

  // -------------------------------------------------------------
  // CENÁRIO 18: Compensação idempotente (mesmo clientRequestId não duplica o estorno)
  // -------------------------------------------------------------
  console.log('\n--- CENÁRIO 18: Compensação idempotente ---');
  {
    const db = new MockStockDatabase();
    const prod: Product = {
      id: 'prod-leite',
      name: 'Leite Integral',
      category: 'Laticínios e Massas',
      unit: 'litro',
      currentStock: 18, // Marco zero oficial
      minStock: 10,
      idealStock: 30,
      dailyAvgConsumption: 2,
      location: 'D',
      lastUpdated: '2026-08-21T17:30:00Z',
    };
    db.addProduct(prod);

    // Saída original de 5 litros
    const origMov: StockMovement = {
      id: 'mov-saida-leite',
      productId: 'prod-leite',
      productName: 'Leite Integral',
      unit: 'litro',
      type: 'saida',
      quantity: 5,
      date: '2026-08-23',
      time: '10:00',
      createdAt: '2026-08-23T10:00:00Z',
    };
    db.addMovement(origMov);
    db.products.get('prod-leite')!.currentStock = 13; // 18 - 5

    // 1ª Execução da compensação
    const clientReqId = 'req-comp-leite-123';
    const res1 = await db.compensateMovement('mov-saida-leite', 'Estorno de saída', clientReqId);
    assert(res1.updatedProduct.currentStock === 18, '1ª compensação restaurou estoque de 13 para 18 litros');

    // 2ª Execução da compensação com MESMO clientRequestId (duplo clique / retry de rede)
    const res2 = await db.compensateMovement('mov-saida-leite', 'Estorno de saída', clientReqId);
    assert(res2.updatedProduct.currentStock === 18, '2ª compensação idempotente manteve estoque em 18 litros sem duplicar');
    assert(Array.from(db.movements.values()).filter((m) => m.clientRequestId === clientReqId).length === 1, 'Apenas 1 registro de compensação criado no banco');

    const report = runStockMathematicalAudit(
      [res2.updatedProduct],
      Array.from(db.movements.values())
    );
    const diag = report.diagnostics[0];
    assert(diag.status === 'OK', 'Auditor confirma consistência após compensação idempotente');
    assert(diag.reconstructedBalance === 18, 'Saldo reconstruído matematicamente exato (18 - 5 + 5 = 18 litros)');
    assert(diag.discrepancy === 0, 'Discrepância zero');
  }

  console.log('\n===============================================================');
  console.log(`   RESULTADO FINAL DOS TESTES DA FASE 2: ${passed} PASSOU / ${failed} FALHOU`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2AuditTestSuite();
