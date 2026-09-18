/**
 * Voice Transcription Service for Estoque Cristolândia.
 * Provides resilient speech recognition with multi-tier fallback:
 * 1. Web Speech API (SpeechRecognition / webkitSpeechRecognition) for supported browsers
 * 2. MediaRecorder + Server-side Gemini audio transcription (/api/ai/transcribe-audio)
 * 3. Graceful handling of unsupported browsers (Firefox/Safari), denied permissions, and network timeouts.
 */

export interface VoiceSupportStatus {
  hasWebSpeech: boolean;
  hasMediaRecorder: boolean;
  hasGetUserMedia: boolean;
  canRecordVoice: boolean;
}

export interface VoiceRecognitionResult {
  text: string;
  source: 'web-speech' | 'server-gemini';
  empty: boolean;
}

export interface CategorizedVoiceError {
  friendlyMessage: string;
  errorType: 'permission_denied' | 'device_not_found' | 'not_supported' | 'timeout' | 'network' | 'audio_too_short' | 'unknown';
}

/**
 * Checks system-level browser voice capabilities without throwing.
 */
export function checkVoiceSupport(): VoiceSupportStatus {
  const hasWebSpeech =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const hasGetUserMedia =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function';

  const hasMediaRecorder =
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined';

  return {
    hasWebSpeech,
    hasGetUserMedia,
    hasMediaRecorder,
    canRecordVoice: hasWebSpeech || (hasGetUserMedia && hasMediaRecorder),
  };
}

/**
 * Returns user-friendly and actionable error messages for speech/mic failures.
 */
export function categorizeVoiceError(err: any): CategorizedVoiceError {
  const name = err?.name || '';
  const message = err?.message || String(err || '');

  if (
    name === 'NotAllowedError' ||
    name === 'PermissionDeniedError' ||
    message.includes('permission') ||
    message.includes('denied')
  ) {
    return {
      friendlyMessage: 'Permissão de microfone negada. Clique no ícone de permissões do navegador para permitir o microfone.',
      errorType: 'permission_denied',
    };
  }

  if (
    name === 'NotFoundError' ||
    name === 'DevicesNotFoundError' ||
    message.includes('not found') ||
    message.includes('no microphone')
  ) {
    return {
      friendlyMessage: 'Nenhum microfone foi detectado no seu dispositivo.',
      errorType: 'device_not_found',
    };
  }

  if (
    name === 'NotSupportedError' ||
    message.includes('not supported') ||
    message.includes('não suporta')
  ) {
    return {
      friendlyMessage: 'Seu navegador não suporta captura direta por voz. Digite sua pergunta no campo de texto.',
      errorType: 'not_supported',
    };
  }

  if (
    name === 'AbortError' ||
    name === 'TimeoutError' ||
    message.includes('timeout') ||
    message.includes('demorou')
  ) {
    return {
      friendlyMessage: 'O tempo limite de processamento de voz expirou. Tente novamente ou digite a pergunta.',
      errorType: 'timeout',
    };
  }

  if (
    message.includes('curto') ||
    message.includes('too short')
  ) {
    return {
      friendlyMessage: 'Áudio muito curto. Clique no microfone, fale sua pergunta e clique em Concluir.',
      errorType: 'audio_too_short',
    };
  }

  return {
    friendlyMessage: `Não foi possível capturar o áudio: ${message || 'Erro inesperado'}. Você pode digitar a pergunta.`,
    errorType: 'unknown',
  };
}

/**
 * Converts a Blob to Base64 data string (without data URL prefix).
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (!base64String) {
        reject(new Error('Falha ao converter áudio para base64.'));
        return;
      }
      const commaIndex = base64String.indexOf(',');
      resolve(commaIndex >= 0 ? base64String.substring(commaIndex + 1) : base64String);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
}

/**
 * Sends audio blob to backend Gemini transcription endpoint with timeout protection.
 */
export async function transcribeAudioViaServer(
  audioBlob: Blob,
  mimeType?: string,
  timeoutMs: number = 25000
): Promise<{ text: string; empty: boolean }> {
  if (!audioBlob || audioBlob.size < 800) {
    return { text: '', empty: true };
  }

  const actualMime = mimeType || audioBlob.type || 'audio/webm';
  const base64Audio = await blobToBase64(audioBlob);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('/api/ai/transcribe-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64: base64Audio,
        mimeType: actualMime,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `Erro HTTP ${response.status} na transcrição.`);
    }

    const data = await response.json();
    const text = (data?.text || '').trim();
    return {
      text,
      empty: !text || data?.empty === true,
    };
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      throw new Error('Timeout: O servidor demorou para responder à transcrição.');
    }
    throw err;
  }
}
