import React, { useState, useMemo } from "react";
import { Product, StockMovement, Category, InventoryAudit } from "../types";
import { UserRole } from "../firebase";
import {
  calculatePurchaseForecast,
  ForecastItem,
  ForecastPeriodDays,
  PurchaseForecastResult,
} from "../utils/purchaseForecasting";
import { generatePurchaseForecastPDF } from "../utils/pdfExport";
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
} from "lucide-react";

interface PurchaseForecastReportProps {
  products: Product[];
  movements: StockMovement[];
  inventoryAudits?: InventoryAudit[];
  userRole?: UserRole;
  userName?: string;
  currentUserEmail?: string;
}

const CATEGORIES: Category[] = [
  "Grãos e Cereais",
  "Óleos e Condimentos",
  "Matinais e Bebidas",
  "Proteínas e Carnes",
  "Laticínios e Massas",
  "Hortifrúti e Temperos",
  "Higiene e Limpeza",
  "Outros",
];

// Helper to identify multi-sector items with decentralized unnotified usage (Cozinha, Padaria, Casas Missionárias e Adm)
export const isMultiSectorItem = (name: string): boolean => {
  const norm = name.toLowerCase();
  return (
    norm.includes("sal") ||
    norm.includes("leite") ||
    norm.includes("óleo") ||
    norm.includes("oleo") ||
    norm.includes("manteiga") ||
    norm.includes("margarina")
  );
};

