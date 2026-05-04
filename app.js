document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('scriptInput');
  const generateBtn = document.getElementById('generateBtn');
  const mediaBtn = document.getElementById('mediaBtn');
  const voiceBtn = document.getElementById('voiceBtn');
  const captionBtn = document.getElementById('captionBtn');
  const exportBtn = document.getElementById('exportBtn');
  const copyBtn = document.getElementById('copyBtn');
  const languageBtn = document.getElementById('languageBtn');
  const appState = document.getElementById('appState');
  const scriptOutput = document.getElementById('scriptOutput');
  const captionText = document.getElementById('captionText');
  const sceneImage = document.getElementById('sceneImage');
  const sceneVideo = document.getElementById('sceneVideo');
  const videoStatus = document.getElementById('videoStatus');
  const timeline = document.getElementById('timeline');
  const mediaGrid = document.getElementById('mediaGrid');
  const mediaSource = document.getElementById('mediaSource');
  const renderCanvas = document.getElementById('renderCanvas');
  const videoFrame = document.getElementById('videoFrame');

  let currentScript = '';
  let currentScenes = [];
  let sceneIndex = 0;
  let sceneTimer = null;
  let captionsVisible = true;
  let currentLang = 'pt-BR';
  let selectedTheme = 0;

  const themes = [
    ['#12002f', '#7c3cff', '#00d4ff'],
    ['#071225', '#0066ff', '#2eff9b'],
    ['#210018', '#ff4d8d', '#ffd166'],
    ['#050712', '#8b5cf6', '#38bdf8']
  ];

  function setState(message) {
    appState.textContent = message;
    videoStatus.textContent = message;
  }

  function cleanText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function createScriptFromTheme(theme) {
    return `Você sabia que ${theme} pode virar um vídeo incrível em poucos segundos? A inteligência artificial transforma o tema em cenas, cria uma narração e adiciona legendas automáticas. Depois, o vídeo fica pronto para baixar em formato vertical.`;
  }

  function splitIntoScenes(script) {
    const parts = cleanText(script).split(/(?<=[.!?])\s+/).filter(Boolean);
    if (parts.length >= 4) return parts.slice(0, 4);

    const words = cleanText(script).split(' ');
    const size = Math.max(1, Math.ceil(words.length / 4));
    return [0, 1, 2, 3].map(i => words.slice(i * size, (i + 1) * size).join(' ')).filter(Boolean);
  }

  function buildProject() {
    const raw = cleanText(input.value);
    if (!raw) {
      setState('Digite um tema primeiro');
      captionText.textContent = 'Digite um tema ou roteiro para começar.';
      return false;
    }

    currentScript = raw.split(' ').length <= 10 ? createScriptFromTheme(raw) : raw;
    currentScenes = splitIntoScenes(currentScript);
    scriptOutput.value = currentScript;
    return true;
  }

  function renderVisualCard(index) {
    const colors = themes[(index + selectedTheme) % themes.length];
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="${colors[0]}" />
            <stop offset="0.55" stop-color="${colors[1]}" />
            <stop offset="1" stop-color="${colors[2]}" />
          </linearGradient>
          <filter id="blur"><feGaussianBlur stdDeviation="18"/></filter>
        </defs>
        <rect width="720" height="1280" fill="url(#g)"/>
        <circle cx="${160 + index * 90}" cy="260" r="150" fill="rgba(255,255,255,.18)" filter="url(#blur)"/>
        <circle cx="560" cy="${780 - index * 80}" r="220" fill="rgba(0,0,0,.25)" filter="url(#blur)"/>
        <g fill="rgba(255,255,255,.45)">
          <circle cx="90" cy="160" r="4"/><circle cx="220" cy="320" r="3"/><circle cx="620" cy="210" r="5"/>
          <circle cx="510" cy="490" r="3"/><circle cx="140" cy="710" r="4"/><circle cx="610" cy="930" r="5"/>
        </g>
        <text x="360" y="610" fill="white" font-size="56" font-family="Arial" font-weight="800" text-anchor="middle">Cena ${index + 1}</text>
        <text x="360" y="680" fill="rgba(255,255,255,.8)" font-size="30" font-family="Arial" text-anchor="middle">Vídeo IA Studio</text>
      </svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function renderMediaGrid() {
    mediaGrid.innerHTML = '';
    mediaSource.textContent = 'Imagens locais geradas';

    [0, 1, 2, 3, 4, 5].forEach(i => {
      const btn = document.createElement('button');
      btn.className = 'media-item';
      btn.type = 'button';
      const img = document.createElement('img');
      img.src = renderVisualCard(i);
      img.alt = `Mídia ${i + 1}`;
      btn.appendChild(img);
      btn.addEventListener('click', () => {
        selectedTheme = i;
        showScene(sceneIndex);
        setState(`Mídia ${i + 1} selecionada`);
      });
      mediaGrid.appendChild(btn);
    });
  }

  function renderTimeline() {
    timeline.innerHTML = '';
    currentScenes.forEach((_, i) => {
      const span = document.createElement('span');
      if (i <= sceneIndex) span.classList.add('active');
      timeline.appendChild(span);
    });
  }

  function showScene(index) {
    if (!currentScenes.length) return;
    sceneIndex = index % currentScenes.length;
    sceneVideo.style.display = 'none';
    sceneImage.style.display = 'block';
    sceneImage.src = renderVisualCard(sceneIndex);
    captionText.textContent = captionsVisible ? currentScenes[sceneIndex] : '';
    videoStatus.textContent = `Cena ${sceneIndex + 1}/${currentScenes.length}`;
    renderTimeline();
  }

  function playPreview() {
    clearInterval(sceneTimer);
    showScene(0);
    sceneTimer = setInterval(() => showScene(sceneIndex + 1), 3500);
  }

  function generateVideo() {
    try {
      if (!buildProject()) return;
      renderMediaGrid();
      playPreview();
      setState('Prévia gerada');
      localStorage.setItem('videoIAStudioText', input.value);
    } catch (error) {
      setState('Erro ao gerar');
      captionText.textContent = `Erro: ${error.message}`;
    }
  }

  function speakScript() {
    if (!currentScript && !buildProject()) return;
    if (!('speechSynthesis' in window)) {
      alert('Este navegador não suporta narração automática.');
      return;
    }
    window.speechSynthesis.cancel();
    const voice = new SpeechSynthesisUtterance(currentScript);
    voice.lang = currentLang;
    voice.rate = 1;
    window.speechSynthesis.speak(voice);
    setState('Narrando');
  }

  function toggleCaptions() {
    captionsVisible = !captionsVisible;
    captionBtn.textContent = captionsVisible ? 'Legendas' : 'Sem legenda';
    showScene(sceneIndex);
    setState(captionsVisible ? 'Legendas ligadas' : 'Legendas desligadas');
  }

  function drawFrame(ctx, frame) {
    const scene = Math.floor(frame / 90) % currentScenes.length;
    const colors = themes[(scene + selectedTheme) % themes.length];
    const w = renderCanvas.width;
    const h = renderCanvas.height;
    const p = (frame % 90) / 90;

    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(0.55, colors[1]);
    grad.addColorStop(1, colors[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(160 + scene * 90 + p * 80, 300, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(560 - p * 120, 790 - scene * 40, 220, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(0, h * 0.58, w, h * 0.42);

    ctx.fillStyle = '#2eff9b';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`CENA ${scene + 1}/${currentScenes.length}`, 52, 94);

    if (captionsVisible) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 52px Arial';
      ctx.textAlign = 'center';
      wrapText(ctx, currentScenes[scene], w / 2, h - 280, w - 80, 62);
    }

    ctx.fillStyle = 'rgba(255,255,255,.78)';
    ctx.font = '26px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Vídeo IA Studio', w / 2, h - 70);
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = cleanText(text).split(' ');
    let line = '';
    const lines = [];
    words.forEach(word => {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word + ' ';
      } else {
        line = test;
      }
    });
    lines.push(line);
    lines.slice(-5).forEach((l, i) => {
      ctx.strokeStyle = 'rgba(0,0,0,.8)';
      ctx.lineWidth = 10;
      ctx.strokeText(l.trim(), x, y + i * lineHeight);
      ctx.fillText(l.trim(), x, y + i * lineHeight);
    });
  }

  function exportVideo() {
    if (!currentScenes.length && !buildProject()) return;
    if (!window.MediaRecorder || !renderCanvas.captureStream) {
      alert('Exportação não suportada neste navegador. Use Chrome ou Edge.');
      return;
    }

    const type = MediaRecorder.isTypeSupported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8' : 'video/webm';
    const stream = renderCanvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: type });
    const chunks = [];
    const ctx = renderCanvas.getContext('2d');
    let frame = 0;
    const total = Math.max(1, currentScenes.length) * 90;

    setState('Exportando vídeo...');
    clearInterval(sceneTimer);

    recorder.ondataavailable = e => {
      if (e.data.size) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'video-ia-studio.webm';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setState('Vídeo baixado');
      playPreview();
    };

    recorder.start();
    const timer = setInterval(() => {
      drawFrame(ctx, frame);
      frame++;
      if (frame >= total) {
        clearInterval(timer);
        recorder.stop();
      }
    }, 1000 / 30);
  }

  function copyScript() {
    scriptOutput.select();
    document.execCommand('copy');
    setState('Roteiro copiado');
  }

  function toggleLanguage() {
    currentLang = currentLang === 'pt-BR' ? 'en-US' : 'pt-BR';
    languageBtn.textContent = currentLang;
    setState(`Idioma: ${currentLang}`);
  }

  function showTab(tab) {
    document.querySelectorAll('.bottom-nav button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    setState(tab === 'projects' ? 'Projeto salvo localmente' : tab === 'voices' ? `Voz: ${currentLang}` : tab === 'settings' ? 'Ajustes locais' : 'Tela inicial');
  }

  generateBtn.addEventListener('click', generateVideo);
  mediaBtn.addEventListener('click', () => { renderMediaGrid(); setState('Mídias geradas'); });
  voiceBtn.addEventListener('click', speakScript);
  captionBtn.addEventListener('click', toggleCaptions);
  exportBtn.addEventListener('click', exportVideo);
  copyBtn.addEventListener('click', copyScript);
  languageBtn.addEventListener('click', toggleLanguage);
  document.getElementById('featureMedia').addEventListener('click', () => { renderMediaGrid(); setState('Mídias geradas'); });
  document.getElementById('featureVoice').addEventListener('click', speakScript);
  document.getElementById('featureCaptions').addEventListener('click', toggleCaptions);
  document.getElementById('featureExport').addEventListener('click', exportVideo);
  document.querySelectorAll('.bottom-nav button').forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.tab)));

  input.value = localStorage.getItem('videoIAStudioText') || 'Mistérios do universo que a ciência ainda não conseguiu explicar';
  renderMediaGrid();
  generateVideo();
});
