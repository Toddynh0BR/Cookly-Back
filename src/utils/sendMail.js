// sendMail.js
require('dotenv').config();
const { google } = require('googleapis');
const AppError = require('./AppError');

function makeRawMessage(to, from, subject, html) {
  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    html,
  ];
  const encodedSubject = `=?utf-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
  const message = messageParts.join('\n');
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sendMail({ to, subject, html }) {
  console.log(`EXECUTANDO SENDMAIL COM: ${to}, ${subject}, ${html}`);

  try {
    if (!to || !subject || !html) {
      throw new AppError(
        `Parâmetros inválidos para envio de email. Recebido: to=${to}, subject=${subject}`,
        400
      );
    }

    const oAuth2Client = new google.auth.OAuth2(
      process.env.DESKTOP_CLIENT_ID,
      process.env.DESKTOP_CLIENT_SECRET
    );
    oAuth2Client.setCredentials({ refresh_token: process.env.DESKTOP_REFRESH_TOKEN });

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const raw = makeRawMessage(to, process.env.GMAIL_USER, subject, html);

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    console.log('✅ Email enviado com sucesso! ID:', res.data.id);
    return res.data;
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    throw new AppError(`Erro ao enviar email: ${error.message || ''}`, 500);
  }
}

module.exports = { sendMail };
