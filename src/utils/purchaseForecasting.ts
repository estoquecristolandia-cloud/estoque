import { Product, StockMovement, Unit, InventoryAudit } from '../types';

export type ForecastPeriodDays = 8 | 14 | 21 | 30;
export type ForecastStatus = 'CRITICO' | 'ATENCAO' | 'NORMAL';

export interface ForecastItem {
  id: string;
  name: string;
  category: string;
  unit: Unit;
  currentStock: number;
  dailyAvgConsumption: number;
  consumptionUnitText: string;
  daysAutonomy: number | null;
  autonomyText: string;
  projectedConsumption: number;
  projectedBalance: number;
  safetyStock: number;
  suggestedPurchaseQty: number;
  nextCyclePurchaseQty: number;
  purchaseTiming: 'IMEDIATA' | 'PROXIMA_SEMANA' | 'NAO_NECESSARIA';
  purchaseTimingText: string;
  status: ForecastStatus;
  statusLabel: string;
  statusBadge: string;
  statusOrder: number; // 1: Crítico, 2: Atenção, 3: Normal
  needsPurchase: boolean;
  estimatedUnitPrice: number;
  estimatedTotalCost: number;
  estimatedCost: number;
  usageRule: 'daily' | 'wed_sun' | 'eventual';
  usageRuleDescription: string;
  occurrencesInPeriod: number;
  // Physical Inventory Reconciliation
  physicalStock: number | null;
  physicalDifference: number | null;
  lastInventoryDate: string | null;
  inventoryStatus: 'CONFERIDO' | 'DIVERGENTE' | 'NAO_CONFERIDO';
  inventoryStatusLabel: string;
  hasPhysicalCount: boolean;
  customNote?: string;
  isSectorDemand?: boolean;
}

export interface ForecastSummary {
  totalProducts: number;
  criticalCount: number;
  warningCount: number;
  normalCount: number;
  itemsNeedingPurchaseCount: number;
  totalSuggestedPurchaseUnits: number;
  totalEstimatedCost: number;
  criticalItems: ForecastItem[];
  warningItems: ForecastItem[];
  normalItems: ForecastItem[];
  purchasesList: ForecastItem[];
  allItems: ForecastItem[];
  filteredItems: ForecastItem[];
  periodDays: ForecastPeriodDays;
  baseDate: string;
  baseDateFormatted: string;
  nextPurchaseDate: string;
  nextPurchaseDateFormatted: string;
  nextReviewDate: string;
  nextReviewDateFormatted: string;
  endDate: string;
  endDateFormatted: string;
  analysisTimestamp: string;
  managerialObservation: string;
}

export type PurchaseForecastResult = ForecastSummary;

export interface ForecastFilterOptions {
  category?: string;
  statusFilter?: 'all' | 'critical_only' | 'warning_only' | 'normal_only' | 'buy_only';
  searchTerm?: string;
  onlyNeedsPurchase?: boolean;
}

export interface ForecastHistoryRecord {
  id: string;
  date: string;
  periodDays: number;
  userName: string;
  criticalCount: number;
  warningCount: number;
  normalCount: number;
  itemsForPurchaseCount: number;
  totalUnitsToBuy: number;
  estimatedCost: number;
  topPriorityItems: { name: string; qty: number; unit: string }[];
  createdAt: string;
}

// Estimated market baseline prices (BRL) in LEM/BA for budgeting
export const ESTIMATED_UNIT_PRICES: Record<string, number> = {
  'prod-arroz': 6.2,
  'prod-feijao': 7.5,
  'prod-acucar': 4.8,
  'prod-oleo': 6.5,
  'prod-sal': 2.2,
  'prod-cafe': 18.0,
  'prod-leite': 5.2,
  'prod-macarrao': 4.5,
  'prod-farinha': 4.2,
  'prod-flocao': 2.8,
  'prod-suco': 2.0,
  'prod-alho': 26.0,
  'prod-manteiga': 22.0,
  'prod-milho-pipoca': 4.0,
};

// Reference benchmark counts from Marco Zero (21/08/2026)
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
 * Counts specific weekday occurrences in a future window of N days starting at baseDate.
 * 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday.
 */
