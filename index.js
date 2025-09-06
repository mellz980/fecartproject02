    // === DOM elements ===
  const clickSound = document.getElementById('click-sound');
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const modeloSection = document.getElementById('modelo');
  const inicioSection = document.getElementById('inicio');
  const currentEmotionEl = document.getElementById('current-emotion');
  const scoreDisplay = document.getElementById('score-display');
  const feedback = document.getElementById('feedback');
  const webcamContainer = document.getElementById('webcam-container');
  const finalScreen = document.getElementById('final-screen');
  const finalScore = document.getElementById('final-score');
  const progressBar = document.getElementById('progress-bar');
  const finalCarouselTrack = document.getElementById('final-carousel-track');
  const carouselPrev = document.getElementById('carousel-prev');
  const carouselNext = document.getElementById('carousel-next');
  const finalGallery = document.getElementById('final-gallery');
  const confettiCanvas = document.getElementById('confetti-canvas');
  const rankingList = document.getElementById('ranking-list');
  const usernameInput = document.getElementById('username');
  const finalTime = document.getElementById('final-time'); // faltava isso ✅

  let username = '';
  const emotionsToTest = ["Feliz","Tristeza","Raiva","Nojo","Medo"];
  const emotionEmojis = { Feliz:"😄", Tristeza:"😢", Raiva:"😡", Nojo:"🤢", Medo:"😱"};

  let currentEmotions = [];
  let currentEmotionIndex = 0;
  let score = 0;
  let startTime = 0;
  let capturedImages = [];

  let model = null;
  let webcam = null;

  // === Arduino (opcional) ===
  let port = null;
  let writer = null;
  async function connectArduino() {
    try {
      port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });
      writer = port.writable.getWriter();
      console.log("✅ Arduino conectado!");
    } catch (err) {
      console.warn("Arduino não conectado:", err);
    }
  }
  async function sendToArduino(signal) {
    if (!writer) return;
    try {
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(signal));
    } catch (e) {
      console.warn("Erro ao enviar para Arduino:", e);
    }
  }

  // === Eventos ===
  startBtn.addEventListener('click', async () => {
    connectArduino();
    await init();
  });
  if (restartBtn) restartBtn.addEventListener('click', () => location.reload());
// === Inicialização ===
async function init() {
  if (!usernameInput.value.trim()) {
    alert('Digite seu nome para começar!');
    return;
  }
  username = usernameInput.value.trim();
  clickSound && clickSound.play();
  startBtn.disabled = true;
  startBtn.innerHTML = 'Carregando...';

  try {
    // URL pública do modelo Teachable Machine
   const URL = "./";
    model = await tmImage.load(URL + "model.json", URL + "metadata.json");

    webcam = new tmImage.Webcam(560, 360, true);
    await webcam.setup();
    await webcam.play();

    webcamContainer.innerHTML = '';
    webcamContainer.appendChild(webcam.canvas);

    inicioSection.style.display = 'none';
    document.querySelector('header').style.display = 'none';
    modeloSection.classList.add('active');
    document.getElementById('ranking').style.display = 'none';

    startTime = Date.now();
    score = 0;
    capturedImages = [];
    currentEmotions = shuffleArray([...emotionsToTest]).slice(0,5);
    currentEmotionIndex = 0;
    progressBar.style.width = '0%';
    scoreDisplay.textContent = 'Pontuação: 0';

    runEmotionTest();
  } catch (err) {
    console.error('Erro ao inicializar:', err);
    alert('Erro ao iniciar: ' + (err.message || err));
    startBtn.disabled = false;
    startBtn.innerHTML = 'Começar 🚀';
  }
}

// === Teste das emoções ===
async function runEmotionTest() {
  if (currentEmotionIndex >= currentEmotions.length) {
    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    showFinalScreen(totalTime);
    updateRanking(username, score);
    return;
  }

  const expected = currentEmotions[currentEmotionIndex];
  currentEmotionEl.textContent = `${emotionEmojis[expected]} ${expected.toUpperCase()}`;
  feedback.textContent = '';
  webcamContainer.classList.add('capturing');

  await new Promise(r => setTimeout(r, 1200));
  webcam.update();

  try {
    const imageData = webcam.canvas.toDataURL('image/png');
    capturedImages.push({ src: imageData, emotion: expected });
  } catch (e) {
    console.warn('Não foi possível capturar imagem:', e);
  }

  let prediction = [];
  try {
    prediction = await model.predict(webcam.canvas);
  } catch (e) {
    console.error('Erro na predição:', e);
  }

  const correct = prediction.some(p => p.className.toLowerCase() === expected.toLowerCase() && p.probability >= 0.8);

  if (correct) {
    feedback.textContent = '✅ Acertou! +200 pontos';
    feedback.classList.add('correct');
    feedback.classList.remove('wrong');
    webcamContainer.classList.add('correct');
    webcamContainer.classList.remove('wrong');
    score += 200;
    sendToArduino('1');
  } else {
    feedback.textContent = '❌ Errou!';
    feedback.classList.add('wrong');
    feedback.classList.remove('correct');
    webcamContainer.classList.add('wrong');
    webcamContainer.classList.remove('correct');
    sendToArduino('0');
  }

  scoreDisplay.textContent = 'Pontuação: ' + score;
  progressBar.style.width = `${Math.floor((currentEmotionIndex + 1) / currentEmotions.length * 100)}%`;
  webcamContainer.classList.remove('capturing');

  setTimeout(() => {
    feedback.textContent = '';
    webcamContainer.classList.remove('correct', 'wrong');
    currentEmotionIndex++;
    runEmotionTest();
  }, currentEmotionIndex === 0 ? 4000 : 3000);
}

