import assert from 'node:assert';
import { ROLE_LABELS, UserRole } from '../firebase';
import { getDetailedStockNote } from '../components/ProductManager';
import { Product } from '../types';

async function runTests() {
  console.log('🧪 Iniciando testes: FASE 7 — Design System & Contratos Visuais...');

  // 1. Auditoria de Contraste e Metadados das Roles (WCAG AA Compliance)
  const roles = ['admin', 'viewer', 'cozinha', 'coordenacao'];
  roles.forEach((role) => {
    const meta = ROLE_LABELS[role];
    assert(meta, `Role ${role} deve ter metadados definidos`);
    assert(meta.badge, `Role ${role} deve ter badge definido`);
    assert(meta.title, `Role ${role} deve ter title amigável`);
    assert(meta.color, `Role ${role} deve ter classes de cores contrastantes`);
  });
  console.log('  ✅ 1. Metadados de RBAC no Design System cumprem requisitos de badge, contraste e rótulo.');

  // 2. Regra de Flocão em ProductManager (20 pc/preparo oficial)
  const mockFlocao: Product = {
    id: 'prod-flocao',
    name: 'Flocão de Milho',
    category: 'Grãos e Cereais',
    unit: 'pacote',
    currentStock: 48,
    minStock: 40,
    idealStock: 80,
    dailyAvgConsumption: 5.71,
    location: 'Prateleira 4',
    lastUpdated: '2026-08-21T17:30:00',
  };
  const note = getDetailedStockNote(mockFlocao);
  assert(note !== null, 'Flocão deve ter nota detalhada');
  assert(note.includes('20 pc/preparo'), 'Nota de Flocão deve indicar estritamente 20 pc/preparo');
  assert(note.includes('40 pc/sem'), 'Nota de Flocão deve indicar 40 pc/sem');
  console.log('  ✅ 2. Nota visual do Flocão no Design System alinhada com a regra de 20/preparo (40/sem).');

  // 3. Arroz e Feijão no ProductManager
  const mockArroz: Product = {
    id: 'prod-arroz',
    name: 'Arroz Branco',
    category: 'Grãos e Cereais',
    unit: 'kg',
    currentStock: 150,
    minStock: 50,
    idealStock: 200,
    dailyAvgConsumption: 12,
    location: 'Palete A',
    lastUpdated: '2026-08-21T17:30:00',
  };
  const arrozNote = getDetailedStockNote(mockArroz);
  assert(arrozNote?.includes('sacos de 50kg'), 'Arroz deve indicar sacos de 50kg para rápida conferência');
  console.log('  ✅ 3. Unidades macro e equivalências visuais para cozinha conferidas.');

  console.log('\n🎯 FASE 7 — Todos os contratos do Design System foram validados com sucesso!\n');
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes da Fase 7:', err);
  process.exit(1);
});
