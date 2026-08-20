import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with specific database ID if present
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export type UserRole = 'admin' | 'cozinha' | 'coordenacao';

export interface AppUserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

// Default role assignments for initial setup
export const ROLE_LABELS: Record<UserRole, { title: string; badge: string; color: string }> = {
  admin: {
    title: 'Administrador (Compras & Estoque)',
    badge: '👑 Admin Compras',
    color: 'bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-950/40 dark:text-red-400',
  },
  cozinha: {
    title: 'Chefe de Cozinha',
    badge: '🍳 Chefe Cozinha',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-400',
  },
  coordenacao: {
    title: 'Coordenação (Visualizador)',
    badge: '📊 Coordenação',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-400',
  },
};

// Fetch user profile from Firestore
export async function getUserProfile(uid: string): Promise<AppUserProfile | null> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as AppUserProfile;
    }
    return null;
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return null;
  }
}

// Create or update user profile
export async function createUserProfile(
  user: FirebaseUser, 
  role: UserRole = 'admin',
  customName?: string
): Promise<AppUserProfile> {
  const profile: AppUserProfile = {
    uid: user.uid,
    email: user.email || 'Acesso Sem E-mail',
    displayName: customName || user.displayName || user.email?.split('@')[0] || 'Usuário Cristolândia',
    role,
    createdAt: new Date().toISOString(),
  };

  const userDocRef = doc(db, 'users', user.uid);
  await setDoc(userDocRef, profile, { merge: true });
  return profile;
}

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  let profile = await getUserProfile(result.user.uid);
  if (!profile) {
    profile = await createUserProfile(result.user, 'admin');
  }
  return profile;
}

export async function logoutUser() {
  await firebaseSignOut(auth);
}
