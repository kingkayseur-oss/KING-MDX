export const config = {
  botName: "KING MDX",
  prefix: ".",
  ownerName: "King Kayseur",
  ownerNumber: process.env.OWNER_NUMBER || "",
  port: Number(process.env.PORT || 10000),
  authDir: process.env.AUTH_DIR || "./auth_info",
  mediaDir: "./media",
  dataDir: "./data",
  maxFileMB: 20
};
