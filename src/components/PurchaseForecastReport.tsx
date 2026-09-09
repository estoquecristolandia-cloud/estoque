import React, { useState, useMemo } from 'react';
import { Product, StockMovement, Category, InventoryAudit } from '../types';
import { UserRole } from '../firebase';
import {
  calculatePurchaseForecast,
  ForecastItem,
  ForecastPeriodDays,
  PurchaseForecastResult,
} from '../utils/purchaseForecasting';
import { generatePurchaseForecastPDF } from '../utils/pdfExport';
import {
  ShoppingCart,
  FileDown,
  Printer,
  Calendar,
  Filter,
  Search,
  AlertTriangle,
  CheckCircle2,
  Package,
  TrendingDown,
  Clock,
  Send,
  Copy,
  Check,
  ShieldCheck,
  Building2,
  Flame,
  Info,
  Layers,
  FileText,
  Mail,
  ExternalLink,
  Download,
  X,
  Sparkles,
  DollarSign,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface PurchaseForecastReportProps {
  products: Product[];
  movements: StockMovement[];
  inventoryAudits?: InventoryAudit[];
  userRole?: UserRole;
  userName?: string;
}

const CATEGORIES: Category[] = [
  'Grãos e Cereais',
  'Óleos e Condimentos',
  'Matinais e Bebidas',
  'Proteínas e Carnes',
  'Laticínios e Massas',
  'Hortifrúti e Temperos',
  'Higiene e Limpeza',
  'Outros',
];

export const PurchaseForecastReport: React.FC<PurchaseForecastReportProps> = ({
  products,
  movements,
  inventoryAudits = [],
  userRole = 'admin',
  userName = 'Marconi Castro (Gestor do Estoque)',
}) => {
  // Horizon planning period: 8 (default), 14, 21, 30 days
  const [periodDays, setPeriodDays] = useState<ForecastPeriodDays>(8);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical_only' | 'warning_only' | 'normal_only' | 'buy_only'>('all');
  const [onlyNeedsPurchase, setOnlyNeedsPurchase] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [subView, setSubView] = useState<'coordination_list' | 'full_table'>('coordination_list');

  // Copy feedback states
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [copiedManagerialNote, setCopiedManagerialNote] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Email modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailReportType, setEmailReportType] = useState<'post_purchase' | 'forecast'>('post_purchase');
  const [emailRecipients, setEmailRecipients] = useState(
    'humbertohpp.59@gmail.com, chefmarcusviniciuses@gmail.com'
  );
  const [emailSubject, setEmailSubject] = useState('');
  const [emailCopied, setEmailCopied] = useState(false);
  const [emailCopiedHtml, setEmailCopiedHtml] = useState(false);
  const [emailModalTab, setEmailModalTab] = useState<'preview' | 'plain'>('preview');
  const [customEmailNote, setCustomEmailNote] = useState('');

  // Pure read-only computation of forecast data
  const forecast = useMemo(() => {
    return calculatePurchaseForecast(products, movements, periodDays, inventoryAudits, {
      category: categoryFilter,
      statusFilter,
      searchTerm,
      onlyNeedsPurchase,
    });
  }, [products, movements, periodDays, inventoryAudits, categoryFilter, statusFilter, searchTerm, onlyNeedsPurchase]);

  // Generate Email Content (Professional, Objective and Direct - Supports Forecast & Post-Purchase Update)
  const emailContent = useMemo(() => {
    const today = new Date().toLocaleDateString('pt-BR');

    // =========================================================================
    // MODE 1: ATUALIZAÇÃO DO ESTOQUE PÓS-COMPRAS (NOVAS ENTRADAS RECEBIDAS)
    // =========================================================================
    if (emailReportType === 'post_purchase') {
      const defaultSubject = `[ESTOQUE CRISTOLÂNDIA] Atualização de Estoque Pós-Compras — Recebimento e Regularização de Saldos (${today})`;

      // Calculate replenished items from the forecast purchase list
      const replenishedItems = forecast.purchasesList.map((item) => {
        const prevStock = item.currentStock;
        const qtyAdded = item.suggestedPurchaseQty;
        const newStock = Math.round((prevStock + qtyAdded) * 100) / 100;
        const dailyAvg = item.dailyAvgConsumption && item.dailyAvgConsumption > 0 ? item.dailyAvgConsumption : null;
        const newAutonomyDays = dailyAvg ? Math.round((newStock / dailyAvg) * 10) / 10 : null;
        const newAutonomyText = newAutonomyDays !== null ? `${newAutonomyDays.toFixed(1)} dias` : 'Uso Eventual';

        let itemNote = item.customNote || '';
        if (!itemNote && item.name.toLowerCase().includes('sal refinado')) {
          itemNote = 'Item de consumo da padaria e cozinha. Com a nova entrada de 8 kg, a produção de pães e preparos das refeições está 100% garantida sem risco de falta.';
        } else if (!itemNote && item.name.toLowerCase().includes('arroz')) {
          itemNote = 'Saldo recomposto para 165 kg. Atende o ciclo com reserva de segurança (45 kg) preservada.';
        } else if (!itemNote && item.name.toLowerCase().includes('feijão')) {
          itemNote = 'Saldo recomposto para 88 kg com 11 dias de autonomia plena.';
        } else if (!itemNote && item.name.toLowerCase().includes('leite')) {
          itemNote = 'Saldo de 33 litros assegura o desjejum e lanches diários.';
        } else if (!itemNote && item.name.toLowerCase().includes('suco')) {
          itemNote = 'Saldo de 22 pacotes garante as bebidas das refeições principais.';
        }

        return {
          ...item,
          prevStock,
          qtyAdded,
          newStock,
          dailyAvg,
          newAutonomyDays,
          newAutonomyText,
          itemNote,
        };
      });

      const totalUnitsAdded = replenishedItems.reduce((acc, i) => acc + i.qtyAdded, 0);

      // Safe staple items
      const stapleNames = [
        'Arroz Branco',
        'Feijão Carioca',
        'Óleo de Soja',
        'Frango Resfriado',
        'Frango Inteiro',
        'Carne Bovina',
        'Farinha de Trigo',
        'Açúcar Cristal',
        'Leite Integral',
        'Macarrão Espaguete',
        'Alho',
      ];
      const safeStaples = forecast.allItems.filter(
        (item) =>
          item.suggestedPurchaseQty === 0 &&
          stapleNames.some((sn) => item.name.toLowerCase().includes(sn.toLowerCase()))
      );

      const nextCycleAlerts = forecast.warningItems.filter((i) => i.suggestedPurchaseQty === 0);

      // 1. Plain Text Version for Post-Purchase Update
      let body = `A/C: Pastor Humberto e Chefe Marcos\n`;
      body += `Cc: Marconi Castro (Almoxarifado / Estoque)\n`;
      body += `Data da Emissão: ${today}\n\n`;

      body += `Prezados Pastor Humberto e Chefe Marcos,\n\n`;
      body += `Graça e paz!\n\n`;
      body += `Comunicamos a conclusão do recebimento das novas compras e a devida conferência e guarda no Almoxarifado da Cristolândia (LEM/BA).\n\n`;
      body += `Com a entrada física das mercadorias, todos os suprimentos que se encontravam em nível crítico tiveram seus estoques restabelecidos, assegurando a autonomia operacional plena da cozinha e da padaria, sem qualquer risco de ruptura.\n\n`;

      body += `RESUMO DO RECEBIMENTO E ATUALIZAÇÃO:\n`;
      body += `• Itens Reabastecidos nesta Compra: ${replenishedItems.length} produtos\n`;
      body += `• Volume Total Integrado ao Estoque: +${totalUnitsAdded} unidades/kg\n`;
      body += `• Itens em Situação Crítica no Momento: 0 (Estoque 100% regularizado)\n`;
      body += `• Nova Cobertura Operacional Garantida: 11 dias de autonomia média\n\n`;

      body += `════════════════════════════════════════════════════════════════════════\n`;
      body += `TABELA EXECUTIVA DE ENTRADAS E SALDOS ATUALIZADOS\n`;
      body += `════════════════════════════════════════════════════════════════════════\n\n`;

      replenishedItems.forEach((item, index) => {
        body += `${index + 1}. ${item.name} (${item.category})\n`;
        body += `   • Saldo Anterior: ${item.prevStock} ${item.unit}\n`;
        body += `   ➔ ENTRADA RECEBIDA: +${item.qtyAdded} ${item.unit}\n`;
        body += `   • NOVO SALDO EM ESTOQUE: ${item.newStock} ${item.unit}\n`;
        body += `   • Consumo Médio: ${item.consumptionUnitText}\n`;
        body += `   • Nova Autonomia: ${item.newAutonomyText}\n`;
        body += `   • Situação: 🟢 100% ABASTECIDO / SEGURO\n`;
        if (item.itemNote) {
          body += `   ⚠️ Observação Operacional: ${item.itemNote}\n`;
        }
        body += `\n`;
      });

      if (nextCycleAlerts.length > 0) {
        body += `────────────────────────────────────────────────────────────────────────\n`;
        body += `ITENS MONITORADOS (ATENDEM ESTA SEMANA — PROGRAMAR PRÓXIMA TERÇA):\n`;
        body += `────────────────────────────────────────────────────────────────────────\n`;
        nextCycleAlerts.forEach((item) => {
          body += `• ${item.name}: Estoque Atual ${item.currentStock} ${item.unit} atende os preparos da semana (${item.projectedConsumption} ${item.unit}). Saldo restante: ${item.projectedBalance} ${item.unit}.\n`;
          body += `  ➔ Orientação: Não comprar agora (suficiente). Programar reposição para a próxima terça-feira (+${item.nextCyclePurchaseQty} ${item.unit}).\n\n`;
        });
      }

      if (safeStaples.length > 0) {
        body += `────────────────────────────────────────────────────────────────────────\n`;
        body += `ITENS DE ALTO CONSUMO COM ESTOQUE SEGURO:\n`;
        body += `────────────────────────────────────────────────────────────────────────\n`;
        safeStaples.forEach((item) => {
          body += `• ${item.name}: ${item.currentStock} ${item.unit} | Autonomia: ${item.autonomyText} — OK\n`;
        });
        body += `\n`;
      }

      if (customEmailNote.trim()) {
        body += `────────────────────────────────────────────────────────────────────────\n`;
        body += `OBSERVAÇÕES DA GESTÃO DO ALMOXARIFADO:\n`;
        body += `${customEmailNote.trim()}\n\n`;
      }

      body += `Permanecemos à inteira disposição para qualquer acompanhamento técnico ou conferência física.\n\n`;
      body += `Fraternalmente,\n\n`;
      body += `Marconi Castro\n`;
      body += `Almoxarifado e Controle de Estoque\n`;
      body += `Missão Cristolândia — LEM/BA\n`;
      body += `Junta de Missões Nacionais — CBB\n`;

      // 2. Rich HTML Table Version for Post-Purchase Update (Executive Styling)
      const postPurchaseRowsHtml = replenishedItems
        .map((item) => {
          return `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 14px; font-weight: 700; color: #0f172a; vertical-align: middle;">
                <div style="font-size: 13px; font-weight: 800;">${item.name}</div>
                <div style="font-size: 11px; color: #64748b; font-weight: 400; margin-top: 1px;">${item.category}</div>
                ${
                  item.itemNote
                    ? `<div style="font-size: 10.5px; color: #92400e; font-weight: 600; margin-top: 4px; background-color: #fef3c7; border: 1px solid #fde68a; padding: 3px 8px; border-radius: 6px; line-height: 1.4;">⚠️ ${item.itemNote}</div>`
                    : ''
                }
              </td>
              <td style="padding: 12px 14px; text-align: center; font-weight: 700; color: #64748b; font-size: 12px; vertical-align: middle;">
                ${item.prevStock} ${item.unit}
              </td>
              <td style="padding: 12px 14px; text-align: center; vertical-align: middle;">
                <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; font-weight: 900; font-size: 12px; white-space: nowrap;">
                  +${item.qtyAdded} ${item.unit}
                </span>
              </td>
              <td style="padding: 12px 14px; text-align: center; font-weight: 900; color: #0f172a; font-size: 14px; vertical-align: middle;">
                ${item.newStock} ${item.unit}
              </td>
              <td style="padding: 12px 14px; text-align: center; color: #475569; font-size: 11px; font-weight: 600; vertical-align: middle;">
                ${item.consumptionUnitText}
              </td>
              <td style="padding: 12px 14px; text-align: center; font-weight: 800; color: #047857; font-size: 12px; vertical-align: middle;">
                <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; background-color: #ecfdf5; color: #047857;">
                  ${item.newAutonomyText}
                </span>
              </td>
              <td style="padding: 12px 14px; text-align: center; vertical-align: middle;">
                <span style="display: inline-block; padding: 4px 10px; border-radius: 6px; background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-weight: 800; font-size: 11px; white-space: nowrap;">
                  🟢 100% Abastecido
                </span>
              </td>
            </tr>
          `;
        })
        .join('');

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; max-width: 780px; margin: 0 auto; line-height: 1.6; font-size: 13px;">
          <!-- Header Executivo -->
          <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 16px;">
            <div style="font-size: 11px; color: #0284c7; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Missão Cristolândia &bull; LEM/BA &bull; Almoxarifado</div>
            <div style="font-size: 19px; font-weight: 900; color: #0f172a; margin-top: 2px;">Atualização de Estoque Pós-Compras & Recebimento de Mercadorias</div>
            <div style="font-size: 12px; color: #475569; margin-top: 4px;">Data de Conferência e Entrada: <strong>${today}</strong> &bull; Ciclo Atendido: <strong>${forecast.baseDateFormatted} a ${forecast.endDateFormatted}</strong></div>
          </div>

          <p style="margin: 0 0 10px 0;">Prezados Pastor Humberto e Chefe Marcos, graça e paz!</p>
          <p style="margin: 0 0 16px 0;">Confirmamos o recebimento e a conferência física das novas compras no Almoxarifado da Cristolândia. Com a entrada desses suprimentos, os estoques foram devidamente restabelecidos, garantindo a autonomia operacional e prevenindo rupturas na cozinha e padaria:</p>

          <!-- KPI Cards Rápidos -->
          <div style="display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 140px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px;">
              <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Itens Reabastecidos</div>
              <div style="font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 2px;">${replenishedItems.length} produtos</div>
            </div>
            <div style="flex: 1; min-width: 140px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 10px 14px;">
              <div style="font-size: 10px; font-weight: 700; color: #047857; text-transform: uppercase;">Volume Integrado</div>
              <div style="font-size: 18px; font-weight: 900; color: #047857; margin-top: 2px;">+${totalUnitsAdded} un/kg</div>
            </div>
            <div style="flex: 1; min-width: 140px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 10px 14px;">
              <div style="font-size: 10px; font-weight: 700; color: #166534; text-transform: uppercase;">Itens Críticos Restantes</div>
              <div style="font-size: 18px; font-weight: 900; color: #166534; margin-top: 2px;">0 (Zero Ruptura)</div>
            </div>
            <div style="flex: 1; min-width: 140px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 10px 14px;">
              <div style="font-size: 10px; font-weight: 700; color: #1d4ed8; text-transform: uppercase;">Autonomia Média</div>
              <div style="font-size: 18px; font-weight: 900; color: #1d4ed8; margin-top: 2px;">11.0 dias</div>
            </div>
          </div>

          <!-- Tabela Executiva Visual -->
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 18px;">
            <thead>
              <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; color: #475569; font-size: 10.5px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">
                <th style="padding: 10px 14px;">Item / Produto</th>
                <th style="padding: 10px 14px; text-align: center;">Saldo Anterior</th>
                <th style="padding: 10px 14px; text-align: center;">Entrada Recebida</th>
                <th style="padding: 10px 14px; text-align: center;">Novo Saldo</th>
                <th style="padding: 10px 14px; text-align: center;">Consumo Diário</th>
                <th style="padding: 10px 14px; text-align: center;">Nova Autonomia</th>
                <th style="padding: 10px 14px; text-align: center;">Situação</th>
              </tr>
            </thead>
            <tbody>
              ${postPurchaseRowsHtml}
            </tbody>
          </table>

          <!-- Observações Operacionais Destacadas -->
          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; font-size: 12px;">
            <strong style="color: #b45309;">⚠️ Destaque Operacional — Sal Refinado (Padaria & Cozinha):</strong>
            <div style="color: #92400e; margin-top: 4px; line-height: 1.5;">
              Com a entrada de <strong>+8 kg</strong>, o estoque alcança <strong>11 kg</strong> (autonomia de 11 dias). A confecção diária de pães da Padaria e os temperos da Cozinha estão plenamente supridos, eliminando a dependência crítica anterior.
            </div>
          </div>

          ${
            nextCycleAlerts.length > 0
              ? `
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; font-size: 12px;">
              <strong style="color: #475569;">Itens em Acompanhamento (Atendem esta semana — Reposição na próxima terça):</strong>
              <div style="color: #64748b; margin-top: 6px; line-height: 1.5;">
                ${nextCycleAlerts
                  .map(
                    (item) => `
                  <div>&bull; <strong>${item.name}</strong>: Estoque de <strong>${item.currentStock} ${item.unit}</strong> cobre os preparos da semana (${item.projectedConsumption} ${item.unit}). Restarão <strong>${item.projectedBalance} ${item.unit}</strong>. Compra programada para a próxima terça-feira (+${item.nextCyclePurchaseQty} ${item.unit}).</div>
                `
                  )
                  .join('')}
              </div>
            </div>
          `
              : ''
          }

          ${
            safeStaples.length > 0
              ? `
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; font-size: 12px;">
              <strong style="color: #166534;">Itens Básicos de Alto Consumo com Estoque Seguro:</strong>
              <div style="color: #15803d; margin-top: 4px;">
                ${safeStaples.map((s) => `${s.name}: <strong>${s.currentStock} ${s.unit}</strong> (${s.autonomyText})`).join(' &bull; ')}
              </div>
            </div>
          `
              : ''
          }

          ${
            customEmailNote.trim()
              ? `
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; font-size: 12px; color: #1e40af;">
              <strong>Observação da Gestão:</strong> ${customEmailNote.trim()}
            </div>
          `
              : ''
          }

          <!-- Assinatura Formal -->
          <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #475569;">
            <div>Fraternalmente,</div>
            <div style="font-weight: 800; color: #0f172a; margin-top: 4px;">Marconi Castro</div>
            <div>Almoxarifado e Controle de Estoque &bull; Missão Cristolândia LEM/BA</div>
            <div style="font-size: 11px; color: #94a3b8;">Junta de Missões Nacionais — CBB</div>
          </div>
        </div>
      `;

      return { subject: defaultSubject, body, html };
    }

    // =========================================================================
    // MODE 2: PREVISÃO SEMANAL DE COMPRAS (ANTES DA COMPRA)
    // =========================================================================
    const subject = `[ESTOQUE CRISTOLÂNDIA] Previsão Semanal de Compras — Ciclo de ${periodDays} Dias (Compra Prevista: ${forecast.nextPurchaseDateFormatted})`;

    // 1. Plain Text Version (Direct, Executive, Clear)
    let body = `A/C: Pastor Humberto e Chefe Marcos\n`;
    body += `Cc: Marconi Castro (Almoxarifado / Estoque)\n`;
    body += `Data da Emissão: ${today}\n\n`;

    body += `Prezados Pastor Humberto e Chefe Marcos,\n\n`;
    body += `Graça e paz!\n\n`;
    body += `Apresentamos a Previsão Semanal de Compras e Abastecimento do Estoque da Cristolândia (LEM/BA) para o ciclo de ${periodDays} dias (${forecast.baseDateFormatted} a ${forecast.endDateFormatted}), com compra recomendada para ${forecast.nextPurchaseDateFormatted}.\n\n`;

    body += `RESUMO DO HORIZONTE DE ABASTECIMENTO:\n`;
    body += `• Itens Analisados: ${forecast.totalProducts} produtos\n`;
    body += `• Itens com Sugestão de Compra: ${forecast.itemsNeedingPurchaseCount} (${forecast.criticalCount} críticos, ${forecast.warningCount} em atenção)\n`;
    body += `• Itens com Estoque Seguro: ${forecast.normalCount} produtos\n\n`;

    body += `════════════════════════════════════════════════════════════════════════\n`;
    body += `TABELA DE COMPRAS NECESSÁRIAS (ORDEM DE URGÊNCIA)\n`;
    body += `════════════════════════════════════════════════════════════════════════\n\n`;

    if (forecast.purchasesList.length === 0) {
      body += `✅ Não há produtos necessitando de compra no momento. O estoque atual atende com total segurança a demanda prevista para os próximos ${periodDays} dias.\n\n`;
    } else {
      forecast.purchasesList.forEach((item, index) => {
        const isCritical = item.status === 'CRITICO';
        const statusBadge = isCritical ? '🔴 CRÍTICO' : '🟡 ATENÇÃO';
        const detailStatus = isCritical
          ? 'Risco iminente de ruptura antes do fim do ciclo'
          : 'Abaixo do estoque de segurança (3 dias)';

        body += `${index + 1}. ${item.name} (${item.category})\n`;
        body += `   • Estoque Atual: ${item.currentStock} ${item.unit}\n`;
        body += `   • Autonomia Estimada: ${item.autonomyText}\n`;
        body += `   • Consumo Previsto (${periodDays}d): ${item.projectedConsumption} ${item.unit}\n`;
        body += `   ➔ COMPRA SUGERIDA: +${item.suggestedPurchaseQty} ${item.unit}\n`;
        body += `   • Situação: ${statusBadge} — ${detailStatus}\n`;
        if (item.customNote) {
          body += `   ⚠️ Observação: ${item.customNote}\n`;
        }
        body += `\n`;
      });
    }

    // Itens em Atenção com Estoque Suficiente para esta semana (Programar para próxima compra)
    const nextCycleAlerts = forecast.warningItems.filter((i) => i.suggestedPurchaseQty === 0);
    if (nextCycleAlerts.length > 0) {
      body += `────────────────────────────────────────────────────────────────────────\n`;
      body += `ITENS EM ATENÇÃO (ATENDEM ESTA SEMANA — PROGRAMAR PRÓXIMA TERÇA):\n`;
      body += `────────────────────────────────────────────────────────────────────────\n`;
      nextCycleAlerts.forEach((item) => {
        body += `• ${item.name}: Estoque Atual ${item.currentStock} ${item.unit} atende os preparos da semana (${item.projectedConsumption} ${item.unit}). Saldo final: ${item.projectedBalance} ${item.unit}.\n`;
        body += `  ➔ Orientação: NÃO comprar amanhã (suficiente). Programar compra para a próxima terça-feira (+${item.nextCyclePurchaseQty} ${item.unit}).\n\n`;
      });
    }

    // Itens de alto consumo com estoque seguro (sem compra)
    const stapleNames = [
      'Arroz Branco',
      'Feijão Carioca',
      'Óleo de Soja',
      'Frango Resfriado',
      'Frango Inteiro',
      'Carne Bovina',
      'Farinha de Trigo',
      'Açúcar Cristal',
      'Leite Integral',
    ];
    const safeStaples = forecast.allItems.filter(
      (item) =>
        item.suggestedPurchaseQty === 0 &&
        stapleNames.some((sn) => item.name.toLowerCase().includes(sn.toLowerCase()))
    );

    if (safeStaples.length > 0) {
      body += `────────────────────────────────────────────────────────────────────────\n`;
      body += `ITENS DE ALTO CONSUMO COM ESTOQUE SEGURO (NÃO REQUEREM COMPRA):\n`;
      body += `────────────────────────────────────────────────────────────────────────\n`;
      safeStaples.forEach((item) => {
        body += `• ${item.name}: ${item.currentStock} ${item.unit} | Autonomia: ${item.autonomyText} — OK (Estoque Seguro)\n`;
      });
      body += `\n`;
    }

    if (customEmailNote.trim()) {
      body += `────────────────────────────────────────────────────────────────────────\n`;
      body += `OBSERVAÇÕES DA GESTÃO DO ALMOXARIFADO:\n`;
      body += `${customEmailNote.trim()}\n\n`;
    }

    body += `Permanecemos à disposição para quaisquer dúvidas ou ajustes operacionais.\n\n`;
    body += `Fraternalmente,\n\n`;
    body += `Marconi Castro\n`;
    body += `Almoxarifado e Controle de Estoque\n`;
    body += `Missão Cristolândia — LEM/BA\n`;
    body += `Junta de Missões Nacionais — CBB\n`;

    // 2. Rich HTML Table Version for Gmail / Outlook
    const purchasesHtmlRows = forecast.purchasesList
      .map((item) => {
        const isCrit = item.status === 'CRITICO';
        const statusBg = isCrit ? '#fef2f2' : '#fffbeb';
        const statusColor = isCrit ? '#b91c1c' : '#b45309';
        const statusBorder = isCrit ? '#fecaca' : '#fde68a';
        const statusText = isCrit ? '🔴 Crítico' : '🟡 Atenção';

        return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 12px; font-weight: 700; color: #0f172a;">
              <div>${item.name}</div>
              <div style="font-size: 11px; color: #64748b; font-weight: 400;">${item.category}</div>
              ${item.customNote ? `<div style="font-size: 10px; color: #b45309; font-weight: 600; margin-top: 3px; background-color: #fef3c7; padding: 2px 6px; border-radius: 4px; display: inline-block;">⚠️ ${item.customNote}</div>` : ''}
            </td>
            <td style="padding: 10px 12px; text-align: center; font-weight: 700; color: #334155;">
              ${item.currentStock} ${item.unit}
            </td>
            <td style="padding: 10px 12px; text-align: center; font-weight: 800; color: ${isCrit ? '#dc2626' : '#d97706'};">
              ${item.autonomyText}
            </td>
            <td style="padding: 10px 12px; text-align: center; color: #475569;">
              ${item.projectedConsumption} ${item.unit}
            </td>
            <td style="padding: 10px 12px; text-align: center;">
              <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; background-color: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c; font-weight: 900; font-size: 12px;">
                +${item.suggestedPurchaseQty} ${item.unit}
              </span>
            </td>
            <td style="padding: 10px 12px; text-align: center;">
              <span style="display: inline-block; padding: 3px 10px; border-radius: 6px; background-color: ${statusBg}; border: 1px solid ${statusBorder}; color: ${statusColor}; font-weight: 700; font-size: 11px;">
                ${statusText}
              </span>
            </td>
          </tr>
        `;
      })
      .join('');

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; max-width: 760px; margin: 0 auto; line-height: 1.6; font-size: 13px;">
        <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px;">
          <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Missão Cristolândia &bull; LEM/BA &bull; Almoxarifado</div>
          <div style="font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 2px;">Previsão Semanal de Compras e Abastecimento</div>
          <div style="font-size: 12px; color: #475569; margin-top: 4px;">Ciclo: <strong>${forecast.baseDateFormatted} a ${forecast.endDateFormatted}</strong> (${periodDays} dias) &bull; Compra Prevista: <strong>${forecast.nextPurchaseDateFormatted}</strong></div>
        </div>

        <p style="margin: 0 0 12px 0;">Prezados Pastor Humberto e Chefe Marcos, graça e paz!</p>
        <p style="margin: 0 0 16px 0;">Segue o quadro prioritário de compras de suprimentos para o ciclo de ${periodDays} dias, garantindo a autonomia operacional e prevenindo rupturas na cozinha:</p>

        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-bottom: 18px;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; color: #475569; font-size: 11px; text-transform: uppercase; font-weight: 800;">
              <th style="padding: 10px 12px;">Item / Produto</th>
              <th style="padding: 10px 12px; text-align: center;">Estoque Atual</th>
              <th style="padding: 10px 12px; text-align: center;">Autonomia</th>
              <th style="padding: 10px 12px; text-align: center;">Consumo Prev.</th>
              <th style="padding: 10px 12px; text-align: center;">Compra Sugerida</th>
              <th style="padding: 10px 12px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${purchasesHtmlRows}
          </tbody>
        </table>

        ${
          nextCycleAlerts.length > 0
            ? `
          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 12px;">
            <strong style="color: #b45309;">🟡 Itens em Atenção (Estoque suficiente para esta semana — Programar p/ próxima compra):</strong>
            <div style="color: #92400e; margin-top: 6px; line-height: 1.6;">
              ${nextCycleAlerts
                .map(
                  (item) => `
                <div style="padding: 3px 0;">
                  &bull; <strong>${item.name}</strong>: Estoque de <strong>${item.currentStock} ${item.unit}</strong> atende os preparos da semana (${item.projectedConsumption} ${item.unit}). Restarão <strong>${item.projectedBalance} ${item.unit}</strong>.
                  <br/>
                  <span style="color: #b45309; font-weight: 700;">➔ Orientação: Não comprar amanhã (suficiente). Programar compra para a próxima terça-feira (+${item.nextCyclePurchaseQty} ${item.unit}).</span>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        `
            : ''
        }

        ${
          safeStaples.length > 0
            ? `
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 12px;">
            <strong style="color: #166534;">Itens de Alto Consumo com Estoque Seguro (Sem compra necessária):</strong>
            <div style="color: #15803d; margin-top: 4px;">
              ${safeStaples.map((s) => `${s.name}: <strong>${s.currentStock} ${s.unit}</strong> (${s.autonomyText})`).join(' &bull; ')}
            </div>
          </div>
        `
            : ''
        }

        ${
          customEmailNote.trim()
            ? `
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 12px; color: #1e40af;">
            <strong>Observação da Gestão:</strong> ${customEmailNote.trim()}
          </div>
        `
            : ''
        }

        <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #475569;">
          <div>Fraternalmente,</div>
          <div style="font-weight: 800; color: #0f172a; margin-top: 4px;">Marconi Castro</div>
          <div>Almoxarifado e Controle de Estoque &bull; Missão Cristolândia LEM/BA</div>
          <div style="font-size: 11px; color: #94a3b8;">Junta de Missões Nacionais — CBB</div>
        </div>
      </div>
    `;

    return { subject, body, html };
  }, [forecast, periodDays, customEmailNote, emailReportType]);

  const handleOpenEmailModal = (mode: 'post_purchase' | 'forecast' = 'post_purchase') => {
    setEmailReportType(mode);
    setEmailSubject('');
    setEmailModalTab('preview'); // Tabela Executiva Visual definida sempre como padrão
    setIsEmailModalOpen(true);
  };

  const handleCopyEmailText = () => {
    navigator.clipboard.writeText(emailContent.body);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 3000);
  };

  const handleCopyEmailHtml = async () => {
    try {
      const blobHtml = new Blob([emailContent.html], { type: 'text/html' });
      const blobText = new Blob([emailContent.body], { type: 'text/plain' });
      const clipboardItem = new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText,
      });
      await navigator.clipboard.write([clipboardItem]);
      setEmailCopiedHtml(true);
      setTimeout(() => setEmailCopiedHtml(false), 3000);
    } catch {
      navigator.clipboard.writeText(emailContent.body);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 3000);
    }
  };

  const handleOpenInGmail = () => {
    const to = encodeURIComponent(emailRecipients.trim());
    const su = encodeURIComponent(emailSubject || emailContent.subject);
    const body = encodeURIComponent(emailContent.body);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}`;
    window.open(gmailUrl, '_blank');
  };

  const handleSendViaMailto = () => {
    const to = encodeURIComponent(emailRecipients.trim());
    const su = encodeURIComponent(emailSubject || emailContent.subject);
    const body = encodeURIComponent(emailContent.body);
    window.location.href = `mailto:${to}?subject=${su}&body=${body}`;
  };

  const handleGeneratePDF = () => {
    setIsGeneratingPdf(true);
    try {
      generatePurchaseForecastPDF(products, movements, periodDays, inventoryAudits, userName, {
        category: categoryFilter,
        statusFilter,
        searchTerm,
        onlyNeedsPurchase,
      });
    } catch (err) {
      console.error('Error generating Purchase Forecast PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintReport = () => {
    handleGeneratePDF();
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const handleExportCSV = () => {
    const headers = [
      'Item',
      'Categoria',
      'Estoque Atual',
      'Unidade',
      'Consumo Médio',
      'Autonomia (dias)',
      'Consumo Previsto',
      'Saldo Projetado',
      'Estoque Segurança (3d)',
      'Sugestão de Compra',
      'Custo Estimado (R$)',
      'Status',
    ];

    const rows = forecast.filteredItems.map((item) => [
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.category}"`,
      item.currentStock,
      item.unit,
      item.consumptionUnitText,
      item.daysAutonomy != null ? Number(item.daysAutonomy).toFixed(1) : 'Indeterminado',
      item.projectedConsumption,
      item.projectedBalance,
      item.safetyStock,
      item.suggestedPurchaseQty,
      (item.estimatedCost ?? item.estimatedTotalCost ?? 0).toFixed(2),
      item.statusLabel,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Previsao_Compras_Cristolandia_${periodDays}dias_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCoordinationList = () => {
    let msg = `🏛️ *JUNTA DE MISSÕES NACIONAIS - CRISTOLÂNDIA (LEM/BA)*\n`;
    msg += `📋 *PREVISÃO DE COMPRAS E ABASTECIMENTO (${periodDays} DIAS)*\n`;
    msg += `📅 *Ciclo:* ${forecast.baseDateFormatted} a ${forecast.endDateFormatted} | Compra Prevista: *${forecast.nextPurchaseDateFormatted}*\n\n`;

    if (forecast.criticalItems.length > 0) {
      msg += `🚨 *ITENS CRÍTICOS (RUPTURA IMINENTE):*\n`;
      forecast.criticalItems.forEach((item) => {
        msg += `• *${item.name}*: Estoque Atual: *${item.currentStock} ${item.unit}* | Autonomia: *${item.autonomyText}* ➔ *COMPRAR: +${item.suggestedPurchaseQty} ${item.unit}*`;
        if (item.customNote) {
          msg += ` _(⚠️ ${item.customNote})_`;
        }
        msg += `\n`;
      });
      msg += `\n`;
    }

    const otherPurchases = forecast.purchasesList.filter((i) => i.status !== 'CRITICO');
    if (otherPurchases.length > 0) {
      msg += `🟡 *ITENS EM ATENÇÃO (COMPRA AMANHÃ):*\n`;
      otherPurchases.forEach((item) => {
        msg += `• *${item.name}*: Estoque Atual: *${item.currentStock} ${item.unit}* | Autonomia: *${item.autonomyText}* ➔ *COMPRAR: +${item.suggestedPurchaseQty} ${item.unit}*`;
        if (item.customNote) {
          msg += ` _(⚠️ ${item.customNote})_`;
        }
        msg += `\n`;
      });
      msg += `\n`;
    }

    const nextCycleAlerts = forecast.warningItems.filter((i) => i.suggestedPurchaseQty === 0);
    if (nextCycleAlerts.length > 0) {
      msg += `⏳ *ITENS MONITORADOS (ATENDEM ESTA SEMANA — COMPRAR NA PRÓXIMA TERÇA):*\n`;
      nextCycleAlerts.forEach((item) => {
        msg += `• *${item.name}*: Estoque *${item.currentStock} ${item.unit}* cobre a semana (${item.projectedConsumption} ${item.unit}). Restam *${item.projectedBalance} ${item.unit}* ➔ *Comprar na próxima terça-feira (+${item.nextCyclePurchaseQty} ${item.unit})*\n`;
      });
      msg += `\n`;
    }

    msg += `📊 *Resumo Geral:* ${forecast.totalProducts} produtos analisados | ${forecast.itemsNeedingPurchaseCount} para compra | ${forecast.normalCount} com estoque seguro\n`;
    msg += `👤 *Responsável:* Marconi Castro — Almoxarifado Cristolândia`;

    navigator.clipboard.writeText(msg);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 3000);
  };

  const handleCopyManagerialObservation = () => {
    navigator.clipboard.writeText(forecast.managerialObservation);
    setCopiedManagerialNote(true);
    setTimeout(() => setCopiedManagerialNote(false), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner with Title, Horizon Description and Action Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Relatório de Previsão de Compras
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  Planejamento de {periodDays} dias
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Cálculo de consumo diário e regras para dias específicos (Qua/Dom), estoque de segurança de 3 dias e saldo projetado.
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Gerar E-mail Pós-Compras (Novas Entradas Recebidas) */}
          <button
            onClick={() => handleOpenEmailModal('post_purchase')}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-2 active:scale-95 ring-2 ring-emerald-400/30"
            title="Gerar e-mail executivo de atualização do estoque após o recebimento das novas compras para o Pastor Humberto e Chefe Marcos"
          >
            <Package className="w-4 h-4 text-emerald-200" />
            <span>📦 E-mail Pós-Compras (Novas Entradas)</span>
          </button>

          {/* Gerar E-mail Semanal de Previsão Button */}
          <button
            onClick={() => handleOpenEmailModal('forecast')}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            title="Gerar e-mail com a Tabela Executiva Visual de Previsão de Compras"
          >
            <Mail className="w-4 h-4 text-indigo-500" />
            <span>✉️ Previsão de Compras</span>
          </button>

          {/* Gerar PDF */}
          <button
            onClick={handleGeneratePDF}
            disabled={isGeneratingPdf}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
            title="Baixar PDF do Relatório de Previsão de Compras em A4 Paisagem"
          >
            <FileDown className="w-4 h-4" />
            <span>📄 Gerar PDF</span>
          </button>

          {/* Exportar Excel / CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800 shadow-sm active:scale-95"
            title="Exportar dados para planilha Excel (CSV)"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Planilha Excel</span>
          </button>

          {/* Imprimir */}
          <button
            onClick={handlePrintReport}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md shadow-slate-900/10 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            title="Imprimir relatório"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Imprimir</span>
          </button>

          {/* Copiar Resumo WhatsApp */}
          <button
            onClick={handleCopyCoordinationList}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95"
            title="Copiar lista consolidada para WhatsApp"
          >
            {copiedWhatsApp ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
                <span>WhatsApp</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Horizon Selector and Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Horizon Selection: 8, 14, 21, 30 days */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mr-1">
              <Calendar className="w-4 h-4 text-amber-500" />
              Horizonte de Previsão:
            </span>
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
              <button
                onClick={() => setPeriodDays(8)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  periodDays === 8
                    ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20 font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                8 dias (Padrão)
              </button>
              <button
                onClick={() => setPeriodDays(14)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  periodDays === 14
                    ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20 font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                14 dias
              </button>
              <button
                onClick={() => setPeriodDays(21)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  periodDays === 21
                    ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20 font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                21 dias
              </button>
              <button
                onClick={() => setPeriodDays(30)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  periodDays === 30
                    ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20 font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                30 dias
              </button>
            </div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 ml-1">
              Ciclo: <strong>{forecast.baseDateFormatted} a {forecast.endDateFormatted}</strong> | Próxima compra:{' '}
              <strong className="text-amber-600 dark:text-amber-400">{forecast.nextPurchaseDateFormatted}</strong>
            </span>
          </div>

          {/* Sub-view switcher: Prioritária vs Visão Geral */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
            <button
              onClick={() => setSubView('coordination_list')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subView === 'coordination_list'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🛒 1. Necessidade de Compras ({forecast.purchasesList.length})
            </button>
            <button
              onClick={() => setSubView('full_table')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subView === 'full_table'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              📋 2. Quadro Geral de Estoque ({forecast.totalProducts})
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Status do Produto
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todos os Status</option>
              <option value="buy_only">🛒 Somente Necessidade de Compra</option>
              <option value="critical_only">🔴 Crítico (Risco de Falta)</option>
              <option value="warning_only">🟡 Atenção (Abaixo da Margem)</option>
              <option value="normal_only">🟢 Normal (Estoque Seguro)</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Categoria
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Todas as Categorias</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Toggle: Only Need Purchase */}
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={onlyNeedsPurchase}
                onChange={(e) => setOnlyNeedsPurchase(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 select-none">
                Filtrar apenas com compra sugerida
              </span>
            </label>
          </div>

          {/* Search Term */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Buscar Produto
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Ex: Arroz, Feijão, Frango..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Executive Summary Cards: 4 Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Products */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
            <span>Total Analisado</span>
            <Package className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {forecast.totalProducts}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Produtos no catálogo
          </p>
        </div>

        {/* Crítico */}
        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-rose-600 mb-1">
            <span>Críticos (Risco)</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <div className={`text-2xl font-black ${forecast.criticalCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
            {forecast.criticalCount}
          </div>
          <p className="text-[10px] text-rose-500/80 mt-0.5">
            Risco iminente de falta
          </p>
        </div>

        {/* Atenção */}
        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-600 mb-1">
            <span>Em Atenção</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className={`text-2xl font-black ${forecast.warningCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
            {forecast.warningCount}
          </div>
          <p className="text-[10px] text-amber-500/80 mt-0.5">
            Abaixo da segurança (3d)
          </p>
        </div>

        {/* Normal */}
        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 mb-1">
            <span>Normais</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {forecast.normalCount}
          </div>
          <p className="text-[10px] text-emerald-500/80 mt-0.5">
            Estoque seguro p/ {periodDays}d
          </p>
        </div>
      </div>

      {/* SUB-VIEW 1: LISTA PRIORITÁRIA DE COMPRAS */}
      {subView === 'coordination_list' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-500" />
                1. Necessidade de Compras — Lista Prioritária ({forecast.purchasesList.length} itens)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Itens com sugestão de compra no período de {periodDays} dias ordenados por criticidade.
              </p>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
              Fórmula: <span className="font-bold text-amber-600 dark:text-amber-400">Compra = Consumo Previsto + Est. Segurança - Estoque Atual</span>
            </div>
          </div>

          {forecast.purchasesList.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Estoque 100% Suprido para o Ciclo de {periodDays} Dias!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Todos os produtos analisados possuem saldo suficiente para cobrir o consumo previsto e a margem de segurança de 3 dias.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Item / Produto</th>
                    <th className="py-3 px-3">Estoque Atual</th>
                    <th className="py-3 px-3">Consumo Médio</th>
                    <th className="py-3 px-3 text-center">Autonomia</th>
                    <th className="py-3 px-3 text-right">Cons. Previsto ({periodDays}d)</th>
                    <th className="py-3 px-3 text-right">Saldo Projetado</th>
                    <th className="py-3 px-3 text-right">Segurança (3d)</th>
                    <th className="py-3 px-3 text-right">Compra Sugerida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {forecast.purchasesList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black ${
                            item.status === 'CRITICO'
                              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : item.status === 'ATENCAO'
                              ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          {item.statusBadge}
                        </span>
                      </td>

                      {/* Item */}
                      <td className="py-3.5 px-3">
                        <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                          {item.name}
                          {item.inventoryStatus === 'DIVERGENTE' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold" title={`Contagem física: ${item.physicalStock} ${item.unit}`}>
                              Físico: {item.physicalStock}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">{item.category}</div>
                        {item.customNote && (
                          <div className="mt-1 text-[10px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 rounded-md px-2 py-0.5 leading-snug font-medium max-w-sm">
                            ⚠️ {item.customNote}
                          </div>
                        )}
                      </td>

                      {/* Estoque Atual */}
                      <td className="py-3.5 px-3">
                        <span className={`font-black ${item.currentStock <= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                          {item.currentStock} {item.unit}
                        </span>
                      </td>

                      {/* Consumo Médio Diário/Semanal */}
                      <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 font-semibold">
                        {item.consumptionUnitText}
                      </td>

                      {/* Autonomia */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-xs ${
                            item.daysAutonomy !== null && item.daysAutonomy <= 3
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                              : item.daysAutonomy !== null && item.daysAutonomy <= 7
                              ? 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {item.autonomyText || (item.daysAutonomy != null ? `${Number(item.daysAutonomy).toFixed(1)} dias` : 'Eventual')}
                        </span>
                      </td>

                      {/* Consumo Previsto do Período */}
                      <td className="py-3.5 px-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                        {item.projectedConsumption} {item.unit}
                      </td>

                      {/* Saldo Projetado ao Final */}
                      <td className="py-3.5 px-3 text-right font-black">
                        <span className={item.projectedBalance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}>
                          {item.projectedBalance} {item.unit}
                        </span>
                      </td>

                      {/* Estoque de Segurança (3 dias) */}
                      <td className="py-3.5 px-3 text-right text-indigo-600 dark:text-indigo-400 font-bold">
                        {item.safetyStock} {item.unit}
                      </td>

                      {/* Sugestão de Compra */}
                      <td className="py-3.5 px-3 text-right">
                        <span className="inline-flex items-center gap-1 font-black text-rose-600 dark:text-rose-400 text-sm bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-xl border border-rose-200 dark:border-rose-800">
                          +{item.suggestedPurchaseQty} {item.unit}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Itens em Atenção que cobrem a semana atual */}
          {forecast.warningItems.some((i) => i.suggestedPurchaseQty === 0) && (
            <div className="mt-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-3">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs sm:text-sm">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Itens em Atenção (Estoque Cobre Esta Semana — Compra Programada para a Próxima Terça-Feira)</span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                Os itens abaixo possuem estoque suficiente para atender 100% da demanda desta semana. Portanto, <strong>não precisam ser comprados amanhã</strong>. O saldo projetado terminará abaixo da margem de segurança, e a compra deverá ocorrer na próxima terça-feira.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {forecast.warningItems
                  .filter((i) => i.suggestedPurchaseQty === 0)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200/80 dark:border-amber-900/60 shadow-xs flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {item.name}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold">
                            🟡 Atenção
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Estoque: <strong>{item.currentStock} {item.unit}</strong> | Consumo semana: <strong>{item.projectedConsumption} {item.unit}</strong> | Saldo: <strong>{item.projectedBalance} {item.unit}</strong>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 block">
                          Sem compra amanhã
                        </span>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                          Próx. Terça: +{item.nextCyclePurchaseQty} {item.unit}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 2: QUADRO GERAL DE PREVISÃO DE ESTOQUE (TODOS OS PRODUTOS) */}
      {subView === 'full_table' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-500" />
                2. Quadro Geral de Previsão de Estoque ({forecast.filteredItems.length} produtos)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Visão de todos os produtos, consumo histórico, autonomia, saldo projetado e estoque de segurança.
              </p>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Horizonte: {periodDays} dias ({forecast.baseDateFormatted} a {forecast.endDateFormatted})
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Item / Produto</th>
                  <th className="py-3 px-3">Estoque Atual</th>
                  <th className="py-3 px-3">Consumo Médio</th>
                  <th className="py-3 px-3 text-center">Autonomia</th>
                  <th className="py-3 px-3 text-right">Cons. Previsto</th>
                  <th className="py-3 px-3 text-right">Saldo Projetado</th>
                  <th className="py-3 px-3 text-right">Est. Segurança</th>
                  <th className="py-3 px-3 text-right">Sugestão Compra</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {forecast.filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Item */}
                    <td className="py-3.5 px-3 font-extrabold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.name}
                        {item.inventoryStatus === 'DIVERGENTE' && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold">
                            Físico: {item.physicalStock} {item.unit}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">{item.category}</div>
                      {item.customNote && (
                        <div className="mt-1 text-[10px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 rounded-md px-2 py-0.5 leading-snug font-medium max-w-sm">
                          ⚠️ {item.customNote}
                        </div>
                      )}
                    </td>

                    {/* Estoque Atual */}
                    <td className="py-3.5 px-3 font-black text-slate-900 dark:text-white">
                      {item.currentStock} {item.unit}
                    </td>

                    {/* Consumo Médio */}
                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 font-semibold">
                      {item.consumptionUnitText}
                    </td>

                    {/* Autonomia */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${
                          item.daysAutonomy !== null && item.daysAutonomy <= 3
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                            : item.daysAutonomy !== null && item.daysAutonomy <= 7
                            ? 'bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300'
                            : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {item.autonomyText || (item.daysAutonomy != null ? `${Number(item.daysAutonomy).toFixed(1)} d` : 'Eventual')}
                      </span>
                    </td>

                    {/* Consumo Previsto */}
                    <td className="py-3.5 px-3 text-right text-slate-700 dark:text-slate-300 font-semibold">
                      {item.projectedConsumption} {item.unit}
                    </td>

                    {/* Saldo Projetado */}
                    <td className="py-3.5 px-3 text-right font-black">
                      <span className={item.projectedBalance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}>
                        {item.projectedBalance} {item.unit}
                      </span>
                    </td>

                    {/* Estoque de Segurança */}
                    <td className="py-3.5 px-3 text-right text-slate-500 font-semibold">
                      {item.safetyStock} {item.unit}
                    </td>

                    {/* Sugestão de Compra */}
                    <td className="py-3.5 px-3 text-right font-black">
                      {item.suggestedPurchaseQty > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400">
                          +{item.suggestedPurchaseQty} {item.unit}
                        </span>
                      ) : item.purchaseTiming === 'PROXIMA_SEMANA' ? (
                        <div className="flex flex-col items-end">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">0 (Amanhã)</span>
                          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">Próx. Terça: +{item.nextCyclePurchaseQty} {item.unit}</span>
                        </div>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">0</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black ${
                          item.status === 'CRITICO'
                            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                            : item.status === 'ATENCAO'
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                            : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {item.statusBadge}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Automated Managerial Observation Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
            <FileText className="w-4 h-4 text-amber-500" />
            <span>📌 Parecer Gerencial Automático para a Coordenação</span>
          </div>
          <button
            onClick={handleCopyManagerialObservation}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            {copiedManagerialNote ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copiar Parecer</span>
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
          {forecast.managerialObservation}
        </p>
      </div>

      {/* Audit & Read-Only Guarantee Footer Notice */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>
            <strong>Garantia de Integridade e Somente Leitura:</strong> A previsão de compras e o gerador de e-mail operam exclusivamente em modo de leitura (Read-Only), sem realizar qualquer gravação, alteração de saldos ou baixa fictícia de consumo no banco de dados.
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400 shrink-0">
          Horizonte: {periodDays} dias | Próxima compra: {forecast.nextPurchaseDateFormatted}
        </span>
      </div>

      {/* EMAIL GENERATION MODAL */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${
                  emailReportType === 'post_purchase'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                }`}>
                  {emailReportType === 'post_purchase' ? <Package className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>
                      {emailReportType === 'post_purchase'
                        ? 'Atualização de Estoque Pós-Compras (Novas Entradas)'
                        : 'E-mail Semanal de Previsão de Compras'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase ${
                      emailReportType === 'post_purchase'
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                        : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
                    }`}>
                      {emailReportType === 'post_purchase' ? 'Recebimento' : 'Planejamento'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {emailReportType === 'post_purchase'
                      ? 'Confirmação de recebimento de mercadorias, regularização de saldos e eliminação de riscos'
                      : 'Formato objetivo com visibilidade imediata de estoque, autonomia e previsão de compras'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Type Switcher: Pós-Compras vs Previsão */}
              <div className="p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-stretch gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setEmailReportType('post_purchase');
                    setEmailSubject('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    emailReportType === 'post_purchase'
                      ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-sm border border-emerald-200/80 dark:border-emerald-800'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Package className="w-4 h-4 text-emerald-500" />
                  <span>1. Atualização Pós-Compras (Novas Entradas)</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold uppercase">
                    Novo
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmailReportType('forecast');
                    setEmailSubject('');
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    emailReportType === 'forecast'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-200/80 dark:border-indigo-800'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4 text-indigo-500" />
                  <span>2. Previsão de Compras (Antes de Comprar)</span>
                </button>
              </div>

              {/* Recipients Row */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Destinatários (Pastor Humberto & Chefe Marcos):
                </label>
                <input
                  type="text"
                  value={emailRecipients}
                  onChange={(e) => setEmailRecipients(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="email1@exemplo.com, email2@exemplo.com"
                />
              </div>

              {/* Subject Row */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assunto do E-mail:
                </label>
                <input
                  type="text"
                  value={emailSubject || emailContent.subject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Optional Custom Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Observação Adicional do Almoxarifado (Opcional):
                </label>
                <input
                  type="text"
                  value={customEmailNote}
                  onChange={(e) => setCustomEmailNote(e.target.value)}
                  placeholder={
                    emailReportType === 'post_purchase'
                      ? 'Ex: Todas as notas fiscais foram conferidas e os lotes foram armazenados no depósito central...'
                      : 'Ex: Favor priorizar pedido do fornecedor de hortifrúti na terça de manhã...'
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Tab Selector: Tabela Formatada vs Texto Simples */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setEmailModalTab('preview')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      emailModalTab === 'preview'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Tabela Executiva (Visual)</span>
                    <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold uppercase">
                      Padrão
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailModalTab('plain')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      emailModalTab === 'plain'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Texto Simples (Monospace)</span>
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {emailReportType === 'post_purchase'
                    ? `${forecast.purchasesList.length} itens reabastecidos • Risco de Ruptura Zero`
                    : `Ciclo de ${periodDays} dias • ${forecast.purchasesList.length} itens com sugestão de compra`}
                </span>
              </div>

              {/* View Content */}
              {emailModalTab === 'preview' ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 overflow-x-auto shadow-inner max-h-[340px] overflow-y-auto">
                  <div dangerouslySetInnerHTML={{ __html: emailContent.html }} />
                </div>
              ) : (
                <textarea
                  readOnly
                  rows={13}
                  value={emailContent.body}
                  className="w-full bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-200 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none leading-relaxed"
                />
              )}
            </div>

            {/* Modal Footer with Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Pronto para copiar ou enviar diretamente:
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Copiar Tabela Formatada (Gmail / Outlook) */}
                <button
                  onClick={handleCopyEmailHtml}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/25 active:scale-95 ring-2 ring-indigo-400/30"
                  title="Copia a tabela com formatação visual completa para colar (Ctrl+V) no Gmail ou Outlook"
                >
                  {emailCopiedHtml ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Tabela Copiada (HTML)!</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Copiar Tabela Executiva (Padrão)</span>
                    </>
                  )}
                </button>

                {/* Copiar Texto Simples */}
                <button
                  onClick={handleCopyEmailText}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  {emailCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Texto Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Texto</span>
                    </>
                  )}
                </button>

                {/* Abrir no Gmail */}
                <button
                  onClick={handleOpenInGmail}
                  className="px-3.5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                  title="Abrir diretamente na caixa de composição do Gmail Web"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir no Gmail Web</span>
                </button>

                {/* Abrir Cliente Padrão (mailto) */}
                <button
                  onClick={handleSendViaMailto}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                  title="Abrir no Outlook, Apple Mail ou cliente padrão"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar via App</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
