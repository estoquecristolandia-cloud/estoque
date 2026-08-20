import React, { useState } from 'react';
import { X, User, Shield, Users, LogOut, Check, Sparkles, Key, Mail, Lock } from 'lucide-react';
import { 
  auth, 
  loginWithGoogle, 
  logoutUser, 
  createUserProfile,
  AppUserProfile, 
  UserRole, 
  ROLE_LABELS 
} from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { updateUserRoleInFirestore } from '../services/firestoreService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUserProfile | null;
  allUsers: AppUserProfile[];
  onSelectRole: (role: UserRole) => void;
  onRefreshProfile: () => void;
}

export const AuthModal = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  onSelectRole,
  onRefreshProfile,
}: AuthModalProps) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'login'>('profile');
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [selectedRoleForNewUser, setSelectedRoleForNewUser] = useState<UserRole>('cozinha');
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  // Converts username to synthetic email for Firebase Auth internally
  const formatEmailFromUsername = (usr: string) => {
    const cleaned = usr.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (cleaned.includes('@')) return cleaned;
    return `${cleaned || 'usuario'}@app.local`;
  };

  const handleUsernameAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const emailToUse = formatEmailFromUsername(usernameInput);

    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, emailToUse, password);
        await createUserProfile(
          userCredential.user, 
          selectedRoleForNewUser, 
          displayNameInput.trim() || usernameInput.trim()
        );
      } else {
        await signInWithEmailAndPassword(auth, emailToUse, password);
      }
      onRefreshProfile();
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setErrorMsg('Usuário ou senha incorretos. Verifique e tente novamente.');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('Este nome de usuário já está cadastrado. Tente outro ou faça login.');
      } else if (err.code === 'auth/weak-password') {
        setErrorMsg('A senha deve ter no mínimo 6 caracteres.');
      } else {
        setErrorMsg(err.message || 'Erro ao realizar autenticação');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      await loginWithGoogle();
      onRefreshProfile();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao entrar com Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    try {
      await updateUserRoleInFirestore(uid, newRole);
    } catch (err) {
      console.error('Error changing user role:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Perfil e Controle de Acessos</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gerencie quem pode alterar compras, cadastros e saídas de estoque
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/40 p-1.5 gap-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Meu Perfil
          </button>
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Autenticação Online
          </button>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Usuários da Equipe ({allUsers.length})
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">
          {/* TAB 1: PROFILE & ROLE SWITCHER */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Usuário Conectado</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                    {currentUser?.displayName || 'Usuário Atual'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {currentUser?.email && !currentUser.email.endsWith('@app.local') && !currentUser.email.endsWith('@cristolandia.org')
                      ? currentUser.email
                      : 'Acesso por Nome de Usuário / Senha'}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${ROLE_LABELS[currentUser?.role || 'admin'].color}`}>
                  {ROLE_LABELS[currentUser?.role || 'admin'].badge}
                </span>
              </div>

              {/* Quick Role Selector for Easy Local/Realtime Switch (Admin only) */}
              {currentUser?.role === 'admin' ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                    Alternar Nível de Permissão (1 Clique):
                  </p>

                  <div className="space-y-2">
                    {(['admin', 'cozinha', 'coordenacao'] as UserRole[]).map((r) => {
                      const isSelected = currentUser?.role === r;
                      const meta = ROLE_LABELS[r];
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => onSelectRole(r)}
                          className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20'
                              : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{meta.title}</span>
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {r === 'admin' && 'Acesso total: cadastros, compras, entradas, saídas e configurações.'}
                              {r === 'cozinha' && 'Acesso focado na cozinha: lançamento do kit diário e saídas de mantimentos.'}
                              {r === 'coordenacao' && 'Acesso de consulta: relatórios, dashboards e auditoria.'}
                            </p>
                          </div>
                          {isSelected && <Check className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Seu perfil é <strong>Somente Visualização</strong>. Apenas o Administrador Marconi Castro tem permissão para alterar permissões e fazer edições.</span>
                  </p>
                </div>
              )}

              {auth.currentUser && (
                <button
                  onClick={() => logoutUser()}
                  className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-bold text-xs hover:bg-red-100 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair da Conta Firebase</span>
                </button>
              )}
            </div>
          )}

          {/* TAB 2: ONLINE LOGIN / FIREBASE */}
          {activeTab === 'login' && (
            <div className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-600 dark:text-red-300 text-xs rounded-xl font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleUsernameAuth} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Nome de Usuário
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder="ex: cozinha, marcos, admin"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Não precisa de e-mail! Apenas escolha um login simples.
                  </p>
                </div>

                {isRegistering && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Nome do Responsável / Descrição
                      </label>
                      <input
                        type="text"
                        value={displayNameInput}
                        onChange={(e) => setDisplayNameInput(e.target.value)}
                        placeholder="ex: Marconi Castro - Gestor do Estoque"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Perfil de Acesso
                      </label>
                      <select
                        value={selectedRoleForNewUser}
                        onChange={(e) => setSelectedRoleForNewUser(e.target.value as UserRole)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                      >
                        <option value="cozinha">Chefe de Cozinha (Visualiza estoque & realiza saídas/kits)</option>
                        <option value="admin">Administrador (Acesso total + cadastros e compras)</option>
                        <option value="coordenacao">Coordenação (Apenas consulta e relatórios)</option>
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Senha</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                >
                  {isLoading ? 'Carregando...' : isRegistering ? 'Criar Usuário da Cristolândia' : 'Entrar com Usuário e Senha'}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                  >
                    {isRegistering ? 'Já possui um usuário? Fazer Login' : 'Cadastrar novo usuário para a equipe'}
                  </button>
                </div>
              </form>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase">ou opcionalmente</span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 text-slate-800 dark:text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span className="text-base font-black text-blue-600">G</span>
                <span>Entrar com Conta Google (Opcional)</span>
              </button>
            </div>
          )}

          {/* TAB 3: TEAM USERS MANAGEMENT (ADMIN ONLY) */}
          {activeTab === 'users' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Como Administrador, você pode atribuir permissões para o Chefe de Cozinha e a Coordenação:
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {allUsers.map((u) => (
                  <div
                    key={u.uid}
                    className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{u.displayName}</p>
                      <p className="text-[10px] text-slate-400">
                        {u.email && !u.email.endsWith('@app.local') && !u.email.endsWith('@cristolandia.org')
                          ? u.email
                          : `Usuário ID: ${u.uid.substring(0, 8)}`}
                      </p>
                    </div>

                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="admin">Admin Compras</option>
                      <option value="cozinha">Chefe Cozinha</option>
                      <option value="coordenacao">Coordenação</option>
                    </select>
                  </div>
                ))}

                {allUsers.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhum usuário registrado ainda no Firebase.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl cursor-pointer"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};
