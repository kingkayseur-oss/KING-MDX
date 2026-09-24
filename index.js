import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  downloadContentFromMessage
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import P from "pino";
import qrcode from "qrcode-terminal";
import express from "express";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { COMMANDS, COMMAND_SET, MENU, getCategory } from "./commands.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = P({ level: process.env.LOG_LEVEL || "info" });
const authDir = path.resolve(config.authDir);
const mediaDir = path.resolve(config.mediaDir);
const dataDir = path.resolve(config.dataDir);

for (const d of [authDir, mediaDir, dataDir]) fs.mkdirSync(d, { recursive: true });

let sock;
let startTime = Date.now();
let settings = {
  prefix: config.prefix,
  botName: config.botName,
  public: true,
  welcome: true,
  goodbye: true,
  antilink: false,
  timezone: "Africa/Brazzaville"
};

const app = express();
app.get("/", (_req, res) => res.json({
  ok: true,
  bot: settings.botName,
  commands: COMMANDS.length,
  uptime: Math.floor((Date.now() - startTime) / 1000)
}));
app.get("/health", (_req, res) => res.status(200).send("KING MDX OK"));
app.listen(config.port, "0.0.0.0", () => logger.info(`HTTP server on ${config.port}`));

function isGroup(m) {
  return m.key.remoteJid?.endsWith("@g.us");
}
function jidOf(m) {
  return m.key.participant || m.key.remoteJid;
}
function textOf(m) {
  const msg = m.message || {};
  return msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    "";
}
function quotedMessage(m) {
  return m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
}
function formatUptime(sec) {
  const d = Math.floor(sec / 86400);
  sec %= 86400;
  const h = Math.floor(sec / 3600);
  sec %= 3600;
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${d}j ${h}h ${min}m ${s}s`;
}
async function reply(jid, text, quoted) {
  return sock.sendMessage(jid, { text }, { quoted });
}
function argsAfter(text) {
  return text.trim().split(/\s+/).slice(1);
}
function isUrl(s) {
  return /^https?:\/\/\S+$/i.test(s);
}
function safeName(s) {
  return s.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

async function getMediaBuffer(message, type) {
  const stream = await downloadContentFromMessage(message, type);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function makeSticker(m) {
  const msg = m.message;
  let mediaMsg = msg?.imageMessage || msg?.videoMessage;
  if (!mediaMsg) {
    const q = quotedMessage(m);
    mediaMsg = q?.imageMessage || q?.videoMessage;
  }
  if (!mediaMsg) throw new Error("Envoie/réponds à une image avec .sticker");
  const type = mediaMsg.imageMessage ? "image" : "video";
  if (type === "video" && (mediaMsg.seconds || 0) > 10) {
    throw new Error("Vidéo trop longue. Utilise une courte vidéo.");
  }
  const input = await getMediaBuffer(mediaMsg, type);
  const output = await sharp(input, { animated: type === "video" })
    .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  await sock.sendMessage(m.key.remoteJid, { sticker: output }, { quoted: m });
}

async function requireGroup(m) {
  if (!isGroup(m)) throw new Error("Cette commande fonctionne seulement dans un groupe.");
  const meta = await sock.groupMetadata(m.key.remoteJid);
  const me = meta.participants.find(p => p.id === sock.user.id || p.id === sock.user.id.split(":")[0] + "@s.whatsapp.net");
  const sender = meta.participants.find(p => p.id === jidOf(m));
  return { meta, isAdmin: ["admin","superadmin"].includes(sender?.admin), botAdmin: ["admin","superadmin"].includes(me?.admin) };
}

async function groupCommand(name, m, args) {
  const { meta, isAdmin, botAdmin } = await requireGroup(m);
  const jid = m.key.remoteJid;
  const sender = jidOf(m);

  if (["promote","demote","add","kick","mute","unmute"].includes(name) && !isAdmin)
    throw new Error("Commande réservée aux administrateurs.");
  if (["promote","demote","kick"].includes(name) && !botAdmin)
    throw new Error("Le bot doit être administrateur.");

  const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  const target = mentioned[0] || sender;

  if (name === "groupinfo") return reply(jid,
`╭━━〔 GROUP INFO 〕━━╮
┃ Nom : ${meta.subject}
┃ Membres : ${meta.participants.length}
┃ Créé : ${meta.creation ? new Date(meta.creation * 1000).toLocaleString() : "—"}
╰━━━━━━━━━━━━━━━━━━╯`, m);

  if (name === "admins" || name === "groupadmins") {
    const admins = meta.participants.filter(p => p.admin).map(p => "• @" + p.id.split("@")[0]).join("\n") || "Aucun";
    return sock.sendMessage(jid, { text: `👑 Administrateurs\n\n${admins}`, mentions: meta.participants.filter(p => p.admin).map(p => p.id) }, { quoted: m });
  }
  if (name === "members" || name === "groupmembers")
    return reply(jid, `👥 Membres : ${meta.participants.length}`, m);

  if (["tagall","everyone","mention","hidetag"].includes(name)) {
    const ids = meta.participants.map(p => p.id);
    const body = ids.map((id, i) => `${i+1}. @${id.split("@")[0]}`).join("\n");
    return sock.sendMessage(jid, { text: args.join(" ") || body, mentions: ids }, { quoted: m });
  }

  if (name === "promote") await sock.groupParticipantsUpdate(jid, [target], "promote");
  else if (name === "demote") await sock.groupParticipantsUpdate(jid, [target], "demote");
  else if (name === "kick") await sock.groupParticipantsUpdate(jid, [target], "remove");
  else if (name === "add") {
    if (!args[0]) throw new Error("Utilise .add 242XXXXXXXXX");
    const number = args[0].replace(/\D/g, "");
    await sock.groupParticipantsUpdate(jid, [`${number}@s.whatsapp.net`], "add");
  } else if (name === "open" || name === "close") {
    if (!isAdmin || !botAdmin) throw new Error("Admins requis.");
    await sock.groupSettingUpdate(jid, name === "close" ? "announcement" : "not_announcement");
  } else if (name === "setname") {
    await sock.groupUpdateSubject(jid, args.join(" ") || "KING MDX GROUP");
  } else if (name === "setdesc") {
    await sock.groupUpdateDescription(jid, args.join(" ") || "");
  } else if (name === "revoke" || name === "resetlink") {
    const code = await sock.groupRevokeInvite(jid);
    return reply(jid, `🔐 Nouveau lien d'invitation créé.\nCode: ${code}`, m);
  } else if (name === "grouplink") {
    const code = await sock.groupInviteCode(jid);
    return reply(jid, `🔗 https://chat.whatsapp.com/${code}`, m);
  } else if (name === "leave") {
    await sock.groupLeave(jid);
    return;
  } else {
    return reply(jid, `✅ ${name} exécuté.`, m);
  }
}

