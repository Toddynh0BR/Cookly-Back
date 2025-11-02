const { uploadFileToDrive, deleteFileFromDrive } = require("../../googleDriveService");
const AppError = require("../utils/AppError");
const knex = require("../database");

class RecipesController {
  async create(request, response) {
    const { 
           img,
           name,
           description, 
           ingredients, 
           difficult, 
           category, 
           utensils, 
           time, 
           steps,
           user_id,
           image_provider,
           IA_made
          } = request.body;

    if (!name 
     || !description 
     || !ingredients 
     || !difficult 
     || !category 
     || !utensils 
     || !time 
     || !steps 
     || !user_id 
     || !image_provider 
     || !IA_made) throw new AppError('Informações faltando', 402);

    try {
     const user = await knex('users').where({ id: user_id }).first();
     if (!user) throw new AppError('Usuário não encontrado', 404);

     let imageUrl

     if (image_provider == 'user') {
      const filePath = request.file.path;
      const fileName = request.file.filename;

      if (!filePath || !fileName) throw new AppError("Arquivo de imagem não fornecido.");
      imageUrl = await uploadFileToDrive(filePath, fileName, "1MAMwPz71nLcQdHkRRIQeXyP3vyLvrT7Y");
    
     } else {
      if (!img) throw new AppError('URL de imagem não fornecida');
     
      imageUrl = img;
     };

     await knex('recipes')
          .insert({
            img: imageUrl,
            name,
            description, 
            ingredients, 
            difficult, 
            category, 
            utensils, 
            time, 
            steps,
            user_id,
            IA_made
           })
     return response.status(200).json({ message: 'receita adicionada'});
    } catch(error) {
      console.error(error)
      throw new AppError('Erro ao adicionar receita', 500);
    };
  };

  async update(request, response) {
     const { 
           id,
           img,
           name,
           description, 
           ingredients, 
           difficult, 
           category, 
           utensils, 
           time, 
           steps,
           image_provider,
          } = request.body;

     try {
            const RecipeExist = await knex('recipes').where({ id }).first();

    if (!RecipeExist) throw new AppError('Receita não encontrada', 404);

    let imageUrl

    if (image_provider == 'none') imageUrl = RecipeExist.img;

    if (image_provider == 'user') {
      const filePath = request.file.path;
      const fileName = request.file.filename;

      if (RecipeExist.img.includes('https://drive.google.com')) {
        await deleteFileFromDrive(RecipeExist.img);
      };

      if (!filePath || !fileName) throw new AppError("Arquivo de imagem não fornecido.");
      imageUrl = await uploadFileToDrive(filePath, fileName, "1MAMwPz71nLcQdHkRRIQeXyP3vyLvrT7Y");
    
    } 

    if (image_provider == 'external') {
       if (RecipeExist.img.includes('https://drive.google.com')) {
       await deleteFileFromDrive(RecipeExist.img);
      };
      if (!img) throw new AppError('URL de imagem não fornecida');
     
      imageUrl = img;
    }

    await knex('recipes').where({ id }).update({ 
           img: imageUrl,
           name: name || RecipeExist.name,
           description: description || RecipeExist.description, 
           ingredients: ingredients || RecipeExist.ingredients, 
           difficult: difficult || RecipeExist.difficult, 
           category: category || RecipeExist.category, 
           utensils: utensils || RecipeExist.utensils, 
           time: time || RecipeExist.time, 
           steps: steps || RecipeExist.steps
          })

     return response.status(200).json({ message: 'prato atualizado'});
     } catch(error) {
        console.error(error)
        throw new AppError(`Erro ao atualizar prato: ${error.message}`, 500);
     };
  };

  async index(request, response) {
    const { index, category, all } = request.body;

    const allRecipes = await knex("recipes").orderBy("created_at", "desc");

    if (!allRecipes.length) throw new AppError("Nenhuma receita disponivel ainda", 404);

    if (all == 'true') return response.status(200).json({allRecipes});

    if (index && !category) {
      const results = await knex("recipes")
                           .where("name", "like", `%${index}%`);
      
      if (!results.length) return response.status(404).json({message: `Nenhum resultado para ${index}`});

      return response.json(results)
    };//caso aja index ele ira realizar uma busca, caso não ira apenas trazer todos os itens

    if (category) {
     if (index && category) {
        const results = await knex("recipes")
                             .where("name", "like", `%${index}%`)
                             .andWhere({ category });
        
        if (!results.length) return response.status(404).json({message: `Nenhum resultado para ${index}`});

        return response.json(results)
     }

     const results = await knex('recipes').where({ category });

     if (!results.length) return response.status(404).json({message: `Nenhum resultado para ${index}`});

     return response.status(200).json({ results });
    };

    const newRecipes = await knex('recipes')
                            .orderBy("created_at", "desc")
                            .limit(5);
    const FavoritedRecipes = await knex("favorites")
                                      .select("recipes.*") // pega todos os campos da tabela recipes
                                      .count("favorites.recipe_id as favorites_count") // conta quantos favoritos cada receita tem
                                      .join("recipes", "recipes.id", "=", "favorites.recipe_id") // junta as duas tabelas
                                      .groupBy("recipes.id") // agrupa por receita
                                      .orderBy("favorites_count", "desc") // ordena pela contagem de favoritos
                                      .limit(5);
    //sobremesa, lanche, refeição, cafe, bolos, bebidas, frutas, pães
    const Sobremesa = await knex('recipes').where({ category: 'sobremesa' }).limit(5);
    const Lanche = await knex('recipes').where({ category: 'lanche' }).limit(5);
    const Refeicao = await knex('recipes').where({ category: 'refeicao' }).limit(5);
    const Cafe = await knex('recipes').where({ category: 'cafe' }).limit(5);
    const Bolo = await knex('recipes').where({ category: 'bolo' }).limit(5);
    const Bebida = await knex('recipes').where({ category: 'bebida' }).limit(5);
    const Fruta = await knex('recipes').where({ category: 'fruta' }).limit(5);
    const Pao = await knex('recipes').where({ category: 'pao' }).limit(5);
    const Outro = await knex('recipes').where({ category: 'outro' }).limit(5);

    return response.status(200).json({
     NewRecipes: newRecipes,
     FavoriteRecipes: FavoritedRecipes,
     Sobremesa, Lanche, Refeicao, Cafe, Bolo, Bebida, Fruta, Pao, Outro     
    })

  };

  async show(request, response) {
    const { id } = request.params;

    const Recipe = await knex("recipes")
                      .where({ id })
                      .first();

    if (!Recipe) throw new AppError("Receita não encontrada");
    
    const User = await knex('users').where({ id: Recipe.user_id }).first();
    
    return response.json({Recipe, User})
  };

  async delete(request, response) {
    const { id } = request.params;

    try {
     const RecipeExist = await knex('recipes').where({ id }).first();

     if (!RecipeExist)  throw new AppError("Receita não encontrada", 404);

     if (RecipeExist.img.includes('https://drive.google.com')) {
        await deleteFileFromDrive(RecipeExist.img);
     };

     await knex("recipes")
         .where({ id })
         .delete();
 
     return response.status(200).json({ message: 'Receita apagada com sucesso' });
    }catch(error) {
     console.error(error)
     throw new AppError('Erro ao apagar receita', 500);
    }
  };
}

module.exports = RecipesController;