// === Tela final ===
function showFinalScreen(totalTime) {
  modeloSection.style.display = 'none';
  document.getElementById('ranking').style.display = 'block';
  finalScreen.classList.add('active');

  finalScore.textContent = 'Pontuação final: ' + score + ' pontos';
  finalTime.textContent = 'Tempo: ' + totalTime + 's';
  finalTime.style.display = 'block';

  finalGallery.innerHTML = '';
  finalCarouselTrack.innerHTML = '';
  capturedImages.forEach(img => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `<img src="${img.src}" alt="${img.emotion}"><div class="label">${emotionEmojis[img.emotion]} ${img.emotion.toUpperCase()}</div>`;
    finalGallery.appendChild(div);

    const trackImg = document.createElement('img');
    trackImg.src = img.src;
    trackImg.alt = img.emotion;
    finalCarouselTrack.appendChild(trackImg);
  });

  startConfetti();
  updateCarousel(0);
}

// === Carrossel ===
let idx = 0;
function updateCarousel(n) {
  const items = finalCarouselTrack.children;
  if (!items.length) return;
  idx = (n + items.length) % items.length;
  const offset = -idx * 230;
  finalCarouselTrack.style.transform = `translateX(${offset}px)`;
  for (let i = 0; i < items.length; i++) {
    items[i].classList.toggle('active', i === idx);
  }
}
if (carouselPrev) carouselPrev.addEventListener('click', () => { updateCarousel(idx - 1); clickSound && clickSound.play(); });
if (carouselNext) carouselNext.addEventListener('click', () => { updateCarousel(idx + 1); clickSound && clickSound.play(); });
setInterval(() => { updateCarousel(idx + 1); }, 4000);

// === Ranking ===
function updateRanking(username, newScore) {
  if (!username) return;
  const timestamp = Date.now();
  let ranking = JSON.parse(localStorage.getItem('ranking') || '[]');

  const existing = ranking.find(item => item.name === username);
  if (existing) {
    if (newScore > existing.score || (newScore === existing.score && timestamp < existing.timestamp)) {
      existing.score = newScore;
      existing.timestamp = timestamp;
    }
  } else {
    ranking.push({ name: username, score: newScore, timestamp });
  }

  ranking.sort((a, b) => b.score - a.score || a.timestamp - b.timestamp);
  localStorage.setItem('ranking', JSON.stringify(ranking.slice(0, 5)));
  renderRanking();
}
function renderRanking() {
  let ranking = JSON.parse(localStorage.getItem('ranking') || '[]');
  rankingList.innerHTML = '';
  ranking.forEach((item, i) => {
    const li = document.createElement('li');
    if (i === 0) li.classList.add('gold');
    else if (i === 1) li.classList.add('silver');
    else if (i === 2) li.classList.add('bronze');

    let medal = i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : '';
    li.innerHTML = `${medal}${i + 1}º - ${item.name}: ${item.score} pts`;

    const removeSpan = document.createElement('span');
    removeSpan.textContent = '[remover]';
    removeSpan.classList.add('remove');
    removeSpan.onclick = () => {
      li.classList.add('removing');
      setTimeout(() => {
        ranking.splice(i, 1);
        localStorage.setItem('ranking', JSON.stringify(ranking));
        renderRanking();
      }, 400);
    };

    li.appendChild(removeSpan);
    rankingList.appendChild(li);
  });
}
document.addEventListener('DOMContentLoaded', () => { renderRanking(); });

// === Confete ===
function startConfetti() {
  const canvas = confettiCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const confettiCount = 150;
  const confetti = [];
  const colors = ['#ff6f3c', '#ffd93b', '#2ad1a2', '#ffffff'];

  for (let i = 0; i < confettiCount; i++) {
    confetti.push({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * confettiCount,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 10,
      tiltAngleIncrement: Math.random() * 0.07 + 0.05,
      tiltAngle: 0
    });
  }

  function drawConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confetti.forEach((c) => {
      ctx.beginPath();
      ctx.lineWidth = c.r / 2;
      ctx.strokeStyle = c.color;
      ctx.moveTo(c.x + c.tilt + c.r / 4, c.y);
      ctx.lineTo(c.x + c.tilt, c.y + c.tilt + c.r / 4);
      ctx.stroke();
    });
    updateConfetti();
  }

  function updateConfetti() {
    confetti.forEach((c, i) => {
      c.tiltAngle += c.tiltAngleIncrement;
      c.y += (Math.cos(c.d) + 3 + c.r / 2) / 2;
      c.x += Math.sin(c.d);
      c.tilt = Math.sin(c.tiltAngle) * 15;

      if (c.y > canvas.height) {
        confetti[i] = {
          x: Math.random() * canvas.width,
          y: -10,
          r: c.r,
          d: c.d,
          color: c.color,
          tilt: Math.random() * 10 - 10,
          tiltAngleIncrement: c.tiltAngleIncrement,
          tiltAngle: c.tiltAngle
        };
      }
    });
  }

  function animate() {
    drawConfetti();
    requestAnimationFrame(animate);
  }
  animate();
}

// === Utils ===
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
