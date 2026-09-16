import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const FIRESTORE_PROJECT_ID = process.env.FIRESTORE_PROJECT_ID || 'estoque-cristolandia';
const FIRESTORE_DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-estoque-256280f5-01ca-4416-ac4c-e04242a68ae4';

app.use(express.json({ limit: '10mb' }));

let genAI: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!genAI && process.env.GEMINI_API_KEY) {
    try {
      genAI = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
    } catch (err) {
      console.warn('Erro ao instanciar GoogleGenAI:', err);
    }
  }
  return genAI;
}

function bearerToken(req: express.Request): string | null {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

function firestoreValue(value: any): any {
  if (!value || typeof value !== 'object') return value;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('referenceValue' in value) return value.referenceValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(firestoreValue);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, firestoreValue(v)]));
  return value;
}

async function readFirestoreProduct(productId: string, token: string): Promise<any | null> {
  const encodedId = encodeURIComponent(productId);
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(FIRESTORE_PROJECT_ID)}/databases/${encodeURIComponent(FIRESTORE_DATABASE_ID)}/documents/products/${encodedId}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Firestore validation failed (${response.status})`);
  const document = await response.json();
  return Object.fromEntries(Object.entries(document.fields || {}).map(([k, v]) => [k, firestoreValue(v)]));
}

async function validateInventoryContext(snapshot: any, token: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!snapshot || !Array.isArray(snapshot.products)) {
    return { ok: false, reason: 'Contexto de estoque ausente ou inválido.' };
  }
  if (snapshot.products.length !== Number(snapshot.totalProducts || 0)) {
    return { ok: false, reason: 'Snapshot de estoque inconsistente: contagem de produtos divergente.' };
  }

  try {
    const current = await Promise.all(snapshot.products.map(async (item: any) => ({ item, firestore: await readFirestoreProduct(String(item.id || ''), token) })));
    for (const { item, firestore } of current) {
      if (!item.id || !firestore) return { ok: false, reason: `Produto ausente no Firestore: ${item.name || item.id || 'desconhecido'}.` };
      const clientStock = Number(item.currentStock);
      const serverStock = Number(firestore.currentStock);
      if (!Number.isFinite(clientStock) || !Number.isFinite(serverStock) || Math.abs(clientStock - serverStock) > 0.005) {
        return { ok: false, reason: `Saldo desatualizado para ${firestore.name || item.name || item.id}.` };
      }
      if (item.name && firestore.name && item.name !== firestore.name) {
        return { ok: false, reason: `Identidade do produto divergente para ${item.id}.` };
      }
    }
    return { ok: true };
  } catch (error: any) {
    console.warn('Falha ao validar contexto do estoque:', error?.message || error);
    return { ok: false, reason: 'Não foi possível validar o estoque atual no Firestore.' };
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/ai/ask', async (req, res) => {
  try {
    const { prompt, deterministicResult, user, inventorySnapshot } = req.body;

    if (!prompt || !deterministicResult) {
      return res.status(400).json({ error: 'Prompt e resultado determinístico são obrigatórios.' });
    }

    const token = bearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Autenticação obrigatória para validar o contexto do estoque.' });
    }

    const validation = await validateInventoryContext(inventorySnapshot, token);
    if (!validation.ok) {
      return res.status(409).json({
        error: 'STALE_INVENTORY_CONTEXT',
        message: validation.reason,
        retryable: true,
      });
    }

    const ai = getGeminiClient();
    if (!ai || !process.env.GEMINI_API_KEY) {
      return res.json({
        summary: deterministicResult.summary,
        detailedAnalysis: deterministicResult.detailedAnalysis,
        insights: deterministicResult.insights,
        suggestedFollowUps: deterministicResult.suggestedFollowUps,
        confidence: deterministicResult.confidence,
        confidenceReason: `${deterministicResult.confidenceReason} Contexto validado diretamente no Firestore.`,
        mode: 'deterministic_fallback',
      });
    }

    const systemInstruction = `Você é o Assistente Especialista de Inteligência Operacional do Almoxarifado da Cristolândia — Centro de Formação e Assistência Social (Luís Eduardo Magalhães / BA).
Sua missão é fornecer respostas precisas, claras, executivas e sem NENHUMA ambiguidade para a liderança, cozinha e gestão do estoque.

