// =======================
// Founder — app.js (duel d'images + swipe + stockage)
// =======================

// 1) Liste d'images (remplace par tes fichiers/URLs)
const IMAGES = [
  "images/sushi.jpeg",
  "images/indien.jpg",
  "images/pizza.jpg",
  "images/francais.jpg",
  "images/padthai.jpg"
  // tu peux en ajouter; un nombre pair est idéal, impair fonctionne aussi (le dernier sera seul)
];

// 2) Sélecteurs
const pairEl = document.getElementById("pair");
const cardEl = document.getElementById("chooserCard");
const imgLeft = document.getElementById("imgLeft");   // Champion (gauche)
const imgRight = document.getElementById("imgRight"); // Challenger (droite)
const leftDish = pairEl.querySelector('.dish[data-side="left"]');
const rightDish = pairEl.querySelector('.dish[data-side="right"]');
const chooseBtn = document.getElementById("chooseBtn");
const skipBtn = document.getElementById("skipBtn");
const resetBtn = document.getElementById("resetBtn");
const progressEl = document.getElementById("progress");

const STORAGE_KEY = "founderTournament";

// 3) État tournoi
let champion = null;   // string: src du champion (toujours affiché à gauche)
let challenger = null; // string: src du challenger (à droite)
let nextIndex = 0;     // index du prochain challenger à piocher dans IMAGES
let currentChoice = null; // 'left' | 'right'

// 4) Helpers stockage
function getState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); }
  catch { return null; }
}
function setState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

// 5) UI helpers
function clearSelection() {
  currentChoice = null;
  leftDish.classList.remove("selected");
  rightDish.classList.remove("selected");
}
function select(side) {
  currentChoice = side;
  if (side === "left") {
    leftDish.classList.add("selected");
    rightDish.classList.remove("selected");
  } else {
    rightDish.classList.add("selected");
    leftDish.classList.remove("selected");
  }
}
function updateProgress() {
  // Nombre total de duels = IMAGES.length - 1 (si ≥ 2)
  const totalDuels = Math.max(IMAGES.length - 1, 0);
  // Duels déjà effectués = combien de challengers déjà passés
  const done = Math.min(Math.max(nextIndex - 1, 0), totalDuels);
  if (totalDuels === 0) {
    progressEl.textContent = "Pas assez d’images pour un duel.";
  } else if (done >= totalDuels) {
    progressEl.textContent = `Terminé ! ${done}/${totalDuels} duels`;
  } else {
    progressEl.textContent = `Duel ${done + 1} / ${totalDuels}`;
  }
}
function preload(src) {
  if (!src) return;
  const i = new Image();
  i.src = src;
}

// 6) Initialisation du tournoi
function initTournament() {
  if (IMAGES.length === 0) {
    champion = challenger = null;
    chooseBtn.disabled = true;
    skipBtn.disabled = true;
    progressEl.textContent = "Aucune image trouvée.";
    return;
  }
  if (IMAGES.length === 1) {
    champion = IMAGES[0];
    challenger = null;
    chooseBtn.disabled = true;
    skipBtn.disabled = true;
    imgLeft.src = champion;
    imgRight.removeAttribute("src");
    rightDish.style.visibility = "hidden";
    progressEl.textContent = "Une seule image — pas de duel.";
    setState({ champion, history: [], finished: true });
    return;
  }

  // Démarrage : champion = image 0, challenger = image 1
  champion = IMAGES[0];
  challenger = IMAGES[1];
  nextIndex = 2;

  imgLeft.src = champion;
  imgRight.src = challenger;
  rightDish.style.visibility = "visible";
  chooseBtn.disabled = false;
  skipBtn.disabled = false;
  setState({ champion, nextIndex, history: [], finished: false });

  updateProgress();
  preload(IMAGES[nextIndex]);
}

// 7) Charger l’état si présent
(function restoreOrInit() {
  const saved = getState();
  if (saved && Array.isArray(IMAGES) && IMAGES.length >= 1) {
    champion = saved.champion ?? null;
    nextIndex = saved.nextIndex ?? 0;
    const finished = !!saved.finished;

    if (finished) {
      // Afficher le gagnant direct
      imgLeft.src = champion || "";
      rightDish.style.visibility = "hidden";
      imgRight.removeAttribute("src");
      chooseBtn.disabled = true;
      skipBtn.disabled = true;
      progressEl.innerHTML = `Gagnant 🏆<br><strong>${basename(champion) || "Plat"}</strong>`;
      return;
    }

    // Reprendre un challenger courant si possible
    if (typeof saved.currentChallenger === "string") {
      challenger = saved.currentChallenger;
    } else {
      challenger = IMAGES[nextIndex - 1] || IMAGES[1] || null;
    }

    // Sécurise l’affichage
    if (champion) imgLeft.src = champion;
    if (challenger) {
      imgRight.src = challenger;
      rightDish.style.visibility = "visible";
    } else {
      rightDish.style.visibility = "hidden";
      imgRight.removeAttribute("src");
    }
    chooseBtn.disabled = false;
    skipBtn.disabled = false;
    updateProgress();
    preload(IMAGES[nextIndex]);
  } else {
    initTournament();
  }
})();

