// =======================
// Tinder Food — app.js (VERSION MASTER)
// Contient : Jeu, Auth, Filtres, Swipe, Avis, Infos
// =======================

// --- SÉLECTEURS DU DOM (JEU) ---
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

// --- SÉLECTEURS (FILTRES) ---
const openFilterBtn = document.getElementById("openFilterBtn");
const closeFilterBtn = document.getElementById("closeFilterBtn");
const applyFiltersBtn = document.getElementById("applyFiltersBtn");
const filterModal = document.getElementById("filterModal");

// --- SÉLECTEURS (AUTH) ---
const authBtn = document.getElementById("authBtn");
const logoutBtn = document.getElementById("logoutBtn");
const welcomeMsg = document.getElementById("welcomeMsg");
const authModal = document.getElementById("authModal");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginUser = document.getElementById("loginUser");
const loginPass = document.getElementById("loginPass");
const regUser = document.getElementById("regUser");
const regPass = document.getElementById("regPass");
const regEmail = document.getElementById("regEmail");     
const regAddress = document.getElementById("regAddress"); 

// --- SÉLECTEURS (AVIS) ---
const reviewModal = document.getElementById("reviewModal");
const reviewRestaurantName = document.getElementById("reviewRestaurantName");
const selectedRatingInput = document.getElementById("selectedRating");
const reviewCommentInput = document.getElementById("reviewComment");
const stars = document.querySelectorAll(".star-rating span");
const sendReviewBtn = document.getElementById("sendReviewBtn");

// --- VARIABLES GLOBALES ---
let ALL_RESTAURANTS = []; // La base complète (pour les filtres)
let IMAGES = [];          // La liste courante (filtrée)
let champion;
let challenger;
let nextIndex = 2;
let finished = false;
let currentUser = null;

// =======================
// 1. INITIALISATION
// =======================
async function initGame() {
  try {
    checkSession();
    progressEl.textContent = "Chargement des restaurants...";
    
    // On récupère TOUT le monde
    const response = await fetch('/api/dishes'); 
    const rawData = await response.json();
    
    // On sauvegarde la liste complète pour pouvoir filtrer plus tard
    ALL_RESTAURANTS = rawData.sort(() => Math.random() - 0.5);

    // Au démarrage, on applique les filtres par défaut (càd aucun filtre = tout le monde)
    applyFilters(); 

  } catch (error) {
    console.error(error);
    progressEl.textContent = "Erreur chargement API";
  }
}

// =======================
// 2. GESTION DES FILTRES
// =======================
function applyFilters() {
    // A. Récupérer les valeurs des inputs
    const filterVeg = document.getElementById("filterVeg");
    const filterDelivery = document.getElementById("filterDelivery");
    
    // Sécurité si les éléments HTML n'existent pas encore
    const isVeg = filterVeg ? filterVeg.checked : false;
    const isDelivery = filterDelivery ? filterDelivery.checked : false;
    
    // Récupérer les types de cuisine cochés
    const checkedTypes = Array.from(document.querySelectorAll('.tag-checkbox input:checked')).map(cb => cb.value);

    // B. Filtrer ALL_RESTAURANTS
    IMAGES = ALL_RESTAURANTS.filter(resto => {
        if (isVeg && !isTrue(resto.Vegetarian)) return false;
        if (isDelivery && !isTrue(resto.Delivery)) return false;

        if (checkedTypes.length > 0) {
            const foodType = (resto.Food || "").toLowerCase();
            const matchesType = checkedTypes.some(type => foodType.includes(type));
            if (!matchesType) return false;
        }
        return true;
    });

    console.log(`${IMAGES.length} restaurants après filtrage.`);
    
    // C. Reset du jeu
    if (filterModal) filterModal.style.display = "none";

    if (IMAGES.length < 2) {
        alert("Aucun restaurant ne correspond ! Essaye d'autres filtres.");
        return;
    }

    champion = IMAGES[0];
    challenger = IMAGES[1];
    nextIndex = 2;
    finished = false;
    if (chooseBtn) chooseBtn.disabled = false;
    
    showImages();
}

// Écouteurs Filtres
if (openFilterBtn) openFilterBtn.addEventListener("click", () => filterModal.style.display = "flex");
if (closeFilterBtn) closeFilterBtn.addEventListener("click", () => filterModal.style.display = "none");
if (applyFiltersBtn) applyFiltersBtn.addEventListener("click", applyFilters);


