// =======================
// Tinder Food — app.js (Connecté au serveur Node MySQL)
// =======================

// Sélecteurs du DOM
const imgLeft = document.getElementById("imgLeft");
const imgRight = document.getElementById("imgRight");
const descLeft = document.getElementById("descLeft");
const descRight = document.getElementById("descRight");
const progressEl = document.getElementById("progress");
const chooseBtn = document.getElementById("chooseBtn");
const resetBtn = document.getElementById("resetBtn");
const pair = document.getElementById("pair");

const matchScreen = document.getElementById("matchScreen");
const winnerImage = document.getElementById("winnerImage");
const winnerText = document.getElementById("winnerText");
const closeMatch = document.getElementById("closeMatch");

// Variables globales
let IMAGES = []; 
let champion;
let challenger;
let nextIndex = 2;
let finished = false;

function testImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = url;
    // Si l'image charge bien, on renvoie TRUE
    img.onload = () => resolve(true);
    // Si l'image plante (404), on renvoie FALSE
    img.onerror = () => resolve(false);
  });
}

// ==========================================
// REMPLACE TOUTE LA FONCTION initGame PAR CELLE-CI
// ==========================================
// app.js (Version simplifiée après nettoyage BDD)

async function initGame() {
  try {
    progressEl.textContent = "Chargement...";
    
    // 1. On récupère la liste (qui est maintenant propre en BDD)
    const response = await fetch('/api/dishes'); 
    const rawData = await response.json();
    
    // 2. On peut mélanger direct
    IMAGES = rawData.sort(() => Math.random() - 0.5);

    // 3. C'est tout !
    console.log(`${IMAGES.length} restaurants chargés.`);
    
    champion = IMAGES[0];
    challenger = IMAGES[1];
    nextIndex = 2;
    showImages();

  } catch (error) {
    console.error(error);
  }
}

// 2. Affiche les images actuelles
function showImages() {
  if (!champion || !challenger) return;

  imgLeft.src = champion.photo_url;
  imgRight.src = challenger.photo_url;

  descLeft.innerHTML = `
      <strong style="font-size:1.2em;">${champion.name}</strong><br>
      <span style="color:#666;">${champion.Food}</span><br>
      📍 ${champion.Zipcode} Paris
  `;

  descRight.innerHTML = `
      <strong style="font-size:1.2em;">${challenger.name}</strong><br>
      <span style="color:#666;">${challenger.Food}</span><br>
      📍 ${challenger.Zipcode} Paris
  `;
  
  progressEl.textContent = `Duel ${nextIndex - 1}/${IMAGES.length - 1}`;
}

// 3. Animation du choix (Swipe)
function animateChoice(side) {
  const chosen = document.querySelector(`.dish[data-side="${side}"]`);
  chosen.classList.add(side === "left" ? "fly-over-right" : "fly-over-left");

  setTimeout(() => {
    chosen.classList.remove("fly-over-right", "fly-over-left");
    nextDuel(side);
  }, 400);
}

// 4. Logique du tournoi
function nextDuel(side) {
  champion = side === "left" ? champion : challenger;
  
  if (nextIndex < IMAGES.length) {
    challenger = IMAGES[nextIndex++];
    showImages();
  } else {
    endTournament();
  }
}

// 5. Fin du jeu
function endTournament() {
  finished = true;
  progressEl.textContent = "C’est un match ❤️";
  chooseBtn.disabled = true;
  showMatchScreen();
}

// 6. Affichage écran final + Confettis
function showMatchScreen() {
  winnerImage.src = champion.photo_url;
  winnerText.innerHTML = `C’est un match avec <br><span style="color:#ff3366;">${champion.desc}</span> !`;
  matchScreen.classList.add("active");
  launchConfetti();
}

function launchConfetti() {
  if (typeof confetti === "function") {
    const duration = 3 * 1000;
    const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }
}

// === EVENT LISTENERS ===
closeMatch.addEventListener("click", () => {
  matchScreen.classList.remove("active");
  location.reload(); 
});

document.querySelector('.dish[data-side="left"]').addEventListener('click', () => { if (!finished) animateChoice('left'); });
document.querySelector('.dish[data-side="right"]').addEventListener('click', () => { if (!finished) animateChoice('right'); });

// Swipe Tactile
let startX = null;
pair.addEventListener("touchstart", e => startX = e.touches[0].clientX);
pair.addEventListener("touchend", e => {
  if (startX === null) return;
  const dx = e.changedTouches[0].clientX - startX;
  if (Math.abs(dx) < 60) return;
  if (dx < 0) animateChoice("left");
  else animateChoice("right");
  startX = null;
});

chooseBtn.addEventListener("click", endTournament); 
resetBtn.addEventListener("click", () => location.reload());

// === LANCEMENT ===
initGame();