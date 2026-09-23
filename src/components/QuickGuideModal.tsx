import React, { useState } from 'react';
import { X, BookOpen, Clock, Utensils, FileText, CheckCircle2, Sparkles, Smartphone, ArrowRight, ShieldCheck, QrCode } from 'lucide-react';

interface QuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenKitModal?: () => void;
  onOpenReports?: () => void;
}

export const QuickGuideModal: React.FC<QuickGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenKitModal,
  onOpenReports,
}) => {
  const [activeStep, setActiveStep] = useState<number>(1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header - Sticky */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0 font-black">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                  Manual Rápido
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">JMN &bull; Cristolândia LEM/BA</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Como Operar o SIG-Cristolândia
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

        {/* 3 Step Tabs Navigation */}
        <div className="p-3 sm:px-5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-slate-200/60 dark:bg-slate-950 p-1 rounded-xl border border-slate-300/50 dark:border-slate-800">
            <button
              onClick={() => setActiveStep(1)}
              className={`py-2 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeStep === 1
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">1. Regra PVPS</span>
            </button>

            <button
              onClick={() => setActiveStep(2)}
              className={`py-2 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeStep === 2
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Utensils className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">2. Kit Diário</span>
            </button>

            <button
              onClick={() => setActiveStep(3)}
              className={`py-2 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeStep === 3
                  ? 'bg-emerald-600 text-white shadow-md font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">3. NF & Relatórios</span>
            </button>
          </div>
        </div>

        {/* Step Body - Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed scrollbar-thin">
          {activeStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
                <ShieldCheck className="w-6 h-6 shrink-0 text-amber-500" />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm">Regra de Ouro: PVPS (Primeiro que Vence, Primeiro que Sai)</h4>
                  <p className="text-[11px] sm:text-xs opacity-90">Evita desperdícios de doações e garante que o mantimento mais antigo seja consumido primeiro.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">1</span>
                    Posicionamento Físico no Depósito
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sempre que chegar uma compra ou doação nova, guarde atrás ou embaixo dos itens já existentes. Os itens da frente são sempre os que devem sair para a Cozinha.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-bold">2</span>
                    Cálculo do Runway (Dias de Autonomia)
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    O sistema divide o saldo atual pelo consumo médio diário. Se um produto tiver menos de 5 dias restantes (como o Feijão), o card fica vermelho para compra imediata.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-xl text-blue-900 dark:text-blue-300 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-blue-500" />
                <span>
                  <strong>Atalho Global:</strong> Pressione <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border rounded font-mono font-bold">Ctrl + K</kbd> (ou Cmd + K) para pesquisar qualquer produto em tempo real.
                </span>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300">
                <Utensils className="w-6 h-6 shrink-0 text-blue-500" />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm">Baixa em 1 Clique: Kit Cozinha & Kit DML</h4>
                  <p className="text-[11px] sm:text-xs opacity-90">Agilidade total para o Chefe Marcos e os voluntários, sem precisar digitar produto por produto.</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs text-slate-900 dark:text-white">Alimentação (Cozinha da Unidade):</strong>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Ao clicar no botão <strong>"+ Kit Cozinha Diário"</strong>, o sistema calcula as quantidades habituais para as refeições dos acolhidos (Arroz, Feijão, Macarrão, Óleo, Sal, etc.) e dá baixa no lote correto em um único clique.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-xs text-slate-900 dark:text-white">DML (Limpeza Predial & Conservação):</strong>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Troque a aba do topo para <strong>"DML & Limpeza"</strong>. Lá você encontra a baixa diária de desinfetante, cloro, sacos de lixo e papel higiênico para os alojamentos e banheiros.
                    </p>
                  </div>
                </div>
              </div>

              {onOpenKitModal && (
                <div className="pt-1">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenKitModal();
                    }}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md shadow-blue-600/20"
                  >
                    <Utensils className="w-4 h-4" />
                    <span>Experimentar Agora: Abrir Kit Cozinha Diário</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                <FileText className="w-6 h-6 shrink-0 text-emerald-500" />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm">Tecnologia com IA & Prestação de Contas JMN</h4>
                  <p className="text-[11px] sm:text-xs opacity-90">Entradas automatizadas por câmera e relatórios auditáveis com carimbo oficial da Junta.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                    <QrCode className="w-4 h-4 text-amber-500" />
                    <span>Leitor de NF e Código de Barras</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Aponte a câmera para o código de barras de um produto ou tire foto da Nota Fiscal do supermercado. A inteligência artificial extrai os itens e preenche a entrada automaticamente.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    <span>PDF Oficial & Recibo de Doação</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Na aba <strong>"Relatórios"</strong>, clique em <strong>"Baixar PDF Oficial JMN"</strong> para gerar a folha timbrada para a Diretoria da Junta de Missões Nacionais.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 text-slate-300 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="text-xs">
                    <strong className="text-white block">Instalar no Celular (PWA)</strong>
                    <span className="text-[11px] text-slate-400">Funciona offline e abre em tela cheia como aplicativo na Cristolândia.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Navigation Controls */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => {
              if (activeStep > 1) setActiveStep((prev) => prev - 1);
              else onClose();
            }}
            className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
          >
            {activeStep === 1 ? 'Fechar Guia' : 'Voltar'}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold mr-1">
              Passo {activeStep} de 3
            </span>
            {activeStep < 3 ? (
              <button
                onClick={() => setActiveStep((prev) => prev + 1)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
              >
                <span>Próximo Passo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Entendido! Iniciar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
