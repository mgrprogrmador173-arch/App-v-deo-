document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const keyInput = $('groqKeyInput');
  const scriptInput = $('scriptInput');
  const scriptOutput = $('scriptOutput');
  const durationSelect = $('durationSelect');
  const audioPreview = $('audioPreview');
  const appState = $('appState');
  const videoStatus = $('videoStatus');
  const modelSelect = $('groqTextModel');
  const voiceSelect = $('groqVoice');
  const scriptBtn = $('groqScriptBtn');
  const audioBtn = $('groqAudioBtn');

  if (!keyInput || !scriptBtn || !audioBtn) return;

  keyInput.value = localStorage.getItem('groqApiKey') || '';

  function state(text) {
    if (appState) appState.textContent = text;
    if (videoStatus) videoStatus.textContent = text;
  }

  function getKey() {
    const key = String(keyInput.value || '').trim();
    if (key) localStorage.setItem('groqApiKey', key);
    return key;
  }

  function getText() {
    return String(scriptOutput?.value || scriptInput?.value || '').trim();
  }

  async function groqChat(messages) {
    const key = getKey();
    if (!key) throw new Error('Cole sua chave Groq primeiro.');
    const model = modelSelect?.value || 'llama-3.1-8b-instant';
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify({ model, messages, temperature: 0.85, max_tokens: 500 })
    });
    if (!res.ok) throw new Error('Groq texto falhou: ' + res.status);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  }

  async function createGroqScript() {
    try {
      state('Gerando roteiro com Groq...');
      const theme = String(scriptInput.value || '').trim();
      const seconds = durationSelect?.value || '15';
      if (!theme) throw new Error('Digite um tema primeiro.');
      const prompt = `Crie um roteiro viral em português do Brasil para vídeo vertical de ${seconds} segundos. Tema: ${theme}. Use frases curtas, suspense, linguagem simples, estilo TikTok, sem marcações de tempo, sem lista e sem emojis.`;
      const text = await groqChat([
        { role: 'system', content: 'Você é especialista em roteiros curtos virais para TikTok, Reels e Shorts.' },
        { role: 'user', content: prompt }
      ]);
      scriptInput.value = text;
      scriptOutput.value = text;
      state('Roteiro Groq pronto');
      document.getElementById('generateBtn')?.click();
    } catch (err) {
      state('Erro Groq texto');
      alert(err.message);
    }
  }

  async function createGroqAudio() {
    try {
      state('Gerando áudio com Groq...');
      const key = getKey();
      if (!key) throw new Error('Cole sua chave Groq primeiro.');
      let text = getText();
      if (!text) throw new Error('Gere ou cole um roteiro primeiro.');
      text = text.slice(0, 900);
      const voice = voiceSelect?.value || 'Fritz-PlayAI';
      const res = await fetch('https://api.groq.com/openai/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key
        },
        body: JSON.stringify({
          model: 'playai-tts',
          input: text,
          voice: voice,
          response_format: 'wav'
        })
      });
      if (!res.ok) throw new Error('Groq áudio falhou: ' + res.status);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      audioPreview.src = url;
      audioPreview.load();
      state('Áudio Groq pronto');
    } catch (err) {
      state('Erro Groq áudio');
      alert(err.message);
    }
  }

  scriptBtn.addEventListener('click', createGroqScript);
  audioBtn.addEventListener('click', createGroqAudio);
});
