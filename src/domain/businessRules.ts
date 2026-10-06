/**
 * Regras de Negócio Oficiais e Imutáveis do SIG-Cristolândia
 * Fonte Única da Verdade para Alimentação e Almoxarifado
 */

/**
 * 14 PRODUTOS OFICIAIS DO MARCO ZERO — CRISTOLÂNDIA LEM/BA
 * Sessão: marco-zero-20260821 | Data: 2026-08-21 | Horário: 17:30 | Resp: Marconi Castro
 * Base histórica imutável auditada e conferida fisicamente.
 */
export const OFFICIAL_MARCO_ZERO: Record<string, { stock: number; unit: string; name: string }> = {
  'prod-acucar': { stock: 35, unit: 'kg', name: 'Açúcar Cristal' },
  'prod-alho': { stock: 16.5, unit: 'pacote', name: 'Alho (Pacote c/ 10 cabeças)' },
  'prod-arroz': { stock: 107, unit: 'kg', name: 'Arroz Branco' },
  'prod-cafe': { stock: 12, unit: 'pacote', name: 'Café Torrado e Moído (250g)' },
  'prod-farinha': { stock: 26, unit: 'kg', name: 'Farinha de Trigo / Mandioca' },
  'prod-feijao': { stock: 44, unit: 'kg', name: 'Feijão Carioca' },
  'prod-flocao': { stock: 52, unit: 'pacote', name: 'Flocão de Milho (Cuscuz 400g)' },
  'prod-leite': { stock: 18, unit: 'litro', name: 'Leite Integral' },
  'prod-macarrao': { stock: 56, unit: 'pacote', name: 'Macarrão Espaguete' },
  'prod-manteiga': { stock: 24, unit: 'kg', name: 'Manteiga / Margarina (Balde 14,5kg)' },
  'prod-milho-pipoca': { stock: 10, unit: 'pacote', name: 'Milho para Pipoca (500g)' },
  'prod-oleo': { stock: 11, unit: 'litro', name: 'Óleo de Soja (900ml)' },
  'prod-sal': { stock: 3, unit: 'kg', name: 'Sal Refinado' },
  'prod-suco': { stock: 13, unit: 'pacote', name: 'Suco em Pó (250g)' },
};

export const FLOCAO_RULES = {
  productId: 'prod-flocao',
  productName: 'Flocão de Milho (Cuscuz 400g)',
  unit: 'pacote',
  // Preparo: Quartas e Domingos
  preparationDays: ['Quarta-feira', 'Domingo'] as const,
  preparationsPerWeek: 2,
  packsPerMeal: 20, // 20 pacotes por preparo oficial (confirmado pela cozinha)
  weeklyConsumption: 40, // 2 preparos x 20 = 40 pacotes/semana
  dailyEquivalentConsumption: 5.71, // 40 / 7 = 5.7142... arredondado para 5.71
  safetyStockPacks: 20, // Reserva de segurança = 1 preparo completo (20 pacotes)
  minStockPacks: 40, // Estoque mínimo = 2 preparos (40 pacotes)
  idealStockPacks: 80, // Estoque ideal = 4 preparos (80 pacotes / 2 semanas)
  description: 'Quarta (20 pc) e Domingo (20 pc) = 40 pc/sem',
} as const;

export const MACARRAO_RULES = {
  productId: 'prod-macarrao',
  productName: 'Macarrão Espaguete',
  unit: 'pacote',
  preparationDays: ['Quarta-feira', 'Domingo'] as const,
  preparationsPerWeek: 2,
  packsPerMeal: 10, // 10 pacotes por preparo
  weeklyConsumption: 20, // 20 pacotes/semana
  dailyEquivalentConsumption: 2.86, // 20 / 7 = 2.857...
  safetyStockPacks: 10,
  minStockPacks: 20,
  idealStockPacks: 60,
  description: 'Quarta e Domingo (10 pc/preparo) = 20 pc/sem',
} as const;
