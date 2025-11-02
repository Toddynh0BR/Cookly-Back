const AppError = require("../utils/AppError");//gerenciador de erros
const knex = require("../database");//banco de dados
const dotenv = require("dotenv");//variaveis de ambiente
const axios = require('axios');//conexão http

async function getFoodImage(foodName) {
  const key = process.env.GOOGLE_API_KEY;
  const cx = process.env.SEARCH_ENGINE_ID;

  const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(
    foodName
  )}&cx=${cx}&searchType=image&num=1&key=${key}`;

  try {
    const res = await axios.get(url);
    const data = res.data;

    if (data.items && data.items.length > 0) {
      return data.items[0].link; // URL da imagem
    } else {
      console.warn(`Nenhuma imagem encontrada para: ${foodName}`);
      return null;
    }
  } catch (err) {
    console.error("Erro ao buscar imagem:", err);
    return null;
  }
}

class IAController {
 async CreateNewRecipe(request, response) {
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
    const IAid = await knex('users').where({ email: 'cookly007IA@gmail.com' }).first();

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
      user_id: IAid.id,
      IA_made: 'true'
    })

    return response.status(200).json({ message: 'receita gerada' });

 } catch(error) {
    console.error(error)
    throw new AppError('Erro ao gerar receita', 500);
 }

 }
};

module.exports = IAController;
