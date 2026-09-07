import React, { useState, useMemo } from 'react';
import { Product, StockMovement, InventoryAudit } from '../types';
import { getProductStockStatus, calculateDaysRemaining, getProductAutonomyLabel } from '../utils/storage';
import { calculatePurchaseForecast, ForecastPeriodDays } from '../utils/purchaseForecasting';
import {
  Mail,
  Copy,
  Check,
  Download,
  ExternalLink,
  X,
  ShoppingCart,
  Package,
  Layers,
  Calendar,
  Sparkles,
  MessageSquare,
  FileCode,
  Eye,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface StockNewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  movements?: StockMovement[];
  inventoryAudits?: InventoryAudit[];
  userName?: string;
}

export const StockNewsletterModal: React.FC<StockNewsletterModalProps> = ({
  isOpen,
  onClose,
  products,
  movements = [],
  inventoryAudits = [],
  userName = 'Marconi Castro (Gestor do Estoque)',
}) => {
  // Table Mode: both, purchases_only, stock_only
  const [tableMode, setTableMode] = useState<'both' | 'purchases_only' | 'stock_only'>('both');
  const [periodDays, setPeriodDays] = useState<ForecastPeriodDays>(8);
  const [scopeFilter, setScopeFilter] = useState<'all' | 'alert_only'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [customManagerNotes, setCustomManagerNotes] = useState<string>('');
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'html_code'>('preview');

  const recipients = 'estoquecristolandia@gmail.com, humbertohpp.59@gmail.com, chefmarcusviniciuses@gmail.com';

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category)));
  }, [products]);

  // Compute Purchase Forecast
  const forecast = useMemo(() => {
    return calculatePurchaseForecast(
      products,
      movements,
      periodDays,
      inventoryAudits,
      {
        category: categoryFilter,
        onlyNeedsPurchase: scopeFilter === 'alert_only',
      }
    );
  }, [products, movements, periodDays, inventoryAudits, categoryFilter, scopeFilter]);

  // Filter products for the Stock Inventory Table (Table 1)
  const filteredStockProducts = useMemo(() => {
    return products.filter((p) => {
      const isZero = p.currentStock === 0;
      const status = isZero ? 'critical' : getProductStockStatus(p);

      if (categoryFilter !== 'all' && p.category !== categoryFilter) {
        return false;
      }

      if (scopeFilter === 'alert_only' && status === 'normal') {
        return false;
      }

      return true;
    });
  }, [products, scopeFilter, categoryFilter]);

  // Metrics
  const totalCount = products.length;
  const criticalCount = products.filter((p) => p.currentStock === 0 || getProductStockStatus(p) === 'critical').length;
  const warningCount = products.filter((p) => p.currentStock > 0 && getProductStockStatus(p) === 'warning').length;
  const normalCount = products.filter((p) => getProductStockStatus(p) === 'normal').length;

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const emailSubject = useMemo(() => {
    if (tableMode === 'purchases_only') {
      return `[COMPRAS URGENTES] Lista Prioritária (${forecast.purchasesList.length} itens) — Cristolândia LEM (${now.toLocaleDateString('pt-BR')})`;
    }
    if (tableMode === 'stock_only') {
      return `[ESTOQUE ATUAL] Controle & Saldos Físicos — Cristolândia LEM (${now.toLocaleDateString('pt-BR')})`;
    }
    return `[RELATÓRIO EXECUTIVO] Compras Prioritárias & Saldos de Estoque — Cristolândia LEM (${now.toLocaleDateString('pt-BR')})`;
  }, [tableMode, forecast.purchasesList.length, now]);

  // Generate Email HTML directly mirroring the tables in the screenshots
  const newsletterHtml = useMemo(() => {
    // 1. Table 2 HTML: Necessidade de Compras — Lista Prioritária (Espelho do Anexo 2)
    const purchasesRowsHtml = forecast.purchasesList
      .map((item) => {
        const isCritical = item.status === 'CRITICO';
        const statusBg = isCritical ? '#fce7f3' : '#fef3c7';
        const statusColor = isCritical ? '#be185d' : '#b45309';
        const statusDot = isCritical ? '🔴' : '🟡';
        const statusLabel = isCritical ? 'Crítico' : 'Atenção';

        // Autonomy badge style
        let autBg = '#ecfdf5';
        let autColor = '#047857';
        if (item.daysAutonomy <= 3) {
          autBg = '#ffedd5';
          autColor = '#c2410c';
        } else if (item.daysAutonomy <= 7) {
          autBg = '#fef9c3';
          autColor = '#854d0e';
        }

        const projBalanceColor = item.projectedBalance < 0 ? '#dc2626' : '#0f172a';
        const projBalanceWeight = item.projectedBalance < 0 ? '900' : '600';

        return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <!-- Status -->
          <td style="padding: 12px 10px; vertical-align: middle;">
            <span style="display: inline-block; background-color: ${statusBg}; color: ${statusColor}; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 800; white-space: nowrap;">
              ${statusDot} ${statusLabel}
            </span>
          </td>

          <!-- Item / Produto -->
          <td style="padding: 12px 10px; vertical-align: middle;">
            <div style="font-weight: 800; color: #0f172a; font-size: 13px;">
              ${item.name}
              ${
                item.physicalStock !== null && item.inventoryStatus === 'DIVERGENTE'
                  ? `<span style="display: inline-block; background-color: #fef3c7; color: #92400e; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-left: 6px; border: 1px solid #fde68a;">Físico: ${item.physicalStock}</span>`
                  : ''
              }
            </div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">${item.category}</div>
          </td>

          <!-- Estoque Atual -->
          <td style="padding: 12px 10px; vertical-align: middle; font-weight: 800; color: #0f172a; font-size: 13px;">
            ${item.currentStock} ${item.unit}
          </td>

          <!-- Consumo Médio -->
          <td style="padding: 12px 10px; vertical-align: middle; color: #475569; font-size: 11px; font-weight: 600;">
            ${item.consumptionUnitText}
          </td>

          <!-- Autonomia -->
          <td style="padding: 12px 10px; vertical-align: middle; text-align: center;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; background-color: ${autBg}; color: ${autColor}; font-size: 11px; font-weight: 700;">
              ${item.autonomyText}
            </span>
          </td>

          <!-- Cons. Previsto -->
          <td style="padding: 12px 10px; vertical-align: middle; text-align: right; color: #334155; font-size: 12px; font-weight: 600;">
            ${item.projectedConsumption} ${item.unit}
          </td>

          <!-- Saldo Projetado -->
          <td style="padding: 12px 10px; vertical-align: middle; text-align: right; color: ${projBalanceColor}; font-size: 12px; font-weight: ${projBalanceWeight};">
            ${item.projectedBalance} ${item.unit}
          </td>

          <!-- Segurança (3d) -->
          <td style="padding: 12px 10px; vertical-align: middle; text-align: right; color: #4338ca; font-size: 12px; font-weight: 700;">
            ${item.safetyStock} ${item.unit}
          </td>

          <!-- Compra Sugerida -->
          <td style="padding: 12px 10px; vertical-align: middle; text-align: right;">
            <span style="display: inline-block; padding: 5px 12px; border-radius: 9999px; background-color: #ffe4e6; border: 1px solid #fecdd3; color: #e11d48; font-weight: 900; font-size: 12px; white-space: nowrap;">
              +${item.suggestedPurchaseQty} ${item.unit}
            </span>
          </td>
        </tr>
        `;
      })
      .join('');

    const purchasesTableBlock = `
    <div style="margin-bottom: 28px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9;">
        <div>
          <div style="font-size: 15px; font-weight: 900; color: #0f172a; display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 17px;">🛒</span> 1. Necessidade de Compras — Lista Prioritária (${forecast.purchasesList.length} itens)
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            Itens com sugestão de compra no período de ${periodDays} dias ordenados por criticidade.
          </div>
        </div>
        <div style="font-size: 10px; color: #475569; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 10px; font-family: monospace;">
          Fórmula: <strong style="color: #d97706;">Compra = Consumo Previsto + Est. Segurança - Estoque Atual</strong>
        </div>
      </div>

      ${
        forecast.purchasesList.length === 0
          ? `
          <div style="padding: 24px; text-align: center; background-color: #f0fdf4; border-radius: 10px; border: 1px solid #bbf7d0;">
            <div style="font-size: 14px; font-weight: 800; color: #166534;">Estoque 100% Suprido para o Ciclo de ${periodDays} Dias!</div>
            <div style="font-size: 12px; color: #15803d; margin-top: 4px;">Nenhum produto necessita de reposição imediata. Todos os saldos atendem a demanda prevista com margem de segurança.</div>
          </div>
          `
          : `
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; font-family: inherit;">
              <thead>
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                  <th style="padding: 10px 10px;">Status</th>
                  <th style="padding: 10px 10px;">Item / Produto</th>
                  <th style="padding: 10px 10px;">Estoque Atual</th>
                  <th style="padding: 10px 10px;">Consumo Médio</th>
                  <th style="padding: 10px 10px; text-align: center;">Autonomia</th>
                  <th style="padding: 10px 10px; text-align: right;">Cons. Previsto (${periodDays}d)</th>
                  <th style="padding: 10px 10px; text-align: right;">Saldo Projetado</th>
                  <th style="padding: 10px 10px; text-align: right;">Segurança (3d)</th>
                  <th style="padding: 10px 10px; text-align: right;">Compra Sugerida</th>
                </tr>
              </thead>
              <tbody>
                ${purchasesRowsHtml}
              </tbody>
              <tfoot>
                <tr style="background-color: #f8fafc; border-top: 2px solid #e2e8f0; font-weight: 800; color: #0f172a; font-size: 12px;">
                  <td colspan="8" style="padding: 12px 10px; text-align: right; text-transform: uppercase; font-size: 11px; color: #64748b;">
                    Total de Itens com Sugestão de Compra (${forecast.purchasesList.length} itens):
                  </td>
                  <td style="padding: 12px 10px; text-align: right; color: #e11d48; font-weight: 900; font-size: 13px;">
                    ${forecast.totalSuggestedPurchaseUnits} unidades
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          `
      }
    </div>
    `;

    // 2. Table 1 HTML: Controle de Estoque Atual & Saldos Físicos (Espelho do Anexo 1)
    const stockRowsHtml = filteredStockProducts
      .map((p) => {
        const days = calculateDaysRemaining(p);
        const isZero = p.currentStock === 0;
        const status = isZero ? 'critical' : getProductStockStatus(p);

        let statusBg = '#ecfdf5';
        let statusColor = '#047857';
        let statusBorder = '#a7f3d0';
        let statusLabel = 'NORMAL';
        let barColor = '#10b981';

        if (status === 'critical' || isZero) {
          statusBg = '#fef2f2';
          statusColor = '#b91c1c';
          statusBorder = '#fecaca';
          statusLabel = isZero ? 'ZERADO' : 'CRÍTICO';
          barColor = '#ef4444';
        } else if (status === 'warning') {
          statusBg = '#fffbeb';
          statusColor = '#b45309';
          statusBorder = '#fde68a';
          statusLabel = 'ALERTA';
          barColor = '#f59e0b';
        }

        let autonomyColor = '#047857';
        if (days <= 1.5) autonomyColor = '#b91c1c';
        else if (days <= 3) autonomyColor = '#b45309';

        const autonomyText = getProductAutonomyLabel(p);

        // Usage note / frequency text
        const freqText = p.usageFrequency || (p.dailyAvgConsumption ? `Diário (${p.dailyAvgConsumption} ${p.unit}/dia)` : 'Uso Eventual');

        return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <!-- Produto & Categoria -->
          <td style="padding: 12px 12px; vertical-align: middle;">
            <div style="font-weight: 800; color: #0f172a; font-size: 13px;">${p.name}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              <span>${p.category}</span>
              ${freqText ? ` &bull; <span style="color: #b45309; font-weight: 600;">${freqText}</span>` : ''}
            </div>
          </td>

          <!-- Localização -->
          <td style="padding: 12px 12px; vertical-align: middle; color: #475569; font-size: 12px;">
            <span style="display: inline-flex; align-items: center; gap: 4px;">📍 ${p.location || 'Depósito Principal'}</span>
          </td>

          <!-- Saldo Atual com mini-barra indicadora -->
          <td style="padding: 12px 12px; vertical-align: middle; text-align: center;">
            <div style="font-weight: 900; font-size: 14px; color: ${isZero ? '#dc2626' : '#0f172a'};">
              ${p.currentStock} ${p.unit}
            </div>
            <div style="height: 4px; width: 44px; background-color: ${barColor}; border-radius: 2px; margin: 4px auto 0 auto;"></div>
          </td>

          <!-- Mín. Segurança -->
          <td style="padding: 12px 12px; vertical-align: middle; text-align: center; color: #64748b; font-size: 12px; font-weight: 600;">
            ${p.minStock} ${p.unit}
          </td>

          <!-- Autonomia -->
          <td style="padding: 12px 12px; vertical-align: middle; text-align: center;">
            <span style="font-weight: 800; font-size: 13px; color: ${autonomyColor};">
              ${autonomyText}
            </span>
          </td>

          <!-- Status -->
          <td style="padding: 12px 12px; vertical-align: middle; text-align: center;">
            <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 10px; font-weight: 800; background-color: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder}; text-transform: uppercase; letter-spacing: 0.5px;">
              &bull; ${statusLabel}
            </span>
          </td>
        </tr>
        `;
      })
      .join('');

    const stockTableBlock = `
    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9;">
        <div>
          <div style="font-size: 15px; font-weight: 900; color: #0f172a; display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 17px;">📦</span> 2. Controle de Estoque Atual & Saldos Físicos (${filteredStockProducts.length} itens)
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            Saldos em almoxarifado, localização física, ponto de reposição e autonomia calculada.
          </div>
        </div>
        <div style="font-size: 11px; color: #64748b; font-weight: 600;">
          Status Geral: <span style="color: #047857; font-weight: 800;">${normalCount} Normal</span> &bull; <span style="color: #b45309; font-weight: 800;">${warningCount} Alerta</span> &bull; <span style="color: #b91c1c; font-weight: 800;">${criticalCount} Crítico</span>
        </div>
      </div>

      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; font-family: inherit;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
              <th style="padding: 10px 12px;">Produto & Categoria</th>
              <th style="padding: 10px 12px;">Localização</th>
              <th style="padding: 10px 12px; text-align: center;">Saldo Atual</th>
              <th style="padding: 10px 12px; text-align: center;">Mín. Segurança</th>
              <th style="padding: 10px 12px; text-align: center;">Autonomia</th>
              <th style="padding: 10px 12px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${stockRowsHtml}
          </tbody>
        </table>
      </div>
    </div>
    `;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body style="margin: 0; padding: 16px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b; line-height: 1.5;">
  <div style="max-width: 980px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Header Executivo e Direto -->
    <div style="padding: 20px 24px; border-bottom: 1px solid #e2e8f0; background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div>
          <div style="font-size: 11px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.5px;">ALMOXARIFADO CRISTOLÂNDIA &bull; LEM / BA</div>
          <div style="font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 2px;">
            ${
              tableMode === 'purchases_only'
                ? 'Relatório Executivo de Compras & Reposição'
                : tableMode === 'stock_only'
                ? 'Controle de Estoque Atual & Saldos Físicos'
                : 'Relatório Executivo de Compras & Estoque Atual'
            }
          </div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
            Emissão: <strong>${dateFormatted} às ${timeFormatted}</strong> &bull; Responsável: <strong>${userName}</strong>
          </div>
        </div>

        <!-- 3 Badges Executivas Rápidas -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 12px; text-align: center;">
            <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Total Itens</div>
            <div style="font-size: 14px; font-weight: 900; color: #0f172a;">${totalCount}</div>
          </div>
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 6px 12px; text-align: center;">
            <div style="font-size: 10px; color: #dc2626; font-weight: 700; text-transform: uppercase;">Atenção/Crítico</div>
            <div style="font-size: 14px; font-weight: 900; color: #b91c1c;">${criticalCount + warningCount}</div>
          </div>
          <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 6px 12px; text-align: center;">
            <div style="font-size: 10px; color: #c2410c; font-weight: 700; text-transform: uppercase;">Sugestão Compra</div>
            <div style="font-size: 14px; font-weight: 900; color: #ea580c;">${forecast.purchasesList.length} itens</div>
          </div>
        </div>
      </div>

      ${
        customManagerNotes
          ? `
      <div style="margin-top: 14px; padding: 10px 14px; background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 4px; font-size: 12px; color: #166534;">
        <strong>Nota da Gestão:</strong> ${customManagerNotes}
      </div>`
          : ''
      }
    </div>

    <!-- Conteúdo com as Tabelas Selecionadas -->
    <div style="padding: 20px 24px; background-color: #f8fafc;">
      ${tableMode === 'purchases_only' || tableMode === 'both' ? purchasesTableBlock : ''}
      ${tableMode === 'stock_only' || tableMode === 'both' ? stockTableBlock : ''}
    </div>

    <!-- Rodapé Minimalista -->
    <div style="padding: 14px 24px; background-color: #ffffff; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
      <div>Centro de Recuperação Cristolândia — Luís Eduardo Magalhães/BA</div>
      <div>Sistema Integrado de Almoxarifado e Suprimentos</div>
    </div>
  </div>
</body>
</html>`;
  }, [
    tableMode,
    periodDays,
    forecast,
    filteredStockProducts,
    totalCount,
    normalCount,
    warningCount,
    criticalCount,
    userName,
    dateFormatted,
    timeFormatted,
    customManagerNotes,
    emailSubject,
  ]);

  // Clean, Plain Text Version for WhatsApp or Basic Mail
  const plainTextEmail = useMemo(() => {
    let text = `📦 ALMOXARIFADO CRISTOLÂNDIA - LEM/BA\n`;
    text += `📅 ${dateFormatted} às ${timeFormatted}\n`;
    text += `👤 Gestor: ${userName}\n\n`;

    if (customManagerNotes) {
      text += `📝 Observação: ${customManagerNotes}\n\n`;
    }

    if (tableMode === 'purchases_only' || tableMode === 'both') {
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `🛒 1. NECESSIDADE DE COMPRAS (${periodDays} DIAS)\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      if (forecast.purchasesList.length === 0) {
        text += `✅ Nenhum item necessita de compra no período.\n\n`;
      } else {
        forecast.purchasesList.forEach((item) => {
          const statusIcon = item.status === 'CRITICO' ? '🔴' : '🟡';
          text += `${statusIcon} *${item.name}* | Saldo Atual: ${item.currentStock} ${item.unit} | Autonomia: ${item.autonomyText} ➔ *COMPRA: +${item.suggestedPurchaseQty} ${item.unit}*\n`;
          text += `   Previsto (${periodDays}d): ${item.projectedConsumption} ${item.unit} | Segurança: ${item.safetyStock} ${item.unit}\n\n`;
        });
      }
    }

    if (tableMode === 'stock_only' || tableMode === 'both') {
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `📦 2. CONTROLE DE ESTOQUE ATUAL & SALDOS\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      filteredStockProducts.forEach((p) => {
        const isZero = p.currentStock === 0;
        const status = isZero ? 'critical' : getProductStockStatus(p);
        const icon = isZero || status === 'critical' ? '🔴' : status === 'warning' ? '🟡' : '🟢';
        const aut = getProductAutonomyLabel(p);

        text += `${icon} *${p.name}* (${p.category})\n`;
        text += `   📍 Local: ${p.location || 'Depósito'}\n`;
        text += `   📦 Saldo: *${p.currentStock} ${p.unit}* | Mín: ${p.minStock} ${p.unit} | Autonomia: *${aut}*\n\n`;
      });
    }

    text += `Almoxarifado Cristolândia - LEM/BA`;
    return text;
  }, [tableMode, periodDays, forecast, filteredStockProducts, customManagerNotes, userName, dateFormatted, timeFormatted]);

  // Copy Formatted HTML for Gmail / Outlook (Ctrl+V ready)
  const handleCopyRichHtml = async () => {
    try {
      const blobHtml = new Blob([newsletterHtml], { type: 'text/html' });
      const blobText = new Blob([plainTextEmail], { type: 'text/plain' });

      if (typeof ClipboardItem !== 'undefined') {
        const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })];
        await navigator.clipboard.write(data);
      } else {
        await navigator.clipboard.writeText(newsletterHtml);
      }
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 3500);
    } catch (err) {
      console.warn('Fallback clipboard copy:', err);
      try {
        await navigator.clipboard.writeText(newsletterHtml);
        setCopiedHtml(true);
        setTimeout(() => setCopiedHtml(false), 3500);
      } catch {
        alert('Selecione a aba Código HTML para copiar.');
      }
    }
  };

  // Copy plain text for WhatsApp
  const handleCopyPlainText = () => {
    navigator.clipboard.writeText(plainTextEmail);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 3000);
  };

  // Open in Gmail
  const handleOpenGmail = () => {
    const to = encodeURIComponent(recipients);
    const su = encodeURIComponent(emailSubject);
    const body = encodeURIComponent(plainTextEmail);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}`;
    window.open(gmailUrl, '_blank');
  };

  // Download HTML file
  const handleDownloadHtml = () => {
    const blob = new Blob([newsletterHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Tabelas_Estoque_Cristolandia_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                Tabelas Oficiais para E-mail
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Espelho das Telas
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Gera diretamente as tabelas do sistema formatadas em HTML puro para colar no Gmail ou Outlook sem perder nitidez.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls & Format Selector */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* Table Selection Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
              <button
                onClick={() => setTableMode('both')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  tableMode === 'both'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                Ambas as Tabelas
              </button>

              <button
                onClick={() => setTableMode('purchases_only')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  tableMode === 'purchases_only'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5 text-rose-500" />
                1. Necessidade de Compras
              </button>

              <button
                onClick={() => setTableMode('stock_only')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                  tableMode === 'stock_only'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Package className="w-3.5 h-3.5 text-emerald-500" />
                2. Estoque Atual & Saldos
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleCopyRichHtml}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm ${
                  copiedHtml
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950 hover:shadow-md'
                }`}
              >
                {copiedHtml ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedHtml ? 'Tabela Copiada! Dê Ctrl+V no E-mail' : 'Copiar Tabela para Gmail / Outlook'}
              </button>

              <button
                onClick={handleCopyPlainText}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  copiedText
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="Copiar versão formatada em texto para WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                {copiedText ? 'Copiado WhatsApp!' : 'WhatsApp'}
              </button>

              <button
                onClick={handleOpenGmail}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Abrir composição no Gmail"
              >
                <ExternalLink className="w-3.5 h-3.5 text-rose-500" />
                Abrir Gmail
              </button>

              <button
                onClick={handleDownloadHtml}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Baixar arquivo HTML"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filtering & Options Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            {/* Period selector for purchases */}
            <div className="flex items-center gap-1 text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Ciclo de Compras:</span>
              <select
                value={periodDays}
                onChange={(e) => setPeriodDays(Number(e.target.value) as ForecastPeriodDays)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden"
              >
                <option value={7}>7 dias (Semanal)</option>
                <option value={8}>8 dias (Padrão Cristolândia)</option>
                <option value={15}>15 dias (Quinzenal)</option>
                <option value={30}>30 dias (Mensal)</option>
              </select>
            </div>

            {/* Scope Filter */}
            <div className="flex items-center gap-1 text-slate-500">
              <span>Filtrar Itens:</span>
              <select
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value as 'all' | 'alert_only')}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden"
              >
                <option value="all">Todos os Produtos ({totalCount})</option>
                <option value="alert_only">Apenas Alerta / Crítico ({criticalCount + warningCount})</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1 text-slate-500">
              <span>Categoria:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden"
              >
                <option value="all">Todas as Categorias</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Manager Note */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={customManagerNotes}
                onChange={(e) => setCustomManagerNotes(e.target.value)}
                placeholder="Observação da gestão para o e-mail (opcional)..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* View Mode Toggle: Preview vs HTML */}
        <div className="px-5 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-colors ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Visualização Direta da Tabela
            </button>
            <button
              onClick={() => setActiveTab('html_code')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-colors ${
                activeTab === 'html_code'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Código HTML Puro
            </button>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
            {copiedHtml && (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">
                ✓ Tabela pronta na área de transferência! Abra o e-mail e cole (Ctrl+V).
              </span>
            )}
          </div>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950">
          {activeTab === 'preview' ? (
            <div className="max-w-4xl mx-auto">
              <div
                className="bg-white text-slate-900 rounded-2xl shadow-md border border-slate-200 overflow-hidden"
                dangerouslySetInnerHTML={{ __html: newsletterHtml }}
              />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Código HTML Inlined (Compatível com Gmail, Outlook e Apple Mail):
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(newsletterHtml);
                    setCopiedHtml(true);
                    setTimeout(() => setCopiedHtml(false), 3000);
                  }}
                  className="text-xs font-bold text-amber-500 hover:text-amber-600 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copiar Código
                </button>
              </div>
              <pre className="p-4 bg-slate-900 text-slate-200 rounded-2xl text-xs font-mono overflow-x-auto max-h-[60vh] border border-slate-800">
                {newsletterHtml}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 dark:text-slate-400 text-center sm:text-left">
            <span>Destinatários sugeridos: </span>
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{recipients}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Fechar
            </button>
            <button
              onClick={handleCopyRichHtml}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black transition-all shadow-sm"
            >
              <Copy className="w-4 h-4" />
              {copiedHtml ? 'Copiado!' : 'Copiar Tabela para E-mail'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
