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

let currentScript = '';
let currentScenes = [];
let currentMedia = [];
let sceneIndex = 0;
let sceneTimer = null;
let captionsVisible = true;
let currentLang = 'pt-BR';

const fallbackMedia = [
  'https://picsum.photos/seed/space-ai-1/720/1280',
  'https://picsum.photos/seed/space-ai-2/720/1280',
  'https://picsum.photos/seed/space-ai-3/720/1280',
  'https://picsum.photos/seed/space-ai-4/720/1280'
];

function setState(message) {
  appState.textContent = message;
  videoStatus.textContent = message;
}

function cleanText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function isProbablyTheme(text) {
  return cleanText(text).split(' ').length <= 10;
}

function createScriptFromTheme(theme) {
  return `Você sabia que ${theme} pode virar um vídeo incrível em poucos segundos? A inteligência artificial analisa o tema, busca imagens impactantes, cria uma narração natural e adiciona legendas automaticamente. Em poucos cliques, você transforma uma ideia simples em um vídeo pronto para postar no TikTok, Reels ou Shorts.`;
}

function splitIntoScenes(script) {
  const sentences = script
    .split(/(?<=[.!?])\s+/)
    .map(cleanText)
    .filter(Boolean);

  if (sentences.length >= 4) return sentences.slice(0, 4);

  const words = script.split(' ');
  const chunkSize = Math.max(1, Math.ceil(words.length / 4));
  return Array.from({ length: 4 }, (_, index) => {
    return words.slice(index * chunkSize, (index + 1) * chunkSize).join(' ');
  }).filter(Boolean);
}

