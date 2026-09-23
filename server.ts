import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  verifyFirebaseToken,
  fetchAuthoritativeProductsFromFirestore,
  validateSnapshotAgainstAuthoritativeProducts,
  executeAuthoritativeCalculation,
} from './src/services/aiBackendContext';
import { Product } from './src/types';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Inicialização segura do Gemini
let genAI: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!genAI && process.env.GEMINI_API_KEY) {
    try {
      genAI = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch (err) {
      console.warn('Erro ao instanciar GoogleGenAI:', err);
    }
  }
  return genAI;
}

// Healthcheck endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint seguro de consulta do Assistente IA com autoridade no backend
app.post('/api/ai/ask', async (req, res) => {
  try {
    const { prompt, user, inventorySnapshot } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'A pergunta (prompt) é obrigatória.' });
    }

    // 1. Validação de autenticação Firebase (ID Token)
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const idToken = bearerToken || req.body?.idToken;

    if (!idToken) {
      return res.status(401).json({
        error: 'Token de autenticação ausente ou inválido.',
        code: 'AUTH_REQUIRED',
      });
    }

    const verifiedUser = await verifyFirebaseToken(idToken);
    if (!verifiedUser) {
      return res.status(401).json({
        error: 'Sessão expirada ou não autorizada pelo Firebase.',
        code: 'AUTH_REQUIRED',
      });
    }

    // 2. Validação básica de presença de snapshot
    if (!inventorySnapshot || !Array.isArray(inventorySnapshot.products) || inventorySnapshot.products.length === 0) {
      return res.status(400).json({
        error: 'Snapshot de inventário incompleto ou ausente.',
        code: 'INVALID_SNAPSHOT',
      });
    }

    // 3. Validação do contexto contra o Firestore oficial
    let authoritativeProducts: Product[] = [];
    try {
      authoritativeProducts = await fetchAuthoritativeProductsFromFirestore(idToken);
    } catch (fetchErr: any) {
      console.warn('Falha ao obter produtos oficiais no Firestore via token:', fetchErr?.message || fetchErr);
      return res.status(500).json({
        error: 'Não foi possível validar o inventário oficial no servidor Firestore.',
        code: 'SERVER_ERROR',
        details: fetchErr?.message,
      });
    }

    // 4. Validação integral do snapshot
    const validation = validateSnapshotAgainstAuthoritativeProducts(inventorySnapshot.products, authoritativeProducts);
    if (!validation.valid && validation.error) {
      if (validation.error.code === 'STALE_INVENTORY_CONTEXT') {
        return res.status(409).json({
          error: validation.error.message,
          code: 'STALE_INVENTORY_CONTEXT',
          details: validation.error.details,
        });
      }
      return res.status(400).json({
        error: validation.error.message,
        code: validation.error.code,
        details: validation.error.details,
      });
    }

    // 5. Execução do cálculo determinístico com dados autoritativos no backend
    const authoritativeResult = executeAuthoritativeCalculation(
      prompt,
      authoritativeProducts,
      inventorySnapshot.recentMovementsSample || inventorySnapshot.movements || [],
      inventorySnapshot.meals || [],
      inventorySnapshot.dailyKit,
      inventorySnapshot.missionaries || [],
      inventorySnapshot.inventoryAudits || [],
      inventorySnapshot.inventorySessions || []
    );

    const ai = getGeminiClient();

    if (!ai || !process.env.GEMINI_API_KEY) {
      // Retorna resultado autoritativo validado sem Gemini
      return res.json({
        summary: authoritativeResult.summary,
        detailedAnalysis: authoritativeResult.detailedAnalysis,
        insights: authoritativeResult.insights,
        suggestedFollowUps: authoritativeResult.suggestedFollowUps,
        confidence: authoritativeResult.confidence,
        confidenceReason: authoritativeResult.confidenceReason,
        mode: 'deterministic_validated',
        contextValidated: true,
      });
    }

    const systemInstruction = `Você é o Assistente Especialista de Inteligência Operacional do Almoxarifado da Cristolândia — Centro de Formação e Assistência Social (Luís Eduardo Magalhães / BA).
Sua missão é fornecer respostas precisas, claras, executivas e sem NENHUMA ambiguidade para a liderança (Pr. Huberto, Missª. Débora), a equipe de cozinha (Chefe Marcos) e gestão do estoque (Marconi Castro).

DIRETRIZES FUNDAMENTAIS PARA ELIMINAR CONFUSÕES:
1. DISTINÇÃO CLARA ENTRE "ESTOQUE ATUAL" E "SAÍDAS HISTÓRICAS":
   - Se a pergunta do usuário for sobre SALDO, ESTOQUE ATUAL, "COMO ESTÁ O ESTOQUE", "O QUE TEMOS", "QUANTOS DIAS VAI DURAR" ou a situação dos produtos:
     NUNCA diga que o estoque é zero só porque não houve saídas no período! Consulte sempre o 'deterministicResult' e o 'authoritativeSnapshot' para informar o saldo físico real atualizado.
   - Só informe histórico de saídas/consumo quando o usuário perguntar explicitamente por "saídas", "consumo", "retiradas", "o que gastou" ou o que uma pessoa/setor retirou.
   - Quando perguntado sobre "entradas", "compras" ou "doações", foque nos insumos recebidos no almoxarifado.

2. FIDELIDADE MATEMÁTICA ABSOLUTA:
   - NUNCA invente números, pessoas ou produtos. Mantenha os valores numéricos, saldos e cálculos exatamente iguais aos apurados determinísticamente.
   - O almoxarifado monitora 14 produtos de sustentação alimentar.

3. PARÂMETROS OPERACIONAIS ALINHADOS DA UNIDADE:
   - Flocão de Milho (Cuscuz): Preparo fixo e padronizado às quartas-feiras e aos domingos, utilizando rigorosamente 22 pacotes por preparo (= 44 pacotes/semana). Não consome nos outros dias da semana.
   - Milho Pipoca: Consumo eventual / baseado em eventos comemorativos. Não deve ser descontado automaticamente do kit diário.
   - Padaria: Produção diária conduzida por Fernando Pates (consome Farinha de Trigo, Margarina e Sal Refinado).
   - Cozinha Geral: Liderada pelo Chefe Marcos (Marcus Vinicius), responsável pelas 4 refeições diárias dos acolhidos.
   - Itens de Demanda Multissetorial: Leite Integral, Margarina/Manteiga, Óleo de Soja e Sal Refinado são compartilhados entre Cozinha, Padaria e Casas Missionárias.
   - Refeições Servidas: Medem o atendimento social e pratos servidos a pessoas; NÃO representam baixa de ingredientes quilo a quilo.
   - Marco Zero Oficial de Estoque: 21/08/2026 às 17:30.

4. FORMATO DE SAÍDA OBRIGATÓRIO (JSON):
Retorne SEMPRE um JSON válido estritamente com esta estrutura:
{
  "summary": "Resumo executivo claro, afirmativo e objetivo em 1 ou 2 parágrafos, destacando números essenciais em negrito",
  "detailedAnalysis": "Análise estruturada em Markdown de alto nível (com subtítulos '###', tabelas alinhadas e marcadores claros)",
  "insights": ["2 a 3 conclusões práticas ou recomendações operacionais diretas"],
  "suggestedFollowUps": ["2 perguntas inteligentes de continuação"],
  "confidence": "high" | "medium" | "low",
  "confidenceReason": "Justificativa direta baseada na base de dados auditada"
}`;

    const contextPayload = {
      userQuestion: prompt,
      requester: user?.displayName || verifiedUser.email || 'Equipe Cristolândia',
      currentSystemDate: new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' }),
      deterministicCalculation: authoritativeResult,
      authoritativeProductsCount: authoritativeProducts.length,
      contextValidated: true,
    };

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Analise a pergunta do usuário e os dados autoritativos validados abaixo e retorne o JSON estruturado:\n\n${JSON.stringify(contextPayload, null, 2)}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout de resposta do Gemini')), 15000)
    );

    const response: any = await Promise.race([generatePromise, timeoutPromise]);

    const responseText = response.text || '';
    let parsedData = null;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      // Se não vier em JSON puro, sanitizar blocos markdown
      const cleanJson = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      parsedData = JSON.parse(cleanJson);
    }

    if (parsedData && parsedData.summary) {
      return res.json({
        ...parsedData,
        mode: 'gemini_enhanced',
        contextValidated: true,
      });
    }

    // Fallback com cálculo autoritativo
    return res.json({
      summary: authoritativeResult.summary,
      detailedAnalysis: authoritativeResult.detailedAnalysis,
      insights: authoritativeResult.insights,
      suggestedFollowUps: authoritativeResult.suggestedFollowUps,
      confidence: authoritativeResult.confidence,
      confidenceReason: authoritativeResult.confidenceReason,
      mode: 'deterministic_fallback',
      contextValidated: true,
    });
  } catch (err: any) {
    console.error('Erro no processamento da IA no servidor:', err?.message || err);
    return res.status(500).json({
      error: 'Erro interno ao processar a consulta de IA.',
      code: 'SERVER_ERROR',
      message: err?.message,
    });
  }
});

