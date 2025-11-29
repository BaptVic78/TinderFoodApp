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
async function initGame() {
  try {
    progressEl.textContent = "Chargement et nettoyage...";
    
    // 1. On récupère TOUT depuis le serveur
    const response = await fetch('/api/dishes'); 
    if (!response.ok) throw new Error("Erreur réseau");
    
    const rawData = await response.json();

    // ---------------------------------------------------------
    // ETAPE 2 : On supprime les doublons d'URL (NOUVEAU)
    // ---------------------------------------------------------
    const uniqueData = [];
    const seenUrls = new Set(); // Une "boite" pour noter les URLs déjà vues

    for (const item of rawData) {
      // Si on n'a jamais vu cette URL, on garde le resto
      if (!seenUrls.has(item.src)) {
        seenUrls.add(item.src);
        uniqueData.push(item);
      }
      // Sinon, on ignore (c'est un doublon d'image)
    }
    console.log(`Doublons supprimés : ${rawData.length - uniqueData.length}`);

    // ---------------------------------------------------------
    // ETAPE 3 : On teste les liens (Comme avant)
    // ---------------------------------------------------------
    const validImagesPromises = uniqueData.map(async (item) => {
        const isValid = await testImage(item.src);
        return isValid ? item : null;
    });

    const results = await Promise.all(validImagesPromises);
    IMAGES = results.filter(item => item !== null);

    console.log(`Final : ${IMAGES.length} restaurants uniques et valides.`);

    // 4. Sécurité : est-ce qu'il en reste assez ?
    if (IMAGES.length < 2) {
      progressEl.textContent = "Pas assez de photos uniques trouvées !";
      return;
    }

    // 5. Initialisation du tournoi
    champion = IMAGES[0];
    challenger = IMAGES[1];
    nextIndex = 2;
    
    showImages();

  } catch (error) {
    console.error("Erreur :", error);
    progressEl.innerHTML = "Erreur de chargement.";
  }
}

// 2. Affiche les images actuelles
function showImages() {
  if (!champion || !challenger) return;

  imgLeft.src = champion.src;
  descLeft.textContent = champion.desc; // Attention: assure-toi que ta colonne s'appelle bien 'description' dans la DB
  
  imgRight.src = challenger.src;
  descRight.textContent = challenger.desc;
  
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
  winnerImage.src = champion.src;
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