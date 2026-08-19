import { Product, StockMovement, DailyKit, AuditReport, EntryType, Missionary } from '../types';
import { INITIAL_PRODUCTS, INITIAL_MOVEMENTS, DEFAULT_DAILY_KIT, INITIAL_MISSIONARIES } from '../data/initialData';

const PRODUCTS_KEY = 'cristolandia_products_v40';
const MOVEMENTS_KEY = 'cristolandia_movements_v40';
const DAILY_KIT_KEY = 'cristolandia_daily_kit_v40';
const MISSIONARIES_KEY = 'cristolandia_missionaries_v4';

export function getStoredMissionaries(): Missionary[] {
  try {
    const data = localStorage.getItem(MISSIONARIES_KEY);
    if (!data) {
      localStorage.setItem(MISSIONARIES_KEY, JSON.stringify(INITIAL_MISSIONARIES));
      return INITIAL_MISSIONARIES;
    }
    const parsed = JSON.parse(data) as Missionary[];
    return parsed.length > 0 ? parsed : INITIAL_MISSIONARIES;
  } catch {
    return INITIAL_MISSIONARIES;
  }
}

export function saveMissionaries(missionaries: Missionary[]): void {
  try {
    localStorage.setItem(MISSIONARIES_KEY, JSON.stringify(missionaries));
  } catch (err) {
    console.error('Error saving missionaries:', err);
  }
}

export function getStoredProducts(): Product[] {
  try {
    const data = localStorage.getItem(PRODUCTS_KEY);
    if (!data) {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    const parsed = JSON.parse(data) as Product[];
    // Filter out any products not in INITIAL_PRODUCTS
    const validIds = new Set(INITIAL_PRODUCTS.map((p) => p.id));
    const filtered = parsed.filter((p) => validIds.has(p.id));

    // Merge missing products from INITIAL_PRODUCTS that are not in localStorage
    const storedIds = new Set(filtered.map((p) => p.id));
    const missingProducts = INITIAL_PRODUCTS.filter((p) => !storedIds.has(p.id));

    if (filtered.length === 0 && missingProducts.length > 0) {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }

    const merged = [...filtered, ...missingProducts];
    if (missingProducts.length > 0) {
      saveProducts(merged);
    }
    return merged;
  } catch {
    return INITIAL_PRODUCTS;
  }
}

export function saveProducts(products: Product[]): void {
  try {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  } catch (err) {
    console.error('Error saving products:', err);
  }
}

export function getStoredMovements(): StockMovement[] {
  try {
    const data = localStorage.getItem(MOVEMENTS_KEY);
    if (!data) {
      localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(INITIAL_MOVEMENTS));
      return INITIAL_MOVEMENTS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_MOVEMENTS;
  }
}

export function saveMovements(movements: StockMovement[]): void {
  try {
    localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements));
  } catch (err) {
    console.error('Error saving movements:', err);
  }
}

export function getStoredDailyKit(): DailyKit {
  try {
    const data = localStorage.getItem(DAILY_KIT_KEY);
    if (!data) {
      localStorage.setItem(DAILY_KIT_KEY, JSON.stringify(DEFAULT_DAILY_KIT));
      return DEFAULT_DAILY_KIT;
    }
    return JSON.parse(data);
  } catch {
    return DEFAULT_DAILY_KIT;
  }
}

export function saveDailyKit(kit: DailyKit): void {
  try {
    localStorage.setItem(DAILY_KIT_KEY, JSON.stringify(kit));
  } catch (err) {
    console.error('Error saving daily kit:', err);
  }
}

export function resetAllDataToDefault(): { products: Product[]; movements: StockMovement[] } {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
  localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(INITIAL_MOVEMENTS));
  localStorage.setItem(DAILY_KIT_KEY, JSON.stringify(DEFAULT_DAILY_KIT));
  return { products: INITIAL_PRODUCTS, movements: INITIAL_MOVEMENTS };
}

// Helper calculations
export function getProductAlertDays(product: Product): number {
  if (product.alertDays && product.alertDays > 0) {
    return product.alertDays;
  }
  return 3;
}

export function calculateDaysRemaining(product: Product): number {
  if (!product.dailyAvgConsumption || product.dailyAvgConsumption <= 0) {
    return 999;
  }
  const days = product.currentStock / product.dailyAvgConsumption;
  return Math.round(days * 10) / 10; // 1 decimal place e.g. 5.8
}

