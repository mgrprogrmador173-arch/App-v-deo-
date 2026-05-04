# Vídeo IA Studio

Aplicativo web inspirado no fluxo de criação do InVideo.ai.

## O que ele faz

- Recebe um tema ou roteiro.
- Gera um roteiro curto automaticamente quando o usuário digita apenas um tema.
- Busca imagens gratuitas em Wikimedia Commons, Openverse e NASA Image Library.
- Usa `origin=*`, `crossOrigin='anonymous'`, preload e fallback visual para reduzir erros de CORS.
- Cria narração grátis de prévia usando a voz do navegador.
- Aceita upload de áudio local em MP3, WAV ou outro formato suportado pelo navegador.
- Aceita endpoint TTS opcional, como um backend com Edge TTS, Piper, Coqui ou outro serviço que retorne áudio.
- Exporta WebM sem voz ou com áudio local/TTS capturado de um elemento `<audio>`.
- Gera legendas automáticas a partir do roteiro.
- Mostra uma prévia vertical 9:16 pronta para TikTok, Reels e Shorts.

## Como usar

Abra o arquivo `index.html` no navegador ou publique pelo GitHub Pages.

Fluxo recomendado:

1. Digite um tema ou cole um roteiro.
2. Escolha a duração: 10, 15 ou 30 segundos.
3. Escolha a fonte de mídia.
4. Clique em **Gerar roteiro e vídeo**.
5. Para narração real no arquivo final, envie um áudio local ou informe um endpoint TTS.
6. Clique em **Exportar com áudio**.

## Sobre narração

A voz grátis do navegador, `speechSynthesis`, funciona apenas como prévia. Ela não gera um arquivo de áudio direto. Para exportar o vídeo com voz, use uma destas opções:

- Upload de áudio local.
- Endpoint TTS que retorne áudio.
- Backend com Edge TTS, Piper TTS ou Coqui TTS.

## Sobre imagens

Fontes adicionadas:

- Wikimedia Commons.
- Openverse.
- NASA Image Library.
- Visual local como reserva.

Se uma imagem externa for bloqueada por CORS, o app usa automaticamente um visual local.

## Limitações atuais

- A exportação final é WebM, não MP4.
- Para MP4 profissional, o ideal é adicionar FFmpeg no backend ou ffmpeg.wasm.
- O GitHub Pages não executa backend, então Edge TTS real precisa estar em outro serviço.

## Próximos passos recomendados

1. Criar backend com Edge TTS para gerar MP3 automaticamente.
2. Adicionar FFmpeg ou ffmpeg.wasm para exportar MP4.
3. Integrar Pexels API ou Pixabay API com chave.
4. Salvar projetos do usuário.
5. Adicionar exportação em 9:16, 1:1 e 16:9.
