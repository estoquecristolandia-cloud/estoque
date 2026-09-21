import { execSync } from 'node:child_process';

const testSuites = [
  { name: '1. Auditoria Matemática (Marco Zero)', file: 'src/tests/mathematicalAudit.test.ts' },
  { name: '2. Consistência de Estoque & Modelo de Compensação', file: 'src/tests/stockConsistency.test.ts' },
  { name: '3. Idempotência de Transações', file: 'src/tests/idempotency.test.ts' },
  { name: '4. Motor da IA (Auditoria & Rastreabilidade)', file: 'src/tests/aiStockEngine.test.ts' },
  { name: '5. Contexto Autoritativo da IA no Backend', file: 'src/tests/aiBackendContext.test.ts' },
  { name: '6. Desacoplamento de Hooks (App.tsx)', file: 'src/tests/decoupledHooks.test.ts' },
  { name: '7. Previsão de Compras (Regra Flocão 44pc/sem & Horizontes)', file: 'src/tests/flocaoPurchasesForecast.test.ts' },
  { name: '8. Voz e Resiliência de Captura/Transcrição', file: 'src/tests/voiceCaptureResilience.test.ts' },
  { name: '9. Design System & Contratos Visuais', file: 'src/tests/designSystemContracts.test.ts' },
  { name: '10. RBAC (Controle de Acesso & Blindagem)', file: 'src/tests/rbacEnforcement.test.ts' },
  { name: '11. Regras do Firestore & Whitelist de Visualizadores', file: 'src/tests/firestoreRulesSimulation.test.ts' },
];

console.log('====================================================');
console.log('🏛️  SUÍTE COMPLETA DE TESTES — ESTOQUE CRISTOLÂNDIA');
console.log('====================================================\n');

let passedCount = 0;
const startTime = Date.now();

for (const suite of testSuites) {
  process.stdout.write(`⏳ Executando ${suite.name}... `);
  const suiteStart = Date.now();
  try {
    execSync(`npx tsx ${suite.file}`, { stdio: 'pipe', encoding: 'utf-8' });
    const duration = ((Date.now() - suiteStart) / 1000).toFixed(2);
    console.log(`✅ APROVADO (${duration}s)`);
    passedCount++;
  } catch (err: any) {
    console.log(`❌ FALHOU`);
    console.error(`\nErro na suíte ${suite.name}:`);
    console.error(err.stdout || err.stderr || err.message);
    process.exit(1);
  }
}

const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

console.log('\n====================================================');
console.log(`🎉 TODAS AS ${passedCount}/${testSuites.length} SUÍTES PASSARAM COM SUCESSO! (${totalDuration}s)`);
console.log('🛡️  Marco Zero preservado | Idempotência garantida | CI Verde');
console.log('====================================================\n');
