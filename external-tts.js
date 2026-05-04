document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const externalBtn = $('externalTtsBtn');
  const voiceSelect = $('externalTtsVoice');
  const scriptInput = $('scriptInput');
  const scriptOutput = $('scriptOutput');
  const audioPreview = $('audioPreview');
  const durationSelect = $('durationSelect');
  const appState = $('appState');
  const videoStatus = $('videoStatus');

  if (!externalBtn || !audioPreview) return;

  function state(text) {
    if (appState) appState.textContent = text;
    if (videoStatus) videoStatus.textContent = text;
  }

  function clean(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function textToSpeak() {
    return clean(scriptOutput?.value || scriptInput?.value || '');
  }

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  function normalizeChar(char) {
    return char
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function charFrequency(char, voiceMode) {
    const baseMap = {
      a: 700, e: 520, i: 880, o: 430, u: 360,
      b: 180, c: 240, d: 220, f: 300, g: 260, h: 200,
      j: 330, k: 250, l: 410, m: 190, n: 210, p: 170,
      q: 260, r: 390, s: 310, t: 230, v: 340, w: 360,
      x: 450, y: 500, z: 380
    };
    const multiplier = voiceMode === 'en/en-us' ? 1.08 : 1;
    return (baseMap[char] || 260) * multiplier;
  }

  function createRobotVoiceWav(text, seconds, voiceMode) {
    const sampleRate = 22050;
    const maxText = clean(text).slice(0, 700);
    const chars = maxText.split('');
    const targetSeconds = Math.max(6, Math.min(Number(seconds || 15), 30));
    const charDuration = Math.max(0.025, Math.min(0.075, targetSeconds / Math.max(chars.length, 1)));
    const samplesPerChar = Math.max(360, Math.floor(sampleRate * charDuration));
    const totalSamples = samplesPerChar * chars.length;
    const pcm = new Int16Array(totalSamples);

    let sampleIndex = 0;
    let phraseWave = 0;

    for (let c = 0; c < chars.length; c++) {
      const raw = chars[c];
      const ch = normalizeChar(raw);
      const isPause = /\s|[.,!?;:]/.test(raw);
      const freq = charFrequency(ch, voiceMode);
      const vowel = 'aeiou'.includes(ch);
      const amp = isPause ? 0 : vowel ? 0.36 : 0.18;

      for (let i = 0; i < samplesPerChar; i++) {
        const t = i / sampleRate;
        const progress = i / samplesPerChar;
        const attack = Math.min(1, progress * 8);
        const release = Math.min(1, (1 - progress) * 8);
        const env = Math.max(0, Math.min(attack, release));
        const vibrato = Math.sin(2 * Math.PI * 5 * (sampleIndex / sampleRate)) * 8;
        const f = freq + vibrato + Math.sin(phraseWave) * 12;
        const formant1 = Math.sin(2 * Math.PI * f * t);
        const formant2 = Math.sin(2 * Math.PI * (f * 1.9) * t) * 0.35;
        const formant3 = Math.sin(2 * Math.PI * (f * 2.8) * t) * 0.16;
        const buzz = ((Math.sin(2 * Math.PI * (f / 2) * t) > 0 ? 1 : -1) * 0.08);
        const signal = (formant1 + formant2 + formant3 + buzz) * amp * env;
        pcm[sampleIndex] = Math.max(-32767, Math.min(32767, Math.floor(signal * 32767)));
        sampleIndex++;
        phraseWave += 0.00018;
      }
    }

    const buffer = new ArrayBuffer(44 + pcm.length * 2);
    const view = new DataView(buffer);
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcm.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, pcm.length * 2, true);

    let offset = 44;
    for (let i = 0; i < pcm.length; i++, offset += 2) {
      view.setInt16(offset, pcm[i], true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }

  async function generateExternalTts() {
    try {
      const text = textToSpeak();
      if (!text) {
        alert('Digite ou gere um roteiro primeiro.');
        return;
      }

      state('Gerando WAV JS local...');
      const seconds = Number(durationSelect?.value || 15);
      const voiceMode = voiceSelect?.value || 'pt';
      const blob = createRobotVoiceWav(text, seconds, voiceMode);
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
