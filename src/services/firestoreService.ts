import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db, AppUserProfile, UserRole } from '../firebase';
import { Product, StockMovement, DailyKit, DailyMealRecord, Sector, EntryType } from '../types';
import { INITIAL_PRODUCTS, INITIAL_MOVEMENTS, DEFAULT_DAILY_KIT, INITIAL_MEAL_RECORDS } from '../data/initialData';

const PRODUCTS_COLLECTION = 'products';
const MOVEMENTS_COLLECTION = 'movements';
const KITS_COLLECTION = 'kits';
const USERS_COLLECTION = 'users';
const MEALS_COLLECTION = 'meals';

export const REASSIGNED_HOUSES_TO_COZINHA = new Set<string>([
  'Casa Marcos & Fabíola (Cesta Básica)',
  'Casa da Coordenação (Huberto & Débora)',
  'Casa Lana & Joabe (Cesta Básica)',
  'Casa Tainã (Cesta Básica)',
]);

function sanitizeMovement(m: StockMovement): StockMovement {
  if (m.sector && REASSIGNED_HOUSES_TO_COZINHA.has(m.sector)) {
    const initMov = INITIAL_MOVEMENTS.find((im) => im.id === m.id);
    if (initMov) {
      return {
        ...m,
        sector: initMov.sector,
        kitchenShift: initMov.kitchenShift || 'Almoço',
        retrievedBy: initMov.retrievedBy,
        deliveredBy: initMov.deliveredBy,
        notes: initMov.notes,
        date: initMov.date,
        time: initMov.time,
      };
    }
    return {
      ...m,
      sector: 'Cozinha',
      kitchenShift: m.kitchenShift || 'Almoço',
    };
  }
  return m;
}

// Utility to remove undefined keys so Firestore doesn't throw unsupported field errors
export function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
}

// Subscriptions with Realtime Snapshot Listeners
export function subscribeToProducts(
  onData: (products: Product[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, PRODUCTS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Product);
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      onData(list);
    },
    (err) => {
      console.error('Error listening to products in Firestore:', err);
      if (onError) onError(err);
    }
  );
}

export function subscribeToMovements(
  onData: (movements: StockMovement[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, MOVEMENTS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: StockMovement[] = [];
      snapshot.forEach((docSnap) => {
        const raw = docSnap.data() as StockMovement;
        const sanitized = sanitizeMovement(raw);
        list.push(sanitized);
      });
      list.sort((a, b) => {
        const dateComp = (b.date || '').localeCompare(a.date || '');
        if (dateComp !== 0) return dateComp;
        const timeComp = (b.time || '').localeCompare(a.time || '');
        if (timeComp !== 0) return timeComp;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
      onData(list);
    },
    (err) => {
      console.error('Error listening to movements in Firestore:', err);
      if (onError) onError(err);
    }
  );
}

export function subscribeToDailyKit(
  onData: (kit: DailyKit) => void,
  onError?: (err: Error) => void
) {
  const docRef = doc(db, KITS_COLLECTION, 'daily_kitchen_kit');
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as DailyKit);
      } else {
        onData(DEFAULT_DAILY_KIT);
      }
    },
    (err) => {
      console.error('Error listening to daily kit in Firestore:', err);
      if (onError) onError(err);
    }
  );
}

export function subscribeToUsers(
  onData: (users: AppUserProfile[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, USERS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: AppUserProfile[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as AppUserProfile);
      });
      onData(list);
    },
    (err) => {
      console.error('Error listening to users in Firestore:', err);
      if (onError) onError(err);
    }
  );
}

export function subscribeToMeals(
  onData: (meals: DailyMealRecord[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, MEALS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: DailyMealRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as DailyMealRecord;
        if (data && data.date && data.date >= '2026-08-14') {
          list.push(data);
        }
      });
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      onData(list);
    },
    (err) => {
      console.error('Error listening to meals in Firestore:', err);
      if (onError) onError(err);
    }
  );
}

// ============================================================================
// ATOMIC FIRESTORE TRANSACTIONS (CONCURRENCY & INTEGRITY PROTECTION)
// ============================================================================

/**
 * 1. Transactional Single Entry:
 * Atomically reads current product stock from Firestore, increments balance,
 * and creates movement log in a single transaction.
 */