function extractKeywords(text) {
  const stopwords = ['sobre', 'para', 'com', 'uma', 'que', 'isso', 'esse', 'essa', 'você', 'crie', 'vídeo', 'roteiro', 'pode', 'como', 'mais'];
  const words = cleanText(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .split(' ')
    .filter(word => word.length > 3 && !stopwords.includes(word));

  return words.slice(0, 4).join(' ') || 'space technology';
}

async function searchWikimediaMedia(query) {
  const api = 'https://commons.wikimedia.org/w/api.php';
  const params = new URLSearchParams({
    origin: '*',
    action: 'query',
    generator: 'search',
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '12',
    prop: 'imageinfo',
    iiprop: 'url|mime|thumburl',
    iiurlwidth: '720',
    format: 'json'
  });

  const response = await fetch(`${api}?${params}`);
  if (!response.ok) throw new Error('Erro ao buscar mídias');

  const data = await response.json();
  const pages = data?.query?.pages ? Object.values(data.query.pages) : [];

  return pages
    .map(page => {
      const info = page.imageinfo?.[0];
      if (!info || !info.mime?.startsWith('image')) return null;
      return {
        title: page.title,
        type: 'image',
        src: info.thumburl || info.url,
        original: info.url
      };
    })
    .filter(Boolean);
}

function fallbackMediaList() {
  return fallbackMedia.map((src, index) => ({
    title: `Mídia grátis ${index + 1}`,
    type: 'image',
    src,
    original: src
  }));
}

async function loadMedia() {
  const baseText = cleanText(input.value || currentScript || 'universo tecnologia inteligencia artificial');
  const query = extractKeywords(baseText);
  setState('Buscando mídias grátis...');

  try {
    const media = await searchWikimediaMedia(query);
    currentMedia = media.length ? media : fallbackMediaList();
    mediaSource.textContent = media.length ? 'Wikimedia Commons' : 'Fallback gratuito';
  } catch (error) {
    currentMedia = fallbackMediaList();
    mediaSource.textContent = 'Fallback gratuito';
  }

  renderMediaGrid();
  setState('Mídias carregadas');
}

function renderMediaGrid() {
  mediaGrid.innerHTML = '';

  currentMedia.slice(0, 6).forEach((item) => {
    const card = document.createElement('button');
    card.className = 'media-item';
    card.title = item.title;

    const img = document.createElement('img');
    img.src = item.src;
    img.alt = item.title;
    img.loading = 'lazy';
    card.appendChild(img);

    card.addEventListener('click', () => {
      currentMedia[sceneIndex] = item;
      showScene(sceneIndex);
    });

    mediaGrid.appendChild(card);
  });
}

function renderTimeline(activeIndex) {
  timeline.innerHTML = '';
  currentScenes.forEach((_, index) => {
    const bar = document.createElement('span');
    if (index <= activeIndex) bar.classList.add('active');
    timeline.appendChild(bar);
  });
}

function showScene(index) {
  if (!currentScenes.length) return;

  sceneIndex = index % currentScenes.length;
  const scene = currentScenes[sceneIndex];
  const media = currentMedia[sceneIndex % Math.max(currentMedia.length, 1)];

  captionText.textContent = captionsVisible ? scene : '';
  sceneVideo.style.display = 'none';
  sceneVideo.pause();
  sceneImage.src = media?.src || fallbackMedia[sceneIndex % fallbackMedia.length];
  sceneImage.style.display = 'block';

  videoStatus.textContent = `Cena ${sceneIndex + 1}/${currentScenes.length}`;
  renderTimeline(sceneIndex);
}

function playPreview() {
  clearInterval(sceneTimer);
  showScene(0);
  sceneTimer = setInterval(() => showScene(sceneIndex + 1), 4500);
}

async function generateVideo() {
  const raw = cleanText(input.value);

  if (!raw) {
    input.focus();
    captionText.textContent = 'Digite um tema ou cole um roteiro primeiro.';
    setState('Aguardando texto');
    return;
  }

  currentScript = isProbablyTheme(raw) ? createScriptFromTheme(raw) : raw;
  currentScenes = splitIntoScenes(currentScript);
  scriptOutput.value = currentScript;

  await loadMedia();
  setState('Prévia gerada');
  playPreview();
  saveProject();
}

function speakScript() {
  if (!currentScript) currentScript = cleanText(scriptOutput.value || input.value);
  if (!currentScript) return;

  if (!('speechSynthesis' in window)) {
    alert('Seu navegador não suporta narração automática.');
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(currentScript);
  utterance.lang = currentLang;
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
  setState('Narrando roteiro');
}

function toggleCaptions() {
  captionsVisible = !captionsVisible;
  captionBtn.textContent = captionsVisible ? 'Legendas' : 'Sem legenda';
  showScene(sceneIndex);
  setState(captionsVisible ? 'Legendas ativadas' : 'Legendas ocultas');
}

function getSupportedMimeType() {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];

  return types.find(type => MediaRecorder.isTypeSupported(type)) || '';
}

function drawExportFrame(ctx, scene, frame, sceneNumber) {
  const w = renderCanvas.width;
  const h = renderCanvas.height;
  const progress = (frame % 120) / 120;

  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, `hsl(${245 + sceneNumber * 28}, 85%, ${18 + progress * 6}%)`);
  gradient.addColorStop(0.45, `hsl(${205 + sceneNumber * 18}, 90%, 12%)`);
  gradient.addColorStop(1, '#050712');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = 0.32;
  for (let i = 0; i < 16; i++) {
    const x = (Math.sin(frame * 0.018 + i) * 240) + 360;
    const y = ((frame * (1.2 + i * 0.08)) + i * 110) % h;
    ctx.beginPath();
    ctx.arc(x, y, 2 + (i % 4), 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(w / 2, h * 0.35);
  ctx.rotate(frame * 0.002);
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 120 + i * 55, 42 + i * 22, i * 0.45, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  const bottom = ctx.createLinearGradient(0, h * 0.45, 0, h);
  bottom.addColorStop(0, 'rgba(0,0,0,0)');
  bottom.addColorStop(1, 'rgba(0,0,0,0.92)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundRect(ctx, 52, 72, 280, 58, 29);
  ctx.fill();

  ctx.fillStyle = '#2eff9b';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`CENA ${sceneNumber + 1}/${currentScenes.length}`, 82, 110);

  if (captionsVisible) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px Arial';
    ctx.textAlign = 'center';
    wrapText(ctx, scene, w / 2, h - 260, w - 90, 62);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Vídeo IA Studio', w / 2, h - 72);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = cleanText(text).split(' ');
  let line = '';
  const lines = [];

  words.forEach(word => {
    const testLine = `${line}${word} `;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = `${word} `;
    } else {
      line = testLine;
    }
  });
  lines.push(line);

  const finalLines = lines.slice(-5);
  finalLines.forEach((textLine, index) => {
    ctx.strokeStyle = 'rgba(0,0,0,0.78)';
    ctx.lineWidth = 10;
    ctx.strokeText(textLine.trim(), x, y + index * lineHeight);
    ctx.fillText(textLine.trim(), x, y + index * lineHeight);
  });
}

async function exportWebM() {
  if (!currentScenes.length) await generateVideo();

  if (!renderCanvas.captureStream || !window.MediaRecorder) {
    alert('Seu navegador não suporta exportação de vídeo. Tente no Chrome ou Edge.');
    return;
  }

  const mimeType = getSupportedMimeType();
  if (!mimeType) {
    alert('Formato WebM não suportado neste navegador. Tente no Chrome ou Edge.');
    return;
  }

  setState('Gerando arquivo de vídeo...');
  clearInterval(sceneTimer);

  const ctx = renderCanvas.getContext('2d');
  const fps = 30;
  const framesPerScene = 120;
  const totalFrames = currentScenes.length * framesPerScene;
  let frame = 0;

  drawExportFrame(ctx, currentScenes[0], 0, 0);

  const stream = renderCanvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];

  recorder.ondataavailable = event => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };

  recorder.onerror = () => {
    setState('Erro ao exportar');
    alert('Erro ao gerar vídeo. Tente novamente no Chrome.');
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType });
    if (!blob.size) {
      setState('Arquivo vazio');
      alert('O vídeo saiu vazio. Tente novamente no Chrome ou Edge.');
      playPreview();
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'video-ia-studio.webm';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setState('Vídeo exportado');
    playPreview();
  };

  recorder.start(250);

  const exportTimer = setInterval(() => {
    const activeScene = Math.floor(frame / framesPerScene) % currentScenes.length;
    drawExportFrame(ctx, currentScenes[activeScene], frame, activeScene);
    frame++;

    if (frame >= totalFrames) {
      clearInterval(exportTimer);
      recorder.stop();
    }
  }, 1000 / fps);
}

