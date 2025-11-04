const AppError = require("./AppError");//tratamento de erros
require('dotenv').config();

async function sendEmail(to, subject, text, html) {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.EMAIL_KEY);

  try {
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: String(to),
    subject: String(subject),
    text: text ? String(text) : '', 
    html: html ? String(html) : ''
  });

  console.log('Email enviado com sucesso');
  } catch(error) {
   console.error(error)
   throw new AppError(`Erro ao enviar email: ${error.message}`, 500)
  };

  
};

module.exports = sendEmail;
