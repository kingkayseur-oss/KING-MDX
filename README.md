# 👑 KING MDX — WhatsApp Bot

Bot WhatsApp Node.js basé sur Baileys, avec 200+ commandes, `.menu`, `.menu2`, stickers, outils de groupe et gestion de fichiers.

## 1. Installation locale

```bash
npm install
npm start
```

Un QR code apparaîtra dans le terminal. Scanne-le avec WhatsApp > Appareils connectés.

## 2. Variables

`OWNER_NUMBER` est optionnel.

Exemple:
```text
OWNER_NUMBER=242XXXXXXXXX
```

## 3. Render

Sur Render:
- New → Web Service
- connecte ton dépôt GitHub
- Build Command: `npm install`
- Start Command: `npm start`
- ajoute `OWNER_NUMBER` dans Environment Variables

Le service expose `/health`.

## 4. Persistance

Le dossier `auth_info/` contient la session WhatsApp. Render utilise par défaut un système de fichiers éphémère : pour conserver cette session après redémarrage/déploiement, utilise un stockage persistant ou une base externe adaptée.

## 5. Commandes

`.menu` affiche la première partie.
`.menu2` affiche la deuxième partie.

Exemples:
```text
.ping
.menu
.menu2
.sticker
.toimg
.groupinfo
.tagall
.promote
.demote
.kick
.calc 12*8
.save
.list
.get fichier.apk
```

Utilise le bot de manière responsable. Évite le spam et les envois automatisés massifs.
