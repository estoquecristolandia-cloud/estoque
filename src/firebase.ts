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
  admin: { title: 'Administrador (Compras & Estoque)', badge: '👑 Admin Compras', color: 'bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-950/40 dark:text-red-400' },
  cozinha: { title: 'Chefe de Cozinha', badge: '🍳 Chefe Cozinha', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-400' },
  coordenacao: { title: 'Coordenação (Visualizador)', badge: '📊 Coordenação', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-400' },
  pendente: { title: 'Aguardando aprovação', badge: '⏳ Aguardando aprovação', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:bg-slate-950/40 dark:text-slate-400' },
};

export async function getUserProfile(uid: string): Promise<AppUserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as AppUserProfile) : null;
  } catch (err) {
    console.error('Error fetching user profile:', err);
    return null;
  }
}

export async function createUserProfile(user: FirebaseUser, _requestedRole: UserRole = 'pendente', customName?: string): Promise<AppUserProfile> {
  const isMaster = user.email?.toLowerCase() === MASTER_ADMIN_EMAIL;
  const profile: AppUserProfile = {
    uid: user.uid,
    email: user.email || 'Acesso Sem E-mail',
    displayName: customName || user.displayName || user.email?.split('@')[0] || 'Usuário Cristolândia',
    role: isMaster ? 'admin' : 'pendente',
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'users', user.uid), profile, { merge: true });
  return profile;
}

export async function loginWithGoogle(): Promise<AppUserProfile> {
  const result = await signInWithPopup(auth, googleProvider);
  let profile = await getUserProfile(result.user.uid);
  if (!profile) profile = await createUserProfile(result.user, 'pendente');
  if (result.user.email?.toLowerCase() === MASTER_ADMIN_EMAIL && profile.role !== 'admin') {
    await setDoc(doc(db, 'users', result.user.uid), { role: 'admin' }, { merge: true });
    profile = { ...profile, role: 'admin' };
  }
  return profile;
}

export async function loginWithCredentials(usernameOrEmail: string, password: string): Promise<AppUserProfile> {
  const raw = usernameOrEmail.trim().toLowerCase();
  const email = raw.includes('@') ? raw : `${raw.replace(/[^a-z0-9._-]/g, '')}@app.local`;
  const result = await signInWithEmailAndPassword(auth, email, password);
  let profile = await getUserProfile(result.user.uid);
  if (!profile) profile = await createUserProfile(result.user, 'pendente');
  return profile;
}

export async function registerWithCredentials(username: string, password: string, displayName?: string): Promise<AppUserProfile> {
  const cleaned = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  if (!cleaned) throw new Error('Informe um nome de usuário válido.');
  const email = cleaned.includes('@') ? cleaned : `${cleaned}@app.local`;
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return createUserProfile(result.user, 'pendente', displayName || username);
}

export async function logoutUser() {
  await firebaseSignOut(auth);
}