// Rate Limiter em memória para transcrição de áudio (10 requisições / minuto por usuário ou IP)
const audioRateLimitMap = new Map<string, { count: number; resetTime: number }>();
const AUDIO_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const AUDIO_RATE_LIMIT_MAX_REQUESTS = 10;
const AUDIO_MAX_BASE64_LENGTH = 2.5 * 1024 * 1024; // ~2.5MB base64 (~1.8MB áudio binário)
const AUDIO_MAX_DURATION_SECONDS = 60; // 60 segundos no máximo

// Endpoint seguro de transcrição de voz via áudio gravado (com autenticação, limite de taxa e tamanho)
app.post('/api/ai/transcribe-audio', async (req, res) => {
  try {
    // 1. Validação de Autenticação Firebase (ID Token)
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const idToken = bearerToken || req.body?.idToken;

    if (!idToken) {
      return res.status(401).json({
        error: 'Autenticação necessária para transcrição de áudio.',
        code: 'AUTH_REQUIRED',
      });
    }

    const verifiedUser = await verifyFirebaseToken(idToken);
    if (!verifiedUser) {
      return res.status(401).json({
        error: 'Sessão inválida ou expirada. Faça login novamente.',
        code: 'INVALID_TOKEN',
      });
    }

    // 2. Proteção de Rate Limiting (por UID ou IP)
    const clientKey = verifiedUser.uid || req.ip || 'anonymous';
    const now = Date.now();
    const rateData = audioRateLimitMap.get(clientKey);

    if (rateData && now < rateData.resetTime) {
      if (rateData.count >= AUDIO_RATE_LIMIT_MAX_REQUESTS) {
        return res.status(429).json({
          error: 'Limite de transcrições de áudio atingido (máx. 10 por minuto). Aguarde alguns segundos.',
          code: 'RATE_LIMIT_EXCEEDED',
        });
      }
      rateData.count += 1;
    } else {
      audioRateLimitMap.set(clientKey, {
        count: 1,
        resetTime: now + AUDIO_RATE_LIMIT_WINDOW_MS,
      });
    }

    // 3. Validação de Payload, Tamanho e Duração
    const { audioBase64, mimeType, durationSeconds } = req.body;
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'Nenhum dado de áudio válido recebido.' });
    }

    if (audioBase64.length > AUDIO_MAX_BASE64_LENGTH) {
      return res.status(400).json({
        error: `O áudio excede o limite máximo permitido de ${Math.round(AUDIO_MAX_BASE64_LENGTH / (1024 * 1024))}MB.`,
        code: 'AUDIO_SIZE_LIMIT_EXCEEDED',
      });
    }

    if (typeof durationSeconds === 'number' && durationSeconds > AUDIO_MAX_DURATION_SECONDS) {
      return res.status(400).json({
        error: `O áudio ultrapassa a duração máxima permitida de ${AUDIO_MAX_DURATION_SECONDS} segundos.`,
        code: 'AUDIO_DURATION_LIMIT_EXCEEDED',
      });
    }

    const ai = getGeminiClient();
    if (!ai || !process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: 'Serviço de IA não configurado para transcrição de áudio. Por favor, digite a pergunta.',
      });
    }

    // Normaliza mimeType (ex: "audio/webm;codecs=opus" -> "audio/webm")
    const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim();

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: cleanMimeType,
                data: audioBase64,
              },
            },
            {
              text: `Você é o transcritor de áudio do sistema de estoque da Cristolândia (Luís Eduardo Magalhães / BA).
Transcreva com total fidelidade o áudio gravado para texto em português brasileiro (pt-BR).
O áudio é uma pergunta ou comando sobre estoque, produtos (arroz, feijão, leite, açúcar, carne, etc.), responsáveis (missionário Renê, equipe), setores (Cozinha, Refeitório, Bazar) ou refeições.

REGRAS:
1. Retorne APENAS o texto transcrito, sem aspas, sem formatação markdown e sem comentários.
2. Se o áudio for apenas silêncio ou ruído sem fala compreensível, retorne exatamente: VAZIO`,
            },
          ],
        },
      ],
      config: {
        temperature: 0.1,
      },
    });

    let transcribedText = response.text ? response.text.trim() : '';
    transcribedText = transcribedText.replace(/^["'“”«»]|["'“”«»]$/g, '').trim();

    if (transcribedText === 'VAZIO' || !transcribedText) {
      return res.json({ text: '', empty: true });
    }

    return res.json({ text: transcribedText, empty: false });
  } catch (err: any) {
    console.error('Erro na transcrição de áudio:', err?.message || err);
    return res.status(500).json({
      error: 'Não foi possível transcrever o áudio: ' + (err?.message || 'Erro no servidor'),
    });
  }
});

