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
import { Product, StockMovement, DailyKit, DailyMealRecord, EntryType, Sector, InventoryAudit, InventorySessionSummary, Missionary, AuthorizedUser } from '../types';
import { INITIAL_PRODUCTS, INITIAL_MOVEMENTS, DEFAULT_DAILY_KIT } from '../data/initialData';
import { INITIAL_DML_PRODUCTS, DEFAULT_DML_KIT } from '../data/initialDmlData';
import { isDmlProduct } from '../utils/departmentUtils';

const PRODUCTS_COLLECTION = 'products';
const MOVEMENTS_COLLECTION = 'movements';
const KITS_COLLECTION = 'kits';
const USERS_COLLECTION = 'users';
const MEALS_COLLECTION = 'meals';
const MISSIONARIES_COLLECTION = 'missionaries';
const AUTHORIZED_USERS_COLLECTION = 'authorized_users';
const INVENTORY_AUDITS_COLLECTION = 'inventory_audits';
const INVENTORY_SESSIONS_COLLECTION = 'inventory_sessions';
export const MARCO_ZERO_SESSION_ID = 'marco-zero-20260821';
export const MARCO_ZERO_DML_SESSION_ID = 'marco-zero-dml-20260921';

export function isMarcoZeroRecord(id: string): boolean {
  if (!id) return false;
  return (
    id.startsWith('adj-marco-zero-20260821-') ||
    id.startsWith('adj-20260821-') ||
    id.startsWith('adj-marco-zero-dml-20260921-') ||
    id === MARCO_ZERO_SESSION_ID ||
    id === MARCO_ZERO_DML_SESSION_ID
  );
}

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
        const raw = d.data();
        const docId = d.id;
        const isDml = isDmlProduct({ ...raw, id: docId });
        const prod: Product = {
          ...raw,
          id: docId,
          department: raw.department || (isDml ? 'dml' : 'alimentacao'),
        } as Product;

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
      const list = snapshot.docs.map((d) => {
        const raw = d.data();
        const docId = d.id;
        const isDml = raw.department === 'dml' || (raw.productId || '').toLowerCase().startsWith('dml-');
        return {
          ...raw,
          id: docId,
          department: raw.department || (isDml ? 'dml' : 'alimentacao'),
        } as StockMovement;
      }).sort((a, b) => {
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
    const dept = p.department || (isDmlProduct(p) ? 'dml' : 'alimentacao');
    batch.set(doc(db, PRODUCTS_COLLECTION, p.id), cleanForFirestore({ ...catalogData, department: dept }), { merge: true });
  });
  movements.slice(0, 100).forEach((m) => {
    const dept = m.department || (m.productId?.startsWith('dml-') ? 'dml' : 'alimentacao');
    batch.set(doc(db, MOVEMENTS_COLLECTION, m.id), cleanForFirestore({ ...m, department: dept }), { merge: true });
  });
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
      batch.set(doc(db, PRODUCTS_COLLECTION, product.id), cleanForFirestore({ ...product, department: 'alimentacao' }));
      writes++;
    } else {
      batch.set(doc(db, PRODUCTS_COLLECTION, product.id), { department: 'alimentacao' }, { merge: true });
      writes++;
    }
  }

  for (const dmlProduct of INITIAL_DML_PRODUCTS) {
    if (!existingIds.has(dmlProduct.id)) {
      batch.set(doc(db, PRODUCTS_COLLECTION, dmlProduct.id), cleanForFirestore({ ...dmlProduct, department: 'dml' }));
      writes++;
    } else {
      batch.set(doc(db, PRODUCTS_COLLECTION, dmlProduct.id), { department: 'dml' }, { merge: true });
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

  // Ensure DML Marco Zero (2026-09-21 08:00) with 0 current stock for all 17 DML products is synced to Firestore
  const marcoZeroDmlRef = doc(db, INVENTORY_SESSIONS_COLLECTION, MARCO_ZERO_DML_SESSION_ID);
  const marcoZeroDmlSnap = await getDoc(marcoZeroDmlRef);
  if (!marcoZeroDmlSnap.exists()) {
    const currentProductsSnap = await getDocs(collection(db, PRODUCTS_COLLECTION));
    const currentById = new Map(currentProductsSnap.docs.map((d) => [d.id, d.data() as Product]));
    const dmlBatch = writeBatch(db);
    const now = new Date().toISOString();
    const auditDate = '2026-09-21';
    const auditTime = '08:00';
    let dmlWrites = 0;

    for (const dmlProduct of INITIAL_DML_PRODUCTS) {
      const currentProduct = currentById.get(dmlProduct.id) || dmlProduct;
      const previousStock = round2(Number(currentProduct.currentStock || 0));
      const physicalStock = 0;
      const difference = round2(physicalStock - previousStock);
      const opId = `adj-marco-zero-dml-20260921-${dmlProduct.id}`;
      const reason = 'Marco Zero Oficial DML — Implantação e Zeramento aguardando conferência física presencial.';

      const movement: StockMovement = {
        id: opId,
        operationId: opId,
        productId: dmlProduct.id,
        productName: dmlProduct.name,
        unit: dmlProduct.unit,
        department: 'dml',
        type: 'ajuste',
        quantity: Math.abs(difference),
        date: auditDate,
        time: auditTime,
        responsible: 'Marconi Castro (Gestor do Estoque)',
        reason,
        previousStock,
        physicalStock,
        difference,
        notes: `[Marco Zero DML]: Saldo inicial estabelecido em 0 ${dmlProduct.unit}. ${reason}`,
        createdAt: now,
      };

      const audit: InventoryAudit = {
        id: opId,
        productId: dmlProduct.id,
        productName: dmlProduct.name,
        unit: dmlProduct.unit,
        previousStock,
        physicalStock,
        difference,
        reason,
        responsible: 'Marconi Castro (Gestor do Estoque)',
        date: auditDate,
        time: auditTime,
        createdAt: now,
        notes: `Ajuste auditado de Marco Zero DML: ${previousStock} -> 0 ${dmlProduct.unit}.`,
      };

      dmlBatch.set(
        doc(db, PRODUCTS_COLLECTION, dmlProduct.id),
        cleanForFirestore({
          ...dmlProduct,
          currentStock: 0,
          department: 'dml',
          lastUpdated: now,
          lastOperationId: opId,
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
      dmlBatch.set(doc(db, MOVEMENTS_COLLECTION, opId), cleanForFirestore(movement));
      dmlBatch.set(doc(db, INVENTORY_AUDITS_COLLECTION, opId), cleanForFirestore(audit));
      dmlWrites += 3;
    }

    const dmlSession: InventorySessionSummary = {
      id: MARCO_ZERO_DML_SESSION_ID,
      date: auditDate,
      time: auditTime,
      responsible: 'Marconi Castro (Gestor do Estoque)',
      totalProducts: INITIAL_DML_PRODUCTS.length,
      checkedCount: INITIAL_DML_PRODUCTS.length,
      divergentCount: 0,
      adjustedCount: INITIAL_DML_PRODUCTS.length,
      notes: 'Marco Zero oficial de implantação do setor DML (Higiene e Limpeza Predial). Estoque inicial estabelecido em 0 unidades aguardando contagem física presencial.',
      createdAt: now,
      userEmail: 'estoquecristolandia@gmail.com',
    };

    dmlBatch.set(doc(db, INVENTORY_SESSIONS_COLLECTION, MARCO_ZERO_DML_SESSION_ID), cleanForFirestore(dmlSession));
    dmlWrites++;

    if (dmlWrites > 0) await dmlBatch.commit();
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

export async function compensateStockMovementTransaction(
  movementId: string,
  reason?: string,
  clientRequestId?: string
): Promise<{ updatedProduct: Product; compensationMovement: StockMovement; originalMovement: StockMovement }> {
  // Proteção Cirúrgica do Marco Zero (21/08/2026):
  if (movementId.startsWith('adj-marco-zero-20260821-') || movementId.startsWith('adj-20260821-')) {
    throw new Error('Operação bloqueada: As movimentações do Marco Zero de 21/08/2026 são imutáveis e não podem ser estornadas ou compensadas.');
  }

  const compOpId = clientRequestId
    ? (clientRequestId.startsWith('comp-') ? clientRequestId : `comp-${clientRequestId}`)
    : `comp-${movementId}`;

  return runTransaction(db, async (tx) => {
    const origRef = doc(db, MOVEMENTS_COLLECTION, movementId);
    const compRef = doc(db, MOVEMENTS_COLLECTION, compOpId);
    const [origSnap, compSnap] = await Promise.all([tx.get(origRef), tx.get(compRef)]);

    if (!origSnap.exists()) throw new Error('Movimentação original não encontrada.');
    const origMovement = origSnap.data() as StockMovement;

    if (compSnap.exists()) {
      // Idempotência Atômica: compensação já processada anteriormente
      const existingComp = compSnap.data() as StockMovement;
      const productRef = doc(db, PRODUCTS_COLLECTION, origMovement.productId);
      const prodSnap = await tx.get(productRef);
      const prod = prodSnap.exists() ? (prodSnap.data() as Product) : ({ id: origMovement.productId, currentStock: 0 } as Product);
      return { updatedProduct: prod, compensationMovement: existingComp, originalMovement: origMovement };
    }

    if (origMovement.isCompensated) {
      throw new Error(`Esta movimentação já foi compensada anteriormente pelo registro ${origMovement.compensatedByMovementId || ''}.`);
    }

    const productRef = doc(db, PRODUCTS_COLLECTION, origMovement.productId);
    const productSnap = await tx.get(productRef);
    if (!productSnap.exists()) throw new Error('Produto associado não encontrado no Firestore.');
    const product = productSnap.data() as Product;
    const currentStock = round2(Number(product.currentStock || 0));

    // Cálculo exato do efeito reverso
    let reverseImpact = 0;
    let reverseType: 'entrada' | 'saida' | 'ajuste' = 'saida';
    let reverseQty = origMovement.quantity;
    let reverseDiff: number | undefined = undefined;

    if (origMovement.type === 'entrada') {
      reverseImpact = -origMovement.quantity;
      reverseType = 'saida';
      reverseQty = origMovement.quantity;
    } else if (origMovement.type === 'saida') {
      reverseImpact = origMovement.quantity;
      reverseType = 'entrada';
      reverseQty = origMovement.quantity;
    } else if (origMovement.type === 'ajuste') {
      const diff = origMovement.difference !== undefined ? origMovement.difference : 0;
      reverseImpact = -diff;
      reverseType = 'ajuste';
      reverseQty = Math.abs(diff);
      reverseDiff = -diff;
    }

    const restoredStock = round2(currentStock + reverseImpact);
    if (restoredStock < 0) {
      throw new Error(`Não é possível compensar esta movimentação porque o saldo de ${product.name} ficaria negativo (${restoredStock} ${product.unit}).`);
    }

    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const compensationMovement: StockMovement = {
      id: compOpId,
      operationId: compOpId,
      clientRequestId: clientRequestId || compOpId,
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      type: reverseType,
      quantity: reverseQty,
      difference: reverseDiff,
      previousStock: currentStock,
      physicalStock: reverseType === 'ajuste' ? restoredStock : undefined,
      date: today,
      time: nowTime,
      sector: 'Outros',
      notes: `[Compensação/Estorno do movimento ${movementId}]: ${reason || 'Estorno autorizado'}`.trim(),
      compensatesMovementId: movementId,
      movementRole: 'compensation',
      createdAt: now,
    };

    const updatedOrigMovement: StockMovement = {
      ...origMovement,
      isCompensated: true,
      compensatedByMovementId: compOpId,
    };

    const updatedProduct: Product = {
      ...product,
      currentStock: restoredStock,
      lastUpdated: now,
      lastOperationId: compOpId,
      updatedAt: serverTimestamp(),
    };

    tx.set(productRef, cleanForFirestore(updatedProduct), { merge: true });
    tx.set(compRef, cleanForFirestore(compensationMovement));
    tx.set(origRef, cleanForFirestore(updatedOrigMovement), { merge: true });

    return { updatedProduct, compensationMovement, originalMovement: updatedOrigMovement };
  });
}

export async function replaceStockMovementTransaction(
  movementId: string,
  updatedData: Partial<StockMovement> & { productId: string; quantity: number; type: 'entrada' | 'saida' },
  clientRequestId?: string
): Promise<{ updatedProducts: Product[]; compensationMovement: StockMovement; replacementMovement: StockMovement }> {
  // Proteção Cirúrgica do Marco Zero:
  if (movementId.startsWith('adj-marco-zero-20260821-') || movementId.startsWith('adj-20260821-')) {
    throw new Error('Operação bloqueada: As movimentações do Marco Zero de 21/08/2026 são imutáveis e não podem ser substituídas.');
  }
  const newQty = round2(Number(updatedData.quantity));
  if (!Number.isFinite(newQty) || newQty <= 0) throw new Error('Informe uma quantidade válida maior que zero.');

  const baseOpId = clientRequestId
    ? (clientRequestId.startsWith('repl-') ? clientRequestId : `repl-${clientRequestId}`)
    : `repl-${movementId}-${Date.now()}`;
  const compOpId = `comp-${baseOpId}`;
  const replOpId = `new-${baseOpId}`;

  return runTransaction(db, async (tx) => {
    const origRef = doc(db, MOVEMENTS_COLLECTION, movementId);
    const compRef = doc(db, MOVEMENTS_COLLECTION, compOpId);
    const replRef = doc(db, MOVEMENTS_COLLECTION, replOpId);

    const [origSnap, compSnap, replSnap] = await Promise.all([
      tx.get(origRef),
      tx.get(compRef),
      tx.get(replRef),
    ]);

    if (!origSnap.exists()) throw new Error('Movimentação original não encontrada.');
    const origMovement = origSnap.data() as StockMovement;

    if (compSnap.exists() && replSnap.exists()) {
      // Idempotência Atômica: substituição já processada anteriormente
      const existingComp = compSnap.data() as StockMovement;
      const existingRepl = replSnap.data() as StockMovement;
      const pRef = doc(db, PRODUCTS_COLLECTION, updatedData.productId);
      const pSnap = await tx.get(pRef);
      const p = pSnap.exists() ? (pSnap.data() as Product) : ({ id: updatedData.productId, currentStock: 0 } as Product);
      return { updatedProducts: [p], compensationMovement: existingComp, replacementMovement: existingRepl };
    }

    if (origMovement.isCompensated) {
      throw new Error(`Esta movimentação já foi compensada/substituída anteriormente pelo registro ${origMovement.compensatedByMovementId || ''}.`);
    }

    const oldProductRef = doc(db, PRODUCTS_COLLECTION, origMovement.productId);
    const newProductRef = doc(db, PRODUCTS_COLLECTION, updatedData.productId);
    const [oldProdSnap, newProdSnap] = await Promise.all([
      tx.get(oldProductRef),
      origMovement.productId === updatedData.productId ? Promise.resolve(null) : tx.get(newProductRef),
    ]);

    if (!oldProdSnap.exists()) throw new Error('Produto da movimentação original não encontrado.');
    const oldProduct = oldProdSnap.data() as Product;
    const newProduct = newProdSnap && newProdSnap.exists() ? (newProdSnap.data() as Product) : oldProduct;

    // Efeito reverso da original
    const oldImpact = origMovement.type === 'entrada' ? origMovement.quantity : -origMovement.quantity;
    const revertedOldStock = round2(oldProduct.currentStock - oldImpact);
    if (revertedOldStock < 0) {
      throw new Error('A substituição não pode ser aplicada porque o saldo atual não comporta a compensação da movimentação original.');
    }

    // Efeito da nova movimentação
    const newImpact = updatedData.type === 'entrada' ? newQty : -newQty;
    const finalNewStock = round2(
      updatedData.productId === origMovement.productId
        ? revertedOldStock + newImpact
        : newProduct.currentStock + newImpact
    );
    if (finalNewStock < 0) {
      throw new Error(`Estoque insuficiente em "${newProduct.name}" para esta substituição (saldo final seria ${finalNewStock} ${newProduct.unit}).`);
    }

    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // 1. Movimentação compensatória (-original)
    const compType = origMovement.type === 'entrada' ? 'saida' : 'entrada';
    const compensationMovement: StockMovement = {
      id: compOpId,
      operationId: compOpId,
      clientRequestId: compOpId,
      productId: oldProduct.id,
      productName: oldProduct.name,
      unit: oldProduct.unit,
      type: compType,
      quantity: origMovement.quantity,
      date: today,
      time: nowTime,
      sector: 'Outros',
      notes: `[Compensação automática para substituição pelo registro ${replOpId}]`,
      compensatesMovementId: movementId,
      movementRole: 'compensation',
      createdAt: now,
    };

    // 2. Nova movimentação (+substituta)
    const replacementMovement: StockMovement = {
      ...origMovement,
      ...updatedData,
      id: replOpId,
      operationId: replOpId,
      clientRequestId: clientRequestId || replOpId,
      productId: updatedData.productId,
      productName: newProduct.name,
      unit: newProduct.unit,
      quantity: newQty,
      type: updatedData.type,
      date: updatedData.date || today,
      time: updatedData.time || nowTime,
      notes: `[Substituição do movimento ${movementId}]: ${updatedData.notes || ''}`.trim(),
      replacementForMovementId: movementId,
      movementRole: 'replacement',
      createdAt: now,
    };

    // 3. Atualiza original para isCompensated = true
    const updatedOrigMovement: StockMovement = {
      ...origMovement,
      isCompensated: true,
      compensatedByMovementId: compOpId,
      replacementForMovementId: replOpId,
    };

    const updatedProductsList: Product[] = [];
    if (updatedData.productId === origMovement.productId) {
      const updatedProd: Product = {
        ...oldProduct,
        currentStock: finalNewStock,
        lastUpdated: now,
        lastOperationId: replOpId,
        updatedAt: serverTimestamp(),
      };
      tx.set(oldProductRef, cleanForFirestore(updatedProd), { merge: true });
      updatedProductsList.push(updatedProd);
    } else {
      const updatedOld: Product = {
        ...oldProduct,
        currentStock: revertedOldStock,
        lastUpdated: now,
        updatedAt: serverTimestamp(),
      };
      const updatedNew: Product = {
        ...newProduct,
        currentStock: finalNewStock,
        lastUpdated: now,
        lastOperationId: replOpId,
        updatedAt: serverTimestamp(),
      };
      tx.set(oldProductRef, cleanForFirestore(updatedOld), { merge: true });
      tx.set(newProductRef, cleanForFirestore(updatedNew), { merge: true });
      updatedProductsList.push(updatedOld, updatedNew);
    }

    tx.set(origRef, cleanForFirestore(updatedOrigMovement), { merge: true });
    tx.set(compRef, cleanForFirestore(compensationMovement));
    tx.set(replRef, cleanForFirestore(replacementMovement));

    return { updatedProducts: updatedProductsList, compensationMovement, replacementMovement };
  });
}

export async function updateStockMovementTransaction(
  movementId: string,
  updatedData: Partial<StockMovement> & { productId: string; quantity: number; type: 'entrada' | 'saida' },
  clientRequestId?: string
): Promise<{ updatedProducts: Product[]; movement: StockMovement; compensationMovement?: StockMovement }> {
  const result = await replaceStockMovementTransaction(movementId, updatedData, clientRequestId);
  return { updatedProducts: result.updatedProducts, movement: result.replacementMovement, compensationMovement: result.compensationMovement };
}

export async function deleteStockMovementTransaction(
  movementId: string,
  clientRequestId?: string
): Promise<{ updatedProduct: Product; deletedMovementId: string; compensationMovement: StockMovement }> {
  const result = await compensateStockMovementTransaction(
    movementId,
    'Estorno por solicitação de exclusão do registro',
    clientRequestId
  );
  return {
    updatedProduct: result.updatedProduct,
    deletedMovementId: movementId,
    compensationMovement: result.compensationMovement,
  };
}

export async function permanentDeleteStockMovementTransaction(
  movementId: string
): Promise<{ updatedProduct: Product; deletedMovementId: string }> {
  if (isMarcoZeroRecord(movementId)) {
    throw new Error('O Marco Zero Oficial é protegido contra exclusão física.');
  }

  return runTransaction(db, async (tx) => {
    const origRef = doc(db, MOVEMENTS_COLLECTION, movementId);
    const origSnap = await tx.get(origRef);
    if (!origSnap.exists()) {
      throw new Error('Movimentação não encontrada no Firestore.');
    }
    const origMovement = origSnap.data() as StockMovement;
    const productRef = doc(db, PRODUCTS_COLLECTION, origMovement.productId);
    const prodSnap = await tx.get(productRef);
    if (!prodSnap.exists()) {
      throw new Error('Produto associado não encontrado no Firestore.');
    }
    const product = prodSnap.data() as Product;
    const currentStock = round2(Number(product.currentStock || 0));

    // Reversão exata do impacto no estoque
    let reverseImpact = 0;
    if (origMovement.type === 'entrada') {
      reverseImpact = -origMovement.quantity;
    } else if (origMovement.type === 'saida') {
      reverseImpact = origMovement.quantity;
    } else if (origMovement.type === 'ajuste') {
      const diff = origMovement.difference !== undefined ? origMovement.difference : 0;
      reverseImpact = -diff;
    }

    const restoredStock = Math.max(0, round2(currentStock + reverseImpact));
    const now = new Date().toISOString();

    const updatedProduct: Product = {
      ...product,
      currentStock: restoredStock,
      lastUpdated: now,
      updatedAt: serverTimestamp(),
    };

    tx.set(productRef, cleanForFirestore(updatedProduct), { merge: true });
    tx.delete(origRef);

    return { updatedProduct, deletedMovementId: movementId };
  });
}

export async function purgeUnwantedSeptemberEntries(
  datesToPurge: string[] = ['2026-09-21', '2026-09-24', '2026-09-25']
): Promise<{ purgedCount: number; affectedProducts: string[] }> {
  try {
    const movsSnap = await getDocs(collection(db, MOVEMENTS_COLLECTION));
    const toPurge = movsSnap.docs.filter((d) => {
      const data = d.data() as StockMovement;
      return (
        data.type === 'entrada' &&
        datesToPurge.includes(data.date) &&
        !isMarcoZeroRecord(d.id)
      );
    });

    if (toPurge.length === 0) {
      return { purgedCount: 0, affectedProducts: [] };
    }

    const affectedNames = new Set<string>();
    for (const docSnap of toPurge) {
      try {
        const result = await permanentDeleteStockMovementTransaction(docSnap.id);
        affectedNames.add(result.updatedProduct.name);
      } catch (err) {
        console.warn(`Erro ao purgar movimentação indevida ${docSnap.id}:`, err);
      }
    }

    return {
      purgedCount: toPurge.length,
      affectedProducts: Array.from(affectedNames),
    };
  } catch (err) {
    console.warn('Falha na verificação de expurgo de entradas de setembro:', err);
    return { purgedCount: 0, affectedProducts: [] };
  }
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
    const movement: StockMovement = {
      id: opId,
      operationId: opId,
      clientRequestId: clientRequestId || opId,
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      department: product.department || (product.id.startsWith('dml-') ? 'dml' : 'alimentacao'),
      type: 'ajuste',
      quantity: Math.abs(difference),
      date: formattedDate,
      time: formattedTime,
      responsible: registeredBy || 'Administrador',
      reason: cleanedReason,
      previousStock: current,
      physicalStock: targetStock,
      difference,
      notes: `[Ajuste de Inventário / Marco Zero]: De ${current} ${product.unit} para ${targetStock} ${product.unit} (${difference > 0 ? '+' : ''}${difference} ${product.unit}). Motivo: ${cleanedReason}`,
      createdAt: now,
      userUid,
      userEmail,
    };
    const audit: InventoryAudit = { id: opId, productId: product.id, productName: product.name, unit: product.unit, previousStock: current, physicalStock: targetStock, difference, reason: cleanedReason, responsible: registeredBy || 'Administrador', date: formattedDate, time: formattedTime, createdAt: now, timestamp: serverTimestamp(), userUid, userEmail, notes: `Ajuste auditado: De ${current} para ${targetStock} ${product.unit}. Motivo: ${cleanedReason}` };
    const updatedProduct = { ...product, currentStock: targetStock, lastUpdated: now, lastOperationId: opId, updatedAt: serverTimestamp() } as Product;
    tx.set(productRef, cleanForFirestore(updatedProduct), { merge: true });
    tx.set(movementRef, cleanForFirestore(movement));
    tx.set(auditRef, cleanForFirestore(audit));
    return { updatedProduct, movement, audit };
  });
}

export async function saveInventorySessionToFirestore(
  sessionData: Omit<InventorySessionSummary, 'id' | 'createdAt'> & { id?: string }
): Promise<InventorySessionSummary> {
  const id = sessionData.id || operationId('inv-session');
  const now = new Date().toISOString();
  const session: InventorySessionSummary = { ...sessionData, id, createdAt: now };
  await setDoc(doc(db, INVENTORY_SESSIONS_COLLECTION, id), cleanForFirestore(session));
  return session;
}

// =============================================================================
// GESTÃO DA LISTA DE PRÉ-AUTORIZAÇÃO (/authorized_users)
// =============================================================================

export function subscribeToAuthorizedUsers(
  onData: (users: AuthorizedUser[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    collection(db, AUTHORIZED_USERS_COLLECTION),
    (snapshot) => {
      const list = snapshot.docs.map((d) => {
        const raw = d.data();
        return {
          email: d.id.toLowerCase().trim(),
          name: raw.name || d.id,
          role: 'viewer' as const,
          active: raw.active !== false,
          authorizedBy: raw.authorizedBy || 'estoquecristolandia@gmail.com',
          authorizedAt: raw.authorizedAt || new Date().toISOString(),
        } as AuthorizedUser;
      });
      onData(list);
    },
    (err) => {
      console.warn('subscribeToAuthorizedUsers error:', err);
      if (onError) onError(toError(err, 'Erro ao subscrever lista de autorizados'));
    }
  );
}

export async function checkUserAuthorization(email: string): Promise<AuthorizedUser | null> {
  const clean = email.toLowerCase().trim();
  if (!clean) return null;
  const snap = await getDoc(doc(db, AUTHORIZED_USERS_COLLECTION, clean));
  if (snap.exists()) {
    const raw = snap.data();
    return {
      email: clean,
      name: raw.name || clean,
      role: 'viewer',
      active: raw.active !== false,
      authorizedBy: raw.authorizedBy || 'estoquecristolandia@gmail.com',
      authorizedAt: raw.authorizedAt || new Date().toISOString(),
    };
  }
  return null;
}

export async function saveAuthorizedUserToFirestore(user: {
  email: string;
  name: string;
  active?: boolean;
  notes?: string;
}): Promise<void> {
  const cleanEmail = user.email.toLowerCase().trim();
  const payload: AuthorizedUser = {
    email: cleanEmail,
    name: user.name.trim(),
    role: 'viewer',
    active: user.active !== false,
    authorizedBy: 'estoquecristolandia@gmail.com',
    authorizedAt: new Date().toISOString(),
    ...(user.notes ? { notes: user.notes } : {}),
  };
  await setDoc(doc(db, AUTHORIZED_USERS_COLLECTION, cleanEmail), cleanForFirestore(payload), { merge: true });
}

export const INITIAL_OFFICIAL_VIEWERS = [
  {
    email: 'chefmarcusviniciuses@gmail.com',
    name: 'Chefe Marcus Vinicius',
    active: true,
    notes: 'Acesso oficial de consulta da Cozinha / Estoque',
  },
  {
    email: 'humbertohpp.59@gmail.com',
    name: 'Pastor Humberto - Acesso 1',
    active: true,
    notes: 'Acesso oficial de consulta da Coordenação / Pastoral',
  },
  {
    email: 'humberto.hpp59@gmail.com',
    name: 'Pastor Humberto - Acesso 2',
    active: true,
    notes: 'Acesso oficial alternativo de consulta',
  },
];

export async function bootstrapOfficialAuthorizedUsers(): Promise<{ created: number; total: number }> {
  let created = 0;
  for (const viewer of INITIAL_OFFICIAL_VIEWERS) {
    const existing = await checkUserAuthorization(viewer.email);
    if (!existing) {
      await saveAuthorizedUserToFirestore(viewer);
      created++;
    }
  }
  return { created, total: INITIAL_OFFICIAL_VIEWERS.length };
}

export async function toggleAuthorizedUserActiveInFirestore(email: string, active: boolean): Promise<void> {
  const cleanEmail = email.toLowerCase().trim();
  await setDoc(doc(db, AUTHORIZED_USERS_COLLECTION, cleanEmail), { active }, { merge: true });
}

export async function deleteAuthorizedUserFromFirestore(email: string): Promise<void> {
  const cleanEmail = email.toLowerCase().trim();
  await deleteDoc(doc(db, AUTHORIZED_USERS_COLLECTION, cleanEmail));
}

// =============================================================================
// GESTÃO DE MISSIONÁRIOS (/missionaries)
// =============================================================================

export function subscribeToMissionaries(
  onData: (missionaries: Missionary[]) => void,
  onError?: (error: Error) => void
) {
  return onSnapshot(
    collection(db, MISSIONARIES_COLLECTION),
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Missionary[];
      onData(list);
    },
    (err) => {
      console.warn('subscribeToMissionaries error:', err);
      if (onError) onError(toError(err, 'Erro ao subscrever missionários no Firestore'));
    }
  );
}

export async function saveMissionariesToFirestore(missionaries: Missionary[]): Promise<void> {
  const batch = writeBatch(db);
  missionaries.forEach((m) => {
    batch.set(doc(db, MISSIONARIES_COLLECTION, m.id), cleanForFirestore(m), { merge: true });
  });
  await batch.commit();
}

