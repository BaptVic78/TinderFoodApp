// =======================
// Tinder Food — app.js (version avec swipe animé)
// =======================

// 1) Liste d'images avec descriptions
const IMAGES = [
  { src: "images/sushi.jpeg", desc: "Assortiment de sushis frais et makis variés 🍣" },
  { src: "images/indien.jpg", desc: "Curry de poulet épicé accompagné de naan 🥘" },
  { src: "images/pizza.jpg", desc: "Pizza margherita au feu de bois avec mozzarella fondante 🍕" },
  { src: "images/francais.jpg", desc: "Plats français divers et variés (champignons, escargot, boeuf..." },
  { src: "images/padthai.jpg", desc: "Pad Thaï aux crevettes, nouilles de riz et cacahuètes 🥢" }
];

// 2) Sélecteurs
const imgLeft = document.getElementById("imgLeft");
const imgRight = document.getElementById("imgRight");
const descLeft = document.getElementById("descLeft");
const descRight = document.getElementById("descRight");
const chooseBtn = document.getElementById("chooseBtn");
const skipBtn = document.getElementById("skipBtn");
const resetBtn = document.getElementById("resetBtn");
const cardEl = document.getElementById("chooserCard");
const pairEl = document.getElementById("pair");
const progressEl = document.getElementById("progress");

let champion, challenger;
let nextIndex = 0;
let currentChoice = null;

// === Initialisation ===
function showImages() {
  imgLeft.src = champion.src;
  descLeft.textContent = champion.desc;
  imgRight.src = challenger.src;
  descRight.textContent = challenger.desc;
}
function updateProgress() {
  const total = IMAGES.length - 1;
  const duelNum = Math.min(nextIndex, total);
  progressEl.textContent = `Duel ${duelNum}/${total}`;
}
function initTournament() {
  champion = IMAGES[0];
  challenger = IMAGES[1];
  nextIndex = 2;
  showImages();
  updateProgress();
}
initTournament();

// === Animation de swipe ===
function animateSwipe(direction) {
  const chosen = direction === "left" ? document.querySelector('.dish[data-side="left"]')
                                     : document.querySelector('.dish[data-side="right"]');
  const other = direction === "left" ? document.querySelector('.dish[data-side="right"]')
                                    : document.querySelector('.dish[data-side="left"]');

  chosen.classList.add(direction === "left" ? "swipe-left" : "swipe-right");

  // petite attente avant de charger le prochain duel
  setTimeout(() => {
    chosen.classList.remove("swipe-left", "swipe-right");
    nextDuel(direction);
  }, 400);
}

// === Swipe logique ===
function nextDuel(direction) {
  champion = direction === "left" ? champion : challenger;

  if (nextIndex < IMAGES.length) {
    challenger = IMAGES[nextIndex++];
    showImages();
    updateProgress();
  } else {
    imgRight.remove();
    descRight.remove();
    skipBtn.disabled = true;
    chooseBtn.disabled = false; // on peut maintenant choisir le gagnant final
    progressEl.innerHTML = `Gagnant potentiel <br><strong>${champion.desc}</strong>`;
  }
}

// === Swipe tactile ===
let startX = null;
pairEl.addEventListener("touchstart", (e) => {
  startX = e.touches[0].clientX;
});
pairEl.addEventListener("touchend", (e) => {
  if (startX === null) return;
  const dx = e.changedTouches[0].clientX - startX;
  startX = null;
  if (Math.abs(dx) < 50) return; // petit geste ignoré
  if (dx < 0) animateSwipe("left");
  else animateSwipe("right");
});

// === Swipe souris ===
let mouseStart = null;
pairEl.addEventListener("mousedown", (e) => (mouseStart = e.clientX));
window.addEventListener("mouseup", (e) => {
  if (mouseStart === null) return;
  const dx = e.clientX - mouseStart;
  mouseStart = null;
  if (Math.abs(dx) < 80) return;
  if (dx < 0) animateSwipe("left");
  else animateSwipe("right");
});

// === Bouton "J'ai choisi " : choix final ===
chooseBtn.addEventListener("click", () => {
  imgRight.remove();
  descRight.remove();
  skipBtn.disabled = true;
  chooseBtn.disabled = true;
  progressEl.innerHTML = `Ton plat préféré est :<br><strong>${champion.desc}</strong>`;
});

// === Bouton "Passer" ===
skipBtn.addEventListener("click", () => {
  if (nextIndex < IMAGES.length) {
    challenger = IMAGES[nextIndex++];
    showImages();
    updateProgress();
  }
});

// === Bouton "Réinitialiser" ===
resetBtn.addEventListener("click", () => location.reload());
