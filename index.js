const sendMail = require('./src/utils/sendMail')//enviar emails
require("express-async-errors");//Gerenciador de erros
require('dotenv').config();//Gerenciador de Variaveis de ambiente

const sendPushNotification = require('./src/utils/SendNotification');//função para enviar notificação
const AppError = require("./src/utils/AppError");//tratamento de erros
const knex = require("./src/database");//conexão com o banco de dados
const axios = require('axios');//chamadas para back ends

const express = require('express');//ferramenta geral para back end
const cors = require("cors");//conexão com o front

const routes = require("./src/routes");//Rotas do back end
const app = express();//Inicia o Back end como aplicação com o express
app.use(cors());//Ativa o cors para conexões externas

app.use(express.json());//Passa todas as requisições para arquivo JSON
app.use(express.urlencoded({ extended: true }));//Permite requisições com arquivos complexos
app.use(routes);//Utiliza as Rotas no APP

async function CheckDatabase(req, res){
 console.log("Verificando banco de dados...")
  try {
   const dataBase = await knex('users');
  }catch (error) {
   if(error.message.includes('SQLITE_ERROR: no such table')){
    console.log("Banco de dados corrompido!")
    console.log("Iniciando o processo de substituição...");

    try {
     const folderId = "1YotlwR6sfgkJ0HofUpKv4j42UuQwT97c"; 
     const localPath = path.resolve(__dirname, "database", "database.db");

     const fileId = await getLatestBackupFileId(folderId);
     await downloadAndReplaceDatabase(fileId, localPath);

     console.log("Arquivo database.db restaurado com sucesso.");
    } catch (restoreError) {
     console.error("Erro ao restaurar o backup:", restoreError);
    }
   }
  }
};// checar database

CheckDatabase();//verifica integridade do banco de dados ao iniciar o servidor


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
   res.status(200).json({ status: 'online' });
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
        await sendMail(
         'galaxyplay41@gmail.com',
        'Erro ao fazer backup',
        '',
         `Erro ao fazer backup do banco de dados:\n${error.message}`,
        );
        return;
      }

      const isCriticalError = stderr && !stderr.includes('DeprecationWarning');

      if (isCriticalError) {
        console.error('Erro no backup:', stderr);
        await sendMail(
        'galaxyplay41@gmail.com',
        'Erro ao fazer backup',
        '',
        `Erro ao fazer backup do banco de dados:\n${stderr}`,
        );
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

      await sendMail(
       'galaxyplay41@gmail.com',
       'Backup Realizado',
       '',
       `
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
        );

      return res.status(200).json({ message: 'Backup realizado com sucesso' });
    });
  } catch (error) {
    console.error('Erro inesperado:', error);
    return res.status(500).json({ error: 'Erro ao realizar backup' });
  }
});//backup de banco de dados

app.post("/ping", (req, res) => {
  console.log("Keep-alive recebido:", new Date().toISOString());
  return res.status(200).json({ ok: true });
});

cron.schedule("*/10 * * * *", async () => {
  try {
    console.log("Enviando requisição POST para manter o servidor ativo...");

    await axios.post(process.env.BACK_END_URL, { keepAlive: true });

    console.log("Requisição de keep-alive enviada com sucesso!");
  } catch (error) {
    console.error("Erro ao enviar keep-alive:", error.message);
  }
});

//burocracia do facebook

app.get('/privacy', async (req, res) => {
  console.log('Mostrando políticas de privacidade')

  return res.status(200).json(
    {
   "name": "Cookly",
   "description": "Seu nome, email e foto de perfil são usados apenas para autenticação via Facebook Login.",
   "contact": "cookly007@gmail.com",
   "data_use": "Os dados não são compartilhados com terceiros e são usados apenas para autenticação e para complementar as informações básicas do usuário(nickname, foto do perfil, email).",
   "delete_request": "Envie um email para cookly007@gmail.com solicitando a exclusão de dados."
   }
  )
})//políticas de privacidade

app.get('/terms', async (req, res) => {
  console.log('Mostrando termos')

  return res.status(200).json(
{
  "name": "Cookly",
  "description": "Ao usar o Cookly, você concorda com o uso do login via Facebook apenas para autenticação, identificação segura e complemento das informações básicas do usuário.",
  "contact": "cookly007@gmail.com"
}
  )
})//termos

app.get('/delete', async (req, res) => {
  console.log('Mostrando termos')

  return res.status(200).json(
{
  "instructions": "Envie um email para cookly007@gmail.com com o ID do usuário do Facebook ou email para excluir seus dados.",
  "contact": "cookly007@gmail.com",
  "status": "available"
}
  )
})//delete user facebook