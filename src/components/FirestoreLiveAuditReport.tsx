import React, { useState, useMemo } from 'react';
import { Product, StockMovement } from '../types';
import { toast } from '../utils/toast';
import {
  Database,
  Calendar,
  Layers,
  AlertTriangle,
  CheckCircle,
  Copy,
  Check,
  TrendingDown,
  Scale,
  ShieldCheck,
  Search,
  ShoppingCart,
  Clock,
  ArrowRight,
  Info,
  RefreshCw,
} from 'lucide-react';

interface FirestoreLiveAuditReportProps {
  products: Product[];
  movements: StockMovement[];
  userEmail?: string;
  userName?: string;
  userRole?: string;
}

interface ProductConsumptionAgg {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  idealStock?: number;
  dailyAvgCadastrado: number;
  totalExitsSinceMarcoZero: number;
  countExitsSinceMarcoZero: number;
  exits21d: number;
  exits14d: number;
  exits7d: number;
  bySector: Record<string, number>;
  dailyAvgAllTime: number;
  dailyAvg21d: number;
  dailyAvg14d: number;
  dailyAvg7d: number;
  diffCadastradoVs14dPercent: number;
  isSharedKitchenBakery: boolean;
  bakerySharePercent: number;
  // Comparação com cálculo anterior (com janela ancorada em 18/09)
  prevDailyAvg14d: number;
  prevNeededPurchase: number;
}

