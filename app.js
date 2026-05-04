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
let currentMedia = [];
let sceneIndex = 0;
let sceneTimer = null;
let captionsVisible = true;
let currentLang = 'pt-BR';

const fallbackMedia = [
  'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=720&q=80',
  'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=720&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=720&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=720&q=80'
];

function setState(message) {
  appState.textContent = message;
  videoStatus.textContent = message;
}

function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim();
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
  const chunkSize = Math.ceil(words.length / 4);
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
    gsrsearch: `${query} filetype:bitmap|drawing|video`,
    gsrnamespace: '6',
    gsrlimit: '12',
    prop: 'imageinfo',
    iiprop: 'url|mime|thumburl',
    iiurlwidth: '720',
    format: 'json'
  });

  const response = await fetch(`${api}?${params}`);
  const data = await response.json();
  const pages = data?.query?.pages ? Object.values(data.query.pages) : [];

  return pages
    .map(page => {
      const info = page.imageinfo?.[0];
      if (!info) return null;
      return {
        title: page.title,
        type: info.mime?.startsWith('video') ? 'video' : 'image',
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

  currentMedia.slice(0, 6).forEach((item, index) => {
    const card = document.createElement('button');
    card.className = 'media-item';
    card.title = item.title;

    if (item.type === 'video') {
      const video = document.createElement('video');
      video.src = item.src;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      card.appendChild(video);
      card.addEventListener('mouseenter', () => video.play().catch(() => {}));
    } else {
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.title;
      card.appendChild(img);
    }

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
  sceneImage.style.display = 'none';
  sceneVideo.style.display = 'none';
  sceneVideo.pause();

  if (media?.type === 'video') {
    sceneVideo.src = media.src;
    sceneVideo.style.display = 'block';
    sceneVideo.play().catch(() => {});
  } else {
    sceneImage.src = media?.src || fallbackMedia[sceneIndex % fallbackMedia.length];
    sceneImage.style.display = 'block';
  }

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
  setState('Vídeo gerado');
  playPreview();
  saveProject();
}

function speakScript() {
  if (!currentScript) {
    currentScript = cleanText(scriptOutput.value || input.value);
  }

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

function drawCurrentFrame(ctx) {
  ctx.fillStyle = '#070815';
  ctx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);

  const source = sceneVideo.style.display === 'block' ? sceneVideo : sceneImage;

  try {
    const sw = source.videoWidth || source.naturalWidth || 720;
    const sh = source.videoHeight || source.naturalHeight || 1280;
    const scale = Math.max(renderCanvas.width / sw, renderCanvas.height / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    const dx = (renderCanvas.width - dw) / 2;
    const dy = (renderCanvas.height - dh) / 2;
    ctx.drawImage(source, dx, dy, dw, dh);
  } catch (error) {
    ctx.fillStyle = '#11142a';
    ctx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
  }

  const gradient = ctx.createLinearGradient(0, 500, 0, 1280);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.92)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 720, 1280);

  if (captionsVisible) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    wrapText(ctx, captionText.textContent, 360, 1080, 640, 58);
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
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

  lines.slice(-4).forEach((textLine, index) => {
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.lineWidth = 8;
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

  setState('Exportando vídeo...');
  clearInterval(sceneTimer);

  const ctx = renderCanvas.getContext('2d');
  const stream = renderCanvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks = [];

  recorder.ondataavailable = event => {
    if (event.data.size) chunks.push(event.data);
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'video-ia-studio.webm';
    link.click();
    URL.revokeObjectURL(url);
    setState('Vídeo exportado');
    playPreview();
  };

  recorder.start();

  let frame = 0;
  const totalFrames = currentScenes.length * 120;
  const exportTimer = setInterval(() => {
    const nextIndex = Math.floor(frame / 120) % currentScenes.length;
    if (nextIndex !== sceneIndex) showScene(nextIndex);
    drawCurrentFrame(ctx);
    frame++;

    if (frame >= totalFrames) {
      clearInterval(exportTimer);
      recorder.stop();
    }
  }, 1000 / 30);
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
  await navigator.clipboard.writeText(scriptOutput.value);
  setState('Roteiro copiado');
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
