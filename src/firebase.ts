import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export type UserRole = 'admin' | 'cozinha' | 'coordenacao' | 'pendente';

export interface AppUserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export const MASTER_ADMIN_EMAIL = 'estoquecristolandia@gmail.com';

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
    title: 'Acesso Pendente',
    badge: '⏳ Pendente',
    color: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:bg-slate-800/60 dark:text-slate-300',
  },
};

export function isMasterAdminEmail(email?: string | null): boolean {
  return (email || '').trim().toLowerCase() === MASTER_ADMIN_EMAIL;
}

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

/**
 * Creates a profile with the least privilege by default.
 * The requested role is intentionally ignored for non-master users.
 * Role promotion must be performed by an administrator through Firestore rules.
 */
export async function createUserProfile(
  user: FirebaseUser,
  _requestedRole: UserRole = 'pendente',
  customName?: string
): Promise<AppUserProfile> {
  const role: UserRole = isMasterAdminEmail(user.email) ? 'admin' : 'pendente';

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
    profile = await createUserProfile(result.user, 'pendente');
  }
  return profile;
}

export async function logoutUser() {
  await firebaseSignOut(auth);
}
