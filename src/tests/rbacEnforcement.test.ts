import assert from 'node:assert';
import { AppUserProfile } from '../firebase';

// Simulação dos contratos de RBAC
function canPerformAdminAction(user: AppUserProfile | null): boolean {
  if (!user) return false;
  return user.role === 'admin';
}

function canDeleteMovement(movementId: string, user: AppUserProfile | null): { allowed: boolean; reason?: string } {
  if (!canPerformAdminAction(user)) {
    return { allowed: false, reason: 'Apenas Administrador pode excluir movimentações' };
  }
  // Marco Zero nunca pode ser excluído
  if (movementId.startsWith('adj-marco-zero-20260821-') || movementId.startsWith('adj-20260821-')) {
    return { allowed: false, reason: 'Movimentações do Marco Zero são imutáveis e protegidas por regra' };
  }
  return { allowed: true };
}

function canUpdateMovement(movementId: string, user: AppUserProfile | null): { allowed: boolean; reason?: string } {
  if (!canPerformAdminAction(user)) {
    return { allowed: false, reason: 'Apenas Administrador pode atualizar movimentações' };
  }
  if (movementId.startsWith('adj-marco-zero-20260821-') || movementId.startsWith('adj-20260821-')) {
    return { allowed: false, reason: 'Movimentações do Marco Zero não podem ser alteradas' };
  }
  return { allowed: true };
}

