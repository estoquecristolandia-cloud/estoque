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

  try {
    const idToken = await auth.currentUser?.getIdToken();
    const response = await fetch('/api/ai/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({
        prompt,
        deterministicResult,
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
            lastUpdated: p.lastUpdated || null,
            status: p.currentStock < p.minStock ? 'critico' : p.currentStock <= p.minStock * 1.3 ? 'alerta' : 'normal',
          })),
          recentMovementsCount: movements.length,
          recentMovementsSample: movements.slice(0, 30).map((m) => ({
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
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.summary) {
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
          fallbackMode: false,
        };
      }
    }
  } catch (err) {
    console.info('Assistente utilizando modo determinístico local (Gemini offline ou chave em configuração):', err);
  }

  saveAiAuditLog({
    userEmail: currentUser?.email,
    userName: currentUser?.displayName,
    query: prompt,
    intent: deterministicResult.intent,
    summary: deterministicResult.summary,
    movementsCount: deterministicResult.calculationBase.movementsCount,
  });

  return {
    ...deterministicResult,
    fallbackMode: true,
  };
}