function saveProject() {
  localStorage.setItem('videoIAStudioProject', JSON.stringify({
    input: input.value,
    script: currentScript,
    captionsVisible,
    lang: currentLang
  }));
}

function loadProject() {
  const saved = localStorage.getItem('videoIAStudioProject');
  if (!saved) return false;

  try {
    const project = JSON.parse(saved);
    input.value = project.input || input.value;
    currentScript = project.script || '';
    captionsVisible = project.captionsVisible ?? true;
    currentLang = project.lang || 'pt-BR';
    languageBtn.textContent = currentLang;
    if (currentScript) scriptOutput.value = currentScript;
    return true;
  } catch {
    return false;
  }
}

function showTab(tab) {
  document.querySelectorAll('.bottom-nav button').forEach(button => {
    button.classList.toggle('active', button.dataset.tab === tab);
  });

  const messages = {
    home: 'Tela inicial',
    projects: 'Projeto salvo no navegador',
    voices: `Voz ativa: ${currentLang}`,
    settings: 'Configurações locais'
  };
  setState(messages[tab] || 'IA pronta');
}

function toggleLanguage() {
  currentLang = currentLang === 'pt-BR' ? 'en-US' : 'pt-BR';
  languageBtn.textContent = currentLang;
  saveProject();
  setState(`Idioma: ${currentLang}`);
}

generateBtn.addEventListener('click', generateVideo);
mediaBtn.addEventListener('click', loadMedia);
voiceBtn.addEventListener('click', speakScript);
captionBtn.addEventListener('click', toggleCaptions);
exportBtn.addEventListener('click', exportWebM);
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(scriptOutput.value);
    setState('Roteiro copiado');
  } catch {
    scriptOutput.select();
    setState('Selecione e copie o roteiro');
  }
});
languageBtn.addEventListener('click', toggleLanguage);

document.getElementById('featureMedia').addEventListener('click', loadMedia);
document.getElementById('featureVoice').addEventListener('click', speakScript);
document.getElementById('featureCaptions').addEventListener('click', toggleCaptions);
document.getElementById('featureExport').addEventListener('click', exportWebM);

document.querySelectorAll('.bottom-nav button').forEach(button => {
  button.addEventListener('click', () => showTab(button.dataset.tab));
});

if (!loadProject()) {
  input.value = 'Mistérios do universo que a ciência ainda não conseguiu explicar';
}

generateVideo();
