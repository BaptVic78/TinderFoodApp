// =======================
// Tinder Food — app.js (VERSION CORRIGÉE AVEC LIKES)
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

// --- SÉLECTEURS (LIKES) [C'était manquant !] ---
const myLikesBtn = document.getElementById("myLikesBtn");
const likesModal = document.getElementById("likesModal");
const likesList = document.getElementById("likesList");

// --- SÉLECTEURS (AVIS) ---
const reviewModal = document.getElementById("reviewModal");
const reviewRestaurantName = document.getElementById("reviewRestaurantName");
const selectedRatingInput = document.getElementById("selectedRating");
const reviewCommentInput = document.getElementById("reviewComment");
const stars = document.querySelectorAll(".star-rating span");
const sendReviewBtn = document.getElementById("sendReviewBtn");

// --- VARIABLES GLOBALES ---
let ALL_RESTAURANTS = [];
let IMAGES = [];
let champion;
let challenger;
let nextIndex = 2;
let finished = false;
let currentUser = null;

// =======================
// 1. INITIALISATION (AVEC GÉOLOCALISATION)
// =======================
async function initGame() {
  try {
    checkSession();
    progressEl.textContent = "Chargement des restaurants...";
    
    // 1. On récupère les données
    const response = await fetch('/api/dishes'); 
    const rawData = await response.json();
    
    // 2. On demande la position GPS
    if (navigator.geolocation) {
        progressEl.textContent = "Géolocalisation en cours...";
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // SUCCÈS : L'utilisateur a accepté
                const myLat = position.coords.latitude;
                const myLon = position.coords.longitude;
                
                console.log("📍 Ma position :", myLat, myLon);

                // On calcule la distance pour chaque resto
                ALL_RESTAURANTS = rawData.map(resto => {
                    // 👇 C'EST ICI QU'ON CHANGE : On utilise .LAT et .LON
                    // (J'ajoute une sécurité pour accepter LAT, Lat ou lat par précaution)
                    const rLat = resto.LAT || resto.Lat || resto.lat;
                    const rLon = resto.LON || resto.Lon || resto.lon;

                    const dist = getDistanceFromLatLonInKm(myLat, myLon, rLat, rLon);
                    
                    return { ...resto, distance: dist }; 
                });

                // On trie du plus proche au plus loin
                ALL_RESTAURANTS.sort((a, b) => {
                    if (!a.distance) return 1;
                    if (!b.distance) return -1;
                    return a.distance - b.distance;
                });

                progressEl.textContent = "Restaurants triés par proximité !";
                applyFilters();
            },
            (error) => {
                // ERREUR ou REFUS : On mélange au hasard
                console.warn("Géolocalisation refusée ou erreur :", error.message);
                ALL_RESTAURANTS = rawData.sort(() => Math.random() - 0.5);
                applyFilters();
            }
        );
    } else {
        // Pas de support GPS (vieux navigateur)
        ALL_RESTAURANTS = rawData.sort(() => Math.random() - 0.5);
        applyFilters();
    }

  } catch (error) {
    console.error(error);
    progressEl.textContent = "Erreur chargement API";
  }
}

// =======================
// 2. GESTION DES FILTRES
// =======================
function applyFilters() {
    const filterVeg = document.getElementById("filterVeg");
    const filterDelivery = document.getElementById("filterDelivery");
    
    const isVeg = filterVeg ? filterVeg.checked : false;
    const isDelivery = filterDelivery ? filterDelivery.checked : false;
    
    const checkedTypes = Array.from(document.querySelectorAll('.tag-checkbox input:checked')).map(cb => cb.value);

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
          
          ${resto.distance ? `<br><span style="color:#ff3366; font-weight:bold; font-size:0.8em;">📍 à ${resto.distance} km</span>` : ''}
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

// Clic sur le petit cœur
async function addToFavorites(side, event) {
    if (event) {
        event.stopPropagation();
        const btn = event.currentTarget;
        btn.innerHTML = "❤️"; 
        btn.classList.add("heart-pop");
    }

    if (!currentUser) {
        alert("🔒 Connecte-toi pour sauvegarder tes favoris !");
        authModal.style.display = "flex";
        return;
    }

    const restoToSave = side === "left" ? champion : challenger;

    try {
        await fetch('/api/like', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                restaurant_id: restoToSave.restaurant_id || restoToSave.id
            })
        });
        console.log("Ajouté aux favoris !");
    } catch (e) { console.error(e); }
}

function animateChoice(side) {
  if (!currentUser) {
      alert("🔒 Connecte-toi pour commencer à jouer !");
      if(authModal) authModal.style.display = "flex";
      return; 
  }

  const chosenResto = side === "left" ? champion : challenger;

  // Envoi Swipe
  fetch('/api/swipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          user_id: currentUser.id,
          restaurant_id: chosenResto.restaurant_id || chosenResto.id
      })
  }).catch(err => console.error(err));

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
// 5. AUTHENTIFICATION & UPDATE UI
// =======================
function checkSession() {
    const savedUser = localStorage.getItem("tinderFoodUser");
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUI();
    }
}

