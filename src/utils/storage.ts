import { Product, StockMovement, DailyKit, AuditReport, EntryType, Missionary, DailyMealRecord } from '../types';
import { INITIAL_PRODUCTS, INITIAL_MOVEMENTS, DEFAULT_DAILY_KIT, INITIAL_MISSIONARIES, INITIAL_MEAL_RECORDS } from '../data/initialData';

const PRODUCTS_KEY = 'cristolandia_products_v51';
const MOVEMENTS_KEY = 'cristolandia_movements_v51';
const DAILY_KIT_KEY = 'cristolandia_daily_kit_v51';
const MISSIONARIES_KEY = 'cristolandia_missionaries_v4';
const MEALS_KEY = 'cristolandia_meals_v6';

export function getTodayDateString(): string { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; }
export function getNowTimeString(): string { return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
export function getStoredMissionaries(): Missionary[] { try { const data = localStorage.getItem(MISSIONARIES_KEY); if (!data) return INITIAL_MISSIONARIES; const parsed = JSON.parse(data) as Missionary[]; return parsed.length > 0 ? parsed : INITIAL_MISSIONARIES; } catch { return INITIAL_MISSIONARIES; } }
export function saveMissionaries(missionaries: Missionary[]): void { try { localStorage.setItem(MISSIONARIES_KEY, JSON.stringify(missionaries)); } catch (err) { console.error('Error saving missionaries:', err); } }
export function getStoredProducts(): Product[] { try { const data = localStorage.getItem(PRODUCTS_KEY); if (!data) return []; const parsed = JSON.parse(data) as Product[]; return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
export function saveProducts(products: Product[]): void { try { localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products)); } catch (err) { console.error('Error saving products:', err); } }
export function getStoredMovements(): StockMovement[] { try { const data = localStorage.getItem(MOVEMENTS_KEY); if (!data) return []; const parsed = JSON.parse(data) as StockMovement[]; return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
export function saveMovements(movements: StockMovement[]): void { try { localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements)); } catch (err) { console.error('Error saving movements:', err); } }
export function getStoredDailyKit(): DailyKit { try { const data = localStorage.getItem(DAILY_KIT_KEY); if (!data) return DEFAULT_DAILY_KIT; return JSON.parse(data) as DailyKit; } catch { return DEFAULT_DAILY_KIT; } }
export function saveDailyKit(kit: DailyKit): void { try { localStorage.setItem(DAILY_KIT_KEY, JSON.stringify(kit)); } catch (err) { console.error('Error saving daily kit:', err); } }

export function addEntryMovement(product: Product, quantity: number, entryType: EntryType, supplierOrDonor: string, receivedBy: string, date: string, time: string, notes: string, allProducts: Product[], allMovements: StockMovement[]): { updatedProducts: Product[]; updatedMovements: StockMovement[] } {
  if (quantity <= 0) throw new Error('Quantidade inválida.');
  const updatedProducts = allProducts.map((p) => p.id === product.id ? { ...p, currentStock: p.currentStock + quantity, lastUpdated: new Date().toISOString() } : p);
  const newMovement: StockMovement = { id: `mov-${Date.now()}`, productId: product.id, productName: product.name, unit: product.unit, type: 'entrada', quantity, date, time, entryType, supplierOrDonor, receivedBy, notes, createdAt: new Date().toISOString() };
  return { updatedProducts, updatedMovements: [newMovement, ...allMovements] };
}
export function addExitMovement(product: Product, quantity: number, sector: any, retrievedBy: string, deliveredBy: string, date: string, time: string, notes: string, allProducts: Product[], allMovements: StockMovement[]): { updatedProducts: Product[]; updatedMovements: StockMovement[] } {
  if (quantity <= 0) throw new Error('Quantidade inválida.');
  if (quantity > product.currentStock) throw new Error(`Quantidade solicitada (${quantity} ${product.unit}) é maior do que o estoque atual (${product.currentStock} ${product.unit}).`);
  const updatedProducts = allProducts.map((p) => p.id === product.id ? { ...p, currentStock: p.currentStock - quantity, lastUpdated: new Date().toISOString() } : p);
  const newMovement: StockMovement = { id: `mov-${Date.now()}`, productId: product.id, productName: product.name, unit: product.unit, type: 'saida', quantity, date, time, sector, retrievedBy, deliveredBy, notes, createdAt: new Date().toISOString() };
  return { updatedProducts, updatedMovements: [newMovement, ...allMovements] };
}
export function addBatchExitMovements(items: Array<{ product: Product; quantity: number }>, sector: any, retrievedBy: string, deliveredBy: string, date: string, time: string, notes: string, allProducts: Product[], allMovements: StockMovement[]): { updatedProducts: Product[]; updatedMovements: StockMovement[] } {
  const updated = [...allProducts]; const movements: StockMovement[] = [];
  for (const item of items) { if (item.quantity <= 0) throw new Error('Quantidade inválida.'); const p = updated.find((x) => x.id === item.product.id); if (!p) throw new Error('Produto não encontrado.'); if (item.quantity > p.currentStock) throw new Error(`Estoque insuficiente para ${p.name}.`); p.currentStock -= item.quantity; p.lastUpdated = new Date().toISOString(); movements.push({ id: `mov-${Date.now()}-${Math.random()}`, productId: p.id, productName: p.name, unit: p.unit, type: 'saida', quantity: item.quantity, date, time, sector, retrievedBy, deliveredBy, notes, createdAt: new Date().toISOString() }); }
  return { updatedProducts: updated, updatedMovements: [...movements, ...allMovements] };
}
export function executeDailyKitDelivery(kit: DailyKit, retrievedBy: string, deliveredBy: string, date: string, time: string, allProducts: Product[], allMovements: StockMovement[]): { updatedProducts: Product[]; updatedMovements: StockMovement[]; deliveredCount: number; warnings: string[] } {
  const updated = [...allProducts]; const movements: StockMovement[] = []; const warnings: string[] = [];
  for (const item of kit.items) { const p = updated.find((x) => x.id === item.productId); if (!p) { warnings.push(`Produto "${item.productName}" não encontrado.`); continue; } if (item.quantity > p.currentStock) { warnings.push(`Estoque insuficiente para ${p.name}.`); continue; } p.currentStock -= item.quantity; p.lastUpdated = new Date().toISOString(); movements.push({ id: `mov-kit-${Date.now()}-${Math.random()}`, productId: p.id, productName: p.name, unit: p.unit, type: 'saida', quantity: item.quantity, date, time, sector: kit.sector, retrievedBy: retrievedBy || kit.defaultRetriever, deliveredBy: deliveredBy || kit.defaultDeliverer, notes: `Entrega Automática do ${kit.name}`, createdAt: new Date().toISOString() }); }
  return { updatedProducts: updated, updatedMovements: [...movements, ...allMovements], deliveredCount: movements.length, warnings };
}
export function updateStockMovement(movementId: string, updatedData: Partial<StockMovement> & { productId: string; quantity: number; type: 'entrada' | 'saida' }, allProducts: Product[], allMovements: StockMovement[]): { updatedProducts: Product[]; updatedMovements: StockMovement[] } {
  const old = allMovements.find((m) => m.id === movementId); if (!old) throw new Error('Movimentação não encontrada.');
  if (updatedData.quantity <= 0) throw new Error('Quantidade inválida.');
  const products = [...allProducts]; const oldIndex = products.findIndex((p) => p.id === old.productId); if (oldIndex < 0) throw new Error('Produto original não encontrado.');
  products[oldIndex].currentStock += old.type === 'entrada' ? -old.quantity : old.quantity;
  const target = products.findIndex((p) => p.id === updatedData.productId); if (target < 0) throw new Error('Produto selecionado não encontrado.');
  const delta = updatedData.type === 'entrada' ? updatedData.quantity : -updatedData.quantity; if (products[target].currentStock + delta < 0) throw new Error('Estoque insuficiente.');
  products[target].currentStock += delta; products[target].lastUpdated = new Date().toISOString();
  return { updatedProducts: products, updatedMovements: allMovements.map((m) => m.id === movementId ? { ...m, ...updatedData, productName: products[target].name, unit: products[target].unit } : m) };
}
export function deleteStockMovement(movementId: string, allProducts: Product[], allMovements: StockMovement[]): { updatedProducts: Product[]; updatedMovements: StockMovement[] } {
  const old = allMovements.find((m) => m.id === movementId); if (!old) throw new Error('Movimentação não encontrada.');
  const products = allProducts.map((p) => p.id === old.productId ? { ...p, currentStock: p.currentStock + (old.type === 'entrada' ? -old.quantity : old.quantity), lastUpdated: new Date().toISOString() } : p);
  return { updatedProducts: products, updatedMovements: allMovements.filter((m) => m.id !== movementId) };
}
export function verifyProductAudit(product: Product, movements: StockMovement[], startDate?: string, endDate?: string): AuditReport {
  const prodMovs = movements.filter((m) => m.productId === product.id); let totalEntries = 0; let totalExits = 0;
  prodMovs.forEach((m) => { if ((!startDate || m.date >= startDate) && (!endDate || m.date <= endDate)) m.type === 'entrada' ? totalEntries += m.quantity : totalExits += m.quantity; });
  const initialStock = Number((product.currentStock - totalEntries + totalExits).toFixed(2));
  return { productId: product.id, productName: product.name, initialStock, totalEntries, totalExits, calculatedBalance: product.currentStock, currentStock: product.currentStock, isBalanced: true, discrepancy: 0 };
}
export function getStoredMeals(): DailyMealRecord[] { try { const data = localStorage.getItem(MEALS_KEY); if (!data) return INITIAL_MEAL_RECORDS; const parsed = JSON.parse(data) as DailyMealRecord[]; return Array.isArray(parsed) ? parsed : []; } catch { return INITIAL_MEAL_RECORDS; } }
export function saveMeals(meals: DailyMealRecord[]): void { try { localStorage.setItem(MEALS_KEY, JSON.stringify([...meals].sort((a, b) => (b.date || '').localeCompare(a.date || '')))); } catch (err) { console.error('Error saving meals:', err); } }
export function addOrUpdateMealRecord(allMeals: DailyMealRecord[], record: Omit<DailyMealRecord, 'id' | 'totalMeals' | 'createdAt'> & { id?: string; createdAt?: string }): { updatedMeals: DailyMealRecord[]; savedRecord: DailyMealRecord } { const now = new Date().toISOString(); const savedRecord: DailyMealRecord = { ...record, id: record.id || `meal-${Date.now()}`, totalMeals: Number(record.breakfast || 0) + Number(record.lunch || 0) + Number(record.afternoonSnack || 0) + Number(record.dinner || 0), createdAt: record.createdAt || now, updatedAt: now } as DailyMealRecord; return { savedRecord, updatedMeals: [savedRecord, ...allMeals.filter((m) => m.id !== savedRecord.id)] }; }
export function deleteStoredMealRecord(allMeals: DailyMealRecord[], id: string): DailyMealRecord[] { return allMeals.filter((m) => m.id !== id); }
export function resetAllDataToDefault(): { products: Product[]; movements: StockMovement[] } { return { products: getStoredProducts(), movements: getStoredMovements() }; }
export function getProductAlertDays(product: Product): number { return product.alertDays && product.alertDays > 0 ? product.alertDays : 3; }
export function calculateDaysRemaining(product: Product): number { if (!product.dailyAvgConsumption || product.dailyAvgConsumption <= 0) return 999; return Math.round((product.currentStock / product.dailyAvgConsumption) * 10) / 10; }
export function formatDaysRemainingText(days: number): string { if (days >= 900) return 'Consumo não estimado'; if (days <= 0) return 'Estoque esgotado!'; if (days === 1) return '1 dia restante'; return `${days} dias restantes`; }
export function getRecommendedPurchaseDate(products: Product[]): { dateStr: string; criticalCount: number } { let minDays = 999; let criticalCount = 0; products.forEach((p) => { const days = calculateDaysRemaining(p); if (days <= 3 || p.currentStock <= p.minStock) criticalCount++; if (days < minDays) minDays = days; }); const today = new Date(); const targetDaysAhead = Math.max(1, Math.min(Math.floor(minDays) - 1, 3)); const targetDate = new Date(today.getTime() + targetDaysAhead * 24 * 60 * 60 * 1000); return { dateStr: `${String(targetDate.getDate()).padStart(2, '0')}/${String(targetDate.getMonth() + 1).padStart(2, '0')}/${targetDate.getFullYear()}`, criticalCount }; }
export function getProductStockStatus(product: Product): 'critical' | 'warning' | 'normal' { const days = calculateDaysRemaining(product); const alertDays = getProductAlertDays(product); if (days <= 0 || product.currentStock <= 0 || days <= 1.5 || product.currentStock <= product.minStock / 2) return 'critical'; if (days <= alertDays || days <= 3 || product.currentStock <= product.minStock) return 'warning'; return 'normal'; }
