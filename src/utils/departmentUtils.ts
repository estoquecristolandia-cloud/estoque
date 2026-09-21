import { Product, StockMovement, Department } from '../types';

export const DML_CATEGORIES_LIST = [
  'Higiene Pessoal (Acolhidos)',
  'Limpeza Predial & Conservação',
  'Descartáveis e Acessórios',
  'Higiene e Limpeza',
  'Lavanderia & Asseio',
  'Descartáveis & Copa',
  'Utilidades & Equipamentos DML',
];

export const FOOD_CATEGORIES_LIST = [
  'Grãos e Cereais',
  'Óleos e Condimentos',
  'Matinais e Bebidas',
  'Proteínas e Carnes',
  'Laticínios e Massas',
  'Hortifrúti e Temperos',
];

const DML_NAME_KEYWORDS = [
  'água sanitária',
  'agua sanitaria',
  'cloro',
  'desinfetante',
  'sabão em pó',
  'sabao em po',
  'amaciante',
  'detergente',
  'esponja',
  'saco de lixo',
  'vassoura',
  'rodo',
  'desengordurante',
  'sabonete',
  'creme dental',
  'pasta de dente',
  'escova de dente',
  'lâmina de barbear',
  'lamina de barbear',
  'aparelho de barbear',
  'papel higiênico',
  'papel higienico',
  'desodorante',
  'alvejante',
  'multiuso',
  'lustra móveis',
  'limpa vidro',
];

/**
 * Identifica se um produto pertence de forma inequívoca ao DML (Higiene / Limpeza).
 * Proteção multicamada contra dados sem department explícito ou IDs truncados.
 */
export function isDmlProduct(p: Partial<Product> | null | undefined): boolean {
  if (!p) return false;

  // 1. Tag explícita
  if (p.department === 'dml') return true;
  if (p.department === 'alimentacao') return false;

  // 2. Prefixo de ID
  const id = (p.id || '').toLowerCase();
  if (id.startsWith('dml-') || id.startsWith('dml_')) return true;

  // 3. Local de Armazenamento DML
  const loc = (p.location || '').toUpperCase();
  if (loc.startsWith('DML') || loc.includes('DML -') || loc.includes('DEPÓSITO QUÍMICO')) return true;

  // 4. Categorias exclusivas de DML / Limpeza / Higiene
  const cat = (p.category || '').toLowerCase();
  if (
    cat.includes('limpeza') ||
    cat.includes('higiene') ||
    cat.includes('lavanderia') ||
    cat.includes('descart') ||
    cat.includes('asseio')
  ) {
    return true;
  }

  // 5. Palavras-chave de produtos químicos, higiene e limpeza
  const name = (p.name || '').toLowerCase();
  if (DML_NAME_KEYWORDS.some((kw) => name.includes(kw))) {
    return true;
  }

  return false;
}

/**
 * Identifica se um produto pertence ao setor de Alimentação (Cozinha / Padaria / Despensa).
 */
export function isFoodProduct(p: Partial<Product> | null | undefined): boolean {
  return !isDmlProduct(p);
}

/**
 * Garante que o objeto de produto tenha o campo `department` sempre populado.
 */
export function normalizeProductDepartment(p: Product): Product {
  const dept: Department = isDmlProduct(p) ? 'dml' : 'alimentacao';
  return {
    ...p,
    department: dept,
  };
}

/**
 * Filtra uma lista de produtos de forma estrita e profissional para o departamento ativo.
 */
export function filterProductsByDepartment(products: Product[], dept: Department): Product[] {
  if (dept === 'dml') {
    return products.filter(isDmlProduct);
  }
  if (dept === 'alimentacao') {
    return products.filter(isFoodProduct);
  }
  return products.filter((p) => p.department === dept);
}

/**
 * Filtra movimentações associadas a um departamento específico.
 */
export function filterMovementsByDepartment(
  movements: StockMovement[],
  departmentProducts: Product[],
  dept: Department
): StockMovement[] {
  const currentProductIds = new Set(departmentProducts.map((p) => p.id));
  return movements.filter((m) => {
    if (m.productId && currentProductIds.has(m.productId)) return true;
    if (dept === 'dml') {
      return m.department === 'dml' || (m.productId || '').toLowerCase().startsWith('dml-');
    }
    return m.department !== 'dml' && !(m.productId || '').toLowerCase().startsWith('dml-');
  });
}
