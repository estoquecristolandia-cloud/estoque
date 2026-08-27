import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Calendar, Sparkles, Clock, CheckCircle2, MessageCircle } from 'lucide-react';
import { AppUserProfile } from '../firebase';

interface DashboardHeaderProps {
  currentUser: AppUserProfile | null;
  onOpenEntryModal: () => void;
  onOpenExitModal: () => void;
  onOpenWhatsAppAlert?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  currentUser,
  onOpenEntryModal,
  onOpenExitModal,
  onOpenWhatsAppAlert,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const firstName = currentUser?.displayName?.split(' ')[0] || 'Marconi';

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  // Format today date in pt-BR
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
  const formattedDate = now.toLocaleDateString('pt-BR', options);
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  const shortDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Greeting & Subtitle */}
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {greeting}, {firstName}! 👋
          </h2>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Ao Vivo • LEM/BA
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Aqui está o resumo do estoque de hoje.
        </p>
      </div>

      {/* Right Action Block */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        {/* Date Display Pill */}
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">{capitalizedDate}</span>
          <span className="sm:hidden font-mono font-bold">{shortDate}</span>
        </div>

        {/* WhatsApp Alert Button */}
        {isAdmin && onOpenWhatsAppAlert && (
          <button
            onClick={onOpenWhatsAppAlert}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Enviar Alerta WhatsApp para Chefe Marcos"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden lg:inline">WhatsApp Marcos</span>
          </button>
        )}

        {/* Primary Action Buttons */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenEntryModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>+ Entrada</span>
            </button>

            <button
              onClick={onOpenExitModal}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>+ Saída</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
