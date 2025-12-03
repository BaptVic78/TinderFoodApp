require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

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

app.listen(3000, () => {
    console.log('🚀 Serveur démarré sur http://localhost:3000');
});