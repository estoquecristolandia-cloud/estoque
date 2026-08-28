import React, { useState } from 'react';
import { X, MessageCircle, Copy, Check, ExternalLink, AlertTriangle, ShieldAlert, Phone } from 'lucide-react';
import { Product } from '../types';
import { toast } from '../utils/toast';

interface WhatsAppAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

export const WhatsAppAlertModal: React.FC<WhatsAppAlertModalProps> = ({
  isOpen,
  onClose,
  products,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const feijao = products.find((p) => p.id === 'prod-feijao');
  const alertItems = products.filter((p) => {
    const daily = p.dailyAvgConsumption > 0 ? p.dailyAvgConsumption : 1;
    const days = p.currentStock / daily;
    return days <= 5 || p.currentStock <= p.minStock;
  });

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('pt-BR');
  const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  let message = `🏛️ *JUNTA DE MISSÕES NACIONAIS - CRISTOLÂNDIA (LEM/BA)*\n`;
  message += `📋 *ALERTA OFICIAL DE ESTOQUE & SUPRIMENTOS*\n\n`;
  message += `Prezado *Chefe Marcos*,\n`;
  message += `Segue o comunicado oficial do Almoxarifado / Estoque da unidade:\n\n`;

  message += `🚨 *ITEM EM NÍVEL CRÍTICO DE REPOSIÇÃO:*\n`;
  if (feijao) {
    const daily = feijao.dailyAvgConsumption || 9;
    const days = (feijao.currentStock / daily).toFixed(1);
    message += `• *Produto:* Feijão Carioca\n`;
    message += `• *Estoque Físico Atual:* *${feijao.currentStock} kg*\n`;
    message += `• *Estoque Mínimo de Segurança:* ${feijao.minStock} kg\n`;
    message += `• *Consumo Diário Médio:* ${daily} kg/dia\n`;
    message += `• *Autonomia Estimada:* *~${days} dias* (Previsão de término em breve)\n\n`;
  }

  if (alertItems.length > 1) {
    message += `📌 *Outros itens com atenção para compra/reposição:*\n`;
    alertItems
      .filter((p) => p.id !== 'prod-feijao')
      .forEach((p) => {
        const daily = p.dailyAvgConsumption || 1;
        const days = (p.currentStock / daily).toFixed(1);
        message += `• ${p.name}: ${p.currentStock} ${p.unit} (~${days} dias de autonomia)\n`;
      });
    message += `\n`;
  }

  message += `💡 *Recomendação Operacional:*\n`;
  message += `Programar a compra/reabastecimento prioritário de Feijão Carioca para as próximas 48 horas para assegurar as refeições da unidade.\n\n`;
  message += `👤 *Gestor Responsável:* Marconi Castro\n`;
  message += `📍 *Unidade:* Cristolândia LEM/BA\n`;
  message += `📅 *Emitido em:* ${dateFormatted} às ${timeFormatted}`;

  const whatsappUrl = `https://api.whatsapp.com/send?phone=5562999746823&text=${encodeURIComponent(message)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success('Mensagem de alerta copiada para a área de transferência!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleOpenWhatsApp = () => {
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-emerald-600/10 via-emerald-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                  WhatsApp Oficial
                </span>
                <span className="text-xs text-slate-400 font-medium">Cristolândia LEM/BA</span>
              </div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Alerta de Estoque: Chefe Marcos
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Contact Card */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-xs">Chefe Marcos</p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">+55 (62) 99974-6823</p>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800">
              Contato Configurado
            </span>
          </div>

          {/* Critical Highlight */}
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-900 dark:text-rose-200 text-xs">
                Atenção Urgente: Feijão Carioca (25 kg em estoque)
              </p>
              <p className="text-rose-700 dark:text-rose-300 text-[11px] mt-0.5">
                Consumo diário de 9 kg/dia. Autonomia estimada em ~2.8 dias para a Cozinha.
              </p>
            </div>
          </div>

          {/* Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                Mensagem Formatada Pronta para Envio:
              </label>
              <span className="text-[11px] text-slate-400">Padronizada &bull; Oficial</span>
            </div>
            <div className="p-3.5 bg-slate-950 text-emerald-300 font-mono text-[11px] rounded-xl border border-slate-800 whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto">
              {message}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            className="w-full sm:w-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiado com Sucesso!' : 'Copiar Texto'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              Fechar
            </button>

            <button
              onClick={handleOpenWhatsApp}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Abrir WhatsApp do Chefe Marcos</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
