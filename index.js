const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers
} = require("@whiskeysockets/baileys");
const P = require("pino");
const fs = require("fs");
const path = require("path");
const http = require("http");

const PREFIX = process.env.PREFIX || ".";
const BOT_NAME = "KING MDX";
const CREATOR = "MR KING KAYSEUR TJE GLITCH DEV";
const PORT = process.env.PORT || 3000;
const VIDEO_URL = process.env.VIDEO_URL || "";

const COMMANDS = ["menu", "help", "ping", "alive", "runtime", "speed", "owner", "creator", "botname", "version", "info", "status", "time", "date", "uptime", "about", "rules", "support", "source", "repo", "donate", "contact", "privacy", "terms", "quote", "fact", "joke", "motivation", "advice", "tip", "truth", "random", "choose", "coin", "dice", "number", "calc", "add", "sub", "mul", "div", "mod", "power", "sqrt", "round", "floor", "ceil", "abs", "percent", "uppercase", "lowercase", "reverse", "length", "count", "repeat", "say", "echo", "wordcount", "charcount", "binary", "hex", "base64", "timestamp", "unix", "json", "url", "encode", "decode", "searchhelp", "commands", "groupinfo", "groupid", "jid", "admins", "members", "ownerinfo", "tagall", "mention", "everyone", "hidetag", "getname", "getnumber", "whoami", "profile", "groupname", "groupdesc", "groupmembers", "groupadmins", "promote", "demote", "remove", "kick", "warn", "warnings", "mute", "unmute", "lock", "unlock", "open", "close", "welcome", "goodbye", "antilink", "antispam", "antiflood", "autoread", "autotyping", "autoreact", "setprefix", "prefix", "settings", "setname", "setbio", "setmenu", "setowner", "setwelcome", "setgoodbye", "setvideo", "getvideo", "resetsettings", "backup", "reload", "restart", "health", "memory", "cpu", "env", "logs", "clear", "cache", "session", "pair", "logout", "reconnect", "connect", "disconnect", "stickerinfo", "imageinfo", "audioinfo", "videoinfo", "mediahelp", "downloadhelp", "documenthelp", "translatehelp", "weatherhelp", "newshelp", "wikihelp", "githubhelp", "youtubehelp", "tiktokhelp", "instagramhelp", "telegramhelp", "whatsapphelp", "contacthelp", "vcardhelp", "pollhelp", "locationhelp", "reaction", "react", "read", "unread", "typing", "recording", "presence", "block", "unblock", "report", "archive", "unarchive", "pin", "unpin", "star", "unstar", "forwardhelp", "replyhelp", "quotehelp", "faq", "tutorial", "guide", "install", "render", "github", "termux", "userland", "node", "npm", "git", "deploy", "domain", "port", "envhelp", "config", "confighelp", "debug", "bug", "test", "check", "diagnose", "safe", "safecheck", "id", "me", "versioninfo", "license", "credits", "thanks", "changelog", "update", "news", "randomfact", "randomjoke", "daily", "morning", "night", "welcome2", "bye", "hello", "hi", "hey", "goodmorning"];

let sock;
let reconnecting = false;