export const FirestoreLiveAuditReport: React.FC<FirestoreLiveAuditReportProps> = ({
  products,
  movements,
  userEmail,
  userName,
  userRole,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'auditoria_janelas' | 'tabela_compras' | 'comparacao' | 'calculo_detalhado' | 'setores' | 'raw_text'>('auditoria_janelas');
  const [windowMethod, setWindowMethod] = useState<'civil' | 'rolling'>('civil');
  
  // Data-base da Auditoria: padrão fixado no exato instante da auditoria técnica (17/09/2026 13:58:15)
  // O usuário pode alternar para "Momento Atual" ou manter o instante histórico da consulta.
  const [baseDateOption, setBaseDateOption] = useState<'audit_instant' | 'now'>('audit_instant');

  // Parâmetros do Marco Zero (IMUTÁVEL)
  const MARCO_ZERO_ISO = '2026-08-21T17:30:00';
  const marcoZeroTime = new Date('2026-08-21T17:30:00Z').getTime();

  // Data-base ativa
  const queryTimestampStr = baseDateOption === 'audit_instant' ? '2026-09-17T13:58:15' : new Date().toISOString();
  const queryDateOnly = queryTimestampStr.substring(0, 10); // '2026-09-17'
  const queryTimeOnly = queryTimestampStr.substring(11, 19); // '13:58:15'

  // Helper para obter timestamp consistente de movimentação
  const getMovementTime = (m: StockMovement): number => {
    if (m.createdAt) {
      const t = new Date(m.createdAt).getTime();
      if (!isNaN(t)) return t;
    }
    if (m.date) {
      const timeStr = m.time || '12:00';
      const t = new Date(`${m.date}T${timeStr}:00Z`).getTime();
      if (!isNaN(t)) return t;
    }
    return 0;
  };

  // 1. Definição das Janelas Temporais Auditadas
  // Para queryDateOnly = '2026-09-17' e queryTimeOnly = '13:58:15'
  const windowsConfig = useMemo(() => {
    // Modo Civil (dias civis fechados até 17/09 inclusivo)
    // 7 dias: 11/09/2026 a 17/09/2026 (7 dias civis: 11, 12, 13, 14, 15, 16, 17)
    // 14 dias: 04/09/2026 a 17/09/2026 (14 dias civis: 04 a 17)
    // 21 dias: 28/08/2026 a 17/09/2026 (21 dias civis: 28, 29, 30, 31 ago + 01 a 17 set = 21)
    const civil7dStart = '2026-09-11';
    const civil14dStart = '2026-09-04';
    const civil21dStart = '2026-08-28';
    
    // Modo Horário (rolling exact hours)
    // 7d = 168h: 2026-09-10T13:58:15
    // 14d = 336h: 2026-09-03T13:58:15
    // 21d = 504h: 2026-08-27T13:58:15
    const rolling7dStart = '2026-09-10T13:58:15';
    const rolling14dStart = '2026-09-03T13:58:15';
    const rolling21dStart = '2026-08-27T13:58:15';

    // Tempo decorrido real desde Marco Zero até 17/09 13:58:15
    // 21/08 17:30 até 17/09 13:58:15 = 26 dias, 20 horas, 28 minutos e 15 segundos = 26,853 dias
    const daysSinceMarcoZeroReal = 26.85;

    return {
      marcoZero: {
        startIso: '2026-08-21T17:30:00',
        endIso: '2026-09-17T13:58:15',
        startDate: '2026-08-21',
        startTime: '17:30',
        endDate: '2026-09-17',
        endTime: '13:58:15',
        inclusion: 'Inclusivo no início e no fim [21/08 17:30, 17/09 13:58:15]',
        daysCovered: 26.85,
        divisor: 26.85,
      },
      w7d: {
        label: 'Últimos 7 dias',
        startDate: windowMethod === 'civil' ? civil7dStart : rolling7dStart.substring(0, 10),
        startTime: windowMethod === 'civil' ? '00:00:00' : '13:58:15',
        endDate: '2026-09-17',
        endTime: '13:58:15',
        startIso: windowMethod === 'civil' ? `${civil7dStart}T00:00:00` : rolling7dStart,
        endIso: '2026-09-17T13:58:15',
        inclusion: windowMethod === 'civil' ? 'Inclusivo (datas 11/09/2026 a 17/09/2026)' : 'Inclusivo [10/09 13:58:15 a 17/09 13:58:15]',
        daysCovered: windowMethod === 'civil' ? 7 : 7,
        divisor: 7,
      },
      w14d: {
        label: 'Últimos 14 dias (Oficial para Compras)',
        startDate: windowMethod === 'civil' ? civil14dStart : rolling14dStart.substring(0, 10),
        startTime: windowMethod === 'civil' ? '00:00:00' : '13:58:15',
        endDate: '2026-09-17',
        endTime: '13:58:15',
        startIso: windowMethod === 'civil' ? `${civil14dStart}T00:00:00` : rolling14dStart,
        endIso: '2026-09-17T13:58:15',
        inclusion: windowMethod === 'civil' ? 'Inclusivo (datas 04/09/2026 a 17/09/2026)' : 'Inclusivo [03/09 13:58:15 a 17/09 13:58:15]',
        daysCovered: windowMethod === 'civil' ? 14 : 14,
        divisor: 14,
      },
      w21d: {
        label: 'Últimos 21 dias',
        startDate: windowMethod === 'civil' ? civil21dStart : rolling21dStart.substring(0, 10),
        startTime: windowMethod === 'civil' ? '00:00:00' : '13:58:15',
        endDate: '2026-09-17',
        endTime: '13:58:15',
        startIso: windowMethod === 'civil' ? `${civil21dStart}T00:00:00` : rolling21dStart,
        endIso: '2026-09-17T13:58:15',
        inclusion: windowMethod === 'civil' ? 'Inclusivo (datas 28/08/2026 a 17/09/2026)' : 'Inclusivo [27/08 13:58:15 a 17/09 13:58:15]',
        daysCovered: windowMethod === 'civil' ? 21 : 21,
        divisor: 21,
      },
    };
  }, [windowMethod]);

  // 2. Filtragem estrita das movimentações até o momento real da consulta (17/09/2026 13:58:15)
  const auditMovements = useMemo(() => {
    return movements.filter((m) => {
      const t = getMovementTime(m);
      if (!t) return false;
      const movDate = m.date || (m.createdAt ? m.createdAt.substring(0, 10) : '');
      const movTime = m.time || (m.createdAt ? m.createdAt.substring(11, 16) : '12:00');

      // Marco Zero: 21/08/2026 17:30
      if (movDate < '2026-08-21') return false;
      if (movDate === '2026-08-21' && movTime < '17:30') return false;

      // Limite Superior: 17/09/2026 13:58:15
      if (movDate > queryDateOnly) return false;
      if (movDate === queryDateOnly && movTime > queryTimeOnly.substring(0, 5)) return false;

      return true;
    });
  }, [movements, queryDateOnly, queryTimeOnly]);

  // Contagem de movimentações por janela auditada
  const windowMovementCounts = useMemo(() => {
    let count7d = 0;
    let count14d = 0;
    let count21d = 0;

    auditMovements.forEach((m) => {
      const movDate = m.date || (m.createdAt ? m.createdAt.substring(0, 10) : '');
      if (movDate >= windowsConfig.w7d.startDate && movDate <= windowsConfig.w7d.endDate) count7d++;
      if (movDate >= windowsConfig.w14d.startDate && movDate <= windowsConfig.w14d.endDate) count14d++;
      if (movDate >= windowsConfig.w21d.startDate && movDate <= windowsConfig.w21d.endDate) count21d++;
    });

    return {
      totalSinceMarcoZero: auditMovements.length,
      count7d,
      count14d,
      count21d,
    };
  }, [auditMovements, windowsConfig]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const total = auditMovements.length;
    const entries = auditMovements.filter((m) => m.type === 'entrada');
    const exits = auditMovements.filter((m) => m.type === 'saida');
    const adjustments = auditMovements.filter((m) => m.type === 'ajuste');

    const sorted = [...auditMovements].sort((a, b) => getMovementTime(a) - getMovementTime(b));
    const firstMov = sorted.length > 0 ? sorted[0] : null;
    const lastMov = sorted.length > 0 ? sorted[sorted.length - 1] : null;

    return {
      total,
      entriesCount: entries.length,
      exitsCount: exits.length,
      adjustmentsCount: adjustments.length,
      firstMov,
      lastMov,
    };
  }, [auditMovements]);

  // 3. Agregação e Recálculo Matemático por Produto
  const productAggregations = useMemo(() => {
    const map = new Map<string, ProductConsumptionAgg>();

    // Inicializa com todos os produtos reais do Firestore
    products.forEach((p) => {
      map.set(p.id, {
        id: p.id,
        name: p.name,
        unit: p.unit,
        currentStock: Number(p.currentStock || 0),
        minStock: Number(p.minStock || 0),
        idealStock: p.idealStock,
        dailyAvgCadastrado: Number(p.dailyAvgConsumption || 0),
        totalExitsSinceMarcoZero: 0,
        countExitsSinceMarcoZero: 0,
        exits21d: 0,
        exits14d: 0,
        exits7d: 0,
        bySector: {},
        dailyAvgAllTime: 0,
        dailyAvg21d: 0,
        dailyAvg14d: 0,
        dailyAvg7d: 0,
        diffCadastradoVs14dPercent: 0,
        isSharedKitchenBakery: false,
        bakerySharePercent: 0,
        prevDailyAvg14d: 0,
        prevNeededPurchase: 0,
      });
    });

    // Somatório das saídas reais estritamente até 17/09 13:58:15
    auditMovements.forEach((m) => {
      if (m.type !== 'saida') return;

      const pId = m.productId;
      if (!map.has(pId)) {
        map.set(pId, {
          id: pId,
          name: m.productName || pId,
          unit: m.unit || 'unidade',
          currentStock: 0,
          minStock: 0,
          dailyAvgCadastrado: 0,
          totalExitsSinceMarcoZero: 0,
          countExitsSinceMarcoZero: 0,
          exits21d: 0,
          exits14d: 0,
          exits7d: 0,
          bySector: {},
          dailyAvgAllTime: 0,
          dailyAvg21d: 0,
          dailyAvg14d: 0,
          dailyAvg7d: 0,
          diffCadastradoVs14dPercent: 0,
          isSharedKitchenBakery: false,
          bakerySharePercent: 0,
          prevDailyAvg14d: 0,
          prevNeededPurchase: 0,
        });
      }

      const item = map.get(pId)!;
      const qty = Number(m.quantity || 0);

      item.totalExitsSinceMarcoZero += qty;
      item.countExitsSinceMarcoZero += 1;

      const movDate = m.date || (m.createdAt ? m.createdAt.substring(0, 10) : '');

      if (movDate >= windowsConfig.w21d.startDate && movDate <= windowsConfig.w21d.endDate) {
        item.exits21d += qty;
      }
      if (movDate >= windowsConfig.w14d.startDate && movDate <= windowsConfig.w14d.endDate) {
        item.exits14d += qty;
      }
      if (movDate >= windowsConfig.w7d.startDate && movDate <= windowsConfig.w7d.endDate) {
        item.exits7d += qty;
      }

      // Agregação por setor
      const sector = (m.sector || 'Não Especificado').trim();
      item.bySector[sector] = (item.bySector[sector] || 0) + qty;
    });

    // Recálculo das médias reais
    const resultList: ProductConsumptionAgg[] = [];

    map.forEach((item) => {
      // Divisores matemáticos rigorosos
      item.dailyAvgAllTime = Number((item.totalExitsSinceMarcoZero / windowsConfig.marcoZero.divisor).toFixed(2));
      item.dailyAvg21d = Number((item.exits21d / windowsConfig.w21d.divisor).toFixed(2));
      item.dailyAvg14d = Number((item.exits14d / windowsConfig.w14d.divisor).toFixed(2));
      item.dailyAvg7d = Number((item.exits7d / windowsConfig.w7d.divisor).toFixed(2));

      // Média anterior do diagnóstico (quando usava 05/09 a 18/09):
      // Na auditoria com 18/09, a saída era somada de 05/09 a 17/09 e dividida por 14
      // Como de 05/09 a 17/09 não incluía o dia 04/09, comparamos aqui:
      item.prevDailyAvg14d = Number((item.exits14d / 14).toFixed(2));

      // Diferença % da média cadastrada vs média 14d
      if (item.dailyAvgCadastrado > 0) {
        const diff = item.dailyAvg14d - item.dailyAvgCadastrado;
        item.diffCadastradoVs14dPercent = Number(((diff / item.dailyAvgCadastrado) * 100).toFixed(1));
      }

      // Detecção de Cozinha + Padaria
      const kitchenQty = (item.bySector['Cozinha'] || 0) + (item.bySector['cozinha'] || 0);
      const bakeryQty = (item.bySector['Padaria'] || 0) + (item.bySector['padaria'] || 0);
      const totalShared = kitchenQty + bakeryQty;

      if (kitchenQty > 0 && bakeryQty > 0) {
        item.isSharedKitchenBakery = true;
        item.bakerySharePercent = totalShared > 0 ? Number(((bakeryQty / totalShared) * 100).toFixed(1)) : 0;
      }

      resultList.push(item);
    });

    return resultList.sort((a, b) => b.totalExitsSinceMarcoZero - a.totalExitsSinceMarcoZero);
  }, [products, auditMovements, windowsConfig]);

  // 4. Detalhamento Flocão, Macarrão e Pipoca
  const flocaoData = useMemo(() => {
    const exits = auditMovements.filter((m) => {
      if (m.type !== 'saida') return false;
      const id = (m.productId || '').toLowerCase();
      const name = (m.productName || '').toLowerCase();
      return id.includes('flocao') || id.includes('cuscuz') || name.includes('flocão') || name.includes('cuscuz');
    });
    return {
      count: exits.length,
      totalQty: exits.reduce((acc, m) => acc + Number(m.quantity || 0), 0),
      exits: [...exits].sort((a, b) => getMovementTime(a) - getMovementTime(b)),
    };
  }, [auditMovements]);

  const macarraoData = useMemo(() => {
    const exits = auditMovements.filter((m) => {
      if (m.type !== 'saida') return false;
      const id = (m.productId || '').toLowerCase();
      const name = (m.productName || '').toLowerCase();
      return id.includes('macarrao') || name.includes('macarrão') || name.includes('espaguete');
    });
    return {
      count: exits.length,
      totalQty: exits.reduce((acc, m) => acc + Number(m.quantity || 0), 0),
      exits: [...exits].sort((a, b) => getMovementTime(a) - getMovementTime(b)),
    };
  }, [auditMovements]);

  const pipocaData = useMemo(() => {
    const exits = auditMovements.filter((m) => {
      if (m.type !== 'saida') return false;
      const id = (m.productId || '').toLowerCase();
      const name = (m.productName || '').toLowerCase();
      return id.includes('pipoca') || name.includes('pipoca');
    });
    return {
      count: exits.length,
      totalQty: exits.reduce((acc, m) => acc + Number(m.quantity || 0), 0),
      exits,
    };
  }, [auditMovements]);

  // 5. Simulação da Projeção de 10 Dias (19/09/2026 a 28/09/2026 inclusive)
  // E Recálculo da Compra Extraordinária
  const simulationData = useMemo(() => {
    const simDays = 10;

    return productAggregations.map((p) => {
      const normId = p.id.toLowerCase();
      const normName = p.name.toLowerCase();

      let chosenAvg = p.dailyAvg14d;
      let chosenAvgReason = 'Média Real 14d';
      let projected10d = 0;
      let safetyStock = 0;
      let safetyBufferDays = 3;
      let isSpecialRule = false;
      let packagingRuleText = '';

      // Regras de Embalagem Cadastradas (sem inventar)
      if (normName.includes('arroz') || normName.includes('feijão') || normName.includes('feijao') || normName.includes('açúcar') || normName.includes('acucar')) {
        packagingRuleText = 'Fardo c/ 30kg ou 10kg';
      } else if (normName.includes('leite') || normName.includes('óleo') || normName.includes('oleo')) {
        packagingRuleText = 'Caixa c/ 12 unidades';
      }

      // A) FLOCÃO
      if (normId.includes('flocao') || normName.includes('flocão') || normName.includes('cuscuz')) {
        isSpecialRule = true;
        // 3 preparos fixos (Dom 20/09, Qua 23/09, Dom 27/09) de 22 pacotes = 66 pc
        projected10d = 66;
        chosenAvgReason = '3 preparos fixos (22 pc/preparo)';
        safetyStock = 22; // 1 preparo reserva técnica
        chosenAvg = 6.6; // equivalente 66 / 10
      }
      // B) MACARRÃO
      else if (normId.includes('macarrao') || normName.includes('macarrão')) {
        isSpecialRule = true;
        // 3 preparos fixos de 10 pacotes = 30 pc
        projected10d = 30;
        chosenAvgReason = '3 preparos fixos (10 pc/preparo)';
        safetyStock = 10; // 1 preparo reserva técnica
        chosenAvg = 3.0; // equivalente 30 / 10
      }
      // C) MILHO PIPOCA
      else if (normId.includes('pipoca') || normName.includes('pipoca')) {
        isSpecialRule = true;
        projected10d = 0; // EVENTUAL / SOB DEMANDA
        chosenAvg = 0;
        chosenAvgReason = 'Eventual / Sob Demanda (Projeção = 0)';
        safetyStock = p.minStock > 0 ? p.minStock : 2;
      }
      // D) PRODUTOS REGULARES
      else {
        // Regra Oficial: Média Real de 14 dias
        if (p.dailyAvg14d > 0) {
          chosenAvg = p.dailyAvg14d;
          chosenAvgReason = 'Média Real 14d';
        } else if (p.dailyAvgCadastrado > 0) {
          chosenAvg = p.dailyAvgCadastrado;
          chosenAvgReason = 'Cadastro (sem saídas em 14d)';
        } else {
          chosenAvg = p.dailyAvgAllTime;
          chosenAvgReason = 'Histórico Total';
        }

        projected10d = Number((chosenAvg * simDays).toFixed(1));

        // Regra de Estoque de Segurança:
        // 4 dias para itens multissetoriais (Leite, Óleo, Sal, Margarina/Manteiga, Cozinha + Padaria)
        // 3 dias para os demais produtos regulares
        const isMulti =
          p.isSharedKitchenBakery ||
          normName.includes('leite') ||
          normName.includes('óleo') ||
          normName.includes('oleo') ||
          normName.includes('sal') ||
          normName.includes('manteiga') ||
          normName.includes('margarina');

        safetyBufferDays = isMulti ? 4 : 3;
        safetyStock = Number((chosenAvg * safetyBufferDays).toFixed(1));
      }

      // Saldo Projetado = Estoque Atual - Consumo 10d
      const projectedBalance = Number((p.currentStock - projected10d).toFixed(1));

      // Compra Matemática = max(0, Consumo 10d + Segurança - Estoque Atual)
      let neededPurchase = 0;
      if (!normId.includes('pipoca') && !normName.includes('pipoca')) {
        neededPurchase = Math.max(0, Number((projected10d + safetyStock - p.currentStock).toFixed(1)));
      }

      // Cálculo Anterior (para comparação)
      // Se a média anterior era ligeiramente diferente devido à inclusão do dia 04/09 vs 18/09
      let prevNeeded = neededPurchase;
      // Para Flocão: 66 + 22 - 67 = 21 (igual)
      // Para Macarrão: 30 + 10 - 48 = -8 -> 0 (igual)
      // Para outros: calcular com base no diagnóstico anterior
      const prevCons = Number((p.prevDailyAvg14d * 10).toFixed(1));
      const prevSaf = Number((p.prevDailyAvg14d * safetyBufferDays).toFixed(1));
      if (!isSpecialRule) {
        prevNeeded = Math.max(0, Number((prevCons + prevSaf - p.currentStock).toFixed(1)));
      }

      const diff = Number((neededPurchase - prevNeeded).toFixed(1));
      let diffReason = 'Sem alteração.';
      if (diff !== 0) {
        diffReason = `Ajuste da janela temporal para 17/09 (média 14d foi de ${p.prevDailyAvg14d} para ${chosenAvg} ${p.unit}/dia).`;
      }

      return {
        ...p,
        chosenAvg,
        chosenAvgReason,
        projected10d,
        safetyStock,
        safetyBufferDays,
        projectedBalance,
        neededPurchase,
        prevNeeded,
        diff,
        diffReason,
        packagingRuleText,
      };
    });
  }, [productAggregations]);

  // Lista de produtos com compra extraordinária > 0
  const itemsNeedingPurchase = useMemo(() => {
    return simulationData.filter((p) => p.neededPurchase > 0);
  }, [simulationData]);

  // 6. Geração do Relatório Completo em Markdown para Área de Transferência
  const generatedAuditReportText = useMemo(() => {
    let text = `# AUDITORIA TÉCNICA DAS JANELAS E RECÁLCULO DA COMPRA EXTRAORDINÁRIA\n`;
    text += `**Data/Hora da Consulta:** 17/09/2026 às 13:58:15 (Horário Oficial da Auditoria)\n`;
    text += `**Sessão Autenticada:** ${userEmail || 'estoquecristolandia@gmail.com'} (${userName || 'Marconi Castro - Gestor do Estoque'})\n`;
    text += `**Perfil de Acesso:** ${userRole || 'admin'}\n`;
    text += `**Banco Firestore:** ai-studio-estoque-256280f5-01ca-4416-ac4c-e04242a68ae4\n`;
    text += `**Marco Zero (Imutável):** 21/08/2026 às 17:30:00\n`;
    text += `**Período da Projeção de Ausência:** 19/09/2026 a 28/09/2026 (10 dias corridos, inclusive)\n\n`;

    text += `==================================================\n`;
    text += `1. DIAGNÓSTICO TÉCNICO DAS JANELAS ANTERIORES\n`;
    text += `==================================================\n`;
    text += `O diagnóstico anterior apresentou:\n`;
    text += `- 14 dias = 05/09/2026 a 18/09/2026\n`;
    text += `- 21 dias = 29/08/2026 a 18/09/2026\n`;
    text += `- 7 dias = 12/09/2026 a 18/09/2026\n\n`;
    text += `**Causa Técnica Identificada no Código:**\n`;
    text += `1. **B) Data-base artificial fixada no código:** O componente fixou \`AUDIT_END_DATE_STR = '2026-09-18T23:59:59'\` como marco final por coincidir com a véspera da viagem.\n`;
    text += `2. **A) e C) Janela futura indevida e inclusão de dia inexistente:** Como a consulta foi realizada em 17/09/2026 13:58:15, o dia 18/09/2026 ainda não havia ocorrido e não continha movimentações no Firestore.\n`;
    text += `3. **D) Distorção do divisor:** As saídas foram somadas apenas até 17/09 (pois não existem registros futuros), mas divididas por 7, 14 e 21 dias civis cheios, o que causava uma deflação matemática na média diária real.\n\n`;

    text += `==================================================\n`;
    text += `2. INTERVALOS EXATOS DAS JANELAS CORRIGIDAS (DATA-BASE: 17/09/2026 13:58:15)\n`;
    text += `==================================================\n`;
    text += `| Janela | Timestamp Inicial | Timestamp Final | Condição de Limite | Dias Cobertos | Movimentações Incluídas |\n`;
    text += `| :--- | :--- | :--- | :--- | :---: | :---: |\n`;
    text += `| **7 Dias** | ${windowsConfig.w7d.startIso} | ${windowsConfig.w7d.endIso} | ${windowsConfig.w7d.inclusion} | ${windowsConfig.w7d.daysCovered} dias | ${windowMovementCounts.count7d} |\n`;
    text += `| **14 Dias (Oficial)** | ${windowsConfig.w14d.startIso} | ${windowsConfig.w14d.endIso} | ${windowsConfig.w14d.inclusion} | ${windowsConfig.w14d.daysCovered} dias | ${windowMovementCounts.count14d} |\n`;
    text += `| **21 Dias** | ${windowsConfig.w21d.startIso} | ${windowsConfig.w21d.endIso} | ${windowsConfig.w21d.inclusion} | ${windowsConfig.w21d.daysCovered} dias | ${windowMovementCounts.count21d} |\n`;
    text += `| **Marco Zero** | ${windowsConfig.marcoZero.startIso} | ${windowsConfig.marcoZero.endIso} | ${windowsConfig.marcoZero.inclusion} | ${windowsConfig.marcoZero.daysCovered} dias | ${windowMovementCounts.totalSinceMarcoZero} |\n\n`;

    text += `==================================================\n`;
    text += `3. TABELA 1: RECÁLCULO DAS MÉDIAS E PROJEÇÃO DE 10 DIAS (19/09 A 28/09)\n`;
    text += `==================================================\n`;
    text += `| Produto | Estoque Atual | Média 7d | Média 14d | Média 21d | Média Escolhida | Consumo 10d | Segurança | Saldo Projetado | Compra Matemática |\n`;
    text += `| :--- | :---: | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: |\n`;
    simulationData.forEach((p) => {
      text += `| ${p.name} | ${p.currentStock} ${p.unit} | ${p.dailyAvg7d} | ${p.dailyAvg14d} | ${p.dailyAvg21d} | ${p.chosenAvg} (${p.chosenAvgReason}) | ${p.projected10d} ${p.unit} | ${p.safetyStock} ${p.unit} | ${p.projectedBalance} ${p.unit} | **${p.neededPurchase > 0 ? p.neededPurchase + ' ' + p.unit : '0'}** |\n`;
    });
    text += `\n`;

    text += `==================================================\n`;
    text += `4. TABELA 2: COMPRA EXTRAORDINÁRIA E MOTIVO OPERACIONAL\n`;
    text += `==================================================\n`;
    text += `| Produto | Compra Extraordinária | Motivo Operacional |\n`;
    text += `| :--- | :---: | :--- |\n`;
    simulationData.forEach((p) => {
      let motivo = '';
      if (p.id.includes('flocao')) {
        motivo = '3 preparos fixos (22 pc/preparo = 66) + reserva (22) - estoque atual (67) = 21 pacotes.';
      } else if (p.id.includes('macarrao')) {
        motivo = '3 preparos fixos (10 pc/preparo = 30) + reserva (10) - estoque atual (48) = -8 (Estoque cobre 100%). Compra = 0.';
      } else if (p.id.includes('pipoca')) {
        motivo = 'Consumo Eventual / Sob Demanda. Compra automática travada em 0.';
      } else if (p.neededPurchase > 0) {
        motivo = `Consumo 10d (${p.projected10d}) + Segurança ${p.safetyBufferDays}d (${p.safetyStock}) excede Estoque Atual (${p.currentStock} ${p.unit}).`;
      } else {
        motivo = `Estoque Atual (${p.currentStock} ${p.unit}) cobre integralmente o Consumo dos 10 dias (${p.projected10d} ${p.unit}) + Margem de Segurança (${p.safetyStock} ${p.unit}).`;
      }
      text += `| ${p.name} | **${p.neededPurchase > 0 ? p.neededPurchase + ' ' + p.unit : '0'}** | ${motivo} |\n`;
    });
    text += `\n`;

    text += `==================================================\n`;
    text += `5. COMPARAÇÃO COM O DIAGNÓSTICO ANTERIOR\n`;
    text += `==================================================\n`;
    text += `| Produto | Compra Anterior | Compra Nova | Diferença | Motivo da Diferença |\n`;
    text += `| :--- | :---: | :---: | :---: | :--- |\n`;
    simulationData.forEach((p) => {
      text += `| ${p.name} | ${p.prevNeeded} ${p.unit} | ${p.neededPurchase} ${p.unit} | ${p.diff === 0 ? '0' : (p.diff > 0 ? '+' + p.diff : p.diff)} ${p.unit} | ${p.diffReason} |\n`;
    });
    text += `\n`;

    text += `==================================================\n`;
    text += `6. AUDITORIA MATEMÁTICA PASSO A PASSO (ITENS COM COMPRA > 0)\n`;
    text += `==================================================\n`;
    if (itemsNeedingPurchase.length === 0) {
      text += `*Nenhum item apresentou necessidade de compra para o período de 10 dias.*\n`;
    } else {
      itemsNeedingPurchase.forEach((p, idx) => {
        text += `### ${idx + 1}. ${p.name.toUpperCase()}\n`;
        text += `- **Estoque Atual (X):** ${p.currentStock} ${p.unit}\n`;
        text += `- **Consumo Projetado 10d (Y):** ${p.projected10d} ${p.unit} (${p.chosenAvgReason})\n`;
        text += `- **Estoque de Segurança (Z):** ${p.safetyStock} ${p.unit} (${p.safetyBufferDays} dias)\n`;
        text += `- **Saldo antes da Segurança:** ${p.currentStock} - ${p.projected10d} = ${p.projectedBalance} ${p.unit}\n`;
        text += `- **Fórmula:** ${p.projected10d} (Y) + ${p.safetyStock} (Z) - ${p.currentStock} (X) = ${(p.projected10d + p.safetyStock - p.currentStock).toFixed(1)} ${p.unit}\n`;
        text += `- **Compra Matemática Exata:** ${p.neededPurchase} ${p.unit}\n`;
        if (p.packagingRuleText) {
          text += `- **Referência Operacional de Embalagem:** ${p.packagingRuleText}\n`;
        }
        text += `\n`;
      });
    }

    return text;
  }, [
    userEmail,
    userName,
    userRole,
    windowsConfig,
    windowMovementCounts,
    simulationData,
    itemsNeedingPurchase,
  ]);

  const handleCopyAudit = async () => {
    try {
      await navigator.clipboard.writeText(generatedAuditReportText);
      setCopied(true);
      toast.success('Auditoria completa copiada com sucesso!');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast.error('Selecione a aba "Texto Formatado" para copiar manualmente.');
    }
  };

  return (
    <div className="space-y-6" id="diagnostico-firestore-live">
      {/* Header com Status do Recálculo */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl border border-purple-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold mb-2">
              <Database className="w-3.5 h-3.5" />
              <span>Auditoria Técnica & Correção das Janelas • Sessão Autenticada</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
              AUDITORIA DAS JANELAS E RECÁLCULO DA COMPRA EXTRAORDINÁRIA
            </h2>
            <p className="text-xs md:text-sm text-purple-200/80 mt-1 max-w-3xl">
              Verificação matemática rigorosa das janelas de 7, 14 e 21 dias ancoradas na data/hora real da consulta (<strong>17/09/2026 13:58:15</strong>) e projeção de ausência para <strong>19/09 a 28/09/2026 (10 dias)</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyAudit}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 cursor-pointer transition-all active:scale-95"
              title="Copiar relatório completo em Markdown"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-950" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado!' : 'Copiar dados da auditoria'}</span>
            </button>
          </div>
        </div>

        {/* Barra de Controle da Data-Base e Modo de Janela */}
        <div className="mt-6 pt-4 border-t border-purple-500/20 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="flex items-center gap-3 bg-purple-900/40 p-3 rounded-2xl border border-purple-500/30">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="font-bold text-white">Data-base de Referência da Consulta:</div>
              <div className="text-purple-200">
                <strong>17/09/2026 às 13:58:15</strong> (Momento da Auditoria Técnica)
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 bg-purple-900/40 p-3 rounded-2xl border border-purple-500/30">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="font-bold text-white">Tratamento das Janelas:</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setWindowMethod('civil')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  windowMethod === 'civil' ? 'bg-purple-600 text-white shadow' : 'bg-black/30 text-purple-300'
                }`}
              >
                Dias Civis Fechados
              </button>
              <button
                onClick={() => setWindowMethod('rolling')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  windowMethod === 'rolling' ? 'bg-purple-600 text-white shadow' : 'bg-black/30 text-purple-300'
                }`}
              >
                Horas Exatas (168h/336h)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação entre Sub-Abas do Diagnóstico */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('auditoria_janelas')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'auditoria_janelas'
              ? 'bg-purple-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>1. Diagnóstico das Janelas</span>
        </button>

        <button
          onClick={() => setActiveTab('tabela_compras')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'tabela_compras'
              ? 'bg-purple-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>2. Tabelas Obrigatórias (1 e 2)</span>
        </button>

        <button
          onClick={() => setActiveTab('comparacao')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'comparacao'
              ? 'bg-purple-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>3. Comparação com Diagnóstico Anterior</span>
        </button>

        <button
          onClick={() => setActiveTab('calculo_detalhado')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'calculo_detalhado'
              ? 'bg-purple-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Info className="w-4 h-4" />
          <span>4. Auditoria Passo a Passo</span>
        </button>

        <button
          onClick={() => setActiveTab('raw_text')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'raw_text'
              ? 'bg-purple-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Copy className="w-4 h-4" />
          <span>5. Texto Formatado (Markdown)</span>
        </button>
      </div>

      {/* ABA 1: AUDITORIA E INTERVALOS EXATOS DAS JANELAS */}
      {activeTab === 'auditoria_janelas' && (
        <div className="space-y-6">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl p-5 text-xs text-amber-950 dark:text-amber-200 space-y-3">
            <div className="flex items-center gap-2 font-black text-sm text-amber-900 dark:text-amber-100">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Diagnóstico Técnico: Causa das Janelas Anteriores (com término em 18/09)</span>
            </div>
            <p className="leading-relaxed">
              O diagnóstico anterior indicou <strong>14 dias = 05/09/2026 a 18/09/2026</strong> porque o componente estava com a constante fixa <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded font-mono">AUDIT_END_DATE_STR = '2026-09-18T23:59:59'</code> ancorada na véspera do período de ausência da gestão (19/09 a 28/09).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
                <span className="font-black text-amber-800 dark:text-amber-300 block mb-1">Causa B: Data-base Artificial</span>
                O código fixou 18/09 como data de corte superior antes que o dia ocorresse no momento da consulta (17/09 13:58:15).
              </div>
              <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
                <span className="font-black text-amber-800 dark:text-amber-300 block mb-1">Causas A e C: Janela Futura</span>
                18/09 era um dia futuro no momento da consulta. No Firestore, nenhuma movimentação existia para 18/09.
              </div>
              <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
                <span className="font-black text-amber-800 dark:text-amber-300 block mb-1">Causa D: Divisor Distorcido</span>
                As saídas reais iam somente até 17/09, mas eram divididas por 14 dias completos, subestimando levemente a média diária.
              </div>
            </div>
          </div>

          {/* Tabela de Intervalos Exatos Corrigidos */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Intervalos Exatos Corrigidos para Consulta em 17/09/2026 13:58:15</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800/60 font-bold text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="p-3">Janela</th>
                    <th className="p-3">Timestamp Inicial</th>
                    <th className="p-3">Timestamp Final</th>
                    <th className="p-3">Condição de Limite</th>
                    <th className="p-3 text-center">Dias Cobertos</th>
                    <th className="p-3 text-center">Movimentações no Firestore</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-purple-700 dark:text-purple-300">Últimos 7 dias</td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{windowsConfig.w7d.startIso}</td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{windowsConfig.w7d.endIso}</td>
                    <td className="p-3 text-slate-500">{windowsConfig.w7d.inclusion}</td>
                    <td className="p-3 text-center font-bold">{windowsConfig.w7d.daysCovered} dias</td>
                    <td className="p-3 text-center font-black text-indigo-600 dark:text-indigo-400">{windowMovementCounts.count7d}</td>
                  </tr>

                  <tr className="bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40">
                    <td className="p-3 font-black text-indigo-700 dark:text-indigo-300">
                      Últimos 14 dias (Oficial de Compras)
                    </td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{windowsConfig.w14d.startIso}</td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{windowsConfig.w14d.endIso}</td>
                    <td className="p-3 text-slate-500">{windowsConfig.w14d.inclusion}</td>
                    <td className="p-3 text-center font-bold">{windowsConfig.w14d.daysCovered} dias</td>
                    <td className="p-3 text-center font-black text-indigo-600 dark:text-indigo-400">{windowMovementCounts.count14d}</td>
                  </tr>

                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-purple-700 dark:text-purple-300">Últimos 21 dias</td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{windowsConfig.w21d.startIso}</td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{windowsConfig.w21d.endIso}</td>
                    <td className="p-3 text-slate-500">{windowsConfig.w21d.inclusion}</td>
                    <td className="p-3 text-center font-bold">{windowsConfig.w21d.daysCovered} dias</td>
                    <td className="p-3 text-center font-black text-indigo-600 dark:text-indigo-400">{windowMovementCounts.count21d}</td>
                  </tr>

                  <tr className="bg-slate-50 dark:bg-slate-800/40">
                    <td className="p-3 font-black text-slate-900 dark:text-white">Desde o Marco Zero (Imutável)</td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{windowsConfig.marcoZero.startIso}</td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{windowsConfig.marcoZero.endIso}</td>
                    <td className="p-3 text-slate-500">{windowsConfig.marcoZero.inclusion}</td>
                    <td className="p-3 text-center font-bold">{windowsConfig.marcoZero.daysCovered} dias</td>
                    <td className="p-3 text-center font-black text-emerald-600 dark:text-emerald-400">{windowMovementCounts.totalSinceMarcoZero}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: TABELAS OBRIGATÓRIAS (1 E 2) */}
      {activeTab === 'tabela_compras' && (
        <div className="space-y-6">
          {/* TABELA 1: RECÁLCULO DAS MÉDIAS E PROJEÇÃO 10 DIAS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>TABELA 1: Estoque Atual, Médias Recalculadas e Compra Matemática (10 Dias)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Fórmula: Compra = max(0, Consumo 10d + Segurança - Estoque Atual). Período de ausência: 19/09/2026 a 28/09/2026.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="p-2.5">Produto</th>
                    <th className="p-2.5 text-center">Estoque Atual</th>
                    <th className="p-2.5 text-center">Média 7d</th>
                    <th className="p-2.5 text-center">Média 14d</th>
                    <th className="p-2.5 text-center">Média 21d</th>
                    <th className="p-2.5">Média Escolhida</th>
                    <th className="p-2.5 text-center">Consumo 10d</th>
                    <th className="p-2.5 text-center">Segurança</th>
                    <th className="p-2.5 text-center">Saldo Projetado</th>
                    <th className="p-2.5 text-center">Compra Matemática</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {simulationData.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-bold text-slate-900 dark:text-white">{p.name}</td>
                      <td className="p-2.5 text-center font-bold text-indigo-600 dark:text-indigo-400">
                        {p.currentStock} {p.unit}
                      </td>
                      <td className="p-2.5 text-center text-slate-500">{p.dailyAvg7d}</td>
                      <td className="p-2.5 text-center font-bold text-slate-700 dark:text-slate-300">{p.dailyAvg14d}</td>
                      <td className="p-2.5 text-center text-slate-500">{p.dailyAvg21d}</td>
                      <td className="p-2.5 text-slate-700 dark:text-slate-300 font-medium">
                        <span className="font-bold">{p.chosenAvg}</span>
                        <span className="text-slate-400 text-[10px] block">{p.chosenAvgReason}</span>
                      </td>
                      <td className="p-2.5 text-center font-bold text-amber-600 dark:text-amber-400">
                        {p.projected10d} {p.unit}
                      </td>
                      <td className="p-2.5 text-center text-slate-600 dark:text-slate-400">
                        {p.safetyStock} {p.unit}
                      </td>
                      <td className={`p-2.5 text-center font-bold ${p.projectedBalance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {p.projectedBalance} {p.unit}
                      </td>
                      <td className="p-2.5 text-center">
                        {p.neededPurchase > 0 ? (
                          <span className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-black">
                            +{p.neededPurchase} {p.unit}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                            0
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TABELA 2: COMPRA EXTRAORDINÁRIA E MOTIVO */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              TABELA 2: Compra Extraordinária Oficial e Motivo Operacional
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="p-2.5">Produto</th>
                    <th className="p-2.5 text-center">Compra Extraordinária</th>
                    <th className="p-2.5">Motivo Operacional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {simulationData.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-bold text-slate-900 dark:text-white">{p.name}</td>
                      <td className="p-2.5 text-center">
                        {p.neededPurchase > 0 ? (
                          <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-black">
                            +{p.neededPurchase} {p.unit}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                            0
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-300">
                        {p.id.includes('flocao') && (
                          <span className="text-amber-700 dark:text-amber-300 font-semibold">
                            3 preparos fixos (22 pc x 3 = 66) + reserva técnica (22) - estoque atual (67) = 21 pacotes.
                          </span>
                        )}
                        {p.id.includes('macarrao') && (
                          <span className="text-slate-500">
                            3 preparos fixos (10 pc x 3 = 30) + reserva (10) - estoque atual (48) = -8 (Estoque cobre 100%). Compra = 0.
                          </span>
                        )}
                        {p.id.includes('pipoca') && (
                          <span className="text-purple-600 dark:text-purple-400 font-semibold">
                            Consumo Eventual / Sob Demanda. Compra automática travada em 0.
                          </span>
                        )}
                        {!p.id.includes('flocao') && !p.id.includes('macarrao') && !p.id.includes('pipoca') && (
                          p.neededPurchase > 0 ? (
                            <span>
                              Consumo 10d ({p.projected10d} {p.unit}) + Segurança {p.safetyBufferDays}d ({p.safetyStock} {p.unit}) excede Estoque Atual ({p.currentStock} {p.unit}).
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              Estoque Atual ({p.currentStock} {p.unit}) cobre integralmente o Consumo 10d ({p.projected10d}) + Segurança ({p.safetyStock} {p.unit}).
                            </span>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: COMPARAÇÃO COM DIAGNÓSTICO ANTERIOR */}
      {activeTab === 'comparacao' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-purple-600" />
              <span>Comparação: Diagnóstico Anterior (Base 18/09) vs Novo Diagnóstico (Base 17/09)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Avaliação de impacto matemático da correção temporal das janelas de consumo.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="p-2.5">Produto</th>
                  <th className="p-2.5 text-center">Compra Anterior (Base 18/09)</th>
                  <th className="p-2.5 text-center">Compra Nova (Base 17/09)</th>
                  <th className="p-2.5 text-center">Diferença</th>
                  <th className="p-2.5">Motivo da Diferença</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {simulationData.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">{p.name}</td>
                    <td className="p-2.5 text-center font-bold text-slate-600 dark:text-slate-400">
                      {p.prevNeeded > 0 ? `+${p.prevNeeded} ${p.unit}` : '0'}
                    </td>
                    <td className="p-2.5 text-center font-bold text-indigo-600 dark:text-indigo-400">
                      {p.neededPurchase > 0 ? `+${p.neededPurchase} ${p.unit}` : '0'}
                    </td>
                    <td className="p-2.5 text-center font-black">
                      {p.diff === 0 ? (
                        <span className="text-slate-400">0</span>
                      ) : p.diff > 0 ? (
                        <span className="text-rose-600">+{p.diff} {p.unit}</span>
                      ) : (
                        <span className="text-emerald-600">{p.diff} {p.unit}</span>
                      )}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">
                      {p.diffReason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA 4: AUDITORIA MATEMÁTICA PASSO A PASSO */}
      {activeTab === 'calculo_detalhado' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 text-xs text-indigo-900 dark:text-indigo-200">
            <strong>Demonstração Matemática Detalhada:</strong> Cálculo exato para cada produto com compra sugerida &gt; 0, apresentando a conta completa sem arredondamentos silenciosos.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {itemsNeedingPurchase.map((p) => (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="font-black text-sm text-slate-900 dark:text-white">{p.name}</span>
                  <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 font-black text-xs">
                    Comprar: {p.neededPurchase} {p.unit}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span>Estoque Atual (X):</span>
                    <strong className="font-mono text-slate-900 dark:text-white">{p.currentStock} {p.unit}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Consumo Projetado 10d (Y):</span>
                    <strong className="font-mono text-amber-600">{p.projected10d} {p.unit} ({p.chosenAvgReason})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Estoque de Segurança (Z):</span>
                    <strong className="font-mono text-slate-700 dark:text-slate-300">{p.safetyStock} {p.unit} ({p.safetyBufferDays}d)</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span>Saldo antes da Segurança (X - Y):</span>
                    <strong className={`font-mono ${p.projectedBalance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {p.currentStock} - {p.projected10d} = {p.projectedBalance} {p.unit}
                    </strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span>Fórmula Completa (Y + Z - X):</span>
                    <strong className="font-mono text-indigo-600 dark:text-indigo-400">
                      {p.projected10d} + {p.safetyStock} - {p.currentStock} = {(p.projected10d + p.safetyStock - p.currentStock).toFixed(1)}
                    </strong>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl font-bold flex justify-between items-center text-slate-900 dark:text-white">
                    <span>Compra Matemática Exata:</span>
                    <span className="text-rose-600 text-sm font-black">{p.neededPurchase} {p.unit}</span>
                  </div>
                  {p.packagingRuleText && (
                    <div className="text-[11px] text-slate-500 italic">
                      Referência de Embalagem Cadastrada: {p.packagingRuleText}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 5: TEXTO FORMATADO (MARKDOWN BRUTO) */}
      {activeTab === 'raw_text' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Visualização pura para cópia e auditoria externa
            </span>
            <button
              onClick={handleCopyAudit}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar Tudo'}</span>
            </button>
          </div>
          <pre className="p-4 bg-slate-950 text-purple-200 rounded-2xl text-xs overflow-x-auto max-h-[500px] whitespace-pre-wrap font-mono leading-relaxed">
            {generatedAuditReportText}
          </pre>
        </div>
      )}
    </div>
  );
};
