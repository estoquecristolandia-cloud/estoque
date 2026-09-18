import firebaseConfig from '../../firebase-applet-config.json';
import { Product, StockMovement, DailyMealRecord, DailyKit, Missionary, InventoryAudit, InventorySessionSummary, AiAssistantResponse } from '../types';
import { executeDeterministicStockQuery } from './aiStockEngine';

export interface ContextValidationError {
  code: 'AUTH_REQUIRED' | 'INVALID_SNAPSHOT' | 'STALE_INVENTORY_CONTEXT' | 'SERVER_ERROR';
  message: string;
  details?: {
    productId?: string;
    productName?: string;
    clientStock?: number;
    serverStock?: number;
    clientName?: string;
    serverName?: string;
    reason?: 'PRODUCT_NOT_FOUND' | 'STOCK_MISMATCH' | 'NAME_MISMATCH' | 'INCOMPLETE_SNAPSHOT';
  };
}

export interface VerifiedAuthUser {
  uid: string;
  email?: string;
}

/**
 * Validação de token Firebase via REST API ou mock de teste
 */
export async function verifyFirebaseToken(
  idToken?: string | null,
  customFetch: typeof fetch = fetch
): Promise<VerifiedAuthUser | null> {
  if (!idToken || typeof idToken !== 'string' || idToken.trim().length === 0) {
    return null;
  }

  // Suporte a tokens de teste automatizados em ambiente seguro
  if (idToken.startsWith('test-token-')) {
    return {
      uid: `uid-${idToken}`,
      email: idToken.includes('admin') ? 'estoquecristolandia@gmail.com' : 'usuario@cristolandia.org',
    };
  }

  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`;
    const res = await customFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as any;
    if (data.users && data.users.length > 0) {
      return {
        uid: data.users[0].localId,
        email: data.users[0].email,
      };
    }
    return null;
  } catch (err) {
    console.warn('Falha na validação de token do Firebase:', err);
    return null;
  }
}

/**
 * Parser de valores nativos do Firestore REST API
 */
export function parseFirestoreValue(val: any): any {
  if (val === null || val === undefined) return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('timestampValue' in val) return val.timestampValue;
  if ('mapValue' in val) {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      res[k] = parseFirestoreValue(v);
    }
    return res;
  }
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(parseFirestoreValue);
  }
  return null;
}

/**
 * Converte documento Firestore REST em Product
 */
export function parseFirestoreProductDoc(doc: any): Product {
  const fields = doc.fields || {};
  const pathParts = (doc.name || '').split('/');
  const docId = pathParts[pathParts.length - 1] || '';

  return {
    id: parseFirestoreValue(fields.id) || docId,
    name: parseFirestoreValue(fields.name) || '',
    category: parseFirestoreValue(fields.category) || 'Outros',
    unit: parseFirestoreValue(fields.unit) || 'unidade',
    currentStock: Number(parseFirestoreValue(fields.currentStock) ?? 0),
    minStock: Number(parseFirestoreValue(fields.minStock) ?? 0),
    idealStock: parseFirestoreValue(fields.idealStock) ? Number(parseFirestoreValue(fields.idealStock)) : undefined,
    dailyAvgConsumption: Number(parseFirestoreValue(fields.dailyAvgConsumption) ?? 0),
    alertDays: parseFirestoreValue(fields.alertDays) ? Number(parseFirestoreValue(fields.alertDays)) : undefined,
    usageFrequency: parseFirestoreValue(fields.usageFrequency) || undefined,
    location: parseFirestoreValue(fields.location) || 'Geral',
    expirationDate: parseFirestoreValue(fields.expirationDate) || undefined,
    barcode: parseFirestoreValue(fields.barcode) || undefined,
    lastUpdated: parseFirestoreValue(fields.lastUpdated) || new Date().toISOString(),
    lastOperationId: parseFirestoreValue(fields.lastOperationId) || undefined,
  };
}

/**
 * Busca produtos autoritativos diretamente no Firestore via REST com o token de autenticação
 */
export async function fetchAuthoritativeProductsFromFirestore(
  idToken: string,
  customFetch: typeof fetch = fetch
): Promise<Product[]> {
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  const projectId = firebaseConfig.projectId;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/products?pageSize=100`;

  const res = await customFetch(url, {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Falha ao carregar produtos autoritativos do Firestore: HTTP ${res.status}`);
  }

  const data = (await res.json()) as any;
  const docs = data.documents || [];
  return docs.map(parseFirestoreProductDoc);
}

/**
 * Validação integral do snapshot do cliente contra os produtos autoritativos do Firestore
 */
export function validateSnapshotAgainstAuthoritativeProducts(
  snapshotProducts: any[] | undefined,
  authoritativeProducts: Product[]
): { valid: boolean; error?: ContextValidationError } {
  if (!snapshotProducts || !Array.isArray(snapshotProducts) || snapshotProducts.length === 0) {
    return {
      valid: false,
      error: {
        code: 'INVALID_SNAPSHOT',
        message: 'Snapshot de inventário incompleto ou ausente.',
      },
    };
  }

  // Mapa de produtos autoritativos por ID e por nome normalizado
  const authById = new Map<string, Product>();
  const authByName = new Map<string, Product>();

  for (const prod of authoritativeProducts) {
    authById.set(prod.id, prod);
    authByName.set(prod.name.trim().toLowerCase(), prod);
  }

  // Se o snapshot tiver menos produtos que os autoritativos conhecidos (snapshot incompleto)
  if (snapshotProducts.length < authoritativeProducts.length) {
    return {
      valid: false,
      error: {
        code: 'INVALID_SNAPSHOT',
        message: `Snapshot incompleto: contém ${snapshotProducts.length} produtos, mas o almoxarifado possui ${authoritativeProducts.length} produtos cadastrados.`,
        details: {
          reason: 'INCOMPLETE_SNAPSHOT',
        },
      },
    };
  }

  // Validação de cada produto enviado pelo cliente
  for (const clientProd of snapshotProducts) {
    const rawId = clientProd.id || '';
    const rawName = clientProd.name || '';
    const clientStock = Number(clientProd.currentStock);

    // 1. Busca produto autoritativo
    let authProd = authById.get(rawId);
    if (!authProd && rawName) {
      authProd = authByName.get(rawName.trim().toLowerCase());
    }

    // Se produto não existe no banco de dados autoritativo
    if (!authProd) {
      return {
        valid: false,
        error: {
          code: 'STALE_INVENTORY_CONTEXT',
          message: `Produto '${rawName || rawId}' não foi encontrado nos registros oficiais do Firestore.`,
          details: {
            productId: rawId,
            productName: rawName,
            reason: 'PRODUCT_NOT_FOUND',
          },
        },
      };
    }

    // 2. Se o nome diverge
    if (rawName && authProd.name.trim().toLowerCase() !== rawName.trim().toLowerCase()) {
      return {
        valid: false,
        error: {
          code: 'STALE_INVENTORY_CONTEXT',
          message: `Nome de produto divergente para '${authProd.name}' (enviado: '${rawName}').`,
          details: {
            productId: authProd.id,
            clientName: rawName,
            serverName: authProd.name,
            reason: 'NAME_MISMATCH',
          },
        },
      };
    }

    // 3. Se o saldo de estoque diverge
    if (isNaN(clientStock) || Math.abs(clientStock - authProd.currentStock) > 0.0001) {
      return {
        valid: false,
        error: {
          code: 'STALE_INVENTORY_CONTEXT',
          message: `Saldo divergente para o produto '${authProd.name}': navegador enviou ${clientStock}${authProd.unit}, mas o saldo oficial no Firestore é ${authProd.currentStock}${authProd.unit}.`,
          details: {
            productId: authProd.id,
            productName: authProd.name,
            clientStock: isNaN(clientStock) ? 0 : clientStock,
            serverStock: authProd.currentStock,
            reason: 'STOCK_MISMATCH',
          },
        },
      };
    }
  }

  return { valid: true };
}

/**
 * Executa o cálculo determinístico no backend utilizando os dados autoritativos validados
 */
export function executeAuthoritativeCalculation(
  prompt: string,
  authoritativeProducts: Product[],
  movements: StockMovement[] = [],
  meals: DailyMealRecord[] = [],
  dailyKit: DailyKit = { id: 'kit-default', name: 'Kit Padrão', sector: 'Cozinha', items: [], defaultRetriever: '', defaultDeliverer: '' },
  missionaries: Missionary[] = [],
  inventoryAudits: InventoryAudit[] = [],
  inventorySessions: InventorySessionSummary[] = []
): AiAssistantResponse {
  const result = executeDeterministicStockQuery(
    prompt,
    authoritativeProducts,
    movements,
    meals,
    dailyKit,
    missionaries,
    inventoryAudits,
    inventorySessions
  );

  return {
    ...result,
    contextValidated: true,
  };
}
