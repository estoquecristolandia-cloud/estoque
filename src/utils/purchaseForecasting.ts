import { Product, StockMovement, Unit, InventoryAudit } from '../types';

export type ForecastSituation = 'SEM_ESTOQUE' | 'COMPRAR' | 'ATENCAO' | 'CONFORTAVEL';
export type PurchasePriority = 'URGENTE' | 'COMPRAR' | 'ATENCAO' | 'CONFORTAVEL';

export interface ForecastItem {
  id: string;
  name: string;
  category: string;
  unit: Unit;
  currentStock: number;
  minStock: number;
  idealStock: number;
  totalPeriodExits: number;
  dailyAvgConsumption: number;
  daysAutonomy: number | null;
  autonomyText: string;
  suggestedPurchaseQty: number;
  situation: ForecastSituation;
  situationLabel: string;
  situationBadge: string;
  priority: PurchasePriority;
  priorityLabel: string;
  priorityRank: number;
  needsPurchase: boolean;
  hasRecordedConsumption: boolean;
  // Physical Inventory Reconciliation
  physicalStock: number | null;
  physicalDifference: number | null;
  lastInventoryDate: string | null;
  inventoryStatus: 'CONFERIDO' | 'DIVERGENTE' | 'NAO_CONFERIDO';
  inventoryStatusLabel: string;
  hasPhysicalCount: boolean;
}

export interface ForecastSummary {
  totalProducts: number;
  outOfStockCount: number;
  needPurchaseCount: number;
  urgentCount: number;
  warningCount: number;
  comfortableCount: number;
  totalSuggestedPurchaseItems: number;
  totalSuggestedPurchaseUnits: number;
  divergentCount: number;
  reconciledCount: number;
  urgentItems: ForecastItem[];
  purchasesList: ForecastItem[];
  allItems: ForecastItem[];
  filteredItems: ForecastItem[];
  periodDays: number;
  startDate: string;
  endDate: string;
  startDateFormatted: string;
  endDateFormatted: string;
  analysisTimestamp: string;
  managerialObservation: string;
}

export interface ForecastFilterOptions {
  category?: string;
  statusFilter?: 'all' | 'buy_only' | 'urgent_only' | 'warning_only' | 'comfortable_only';
  searchTerm?: string;
}

// Reference fallback counts from the official physical inventory (Marco Zero - 21/08/2026)
export const OFFICIAL_PHYSICAL_BENCHMARK: Record<string, { count: number; date: string }> = {
  'prod-acucar': { count: 35, date: '2026-08-21' },
  'prod-alho': { count: 16.5, date: '2026-08-21' },
  'prod-arroz': { count: 107, date: '2026-08-21' },
  'prod-cafe': { count: 12, date: '2026-08-21' },
  'prod-farinha': { count: 26, date: '2026-08-21' },
  'prod-feijao': { count: 44, date: '2026-08-21' },
  'prod-flocao': { count: 52, date: '2026-08-21' },
  'prod-leite': { count: 18, date: '2026-08-21' },
  'prod-macarrao': { count: 56, date: '2026-08-21' },
  'prod-manteiga': { count: 24, date: '2026-08-21' },
  'prod-milho-pipoca': { count: 10, date: '2026-08-21' },
  'prod-oleo': { count: 11, date: '2026-08-21' },
  'prod-sal': { count: 3, date: '2026-08-21' },
  'prod-suco': { count: 13, date: '2026-08-21' },
};

function formatDateBR(isoDateStr: string): string {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return isoDateStr;
}

/**
 * Pure read-only computation of Purchase Forecast & Stock Autonomy
 * Does NOT alter any product, stock balance, or movement in any way.
 */
