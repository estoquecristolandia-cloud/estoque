import { Product, StockMovement } from '../types';

export interface ExpiryItem {
  product: Product;
  daysRemaining: number;
  status: 'expired' | 'urgent_7' | 'warning_15' | 'attention_30' | 'safe';
  urgencyLabel: string;
}

export interface StockRunwayAnalysis {
  averageAutonomyDays: number;
  status: 'safe' | 'warning' | 'critical';
  statusLabel: string;
  criticalItems: Array<{
    name: string;
    currentStock: number;
    unit: string;
    estimatedDays: number;
    dailyConsumption: number;
  }>;
  summaryMessage: string;
}

/**
 * Analisa a validade de produtos (Regra PVPS)
 */
export function analyzeExpiryPVPS(products: Product[]): {
  expired: ExpiryItem[];
  urgent7: ExpiryItem[];
  warning15: ExpiryItem[];
  attention30: ExpiryItem[];
  totalWithExpiry: number;
} {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const expired: ExpiryItem[] = [];
  const urgent7: ExpiryItem[] = [];
  const warning15: ExpiryItem[] = [];
  const attention30: ExpiryItem[] = [];
  let totalWithExpiry = 0;

  products.forEach((product) => {
    if (!product.expirationDate) return;
    totalWithExpiry++;

    const [year, month, day] = product.expirationDate.split('-').map(Number);
    if (!year || !month || !day) return;

    const expDate = new Date(year, month - 1, day);
    const diffMs = expDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      expired.push({
        product,
        daysRemaining,
        status: 'expired',
        urgencyLabel: `Vencido há ${Math.abs(daysRemaining)} dias`,
      });
    } else if (daysRemaining <= 7) {
      urgent7.push({
        product,
        daysRemaining,
        status: 'urgent_7',
        urgencyLabel: `Vence em ${daysRemaining} dias (Prioridade Cozinha)`,
      });
    } else if (daysRemaining <= 15) {
      warning15.push({
        product,
        daysRemaining,
        status: 'warning_15',
        urgencyLabel: `Vence em ${daysRemaining} dias`,
      });
    } else if (daysRemaining <= 30) {
      attention30.push({
        product,
        daysRemaining,
        status: 'attention_30',
        urgencyLabel: `Vence em ${daysRemaining} dias`,
      });
    }
  });

  // Ordena os mais próximos do vencimento primeiro
  const sortByDays = (a: ExpiryItem, b: ExpiryItem) => a.daysRemaining - b.daysRemaining;

  return {
    expired: expired.sort(sortByDays),
    urgent7: urgent7.sort(sortByDays),
    warning15: warning15.sort(sortByDays),
    attention30: attention30.sort(sortByDays),
    totalWithExpiry,
  };
}

/**
 * Calcula a Autonomia do Estoque (Runway em dias) com base em saídas e acolhidos
 */
export function calculateStockRunway(
  products: Product[],
  movements: StockMovement[],
  averageBeneficiaries = 45
): StockRunwayAnalysis {
  // Itens vitais da cesta básica da Cristolândia
  const vitalKeywords = ['arroz', 'feijao', 'feijão', 'oleo', 'óleo', 'acucar', 'açúcar', 'leite', 'cafe', 'café', 'macarrao', 'macarrão', 'frango', 'carne', 'ovos', 'sabao', 'sabão', 'detergente', 'desinfetante'];

  const vitalProducts = products.filter((p) => {
    const norm = (p.name || '').toLowerCase();
    return vitalKeywords.some((kw) => norm.includes(kw));
  });

  const targetList = vitalProducts.length > 0 ? vitalProducts : products.slice(0, 10);

  // Calcula consumo diário estimado nos últimos 30 dias
  const itemAnalyses = targetList.map((product) => {
    // Busca saídas do produto
    const prodExits = movements.filter((m) => m.type === 'saida' && (m.productId === product.id || m.productName === product.name));
    const totalExitQty = prodExits.reduce((acc, m) => acc + (m.quantity || 0), 0);

    // Média diária (se não houver saídas registradas suficientes, estima 1/30 do estoque mínimo ou padrão)
    let dailyConsumption = totalExitQty > 0 ? totalExitQty / 30 : Math.max(0.5, (product.minStock || 10) / 15);
    dailyConsumption = Math.max(0.1, dailyConsumption);

    const estimatedDays = Math.floor(product.currentStock / dailyConsumption);

    return {
      name: product.name,
      currentStock: product.currentStock,
      unit: product.unit,
      estimatedDays: Math.max(0, estimatedDays),
      dailyConsumption: Number(dailyConsumption.toFixed(2)),
    };
  });

  // Ordena os com menor autonomia primeiro
  itemAnalyses.sort((a, b) => a.estimatedDays - b.estimatedDays);

  const criticalItems = itemAnalyses.slice(0, 5);
  const averageDays = itemAnalyses.length > 0
    ? Math.round(itemAnalyses.reduce((acc, i) => acc + i.estimatedDays, 0) / itemAnalyses.length)
    : 15;

  let status: 'safe' | 'warning' | 'critical' = 'safe';
  let statusLabel = 'Autonomia Confortável';

  if (averageDays < 7) {
    status = 'critical';
    statusLabel = 'Autonomia Crítica (< 7 dias)';
  } else if (averageDays < 15) {
    status = 'warning';
    statusLabel = 'Atenção (1 a 2 semanas)';
  }

  const summaryMessage = `Autonomia média estimada em ~${averageDays} dias para o atendimento contínuo da unidade.`;

  return {
    averageAutonomyDays: averageDays,
    status,
    statusLabel,
    criticalItems,
    summaryMessage,
  };
}
