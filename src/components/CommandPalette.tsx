import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  PlusCircle,
  MinusCircle,
  FileText,
  FileCheck,
  ScanBarcode,
  Camera,
  Save,
  UtensilsCrossed,
  Layers,
  ChefHat,
  Sparkles,
  Bath,
  ArrowRight,
  Package,
  History,
  X,
  Command,
  BookOpen,
} from 'lucide-react';
import { Product, Department } from '../types';
import { soundFeedback } from '../utils/audioFeedback';

export interface CommandPaletteAction {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Ações Rápidas' | 'Navegação' | 'Produtos';
  icon: React.ReactNode;
  onSelect: () => void;
  badge?: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'critical';
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  activeDepartment: Department;
  onSelectDepartment: (dept: Department) => void;
  onNavigateTab: (tab: 'products' | 'entries' | 'exits' | 'meals' | 'reports') => void;
  onOpenEntryModal: () => void;
  onOpenExitModal: (product?: Product) => void;
  onOpenBarcodeScanner: () => void;
  onOpenReceiptScanner: () => void;
  onOpenJmnPdf: () => void;
  onOpenDonationReceipt: () => void;
  onOpenKitModal: () => void;
  onBackupData: () => void;
  onOpenQuickGuide?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  products,
  activeDepartment,
  onSelectDepartment,
  onNavigateTab,
  onOpenEntryModal,
  onOpenExitModal,
  onOpenBarcodeScanner,
  onOpenReceiptScanner,
  onOpenJmnPdf,
  onOpenDonationReceipt,
  onOpenKitModal,
  onBackupData,
  onOpenQuickGuide,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      soundFeedback.play('click');
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Prepara lista de ações disponíveis
  const staticActions = useMemo<CommandPaletteAction[]>(() => [
    // Ações Rápidas
    {
      id: 'entry',
      title: 'Registrar Nova Entrada (+)',
      subtitle: 'Dar entrada de compras ou doações no estoque',
      category: 'Ações Rápidas',
      icon: <PlusCircle className="w-4 h-4 text-emerald-500" />,
      onSelect: () => {
        onClose();
        onOpenEntryModal();
      },
    },
    {
      id: 'exit',
      title: 'Registrar Saída / Distribuição (-)',
      subtitle: 'Dar baixa para cozinha, padaria, casas ou setores',
      category: 'Ações Rápidas',
      icon: <MinusCircle className="w-4 h-4 text-blue-500" />,
      onSelect: () => {
        onClose();
        onOpenExitModal();
      },
    },
    {
      id: 'barcode',
      title: 'Bipar Código de Barras (Câmera)',
      subtitle: 'Ler produto pela câmera do celular ou leitor USB',
      category: 'Ações Rápidas',
      icon: <ScanBarcode className="w-4 h-4 text-indigo-400" />,
      onSelect: () => {
        onClose();
        onOpenBarcodeScanner();
      },
      badge: 'Galpão',
    },
    {
      id: 'receipt-ocr',
      title: 'Fotografar Cupom Fiscal (IA Gemini)',
      subtitle: 'Processar nota do mercado automaticamente por foto',
      category: 'Ações Rápidas',
      icon: <Camera className="w-4 h-4 text-amber-400" />,
      onSelect: () => {
        onClose();
        onOpenReceiptScanner();
      },
      badge: 'IA',
      badgeVariant: 'warning',
    },
    {
      id: 'jmn-pdf',
      title: 'Prestação de Contas JMN (PDF Oficial)',
      subtitle: 'Emitir relatório executivo formal com assinaturas',
      category: 'Ações Rápidas',
      icon: <FileText className="w-4 h-4 text-indigo-500" />,
      onSelect: () => {
        onClose();
        onOpenJmnPdf();
      },
      badge: 'Oficial JMN',
      badgeVariant: 'default',
    },
    {
      id: 'donation-receipt',
      title: 'Emitir Recibo Oficial de Doação',
      subtitle: 'Gerar comprovante formal timbrado para igrejas e parceiros',
      category: 'Ações Rápidas',
      icon: <FileCheck className="w-4 h-4 text-emerald-500" />,
      onSelect: () => {
        onClose();
        onOpenDonationReceipt();
      },
    },
    {
      id: 'kit-daily',
      title: activeDepartment === 'dml' ? 'Distribuir Kit Higiene' : 'Baixar Kit Cozinha Diário',
      subtitle: 'Lançar kit pré-configurado de rotina diária',
      category: 'Ações Rápidas',
      icon: activeDepartment === 'dml' ? <Sparkles className="w-4 h-4 text-amber-500" /> : <ChefHat className="w-4 h-4 text-amber-500" />,
      onSelect: () => {
        onClose();
        onOpenKitModal();
      },
    },
    {
      id: 'backup',
      title: 'Exportar Backup Completo (JSON + Excel)',
      subtitle: 'Download instantâneo de segurança de todo o banco de dados',
      category: 'Ações Rápidas',
      icon: <Save className="w-4 h-4 text-amber-400" />,
      onSelect: () => {
        onClose();
        onBackupData();
      },
    },
    ...(onOpenQuickGuide
      ? [
          {
            id: 'quick-guide',
            title: 'Manual de Uso & Guia Rápido (PVPS & Kit Diário)',
            subtitle: 'Como operar o SIG-Cristolândia em 3 passos práticos',
            category: 'Ações Rápidas' as const,
            icon: <BookOpen className="w-4 h-4 text-amber-400" />,
            onSelect: () => {
              onClose();
              onOpenQuickGuide();
            },
            badge: 'Tutorial',
            badgeVariant: 'warning' as const,
          },
        ]
      : []),

    // Navegação de Módulos
    {
      id: 'nav-dashboard',
      title: 'Ir para Dashboard & Visão Geral',
      subtitle: 'KPIs, alertas de estoque e regra PVPS',
      category: 'Navegação',
      icon: <Layers className="w-4 h-4 text-slate-400" />,
      onSelect: () => {
        onClose();
        onNavigateTab('products');
      },
    },
    {
      id: 'nav-meals',
      title: 'Ir para Refeitório & Refeições Diárias',
      subtitle: 'Controle de café, almoço, lanche e jantar servidos',
      category: 'Navegação',
      icon: <UtensilsCrossed className="w-4 h-4 text-slate-400" />,
      onSelect: () => {
        onClose();
        onNavigateTab('meals');
      },
    },
    {
      id: 'nav-history',
      title: 'Ir para Histórico de Movimentações',
      subtitle: 'Extrato completo de auditoria e movimentações',
      category: 'Navegação',
      icon: <History className="w-4 h-4 text-slate-400" />,
      onSelect: () => {
        onClose();
        onNavigateTab('entries');
      },
    },
    {
      id: 'nav-reports',
      title: 'Ir para Relatórios & Auditoria',
      subtitle: 'Consumo por setor, conferência física e prestação de contas',
      category: 'Navegação',
      icon: <FileText className="w-4 h-4 text-slate-400" />,
      onSelect: () => {
        onClose();
        onNavigateTab('reports');
      },
    },
    {
      id: 'switch-dept-alim',
      title: 'Alternar para Estoque de Alimentação',
      subtitle: 'Suprimentos da cozinha, padaria e despensas',
      category: 'Navegação',
      icon: <UtensilsCrossed className="w-4 h-4 text-emerald-400" />,
      onSelect: () => {
        onClose();
        onSelectDepartment('alimentacao');
      },
    },
    {
      id: 'switch-dept-dml',
      title: 'Alternar para Estoque de Limpeza & DML',
      subtitle: 'Produtos de higiene, desinfecção e lavanderia',
      category: 'Navegação',
      icon: <Bath className="w-4 h-4 text-cyan-400" />,
      onSelect: () => {
        onClose();
        onSelectDepartment('dml');
      },
    },
  ], [
    activeDepartment,
    onClose,
    onOpenEntryModal,
    onOpenExitModal,
    onOpenBarcodeScanner,
    onOpenReceiptScanner,
    onOpenJmnPdf,
    onOpenDonationReceipt,
    onOpenKitModal,
    onBackupData,
    onNavigateTab,
    onSelectDepartment,
  ]);