export function calculatePurchaseForecast(
  products: Product[],
  movements: StockMovement[],
  periodDays: 7 | 15 | 30 = 30,
  inventoryAudits: InventoryAudit[] = [],
  options?: ForecastFilterOptions
): ForecastSummary {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  
  // Calculate start date cutoff (inclusive)
  const startDateObj = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const startDate = startDateObj.toISOString().split('T')[0];

  const startDateFormatted = formatDateBR(startDate);
  const endDateFormatted = formatDateBR(endDate);

  // Filter ONLY 'saida' movements within the selected period (strictly excluding entries, adjustments, audits, etc.)
  const periodExits = movements.filter(
    (m) => m.type === 'saida' && m.date >= startDate && m.date <= endDate
  );

  // Group exits by productId
  const exitsByProduct: Record<string, number> = {};
  periodExits.forEach((m) => {
    exitsByProduct[m.productId] = (exitsByProduct[m.productId] || 0) + Number(m.quantity || 0);
  });

  // Index latest physical inventory audit per product
  const latestAuditByProduct: Record<string, InventoryAudit> = {};
  if (inventoryAudits && inventoryAudits.length > 0) {
    // Sort descending by date/createdAt
    const sortedAudits = [...inventoryAudits].sort((a, b) => {
      const dateA = a.date || a.createdAt || '';
      const dateB = b.date || b.createdAt || '';
      return dateB.localeCompare(dateA);
    });
    sortedAudits.forEach((audit) => {
      if (!latestAuditByProduct[audit.productId]) {
        latestAuditByProduct[audit.productId] = audit;
      }
    });
  }

  const allItems: ForecastItem[] = products.map((product) => {
    const currentStock = Number(product.currentStock || 0);
    const minStock = Number(product.minStock || 0);
    // Ideal stock (configured on product or fallback)
    const idealStock = product.idealStock !== undefined && product.idealStock > 0
      ? Number(product.idealStock)
      : Math.max(minStock * 2, 10);

    const totalPeriodExits = exitsByProduct[product.id] || 0;
    
    // Consumo Médio Diário = Total de Saídas do período / Número de dias do período analisado
    const dailyAvgConsumption = totalPeriodExits > 0
      ? Number((totalPeriodExits / periodDays).toFixed(2))
      : 0;

    // Previsão de Autonomia = Estoque Atual / Consumo Médio Diário
    let daysAutonomy: number | null = null;
    let autonomyText = 'Indeterminada — sem consumo registrado no período';
    if (dailyAvgConsumption > 0) {
      daysAutonomy = Number((currentStock / dailyAvgConsumption).toFixed(1));
      autonomyText = `${daysAutonomy.toFixed(1)} dias`;
    }

    // Quantidade Sugerida para Compra = max(0, idealStock - currentStock)
    const rawSuggested = Math.max(0, idealStock - currentStock);
    const suggestedPurchaseQty = Number(rawSuggested.toFixed(1));

    // Classificação Automática:
    // 🔴 URGENTE: estoque zerado (<= 0) OU autonomia <= 3 dias
    // 🟠 COMPRAR: estoque abaixo do estoque mínimo OU autonomia <= 7 dias
    // 🟡 ATENÇÃO: estoque próximo do mínimo (<= minStock * 1.5) OU autonomia <= 15 dias
    // 🟢 ESTOQUE CONFORTÁVEL: estoque acima do mínimo e autonomia superior a 15 dias
    let situation: ForecastSituation = 'CONFORTAVEL';
    let situationLabel = 'Estoque Confortável';
    let situationBadge = '🟢 CONFORTÁVEL';
    let priority: PurchasePriority = 'CONFORTAVEL';
    let priorityLabel = '🟢 CONFORTÁVEL';
    let priorityRank = 4;

    if (currentStock <= 0 || (daysAutonomy !== null && daysAutonomy <= 3)) {
      situation = currentStock <= 0 ? 'SEM_ESTOQUE' : 'COMPRAR';
      situationLabel = currentStock <= 0 ? 'Sem Estoque' : 'Urgente';
      situationBadge = currentStock <= 0 ? '⚫ SEM ESTOQUE' : '🔴 URGENTE';
      priority = 'URGENTE';
      priorityLabel = '🔴 URGENTE';
      priorityRank = 1;
    } else if (currentStock <= minStock || (daysAutonomy !== null && daysAutonomy <= 7)) {
      situation = 'COMPRAR';
      situationLabel = 'Comprar';
      situationBadge = '🟠 COMPRAR';
      priority = 'COMPRAR';
      priorityLabel = '🟠 COMPRAR';
      priorityRank = 2;
    } else if (currentStock <= minStock * 1.5 || (daysAutonomy !== null && daysAutonomy <= 15)) {
      situation = 'ATENCAO';
      situationLabel = 'Atenção';
      situationBadge = '🟡 ATENÇÃO';
      priority = 'ATENCAO';
      priorityLabel = '🟡 ATENÇÃO';
      priorityRank = 3;
    } else {
      situation = 'CONFORTAVEL';
      situationLabel = 'Estoque Confortável';
      situationBadge = '🟢 CONFORTÁVEL';
      priority = 'CONFORTAVEL';
      priorityLabel = '🟢 CONFORTÁVEL';
      priorityRank = 4;
    }

    const needsPurchase = suggestedPurchaseQty > 0 || priority === 'URGENTE' || priority === 'COMPRAR' || priority === 'ATENCAO';

    // Physical Inventory Reconciliation
    let physicalStock: number | null = null;
    let physicalDifference: number | null = null;
    let lastInventoryDate: string | null = null;
    let inventoryStatus: 'CONFERIDO' | 'DIVERGENTE' | 'NAO_CONFERIDO' = 'NAO_CONFERIDO';
    let inventoryStatusLabel = 'Sem contagem registrada';
    let hasPhysicalCount = false;

    if (latestAuditByProduct[product.id]) {
      const audit = latestAuditByProduct[product.id];
      physicalStock = Number(audit.physicalStock);
      physicalDifference = Number((physicalStock - currentStock).toFixed(2));
      lastInventoryDate = audit.date || audit.createdAt?.split('T')[0] || null;
      hasPhysicalCount = true;
      if (Math.abs(physicalDifference) < 0.01) {
        inventoryStatus = 'CONFERIDO';
        inventoryStatusLabel = 'CONFERIDO — SEM DIVERGÊNCIA';
      } else {
        inventoryStatus = 'DIVERGENTE';
        inventoryStatusLabel = '⚠️ DIVERGÊNCIA DE INVENTÁRIO';
      }
    } else if (OFFICIAL_PHYSICAL_BENCHMARK[product.id]) {
      const bench = OFFICIAL_PHYSICAL_BENCHMARK[product.id];
      physicalStock = bench.count;
      physicalDifference = Number((physicalStock - currentStock).toFixed(2));
      lastInventoryDate = bench.date;
      hasPhysicalCount = true;
      if (Math.abs(physicalDifference) < 0.01) {
        inventoryStatus = 'CONFERIDO';
        inventoryStatusLabel = 'CONFERIDO — SEM DIVERGÊNCIA';
      } else {
        inventoryStatus = 'DIVERGENTE';
        inventoryStatusLabel = '⚠️ DIVERGÊNCIA DE INVENTÁRIO';
      }
    }

    return {
      id: product.id,
      name: product.name,
      category: product.category,
      unit: product.unit,
      currentStock,
      minStock,
      idealStock,
      totalPeriodExits,
      dailyAvgConsumption,
      daysAutonomy,
      autonomyText,
      suggestedPurchaseQty,
      situation,
      situationLabel,
      situationBadge,
      priority,
      priorityLabel,
      priorityRank,
      needsPurchase,
      hasRecordedConsumption: totalPeriodExits > 0,
      physicalStock,
      physicalDifference,
      lastInventoryDate,
      inventoryStatus,
      inventoryStatusLabel,
      hasPhysicalCount,
    };
  });

  // Strict Ordering Rules for Purchase Priority:
  // 1. Sem estoque (currentStock <= 0)
  // 2. Autonomia menor (menor número de dias restantes)
  // 3. Estoque abaixo do mínimo (currentStock < minStock)
  // 4. Maior necessidade de reposição (suggestedPurchaseQty maior)
  allItems.sort((a, b) => {
    // 1. Sem estoque first
    const aZero = a.currentStock <= 0 ? 1 : 0;
    const bZero = b.currentStock <= 0 ? 1 : 0;
    if (aZero !== bZero) return bZero - aZero;

    // 2. Priority Rank (URGENTE = 1, COMPRAR = 2, ATENCAO = 3, CONFORTAVEL = 4)
    if (a.priorityRank !== b.priorityRank) {
      return a.priorityRank - b.priorityRank;
    }

    // 3. Lowest Autonomy first
    const autA = a.daysAutonomy !== null ? a.daysAutonomy : 9999;
    const autB = b.daysAutonomy !== null ? b.daysAutonomy : 9999;
    if (autA !== autB) return autA - autB;

    // 4. Below minimum check
    const aBelowMin = a.currentStock < a.minStock ? 1 : 0;
    const bBelowMin = b.currentStock < b.minStock ? 1 : 0;
    if (aBelowMin !== bBelowMin) return bBelowMin - aBelowMin;

    // 5. Higher suggested quantity first
    return b.suggestedPurchaseQty - a.suggestedPurchaseQty;
  });

  // Apply filters if provided
  let filteredItems = [...allItems];
  if (options?.category && options.category !== 'all' && options.category !== 'todos') {
    filteredItems = filteredItems.filter((i) => i.category === options.category);
  }
  if (options?.statusFilter && options.statusFilter !== 'all') {
    if (options.statusFilter === 'buy_only') {
      filteredItems = filteredItems.filter((i) => i.priority === 'URGENTE' || i.priority === 'COMPRAR');
    } else if (options.statusFilter === 'urgent_only') {
      filteredItems = filteredItems.filter((i) => i.priority === 'URGENTE');
    } else if (options.statusFilter === 'warning_only') {
      filteredItems = filteredItems.filter((i) => i.priority === 'ATENCAO');
    } else if (options.statusFilter === 'comfortable_only') {
      filteredItems = filteredItems.filter((i) => i.priority === 'CONFORTAVEL');
    }
  }
  if (options?.searchTerm && options.searchTerm.trim() !== '') {
    const term = options.searchTerm.toLowerCase().trim();
    filteredItems = filteredItems.filter(
      (i) => i.name.toLowerCase().includes(term) || i.category.toLowerCase().includes(term)
    );
  }

  // Summary Metrics
  const totalProducts = allItems.length;
  const outOfStockCount = allItems.filter((i) => i.currentStock <= 0).length;
  const urgentCount = allItems.filter((i) => i.priority === 'URGENTE').length;
  const needPurchaseCount = allItems.filter((i) => i.priority === 'COMPRAR').length;
  const warningCount = allItems.filter((i) => i.priority === 'ATENCAO').length;
  const comfortableCount = allItems.filter((i) => i.priority === 'CONFORTAVEL').length;

  const urgentItems = allItems.filter((i) => i.priority === 'URGENTE');
  const purchasesList = allItems.filter((i) => i.suggestedPurchaseQty > 0);
  const totalSuggestedPurchaseItems = purchasesList.length;
  const totalSuggestedPurchaseUnits = Number(
    purchasesList.reduce((acc, curr) => acc + curr.suggestedPurchaseQty, 0).toFixed(1)
  );

  const divergentCount = allItems.filter((i) => i.inventoryStatus === 'DIVERGENTE').length;
  const reconciledCount = allItems.filter((i) => i.inventoryStatus === 'CONFERIDO').length;

  // Automated Managerial Summary Text
  const todayBR = now.toLocaleDateString('pt-BR');
  const totalNeedingAction = purchasesList.length;
  let managerialObservation = `Na data de emissão deste relatório (${todayBR}), foram analisados ${totalProducts} produtos cadastrados no almoxarifado da Cristolândia (LEM/BA) com base nas saídas reais dos últimos ${periodDays} dias (${startDateFormatted} a ${endDateFormatted}). `;

  if (totalNeedingAction === 0) {
    managerialObservation += `Todos os ${totalProducts} produtos encontram-se abastecidos e dentro dos níveis de segurança operacional, sem necessidade imediata de aquisição de reposição.`;
  } else {
    managerialObservation += `Existem ${totalNeedingAction} produtos com necessidade de reposição para atingir o estoque ideal, sendo ${urgentCount} classificado(s) como de prioridade URGENTE e ${needPurchaseCount} com prioridade de COMPRA. `;
    if (urgentItems.length > 0) {
      const urgentListText = urgentItems
        .map((i) => `${i.name} (Atual: ${i.currentStock} ${i.unit}, Sugerido: +${i.suggestedPurchaseQty} ${i.unit})`)
        .join('; ');
      managerialObservation += `Os itens prioritários são: ${urgentListText}. `;
    }
    if (divergentCount > 0) {
      managerialObservation += `Observa-se ainda que ${divergentCount} produto(s) apresentam divergência entre o saldo do sistema e a última contagem física registrada para conferência da Coordenação.`;
    } else {
      managerialObservation += `O estoque físico conferido encontra-se devidamente conciliado com os saldos do sistema.`;
    }
  }

  return {
    totalProducts,
    outOfStockCount,
    needPurchaseCount,
    urgentCount,
    warningCount,
    comfortableCount,
    totalSuggestedPurchaseItems,
    totalSuggestedPurchaseUnits,
    divergentCount,
    reconciledCount,
    urgentItems,
    purchasesList,
    allItems,
    filteredItems,
    periodDays,
    startDate,
    endDate,
    startDateFormatted,
    endDateFormatted,
    analysisTimestamp: now.toISOString(),
    managerialObservation,
  };
}

