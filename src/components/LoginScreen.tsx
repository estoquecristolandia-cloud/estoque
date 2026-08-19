import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { AppUserProfile, UserRole } from '../firebase';

export const PRESET_USERS: Record<string, { name: string; role: UserRole; badge: string; password: string }> = {
  'marconi.estoque': {
    name: 'Marconi Castro',
    role: 'admin',
    badge: 'GESTOR DO ESTOQUE (ACESSO TOTAL)',
    password: 'estoquecristolandia',
  },
  'marcos.estoque': {
    name: 'Chefe Marcos',
    role: 'coordenacao',
    badge: 'DIRETORIA (SOMENTE VISUALIZAÇÃO)',
    password: 'estoquecristolandia',
  },
  'humberto.estoque': {
    name: 'Humberto',
    role: 'coordenacao',
    badge: 'CONSULTA (SOMENTE VISUALIZAÇÃO)',
    password: 'estoquecristolandia',
  },
};

interface LoginScreenProps {
  onLoginSuccess: (userProfile: AppUserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setErrorMsg('Por favor, informe o usuário e a senha de acesso.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const userRecord = PRESET_USERS[cleanUsername];

      if (!userRecord) {
        setErrorMsg('Usuário não encontrado. Verifique o login digitado.');
        setIsLoading(false);
        return;
      }

      if (cleanPassword !== userRecord.password) {
        setErrorMsg('Senha incorreta. Verifique e tente novamente.');
        setIsLoading(false);
        return;
      }

      const authUser: AppUserProfile = {
        uid: `user-${cleanUsername}`,
        email: `${cleanUsername}@cristolandia.org`,
        displayName: userRecord.name,
        role: userRecord.role,
        createdAt: new Date().toISOString(),
      };

      // Save session in localStorage
      localStorage.setItem('cristolandia_auth_session', JSON.stringify(authUser));
      setIsLoading(false);
      onLoginSuccess(authUser);
    }, 300);
  };

  const handleQuickSelect = (u: string) => {
    setUsername(u);
    setPassword('');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Subtle Ambient Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl shadow-blue-600/30 text-white font-black text-2xl border border-blue-400/30 mb-1">
            EC
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>JUNTA DE MISSÕES NACIONAIS • CBB</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              ESTOQUE CRISTOLÂNDIA
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Centro de Formação e Assistência Social (LEM / BA)
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Acesso Restrito ao Sistema
            </h2>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-rose-400 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Usuário Cadastrado
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: marconi.estoque"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-blue-600/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick User Selection Buttons */}
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 block text-center uppercase tracking-wider">
              Usuários Cadastrados (Clique para selecionar o nome)
            </span>

            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickSelect('marconi.estoque')}
                className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 text-left text-xs transition-colors flex items-center justify-between cursor-pointer"
              >
                <div>
                  <strong className="text-white block font-bold">Marconi Castro</strong>
                  <span className="text-[10px] text-emerald-400 font-semibold">marconi.estoque &bull; Gestor / Acesso Total</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                  ADMIN
                </span>
              </button>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickSelect('marcos.estoque')}
                  className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 text-left text-xs transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <strong className="text-white block font-bold text-[11px]">Chefe Marcos</strong>
                    <span className="text-[9px] text-amber-400 font-semibold">marcos.estoque</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    VISUALIZADOR
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickSelect('humberto.estoque')}
                  className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 text-left text-xs transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <strong className="text-white block font-bold text-[11px]">Humberto</strong>
                    <span className="text-[9px] text-amber-400 font-semibold">humberto.estoque</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    VISUALIZADOR
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-500">
          <p>LEM / BA &bull; "Transformando Vidas pelo Amor de Cristo"</p>
        </div>
      </div>
    </div>
  );
};
