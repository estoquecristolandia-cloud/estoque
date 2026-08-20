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
import { UserRole, UserProfile } from './types';

export type { UserRole };
export type AppUserProfile = UserProfile;

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with specific database ID if present
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Default role assignments for initial setup and display
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
  pendente: {
    title: 'Pendente de Autorização',
    badge: '⏳ Aguardando Aprovação',
    color: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-400',
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

// Create or update user profile with strict role assignment:
// Only the master founder account receives 'admin' automatically. All new users default strictly to 'pendente'.
export async function createUserProfile(
  user: FirebaseUser, 
  role?: UserRole,
  customName?: string
): Promise<AppUserProfile> {
  const isMasterAdmin = user.email === 'estoquecristolandia@gmail.com';
  const assignedRole: UserRole = isMasterAdmin ? 'admin' : (role || 'pendente');

  const profile: AppUserProfile = {
    uid: user.uid,
    email: user.email || 'Acesso Sem E-mail',
    displayName: customName || user.displayName || user.email?.split('@')[0] || 'Usuário Cristolândia',
    role: assignedRole,
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
    const isMasterAdmin = result.user.email === 'estoquecristolandia@gmail.com';
    const defaultRole: UserRole = isMasterAdmin ? 'admin' : 'pendente';
    profile = await createUserProfile(result.user, defaultRole);
  }
  return profile;
}

export async function logoutUser() {
  await firebaseSignOut(auth);
}

