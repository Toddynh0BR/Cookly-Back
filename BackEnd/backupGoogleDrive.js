const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');


// Criando a autenticação com o Google Drive
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.CREDENTIALS_PATH),
  scopes: ['https://www.googleapis.com/auth/drive.file'],
});

// Criando o cliente do Google Drive
const drive = google.drive({ version: 'v3', auth });

// Caminho do banco de dados SQLite
const DB_PATH = path.join(__dirname, "src", "database", 'database.db');

// Pasta no Google Drive onde o backup será salvo
const FOLDER_ID = process.env.BACKUP_FOLDER_ID;

// Verificar se o banco de dados existe antes de enviar
if (!fs.existsSync(DB_PATH)) {
  console.error("Erro: O arquivo do banco de dados não foi encontrado.");
  process.exit(1);
}

// Função para fazer upload do backup
async function uploadBackup() {
  try {
    const date = new Date();
    date.setDate(date.getDate() - 1);

    // Pega apenas dia, mês e ano
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // meses começam do 0
    const year = date.getFullYear();

    // Monta o nome do backup
    const backupName = `backup_${day}-${month}-${year}.db`;

    const fileMetadata = {
      name: backupName,
      parents: [FOLDER_ID],
    };

    const media = {
      mimeType: 'application/x-sqlite3',
      body: fs.createReadStream(DB_PATH),
    };

    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });

    console.log('Backup enviado com sucesso! ID:', response.data.id);
  } catch (error) {
    console.error('Erro ao enviar backup:', error.response ? error.response.data : error.message);
  }
};//faz upload do backup para o google drive

// Executar o backup
uploadBackup();