function countWeekdayOccurrences(startDateStr: string, days: number, targetDaysOfWeek: number[]): number {
  let count = 0;
  const numDays = Number(days) > 0 ? Number(days) : 8;
  const start = new Date(startDateStr ? (startDateStr.includes('T') ? startDateStr : startDateStr + 'T12:00:00Z') : Date.now());
  if (isNaN(start.getTime())) return 0;
  for (let i = 0; i < numDays; i++) {
    const current = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const dayOfWeek = current.getUTCDay();
    if (targetDaysOfWeek.includes(dayOfWeek)) {
      count++;
    }
  }
  return count;
}

/**
 * Calculates next Tuesday (standard purchase date) and subsequent revision date.
 */
function getCycleDates(baseDateStr: string, periodDays: number) {
  const validPeriodDays = Number(periodDays) > 0 ? Number(periodDays) : 8;
  let base = new Date(baseDateStr ? (baseDateStr.includes('T') ? baseDateStr : baseDateStr + 'T12:00:00Z') : Date.now());
  if (isNaN(base.getTime())) {
    base = new Date();
  }
  
  // Find next Tuesday (2) from base date
  const dayOfWeek = base.getUTCDay();
  let daysUntilTuesday = (2 - dayOfWeek + 7) % 7;
  if (daysUntilTuesday === 0) daysUntilTuesday = 7; // if base is Tuesday, next is in 7 days
  // But if base is Monday (1), daysUntilTuesday = 1 (tomorrow)
  const purchaseDate = new Date(base.getTime() + daysUntilTuesday * 24 * 60 * 60 * 1000);
  
  // Period end date
  const endDate = new Date(base.getTime() + (validPeriodDays - 1) * 24 * 60 * 60 * 1000);

  // Next revision is usually 7 days after purchase
  const nextReviewDate = new Date(purchaseDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  const safeToISO = (d: Date): string => {
    return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
  };

  return {
    purchaseDateStr: safeToISO(purchaseDate),
    endDateStr: safeToISO(endDate),
    nextReviewDateStr: safeToISO(nextReviewDate),
  };
}

/**
 * Pure read-only computation of Purchase Forecast & Stock Autonomy.
 * Does NOT alter any product, stock balance, or movement in any way.
 */
export function calculatePurchaseForecast(
  products: Product[],
  movements: StockMovement[],
  periodDays: ForecastPeriodDays = 8,
  inventoryAudits: InventoryAudit[] = [],
  options?: ForecastFilterOptions,
  customBaseDate?: string
): ForecastSummary {
  const now = new Date();
  const baseDate = customBaseDate || now.toISOString().split('T')[0];
  const { purchaseDateStr, endDateStr, nextReviewDateStr } = getCycleDates(baseDate, periodDays);

  const baseDateFormatted = formatDateBR(baseDate);
  const nextPurchaseDateFormatted = formatDateBR(purchaseDateStr);
  const nextReviewDateFormatted = formatDateBR(nextReviewDateStr);
  const endDateFormatted = formatDateBR(endDateStr);

  // Index latest physical inventory audit per product
  const latestAuditByProduct: Record<string, InventoryAudit> = {};
  if (inventoryAudits && inventoryAudits.length > 0) {
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

  // Count occurrences of Wednesday (3) and Sunday (0) in the upcoming period
  const wedSunOccurrences = countWeekdayOccurrences(baseDate, periodDays, [0, 3]);

  const allItems: ForecastItem[] = products.map((product) => {
    const currentStock = Number(product.currentStock || 0);

    // Identify Usage Rule
    let usageRule: 'daily' | 'wed_sun' | 'eventual' = 'daily';
    let usageRuleDescription = 'Consumo Diário';
    let occurrencesInPeriod: number = periodDays;
    let dailyAvgConsumption = Number(product.dailyAvgConsumption || 0);
    let consumptionUnitText = '';

    const normName = product.name.toLowerCase();
    const normId = product.id.toLowerCase();

    if (normId.includes('flocao') || normName.includes('flocão')) {
      usageRule = 'wed_sun';
      usageRuleDescription = 'Somente Quartas e Domingos (20 pc/preparo)';
      occurrencesInPeriod = wedSunOccurrences;
    } else if (normId.includes('macarrao') || normName.includes('macarrão')) {
      usageRule = 'wed_sun';
      usageRuleDescription = 'Quarta e Domingo (10 pc/preparo)';
      occurrencesInPeriod = wedSunOccurrences;
    } else if (normId.includes('milho-pipoca') || normName.includes('pipoca')) {
      usageRule = 'eventual';
      usageRuleDescription = 'Consumo Eventual';
      occurrencesInPeriod = 0;
    }

    // Determine Projected Consumption & Safety Stock according to rules:
    let projectedConsumption = 0;
    let safetyStock = 0;
    let daysAutonomy: number | null = null;
    let autonomyText = 'Indeterminada';

    if (usageRule === 'daily') {
      // Products with daily consumption (e.g. Arroz: 15 kg/dia, Suco: 2 pct/dia, Sal: 1 kg/dia)
      if (dailyAvgConsumption <= 0) {
        // Fallback to minStock / 3 if dailyAvgConsumption is not set
        dailyAvgConsumption = product.minStock > 0 ? Number((product.minStock / 3).toFixed(1)) : 1;
      }

      consumptionUnitText = `${dailyAvgConsumption} ${product.unit}/dia`;
      projectedConsumption = Number((dailyAvgConsumption * periodDays).toFixed(1));

      // Standard Safety Stock = 3 days of consumption
      // For multi-sector items (Leite, Manteiga, Óleo, Sal), demand occurs across Cozinha, Padaria,
      // Casas Missionárias and Adm without prior notice. An extra safety buffer (4 days) is maintained
      // to absorb unnotified withdrawals and prevent stockouts.
      const lowerName = product.name.toLowerCase();
      const isMultiSector =
        product.id === 'prod-sal' || lowerName.includes('sal') ||
        product.id === 'prod-leite' || lowerName.includes('leite') ||
        product.id === 'prod-oleo' || lowerName.includes('óleo') || lowerName.includes('oleo') ||
        product.id === 'prod-manteiga' || lowerName.includes('manteiga') || lowerName.includes('margarina');

      const safetyBufferDays = isMultiSector ? 4 : 3;
      safetyStock = Number((dailyAvgConsumption * safetyBufferDays).toFixed(1));

      if (dailyAvgConsumption > 0) {
        daysAutonomy = Number((currentStock / dailyAvgConsumption).toFixed(1));
        autonomyText = `${daysAutonomy.toFixed(1).replace('.', ',')} dias`;
      }
    } else if (usageRule === 'wed_sun') {
      // Specific days (Wednesday & Sunday)
      // For Flocão: strictly 20 pacotes per preparation day (used only on Wed & Sun, NOT daily)
      // For Macarrão: ~10 pacotes per preparation day
      const isFlocao = normId.includes('flocao') || normName.includes('flocão');
      const consumptionPerMeal = isFlocao ? 20 : 10;
      dailyAvgConsumption = Number(((consumptionPerMeal * 2) / 7).toFixed(2));
      consumptionUnitText = isFlocao
        ? `20 pacotes/preparo (Qua/Dom - não é diário)`
        : `${consumptionPerMeal} ${product.unit}/preparo (Qua/Dom)`;

      projectedConsumption = occurrencesInPeriod * consumptionPerMeal;
      
      // Safety Stock for weekly items: 1 preparation buffer (e.g. 20 pc for Flocão = ~3.5 days safety buffer)
      safetyStock = consumptionPerMeal;

      // Autonomy calculation based on real preparation rate
      const totalPreparations = Math.floor(currentStock / consumptionPerMeal);
      const remainingPacks = currentStock % consumptionPerMeal;
      if (dailyAvgConsumption > 0) {
        daysAutonomy = Number((currentStock / dailyAvgConsumption).toFixed(1));
        if (isFlocao) {
          autonomyText = `${totalPreparations} preparos (Qua/Dom)${remainingPacks > 0 ? ` +${remainingPacks}pc` : ''} ~${Math.round(daysAutonomy)}d`;
        } else {
          autonomyText = `${totalPreparations} preparos (~${Math.round(daysAutonomy)}d)`;
        }
      }
    } else {
      // Eventual consumption (Milho para pipoca)
      dailyAvgConsumption = 0;
      consumptionUnitText = 'Eventual (sob demanda)';
      projectedConsumption = 0; // No fictitious consumption!
      safetyStock = Number(product.minStock || 2);
      daysAutonomy = null;
      autonomyText = 'Eventual';
    }

    // Saldo Projetado = Estoque Atual - Consumo Previsto no Ciclo
    const projectedBalance = Number((currentStock - projectedConsumption).toFixed(1));

    // Regra Operacional Cristolândia (LEM/BA):
    // 1. SE O ESTOQUE ATUAL ATENDE 100% DO CICLO (currentStock >= projectedConsumption):
    //    A cozinha possui suprimento garantido para todos os preparos até a próxima compra.
    //    Portanto, a Compra Imediata (de amanhã) é ZERO (suggestedPurchaseQty = 0).
    //    Se o saldo restante terminar abaixo da margem de segurança (projectedBalance < safetyStock),
    //    o item entra como ALERTA (🟡 Atenção) com compra prevista para a PRÓXIMA semana (próxima terça-feira).
    //
    // 2. SE O ESTOQUE ATUAL NÃO COBRE O CICLO (currentStock < projectedConsumption):
    //    Haverá risco real de ruptura durante a semana! Compra Imediata é necessária (suggestedPurchaseQty > 0).
    let suggestedPurchaseQty = 0;
    let nextCyclePurchaseQty = 0;
    let purchaseTiming: 'IMEDIATA' | 'PROXIMA_SEMANA' | 'NAO_NECESSARIA' = 'NAO_NECESSARIA';
    let purchaseTimingText = 'Estoque seguro';

    if (currentStock < projectedConsumption) {
      // Compra Imediata necessária para não faltar na semana + repor segurança
      const rawSuggested = projectedConsumption + safetyStock - currentStock;
      suggestedPurchaseQty = Math.max(0, Number(rawSuggested.toFixed(1)));
      purchaseTiming = 'IMEDIATA';
      purchaseTimingText = 'Compra Imediata (Amanhã)';
    } else {
      // Atendido nesta semana: Compra de amanhã é 0
      suggestedPurchaseQty = 0;
      if (projectedBalance < safetyStock) {
        const rawNext = projectedConsumption + safetyStock - projectedBalance;
        nextCyclePurchaseQty = Math.max(0, Number(rawNext.toFixed(1)));
        purchaseTiming = 'PROXIMA_SEMANA';
        purchaseTimingText = 'Suficiente p/ esta semana. Comprar na próxima terça-feira';
      } else {
        purchaseTiming = 'NAO_NECESSARIA';
        purchaseTimingText = 'Estoque suficiente e seguro';
      }
    }

    // Classificação Automática do Status:
    // 🔴 CRÍTICO:
    //  - O estoque não suporta o período projetado (Autonomia < Período ou Saldo Projetado <= 0 ou Estoque Atual <= 0); OU
    //  - haverá ruptura antes do final do período.
    // 🟡 ATENÇÃO:
    //  - O estoque suporta o período, porém terminará abaixo do estoque de segurança (Saldo Projetado < Estoque de Segurança).
    // 🟢 NORMAL:
    //  - O estoque suporta o período e permanece dentro da margem de segurança (Saldo Projetado >= Estoque de Segurança).
    let status: ForecastStatus = 'NORMAL';
    let statusLabel = 'Normal';
    let statusBadge = '🟢 Normal';
    let statusOrder = 3;

    if (
      currentStock <= 0 ||
      projectedBalance <= 0 ||
      (daysAutonomy !== null && daysAutonomy < periodDays)
    ) {
      status = 'CRITICO';
      statusLabel = 'Crítico';
      statusBadge = '🔴 Crítico';
      statusOrder = 1;
    } else if (projectedBalance < safetyStock) {
      status = 'ATENCAO';
      statusLabel = 'Atenção';
      statusBadge = '🟡 Atenção';
      statusOrder = 2;
    } else {
      status = 'NORMAL';
      statusLabel = 'Normal';
      statusBadge = '🟢 Normal';
      statusOrder = 3;
    }

    const needsPurchase = suggestedPurchaseQty > 0;

    // Financial pricing estimate
    const unitPrice = ESTIMATED_UNIT_PRICES[product.id] || 5.0;
    const estimatedTotalCost = Number((suggestedPurchaseQty * unitPrice).toFixed(2));

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

    // Observação personalizada para itens específicos com demanda multissetorial (Cozinha, Padaria, Casas Missionárias e Adm)
    let customNote: string | undefined = undefined;
    let isSectorDemand: boolean | undefined = undefined;

    const lowerName = product.name.toLowerCase();
    if (product.id === 'prod-sal' || lowerName.includes('sal refinado') || lowerName === 'sal') {
      customNote = 'Item multissetorial (Cozinha, Padaria de Fernando Pates, Casas Missionárias e Adm). Sujeito a saídas sem aviso prévio; manter margem de segurança redobrada contra desfalques.';
      isSectorDemand = true;
    } else if (product.id === 'prod-leite' || lowerName.includes('leite')) {
      customNote = 'Item multissetorial (Cozinha, Padaria, Casas Missionárias e Adm). Alto risco de desfalque por saídas avulsas não avisadas previamente; requer monitoramento constante.';
      isSectorDemand = true;
    } else if (product.id === 'prod-oleo' || lowerName.includes('óleo') || lowerName.includes('oleo')) {
      customNote = 'Item multissetorial (Cozinha, Padaria, Casas Missionárias e Adm). Usado em múltiplos setores sem aviso prévio; demanda reserva técnica para não desfalcar preparos diários.';
      isSectorDemand = true;
    } else if (product.id === 'prod-manteiga' || lowerName.includes('manteiga') || lowerName.includes('margarina')) {
      customNote = 'Item multissetorial (Cozinha, Padaria de Fernando Pates e Casas Missionárias). Sujeito a retiradas sem aviso prévio; exige acompanhamento preventivo constante.';
      isSectorDemand = true;
    }

    return {
      id: product.id,
      name: product.name,
      category: product.category,
      unit: product.unit,
      currentStock,
      dailyAvgConsumption,
      consumptionUnitText,
      daysAutonomy,
      autonomyText,
      projectedConsumption,
      projectedBalance,
      safetyStock,
      suggestedPurchaseQty,
      nextCyclePurchaseQty,
      purchaseTiming,
      purchaseTimingText,
      status,
      statusLabel,
      statusBadge,
      statusOrder,
      needsPurchase,
      estimatedUnitPrice: unitPrice,
      estimatedTotalCost,
      estimatedCost: estimatedTotalCost,
      usageRule,
      usageRuleDescription,
      occurrencesInPeriod,
      physicalStock,
      physicalDifference,
      lastInventoryDate,
      inventoryStatus,
      inventoryStatusLabel,
      hasPhysicalCount,
      customNote,
      isSectorDemand,
    };
  });

  // Strict Ordering Rules for the Report:
  // 1. 🔴 Crítico (statusOrder = 1)
  // 2. 🟡 Atenção (statusOrder = 2)
  // 3. 🟢 Normal (statusOrder = 3)
  // Within each group: Lowest autonomy first!
  allItems.sort((a, b) => {
    if (a.statusOrder !== b.statusOrder) {
      return a.statusOrder - b.statusOrder;
    }

    const autA = a.daysAutonomy !== null ? a.daysAutonomy : 9999;
    const autB = b.daysAutonomy !== null ? b.daysAutonomy : 9999;
    if (autA !== autB) return autA - autB;

    return b.suggestedPurchaseQty - a.suggestedPurchaseQty;
  });

  // Apply filters
  let filteredItems = [...allItems];
  if (options?.category && options.category !== 'all' && options.category !== 'todos') {
    filteredItems = filteredItems.filter((i) => i.category === options.category);
  }
  if (options?.statusFilter && options.statusFilter !== 'all') {
    if (options.statusFilter === 'critical_only') {
      filteredItems = filteredItems.filter((i) => i.status === 'CRITICO');
    } else if (options.statusFilter === 'warning_only') {
      filteredItems = filteredItems.filter((i) => i.status === 'ATENCAO');
    } else if (options.statusFilter === 'normal_only') {
      filteredItems = filteredItems.filter((i) => i.status === 'NORMAL');
    } else if (options.statusFilter === 'buy_only') {
      filteredItems = filteredItems.filter((i) => i.suggestedPurchaseQty > 0);
    }
  }
  if (options?.onlyNeedsPurchase) {
    filteredItems = filteredItems.filter((i) => i.suggestedPurchaseQty > 0);
  }
  if (options?.searchTerm && options.searchTerm.trim() !== '') {
    const term = options.searchTerm.toLowerCase().trim();
    filteredItems = filteredItems.filter(
      (i) => i.name.toLowerCase().includes(term) || i.category.toLowerCase().includes(term)
    );
  }

  // Summary Metrics
  const totalProducts = allItems.length;
  const criticalCount = allItems.filter((i) => i.status === 'CRITICO').length;
  const warningCount = allItems.filter((i) => i.status === 'ATENCAO').length;
  const normalCount = allItems.filter((i) => i.status === 'NORMAL').length;

  const criticalItems = allItems.filter((i) => i.status === 'CRITICO');
  const warningItems = allItems.filter((i) => i.status === 'ATENCAO');
  const normalItems = allItems.filter((i) => i.status === 'NORMAL');

  const purchasesList = allItems.filter((i) => i.suggestedPurchaseQty > 0);
  const itemsNeedingPurchaseCount = purchasesList.length;
  const totalSuggestedPurchaseUnits = Number(
    purchasesList.reduce((acc, curr) => acc + curr.suggestedPurchaseQty, 0).toFixed(1)
  );
  const totalEstimatedCost = Number(
    purchasesList.reduce((acc, curr) => acc + curr.estimatedTotalCost, 0).toFixed(2)
  );

  // Automated Managerial Summary Text
  let managerialObservation = `Previsão de abastecimento para o ciclo de ${periodDays} dias (${baseDateFormatted} a ${endDateFormatted}) com compra prevista para ${nextPurchaseDateFormatted}. `;
  if (criticalCount > 0) {
    managerialObservation += `Identificamos ${criticalCount} item(ns) com risco CRÍTICO de ruptura antes do fim do ciclo. `;
  }
  if (warningCount > 0) {
    managerialObservation += `Existem ${warningCount} item(ns) em ATENÇÃO que terminarão abaixo do estoque de segurança. `;
  }
  if (itemsNeedingPurchaseCount > 0) {
    managerialObservation += `Recomendamos a aquisição prioritária de ${itemsNeedingPurchaseCount} produto(s), totalizando +${totalSuggestedPurchaseUnits} unidades/kg para garantir o abastecimento com margem de segurança.`;
  } else {
    managerialObservation += `Todos os produtos permanecem com estoque suficiente e margem de segurança garantida para o período projetado.`;
  }

  return {
    totalProducts,
    criticalCount,
    warningCount,
    normalCount,
    itemsNeedingPurchaseCount,
    totalSuggestedPurchaseUnits,
    totalEstimatedCost,
    criticalItems,
    warningItems,
    normalItems,
    purchasesList,
    allItems,
    filteredItems,
    periodDays,
    baseDate,
    baseDateFormatted,
    nextPurchaseDate: purchaseDateStr,
    nextPurchaseDateFormatted,
    nextReviewDate: nextReviewDateStr,
    nextReviewDateFormatted,
    endDate: endDateStr,
    endDateFormatted,
    analysisTimestamp: now.toISOString(),
    managerialObservation,
  };
}

// Local storage key for forecast history
const FORECAST_HISTORY_STORAGE_KEY = 'cristolandia_purchase_forecast_history';

export function getForecastHistory(): ForecastHistoryRecord[] {
  try {
    const raw = localStorage.getItem(FORECAST_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveForecastSnapshot(
  forecast: ForecastSummary,
  userName: string
): ForecastHistoryRecord {
  const history = getForecastHistory();
  const topPriorityItems = forecast.purchasesList.slice(0, 5).map((i) => ({
    name: i.name,
    qty: i.suggestedPurchaseQty,
    unit: i.unit,
  }));

  const record: ForecastHistoryRecord = {
    id: `forecast-${Date.now()}`,
    date: forecast.baseDate,
    periodDays: forecast.periodDays,
    userName,
    criticalCount: forecast.criticalCount,
    warningCount: forecast.warningCount,
    normalCount: forecast.normalCount,
    itemsForPurchaseCount: forecast.itemsNeedingPurchaseCount,
    totalUnitsToBuy: forecast.totalSuggestedPurchaseUnits,
    estimatedCost: forecast.totalEstimatedCost,
    topPriorityItems,
    createdAt: new Date().toISOString(),
  };

  const updated = [record, ...history].slice(0, 30); // Keep last 30 snapshots
  localStorage.setItem(FORECAST_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  return record;
}


