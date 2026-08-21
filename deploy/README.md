# ACTIV FITNESS — Backend & Admin Panel

Site web complet + base de données + panneau d'administration.

## Structure

```
wweb sport/
├── front end/        → Site public (HTML/CSS/JS/images)
├── backend/          → Serveur Node.js + API + SQLite + Admin
│   ├── server.js     → Point d'entrée (Express)
│   ├── db.js         → Base de données (node:sqlite) + seed
│   ├── config.json   → Port + identifiants admin (modifiable)
│   ├── activ.db      → Base SQLite (créée automatiquement)
│   ├── uploads/      → Images des produits
│   └── public/       → Panneau admin (Tableau de bord, Commandes, Produits, Messages, Adhésions)
└── deploy/
    └── start.bat     → Démarrage en un double-clic
```

## Démarrer (Windows)

1. Double-cliquez sur **`deploy\start.bat`** (installe les dépendances au premier lancement).
2. Une petite fenêtre noire s'ouvre — **c'est le serveur, laissez-la ouverte** tant que vous utilisez le site.
3. Ouvrez:
   - Site public: `http://localhost:3000/`
   - Panneau admin: `http://localhost:3000/admin`

## Arrêter

- Cliquez sur la **croix X** de la fenêtre noire du serveur.
- Si le site reste accessible malgré tout (ancien serveur fantôme) ou si le port 3000 est occupé : double-cliquez sur **`deploy\stop.bat`**.
- `start.bat` supprime automatiquement un ancien serveur encore actif avant de démarrer.

Ou manuellement:
```
cd backend
npm install
npm start
```

## Identifiants administrateur

| Champ | Valeur |
|-------|--------|
| Nom d'utilisateur | `admin` |
| Mot de passe | `admin123` |

Changez-les dans `backend\config.json` puis redémarrez le serveur.

## Fonctionnalités

- **Site public** : boutique (produits depuis la base), panier, checkout (commande enregistrée), formulaire de contact, demande d'adhésion via les boutons plans.
- **Panneau admin (français)** :
  - **Tableau de bord** : statistiques (commandes, en attente, CA en DT, adhésions, produits, messages non lus) + dernières commandes.
  - **Commandes** : statut (en attente / payée / livrée / annulée), suppression.
  - **Produits** : ajouter / modifier / supprimer, upload d'image.
  - **Messages** : marquer lu / non lu, supprimer.
  - **Adhésions** : liste des demandes de plans, suppression.

## API résumée

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/login` | Connexion admin (session) |
| POST | `/api/auth/logout` | Déconnexion |
| GET | `/api/auth/me` | Session actuelle |
| GET | `/api/products` | Produits (public) |
| POST | `/api/orders` | Créer une commande |
| POST | `/api/contacts` | Envoyer un message |
| POST | `/api/members` | Demande d'adhésion |
| GET | `/api/admin/stats` | Statistiques (admin) |
| GET/PATCH/DELETE | `/api/admin/orders...` | Gestion des commandes |
| GET/POST/PUT/DELETE | `/api/admin/products...` | Gestion des produits |
| GET/PATCH/DELETE | `/api/admin/contacts...` | Gestion des messages |
| GET/DELETE | `/api/admin/members...` | Gestion des adhésions |

Base de données : SQLite intégré à Node.js (`node:sqlite`) — aucun installateur supplémentaire requis. Node.js ≥ 22.5 recommandé.