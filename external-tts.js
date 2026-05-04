document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const externalBtn = $('externalTtsBtn');
  const voiceSelect = $('externalTtsVoice');
  const scriptInput = $('scriptInput');
  const scriptOutput = $('scriptOutput');
  const audioPreview = $('audioPreview');
  const appState = $('appState');
  const videoStatus = $('videoStatus');

  if (!externalBtn || !voiceSelect || !audioPreview) return;

  const MESPEAK_SCRIPT = 'https://cdn.jsdelivr.net/gh/kripken/speak.js/mespeak.js';
  const MESPEAK_CONFIG = 'https://cdn.jsdelivr.net/gh/kripken/speak.js/mespeak_config.json';
  const MESPEAK_VOICE_BASE = 'https://cdn.jsdelivr.net/gh/kripken/speak.js/voices/';

  let loaded = false;

  function state(text) {
    if (appState) appState.textContent = text;
    if (videoStatus) videoStatus.textContent = text;
  }

  function textToSpeak() {
    return String(scriptOutput?.value || scriptInput?.value || '').replace(/\s+/g, ' ').trim();
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (window.meSpeak) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Falha ao carregar biblioteca meSpeak.'));
      document.head.appendChild(script);
    });
  }

  async function loadMeSpeak() {
    if (loaded && window.meSpeak) return;
    state('Carregando gerador JS externo...');
    await loadScript(MESPEAK_SCRIPT);
    await new Promise((resolve, reject) => {
      window.meSpeak.loadConfig(MESPEAK_CONFIG, () => {
        window.meSpeak.loadVoice(MESPEAK_VOICE_BASE + 'pt.json', () => {
          window.meSpeak.loadVoice(MESPEAK_VOICE_BASE + 'en/en-us.json', resolve);
        });
      });
      setTimeout(() => reject(new Error('Timeout ao carregar vozes meSpeak.')), 12000);
    });
    loaded = true;
  }

  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'audio/wav';
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  async function generateExternalTts() {
    try {
      const text = textToSpeak();
      if (!text) {
        alert('Digite ou gere um roteiro primeiro.');
        return;
      }

      await loadMeSpeak();
      state('Gerando WAV com JavaScript...');

      const voice = voiceSelect.value || 'pt';
      const wavDataUrl = window.meSpeak.speak(text.slice(0, 1200), {
        voice,
        rawdata: 'data-url',
        amplitude: 100,
        wordgap: 0,
        pitch: 50,
        speed: 160
      });

      if (!wavDataUrl || typeof wavDataUrl !== 'string') {
        throw new Error('Não foi possível gerar áudio WAV.');
      }

      const blob = dataUrlToBlob(wavDataUrl);
      const url = URL.createObjectURL(blob);
      audioPreview.src = url;
      audioPreview.load();
      state('WAV JS pronto para exportar');
    } catch (error) {
      state('Erro no gerador JS');
      alert(error.message);
    }
  }

  externalBtn.addEventListener('click', generateExternalTts);
});
