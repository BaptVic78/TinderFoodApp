// =======================
// Tinder Food — app.js (CORRIGÉ)
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

// === INITIALISATION ===
async function initGame() {
  try {
    progressEl.textContent = "Chargement...";
    
    const response = await fetch('/api/dishes'); 
    const rawData = await response.json();
    
    // Mélange
    IMAGES = rawData.sort(() => Math.random() - 0.5);

    console.log(`${IMAGES.length} restaurants chargés.`);
    
    champion = IMAGES[0];
    challenger = IMAGES[1];
    nextIndex = 2;
    showImages();

  } catch (error) {
    console.error(error);
    progressEl.textContent = "Erreur chargement API";
  }
}

// === FONCTIONS D'AFFICHAGE (Infos & HTML) ===

function isTrue(value) {
    if (!value) return false;
    const v = String(value).toLowerCase();
    return v === "1" || v === "true" || v === "yes" || v === "oui";
}

function generateFullDetailsHtml(resto) {
    const details = [
        { label: "📍 Adresse", val: `${resto.Zipcode || ""} Paris` },
        { label: "📞 Téléphone", val: resto.Phone_number },
        { label: "🌐 Site Web", val: resto.Website ? `<a href="${resto.Website}" target="_blank">Voir le site</a>` : null },
        { label: "🕒 Horaires", val: resto.Opening_hours },
        { label: "⭐ Michelin", val: resto.Etoiles_michelin ? "Oui (" + resto.Etoiles_michelin + " étoiles)" : "Non" },
        { label: "🌱 Végétarien", val: isTrue(resto.Vegetarian) ? "Oui" : "Non" },
        { label: "🥦 Vegan", val: isTrue(resto.Vegan) ? "Oui" : "Non" },
        { label: "🛵 Livraison", val: isTrue(resto.Delivery) ? "Oui" : "Non" },
        { label: "🛍️ A emporter", val: isTrue(resto.Take_away) ? "Oui" : "Non" },
        { label: "♿ Accès PMR", val: isTrue(resto.Disabled_access) ? "Oui" : "Non" },
        { label: "🚬 Zone fumeur", val: isTrue(resto.Smoking_area) ? "Oui" : "Non" },
        { label: "🏢 Siret", val: resto.Siret },
        { label: "🗺️ Quartier", val: resto.Disctrict }, 
        { label: "🍔 Type", val: resto.Food }
    ];

    let html = `<h3>${resto.name}</h3>`;
    
    details.forEach(item => {
        if (item.val && item.val !== "0") {
            html += `
            <div class="detail-row">
                <span class="detail-label">${item.label} :</span> 
                <span>${item.val}</span>
            </div>`;
        }
    });

    html += `<div style="text-align:center; margin-top:20px; color:#ff3366; font-size:0.9em; font-weight:bold; cursor:pointer;">▼ Fermer les infos</div>`;

    return html;
}

function showImages() {
  if (!champion || !challenger) return;

  // --- GAUCHE ---
  const leftContainer = document.querySelector('.dish[data-side="left"]');
  leftContainer.innerHTML = `
      <div class="dish-image-container">
          <img src="${champion.photo_url}" alt="${champion.name}">
          
          <div id="details-left" class="full-details-overlay" onclick="toggleDetails('left', event)">
              ${generateFullDetailsHtml(champion)}
          </div>
          
          <button class="info-btn" onclick="toggleDetails('left', event)">i</button>
      </div>
      <div class="dish-desc">
          <strong>${champion.name}</strong><br>
          <span style="color:#666">${champion.Food}</span>
      </div>
  `;

  // --- DROITE ---
  const rightContainer = document.querySelector('.dish[data-side="right"]');
  rightContainer.innerHTML = `
      <div class="dish-image-container">
          <img src="${challenger.photo_url}" alt="${challenger.name}">
          
          <div id="details-right" class="full-details-overlay" onclick="toggleDetails('right', event)">
              ${generateFullDetailsHtml(challenger)}
          </div>
          
          <button class="info-btn" onclick="toggleDetails('right', event)">i</button>
      </div>
      <div class="dish-desc">
          <strong>${challenger.name}</strong><br>
          <span style="color:#666">${challenger.Food}</span>
      </div>
  `;
  
  progressEl.textContent = `Duel ${nextIndex - 1}/${IMAGES.length - 1}`;
}

// Fonction corrigée : Gestion du clic sur le bouton Info
function toggleDetails(side, event) {
    // CORRECTION ICI : "event" (et pas envent)
    if (event) event.stopPropagation(); 

    const overlay = document.getElementById(`details-${side}`);
    overlay.classList.toggle('visible');
}

// === LOGIQUE DU JEU ===

// CORRECTION : J'ai remis cette fonction qui manquait !
function animateChoice(side) {
  const chosen = document.querySelector(`.dish[data-side="${side}"]`);
  chosen.classList.add(side === "left" ? "fly-over-right" : "fly-over-left");

  setTimeout(() => {
    chosen.classList.remove("fly-over-right", "fly-over-left");
    nextDuel(side);
  }, 400);
}

function nextDuel(side) {
  champion = side === "left" ? champion : challenger;
  
  if (nextIndex < IMAGES.length) {
    challenger = IMAGES[nextIndex++];
    showImages();
  } else {
    endTournament();
  }
}

function endTournament() {
  finished = true;
  progressEl.textContent = "C’est un match ❤️";
  chooseBtn.disabled = true;
  showMatchScreen();
}

function showMatchScreen() {
  winnerImage.src = champion.photo_url;
  winnerText.innerHTML = `C’est un match avec <br><span style="color:#ff3366;">${champion.name}</span> !`;
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

// Ces écouteurs gèrent le clic sur la photo (Vote)
// Grâce à stopPropagation() dans toggleDetails, le clic sur "i" ne déclenche pas ça.
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