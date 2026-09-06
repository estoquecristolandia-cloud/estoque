import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { getProductStockStatus, calculateDaysRemaining, getProductAutonomyLabel } from '../utils/storage';
import {
  Mail,
  Copy,
  Check,
  Download,
  ExternalLink,
  X,
  Sparkles,
  Filter,
  Eye,
  FileCode,
  Send,
  Building2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Calendar,
  Layers,
} from 'lucide-react';

interface StockNewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  userName?: string;
}

export const StockNewsletterModal: React.FC<StockNewsletterModalProps> = ({
  isOpen,
  onClose,
  products,
  userName = 'Marconi Castro (Gestor do Estoque)',
}) => {
  const [scopeFilter, setScopeFilter] = useState<'all' | 'alert_only' | 'critical_only'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [customManagerNotes, setCustomManagerNotes] = useState<string>('');
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'html_code'>('preview');

  const recipients = 'humbertohpp.59@gmail.com, chefmarcusviniciuses@gmail.com';

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category)));
  }, [products]);

  // Filter products for newsletter
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const isZero = p.currentStock === 0;
      const status = isZero ? 'critical' : getProductStockStatus(p);

      if (categoryFilter !== 'all' && p.category !== categoryFilter) {
        return false;
      }

      if (scopeFilter === 'alert_only' && status === 'normal') {
        return false;
      }

      if (scopeFilter === 'critical_only' && status !== 'critical') {
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

  const emailSubject = `[BOLETIM EXECUTIVO] Controle de Estoque Atual & Saldos Físicos — Cristolândia LEM (${now.toLocaleDateString('pt-BR')})`;

  // Generate Professional HTML Email (Inlined styles for 100% compatibility in Gmail, Outlook, Apple Mail)
  const newsletterHtml = useMemo(() => {
    const rowsHtml = filteredProducts
      .map((p) => {
        const days = calculateDaysRemaining(p);
        const isZero = p.currentStock === 0;
        const status = isZero ? 'critical' : getProductStockStatus(p);

        let statusBg = '#e6f7ef';
        let statusColor = '#0d8a4f';
        let statusBorder = '#b8ebd0';
        let statusLabel = 'NORMAL';

        if (status === 'critical' || isZero) {
          statusBg = '#fde8e8';
          statusColor = '#c81e1e';
          statusBorder = '#f8b4b4';
          statusLabel = isZero ? 'ZERADO' : 'CRÍTICO';
        } else if (status === 'warning') {
          statusBg = '#fef3c7';
          statusColor = '#92400e';
          statusBorder = '#fcd34d';
          statusLabel = 'ALERTA';
        }

        let autonomyColor = '#0d8a4f';
        if (days <= 1.5) autonomyColor = '#c81e1e';
        else if (days <= 3) autonomyColor = '#d97706';

        const autonomyText = getProductAutonomyLabel(p);

        return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 14px; vertical-align: middle;">
            <div style="font-weight: 700; color: #111827; font-size: 13px;">${p.name}</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">
              <span>${p.category}</span>
              ${p.usageFrequency ? ` &bull; <span style="color: #b45309; font-weight: 600;">${p.usageFrequency}</span>` : ''}
            </div>
          </td>
          <td style="padding: 12px 14px; vertical-align: middle; color: #4b5563; font-size: 12px;">
            ${p.location || 'Depósito Principal'}
          </td>
          <td style="padding: 12px 14px; vertical-align: middle; text-align: center;">
            <span style="font-weight: 800; font-size: 14px; color: ${isZero ? '#dc2626' : '#111827'};">
              ${p.currentStock} ${p.unit}
            </span>
          </td>
          <td style="padding: 12px 14px; vertical-align: middle; text-align: center; color: #6b7280; font-size: 12px; font-weight: 600;">
            ${p.minStock} ${p.unit}
          </td>
          <td style="padding: 12px 14px; vertical-align: middle; text-align: center;">
            <span style="font-weight: 700; font-size: 12px; color: ${autonomyColor};">
              ${autonomyText}
            </span>
          </td>
          <td style="padding: 12px 14px; vertical-align: middle; text-align: center;">
            <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 10px; font-weight: 800; background-color: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder}; text-transform: uppercase; letter-spacing: 0.5px;">
              ${statusLabel}
            </span>
          </td>
        </tr>
        `;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body style="margin: 0; padding: 24px 10px; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; line-height: 1.5;">
  <div style="max-width: 820px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
    
    <!-- Newsletter Header -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 32px 28px; border-bottom: 4px solid #f59e0b;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td>
            <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; color: #fbbf24; text-transform: uppercase; margin-bottom: 6px;">
              JUNTA DE MISSÕES NACIONAIS &bull; CBB
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
              MISSÃO CRISTOLÂNDIA &bull; LEM/BA
            </h1>
            <div style="margin-top: 4px; font-size: 13px; color: #cbd5e1; font-weight: 500;">
              Boletim Executivo: Controle de Estoque Atual & Saldos Físicos
            </div>
          </td>
          <td style="text-align: right; vertical-align: top;">
            <div style="display: inline-block; background-color: rgba(255,255,255,0.1); padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.15); text-align: right;">
              <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Data da Emissão</div>
              <div style="font-size: 12px; color: #ffffff; font-weight: 700; margin-top: 2px;">${now.toLocaleDateString('pt-BR')} &bull; ${timeFormatted}</div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Executive Greeting & Recipients -->
    <div style="padding: 24px 28px 16px 28px; background-color: #fafafa; border-bottom: 1px solid #f3f4f6;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="font-size: 13px; color: #374151;">
            <strong>A/C:</strong> Pastor Humberto (<span style="color: #2563eb;">humbertohpp.59@gmail.com</span>) & Chefe Marcos (<span style="color: #2563eb;">chefmarcusviniciuses@gmail.com</span>)<br>
            <strong>Emissor:</strong> ${userName} &bull; Almoxarifado Central
          </td>
        </tr>
      </table>
      <div style="margin-top: 14px; font-size: 13px; color: #4b5563; line-height: 1.6;">
        Prezados Pastor Humberto e Chefe Marcos, paz e graça!<br>
        Encaminhamos o <strong>Boletim de Controle de Estoque Atual e Saldos Físicos</strong> com o panorama em tempo real da despensa e almoxarifado da Cristolândia, contendo localizações de prateleira, autonomia de consumo e status de segurança.
      </div>
    </div>

    <!-- KPI Summary Grid -->
    <div style="padding: 20px 28px; background-color: #ffffff; border-bottom: 1px solid #e5e7eb;">
      <table style="width: 100%; border-collapse: separate; border-spacing: 10px 0;">
        <tr>
          <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center; width: 25%;">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Total Itens</div>
            <div style="font-size: 24px; font-weight: 900; color: #0f172a; margin-top: 4px;">${totalCount}</div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">No Catálogo</div>
          </td>
          <td style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px; text-align: center; width: 25%;">
            <div style="font-size: 11px; font-weight: 700; color: #15803d; text-transform: uppercase;">Normais</div>
            <div style="font-size: 24px; font-weight: 900; color: #16a34a; margin-top: 4px;">${normalCount}</div>
            <div style="font-size: 10px; color: #15803d; margin-top: 2px;">Estoque Seguro</div>
          </td>
          <td style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px; text-align: center; width: 25%;">
            <div style="font-size: 11px; font-weight: 700; color: #b45309; text-transform: uppercase;">Em Alerta</div>
            <div style="font-size: 24px; font-weight: 900; color: #d97706; margin-top: 4px;">${warningCount}</div>
            <div style="font-size: 10px; color: #b45309; margin-top: 2px;">Abaixo do Mínimo</div>
          </td>
          <td style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 14px; text-align: center; width: 25%;">
            <div style="font-size: 11px; font-weight: 700; color: #b91c1c; text-transform: uppercase;">Críticos/Zerados</div>
            <div style="font-size: 24px; font-weight: 900; color: #dc2626; margin-top: 4px;">${criticalCount}</div>
            <div style="font-size: 10px; color: #b91c1c; margin-top: 2px;">Risco de Falta</div>
          </td>
        </tr>
      </table>
    </div>

    ${
      customManagerNotes.trim()
        ? `
    <!-- Manager's Special Note -->
    <div style="margin: 20px 28px 0 28px; padding: 14px 18px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px;">
      <div style="font-size: 11px; font-weight: 800; color: #1e40af; text-transform: uppercase;">Observação Especial do Gestor:</div>
      <div style="font-size: 13px; color: #1e3a8a; margin-top: 4px; line-height: 1.5;">${customManagerNotes.replace(/\n/g, '<br>')}</div>
    </div>`
        : ''
    }

    <!-- Main Stock Table -->
    <div style="padding: 24px 28px;">
      <div style="font-size: 15px; font-weight: 800; color: #111827; margin-bottom: 12px; display: flex; align-items: center;">
        Tabela Detalhada de Saldos & Localização Física (${filteredProducts.length} itens exibidos)
      </div>

      <table style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="background-color: #f1f5f9; border-top: 1px solid #cbd5e1; border-bottom: 2px solid #cbd5e1;">
            <th style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase;">Produto & Categoria</th>
            <th style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase;">Localização</th>
            <th style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; text-align: center;">Saldo Atual</th>
            <th style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; text-align: center;">Mín. Seg.</th>
            <th style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; text-align: center;">Autonomia</th>
            <th style="padding: 10px 14px; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>

    <!-- Operational Footer -->
    <div style="background-color: #f8fafc; padding: 24px 28px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">
      <div style="font-weight: 700; color: #334155; font-size: 13px;">
        Almoxarifado & Gestão de Estoque &bull; Missão Cristolândia (LEM/BA)
      </div>
      <div style="margin-top: 4px;">
        Responsável Técnico: <strong>${userName}</strong> &bull; E-mail: estoquecristolandia@gmail.com
      </div>
      <div style="margin-top: 8px; font-size: 11px; color: #94a3b8;">
        Este boletim reflete os saldos físicos contados e atualizados no sistema.
      </div>
    </div>
  </div>
</body>
</html>`;
  }, [filteredProducts, customManagerNotes, totalCount, criticalCount, warningCount, normalCount, userName, emailSubject]);

  // Clean plain-text version for WhatsApp or simple text email
  const plainTextEmail = useMemo(() => {
    let text = `🏛️ *JUNTA DE MISSÕES NACIONAIS - MISSÃO CRISTOLÂNDIA (LEM/BA)*\n`;
    text += `📋 *BOLETIM EXECUTIVO: CONTROLE DE ESTOQUE ATUAL & SALDOS FÍSICOS*\n`;
    text += `📅 Data: ${dateFormatted} às ${timeFormatted}\n`;
    text += `👤 Responsável: ${userName}\n\n`;

    text += `📊 *RESUMO GERAL:*\n`;
    text += `• Total de Produtos: ${totalCount}\n`;
    text += `• Normais (Seguros): ${normalCount}\n`;
    text += `• Em Alerta: ${warningCount}\n`;
    text += `• Críticos/Zerados: ${criticalCount}\n\n`;

    if (customManagerNotes.trim()) {
      text += `📝 *OBSERVAÇÃO DO GESTOR:*\n${customManagerNotes.trim()}\n\n`;
    }

    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📦 *TABELA DETALHADA DE ESTOQUE ATUAL*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    filteredProducts.forEach((p) => {
      const days = calculateDaysRemaining(p);
      const isZero = p.currentStock === 0;
      const status = isZero ? 'critical' : getProductStockStatus(p);
      const icon = isZero || status === 'critical' ? '🔴' : status === 'warning' ? '🟡' : '🟢';
      const aut = getProductAutonomyLabel(p);

      text += `${icon} *${p.name}* (${p.category})\n`;
      text += `   📍 Local: ${p.location || 'Depósito'}\n`;
      text += `   📦 Saldo: *${p.currentStock} ${p.unit}* | Mín: ${p.minStock} ${p.unit} | Autonomia: *${aut}*\n\n`;
    });

    text += `Almoxarifado Cristolândia - LEM/BA`;
    return text;
  }, [filteredProducts, customManagerNotes, totalCount, normalCount, warningCount, criticalCount, userName, dateFormatted, timeFormatted]);

  // Copy formatted HTML for Gmail/Outlook
  const handleCopyRichHtml = async () => {
    try {
      const blobHtml = new Blob([newsletterHtml], { type: 'text/html' });
      const blobText = new Blob([plainTextEmail], { type: 'text/plain' });
      const item = new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText,
      });
      await navigator.clipboard.write([item]);
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 3000);
    } catch (err) {
      // Fallback to text if clipboard rich text fails
      await navigator.clipboard.writeText(newsletterHtml);
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 3000);
    }
  };

  const handleCopyPlainText = () => {
    navigator.clipboard.writeText(plainTextEmail);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 3000);
  };

  const handleOpenGmail = () => {
    const to = encodeURIComponent(recipients);
    const su = encodeURIComponent(emailSubject);
    const body = encodeURIComponent(plainTextEmail);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}`;
    window.open(gmailUrl, '_blank');
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([newsletterHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Boletim_Estoque_Cristolandia_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Boletim Executivo / Newsletter de Estoque Atual
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Formato Profissional
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Layout estilizado pronto para envio por e-mail (Gmail, Outlook) ou compartilhamento com a coordenação.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Configuration Bar */}
        <div className="p-4 bg-slate-100/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Scope Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Escopo:</span>
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setScopeFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scopeFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Todos ({totalCount})
                </button>
                <button
                  onClick={() => setScopeFilter('alert_only')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scopeFilter === 'alert_only'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Alerta / Crítico ({warningCount + criticalCount})
                </button>
                <button
                  onClick={() => setScopeFilter('critical_only')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    scopeFilter === 'critical_only'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Só Críticos ({criticalCount})
                </button>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Categoria:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white dark:bg-slate-900 text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none"
              >
                <option value="all">Todas as Categorias</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tab Switcher: Visual Preview vs HTML Code */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-slate-900 text-white dark:bg-blue-600 font-black'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Pré-visualização</span>
            </button>
            <button
              onClick={() => setActiveTab('html_code')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'html_code'
                  ? 'bg-slate-900 text-white dark:bg-blue-600 font-black'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Código HTML</span>
            </button>
          </div>
        </div>

        {/* Manager Custom Note Input */}
        <div className="px-5 pt-3 pb-1 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Recado / Parecer Adicional do Gestor (Opcional — aparece em destaque no topo do e-mail):
          </label>
          <input
            type="text"
            placeholder="Ex: Reforçamos que a compra de arroz e café está programada para quarta-feira..."
            value={customManagerNotes}
            onChange={(e) => setCustomManagerNotes(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/50 dark:bg-slate-950/50">
          {activeTab === 'preview' ? (
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
              <iframe
                title="Newsletter Preview"
                srcDoc={newsletterHtml}
                className="w-full h-[520px] border-0"
              />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-xs font-mono overflow-x-auto max-h-[500px]">
                {newsletterHtml}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Destinatários: <strong className="text-slate-700 dark:text-slate-300">{recipients}</strong>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Copiar HTML Formatado */}
            <button
              onClick={handleCopyRichHtml}
              className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
              title="Copia o e-mail em HTML formatado para colar direto no Gmail ou Outlook"
            >
              {copiedHtml ? (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>HTML Copiado! Cole no Gmail/Outlook</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar E-mail Formatado (Gmail/Outlook)</span>
                </>
              )}
            </button>

            {/* Abrir no Gmail */}
            <button
              onClick={handleOpenGmail}
              className="px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              title="Abre a tela de composição do Gmail"
            >
              <ExternalLink className="w-4 h-4 text-amber-300" />
              <span>Abrir no Gmail</span>
            </button>

            {/* Copiar Texto Simples (WhatsApp) */}
            <button
              onClick={handleCopyPlainText}
              className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
              title="Copia texto puro formatado para WhatsApp"
            >
              {copiedText ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Texto Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copiar WhatsApp</span>
                </>
              )}
            </button>

            {/* Baixar HTML */}
            <button
              onClick={handleDownloadHtml}
              className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
              title="Baixar arquivo HTML da newsletter"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Baixar HTML</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
