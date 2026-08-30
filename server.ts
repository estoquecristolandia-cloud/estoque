import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

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

// Endpoint seguro de consulta do Assistente IA
app.post('/api/ai/ask', async (req, res) => {
  try {
    const { prompt, deterministicResult, user } = req.body;

    if (!prompt || !deterministicResult) {
      return res.status(400).json({ error: 'Prompt e resultado determinístico são obrigatórios.' });
    }

    const ai = getGeminiClient();

    if (!ai || !process.env.GEMINI_API_KEY) {
      // Retorna modo determinístico transparente
      return res.json({
        summary: deterministicResult.summary,
        detailedAnalysis: deterministicResult.detailedAnalysis,
        insights: deterministicResult.insights,
        suggestedFollowUps: deterministicResult.suggestedFollowUps,
        confidence: deterministicResult.confidence,
        confidenceReason: deterministicResult.confidenceReason,
        mode: 'deterministic_fallback',
      });
    }

    const systemInstruction = `Você é o Assistente Inteligente do Estoque Cristolândia — Centro de Formação e Assistência Social (Luís Eduardo Magalhães / BA).
Sua missão é explicar e resumir consultas de estoque, movimentações, consumo por missionário/setor e refeições servidas em linguagem natural com tom profissional, acolhedor e transparente.

REGRAS CRÍTICAS E OBRIGATÓRIAS:
1. NUNCA invente movimentações, números, pessoas, datas ou quantidades.
2. Trabalhe ESTRITAMENTE sobre os dados calculados determinísticamente fornecidos no contexto.
3. Se os dados forem 0 ou vazios, informe com total clareza que nenhuma movimentação foi encontrada no período.
4. Mantenha os valores numéricos exatamente iguais aos calculados pelo sistema.
5. Se for perguntado sobre consumo de uma pessoa (ex: Renê) ou setor (ex: Cozinha), cite claramente o período e o total auditado.
6. A contagem de refeições mede pessoas atendidas, não é baixa física de ingredientes.
7. O Marco Zero Oficial foi em 21/08/2026 às 17:30.

Formate sua resposta em formato JSON válido contendo:
{
  "summary": "Resumo claro e direto em 1 ou 2 parágrafos com números em destaque",
  "detailedAnalysis": "Explicação completa e estruturada em Markdown (pode incluir tabelas e tópicos)",
  "insights": ["Lista de 2 a 3 conclusões úteis sobre consumo, reposição ou tendências"],
  "suggestedFollowUps": ["2 perguntas relevantes que o usuário pode fazer a seguir"],
  "confidence": "high" | "medium" | "low",
  "confidenceReason": "Justificativa da confiança baseada na quantidade de dados auditados"
}`;

    const contextPayload = {
      userQuestion: prompt,
      requester: user?.displayName || 'Equipe Cristolândia',
      currentSystemDate: new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' }),
      deterministicCalculation: deterministicResult,
    };

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Analise a pergunta do usuário e os dados auditados abaixo e retorne o JSON estruturado:\n\n${JSON.stringify(contextPayload, null, 2)}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout de resposta do Gemini')), 8000)
    );

    const response: any = await Promise.race([generatePromise, timeoutPromise]);

    const responseText = response.text || '';
    let parsedData = null;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      // Se não vier em JSON puro, sanitizar
      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    }

    if (parsedData && parsedData.summary) {
      return res.json({
        ...parsedData,
        mode: 'gemini_enhanced',
      });
    }

    // Fallback se JSON estiver incompleto
    return res.json({
      summary: deterministicResult.summary,
      detailedAnalysis: deterministicResult.detailedAnalysis,
      insights: deterministicResult.insights,
      suggestedFollowUps: deterministicResult.suggestedFollowUps,
      confidence: deterministicResult.confidence,
      confidenceReason: deterministicResult.confidenceReason,
      mode: 'deterministic_fallback',
    });
  } catch (err: any) {
    console.error('Erro na chamada do Gemini:', err?.message || err);
    // Retornar fallback sem erro 500 para não quebrar a experiência do usuário
    return res.json({
      summary: req.body?.deterministicResult?.summary || 'Não foi possível completar a consulta.',
      detailedAnalysis: req.body?.deterministicResult?.detailedAnalysis || '',
      insights: req.body?.deterministicResult?.insights || [],
      suggestedFollowUps: req.body?.deterministicResult?.suggestedFollowUps || [],
      confidence: 'medium',
      confidenceReason: 'Executado com segurança via motor local de auditoria.',
      mode: 'deterministic_fallback',
    });
  }
});

// Endpoint seguro de transcrição de voz via áudio gravado (eliminando erros de rede do Web Speech)
app.post('/api/ai/transcribe-audio', async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Nenhum áudio recebido.' });
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
      model: 'gemini-3.7-flash',
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

async function startServer() {
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
