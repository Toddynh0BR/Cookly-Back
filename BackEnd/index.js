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

async function start() {
    try {
      console.log("Executando migrations...");
      await knex.migrate.latest();
      console.log("Migrations concluídas.");

      console.log("Executando seeds...");
      await knex.seed.run();

      console.log("Seeds concluídas.");
      
      const PORT = process.env.PORT;
      app.listen(PORT, () => 
        console.log(`serve is running on port ${PORT}`)
      );

      app.use(routes);
    } catch (error) {
      console.error("Erro ao iniciar servidor:", error);
      process.exit(1);
    }
};

start();

//executar backup de banco de dados
const cron = require('node-cron');
const { exec } = require('child_process');

async function CreateNewRecipe() {
    const IARecipes = await knex('recipes')
                           .where({ IA_made: 'true'})
                           .returning('name');

    const Prompt = `
Você é uma IA que gera receitas para meu app. Gere uma nova receita, respeitando esta estrutura de JSON válida (responda apenas com o JSON, sem explicações):

{
  "name": "string",
  "ingredients": "string, string, string",
  "description": "string",
  "difficult": "easy" | "medium" | "hard",
  "category": "sobremesa" | "lanche" | "refeicao" | "cafe" | "bolo" | "bebida" | "fruta" | "pao" | "outro",
  "utensils": "string, string, string",
  "time": "min-max em minutos",
  "steps": "1. passo | 2. passo | 3. passo"
}

Ingredientes devem incluir quantidade (ex: "3 ovos") e ser separados por vírgula. Utensílios também separados por vírgula. 
Tempo deve mostrar tempo minimo e maximo seguido da sigla min (ex: 140-160min). Passos  devem ser separados por |.

${IARecipes ? ` a receita nao pode ser nenhuma das citadas a seguir ${IARecipes.map(r => r.name).join(', ')} ` : null}
    `

 try {
    console.log('Enviando prompt para HuggingFace');
    const Response = await axios.post(
  "https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct",
  { inputs: Prompt },
  {
    headers: {
      Authorization: `Bearer ${process.env.HUGGING_READ_TOKEN}`,
      "Content-Type": "application/json",
    },
  }
    );

    console.log('Receita gerada, Buscando imagem');
    const GeneratedRecipe = Response.data[0]?.generated_text;
    const parsedGeratedRecipe = JSON.parse(GeneratedRecipe);

    const imageURL = await getFoodImage(parsedGeratedRecipe.name)
    console.log('Imagem buscada, URL:', imageURL);

    console.log('Buscando ID da IA');
    const IAid = await knex('users').where({ email: 'cookly007IA@gmail.com' }).first();

    console.log('Inserindo receita no database');
    const RecipeID = await knex('recipes').insert({
      img: imageURL,
      name: parsedGeratedRecipe.name,
      description: parsedGeratedRecipe.description, 
      ingredients: parsedGeratedRecipe.ingredients, 
      difficult: parsedGeratedRecipe.difficult, 
      category: parsedGeratedRecipe.category, 
      utensils: parsedGeratedRecipe.utensils, 
      time: parsedGeratedRecipe.time, 
      steps: parsedGeratedRecipe.steps,
      user_id: IAid.id,
      IA_made: 'true'
    }).returning(['id']);
    
    console.log('Receita inserida, inisiando processo de envio de notificações:');
    console.log('1-Buscando tokens ');
    console.log('20% ///////');
    const tokens = await knex('notifications').where({ permite: 'permite'});

    console.log('2-IDs adquiridos, verificando tokens');
    console.log('40% /////////////////');
    if (!tokens.length) {
      console.log('3-Nenhum token válido');
      console.log('100% ////////////////////////////');
      return json({ message: 'Receita gerada, nenhuma notificação enviada'})
    }

    console.log('Tokens validados, enviando notificações')
    console.log('60% /////////////////////////////');
    await Promise.all(
      tokens.map(async (token)=> {
       const message = `
Veja essa receita gerada por IA:
 ${parsedGeratedRecipe.name}.`;

       await sendPushNotification(token, message, 'Nova receita disponível!', 'recipe', RecipeID.id)   
      })
    );

    console.log('Notificações enviadas com sucesso!');
    console.log('100% ///////////////////////////////////////////')
    return json({ message: 'receita gerada' });

 } catch(error) {
    console.error(error)
    throw new AppError('Erro ao gerar receita, IA provavelmente gerou errado', 500);
 }

};

cron.schedule('30 9 */4 * *', 
  async () =>  {
    CreateNewRecipe()
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

app.get('/health', (req, res) => {
  console.log('Executando health check');
   res.status(200).json({ status: 'online' });
});//health check

app.post("/ping", (req, res) => {
  console.log("Keep-alive recebido:", new Date().toISOString());
  return res.status(200).json({ ok: true });
});//manter back end ativo

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