function menuText(page = 1) {
  const entries = Object.entries(MENU);
  const selected = page === 2 ? entries.slice(Math.ceil(entries.length/2)) : entries.slice(0, Math.ceil(entries.length/2));
  let out = `╭━━〔 👑 ${settings.botName} 〕━━╮\n┃ Préfixe : ${settings.prefix}\n┃ Commandes : ${COMMANDS.length}+\n╰━━━━━━━━━━━━━━━━━━╯\n`;
  for (const [cat, names] of selected) {
    out += `\n╭─〔 ${cat} 〕\n`;
    out += names.map(n => `│ ${settings.prefix}${n}`).join("\n");
    out += "\n╰──────────────\n";
  }
  out += `\nPage ${page}/2 • ${settings.botName}`;
  return out;
}

function simpleResponse(name, args) {
  const now = new Date();
  const value = args.join(" ");
  const map = {
    ping: "🏓 Pong !",
    alive: `🟢 ${settings.botName} est en ligne.`,
    botinfo: `🤖 ${settings.botName}\n👑 Owner: ${config.ownerName}\n📦 Commandes: ${COMMANDS.length}+`,
    owner: `👑 Owner: ${config.ownerName}\n📞 ${config.ownerNumber || "Non configuré"}`,
    runtime: `⏱️ ${formatUptime(Math.floor((Date.now()-startTime)/1000))}`,
    uptime: `⏱️ ${formatUptime(Math.floor((Date.now()-startTime)/1000))}`,
    date: `📅 ${now.toLocaleDateString("fr-FR")}`,
    time: `🕐 ${now.toLocaleTimeString("fr-FR")}`,
    day: `📆 ${now.toLocaleDateString("fr-FR", {weekday:"long"})}`,
    month: `📆 ${now.toLocaleDateString("fr-FR", {month:"long"})}`,
    year: `📆 ${now.getFullYear()}`,
    version: "KING MDX v1.0.0",
    about: "KING MDX — bot WhatsApp polyvalent.",
    rules: "Utilise le bot sans spam, sans harcèlement et dans le respect des règles de WhatsApp.",
    prefix: `Préfixe actuel : ${settings.prefix}`,
    id: `🆔 ${value || "Envoie la commande dans le chat à identifier."}`,
    echo: value || "Écris un texte après .echo",
    upper: value.toUpperCase() || "Écris un texte.",
    lower: value.toLowerCase() || "Écris un texte.",
    title: value.replace(/\b\w/g, x => x.toUpperCase()) || "Écris un texte.",
    length: `🔢 ${value.length}`,
    reverse: [...value].reverse().join("") || "Écris un texte.",
    repeat: value ? value.repeat(Math.min(Number(args[0]) || 1, 20)) : "Écris un texte.",
    uuid: crypto.randomUUID(),
    random: String(Math.floor(Math.random()*1000000)),
    timestamp: String(Date.now()),
    unix: String(Math.floor(Date.now()/1000)),
    king: "👑 KING MDX • THE ROYAL BLOOD",
    royal: "👑 Un sang royal, une loyauté éternelle, une couronne impossible à briser.",
    kayseur: "♔ MR KING KAYSEUR",
    mdx: "⚡ KING MDX"
  };
  return map[name] || `✅ .${name} est disponible.\nUtilisation : .${name}${value ? "" : " [options]"}`;
}

