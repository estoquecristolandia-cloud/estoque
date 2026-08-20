import React, { useState } from 'react';
import { X, User, Shield, LogOut, Mail, Lock, Clock } from 'lucide-react';
import { loginWithGoogle, logoutUser, registerWithCredentials, loginWithCredentials, AppUserProfile, UserRole, ROLE_LABELS } from '../firebase';
import { updateUserRoleInFirestore } from '../services/firestoreService';

interface AuthModalProps { isOpen: boolean; onClose: () => void; currentUser: AppUserProfile | null; allUsers: AppUserProfile[]; onSelectRole: (role: UserRole) => void; onRefreshProfile: () => void; }

export const AuthModal = ({ isOpen, onClose, currentUser, allUsers, onRefreshProfile }: AuthModalProps) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'login'>('profile');
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  if (!isOpen) return null;

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMsg(''); setIsLoading(true);
    try { if (isRegistering) await registerWithCredentials(usernameInput, password, displayNameInput.trim()); else await loginWithCredentials(usernameInput, password); onRefreshProfile(); onClose(); }
    catch (err: any) { setErrorMsg(err.code === 'auth/email-already-in-use' ? 'Este usuário já está cadastrado.' : err.code === 'auth/invalid-credential' ? 'Usuário ou senha incorretos.' : err.message || 'Não foi possível concluir a autenticação.'); }
    finally { setIsLoading(false); }
  };
  const handleGoogle = async () => {
    setErrorMsg(''); setIsLoading(true);
    try { await loginWithGoogle(); onRefreshProfile(); onClose(); }
    catch (err: any) { setErrorMsg(err.message || 'Não foi possível entrar com Google.'); }
    finally { setIsLoading(false); }
  };
  const handleRoleChange = async (uid: string, newRole: UserRole) => { try { await updateUserRoleInFirestore(uid, newRole); onRefreshProfile(); } catch (err: any) { setErrorMsg(err.message || 'Não foi possível atualizar o perfil.'); } };
  const handleLogout = async () => { await logoutUser(); onClose(); };
  const meta = ROLE_LABELS[currentUser?.role || 'pendente'];

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800"><div className="flex items-center gap-3"><div className="p-3 rounded-2xl bg-blue-600 text-white"><Shield className="w-5 h-5" /></div><div><h3 className="text-base font-black">Acesso e permissões</h3><p className="text-[11px] text-slate-500">Autenticação segura do Estoque Cristolândia</p></div></div><button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button></div>
      <div className="flex border-b border-slate-200 dark:border-slate-800"><button onClick={() => setActiveTab('profile')} className={`flex-1 py-3 text-xs font-bold ${activeTab === 'profile' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>Meu perfil</button>{currentUser?.role === 'admin' && <button onClick={() => setActiveTab('users')} className={`flex-1 py-3 text-xs font-bold ${activeTab === 'users' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>Usuários</button>}<button onClick={() => setActiveTab('login')} className={`flex-1 py-3 text-xs font-bold ${activeTab === 'login' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>Entrar</button></div>
      <div className="p-5 space-y-4">{errorMsg && <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600">{errorMsg}</div>}
        {activeTab === 'profile' && currentUser && <div className="space-y-4"><div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60"><p className="font-black">{currentUser.displayName}</p><p className="text-xs text-slate-500 mt-1">{currentUser.email}</p><span className={`inline-flex items-center gap-1 mt-3 px-3 py-1 rounded-full border text-[10px] font-black ${meta.color}`}>{meta.badge}</span></div>{currentUser.role === 'pendente' && <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex gap-2"><Clock className="w-4 h-4 shrink-0" />Sua conta foi criada, mas precisa ser aprovada pelo administrador antes do acesso operacional.</div>}<button onClick={handleLogout} className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2"><LogOut className="w-4 h-4" /> Sair da conta</button></div>}
        {activeTab === 'users' && currentUser?.role === 'admin' && <div className="space-y-3"><p className="text-xs text-slate-500">Somente o administrador pode aprovar ou alterar permissões.</p><div className="space-y-2 max-h-72 overflow-y-auto">{allUsers.map((u) => <div key={u.uid} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-bold text-xs truncate">{u.displayName}</p><p className="text-[10px] text-slate-400 truncate">{u.email}</p></div><select value={u.role} onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)} className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2 py-1.5 text-[11px] font-bold"><option value="pendente">Pendente</option><option value="cozinha">Chefe Cozinha</option><option value="coordenacao">Coordenação</option><option value="admin">Admin</option></select></div>)}{allUsers.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Nenhum usuário registrado.</p>}</div></div>}
        {activeTab === 'login' && <div className="space-y-4"><button onClick={handleGoogle} disabled={isLoading} className="w-full py-3 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-2"><span className="text-base font-black text-blue-600">G</span> Entrar com Google</button><div className="text-center text-[10px] text-slate-400">ou use usuário e senha do Firebase</div><form onSubmit={handleCredentials} className="space-y-3">{isRegistering && <div><label className="text-[11px] font-bold text-slate-500">Nome</label><input value={displayNameInput} onChange={(e) => setDisplayNameInput(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl border bg-transparent text-sm" placeholder="Seu nome" /></div>}<div><label className="text-[11px] font-bold text-slate-500">Usuário ou e-mail</label><div className="relative mt-1"><Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" /><input value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-xl border bg-transparent text-sm" required /></div></div><div><label className="text-[11px] font-bold text-slate-500">Senha</label><div className="relative mt-1"><Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-9 pr-3 py-2.5 rounded-xl border bg-transparent text-sm" required /></div></div><button disabled={isLoading} className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-xs">{isLoading ? 'Aguarde...' : isRegistering ? 'Criar conta (pendente)' : 'Entrar'}</button></form><button onClick={() => setIsRegistering((v) => !v)} className="w-full text-[11px] font-bold text-blue-600">{isRegistering ? 'Já tenho uma conta' : 'Criar uma nova conta'}</button></div>}
      </div>
      <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 flex items-center gap-2"><User className="w-3.5 h-3.5" /> Nenhum usuário pode escolher ou promover o próprio perfil.</div>
    </div>
  </div>;
};
