import { Product, StockMovement, DailyMealRecord, Missionary } from '../types';

export interface FullSystemBackupData {
  version: string;
  system: string;
  unit: string;
  exportedAt: string;
  exportedBy: string;
  stats: {
    totalProducts: number;
    totalMovements: number;
    totalMeals: number;
    totalMissionaries: number;
  };
  products: Product[];
  movements: StockMovement[];
  meals: DailyMealRecord[];
  missionaries: Missionary[];
}

/**
 exportFullSystemJSON
 Realiza o download imediato de um snapshot completo de dados em formato JSON
*/
export function exportFullSystemJSON(data: {
  products: Product[];
  movements: StockMovement[];
  meals: DailyMealRecord[];
  missionaries: Missionary[];
  userEmail?: string;
  userName?: string;
}) {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, '-');

  const backupPayload: FullSystemBackupData = {
    version: '2.5.0-JMN-HOMOLOGADO',
    system: 'SIG-Cristolândia (Sistema Integrado de Gestão)',
    unit: 'Centro de Formação LEM/BA - Junta de Missões Nacionais',
    exportedAt: now.toISOString(),
    exportedBy: data.userName ? `${data.userName} (${data.userEmail || ''})` : (data.userEmail || 'Marconi Castro'),
    stats: {
      totalProducts: data.products.length,
      totalMovements: data.movements.length,
      totalMeals: data.meals.length,
      totalMissionaries: data.missionaries.length,
    },
    products: data.products,
    movements: data.movements,
    meals: data.meals,
    missionaries: data.missionaries,
  };

  const jsonString = JSON.stringify(backupPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `backup_seguranca_sig_cristolandia_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 exportExcelCompatibleCSV
 Gera planilha CSV com BOM UTF-8 (compatível com Excel em português sem caracteres corrompidos)
*/
export function exportExcelCompatibleCSV(data: {
  products: Product[];
  movements: StockMovement[];
  meals: DailyMealRecord[];
}) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  let csvContent = '\uFEFF'; // UTF-8 BOM para Excel reconhecer acentuação

  // Seção 1: PRODUTOS
  csvContent += '--- ESTOQUE ATUAL DE PRODUTOS ---\n';
  csvContent += 'Código;Nome do Produto;Departamento;Categoria;Estoque Atual;Estoque Mínimo;Unidade;Preço Médio Estimado;Localização\n';

  data.products.forEach((p) => {
    const code = p.barcode || p.id;
    const name = `"${(p.name || '').replace(/"/g, '""')}"`;
    const depto = p.department === 'dml' ? 'DML / Limpeza' : 'Alimentação';
    const cat = `"${(p.category || '').replace(/"/g, '""')}"`;
    const stock = String(p.currentStock || 0).replace('.', ',');
    const min = String(p.minStock || 0).replace('.', ',');
    const unit = p.unit || 'un';
    const price = String(p.averagePrice || 0).replace('.', ',');
    const loc = `"${(p.location || 'Almoxarifado Principal').replace(/"/g, '""')}"`;

    csvContent += `${code};${name};${depto};${cat};${stock};${min};${unit};${price};${loc}\n`;
  });

  csvContent += '\n--- HISTÓRICO DE ENTRADAS E SAÍDAS ---\n';
  csvContent += 'Data;Tipo;Produto;Quantidade;Unidade;Setor/Origem;Responsável;Documento/Nota;Observações\n';

  data.movements.forEach((m) => {
    const date = m.date || '';
    const type = m.type === 'entrada' ? 'ENTRADA' : 'SAÍDA';
    const prodName = `"${(m.productName || '').replace(/"/g, '""')}"`;
    const qty = String(m.quantity || 0).replace('.', ',');
    const unit = m.unit || '';
    const sector = `"${(m.sector || m.category || '').replace(/"/g, '""')}"`;
    const resp = `"${(m.responsible || '').replace(/"/g, '""')}"`;
    const doc = `"${(m.invoiceNumber || '').replace(/"/g, '""')}"`;
    const obs = `"${(m.notes || '').replace(/"/g, '""')}"`;

    csvContent += `${date};${type};${prodName};${qty};${unit};${sector};${resp};${doc};${obs}\n`;
  });

  csvContent += '\n--- REFEIÇÕES SERVIDAS (REFEITÓRIO) ---\n';
  csvContent += 'Data;Café da Manhã;Almoço;Lanche da Tarde;Jantar;Total do Dia;Responsável;Observações\n';

  data.meals.forEach((meal) => {
    const date = meal.date || '';
    const b = meal.breakfast || 0;
    const l = meal.lunch || 0;
    const s = meal.afternoonSnack || 0;
    const d = meal.dinner || 0;
    const tot = meal.totalMeals || 0;
    const resp = `"${(meal.responsible || '').replace(/"/g, '""')}"`;
    const notes = `"${(meal.notes || '').replace(/"/g, '""')}"`;

    csvContent += `${date};${b};${l};${s};${d};${tot};${resp};${notes}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `planilha_sig_cristolandia_${dateStr}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