// =======================
// 3. AFFICHAGE (Infos & HTML)
// =======================

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
        { label: "🛵 Livraison", val: isTrue(resto.Delivery) ? "Oui" : "Non" },
        { label: "🏢 Siret", val: resto.Siret },
        { label: "🍔 Type", val: resto.Food }
    ];

    let html = `<h3>${resto.name}</h3>`;
    details.forEach(item => {
        if (item.val && item.val !== "0") {
            html += `<div class="detail-row"><span class="detail-label">${item.label} :</span> <span>${item.val}</span></div>`;
        }
    });
    html += `<div style="text-align:center; margin-top:20px; color:#ff3366; font-size:0.9em; font-weight:bold; cursor:pointer;">▼ Fermer les infos</div>`;
    return html;
}

function showImages() {
  if (!champion || !challenger) return;

  const buildHtml = (resto, side) => `
      <div class="dish-image-container">
          <img src="${resto.photo_url}" alt="${resto.name}">
          
          <div id="details-${side}" class="full-details-overlay" onclick="toggleDetails('${side}', event)">
              ${generateFullDetailsHtml(resto)}
          </div>
          
          <button class="info-btn" onclick="toggleDetails('${side}', event)">i</button>

          <button class="like-btn" onclick="addToFavorites('${side}', event)">🤍</button>
      </div>
      <div class="dish-desc">
          <strong>${resto.name}</strong><br>
          <span style="color:#666">${resto.Food}</span>
      </div>
  `;

  document.querySelector('.dish[data-side="left"]').innerHTML = buildHtml(champion, 'left');
  document.querySelector('.dish[data-side="right"]').innerHTML = buildHtml(challenger, 'right');
  
  progressEl.textContent = `Duel ${nextIndex - 1}/${IMAGES.length - 1}`;
}

function toggleDetails(side, event) {
    if (event) event.stopPropagation(); 
    document.getElementById(`details-${side}`).classList.toggle('visible');
}

// =======================
// 4. LOGIQUE JEU & SWIPE
// =======================

// Fonction déclenchée par le petit cœur
async function addToFavorites(side, event) {
    // 1. Stop la propagation (pour ne PAS déclencher le swipe/vote)
    if (event) {
        event.stopPropagation();
        
        // Petit effet visuel immédiat (le cœur devient rouge)
        const btn = event.currentTarget;
        btn.innerHTML = "❤️"; 
        btn.classList.add("heart-pop");
    }

    // 2. Sécurité
    if (!currentUser) {
        alert("🔒 Connecte-toi pour sauvegarder tes favoris !");
        authModal.style.display = "flex";
        return;
    }

    const restoToSave = side === "left" ? champion : challenger;

    // 3. Appel API vers /api/like (Table LIKES)
    try {
        const response = await fetch('/api/like', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                restaurant_id: restoToSave.restaurant_id || restoToSave.id
            })
        });
        // Pas besoin d'alerte intrusive, le cœur rouge suffit visuellement
        console.log("Ajouté aux favoris !");
    } catch (e) {
        console.error(e);
    }
}

function animateChoice(side) {
  // SÉCURITÉ AUTH
  if (!currentUser) {
      alert("🔒 Connecte-toi pour commencer à jouer !");
      if(authModal) authModal.style.display = "flex";
      return; 
  }

  const chosenResto = side === "left" ? champion : challenger;

  // ENVOI SWIPE (DB)
  fetch('/api/swipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          user_id: currentUser.id,
          restaurant_id: chosenResto.restaurant_id || chosenResto.id
      })
  }).catch(err => console.error(err));

  // ANIMATION
  const chosenEl = document.querySelector(`.dish[data-side="${side}"]`);
  chosenEl.classList.add(side === "left" ? "fly-over-right" : "fly-over-left");

  setTimeout(() => {
    chosenEl.classList.remove("fly-over-right", "fly-over-left");
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
  if(chooseBtn) chooseBtn.disabled = true;
  showMatchScreen();
}

// =======================
// 5. AUTHENTIFICATION
// =======================
function checkSession() {
    const savedUser = localStorage.getItem("tinderFoodUser");
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUI();
    }
}

function updateUI() {
    if (currentUser) {
        authBtn.style.display = "none";
        welcomeMsg.style.display = "block";
        welcomeMsg.textContent = `Bonjour ${currentUser.name}`;
        logoutBtn.style.display = "block";
        authModal.style.display = "none";
    } else {
        authBtn.style.display = "block";
        welcomeMsg.style.display = "none";
        logoutBtn.style.display = "none";
    }
}

window.toggleAuthMode = function() {
    if (loginForm.style.display === "none") {
        loginForm.style.display = "block";
        registerForm.style.display = "none";
    } else {
        loginForm.style.display = "none";
        registerForm.style.display = "block";
    }
};

if(authBtn) authBtn.addEventListener("click", () => authModal.style.display = "flex");

if(logoutBtn) logoutBtn.addEventListener("click", () => {
    currentUser = null;
    localStorage.removeItem("tinderFoodUser");
    updateUI();
    location.reload(); 
});

