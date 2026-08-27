import React, { useState } from 'react';
import { User, Shield, LogOut, Mail, Lock, CheckCircle2, KeyRound } from 'lucide-react';
import { loginWithGoogle, logoutUser, registerWithCredentials, loginWithCredentials, AppUserProfile, UserRole, ROLE_LABELS, MASTER_ADMIN_EMAIL } from '../firebase';
import { updateUserRoleInFirestore } from '../services/firestoreService';
import { ModalWrapper } from './ui/ModalWrapper';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUserProfile | null;
  allUsers: AppUserProfile[];
  onSelectRole: (role: UserRole) => void;
  onRefreshProfile: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  onRefreshProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'login'>('profile');
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);
    try {
      if (isRegistering) {
        await registerWithCredentials(usernameInput, password, displayNameInput.trim());
      } else {
        await loginWithCredentials(usernameInput, password);
      }
      onRefreshProfile();
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err.code === 'auth/email-already-in-use'
          ? 'Este usuário já está cadastrado.'
          : err.code === 'auth/invalid-credential'
          ? 'Usuário ou senha incorretos.'
          : err.message || 'Não foi possível concluir a autenticação.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      await loginWithGoogle();
      onRefreshProfile();
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

  const meta = ROLE_LABELS[currentUser?.role || 'viewer'];

  return (
    <ModalWrapper
      id="auth-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="Acesso e Permissões"
      subtitle="Autenticação segura do Estoque Cristolândia"
      icon={<Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
      maxWidth="max-w-lg"
      footer={
        <div className="flex items-center justify-between w-full text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <span className="flex items-center gap-1.5 truncate">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            Admin: {MASTER_ADMIN_EMAIL}
          </span>
          <Button variant="secondary" onClick={onClose} size="sm">
            Fechar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 pb-3 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'text-blue-600 border-b-2 border-blue-600 font-black'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Meu Perfil
          </button>
          {currentUser?.role === 'admin' && (
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`flex-1 pb-3 text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'users'
                  ? 'text-blue-600 border-b-2 border-blue-600 font-black'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Usuários ({allUsers.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('login')}
            className={`flex-1 pb-3 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'login'
                ? 'text-blue-600 border-b-2 border-blue-600 font-black'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Trocar Conta
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold text-rose-600 dark:text-rose-400">
            {errorMsg}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && currentUser && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {currentUser.displayName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {currentUser.email}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[11px] font-black ${meta.color}`}>
                  {meta.badge}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {currentUser.role === 'admin' ? (
                  <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                    Você possui privilégios de Administrador Geral. Pode criar, editar e excluir cadastros, lançar movimentações, baixar kits e gerenciar o estoque.
                  </p>
                ) : (
                  <p className="text-blue-700 dark:text-blue-400 font-medium">
                    Você está autenticado em Modo de Visualização. Pode acompanhar todo o estoque, histórico de movimentações, refeições e relatórios em tempo real (somente leitura).
                  </p>
                )}
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={handleLogout}
              className="w-full justify-center"
              icon={<LogOut className="w-4 h-4" />}
            >
              Sair da Conta
            </Button>
          </div>
        )}

        {/* Users List Tab */}
        {activeTab === 'users' && currentUser?.role === 'admin' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Usuários autenticados no sistema. O administrador principal ({MASTER_ADMIN_EMAIL}) possui controle total protegido por regras.
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {allUsers.map((u) => (
                <div
                  key={u.uid}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {u.displayName}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate font-mono">
                      {u.email}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black whitespace-nowrap ${ROLE_LABELS[u.role || 'viewer']?.color || 'text-slate-500'}`}>
                    {ROLE_LABELS[u.role || 'viewer']?.badge || '👁️ Visualizador'}
                  </span>
                </div>
              ))}
              {allUsers.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">Nenhum usuário registrado.</p>
              )}
            </div>
          </div>
        )}

        {/* Login Tab */}
        {activeTab === 'login' && (
          <div className="space-y-4">
            <Button
              variant="outline"
              onClick={handleGoogle}
              disabled={isLoading}
              className="w-full justify-center text-xs font-bold"
              icon={<span className="text-base font-black text-blue-600">G</span>}
            >
              Entrar com Google
            </Button>

            <div className="text-center text-[11px] text-slate-400 font-medium">
              ou use usuário e senha do Firebase
            </div>

            <form onSubmit={handleCredentials} className="space-y-3">
              {isRegistering && (
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Nome Completo
                  </label>
                  <input
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    placeholder="Seu nome"
                    required
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Usuário ou E-mail
                </label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    required
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  Senha
                </label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    required
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                variant="primary"
                className="w-full justify-center text-xs font-bold"
              >
                {isLoading ? 'Aguarde...' : isRegistering ? 'Criar Conta de Visualização' : 'Entrar'}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => setIsRegistering((v) => !v)}
              className="w-full text-center text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {isRegistering ? 'Já tenho uma conta' : 'Criar uma nova conta'}
            </button>
          </div>
        )}
      </div>
    </ModalWrapper>
  );
};

