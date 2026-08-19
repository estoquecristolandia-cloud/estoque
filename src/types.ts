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

export type Sector = 
  | 'Cozinha' 
  | 'Padaria'
  | 'Casa Missionária Masculina' 
  | 'Casa Missionária Feminina' 
  | 'Administração' 
  | 'Casa da Coordenação (Huberto & Débora)'
  | 'Casa Lana & Joabe (Cesta Básica)'
  | 'Casa Marcos & Fabíola (Cesta Básica)'
  | 'Casa Tainã (Cesta Básica)'
  | 'Eventos' 
  | 'Outros';

export type EntryType = 'Compra' | 'Doação' | 'Ajuste de Estoque' | 'Contagem Inicial';

export type KitchenShift = 'Café / Manhã' | 'Almoço' | 'Jantar / Tarde' | 'Ceia / Lanche';

export interface Missionary {
  id: string;
  name: string;
  role: string; // e.g. "Líder Casa Masculina", "Cozinheiro"
  sector: Sector;
  shift?: KitchenShift; // Mandatory for Cozinha
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  unit: Unit;
  currentStock: number;
  minStock: number;
  dailyAvgConsumption: number; // e.g. 17 kg/day
  alertDays?: number; // Days of stock buffer before triggering alert (e.g., 5 days)
  usageFrequency?: string; // e.g. "Diário", "Quartas e Domingos", "Eventos Esporádicos"
  location: string; // e.g. "Depósito Principal"
  expirationDate?: string; // YYYY-MM-DD
  barcode?: string; // Barcode / EAN number
  lastUpdated: string; // ISO date string
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  unit: Unit;
  type: 'entrada' | 'saida';
  quantity: number;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  
  // Specific to Entrada
  entryType?: EntryType;
  supplierOrDonor?: string; // e.g., "Mercado Central" or "Doador Anônimo"
  receivedBy?: string; // e.g., "Marconi Castro"

  // Specific to Saida
  sector?: Sector;
  kitchenShift?: string;
  retrievedBy?: string; // e.g., "João" (Quem retirou)
  deliveredBy?: string; // e.g., "Marconi Castro" (Quem entregou)
  
  notes?: string;
  createdAt: string; // ISO string
}

export interface KitItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: Unit;
}

export interface DailyKit {
  id: string;
  name: string;
  sector: Sector;
  items: KitItem[];
  defaultRetriever: string;
  defaultDeliverer: string;
}

export interface AuditReport {
  productId: string;
  productName: string;
  initialStock: number;
  totalEntries: number;
  totalExits: number;
  calculatedBalance: number;
  currentStock: number;
  isBalanced: boolean;
  discrepancy: number;
}

export interface DailyMealRecord {
  id: string;
  date: string; // YYYY-MM-DD
  breakfast: number; // Café da Manhã (nº de pessoas)
  lunch: number; // Almoço (nº de pessoas)
  afternoonSnack: number; // Lanche das 16h (nº de pessoas)
  dinner: number; // Jantar (nº de pessoas)
  totalMeals: number; // Soma total de refeições do dia
  responsible: string; // Responsável pelo registro
  notes?: string; // Observações (cardápio, visitantes, etc.)
  createdAt: string;
  updatedAt?: string;
}