  // Ações filtradas por texto
  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staticActions;

    // 1. Ações estáticas que casam
    const matchedStatic = staticActions.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.subtitle && a.subtitle.toLowerCase().includes(q))
    );

    // 2. Produtos do banco que casam
    const matchedProducts: CommandPaletteAction[] = products
      .filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q);
        const catMatch = p.category?.toLowerCase().includes(q);
        const barcodeMatch = p.barcode?.toLowerCase().includes(q);
        return nameMatch || catMatch || barcodeMatch;
      })
      .slice(0, 10)
      .map((p) => {
        const isCritical = p.currentStock <= p.minStock;
        return {
          id: `prod-${p.id}`,
          title: p.name,
          subtitle: `${p.category || 'Geral'} • Saldo: ${p.currentStock} ${p.unit} (Mín: ${p.minStock})`,
          category: 'Produtos',
          icon: <Package className="w-4 h-4 text-indigo-400" />,
          badge: isCritical ? 'Crítico' : 'OK',
          badgeVariant: isCritical ? 'critical' : 'success',
          onSelect: () => {
            onClose();
            onOpenExitModal(p);
          },
        };
      });

    return [...matchedStatic, ...matchedProducts];
  }, [query, staticActions, products, onClose, onOpenExitModal]);

  // Navegação por teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredActions.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + (filteredActions.length || 1)) % (filteredActions.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const action = filteredActions[selectedIndex];
        if (action) {
          soundFeedback.play('click');
          action.onSelect();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredActions, selectedIndex, onClose]);

  // Scroll automático do item selecionado
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 px-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra de Pesquisa */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="O que você precisa fazer ou encontrar? (ex: Arroz, JMN, Entrada, Doação...)"
            className="w-full bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Lista de Resultados */}
        <div ref={listRef} className="overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/40">
          {filteredActions.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">Nenhum resultado encontrado para &quot;{query}&quot;</p>
              <p className="text-xs text-slate-500 mt-1">Tente buscar por nome do item, código ou ação.</p>
            </div>
          ) : (
            filteredActions.map((action, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={action.id}
                  onClick={() => {
                    soundFeedback.play('click');
                    action.onSelect();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isSelected
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {action.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold truncate">{action.title}</span>
                        {action.badge && (
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              action.badgeVariant === 'critical'
                                ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400'
                                : action.badgeVariant === 'warning'
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400'
                                : action.badgeVariant === 'success'
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400'
                                : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400'
                            }`}
                          >
                            {action.badge}
                          </span>
                        )}
                      </div>
                      {action.subtitle && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{action.subtitle}</p>
                      )}
                    </div>
                  </div>

                  <ArrowRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected ? 'text-indigo-500 translate-x-0.5' : 'text-slate-400 opacity-0'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé com Dicas de Navegação */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono">↓</kbd>
              <span>Navegar</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono">↵</kbd>
              <span>Selecionar</span>
            </span>
          </div>
          <span className="hidden sm:inline text-slate-500 font-medium">SIG-Cristolândia Spotlight</span>
        </div>
      </div>
    </div>
  );
};
