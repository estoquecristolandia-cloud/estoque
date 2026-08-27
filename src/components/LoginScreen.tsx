import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, Sparkles, Building2 } from 'lucide-react';
import { AppUserProfile, loginWithCredentials, loginWithGoogle, registerWithCredentials } from '../firebase';
import { Button } from './ui/Button';

interface LoginScreenProps {
  onLoginSuccess: (userProfile: AppUserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);
    try {
      const profile = isRegistering
        ? await registerWithCredentials(username, password, displayName.trim())
        : await loginWithCredentials(username, password);
      onLoginSuccess(profile);
    } catch (err: any) {
      setErrorMsg(
        err.code === 'auth/invalid-credential'
          ? 'Usuário ou senha incorretos.'
          : err.code === 'auth/email-already-in-use'
          ? 'Este usuário já está cadastrado.'
          : err.message || 'Não foi possível concluir a operação.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      onLoginSuccess(await loginWithGoogle());
    } catch (err: any) {
      setErrorMsg(err.message || 'Não foi possível entrar com Google.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Subtle Background Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 shadow-md text-white font-black text-2xl border border-emerald-500/30">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-1.5">
              <Sparkles className="w-3.5 h-3.5" /> JUNTA DE MISSÕES NACIONAIS &bull; CBB
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              ESTOQUE CRISTOLÂNDIA
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Centro de Formação e Assistência Social (LEM / BA)
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Acesso ao Sistema
            </h2>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Google SSO Button */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isLoading}
            className="w-full py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <span className="text-base font-black text-blue-600">G</span> Entrar com Google
          </button>

          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="h-px bg-slate-200 dark:bg-slate-800 flex-1" /> OU USUÁRIO E SENHA <span className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleCredentials} className="space-y-4">
            {isRegistering && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Nome</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Seu nome completo"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Usuário ou E-mail</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  placeholder="Ex: estoquecristolandia@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Senha</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="w-full justify-center"
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {isLoading ? 'Aguarde...' : isRegistering ? 'Criar Conta' : 'Entrar no Sistema'}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setIsRegistering((v) => !v);
              setErrorMsg('');
            }}
            className="w-full text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            {isRegistering ? 'Já tenho uma conta' : 'Criar uma nova conta'}
          </button>

          {/* Access info footer */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
            <p className="font-bold text-slate-700 dark:text-slate-300">Níveis de Acesso:</p>
            <p>
              • <strong className="text-emerald-600 dark:text-emerald-400">Administrador</strong> (estoquecristolandia@gmail.com): Gestão total de estoque, compras, saídas e configurações.
            </p>
            <p>
              • <strong className="text-blue-600 dark:text-blue-400">Visualizador</strong> (outras contas): Acesso para consulta de estoque, histórico, refeições e relatórios.
            </p>
          </div>
        </div>

        <div className="text-center text-xs text-slate-400">
          <p>LEM / BA &bull; "Transformando Vidas pelo Amor de Cristo"</p>
        </div>
      </div>
    </div>
  );
};

