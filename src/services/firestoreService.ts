import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  writeBatch
} from 'firebase/firestore';
import { db, AppUserProfile, UserRole } from '../firebase';
import { Product, StockMovement, DailyKit, DailyMealRecord } from '../types';
import { INITIAL_PRODUCTS, INITIAL_MOVEMENTS, DEFAULT_DAILY_KIT, INITIAL_MEAL_RECORDS } from '../data/initialData';

const PRODUCTS_COLLECTION = 'products';
const MOVEMENTS_COLLECTION = 'movements';
const KITS_COLLECTION = 'kits';
const USERS_COLLECTION = 'users';
const MEALS_COLLECTION = 'meals';

// Utility to remove undefined keys so Firestore doesn't throw unsupported field errors
function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
}

// Subscriptions
export function subscribeToProducts(onData: (products: Product[]) => void) {
  const colRef = collection(db, PRODUCTS_COLLECTION);
  return onSnapshot(colRef, (snapshot) => {
    const list: Product[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Product);
    });
    // Sort by name
    list.sort((a, b) => a.name.localeCompare(b.name));
    onData(list);
  }, (err) => {
    console.error('Error listening to products in Firestore:', err);
  });
}

export function subscribeToMovements(onData: (movements: StockMovement[]) => void) {
  const colRef = collection(db, MOVEMENTS_COLLECTION);
  return onSnapshot(colRef, (snapshot) => {
    const list: StockMovement[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as StockMovement);
    });
    // Safe in-memory sort by date + time descending (prevents Firestore query index dropped docs)
    list.sort((a, b) => {
      const dateComp = (b.date || '').localeCompare(a.date || '');
      if (dateComp !== 0) return dateComp;
      const timeComp = (b.time || '').localeCompare(a.time || '');
      if (timeComp !== 0) return timeComp;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    onData(list);
  }, (err) => {
    console.error('Error listening to movements in Firestore:', err);
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
    console.error('Error listening to daily kit in Firestore:', err);
  });
}

export function subscribeToUsers(onData: (users: AppUserProfile[]) => void) {
  const colRef = collection(db, USERS_COLLECTION);
  return onSnapshot(colRef, (snapshot) => {
    const list: AppUserProfile[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as AppUserProfile);
    });
    onData(list);
  }, (err) => {
    console.error('Error listening to users in Firestore:', err);
  });
}

export function subscribeToMeals(onData: (meals: DailyMealRecord[]) => void) {
  const colRef = collection(db, MEALS_COLLECTION);
  return onSnapshot(colRef, (snapshot) => {
    const list: DailyMealRecord[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as DailyMealRecord;
      // Only include records starting from 14/08 onwards
      if (data && data.date && data.date >= '2026-08-14') {
        list.push(data);
      }
    });
    // Sort descending by date
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    onData(list);
  }, (err) => {
    console.error('Error listening to meals in Firestore:', err);
  });
}

// Write Operations
export async function saveProductToFirestore(product: Product) {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, product.id);
    await setDoc(docRef, cleanForFirestore(product), { merge: true });
  } catch (err) {
    console.error('Error saving product to Firestore:', err);
  }
}

export async function deleteProductFromFirestore(productId: string) {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, productId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting product from Firestore:', err);
  }
}

export async function saveMovementToFirestore(movement: StockMovement) {
  try {
    const docRef = doc(db, MOVEMENTS_COLLECTION, movement.id);
    await setDoc(docRef, cleanForFirestore(movement), { merge: true });
  } catch (err) {
    console.error('Error saving movement to Firestore:', err);
  }
}

export async function saveDailyKitToFirestore(kit: DailyKit) {
  try {
    const docRef = doc(db, KITS_COLLECTION, 'daily_kitchen_kit');
    await setDoc(docRef, cleanForFirestore(kit), { merge: true });
  } catch (err) {
    console.error('Error saving daily kit to Firestore:', err);
  }
}

