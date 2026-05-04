const input = document.getElementById('scriptInput');
const generateBtn = document.getElementById('generateBtn');
const voiceBtn = document.getElementById('voiceBtn');
const scriptOutput = document.getElementById('scriptOutput');
const captionText = document.getElementById('captionText');
const sceneImage = document.getElementById('sceneImage');
const videoStatus = document.getElementById('videoStatus');
const timeline = document.getElementById('timeline');

let currentScript = '';
let currentScenes = [];
let sceneIndex = 0;
let sceneTimer = null;

const fallbackThemes = [
  'inteligência artificial futurista',
  'universo cinematográfico',
  'cidade tecnológica neon',
  'criador de conteúdo gravando vídeo'
];

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
  const stopwords = ['sobre', 'para', 'com', 'uma', 'que', 'isso', 'esse', 'essa', 'você', 'crie', 'vídeo', 'roteiro'];
  const words = cleanText(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .split(' ')
    .filter(word => word.length > 3 && !stopwords.includes(word));

  return words.slice(0, 5).join(' ') || fallbackThemes[Math.floor(Math.random() * fallbackThemes.length)];
}

function imageUrl(query, index) {
  const encoded = encodeURIComponent(query);
  return `https://source.unsplash.com/720x1280/?${encoded}&sig=${Date.now()}-${index}`;
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
  const keywords = extractKeywords(scene);

  captionText.textContent = scene;
  sceneImage.src = imageUrl(keywords, sceneIndex);
  sceneImage.style.display = 'block';
  videoStatus.textContent = `Cena ${sceneIndex + 1}/${currentScenes.length}`;
  renderTimeline(sceneIndex);
}

function playPreview() {
  clearInterval(sceneTimer);
  showScene(0);

  sceneTimer = setInterval(() => {
    showScene(sceneIndex + 1);
  }, 4500);
}

function generateVideo() {
  const raw = cleanText(input.value);

  if (!raw) {
    input.focus();
    captionText.textContent = 'Digite um tema ou cole um roteiro primeiro.';
    videoStatus.textContent = 'Aguardando texto';
    return;
  }

  currentScript = isProbablyTheme(raw) ? createScriptFromTheme(raw) : raw;
  currentScenes = splitIntoScenes(currentScript);

  scriptOutput.textContent = currentScript;
  videoStatus.textContent = 'Gerando cenas...';
  playPreview();
}

function speakScript() {
  if (!currentScript) generateVideo();
  if (!currentScript || !('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(currentScript);
  utterance.lang = 'pt-BR';
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

generateBtn.addEventListener('click', generateVideo);
voiceBtn.addEventListener('click', speakScript);

input.value = 'Mistérios do universo que a ciência ainda não conseguiu explicar';
generateVideo();
