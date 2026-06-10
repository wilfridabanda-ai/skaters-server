# Skaters Server — Guide de déploiement

## Étapes pour déployer sur Railway

### 1. Installe GitHub Desktop sur ton PC

Va sur <https://desktop.github.com> et installe-le.

### 2. Crée un repo GitHub

- Ouvre GitHub Desktop
- Clique “Create New Repository”
- Nom : `skaters-server`
- Clique “Create Repository”

### 3. Copie les fichiers

Copie ces 3 fichiers dans le dossier du repo :

- server.js
- package.json
- railway.toml

### 4. Push sur GitHub

Dans GitHub Desktop :

- Tu verras les fichiers ajoutés
- En bas à gauche, écris “first commit”
- Clique “Commit to main”
- Clique “Publish repository”

### 5. Déploie sur Railway

- Va sur railway.app
- Clique “New Project”
- Clique “Deploy from GitHub repo”
- Sélectionne “skaters-server”
- Railway déploie automatiquement !

### 6. Récupère l’URL du serveur

- Dans Railway, clique sur ton projet
- Va dans “Settings” → “Domains”
- Génère un domaine public
- Copie l’URL (ex: skaters-server.railway.app)

### 7. Configure l’URL dans ton site Skaters

Dans skaters.html, remplace SERVER_URL par ton URL Railway.

## Variables d’environnement (optionnel)

Sur Railway → Variables, tu peux ajouter :

- FUHRERLOGS_EMAIL=[stephanbrandon4@gmail.com](mailto:stephanbrandon4@gmail.com)
- GMAIL_PASS=hzps fjgy etdi syof

## Test

Ouvre l’URL Railway dans ton navigateur.
Tu dois voir : {“status”:“Skaters server running”}