export function getProductStockStatus(product: Product): 'critical' | 'warning' | 'normal' {
  const days = calculateDaysRemaining(product);
  const alertDays = getProductAlertDays(product);

  if (days <= 0 || product.currentStock <= 0) {
    return 'critical';
  }
  if (days <= 1.5 || product.currentStock <= product.minStock / 2) {
    return 'critical';
  }
  if (days <= alertDays || days <= 3 || product.currentStock <= product.minStock) {
    return 'warning';
  }
  return 'normal';
}

export function formatDaysRemainingText(days: number): string {
  if (days >= 900) return 'Consumo não estimado';
  if (days <= 0) return 'Estoque esgotado!';
  if (days === 1) return '1 dia restante';
  return `${days} dias restantes`;
}

export function getRecommendedPurchaseDate(products: Product[]): { dateStr: string; criticalCount: number } {
  let minDays = 999;
  let criticalCount = 0;

  products.forEach((p) => {
    const days = calculateDaysRemaining(p);
    if (days <= 3 || p.currentStock <= p.minStock) {
      criticalCount++;
    }
    if (days < minDays) {
      minDays = days;
    }
  });

  const today = new Date();
  // Safe buffer: target purchase date with 3-day lead time buffer
  const targetDaysAhead = Math.max(1, Math.min(Math.floor(minDays) - 1, 3));
  const targetDate = new Date(today.getTime() + targetDaysAhead * 24 * 60 * 60 * 1000);

  const day = String(targetDate.getDate()).padStart(2, '0');
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const year = targetDate.getFullYear();

  return {
    dateStr: `${day}/${month}/${year}`,
    criticalCount,
  };
}

export function addEntryMovement(
  product: Product,
  quantity: number,
  entryType: EntryType,
  supplierOrDonor: string,
  receivedBy: string,
  date: string,
  time: string,
  notes: string,
  allProducts: Product[],
  allMovements: StockMovement[]
): { updatedProducts: Product[]; updatedMovements: StockMovement[] } {
  const newStock = product.currentStock + quantity;

  const updatedProducts = allProducts.map((p) =>
    p.id === product.id
      ? {
          ...p,
          currentStock: newStock,
          lastUpdated: new Date().toISOString(),
        }
      : p
  );

  const newMovement: StockMovement = {
    id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    productId: product.id,
    productName: product.name,
    unit: product.unit,
    type: 'entrada',
    quantity,
    date,
    time: time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    entryType,
    supplierOrDonor,
    receivedBy,
    notes,
    createdAt: new Date().toISOString(),
  };

  const updatedMovements = [newMovement, ...allMovements];

  saveProducts(updatedProducts);
  saveMovements(updatedMovements);

  return { updatedProducts, updatedMovements };
}

export function addExitMovement(
  product: Product,
  quantity: number,
  sector: any,
  retrievedBy: string,
  deliveredBy: string,
  date: string,
  time: string,
  notes: string,
  allProducts: Product[],
  allMovements: StockMovement[]
): { updatedProducts: Product[]; updatedMovements: StockMovement[] } {
  if (quantity > product.currentStock) {
    throw new Error(`Quantidade solicitada (${quantity} ${product.unit}) é maior do que o estoque atual (${product.currentStock} ${product.unit}).`);
  }

  const newStock = Math.max(0, product.currentStock - quantity);

  const updatedProducts = allProducts.map((p) =>
    p.id === product.id
      ? {
          ...p,
          currentStock: newStock,
          lastUpdated: new Date().toISOString(),
        }
      : p
  );

  const newMovement: StockMovement = {
    id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    productId: product.id,
    productName: product.name,
    unit: product.unit,
    type: 'saida',
    quantity,
    date,
    time: time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    sector,
    retrievedBy,
    deliveredBy,
    notes,
    createdAt: new Date().toISOString(),
  };

  const updatedMovements = [newMovement, ...allMovements];

  saveProducts(updatedProducts);
  saveMovements(updatedMovements);

  return { updatedProducts, updatedMovements };
}

