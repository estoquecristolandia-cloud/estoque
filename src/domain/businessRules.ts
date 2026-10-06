/**
 * Regras de Negócio Oficiais e Imutáveis do SIG-Cristolândia
 * Fonte Única da Verdade para Alimentação e Almoxarifado
 */

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
