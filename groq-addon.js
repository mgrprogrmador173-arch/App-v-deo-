document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const keyInput = $('openRouterKeyInput');
  const scriptInput = $('scriptInput');
  const scriptOutput = $('scriptOutput');
  const durationSelect = $('durationSelect');
  const audioPreview = $('audioPreview');
  const appState = $('appState');
  const videoStatus = $('videoStatus');
  const modelSelect = $('gemmaTextModel');
  const scriptBtn = $('gemmaScriptBtn');
  const audioBtn = $('gemmaAudioBtn');

  if (!keyInput || !scriptBtn || !audioBtn) return;

  keyInput.value = localStorage.getItem('openRouterApiKey') || '';

  function state(text) {
    if (appState) appState.textContent = text;
    if (videoStatus) videoStatus.textContent = text;
  }

  function getKey() {
    const key = String(keyInput.value || '').trim();
    if (key) localStorage.setItem('openRouterApiKey', key);
    return key;
  }

  async function gemmaChat(messages) {
    const key = getKey();
    if (!key) throw new Error('Cole sua chave OpenRouter/Gemma primeiro.');
    const model = modelSelect?.value || 'google/gemma-3-27b-it:free';
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Video IA Studio'
      },
      body: JSON.stringify({ model, messages, temperature: 0.85, max_tokens: 500 })
    });
    if (!res.ok) throw new Error('Gemma/OpenRouter falhou: ' + res.status);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  }

  async function createGemmaScript() {
    try {
      state('Gerando roteiro com Gemma...');
      const theme = String(scriptInput.value || '').trim();
      const seconds = durationSelect?.value || '15';
      if (!theme) throw new Error('Digite um tema primeiro.');
      const prompt = `Crie um roteiro viral em português do Brasil para vídeo vertical de ${seconds} segundos. Tema: ${theme}. Use frases curtas, suspense, linguagem simples, estilo TikTok, sem marcações de tempo, sem lista e sem emojis.`;
      const text = await gemmaChat([
        { role: 'system', content: 'Você é especialista em roteiros curtos virais para TikTok, Reels e Shorts.' },
        { role: 'user', content: prompt }
      ]);
      scriptInput.value = text;
      scriptOutput.value = text;
      state('Roteiro Gemma pronto');
      document.getElementById('generateBtn')?.click();
    } catch (err) {
      state('Erro Gemma');
      alert(err.message);
    }
  }

  function explainGemmaAudio() {
    alert('Gemma/OpenRouter gera texto, não áudio. Para narração, envie um MP3 local ou use um endpoint TTS.');
    if (audioPreview) audioPreview.focus();
  }

  scriptBtn.addEventListener('click', createGemmaScript);
  audioBtn.addEventListener('click', explainGemmaAudio);
});