// C'est ICI que tu avais oublié la logique pour afficher le bouton Mes Likes
function updateUI() {
    // On récupère le bouton profil ici pour être sûr
    const profileBtn = document.getElementById("profileBtn");

    if (currentUser) {
        // --- MODE CONNECTÉ ---
        if(authBtn) authBtn.style.display = "none";
        if(welcomeMsg) {
            welcomeMsg.style.display = "block";
            welcomeMsg.textContent = `Bonjour ${currentUser.name}`;
        }
        if(logoutBtn) logoutBtn.style.display = "block";
        if(authModal) authModal.style.display = "none";
        
        // AFFICHER le bouton Likes
        if(myLikesBtn) myLikesBtn.style.display = "block";

        // 👇 AFFICHER LE BOUTON PROFIL (C'est la ligne qui manquait) 👇
        if(profileBtn) profileBtn.style.display = "block"; 
        
    } else {
        // --- MODE DÉCONNECTÉ ---
        if(authBtn) authBtn.style.display = "block";
        if(welcomeMsg) welcomeMsg.style.display = "none";
        if(logoutBtn) logoutBtn.style.display = "none";
        
        // CACHER les boutons privés
        if(myLikesBtn) myLikesBtn.style.display = "none";
        if(profileBtn) profileBtn.style.display = "none"; // 👇 Et on le cache ici
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

// GESTION DU BOUTON "J'AI CHOISI ❤️" (Sauvegarde en BDD)
if (chooseBtn) {
    // Clone pour nettoyer les anciens écouteurs
    const newBtn = chooseBtn.cloneNode(true);
    chooseBtn.parentNode.replaceChild(newBtn, chooseBtn);

    newBtn.addEventListener("click", async () => {
        if (!currentUser) {
            alert("🔒 Connecte-toi pour valider ton choix !");
            if(authModal) authModal.style.display = "flex";
            return;
        }

        const winner = champion;
        // On enregistre le swipe final
        fetch('/api/swipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                restaurant_id: winner.restaurant_id || winner.id
            })
        }).catch(err => console.error(err));

        endTournament();
    });
}

if(resetBtn) resetBtn.addEventListener("click", () => location.reload());

// =======================
// 8. LOGIQUE DU BOUTON "MES LIKES" (C'est ce qu'il te manquait !)
// =======================
if (myLikesBtn) {
    myLikesBtn.addEventListener("click", async () => {
        if (!currentUser) return;

        // On ouvre la fenêtre
        likesModal.style.display = "flex";
        likesList.innerHTML = '<p style="text-align:center; margin-top:20px;">Chargement...</p>';

        try {
            const res = await fetch(`/api/likes?user_id=${currentUser.id}`);
            const likes = await res.json();

            if (likes.length === 0) {
                likesList.innerHTML = '<p style="text-align:center; color:#666; margin-top:40px;">Aucun like pour le moment.</p>';
                return;
            }

            // Génération de la liste
            likesList.innerHTML = likes.map(resto => `
                <div style="display:flex; align-items:center; gap:15px; border-bottom:1px solid #eee; padding:15px 0;">
                    <img src="${resto.photo_url}" style="width:60px; height:60px; object-fit:cover; border-radius:10px;">
                    <div style="flex:1;">
                        <strong style="font-size:14px;">${resto.name}</strong><br>
                        <span style="font-size:12px; color:#666;">${resto.Food}</span>
                    </div>
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(resto.name + " " + (resto.Zipcode||"") + " Paris")}" 
                       target="_blank" style="text-decoration:none; font-size:20px;">📍</a>
                </div>
            `).join('');

        } catch (error) {
            console.error("Erreur JS :", error);
            likesList.innerHTML = '<p style="color:red; text-align:center;">Erreur de chargement (voir console).</p>';
        }
    });
}

// =======================
// 9. GESTION DU PROFIL
// =======================
const profileBtn = document.getElementById("profileBtn");
const profileModal = document.getElementById("profileModal");
const profileName = document.getElementById("profileName");
const profileEmail = document.getElementById("profileEmail");
const profileAddress = document.getElementById("profileAddress");
const saveProfileBtn = document.getElementById("saveProfileBtn");

// Afficher le bouton profil seulement si connecté (modifier updateUI)
// ⚠️ IMPORTANT : Cherche ta fonction updateUI() existante et ajoute ces lignes dedans :
/*
function updateUI() {
    if (currentUser) {
        // ... tes lignes existantes ...
        if(profileBtn) profileBtn.style.display = "block"; // AFFICHER
    } else {
        // ... tes lignes existantes ...
        if(profileBtn) profileBtn.style.display = "none"; // CACHER
    }
}
*/

