const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: 'db-tinderfood-project.chgk2icu2ae6.eu-north-1.rds.amazonaws.com',
    user: 'admin',      
    password: 'ibC%yFRd0D~fV/1cm.',    
    database: 'tinderfood' ,
    port: 3306
});

db.connect((err) => {
    if (err) {
        console.error('Erreur de connexion à la base de données :', err);
        return;
    }
    console.log('Connecté à la base de données MySQL !');
});

app.get('/api/dishes', (req, res) => {
    const sql = "SELECT photo_url AS src, description AS desc FROM dishes"; // Vérifie les noms de colonnes !
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Erreur serveur");
        }
        res.json(results);
    });
});

app.listen(3000, () => {
    console.log('🚀 Serveur démarré sur http://localhost:3000');
});