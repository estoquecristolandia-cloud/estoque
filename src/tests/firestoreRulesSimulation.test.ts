import assert from 'node:assert';

/**
 * Testes determinísticos simulando a árvore de decisão do firestore.rules
 * e do modelo de segurança Whitelist / RBAC do SIG-Cristolândia.
 */

interface AuthToken {
  uid: string;
  email: string | null;
}

interface RequestContext {
  auth: AuthToken | null;
  resource?: any;
}

interface AuthorizedUserDoc {
  email: string;
  name: string;
  active: boolean;
}

// Banco simulado de /authorized_users
const mockAuthorizedUsers: Record<string, AuthorizedUserDoc> = {
  'chefmarcusviniciuses@gmail.com': {
    email: 'chefmarcusviniciuses@gmail.com',
    name: 'Chefe Marcus Vinicius',
    active: true,
  },
  'humbertohpp.59@gmail.com': {
    email: 'humbertohpp.59@gmail.com',
    name: 'Pastor Humberto (1)',
    active: true,
  },
  'humberto.hpp59@gmail.com': {
    email: 'humberto.hpp59@gmail.com',
    name: 'Pastor Humberto (2)',
    active: true,
  },
  'inativo@cristolandia.org': {
    email: 'inativo@cristolandia.org',
    name: 'Usuário Inativo',
    active: false,
  },
};

// Funções espelhando fielmente firestore.rules
function signedIn(ctx: RequestContext): boolean {
  return ctx.auth !== null;
}

function isAdmin(ctx: RequestContext): boolean {
  if (!signedIn(ctx) || !ctx.auth?.email) return false;
  return ctx.auth.email.toLowerCase() === 'estoquecristolandia@gmail.com';
}

function isAuthorizedViewer(ctx: RequestContext): boolean {
  if (!signedIn(ctx) || !ctx.auth?.email) return false;
  const doc = mockAuthorizedUsers[ctx.auth.email.toLowerCase()];
  return doc !== undefined && doc.active === true;
}

function canReadOperational(ctx: RequestContext): boolean {
  return isAdmin(ctx) || isAuthorizedViewer(ctx);
}

function canWriteOperational(ctx: RequestContext): boolean {
  return isAdmin(ctx);
}

function canGetAuthorizedUserDoc(targetEmail: string, ctx: RequestContext): boolean {
  if (isAdmin(ctx)) return true;
  if (signedIn(ctx) && ctx.auth?.email && ctx.auth.email.toLowerCase() === targetEmail.toLowerCase()) {
    return true;
  }
  return false;
}

function canListAuthorizedUsers(ctx: RequestContext): boolean {
  return isAdmin(ctx);
}

function canWriteAuthorizedUsers(ctx: RequestContext): boolean {
  return isAdmin(ctx);
}

function canReadUsersCollection(targetUid: string, ctx: RequestContext): boolean {
  if (isAdmin(ctx)) return true;
  return false; // Na Opção B, visualizadores não consultam /users
}

function isMarcoZeroSession(sessionId: string): boolean {
  return sessionId === 'marco-zero-20260821' || sessionId === 'marco-zero-dml-20260921';
}

function isMarcoZeroRecord(id: string): boolean {
  return (
    /^adj-marco-zero-20260821-/.test(id) ||
    /^adj-20260821-/.test(id) ||
    /^adj-marco-zero-dml-20260921-/.test(id)
  );
}

function canUpdateMovement(movementId: string, ctx: RequestContext): boolean {
  return isAdmin(ctx) && !isMarcoZeroRecord(movementId);
}

function canDeleteMovement(_movementId: string, _ctx: RequestContext): boolean {
  return false; // Imutabilidade física
}

