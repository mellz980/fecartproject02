// index.js

// Caminho para os arquivos do modelo no GitHub Pages
const MODEL_URL = "https://mellz980.github.io/fecartprojetct02/";

// Variáveis globais
let model, webcam, labelContainer, maxPredictions;

document.getElementById("start-btn").addEventListener("click", init);

async function init() {
  try {
    const modelURL = MODEL_URL + "model.json";
    const metadataURL = MODEL_URL + "metadata.json";

    // Carregar o modelo
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    // Configurar a webcam
    const flip = true; // espelhamento para selfie
    webcam = new tmImage.Webcam(400, 300, flip);
    await webcam.setup();
    await webcam.play();
    window.requestAnimationFrame(loop);

    document.getElementById("webcam-container").appendChild(webcam.canvas);

    labelContainer = document.createElement("div");
    document.getElementById("webcam-container").appendChild(labelContainer);

    for (let i = 0; i < maxPredictions; i++) {
      labelContainer.appendChild(document.createElement("div"));
    }

  } catch (error) {
    alert("Erro ao carregar o modelo: " + error);
  }
}

async function loop() {
  webcam.update();
  await predict();
  window.requestAnimationFrame(loop);
}

async function predict() {
  const prediction = await model.predict(webcam.canvas);
  for (let i = 0; i < maxPredictions; i++) {
    const classPrediction = `${prediction[i].className}: ${prediction[i].probability.toFixed(2)}`;
    labelContainer.childNodes[i].innerHTML = classPrediction;
  }
}


