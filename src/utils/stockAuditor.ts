import { Product, StockMovement, InventoryAudit, InventorySessionSummary } from '../types';

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
  reconstructedBalance: number;
  discrepancy: number;
  movementsCount: number;
  possibleDuplicates: Array<{
    movementAId: string;
    movementBId: string;
    type: string;
    quantity: number;
    date: string;
    time?: string;
    reason: string;
  }>;
  status: 'OK' | 'DIVERGENTE';
  notes: string[];
}

export interface StockAuditReportSummary {
  auditTimestamp: string;
  totalProducts: number;
  consistentProductsCount: number;
  divergentProductsCount: number;
  productsWithMarcoZeroCount: number;
  totalMovementsAnalyzed: number;
  totalDuplicatesDetected: number;
  overallStatus: 'CONSISTENTE' | 'DIVERGENTE';
  diagnostics: ProductAuditDiagnostic[];
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

/**
 * PURE READ-ONLY FUNCTION:
 * Performs an exact mathematical consistency audit across products and movements.
 * Does NOT write, mutate, or alter anything in Firestore or localStorage.
 */
export function runStockMathematicalAudit(
  products: Product[],
  movements: StockMovement[],
  inventoryAudits: InventoryAudit[] = [],
  _inventorySessions: InventorySessionSummary[] = []
): StockAuditReportSummary {
  const diagnostics: ProductAuditDiagnostic[] = [];
  let totalDuplicatesDetected = 0;

  for (const product of products) {
    const prodMovements = movements
      .filter((m) => m.productId === product.id)
      .sort((a, b) => {
        const dateComp = (a.date || '').localeCompare(b.date || '');
        if (dateComp !== 0) return dateComp;
        const timeComp = (a.time || '').localeCompare(b.time || '');
        if (timeComp !== 0) return timeComp;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });

    // Detect potential duplicates: same product, same type, same quantity, same date/time within short window
    const possibleDuplicates: ProductAuditDiagnostic['possibleDuplicates'] = [];
    for (let i = 0; i < prodMovements.length; i++) {
      for (let j = i + 1; j < prodMovements.length; j++) {
        const movA = prodMovements[i];
        const movB = prodMovements[j];

        if (
          movA.type === movB.type &&
          movA.quantity === movB.quantity &&
          movA.date === movB.date
        ) {
          // Check time proximity
          const timeA = movA.time || '';
          const timeB = movB.time || '';
          const sameMinute = timeA === timeB;
          
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
    totalDuplicatesDetected += possibleDuplicates.length;

    // Check for Marco Zero / Latest Adjustment Movement
    // Find the latest adjustment movement or inventory audit for this product
    const adjustmentMovements = prodMovements.filter((m) => m.type === 'ajuste');
    const latestAdjustment = adjustmentMovements.length > 0 ? adjustmentMovements[adjustmentMovements.length - 1] : null;

    let hasMarcoZero = false;
    let marcoZeroDate: string | undefined;
    let marcoZeroStock: number | undefined;
    let totalEntries = 0;
    let totalExits = 0;
    let totalAdjustments = 0;
    let reconstructedBalance = 0;
    const notes: string[] = [];

    if (latestAdjustment && latestAdjustment.physicalStock !== undefined) {
      // Anchored by Marco Zero / Audited Physical Adjustment
      hasMarcoZero = true;
      marcoZeroDate = `${latestAdjustment.date} ${latestAdjustment.time || ''}`.trim();
      marcoZeroStock = round2(latestAdjustment.physicalStock);

      // Movements strictly after the latest Marco Zero
      const postMarcoZeroMovements = prodMovements.filter((m) => {
        if (m.id === latestAdjustment.id) return false;
        const dateComp = (m.date || '').localeCompare(latestAdjustment.date || '');
        if (dateComp > 0) return true;
        if (dateComp < 0) return false;
        const timeComp = (m.time || '').localeCompare(latestAdjustment.time || '');
        if (timeComp > 0) return true;
        if (timeComp < 0) return false;
        return (m.createdAt || '').localeCompare(latestAdjustment.createdAt || '') > 0;
      });

      for (const m of postMarcoZeroMovements) {
        if (m.type === 'entrada') {
          totalEntries = round2(totalEntries + m.quantity);
        } else if (m.type === 'saida') {
          totalExits = round2(totalExits + m.quantity);
        } else if (m.type === 'ajuste') {
          const diff = m.difference !== undefined ? m.difference : 0;
          totalAdjustments = round2(totalAdjustments + diff);
        }
      }

      reconstructedBalance = round2(marcoZeroStock + totalEntries - totalExits + totalAdjustments);
      notes.push(`Marco Zero apurado em ${marcoZeroDate}: saldo físico base de ${marcoZeroStock} ${product.unit}.`);
      if (postMarcoZeroMovements.length > 0) {
        notes.push(`${postMarcoZeroMovements.length} movimentação(ões) pós-Marco Zero processada(s).`);
      } else {
        notes.push('Nenhuma movimentação subsequente após o Marco Zero.');
      }
    } else {
      // No explicit Marco Zero adjustment recorded yet
      // Check if all movements from inception reconcile with currentStock
      for (const m of prodMovements) {
        if (m.type === 'entrada') {
          totalEntries = round2(totalEntries + m.quantity);
        } else if (m.type === 'saida') {
          totalExits = round2(totalExits + m.quantity);
        } else if (m.type === 'ajuste') {
          const diff = m.difference !== undefined ? m.difference : 0;
          totalAdjustments = round2(totalAdjustments + diff);
        }
      }

      // If no movements exist, reconstructed balance is the current stock
      reconstructedBalance = round2(product.currentStock);
      notes.push('Sem Marco Zero registrado. Saldo atual validado pela base cadastral.');
    }

    const currentStock = round2(Number(product.currentStock || 0));
    const discrepancy = round2(reconstructedBalance - currentStock);
    const isConsistent = Math.abs(discrepancy) < 0.001;

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
      reconstructedBalance,
      discrepancy,
      movementsCount: prodMovements.length,
      possibleDuplicates,
      status: isConsistent ? 'OK' : 'DIVERGENTE',
      notes,
    });
  }

  const consistentCount = diagnostics.filter((d) => d.status === 'OK').length;
  const divergentCount = diagnostics.filter((d) => d.status === 'DIVERGENTE').length;
  const withMarcoZeroCount = diagnostics.filter((d) => d.hasMarcoZero).length;

  return {
    auditTimestamp: new Date().toISOString(),
    totalProducts: products.length,
    consistentProductsCount: consistentCount,
    divergentProductsCount: divergentCount,
    productsWithMarcoZeroCount: withMarcoZeroCount,
    totalMovementsAnalyzed: movements.length,
    totalDuplicatesDetected,
    overallStatus: divergentCount === 0 ? 'CONSISTENTE' : 'DIVERGENTE',
    diagnostics,
  };
}
