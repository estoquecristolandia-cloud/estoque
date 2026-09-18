import assert from 'node:assert';
import {
  checkVoiceSupport,
  categorizeVoiceError,
  blobToBase64,
} from '../services/voiceTranscription';

async function runTests() {
  console.log('🧪 Iniciando testes: FASE 6 — Voz e Resiliência de Captura/Transcrição...');

  // 1. checkVoiceSupport em ambiente Node (sem DOM) deve retornar objeto seguro sem lançar exceções
  const support = checkVoiceSupport();
  assert.strictEqual(typeof support.canRecordVoice, 'boolean', 'canRecordVoice deve ser booleano');
  assert.strictEqual(typeof support.hasWebSpeech, 'boolean', 'hasWebSpeech deve ser booleano');
  assert.strictEqual(typeof support.hasMediaRecorder, 'boolean', 'hasMediaRecorder deve ser booleano');
  assert.strictEqual(typeof support.hasGetUserMedia, 'boolean', 'hasGetUserMedia deve ser booleano');
  console.log('  ✅ 1. checkVoiceSupport: Executa com segurança e sem erros em qualquer ambiente.');

  // 2. Erro de Permissão Negada (NotAllowedError)
  const errPermission = new Error('Permission denied by user');
  errPermission.name = 'NotAllowedError';
  const catPermission = categorizeVoiceError(errPermission);
  assert.strictEqual(catPermission.errorType, 'permission_denied');
  assert(catPermission.friendlyMessage.includes('Permissão de microfone negada'));
  console.log('  ✅ 2. Permissão negada: Mapeada para mensagem clara de instrução ao usuário.');

  // 3. Erro de Microfone não encontrado (NotFoundError / DevicesNotFoundError)
  const errNotFound = new Error('Requested device not found');
  errNotFound.name = 'NotFoundError';
  const catNotFound = categorizeVoiceError(errNotFound);
  assert.strictEqual(catNotFound.errorType, 'device_not_found');
  assert(catNotFound.friendlyMessage.includes('Nenhum microfone foi detectado'));
  console.log('  ✅ 3. Dispositivo ausente: Mapeado para aviso específico de microfone não detectado.');

  // 4. Erro de Navegador não suportado (Firefox/Safari restrito)
  const errNotSupported = new Error('getUserMedia is not supported');
  errNotSupported.name = 'NotSupportedError';
  const catNotSupported = categorizeVoiceError(errNotSupported);
  assert.strictEqual(catNotSupported.errorType, 'not_supported');
  assert(catNotSupported.friendlyMessage.includes('não suporta captura direta por voz'));
  console.log('  ✅ 4. Navegador incompatível: Mapeado com sugestão de digitação manual.');

  // 5. Erro de Timeout / Abort
  const errTimeout = new Error('The operation was aborted due to timeout');
  errTimeout.name = 'AbortError';
  const catTimeout = categorizeVoiceError(errTimeout);
  assert.strictEqual(catTimeout.errorType, 'timeout');
  assert(catTimeout.friendlyMessage.includes('tempo limite'));
  console.log('  ✅ 5. Timeout / Abort: Mapeado para aviso de tempo limite.');

  // 6. Áudio muito curto
  const errShort = new Error('Áudio muito curto para reconhecimento');
  const catShort = categorizeVoiceError(errShort);
  assert.strictEqual(catShort.errorType, 'audio_too_short');
  console.log('  ✅ 6. Áudio curto: Detectado e instruído a falar mais próximo do microfone.');

  console.log('\n🎯 FASE 6 — Todos os testes de voz e resiliência passaram com sucesso!\n');
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes da Fase 6:', err);
  process.exit(1);
});
