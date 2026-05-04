document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('scriptInput');
  const durationSelect = document.getElementById('durationSelect');
  const mediaProvider = document.getElementById('mediaProvider');
  const audioInput = document.getElementById('audioInput');
  const audioPreview = document.getElementById('audioPreview');
  const ttsEndpoint = document.getElementById('ttsEndpoint');
  const ttsVoice = document.getElementById('ttsVoice');
  const generateBtn = document.getElementById('generateBtn');
  const mediaBtn = document.getElementById('mediaBtn');
  const voiceBtn = document.getElementById('voiceBtn');
  const ttsBtn = document.getElementById('ttsBtn');
  const captionBtn = document.getElementById('captionBtn');
  const exportBtn = document.getElementById('exportBtn');
  const exportAudioBtn = document.getElementById('exportAudioBtn');
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

  const PEXELS_API_KEY = 'pWIQG969OLwWzU0jQENDVlnbCLFzf0nnMvNTdL5RuwQOBRdmK2Wctb5q';

  let currentScript = '';
  let currentScenes = [];
  let currentMedia = [];
  let loadedImages = [];
  let sceneIndex = 0;
  let sceneTimer = null;
  let captionsVisible = true;
  let currentLang = 'pt-BR';
  let selectedTheme = 0;
  let uploadedAudioUrl = '';

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

  function getDuration() {
    return Number(durationSelect.value || 15);
  }

  function sceneCountByDuration() {
    const duration = getDuration();
    if (duration === 10) return 3;
    if (duration === 15) return 4;
    return 6;
  }

  function createScriptFromTheme(theme) {
    const duration = getDuration();
    if (duration === 10) {
      return `Você já imaginou ${theme} acontecendo diante dos seus olhos? Em poucos segundos, essa ideia revela algo surpreendente. Olhe com atenção, porque o final muda tudo.`;
    }
    if (duration === 15) {
      return `Você já parou para pensar em ${theme}? Essa ideia parece simples, mas esconde detalhes impressionantes. A cada cena, a história fica mais curiosa. E no final, você entende por que esse tema chama tanta atenção.`;
    }
    return `Você já parou para pensar em ${theme}? Esse tema parece comum no começo, mas quanto mais observamos, mais detalhes aparecem. Primeiro, existe uma pergunta que prende a atenção. Depois, surgem imagens, pistas e possibilidades que deixam tudo mais interessante. A inteligência artificial transforma essa ideia em cenas, narração e legendas. E no final, o vídeo fica pronto para prender a atenção em poucos segundos.`;
  }

  function splitIntoScenes(script) {
    const wanted = sceneCountByDuration();
    const parts = cleanText(script).split(/(?<=[.!?])\s+/).filter(Boolean);
    if (parts.length >= wanted) return parts.slice(0, wanted);

    const words = cleanText(script).split(' ');
    const size = Math.max(1, Math.ceil(words.length / wanted));
    return Array.from({ length: wanted }, (_, i) => words.slice(i * size, (i + 1) * size).join(' ')).filter(Boolean);
  }

  function isTheme(text) {
    return cleanText(text).split(' ').length <= 12 || !/[.!?]/.test(text);
  }

  function extractKeywords(text) {
    const stop = ['sobre','para','com','uma','que','isso','esse','essa','voce','você','crie','video','vídeo','roteiro','pode','como','mais','esta','este','tema'];
    const words = cleanText(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')
      .filter(w => w.length > 3 && !stop.includes(w));
    return words.slice(0, 4).join(' ') || 'technology space';
  }

  async function searchPexelsPhotos(query) {
    const params = new URLSearchParams({ query, per_page: '12', orientation: 'portrait' });
    const response = await fetch(`https://api.pexels.com/v1/search?${params}`, {
      headers: { Authorization: PEXELS_API_KEY }
    });
    if (!response.ok) throw new Error('Falha no Pexels fotos');
    const data = await response.json();
    return (data.photos || []).map(photo => ({
      type: 'image',
      src: photo.src?.portrait || photo.src?.large || photo.src?.original,
      title: photo.alt || photo.photographer || 'Pexels foto',
      provider: 'Pexels Fotos'
    })).filter(item => item.src);
  }

  async function searchPexelsVideos(query) {
    const params = new URLSearchParams({ query, per_page: '12', orientation: 'portrait' });
    const response = await fetch(`https://api.pexels.com/videos/search?${params}`, {
      headers: { Authorization: PEXELS_API_KEY }
    });
    if (!response.ok) throw new Error('Falha no Pexels vídeos');
    const data = await response.json();
    return (data.videos || []).map(video => {
      const files = video.video_files || [];
      const vertical = files
        .filter(file => file.link && file.width && file.height && file.height >= file.width)
        .sort((a, b) => (a.width || 0) - (b.width || 0))[0];
      const any = files.find(file => file.link);
      const file = vertical || any;
      if (!file?.link) return null;
      return {
        type: 'video',
        src: file.link,
        poster: video.image,
        title: video.user?.name || 'Pexels vídeo',
        provider: 'Pexels Vídeos'
      };
    }).filter(Boolean);
  }

  async function searchPexelsMixed(query) {
    const [videos, photos] = await Promise.allSettled([
      searchPexelsVideos(query),
      searchPexelsPhotos(query)
    ]);
    return [
      ...(videos.status === 'fulfilled' ? videos.value : []),
      ...(photos.status === 'fulfilled' ? photos.value : [])
    ];
  }

  async function searchWikimedia(query) {
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
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
    if (!response.ok) throw new Error('Falha no Wikimedia');
    const data = await response.json();
    const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
    return pages.map(page => {
      const info = page.imageinfo?.[0];
      if (!info || !info.mime?.startsWith('image')) return null;
      return { type: 'image', src: info.thumburl || info.url, title: page.title, provider: 'Wikimedia' };
    }).filter(Boolean);
  }

  async function searchOpenverse(query) {
    const params = new URLSearchParams({ q: query, page_size: '12', mature: 'false' });
    const response = await fetch(`https://api.openverse.org/v1/images/?${params}`);
    if (!response.ok) throw new Error('Falha no Openverse');
    const data = await response.json();
    return (data.results || []).map(item => {
      const src = item.thumbnail || item.url;
      if (!src) return null;
      return { type: 'image', src, title: item.title || 'Openverse', provider: 'Openverse' };
    }).filter(Boolean);
  }

  async function searchNasa(query) {
    const params = new URLSearchParams({ q: query, media_type: 'image' });
    const response = await fetch(`https://images-api.nasa.gov/search?${params}`);
    if (!response.ok) throw new Error('Falha na NASA');
    const data = await response.json();
    return (data.collection?.items || []).slice(0, 12).map(item => {
      const link = (item.links || []).find(l => l.render === 'image' || l.href);
      if (!link?.href) return null;
      return { type: 'image', src: link.href, title: item.data?.[0]?.title || 'NASA', provider: 'NASA' };
    }).filter(Boolean);
  }

  function renderVisualCard(index) {
    const colors = themes[(index + selectedTheme) % themes.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${colors[0]}"/><stop offset=".55" stop-color="${colors[1]}"/><stop offset="1" stop-color="${colors[2]}"/></linearGradient><filter id="b"><feGaussianBlur stdDeviation="20"/></filter></defs><rect width="720" height="1280" fill="url(#g)"/><circle cx="${160 + index * 65}" cy="260" r="160" fill="rgba(255,255,255,.18)" filter="url(#b)"/><circle cx="560" cy="${790 - index * 40}" r="230" fill="rgba(0,0,0,.28)" filter="url(#b)"/><g fill="rgba(255,255,255,.5)"><circle cx="90" cy="160" r="4"/><circle cx="220" cy="320" r="3"/><circle cx="620" cy="210" r="5"/><circle cx="510" cy="490" r="3"/><circle cx="140" cy="710" r="4"/><circle cx="610" cy="930" r="5"/></g><text x="360" y="610" fill="white" font-size="56" font-family="Arial" font-weight="800" text-anchor="middle">Cena ${index + 1}</text><text x="360" y="680" fill="rgba(255,255,255,.82)" font-size="30" font-family="Arial" text-anchor="middle">Vídeo IA Studio</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  function localMediaList() {
    return Array.from({ length: Math.max(6, sceneCountByDuration()) }, (_, i) => ({ type: 'image', src: renderVisualCard(i), title: `Visual ${i + 1}`, provider: 'Visual local' }));
  }

  function loadImageSafe(src, index = 0) {
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      img.onload = () => resolve(img);
      img.onerror = () => {
        const fallback = new Image();
        fallback.onload = () => resolve(fallback);
        fallback.src = renderVisualCard(index);
      };
      img.src = src;
    });
  }

  async function preloadImages() {
    setState('Pré-carregando imagens...');
    loadedImages = await Promise.all(
      currentMedia.slice(0, Math.max(1, currentScenes.length)).map((item, index) => {
        const src = item.type === 'video' ? item.poster || renderVisualCard(index) : item.src;
        return loadImageSafe(src, index);
      })
    );
    setState('Imagens prontas');
  }

  async function loadMedia() {
    const provider = mediaProvider.value;
    const query = extractKeywords(input.value || currentScript);
    setState('Buscando mídias grátis...');

    const attempts = [];
    if (provider === 'auto') attempts.push(searchPexelsMixed, searchPexelsPhotos, searchNasa, searchWikimedia, searchOpenverse);
    if (provider === 'pexels') attempts.push(searchPexelsMixed);
    if (provider === 'pexels-videos') attempts.push(searchPexelsVideos, searchPexelsPhotos);
    if (provider === 'pexels-photos') attempts.push(searchPexelsPhotos);
    if (provider === 'openverse') attempts.push(searchOpenverse);
    if (provider === 'nasa') attempts.push(searchNasa);
    if (provider === 'wikimedia') attempts.push(searchWikimedia);

    if (provider === 'local') {
      currentMedia = localMediaList();
      mediaSource.textContent = 'Visual local';
      renderMediaGrid();
      await preloadImages();
      setState('Mídias locais prontas');
      return;
    }

    for (const search of attempts) {
      try {
        const found = await search(query);
        if (found.length) {
          currentMedia = found;
          mediaSource.textContent = found[0].provider || 'Fonte grátis';
          renderMediaGrid();
          await preloadImages();
          setState(`Mídias prontas: ${mediaSource.textContent}`);
          return;
        }
      } catch (error) {
        console.warn(error.message);
      }
    }

    currentMedia = localMediaList();
    mediaSource.textContent = 'Visual local';
    renderMediaGrid();
    await preloadImages();
    setState('Mídias locais prontas');
  }

  function renderMediaGrid() {
    mediaGrid.innerHTML = '';
    currentMedia.slice(0, 9).forEach((item, i) => {
      const btn = document.createElement('button');
      btn.className = 'media-item';
      btn.type = 'button';
      if (item.type === 'video') {
        const video = document.createElement('video');
        video.src = item.src;
        video.poster = item.poster || '';
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';
        video.addEventListener('mouseenter', () => video.play().catch(() => null));
        video.addEventListener('touchstart', () => video.play().catch(() => null));
        btn.appendChild(video);
      } else {
        const img = document.createElement('img');
        img.crossOrigin = 'anonymous';
        img.referrerPolicy = 'no-referrer';
        img.src = item.src;
        img.alt = item.title || `Mídia ${i + 1}`;
        img.onerror = () => { img.src = renderVisualCard(i); };
        btn.appendChild(img);
      }
      btn.addEventListener('click', async () => {
        currentMedia[sceneIndex] = item;
        loadedImages[sceneIndex] = await loadImageSafe(item.type === 'video' ? item.poster || renderVisualCard(sceneIndex) : item.src, sceneIndex);
        showScene(sceneIndex);
        setState(`Mídia ${i + 1} selecionada`);
      });
      mediaGrid.appendChild(btn);
    });
  }

  function buildProject() {
    const raw = cleanText(input.value);
    if (!raw) {
      setState('Digite um tema primeiro');
      captionText.textContent = 'Digite um tema ou roteiro para começar.';
      return false;
    }
    currentScript = isTheme(raw) ? createScriptFromTheme(raw) : raw;
    currentScenes = splitIntoScenes(currentScript);
    scriptOutput.value = currentScript;
    return true;
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
    const item = currentMedia[sceneIndex % Math.max(1, currentMedia.length)] || localMediaList()[sceneIndex];
    sceneImage.style.display = 'none';
    sceneVideo.style.display = 'none';
    sceneVideo.pause();

    if (item.type === 'video') {
      sceneVideo.crossOrigin = 'anonymous';
      sceneVideo.src = item.src;
      sceneVideo.poster = item.poster || '';
      sceneVideo.style.display = 'block';
      sceneVideo.play().catch(() => {
        sceneImage.src = item.poster || renderVisualCard(sceneIndex);
        sceneImage.style.display = 'block';
        sceneVideo.style.display = 'none';
      });
    } else {
      sceneImage.crossOrigin = 'anonymous';
      sceneImage.referrerPolicy = 'no-referrer';
      sceneImage.onerror = () => { sceneImage.src = renderVisualCard(sceneIndex); };
      sceneImage.src = item.src;
      sceneImage.style.display = 'block';
    }

    captionText.textContent = captionsVisible ? currentScenes[sceneIndex] : '';
    videoStatus.textContent = `Cena ${sceneIndex + 1}/${currentScenes.length}`;
    renderTimeline();
  }

  function playPreview() {
    clearInterval(sceneTimer);
    showScene(0);
    const secondsPerScene = (getDuration() / Math.max(1, currentScenes.length)) * 1000;
    sceneTimer = setInterval(() => showScene(sceneIndex + 1), secondsPerScene);
  }

  async function generateVideo() {
    try {
      if (!buildProject()) return;
      await loadMedia();
      playPreview();
      setState(`Prévia gerada: ${getDuration()}s`);
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
    voice.rate = getDuration() === 10 ? 1.12 : getDuration() === 30 ? 0.95 : 1;
    window.speechSynthesis.speak(voice);
    setState('Narrando grátis no navegador');
  }

  async function generateTTS() {
    if (!currentScript && !buildProject()) return;
    const endpoint = cleanText(ttsEndpoint.value);
    if (!endpoint) {
      alert('Cole um endpoint TTS. Exemplo: backend com Edge TTS retornando MP3.');
      return;
    }

    try {
      setState('Gerando áudio TTS...');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentScript, voice: ttsVoice.value, lang: currentLang })
      });
      if (!response.ok) throw new Error('Endpoint TTS falhou');
      const blob = await response.blob();
      uploadedAudioUrl = URL.createObjectURL(blob);
      audioPreview.src = uploadedAudioUrl;
      audioPreview.load();
      setState('Áudio TTS pronto');
    } catch (error) {
      setState('Erro no TTS');
      alert(error.message);
    }
  }

  function toggleCaptions() {
    captionsVisible = !captionsVisible;
    captionBtn.textContent = captionsVisible ? 'Legendas' : 'Sem legenda';
    showScene(sceneIndex);
    setState(captionsVisible ? 'Legendas ligadas' : 'Legendas desligadas');
  }

  function drawImageCover(ctx, img, w, h) {
    try {
      const scale = Math.max(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    } catch {
      const colors = themes[selectedTheme % themes.length];
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(.55, colors[1]);
      grad.addColorStop(1, colors[2]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function drawFrame(ctx, frame) {
    const fps = 30;
    const totalFrames = getDuration() * fps;
    const framesPerScene = Math.max(1, Math.floor(totalFrames / Math.max(1, currentScenes.length)));
    const scene = Math.min(currentScenes.length - 1, Math.floor(frame / framesPerScene));
    const w = renderCanvas.width;
    const h = renderCanvas.height;
    const p = (frame % framesPerScene) / framesPerScene;
    const img = loadedImages[scene % Math.max(1, loadedImages.length)];

    ctx.fillStyle = '#050712';
    ctx.fillRect(0, 0, w, h);
    if (img) drawImageCover(ctx, img, w, h);

    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(140 + scene * 55 + p * 110, 240, 140, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    const fade = Math.min(1, p * 4, (1 - p) * 4);
    ctx.fillStyle = `rgba(0,0,0,${0.22 * (1 - fade)})`;
    ctx.fillRect(0, 0, w, h);

    const bottom = ctx.createLinearGradient(0, h * .45, 0, h);
    bottom.addColorStop(0, 'rgba(0,0,0,0)');
    bottom.addColorStop(1, 'rgba(0,0,0,.86)');
    ctx.fillStyle = bottom;
    ctx.fillRect(0, 0, w, h);

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
    ctx.fillText(`Vídeo IA Studio • ${getDuration()}s`, w / 2, h - 70);
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

  async function exportVideo(withAudio = false) {
    if (!currentScenes.length && !buildProject()) return;
    if (!loadedImages.length) await preloadImages();
    if (!window.MediaRecorder || !renderCanvas.captureStream) {
      alert('Exportação não suportada neste navegador. Use Chrome ou Edge.');
      return;
    }

    const type = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus' : 'video/webm';
    const canvasStream = renderCanvas.captureStream(30);
    const outputStream = new MediaStream(canvasStream.getVideoTracks());
    let exportAudio = null;

    if (withAudio) {
      if (!audioPreview.src) {
        alert('Adicione um MP3 local ou gere áudio TTS primeiro.');
        return;
      }
      exportAudio = new Audio(audioPreview.src);
      exportAudio.crossOrigin = 'anonymous';
      exportAudio.currentTime = 0;
      exportAudio.volume = 1;
      await exportAudio.play().catch(() => null);
      exportAudio.pause();
      exportAudio.currentTime = 0;
      const audioStream = exportAudio.captureStream ? exportAudio.captureStream() : exportAudio.mozCaptureStream?.();
      if (!audioStream || !audioStream.getAudioTracks().length) {
        alert('Este navegador não conseguiu capturar o áudio. Use Chrome/Edge ou exporte sem voz.');
        return;
      }
      audioStream.getAudioTracks().forEach(track => outputStream.addTrack(track));
    }

    const recorder = new MediaRecorder(outputStream, { mimeType: type });
    const chunks = [];
    const ctx = renderCanvas.getContext('2d');
    let frame = 0;
    const total = getDuration() * 30;

    setState(withAudio ? 'Exportando vídeo com áudio...' : 'Exportando vídeo sem voz...');
    clearInterval(sceneTimer);

    recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      if (exportAudio) exportAudio.pause();
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-ia-studio-${getDuration()}s${withAudio ? '-com-audio' : ''}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setState(withAudio ? 'Vídeo com áudio baixado' : 'Vídeo baixado sem voz');
      playPreview();
    };

    drawFrame(ctx, 0);
    recorder.start(250);
    if (exportAudio) await exportAudio.play();

    const timer = setInterval(() => {
      drawFrame(ctx, frame);
      if (exportAudio) exportAudio.currentTime = Math.min(getDuration(), frame / 30);
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
    document.querySelectorAll('.bottom-nav button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    setState(tab === 'projects' ? 'Projeto salvo localmente' : tab === 'voices' ? `Voz: ${currentLang}` : tab === 'settings' ? 'Ajustes locais' : 'Tela inicial');
  }

  audioInput.addEventListener('change', () => {
    const file = audioInput.files?.[0];
    if (!file) return;
    if (uploadedAudioUrl) URL.revokeObjectURL(uploadedAudioUrl);
    uploadedAudioUrl = URL.createObjectURL(file);
    audioPreview.src = uploadedAudioUrl;
    audioPreview.load();
    exportBtn.textContent = 'Exportar sem voz';
    setState('Áudio local carregado');
  });

  generateBtn.addEventListener('click', generateVideo);
  mediaBtn.addEventListener('click', loadMedia);
  voiceBtn.addEventListener('click', speakScript);
  ttsBtn.addEventListener('click', generateTTS);
  captionBtn.addEventListener('click', toggleCaptions);
  exportBtn.addEventListener('click', () => exportVideo(false));
  exportAudioBtn.addEventListener('click', () => exportVideo(true));
  copyBtn.addEventListener('click', copyScript);
  languageBtn.addEventListener('click', toggleLanguage);
  document.getElementById('featureMedia').addEventListener('click', loadMedia);
  document.getElementById('featureVoice').addEventListener('click', speakScript);
  document.getElementById('featureCaptions').addEventListener('click', toggleCaptions);
  document.getElementById('featureExport').addEventListener('click', () => exportVideo(Boolean(audioPreview.src)));
  document.querySelectorAll('.bottom-nav button').forEach(btn => btn.addEventListener('click', () => showTab(btn.dataset.tab)));

  input.value = localStorage.getItem('videoIAStudioText') || 'Mistérios do universo que a ciência ainda não conseguiu explicar';
  generateVideo();
});
