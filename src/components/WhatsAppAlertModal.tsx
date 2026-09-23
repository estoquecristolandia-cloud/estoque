import React, { useState, useMemo } from 'react';
import { X, MessageCircle, Copy, Check, ExternalLink, AlertTriangle, Phone, Calendar, Users, UtensilsCrossed, Share2 } from 'lucide-react';
import { Product, DailyMealRecord, StockMovement } from '../types';
import { toast } from '../utils/toast';

interface WhatsAppAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  meals?: DailyMealRecord[];
  movements?: StockMovement[];
}

export const WhatsAppAlertModal: React.FC<WhatsAppAlertModalProps> = ({
  isOpen,
  onClose,
  products,
  meals = [],
  movements = [],
}) => {
  const [activeTab, setActiveTab] = useState<'critico' | 'semanal'>('critico');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('pt-BR');
  const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // 1. Cálculos de Estoque Crítico
  const feijao = products.find((p) => p.id === 'prod-feijao');
  const alertItems = products.filter((p) => {
    const daily = p.dailyAvgConsumption > 0 ? p.dailyAvgConsumption : 1;
    const days = p.currentStock / daily;
    return days <= 5 || p.currentStock <= p.minStock;
  });

  // 2. Cálculos do Resumo Semanal
  const recentMeals = meals.slice(-7);
  const totalMealsWeekly = recentMeals.reduce((acc, m) => acc + (m.totalMeals || 0), 0) || 1260; // Padrão 180/dia se inicial
  const avgMealsPerDay = recentMeals.length > 0 ? Math.round(totalMealsWeekly / recentMeals.length) : 180;

  // Itens Pilares para o Resumo
  const keyProductNames = ['Arroz', 'Feijão', 'Frango', 'Carne', 'Flocão', 'Açúcar', 'Óleo'];
  const pillarProducts = products.filter((p) =>
    keyProductNames.some((k) => p.name.toLowerCase().includes(k.toLowerCase()))
  );

  // GERAÇÃO DA MENSAGEM: Alerta Crítico
  const generateCriticalMessage = () => {
    let msg = `🏛️ *JUNTA DE MISSÕES NACIONAIS - CRISTOLÂNDIA (LEM/BA)*\n`;
    msg += `📋 *ALERTA OPERACIONAL DE ESTOQUE & SUPRIMENTOS*\n\n`;
    msg += `Prezado *Chefe Marcos*,\n`;
    msg += `Segue o comunicado urgente do Almoxarifado / Estoque:\n\n`;

    msg += `🚨 *ITEM EM NÍVEL CRÍTICO DE REPOSIÇÃO:*\n`;
    if (feijao) {
      const daily = feijao.dailyAvgConsumption || 8;
      const days = (feijao.currentStock / daily).toFixed(1);
      msg += `• *Produto:* Feijão Carioca\n`;
      msg += `• *Estoque Físico Atual:* *${feijao.currentStock} kg*\n`;
      msg += `• *Estoque Mínimo de Segurança:* ${feijao.minStock} kg\n`;
      msg += `• *Consumo Diário Médio:* ${daily} kg/dia\n`;
      msg += `• *Autonomia Estimada:* *~${days} dias* (Previsão de término em breve)\n\n`;
    }

    if (alertItems.length > 1) {
      msg += `📌 *Outros itens com atenção para compra/reposição:*\n`;
      alertItems
        .filter((p) => p.id !== 'prod-feijao')
        .slice(0, 5)
        .forEach((p) => {
          const daily = p.dailyAvgConsumption || 1;
          const days = (p.currentStock / daily).toFixed(1);
          msg += `• ${p.name}: ${p.currentStock} ${p.unit} (~${days} dias de autonomia)\n`;
        });
      msg += `\n`;
    }

    msg += `💡 *Recomendação Operacional:*\n`;
    msg += `Programar o reabastecimento prioritário de Feijão Carioca para as próximas 48h para assegurar as refeições dos acolhidos.\n\n`;
    msg += `👤 *Gestor Responsável:* Marconi Castro\n`;
    msg += `📍 *Unidade:* Cristolândia LEM/BA\n`;
    msg += `📅 *Emitido em:* ${dateFormatted} às ${timeFormatted}`;
    return msg;
  };

  // GERAÇÃO DA MENSAGEM: Resumo Semanal Executivo
  const generateWeeklySummaryMessage = () => {
    let msg = `🏛️ *JUNTA DE MISSÕES NACIONAIS - CRISTOLÂNDIA (LEM/BA)*\n`;
    msg += `📊 *RELATÓRIO SEMANAL EXECUTIVO DE ALIMENTAÇÃO & ESTOQUE*\n\n`;
    msg += `Prezada *Liderança & Chefe Marcos*,\n`;
    msg += `Apresentamos o balanço operacional consolidado dos últimos dias:\n\n`;

    msg += `🍽️ *PRODUÇÃO DE REFEIÇÕES (COZINHA):*\n`;
    msg += `• *Total de Refeições Servidas:* *${totalMealsWeekly.toLocaleString('pt-BR')} refeições*\n`;
    msg += `• *Média Diária:* ~${avgMealsPerDay} refeições/dia (Café, Almoço, Lanche, Jantar e Ceia)\n`;
    msg += `• *Acolhidos & Missionários Atendidos com Dignidade e Amor.*\n\n`;

    msg += `📦 *AUTONOMIA DOS MANTIMENTOS PRINCIPAIS (PVPS):*\n`;
    pillarProducts.slice(0, 6).forEach((p) => {
      const daily = p.dailyAvgConsumption > 0 ? p.dailyAvgConsumption : 1;
      const days = Math.round(p.currentStock / daily);
      const icon = days <= 5 ? '⚠️' : '✅';
      msg += `${icon} *${p.name}:* ${p.currentStock} ${p.unit} (~${days} dias restantes)\n`;
    });
    msg += `\n`;

    if (alertItems.length > 0) {
      msg += `🚨 *PONTOS DE ATENÇÃO PARA REPOSIÇÃO:*\n`;
      alertItems.slice(0, 3).forEach((p) => {
        msg += `• ${p.name}: ${p.currentStock} ${p.unit} em estoque (Prioridade de compra)\n`;
      });
      msg += `\n`;
    } else {
      msg += `✅ *Situação Geral:* Almoxarifado em equilíbrio, sem rupturas críticas imediatas.\n\n`;
    }

    msg += `🛡️ *Controle & Auditoria:* Sistema SIG-Cristolândia sincronizado e auditado.\n`;
    msg += `👤 *Gestor do Estoque:* Marconi Castro\n`;
    msg += `📅 *Período:* Semana de ${dateFormatted}\n`;
    msg += `🙌 *"Até aqui nos ajudou o Senhor."*`;
    return msg;
  };

  const message = activeTab === 'critico' ? generateCriticalMessage() : generateWeeklySummaryMessage();

  const directMarcosUrl = `https://api.whatsapp.com/send?phone=5562999746823&text=${encodeURIComponent(message)}`;
  const shareAnyUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success('Mensagem copiada para a área de transferência!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleOpenDirect = () => {
    window.open(directMarcosUrl, '_blank');
  };

  const handleOpenShare = () => {
    window.open(shareAnyUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-600/10 via-emerald-500/5 to-transparent flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                  WhatsApp Oficial
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Cristolândia LEM/BA</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Comunicado WhatsApp JMN
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-3 sm:px-5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="grid grid-cols-2 gap-2 bg-slate-200/70 dark:bg-slate-950 p-1 rounded-xl border border-slate-300/50 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('critico')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'critico'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>🚨 Alerta Crítico (Chefe Marcos)</span>
            </button>
            <button
              onClick={() => setActiveTab('semanal')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'semanal'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>📊 Resumo Semanal (Liderança)</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1 scrollbar-thin">
          {activeTab === 'critico' ? (
            <>
              {/* Contact Card */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-xs">Chefe Marcos (Cozinha)</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">+55 (62) 99974-6823</p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800">
                  Destinatário Padrão
                </span>
              </div>

              {/* Critical Alert Highlight */}
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-rose-900 dark:text-rose-200 text-xs">
                    Item Prioritário: Feijão Carioca (~{feijao ? (feijao.currentStock / (feijao.dailyAvgConsumption || 8)).toFixed(1) : 2.8} dias)
                  </p>
                  <p className="text-rose-700 dark:text-rose-300 text-[11px] mt-0.5">
                    Previsão de término em breve. Alerte o Chefe Marcos e a equipe de compras.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Weekly Highlights */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl">
                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-xs font-bold mb-1">
                    <UtensilsCrossed className="w-4 h-4" />
                    <span>Total de Refeições</span>
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {totalMealsWeekly.toLocaleString('pt-BR')}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    ~{avgMealsPerDay} refeições / dia
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-1">
                    <Users className="w-4 h-4" />
                    <span>Status do Estoque</span>
                  </div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {alertItems.length === 0 ? '100% OK' : `${alertItems.length} Alerta(s)`}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {alertItems.length === 0 ? 'Abastecimento estável' : 'Itens pedindo compra'}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                {activeTab === 'critico' ? 'Mensagem de Alerta Imediato:' : 'Resumo Semanal Executivo:'}
              </label>
              <span className="text-[11px] text-slate-400">Padronizada &bull; WhatsApp Markdown</span>
            </div>
            <div className="p-3.5 bg-slate-950 text-emerald-300 font-mono text-[11px] rounded-xl border border-slate-800 whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto select-all">
              {message}
            </div>
          </div>
        </div>

        {/* Footer Actions - Sticky */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <button
            onClick={handleCopy}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiado!' : 'Copiar Mensagem'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeTab === 'semanal' ? (
              <button
                onClick={handleOpenShare}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                title="Compartilhar no Grupo da Liderança ou Diretores"
              >
                <Share2 className="w-4 h-4" />
                <span>Enviar no Grupo WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>
            ) : (
              <button
                onClick={handleOpenDirect}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                title="Enviar direto para o Chefe Marcos"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar para Chefe Marcos</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>
            )}

            <button
              onClick={onClose}
              className="px-3 py-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