export async function executeEntryTransaction(params: {
  product: Product;
  quantity: number;
  entryType: EntryType;
  supplierOrDonor: string;
  receivedBy: string;
  date: string;
  time: string;
  notes: string;
}): Promise<{ updatedStock: number; movement: StockMovement }> {
  if (params.quantity <= 0) {
    throw new Error('A quantidade de entrada deve ser maior que zero.');
  }

  const prodRef = doc(db, PRODUCTS_COLLECTION, params.product.id);
  const movId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const movRef = doc(db, MOVEMENTS_COLLECTION, movId);

  return await runTransaction(db, async (tx) => {
    const prodSnap = await tx.get(prodRef);
    if (!prodSnap.exists()) {
      throw new Error(`Produto "${params.product.name}" não encontrado no banco de dados.`);
    }

    const currentProd = prodSnap.data() as Product;
    const currentStock = Number(currentProd.currentStock) || 0;
    const newStock = Math.round((currentStock + params.quantity) * 100) / 100;
    const nowIso = new Date().toISOString();

    const movement: StockMovement = {
      id: movId,
      productId: params.product.id,
      productName: currentProd.name,
      unit: currentProd.unit,
      type: 'entrada',
      quantity: params.quantity,
      date: params.date,
      time: params.time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      entryType: params.entryType,
      supplierOrDonor: params.supplierOrDonor,
      receivedBy: params.receivedBy,
      notes: params.notes,
      createdAt: nowIso,
    };

    tx.update(prodRef, {
      currentStock: newStock,
      lastUpdated: nowIso,
    });

    tx.set(movRef, cleanForFirestore(movement));

    return { updatedStock: newStock, movement };
  });
}

/**
 * 2. Transactional Single Exit:
 * Atomically reads current product stock from Firestore, validates that stock >= quantity,
 * decrements balance without going negative, and logs movement in a single transaction.
 */
