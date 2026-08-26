import React, { useState } from 'react';
import {
  Package,
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Utensils,
  UtensilsCrossed,
  Menu,
  X,
  User,
  Users,
  Sun,
  Moon,
  LogOut,
  MessageCircle,
  Scale,
  Eye,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { AppUserProfile, ROLE_LABELS } from '../firebase';
import { CristolandiaLogo } from './CristolandiaLogo';

interface HeaderProps {
  activeTab: 'dashboard' | 'products' | 'entries' | 'exits' | 'meals' | 'reports';
  setActiveTab: (tab: 'dashboard' | 'products' | 'entries' | 'exits' | 'meals' | 'reports') => void;
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
  currentUser,
  onOpenAuthModal,
  onLogout,
  isDarkMode = false,
  onToggleDarkMode,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const roleMeta = ROLE_LABELS[currentUser?.role || 'viewer'];

  const baseNavItems = [
    {
      id: 'dashboard' as const,
      label: isAdmin ? 'Dashboard Geral' : 'Painel de Consulta',
      icon: LayoutDashboard,
    },
    {
      id: 'products' as const,
      label: 'Produtos & Estoque',
      icon: Package,
    },
    {
      id: 'entries' as const,
      label: 'Entradas',
      icon: ArrowDownLeft,
    },
    {
      id: 'exits' as const,
      label: 'Saídas',
      icon: ArrowUpRight,
    },
    {
      id: 'meals' as const,
      label: 'Refeições Servidas',
      icon: UtensilsCrossed,
    },
  ];

  const navItems = isAdmin
    ? [
        ...baseNavItems,
        {
          id: 'reports' as const,
          label: 'Relatórios & Auditoria',
          icon: FileText,
        },
      ]
    : baseNavItems;

  return (
    <>
      {/* MOBILE TOP BAR */}
      <header className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 sticky top-0 z-40 flex items-center justify-between shadow-xs">
        <CristolandiaLogo variant="compact" />

        <div className="flex items-center gap-1.5">
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800 transition-colors"
              title={isDarkMode ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-emerald-600" />}
            </button>
          )}

          <button
            onClick={onOpenAuthModal}
            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="truncate max-w-[80px]">{currentUser?.displayName?.split(' ')[0] || 'Perfil'}</span>
          </button>

          {isAdmin && (
            <button
              onClick={onOpenKitModal}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Kit</span>
            </button>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs pt-16 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl">
              <p className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Junta de Missões Nacionais • CBB
              </p>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Centro de Assistência Social Cristolândia
              </p>
              <p className="text-[10px] italic text-slate-600 dark:text-slate-400 mt-0.5">
                "Transformando Vidas pelo Amor de Cristo"
              </p>
            </div>

            <nav className="space-y-1">
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
                    className={`w-full flex items-center space-x-3 p-3 rounded-xl text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
              {isAdmin && onOpenReconciliationPreview && (
                <button
                  onClick={() => {
                    onOpenReconciliationPreview();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>🔍 Prévia da Conciliação Física</span>
                </button>
              )}

              {isAdmin && onOpenPhysicalInventory && (
                <button
                  onClick={() => {
                    onOpenPhysicalInventory();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 text-purple-800 dark:text-purple-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Scale className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>⚖️ Inventário Físico / Marco Zero</span>
                </button>
              )}

              {isAdmin && onOpenWhatsAppModal && (
                <button
                  onClick={() => {
                    onOpenWhatsAppModal();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>📲 WhatsApp Chefe Marcos</span>
                </button>
              )}

              {isAdmin && onOpenMissionariesModal && (
                <button
                  onClick={() => {
                    onOpenMissionariesModal();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>Missionários & Turnos</span>
                </button>
              )}

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="w-full py-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 mt-2"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Sair do Sistema</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP SAAS SIDEBAR */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-slate-900 h-screen sticky top-0 p-4 flex-col border-r border-slate-200 dark:border-slate-800 shrink-0 z-20">
        {/* Brand Top Header */}
        <div className="mb-4 space-y-3">
          <CristolandiaLogo variant="full" />

          {/* User Profile Card */}
          <button
            onClick={onOpenAuthModal}
            className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-left transition-all cursor-pointer group shadow-2xs"
          >
            <div className="min-w-0 pr-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {currentUser?.displayName || 'Marconi Castro'}
              </p>
              <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border mt-0.5 ${roleMeta.color}`}>
                {roleMeta.badge}
              </span>
            </div>
            <User className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0" />
          </button>
        </div>

        {/* Main Navigation Menu */}
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1">
            Menu Operacional
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all text-sm font-semibold cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          {/* Quick Management Tools */}
          {isAdmin && (
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1">
                Gestão & Apoio
              </div>

              {onOpenReconciliationPreview && (
                <button
                  onClick={onOpenReconciliationPreview}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Abrir Prévia da Conciliação Física (Marco Zero)"
                >
                  <Eye className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="truncate">Prévia Conciliação</span>
                </button>
              )}

              {onOpenPhysicalInventory && (
                <button
                  onClick={onOpenPhysicalInventory}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Conferência de Inventário Físico"
                >
                  <Scale className="w-4 h-4 text-purple-500 shrink-0" />
                  <span className="truncate">Inventário Físico</span>
                </button>
              )}

              {onOpenWhatsAppModal && (
                <button
                  onClick={onOpenWhatsAppModal}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Alerta WhatsApp para Chefe Marcos"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="truncate">WhatsApp Marcos</span>
                </button>
              )}

              {onOpenMissionariesModal && (
                <button
                  onClick={onOpenMissionariesModal}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="truncate">Missionários & Turnos</span>
                </button>
              )}
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="mt-auto space-y-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
          {/* Official Marco Zero Reference Pill */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Marco Zero
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                21/08/2026 17:30
              </p>
            </div>
            <span className="text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
              Oficial
            </span>
          </div>

          {/* Kit Diário Action for Admin */}
          {isAdmin && (
            <button
              onClick={onOpenKitModal}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Utensils className="w-4 h-4" />
              <span>+ Kit Cozinha Diário</span>
            </button>
          )}

          {/* Theme & Logout Utility Controls */}
          <div className="flex items-center gap-2">
            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                className="flex-1 py-2 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title={isDarkMode ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
              >
                {isDarkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Claro</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-slate-600" />
                    <span>Escuro</span>
                  </>
                )}
              </button>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 rounded-xl transition-colors cursor-pointer"
                title="Sair do Sistema"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};