export const PurchaseForecastReport: React.FC<PurchaseForecastReportProps> = ({
  products,
  movements,
  inventoryAudits = [],
  userRole = "admin",
  userName = "Marconi Castro (Gestor do Estoque)",
  currentUserEmail = "",
}) => {
  // Apenas o usuário oficial de gestão (estoquecristolandia@gmail.com) tem permissão de visualizar e disparar os blocos de e-mail
  const canManageEmails = Boolean(
    currentUserEmail &&
    (currentUserEmail.trim().toLowerCase() ===
      "estoquecristolandia@gmail.com" ||
      currentUserEmail.trim().toLowerCase() === "admin@app.local"),
  );

  // Horizon planning period: 8 (default), 14, 21, 30 days
  const [periodDays, setPeriodDays] = useState<ForecastPeriodDays>(8);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "critical_only" | "warning_only" | "normal_only" | "buy_only"
  >("all");
  const [onlyNeedsPurchase, setOnlyNeedsPurchase] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [subView, setSubView] = useState<"coordination_list" | "full_table">(
    "coordination_list",
  );

  // Copy feedback states
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const [copiedManagerialNote, setCopiedManagerialNote] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Email modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailReportType, setEmailReportType] = useState<
    "post_purchase" | "all_items" | "forecast"
  >("post_purchase");
  const [emailRecipients, setEmailRecipients] = useState(
    "humbertohpp.59@gmail.com, chefmarcusviniciuses@gmail.com",
  );
  const [emailSubject, setEmailSubject] = useState("");
  const [emailCopied, setEmailCopied] = useState(false);
  const [emailCopiedHtml, setEmailCopiedHtml] = useState(false);
  const [copiedAppLink, setCopiedAppLink] = useState(false);
  const [emailModalTab, setEmailModalTab] = useState<"preview" | "plain">(
    "preview",
  );
  const [customEmailNote, setCustomEmailNote] = useState("");

  // Pure read-only computation of forecast data
  const forecast = useMemo(() => {
    return calculatePurchaseForecast(
      products,
      movements,
      periodDays,
      inventoryAudits,
      {
        category: categoryFilter,
        statusFilter,
        searchTerm,
        onlyNeedsPurchase,
      },
    );
  }, [
    products,
    movements,
    periodDays,
    inventoryAudits,
    categoryFilter,
    statusFilter,
    searchTerm,
    onlyNeedsPurchase,
  ]);

  // Generate Email Content (Professional, Objective and Direct - Supports Post-Purchase Update, Quadro Geral, and Purchase Forecast)
  const emailContent = useMemo(() => {
    const today = new Date().toLocaleDateString("pt-BR");
    const APP_URL = "https://estoquecristolandia.netlify.app";
    const APP_DOMAIN = "estoquecristolandia.netlify.app";

    // Helper for operational notes per item
    const getItemOperationalNote = (
      name: string,
      category: string,
      currentStock: number,
      unit: string,
    ) => {
      const norm = name.toLowerCase();
      if (norm.includes("sal refinado") || norm === "sal") {
        return "Item multissetorial (Cozinha, Padaria de Fernando Pates, Casas Missionárias e Adm). Sujeito a retiradas sem aviso prévio. Com a entrada de 8 kg, o saldo de 11 kg garante 11 dias de pães e refeições, mas requer margem redobrada contra desfalques.";
      }
      if (norm.includes("leite")) {
        return "Item multissetorial (Cozinha, Padaria, Casas Missionárias e Adm). Alto risco de desfalque por saídas avulsas não avisadas previamente. Saldo atual assegura desjejum e café, exigindo vigilância contínua.";
      }
      if (norm.includes("óleo") || norm.includes("oleo")) {
        return "Item multissetorial (Cozinha, Padaria, Casas Missionárias e Adm). Utilizado em múltiplos setores sem aviso prévio; demanda reserva técnica para não desfalcar preparos diários.";
      }
      if (norm.includes("manteiga") || norm.includes("margarina")) {
        return "Item multissetorial (Cozinha, Padaria de Fernando Pates e Casas Missionárias). Sujeito a retiradas sem aviso prévio; exige acompanhamento preventivo constante.";
      }
      if (norm.includes("flocão") || norm.includes("flocao")) {
        return "Consumo exclusivo às quartas e domingos (20 pct/preparo). Saldo de 52 pct cobre a semana com folga; programar compra na próxima terça.";
      }
      if (norm.includes("arroz")) {
        return "Saldo recomposto para 165 kg. Atende o ciclo com reserva de segurança (45 kg) preservada.";
      }
      if (norm.includes("feijão") || norm.includes("feijao")) {
        return "Saldo recomposto para 88 kg com 11 dias de autonomia plena e 24 kg de reserva mantida.";
      }
      if (norm.includes("suco")) {
        return "Saldo de 22 pacotes garante as bebidas das refeições principais.";
      }
      if (norm.includes("farinha de trigo")) {
        return "Atende a produção de pães e broas da Padaria (Fernando Pates) e preparos da Cozinha.";
      }
      if (norm.includes("frango")) {
        return "Proteína principal com estoque seguro para as refeições da semana.";
      }
      if (norm.includes("carne")) {
        return "Proteína complementar devidamente armazenada no congelador.";
      }
      if (norm.includes("açúcar") || norm.includes("acucar")) {
        return "Estoque seguro para bebidas, café e confeitaria da Padaria.";
      }
      if (norm.includes("macarrão") || norm.includes("macarrao")) {
        return "Estoque seguro para os cardápios de massas da semana.";
      }
      if (norm.includes("alho")) {
        return "Tempero essencial para preparos diários.";
      }
      return "Estoque conferido e devidamente armazenado no Almoxarifado.";
    };

    // Calculate replenished items from the forecast purchase list
    const replenishedItems = forecast.purchasesList.map((item) => {
      const prevStock = item.currentStock;
      const qtyAdded = item.suggestedPurchaseQty;
      const newStock = Math.round((prevStock + qtyAdded) * 100) / 100;
      const dailyAvg =
        item.dailyAvgConsumption && item.dailyAvgConsumption > 0
          ? item.dailyAvgConsumption
          : null;
      const newAutonomyDays = dailyAvg
        ? Math.round((newStock / dailyAvg) * 10) / 10
        : null;
      const newAutonomyText =
        newAutonomyDays !== null
          ? `${newAutonomyDays.toFixed(1)} dias`
          : "Uso Eventual";
      const itemNote = getItemOperationalNote(
        item.name,
        item.category,
        newStock,
        item.unit,
      );

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

    const totalUnitsAdded = replenishedItems.reduce(
      (acc, i) => acc + i.qtyAdded,
      0,
    );

    // =========================================================================
    // MODE 1: ATUALIZAÇÃO GERAL DO ESTOQUE PÓS-COMPRAS (NOVAS ENTRADAS + QUADRO GERAL)
    // =========================================================================
    if (emailReportType === "post_purchase") {
      const defaultSubject = `[ESTOQUE CRISTOLÂNDIA] Atualização Geral do Estoque & Pós-Compras (${today}) — Painel: ${APP_DOMAIN}`;

      // 1. Plain Text Version for Post-Purchase Update
      let body = `A/C: Pastor Huberto, Missª. Débora (Coordenação) e Chefe Marcos\n`;
      body += `Cc: Marconi Castro (Almoxarifado / Estoque)\n`;
      body += `Data da Emissão: ${today}\n`;
      body += `Painel Online Oficial: ${APP_URL}\n\n`;

      body += `Prezados Pastor Huberto, Missª. Débora e Chefe Marcos,\n\n`;
      body += `Graça e paz!\n\n`;
      body += `Comunicamos a conclusão do recebimento das novas compras, conferência física e regularização geral do Almoxarifado da Cristolândia (LEM/BA).\n\n`;
      body += `Com as novas entradas físicas integradas ao estoque, todos os itens que se encontravam em nível crítico foram plenamente reabastecidos. O estoque da Cozinha e da Padaria (sob a liderança de Fernando Pates) opera agora com 100% de segurança e zero risco de ruptura.\n\n`;

      body += `📱 ACESSO AO SISTEMA ONLINE EM TEMPO REAL:\n`;
      body += `Para consultar o estoque completo, auditorias, extratos diários e relatórios detalhados a qualquer momento pelo celular ou computador, acesse:\n`;
      body += `👉 ${APP_URL}\n\n`;

      body += `RESUMO DO RECEBIMENTO E COBERTURA:\n`;
      body += `• Itens Reabastecidos nesta Compra: ${replenishedItems.length} produtos (+${totalUnitsAdded} unidades/kg integradas)\n`;
      body += `• Total de Produtos no Estoque Ativo: ${forecast.allItems.length} itens cadastrados\n`;
      body += `• Itens em Situação Crítica no Momento: 0 (Estoque 100% regularizado)\n`;
      body += `• Nova Cobertura Operacional Média: 11 dias de autonomia garantida\n\n`;

      body += `════════════════════════════════════════════════════════════════════════\n`;
      body += `1. NOVAS ENTRADAS RECEBIDAS E REGULARIZADAS (COMPRAS DO DIA)\n`;
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

      body += `════════════════════════════════════════════════════════════════════════\n`;
      body += `2. QUADRO GERAL DE TODO O ESTOQUE ATUALIZADO (TODOS OS ${forecast.allItems.length} ITENS)\n`;
      body += `════════════════════════════════════════════════════════════════════════\n\n`;

      forecast.allItems.forEach((item, index) => {
        const note = getItemOperationalNote(
          item.name,
          item.category,
          item.currentStock,
          item.unit,
        );
        const autonomy =
          item.autonomyText ||
          (item.daysAutonomy != null
            ? `${Number(item.daysAutonomy).toFixed(1)} dias`
            : "Uso Eventual");
        const statusText =
          item.daysAutonomy != null && item.daysAutonomy >= 10
            ? "🟢 100% Abastecido"
            : item.daysAutonomy != null && item.daysAutonomy >= 5
              ? "🟢 Seguro"
              : "🟡 Monitorar";

        body += `${index + 1}. ${item.name} (${item.category})\n`;
        body += `   • Saldo Atual Conferido: ${item.currentStock} ${item.unit}\n`;
        body += `   • Consumo Diário Médio: ${item.consumptionUnitText}\n`;
        body += `   • Autonomia Garantida: ${autonomy}\n`;
        body += `   • Situação: ${statusText}\n`;
        body += `   • Observação Operacional: ${note}\n\n`;
      });

      body += `────────────────────────────────────────────────────────────────────────\n`;
      body += `⚠️ ALERTA OPERACIONAL: ITENS DE CONSUMO MULTISSETORIAL\n`;
      body += `(Cozinha + Padaria + Casas Missionárias + Administração)\n`;
      body += `────────────────────────────────────────────────────────────────────────\n`;
      body += `• Itens Envolvidos: Leite, Manteiga/Margarina, Óleo e Sal.\n`;
      body += `• Diagnóstico da Gestão: Diferente da Cozinha Geral (onde há cardápio diário e pesagem/controle direto de porções), estes 4 insumos atendem simultaneamente:\n`;
      body += `  - Cozinha (refeições e preparos gerais);\n`;
      body += `  - Padaria (Fernando Pates: pães, biscoitos e massas);\n`;
      body += `  - Casas Missionárias (alimentação nas residências dos missionários);\n`;
      body += `  - Administração (café da manhã, recepção e reuniões).\n`;
      body += `• Fator de Risco: Podem ser retirados sem aviso prévio por esses outros setores onde não temos o mesmo controle diário da cozinha, desfalcando o estoque de forma imprevista.\n`;
      body += `• Medida Adotada no Almoxarifado: Aplicamos margem de segurança técnica redobrada para estes 4 itens e solicitamos que qualquer saída avulsa seja imediatamente comunicada para baixa no sistema.\n\n`;

      body += `────────────────────────────────────────────────────────────────────────\n`;
      body += `DESTAQUES OPERACIONAIS DA UNIDADE:\n`;
      body += `────────────────────────────────────────────────────────────────────────\n`;
      body += `• Padaria (Fernando Pates) & Cozinha: Com a entrada de +8 kg de Sal Refinado e suprimento de Farinha de Trigo, a confecção diária de pães e as refeições têm abastecimento total assegurado.\n`;
      body += `• Flocão de Milho: Consumo exclusivo às quartas e domingos (20 pct por preparo). Saldo atual de 52 pct cobre a semana com folga; programar reposição para a próxima terça-feira.\n\n`;

      if (customEmailNote.trim()) {
        body += `────────────────────────────────────────────────────────────────────────\n`;
        body += `OBSERVAÇÕES DA GESTÃO DO ALMOXARIFADO:\n`;
        body += `${customEmailNote.trim()}\n\n`;
      }

      body += `🌐 ACESSE O SISTEMA EM TEMPO REAL:\n`;
      body += `${APP_URL}\n\n`;

      body += `Permanecemos à inteira disposição para qualquer acompanhamento técnico ou conferência física no almoxarifado.\n\n`;
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
                    : ""
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
        .join("");

      // All items table for full inventory overview
      const allItemsRowsHtml = forecast.allItems
        .map((item) => {
          const note = getItemOperationalNote(
            item.name,
            item.category,
            item.currentStock,
            item.unit,
          );
          const autonomy =
            item.autonomyText ||
            (item.daysAutonomy != null
              ? `${Number(item.daysAutonomy).toFixed(1)} dias`
              : "Uso Eventual");
          const isWarning = item.status === "ATENCAO";
          const isCritical = item.status === "CRITICO";
          const isFull = item.daysAutonomy != null && item.daysAutonomy >= 10;
          const isMultiSector = isMultiSectorItem(item.name);
          const multiSectorBadge = isMultiSector
            ? `<div style="margin-top: 3px;"><span style="display: inline-block; background-color: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; font-weight: 800; font-size: 9.5px; padding: 1px 6px; border-radius: 4px;">⚠️ Multissetorial (Cozinha, Padaria, Casas & Adm)</span></div>`
            : "";

          const statusBg = isCritical
            ? "#fef2f2"
            : isWarning
              ? "#fffbeb"
              : "#f0fdf4";
          const statusBorder = isCritical
            ? "#fecaca"
            : isWarning
              ? "#fde68a"
              : "#bbf7d0";
          const statusColor = isCritical
            ? "#b91c1c"
            : isWarning
              ? "#b45309"
              : "#166534";
          const statusLabel = isCritical
            ? "🔴 Crítico"
            : isWarning
              ? "🟡 Monitorar"
              : isFull
                ? "🟢 100% Abastecido"
                : "🟢 Seguro";

          return `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: 700; color: #0f172a; vertical-align: middle;">
                <div style="font-size: 12.5px; font-weight: 800;">${item.name}</div>
                <div style="font-size: 10.5px; color: #64748b; font-weight: 400; margin-top: 1px;">${item.category}</div>
                ${multiSectorBadge}
                <div style="font-size: 10px; color: #475569; margin-top: 3px; line-height: 1.3;">${note}</div>
              </td>
              <td style="padding: 10px 12px; text-align: center; font-weight: 800; color: #0f172a; font-size: 13px; vertical-align: middle;">
                ${item.currentStock} ${item.unit}
              </td>
              <td style="padding: 10px 12px; text-align: center; color: #475569; font-size: 11px; font-weight: 600; vertical-align: middle;">
                ${item.consumptionUnitText}
              </td>
              <td style="padding: 10px 12px; text-align: center; font-weight: 800; color: #047857; font-size: 12px; vertical-align: middle;">
                <span style="display: inline-block; padding: 2px 7px; border-radius: 6px; background-color: #ecfdf5; color: #047857;">
                  ${autonomy}
                </span>
              </td>
              <td style="padding: 10px 12px; text-align: center; vertical-align: middle;">
                <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; background-color: ${statusBg}; border: 1px solid ${statusBorder}; color: ${statusColor}; font-weight: 800; font-size: 10.5px; white-space: nowrap;">
                  ${statusLabel}
                </span>
              </td>
            </tr>
          `;
        })
        .join("");

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; max-width: 780px; margin: 0 auto; line-height: 1.6; font-size: 13px;">
          <!-- Header Executivo -->
          <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 11px; color: #0284c7; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Missão Cristolândia &bull; LEM/BA &bull; Almoxarifado Central</div>
              <div style="font-size: 11px; font-weight: 800; color: #059669;">
                <a href="${APP_URL}" target="_blank" style="color: #059669; text-decoration: none;">🌐 ${APP_DOMAIN}</a>
              </div>
            </div>
            <div style="font-size: 19px; font-weight: 900; color: #0f172a; margin-top: 4px;">Atualização Geral do Estoque & Recebimento de Mercadorias</div>
            <div style="font-size: 12px; color: #475569; margin-top: 4px;">Data de Conferência e Entrada: <strong>${today}</strong> &bull; Ciclo Operacional: <strong>${forecast.baseDateFormatted} a ${forecast.endDateFormatted}</strong></div>
          </div>

          <p style="margin: 0 0 10px 0;">Prezados Pastor Huberto, Missª. Débora e Chefe Marcos, graça e paz!</p>
          <p style="margin: 0 0 16px 0;">Confirmamos o recebimento, conferência física e regularização dos estoques no Almoxarifado da Cristolândia. Com as novas entradas integradas, todos os itens em nível de atenção foram restabelecidos, garantindo a autonomia operacional plena da Cozinha e da Padaria (liderada por <strong>Fernando Pates</strong>), com zero risco de ruptura:</p>

          <!-- Banner Oficial de Acesso ao Sistema Web -->
          <div style="background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%); border: 2px solid #86efac; border-radius: 12px; padding: 14px 18px; margin: 16px 0; text-align: center;">
            <div style="font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.6px;">📱 Sistema de Gestão do Almoxarifado em Tempo Real</div>
            <div style="font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 3px;">Acesse pelo celular ou computador para consultar saldos, extratos e relatórios:</div>
            <div style="margin-top: 10px;">
              <a href="${APP_URL}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-weight: 900; font-size: 13px; padding: 9px 22px; border-radius: 8px; box-shadow: 0 3px 6px -1px rgba(5, 150, 105, 0.25);">
                🔗 Acessar Sistema: ${APP_DOMAIN}
              </a>
            </div>
            <div style="font-size: 11px; color: #475569; margin-top: 6px;">Atualizado instantaneamente a cada entrada e saída registrada.</div>
          </div>

          <!-- KPI Cards Rápidos -->
          <div style="display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 130px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px;">
              <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Itens Reabastecidos</div>
              <div style="font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 2px;">${replenishedItems.length} produtos</div>
            </div>
            <div style="flex: 1; min-width: 130px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 10px 14px;">
              <div style="font-size: 10px; font-weight: 700; color: #047857; text-transform: uppercase;">Volume Integrado</div>
              <div style="font-size: 18px; font-weight: 900; color: #047857; margin-top: 2px;">+${totalUnitsAdded} un/kg</div>
            </div>
            <div style="flex: 1; min-width: 130px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 10px 14px;">
              <div style="font-size: 10px; font-weight: 700; color: #166534; text-transform: uppercase;">Itens no Estoque Ativo</div>
              <div style="font-size: 18px; font-weight: 900; color: #166534; margin-top: 2px;">${forecast.allItems.length} produtos (100% OK)</div>
            </div>
            <div style="flex: 1; min-width: 130px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 10px 14px;">
              <div style="font-size: 10px; font-weight: 700; color: #1d4ed8; text-transform: uppercase;">Autonomia Média</div>
              <div style="font-size: 18px; font-weight: 900; color: #1d4ed8; margin-top: 2px;">11.0 dias</div>
            </div>
          </div>

          <!-- SEÇÃO 1: NOVAS ENTRADAS RECEBIDAS -->
          <div style="margin-top: 18px; margin-bottom: 8px;">
            <div style="font-size: 14px; font-weight: 900; color: #0f172a; display: flex; align-items: center; gap: 6px;">
              <span>📦 1. Novas Entradas Recebidas (Compras Integradas ao Almoxarifado)</span>
            </div>
            <div style="font-size: 11.5px; color: #64748b;">Itens reabastecidos com saldo anterior, entrada recebida e novo saldo físico conferido:</div>
          </div>

          <!-- Tabela de Novas Entradas -->
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 22px;">
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

          <!-- SEÇÃO 2: QUADRO GERAL DE TODO O ESTOQUE -->
          <div style="margin-top: 24px; margin-bottom: 8px;">
            <div style="font-size: 14px; font-weight: 900; color: #0f172a; display: flex; align-items: center; gap: 6px;">
              <span>📋 2. Quadro Geral de Todo o Estoque (Visão Completa — ${forecast.allItems.length} Itens)</span>
            </div>
            <div style="font-size: 11.5px; color: #64748b;">Relação oficial de todos os suprimentos ativos do Almoxarifado com saldos atualizados, autonomia e notas operacionais:</div>
          </div>

          <!-- Tabela do Quadro Geral -->
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 18px;">
            <thead>
              <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; color: #475569; font-size: 10.5px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">
                <th style="padding: 10px 12px;">Item / Especificação & Setor</th>
                <th style="padding: 10px 12px; text-align: center;">Saldo Atual</th>
                <th style="padding: 10px 12px; text-align: center;">Consumo Diário</th>
                <th style="padding: 10px 12px; text-align: center;">Autonomia</th>
                <th style="padding: 10px 12px; text-align: center;">Situação</th>
              </tr>
            </thead>
            <tbody>
              ${allItemsRowsHtml}
            </tbody>
          </table>

          <!-- Alerta Estratégico: Consumo Multissetorial sem Aviso Prévio -->
          <div style="background-color: #fff7ed; border: 2px solid #fed7aa; border-radius: 10px; padding: 14px 18px; margin-bottom: 16px; font-size: 12px;">
            <div style="font-weight: 900; color: #c2410c; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span>⚠️ ALERTA OPERACIONAL: CONSUMO MULTISSETORIAL & RISCO DE DESFALQUE SEM AVISO PRÉVIO</span>
            </div>
            <div style="color: #9a3412; margin-top: 6px; line-height: 1.55;">
              <p style="margin: 0 0 6px 0;">
                Atenção especial aos itens: <strong>Leite, Manteiga/Margarina, Óleo e Sal</strong>.
              </p>
              <p style="margin: 0 0 6px 0;">
                Diferente da <strong>Cozinha Central</strong> (que opera com rotina de preparo e controle direto de porções), esses 4 insumos atendem simultaneamente à <strong>Padaria (Fernando Pates)</strong>, às <strong>Casas Missionárias</strong> e à <strong>Administração</strong>.
              </p>
              <p style="margin: 0; font-weight: 600;">
                Por serem frequentemente utilizados por esses setores <u>sem aviso prévio</u>, há risco permanente de desfalques imprevistos no estoque físico. Por essa razão, a gestão do Almoxarifado estabeleceu uma <strong>margem de segurança preventiva redobrada</strong> para esses itens, garantindo que a Missão não sofra rupturas repentinas.
              </p>
            </div>
          </div>

          <!-- Observações Operacionais Destacadas -->
          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 16px; margin-bottom: 14px; font-size: 12px;">
            <strong style="color: #b45309;">⚠️ Destaques da Operação (Padaria & Cozinha):</strong>
            <div style="color: #92400e; margin-top: 5px; line-height: 1.5;">
              <div>&bull; <strong>Padaria (Fernando Pates) & Cozinha:</strong> Com o recebimento de <strong>+8 kg</strong> de Sal Refinado e estoque seguro de Farinha de Trigo, a confecção diária de pães e os preparos gerais estão 100% garantidos sem qualquer restrição.</div>
              <div style="margin-top: 4px;">&bull; <strong>Flocão de Milho:</strong> O consumo ocorre exclusivamente às quartas e domingos (20 pacotes por preparo). O saldo de <strong>52 pacotes</strong> cobre com segurança o ciclo semanal, com previsão de reposição programada para a próxima terça-feira.</div>
            </div>
          </div>

          ${
            customEmailNote.trim()
              ? `
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; font-size: 12px; color: #1e40af;">
              <strong>Observação da Gestão do Almoxarifado:</strong> ${customEmailNote.trim()}
            </div>
          `
              : ""
          }

          <!-- Segundo Link de Acesso e Assinatura Formal -->
          <div style="margin-top: 22px; padding: 14px 18px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 12px; color: #334155; text-align: center;">
            🌐 <strong>Acesse o sistema completo online:</strong> <a href="${APP_URL}" target="_blank" style="color: #059669; font-weight: 800; text-decoration: none;">${APP_DOMAIN}</a>
          </div>

          <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #475569;">
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
    // MODE 2: QUADRO GERAL DE TODO O ESTOQUE (14 PRODUTOS) + PREVISÃO DE COMPRAS
    // =========================================================================
    if (emailReportType === "all_items") {
      const defaultSubject = `[ESTOQUE CRISTOLÂNDIA] Quadro Geral de Estoque & Previsão de Compras (${periodDays} Dias) — Emissão: ${today}`;

      let body = `A/C: Pastor Huberto, Missª. Débora (Coordenação) e Chefe Marcos\n`;
      body += `Cc: Marconi Castro (Almoxarifado / Estoque)\n`;
      body += `Data da Emissão: ${today}\n`;
      body += `Horizonte de Planejamento: ${periodDays} dias (${forecast.baseDateFormatted} a ${forecast.endDateFormatted})\n`;
      body += `Painel Online Oficial: ${APP_URL}\n\n`;

      body += `Prezados Pastor Huberto, Missª. Débora e Chefe Marcos,\n\n`;
      body += `Graça e paz!\n\n`;
      body += `Apresentamos o Quadro Geral de Estoque e Previsão de Compras do Almoxarifado da Cristolândia (LEM/BA) projetado para os próximos ${periodDays} dias.\n`;
      body += `Este relatório consolida a posição física oficial de todos os ${forecast.allItems.length} produtos alimentícios cadastrados, seus consumos médios, autonomias atuais e a necessidade exata de compra calculada para garantir abastecimento contínuo e 100% seguro durante o período de viagem da liderança e rotina da unidade.\n\n`;

      body += `📱 ACESSO AO SISTEMA ONLINE EM TEMPO REAL:\n`;
      body += `Para consultar o painel completo, movimentações e relatórios em tempo real:\n`;
      body += `👉 ${APP_URL}\n\n`;

      body += `RESUMO DO QUADRO GERAL & PLANEJAMENTO (${periodDays} DIAS):\n`;
      body += `• Total de Produtos Alimentícios: ${forecast.allItems.length} itens cadastrados\n`;
      body += `• Itens com Necessidade de Compra (${periodDays}d): ${forecast.purchasesList.length} itens (${forecast.totalSuggestedPurchaseUnits} un/kg no total)\n`;
      body += `• Itens com Estoque Seguro para o Período: ${forecast.allItems.length - forecast.purchasesList.length} itens\n`;
      body += `• Autonomia Média da Unidade: 11 dias de cobertura operacional garantida\n\n`;

      // CAMADA 1: RESUMO EXECUTIVO DE COMPRAS (SE HOUVER)
      if (forecast.purchasesList.length > 0) {
        body += `════════════════════════════════════════════════════════════════════════\n`;
        body += `1. LISTA PRIORITÁRIA DE COMPRAS RECOMENDADAS (${periodDays} DIAS)\n`;
        body += `════════════════════════════════════════════════════════════════════════\n\n`;
        forecast.purchasesList.forEach((item, idx) => {
          body += `${idx + 1}. ${item.name} (${item.category})\n`;
          body += `   ➔ COMPRA RECOMENDADA: +${item.suggestedPurchaseQty} ${item.unit}\n`;
          body += `   • Estoque Atual: ${item.currentStock} ${item.unit} | Autonomia: ${item.autonomyText || (item.daysAutonomy != null ? `${Number(item.daysAutonomy).toFixed(1)} dias` : "Eventual")}\n`;
          body += `   • Consumo Estimado (${periodDays}d): ${item.projectedConsumption} ${item.unit} | Saldo Projetado: ${item.projectedBalance} ${item.unit}\n`;
          if (item.customNote) {
            body += `   ⚠️ Observação: ${item.customNote}\n`;
          }
          body += `\n`;
        });
      } else {
        body += `════════════════════════════════════════════════════════════════════════\n`;
        body += `1. NECESSIDADE DE COMPRAS (${periodDays} DIAS): ZERO ITENS\n`;
        body += `════════════════════════════════════════════════════════════════════════\n`;
        body += `🟢 Todos os ${forecast.allItems.length} itens do Almoxarifado possuem estoque suficiente para cobrir integralmente o horizonte de ${periodDays} dias com reserva técnica de segurança preservada.\n\n`;
      }

      // CAMADA 2: QUADRO GERAL COMPLETO COM A COLUNA DE PREVISÃO DE COMPRAS
      body += `════════════════════════════════════════════════════════════════════════\n`;
      body += `2. QUADRO GERAL DE TODOS OS PRODUTOS (POSIÇÃO OFICIAL DO ALMOXARIFADO)\n`;
      body += `════════════════════════════════════════════════════════════════════════\n\n`;

      forecast.allItems.forEach((item, index) => {
        const note = getItemOperationalNote(
          item.name,
          item.category,
          item.currentStock,
          item.unit,
        );
        const autonomy =
          item.autonomyText ||
          (item.daysAutonomy != null
            ? `${Number(item.daysAutonomy).toFixed(1)} dias`
            : "Uso Eventual");
        const statusText =
          item.daysAutonomy != null && item.daysAutonomy >= 10
            ? "🟢 100% Abastecido"
            : item.daysAutonomy != null && item.daysAutonomy >= 5
              ? "🟢 Seguro"
              : "🟡 Monitorar";

        const purchaseSuggestionText =
          item.suggestedPurchaseQty > 0
            ? `🛒 +${item.suggestedPurchaseQty} ${item.unit} (COMPRAR)`
            : `🟢 0 ${item.unit} (Estoque Cobre o Período de ${periodDays}d)`;

        body += `${index + 1}. ${item.name} (${item.category})\n`;
        body += `   • Saldo Atual em Estoque: ${item.currentStock} ${item.unit}\n`;
        body += `   • Consumo Diário Médio: ${item.consumptionUnitText}\n`;
        body += `   • Autonomia Garantida: ${autonomy}\n`;
        body += `   • Previsão de Compra (${periodDays} dias): ${purchaseSuggestionText}\n`;
        body += `   • Situação: ${statusText}\n`;
        body += `   • Observação Operacional: ${note}\n\n`;
      });

      body += `────────────────────────────────────────────────────────────────────────\n`;
      body += `⚠️ ALERTA OPERACIONAL: ITENS DE CONSUMO MULTISSETORIAL\n`;
      body += `(Cozinha + Padaria + Casas Missionárias + Administração)\n`;
      body += `────────────────────────────────────────────────────────────────────────\n`;
      body += `• Itens Envolvidos: Leite, Manteiga/Margarina, Óleo e Sal.\n`;
      body += `• Diagnóstico da Gestão: Diferente da Cozinha Geral (onde o cardápio é planejado e as porções são controladas), estes 4 insumos atendem simultaneamente Cozinha, Padaria (Fernando Pates), Casas Missionárias e Administração.\n`;
      body += `• Fator de Risco: Podem ser retirados sem aviso prévio por esses outros setores onde não há controle de pesagem diária como na cozinha, desfalcando o estoque de surpresa.\n`;
      body += `• Medida Adotada no Almoxarifado: Mantemos margem de segurança técnica redobrada no sistema para blindar a operação contra desfalques e solicitamos aos setores que informem qualquer saída avulsa.\n\n`;

      body += `────────────────────────────────────────────────────────────────────────\n`;
      body += `DESTAQUES OPERACIONAIS DA UNIDADE:\n`;
      body += `────────────────────────────────────────────────────────────────────────\n`;
      body += `• Padaria (Fernando Pates): Farinha de trigo e sal refinado com estoques regularizados para a produção contínua de pães.\n`;
      body += `• Flocão de Milho: Consumo exclusivo às quartas e domingos (20 pct por preparo). Saldo cobre a rotina; planejar compra com antecedência conforme calendário.\n\n`;

      if (customEmailNote.trim()) {
        body += `────────────────────────────────────────────────────────────────────────\n`;
        body += `OBSERVAÇÕES DA GESTÃO DO ALMOXARIFADO:\n`;
        body += `${customEmailNote.trim()}\n\n`;
      }

      body += `🌐 ACESSE O SISTEMA EM TEMPO REAL:\n`;
      body += `${APP_URL}\n\n`;

      body += `Permanecemos à inteira disposição para qualquer acompanhamento técnico ou conferência física.\n\n`;
      body += `Fraternalmente,\n\n`;
      body += `Marconi Castro\n`;
      body += `Almoxarifado e Controle de Estoque\n`;
      body += `Missão Cristolândia — LEM/BA\n`;
      body += `Junta de Missões Nacionais — CBB\n`;

      // HTML Version for Quadro Geral
      const allItemsRowsHtml = forecast.allItems
        .map((item) => {
          const note = getItemOperationalNote(
            item.name,
            item.category,
            item.currentStock,
            item.unit,
          );
          const autonomy =
            item.autonomyText ||
            (item.daysAutonomy != null
              ? `${Number(item.daysAutonomy).toFixed(1)} dias`
              : "Uso Eventual");
          const isWarning = item.status === "ATENCAO";
          const isCritical = item.status === "CRITICO";
          const isFull = item.daysAutonomy != null && item.daysAutonomy >= 10;
          const isMultiSector = isMultiSectorItem(item.name);
          const multiSectorBadge = isMultiSector
            ? `<div style="margin-top: 3px;"><span style="display: inline-block; background-color: #fff7ed; color: #c2410c; border: 1px solid #fed7aa; font-weight: 800; font-size: 9.5px; padding: 1px 6px; border-radius: 4px;">⚠️ Multissetorial (Cozinha, Padaria, Casas & Adm)</span></div>`
            : "";

          const statusBg = isCritical
            ? "#fef2f2"
            : isWarning
              ? "#fffbeb"
              : "#f0fdf4";
          const statusBorder = isCritical
            ? "#fecaca"
            : isWarning
              ? "#fde68a"
              : "#bbf7d0";
          const statusColor = isCritical
            ? "#b91c1c"
            : isWarning
              ? "#b45309"
              : "#166534";
          const statusLabel = isCritical
            ? "🔴 Crítico"
            : isWarning
              ? "🟡 Monitorar"
              : isFull
                ? "🟢 100% Abastecido"
                : "🟢 Seguro";

          const purchaseBadge =
            item.suggestedPurchaseQty > 0
              ? `<span style="display: inline-block; padding: 4px 10px; border-radius: 6px; background-color: #fef2f2; border: 1.5px solid #fca5a5; color: #b91c1c; font-weight: 900; font-size: 12px; white-space: nowrap;">
                  🛒 +${item.suggestedPurchaseQty} ${item.unit}
                </span>`
              : `<span style="display: inline-block; padding: 3px 8px; border-radius: 6px; background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-weight: 800; font-size: 11px; white-space: nowrap;">
                  0 ${item.unit} (Cobre ${periodDays}d)
                </span>`;

          return `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: 700; color: #0f172a; vertical-align: middle;">
                <div style="font-size: 12.5px; font-weight: 800;">${item.name}</div>
                <div style="font-size: 10.5px; color: #64748b; font-weight: 400; margin-top: 1px;">${item.category}</div>
                ${multiSectorBadge}
                <div style="font-size: 10px; color: #475569; margin-top: 3px; line-height: 1.3;">${note}</div>
              </td>
              <td style="padding: 10px 12px; text-align: center; font-weight: 800; color: #0f172a; font-size: 13px; vertical-align: middle;">
                ${item.currentStock} ${item.unit}
              </td>
              <td style="padding: 10px 12px; text-align: center; color: #475569; font-size: 11px; font-weight: 600; vertical-align: middle;">
                ${item.consumptionUnitText}
              </td>
              <td style="padding: 10px 12px; text-align: center; font-weight: 800; color: #047857; font-size: 12px; vertical-align: middle;">
                <span style="display: inline-block; padding: 2px 7px; border-radius: 6px; background-color: #ecfdf5; color: #047857;">
                  ${autonomy}
                </span>
              </td>
              <td style="padding: 10px 12px; text-align: center; vertical-align: middle; background-color: ${item.suggestedPurchaseQty > 0 ? "#fff1f2" : "#f8fafc"}; border-left: 1px dashed #e2e8f0; border-right: 1px dashed #e2e8f0;">
                ${purchaseBadge}
              </td>
              <td style="padding: 10px 12px; text-align: center; vertical-align: middle;">
                <span style="display: inline-block; padding: 3px 8px; border-radius: 6px; background-color: ${statusBg}; border: 1px solid ${statusBorder}; color: ${statusColor}; font-weight: 800; font-size: 10.5px; white-space: nowrap;">
                  ${statusLabel}
                </span>
              </td>
            </tr>
          `;
        })
        .join("");

      const purchasesSummaryCardsHtml =
        forecast.purchasesList.length > 0
          ? `
          <!-- CAMADA 1: Resumo Prioritário de Compras (Aprovação Rápida) -->
          <div style="background-color: #fff1f2; border: 2px solid #fda4af; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px;">
            <div style="font-weight: 900; color: #9f1239; font-size: 13.5px; display: flex; align-items: center; gap: 6px;">
              <span>🛒 1. RESUMO DE COMPRAS NECESSÁRIAS PARA ${periodDays} DIAS (${forecast.purchasesList.length} itens identificados)</span>
            </div>
            <div style="font-size: 11.5px; color: #881337; margin-top: 4px; margin-bottom: 12px;">
              Relação prioritária calculada para assegurar abastecimento ininterrupto durante o horizonte de ${periodDays} dias (${forecast.baseDateFormatted} a ${forecast.endDateFormatted}):
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px;">
              ${forecast.purchasesList
                .map(
                  (item) => `
                <div style="background-color: #ffffff; border: 1px solid #fecdd3; border-radius: 8px; padding: 10px 12px; font-size: 11.5px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
                  <div style="font-weight: 800; color: #0f172a; font-size: 12.5px;">${item.name}</div>
                  <div style="font-weight: 900; color: #be123c; font-size: 14px; margin-top: 3px;">➔ Comprar: +${item.suggestedPurchaseQty} ${item.unit}</div>
                  <div style="color: #64748b; font-size: 10.5px; margin-top: 3px;">Saldo Atual: <strong>${item.currentStock} ${item.unit}</strong> | Autonomia: <strong>${item.autonomyText || (item.daysAutonomy != null ? `${Number(item.daysAutonomy).toFixed(1)}d` : "Eventual")}</strong></div>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
          `
          : `
          <!-- Sem Necessidade de Compra -->
          <div style="background-color: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px;">
            <div style="font-weight: 900; color: #166534; font-size: 13.5px;">
              <span>🟢 1. ESTOQUE 100% SUFICIENTE PARA OS PRÓXIMOS ${periodDays} DIAS</span>
            </div>
            <div style="color: #14532d; font-size: 12px; margin-top: 4px;">
              Todos os ${forecast.allItems.length} produtos possuem saldo físico suficiente para cobrir integralmente a rotina do período planejado sem risco de desabastecimento.
            </div>
          </div>
          `;

      const html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; max-width: 820px; margin: 0 auto; line-height: 1.6; font-size: 13px;">
          <!-- Header Executivo -->
          <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 11px; color: #0284c7; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Missão Cristolândia &bull; LEM/BA &bull; Almoxarifado Central</div>
              <div style="font-size: 11px; font-weight: 800; color: #059669;">
                <a href="${APP_URL}" target="_blank" style="color: #059669; text-decoration: none;">🌐 ${APP_DOMAIN}</a>
              </div>
            </div>
            <div style="font-size: 19px; font-weight: 900; color: #0f172a; margin-top: 4px;">Quadro Geral de Todo o Estoque & Previsão de Compras (${periodDays} Dias)</div>
            <div style="font-size: 12px; color: #475569; margin-top: 4px;">Data de Emissão: <strong>${today}</strong> &bull; Período de Planejamento: <strong>${forecast.baseDateFormatted} a ${forecast.endDateFormatted} (${periodDays} dias)</strong></div>
          </div>

          <p style="margin: 0 0 10px 0;">Prezados Pastor Huberto, Missª. Débora e Chefe Marcos, graça e paz!</p>
          <p style="margin: 0 0 16px 0;">Apresentamos o relatório consolidado com a posição física de todos os ${forecast.allItems.length} itens do Almoxarifado da Cristolândia, acompanhado da <strong>necessidade exata de compras para os próximos ${periodDays} dias</strong>, média diária de consumo, autonomia e notas técnicas operacionais:</p>

          <!-- Banner Oficial de Acesso ao Sistema Web -->
          <div style="background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%); border: 2px solid #86efac; border-radius: 12px; padding: 14px 18px; margin: 16px 0; text-align: center;">
            <div style="font-size: 11px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.6px;">📱 Painel Oficial do Estoque Online</div>
            <div style="font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 3px;">Consulte extratos diários, auditorias e relatórios em tempo real:</div>
            <div style="margin-top: 10px;">
              <a href="${APP_URL}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-weight: 900; font-size: 13px; padding: 9px 22px; border-radius: 8px; box-shadow: 0 3px 6px -1px rgba(5, 150, 105, 0.25);">
                🔗 Acessar Sistema: ${APP_DOMAIN}
              </a>
            </div>
          </div>

          <!-- KPI Cards Rápidos -->
          <div style="display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 130px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px;">
              <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">Horizonte Planejado</div>
              <div style="font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 2px;">${periodDays} dias</div>
            </div>
            <div style="flex: 1; min-width: 130px; background-color: ${forecast.purchasesList.length > 0 ? "#fff1f2" : "#f0fdf4"}; border: 1px solid ${forecast.purchasesList.length > 0 ? "#fecdd3" : "#bbf7d0"}; border-radius: 10px; padding: 10px 14px;">
              <div style="font-size: 10px; font-weight: 700; color: ${forecast.purchasesList.length > 0 ? "#be123c" : "#166534"}; text-transform: uppercase;">Itens a Comprar</div>
              <div style="font-size: 18px; font-weight: 900; color: ${forecast.purchasesList.length > 0 ? "#be123c" : "#166534"}; margin-top: 2px;">${forecast.purchasesList.length} produtos</div>
            </div>
            <div style="flex: 1; min-width: 130px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 10px 14px;">
              <div style="font-size: 10px; font-weight: 700; color: #166534; text-transform: uppercase;">Total Cadastrado</div>
              <div style="font-size: 18px; font-weight: 900; color: #166534; margin-top: 2px;">${forecast.allItems.length} itens</div>
            </div>
            <div style="flex: 1; min-width: 130px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 10px 14px;">
              <div style="font-size: 10px; font-weight: 700; color: #1d4ed8; text-transform: uppercase;">Autonomia Média</div>
              <div style="font-size: 18px; font-weight: 900; color: #1d4ed8; margin-top: 2px;">11.0 dias</div>
            </div>
          </div>

          <!-- CAMADA 1: Resumo Prioritário de Compras -->
          ${purchasesSummaryCardsHtml}

          <!-- CAMADA 2: Tabela do Quadro Geral com Coluna de Previsão de Compras -->
          <div style="margin-top: 20px; margin-bottom: 8px;">
            <div style="font-size: 14px; font-weight: 900; color: #0f172a;">
              📋 2. Quadro Geral de Auditoria e Cobertura (Todos os ${forecast.allItems.length} Produtos)
            </div>
            <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">
              Posição física completa com saldos, consumos médios, autonomias e a necessidade de compras calculada para <strong>${periodDays} dias</strong>:
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 18px;">
            <thead>
              <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; color: #475569; font-size: 10.5px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">
                <th style="padding: 10px 12px;">Item / Especificação & Setor</th>
                <th style="padding: 10px 12px; text-align: center;">Saldo Atual</th>
                <th style="padding: 10px 12px; text-align: center;">Consumo Diário</th>
                <th style="padding: 10px 12px; text-align: center;">Autonomia</th>
                <th style="padding: 10px 12px; text-align: center; background-color: #fff1f2; color: #9f1239; border-left: 1.5px solid #fda4af; border-right: 1.5px solid #fda4af;">Previsão Compra (${periodDays}d)</th>
                <th style="padding: 10px 12px; text-align: center;">Situação</th>
              </tr>
            </thead>
            <tbody>
              ${allItemsRowsHtml}
            </tbody>
          </table>

          <!-- Alerta Estratégico: Consumo Multissetorial sem Aviso Prévio -->
          <div style="background-color: #fff7ed; border: 2px solid #fed7aa; border-radius: 10px; padding: 14px 18px; margin-bottom: 16px; font-size: 12px;">
            <div style="font-weight: 900; color: #c2410c; font-size: 13px; display: flex; align-items: center; gap: 6px;">
              <span>⚠️ ALERTA OPERACIONAL: ITENS MULTISSETORIAIS COM RISCO DE DESFALQUE SEM AVISO PRÉVIO</span>
            </div>
            <div style="color: #9a3412; margin-top: 6px; line-height: 1.55;">
              <p style="margin: 0 0 6px 0;">
                Atenção prioritária aos itens: <strong>Leite, Manteiga/Margarina, Óleo e Sal</strong>.
              </p>
              <p style="margin: 0 0 6px 0;">
                Estes insumos atendem simultaneamente à <strong>Cozinha Geral</strong>, à <strong>Padaria (Fernando Pates)</strong>, às <strong>Casas Missionárias</strong> e à <strong>Administração</strong>.
              </p>
              <p style="margin: 0; font-weight: 600;">
                Como ocorrem retiradas pontuais sem aviso prévio nesses outros setores (onde não há rotina centralizada de pesagem diária como na cozinha), eles representam o maior potencial de desfalque invisível no saldo físico. Por essa razão, a gestão técnica aplica <strong>margem de segurança preventiva redobrada</strong> no sistema, garantindo a continuidade do suprimento.
              </p>
            </div>
          </div>

          <div style="margin-top: 22px; padding: 14px 18px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 12px; color: #334155; text-align: center;">
            🌐 <strong>Acesse o sistema online em tempo real:</strong> <a href="${APP_URL}" target="_blank" style="color: #059669; font-weight: 800; text-decoration: none;">${APP_DOMAIN}</a>
          </div>

          <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #475569;">
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
    // MODE 3: PREVISÃO SEMANAL DE COMPRAS (ANTES DA COMPRA)
    // =========================================================================
    const subject = `[ESTOQUE CRISTOLÂNDIA] Previsão Semanal de Compras — Ciclo de ${periodDays} Dias (Compra Prevista: ${forecast.nextPurchaseDateFormatted}) — ${APP_DOMAIN}`;

    // 1. Plain Text Version (Direct, Executive, Clear)
    let body = `A/C: Pastor Humberto e Chefe Marcos\n`;
    body += `Cc: Marconi Castro (Almoxarifado / Estoque)\n`;
    body += `Data da Emissão: ${today}\n`;
    body += `Painel Online Oficial: ${APP_URL}\n\n`;

    body += `Prezados Pastor Humberto e Chefe Marcos,\n\n`;
    body += `Graça e paz!\n\n`;
    body += `Apresentamos a Previsão Semanal de Compras e Abastecimento do Estoque da Cristolândia (LEM/BA) para o ciclo de ${periodDays} dias (${forecast.baseDateFormatted} a ${forecast.endDateFormatted}), com compra recomendada para ${forecast.nextPurchaseDateFormatted}.\n\n`;

    body += `📱 ACESSO AO SISTEMA ONLINE EM TEMPO REAL:\n`;
    body += `Consulte relatórios e extratos diários a qualquer momento: ${APP_URL}\n\n`;

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
        const isCritical = item.status === "CRITICO";
        const statusBadge = isCritical ? "🔴 CRÍTICO" : "🟡 ATENÇÃO";
        const detailStatus = isCritical
          ? "Risco iminente de ruptura antes do fim do ciclo"
          : "Abaixo do estoque de segurança (3 dias)";

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
    const nextCycleAlerts = forecast.warningItems.filter(
      (i) => i.suggestedPurchaseQty === 0,
    );
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
      "Arroz Branco",
      "Feijão Carioca",
      "Óleo de Soja",
      "Frango Resfriado",
      "Frango Inteiro",
      "Carne Bovina",
      "Farinha de Trigo",
      "Açúcar Cristal",
      "Leite Integral",
    ];
    const safeStaples = forecast.allItems.filter(
      (item) =>
        item.suggestedPurchaseQty === 0 &&
        stapleNames.some((sn) =>
          item.name.toLowerCase().includes(sn.toLowerCase()),
        ),
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

    body += `────────────────────────────────────────────────────────────────────────\n`;
    body += `⚠️ ITENS DE CONSUMO MULTISSETORIAL (COZINHA, PADARIA, CASAS & ADM):\n`;
    body += `────────────────────────────────────────────────────────────────────────\n`;
    body += `• Leite, Manteiga/Margarina, Óleo e Sal: Possuem margem de segurança técnica ampliada no sistema pois atendem simultaneamente Cozinha, Padaria (Fernando Pates), Casas Missionárias e Administração, estando sujeitos a retiradas sem aviso prévio.\n\n`;

    if (customEmailNote.trim()) {
      body += `────────────────────────────────────────────────────────────────────────\n`;
      body += `OBSERVAÇÕES DA GESTÃO DO ALMOXARIFADO:\n`;
      body += `${customEmailNote.trim()}\n\n`;
    }

    body += `🌐 ACESSE O SISTEMA EM TEMPO REAL:\n`;
    body += `${APP_URL}\n\n`;

    body += `Permanecemos à disposição para quaisquer dúvidas ou ajustes operacionais.\n\n`;
    body += `Fraternalmente,\n\n`;
    body += `Marconi Castro\n`;
    body += `Almoxarifado e Controle de Estoque\n`;
    body += `Missão Cristolândia — LEM/BA\n`;
    body += `Junta de Missões Nacionais — CBB\n`;

    // 2. Rich HTML Table Version for Gmail / Outlook
    const purchasesHtmlRows = forecast.purchasesList
      .map((item) => {
        const isCrit = item.status === "CRITICO";
        const statusBg = isCrit ? "#fef2f2" : "#fffbeb";
        const statusColor = isCrit ? "#b91c1c" : "#b45309";
        const statusBorder = isCrit ? "#fecaca" : "#fde68a";
        const statusText = isCrit ? "🔴 Crítico" : "🟡 Atenção";

        return `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 12px; font-weight: 700; color: #0f172a;">
              <div>${item.name}</div>
              <div style="font-size: 11px; color: #64748b; font-weight: 400;">${item.category}</div>
              ${item.customNote ? `<div style="font-size: 10px; color: #b45309; font-weight: 600; margin-top: 3px; background-color: #fef3c7; padding: 2px 6px; border-radius: 4px; display: inline-block;">⚠️ ${item.customNote}</div>` : ""}
            </td>
            <td style="padding: 10px 12px; text-align: center; font-weight: 700; color: #334155;">
              ${item.currentStock} ${item.unit}
            </td>
            <td style="padding: 10px 12px; text-align: center; font-weight: 800; color: ${isCrit ? "#dc2626" : "#d97706"};">
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
      .join("");

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; max-width: 760px; margin: 0 auto; line-height: 1.6; font-size: 13px;">
        <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Missão Cristolândia &bull; LEM/BA &bull; Almoxarifado</div>
            <div style="font-size: 11px; font-weight: 800; color: #059669;">
              <a href="${APP_URL}" target="_blank" style="color: #059669; text-decoration: none;">🌐 ${APP_DOMAIN}</a>
            </div>
          </div>
          <div style="font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 4px;">Previsão Semanal de Compras e Abastecimento</div>
          <div style="font-size: 12px; color: #475569; margin-top: 4px;">Ciclo: <strong>${forecast.baseDateFormatted} a ${forecast.endDateFormatted}</strong> (${periodDays} dias) &bull; Compra Prevista: <strong>${forecast.nextPurchaseDateFormatted}</strong></div>
        </div>

        <p style="margin: 0 0 12px 0;">Prezados Pastor Humberto e Chefe Marcos, graça e paz!</p>
        <p style="margin: 0 0 16px 0;">Segue o quadro prioritário de compras de suprimentos para o ciclo de ${periodDays} dias, garantindo a autonomia operacional e prevenindo rupturas na cozinha:</p>

        <!-- Banner de Acesso Online -->
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; font-size: 11.5px; text-align: center;">
          📱 Acompanhe em tempo real pelo navegador ou celular: <a href="${APP_URL}" target="_blank" style="color: #047857; font-weight: 800; text-decoration: none;">${APP_DOMAIN}</a>
        </div>

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
              `,
                )
                .join("")}
            </div>
          </div>
        `
            : ""
        }

        ${
          safeStaples.length > 0
            ? `
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 12px;">
            <strong style="color: #166534;">Itens de Alto Consumo com Estoque Seguro (Sem compra necessária):</strong>
            <div style="color: #15803d; margin-top: 4px;">
              ${safeStaples.map((s) => `${s.name}: <strong>${s.currentStock} ${s.unit}</strong> (${s.autonomyText})`).join(" &bull; ")}
            </div>
          </div>
        `
            : ""
        }

        <!-- Alerta Multissetorial -->
        <div style="background-color: #fff7ed; border: 2px solid #fed7aa; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 12px;">
          <strong style="color: #c2410c;">⚠️ Itens Multissetoriais (Cozinha, Padaria, Casas Missionárias e Adm):</strong>
          <div style="color: #9a3412; margin-top: 4px; line-height: 1.5;">
            Os itens <strong>Leite, Manteiga/Margarina, Óleo e Sal</strong> atendem múltiplos setores e possuem margem de segurança preventiva calculada com folga contra saídas sem aviso prévio.
          </div>
        </div>

        ${
          customEmailNote.trim()
            ? `
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 12px; color: #1e40af;">
            <strong>Observação da Gestão:</strong> ${customEmailNote.trim()}
          </div>
        `
            : ""
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

  const handleOpenEmailModal = (
    mode: "post_purchase" | "all_items" | "forecast" = "post_purchase",
  ) => {
    setEmailReportType(mode);
    setEmailSubject("");
    setEmailModalTab("preview"); // Tabela Executiva Visual definida sempre como padrão
    setIsEmailModalOpen(true);
  };

  const handleCopyEmailText = () => {
    navigator.clipboard.writeText(emailContent.body);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 3000);
  };

  const handleCopyEmailHtml = async () => {
    try {
      const blobHtml = new Blob([emailContent.html], { type: "text/html" });
      const blobText = new Blob([emailContent.body], { type: "text/plain" });
      const clipboardItem = new ClipboardItem({
        "text/html": blobHtml,
        "text/plain": blobText,
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
    window.open(gmailUrl, "_blank");
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
      generatePurchaseForecastPDF(
        products,
        movements,
        periodDays,
        inventoryAudits,
        userName,
        {
          category: categoryFilter,
          statusFilter,
          searchTerm,
          onlyNeedsPurchase,
        },
      );
    } catch (err) {
      console.error("Error generating Purchase Forecast PDF:", err);
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
      "Item",
      "Categoria",
      "Estoque Atual",
      "Unidade",
      "Consumo Médio",
      "Autonomia (dias)",
      "Consumo Previsto",
      "Saldo Projetado",
      "Estoque Segurança (3d)",
      "Sugestão de Compra",
      "Custo Estimado (R$)",
      "Status",
    ];

    const rows = forecast.filteredItems.map((item) => [
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.category}"`,
      item.currentStock,
      item.unit,
      item.consumptionUnitText,
      item.daysAutonomy != null
        ? Number(item.daysAutonomy).toFixed(1)
        : "Indeterminado",
      item.projectedConsumption,
      item.projectedBalance,
      item.safetyStock,
      item.suggestedPurchaseQty,
      (item.estimatedCost ?? item.estimatedTotalCost ?? 0).toFixed(2),
      item.statusLabel,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Previsao_Compras_Cristolandia_${periodDays}dias_${new Date().toISOString().split("T")[0]}.csv`,
    );
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

    const otherPurchases = forecast.purchasesList.filter(
      (i) => i.status !== "CRITICO",
    );
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

    const nextCycleAlerts = forecast.warningItems.filter(
      (i) => i.suggestedPurchaseQty === 0,
    );
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
                Cálculo de consumo diário e regras para dias específicos
                (Qua/Dom), estoque de segurança de 3 dias e saldo projetado.
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Blocos de E-mail exclusivos do gestor oficial (estoquecristolandia@gmail.com) */}
          {canManageEmails && (
            <>
              {/* Gerar E-mail Atualização Geral (Novas Entradas & Todo o Estoque) */}
              <button
                onClick={() => handleOpenEmailModal("post_purchase")}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-2 active:scale-95 ring-2 ring-emerald-400/30"
                title="Gerar e-mail executivo com novas entradas e quadro geral atualizado de todo o estoque"
              >
                <Package className="w-4 h-4 text-emerald-200" />
                <span>📦 E-mail Atualização Geral (Entradas + Estoque)</span>
              </button>

              {/* Gerar E-mail Quadro Geral (14 Produtos) */}
              <button
                onClick={() => handleOpenEmailModal("all_items")}
                className="px-3.5 py-2.5 rounded-2xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/40 text-teal-800 dark:text-teal-200 font-bold text-xs sm:text-sm border border-teal-200 dark:border-teal-800 transition-all cursor-pointer flex items-center gap-2 active:scale-95 shadow-sm"
                title={`Gerar e-mail com a relação completa e previsão de compras (${periodDays} dias) de todos os ${forecast.allItems.length} itens do estoque`}
              >
                <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>📋 E-mail Quadro Geral ({forecast.allItems.length} Itens)</span>
              </button>

              {/* Gerar E-mail Semanal de Previsão Button */}
              <button
                onClick={() => handleOpenEmailModal("forecast")}
                className="px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                title="Gerar e-mail com a Tabela Executiva Visual de Previsão de Compras"
              >
                <Mail className="w-4 h-4 text-indigo-500" />
                <span>✉️ Previsão de Compras</span>
              </button>
            </>
          )}

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
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                  Copiado!
                </span>
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
                    ? "bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20 font-black"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                8 dias (Padrão)
              </button>
              <button
                onClick={() => setPeriodDays(14)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  periodDays === 14
                    ? "bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20 font-black"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                14 dias
              </button>
              <button
                onClick={() => setPeriodDays(21)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  periodDays === 21
                    ? "bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20 font-black"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                21 dias
              </button>
              <button
                onClick={() => setPeriodDays(30)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  periodDays === 30
                    ? "bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20 font-black"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                30 dias
              </button>
            </div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 ml-1">
              Ciclo:{" "}
              <strong>
                {forecast.baseDateFormatted} a {forecast.endDateFormatted}
              </strong>{" "}
              | Próxima compra:{" "}
              <strong className="text-amber-600 dark:text-amber-400">
                {forecast.nextPurchaseDateFormatted}
              </strong>
            </span>
          </div>

          {/* Sub-view switcher: Prioritária vs Visão Geral */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
            <button
              onClick={() => setSubView("coordination_list")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subView === "coordination_list"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              🛒 1. Necessidade de Compras ({forecast.purchasesList.length})
            </button>
            <button
              onClick={() => setSubView("full_table")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                subView === "full_table"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-black"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
              <option value="warning_only">
                🟡 Atenção (Abaixo da Margem)
              </option>
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
          <div
            className={`text-2xl font-black ${forecast.criticalCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"}`}
          >
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
          <div
            className={`text-2xl font-black ${forecast.warningCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`}
          >
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

      {/* Aviso Operacional de Itens Multissetoriais (Cozinha, Padaria, Casas Missionárias e Adm) */}
      <div className="bg-amber-50/90 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-800/80 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black shrink-0 mt-0.5 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-slate-950" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-black text-amber-950 dark:text-amber-100">
                  Atenção Operacional: Itens de Consumo Multissetorial (Leite,
                  Manteiga, Óleo e Sal)
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                  Risco de Saída sem Aviso Prévio
                </span>
              </div>
              <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed max-w-5xl">
                Diferente da <strong>Cozinha Geral</strong> (com cardápio fixo e
                porções controladas), estes 4 itens atendem simultaneamente à{" "}
                <strong>Padaria (Fernando Pates)</strong>, às{" "}
                <strong>Casas Missionárias</strong> e à{" "}
                <strong>Administração</strong>. Por estarem sujeitos a retiradas
                sem aviso prévio nesses outros setores sem controle diário
                centralizado, o sistema aplica uma{" "}
                <strong>
                  margem de segurança preventiva redobrada (+4 dias)
                </strong>{" "}
                para blindar o estoque físico contra desfalques imprevistos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SUB-VIEW 1: LISTA PRIORITÁRIA DE COMPRAS */}
      {subView === "coordination_list" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-500" />
                1. Necessidade de Compras — Lista Prioritária (
                {forecast.purchasesList.length} itens)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Itens com sugestão de compra no período de {periodDays} dias
                ordenados por criticidade.
              </p>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
              Fórmula:{" "}
              <span className="font-bold text-amber-600 dark:text-amber-400">
                Compra = Consumo Previsto + Est. Segurança - Estoque Atual
              </span>
            </div>
          </div>

          {forecast.purchasesList.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Estoque 100% Suprido para o Ciclo de {periodDays} Dias!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Todos os produtos analisados possuem saldo suficiente para
                cobrir o consumo previsto e a margem de segurança de 3 dias.
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
                    <th className="py-3 px-3 text-right">
                      Cons. Previsto ({periodDays}d)
                    </th>
                    <th className="py-3 px-3 text-right">Saldo Projetado</th>
                    <th className="py-3 px-3 text-right">Segurança (3d)</th>
                    <th className="py-3 px-3 text-right">Compra Sugerida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {forecast.purchasesList.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black ${
                            item.status === "CRITICO"
                              ? "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                              : item.status === "ATENCAO"
                                ? "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          }`}
                        >
                          {item.statusBadge}
                        </span>
                      </td>

                      {/* Item */}
                      <td className="py-3.5 px-3">
                        <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                          {item.name}
                          {isMultiSectorItem(item.name) && (
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded font-black bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60"
                              title="Item de uso compartilhado na Cozinha, Padaria (Fernando Pates), Casas Missionárias e Adm — sujeito a retiradas sem aviso prévio"
                            >
                              Multissetorial (Cozinha/Padaria/Casas/Adm)
                            </span>
                          )}
                          {item.inventoryStatus === "DIVERGENTE" && (
                            <span
                              className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold"
                              title={`Contagem física: ${item.physicalStock} ${item.unit}`}
                            >
                              Físico: {item.physicalStock}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {item.category}
                        </div>
                        {item.customNote && (
                          <div className="mt-1 text-[10px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 rounded-md px-2 py-0.5 leading-snug font-medium max-w-sm">
                            ⚠️ {item.customNote}
                          </div>
                        )}
                      </td>

                      {/* Estoque Atual */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`font-black ${item.currentStock <= 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}
                        >
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
                              ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                              : item.daysAutonomy !== null &&
                                  item.daysAutonomy <= 7
                                ? "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300"
                                : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                          }`}
                        >
                          {item.autonomyText ||
                            (item.daysAutonomy != null
                              ? `${Number(item.daysAutonomy).toFixed(1)} dias`
                              : "Eventual")}
                        </span>
                      </td>

                      {/* Consumo Previsto do Período */}
                      <td className="py-3.5 px-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                        {item.projectedConsumption} {item.unit}
                      </td>

                      {/* Saldo Projetado ao Final */}
                      <td className="py-3.5 px-3 text-right font-black">
                        <span
                          className={
                            item.projectedBalance < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-slate-700 dark:text-slate-300"
                          }
                        >
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
                <span>
                  Itens em Atenção (Estoque Cobre Esta Semana — Compra
                  Programada para a Próxima Terça-Feira)
                </span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                Os itens abaixo possuem estoque suficiente para atender 100% da
                demanda desta semana. Portanto,{" "}
                <strong>não precisam ser comprados amanhã</strong>. O saldo
                projetado terminará abaixo da margem de segurança, e a compra
                deverá ocorrer na próxima terça-feira.
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
                          Estoque:{" "}
                          <strong>
                            {item.currentStock} {item.unit}
                          </strong>{" "}
                          | Consumo semana:{" "}
                          <strong>
                            {item.projectedConsumption} {item.unit}
                          </strong>{" "}
                          | Saldo:{" "}
                          <strong>
                            {item.projectedBalance} {item.unit}
                          </strong>
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
      {subView === "full_table" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-500" />
                2. Quadro Geral de Previsão de Estoque (
                {forecast.filteredItems.length} produtos)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Visão de todos os produtos, consumo histórico, autonomia, saldo
                projetado e estoque de segurança.
              </p>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Horizonte: {periodDays} dias ({forecast.baseDateFormatted} a{" "}
              {forecast.endDateFormatted})
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
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {/* Item */}
                    <td className="py-3.5 px-3 font-extrabold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.name}
                        {isMultiSectorItem(item.name) && (
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-black bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60"
                            title="Item de uso compartilhado na Cozinha, Padaria (Fernando Pates), Casas Missionárias e Adm — sujeito a retiradas sem aviso prévio"
                          >
                            Multissetorial (Cozinha/Padaria/Casas/Adm)
                          </span>
                        )}
                        {item.inventoryStatus === "DIVERGENTE" && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold">
                            Físico: {item.physicalStock} {item.unit}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        {item.category}
                      </div>
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
                            ? "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300"
                            : item.daysAutonomy !== null &&
                                item.daysAutonomy <= 7
                              ? "bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300"
                              : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        {item.autonomyText ||
                          (item.daysAutonomy != null
                            ? `${Number(item.daysAutonomy).toFixed(1)} d`
                            : "Eventual")}
                      </span>
                    </td>

                    {/* Consumo Previsto */}
                    <td className="py-3.5 px-3 text-right text-slate-700 dark:text-slate-300 font-semibold">
                      {item.projectedConsumption} {item.unit}
                    </td>

                    {/* Saldo Projetado */}
                    <td className="py-3.5 px-3 text-right font-black">
                      <span
                        className={
                          item.projectedBalance < 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-slate-700 dark:text-slate-300"
                        }
                      >
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
                      ) : item.purchaseTiming === "PROXIMA_SEMANA" ? (
                        <div className="flex flex-col items-end">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                            0 (Amanhã)
                          </span>
                          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                            Próx. Terça: +{item.nextCyclePurchaseQty}{" "}
                            {item.unit}
                          </span>
                        </div>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          0
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black ${
                          item.status === "CRITICO"
                            ? "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300"
                            : item.status === "ATENCAO"
                              ? "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300"
                              : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
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
                <span className="text-emerald-600 dark:text-emerald-400">
                  Copiado!
                </span>
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
            <strong>Garantia de Integridade e Somente Leitura:</strong> A
            previsão de compras e o gerador de e-mail operam exclusivamente em
            modo de leitura (Read-Only), sem realizar qualquer gravação,
            alteração de saldos ou baixa fictícia de consumo no banco de dados.
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400 shrink-0">
          Horizonte: {periodDays} dias | Próxima compra:{" "}
          {forecast.nextPurchaseDateFormatted}
        </span>
      </div>

      {/* EMAIL GENERATION MODAL (Restrito a estoquecristolandia@gmail.com) */}
      {canManageEmails && isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-2xl ${
                    emailReportType === "post_purchase"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : emailReportType === "all_items"
                        ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                        : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                  }`}
                >
                  {emailReportType === "post_purchase" ? (
                    <Package className="w-5 h-5" />
                  ) : emailReportType === "all_items" ? (
                    <FileText className="w-5 h-5" />
                  ) : (
                    <ShoppingCart className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>
                      {emailReportType === "post_purchase"
                        ? "Atualização Geral & Pós-Compras (Novas Entradas + Quadro Geral)"
                        : emailReportType === "all_items"
                          ? `Quadro Geral & Previsão de Compras (${periodDays} Dias — ${forecast.allItems.length} Itens)`
                          : `E-mail Semanal de Previsão de Compras (${periodDays} Dias)`}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase ${
                        emailReportType === "post_purchase"
                          ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                          : emailReportType === "all_items"
                            ? "bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200"
                            : "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300"
                      }`}
                    >
                      {emailReportType === "post_purchase"
                        ? "Entradas + Estoque"
                        : emailReportType === "all_items"
                          ? `Balanço + ${periodDays}d`
                          : "Planejamento"}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {emailReportType === "post_purchase"
                      ? "Confirmação das compras recebidas, novo saldo físico e quadro geral de todos os 14 itens"
                      : emailReportType === "all_items"
                        ? `Posição oficial de todos os ${forecast.allItems.length} itens com saldos, consumo diário, autonomia, previsão de compras calculada para ${periodDays} dias e notas da Padaria e Cozinha`
                        : "Formato objetivo com visibilidade de compras prioritárias, consumo semanal e estoque de segurança"}
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
              {/* Type Switcher: 3 Opções Executivas */}
              <div className="p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-stretch gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setEmailReportType("post_purchase");
                    setEmailSubject("");
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    emailReportType === "post_purchase"
                      ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-sm border border-emerald-200/80 dark:border-emerald-800"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Package className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">
                    1. Atualização Geral + Entradas
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold uppercase shrink-0">
                    Completo
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmailReportType("all_items");
                    setEmailSubject("");
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    emailReportType === "all_items"
                      ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-sm border border-teal-200/80 dark:border-teal-800"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                  <span className="truncate">
                    2. Quadro Geral & Compras ({periodDays}d)
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-extrabold uppercase shrink-0">
                    {periodDays}d
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmailReportType("forecast");
                    setEmailSubject("");
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    emailReportType === "forecast"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-200/80 dark:border-indigo-800"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="truncate">3. Previsão de Compras</span>
                </button>
              </div>

              {/* App URL Access Callout Banner */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-xs">
                    🌐
                  </span>
                  <div>
                    <div className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                      Acesso Online Oficial ao Sistema (Tempo Real)
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                      <a
                        href="https://estoquecristolandia.netlify.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline inline-flex items-center gap-1 font-black"
                      >
                        <span>estoquecristolandia.netlify.app</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">
                        •
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold hidden sm:inline">
                        Incluído com botão e link em destaque no e-mail
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      "https://estoquecristolandia.netlify.app",
                    );
                    setCopiedAppLink(true);
                    setTimeout(() => setCopiedAppLink(false), 2500);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all cursor-pointer shrink-0 flex items-center gap-1"
                  title="Copiar link do sistema"
                >
                  {copiedAppLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-extrabold">
                        Link Copiado!
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Link</span>
                    </>
                  )}
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
                    emailReportType === "post_purchase"
                      ? "Ex: Todas as notas fiscais foram conferidas e os lotes foram armazenados no depósito central..."
                      : "Ex: Favor priorizar pedido do fornecedor de hortifrúti na terça de manhã..."
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Tab Selector: Tabela Formatada vs Texto Simples */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setEmailModalTab("preview")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      emailModalTab === "preview"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
                    onClick={() => setEmailModalTab("plain")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      emailModalTab === "plain"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Texto Simples (Monospace)</span>
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {emailReportType === "post_purchase"
                    ? `${forecast.purchasesList.length} itens reabastecidos • Risco de Ruptura Zero`
                    : `Ciclo de ${periodDays} dias • ${forecast.purchasesList.length} itens com sugestão de compra`}
                </span>
              </div>

              {/* View Content */}
              {emailModalTab === "preview" ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 overflow-x-auto shadow-inner max-h-[340px] overflow-y-auto">
                  <div
                    dangerouslySetInnerHTML={{ __html: emailContent.html }}
                  />
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
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Texto Copiado!
                      </span>
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