export async function executeExitTransaction(params: {
  product: Product;
  quantity: number;
  sector: Sector;
  retrievedBy: string;
  deliveredBy: string;
  date: string;
  time: string;
  notes: string;
  kitchenShift?: string;
}): Promise<{ updatedStock: number; movement: StockMovement }> {
  if (params.quantity <= 0) {
    throw new Error('A quantidade de saída deve ser maior que zero.');
  }

  const prodRef = doc(db, PRODUCTS_COLLECTION, params.product.id);
  const movId = `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const movRef = doc(db, MOVEMENTS_COLLECTION, movId);

  return await runTransaction(db, async (tx) => {
    const prodSnap = await tx.get(prodRef);
    if (!prodSnap.exists()) {
      throw new Error(`Produto "${params.product.name}" não encontrado no banco de dados.`);
    }

    const currentProd = prodSnap.data() as Product;
    const currentStock = Number(currentProd.currentStock) || 0;

    if (params.quantity > currentStock) {
      throw new Error(
        `Estoque insuficiente para "${currentProd.name}"! Saldo disponível no banco: ${currentStock} ${currentProd.unit} (solicitado: ${params.quantity} ${currentProd.unit}).`
      );
    }

    const newStock = Math.round((currentStock - params.quantity) * 100) / 100;
    const nowIso = new Date().toISOString();

    const movement: StockMovement = {
      id: movId,
      productId: params.product.id,
      productName: currentProd.name,
      unit: currentProd.unit,
      type: 'saida',
      quantity: params.quantity,
      date: params.date,
      time: params.time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      sector: params.sector,
      kitchenShift: params.kitchenShift,
      retrievedBy: params.retrievedBy,
      deliveredBy: params.deliveredBy,
      notes: params.notes,
      createdAt: nowIso,
    };

    tx.update(prodRef, {
      currentStock: newStock,
      lastUpdated: nowIso,
    });

    tx.set(movRef, cleanForFirestore(movement));

    return { updatedStock: newStock, movement };
  });
}

/**
 * 3. Transactional Batch Exit:
 * Atomically validates and deducts multiple items. If ANY item lacks stock,
 * the entire batch is rejected with zero side-effects.
 */
export async function executeBatchExitTransaction(params: {
  items: Array<{ product: Product; quantity: number }>;
  sector: Sector;
  retrievedBy: string;
  deliveredBy: string;
  date: string;
  time: string;
  notes: string;
}): Promise<StockMovement[]> {
  if (params.items.length === 0) {
    throw new Error('Nenhum item informado para saída.');
  }

  return await runTransaction(db, async (tx) => {
    // Phase 1: All Reads First (Firestore Transaction Requirement)
    const productSnapshots = new Map<string, { ref: any; data: Product }>();

    for (const item of params.items) {
      if (item.quantity <= 0) {
        throw new Error(`Quantidade inválida para o produto ${item.product.name}.`);
      }
      const pRef = doc(db, PRODUCTS_COLLECTION, item.product.id);
      const snap = await tx.get(pRef);
      if (!snap.exists()) {
        throw new Error(`Produto "${item.product.name}" não encontrado no banco.`);
      }
      productSnapshots.set(item.product.id, { ref: pRef, data: snap.data() as Product });
    }

    // Phase 2: Validate Totals and Check Available Balances
    const accumulatedDeductions = new Map<string, number>();
    for (const item of params.items) {
      const current = accumulatedDeductions.get(item.product.id) || 0;
      accumulatedDeductions.set(item.product.id, current + item.quantity);
    }

    for (const [pid, totalReq] of accumulatedDeductions.entries()) {
      const prodInfo = productSnapshots.get(pid);
      if (!prodInfo) continue;
      const currentStock = Number(prodInfo.data.currentStock) || 0;
      if (totalReq > currentStock) {
        throw new Error(
          `Estoque insuficiente para "${prodInfo.data.name}"! Saldo disponível: ${currentStock} ${prodInfo.data.unit} (solicitado: ${totalReq} ${prodInfo.data.unit}).`
        );
      }
    }

    // Phase 3: Execute Writes Atomically
    const nowIso = new Date().toISOString();
    const createdMovements: StockMovement[] = [];

    // Track decremented stocks locally for multi-line items with same product
    const runningStock = new Map<string, number>();
    for (const [pid, info] of productSnapshots.entries()) {
      runningStock.set(pid, Number(info.data.currentStock) || 0);
    }

    params.items.forEach((item, index) => {
      const prodInfo = productSnapshots.get(item.product.id)!;
      const currentRemaining = runningStock.get(item.product.id)!;
      const newStock = Math.round((currentRemaining - item.quantity) * 100) / 100;
      runningStock.set(item.product.id, newStock);

      const movId = `mov-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`;
      const movRef = doc(db, MOVEMENTS_COLLECTION, movId);

      const movement: StockMovement = {
        id: movId,
        productId: item.product.id,
        productName: prodInfo.data.name,
        unit: prodInfo.data.unit,
        type: 'saida',
        quantity: item.quantity,
        date: params.date,
        time: params.time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        sector: params.sector,
        retrievedBy: params.retrievedBy,
        deliveredBy: params.deliveredBy,
        notes: params.notes || '',
        createdAt: nowIso,
      };

      tx.set(movRef, cleanForFirestore(movement));
      createdMovements.push(movement);
    });

    // Update each distinct product's final stock
    for (const [pid, finalStock] of runningStock.entries()) {
      const prodInfo = productSnapshots.get(pid)!;
      tx.update(prodInfo.ref, {
        currentStock: finalStock,
        lastUpdated: nowIso,
      });
    }

    return createdMovements;
  });
}

/**
 * 4. Transactional Daily Kit Delivery:
 * Atomically validates all kit items against live stock and performs exits.
 */
export async function executeDailyKitTransaction(params: {
  kit: DailyKit;
  retrievedBy: string;
  deliveredBy: string;
  date: string;
  time: string;
  saveAsDefault?: boolean;
}): Promise<{ deliveredCount: number; movements: StockMovement[] }> {
  if (params.kit.items.length === 0) {
    throw new Error('O Kit Diário não possui itens configurados.');
  }

  return await runTransaction(db, async (tx) => {
    // Phase 1: Read all products
    const productSnapshots = new Map<string, { ref: any; data: Product }>();

    for (const item of params.kit.items) {
      const pRef = doc(db, PRODUCTS_COLLECTION, item.productId);
      const snap = await tx.get(pRef);
      if (!snap.exists()) {
        throw new Error(`Item do kit "${item.productName}" não cadastrado no estoque.`);
      }
      productSnapshots.set(item.productId, { ref: pRef, data: snap.data() as Product });
    }

    // Phase 2: Validate stock
    for (const item of params.kit.items) {
      const info = productSnapshots.get(item.productId)!;
      const currentStock = Number(info.data.currentStock) || 0;
      if (item.quantity > currentStock) {
        throw new Error(
          `Estoque insuficiente no Kit para "${info.data.name}"! Necessário: ${item.quantity} ${info.data.unit}, disponível: ${currentStock} ${info.data.unit}.`
        );
      }
    }

    // Phase 3: Writes
    const nowIso = new Date().toISOString();
    const createdMovements: StockMovement[] = [];

    for (const item of params.kit.items) {
      const info = productSnapshots.get(item.productId)!;
      const currentStock = Number(info.data.currentStock) || 0;
      const newStock = Math.round((currentStock - item.quantity) * 100) / 100;

      const movId = `mov-kit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const movRef = doc(db, MOVEMENTS_COLLECTION, movId);

      const movement: StockMovement = {
        id: movId,
        productId: item.productId,
        productName: info.data.name,
        unit: info.data.unit,
        type: 'saida',
        quantity: item.quantity,
        date: params.date,
        time: params.time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        sector: params.kit.sector,
        retrievedBy: params.retrievedBy || params.kit.defaultRetriever,
        deliveredBy: params.deliveredBy || params.kit.defaultDeliverer,
        notes: `Entrega Automática do ${params.kit.name}`,
        createdAt: nowIso,
      };

      tx.update(info.ref, {
        currentStock: newStock,
        lastUpdated: nowIso,
      });

      tx.set(movRef, cleanForFirestore(movement));
      createdMovements.push(movement);
    }

    if (params.saveAsDefault) {
      const kitRef = doc(db, KITS_COLLECTION, 'daily_kitchen_kit');
      tx.set(kitRef, cleanForFirestore(params.kit), { merge: true });
    }

    return { deliveredCount: createdMovements.length, movements: createdMovements };
  });
}

