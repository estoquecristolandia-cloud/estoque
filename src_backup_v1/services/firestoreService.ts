import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  writeBatch,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, AppUserProfile, UserRole } from '../firebase';
import { Product, StockMovement, DailyKit } from '../types';
import { INITIAL_PRODUCTS, INITIAL_MOVEMENTS, DEFAULT_DAILY_KIT } from '../data/initialData';

const PRODUCTS_COLLECTION = 'products';
const MOVEMENTS_COLLECTION = 'movements';
const KITS_COLLECTION = 'kits';
const USERS_COLLECTION = 'users';

// Subscriptions
export function subscribeToProducts(onData: (products: Product[]) => void) {
  const colRef = collection(db, PRODUCTS_COLLECTION);
  return onSnapshot(colRef, (snapshot) => {
    const list: Product[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Product);
    });
    // Sort by name
    list.sort((a, b) => a.name.localeCompare(b.name));
    onData(list);
  }, (err) => {
    console.error('Error listening to products:', err);
  });
}

export function subscribeToMovements(onData: (movements: StockMovement[]) => void) {
  const colRef = collection(db, MOVEMENTS_COLLECTION);
  // Get recent movements
  const q = query(colRef, orderBy('createdAt', 'desc'), limit(150));
  return onSnapshot(q, (snapshot) => {
    const list: StockMovement[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as StockMovement);
    });
    onData(list);
  }, (err) => {
    console.error('Error listening to movements:', err);
  });
}

export function subscribeToDailyKit(onData: (kit: DailyKit) => void) {
  const docRef = doc(db, KITS_COLLECTION, 'daily_kitchen_kit');
  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      onData(snapshot.data() as DailyKit);
    } else {
      onData(DEFAULT_DAILY_KIT);
    }
  }, (err) => {
    console.error('Error listening to daily kit:', err);
  });
}

export function subscribeToUsers(onData: (users: AppUserProfile[]) => void) {
  const colRef = collection(db, USERS_COLLECTION);
  return onSnapshot(colRef, (snapshot) => {
    const list: AppUserProfile[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as AppUserProfile);
    });
    onData(list);
  }, (err) => {
    console.error('Error listening to users:', err);
  });
}

// Write Operations
export async function saveProductToFirestore(product: Product) {
  const docRef = doc(db, PRODUCTS_COLLECTION, product.id);
  await setDoc(docRef, product, { merge: true });
}

export async function deleteProductFromFirestore(productId: string) {
  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  await deleteDoc(docRef);
}

export async function saveMovementToFirestore(movement: StockMovement) {
  const docRef = doc(db, MOVEMENTS_COLLECTION, movement.id);
  await setDoc(docRef, movement);
}

export async function saveDailyKitToFirestore(kit: DailyKit) {
  const docRef = doc(db, KITS_COLLECTION, 'daily_kitchen_kit');
  await setDoc(docRef, kit, { merge: true });
}

export async function updateUserRoleInFirestore(uid: string, role: UserRole) {
  const docRef = doc(db, USERS_COLLECTION, uid);
  await setDoc(docRef, { role }, { merge: true });
}

// Batch Sync / Save Multiple Products & Movements
export async function saveProductsAndMovementsInFirestore(
  products: Product[],
  movements: StockMovement[]
) {
  const batch = writeBatch(db);

  products.forEach((p) => {
    const pRef = doc(db, PRODUCTS_COLLECTION, p.id);
    batch.set(pRef, p, { merge: true });
  });

  movements.slice(0, 10).forEach((m) => {
    const mRef = doc(db, MOVEMENTS_COLLECTION, m.id);
    batch.set(mRef, m, { merge: true });
  });

  await batch.commit();
}

// Initial Seeding & Pruning to ensure only official list exists
export async function seedInitialFirestoreDataIfEmpty() {
  try {
    const productsSnap = await getDocs(collection(db, PRODUCTS_COLLECTION));
    const validIds = new Set(INITIAL_PRODUCTS.map((p) => p.id));
    const batch = writeBatch(db);

    // Prune old products in Firestore that are not in the official list
    productsSnap.forEach((docSnap) => {
      if (!validIds.has(docSnap.id)) {
        batch.delete(doc(db, PRODUCTS_COLLECTION, docSnap.id));
      }
    });

    // Ensure all 14 official products are present & updated
    INITIAL_PRODUCTS.forEach((p) => {
      const ref = doc(db, PRODUCTS_COLLECTION, p.id);
      batch.set(ref, p, { merge: true });
    });

    // Sync movements: keep only official initial movements (clean start)
    const movsSnap = await getDocs(collection(db, MOVEMENTS_COLLECTION));
    const validMovIds = new Set(INITIAL_MOVEMENTS.map((m) => m.id));
    movsSnap.forEach((docSnap) => {
      if (!validMovIds.has(docSnap.id)) {
        batch.delete(doc(db, MOVEMENTS_COLLECTION, docSnap.id));
      }
    });

    INITIAL_MOVEMENTS.forEach((m) => {
      const ref = doc(db, MOVEMENTS_COLLECTION, m.id);
      batch.set(ref, m, { merge: true });
    });

    const kitRef = doc(db, KITS_COLLECTION, 'daily_kitchen_kit');
    batch.set(kitRef, DEFAULT_DAILY_KIT, { merge: true });

    await batch.commit();
    console.log('Official products synced to Firestore successfully!');
  } catch (err) {
    console.error('Error syncing Firestore data:', err);
  }
}
