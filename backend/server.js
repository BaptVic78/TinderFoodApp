// 👇 LIGNE TRES IMPORTANTE : Charge les variables du fichier .env
require('dotenv').config(); 

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Servir les fichiers du frontend
app.use(express.static(path.join(__dirname, '../')));

// --- CONNEXION BASE DE DONNÉES (AWS) ---
console.log("Tentative de connexion à AWS RDS...");
console.log("Hôte :", process.env.DB_HOST); // Pour vérifier que ça lit bien le fichier

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: {
        rejectUnauthorized: false
    }
});

db.connect(err => {
    if (err) {
        console.error('❌ Erreur de connexion AWS :', err);
        return;
    }
    console.log('✅ Connecté à la base de données AWS RDS !');
});

// ==========================
// ROUTES API
// ==========================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// 1. RÉCUPÉRER LES RESTAURANTS
app.get('/api/dishes', (req, res) => {
    // Attention : Vérifie le nom de ta table sur AWS. Est-ce 'restaurants' ou autre chose ?
    const sql = "SELECT * FROM restaurants LIMIT 500"; 
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Erreur SQL" });
        }
        res.json(results);
    });
});

// 2. INSCRIPTION
app.post('/api/register', async (req, res) => {
    const { username, password, email, address } = req.body;
    if (!username || !password || !email) return res.json({ success: false, message: "Manquant" });

    try {
        const [existing] = await db.promise().query("SELECT * FROM users WHERE username = ?", [username]);
        if (existing.length > 0) return res.json({ success: false, message: "Pseudo pris" });

        const hash = await bcrypt.hash(password, 10);
        await db.promise().query(
            "INSERT INTO users (username, password_hash, email, address, created_at) VALUES (?, ?, ?, ?, NOW())", 
            [username, hash, email, address]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// 3. CONNEXION
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await db.promise().query("SELECT * FROM users WHERE username = ?", [username]);
        if (users.length === 0) return res.json({ success: false, message: "Inconnu" });

        const user = users[0];
        const match = await bcrypt.compare(password, user.password_hash);
        
        // IMPORTANT : On vérifie bien les noms de colonnes (user_id vs id)
        // Dans app.post('/api/login' ...)
        if (match) {
            // On renvoie TOUTES les infos utiles (email, address...)
            res.json({ 
                success: true, 
                user: { 
                    id: user.user_id, 
                    name: user.username,
                    email: user.email,      // Ajouté
                    address: user.address   // Ajouté
                } 
            });
        } else {
            res.json({ success: false, message: "Mauvais mot de passe" });
        }
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
});

// 4. SWIPE
app.post('/api/swipe', (req, res) => {
    const { user_id, restaurant_id } = req.body;
    const sql = "INSERT INTO swipes (user_id, restaurant_id, swipe_time) VALUES (?, ?, NOW())";
    db.query(sql, [user_id, restaurant_id], (err) => {
        if (err) return res.json({ success: false });
        res.json({ success: true });
    });
});

// 5. LIKE
app.post('/api/like', (req, res) => {
    const { user_id, restaurant_id } = req.body;
    const sql = "INSERT IGNORE INTO likes (user_id, restaurant_id) VALUES (?, ?)";
    db.query(sql, [user_id, restaurant_id], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

// 6. RÉCUPÉRER MES LIKES
app.get('/api/likes', (req, res) => {
    const userId = req.query.user_id;
    if (!userId) return res.json([]);

    // On suppose que sur AWS tes tables sont bien 'restaurants' et 'likes'
    // Et que la colonne ID est 'restaurant_id'
    const sql = `
        SELECT r.* FROM restaurants r
        JOIN likes l ON r.restaurant_id = l.restaurant_id
        WHERE l.user_id = ?
        ORDER BY l.created_at DESC
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("❌ Erreur SQL Likes :", err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// 7. AVIS
app.post('/api/review', (req, res) => {
    const { user_id, restaurant_id, rating, comment } = req.body;
    const sql = "INSERT INTO reviews (user_id, restaurant_id, rating, comment, review_time) VALUES (?, ?, ?, ?, NOW())";
    db.query(sql, [user_id, restaurant_id, rating, comment], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

// 8. METTRE À JOUR LE PROFIL (AVEC GPS)
app.put('/api/user/update', (req, res) => {
    // On reçoit maintenant latitude et longitude en plus
    const { user_id, email, address, latitude, longitude } = req.body;
    console.log(`📍 Update User ${user_id}: ${address} (${latitude}, ${longitude})`);

    const sql = "UPDATE users SET email = ?, address = ?, latitude = ?, longitude = ? WHERE user_id = ?";
    
    db.query(sql, [email, address, latitude, longitude, user_id], (err, result) => {
        if (err) {
            console.error("❌ Erreur update user :", err);
            return res.status(500).json({ success: false, message: "Erreur serveur" });
        }
        res.json({ success: true });
    });
});

// Lancement
app.listen(3000, () => {
    console.log('🚀 Serveur démarré sur http://localhost:3000');
});
