const { google } = require('googleapis');
const readline = require('readline');

const CLIENT_ID = '';
const CLIENT_SECRET = '';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  'http://localhost'
);

const scopes = [
  'https://www.googleapis.com/auth/gmail.send'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent'
});

console.log('\nAuthorize this app by visiting this url:\n');
console.log(authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('\nEnter the code from that page here: ', async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  console.log('\nTokens:\n', tokens);
  rl.close();
});