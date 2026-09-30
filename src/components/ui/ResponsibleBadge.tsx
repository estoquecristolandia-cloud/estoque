import React from 'react';
import { Bot } from 'lucide-react';
import { StockMovement } from '../../types';

interface ResponsibleBadgeProps {
  movement?: Partial<StockMovement>;
  fallbackName?: string | null;
  className?: string;
}

export const ResponsibleBadge: React.FC<ResponsibleBadgeProps> = ({
  movement,
  fallbackName,
  className = '',
}) => {
  const person =
    fallbackName ||
    movement?.retrievedBy ||
    movement?.receivedBy ||
    movement?.deliveredBy;

  if (person && person.trim() !== '' && person.trim() !== '-') {
    return <span className={`font-medium text-slate-700 dark:text-slate-300 ${className}`}>{person}</span>;
  }

  const isSystemGenerated = Boolean(
    movement?.type === 'ajuste' ||
    movement?.isAdjustment ||
    movement?.id?.startsWith('adj-') ||
    movement?.notes?.toLowerCase().includes('auditoria') ||
    movement?.notes?.toLowerCase().includes('compens') ||
    movement?.notes?.toLowerCase().includes('marco zero') ||
    movement?.notes?.toLowerCase().includes('estorno') ||
    movement?.notes?.toLowerCase().includes('reconcilia')
  );

  if (isSystemGenerated) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 shadow-2xs whitespace-nowrap ${className}`}
        title="Lançamento sistêmico gerado por rotina de conciliação matemática ou auditoria oficial"
      >
        <Bot className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
        <span>Sistema / Auditoria</span>
      </span>
    );
  }

  return <span className={`text-slate-400 dark:text-slate-500 italic text-xs ${className}`}>-</span>;
};
