# KING MDX — WhatsApp Bot

Créateur : MR KING KAYSEUR TJE GLITCH DEV

## Connexion
Ce projet utilise le **Pairing Code WhatsApp**, sans QR code. Baileys permet de demander un code de liaison lorsque la session n'est pas encore enregistrée. Le code retourné est un code de pairing de 8 caractères.

Sur Render, ajoute :
- `PHONE_NUMBER` = ton numéro WhatsApp avec indicatif pays, chiffres uniquement
- `PREFIX` = `.`
- `VIDEO_URL` = URL directe d'une vidéo MP4 si tu veux que `.menu` envoie une vidéo avec le menu

⚠️ Pour garder la session après un redémarrage, configure un disque persistant Render monté sur le projet afin que le dossier `sessions/` ne soit pas perdu.

## Démarrage local
```bash
npm install
PHONE_NUMBER=242XXXXXXXXX npm start
```

## Render
1. Mets les fichiers dans un dépôt GitHub.
2. Crée un Web Service Node.
3. Build command : `npm install`
4. Start command : `npm start`
5. Ajoute les variables d'environnement.
6. Ajoute un disque persistant monté sur `/opt/render/project/src/sessions` (ou adapte le chemin selon ton service).
7. Déploie et regarde les logs : le pairing code sera affiché.

## Commandes
Le bot contient plus de 200 commandes. `.menu` affiche la liste complète.

### Important
La commande `.purge` est volontairement protégée/désactivée pour éviter une suppression massive de membres. Les commandes d'administration vérifient le statut d'administrateur.
