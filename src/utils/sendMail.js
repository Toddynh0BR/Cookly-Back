// sendMail.js
const { google } = require('googleapis');
const fs = require('fs');

// Função para criar OAuth2 client
function createOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  return oauth2Client;
}

// Função que cria o corpo da mensagem em base64
function makeBody(to, from, subject, message) {
  const str = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    message,
  ].join('\n');

  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Função principal para enviar e-mail
async function sendMail({ to, subject, html }) {
  try {
    const oauth2Client = createOAuth2Client();
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const raw = makeBody(to, process.env.SENDER_EMAIL, subject, html);

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    console.log('Email enviado com sucesso:', res.data.id);
    return res.data;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    throw error;
  }
}

// Exporta a função para ser usada em todo o backend
module.exports = { sendMail };
