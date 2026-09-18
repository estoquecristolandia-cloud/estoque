import React, { useState, useEffect, useRef } from 'react';
import {
  Product,
  StockMovement,
  DailyMealRecord,
  DailyKit,
  Missionary,
  InventoryAudit,
  InventorySessionSummary,
  AiAssistantResponse,
  AiQueryAuditLog,
} from '../types';
import { askGeminiAiAssistant, getAiAuditLogs } from '../services/aiAssistantService';
import {
  checkVoiceSupport,
  categorizeVoiceError,
  transcribeAudioViaServer,
} from '../services/voiceTranscription';
import { toast } from '../utils/toast';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  Sparkles,
  Send,
  Mic,
  MicOff,
  Square,
  X,
  Clock,
  ShieldCheck,
  FileText,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Package,
  Utensils,
  History,
  Lightbulb,
  ArrowRight,
  Printer,
  Scale,
  Calendar,
  Volume2,
  Radio,
  Loader2,
  AudioWaveform,
} from 'lucide-react';
import jsPDF from 'jspdf';

interface AiAssistantViewProps {
  products: Product[];
  movements: StockMovement[];
  meals: DailyMealRecord[];
  dailyKit: DailyKit;
  missionaries: Missionary[];
  inventoryAudits: InventoryAudit[];
  inventorySessions: InventorySessionSummary[];
  currentUser: { displayName?: string; email?: string; role?: string } | null;
}

