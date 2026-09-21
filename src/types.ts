export type Department = 'alimentacao' | 'dml' | 'farmacia';

export type Category = 
  | 'Grãos e Cereais' 
  | 'Óleos e Condimentos' 
  | 'Matinais e Bebidas' 
  | 'Proteínas e Carnes' 
  | 'Laticínios e Massas' 
  | 'Hortifrúti e Temperos'
  | 'Higiene Pessoal (Acolhidos)'
  | 'Limpeza Predial & Conservação'
  | 'Descartáveis e Acessórios'
  | 'Higiene e Limpeza' 
  | 'Outros';
export type Unit = 'kg' | 'litro' | 'pacote' | 'caixa' | 'unidade' | 'lata' | 'g' | 'balde' | 'frasco' | 'galão' | 'rolo' | 'fardo' | 'barra';
export type Sector = 
  | 'Cozinha' 
  | 'Padaria' 
  | 'Cantina' 
  | 'Casa Missionária Masculina' 
  | 'Casa Missionária Feminina' 
  | 'Administração' 
  | 'Casa da Coordenação (Huberto & Débora)' 
  | 'Casa Lana & Joabe (Cesta Básica)' 
  | 'Casa Marcos & Fabíola (Cesta Básica)' 
  | 'Casa Tainã (Cesta Básica)' 
  | 'Dormitórios / Alojamentos'
  | 'Baterias de Banheiros'
  | 'Lavanderia'
  | 'Kit Pessoal Acolhidos'
  | 'Eventos' 
  | 'Outros';
export type EntryType = 'Compra' | 'Doação' | 'Ajuste de Estoque' | 'Contagem Inicial';
export type KitchenShift = 'Café / Manhã' | 'Almoço' | 'Jantar / Tarde' | 'Ceia / Lanche';

export interface Missionary { id: string; name: string; role: string; sector: Sector; shift?: KitchenShift; }

export interface Product {
  id: string; name: string; category: Category; unit: Unit; currentStock: number; minStock: number;
  department?: Department;
  idealStock?: number;
  dailyAvgConsumption: number; alertDays?: number; usageFrequency?: string; location: string;
  expirationDate?: string; barcode?: string; lastUpdated: string; lastOperationId?: string; updatedAt?: any;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  unit: Unit;
  department?: Department;
  type: 'entrada' | 'saida' | 'ajuste';
  quantity: number;
  date: string;
  time?: string;
  entryType?: EntryType;
  supplierOrDonor?: string;
  receivedBy?: string;
  sector?: Sector;
  kitchenShift?: string;
  retrievedBy?: string;
  deliveredBy?: string;
  notes?: string;
  createdAt: string;
  operationId?: string;
  clientRequestId?: string;
  responsible?: string;
  reason?: string;
  previousStock?: number;
  physicalStock?: number;
  difference?: number;
  userUid?: string;
  userEmail?: string;
  compensatesMovementId?: string;
  replacementForMovementId?: string;
  movementRole?: 'original' | 'compensation' | 'replacement';
  isCompensated?: boolean;
  compensatedByMovementId?: string;
}

export interface KitItem { productId: string; productName: string; quantity: number; unit: Unit; }
export interface DailyKit { id: string; name: string; sector: Sector; items: KitItem[]; defaultRetriever: string; defaultDeliverer: string; }
export interface AuditReport { productId: string; productName: string; initialStock: number; totalEntries: number; totalExits: number; calculatedBalance: number; currentStock: number; isBalanced: boolean; discrepancy: number; }
export interface DailyMealRecord { id: string; date: string; breakfast: number; lunch: number; afternoonSnack: number; dinner: number; totalMeals: number; responsible: string; notes?: string; createdAt: string; updatedAt?: string; }

export interface InventoryAudit {
  id: string;
  productId: string;
  productName: string;
  unit: Unit;
  previousStock: number;
  physicalStock: number;
  difference: number;
  reason: string;
  responsible: string;
  date: string;
  time: string;
  timestamp?: any;
  createdAt: string;
  userUid?: string;
  userEmail?: string;
  notes?: string;
}

export interface InventorySessionSummary {
  id: string;
  date: string;
  time: string;
  responsible: string;
  totalProducts: number;
  checkedCount: number;
  divergentCount: number;
  adjustedCount: number;
  notes?: string;
  createdAt: string;
  userEmail?: string;
}

export type AiConfidenceLevel = 'high' | 'medium' | 'low';

export interface AiCalculatedMetric {
  label: string;
  value: string | number;
  unit?: string;
  badge?: string;
}

export interface AiCalculationBase {
  periodAnalyzed: string;
  productFiltered?: string;
  responsibleFiltered?: string;
  sectorFiltered?: string;
  movementsCount: number;
  totalQuantity: number;
  unit?: string;
  filtersUsed: string[];
  movementsSummary?: Array<{
    id?: string;
    date: string;
    time?: string;
    quantity: number;
    unit: string;
    type: 'entrada' | 'saida' | 'ajuste';
    productName: string;
    responsible?: string;
    sector?: string;
    notes?: string;
  }>;
}

export interface AiAssistantResponse {
  query: string;
  intent: string;
  summary: string;
  confidence: AiConfidenceLevel;
  confidenceReason?: string;
  metrics: AiCalculatedMetric[];
  calculationBase: AiCalculationBase;
  detailedAnalysis: string;
  insights: string[];
  suggestedFollowUps: string[];
  timestamp: string;
  fallbackMode?: boolean;
  contextValidated?: boolean;
  staleContext?: boolean;
  errorDetails?: any;
}

export interface AiQueryAuditLog {
  id: string;
  timestamp: string;
  userEmail?: string;
  userName?: string;
  query: string;
  intent: string;
  summary: string;
  movementsCount: number;
}

