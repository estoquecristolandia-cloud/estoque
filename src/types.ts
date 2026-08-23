export type Category = 
  | 'Grãos e Cereais' 
  | 'Óleos e Condimentos' 
  | 'Matinais e Bebidas' 
  | 'Proteínas e Carnes' 
  | 'Laticínios e Massas' 
  | 'Hortifrúti e Temperos'
  | 'Higiene e Limpeza' 
  | 'Outros';
export type Unit = 'kg' | 'litro' | 'pacote' | 'caixa' | 'unidade' | 'lata' | 'g' | 'balde';
export type Sector = 'Cozinha' | 'Padaria' | 'Casa Missionária Masculina' | 'Casa Missionária Feminina' | 'Administração' | 'Casa da Coordenação (Huberto & Débora)' | 'Casa Lana & Joabe (Cesta Básica)' | 'Casa Marcos & Fabíola (Cesta Básica)' | 'Casa Tainã (Cesta Básica)' | 'Eventos' | 'Outros';
export type EntryType = 'Compra' | 'Doação' | 'Ajuste de Estoque' | 'Contagem Inicial';
export type KitchenShift = 'Café / Manhã' | 'Almoço' | 'Jantar / Tarde' | 'Ceia / Lanche';

export interface Missionary { id: string; name: string; role: string; sector: Sector; shift?: KitchenShift; }

export interface Product {
  id: string; name: string; category: Category; unit: Unit; currentStock: number; minStock: number;
  idealStock?: number;
  dailyAvgConsumption: number; alertDays?: number; usageFrequency?: string; location: string;
  expirationDate?: string; barcode?: string; lastUpdated: string; lastOperationId?: string; updatedAt?: any;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  unit: Unit;
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
  responsible?: string;
  reason?: string;
  previousStock?: number;
  physicalStock?: number;
  difference?: number;
  userUid?: string;
  userEmail?: string;
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