if(document.getElementById("doLoginBtn")) {
    document.getElementById("doLoginBtn").addEventListener("click", async () => {
        const u = loginUser.value;
        const p = loginPass.value;
        if(!u || !p) return alert("Remplis tout");
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ username: u, password: p })
            });
            const data = await res.json();
            if (data.success) {
                currentUser = data.user;
                localStorage.setItem("tinderFoodUser", JSON.stringify(currentUser));
                updateUI();
            } else { alert(data.message); }
        } catch (e) { console.error(e); }
    });
}

if(document.getElementById("doRegisterBtn")) {
    document.getElementById("doRegisterBtn").addEventListener("click", async () => {
        const u = regUser.value;
        const p = regPass.value;
        const e = regEmail.value;
        const a = regAddress.value;
        if(!u || !p || !e) return alert("Champs obligatoires manquants");
        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ username: u, password: p, email: e, address: a })
            });
            const data = await res.json();
            if (data.success) {
                alert("Compte créé !");
                toggleAuthMode();
            } else { alert(data.message); }
        } catch (err) { console.error(err); }
    });
}


// =======================
// 6. AVIS & FIN
// =======================

function showMatchScreen() {
  winnerImage.src = champion.photo_url;
  winnerText.innerHTML = `C’est un match avec <br><span style="color:#ff3366;">${champion.name}</span> !`;
  
  // Ajout Bouton Avis
  let actionContainer = document.getElementById("matchActions");
  if (!actionContainer) {
      actionContainer = document.createElement("div");
      actionContainer.id = "matchActions";
      actionContainer.style.marginTop = "20px";
      matchScreen.appendChild(actionContainer);
  }
  actionContainer.innerHTML = `
      <button onclick="openReviewModal()" style="background:white; color:#333; box-shadow:0 4px 15px rgba(0,0,0,0.1);">
        ⭐ Laisser un avis
      </button>
  `;

  matchScreen.classList.add("active");
  launchConfetti();
}

function launchConfetti() {
  if (typeof confetti === "function") {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  }
}

// LOGIQUE MODALE AVIS
window.openReviewModal = function() {
    reviewRestaurantName.textContent = champion.name;
    reviewModal.style.display = "flex";
    setRating(5);
    reviewCommentInput.value = "";
}
window.closeReviewModal = function() { reviewModal.style.display = "none"; }

window.setRating = function(n) {
    selectedRatingInput.value = n;
    stars.forEach((star, index) => {
        if (index < n) star.classList.add("active");
        else star.classList.remove("active");
    });
}

if(sendReviewBtn) {
    sendReviewBtn.addEventListener("click", async () => {
        if (!currentUser) return alert("Connecte-toi d'abord !");
        const rating = selectedRatingInput.value;
        const comment = reviewCommentInput.value;
        const restaurantId = champion.restaurant_id || champion.id; 

        try {
            const response = await fetch('/api/review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.id,
                    restaurant_id: restaurantId,
                    rating: rating,
                    comment: comment
                })
            });
            const result = await response.json();
            if (result.success) {
                alert("Avis envoyé !");
                closeReviewModal();
            } else { alert("Erreur serveur"); }
        } catch (error) { console.error(error); }
    });
}

// =======================
// 7. LISTENERS GLOBAUX
// =======================
if(closeMatch) closeMatch.addEventListener("click", () => {
  matchScreen.classList.remove("active");
  location.reload(); 
});

// Clic sur l'image = Vote (si pas sur infos)
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

// Coup de Foudre (si présent)
const superLikeBtn = document.getElementById("superLikeBtn");
if (superLikeBtn) {
    superLikeBtn.addEventListener("click", () => {
        if (!currentUser) {
            alert("🔒 Connecte-toi !");
            authModal.style.display = "flex";
            return;
        }
        if(!finished) endTournament();
    });
}

// GESTION DU BOUTON "J'AI CHOISI ❤️"
if (chooseBtn) {
    chooseBtn.addEventListener("click", () => {
        // 1. Sécurité : Est-ce qu'on est connecté ?
        if (!currentUser) {
            alert("🔒 Connecte-toi pour valider ton choix !");
            if(authModal) authModal.style.display = "flex";
            return;
        }

        // 2. On récupère le gagnant (C'est toujours le Champion, à gauche)
        const winner = champion;

        // 3. On sauvegarde dans la base de données (Table SWIPES ou LIKES)
        // Ici j'utilise /api/swipe comme pour les clics sur l'image
        fetch('/api/swipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                restaurant_id: winner.restaurant_id || winner.id
            })
        }).then(() => {
            console.log("Choix final enregistré !");
        }).catch(err => console.error("Erreur sauvegarde :", err));

        // 4. On termine le jeu (Affichage écran de fin)
        endTournament();
    });
}
if(resetBtn) resetBtn.addEventListener("click", () => location.reload());

// Lancement
initGame();