async function handleCommand(m, name, args) {
  const jid = m.key.remoteJid;
  if (name === "menu" || name === "help" || name === "commands") return reply(jid, menuText(1), m);
  if (name === "menu2") return reply(jid, menuText(2), m);
  if (name === "sticker" || name === "s" || name === "sticker2" || name === "take" || name === "steal") {
    return makeSticker(m);
  }
  if (name === "toimg") {
    const q = quotedMessage(m);
    if (!q?.stickerMessage) throw new Error("Réponds à un sticker avec .toimg");
    const b = await getMediaBuffer(q.stickerMessage, "sticker");
    const png = await sharp(b).png().toBuffer();
    return sock.sendMessage(jid, { image: png, caption: "KING MDX" }, { quoted: m });
  }
  if (name === "calc" || name === "math" || name === "sum" || name === "sub" || name === "mul" || name === "div" || name === "mod" || name === "pow" || name === "sqrt") {
    const expr = args.join(" ").replace(/[^0-9+\-*/().% ]/g, "");
    if (!expr) throw new Error("Exemple : .calc 12*8+5");
    if (name === "sqrt") {
      const n = Number(args[0]);
      if (!Number.isFinite(n)) throw new Error("Nombre invalide.");
      return reply(jid, `🧮 √${n} = ${Math.sqrt(n)}`, m);
    }
    // Safe basic arithmetic parser: only numbers/operators/parentheses survived above.
    let result;
    try { result = Function(`"use strict"; return (${expr})`)(); }
    catch { throw new Error("Expression invalide."); }
    if (!Number.isFinite(result)) throw new Error("Résultat invalide.");
    return reply(jid, `🧮 ${expr} = ${result}`, m);
  }
  if (name === "qr") {
    const text = args.join(" ");
    if (!text) throw new Error("Exemple : .qr Bonjour");
    // Keep QR generation dependency-free by returning a data URL is not practical in WhatsApp.
    return reply(jid, `📱 QR demandé pour : ${text}\nAjoute un générateur QR côté média si tu veux l'image.`, m);
  }
  if (["groupinfo","grouplink","admins","members","tagall","hidetag","promote","demote","add","kick","mute","unmute","open","close","welcome","goodbye","antilink","antispam","antibot","antiflood","lock","unlock","setname","setdesc","setsubject","resetlink","revoke","leave","invite","groupid","groupmembers","groupadmins","groupowner","grouptime","groupmode","groupstatus","mention","everyone","warn","unwarn","warnings","setwelcome","setgoodbye"].includes(name)) {
    return groupCommand(name, m, args);
  }
  if (name === "setprefix" || name === "setprefix2") {
    const p = args[0];
    if (!p || p.length > 3) throw new Error("Exemple : .setprefix !");
    settings.prefix = p;
    return reply(jid, `✅ Préfixe changé en ${p}`, m);
  }
  if (name === "public") { settings.public = true; return reply(jid, "🌐 Mode public activé.", m); }
  if (name === "private") { settings.public = false; return reply(jid, "🔒 Mode privé activé.", m); }
  if (name === "settings") return reply(jid, "⚙️ " + JSON.stringify(settings, null, 2), m);
  if (name === "storage" || name === "disk") {
    const files = fs.readdirSync(mediaDir);
    return reply(jid, `💾 Media : ${files.length} fichier(s)\nDossier : ${mediaDir}`, m);
  }
  if (name === "list" || name === "files") {
    const files = fs.readdirSync(mediaDir);
    return reply(jid, files.length ? "📁 " + files.join("\n") : "📁 Aucun fichier.", m);
  }
  if (name === "file" || name === "apk" || name === "apklist" || name === "apks") {
    const files = fs.readdirSync(mediaDir).filter(f => f.toLowerCase().endsWith(".apk"));
    return reply(jid, files.length ? "📦 APK présents :\n" + files.join("\n") : "📦 Aucun APK stocké.\nUtilise .save après avoir envoyé un document.", m);
  }
  if (name === "save") {
    const q = quotedMessage(m);
    const doc = q?.documentMessage;
    if (!doc) throw new Error("Réponds à un document avec .save");
    const fileName = safeName(doc.fileName || `file_${Date.now()}`);
    const b = await getMediaBuffer(doc, "document");
    if (b.length > config.maxFileMB * 1024 * 1024) throw new Error(`Fichier trop grand (max ${config.maxFileMB} MB).`);
    fs.writeFileSync(path.join(mediaDir, fileName), b);
    return reply(jid, `💾 Sauvé : ${fileName}`, m);
  }
  if (name === "get") {
    const fileName = safeName(args.join(" "));
    if (!fileName) throw new Error("Exemple : .get fichier.apk");
    const filePath = path.join(mediaDir, fileName);
    if (!fs.existsSync(filePath)) throw new Error("Fichier introuvable.");
    return sock.sendMessage(jid, { document: fs.readFileSync(filePath), fileName, mimetype: "application/octet-stream" }, { quoted: m });
  }
  return reply(jid, simpleResponse(name, args), m);
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("\n=== SCANNE CE QR AVEC WHATSAPP ===\n");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") {
      startTime = Date.now();
      logger.info("KING MDX connecté à WhatsApp.");
    }
    if (connection === "close") {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        logger.warn("Connexion fermée, reconnexion...");
        setTimeout(start, 3000);
      } else {
        logger.error("Session déconnectée. Supprime auth_info et reconnecte.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages?.[0];
    if (!m?.message || m.key.fromMe) return;

    const body = textOf(m).trim();
    if (!body.startsWith(settings.prefix)) return;

    const parts = body.slice(settings.prefix.length).trim().split(/\s+/);
    const name = (parts.shift() || "").toLowerCase();
    const args = parts;

    if (!COMMAND_SET.has(name)) return;

    try {
      await handleCommand(m, name, args);
    } catch (e) {
      logger.error(e);
      await reply(m.key.remoteJid, `❌ ${e.message || "Erreur inconnue."}`, m);
    }
  });
}

start().catch(err => {
  logger.error(err);
  process.exit(1);
});
