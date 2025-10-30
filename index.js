const nodemailer = require("nodemailer");//Enviar email
require("express-async-errors");//Gerenciador de erros
require('dotenv').config();//Gerenciador de Variaveis de ambiente

const sendPushNotification = require('./src/utils/SendNotification');//função para enviar notificação
const AppError = require("./src/utils/AppError");//tratamento de erros
const knex = require("./src/database");//conexão com o banco de dados

const express = require('express');//ferramenta geral para back end
const cors = require("cors");//conexão com o front

const routes = require("./routes");//Rotas do back end
const app = express();//Inicia o Back end como aplicação com o express
app.use(cors());//Ativa o cors para conexões externas

app.use(express.json());//Passa todas as requisições para arquivo JSON
app.use(express.urlencoded({ extended: true }));//Permite requisições com arquivos complexos
app.use(routes);//Utiliza as Rotas no APP

// async function CheckDatabase(req, res){
//  console.log("Verificando banco de dados...")
//   try {
//    const dataBase = await knex('conquistas');

//   }catch (error) {
//    if(error.message.includes('SQLITE_ERROR: no such table')){
//     console.log("Banco de dados corrompido!")
//     console.log("Iniciando o processo de substituição...");

//     try {
//      const folderId = "124rRIbvgvsnpmesE7uRWt5FQI0gHz8SG"; 
//      const localPath = path.resolve(__dirname, "database", "database.db");

//      const fileId = await getLatestBackupFileId(folderId);
//      await downloadAndReplaceDatabase(fileId, localPath);

//      console.log("Arquivo database.db restaurado com sucesso.");
//     } catch (restoreError) {
//      console.error("Erro ao restaurar o backup:", restoreError);
//     }
//    }
//   }
// }; checar banco de dados

//CheckDatabase();//verifica integridade do banco de dados ao iniciar o servidor


app.use(( error, request, response, next)=>{
 if(error instanceof AppError){
 return response.status(error.statusCode).json({
    status: "error",
    message: error.message
 })
 }

 console.error(error)

 return response.status(500).json({
 status: "error",
 message: "internal server error"
 })
})//tratamento de erros

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`serve is running on port ${PORT}`));

//executar backup de banco de dados
const cron = require('node-cron');
const { exec } = require('child_process');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true para 465, false para outras portas
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});//Configuração para envio de emails

cron.schedule('0 11 23 * *', 
  async () =>  {
  const dataReferencia = new Date('2024-05-23');

  // Data atual
  const dataAtual = new Date();

  // Calcular a diferença em anos e meses
  const anosDeDiferenca = dataAtual.getFullYear() - dataReferencia.getFullYear();
  const mesesDeDiferenca = dataAtual.getMonth() - dataReferencia.getMonth();

  // Total de meses
  const totalMeses = anosDeDiferenca * 12 + mesesDeDiferenca;

  console.log(`Meses passados: ${totalMeses}`);

  
  const tokens = await knex('token');
  console.log(tokens);

  if (!tokens.length) return;

  tokens.forEach(token => {
    console.log(token.token);
    const message = `Feliz Aniversário de Namoro ${token.name}! Juntos há ${totalMeses} meses!`;
    sendPushNotification(token.token, message, 'Feliz Aniversário de Namoro!');
  });
  },
);

///GOOGLE DRIVE
const { google } = require("googleapis");
const fs = require("fs-extra");
const path = require("path");


const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.CREDENTIALS_PATH),
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});//autenticação

const drive = google.drive({ version: "v3", auth });//conexão com o google drive

async function getLatestBackupFileId(folderId) {
  const res = await drive.files.list({
    q: `'${folderId}' in parents`,
    orderBy: "modifiedTime desc",
    pageSize: 1,
    fields: "files(id, name, modifiedTime)",
  });

  const files = res.data.files;
  if (files.length === 0) {
    throw new Error("Nenhum arquivo encontrado na pasta de backup.");
  }

  return files[0].id;
};//buscar arquivo .db mais recente mais recente

