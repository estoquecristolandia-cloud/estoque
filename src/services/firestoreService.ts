import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  writeBatch,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db, AppUserProfile, UserRole } from '../firebase';
import { Product, StockMovement, DailyKit, DailyMealRecord, EntryType, Sector, InventoryAudit, InventorySessionSummary } from '../types';
import { INITIAL_PRODUCTS, INITIAL_MOVEMENTS, DEFAULT_DAILY_KIT } from '../data/initialData';

const PRODUCTS_COLLECTION = 'products';
const MOVEMENTS_COLLECTION = 'movements';
const KITS_COLLECTION = 'kits';
const USERS_COLLECTION = 'users';
const MEALS_COLLECTION = 'meals';
const INVENTORY_AUDITS_COLLECTION = 'inventory_audits';
const INVENTORY_SESSIONS_COLLECTION = 'inventory_sessions';
const MARCO_ZERO_SESSION_ID = 'marco-zero-20260821';

function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) cleaned[key] = obj[key];
  });
  return cleaned;
}

function operationId(prefix: string) {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${id}`;
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

function toError(err: unknown, fallback: string): Error {
  return err instanceof Error ? err : new Error(fallback);
}

export function subscribeToProducts(onData: (products: Product[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(
    collection(db, PRODUCTS_COLLECTION),
    (snapshot) => {
      const list = snapshot.docs.map((d) => {
        const prod = d.data() as Product;
        const normId = (prod.id || '').toLowerCase();
        const normName = (prod.name || '').toLowerCase();
        if (normId.includes('flocao') || normName.includes('flocão')) {
          if (!prod.usageFrequency || prod.usageFrequency.includes('15') || prod.usageFrequency.includes('22') || !prod.usageFrequency.includes('20')) {
            prod.usageFrequency = 'Somente Quartas e Domingos (20 pacotes/preparo)';
            prod.dailyAvgConsumption = 5.71;
            prod.minStock = 40;
            prod.idealStock = 80;
          }
        }
        return prod;
      }).sort((a, b) => a.name.localeCompare(b.name));
      onData(list);
    },
    (err) => {
      console.error('Error listening to products:', err);
      onError?.(toError(err, 'Não foi possível carregar os produtos.'));
    }
  );
}

export function subscribeToMovements(onData: (movements: StockMovement[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(
    collection(db, MOVEMENTS_COLLECTION),
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as StockMovement).sort((a, b) => {
        const date = (b.date || '').localeCompare(a.date || '');
        if (date) return date;
        const time = (b.time || '').localeCompare(a.time || '');
        if (time) return time;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
      onData(list);
    },
    (err) => {
      console.error('Error listening to movements:', err);
      onError?.(toError(err, 'Não foi possível carregar o histórico.'));
    }
  );
}

export function subscribeToDailyKit(onData: (kit: DailyKit) => void, onError?: (error: Error) => void) {
  return onSnapshot(
    doc(db, KITS_COLLECTION, 'daily_kitchen_kit'),
    (snapshot) => {
      onData(snapshot.exists() ? (snapshot.data() as DailyKit) : DEFAULT_DAILY_KIT);
    },
    (err) => {
      console.error('Error listening to daily kit:', err);
      onError?.(toError(err, 'Não foi possível carregar o Kit Diário.'));
    }
  );
}

export function subscribeToUsers(onData: (users: AppUserProfile[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(
    collection(db, USERS_COLLECTION),
    (snapshot) => {
      onData(snapshot.docs.map((d) => d.data() as AppUserProfile).sort((a, b) => a.displayName.localeCompare(b.displayName)));
    },
    (err) => {
      console.error('Error listening to users:', err);
      onError?.(toError(err, 'Não foi possível carregar os usuários.'));
    }
  );
}

export function subscribeToMeals(onData: (meals: DailyMealRecord[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(
    collection(db, MEALS_COLLECTION),
    (snapshot) => {
      onData(snapshot.docs.map((d) => d.data() as DailyMealRecord).filter((m) => !!m?.date).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
    },
    (err) => {
      console.error('Error listening to meals:', err);
      onError?.(toError(err, 'Não foi possível carregar as refeições.'));
    }
  );
}

export function subscribeToInventoryAudits(onData: (audits: InventoryAudit[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(
    collection(db, INVENTORY_AUDITS_COLLECTION),
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as InventoryAudit).sort((a, b) => {
        const date = (b.date || '').localeCompare(a.date || '');
        if (date) return date;
        const time = (b.time || '').localeCompare(a.time || '');
        if (time) return time;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
      onData(list);
    },
    (err) => {
      console.error('Error listening to inventory audits:', err);
      onError?.(toError(err, 'Não foi possível carregar o histórico de auditorias.'));
    }
  );
}

export function subscribeToInventorySessions(onData: (sessions: InventorySessionSummary[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(
    collection(db, INVENTORY_SESSIONS_COLLECTION),
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as InventorySessionSummary).sort((a, b) => {
        const date = (b.date || '').localeCompare(a.date || '');
        if (date) return date;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
      onData(list);
    },
    (err) => {
      console.error('Error listening to inventory sessions:', err);
      onError?.(toError(err, 'Não foi possível carregar as sessões de inventário.'));
    }
  );
}

export async function createProductInFirestore(product: Product): Promise<void> {
  await setDoc(doc(db, PRODUCTS_COLLECTION, product.id), cleanForFirestore(product));
}

export async function updateProductCatalogInFirestore(product: Product): Promise<void> {
  const { currentStock, lastOperationId, ...catalogData } = product as any;
  await setDoc(
    doc(db, PRODUCTS_COLLECTION, product.id),
    cleanForFirestore({
      ...catalogData,
      lastUpdated: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    }),
    { merge: true }
  );
}

export async function saveProductToFirestore(product: Product): Promise<void> {
  const ref = doc(db, PRODUCTS_COLLECTION, product.id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateProductCatalogInFirestore(product);
  } else {
    await createProductInFirestore(product);
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  await deleteDoc(doc(db, PRODUCTS_COLLECTION, productId));
}

export async function saveMovementToFirestore(movement: StockMovement): Promise<void> {
  await setDoc(doc(db, MOVEMENTS_COLLECTION, movement.id), cleanForFirestore(movement), { merge: true });
}

export async function saveDailyKitToFirestore(kit: DailyKit): Promise<void> {
  await setDoc(doc(db, KITS_COLLECTION, 'daily_kitchen_kit'), cleanForFirestore(kit), { merge: true });
}

export async function saveMealRecordToFirestore(record: DailyMealRecord): Promise<void> {
  await setDoc(doc(db, MEALS_COLLECTION, record.id), cleanForFirestore(record), { merge: true });
}

export async function deleteMealRecordFromFirestore(mealId: string): Promise<void> {
  await deleteDoc(doc(db, MEALS_COLLECTION, mealId));
}

export async function updateUserRoleInFirestore(uid: string, role: UserRole): Promise<void> {
  await setDoc(doc(db, USERS_COLLECTION, uid), { role }, { merge: true });
}

export async function saveProductsAndMovementsInFirestore(products: Product[], movements: StockMovement[]): Promise<void> {
  const batch = writeBatch(db);
  products.forEach((p) => {
    const { currentStock, lastOperationId, updatedAt, ...catalogData } = p as any;
    batch.set(doc(db, PRODUCTS_COLLECTION, p.id), cleanForFirestore(catalogData), { merge: true });
  });
  movements.slice(0, 100).forEach((m) => batch.set(doc(db, MOVEMENTS_COLLECTION, m.id), cleanForFirestore(m), { merge: true }));
  await batch.commit();
}

/**
 * Seeds missing documents and, once only, establishes the confirmed 21/08/2026
 * physical inventory as the official Marco Zero. Historical movements are never rewritten.
 */
export async function syncInitialFirestoreData(): Promise<void> {
  const prodsSnap = await getDocs(collection(db, PRODUCTS_COLLECTION));
  const existingIds = new Set(prodsSnap.docs.map((d) => d.id));
  const batch = writeBatch(db);
  let writes = 0;

  for (const product of INITIAL_PRODUCTS) {
    if (!existingIds.has(product.id)) {
      batch.set(doc(db, PRODUCTS_COLLECTION, product.id), cleanForFirestore(product));
      writes++;
    }
  }

  // Update catalog standard consumption and minimum stock for adjusted products
  const adjustedCatalogProps: Record<string, { dailyAvgConsumption: number; minStock: number }> = {
    'prod-arroz': { dailyAvgConsumption: 15, minStock: 45 },
    'prod-feijao': { dailyAvgConsumption: 8, minStock: 24 },
    'prod-cafe': { dailyAvgConsumption: 1.5, minStock: 4.5 },
    'prod-oleo': { dailyAvgConsumption: 1, minStock: 3 },
  };

  for (const [prodId, props] of Object.entries(adjustedCatalogProps)) {
    if (existingIds.has(prodId)) {
      batch.set(doc(db, PRODUCTS_COLLECTION, prodId), props, { merge: true });
      writes++;
    }
  }

  const kitRef = doc(db, KITS_COLLECTION, 'daily_kitchen_kit');
  const kitSnap = await getDoc(kitRef);
  if (!kitSnap.exists()) {
    batch.set(kitRef, cleanForFirestore(DEFAULT_DAILY_KIT));
    writes++;
  } else {
    // If the kit in firestore has the previous default quantities, synchronize it to the new standard
    const existingKit = kitSnap.data() as DailyKit;
    let needsUpdate = false;
    const updatedItems = (existingKit.items || []).map((item) => {
      if (item.productId === 'prod-arroz' && (item.quantity === 17 || !item.quantity)) {
        needsUpdate = true;
        return { ...item, quantity: 15 };
      }
      if (item.productId === 'prod-feijao' && (item.quantity === 9 || !item.quantity)) {
        needsUpdate = true;
        return { ...item, quantity: 8 };
      }
      if (item.productId === 'prod-cafe' && (item.quantity === 3 || !item.quantity)) {
        needsUpdate = true;
        return { ...item, quantity: 1.5 };
      }
      if (item.productId === 'prod-oleo' && (item.quantity === 1.5 || !item.quantity)) {
        needsUpdate = true;
        return { ...item, quantity: 1 };
      }
      return item;
    });

    if (needsUpdate) {
      batch.set(kitRef, cleanForFirestore({ ...existingKit, items: updatedItems }), { merge: true });
      writes++;
    }
  }

  if (writes > 0) await batch.commit();

  const marcoZeroRef = doc(db, INVENTORY_SESSIONS_COLLECTION, MARCO_ZERO_SESSION_ID);
  const marcoZeroSnap = await getDoc(marcoZeroRef);
  if (!marcoZeroSnap.exists()) {
    const currentProductsSnap = await getDocs(collection(db, PRODUCTS_COLLECTION));
    const currentById = new Map(currentProductsSnap.docs.map((d) => [d.id, d.data() as Product]));
    const baselineBatch = writeBatch(db);
    const now = new Date().toISOString();
    const auditDate = '2026-08-21';
    const auditTime = '17:30';
    let baselineWrites = 0;
    let adjustedCount = 0;

    for (const baselineProduct of INITIAL_PRODUCTS) {
      const currentProduct = currentById.get(baselineProduct.id);
      if (!currentProduct) continue;

      const previousStock = round2(Number(currentProduct.currentStock || 0));
      const physicalStock = round2(Number(baselineProduct.currentStock || 0));
      const difference = round2(physicalStock - previousStock);

      if (difference === 0) continue;

      const opId = `adj-marco-zero-20260821-${baselineProduct.id}`;
      const reason = 'Conciliação física e estabelecimento de Marco Zero — contagem e recontagem física realizada em 21/08/2026.';

      const movement: StockMovement = {
        id: opId,
        operationId: opId,
        productId: currentProduct.id,
        productName: currentProduct.name,
        unit: currentProduct.unit,
        type: 'ajuste',
        quantity: Math.abs(difference),
        date: auditDate,
        time: auditTime,
        responsible: 'Marconi Castro (Gestor do Estoque)',
        reason,
        previousStock,
        physicalStock,
        difference,
        notes: `[Ajuste de Inventário / Marco Zero]: De ${previousStock} ${currentProduct.unit} para ${physicalStock} ${currentProduct.unit}. ${reason}`,
        createdAt: now,
      };

      const audit: InventoryAudit = {
        id: opId,
        productId: currentProduct.id,
        productName: currentProduct.name,
        unit: currentProduct.unit,
        previousStock,
        physicalStock,
        difference,
        reason,
        responsible: 'Marconi Castro (Gestor do Estoque)',
        date: auditDate,
        time: auditTime,
        createdAt: now,
        notes: `Ajuste auditado de Marco Zero: ${previousStock} -> ${physicalStock} ${currentProduct.unit}.`,
      };

      baselineBatch.set(
        doc(db, PRODUCTS_COLLECTION, currentProduct.id),
        cleanForFirestore({
          currentStock: physicalStock,
          lastUpdated: now,
          lastOperationId: opId,
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
      baselineBatch.set(doc(db, MOVEMENTS_COLLECTION, opId), cleanForFirestore(movement));
      baselineBatch.set(doc(db, INVENTORY_AUDITS_COLLECTION, opId), cleanForFirestore(audit));
      baselineWrites += 3;
      adjustedCount++;
    }

    const session: InventorySessionSummary = {
      id: MARCO_ZERO_SESSION_ID,
      date: auditDate,
      time: auditTime,
      responsible: 'Marconi Castro (Gestor do Estoque)',
      totalProducts: INITIAL_PRODUCTS.length,
      checkedCount: INITIAL_PRODUCTS.length,
      divergentCount: adjustedCount,
      adjustedCount,
      notes: 'Marco Zero oficial baseado na contagem e recontagem física confirmada em 21/08/2026. Histórico anterior preservado integralmente; nenhuma movimentação histórica foi reescrita.',
      createdAt: now,
      userEmail: 'estoquecristolandia@gmail.com',
    };

    baselineBatch.set(doc(db, INVENTORY_SESSIONS_COLLECTION, MARCO_ZERO_SESSION_ID), cleanForFirestore(session));
    baselineWrites++;

    if (baselineWrites > 0) await baselineBatch.commit();
  }

  // Ensure 24/08-31/08 Leite Reconciliation (Entrada 60L, Saídas 51L, Ajuste +2L -> Saldo 11L) is synced to Firestore
  const leiteReconciliationSessionId = 'inv-session-20260831-conciliacao-leite';
  const leiteReconSnap = await getDoc(doc(db, INVENTORY_SESSIONS_COLLECTION, leiteReconciliationSessionId));
  if (!leiteReconSnap.exists()) {
    const leiteBatch = writeBatch(db);
    const now = new Date().toISOString();

    // 1. Set prod-leite current stock to 11 L
    const leiteRef = doc(db, PRODUCTS_COLLECTION, 'prod-leite');
    leiteBatch.set(
      leiteRef,
      cleanForFirestore({
        currentStock: 11,
        lastUpdated: '2026-08-31T17:00:00Z',
        lastOperationId: 'adj-20260831-prod-leite-conciliacao',
        updatedAt: serverTimestamp(),
      }),
      { merge: true }
    );

    // 2. Commit all 23 Leite movements (1 entrada, 21 saídas, 1 ajuste conciliação)
    const leiteMovements = INITIAL_MOVEMENTS.filter(
      (m) =>
        m.productId === 'prod-leite' &&
        ((m.date >= '2026-08-24' && m.date <= '2026-08-31') || m.id === 'adj-20260831-prod-leite-conciliacao')
    );

    leiteMovements.forEach((mov) => {
      leiteBatch.set(doc(db, MOVEMENTS_COLLECTION, mov.id), cleanForFirestore(mov), { merge: true });
    });

    // 3. Commit Audit and Session
    const auditDoc: InventoryAudit = {
      id: 'adj-20260831-prod-leite-conciliacao',
      productId: 'prod-leite',
      productName: 'Leite Integral',
      unit: 'litro',
      previousStock: 9,
      physicalStock: 11,
      difference: 2,
      reason: 'Ajuste de conciliação de estoque — Padaria / Diferença necessária para o saldo físico conferido de 11 L',
      responsible: 'Marconi Castro (Gestor do Estoque)',
      date: '2026-08-31',
      time: '17:00',
      createdAt: '2026-08-31T17:00:00Z',
      notes: 'Ajuste auditado: +2 L (Padaria). Motivo: Ajuste de conciliação de estoque para fechamento com o estoque físico conferido de 11 L.',
    };
    leiteBatch.set(doc(db, INVENTORY_AUDITS_COLLECTION, auditDoc.id), cleanForFirestore(auditDoc), { merge: true });

    const sessionDoc: InventorySessionSummary = {
      id: leiteReconciliationSessionId,
      date: '2026-08-31',
      time: '17:00',
      responsible: 'Marconi Castro (Gestor do Estoque)',
      totalProducts: 1,
      checkedCount: 1,
      divergentCount: 1,
      adjustedCount: 1,
      notes: 'Conciliação de estoque do Leite Integral (24/08 a 31/08): Entrada de +60 L, 21 saídas totalizando 51 L, ajuste de conciliação de +2 L (Padaria) e saldo final de 11 L.',
      createdAt: now,
      userEmail: 'estoquecristolandia@gmail.com',
    };
    leiteBatch.set(doc(db, INVENTORY_SESSIONS_COLLECTION, leiteReconciliationSessionId), cleanForFirestore(sessionDoc));

    await leiteBatch.commit();
  }
}

export async function executeEntryTransaction(
  productId: string,
  quantity: number,
  entryType: EntryType,
  supplierOrDonor: string,
  receivedBy: string,
  date: string,
  time: string,
  notes: string,
  clientRequestId?: string
): Promise<{ updatedProduct: Product; movement: StockMovement }> {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Informe uma quantidade válida maior que zero.');
  const opId = clientRequestId ? (clientRequestId.startsWith('entry-') ? clientRequestId : `entry-${clientRequestId}`) : operationId('entry');
  return runTransaction(db, async (tx) => {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    const movementRef = doc(db, MOVEMENTS_COLLECTION, opId);
    const [movementSnap, snap] = await Promise.all([tx.get(movementRef), tx.get(productRef)]);

    if (movementSnap.exists()) {
      // Idempotência Atômica: Operação já foi processada anteriormente
      const existingMovement = movementSnap.data() as StockMovement;
      const currentProduct = snap.exists() ? (snap.data() as Product) : ({ id: productId, currentStock: 0 } as Product);
      return { updatedProduct: currentProduct, movement: existingMovement };
    }

    if (!snap.exists()) throw new Error('Produto não encontrado no Firestore.');
    const product = snap.data() as Product;
    const now = new Date().toISOString();
    const newStock = round2(Number(product.currentStock || 0) + quantity);
    const movement: StockMovement = { id: opId, operationId: opId, clientRequestId: clientRequestId || opId, productId: product.id, productName: product.name, unit: product.unit, type: 'entrada', quantity, date, time: time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), entryType, supplierOrDonor, receivedBy, notes, createdAt: now };
    const updatedProduct = { ...product, currentStock: newStock, lastUpdated: now, lastOperationId: opId, updatedAt: serverTimestamp() } as Product;
    tx.set(productRef, cleanForFirestore(updatedProduct), { merge: true });
    tx.set(movementRef, cleanForFirestore(movement));
    return { updatedProduct, movement };
  });
}

export async function executeExitTransaction(
  productId: string,
  quantity: number,
  sector: Sector,
  retrievedBy: string,
  deliveredBy: string,
  date: string,
  time: string,
  notes: string,
  clientRequestId?: string
): Promise<{ updatedProduct: Product; movement: StockMovement }> {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Informe uma quantidade válida maior que zero.');
  const opId = clientRequestId ? (clientRequestId.startsWith('exit-') ? clientRequestId : `exit-${clientRequestId}`) : operationId('exit');
  return runTransaction(db, async (tx) => {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    const movementRef = doc(db, MOVEMENTS_COLLECTION, opId);
    const [movementSnap, snap] = await Promise.all([tx.get(movementRef), tx.get(productRef)]);

    if (movementSnap.exists()) {
      // Idempotência Atômica: Operação já foi processada anteriormente
      const existingMovement = movementSnap.data() as StockMovement;
      const currentProduct = snap.exists() ? (snap.data() as Product) : ({ id: productId, currentStock: 0 } as Product);
      return { updatedProduct: currentProduct, movement: existingMovement };
    }

    if (!snap.exists()) throw new Error('Produto não encontrado no Firestore.');
    const product = snap.data() as Product;
    const currentStock = Number(product.currentStock || 0);
    if (quantity > currentStock) throw new Error(`Quantidade solicitada (${quantity} ${product.unit}) é maior do que o estoque atual (${currentStock} ${product.unit}).`);
    const now = new Date().toISOString();
    const newStock = round2(currentStock - quantity);
    const movement: StockMovement = { id: opId, operationId: opId, clientRequestId: clientRequestId || opId, productId: product.id, productName: product.name, unit: product.unit, type: 'saida', quantity, date, time: time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), sector, retrievedBy, deliveredBy, notes, createdAt: now };
    const updatedProduct = { ...product, currentStock: newStock, lastUpdated: now, lastOperationId: opId, updatedAt: serverTimestamp() } as Product;
    tx.set(productRef, cleanForFirestore(updatedProduct), { merge: true });
    tx.set(movementRef, cleanForFirestore(movement));
    return { updatedProduct, movement };
  });
}

export async function executeBatchExitTransaction(
  items: Array<{ productId: string; quantity: number }>,
  sector: Sector,
  retrievedBy: string,
  deliveredBy: string,
  date: string,
  time: string,
  notes: string,
  clientRequestId?: string
): Promise<{ updatedProducts: Product[]; movements: StockMovement[] }> {
  const totals = new Map<string, number>();
  for (const item of items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error('Todas as quantidades devem ser maiores que zero.');
    totals.set(item.productId, round2((totals.get(item.productId) || 0) + item.quantity));
  }
  const batchBaseId = clientRequestId ? (clientRequestId.startsWith('batch-') ? clientRequestId : `batch-${clientRequestId}`) : operationId('batch-exit');
  return runTransaction(db, async (tx) => {
    const productRefs = [...totals.keys()].map((id) => doc(db, PRODUCTS_COLLECTION, id));
    const movementRefs = [...totals.keys()].map((id) => doc(db, MOVEMENTS_COLLECTION, `${batchBaseId}-${id}`));
    const [productSnaps, movementSnaps] = await Promise.all([
      Promise.all(productRefs.map((ref) => tx.get(ref))),
      Promise.all(movementRefs.map((ref) => tx.get(ref))),
    ]);

    const existingMovements: StockMovement[] = [];
    movementSnaps.forEach((mSnap) => {
      if (mSnap.exists()) {
        existingMovements.push(mSnap.data() as StockMovement);
      }
    });

    if (existingMovements.length > 0) {
      // Idempotência Atômica: Lote já processado anteriormente
      const currentProducts: Product[] = [];
      productSnaps.forEach((pSnap) => {
        if (pSnap.exists()) currentProducts.push(pSnap.data() as Product);
      });
      return { updatedProducts: currentProducts, movements: existingMovements };
    }

    const products = new Map<string, Product>();
    productSnaps.forEach((snap, index) => {
      if (!snap.exists()) throw new Error('Um dos produtos selecionados não existe mais no estoque.');
      products.set(productRefs[index].id, snap.data() as Product);
    });
    const now = new Date().toISOString();
    const updatedProducts: Product[] = [];
    const movements: StockMovement[] = [];
    for (const [productId, quantity] of totals.entries()) {
      const product = products.get(productId)!;
      const currentStock = Number(product.currentStock || 0);
      if (quantity > currentStock) throw new Error(`Estoque insuficiente para ${product.name}! Saldo disponível: ${currentStock} ${product.unit}, solicitado: ${quantity} ${product.unit}.`);
      const opId = `${batchBaseId}-${productId}`;
      const newStock = round2(currentStock - quantity);
      const movement: StockMovement = { id: opId, operationId: opId, clientRequestId: clientRequestId || batchBaseId, productId, productName: product.name, unit: product.unit, type: 'saida', quantity, date, time: time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), sector, retrievedBy, deliveredBy, notes: notes || '', createdAt: now };
      const updatedProduct = { ...product, currentStock: newStock, lastUpdated: now, lastOperationId: opId, updatedAt: serverTimestamp() } as Product;
      tx.set(doc(db, PRODUCTS_COLLECTION, productId), cleanForFirestore(updatedProduct), { merge: true });
      tx.set(doc(db, MOVEMENTS_COLLECTION, opId), cleanForFirestore(movement));
      updatedProducts.push(updatedProduct); movements.push(movement);
    }
    return { updatedProducts, movements };
  });
}

export async function executeDailyKitTransaction(
  kit: DailyKit,
  retrievedBy: string,
  deliveredBy: string,
  date: string,
  time: string,
  clientRequestId?: string
): Promise<{ updatedProducts: Product[]; movements: StockMovement[]; deliveredCount: number }> {
  const kitBaseId = clientRequestId ? (clientRequestId.startsWith('kit-') ? clientRequestId : `kit-${clientRequestId}`) : operationId('kit');
  return runTransaction(db, async (tx) => {
    const uniqueIds = [...new Set(kit.items.map((i) => i.productId))];
    const productRefs = uniqueIds.map((id) => doc(db, PRODUCTS_COLLECTION, id));
    const movementRefs = uniqueIds.map((id) => doc(db, MOVEMENTS_COLLECTION, `${kitBaseId}-${id}`));
    const [productSnaps, movementSnaps] = await Promise.all([
      Promise.all(productRefs.map((ref) => tx.get(ref))),
      Promise.all(movementRefs.map((ref) => tx.get(ref))),
    ]);

    const existingMovements: StockMovement[] = [];
    movementSnaps.forEach((mSnap) => {
      if (mSnap.exists()) {
        existingMovements.push(mSnap.data() as StockMovement);
      }
    });

    if (existingMovements.length > 0) {
      // Idempotência Atômica: Kit já baixado anteriormente
      const currentProducts: Product[] = [];
      productSnaps.forEach((pSnap) => {
        if (pSnap.exists()) currentProducts.push(pSnap.data() as Product);
      });
      return { updatedProducts: currentProducts, movements: existingMovements, deliveredCount: existingMovements.length };
    }

    const products = new Map<string, Product>();
    productSnaps.forEach((snap, index) => {
      if (!snap.exists()) throw new Error(`Produto do kit não encontrado no cadastro: ${uniqueIds[index]}`);
      products.set(uniqueIds[index], snap.data() as Product);
    });
    const totals = new Map<string, number>();
    kit.items.forEach((item) => totals.set(item.productId, round2((totals.get(item.productId) || 0) + item.quantity)));
    for (const [id, qty] of totals.entries()) {
      const product = products.get(id)!;
      const currentStock = Number(product.currentStock || 0);
      if (qty <= 0) throw new Error(`Quantidade inválida no kit para ${product.name}.`);
      if (qty > currentStock) throw new Error(`Estoque insuficiente para ${product.name}: necessário ${qty} ${product.unit}, disponível apenas ${currentStock} ${product.unit}.`);
    }
    const now = new Date().toISOString();
    const updatedProducts: Product[] = [];
    const movements: StockMovement[] = [];
    for (const [id, qty] of totals.entries()) {
      const product = products.get(id)!;
      const currentStock = Number(product.currentStock || 0);
      const opId = `${kitBaseId}-${id}`;
      const newStock = round2(currentStock - qty);
      const movement: StockMovement = { id: opId, operationId: opId, clientRequestId: clientRequestId || kitBaseId, productId: id, productName: product.name, unit: product.unit, type: 'saida', quantity: qty, date, time: time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), sector: kit.sector, retrievedBy: retrievedBy || kit.defaultRetriever, deliveredBy: deliveredBy || kit.defaultDeliverer, notes: `Entrega Automática do ${kit.name}`, createdAt: now };
      const updatedProduct = { ...product, currentStock: newStock, lastUpdated: now, lastOperationId: opId, updatedAt: serverTimestamp() } as Product;
      tx.set(doc(db, PRODUCTS_COLLECTION, id), cleanForFirestore(updatedProduct), { merge: true });
      tx.set(doc(db, MOVEMENTS_COLLECTION, opId), cleanForFirestore(movement));
      updatedProducts.push(updatedProduct); movements.push(movement);
    }
    return { updatedProducts, movements, deliveredCount: movements.length };
  });
}

export async function updateStockMovementTransaction(
  movementId: string,
  updatedData: Partial<StockMovement> & { productId: string; quantity: number; type: 'entrada' | 'saida' }
): Promise<{ updatedProducts: Product[]; movement: StockMovement }> {
  const qty = round2(Number(updatedData.quantity));
  if (!Number.isFinite(qty) || qty <= 0) throw new Error('Informe uma quantidade válida maior que zero.');
  return runTransaction(db, async (tx) => {
    const oldRef = doc(db, MOVEMENTS_COLLECTION, movementId);
    const oldSnap = await tx.get(oldRef);
    if (!oldSnap.exists()) throw new Error('Movimentação não encontrada.');
    const oldMovement = oldSnap.data() as StockMovement;
    const oldProductRef = doc(db, PRODUCTS_COLLECTION, oldMovement.productId);
    const newProductRef = doc(db, PRODUCTS_COLLECTION, updatedData.productId);
    const oldProductSnap = await tx.get(oldProductRef);
    if (!oldProductSnap.exists()) throw new Error('Produto original não encontrado.');
    const oldProduct = oldProductSnap.data() as Product;
    let newProduct = oldProduct;
    if (updatedData.productId !== oldMovement.productId) {
      const newSnap = await tx.get(newProductRef);
      if (!newSnap.exists()) throw new Error('Novo produto não encontrado.');
      newProduct = newSnap.data() as Product;
    }
    const oldImpact = oldMovement.type === 'entrada' ? oldMovement.quantity : -oldMovement.quantity;
    const newImpact = updatedData.type === 'entrada' ? qty : -qty;
    const revertedOldStock = round2(oldProduct.currentStock - oldImpact);
    if (revertedOldStock < 0) throw new Error('A edição não pode ser aplicada porque o saldo atual não comporta o estorno da movimentação original.');
    const finalNewStock = round2(updatedData.productId === oldMovement.productId ? revertedOldStock + newImpact : newProduct.currentStock + newImpact);
    if (finalNewStock < 0) throw new Error(`Estoque insuficiente em "${newProduct.name}" para esta edição (saldo final seria ${finalNewStock} ${newProduct.unit}).`);
    const now = new Date().toISOString();
    const opId = operationId('edit');
    const movement: StockMovement = { ...oldMovement, ...updatedData, id: movementId, operationId: opId, productId: updatedData.productId, productName: newProduct.name, unit: newProduct.unit, quantity: qty, createdAt: oldMovement.createdAt || now };
    if (updatedData.productId === oldMovement.productId) {
      const updatedProduct = { ...oldProduct, currentStock: finalNewStock, lastUpdated: now, lastOperationId: opId, updatedAt: serverTimestamp() } as Product;
      tx.set(oldProductRef, cleanForFirestore(updatedProduct), { merge: true });
      tx.set(oldRef, cleanForFirestore(movement), { merge: true });
      return { updatedProducts: [updatedProduct], movement };
    }
    const updatedOldProduct = { ...oldProduct, currentStock: revertedOldStock, lastUpdated: now, updatedAt: serverTimestamp() } as Product;
    const updatedNewProduct = { ...newProduct, currentStock: finalNewStock, lastUpdated: now, lastOperationId: opId, updatedAt: serverTimestamp() } as Product;
    tx.set(oldProductRef, cleanForFirestore(updatedOldProduct), { merge: true });
    tx.set(newProductRef, cleanForFirestore(updatedNewProduct), { merge: true });
    tx.set(oldRef, cleanForFirestore(movement), { merge: true });
    return { updatedProducts: [updatedOldProduct, updatedNewProduct], movement };
  });
}

export async function deleteStockMovementTransaction(movementId: string): Promise<{ updatedProduct: Product; deletedMovementId: string }> {
  return runTransaction(db, async (tx) => {
    const movementRef = doc(db, MOVEMENTS_COLLECTION, movementId);
    const movementSnap = await tx.get(movementRef);
    if (!movementSnap.exists()) throw new Error('Movimentação não encontrada.');
    const movement = movementSnap.data() as StockMovement;
    const productRef = doc(db, PRODUCTS_COLLECTION, movement.productId);
    const productSnap = await tx.get(productRef);
    if (!productSnap.exists()) throw new Error('Produto associado não encontrado.');
    const product = productSnap.data() as Product;
    const restoredStock = round2(movement.type === 'entrada' ? product.currentStock - movement.quantity : product.currentStock + movement.quantity);
    if (restoredStock < 0) throw new Error(`Não é possível excluir esta movimentação porque o saldo de ${product.name} ficaria negativo (${restoredStock} ${product.unit}).`);
    const now = new Date().toISOString();
    const updatedProduct = { ...product, currentStock: restoredStock, lastUpdated: now, updatedAt: serverTimestamp() } as Product;
    tx.set(productRef, cleanForFirestore(updatedProduct), { merge: true });
    tx.delete(movementRef);
    return { updatedProduct, deletedMovementId: movementId };
  });
}

export async function executeInventoryAdjustmentTransaction(
  productId: string,
  newPhysicalStock: number,
  reason: string,
  registeredBy: string,
  date: string,
  time: string,
  userUid?: string,
  userEmail?: string,
  expectedPreviousStock?: number,
  clientRequestId?: string
): Promise<{ updatedProduct: Product; movement: StockMovement; audit: InventoryAudit }> {
  const targetStock = round2(Number(newPhysicalStock));
  if (!Number.isFinite(targetStock) || targetStock < 0) throw new Error('O saldo físico apurado não pode ser negativo.');
  const cleanedReason = (reason || '').trim();
  if (!cleanedReason) throw new Error('É obrigatório informar o motivo do ajuste.');
  const opId = clientRequestId ? (clientRequestId.startsWith('adj-') ? clientRequestId : `adj-${clientRequestId}`) : operationId('adj');
  return runTransaction(db, async (tx) => {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    const movementRef = doc(db, MOVEMENTS_COLLECTION, opId);
    const auditRef = doc(db, INVENTORY_AUDITS_COLLECTION, opId);
    const [snap, movementSnap, auditSnap] = await Promise.all([
      tx.get(productRef),
      tx.get(movementRef),
      tx.get(auditRef),
    ]);

    if (movementSnap.exists()) {
      // Idempotência Atômica: Ajuste já processado anteriormente
      const existingMovement = movementSnap.data() as StockMovement;
      const currentProd = snap.exists() ? (snap.data() as Product) : ({ id: productId, currentStock: targetStock } as Product);
      const existingAudit = auditSnap.exists() ? (auditSnap.data() as InventoryAudit) : ({ id: opId } as InventoryAudit);
      return { updatedProduct: currentProd, movement: existingMovement, audit: existingAudit };
    }

    if (!snap.exists()) throw new Error('Produto não encontrado no Firestore.');
    const product = snap.data() as Product;
    const current = round2(Number(product.currentStock || 0));
    if (expectedPreviousStock !== undefined && round2(expectedPreviousStock) !== current) {
      throw new Error(`O saldo no sistema foi alterado recentemente por outra operação (era ${expectedPreviousStock} ${product.unit}, agora é ${current} ${product.unit}). Revise a contagem física antes de confirmar.`);
    }
    const difference = round2(targetStock - current);
    if (difference === 0) throw new Error('O saldo físico informado é idêntico ao saldo atual do sistema.');
    const now = new Date().toISOString();
    const formattedTime = time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const formattedDate = date || new Date().toISOString().split('T')[0];
    const movement: StockMovement = { id: opId, operationId: opId, clientRequestId: clientRequestId || opId, productId: product.id, productName: product.name, unit: product.unit, type: 'ajuste', quantity: Math.abs(difference), date: formattedDate, time: formattedTime, responsible: registeredBy || 'Administrador', reason: cleanedReason, previousStock: current, physicalStock: targetStock, difference, notes: `[Ajuste de Inventário / Marco Zero]: De ${current} ${product.unit} para ${targetStock} ${product.unit} (${difference > 0 ? '+' : ''}${difference} ${product.unit}). Motivo: ${cleanedReason}`, createdAt: now, userUid, userEmail };
    const audit: InventoryAudit = { id: opId, productId: product.id, productName: product.name, unit: product.unit, previousStock: current, physicalStock: targetStock, difference, reason: cleanedReason, responsible: registeredBy || 'Administrador', date: formattedDate, time: formattedTime, createdAt: now, timestamp: serverTimestamp(), userUid, userEmail, notes: `Ajuste auditado: De ${current} para ${targetStock} ${product.unit}. Motivo: ${cleanedReason}` };
    const updatedProduct = { ...product, currentStock: targetStock, lastUpdated: now, lastOperationId: opId, updatedAt: serverTimestamp() } as Product;
    tx.set(productRef, cleanForFirestore(updatedProduct), { merge: true });
    tx.set(movementRef, cleanForFirestore(movement));
    tx.set(auditRef, cleanForFirestore(audit));
    return { updatedProduct, movement, audit };
  });
}

export async function saveInventorySessionToFirestore(sessionData: Omit<InventorySessionSummary, 'id' | 'createdAt'>): Promise<InventorySessionSummary> {
  const id = operationId('inv-session');
  const now = new Date().toISOString();
  const session: InventorySessionSummary = { ...sessionData, id, createdAt: now };
  await setDoc(doc(db, INVENTORY_SESSIONS_COLLECTION, id), cleanForFirestore(session));
  return session;
}
