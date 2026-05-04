document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const voiceSelect = $('browserVoiceSelect');
  const voiceRate = $('voiceRate');
  const voicePitch = $('voicePitch');
  const voiceBtn = $('voiceBtn');
  const featureVoice = $('featureVoice');
  const scriptInput = $('scriptInput');
  const scriptOutput = $('scriptOutput');
  const appState = $('appState');
  const videoStatus = $('videoStatus');

  if (!voiceSelect || !voiceBtn) return;

  let voices = [];

  function state(text) {
    if (appState) appState.textContent = text;
    if (videoStatus) videoStatus.textContent = text;
  }

  function getText() {
    return String(scriptOutput?.value || scriptInput?.value || '').trim();
  }

  function loadVoices() {
    voices = window.speechSynthesis?.getVoices?.() || [];
    const preferred = voices.filter(v => String(v.lang || '').toLowerCase().startsWith('pt'));
    const list = preferred.length ? preferred : voices;

    voiceSelect.innerHTML = '';

    if (!list.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Voz padrão do navegador';
      voiceSelect.appendChild(option);
      return;
    }

    list.forEach((voice, index) => {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = `${voice.name} • ${voice.lang}`;
      if (index === 0) option.selected = true;
      voiceSelect.appendChild(option);
    });
  }

  function speak() {
    const text = getText();
    if (!text) {
      alert('Digite ou gere um roteiro primeiro.');
      return;
    }

    if (!('speechSynthesis' in window)) {
      alert('Este navegador não suporta gerador de voz.');
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const selected = voices.find(v => v.name === voiceSelect.value);
    if (selected) utterance.voice = selected;
    utterance.lang = selected?.lang || 'pt-BR';
    utterance.rate = Number(voiceRate?.value || 1);
    utterance.pitch = Number(voicePitch?.value || 1);

    utterance.onstart = () => state('Gerando voz no navegador...');
    utterance.onend = () => state('Voz finalizada');
    utterance.onerror = () => state('Erro na voz do navegador');

    window.speechSynthesis.speak(utterance);
  }

  loadVoices();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  voiceBtn.addEventListener('click', speak);
  featureVoice?.addEventListener('click', speak);
});
