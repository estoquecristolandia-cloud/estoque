import { Product, StockMovement, InventoryAudit, InventorySessionSummary } from '../types';

/**
 * 14 PRODUTOS OFICIAIS DO MARCO ZERO — CRISTOLÂNDIA LEM/BA
 * Sessão: marco-zero-20260821 | Data: 2026-08-21 | Horário: 17:30 | Resp: Marconi Castro
 * Base histórica imutável auditada e conferida fisicamente.
 */
export const OFFICIAL_MARCO_ZERO: Record<string, { stock: number; unit: string; name: string }> = {
  'prod-acucar': { stock: 35, unit: 'kg', name: 'Açúcar Cristal' },
  'prod-alho': { stock: 16.5, unit: 'pacote', name: 'Alho (Pacote c/ 10 cabeças)' },
  'prod-arroz': { stock: 107, unit: 'kg', name: 'Arroz Branco' },
  'prod-cafe': { stock: 12, unit: 'pacote', name: 'Café Torrado e Moído (250g)' },
  'prod-farinha': { stock: 26, unit: 'kg', name: 'Farinha de Trigo / Mandioca' },
  'prod-feijao': { stock: 44, unit: 'kg', name: 'Feijão Carioca' },
  'prod-flocao': { stock: 52, unit: 'pacote', name: 'Flocão de Milho (Cuscuz 400g)' },
  'prod-leite': { stock: 18, unit: 'litro', name: 'Leite Integral' },
  'prod-macarrao': { stock: 56, unit: 'pacote', name: 'Macarrão Espaguete' },
  'prod-manteiga': { stock: 24, unit: 'kg', name: 'Manteiga / Margarina (Balde 14,5kg)' },
  'prod-milho-pipoca': { stock: 10, unit: 'pacote', name: 'Milho para Pipoca (500g)' },
  'prod-oleo': { stock: 11, unit: 'litro', name: 'Óleo de Soja (900ml)' },
  'prod-sal': { stock: 3, unit: 'kg', name: 'Sal Refinado' },
  'prod-suco': { stock: 13, unit: 'pacote', name: 'Suco em Pó (250g)' },
};

export const MARCO_ZERO_TIMESTAMP_STR = '2026-08-21 17:30';
export const FLOAT_TOLERANCE = 0.001;

export function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

export interface TrajectoryStep {
  stepNumber: number;
  date: string;
  time?: string;
  movementId: string;
  type: 'marco_zero' | 'entrada' | 'saida' | 'ajuste' | 'compensacao';
  description: string;
  quantity: number;
  impact: number;
  resultingBalance: number;
}

export type InvalidMovementCode =
  | 'ORPHAN_MOVEMENT'
  | 'INVALID_TYPE'
  | 'INVALID_QUANTITY'
  | 'INCONSISTENT_ADJUSTMENT'
  | 'DUPLICATE_ID'
  | 'DUPLICATE_CLIENT_REQUEST_ID'
  | 'DUPLICATE_OPERATION_ID';

export interface InvalidMovementDiagnostic {
  movementId: string;
  productId: string;
  code: InvalidMovementCode;
  description: string;
  details?: Record<string, any>;
}

export interface DuplicateDiagnostic {
  type: 'DUPLICATE_ID' | 'DUPLICATE_CLIENT_REQUEST_ID' | 'DUPLICATE_OPERATION_ID' | 'PHYSICAL_SUSPECT';
  identifier: string;
  movementIds: string[];
  description: string;
}

export interface ProductAuditDiagnostic {
  productId: string;
  productName: string;
  unit: string;
  currentStock: number;
  hasMarcoZero: boolean;
  marcoZeroDate?: string;
  marcoZeroStock?: number;
  totalEntries: number;
  totalExits: number;
  totalAdjustments: number;
  priorMovementsCount: number;
  movementsCount: number; // posterior movements considered
  reconstructedBalance: number;
  discrepancy: number; // reconstructedBalance - currentStock
  status: 'OK' | 'DIVERGENTE';
  trajectory: TrajectoryStep[];
  trajectoryText: string[];
  possibleDuplicates: Array<{
    movementAId: string;
    movementBId: string;
    type: string;
    quantity: number;
    date: string;
    time?: string;
    reason: string;
  }>;
  notes: string[];
}