DIRETRIZES FUNDAMENTAIS:
1. Distingua sempre estoque atual de saídas históricas. Para saldo, use os dados determinísticos e o snapshot validado.
2. Nunca invente números, pessoas ou produtos. Mantenha os valores numéricos e cálculos exatamente como apurados deterministicamente.
3. Marco Zero Oficial de Estoque: 21/08/2026 às 17:30.
4. Flocão: preparos padronizados às quartas e domingos, conforme o motor determinístico vigente. Não substitua os cálculos recebidos por estimativas próprias.
5. O snapshot de estoque foi validado contra o Firestore antes desta chamada. Não alegue ter consultado o Firestore novamente nem invente dados fora do payload.
6. Retorne SEMPRE JSON válido estritamente com:
{
  "summary": "Resumo executivo claro em 1 ou 2 parágrafos",
  "detailedAnalysis": "Análise estruturada em Markdown",
  "insights": ["conclusões práticas"],
  "suggestedFollowUps": ["perguntas inteligentes de continuação"],
  "confidence": "high" | "medium" | "low",
  "confidenceReason": "Justificativa baseada nos dados auditados"
}`;

    const contextPayload = {
      userQuestion: prompt,
      requester: user?.displayName || 'Equipe Cristolândia',
      currentSystemDate: new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' }),
      deterministicCalculation: deterministicResult,
      inventorySnapshot,
      validation: 'Firestore product balances validated immediately before Gemini call',
    };

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: `Analise a pergunta do usuário e os dados auditados abaixo e retorne o JSON estruturado:\n\n${JSON.stringify(contextPayload, null, 2)}` }] }],
      config: { systemInstruction, responseMimeType: 'application/json', temperature: 0.1 },
    });

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de resposta do Gemini')), 15000));
    const response: any = await Promise.race([generatePromise, timeoutPromise]);
    const responseText = response.text || '';
    let parsedData: any = null;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      parsedData = JSON.parse(responseText.replace(/```json/gi, '').replace(/```/g, '').trim());
    }

    if (parsedData && parsedData.summary) {
      return res.json({ ...parsedData, mode: 'gemini_enhanced', contextValidated: true });
    }

    return res.json({
      summary: deterministicResult.summary,
      detailedAnalysis: deterministicResult.detailedAnalysis,
      insights: deterministicResult.insights,
      suggestedFollowUps: deterministicResult.suggestedFollowUps,
      confidence: deterministicResult.confidence,
      confidenceReason: `${deterministicResult.confidenceReason} Contexto validado diretamente no Firestore.`,
      mode: 'deterministic_fallback',
      contextValidated: true,
    });
  } catch (err: any) {
    console.error('Erro na chamada do Gemini:', err?.message || err);
    return res.json({
      summary: req.body?.deterministicResult?.summary || 'Não foi possível completar a consulta no momento.',
      detailedAnalysis: req.body?.deterministicResult?.detailedAnalysis || '',
      insights: req.body?.deterministicResult?.insights || [],
      suggestedFollowUps: req.body?.deterministicResult?.suggestedFollowUps || [],
      confidence: req.body?.deterministicResult?.confidence || 'medium',
      confidenceReason: 'Executado com segurança e exatidão via motor local de auditoria; a chamada de IA falhou.',
      mode: 'deterministic_fallback',
      contextValidated: true,
    });
  }
});

app.post('/api/ai/transcribe-audio', async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) return res.status(400).json({ error: 'Nenhum áudio recebido.' });
    const ai = getGeminiClient();
    if (!ai || !process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'Serviço de IA não configurado para transcrição de áudio. Por favor, digite a pergunta.' });
    const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [
        { inlineData: { mimeType: cleanMimeType, data: audioBase64 } },
        { text: 'Transcreva com fidelidade o áudio para português brasileiro. Retorne APENAS o texto transcrito. Se não houver fala compreensível, retorne VAZIO.' },
      ] }],
      config: { temperature: 0.1 },
    });
    let transcribedText = response.text ? response.text.trim() : '';
    transcribedText = transcribedText.replace(/^["\'“”«»]|["\'“”«»]$/g, '').trim();
    if (transcribedText === 'VAZIO' || !transcribedText) return res.json({ text: '', empty: true });
    return res.json({ text: transcribedText, empty: false });
  } catch (err: any) {
    console.error('Erro na transcrição de áudio:', err?.message || err);
    return res.status(500).json({ error: 'Não foi possível transcrever o áudio: ' + (err?.message || 'Erro no servidor') });
  }
});

async function startServer() {
  const publicPath = path.join(process.cwd(), 'public');
  app.use(express.static(publicPath));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true, host: '0.0.0.0', port: PORT }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => console.log(`Estoque Cristolândia rodando em http://0.0.0.0:${PORT}`));
}

startServer();