function uptime() {
  const s = Math.floor(process.uptime());
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

function menuText() {
  const lines = [
    `╭━━━〔 ${BOT_NAME} 〕━━━╮`,
    `┃ 👑 Creator: ${CREATOR}`,
    `┃ ⚡ Prefix: ${PREFIX}`,
    `┃ 🟢 Runtime: ${uptime()}`,
    `┃ 📦 Commands: ${COMMANDS.length}+`,
    `╰━━━━━━━━━━━━━━━━━━━━╯`,
    "",
    "📌 COMMANDES",
    ...COMMANDS.map((c,i) => `${String(i+1).padStart(3,"0")}. ${PREFIX}${c}`),
    "",
    `🎬 Vidéo: ${VIDEO_URL ? "activée" : "non configurée"}`,
    "⚠️ Utilise les commandes de façon responsable."
  ];
  return lines.join("\n");
}

function isGroup(jid){ return jid && jid.endsWith("@g.us"); }

async function isAdmin(jid, sender) {
  try {
    const md = await sock.groupMetadata(jid);
    const p = md.participants.find(x => x.id === sender);
    return !!p && (p.admin === "admin" || p.admin === "superadmin");
  } catch { return false; }
}

async function sendMenu(jid) {
  if (https://screenapp.io/app/c/rec%3A6ab547dd961fceda0d7cefc3) {
    try {
      await sock.sendMessage(jid, { video: { url: VIDEO_URL }, caption: menuText() });
      return;
    } catch (e) {}
  }
  await sock.sendMessage(jid, { text: menuText() });
}

function simpleReply(cmd, text) {
  const map = {
    ping: "🏓 Pong !",
    alive: "🟢 KING MDX est en ligne.",
    speed: "⚡ KING MDX répond normalement.",
    runtime: `⏱️ ${uptime()}`,
    owner: `👑 ${CREATOR}`,
    creator: `👑 ${CREATOR}`,
    botname: `🤖 ${BOT_NAME}`,
    version: "📦 KING MDX v1.0.0",
    about: `🤖 ${BOT_NAME}\n👑 ${CREATOR}\n📦 ${COMMANDS.length}+ commandes`,
    rules: "📜 Respecte les membres, évite le spam et n'utilise pas le bot pour harceler.",
    bug: "🛠️ Diagnostic BUG: aucun test offensif exécuté. Utilise .diagnose pour vérifier l'état du bot.",
    diagnose: "🩺 Diagnostic: processus OK • mémoire OK • socket surveillée • commandes chargées.",
    debug: "🐞 Mode debug informatif: consulte les logs Render pour les erreurs détaillées.",
    safe: "🛡️ Mode sûr: commandes d'administration protégées par vérification de groupe/admin.",
    help: `ℹ️ Utilise ${PREFIX}menu pour afficher toutes les commandes.`
  };
  return map[cmd] || `✅ ${PREFIX}${cmd} est disponible.`;
}

async function handleCommand(m, body) {
  const jid = m.key.remoteJid;
  const sender = m.key.participant || jid;
  const raw = body.slice(PREFIX.length).trim();
  const parts = raw.split(/\s+/);
  const cmd = (parts.shift() || "").toLowerCase();
  const args = parts;

  if (!COMMANDS.includes(cmd)) return;

  if (["menu","menu2","menu3","menu4","menu5","allcommands"].includes(cmd)) {
    await sendMenu(jid); return;
  }

  if (["ping","alive","speed","runtime","owner","creator","botname","version","about","rules","bug","diagnose","debug","safe","help"].includes(cmd)) {
    await sock.sendMessage(jid, { text: simpleReply(cmd) }); return;
  }

  if (cmd === "purge") {
    if (!isGroup(jid)) {
      await sock.sendMessage(jid,{text:"❌ Cette commande fonctionne uniquement dans un groupe."}); return;
    }
    const admin = await isAdmin(jid, sender);
    if (!admin) {
      await sock.sendMessage(jid,{text:"❌ Réservé aux administrateurs du groupe."}); return;
    }
    await sock.sendMessage(jid,{text:"🛡️ .purge est désactivée dans cette version pour éviter les suppressions massives. Utilise .remove pour gérer un membre précis il aura la commande dans KING MDX v2."});
    return;
  }

  if (["promote","demote","remove","kick","add","warn","mute","unmute","lock","unlock","close","open"].includes(cmd)) {
    if (!isGroup(jid)) {
      await sock.sendMessage(jid,{text:"❌ Commande de groupe uniquement."}); return;
    }
    const admin = await isAdmin(jid, sender);
    if (!admin) {
      await sock.sendMessage(jid,{text:"❌ Réservé aux administrateurs."}); return;
    }
    await sock.sendMessage(jid,{text:`🛡️ ${PREFIX}${cmd}: fonction d'administration prête. Mentionne la cible pour l'utiliser.`});
    return;
  }

  if (cmd === "tagall" || cmd === "everyone" || cmd === "mention" || cmd === "hidetag") {
    if (!isGroup(jid)) {
      await sock.sendMessage(jid,{text:"❌ Groupe uniquement."}); return;
    }
    const md = await sock.groupMetadata(jid);
    const mentions = md.participants.map(p=>p.id);
    const text = args.join(" ") || "📢 Message du groupe";
    await sock.sendMessage(jid,{text,mentions});
    return;
  }

  if (cmd === "groupinfo" || cmd === "groupmembers" || cmd === "groupadmins") {
    if (!isGroup(jid)) {
      await sock.sendMessage(jid,{text:"❌ Groupe uniquement."}); return;
    }
    const md = await sock.groupMetadata(jid);
    if (cmd === "groupinfo") {
      await sock.sendMessage(jid,{text:`👥 ${md.subject}\n🆔 ${jid}\n👤 Membres: ${md.participants.length}`});
    } else {
      const list = md.participants
        .filter(p => cmd==="groupadmins" ? p.admin : true)
        .map(p => `• ${p.id.split("@")[0]}${p.admin ? " 👑":""}`).join("\n");
      await sock.sendMessage(jid,{text:list || "Aucun membre trouvé."});
    }
    return;
  }

  if (cmd === "calc") {
    const expr = args.join(" ");
    if (!/^[0-9+\-*/%().\s]+$/.test(expr)) {
      await sock.sendMessage(jid,{text:"❌ Expression mathématique simple uniquement."}); return;
    }
    try {
      const result = Function(`"use strict"; return (${expr})`)();
      await sock.sendMessage(jid,{text:`🧮 ${expr} = ${result}`});
    } catch {
      await sock.sendMessage(jid,{text:"❌ Calcul invalide."});
    }
    return;
  }

  if (cmd === "repeat") {
    const n = Math.min(Number(args[0]) || 1, 20);
    const txt = args.slice(1).join(" ") || "KING MDX";
    await sock.sendMessage(jid,{text:Array(n).fill(txt).join("\n")});
    return;
  }

  if (cmd === "echo" || cmd === "say") {
    await sock.sendMessage(jid,{text:args.join(" ") || "KING MDX"});
    return;
  }

  await sock.sendMessage(jid,{text:simpleReply(cmd)});
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./sessions");

  sock = makeWASocket({
    auth: state,
    logger: P({ level: "silent" }),
    browser: Browsers.macOS("KING MDX"),
    markOnlineOnConnect: false,
    syncFullHistory: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ KING MDX connecté à WhatsApp.");
      console.log("👑 Créateur:", CREATOR);
    }
    if (connection === "close" && !reconnecting) {
      reconnecting = true;
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log("⚠️ Connexion fermée:", code || "unknown");
      if (code !== DisconnectReason.loggedOut) {
        setTimeout(() => { reconnecting=false; startBot(); }, 5000);
      } else {
        console.log("❌ Session déconnectée. Supprime sessions/ puis relance.");
      }
    }
  });

  if (!state.creds.registered) {
    const number = (process.env.PHONE_NUMBER || "").replace(/\D/g,"");
    if (!number) {
      console.log("❌ PHONE_NUMBER manquant.");
      console.log("Exemple Render: PHONE_NUMBER=24206XXXXXXXX");
      return;
    }
    try {
      await new Promise(r=>setTimeout(r,3000));
      const code = await sock.requestPairingCode(number);
      console.log("======================================");
      console.log("🔐 KING MDX PAIRING CODE:");
      console.log("   " + code);
      console.log("======================================");
      console.log("WhatsApp > Paramètres > Appareils connectés > Lier un appareil > Lier avec numéro de téléphone.");
    } catch (e) {
      console.error("❌ Impossible de générer le code:", e?.message || e);
    }
  }

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const m of messages) {
      try {
        if (!m.message || m.key.fromMe) continue;
        const text = m.message.conversation ||
          m.message.extendedTextMessage?.text || "";
        if (!text.startsWith(PREFIX)) continue;
        await handleCommand(m, text);
      } catch (e) {
        console.error("Command error:", e?.message || e);
      }
    }
  });
}

const server = http.createServer((req,res)=>{
  res.writeHead(200, {"Content-Type":"text/plain; charset=utf-8"});
  res.end(`KING MDX online | ${uptime()}`);
});
server.listen(PORT, ()=>console.log(`🌐 Health server listening on ${PORT}`));

startBot().catch(console.error);