export interface StockAuditReportSummary {
  auditTimestamp: string;
  toleranceUsed: number;
  totalProducts: number;
  consistentProductsCount: number;
  divergentProductsCount: number;
  productsWithMarcoZeroCount: number;
  totalMovementsAnalyzed: number;
  totalPosteriorMovements: number;
  totalPriorMovements: number;
  totalMarcoZeroEstablishmentMovements: number;
  totalDuplicatesDetected: number;
  invalidMovementsCount: number;
  invalidMovements: InvalidMovementDiagnostic[];
  duplicates: DuplicateDiagnostic[];
  overallStatus: 'CONSISTENTE' | 'DIVERGENTE';
  diagnostics: ProductAuditDiagnostic[];
}

/**
 * PURE READ-ONLY FUNCTION:
 * Performs an exact mathematical consistency audit across products and movements.
 * Does NOT write, mutate, or alter anything in Firestore or memory.
 */
export function runStockMathematicalAudit(
  products: Product[],
  movements: StockMovement[],
  inventoryAudits: InventoryAudit[] = [],
  _inventorySessions: InventorySessionSummary[] = []
): StockAuditReportSummary {
  const invalidMovements: InvalidMovementDiagnostic[] = [];
  const duplicates: DuplicateDiagnostic[] = [];
  const productMap = new Map<string, Product>(products.map((p) => [p.id, p]));

  // -------------------------------------------------------------
  // 1. DETECÇÃO GLOBAL DE DUPLICIDADES (id, operationId, clientRequestId)
  // -------------------------------------------------------------
  const idMap = new Map<string, StockMovement[]>();
  const opIdMap = new Map<string, StockMovement[]>();
  const clientReqMap = new Map<string, StockMovement[]>();

  for (const mov of movements) {
    // ID duplicado
    if (mov.id) {
      const list = idMap.get(mov.id) || [];
      list.push(mov);
      idMap.set(mov.id, list);
    }

    // operationId duplicado (quando presente e diferente do próprio id)
    if (mov.operationId) {
      const list = opIdMap.get(mov.operationId) || [];
      list.push(mov);
      opIdMap.set(mov.operationId, list);
    }

    // clientRequestId duplicado (operações modernas)
    if (mov.clientRequestId) {
      const list = clientReqMap.get(mov.clientRequestId) || [];
      list.push(mov);
      clientReqMap.set(mov.clientRequestId, list);
    }
  }

  for (const [id, list] of idMap.entries()) {
    if (list.length > 1) {
      duplicates.push({
        type: 'DUPLICATE_ID',
        identifier: id,
        movementIds: list.map((m) => m.id),
        description: `Mesmo ID de documento encontrado ${list.length} vezes na coleção de movimentos.`,
      });
      invalidMovements.push({
        movementId: id,
        productId: list[0]?.productId || '',
        code: 'DUPLICATE_ID',
        description: `ID de movimentação duplicado: ${id}`,
      });
    }
  }

  for (const [opId, list] of opIdMap.entries()) {
    if (list.length > 1) {
      // Atenção: Lotes (batch-exit e kit) podem gerar sufixos com mesmo baseId,
      // mas se o operationId for estritamente idêntico para produtos diferentes ou o mesmo produto:
      const distinctIds = new Set(list.map((m) => m.id));
      if (distinctIds.size > 1) {
        duplicates.push({
          type: 'DUPLICATE_OPERATION_ID',
          identifier: opId,
          movementIds: list.map((m) => m.id),
          description: `Múltiplos movimentos compartilham o mesmo operationId: ${opId}`,
        });
      }
    }
  }

  for (const [reqId, list] of clientReqMap.entries()) {
    if (list.length > 1) {
      // Se tiver múltiplos movimentos para o mesmo produto com o mesmo clientRequestId, é duplicidade!
      const byProduct = new Map<string, StockMovement[]>();
      for (const m of list) {
        const prodList = byProduct.get(m.productId) || [];
        prodList.push(m);
        byProduct.set(m.productId, prodList);
      }
      for (const [prodId, prodMovs] of byProduct.entries()) {
        if (prodMovs.length > 1) {
          duplicates.push({
            type: 'DUPLICATE_CLIENT_REQUEST_ID',
            identifier: reqId,
            movementIds: prodMovs.map((m) => m.id),
            description: `Mesmo clientRequestId (${reqId}) duplicado para o produto ${prodId}.`,
          });
          invalidMovements.push({
            movementId: prodMovs[1].id,
            productId: prodId,
            code: 'DUPLICATE_CLIENT_REQUEST_ID',
            description: `Operação duplicada com mesmo clientRequestId (${reqId}) violando idempotência.`,
          });
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 2. DETECÇÃO DE MOVIMENTAÇÕES INVÁLIDAS GERAIS
  // -------------------------------------------------------------
  for (const mov of movements) {
    // 8.1 Produto Inexistente (ORPHAN_MOVEMENT)
    if (!productMap.has(mov.productId)) {
      invalidMovements.push({
        movementId: mov.id,
        productId: mov.productId,
        code: 'ORPHAN_MOVEMENT',
        description: `Movimento referencia productId "${mov.productId}" que não existe no cadastro de produtos.`,
      });
    }

    // 8.2 Tipo Inválido (INVALID_TYPE)
    if (mov.type !== 'entrada' && mov.type !== 'saida' && mov.type !== 'ajuste') {
      invalidMovements.push({
        movementId: mov.id,
        productId: mov.productId,
        code: 'INVALID_TYPE',
        description: `Tipo de movimento inválido: "${(mov as any).type}". Esperado: 'entrada', 'saida' ou 'ajuste'.`,
      });
    }

    // 8.3 Quantidade Inválida (INVALID_QUANTITY)
    const qty = Number(mov.quantity);
    if (isNaN(qty) || !isFinite(qty) || qty <= 0) {
      invalidMovements.push({
        movementId: mov.id,
        productId: mov.productId,
        code: 'INVALID_QUANTITY',
        description: `Quantidade inválida: ${mov.quantity}. Esperado número finito maior que zero.`,
      });
    }

    // 8.4 Ajuste Inconsistente (INCONSISTENT_ADJUSTMENT)
    if (mov.type === 'ajuste') {
      if (mov.difference === undefined || isNaN(Number(mov.difference))) {
        invalidMovements.push({
          movementId: mov.id,
          productId: mov.productId,
          code: 'INCONSISTENT_ADJUSTMENT',
          description: `Movimento de ajuste sem campo "difference" definido.`,
        });
      } else {
        const roundedDiff = round2(Number(mov.difference));
        const roundedQty = round2(qty);
        if (Math.abs(roundedDiff) !== roundedQty) {
          invalidMovements.push({
            movementId: mov.id,
            productId: mov.productId,
            code: 'INCONSISTENT_ADJUSTMENT',
            description: `Ajuste inconsistente: quantity (${roundedQty}) !== abs(difference) (${Math.abs(roundedDiff)}).`,
            details: { difference: mov.difference, quantity: mov.quantity },
          });
        }
        if (
          mov.physicalStock !== undefined &&
          mov.previousStock !== undefined &&
          !isNaN(Number(mov.physicalStock)) &&
          !isNaN(Number(mov.previousStock))
        ) {
          const expectedDiff = round2(Number(mov.physicalStock) - Number(mov.previousStock));
          if (expectedDiff !== roundedDiff) {
            invalidMovements.push({
              movementId: mov.id,
              productId: mov.productId,
              code: 'INCONSISTENT_ADJUSTMENT',
              description: `Ajuste inconsistente: difference (${roundedDiff}) !== physicalStock (${mov.physicalStock}) - previousStock (${mov.previousStock}) = ${expectedDiff}.`,
            });
          }
        }
      }
    }
  }

  // -------------------------------------------------------------
  // 3. AUDITORIA MATEMÁTICA POR PRODUTO
  // -------------------------------------------------------------
  const diagnostics: ProductAuditDiagnostic[] = [];
  let totalPosteriorMovements = 0;
  let totalPriorMovements = 0;
  let totalMarcoZeroEstablishmentMovements = 0;
  let totalDuplicatesDetected = duplicates.length;

  for (const product of products) {
    const prodMovements = movements.filter((m) => m.productId === product.id);

    // Detecção de duplicidades físicas temporais (<3 segundos ou mesmo minuto)
    const possibleDuplicates: ProductAuditDiagnostic['possibleDuplicates'] = [];
    for (let i = 0; i < prodMovements.length; i++) {
      for (let j = i + 1; j < prodMovements.length; j++) {
        const movA = prodMovements[i];
        const movB = prodMovements[j];

        if (
          movA.type === movB.type &&
          round2(movA.quantity) === round2(movB.quantity) &&
          movA.date === movB.date
        ) {
          const timeA = movA.time || '';
          const timeB = movB.time || '';
          const sameMinute = timeA && timeB && timeA === timeB;

          let closeCreatedAt = false;
          if (movA.createdAt && movB.createdAt) {
            const diffMs = Math.abs(new Date(movA.createdAt).getTime() - new Date(movB.createdAt).getTime());
            if (diffMs < 3000) closeCreatedAt = true;
          }

          if (sameMinute || closeCreatedAt) {
            possibleDuplicates.push({
              movementAId: movA.id,
              movementBId: movB.id,
              type: movA.type,
              quantity: movA.quantity,
              date: movA.date,
              time: movA.time,
              reason: closeCreatedAt
                ? `Possível duplo-clique (<3s entre registros às ${timeA})`
                : `Registros idênticos no mesmo minuto (${timeA})`,
            });
          }
        }
      }
    }

    // -------------------------------------------------------------
    // 3.1 Identificação do Marco Zero Oficial do Produto
    // -------------------------------------------------------------
    const officialMZ = OFFICIAL_MARCO_ZERO[product.id];
    const mzMovement = prodMovements.find(
      (m) =>
        m.id.startsWith('adj-marco-zero-') ||
        m.id.startsWith('adj-20260821-') ||
        m.id === 'op-marco-zero' ||
        m.id.startsWith('op-marco-zero-') ||
        (m.type === 'ajuste' &&
          (m.reason?.includes('Marco Zero') ||
            (m.date === '2026-08-21' && (m.time === '17:30' || m.id.includes('20260821')))))
    );

    const mzAudit = inventoryAudits.find(
      (a) =>
        a.productId === product.id &&
        (a.id.startsWith('adj-marco-zero-') ||
          a.id.startsWith('adj-20260821-') ||
          a.id === 'op-marco-zero' ||
          a.id.startsWith('op-marco-zero-') ||
          (a.date === '2026-08-21' && a.time === '17:30') ||
          a.reason?.includes('Marco Zero'))
    );

    const hasMarcoZero = Boolean(officialMZ || mzAudit || mzMovement);
    let marcoZeroStock: number | undefined = undefined;
    let anchorDate = '2026-08-21';
    let anchorTime = '17:30';

    if (hasMarcoZero) {
      if (mzMovement) {
        if (mzMovement.date) anchorDate = mzMovement.date;
        if (mzMovement.time) anchorTime = mzMovement.time;
        if (mzMovement.physicalStock !== undefined && !isNaN(Number(mzMovement.physicalStock))) {
          marcoZeroStock = round2(Number(mzMovement.physicalStock));
        }
      } else if (mzAudit) {
        if (mzAudit.date) anchorDate = mzAudit.date;
        if (mzAudit.time) anchorTime = mzAudit.time;
        if (mzAudit.physicalStock !== undefined && !isNaN(Number(mzAudit.physicalStock))) {
          marcoZeroStock = round2(Number(mzAudit.physicalStock));
        }
      }

      if (marcoZeroStock === undefined && officialMZ) {
        marcoZeroStock = round2(officialMZ.stock);
      }
    }

    const marcoZeroDate = hasMarcoZero ? `${anchorDate} ${anchorTime}` : undefined;

    // -------------------------------------------------------------
    // 3.2 Categorização dos Movimentos em Relação ao Marco Zero
    // -------------------------------------------------------------
    const establishmentMovements: StockMovement[] = [];
    const priorMovements: StockMovement[] = [];
    const posteriorMovements: StockMovement[] = [];

    for (const m of prodMovements) {
      // 1. É o movimento de estabelecimento do Marco Zero?
      const isEst =
        (mzMovement && m.id === mzMovement.id) ||
        m.id.startsWith('adj-marco-zero-') ||
        m.id.startsWith('adj-20260821-') ||
        (m.type === 'ajuste' &&
          m.date === anchorDate &&
          (m.time === anchorTime || m.reason?.includes('Marco Zero')));

      if (isEst) {
        establishmentMovements.push(m);
        totalMarcoZeroEstablishmentMovements++;
        continue; // NÃO é contabilizado nos posteriores para evitar duplicar a base
      }

      // 2. É movimento anterior ao Marco Zero? (Section 11)
      const isPrior =
        (m.date || '') < anchorDate ||
        ((m.date || '') === anchorDate && (m.time || '') < anchorTime);

      if (hasMarcoZero && isPrior) {
        priorMovements.push(m);
        totalPriorMovements++;
        continue; // Fica no histórico anterior, fora da janela de reconstrução pós-Marco Zero
      }

      // 3. É movimento posterior ao Marco Zero (ou movimento geral se não houver Marco Zero)
      posteriorMovements.push(m);
      totalPosteriorMovements++;
    }

    // Ordenação cronológica rigorosa das movimentações posteriores
    posteriorMovements.sort((a, b) => {
      const dateComp = (a.date || '').localeCompare(b.date || '');
      if (dateComp !== 0) return dateComp;
      const timeComp = (a.time || '').localeCompare(b.time || '');
      if (timeComp !== 0) return timeComp;
      const createdComp = (a.createdAt || '').localeCompare(b.createdAt || '');
      if (createdComp !== 0) return createdComp;
      return (a.id || '').localeCompare(b.id || '');
    });

    // -------------------------------------------------------------
    // 3.3 Reconstrução Matemática e Registro da Trajetória Passo a Passo
    // -------------------------------------------------------------
    const trajectory: TrajectoryStep[] = [];
    const trajectoryText: string[] = [];
    const notes: string[] = [];

    let currentBalance = hasMarcoZero && marcoZeroStock !== undefined ? marcoZeroStock : 0;
    let stepCount = 0;

    if (hasMarcoZero && marcoZeroStock !== undefined) {
      stepCount++;
      trajectory.push({
        stepNumber: stepCount,
        date: '2026-08-21',
        time: '17:30',
        movementId: mzMovement?.id || `marco-zero-${product.id}`,
        type: 'marco_zero',
        description: 'Marco Zero Oficial (Contagem física auditada)',
        quantity: marcoZeroStock,
        impact: marcoZeroStock,
        resultingBalance: marcoZeroStock,
      });
      trajectoryText.push(
        `[Passo ${stepCount}] Marco Zero (2026-08-21 17:30) = ${marcoZeroStock.toFixed(2)} ${product.unit}`
      );
      notes.push(
        `Marco Zero oficial em 2026-08-21 17:30: saldo base de ${marcoZeroStock} ${product.unit}.`
      );
    } else {
      notes.push('Produto sem Marco Zero oficial. Reconstrução iniciada com base zero.');
    }

    let totalEntries = 0;
    let totalExits = 0;
    let totalAdjustments = 0;

    for (const m of posteriorMovements) {
      stepCount++;
      let impact = 0;
      let stepType: TrajectoryStep['type'] = 'entrada';
      let desc = '';

      if (m.type === 'entrada') {
        stepType = 'entrada';
        impact = round2(Number(m.quantity) || 0);
        totalEntries = round2(totalEntries + impact);
        desc = `Entrada (${m.entryType || 'Geral'}${m.supplierOrDonor ? ` - ${m.supplierOrDonor}` : ''})`;
      } else if (m.type === 'saida') {
        stepType = 'saida';
        impact = round2(-(Number(m.quantity) || 0));
        totalExits = round2(totalExits + Math.abs(impact));
        desc = `Saída (${m.sector || 'Geral'}${m.retrievedBy ? ` - ${m.retrievedBy}` : ''})`;
      } else if (m.type === 'ajuste') {
        stepType = 'ajuste';
        // Seção 4: efeito do ajuste = difference (com sinal)
        let diff = m.difference;
        if (diff === undefined || isNaN(Number(diff))) {
          if (
            m.physicalStock !== undefined &&
            m.previousStock !== undefined &&
            !isNaN(Number(m.physicalStock)) &&
            !isNaN(Number(m.previousStock))
          ) {
            diff = round2(Number(m.physicalStock) - Number(m.previousStock));
          } else {
            diff = m.notes?.includes('-') ? -Number(m.quantity) : Number(m.quantity);
          }
        }
        impact = round2(Number(diff) || 0);
        totalAdjustments = round2(totalAdjustments + impact);
        desc = `Ajuste (${m.reason || 'Conciliação Física'})`;
      }

      currentBalance = round2(currentBalance + impact);

      trajectory.push({
        stepNumber: stepCount,
        date: m.date,
        time: m.time,
        movementId: m.id,
        type: stepType,
        description: m.notes ? `${desc} [${m.notes}]` : desc,
        quantity: round2(Number(m.quantity) || 0),
        impact,
        resultingBalance: currentBalance,
      });

      const signStr = impact >= 0 ? `+${impact.toFixed(2)}` : `${impact.toFixed(2)}`;
      trajectoryText.push(
        `[Passo ${stepCount}] ${m.date} ${m.time || ''} | ${signStr} ${product.unit} (${desc}) => Saldo: ${currentBalance.toFixed(2)} ${product.unit} [ID: ${m.id}]`
      );
    }

    const reconstructedBalance = round2(currentBalance);
    const currentStock = round2(Number(product.currentStock || 0));
    const discrepancy = round2(reconstructedBalance - currentStock);
    const isConsistent = Math.abs(discrepancy) <= FLOAT_TOLERANCE;

    trajectoryText.push('----------------------------------------------------------------------');
    trajectoryText.push(
      `Saldo Reconstruído = ${reconstructedBalance.toFixed(2)} ${product.unit} | Saldo Atual no Sistema (currentStock) = ${currentStock.toFixed(2)} ${product.unit}`
    );
    trajectoryText.push(
      `Discrepância = ${discrepancy >= 0 ? '+' : ''}${discrepancy.toFixed(2)} ${product.unit} | Status: ${isConsistent ? 'OK' : 'DIVERGENTE'}`
    );

    if (priorMovements.length > 0) {
      notes.push(
        `${priorMovements.length} movimento(s) anterior(es) ao Marco Zero identificado(s) e preservado(s) fora da janela de reconstrução.`
      );
    }
    if (posteriorMovements.length > 0) {
      notes.push(
        `${posteriorMovements.length} movimentação(ões) posterior(es) ao Marco Zero auditada(s).`
      );
    } else {
      notes.push('Nenhuma movimentação posterior ao Marco Zero registrada.');
    }

    if (!isConsistent) {
      notes.push(
        `DIVERGÊNCIA DETECTADA: O estoque armazenado (${currentStock}) difere do saldo reconstruído (${reconstructedBalance}) por ${discrepânciaToString(discrepancy, product.unit)}.`
      );
    }

    diagnostics.push({
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      currentStock,
      hasMarcoZero,
      marcoZeroDate,
      marcoZeroStock,
      totalEntries,
      totalExits,
      totalAdjustments,
      priorMovementsCount: priorMovements.length,
      movementsCount: posteriorMovements.length,
      reconstructedBalance,
      discrepancy,
      status: isConsistent ? 'OK' : 'DIVERGENTE',
      trajectory,
      trajectoryText,
      possibleDuplicates,
      notes,
    });
  }

  const consistentCount = diagnostics.filter((d) => d.status === 'OK').length;
  const divergentCount = diagnostics.filter((d) => d.status === 'DIVERGENTE').length;
  const withMarcoZeroCount = diagnostics.filter((d) => d.hasMarcoZero).length;

  return {
    auditTimestamp: new Date().toISOString(),
    toleranceUsed: FLOAT_TOLERANCE,
    totalProducts: products.length,
    consistentProductsCount: consistentCount,
    divergentProductsCount: divergentCount,
    productsWithMarcoZeroCount: withMarcoZeroCount,
    totalMovementsAnalyzed: movements.length,
    totalPosteriorMovements,
    totalPriorMovements,
    totalMarcoZeroEstablishmentMovements,
    totalDuplicatesDetected,
    invalidMovementsCount: invalidMovements.length,
    invalidMovements,
    duplicates,
    overallStatus: divergentCount === 0 && invalidMovements.length === 0 ? 'CONSISTENTE' : 'DIVERGENTE',
    diagnostics,
  };
}

function discrepânciaToString(discrepancy: number, unit: string): string {
  if (discrepancy > 0) {
    return `+${discrepancy.toFixed(2)} ${unit} (sistema está abaixo do histórico reconstruído)`;
  }
  return `${discrepancy.toFixed(2)} ${unit} (sistema está acima do histórico reconstruído)`;
}
