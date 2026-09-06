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
  const [emailRecipients, setEmailRecipients] = useState(
    'humbertohpp.59@gmail.com, chefmarcusviniciuses@gmail.com'
  );
  const [emailSubject, setEmailSubject] = useState('');
  const [emailCopied, setEmailCopied] = useState(false);
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

  // Generate Email Content
  const emailContent = useMemo(() => {
    const today = new Date().toLocaleDateString('pt-BR');
    const subject = `[ESTOQUE CRISTOLÂNDIA] Previsão Semanal de Compras — Ciclo de ${periodDays} Dias (Próxima Compra: ${forecast.nextPurchaseDateFormatted})`;

    let body = `A/C: Pastor Humberto (humbertohpp.59@gmail.com) e Chefe Marcos (chefmarcusviniciuses@gmail.com)\n`;
    body += `Cc: Marconi Castro (Almoxarifado / Estoque)\n`;
    body += `Data da Emissão: ${today}\n\n`;

    body += `Prezados Pastor Humberto e Chefe Marcos,\n\n`;
    body += `Graça e paz!\n\n`;
    body += `Apresentamos a Previsão Semanal de Compras e Abastecimento do Estoque da Cristolândia (LEM/BA) referente ao horizonte de ${periodDays} dias.\n\n`;

    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    body += `📊 1. RESUMO EXECUTIVO DO ABASTECIMENTO (${periodDays} DIAS)\n`;
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    body += `• Ciclo Operacional: ${forecast.baseDateFormatted} a ${forecast.endDateFormatted}\n`;
    body += `• Data Prevista de Compra: ${forecast.nextPurchaseDateFormatted} (Quarta-feira)\n`;
    body += `• Total de Itens Analisados: ${forecast.totalProducts} produtos\n`;
    body += `• Itens com Sugestão de Compra: ${forecast.itemsNeedingPurchaseCount} itens\n`;
    body += `• Itens em Nível Crítico (Risco de Falta): ${forecast.criticalCount}\n`;
    body += `• Itens em Atenção (Abaixo da Margem de Segurança): ${forecast.warningCount}\n`;
    body += `• Itens com Estoque Normal / Seguro: ${forecast.normalCount}\n`;
    body += `• Custo Total Estimado de Reposição: R$ ${(forecast.totalEstimatedCost ?? 0).toFixed(2).replace('.', ',')}\n\n`;

    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    body += `🚨 2. LISTA PRIORITÁRIA DE COMPRAS (POR GRAU DE URGÊNCIA)\n`;
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (forecast.purchasesList.length === 0) {
      body += `✅ Não há produtos necessitando de compra imediata. O estoque atual atende com segurança a operação pelos próximos ${periodDays} dias.\n\n`;
    } else {
      // Criticals first
      const criticals = forecast.purchasesList.filter((i) => i.status === 'CRITICO');
      if (criticals.length > 0) {
        body += `🔴 ITENS CRÍTICOS (RISCO IMINENTE DE RUPTURA):\n`;
        criticals.forEach((item) => {
          body += `• ${item.name} (${item.category})\n`;
          body += `   - Estoque Atual: ${item.currentStock} ${item.unit}\n`;
          body += `   - Consumo Previsto (${periodDays}d): ${item.projectedConsumption} ${item.unit} | Autonomia: ${item.autonomyText}\n`;
          body += `   - Saldo Projetado ao Fim: ${item.projectedBalance} ${item.unit} (Estoque Segurança: ${item.safetyStock} ${item.unit})\n`;
          body += `   ➔ COMPRA SUGERIDA: +${item.suggestedPurchaseQty} ${item.unit} (Estimativa: R$ ${(item.estimatedCost ?? item.estimatedTotalCost ?? 0).toFixed(2).replace('.', ',')})\n\n`;
        });
      }

      // Attention items
      const attentions = forecast.purchasesList.filter((i) => i.status === 'ATENCAO');
      if (attentions.length > 0) {
        body += `🟡 ITENS EM ATENÇÃO (ABAIXO DO ESTOQUE DE SEGURANÇA):\n`;
        attentions.forEach((item) => {
          body += `• ${item.name} (${item.category})\n`;
          body += `   - Estoque Atual: ${item.currentStock} ${item.unit}\n`;
          body += `   - Consumo Previsto: ${item.projectedConsumption} ${item.unit} | Autonomia: ${item.autonomyText}\n`;
          body += `   ➔ COMPRA SUGERIDA: +${item.suggestedPurchaseQty} ${item.unit} (Estimativa: R$ ${(item.estimatedCost ?? item.estimatedTotalCost ?? 0).toFixed(2).replace('.', ',')})\n\n`;
        });
      }

      // Other regular needs if any
      const normalsWithPurchase = forecast.purchasesList.filter((i) => i.status === 'NORMAL');
      if (normalsWithPurchase.length > 0) {
        body += `🟢 ITENS COMPLEMENTARES DE REPOSIÇÃO:\n`;
        normalsWithPurchase.forEach((item) => {
          body += `• ${item.name}: Atual ${item.currentStock} ${item.unit} ➔ COMPRA: +${item.suggestedPurchaseQty} ${item.unit}\n`;
        });
        body += `\n`;
      }
    }

    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    body += `🥩 3. DESTAQUE DOS ITENS PRINCIPAIS DE CONSUMO DA COZINHA\n`;
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    const stapleNames = ['Arroz Branco', 'Feijão Carioca', 'Óleo de Soja', 'Frango Inteiro', 'Frango Resfriado', 'Carne Bovina', 'Farinha de Trigo', 'Açúcar Cristal', 'Leite Integral'];
    const stapleItems = forecast.allItems.filter((item) =>
      stapleNames.some((sn) => item.name.toLowerCase().includes(sn.toLowerCase()))
    );

    stapleItems.forEach((st) => {
      const statusIcon = st.status === 'CRITICO' ? '🔴' : st.status === 'ATENCAO' ? '🟡' : '🟢';
      body += `${statusIcon} ${st.name}: Atual: ${st.currentStock} ${st.unit} | Autonomia: ${st.autonomyText} | Sugestão: ${st.suggestedPurchaseQty > 0 ? `+${st.suggestedPurchaseQty} ${st.unit}` : 'Sem compra necessária'}\n`;
    });
    body += `\n`;

    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    body += `📌 4. PARECER GERENCIAL DO ALMOXARIFADO & RECONCILIAÇÃO\n`;
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    body += `${forecast.managerialObservation}\n\n`;

    if (customEmailNote.trim()) {
      body += `📝 OBSERVAÇÃO ADICIONAL DO GESTOR:\n`;
      body += `${customEmailNote.trim()}\n\n`;
    }

    body += `Atenciosamente,\n\n`;
    body += `Marconi Castro\n`;
    body += `Responsável pelo Almoxarifado e Controle de Estoque\n`;
    body += `Missão Cristolândia — LEM/BA\n`;
    body += `Junta de Missões Nacionais — CBB\n`;

    return { subject, body };
  }, [forecast, periodDays, customEmailNote]);

  const handleOpenEmailModal = () => {
    setEmailSubject(emailContent.subject);
    setIsEmailModalOpen(true);
  };

  const handleCopyEmailText = () => {
    navigator.clipboard.writeText(emailContent.body);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 3000);
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
    msg += `📋 *RELATÓRIO DE PREVISÃO DE COMPRAS (${periodDays} DIAS)*\n`;
    msg += `📅 *Ciclo:* ${forecast.baseDateFormatted} a ${forecast.endDateFormatted} | Compra Prevista: *${forecast.nextPurchaseDateFormatted}*\n`;
    msg += `💰 *Custo Total Estimado:* R$ ${(forecast.totalEstimatedCost ?? 0).toFixed(2).replace('.', ',')}\n\n`;

    if (forecast.criticalItems.length > 0) {
      msg += `🚨 *ITENS CRÍTICOS (RUPTURA IMINENTE):*\n`;
      forecast.criticalItems.forEach((item) => {
        msg += `• *${item.name}*: Atual: *${item.currentStock} ${item.unit}* | Consumo: ${item.projectedConsumption} ${item.unit} ➔ *COMPRAR: +${item.suggestedPurchaseQty} ${item.unit}*\n`;
      });
      msg += `\n`;
    }

    const otherPurchases = forecast.purchasesList.filter((i) => i.status !== 'CRITICO');
    if (otherPurchases.length > 0) {
      msg += `🟡 *ITENS EM ATENÇÃO / REPOSIÇÃO:*\n`;
      otherPurchases.forEach((item) => {
        msg += `• *${item.name}*: Atual: ${item.currentStock} ${item.unit} ➔ *Sugerido: +${item.suggestedPurchaseQty} ${item.unit}*\n`;
      });
      msg += `\n`;
    }

    msg += `📊 *Resumo:* Analisados: ${forecast.totalProducts} | Críticos: ${forecast.criticalCount} | Atenção: ${forecast.warningCount} | Normais: ${forecast.normalCount}\n`;
    msg += `*Documento gerado automaticamente pelo Estoque Cristolândia.*`;

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
          {/* Gerar E-mail Semanal Button (Highlight) */}
          <button
            onClick={handleOpenEmailModal}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            title="Gerar e-mail profissional semanal para o Pastor Humberto e Chef Marcos"
          >
            <Mail className="w-4 h-4 text-amber-300" />
            <span>✉️ Gerar E-mail Semanal</span>
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

      {/* Executive Summary Cards: 5 Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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

        {/* Custo Total Estimado */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800/80 rounded-2xl p-4 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-1">
            <span>Custo Total Estimado</span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-300">
            R$ {(forecast.totalEstimatedCost ?? 0).toFixed(2).replace('.', ',')}
          </div>
          <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">
            {forecast.totalSuggestedPurchaseUnits} un. sugeridas
          </p>
        </div>
      </div>

      {/* Physical Reconciliation Warning (e.g. Arroz Branco physical count ~30kg vs system 14.5kg) */}
      {forecast.allItems.some((i) => i.inventoryStatus === 'DIVERGENTE') && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200">
            <span className="font-bold">Aviso de Auditoria Física Reconciliada: </span>
            Foram detectados produtos com diferença entre a contagem física oficial e o saldo do sistema.
            A previsão utiliza o estoque de segurança e o consumo real auditado para evitar desabastecimento.
            {forecast.allItems
              .filter((i) => i.inventoryStatus === 'DIVERGENTE')
              .map((item) => (
                <span key={item.id} className="ml-1 font-mono font-bold bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded text-[11px]">
                  {item.name}: Físico {item.physicalStock} {item.unit} vs Sistema {item.currentStock} {item.unit} (Dif: {item.physicalDifference > 0 ? `+${item.physicalDifference}` : item.physicalDifference})
                </span>
              ))}
          </div>
        </div>
      )}

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
                    <th className="py-3 px-3 text-right">Custo Est.</th>
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
                        <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {item.name}
                          {item.inventoryStatus === 'DIVERGENTE' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold" title={`Contagem física: ${item.physicalStock} ${item.unit}`}>
                              Físico: {item.physicalStock}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">{item.category}</div>
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

                      {/* Custo Estimado */}
                      <td className="py-3.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                        R$ {(item.estimatedCost ?? item.estimatedTotalCost ?? 0).toFixed(2).replace('.', ',')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  <th className="py-3 px-3 text-right">Custo Est.</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {forecast.filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Item */}
                    <td className="py-3.5 px-3 font-extrabold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        {item.name}
                        {item.inventoryStatus === 'DIVERGENTE' && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold">
                            Físico: {item.physicalStock} {item.unit}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">{item.category}</div>
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
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">0</span>
                      )}
                    </td>

                    {/* Custo Estimado */}
                    <td className="py-3.5 px-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                      {(item.estimatedCost ?? item.estimatedTotalCost ?? 0) > 0 ? `R$ ${(item.estimatedCost ?? item.estimatedTotalCost ?? 0).toFixed(2).replace('.', ',')}` : '-'}
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
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    E-mail Semanal de Previsão de Compras
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Formato profissional e direto pronto para envio à Coordenação e Cozinha
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
              {/* Recipients Row */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Destinatários (Pastor Humberto & Chef Marcos):
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
                  Observação Adicional / Recado Específico (Opcional):
                </label>
                <input
                  type="text"
                  value={customEmailNote}
                  onChange={(e) => setCustomEmailNote(e.target.value)}
                  placeholder="Ex: Favor dar prioridade ao pedido do fornecedor local de carnes até terça às 14h..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Preview of Email Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Conteúdo Formatado do E-mail:
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Ciclo de {periodDays} dias | R$ {(forecast.totalEstimatedCost ?? 0).toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <textarea
                  readOnly
                  rows={14}
                  value={emailContent.body}
                  className="w-full bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-200 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Footer with Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                Selecione a forma mais conveniente para enviar o e-mail:
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Copiar Texto */}
                <button
                  onClick={handleCopyEmailText}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
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
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                  title="Abrir diretamente na caixa de composição do Gmail Web"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir no Gmail Web</span>
                </button>

                {/* Abrir Cliente Padrão (mailto) */}
                <button
                  onClick={handleSendViaMailto}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                  title="Abrir no Outlook, Apple Mail ou cliente nativo"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar via App de E-mail</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
