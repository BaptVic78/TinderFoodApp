require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();

app.use(cors());
app.use(express.json());

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

db.connect((err) => {
    if (err) {
        console.error('Erreur de connexion à la base de données :', err);
        return;
    }
    console.log('Connecté à la base de données MySQL !');
});

// 1. Inscription
// 1. Inscription (Mise à jour avec Email et Adresse)
app.post('/api/register', async (req, res) => {
    // On récupère les nouveaux champs
    const { username, password, email, address } = req.body;

    // Validation : On veut au moins un pseudo, un mdp et un email
    if (!username || !password || !email) {
        return res.json({ success: false, message: "Pseudo, Email et Mot de passe requis." });
    }

    try {
        // Vérif doublon (Pseudo OU Email)
        const [existing] = await db.promise().query(
            "SELECT * FROM users WHERE username = ? OR email = ?", 
            [username, email]
        );
        
        if (existing.length > 0) {
            return res.json({ success: false, message: "Ce pseudo ou cet email est déjà utilisé." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Insertion complète
        await db.promise().query(
            "INSERT INTO users (username, password_hash, email, address, created_at) VALUES (?, ?, ?, ?, NOW())", 
            [username, hashedPassword, email, address]
        );
        
        res.json({ success: true, message: "Compte créé ! Connecte-toi." });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

// 2. Connexion
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [users] = await db.promise().query("SELECT * FROM users WHERE username = ?", [username]);
        
        if (users.length === 0) {
            return res.json({ success: false, message: "Utilisateur inconnu" });
        }

        const user = users[0];

        // Comparaison avec 'password_hash'
        const match = await bcrypt.compare(password, user.password_hash);

        if (match) {
            res.json({ 
                success: true, 
                user: { id: user.user_id, name: user.username } 
            });
        } else {
            res.json({ success: false, message: "Mot de passe incorrect" });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Erreur serveur" });
    }
});

app.get('/api/dishes', (req, res) => {
    // 1. La requête SQL adaptée à ta table 'restaurants'
    // On sélectionne le nom, le type de nourriture et l'url de la photo
    // On ajoute "WHERE photo_url IS NOT NULL" pour éviter les bugs d'affichage si un resto n'a pas de photo
    const sql = "SELECT * FROM restaurants WHERE photo_url IS NOT NULL"; 
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Erreur SQL :", err);
            return res.status(500).send("Erreur serveur");
        }
        res.json(results);
    });
});

app.use(express.static(path.join(__dirname, '../')));

app.get('/', (req, res) => {
    // On remonte d'un dossier pour trouver index.html
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Route pour ajouter un avis
app.post('/api/review', (req, res) => {
    const { restaurant_id, rating, comment } = req.body;

    // Pour l'instant, on met un user_id arbitraire (ex: 1) car tu n'as pas de système de login
    const user_id = 1; 

    const sql = `
        INSERT INTO reviews (user_id, restaurant_id, rating, comment, review_time)
        VALUES (?, ?, ?, ?, NOW())
    `;

    db.query(sql, [user_id, restaurant_id, rating, comment], (err, result) => {
        if (err) {
            console.error("Erreur insertion review :", err);
            return res.status(500).json({ error: "Erreur lors de l'enregistrement" });
        }
        res.json({ success: true, message: "Avis enregistré !" });
    });
});

// Enregistrer un Swipe (Uniquement le gagnant)
app.post('/api/swipe', (req, res) => {
    const { user_id, restaurant_id } = req.body;

    if (!user_id || !restaurant_id) {
        return res.json({ success: false, message: "Données manquantes" });
    }

    // ON A RETIRÉ 'type_swipe' et 'like' DE LA REQUÊTE
    const sql = `
        INSERT IGNORE INTO swipes (user_id, restaurant_id, swipe_time) 
        VALUES (?, ?, NOW())
    `;

    db.query(sql, [user_id, restaurant_id], (err, result) => {
        if (err) {
            console.error("Erreur swipe :", err);
            // On ne renvoie pas d'erreur 500 pour ne pas bloquer le jeu, juste un log
            return res.status(200).json({ success: false });
        }
        res.json({ success: true });
    });
});

app.listen(3000, () => {
    console.log('🚀 Serveur démarré sur http://localhost:3000');
});