async function runTests() {
  console.log('🧪 Iniciando testes: FASE 8 — RBAC (Controle de Acesso Baseado em Papéis)...');

  const adminUser: AppUserProfile = {
    uid: 'uid-admin',
    email: 'estoquecristolandia@gmail.com',
    displayName: 'Administrador Cristolândia',
    role: 'admin',
    createdAt: '2026-08-21T17:30:00Z',
  };

  const viewerUser: AppUserProfile = {
    uid: 'uid-viewer',
    email: 'consulta@cristolandia.org',
    displayName: 'Visualizador Consulta',
    role: 'viewer',
    createdAt: '2026-08-25T10:00:00Z',
  };

  // 1. Admin tem permissão para ações administrativas
  assert.strictEqual(canPerformAdminAction(adminUser), true, 'Admin deve ter permissão');
  console.log('  ✅ 1. Admin: autorização concedida para fluxos operacionais.');

  // 2. Viewer tem ações de escrita bloqueadas
  assert.strictEqual(canPerformAdminAction(viewerUser), false, 'Viewer não pode executar ações de escrita');
  assert.strictEqual(canPerformAdminAction(null), false, 'Usuário não autenticado não pode executar ações de escrita');
  console.log('  ✅ 2. Viewer & Anônimo: bloqueio seguro de operações mutáveis.');

  // 3. Exclusão de movimentação comum por Viewer deve ser rejeitada
  const normalMovId = 'mov-entrada-123456';
  const viewerDeleteResult = canDeleteMovement(normalMovId, viewerUser);
  assert.strictEqual(viewerDeleteResult.allowed, false);
  assert(viewerDeleteResult.reason?.includes('Apenas Administrador'));
  console.log('  ✅ 3. Viewer bloqueado ao tentar excluir movimentação comum.');

  // 4. Exclusão de movimentação comum por Admin deve ser permitida (via compensação)
  const adminDeleteResult = canDeleteMovement(normalMovId, adminUser);
  assert.strictEqual(adminDeleteResult.allowed, true);
  console.log('  ✅ 4. Admin permitido a efetivar compensação de movimentação comum.');

  // 5. Tentativa de alteração ou exclusão de registro do Marco Zero é BLOQUEADA até para Admin
  const marcoZeroMovId = 'adj-marco-zero-20260821-prod-arroz';
  const deleteMarcoZero = canDeleteMovement(marcoZeroMovId, adminUser);
  assert.strictEqual(deleteMarcoZero.allowed, false, 'Marco Zero não pode ser excluído nem por Admin');
  assert(deleteMarcoZero.reason?.includes('Marco Zero'));

  const updateMarcoZero = canUpdateMovement(marcoZeroMovId, adminUser);
  assert.strictEqual(updateMarcoZero.allowed, false, 'Marco Zero não pode ser editado nem por Admin');
  assert(updateMarcoZero.reason?.includes('Marco Zero'));
  console.log('  ✅ 5. Marco Zero: Blindagem absoluta contra deleção e edição mesmo para Admin.');

  // 6. Simulação direta dos predicados do firestore.rules para /users/{userId}
  const isFirestoreAdmin = (tokenEmail?: string | null) => {
    if (!tokenEmail) return false;
    const lower = tokenEmail.toLowerCase();
    return lower === 'estoquecristolandia@gmail.com';
  };

  const isMarcoZeroSession = (sessionId: string) =>
    sessionId === 'marco-zero-20260821' || sessionId === 'marco-zero-dml-20260921';
  const isMarcoZeroRecord = (id: string) =>
    /^adj-marco-zero-20260821-.*$/.test(id) ||
    /^adj-20260821-.*$/.test(id) ||
    /^adj-marco-zero-dml-20260921-.*$/.test(id);

  const simulateUserCreateRule = (
    auth: { uid: string; email: string | null } | null,
    targetUserId: string,
    incomingData: { uid: string; email: string; role: string; displayName?: string }
  ) => {
    if (!auth) return false;
    if (isFirestoreAdmin(auth.email)) return true;
    const isSelf = auth.uid === targetUserId;
    const isSafeSelfUserCreate =
      isSelf &&
      incomingData.uid === auth.uid &&
      incomingData.role !== 'admin' &&
      (auth.email === null || incomingData.email === auth.email);
    return isSafeSelfUserCreate;
  };

  const simulateUserUpdateRule = (
    auth: { uid: string; email: string | null } | null,
    targetUserId: string,
    existingData: { uid: string; email: string; role: string; displayName?: string },
    incomingData: { uid: string; email: string; role: string; displayName?: string }
  ) => {
    if (!auth) return false;
    if (isFirestoreAdmin(auth.email)) return true;
    const isSelf = auth.uid === targetUserId;
    const isSafeSelfUserUpdate =
      isSelf &&
      incomingData.uid === existingData.uid &&
      incomingData.email === existingData.email &&
      incomingData.role === existingData.role &&
      incomingData.role !== 'admin';
    return isSafeSelfUserUpdate;
  };

  // Testes de criação de usuário
  // Usuário comum criando seu próprio perfil como 'viewer' -> Permitido
  assert.strictEqual(
    simulateUserCreateRule({ uid: 'usr-123', email: 'irmao@cristolandia.org' }, 'usr-123', {
      uid: 'usr-123',
      email: 'irmao@cristolandia.org',
      role: 'viewer',
    }),
    true,
    'Usuário comum deve conseguir criar seu próprio perfil como viewer'
  );

  // Usuário comum tentando se auto-atribuir 'admin' no create -> BLOQUEADO
  assert.strictEqual(
    simulateUserCreateRule({ uid: 'usr-123', email: 'irmao@cristolandia.org' }, 'usr-123', {
      uid: 'usr-123',
      email: 'irmao@cristolandia.org',
      role: 'admin',
    }),
    false,
    'Auto-elevação para admin no create deve ser estritamente bloqueada'
  );

  // Usuário comum tentando forjar outro UID ou email no create -> BLOQUEADO
  assert.strictEqual(
    simulateUserCreateRule({ uid: 'usr-123', email: 'irmao@cristolandia.org' }, 'usr-123', {
      uid: 'usr-999',
      email: 'irmao@cristolandia.org',
      role: 'viewer',
    }),
    false,
    'Tentativa de forjar UID diferente no create deve ser bloqueada'
  );

  // Testes de atualização de perfil (update)
  const initialProfile = {
    uid: 'usr-123',
    email: 'irmao@cristolandia.org',
    role: 'viewer',
    displayName: 'Irmão José',
  };

  // Usuário comum atualizando apenas displayName -> Permitido
  assert.strictEqual(
    simulateUserUpdateRule(
      { uid: 'usr-123', email: 'irmao@cristolandia.org' },
      'usr-123',
      initialProfile,
      { ...initialProfile, displayName: 'Irmão José da Silva' }
    ),
    true,
    'Usuário comum pode atualizar o próprio displayName'
  );

  // Usuário comum tentando elevar role para admin -> BLOQUEADO
  assert.strictEqual(
    simulateUserUpdateRule(
      { uid: 'usr-123', email: 'irmao@cristolandia.org' },
      'usr-123',
      initialProfile,
      { ...initialProfile, role: 'admin' }
    ),
    false,
    'Usuário comum NÃO pode alterar role para admin (elevação de privilégio bloqueada)'
  );

  // Usuário comum tentando alterar email -> BLOQUEADO
  assert.strictEqual(
    simulateUserUpdateRule(
      { uid: 'usr-123', email: 'irmao@cristolandia.org' },
      'usr-123',
      initialProfile,
      { ...initialProfile, email: 'estoquecristolandia@gmail.com' }
    ),
    false,
    'Usuário comum NÃO pode alterar email no perfil'
  );

  // Usuário comum tentando alterar uid -> BLOQUEADO
  assert.strictEqual(
    simulateUserUpdateRule(
      { uid: 'usr-123', email: 'irmao@cristolandia.org' },
      'usr-123',
      initialProfile,
      { ...initialProfile, uid: 'usr-admin' }
    ),
    false,
    'Usuário comum NÃO pode alterar uid no perfil'
  );

  // Admin atualizando perfil ou role de usuário -> Permitido
  assert.strictEqual(
    simulateUserUpdateRule(
      { uid: 'uid-admin', email: 'estoquecristolandia@gmail.com' },
      'usr-123',
      initialProfile,
      { ...initialProfile, role: 'admin' }
    ),
    true,
    'Administrador oficial pode atualizar papéis de usuários'
  );

  // 7. Validação das funções de proteção do Marco Zero
  assert.strictEqual(isMarcoZeroSession('marco-zero-20260821'), true);
  assert.strictEqual(isMarcoZeroSession('sessao-qualquer-2026'), false);
  assert.strictEqual(isMarcoZeroRecord('adj-marco-zero-20260821-prod-arroz'), true);
  assert.strictEqual(isMarcoZeroRecord('adj-20260821-prod-feijao'), true);
  assert.strictEqual(isMarcoZeroRecord('adj-20260822-prod-arroz'), false);
  console.log('  ✅ 6. Regras de RBAC (/users/{userId}) e funções do Marco Zero validadas com sucesso.');

  console.log('\n🎯 FASE 8 — Todos os testes de RBAC passaram com sucesso!\n');
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes da Fase 8:', err);
  process.exit(1);
});