// Ouvrir la modale et pré-remplir les infos
if (profileBtn) {
    profileBtn.addEventListener("click", () => {
        if (!currentUser) return;
        
        profileModal.style.display = "flex";
        
        // On remplit les champs avec les infos actuelles
        profileName.value = currentUser.name || currentUser.username;
        // Attention : si ton login ne renvoie pas l'email/adresse au début,
        // il faudra peut-être les stocker dans currentUser lors du login.
        // Pour l'instant, supposons qu'ils y sont ou qu'on les laisse vides à compléter.
        profileEmail.value = currentUser.email || "";
        profileAddress.value = currentUser.address || "";
    });
}

// =======================
// FONCTION UTILITAIRE : RE-CALCULER ET TRIER
// =======================
// Cette fonction met à jour les distances de tous les restos par rapport à une nouvelle position
function recalculateDistancesAndSort(lat, lon) {
    if (!lat || !lon) return;

    console.log("🔄 Recalcul des distances depuis :", lat, lon);

    ALL_RESTAURANTS = ALL_RESTAURANTS.map((resto, index) => {
        // On récupère les coordonnées (toutes les écritures possibles)
        const rLat = parseFloat(resto.LAT || resto.Lat || resto.lat || resto.latitude);
        const rLon = parseFloat(resto.LON || resto.Lon || resto.lon || resto.longitude);
        
        // --- 🕵️ L'ESPION EST ICI ---
        // On affiche les infos du TOUT PREMIER restaurant seulement pour ne pas spammer
        if (index === 0) {
            console.log("🕵️ TEST RESTO #1 :", resto.name);
            console.log("   👉 Latitude trouvée :", rLat);
            console.log("   👉 Longitude trouvée :", rLon);
            console.log("   👉 Données brutes :", resto);
        }
        // ---------------------------

        if (isNaN(rLat) || isNaN(rLon)) {
            return { ...resto, distance: 99999 }; // Distance infinie si pas de coordonnées
        }

        const dist = getDistanceFromLatLonInKm(lat, lon, rLat, rLon);
        return { ...resto, distance: dist }; 
    });

    // Tri du plus proche au plus loin
    ALL_RESTAURANTS.sort((a, b) => {
        return a.distance - b.distance;
    });

    applyFilters();
}

// =======================
// BLOC DE SAUVEGARDE 
// =======================
if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", async () => {
        const newEmail = profileEmail.value;
        const newAddress = profileAddress.value;
        
        // On sauvegarde le texte du bouton pour le remettre après
        const btnOriginalText = saveProfileBtn.textContent;

        try {
            // 1. Feedback visuel : On montre qu'on cherche
            saveProfileBtn.textContent = "🔍 Recherche GPS...";
            saveProfileBtn.disabled = true; // On empêche de cliquer 2 fois

            // 2. GÉOCODAGE : On demande à OpenStreetMap les coordonnées
            // encodeURIComponent permet de gérer les espaces et accents dans l'URL
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newAddress)}`);
            const geoData = await geoRes.json();

            let newLat = null;
            let newLon = null;

            // Si OpenStreetMap a trouvé quelque chose
            if (geoData && geoData.length > 0) {
                newLat = parseFloat(geoData[0].lat);
                newLon = parseFloat(geoData[0].lon);
                console.log("✅ Adresse trouvée :", newLat, newLon);
            } else {
                alert("⚠️ Adresse introuvable sur la carte. L'adresse texte sera sauvegardée, mais sans localisation précise.");
            }

            // 3. ENVOI AU SERVEUR (BACKEND)
            const res = await fetch('/api/user/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser.id || currentUser.user_id,
                    email: newEmail,
                    address: newAddress,
                    latitude: newLat,   // On ajoute ça !
                    longitude: newLon   // Et ça !
                })
            });
            
            const data = await res.json();
            
            if (data.success) {
                alert("Profil mis à jour ! 📍");
                
                // 4. MISE À JOUR LOCALE (SESSION)
                currentUser.email = newEmail;
                currentUser.address = newAddress;
                currentUser.latitude = newLat;
                currentUser.longitude = newLon;
                
                localStorage.setItem("tinderFoodUser", JSON.stringify(currentUser));
                
                // 5. ACTION MAGIQUE : ON RE-TRIE LES RESTOS TOUT DE SUITE
                if (newLat && newLon) {
                    recalculateDistancesAndSort(newLat, newLon);
                }
                
                // On ferme la modale
                profileModal.style.display = "none";
            } else {
                alert("Erreur serveur : " + data.message);
            }
        } catch (e) {
            console.error(e);
            alert("Erreur de connexion. Vérifiez votre internet.");
        } finally {
            // Quoi qu'il arrive, on remet le bouton normal
            saveProfileBtn.textContent = btnOriginalText;
            saveProfileBtn.disabled = false;
        }
    });
}

// Lancement    
initGame();


// =======================
// UTILITAIRE : CALCUL DISTANCE (Haversine)
// =======================
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  
  const R = 6371; // Rayon de la terre en km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance en km
  return d.toFixed(1); // On garde 1 chiffre après la virgule (ex: 2.4 km)
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}