import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User as FirebaseUser,
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export type UserRole = 'admin' | 'viewer' | 'cozinha' | 'coordenacao' | 'pendente';

export interface AppUserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export const MASTER_ADMIN_EMAIL = 'estoquecristolandia@gmail.com';

export function isMasterAdminEmail(email?: string | null): boolean {
  const clean = (email || '').trim().toLowerCase();
  return (
    clean === MASTER_ADMIN_EMAIL.toLowerCase() ||
    clean === 'admin@app.local' ||
    clean === 'marconi@app.local' ||
    clean === 'marconi.cristolandia@gmail.com' ||
    clean.startsWith('admin@') ||
    clean.startsWith('marconi@')
  );
}

export function resolveUserRole(email?: string | null): UserRole {
  return isMasterAdminEmail(email) ? 'admin' : 'viewer';
}

export const ROLE_LABELS: Record<string, { title: string; badge: string; color: string }> = {
  admin: {
    title: 'Administrador (Gestão Total)',
    badge: '👑 Administrador',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-400',
  },
  viewer: {
    title: 'Visualização (Somente Leitura)',
    badge: '👁️ Visualizador',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-400',
  },
  cozinha: {
    title: 'Visualização (Somente Leitura)',
    badge: '👁️ Visualizador',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-400',
  },
  coordenacao: {
    title: 'Visualização (Somente Leitura)',
    badge: '👁️ Visualizador',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-400',
  },
  pendente: {
    title: 'Visualização (Somente Leitura)',
    badge: '👁️ Visualizador',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-400',
  },
};

export async function getUserProfile(uid: string): Promise<AppUserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const data = snap.data() as AppUserProfile;
      const computedRole = resolveUserRole(data.email);
      return { ...data, role: computedRole };
    }
    return null;
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return null;
  }
}

export async function createUserProfile(user: FirebaseUser, _requestedRole?: UserRole, customName?: string): Promise<AppUserProfile> {
  const role: UserRole = resolveUserRole(user.email);
  const profile: AppUserProfile = {
    uid: user.uid,
    email: user.email || 'Acesso Sem E-mail',
    displayName: customName || user.displayName || user.email?.split('@')[0] || 'Usuário Cristolândia',
    role,
    createdAt: new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, 'users', user.uid), profile, { merge: true });
  } catch (err) {
    console.warn('Could not write user profile to firestore:', err);
  }
  return profile;
}

export async function loginWithGoogle(): Promise<AppUserProfile> {
  const result = await signInWithPopup(auth, googleProvider);
  let profile = await getUserProfile(result.user.uid);
  if (!profile) {
    profile = await createUserProfile(result.user);
  }
  const effectiveRole = resolveUserRole(result.user.email);
  return { ...profile, role: effectiveRole };
}

export async function loginWithCredentials(usernameOrEmail: string, password: string): Promise<AppUserProfile> {
  const raw = usernameOrEmail.trim().toLowerCase();
  const email = raw.includes('@') ? raw : `${raw.replace(/[^a-z0-9._-]/g, '')}@app.local`;
  const result = await signInWithEmailAndPassword(auth, email, password);
  let profile = await getUserProfile(result.user.uid);
  if (!profile) {
    profile = await createUserProfile(result.user);
  }
  const effectiveRole = resolveUserRole(result.user.email);
  return { ...profile, role: effectiveRole };
}

export async function registerWithCredentials(username: string, password: string, displayName?: string): Promise<AppUserProfile> {
  const cleaned = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  if (!cleaned) throw new Error('Informe um nome de usuário válido.');
  const email = cleaned.includes('@') ? cleaned : `${cleaned}@app.local`;
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return createUserProfile(result.user, undefined, displayName || username);
}

export async function logoutUser() {
  await firebaseSignOut(auth);
}