export function runFirestoreRulesTests() {
  console.log('🔒 Executando bateria de testes das Regras do Firestore e Whitelist...');

  const adminCtx: RequestContext = {
    auth: { uid: 'uid-admin-1', email: 'estoquecristolandia@gmail.com' },
  };

  const oldAdminCtx: RequestContext = {
    auth: { uid: 'uid-fake-admin', email: 'admin@app.local' },
  };

  const chefCtx: RequestContext = {
    auth: { uid: 'uid-chef', email: 'chefmarcusviniciuses@gmail.com' },
  };

  const pastor1Ctx: RequestContext = {
    auth: { uid: 'uid-pr1', email: 'humbertohpp.59@gmail.com' },
  };

  const pastor2Ctx: RequestContext = {
    auth: { uid: 'uid-pr2', email: 'humberto.hpp59@gmail.com' },
  };

  const inactiveCtx: RequestContext = {
    auth: { uid: 'uid-inativo', email: 'inativo@cristolandia.org' },
  };

  const intruderCtx: RequestContext = {
    auth: { uid: 'uid-intruder', email: 'estranho@gmail.com' },
  };

  const anonCtx: RequestContext = {
    auth: null,
  };

  // Teste 1: Admin Único
  assert.strictEqual(isAdmin(adminCtx), true, 'estoquecristolandia@gmail.com deve ser admin');
  assert.strictEqual(isAdmin(oldAdminCtx), false, 'admin@app.local NÃO pode mais ser admin');
  assert.strictEqual(isAdmin(chefCtx), false, 'Chefe Marcos não é admin');
  assert.strictEqual(isAdmin(intruderCtx), false, 'Estranho não é admin');
  console.log('  ✅ 1. Verificação de Administrador Único: apenas estoquecristolandia@gmail.com tem privilégio total.');

  // Teste 2: Whitelist de Visualizadores
  assert.strictEqual(isAuthorizedViewer(chefCtx), true, 'Chefe Marcus deve ser visualizador ativo');
  assert.strictEqual(isAuthorizedViewer(pastor1Ctx), true, 'Pastor Humberto 1 deve ser visualizador ativo');
  assert.strictEqual(isAuthorizedViewer(pastor2Ctx), true, 'Pastor Humberto 2 deve ser visualizador ativo');
  assert.strictEqual(isAuthorizedViewer(inactiveCtx), false, 'Usuário com active=false deve ser bloqueado');
  assert.strictEqual(isAuthorizedViewer(intruderCtx), false, 'E-mail fora da whitelist deve ser bloqueado');
  assert.strictEqual(isAuthorizedViewer(anonCtx), false, 'Anônimo deve ser bloqueado');
  console.log('  ✅ 2. Verificação de Whitelist: apenas e-mails ativos autorizados recebem permissão de visualizador.');

  // Teste 3: Leitura Operacional (Produtos, Movimentações, Refeições, Kits, etc.)
  assert.strictEqual(canReadOperational(adminCtx), true, 'Admin pode ler dados operacionais');
  assert.strictEqual(canReadOperational(chefCtx), true, 'Chefe Marcus pode ler dados operacionais');
  assert.strictEqual(canReadOperational(pastor1Ctx), true, 'Pastor Humberto 1 pode ler dados operacionais');
  assert.strictEqual(canReadOperational(pastor2Ctx), true, 'Pastor Humberto 2 pode ler dados operacionais');
  assert.strictEqual(canReadOperational(inactiveCtx), false, 'Inativo NÃO pode ler dados operacionais');
  assert.strictEqual(canReadOperational(intruderCtx), false, 'Usuário não autorizado NÃO pode ler dados operacionais');
  assert.strictEqual(canReadOperational(anonCtx), false, 'Anônimo NÃO pode ler dados operacionais');
  console.log('  ✅ 3. Leitura Operacional: blindada contra e-mails não autorizados e inativos.');

  // Teste 4: Escrita Operacional
  assert.strictEqual(canWriteOperational(adminCtx), true, 'Admin pode escrever');
  assert.strictEqual(canWriteOperational(chefCtx), false, 'Chefe Marcus NÃO pode escrever');
  assert.strictEqual(canWriteOperational(pastor1Ctx), false, 'Pastor Humberto NÃO pode escrever');
  assert.strictEqual(canWriteOperational(intruderCtx), false, 'Estranho NÃO pode escrever');
  console.log('  ✅ 4. Escrita Operacional: estritamente exclusiva do administrador.');

  // Teste 5: Consulta e Governança de /authorized_users
  assert.strictEqual(canListAuthorizedUsers(adminCtx), true, 'Admin pode listar todos os autorizados');
  assert.strictEqual(canListAuthorizedUsers(chefCtx), false, 'Chefe NÃO pode listar a coleção de autorizados');
  assert.strictEqual(canListAuthorizedUsers(intruderCtx), false, 'Estranho NÃO pode listar a coleção de autorizados');

  assert.strictEqual(canGetAuthorizedUserDoc('chefmarcusviniciuses@gmail.com', chefCtx), true, 'Chefe pode consultar seu próprio documento');
  assert.strictEqual(canGetAuthorizedUserDoc('humbertohpp.59@gmail.com', chefCtx), false, 'Chefe NÃO pode consultar o documento do Pastor Humberto');
  assert.strictEqual(canGetAuthorizedUserDoc('chefmarcusviniciuses@gmail.com', adminCtx), true, 'Admin pode consultar o documento do Chefe');
  assert.strictEqual(canWriteAuthorizedUsers(adminCtx), true, 'Admin pode gerenciar a whitelist');
  assert.strictEqual(canWriteAuthorizedUsers(chefCtx), false, 'Visualizador NÃO pode gerenciar a whitelist');
  console.log('  ✅ 5. Governança de /authorized_users: visualizador só consulta o próprio registro; listagem e edição restritas ao admin.');

  // Teste 6: Coleção /users
  assert.strictEqual(canReadUsersCollection('uid-admin-1', adminCtx), true, 'Admin pode gerenciar perfis');
  assert.strictEqual(canReadUsersCollection('uid-chef', chefCtx), false, 'Visualizadores não usam coleção /users');
  assert.strictEqual(canReadUsersCollection('uid-intruder', intruderCtx), false, 'Estranho não lê /users');
  console.log('  ✅ 6. Coleção /users: restrita ao admin, sem exposição a visualizadores ou anônimos.');

  // Teste 7: Proteção do Marco Zero e Imutabilidade
  assert.strictEqual(canDeleteMovement('mov-qualquer-1', adminCtx), false, 'Exclusão física de movimentações é sempre proibida');
  assert.strictEqual(canUpdateMovement('mov-normal-123', adminCtx), true, 'Admin pode atualizar movimentação normal');
  assert.strictEqual(canUpdateMovement('adj-marco-zero-20260821-feijao', adminCtx), false, 'Marco Zero Alimentação não pode ser alterado');
  assert.strictEqual(canUpdateMovement('adj-marco-zero-dml-20260921-leite', adminCtx), false, 'Marco Zero DML não pode ser alterado');
  console.log('  ✅ 7. Proteção do Marco Zero: registros de implantação imutáveis mesmo para o administrador.');

  console.log('🎉 Todos os 7 testes de regras de segurança passaram com sucesso!\n');
}

runFirestoreRulesTests();