const QUICK_SUGGESTIONS = [
  { label: '📋 Situação Geral do Estoque', query: 'Como está a situação geral do nosso estoque hoje?' },
  { label: '🚚 Entradas e Compras Recentes', query: 'Quais foram as últimas entradas e compras recebidas no almoxarifado?' },
  { label: '🌽 Flocão de Milho (Cuscuz)', query: 'Qual o estoque e autonomia do flocão de milho para os preparos de quarta e domingo?' },
  { label: '🥖 Padaria (Fernando Pates)', query: 'Como está o consumo e estoque de insumos da padaria do Fernando Pates?' },
  { label: '⚖️ Arroz, Feijão e Macarrão', query: 'Quanto temos em estoque de arroz, feijão e macarrão?' },
  { label: '⚠️ Abaixo do Mínimo', query: 'Quais produtos estão abaixo do estoque mínimo e precisam ser comprados?' },
  { label: '🍽️ Refeições desta semana', query: 'Quantas refeições foram servidas esta semana e qual a média diária?' },
  { label: '👨‍🍳 Consumo da Cozinha (15 dias)', query: 'Quanto a cozinha consumiu nos últimos 15 dias?' },
  { label: '🥛 Leite do Renê (7 dias)', query: 'Quanto de leite o missionário Renê retirou nos últimos 7 dias?' },
  { label: '👤 Retiradas do Pr. Marconi', query: 'Quais produtos o Pr. Marconi retirou este mês?' },
];

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  products,
  movements,
  meals,
  dailyKit,
  missionaries,
  inventoryAudits,
  inventorySessions,
  currentUser,
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<AiAssistantResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCalculationBase, setShowCalculationBase] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AiQueryAuditLog[]>([]);

  // Estados de Comando de Voz & Gravação de Áudio
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const responseEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAuditLogs(getAiAuditLogs());
  }, [currentResponse]);

  // Limpeza de stream de áudio e timer ao desmontar
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (audioStreamRef.current) {
        try {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
        } catch {}
      }
    };
  }, []);

  const handleAsk = async (questionToAsk?: string) => {
    const textToAsk = (questionToAsk || query).trim();
    if (!textToAsk || isLoading) return;

    // Se estiver gravando, parar e descartar
    if (isRecording) {
      cancelVoiceRecording();
    }

    setIsLoading(true);
    setQuery(textToAsk);

    try {
      const response = await askGeminiAiAssistant(
        textToAsk,
        products,
        movements,
        meals,
        dailyKit,
        missionaries,
        inventoryAudits,
        inventorySessions,
        currentUser
      );
      setCurrentResponse(response);
      setShowCalculationBase(true);

      setTimeout(() => {
        responseEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      toast.error('Erro ao consultar o assistente: ' + (err.message || 'Tente novamente.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  // Converte Blob de áudio para Base64 puro
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Iniciar Gravação Direta de Áudio pelo Microfone
  const startVoiceRecording = async () => {
    if (isRecording) {
      stopVoiceRecording();
      return;
    }

    const voiceSupport = checkVoiceSupport();
    if (!voiceSupport.canRecordVoice && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
      toast.error('Seu navegador não suporta captura de microfone. Você pode digitar sua pergunta normalmente.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      // Detecta formato suportado pelo navegador
      let selectedMimeType = '';
      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          selectedMimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          selectedMimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          selectedMimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          selectedMimeType = 'audio/ogg';
        }
      }

      const mediaRecorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const chunks = audioChunksRef.current;
        const actualMime = mediaRecorder.mimeType || selectedMimeType || 'audio/webm';
        const audioBlob = new Blob(chunks, { type: actualMime });

        // Libera as faixas do microfone
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
        }

        if (audioBlob.size < 800) {
          toast.info('Áudio muito curto. Clique no microfone, fale sua pergunta e clique em Concluir.');
          setIsRecording(false);
          setIsTranscribing(false);
          return;
        }

        setIsTranscribing(true);
        try {
          const result = await transcribeAudioViaServer(audioBlob, actualMime, 25000);
          if (result.text && !result.empty) {
            const recognized = result.text.trim();
            setQuery((prev) => {
              const prevTrimmed = prev.trim();
              return prevTrimmed ? `${prevTrimmed} ${recognized}` : recognized;
            });
            toast.success(`🎙️ Fala transcrita: "${recognized}"`);
            inputRef.current?.focus();
          } else {
            toast.info('Nenhuma fala foi detectada no áudio gravado. Tente falar mais perto do microfone.');
          }
        } catch (err: any) {
          console.error('Falha na transcrição:', err);
          const categorized = categorizeVoiceError(err);
          toast.error(categorized.friendlyMessage);
        } finally {
          setIsTranscribing(false);
          setRecordingSeconds(0);
        }
      };

      // Inicia gravação coletando pedaços a cada 250ms
      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            // Auto-stop aos 60 segundos de gravação contínua
            stopVoiceRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);

      toast.info('🎙️ Gravando áudio... Fale sua pergunta sobre o estoque.');
    } catch (err: any) {
      console.error('Erro ao acessar microfone:', err);
      const categorized = categorizeVoiceError(err);
      toast.error(categorized.friendlyMessage);
      setIsRecording(false);
    }
  };

  // Parar gravação e enviar para transcrição com IA
  const stopVoiceRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('Erro ao finalizar gravação:', err);
      }
    }
  };

  // Cancelar gravação sem transcrever
  const cancelVoiceRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (audioStreamRef.current) {
      try {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {}
      audioStreamRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {}
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setIsTranscribing(false);
    setRecordingSeconds(0);
    toast.info('Gravação de voz cancelada.');
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCopyResponse = () => {
    if (!currentResponse) return;
    const textToCopy = `🤖 RESPOSTA DO ASSISTENTE IA — ESTOQUE CRISTOLÂNDIA
Pergunta: "${currentResponse.query}"

RESUMO:
${currentResponse.summary}

DETALHAMENTO:
${currentResponse.detailedAnalysis.replace(/[#*]/g, '')}

BASE DE CÁLCULO:
• Período: ${currentResponse.calculationBase.periodAnalyzed}
• Movimentações auditadas: ${currentResponse.calculationBase.movementsCount}
• Total calculado: ${currentResponse.calculationBase.totalQuantity} ${currentResponse.calculationBase.unit || ''}
${(currentResponse.calculationBase.filtersUsed || []).map((f) => `• Filtro: ${f}`).join('\n')}

Relatório gerado em: ${new Date(currentResponse.timestamp).toLocaleString('pt-BR')}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Relatório copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportPDF = () => {
    if (!currentResponse) return;
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.setTextColor(22, 101, 52); // green
      doc.text('ESTOQUE CRISTOLÂNDIA — LEM / BA', 14, 18);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text('Centro de Formação e Assistência Social • Junta de Missões Nacionais', 14, 24);
      doc.text(`Relatório do Assistente IA emitido em: ${new Date().toLocaleString('pt-BR')}`, 14, 29);

      doc.setDrawColor(203, 213, 225);
      doc.line(14, 33, 196, 33);

      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`Consulta: "${currentResponse.query}"`, 14, 42);

      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      const splitSummary = doc.splitTextToSize(currentResponse.summary, 180);
      doc.text(splitSummary, 14, 52);

      let yPos = 52 + splitSummary.length * 6 + 6;

      doc.setFontSize(11);
      doc.setTextColor(22, 101, 52);
      doc.text('Base de Cálculo & Rastreabilidade:', 14, yPos);
      yPos += 6;

      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text(`• Período Analisado: ${currentResponse.calculationBase.periodAnalyzed}`, 14, yPos);
      yPos += 5;
      doc.text(`• Movimentações Consideradas: ${currentResponse.calculationBase.movementsCount}`, 14, yPos);
      yPos += 5;
      doc.text(`• Total Calculado: ${currentResponse.calculationBase.totalQuantity} ${currentResponse.calculationBase.unit || ''}`, 14, yPos);
      yPos += 8;

      if (currentResponse.calculationBase.movementsSummary && currentResponse.calculationBase.movementsSummary.length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text('Lançamentos Analisados:', 14, yPos);
        yPos += 6;

        doc.setFontSize(8);
        currentResponse.calculationBase.movementsSummary.slice(0, 25).forEach((m) => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          const line = `${m.date} ${m.time || ''} | ${m.quantity} ${m.unit} | ${m.productName} | Resp: ${m.responsible || '-'} | Setor: ${m.sector || '-'}`;
          doc.text(line, 14, yPos);
          yPos += 4.5;
        });
      }

      doc.save(`relatorio-ia-cristolandia-${Date.now()}.pdf`);
      toast.success('PDF do relatório gerado com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao gerar PDF: ' + err.message);
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Dados 100% Auditados
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Dados Parciais
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Dados Insuficientes
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION (PADRÃO BENTO GRID CLARO & INSTITUCIONAL) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-50 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Gemini 3.8 Flash • Somente Leitura • Entrada por Voz</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
              <Bot className="w-8 h-8 text-emerald-600" />
              <span>Assistente Inteligente de Estoque</span>
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Faça perguntas por texto ou por voz sobre o estoque da Cristolândia (LEM/BA), consumo por missionário/setor e refeições com rastreabilidade auditada.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold border border-slate-200 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
              title="Ver histórico de perguntas da sessão"
            >
              <History className="w-4 h-4 text-amber-500" />
              <span>Histórico ({auditLogs.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* INPUT CARD COM BOTÃO DE VOZ (MICROFONE) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        {/* BARRA DE GRAVAÇÃO ATIVA OU PROCESSAMENTO COM IA */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 overflow-hidden shadow-xs"
            >
              <div className="flex items-center gap-3">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900">
                      Gravando áudio direto: <span className="font-mono text-emerald-700 font-black">{formatTimer(recordingSeconds)}</span>
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 font-bold uppercase">
                      pt-BR
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5">
                    <span>Fale sua pergunta sobre o estoque ou refeições e clique em Concluir</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={stopVoiceRecording}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Concluir e Transcrever</span>
                </button>
                <button
                  type="button"
                  onClick={cancelVoiceRecording}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancelar</span>
                </button>
              </div>
            </motion.div>
          )}

          {isTranscribing && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 overflow-hidden"
            >
              <Loader2 className="w-5 h-5 text-amber-600 animate-spin shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-900">
                  Transcrevendo sua fala com Gemini IA...
                </p>
                <p className="text-xs text-amber-700">
                  Reconhecendo nomes de produtos, missionários e períodos.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1 flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite ou fale sua pergunta... (Ex: Quanto de leite o missionário Renê retirou nos últimos 7 dias?)"
              className={`w-full pl-4 pr-14 py-3.5 bg-slate-50 border rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                isRecording ? 'border-rose-400 ring-2 ring-rose-400/20' : 'border-slate-200'
              }`}
              disabled={isLoading || isTranscribing}
            />

            {/* BOTÃO DE MICROFONE INTEGRADO (TOUCH TARGET >= 44x44px) */}
            <button
              type="button"
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              disabled={isLoading || isTranscribing}
              aria-label={isRecording ? 'Concluir gravação de voz' : 'Falar pergunta por microfone'}
              title={
                isRecording
                  ? 'Clique para concluir a fala e transcrever'
                  : isTranscribing
                  ? 'Transcrevendo áudio com IA...'
                  : 'Falar pergunta por microfone (Gravação direta)'
              }
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                isRecording
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 scale-105 animate-pulse'
                  : isTranscribing
                  ? 'bg-amber-100 text-amber-700 cursor-wait'
                  : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 active:scale-95'
              }`}
            >
              {isRecording ? (
                <Square className="w-4 h-4 fill-current" />
              ) : isTranscribing ? (
                <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
              ) : (
                <Mic className="w-5 h-5 text-emerald-600 hover:text-emerald-700" />
              )}
            </button>
          </div>

          <button
            onClick={() => handleAsk()}
            disabled={isLoading || isTranscribing || !query.trim()}
            className="min-h-[44px] px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-2xl shadow-sm hover:shadow-md shadow-emerald-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Calculando...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Perguntar</span>
              </>
            )}
          </button>
        </div>

        {/* DICA DE VOZ DISCRETA E INFORMATIVA */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-600" />
            <span>Dica: Clique no 🎙️ microfone e fale normalmente (ex: "Quanto arroz a cozinha consumiu nos últimos 15 dias?")</span>
          </span>
          {query.trim() && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Limpar texto
            </button>
          )}
        </div>

        {/* QUICK PROMPTS CHIPS */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>Sugestões de Perguntas Rápidas:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_SUGGESTIONS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleAsk(item.query)}
                disabled={isLoading}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SESSION AUDIT LOGS (COLLAPSIBLE) */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-amber-500" />
                <span>Histórico de Consultas da Sessão</span>
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Fechar
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Nenhuma consulta realizada nesta sessão ainda.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => handleAsk(log.query)}
                    className="py-2.5 px-2 hover:bg-slate-50 rounded-xl flex items-center justify-between gap-4 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        "{log.query}"
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{log.summary}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 block">
                        {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[9px] font-bold text-emerald-600">
                        {log.movementsCount} reg.
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* RESPONSE DISPLAY SECTION */}
      {currentResponse && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* MAIN RESPONSE CARD */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            {/* TOP STATUS BAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {getConfidenceBadge(currentResponse.confidence)}
                <span className="text-xs text-slate-500">
                  {currentResponse.confidenceReason}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>100% Somente Leitura (Auditado)</span>
                </span>
              </div>
            </div>

            {/* QUERY TITLE */}
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                Pergunta Analisada:
              </p>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                "{currentResponse.query}"
              </h2>
            </div>

            {/* STALE CONTEXT WARNING (HTTP 409) */}
            {currentResponse.staleContext && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
                <div className="flex items-start sm:items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <p className="text-sm font-bold">Atenção: Os dados do estoque no navegador estão desatualizados</p>
                    <p className="text-xs text-amber-700 mt-0.5">O servidor identificou divergência em relação aos registros oficiais consolidados no Firestore.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="px-3.5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition-colors whitespace-nowrap flex items-center gap-1.5 self-end sm:self-auto cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Recarregar e Atualizar</span>
                </button>
              </div>
            )}

            {/* BENTO KPI METRICS */}
            {currentResponse.metrics && currentResponse.metrics.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {currentResponse.metrics.map((metric, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600 font-medium">
                        {metric.label}
                      </span>
                      {metric.badge && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {metric.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-slate-900">
                      {metric.value}
                      {metric.unit && (
                        <span className="text-xs font-bold text-slate-500 ml-1">
                          {metric.unit}
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* EXECUTIVE SUMMARY BOX */}
            <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Resumo da Análise:</span>
              </div>
              <p className="text-sm sm:text-base font-semibold text-slate-800 leading-relaxed">
                {currentResponse.summary}
              </p>
            </div>

            {/* DETAILED EXPLANATION */}
            <div className="space-y-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Detalhamento Técnico & Explicação</span>
              </h3>

              <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed">
                {currentResponse.detailedAnalysis.split('\n\n').map((paragraph, pIdx) => {
                  if (paragraph.startsWith('### ')) {
                    return (
                      <h4 key={pIdx} className="text-base font-bold text-slate-900 mt-4 mb-2">
                        {paragraph.replace('### ', '')}
                      </h4>
                    );
                  }
                  if (paragraph.startsWith('#### ')) {
                    return (
                      <h5 key={pIdx} className="text-sm font-bold text-slate-800 mt-3 mb-1">
                        {paragraph.replace('#### ', '')}
                      </h5>
                    );
                  }
                  if (paragraph.startsWith('|')) {
                    // Tabela Markdown
                    const rows = paragraph.trim().split('\n').filter((r) => !r.includes(':---'));
                    const headers = rows[0]?.split('|').map((h) => h.trim()).filter(Boolean) || [];
                    const bodyRows = rows.slice(1).map((r) => r.split('|').map((c) => c.trim()).filter(Boolean));

                    return (
                      <div key={pIdx} className="overflow-x-auto my-3">
                        <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                          <thead className="bg-slate-100 text-slate-700 font-bold">
                            <tr>
                              {headers.map((h, hIdx) => (
                                <th key={hIdx} className="p-2.5 border-b border-slate-200">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {bodyRows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50">
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="p-2.5">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }
                  return (
                    <p key={pIdx} className="my-1.5">
                      {paragraph}
                    </p>
                  );
                })}
              </div>
            </div>

            {/* BASE DE CÁLCULO E RASTREABILIDADE (EXPANDÍVEL) */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowCalculationBase(!showCalculationBase)}
                className="w-full p-4 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Base de Cálculo & Rastreabilidade dos Lançamentos ({currentResponse.calculationBase.movementsCount} registros)
                  </span>
                </div>
                {showCalculationBase ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showCalculationBase && (
                <div className="p-4 sm:p-5 space-y-4 text-xs bg-white border-t border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-500 font-medium">Período Auditado:</span>
                      <p className="font-bold text-slate-800">{currentResponse.calculationBase.periodAnalyzed}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-500 font-medium">Lançamentos Considerados:</span>
                      <p className="font-bold text-slate-800">{currentResponse.calculationBase.movementsCount} movimentações</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-slate-500 font-medium">Total Calculado:</span>
                      <p className="font-bold text-emerald-700">
                        {currentResponse.calculationBase.totalQuantity} {currentResponse.calculationBase.unit || ''}
                      </p>
                    </div>
                  </div>

                  {currentResponse.calculationBase.filtersUsed && (
                    <div className="space-y-1">
                      <span className="text-slate-500 font-medium">Filtros Aplicados na Consulta:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {currentResponse.calculationBase.filtersUsed.map((filter, fIdx) => (
                          <span
                            key={fIdx}
                            className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold"
                          >
                            {filter}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TABELA DE MOVIMENTAÇÕES INCLUÍDAS */}
                  {currentResponse.calculationBase.movementsSummary && currentResponse.calculationBase.movementsSummary.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <span className="text-slate-500 font-medium">Rastreio Cronológico de Registros:</span>
                      <div className="overflow-x-auto max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-700 sticky top-0">
                            <tr>
                              <th className="p-2">Data/Hora</th>
                              <th className="p-2">Produto</th>
                              <th className="p-2">Quantidade</th>
                              <th className="p-2">Responsável</th>
                              <th className="p-2">Setor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {currentResponse.calculationBase.movementsSummary.map((mov, mIdx) => (
                              <tr key={mIdx} className="hover:bg-slate-50">
                                <td className="p-2 text-slate-500 whitespace-nowrap">
                                  {mov.date} {mov.time || ''}
                                </td>
                                <td className="p-2 font-bold text-slate-800">
                                  {mov.productName}
                                </td>
                                <td className="p-2 font-bold text-emerald-700 whitespace-nowrap">
                                  {mov.quantity} {mov.unit}
                                </td>
                                <td className="p-2 text-slate-600">
                                  {mov.responsible || '-'}
                                </td>
                                <td className="p-2 text-slate-600">
                                  {mov.sector || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* INSIGHTS */}
            {currentResponse.insights && currentResponse.insights.length > 0 && (
              <div className="space-y-2 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-800">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span>Conclusões & Insights:</span>
                </div>
                <ul className="space-y-1 text-xs text-slate-700">
                  {currentResponse.insights.map((insight, iIdx) => (
                    <li key={iIdx} className="flex items-start gap-2">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* SUGGESTED FOLLOW-UPS */}
            {currentResponse.suggestedFollowUps && currentResponse.suggestedFollowUps.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Perguntas Sugeridas a Seguir:
                </span>
                <div className="flex flex-wrap gap-2">
                  {currentResponse.suggestedFollowUps.map((suggested, sIdx) => (
                    <button
                      key={sIdx}
                      onClick={() => handleAsk(suggested)}
                      className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-medium border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{suggested}</span>
                      <ArrowRight className="w-3 h-3 text-emerald-600" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ACTIONS FOOTER */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyResponse}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Resposta'}</span>
                </button>

                <button
                  onClick={handleExportPDF}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <FileText className="w-4 h-4 text-rose-600" />
                  <span>Exportar PDF</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <Printer className="w-4 h-4 text-blue-600" />
                  <span>Imprimir</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-200"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                <span>Nova Pergunta</span>
              </button>
            </div>
          </div>
          <div ref={responseEndRef} />
        </motion.div>
      )}
    </div>
  );
};