/**
 * 5. Transactional Movement Update:
 * Atomically reverts old movement impact, calculates new stock, validates non-negativity,
 * and updates movement and affected product(s).
 */
export async function executeUpdateMovementTransaction(params: {
  movementId: string;
  updatedData: Partial<StockMovement> & { productId: string; quantity: number; type: 'entrada' | 'saida' };
}): Promise<void> {
  const movRef = doc(db, MOVEMENTS_COLLECTION, params.movementId);

  await runTransaction(db, async (tx) => {
    const movSnap = await tx.get(movRef);
    if (!movSnap.exists()) {
      throw new Error('Movimentação não encontrada no banco de dados.');
    }

    const oldMov = movSnap.data() as StockMovement;
    const oldProdRef = doc(db, PRODUCTS_COLLECTION, oldMov.productId);
    const targetProdRef = doc(db, PRODUCTS_COLLECTION, params.updatedData.productId);

    const oldProdSnap = await tx.get(oldProdRef);
    if (!oldProdSnap.exists()) {
      throw new Error('Produto original da movimentação não encontrado.');
    }

    const isSameProduct = oldMov.productId === params.updatedData.productId;
    let targetProdSnap = oldProdSnap;
    if (!isSameProduct) {
      targetProdSnap = await tx.get(targetProdRef);
      if (!targetProdSnap.exists()) {
        throw new Error('Novo produto selecionado não encontrado.');
      }
    }

    const oldProdData = oldProdSnap.data() as Product;
    const targetProdData = targetProdSnap.data() as Product;
    const nowIso = new Date().toISOString();
    const newQty = Number(params.updatedData.quantity);

    if (isSameProduct) {
      let stock = Number(oldProdData.currentStock) || 0;
      // Revert old impact
      stock = oldMov.type === 'entrada' ? stock - oldMov.quantity : stock + oldMov.quantity;
      // Apply new impact
      stock = params.updatedData.type === 'entrada' ? stock + newQty : stock - newQty;

      if (stock < 0) {
        throw new Error(
          `Esta alteração deixaria o estoque de "${oldProdData.name}" negativo (${stock} ${oldProdData.unit}). Operação cancelada.`
        );
      }

      const finalStock = Math.round(stock * 100) / 100;
      tx.update(oldProdRef, { currentStock: finalStock, lastUpdated: nowIso });
    } else {
      // Different product: revert old on oldProd, apply new on targetProd
      let oldStock = Number(oldProdData.currentStock) || 0;
      oldStock = oldMov.type === 'entrada' ? oldStock - oldMov.quantity : oldStock + oldMov.quantity;
      if (oldStock < 0) {
        throw new Error(`Estoque de "${oldProdData.name}" ficaria negativo.`);
      }

      let targetStock = Number(targetProdData.currentStock) || 0;
      targetStock = params.updatedData.type === 'entrada' ? targetStock + newQty : targetStock - newQty;
      if (targetStock < 0) {
        throw new Error(
          `Estoque de "${targetProdData.name}" ficaria negativo (${targetStock} ${targetProdData.unit}).`
        );
      }

      tx.update(oldProdRef, { currentStock: Math.round(oldStock * 100) / 100, lastUpdated: nowIso });
      tx.update(targetProdRef, { currentStock: Math.round(targetStock * 100) / 100, lastUpdated: nowIso });
    }

    const updatedRecord: StockMovement = {
      ...oldMov,
      ...params.updatedData,
      productName: targetProdData.name,
      unit: targetProdData.unit,
      quantity: newQty,
    };

    tx.set(movRef, cleanForFirestore(updatedRecord), { merge: true });
  });
}

