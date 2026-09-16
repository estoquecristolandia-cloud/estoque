import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { StockMovement } from '../../types';

interface MovementRowProps {
  movement: StockMovement;
  showNotesByDefault?: boolean;
  className?: string;
  onClick?: () => void;
  onEdit?: (movement: StockMovement) => void;
  onDelete?: (id: string) => void;
  isAdmin?: boolean;
}

export const MovementRow: React.FC<MovementRowProps> = ({
  movement,
  showNotesByDefault = false,
  className = '',
  onClick,
}) => {
  const [expanded, setExpanded] = useState(showNotesByDefault);

  const isEntrada = movement.type === 'entrada';
  const isSaida = movement.type === 'saida';
  const isAjuste = movement.type === 'ajuste';

  // Semantic config based on design system tokens
  const typeConfig = isEntrada
    ? {
        label: 'ENTRADA',
        sign: '+',
        colorText: 'text-status-success',
        badgeBg: 'bg-status-success-bg text-status-success border-status-success-border',
        icon: ArrowDownLeft,
      }
    : isSaida
    ? {
        label: 'SAÍDA',
        sign: '-',
        colorText: 'text-status-info',
        badgeBg: 'bg-status-info-bg text-status-info border-status-info-border',
        icon: ArrowUpRight,
      }
    : {
        label: 'AJUSTE',
        sign: movement.quantity > 0 ? '+' : '',
        colorText: 'text-status-warning',
        badgeBg: 'bg-status-warning-bg text-status-warning border-status-warning-border',
        icon: RefreshCw,
      };

  const Icon = typeConfig.icon;

  // Format date display (e.g. 15/09 às 10:10)
  const formatDateTime = (dateStr: string, timeStr?: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const formattedDate = `${parts[2]}/${parts[1]}`;
        return timeStr ? `${formattedDate} às ${timeStr}` : formattedDate;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const responsiblePerson =
    movement.retrievedBy ||
    movement.receivedBy ||
    movement.responsible ||
    movement.deliveredBy ||
    'Almoxarifado';

  const sectorOrOrigin =
    movement.sector ||
    movement.supplierOrDonor ||
    (isAjuste ? 'Auditoria de Estoque' : 'Geral');

  const hasExtraNotes = Boolean(movement.notes || movement.reason);

  return (
    <div
      onClick={onClick}
      className={`group rounded-lg border border-border-subtle bg-surface hover:border-border-default transition-colors p-3.5 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left Side: Type Badge & Product Title */}
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-bold tracking-wider ${typeConfig.badgeBg}`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{typeConfig.label}</span>
          </span>

          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-text-primary truncate">
              {movement.productName}
            </h4>
            <p className="text-xs text-text-secondary mt-0.5">
              <span>{formatDateTime(movement.date, movement.time)}</span>
              <span className="mx-1.5 opacity-40">·</span>
              <span>{sectorOrOrigin}</span>
              <span className="mx-1.5 opacity-40">·</span>
              <span className="text-text-muted">{responsiblePerson}</span>
            </p>
          </div>
        </div>

        {/* Right Side: Quantity (with tabular-nums) & Expand Toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <span
              className={`text-base font-bold tabular-nums tracking-tight ${typeConfig.colorText}`}
            >
              {typeConfig.sign}
              {movement.quantity} {movement.unit}
            </span>
          </div>

          {hasExtraNotes && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              aria-label="Ver observações"
              className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Context / Notes */}
      {expanded && hasExtraNotes && (
        <div className="mt-2.5 pt-2.5 border-t border-border-subtle text-xs text-text-secondary bg-surface-raised/40 rounded p-2">
          {movement.reason && (
            <p className="mb-1">
              <strong className="text-text-primary">Motivo:</strong> {movement.reason}
            </p>
          )}
          {movement.notes && (
            <p>
              <strong className="text-text-primary">Observação:</strong> {movement.notes}
            </p>
          )}
          {movement.physicalStock !== undefined && movement.previousStock !== undefined && (
            <p className="mt-1 text-text-muted font-mono text-[11px]">
              Saldo anterior: {movement.previousStock} {movement.unit} → Saldo conferido: {movement.physicalStock} {movement.unit} (Diferença: {movement.difference})
            </p>
          )}
        </div>
      )}
    </div>
  );
};
