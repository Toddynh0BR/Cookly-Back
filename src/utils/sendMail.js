require('dotenv').config();

async function sendEmail(from, to, subject, text, html) {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.EMAIL_KEY);

  const result = await resend.emails.send({
    from,
    to,
    subject,
    text: text || '', 
    html: html || ''
  });

  console.log('Email enviado com sucesso');
};

module.exports = sendEmail;
