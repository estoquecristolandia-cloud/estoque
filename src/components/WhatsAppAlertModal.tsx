import React, { useState } from 'react';
import { MessageCircle, Copy, Check, ExternalLink, AlertTriangle, Phone } from 'lucide-react';
import { Product } from '../types';
import { toast } from '../utils/toast';
import { ModalWrapper } from './ui/ModalWrapper';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

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
    <ModalWrapper
      id="whatsapp-alert-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="Alerta de Estoque: Chefe Marcos"
      subtitle="Comunicação rápida e padronizada via WhatsApp para a Cozinha"
      icon={<MessageCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
      maxWidth="max-w-xl"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          <Button
            variant="secondary"
            onClick={handleCopy}
            icon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          >
            {copied ? 'Copiado com Sucesso!' : 'Copiar Texto'}
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
            <Button
              variant="success"
              onClick={handleOpenWhatsApp}
              icon={<MessageCircle className="w-4 h-4" />}
            >
              Abrir WhatsApp do Chefe Marcos
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Contact Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shadow-xs">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white text-sm">Chefe Marcos</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-mono">+55 (62) 99974-6823</p>
            </div>
          </div>

          <Badge variant="success">
            Contato Configurado
          </Badge>
        </div>

        {/* Critical Highlight */}
        <div className="p-4 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-rose-900 dark:text-rose-200 text-sm">
              Atenção Urgente: Feijão Carioca (25 kg em estoque)
            </p>
            <p className="text-rose-700 dark:text-rose-300 text-xs mt-1 leading-relaxed">
              Consumo diário médio de 9 kg/dia. Autonomia estimada em ~2.8 dias para a Cozinha.
            </p>
          </div>
        </div>

        {/* Message Preview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Mensagem Formatada Pronta para Envio:
            </label>
            <span className="text-[11px] text-slate-400 font-medium">Padronizada &bull; Oficial</span>
          </div>
          <div className="p-4 bg-slate-950 text-emerald-300 font-mono text-xs rounded-2xl border border-slate-800 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
            {message}
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
};
