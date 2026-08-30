import React, { useState } from 'react';
import { Package, LayoutDashboard, ArrowDownLeft, ArrowUpRight, FileText, Utensils, UtensilsCrossed, Menu, X, User, Users, Sun, Moon, LogOut, MessageCircle, Scale, Eye, Bot, Sparkles } from 'lucide-react';
import { AppUserProfile, ROLE_LABELS } from '../firebase';

interface HeaderProps {
  activeTab: 'dashboard' | 'products' | 'entries' | 'exits' | 'meals' | 'reports' | 'ai_assistant';
  setActiveTab: (tab: 'dashboard' | 'products' | 'entries' | 'exits' | 'meals' | 'reports' | 'ai_assistant') => void;
  onOpenKitModal: () => void;
  onOpenPhysicalInventory?: () => void;
  onOpenReconciliationPreview?: () => void;
  onOpenMissionariesModal?: () => void;
  onOpenWhatsAppModal?: () => void;
  onResetData?: () => void;
  currentUser: AppUserProfile | null;
  onOpenAuthModal: () => void;
  onLogout?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenKitModal,
  onOpenPhysicalInventory,
  onOpenReconciliationPreview,
  onOpenMissionariesModal,
  onOpenWhatsAppModal,
  onResetData,
  currentUser,
  onOpenAuthModal,
  onLogout,
  isDarkMode = true,
  onToggleDarkMode,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const roleMeta = ROLE_LABELS[currentUser?.role || 'viewer'];

  const baseNavItems = [
    {
      id: 'dashboard' as const,
      label: isAdmin ? 'Painel Principal' : 'Painel de Consulta',
      icon: LayoutDashboard,
      activeColor: 'bg-blue-600/20 text-blue-400',
    },
    {
      id: 'ai_assistant' as const,
      label: '🤖 Assistente IA',
      icon: Bot,
      activeColor: 'bg-emerald-600/20 text-emerald-400 font-bold',
    },
    {
      id: 'products' as const,
      label: 'Produtos & Estoque',
      icon: Package,
      activeColor: 'bg-blue-600/20 text-blue-400',
    },
    {
      id: 'entries' as const,
      label: isAdmin ? 'Entradas' : 'Extrato de Entradas',
      icon: ArrowDownLeft,
      activeColor: 'bg-emerald-600/20 text-emerald-400',
    },
    {
      id: 'exits' as const,
      label: isAdmin ? 'Saídas' : 'Extrato de Saídas',
      icon: ArrowUpRight,
      activeColor: 'bg-amber-600/20 text-amber-400',
    },
    {
      id: 'meals' as const,
      label: isAdmin ? 'Refeições (Café/Alm/Lanch/Jant)' : 'Refeições Servidas',
      icon: UtensilsCrossed,
      activeColor: 'bg-amber-500/20 text-amber-400',
    },
  ];

  const navItems = isAdmin
    ? [
        ...baseNavItems,
        {
          id: 'reports' as const,
          label: 'Relatórios & Auditoria',
          icon: FileText,
          activeColor: 'bg-indigo-600/20 text-indigo-400',
        },
      ]
    : baseNavItems;