/**
 * 6. Transactional Movement Deletion:
 * Atomically reverts stock impact of a movement and deletes it if stock doesn't turn negative.
 */
export async function executeDeleteMovementTransaction(movementId: string): Promise<void> {
  const movRef = doc(db, MOVEMENTS_COLLECTION, movementId);

  await runTransaction(db, async (tx) => {
    const movSnap = await tx.get(movRef);
    if (!movSnap.exists()) {
      throw new Error('Movimentação não encontrada.');
    }

    const mov = movSnap.data() as StockMovement;
    const prodRef = doc(db, PRODUCTS_COLLECTION, mov.productId);
    const prodSnap = await tx.get(prodRef);

    if (prodSnap.exists()) {
      const prod = prodSnap.data() as Product;
      let stock = Number(prod.currentStock) || 0;

      // If it was an 'entrada', deleting it reduces stock. If it was a 'saida', deleting it restores stock.
      stock = mov.type === 'entrada' ? stock - mov.quantity : stock + mov.quantity;

      if (stock < 0) {
        throw new Error(
          `Não é possível excluir esta entrada pois o estoque atual de "${prod.name}" ficaria negativo (${stock} ${prod.unit}).`
        );
      }

      const finalStock = Math.round(stock * 100) / 100;
      tx.update(prodRef, {
        currentStock: finalStock,
        lastUpdated: new Date().toISOString(),
      });
    }

    tx.delete(movRef);
  });
}

// ============================================================================
// STANDARD MUTATIONS & PERMISSION OPERATIONS
// ============================================================================

export async function saveProductToFirestore(product: Product) {
  const docRef = doc(db, PRODUCTS_COLLECTION, product.id);
  await setDoc(docRef, cleanForFirestore(product), { merge: true });
}

export async function deleteProductFromFirestore(productId: string) {
  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  await deleteDoc(docRef);
}

export async function saveMovementToFirestore(movement: StockMovement) {
  const docRef = doc(db, MOVEMENTS_COLLECTION, movement.id);
  await setDoc(docRef, cleanForFirestore(movement), { merge: true });
}

export async function saveDailyKitToFirestore(kit: DailyKit) {
  const docRef = doc(db, KITS_COLLECTION, 'daily_kitchen_kit');
  await setDoc(docRef, cleanForFirestore(kit), { merge: true });
}

export async function saveMealRecordToFirestore(record: DailyMealRecord) {
  const docRef = doc(db, MEALS_COLLECTION, record.id);
  await setDoc(docRef, cleanForFirestore(record), { merge: true });
}

