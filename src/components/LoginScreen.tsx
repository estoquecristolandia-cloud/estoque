import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { AppUserProfile, loginWithCredentials, loginWithGoogle, registerWithCredentials } from '../firebase';
import { CristolandiaLogo } from './CristolandiaLogo';

interface LoginScreenProps {
  onLoginSuccess: (userProfile: AppUserProfile) => void;
  authErrorMessage?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, authErrorMessage }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const displayError = authErrorMessage || errorMsg;

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);
    try {
      const profile = await loginWithCredentials(username, password);
      onLoginSuccess(profile);
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
    setIsLoading(true);
    try {
      const profile = await loginWithGoogle();
      onLoginSuccess(profile);
    } catch (err: any) {
      setErrorMsg(err.message || 'Não foi possível entrar com Google.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-3">
            <CristolandiaLogo size={56} variant="mark" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-1.5">
              <Sparkles className="w-3 h-3" /> JUNTA DE MISSÕES NACIONAIS • CBB
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              SIG-<span className="text-emerald-400">CRISTOLÂNDIA</span>
            </h1>
            <p className="text-xs font-semibold text-slate-300 mt-0.5">Sistema Integrado de Gestão & Suprimentos</p>
            <p className="text-[11px] text-slate-500">Centro de Formação e Assistência Social (LEM / BA)</p>
          </div>
        </div>
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Acesso Seguro Autorizado</h2>
          </div>
          {displayError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{displayError}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isLoading}
            className="w-full py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer transition-all"
          >
            <span className="text-base font-black text-blue-600">G</span> Entrar com Google
          </button>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span className="h-px bg-slate-800 flex-1" /> OU USUÁRIO E SENHA <span className="h-px bg-slate-800 flex-1" />
          </div>
          <form onSubmit={handleCredentials} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">E-mail ou Usuário</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none"
                  placeholder="seu.email@gmail.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">Senha</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer transition-all"
            >
              {isLoading ? 'Autenticando...' : (
                <>
                  Entrar no Sistema <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1 text-[11px] text-slate-400">
            <p className="font-semibold text-slate-300">Contas Oficiais Autorizadas:</p>
            <p>
              • <strong className="text-emerald-400">Administrador</strong> (estoquecristolandia@gmail.com): Gestão total de estoque, compras, saídas e configurações.
            </p>
            <p>
              • <strong className="text-blue-400">Visualizadores</strong> (Chefe Marcos, Pr. Humberto): Consulta de estoque, refeições e relatórios.
            </p>
            <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
              * O cadastro público está fechado. Novos acessos devem ser pré-autorizados pelo administrador.
            </p>
          </div>
        </div>
        <div className="text-center text-xs text-slate-500">
          <p>LEM / BA • "Transformando Vidas pelo Amor de Cristo"</p>
        </div>
      </div>
    </div>
  );
};
