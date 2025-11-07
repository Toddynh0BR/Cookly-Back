// refresh_token.js
const { google } = require("googleapis");
const readline = require("readline");

const oauth2Client = new google.auth.OAuth2(
  process.env.DESKTOP_CLIENT_ID,
  process.env.DESKTOP_CLIENT_SECRET,
  "urn:ietf:wg:oauth:2.0:oob"
);

const SCOPES = ["https://mail.google.com/"];

const url = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
});

console.log("👉 Visite este link e cole o código abaixo:");
console.log(url);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Cole aqui o código: ", async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  console.log("\n✅ Seu refresh token é:");
  console.log(tokens.refresh_token);
  rl.close();
});