// Endpoint com Gemini Vision para leitura inteligente de Nota Fiscal / Recibo de Doações por Foto
app.post('/api/ai/parse-receipt', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const idToken = bearerToken || req.body?.idToken;

    if (!idToken) {
      return res.status(401).json({ error: 'Autenticação necessária para leitura de notas fiscais.' });
    }

    const verifiedUser = await verifyFirebaseToken(idToken);
    if (!verifiedUser) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }

    const { imageBase64, mimeType } = req.body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'Nenhuma imagem recebida.' });
    }

    const ai = getGeminiClient();
    if (!ai || !process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'Serviço de IA não configurado para leitura visual.' });
    }

    const cleanMime = (mimeType || 'image/jpeg').split(';')[0].trim();

    const prompt = `Você é o leitor inteligente de notas fiscais, cupons e termos de doação do SIG-Cristolândia (Centro de Formação LEM/BA).
Analise a imagem da nota fiscal, cupom fiscal, recibo ou lista de doação fornecida e extraia rigorosamente os itens de alimentação ou limpeza/DML.

Retorne EXCLUSIVAMENTE um objeto JSON válido (sem tags markdown adicionais ou texto explicativo) com o formato:
{
  "donorOrStore": "Nome da empresa, mercado ou doador identificado (ou 'Não identificado')",
  "date": "YYYY-MM-DD",
  "type": "compra ou doacao",
  "items": [
    {
      "name": "Nome claro do produto em português (ex: Arroz Branco 5kg)",
      "quantity": 10.0,
      "unit": "kg ou un ou pct ou fardo ou cx ou litro",
      "estimatedUnitPrice": 0.0
    }
  ],
  "totalAmount": 0.0,
  "confidenceNotes": "Observações sobre a legibilidade ou itens identificados"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: imageBase64,
              },
            },
            { text: prompt },
          ],
        },
      ],
      config: {
        temperature: 0.1,
      },
    });

    let rawText = response.text ? response.text.trim() : '{}';
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText);
    } catch {
      parsedResult = {
        donorOrStore: 'Leitura manual necessária',
        items: [],
        confidenceNotes: 'A IA identificou a imagem mas sugeriu conferência dos itens.',
      };
    }

    return res.json({
      success: true,
      data: parsedResult,
    });
  } catch (err: any) {
    console.error('Erro na extração de nota fiscal com Gemini Vision:', err);
    return res.status(500).json({
      error: 'Falha ao processar imagem da nota fiscal.',
      details: err?.message || String(err),
    });
  }
});

async function startServer() {
  // Servir assets estáticos da pasta public (manifest.json, sw.js, ícones PWA)
  const publicPath = path.join(process.cwd(), 'public');
  app.use(express.static(publicPath));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Estoque Cristolândia rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer();
