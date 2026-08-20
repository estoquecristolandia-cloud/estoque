import {
  collection, doc, setDoc, deleteDoc, onSnapshot, getDocs, writeBatch, runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { db, AppUserProfile, UserRole } from '../firebase';
import { Product, StockMovement, DailyKit, DailyMealRecord, EntryType } from '../types';
import { INITIAL_PRODUCTS, DEFAULT_DAILY_KIT } from '../data/initialData';

const PRODUCTS_COLLECTION = 'products';
const MOVEMENTS_COLLECTION = 'movements';
const KITS_COLLECTION = 'kits';
const USERS_COLLECTION = 'users';
const MEALS_COLLECTION = 'meals';

function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach((key) => { if (obj[key] !== undefined) cleaned[key] = obj[key]; });
  return cleaned;
}

function operationId(prefix: string) {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${id}`;
}

function toError(err: unknown, fallback: string): Error { return err instanceof Error ? err : new Error(fallback); }

export function subscribeToProducts(onData: (products: Product[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(collection(db, PRODUCTS_COLLECTION), (snapshot) => {
    const list = snapshot.docs.map((d) => d.data() as Product).sort((a, b) => a.name.localeCompare(b.name));
    onData(list);
  }, (err) => { console.error('Error listening to products:', err); onError?.(toError(err, 'Não foi possível carregar os produtos.')); });
}

export function subscribeToMovements(onData: (movements: StockMovement[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(collection(db, MOVEMENTS_COLLECTION), (snapshot) => {
    const list = snapshot.docs.map((d) => d.data() as StockMovement).sort((a, b) => {
      const date = (b.date || '').localeCompare(a.date || ''); if (date) return date;
      const time = (b.time || '').localeCompare(a.time || ''); if (time) return time;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    onData(list);
  }, (err) => { console.error('Error listening to movements:', err); onError?.(toError(err, 'Não foi possível carregar o histórico.')); });
}

export function subscribeToDailyKit(onData: (kit: DailyKit) => void, onError?: (error: Error) => void) {
  return onSnapshot(doc(db, KITS_COLLECTION, 'daily_kitchen_kit'), (snapshot) => {
    onData(snapshot.exists() ? snapshot.data() as DailyKit : DEFAULT_DAILY_KIT);
  }, (err) => { console.error('Error listening to daily kit:', err); onError?.(toError(err, 'Não foi possível carregar o Kit Diário.')); });
}

export function subscribeToUsers(onData: (users: AppUserProfile[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(collection(db, USERS_COLLECTION), (snapshot) => {
    onData(snapshot.docs.map((d) => d.data() as AppUserProfile).sort((a, b) => a.displayName.localeCompare(b.displayName)));
  }, (err) => { console.error('Error listening to users:', err); onError?.(toError(err, 'Não foi possível carregar os usuários.')); });
}

export function subscribeToMeals(onData: (meals: DailyMealRecord[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(collection(db, MEALS_COLLECTION), (snapshot) => {
    const list = snapshot.docs.map((d) => d.data() as DailyMealRecord).filter((m) => !!m?.date).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    onData(list);
  }, (err) => { console.error('Error listening to meals:', err); onError?.(toError(err, 'Não foi possível carregar as refeições.')); });
}

export async function saveProductToFirestore(product: Product) { await setDoc(doc(db, PRODUCTS_COLLECTION, product.id), cleanForFirestore(product), { merge: true }); }
export async function deleteProductFromFirestore(productId: string) { await deleteDoc(doc(db, PRODUCTS_COLLECTION, productId)); }
export async function saveMovementToFirestore(movement: StockMovement) { await setDoc(doc(db, MOVEMENTS_COLLECTION, movement.id), cleanForFirestore(movement), { merge: true }); }
export async function saveDailyKitToFirestore(kit: DailyKit) { await setDoc(doc(db, KITS_COLLECTION, 'daily_kitchen_kit'), cleanForFirestore(kit), { merge: true }); }
export async function saveMealRecordToFirestore(record: DailyMealRecord) { await setDoc(doc(db, MEALS_COLLECTION, record.id), cleanForFirestore(record), { merge: true }); }
export async function deleteMealRecordFromFirestore(mealId: string) { await deleteDoc(doc(db, MEALS_COLLECTION, mealId)); }
export async function updateUserRoleInFirestore(uid: string, role: UserRole) { await setDoc(doc(db, USERS_COLLECTION, uid), { role }, { merge: true }); }

// Legacy bulk sync retained only for administrative maintenance. It never writes currentStock.
export async function saveProductsAndMovementsInFirestore(products: Product[], movements: StockMovement[]) {
  const batch = writeBatch(db);
  products.forEach((p) => {
    const { currentStock, lastOperationId, updatedAt, ...catalogData } = p as any;
    batch.set(doc(db, PRODUCTS_COLLECTION, p.id), cleanForFirestore(catalogData), { merge: true });
  });
  movements.slice(0, 100).forEach((m) => batch.set(doc(db, MOVEMENTS_COLLECTION, m.id), cleanForFirestore(m), { merge: true }));
  await batch.commit();
}

export async function syncInitialFirestoreData() {
  const prodsSnap = await getDocs(collection(db, PRODUCTS_COLLECTION));
  const existingIds = new Set(prodsSnap.docs.map((d) => d.id));
  const batch = writeBatch(db);
  let writes = 0;
  for (const product of INITIAL_PRODUCTS) {
    if (!existingIds.has(product.id)) { batch.set(doc(db, PRODUCTS_COLLECTION, product.id), cleanForFirestore(product)); writes++; }
  }
  const kitRef = doc(db, KITS_COLLECTION, 'daily_kitchen_kit');
  const kitSnap = await getDocs(kitRef);
  if (!kitSnap.exists()) { batch.set(kitRef, cleanForFirestore(DEFAULT_DAILY_KIT)); writes++; }
  if (writes > 0) await batch.commit();
}

export async function executeEntryTransaction(productId: string, quantity: number, entryType: EntryType, supplierOrDonor: string, receivedBy: string, date: string, time: string, notes: string): Promise<{ updatedProduct: Product; movement: StockMovement }> {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Informe uma quantidade válida maior que zero.');
  return runTransaction(db, async (tx) => {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    const snap = await tx.get(productRef);
    if (!snap.exists()) throw new Error('Produto não encontrado no Firestore.');
    const product = snap.data() as Product;
    const opId = operationId('entry');
    const now = new Date().toISOString();
    const movement: StockMovement = { id: opId, operationId: opId, productId: product.id, productName: product.name, unit: product.unit, type: 'entrada', quantity, date, time: time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), entryType, supplierOrDonor, receivedBy, notes, createdAt: now };
    const updatedProduct = { ...product, currentStock: product.currentStock + quantity, lastUpdated: now, lastOperationId: opId, updatedAt: serverTimestamp() } as Product;
    tx.set(productRef, cleanForFirestore(updatedProduct), { merge: true });
    tx.set(doc(db, MOVEMENTS_COLLECTION, opId), cleanForFirestore(movement));
    return { updatedProduct, movement };
  });
}

export async function executeExitTransaction(productId: string, quantity: number, sector: any, retrievedBy: string, deliveredBy: string, date: string, time: string, notes: string): Promise<{ updatedProduct: Product; movement: StockMovement }> {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Informe uma quantidade válida maior que zero.');
  return runTransaction(db, async (tx) => {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    const snap = await tx.get(productRef);
    if (!snap.exists()) throw new Error('Produto não encontrado no Firestore.');
    const product = snap.data() as Product;
    if (quantity > product.currentStock) throw new Error(`Quantidade solicitada (${quantity} ${product.unit}) é maior do que o estoque atual (${product.currentStock} ${product.unit}).`);
    const opId = operationId('exit');
    const now = new Date().toISOString();
    const movement: StockMovement = { id: opId, operationId: opId, productId: product.id, productName: product.name, unit: product.unit, type: 'saida', quantity, date, time: time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), sector, retrievedBy, deliveredBy, notes, createdAt: now };
    const updatedProduct = { ...product, currentStock: product.currentStock - quantity, lastUpdated: now, lastOperationId: opId, updatedAt: serverTimestamp() } as Product;
    tx.set(productRef, cleanForFirestore(updatedProduct), { merge: true });
    tx.set(doc(db, MOVEMENTS_COLLECTION, opId), cleanForFirestore(movement));
    return { updatedProduct, movement };
  });
}

export async function executeBatchExitTransaction(items: Array<{ productId: string; quantity: number }>, sector: any, retrievedBy: string, deliveredBy: string, date: string, time: string, notes: string): Promise<{ updatedProducts: Product[]; movements: StockMovement[] }> {
  const totals = new Map<string, number>();
  for (const item of items) { if (!Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error('Todas as quantidades devem ser maiores que zero.'); totals.set(item.productId, (totals.get(item.productId) || 0) + item.quantity); }
  return runTransaction(db, async (tx) => {
    const refs = [...totals.keys()].map((id) => doc(db, PRODUCTS_COLLECTION, id));
    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
    const products = new Map<string, Product>();
    snaps.forEach((snap, index) => { if (!snap.exists()) throw new Error('Um dos produtos selecionados não existe mais no estoque.'); products.set(refs[index].id, snap.data() as Product); });
    const now = new Date().toISOString(); const updatedProducts: Product[] = []; const movements: StockMovement[] = [];
    for (const [productId, quantity] of totals.entries()) {
      const product = products.get(productId)!;
      if (quantity > product.currentStock) throw new Error(`Estoque insuficiente para ${product.name}! Saldo disponível: ${product.currentStock} ${product.unit}.`);
      const opId = operationId('batch-exit');
      const movement: StockMovement = { id: opId, operationId: opId, productId, productName: product.name, unit: product.unit, type: 'saida', quantity, date, time: time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), sector, retrievedBy, deliveredBy, notes: notes || '', createdAt: now };
      const updatedProduct = { ...product, currentStock: product.currentStock - quantity, lastUpdated: now, lastOperationId: opId, updatedAt: serverTimestamp() } as Product;
      tx.set(doc(db, PRODUCTS_COLLECTION, productId), cleanForFirestore(updatedProduct), { merge: true });
      tx.set(doc(db, MOVEMENTS_COLLECTION, opId), cleanForFirestore(movement)); updatedProducts.push(updatedProduct); movements.push(movement);
    }
    return { updatedProducts, movements };
  });
}

export async function executeDailyKitTransaction(kit: DailyKit, retrievedBy: string, deliveredBy: string, date: string, time: string): Promise<{ updatedProducts: Product[]; movements: StockMovement[]; deliveredCount: number }> {
  return runTransaction(db, async (tx) => {
    const uniqueIds = [...new Set(kit.items.map((i) => i.productId))];
    const refs = uniqueIds.map((id) => doc(db, PRODUCTS_COLLECTION, id));
    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
    const products = new Map<string, Product>();
    snaps.forEach((snap, index) => { if (!snap.exists()) throw new Error(`Produto do kit não encontrado: ${uniqueIds[index]}`); products.set(uniqueIds[index], snap.data() as Product); });
    const totals = new Map<string, number>(); kit.items.forEach((item) => totals.set(item.productId, (totals.get(item.productId) || 0) + item.quantity));
    for (const [id, qty] of totals.entries()) { const product = products.get(id)!; if (qty <= 0) throw new Error(`Quantidade inválida no kit para ${product.name}.`); if (qty > product.currentStock) throw new Error(`Estoque insuficiente para ${product.name}: necessário ${qty}${product.unit}, disponível ${product.currentStock}${product.unit}.`); }
    const now = new Date().toISOString(); const updatedProducts: Product[] = []; const movements: StockMovement[] = [];
    for (const [id, qty] of totals.entries()) {
      const product = products.get(id)!; const opId = operationId('kit');
      const movement: StockMovement = { id: opId, operationId: opId, productId: id, productName: product.name, unit: product.unit, type: 'saida', quantity: qty, date, time: time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), sector: kit.sector, retrievedBy: retrievedBy || kit.defaultRetriever, deliveredBy: deliveredBy || kit.defaultDeliverer, notes: `Entrega Automática do ${kit.name}`, createdAt: now };
      const updatedProduct = { ...product, currentStock: product.currentStock - qty, lastUpdated: now, lastOperationId: opId, updatedAt: serverTimestamp() } as Product;
      tx.set(doc(db, PRODUCTS_COLLECTION, id), cleanForFirestore(updatedProduct), { merge: true }); tx.set(doc(db, MOVEMENTS_COLLECTION, opId), cleanForFirestore(movement)); updatedProducts.push(updatedProduct); movements.push(movement);
    }
    return { updatedProducts, movements, deliveredCount: movements.length };
  });
}

export async function updateStockMovementTransaction(movementId: string, updatedData: Partial<StockMovement> & { productId: string; quantity: number; type: 'entrada' | 'saida' }): Promise<{ updatedProducts: Product[]; movement: StockMovement }> {
  const qty = Number(updatedData.quantity); if (!Number.isFinite(qty) || qty <= 0) throw new Error('Informe uma quantidade válida maior que zero.');
  return runTransaction(db, async (tx) => {
    const oldRef = doc(db, MOVEMENTS_COLLECTION, movementId); const oldSnap = await tx.get(oldRef); if (!oldSnap.exists()) throw new Error('Movimentação não encontrada.');
    const oldMovement = oldSnap.data() as StockMovement; const oldProductRef = doc(db, PRODUCTS_COLLECTION, oldMovement.productId); const newProductRef = doc(db, PRODUCTS_COLLECTION, updatedData.productId);
    const oldProductSnap = await tx.get(oldProductRef); if (!oldProductSnap.exists()) throw new Error('Produto original não encontrado.');
    const oldProduct = oldProductSnap.data() as Product; let newProduct = oldProduct;
    if (updatedData.productId !== oldMovement.productId) { const newSnap = await tx.get(newProductRef); if (!newSnap.exists()) throw new Error('Novo produto não encontrado.'); newProduct = newSnap.data() as Product; }
    const oldImpact = oldMovement.type === 'entrada' ? oldMovement.quantity : -oldMovement.quantity; const newImpact = updatedData.type === 'entrada' ? qty : -qty;
    const revertedOldStock = oldProduct.currentStock - oldImpact; if (revertedOldStock < 0) throw new Error('A edição não pode ser aplicada porque o saldo atual não comporta o estorno da movimentação original.');
    const finalNewStock = updatedData.productId === oldMovement.productId ? revertedOldStock + newImpact : newProduct.currentStock + newImpact;
    if (finalNewStock < 0) throw new Error(`Estoque insuficiente em "${newProduct.name}" para esta edição.`);
    const now = new Date().toISOString(); const opId = operationId('edit');
    const movement: StockMovement = { ...oldMovement, ...updatedData, id: movementId, operationId: opId, productId: updatedData.productId, productName: newProduct.name, unit: newProduct.unit, quantity: qty, createdAt: oldMovement.createdAt || now };
    if (updatedData.productId === oldMovement.productId) {
      const updatedProduct = { ...oldProduct, currentStock: finalNewStock, lastUpdated: now, lastOperationId: opId, updatedAt: serverTimestamp() } as Product;
      tx.set(oldProductRef, cleanForFirestore(updatedProduct), { merge: true }); tx.set(oldRef, cleanForFirestore(movement), { merge: true }); return { updatedProducts: [updatedProduct], movement };
    }
    const updatedOldProduct = { ...oldProduct, currentStock: revertedOldStock, lastUpdated: now, updatedAt: serverTimestamp() } as Product;
    const updatedNewProduct = { ...newProduct, currentStock: finalNewStock, lastUpdated: now, lastOperationId: opId, updatedAt: serverTimestamp() } as Product;
    tx.set(oldProductRef, cleanForFirestore(updatedOldProduct), { merge: true }); tx.set(newProductRef, cleanForFirestore(updatedNewProduct), { merge: true }); tx.set(oldRef, cleanForFirestore(movement), { merge: true });
    return { updatedProducts: [updatedOldProduct, updatedNewProduct], movement };
  });
}

export async function deleteStockMovementTransaction(movementId: string): Promise<{ updatedProduct: Product; deletedMovementId: string }> {
  return runTransaction(db, async (tx) => {
    const movementRef = doc(db, MOVEMENTS_COLLECTION, movementId); const movementSnap = await tx.get(movementRef); if (!movementSnap.exists()) throw new Error('Movimentação não encontrada.');
    const movement = movementSnap.data() as StockMovement; const productRef = doc(db, PRODUCTS_COLLECTION, movement.productId); const productSnap = await tx.get(productRef); if (!productSnap.exists()) throw new Error('Produto associado não encontrado.');
    const product = productSnap.data() as Product; const restoredStock = movement.type === 'entrada' ? product.currentStock - movement.quantity : product.currentStock + movement.quantity;
    if (restoredStock < 0) throw new Error('Não é possível excluir esta movimentação porque o estoque resultante ficaria negativo.');
    const now = new Date().toISOString(); const updatedProduct = { ...product, currentStock: restoredStock, lastUpdated: now, updatedAt: serverTimestamp() } as Product;
    tx.set(productRef, cleanForFirestore(updatedProduct), { merge: true }); tx.delete(movementRef); return { updatedProduct, deletedMovementId: movementId };
  });
}
