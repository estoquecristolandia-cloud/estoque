import React, { useState, useEffect } from 'react';
import { X, User, Shield, LogOut, Mail, Lock, CheckCircle2, AlertCircle, Plus, Trash2, Power } from 'lucide-react';
import { loginWithGoogle, logoutUser, loginWithCredentials, AppUserProfile, UserRole, ROLE_LABELS, MASTER_ADMIN_EMAIL } from '../firebase';
import {
  subscribeToAuthorizedUsers,
  saveAuthorizedUserToFirestore,
  toggleAuthorizedUserActiveInFirestore,
  deleteAuthorizedUserFromFirestore
} from '../services/firestoreService';
import { AuthorizedUser } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUserProfile | null;
  allUsers: AppUserProfile[];
  onSelectRole: (role: UserRole) => void;
  onRefreshProfile: () => void;
}

export const AuthModal = ({ isOpen, onClose, currentUser }: AuthModalProps) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'whitelist' | 'login'>('profile');
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Whitelist management states (admin only)
  const [whitelist, setWhitelist] = useState<AuthorizedUser[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser?.role === 'admin') {
      const unsub = subscribeToAuthorizedUsers((users) => {
        setWhitelist(users);
      });
      return () => unsub();
    }
  }, [isOpen, currentUser?.role]);

  if (!isOpen) return null;

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      await loginWithCredentials(usernameInput, password);
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err.code === 'auth/invalid-credential'
          ? 'Usuário ou senha incorretos.'
          : err.message || 'Não foi possível concluir a autenticação.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Não foi possível entrar com Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    onClose();
  };

  const handleAddViewer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const cleanEmail = newEmail.toLowerCase().trim();
    if (!cleanEmail) {
      setErrorMsg('Informe um e-mail válido.');
      return;
    }
    if (cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase()) {
      setErrorMsg('O administrador geral já possui acesso irrestrito.');
      return;
    }
    setIsAdding(true);
    try {
      await saveAuthorizedUserToFirestore({
        email: cleanEmail,
        name: newName.trim() || cleanEmail,
        active: true,
      });
      setNewEmail('');
      setNewName('');
      setSuccessMsg(`Visualizador ${cleanEmail} pré-autorizado com sucesso!`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar na lista de pré-autorização.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleActive = async (user: AuthorizedUser) => {
    setErrorMsg('');
    try {
      await toggleAuthorizedUserActiveInFirestore(user.email, !user.active);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao alterar status do usuário.');
    }
  };

  const handleDeleteAuthorized = async (email: string) => {
    if (!confirm(`Remover definitivamente a autorização de ${email}?`)) return;
    setErrorMsg('');
    try {
      await deleteAuthorizedUserFromFirestore(email);
      setSuccessMsg(`Autorização de ${email} removida.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao excluir autorização.');
    }
  };

  const meta = ROLE_LABELS[currentUser?.role || 'viewer'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black">Acesso e Segurança</h3>
              <p className="text-[11px] text-slate-500">SIG-Cristolândia • Centro de Formação (LEM/BA)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <button
            onClick={() => { setActiveTab('profile'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-3 text-xs font-bold transition-all ${
              activeTab === 'profile' ? 'text-blue-600 border-b-2 border-blue-600 bg-white dark:bg-slate-900' : 'text-slate-500'
            }`}
          >
            Meu Perfil
          </button>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => { setActiveTab('whitelist'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-3 text-xs font-bold transition-all ${
                activeTab === 'whitelist' ? 'text-blue-600 border-b-2 border-blue-600 bg-white dark:bg-slate-900' : 'text-slate-500'
              }`}
            >
              Pré-Autorizações ({whitelist.length + 1})
            </button>
          )}
          <button
            onClick={() => { setActiveTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex-1 py-3 text-xs font-bold transition-all ${
              activeTab === 'login' ? 'text-blue-600 border-b-2 border-blue-600 bg-white dark:bg-slate-900' : 'text-slate-500'
            }`}
          >
            Trocar Conta
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Tab: Profile */}
          {activeTab === 'profile' && currentUser && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-black text-sm">{currentUser.displayName}</p>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[10px] font-black ${meta.color}`}>
                    {meta.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono">{currentUser.email}</p>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                  {currentUser.role === 'admin' ? (
                    <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Você é o <strong>Administrador Único</strong>. Possui controle total de produtos, movimentações, auditorias, missionários e da lista de pré-autorização de visualizadores.
                    </p>
                  ) : (
                    <p className="text-blue-600 dark:text-blue-400 font-medium">
                      Você está autenticado como <strong>Visualizador Autorizado</strong>. Pode consultar todos os dados de estoque, refeições, kits e relatórios em tempo real (somente leitura).
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <LogOut className="w-4 h-4" /> Sair da conta
              </button>
            </div>
          )}

          {/* Tab: Whitelist Management (Admin Only) */}
          {activeTab === 'whitelist' && currentUser?.role === 'admin' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300">
                <p className="font-bold">Controle Rigoroso de Acesso</p>
                <p className="text-[11px] mt-0.5">
                  Somente os e-mails com status <strong>Ativo</strong> nesta lista conseguem autenticar e ler os dados operacionais do Firestore.
                </p>
              </div>

              {/* Form to add new authorized user */}
              <form onSubmit={handleAddViewer} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-500" /> Pré-Autorizar Novo Visualizador
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">Nome / Identificação</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Ex: Pastor João"
                      required
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500">E-mail Google / Conta</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="email@gmail.com"
                      required
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-all disabled:opacity-50"
                >
                  {isAdding ? 'Autorizando...' : 'Adicionar à Lista de Autorizados'}
                </button>
              </form>

              {/* List of accounts */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500">Usuários com Acesso Configurado:</p>

                {/* Fixed Master Admin */}
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-emerald-800 dark:text-emerald-300">Marconi Castro (Administrador Geral)</p>
                    <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 truncate">{MASTER_ADMIN_EMAIL}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                    👑 Mestre Fixo
                  </span>
                </div>

                {/* Authorized viewers from Firestore */}
                {whitelist.map((u) => (
                  <div
                    key={u.email}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                      u.active
                        ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                        : 'bg-slate-100/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-xs truncate text-slate-900 dark:text-white">{u.name}</p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            u.active ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {u.active ? 'Ativo' : 'Bloqueado'}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-500 truncate">{u.email}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(u)}
                        title={u.active ? 'Desativar acesso' : 'Reativar acesso'}
                        className={`p-1.5 rounded-xl border cursor-pointer transition-all ${
                          u.active
                            ? 'text-amber-600 border-amber-500/20 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                            : 'text-emerald-600 border-emerald-500/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                        }`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAuthorized(u.email)}
                        title="Remover definitivamente"
                        className="p-1.5 rounded-xl text-rose-600 border border-rose-500/20 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {whitelist.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Nenhum visualizador cadastrado em /authorized_users.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Tab: Switch Account (No public register) */}
          {activeTab === 'login' && (
            <div className="space-y-4">
              <button
                onClick={handleGoogle}
                disabled={isLoading}
                className="w-full py-3 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                <span className="text-base font-black text-blue-600">G</span> Entrar com Google
              </button>
              <div className="text-center text-[10px] text-slate-400">ou use usuário e senha do Firebase</div>
              <form onSubmit={handleCredentials} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500">Usuário ou e-mail</label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm"
                      placeholder="seu.email@gmail.com"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500">Senha</label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm"
                      required
                    />
                  </div>
                </div>
                <button
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Aguarde...' : 'Entrar'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Administrador: {MASTER_ADMIN_EMAIL}
          </span>
          <span className="text-slate-500">Cadastro público desativado</span>
        </div>
      </div>
    </div>
  );
};
