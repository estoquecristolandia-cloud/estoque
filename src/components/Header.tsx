import React, { useState } from 'react';
import { Package, LayoutDashboard, ArrowDownLeft, ArrowUpRight, FileText, Utensils, UtensilsCrossed, Menu, X, User, Users, Sun, Moon, LogOut, MessageCircle, Scale, Eye, Bot, Sparkles, Droplets, Layers, ScanBarcode, Camera, Save, Smartphone, Search, Volume2, VolumeX } from 'lucide-react';
import { AppUserProfile, ROLE_LABELS } from '../firebase';
import { Department } from '../types';
import { CristolandiaLogo } from './CristolandiaLogo';
import { soundFeedback } from '../utils/audioFeedback';

interface HeaderProps {
  activeTab: 'dashboard' | 'products' | 'entries' | 'exits' | 'meals' | 'reports' | 'ai_assistant';
  setActiveTab: (tab: 'dashboard' | 'products' | 'entries' | 'exits' | 'meals' | 'reports' | 'ai_assistant') => void;
  activeDepartment?: Department;
  onSelectDepartment?: (department: Department) => void;
  onOpenKitModal: () => void;
  onOpenPhysicalInventory?: () => void;
  onOpenReconciliationPreview?: () => void;
  onOpenMissionariesModal?: () => void;
  onOpenWhatsAppModal?: () => void;
  onOpenBarcodeScanner?: () => void;
  onOpenReceiptScanner?: () => void;
  onBackupData?: () => void;
  canInstallPwa?: boolean;
  onInstallPwa?: () => void;
  onResetData?: () => void;
  currentUser: AppUserProfile | null;
  onOpenAuthModal: () => void;
  onLogout?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onOpenCommandPalette?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeDepartment = 'alimentacao',
  onSelectDepartment,
  onOpenKitModal,
  onOpenPhysicalInventory,
  onOpenReconciliationPreview,
  onOpenMissionariesModal,
  onOpenWhatsAppModal,
  onOpenBarcodeScanner,
  onOpenReceiptScanner,
  onBackupData,
  canInstallPwa,
  onInstallPwa,
  onResetData,
  currentUser,
  onOpenAuthModal,
  onLogout,
  isDarkMode = true,
  onToggleDarkMode,
  onOpenCommandPalette,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(() => soundFeedback.isEnabled());

  const handleToggleSound = () => {
    const newState = soundFeedback.toggle();
    setSoundOn(newState);
  };
  const roleMeta = ROLE_LABELS[currentUser?.role || 'viewer'];
  const isDml = activeDepartment === 'dml';
  const isAdmin = currentUser?.role === 'admin';

