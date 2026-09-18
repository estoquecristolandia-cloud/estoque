import { AiAssistantResponse, AiQueryAuditLog, Product, StockMovement, DailyMealRecord, DailyKit, Missionary, InventoryAudit, InventorySessionSummary } from '../types';
import { executeDeterministicStockQuery } from './aiStockEngine';
import { auth } from '../firebase';

const AUDIT_LOGS_KEY = 'cristolandia_ai_query_logs';

export function getAiAuditLogs(): AiQueryAuditLog[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAiAuditLog(log: Omit<AiQueryAuditLog, 'id' | 'timestamp'>): void {
  try {
    const existing = getAiAuditLogs();
    const newEntry: AiQueryAuditLog = {
      ...log,
      id: `ai-log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    const updated = [newEntry, ...existing].slice(0, 100);
    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Não foi possível persistir log de auditoria da IA:', err);
  }
}

export async function askGeminiAiAssistant(
  prompt: string,
  products: Product[],
  movements: StockMovement[],
  meals: DailyMealRecord[],
  dailyKit: DailyKit,
  missionaries: Missionary[],
  inventoryAudits: InventoryAudit[] = [],
  inventorySessions: InventorySessionSummary[] = [],
  currentUser?: { displayName?: string; email?: string; role?: string } | null
): Promise<AiAssistantResponse> {
  // 1. Executar cálculo determinístico preliminar local
  const deterministicResult = executeDeterministicStockQuery(
    prompt,
    products,
    movements,
    meals,
    dailyKit,
    missionaries,
    inventoryAudits,
    inventorySessions
  );

  // 2. Chamar o backend seguro com autoridade no servidor
  try {
    // Obter Firebase ID Token da sessão atual
    let idToken: string | null = null;
    try {
      if (auth.currentUser) {
        idToken = await auth.currentUser.getIdToken();
      }
    } catch (tokenErr) {
      console.warn('Não foi possível obter o ID token do Firebase:', tokenErr);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const response = await fetch('/api/ai/ask', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt,
        idToken,
        user: {
          displayName: currentUser?.displayName || 'Usuário Cristolândia',
          email: currentUser?.email || 'anônimo',
          role: currentUser?.role || 'viewer',
        },
        inventorySnapshot: {
          totalProducts: products.length,
          products: products.map((p) => ({
            id: p.id,
            name: p.name,
            currentStock: p.currentStock,
            minStock: p.minStock,
            unit: p.unit,
            dailyAvgConsumption: p.dailyAvgConsumption,
            location: p.location,
            status: p.currentStock < p.minStock ? 'critico' : p.currentStock <= p.minStock * 1.3 ? 'alerta' : 'normal',
          })),
          recentMovementsCount: movements.length,
          recentMovementsSample: movements.slice(0, 50).map((m) => ({
            date: m.date,
            time: m.time,
            type: m.type,
            productName: m.productName,
            quantity: m.quantity,
            unit: m.unit,
            sector: m.sector,
            responsible: m.retrievedBy || m.receivedBy || m.responsible || m.deliveredBy,
          })),
          mealsCount: meals.length,
          meals: meals.slice(0, 30),
          dailyKit,
          missionaries,
          inventoryAudits: inventoryAudits.slice(0, 10),
          inventorySessions: inventorySessions.slice(0, 5),
        },
      }),
    });

    // Tratamento de conflito de contexto desatualizado (HTTP 409)
    if (response.status === 409) {
      const errData = await response.json().catch(() => ({}));
      const errorMsg = errData.error || 'O estoque exibido na sua tela difere do banco de dados oficial do Firestore.';
      
      saveAiAuditLog({
        userEmail: currentUser?.email,
        userName: currentUser?.displayName,
        query: prompt,
        intent: 'stale_context_rejected',
        summary: 'Consulta bloqueada: divergência de estoque entre navegador e Firestore (409 STALE_INVENTORY_CONTEXT).',
        movementsCount: movements.length,
      });

      return {
        ...deterministicResult,
        summary: `⚠️ **Estoque desatualizado no navegador.** O servidor identificou que os saldos de estoque na sua tela não correspondem ao banco de dados oficial no Firestore.\n\n**Motivo:** ${errorMsg}`,
        detailedAnalysis: `### Divergência de Contexto Detectada (HTTP 409 STALE_INVENTORY_CONTEXT)\n\n${errorMsg}\n\nPara garantir a integridade dos dados e evitar responder com base em informações defasadas, o assistente requer que os dados sejam atualizados. Por favor, recarregue a página ou aguarde a sincronização.`,
        confidence: 'low',
        confidenceReason: 'Contexto local divergente do Firestore oficial no backend.',
        staleContext: true,
        errorDetails: errData.details,
        fallbackMode: false,
      };
    }

    // Tratamento de falta de autenticação (HTTP 401)
    if (response.status === 401) {
      const errData = await response.json().catch(() => ({}));
      return {
        ...deterministicResult,
        summary: '🔒 **Autenticação obrigatória.** É necessário estar conectado para consultar o assistente de estoque com validação no servidor.',
        detailedAnalysis: errData.error || 'Sua sessão expirou ou o token de autenticação não foi reconhecido pelo Firebase.',
        confidence: 'low',
        confidenceReason: 'Autenticação necessária para acesso autoritativo.',
        fallbackMode: true,
      };
    }

    if (response.ok) {
      const data = await response.json();
      if (data && data.summary) {
        // Salvar log auditável
        saveAiAuditLog({
          userEmail: currentUser?.email,
          userName: currentUser?.displayName,
          query: prompt,
          intent: data.intent || deterministicResult.intent,
          summary: data.summary,
          movementsCount: deterministicResult.calculationBase.movementsCount,
        });

        return {
          ...deterministicResult,
          summary: data.summary,
          detailedAnalysis: data.detailedAnalysis || deterministicResult.detailedAnalysis,
          insights: data.insights && data.insights.length > 0 ? data.insights : deterministicResult.insights,
          suggestedFollowUps: data.suggestedFollowUps && data.suggestedFollowUps.length > 0 ? data.suggestedFollowUps : deterministicResult.suggestedFollowUps,
          confidence: data.confidence || deterministicResult.confidence,
          confidenceReason: data.confidenceReason || deterministicResult.confidenceReason,
          contextValidated: true,
          fallbackMode: false,
        };
      }
    }
  } catch (err) {
    console.info('Assistente: servidor inacessível, avaliando contingência local segura:', err);
  }

  // Fallback local somente quando o contexto local puder ser considerado válido
  const isLocalContextValid = products && products.length >= 14;
  if (!isLocalContextValid) {
    return {
      query: prompt,
      intent: 'context_unvalidated',
      summary: '⚠️ **Não foi possível validar o estoque atual.** O servidor autoritativo está indisponível e o contexto local de dados é insuficiente.',
      detailedAnalysis: 'Para garantir a precisão da auditoria da Cristolândia, consultas de IA exigem conexão com o servidor de inventário quando o catálogo local não está completo.',
      insights: ['Verifique sua conexão com a internet.', 'Aguarde o restabelecimento da conexão com o servidor.'],
      suggestedFollowUps: ['Tentar novamente'],
      confidence: 'low',
      confidenceReason: 'Servidor indisponível e dados locais incompletos.',
      fallbackMode: true,
      metrics: [],
      calculationBase: { periodAnalyzed: '', movementsCount: movements?.length || 0, totalQuantity: 0, filtersUsed: [] },
      timestamp: new Date().toISOString(),
    };
  }

  saveAiAuditLog({
    userEmail: currentUser?.email,
    userName: currentUser?.displayName,
    query: prompt,
    intent: deterministicResult.intent,
    summary: `${deterministicResult.summary} (Contingência local)`,
    movementsCount: deterministicResult.calculationBase.movementsCount,
  });

  return {
    ...deterministicResult,
    summary: `${deterministicResult.summary}\n\n*(Aviso: Modo de contingência local ativo. Servidor temporariamente inacessível).*`,
    fallbackMode: true,
  };
}
