// KING MDX - 200+ command registry.
// Most utility commands are real and safe; media/group commands have dedicated handlers in index.js.

const groups = {
  MAIN: [
    "menu","menu2","help","commands","ping","alive","runtime","speed","botinfo","owner",
    "version","uptime","status","about","repo","support","rules","prefix","setprefix",
    "id","jid","me","profile","whoami","date","time","day","month","year","echo"
  ],
  GROUP: [
    "groupinfo","grouplink","admins","members","tagall","hidetag","promote","demote","add","kick","kickall",
    "mute","unmute","open","close","welcome","goodbye","antilink","antispam","antibot","antiflood",
    "lock","unlock","setname","setdesc","setsubject","resetlink","revoke","leave","invite",
    "groupid","groupmembers","groupadmins","groupowner","grouptime","groupmode","groupstatus",
    "mention","everyone","warn","unwarn","warnings","setwelcome","setgoodbye"
  ],
  MEDIA: [
    "sticker","s","sticker2","take","steal","toimg","tovideo","resize","crop","rotate","flip",
    "mirror","blur","sharpen","grayscale","webp","png","jpg","jpeg","gif","mp4","mp3","voice",
    "audio","photo","video","media","caption","setcaption","exif","meme","quote","wanted",
    "triggered","wasted","horny","blurface","pixel","circle","square","round","thumbnail"
  ],
  FILES: [
    "file","save","get","list","files","rename","delete","copy","move","mkdir","rmdir","exists",
    "size","type","path","read","write","append","download","upload","document","sendfile",
    "apk","apks","apklist","apkinfo","apkdelete","apkrename","zip","unzip","tar","untar",
    "json","txt","log","backup","restore","export","import","clearfiles","storage","disk"
  ],
  TOOLS: [
    "calc","math","sum","sub","mul","div","mod","pow","sqrt","percent","average","min","max",
    "random","choose","count","reverse","upper","lower","title","length","repeat","replace",
    "search","find","qr","encode","decode","base64","url","unurl","short","translate","define",
    "weather","country","currency","unit","uuid","hash","md5","sha256","color","rgb","hex",
    "timestamp","unix","binary","hexcode","jsonparse","jsonformat"
  ],
  FUN: [
    "joke","fact","quoteoftheday","motivation","compliment","roast","ship","love","rate","8ball",
    "coin","dice","rps","chooseme","truth","dare","emojify","mock","tiny","big","zalgo","ascii",
    "tableflip","shrug","clap","fire","heart","king","royal","kayseur","mdx","welcome2","goodnight"
  ],
  SETTINGS: [
    "setbotname","setowner","setmode","public","private","setprefix2","autoread","autotyping",
    "autorecord","autostatus","antilinkon","antilinkoff","welcomeon","welcomeoff","goodbyon",
    "goodbyoff","settimezone","setlanguage","setmenu","setmenu2","resetsettings","settings",
    "reload","restart","shutdown","broadcastinfo","maintenance","debug","logs","clearlogs"
  ]
};

export const COMMANDS = Object.entries(groups).flatMap(([category, names]) =>
  names.map(name => ({ name, category }))
);

export const COMMAND_SET = new Set(COMMANDS.map(x => x.name));

export const MENU = Object.fromEntries(
  Object.entries(groups).map(([category, names]) => [category, names])
);

export function getCategory(name) {
  return COMMANDS.find(c => c.name === name)?.category || "OTHER";
}