  return (
    <>
      {/* MOBILE TOP BAR */}
      <div className="md:hidden bg-slate-950 text-white p-4 sticky top-0 z-40 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md shadow-blue-600/30">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black tracking-widest uppercase text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30">
                JMN • CBB
              </span>
            </div>
            <h1 className="text-sm font-black tracking-tight uppercase leading-tight text-white">
              Estoque <span className="text-amber-400">Cristolândia</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className="p-2 text-slate-300 hover:text-white rounded-lg bg-slate-800 transition-colors"
              title={isDarkMode ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>
          )}
          <button
            onClick={onOpenAuthModal}
            className="px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold border border-slate-700 flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5 text-blue-400" />
            <span className="truncate max-w-[80px]">{currentUser?.displayName?.split(' ')[0] || 'Perfil'}</span>
          </button>
          {isAdmin && (
            <button
              onClick={onOpenKitModal}
              className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-lg text-xs font-black flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Kit</span>
            </button>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 text-rose-400 hover:text-rose-300 rounded-lg bg-rose-950/40 border border-rose-900/40 transition-colors"
              title="Sair do Sistema"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white rounded-lg bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-slate-950/80 backdrop-blur-sm pt-16 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 text-white">
            <div className="p-3 bg-blue-950/60 border border-blue-800/60 rounded-xl mb-3">
              <p className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest">
                Junta de Missões Nacionais
              </p>
              <p className="text-xs font-bold text-white">
                Centro de Formação e Assistência Social Cristolândia
              </p>
              <p className="text-[10px] italic text-slate-300 mt-0.5">
                "Transformando Vidas pelo Amor de Cristo"
              </p>
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive ? item.activeColor : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
              {isAdmin && onOpenReconciliationPreview && (
                <button
                  onClick={() => {
                    onOpenReconciliationPreview();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold hover:bg-amber-500/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4 text-amber-400" />
                  <span>🔍 Prévia da Conciliação Física</span>
                </button>
              )}

              {isAdmin && onOpenPhysicalInventory && (
                <button
                  onClick={() => {
                    onOpenPhysicalInventory();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 bg-purple-600/20 border border-purple-500/40 text-purple-300 rounded-xl text-xs font-bold hover:bg-purple-600/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Scale className="w-4 h-4 text-purple-400" />
                  <span>⚖️ Inventário Físico / Marco Zero</span>
                </button>
              )}

              {isAdmin && onOpenWhatsAppModal && (
                <button
                  onClick={() => {
                    onOpenWhatsAppModal();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-600/30 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>📲 WhatsApp Chefe Marcos</span>
                </button>
              )}

              {isAdmin && onOpenMissionariesModal && (
                <button
                  onClick={() => {
                    onOpenMissionariesModal();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-bold hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  <span>Missionários & Turnos</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP BENTO SIDEBAR */}
      <aside className="hidden md:flex w-64 bg-slate-950 h-screen sticky top-0 p-5 flex-col border-r border-slate-800 shrink-0">
        <div className="mb-5 space-y-3">
          {/* Institutional Badge */}
          <div className="bg-gradient-to-r from-blue-950 to-slate-900 p-3 rounded-2xl border border-blue-800/40 space-y-1.5 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                JMN • CBB
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LEM / BA
              </span>
            </div>

            <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
              Junta de Missões Nacionais
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-white text-base font-black tracking-tight uppercase leading-tight">
                  Estoque <span className="text-amber-400">Cristolândia</span>
                </h1>
                <p className="text-[10px] italic text-slate-400 leading-tight mt-0.5">
                  "Transformando Vidas pelo Amor de Cristo"
                </p>
              </div>
            </div>
          </div>

          {/* User Role Card */}
          <button
            onClick={onOpenAuthModal}
            className="w-full p-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800 flex items-center justify-between text-left transition-all cursor-pointer group shadow-sm"
          >
            <div className="min-w-0 pr-1">
              <p className="text-xs font-bold text-white truncate">
                {currentUser?.displayName || 'Equipe Cristolândia'}
              </p>
              <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border mt-0.5 ${roleMeta.color}`}>
                {roleMeta.badge}
              </span>
            </div>
            <User className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors shrink-0" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all text-sm font-medium cursor-pointer ${
                  isActive
                    ? `${item.activeColor} shadow-sm`
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="mt-auto space-y-2 pt-4 border-t border-slate-800">
          {isAdmin && onOpenReconciliationPreview && (
            <button
              onClick={onOpenReconciliationPreview}
              className="w-full py-2.5 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/60 text-amber-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              title="Abrir Prévia da Conciliação Física dos 14 produtos (Marco Zero)"
            >
              <Eye className="w-4 h-4 text-amber-400" />
              <span>🔍 Prévia de Conciliação</span>
            </button>
          )}

          {isAdmin && onOpenPhysicalInventory && (
            <button
              onClick={onOpenPhysicalInventory}
              className="w-full py-2.5 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-700/60 text-purple-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              title="Abrir Conferência de Inventário Físico e Ajustes Auditados"
            >
              <Scale className="w-4 h-4 text-purple-400" />
              <span>⚖️ Inventário Físico</span>
            </button>
          )}

          {isAdmin && onOpenWhatsAppModal && (
            <button
              onClick={onOpenWhatsAppModal}
              className="w-full py-2.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 text-emerald-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              title="Abrir Alerta de Estoque para Chefe Marcos (+55 62 99974-6823)"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>📲 Alerta WhatsApp (Marcos)</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={onOpenKitModal}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Utensils className="w-4 h-4" />
              <span>+ Kit Cozinha Diário</span>
            </button>
          )}

          {isAdmin && onOpenMissionariesModal && (
            <button
              onClick={onOpenMissionariesModal}
              className="w-full py-2.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-amber-500" />
              <span>Missionários & Turnos</span>
            </button>
          )}

          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className="w-full py-2.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span>Modo Escuro</span>
                </>
              )}
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full py-2.5 bg-rose-950/30 hover:bg-rose-900/50 border border-rose-900/40 text-rose-300 hover:text-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Sair do Sistema</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