async function downloadAndReplaceDatabase(fileId, destinationPath) {
  const dest = fs.createWriteStream(destinationPath);

  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );

  await new Promise((resolve, reject) => {
    res.data
      .on("end", () => {
        console.log("Download concluído.");
        resolve();
      })
      .on("error", (err) => {
        console.error("Erro no download.", err);
        reject(err);
      })
      .pipe(dest);
  });
};//substituir arquivo .db antigo por novo

app.get("/replace", async (req, res)=> {
  console.log("Iniciando o processo de substituição...");

  try {
    const folderId = process.env.BACKUP_FOLDER_ID; 
    const localPath = path.resolve(__dirname, "database", "database.db");

    const fileId = await getLatestBackupFileId(folderId);
    await downloadAndReplaceDatabase(fileId, localPath);

    console.log("Arquivo database.db restaurado com sucesso.");
    return res.status(200).json({ message: "Arquivo database.db restaurado com sucesso." });
  } catch (error) {
    console.error("Erro ao restaurar o backup:", error);
    throw new AppError("Erro ao substituir banco de dados", 500);
  }
});//Rota para substituir banco de dados

app.get('/health', (req, res) => {
  console.log('Executando health check');
   res.json({ status: 'online' });
});//health check

app.head('/health', (req, res) => {
  console.log('Executando health check');
  res.status(200).end();
});//health check

app.post('/push-token', async (req, res) => {
  try {
    const { token, name } = req.body;
    console.log('Executando push-token');

    if (!token) {
      throw new AppError('Token inválido');
    }

    // Verifica se o token já existe no banco
    const TokenExists = await knex('token')
                             .where({ token })
                             .first();

    if (TokenExists) {
      return res.status(200).json({ message: 'Token já cadastrado' });
    }

    // Insere o token no banco
    await knex('token').insert({ token, name });

    return res.status(201).json({ message: 'Token salvo com sucesso' });
  } catch (error) {
    console.error('Erro ao salvar o token:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
});//receber token de dispositivo para notificações

app.get('/backup', async (req, res) => {
  console.log('Fazendo backup do banco de dados...');

  try {
    exec('node backupGoogleDrive.js', async (error, stdout, stderr) => {
      if (error) {
        console.error('Erro ao executar backup:', error.message);
        await transporter.sendMail({
          from: `"Cookly" <${process.env.EMAIL_USER}>`,
          to: 'galaxyplay41@gmail.com',
          subject: 'Erro ao fazer backup',
          text: `Erro ao fazer backup do banco de dados:\n${error.message}`,
        });
        return;
      }

      const isCriticalError = stderr && !stderr.includes('DeprecationWarning');

      if (isCriticalError) {
        console.error('Erro no backup:', stderr);
        await transporter.sendMail({
          from: `"Cookly" <${process.env.EMAIL_USER}>`,
          to: 'galaxyplay41@gmail.com',
          subject: 'Erro ao fazer backup',
          text: `Erro ao fazer backup do banco de dados:\n${stderr}`,
        });
        return;
      }

      console.log(stdout);
      const date = new Date();
      date.setDate(date.getDate() - 1);

      // Formata para o padrão brasileiro (DD/MM/YYYY HH:mm)
      const formattedDate = date.toLocaleString('pt-BR', {
       timeZone: 'America/Sao_Paulo',
       day: '2-digit',
       month: '2-digit',
       year: 'numeric',
       hour: '2-digit',
       minute: '2-digit'
     });

     await transporter.sendMail({
       from: `"Cookly" <${process.env.EMAIL_USER}>`,
       to: 'galaxyplay41@gmail.com',
       subject: 'Backup Realizado',
       html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>Backup do Banco de Dados Executado com Sucesso!</h2>
      <p><strong>Data do Backup:</strong> ${formattedDate}</p>
      <p>Links para acesso ao backup:<br/>
      <a href="https://drive.google.com/drive/foldersprocess.env.BACKUP_FOLDER_IDhl=pt-br">
        Clique aqui para acessar o backup
      </a></p>
      <br/>
    </div>
  `,
     });

      return res.status(200).json({ message: 'Backup realizado com sucesso' });
    });
  } catch (error) {
    console.error('Erro inesperado:', error);
    return res.status(500).json({ error: 'Erro ao realizar backup' });
  }
});//backup de banco de dados