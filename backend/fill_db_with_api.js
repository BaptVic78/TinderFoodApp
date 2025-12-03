require('dotenv').config();
const mysql = require('mysql2/promise');

// 👇 COLLE TA CLÉ UNSPLASH ICI 👇
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_KEY;

// Mapping pour aider Unsplash à comprendre tes catégories bizarres
const KEYWORD_MAPPING = {
    "french": "french food",
    "japanese": "sushi",
    "italian": "pasta",
    "asian": "asian food",
    "indian": "indian food curry",
    "burger": "burger",
    "pizza": "pizza",
    "fast_food": "junk food",
    "salad": "salad healthy",
    "dessert": "pastry",
    "kebab": "kebab",
    "vietnamese": "pho food",
    "thai": "thai food",
    "chinese": "chinese food",
    "lebanese": "lebanese food",
    "korean": "korean food",
    "mexican": "tacos",
    "bagel": "bagel sandwich",
    // Ajoute d'autres si besoin
};

async function fetchUnsplashPhotos(query, count) {
    if (!query) return [];
    try {
        // On demande 'count' photos à l'API
        // L'API free est limitée à 30 par page, donc on boucle si besoin, 
        // mais pour faire simple on prend une page de 30 max par requête pour économiser le quota.
        const url = `https://api.unsplash.com/search/photos?query=${query}&per_page=${Math.min(count, 30)}&orientation=landscape&client_id=${UNSPLASH_ACCESS_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.results) {
            // On renvoie juste les URLs régulières
            return data.results.map(img => img.urls.regular);
        }
        return [];
    } catch (error) {
        console.error(`❌ Erreur Unsplash pour ${query}:`, error.message);
        return [];
    }
}

async function massiveUpdate() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            ssl: { rejectUnauthorized: false }
        });
        console.log("✅ Connecté à la BDD.");

        // 1. On récupère tous les restaurants groupés par type de Food
        // On ne prend que ceux qui n'ont PAS de photo (NULL) ou une photo vide
        const [rows] = await connection.execute(
            "SELECT restaurant_id, Food FROM restaurants" 
            // Si tu veux écraser les anciennes photos moches, garde la ligne du dessus.
            // Sinon ajoute : WHERE photo_url IS NULL
        );

        // On organise les restos par catégorie : { "pizza": [id1, id2...], "sushi": [id5, id8...] }
        const categories = {};
        for (const row of rows) {
            // Nettoyage basique du nom de la food
            let type = "restaurant"; // Par défaut
            if (row.Food) {
                const rawType = row.Food.toLowerCase();
                // On cherche un mot clé connu
                for (const key of Object.keys(KEYWORD_MAPPING)) {
                    if (rawType.includes(key)) {
                        type = KEYWORD_MAPPING[key];
                        break;
                    }
                }
            }
            
            if (!categories[type]) categories[type] = [];
            categories[type].push(row.restaurant_id);
        }

        console.log(`📊 Analyse : ${Object.keys(categories).length} catégories détectées.`);

        // 2. Pour chaque catégorie, on va chercher des photos
        for (const [searchTerm, restaurantIds] of Object.entries(categories)) {
            if (restaurantIds.length === 0) continue;

            console.log(`\n📸 Recherche de photos pour : "${searchTerm}" (${restaurantIds.length} restos)...`);
            
            // On récupère des photos (max 30 par coup pour pas griller l'API trop vite)
            const photos = await fetchUnsplashPhotos(searchTerm, 30);
            
            if (photos.length === 0) {
                console.log("   -> Aucune photo trouvée, on passe.");
                continue;
            }

            // 3. On distribue les photos aux restaurants
            let photoIndex = 0;
            for (const id of restaurantIds) {
                const url = photos[photoIndex];
                
                // Mise à jour BDD
                await connection.execute(
                    "UPDATE restaurants SET photo_url = ? WHERE restaurant_id = ?",
                    [url, id]
                );

                // On passe à la photo suivante
                photoIndex++;
                
                // Si on a épuisé les photos, on recommence au début de la liste (pas le choix si on a 100 restos et 30 photos)
                if (photoIndex >= photos.length) {
                    photoIndex = 0;
                }
            }
            console.log(`   -> ✅ ${restaurantIds.length} restaurants mis à jour.`);
        }

        console.log("\n🎉 TERMINE ! Ta base est remplie.");

    } catch (error) {
        console.error("Erreur générale :", error);
    } finally {
        if (connection) connection.end();
    }
}

massiveUpdate();