export function addBatchExitMovements(
  items: Array<{ product: Product; quantity: number }>,
  sector: any,
  retrievedBy: string,
  deliveredBy: string,
  date: string,
  time: string,
  notes: string,
  allProducts: Product[],
  allMovements: StockMovement[]
): { updatedProducts: Product[]; updatedMovements: StockMovement[] } {
  // Phase 1: Validate stock for all items before applying any changes
  const stockCheckMap = new Map<string, number>();
  for (const item of items) {
    const prod = allProducts.find((p) => p.id === item.product.id);
    if (!prod) continue;

    const currentTotalRequested = (stockCheckMap.get(prod.id) || 0) + item.quantity;
    if (currentTotalRequested > prod.currentStock) {
      throw new Error(`Estoque insuficiente para ${prod.name}! Saldo disponível: ${prod.currentStock} ${prod.unit}.`);
    }
    stockCheckMap.set(prod.id, currentTotalRequested);
  }

  // Phase 2: Apply stock deductions and construct movements
  let updatedProducts = [...allProducts];
  const newMovements: StockMovement[] = [];

  items.forEach((item, index) => {
    const prod = updatedProducts.find((p) => p.id === item.product.id);
    if (!prod) return;

    const newStock = Math.max(0, prod.currentStock - item.quantity);

    updatedProducts = updatedProducts.map((p) =>
      p.id === prod.id
        ? {
            ...p,
            currentStock: newStock,
            lastUpdated: new Date().toISOString(),
          }
        : p
    );

    newMovements.push({
      id: `mov-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
      productId: prod.id,
      productName: prod.name,
      unit: prod.unit,
      type: 'saida',
      quantity: item.quantity,
      date,
      time: time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      sector,
      retrievedBy,
      deliveredBy,
      notes: notes ? notes : '',
      createdAt: new Date().toISOString(),
    });
  });

  const updatedMovements = [...newMovements, ...allMovements];

  saveProducts(updatedProducts);
  saveMovements(updatedMovements);

  return { updatedProducts, updatedMovements };
}

export function executeDailyKitDelivery(
  kit: DailyKit,
  retrievedBy: string,
  deliveredBy: string,
  date: string,
  time: string,
  allProducts: Product[],
  allMovements: StockMovement[]
): { updatedProducts: Product[]; updatedMovements: StockMovement[]; deliveredCount: number; warnings: string[] } {
  let currentProds = [...allProducts];
  let currentMovs = [...allMovements];
  let deliveredCount = 0;
  const warnings: string[] = [];

  const nowIso = new Date().toISOString();

  kit.items.forEach((item, index) => {
    const prod = currentProds.find((p) => p.id === item.productId || p.name.toLowerCase() === item.productName.toLowerCase());
    if (!prod) {
      warnings.push(`Produto "${item.productName}" não encontrado no cadastro.`);
      return;
    }

    if (item.quantity > prod.currentStock) {
      warnings.push(`Estoque insuficiente para ${prod.name}: necessário ${item.quantity}${prod.unit}, disponível ${prod.currentStock}${prod.unit}.`);
      return;
    }

    const newStock = Math.max(0, prod.currentStock - item.quantity);
    currentProds = currentProds.map((p) => (p.id === prod.id ? { ...p, currentStock: newStock, lastUpdated: nowIso } : p));

    const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? `mov-kit-${crypto.randomUUID()}`
      : `mov-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`;

    const newMov: StockMovement = {
      id: uniqueId,
      productId: prod.id,
      productName: prod.name,
      unit: prod.unit,
      type: 'saida',
      quantity: item.quantity,
      date,
      time: time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      sector: kit.sector,
      retrievedBy: retrievedBy || kit.defaultRetriever,
      deliveredBy: deliveredBy || kit.defaultDeliverer,
      notes: `Entrega Automática do ${kit.name}`,
      createdAt: nowIso,
    };

    currentMovs = [newMov, ...currentMovs];
    deliveredCount++;
  });

  saveProducts(currentProds);
  saveMovements(currentMovs);

  return {
    updatedProducts: currentProds,
    updatedMovements: currentMovs,
    deliveredCount,
    warnings,
  };
}

export function updateStockMovement(
  movementId: string,
  updatedData: Partial<StockMovement> & { productId: string; quantity: number; type: 'entrada' | 'saida' },
  allProducts: Product[],
  allMovements: StockMovement[]
): { updatedProducts: Product[]; updatedMovements: StockMovement[] } {
  const oldMovement = allMovements.find((m) => m.id === movementId);
  if (!oldMovement) {
    throw new Error('Movimentação não encontrada.');
  }

  const newQty = Number(updatedData.quantity);
  if (isNaN(newQty) || newQty <= 0) {
    throw new Error('Informe uma quantidade válida maior que zero.');
  }

  let updatedProducts = [...allProducts];

  // 1. Revert old movement stock impact
  const oldProdIndex = updatedProducts.findIndex((p) => p.id === oldMovement.productId);
  if (oldProdIndex !== -1) {
    const oldProd = updatedProducts[oldProdIndex];
    let revertedStock = oldProd.currentStock;
    if (oldMovement.type === 'entrada') {
      revertedStock -= oldMovement.quantity;
    } else {
      revertedStock += oldMovement.quantity;
    }
    updatedProducts[oldProdIndex] = {
      ...oldProd,
      currentStock: Math.max(0, revertedStock),
      lastUpdated: new Date().toISOString(),
    };
  }

  // 2. Find target product for new movement data
  const targetProdIndex = updatedProducts.findIndex((p) => p.id === updatedData.productId);
  if (targetProdIndex === -1) {
    throw new Error('Produto selecionado para a movimentação não foi encontrado.');
  }

  const targetProd = updatedProducts[targetProdIndex];

  // Apply new movement stock impact
  let finalStock = targetProd.currentStock;
  if (updatedData.type === 'entrada') {
    finalStock += newQty;
  } else {
    if (newQty > finalStock) {
      throw new Error(`Estoque insuficiente em "${targetProd.name}"! Saldo disponível após ajuste: ${finalStock} ${targetProd.unit}.`);
    }
    finalStock -= newQty;
  }

  updatedProducts[targetProdIndex] = {
    ...targetProd,
    unit: updatedData.unit || targetProd.unit,
    currentStock: Math.max(0, finalStock),
    lastUpdated: new Date().toISOString(),
  };

  // 3. Update movement record
  const updatedMovements = allMovements.map((m) => {
    if (m.id === movementId) {
      return {
        ...m,
        ...updatedData,
        productName: targetProd.name,
        unit: targetProd.unit,
        quantity: newQty,
      };
    }
    return m;
  });

  saveProducts(updatedProducts);
  saveMovements(updatedMovements);

  return { updatedProducts, updatedMovements };
}

export function deleteStockMovement(
  movementId: string,
  allProducts: Product[],
  allMovements: StockMovement[]
): { updatedProducts: Product[]; updatedMovements: StockMovement[] } {
  const oldMovement = allMovements.find((m) => m.id === movementId);
  if (!oldMovement) {
    throw new Error('Movimentação não encontrada.');
  }

  let updatedProducts = [...allProducts];

  // Revert stock impact
  const oldProdIndex = updatedProducts.findIndex((p) => p.id === oldMovement.productId);
  if (oldProdIndex !== -1) {
    const oldProd = updatedProducts[oldProdIndex];
    let revertedStock = oldProd.currentStock;
    if (oldMovement.type === 'entrada') {
      revertedStock -= oldMovement.quantity;
    } else {
      revertedStock += oldMovement.quantity;
    }
    updatedProducts[oldProdIndex] = {
      ...oldProd,
      currentStock: Math.max(0, revertedStock),
      lastUpdated: new Date().toISOString(),
    };
  }

  const updatedMovements = allMovements.filter((m) => m.id !== movementId);

  saveProducts(updatedProducts);
  saveMovements(updatedMovements);

  return { updatedProducts, updatedMovements };
}

export function verifyProductAudit(
  product: Product,
  movements: StockMovement[],
  startDate?: string,
  endDate?: string
): AuditReport {
  const prodMovs = movements.filter((m) => m.productId === product.id);

  let initialStock = 0;
  let totalEntries = 0;
  let totalExits = 0;

  prodMovs.forEach((m) => {
    if (startDate && m.date < startDate) {
      // Prior to selected range -> builds initial balance
      if (m.type === 'entrada') {
        initialStock += m.quantity;
      } else {
        initialStock -= m.quantity;
      }
    } else if ((!startDate || m.date >= startDate) && (!endDate || m.date <= endDate)) {
      // Within selected date range
      if (m.type === 'entrada') {
        totalEntries += m.quantity;
      } else {
        totalExits += m.quantity;
      }
    }
  });

  const calculatedBalance = Math.max(0, initialStock + totalEntries - totalExits);
  const discrepancy = product.currentStock - calculatedBalance;

  return {
    productId: product.id,
    productName: product.name,
    initialStock,
    totalEntries,
    totalExits,
    calculatedBalance,
    currentStock: product.currentStock,
    isBalanced: Math.abs(discrepancy) < 0.01,
    discrepancy,
  };
}