  const baseNavItems = isDml
    ? [
        {
          id: 'dashboard' as const,
          label: isAdmin ? 'Painel DML & Limpeza' : 'Painel de Consulta DML',
          icon: LayoutDashboard,
          activeColor: 'bg-cyan-600/20 text-cyan-400',
        },
        {
          id: 'ai_assistant' as const,
          label: '🤖 Assistente DML',
          icon: Bot,
          activeColor: 'bg-cyan-600/20 text-cyan-400 font-bold',
        },
        {
          id: 'products' as const,
          label: 'Produtos de Limpeza',
          icon: Package,
          activeColor: 'bg-cyan-600/20 text-cyan-400',
        },
        {
          id: 'entries' as const,
          label: isAdmin ? 'Entradas & Doações' : 'Extrato de Entradas',
          icon: ArrowDownLeft,
          activeColor: 'bg-emerald-600/20 text-emerald-400',
        },
        {
          id: 'exits' as const,
          label: isAdmin ? 'Saídas & Kits Acolhidos' : 'Extrato de Saídas',
          icon: ArrowUpRight,
          activeColor: 'bg-cyan-600/20 text-cyan-400',
        },
      ]
    : [
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
          label: isDml ? 'Previsão & Relatórios DML' : 'Relatórios & Auditoria',
          icon: FileText,
          activeColor: isDml ? 'bg-cyan-600/20 text-cyan-400' : 'bg-indigo-600/20 text-indigo-400',
        },
      ]
    : baseNavItems;

  return (
    <>
      {/* MOBILE TOP BAR */}
      <div className="md:hidden bg-slate-950 text-white p-4 sticky top-0 z-40 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 p-1 flex items-center justify-center shadow-md">
            <CristolandiaLogo size={32} variant="mark" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black tracking-widest uppercase text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800/80">
                SIG
              </span>
              <span className="text-[9px] font-bold tracking-wider uppercase text-slate-400">
                JMN • CBB
              </span>
            </div>
            <h1 className="text-sm font-black tracking-tight uppercase leading-tight text-white">
              SIG-<span className="text-emerald-400">Cristolândia</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCommandPalette && (
            <button
              onClick={() => {
                soundFeedback.play('click');
                onOpenCommandPalette();
              }}
              className="p-2 text-slate-300 hover:text-white rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Buscar / Spotlight (Ctrl + K)"
            >
              <Search className="w-4 h-4 text-slate-300" />
            </button>
          )}
          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className="p-2 text-slate-300 hover:text-white rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 transition-all cursor-pointer shadow-xs active:scale-95"
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
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 shadow-sm cursor-pointer ${
                isDml
                  ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-950'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950'
              }`}
              title={isDml ? 'Kit Higiene Acolhidos' : 'Kit Diário da Cozinha'}
            >
              {isDml ? <Sparkles className="w-3.5 h-3.5" /> : <Utensils className="w-3.5 h-3.5" />}
              <span>{isDml ? 'Kit DML' : 'Kit'}</span>
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

      {/* MOBILE DEPT SWITCHER BAR */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 shrink-0">
          Módulo:
        </span>
        <div className="grid grid-cols-2 gap-1.5 flex-1 max-w-xs">
          <button
            onClick={() => onSelectDepartment?.('alimentacao')}
            className={`py-1 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              !isDml
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Utensils className="w-3 h-3" />
            <span>Alimentação</span>
          </button>
          <button
            onClick={() => onSelectDepartment?.('dml')}
            className={`py-1 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              isDml
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>DML</span>
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-slate-950/80 backdrop-blur-sm pt-24 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 text-white">
            <div className="p-3 bg-blue-950/60 border border-blue-800/60 rounded-xl mb-2">
              <p className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest">
                JMN • CBB — LEM / BA
              </p>
              <p className="text-xs font-bold text-white">
                SIG-Cristolândia
              </p>
              <p className="text-[10px] italic text-slate-300 mt-0.5">
                "Transformando Vidas pelo Amor de Cristo"
              </p>
            </div>

            {/* Mobile Drawer Department Selector */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-3">
              <button
                onClick={() => {
                  onSelectDepartment?.('alimentacao');
                  setMobileMenuOpen(false);
                }}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${
                  !isDml ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Alimentação</span>
              </button>
              <button
                onClick={() => {
                  onSelectDepartment?.('dml');
                  setMobileMenuOpen(false);
                }}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 ${
                  isDml ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>DML & Limpeza</span>
              </button>
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
              {/* Ferramentas Móveis de Galpão */}
              <div className="grid grid-cols-2 gap-2">
                {onOpenBarcodeScanner && (
                  <button
                    onClick={() => {
                      onOpenBarcodeScanner();
                      setMobileMenuOpen(false);
                    }}
                    className="py-2.5 px-3 bg-slate-950 border border-slate-800 hover:border-indigo-500 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5"
                  >
                    <ScanBarcode className="w-4 h-4 text-indigo-400" />
                    <span>Cód. Barras</span>
                  </button>
                )}
                {onOpenReceiptScanner && (
                  <button
                    onClick={() => {
                      onOpenReceiptScanner();
                      setMobileMenuOpen(false);
                    }}
                    className="py-2.5 px-3 bg-slate-950 border border-slate-800 hover:border-amber-500 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span>Nota Fiscal IA</span>
                  </button>
                )}
              </div>

              {canInstallPwa && onInstallPwa && (
                <button
                  onClick={() => {
                    onInstallPwa();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>📲 Instalar no Celular (App PWA)</span>
                </button>
              )}

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

              {onToggleDarkMode && (
                <button
                  onClick={() => {
                    onToggleDarkMode();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 bg-slate-900 border border-slate-800 text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-between px-3 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {isDarkMode ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
                    <span>Tema: <strong>{isDarkMode ? 'Escuro' : 'Claro'}</strong></span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-800 text-amber-300">
                    Alternar
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP BENTO SIDEBAR */}
      <aside className="hidden md:flex w-64 bg-slate-950 h-screen sticky top-0 p-3.5 flex-col border-r border-slate-800 shrink-0 overflow-y-auto overflow-x-hidden select-none scrollbar-thin scrollbar-thumb-slate-800 hover:scrollbar-thumb-slate-700">
        <div className="mb-3 space-y-2.5 shrink-0">
          {/* Institutional Badge */}
          <div className="bg-gradient-to-r from-blue-950 to-slate-900 p-2.5 rounded-2xl border border-blue-800/40 space-y-1 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                JMN • CBB
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LEM / BA
              </span>
            </div>

            <p className="text-[9px] font-semibold text-slate-300 uppercase tracking-wider truncate">
              Junta de Missões Nacionais
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 p-1 flex items-center justify-center shadow-md shadow-emerald-950/40 shrink-0">
                <CristolandiaLogo size={32} variant="mark" />
              </div>
              <div className="min-w-0">
                <h1 className="text-white text-sm font-black tracking-tight uppercase leading-tight truncate">
                  SIG-<span className="text-emerald-400">Cristolândia</span>
                </h1>
                <p className="text-[9px] font-semibold text-slate-400 leading-tight truncate">
                  Sistema Integrado de Gestão
                </p>
                <p className="text-[8.5px] italic text-slate-500 leading-tight mt-0.5 truncate">
                  "Transformando Vidas pelo Amor de Cristo"
                </p>
              </div>
            </div>
          </div>

          {/* User Role Card & Quick Theme Toggle */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenAuthModal}
              className="flex-1 p-2 rounded-xl bg-slate-900/90 hover:bg-slate-900 border border-slate-800 flex items-center justify-between text-left transition-all cursor-pointer group shadow-sm min-w-0"
              title="Gerenciar perfil e permissões de usuário"
            >
              <div className="min-w-0 pr-1">
                <p className="text-xs font-bold text-white truncate">
                  {currentUser?.displayName || 'Equipe Cristolândia'}
                </p>
                <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase border mt-0.5 ${roleMeta.color}`}>
                  {roleMeta.badge}
                </span>
              </div>
              <User className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors shrink-0" />
            </button>

            {onToggleDarkMode && (
              <button
                onClick={onToggleDarkMode}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white transition-all cursor-pointer shrink-0 shadow-sm flex items-center justify-center group"
                title={isDarkMode ? 'Alternar para Modo Claro (☀️)' : 'Alternar para Modo Escuro (🌙)'}
                aria-label="Alternar tema claro ou escuro"
              >
                {isDarkMode ? (
                  <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-400 group-hover:-rotate-12 transition-transform" />
                )}
              </button>
            )}

            <button
              onClick={handleToggleSound}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white transition-all cursor-pointer shrink-0 shadow-sm flex items-center justify-center group"
              title={soundOn ? 'Sons e Feedback Háptico Ativados (Clique para silenciar)' : 'Sons Silenciados (Clique para ativar)'}
              aria-label="Alternar som do sistema"
            >
              {soundOn ? (
                <Volume2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500 group-hover:scale-110 transition-transform" />
              )}
            </button>
          </div>

          {/* DEPARTAMENTOS DO SIG-CRISTOLÂNDIA */}
          <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-inner space-y-1">
            <div className="flex items-center justify-between px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
              <span>Módulo Ativo</span>
              <span className={isDml ? 'text-cyan-400' : 'text-emerald-400'}>
                {isDml ? 'DML & Limpeza' : 'Alimentação'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <button
                onClick={() => {
                  soundFeedback.play('click');
                  onSelectDepartment?.('alimentacao');
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  !isDml
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                title="Módulo de Cozinha, Padaria e Mantimentos Alimentícios"
              >
                <Utensils className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Alimentação</span>
              </button>
              <button
                onClick={() => {
                  soundFeedback.play('click');
                  onSelectDepartment?.('dml');
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isDml
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
                title="Módulo DML, Higiene Pessoal dos Acolhidos e Limpeza Predial"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">DML</span>
              </button>
            </div>
          </div>
        </div>

        {/* Spotlight Search (Ctrl + K) Trigger */}
        {onOpenCommandPalette && (
          <button
            onClick={() => {
              soundFeedback.play('click');
              onOpenCommandPalette();
            }}
            className="w-full flex items-center justify-between py-2 px-3 mb-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all text-xs cursor-pointer group shadow-2xs"
            title="Buscar Produtos ou Ações Rápidas (Ctrl + K)"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors shrink-0" />
              <span className="font-semibold text-slate-300 truncate">Spotlight...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-slate-950 border border-slate-800 rounded text-slate-400 group-hover:border-slate-600 shrink-0">
              Ctrl K
            </kbd>
          </button>
        )}

        {/* Ferramentas de Agilidade Operacional no Galpão (Pilares 2 e 3) */}
        <div className="grid grid-cols-2 gap-1.5 shrink-0 my-1">
          {onOpenBarcodeScanner && (
            <button
              onClick={() => {
                soundFeedback.play('click');
                onOpenBarcodeScanner();
              }}
              className="py-1.5 px-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-[11px] font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs group"
              title="Abrir Câmera para Leitura de Código de Barras"
            >
              <ScanBarcode className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="truncate">Cód. Barras</span>
            </button>
          )}
          {onOpenReceiptScanner && (
            <button
              onClick={() => {
                soundFeedback.play('click');
                onOpenReceiptScanner();
              }}
              className="py-1.5 px-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl text-[11px] font-bold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs group"
              title="Foto de Cupom Fiscal com Leitura Inteligente por IA"
            >
              <Camera className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="truncate">Nota IA</span>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  soundFeedback.play('click');
                  setActiveTab(item.id);
                }}
                className={`w-full flex items-center space-x-2.5 py-2 px-3 rounded-xl transition-all text-xs font-semibold cursor-pointer ${
                  isActive
                    ? `${item.activeColor} shadow-sm`
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="mt-3 space-y-1.5 pt-3 border-t border-slate-800 shrink-0">
          {isAdmin && onOpenReconciliationPreview && (
            <button
              onClick={onOpenReconciliationPreview}
              className="w-full py-2 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/60 text-amber-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              title="Abrir Prévia da Conciliação Física (Marco Zero)"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>🔍 Prévia de Conciliação</span>
            </button>
          )}

          {isAdmin && onOpenPhysicalInventory && (
            <button
              onClick={onOpenPhysicalInventory}
              className="w-full py-2 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-700/60 text-purple-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              title="Abrir Conferência de Inventário Físico e Ajustes Auditados"
            >
              <Scale className="w-3.5 h-3.5 text-purple-400" />
              <span>⚖️ Inventário Físico</span>
            </button>
          )}

          {isAdmin && onOpenWhatsAppModal && (
            <button
              onClick={onOpenWhatsAppModal}
              className="w-full py-2 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 text-emerald-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              title="Abrir Alerta de Estoque para Chefe Marcos (+55 62 99974-6823)"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>📲 Alerta WhatsApp (Marcos)</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={onOpenKitModal}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>+ Kit Cozinha Diário</span>
            </button>
          )}

          {isAdmin && onOpenMissionariesModal && (
            <button
              onClick={onOpenMissionariesModal}
              className="w-full py-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-400 rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-amber-500" />
              <span>Missionários & Turnos</span>
            </button>
          )}

          {canInstallPwa && onInstallPwa && (
            <button
              onClick={onInstallPwa}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-700/30 flex items-center justify-center gap-2 cursor-pointer transition-all animate-pulse"
              title="Instalar o SIG-Cristolândia na tela inicial como Aplicativo Nativo"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Instalar Aplicativo (PWA)</span>
            </button>
          )}

          {onBackupData && (
            <button
              onClick={onBackupData}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300 hover:text-amber-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              title="Exportar Backup Completo (JSON e Planilha)"
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span>Backup Rápido (1-Clique)</span>
            </button>
          )}

          {onToggleDarkMode && (
            <button
              onClick={onToggleDarkMode}
              className="w-full py-2 px-3 bg-slate-900 border border-slate-800 text-slate-200 hover:text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center justify-between gap-2 cursor-pointer group shadow-xs"
              title={isDarkMode ? 'Clique para alternar para o Modo Claro' : 'Clique para alternar para o Modo Escuro'}
            >
              <div className="flex items-center gap-2">
                {isDarkMode ? (
                  <Moon className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                )}
                <span>Tema: <strong>{isDarkMode ? 'Escuro' : 'Claro'}</strong></span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase transition-colors ${
                isDarkMode ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/80' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {isDarkMode ? '🌙 Escuro' : '☀️ Claro'}
              </span>
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full py-2 bg-rose-950/30 hover:bg-rose-900/50 border border-rose-900/40 text-rose-300 hover:text-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Sair do Sistema</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

