const fs = require("fs");
const path = require("path");
const mime = require("mime-types"); // Novo módulo para identificar o tipo de arquivo
const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.CREDENTIALS_PATH),
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});

const drive = google.drive({ version: "v3", auth });

async function uploadFileToDrive(filePath, fileName, folderId) {
  try {
    const mimeType = mime.lookup(filePath) || "application/octet-stream"; // Identifica o tipo de arquivo

    const fileMetadata = {
      name: fileName,
      parents: [folderId], // ID da pasta no Google Drive
    };

    const media = {
      mimeType,
      body: fs.createReadStream(filePath),
    };

    const file = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id",
    });

    // Criar URL pública para acessar a imagem
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    const imageUrl = `https://drive.google.com/uc?id=${file.data.id}`;
    return imageUrl;
  } catch (error) {
    console.error("Erro ao enviar imagem para o Google Drive:", error);
    throw error;
  }
};//faz upload de imagem para o google drive

async function deleteFileFromDrive(imageUrl) {
  try {
    console.log("Iniciando a exclusão do arquivo...");
    console.log("URL da imagem:", imageUrl);
    // Extrai o ID do arquivo da URL
    const fileIdMatch = imageUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (!fileIdMatch) {
      throw new Error("URL inválida. Não foi possível extrair o ID do arquivo.");
    }

    const fileId = fileIdMatch[1];

    // Chama a API para deletar o arquivo
    await drive.files.delete({ fileId });

    console.log(`Arquivo ${fileId} deletado com sucesso.`);
    return true;
  } catch (error) {
    console.error("Erro ao deletar imagem do Google Drive:", error);
    throw error;
  }
};//deleta imagem do google drive

module.exports = { uploadFileToDrive, deleteFileFromDrive };