export async function saveMealRecordToFirestore(record: DailyMealRecord) {
  try {
    const docRef = doc(db, MEALS_COLLECTION, record.id);
    await setDoc(docRef, cleanForFirestore(record), { merge: true });
  } catch (err) {
    console.error('Error saving meal record to Firestore:', err);
  }
}

export async function deleteMealRecordFromFirestore(mealId: string) {
  try {
    const docRef = doc(db, MEALS_COLLECTION, mealId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting meal record from Firestore:', err);
  }
}

export async function updateUserRoleInFirestore(uid: string, role: UserRole) {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    await setDoc(docRef, { role }, { merge: true });
  } catch (err) {
    console.error('Error updating user role in Firestore:', err);
  }
}

// Batch Sync / Save Multiple Products & Movements
export async function saveProductsAndMovementsInFirestore(
  products: Product[],
  movements: StockMovement[]
) {
  try {
    const batch = writeBatch(db);

    products.forEach((p) => {
      const pRef = doc(db, PRODUCTS_COLLECTION, p.id);
      batch.set(pRef, cleanForFirestore(p), { merge: true });
    });

    // Save recent movements
    movements.slice(0, 100).forEach((m) => {
      const mRef = doc(db, MOVEMENTS_COLLECTION, m.id);
      batch.set(mRef, cleanForFirestore(m), { merge: true });
    });

    await batch.commit();
  } catch (err) {
    console.error('Error in saveProductsAndMovementsInFirestore:', err);
  }
}

// Synchronize all official products & initial movements into Firestore
export async function syncInitialFirestoreData() {
  try {
    const batch = writeBatch(db);
    let writesCount = 0;

    // 1. Check existing products in Firestore
    const productsSnap = await getDocs(collection(db, PRODUCTS_COLLECTION));
    const existingProductIds = new Set<string>();
    productsSnap.forEach((docSnap) => {
      existingProductIds.add(docSnap.id);
    });

    // 2. Check existing movements in Firestore
    const movsSnap = await getDocs(collection(db, MOVEMENTS_COLLECTION));
    const existingMovIds = new Set<string>();
    movsSnap.forEach((docSnap) => {
      existingMovIds.add(docSnap.id);
    });

    // 3. Check existing meals in Firestore
    const mealsSnap = await getDocs(collection(db, MEALS_COLLECTION));
    const existingMealIds = new Set<string>();
    mealsSnap.forEach((docSnap) => {
      const data = docSnap.data() as DailyMealRecord;
      if (data && data.date && data.date < '2026-08-14') {
        // Only prune dummy records strictly prior to 14/08
        batch.delete(docSnap.ref);
        writesCount++;
      } else {
        existingMealIds.add(docSnap.id);
      }
    });

    // 1. Sync official products with Firestore so current stock reflects the audited reality
    INITIAL_PRODUCTS.forEach((p) => {
      const ref = doc(db, PRODUCTS_COLLECTION, p.id);
      batch.set(ref, cleanForFirestore(p), { merge: true });
      writesCount++;
    });

    // 2. Seed initial baseline movements if missing
    INITIAL_MOVEMENTS.forEach((m) => {
      if (!existingMovIds.has(m.id)) {
        const ref = doc(db, MOVEMENTS_COLLECTION, m.id);
        batch.set(ref, cleanForFirestore(m));
        writesCount++;
      }
    });

    // 3. Ensure baseline meal record from 14/08 is in Firestore if missing
    INITIAL_MEAL_RECORDS.forEach((meal) => {
      if (!existingMealIds.has(meal.id)) {
        const ref = doc(db, MEALS_COLLECTION, meal.id);
        batch.set(ref, cleanForFirestore(meal));
        writesCount++;
      }
    });

    // Daily kit
    const kitRef = doc(db, KITS_COLLECTION, 'daily_kitchen_kit');
    batch.set(kitRef, cleanForFirestore(DEFAULT_DAILY_KIT), { merge: true });
    writesCount++;

    if (writesCount > 0) {
      await batch.commit();
      console.log(`Synced ${writesCount} missing items/movements to Firestore.`);
    }
  } catch (err) {
    console.error('Error syncing initial Firestore data:', err);
  }
}

