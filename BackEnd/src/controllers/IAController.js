const AppError = require("../utils/AppError");//gerenciador de erros
const knex = require("../database");//banco de dados
const dotenv = require("dotenv");//variaveis de ambiente
const axios = require('axios');//conexão http

async function getFoodImage(foodName) {
  try {
   const response = await axios.get("http://searxng:8080/search", {
      params: {
         q: foodName,
         categories: "images",
         format: "json"
      }
   });

   const results = response.data.results;

   if (!results || results.length === 0) {
    console.warn(`Nenhuma imagem encontrada para ${foodName}`);
    return null;
   }

   return (
    results[0].img_src ||
    results[0].thumbnail ||
    results[0].url ||
    null
   );

  } catch (error) {
    console.error(error.message);
    return null;
  }

}//api para buscar imagem do google e retornar a primeira

class IAController {
 async CreateNewRecipe(req, res) {
    const IARecipes = await knex('recipes')
                           .where({ IA_made: 'true'})
                           .select('name')

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

${IARecipes.length > 0 ? `a receita não pode ser nenhuma das citadas a seguir: ${IARecipes.map(r => r.name).join(', ')}` : ''}`

 try {
    const response = await axios.post(
  "https://router.huggingface.co/v1/chat/completions",
  {
    model: "meta-llama/Llama-3.1-8B-Instruct",
    messages: [
      { role: "user", content: Prompt }
    ]
  },
  {
    headers: {
      Authorization: `Bearer ${process.env.HUGGING_READ_TOKEN}`,
      "Content-Type": "application/json",
    },
  }
    );

    const GeneratedRecipe = response.data.choices[0]?.message?.content;
    const GeneratedRecipeObj = JSON.parse(GeneratedRecipe);

    const imageURL = await getFoodImage(GeneratedRecipeObj.name)
    //const IAid = await knex('users').where({ email: 'cookly007IA@gmail.com' }).first();

    await knex('recipes').insert({
      img: imageURL,
      name: GeneratedRecipeObj.name,
      description: GeneratedRecipeObj.description, 
      ingredients: GeneratedRecipeObj.ingredients, 
      difficult: GeneratedRecipeObj.difficult, 
      category: GeneratedRecipeObj.category, 
      utensils: GeneratedRecipeObj.utensils, 
      time: GeneratedRecipeObj.time, 
      steps: GeneratedRecipeObj.steps,
      user_id: 0,
      IA_made: 'true'
    })

    return res.status(200).json({ message: 'receita gerada' });

 } catch(error) {
    console.error(error.response.data || error)
    throw new AppError('Erro ao gerar receita', 500);
 }

 };//função para criar receita automaticamente

 async UserCreateIa(request, response) {
   const { user_id, prompt} = request.body;

   const Prompt = `
 Você é uma IA que gera receitas para meu app.
 Gere uma nova receita, respeitando esta estrutura de JSON válida
 (responda apenas com o JSON, sem explicações):

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

Esse é o pedido do usuário da receita: ${prompt};
   `

   try {
    const response = await axios.post(
    "https://api-inference.huggingface.co/models/tiiuae/falcon-7b-instruct",
    { inputs: Prompt },
    {
     headers: {
      Authorization: `Bearer ${process.env.HUGGING_READ_TOKEN}`,
      "Content-Type": "application/json",
     },
    }
    );

    const GeneratedRecipe = response.data[0]?.generated_text;
    const GeneratedRecipeObj = JSON.parse(GeneratedRecipe);

    const imageURL = await getFoodImage(GeneratedRecipeObj.name)

    const Recipe_id = await knex('recipes').insert({
      img: imageURL,
      name: GeneratedRecipeObj.name,
      description: GeneratedRecipeObj.description, 
      ingredients: GeneratedRecipeObj.ingredients, 
      difficult: GeneratedRecipeObj.difficult, 
      category: GeneratedRecipeObj.category, 
      utensils: GeneratedRecipeObj.utensils, 
      time: GeneratedRecipeObj.time, 
      steps: GeneratedRecipeObj.steps,
      user_id,
      IA_made: 'false'
    }).returning([id]);

    return response.status(200).json({ message: 'receita gerada', Recipe_id });
   } catch(error) {
    console.error(error)
    throw new AppError('Erro ao gerar receita', 500);
   }
 };//função para o usuário criar a receita com IA
};

module.exports = IAController;