// 8) Validation d’un duel
function commitChoice() {
  if (!currentChoice) {
    cardEl.classList.add("shake");
    setTimeout(() => cardEl.classList.remove("shake"), 240);
    return;
  }
  // Détermine le vainqueur du duel courant
  const winner = currentChoice === "left" ? champion : challenger;
  const loser = currentChoice === "left" ? challenger : champion;

  // MàJ historique + état
  const state = getState() || { history: [] };
  state.history = state.history || [];
  state.history.push({
    champion,
    challenger,
    winner,
    loser,
    ts: Date.now()
  });

  // Le vainqueur devient le nouveau champion
  champion = winner;

  // Tirer le prochain challenger
  if (nextIndex < IMAGES.length) {
    challenger = IMAGES[nextIndex++];
    imgLeft.src = champion;
    imgRight.src = challenger;
    rightDish.style.visibility = "visible";
    chooseBtn.disabled = false;
    skipBtn.disabled = false;
    clearSelection();
    state.champion = champion;
    state.currentChallenger = challenger;
    state.nextIndex = nextIndex;
    state.finished = false;
    setState(state);
    updateProgress();
    preload(IMAGES[nextIndex]);
  } else {
    // Plus de challengers -> fin, afficher le gagnant
    challenger = null;
    imgLeft.src = champion;
    imgRight.removeAttribute("src");
    rightDish.style.visibility = "hidden";
    chooseBtn.disabled = true;
    skipBtn.disabled = true;
    clearSelection();
    state.champion = champion;
    state.currentChallenger = null;
    state.nextIndex = nextIndex;
    state.finished = true;
    setState(state);
    progressEl.innerHTML = `Gagnant 🏆<br><strong>${basename(champion) || "Plat"}</strong>`;
  }
}

// 9) Bouton "Passer" : on passe juste au challenger suivant (le champion reste)
function skipDuel() {
  if (nextIndex < IMAGES.length) {
    challenger = IMAGES[nextIndex++];
    imgRight.src = challenger;
    rightDish.style.visibility = "visible";
    clearSelection();
    const state = getState() || {};
    state.champion = champion;
    state.currentChallenger = challenger;
    state.nextIndex = nextIndex;
    state.finished = false;
    setState(state);
    updateProgress();
    preload(IMAGES[nextIndex]);
  } else {
    // Rien à passer : on est au dernier duel -> fin “sans vote”
    commitChoiceAuto();
  }
}

// Si l’utilisateur clique "Passer" alors qu’il ne reste plus de challenger, on clôture en déclarant le champion actuel gagnant
function commitChoiceAuto() {
  const state = getState() || { history: [] };
  state.champion = champion;
  state.currentChallenger = null;
  state.nextIndex = nextIndex;
  state.finished = true;
  setState(state);

  imgLeft.src = champion;
  imgRight.removeAttribute("src");
  rightDish.style.visibility = "hidden";
  chooseBtn.disabled = true;
  skipBtn.disabled = true;
  clearSelection();
  progressEl.innerHTML = `Gagnant 🏆<br><strong>${basename(champion) || "Plat"}</strong>`;
}

// 10) Raccourcis/UI/Events
leftDish.addEventListener("click", () => select("left"));
rightDish.addEventListener("click", () => select("right"));
chooseBtn.addEventListener("click", commitChoice);
skipBtn.addEventListener("click", skipDuel);
resetBtn.addEventListener("click", () => {
  clearState();
  champion = challenger = null;
  nextIndex = 0;
  clearSelection();
  initTournament();
});

// Swipe tactile (gauche = champion, droite = challenger)
let touchStartX = null;
pairEl.addEventListener("touchstart", (e) => {
  touchStartX = e.touches?.[0]?.clientX ?? null;
}, { passive: true });
pairEl.addEventListener("touchend", (e) => {
  if (touchStartX === null) return;
  const dx = e.changedTouches?.[0]?.clientX - touchStartX;
  touchStartX = null;
  const THRESH = 60;
  if (dx > THRESH) { select("right"); commitChoice(); }   // swipe droite -> challenger
  else if (dx < -THRESH) { select("left"); commitChoice(); } // swipe gauche -> champion
}, { passive: true });

// Drag souris (desktop)
let mouseStartX = null;
pairEl.addEventListener("mousedown", (e) => { mouseStartX = e.clientX; });
window.addEventListener("mouseup", (e) => {
  if (mouseStartX === null) return;
  const dx = e.clientX - mouseStartX;
  mouseStartX = null;
  const THRESH = 80;
  if (dx > THRESH) { select("right"); commitChoice(); }
  else if (dx < -THRESH) { select("left"); commitChoice(); }
});

// Raccourcis clavier
window.addEventListener("keydown", (e) => {
  if (chooseBtn.disabled) return;
  if (e.key === "ArrowLeft") select("left");
  if (e.key === "ArrowRight") select("right");
  if (e.key === "Enter") commitChoice();
});

// 11) Utilitaire affichage nom de fichier
function basename(path) {
  if (!path) return "";
  try { return path.split("/").pop(); } catch { return path; }
}