export async function deleteMealRecordFromFirestore(mealId: string) {
  const docRef = doc(db, MEALS_COLLECTION, mealId);
  await deleteDoc(docRef);
}

export async function updateUserRoleInFirestore(uid: string, role: UserRole) {
  const docRef = doc(db, USERS_COLLECTION, uid);
  await setDoc(docRef, { role, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function saveProductsAndMovementsInFirestore(
  products: Product[],
  movements: StockMovement[]
) {
  const batch = writeBatch(db);

  products.forEach((p) => {
    const pRef = doc(db, PRODUCTS_COLLECTION, p.id);
    batch.set(pRef, cleanForFirestore(p), { merge: true });
  });

  movements.slice(0, 100).forEach((m) => {
    const mRef = doc(db, MOVEMENTS_COLLECTION, m.id);
    batch.set(mRef, cleanForFirestore(m), { merge: true });
  });

  await batch.commit();
}

// Synchronize all official products & initial movements into Firestore (IDEMPOTENT & NON-DESTRUCTIVE)
export async function syncInitialFirestoreData() {
  try {
    let currentBatch = writeBatch(db);
    let writesCount = 0;

    const commitAndReset = async () => {
      if (writesCount > 0) {
        await currentBatch.commit();
        currentBatch = writeBatch(db);
        writesCount = 0;
      }
    };

    // 1. Check existing products in Firestore - NEVER overwrite existing products or their currentStock!
    const prodsSnap = await getDocs(collection(db, PRODUCTS_COLLECTION));
    const existingProductIds = new Set<string>(prodsSnap.docs.map((d) => d.id));

    for (const p of INITIAL_PRODUCTS) {
      if (!existingProductIds.has(p.id)) {
        // Only insert if the product does not exist in Firestore at all
        const ref = doc(db, PRODUCTS_COLLECTION, p.id);
        currentBatch.set(ref, cleanForFirestore(p));
        writesCount++;
        if (writesCount >= 400) await commitAndReset();
      }
    }

    // 2. Check existing movements in Firestore and sanitize legacy house labels if needed
    const movsSnap = await getDocs(collection(db, MOVEMENTS_COLLECTION));
    for (const docSnap of movsSnap.docs) {
      const data = docSnap.data() as StockMovement;
      if (data.sector && REASSIGNED_HOUSES_TO_COZINHA.has(data.sector)) {
        const sanitized = sanitizeMovement(data);
        currentBatch.set(docSnap.ref, cleanForFirestore(sanitized), { merge: true });
        writesCount++;
        if (writesCount >= 400) await commitAndReset();
      }
    }

    // 3. Prune dummy meal records strictly prior to 14/08
    const mealsSnap = await getDocs(collection(db, MEALS_COLLECTION));
    const existingMealIds = new Set<string>();
    for (const docSnap of mealsSnap.docs) {
      const data = docSnap.data() as DailyMealRecord;
      if (data && data.date && data.date < '2026-08-14') {
        currentBatch.delete(docSnap.ref);
        writesCount++;
        if (writesCount >= 400) await commitAndReset();
      } else {
        existingMealIds.add(docSnap.id);
      }
    }

    // 4. Ensure baseline meal record from 14/08 is in Firestore if missing
    for (const meal of INITIAL_MEAL_RECORDS) {
      if (!existingMealIds.has(meal.id)) {
        const ref = doc(db, MEALS_COLLECTION, meal.id);
        currentBatch.set(ref, cleanForFirestore(meal));
        writesCount++;
        if (writesCount >= 400) await commitAndReset();
      }
    }

    // 5. Daily kit: only create if it doesn't exist
    const kitRef = doc(db, KITS_COLLECTION, 'daily_kitchen_kit');
    const kitSnap = await getDocs(collection(db, KITS_COLLECTION));
    const hasKit = kitSnap.docs.some((d) => d.id === 'daily_kitchen_kit');
    if (!hasKit) {
      currentBatch.set(kitRef, cleanForFirestore(DEFAULT_DAILY_KIT));
      writesCount++;
    }

    await commitAndReset();
    console.log('Successfully verified and preserved Firestore database integrity.');
  } catch (err) {
    console.error('Error in non-destructive syncInitialFirestoreData:', err);
  }
}


