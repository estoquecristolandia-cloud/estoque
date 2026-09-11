import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

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

// Endpoint seguro de consulta do Assistente IA
app.post('/api/ai/ask', async (req, res) => {
  try {
    const { prompt, deterministicResult, user, inventorySnapshot } = req.body;

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

    const systemInstruction = `Você é o Assistente Especialista de Inteligência Operacional do Almoxarifado da Cristolândia — Centro de Formação e Assistência Social (Luís Eduardo Magalhães / BA).
Sua missão é fornecer respostas precisas, claras, executivas e sem NENHUMA ambiguidade para a liderança (Pr. Huberto, Missª. Débora), a equipe de cozinha (Chefe Marcos) e gestão do estoque (Marconi Castro).

DIRETRIZES FUNDAMENTAIS PARA ELIMINAR CONFUSÕES:
1. DISTINÇÃO CLARA ENTRE "ESTOQUE ATUAL" E "SAÍDAS HISTÓRICAS":
   - Se a pergunta do usuário for sobre SALDO, ESTOQUE ATUAL, "COMO ESTÁ O ESTOQUE", "O QUE TEMOS", "QUANTOS DIAS VAI DURAR" ou a situação dos produtos:
     NUNCA diga que o estoque é zero só porque não houve saídas no período! Consulte sempre o 'deterministicResult' e o 'inventorySnapshot' para informar o saldo físico real atualizado.
   - Só informe histórico de saídas/consumo quando o usuário perguntar explicitamente por "saídas", "consumo", "retiradas", "o que gastou" ou o que uma pessoa/setor retirou.
   - Quando perguntado sobre "entradas", "compras" ou "doações", foque nos insumos recebidos no almoxarifado.

2. FIDELIDADE MATEMÁTICA ABSOLUTA:
   - NUNCA invente números, pessoas ou produtos. Mantenha os valores numéricos, saldos e cálculos exatamente iguais aos apurados determinísticamente.
   - O almoxarifado monitora 14 produtos de sustentação alimentar.

3. PARÂMETROS OPERACIONAIS ALINHADOS DA UNIDADE:
   - Flocão de Milho (Cuscuz): Preparo fixo e padronizado às quartas-feiras e aos domingos, utilizando rigorosamente 20 pacotes por preparo (= 40 pacotes/semana ou 5,71 pacotes/dia).
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
      requester: user?.displayName || 'Equipe Cristolândia',
      currentSystemDate: new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' }),
      deterministicCalculation: deterministicResult,
      inventorySnapshot: inventorySnapshot || null,
    };

    const generatePromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
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
    // Retornar fallback determinístico sem erro 500 para garantir resposta consistente
    return res.json({
      summary: req.body?.deterministicResult?.summary || 'Não foi possível completar a consulta no momento.',
      detailedAnalysis: req.body?.deterministicResult?.detailedAnalysis || '',
      insights: req.body?.deterministicResult?.insights || [],
      suggestedFollowUps: req.body?.deterministicResult?.suggestedFollowUps || [],
      confidence: req.body?.deterministicResult?.confidence || 'medium',
      confidenceReason: 'Executado com segurança e exatidão via motor local de auditoria.',
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
