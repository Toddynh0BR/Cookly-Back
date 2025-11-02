const AppError = require("../utils/AppError");//gerenciador de erros
const knex = require("../database");//banco de dados

class OthersController {
  async toggleFavorite(request, response) {
   const { recipe_id, user_id } = request.body;

   try {
    if (!recipe_id || !user_id) throw new AppError('Informações faltando', 400);

    const FavoriteExist = await knex('favorites').where({ recipe_id, user_id }).first();
 
    if (FavoriteExist) {
     await knex('favorites').where({ recipe_id, user_id }).delete();

     return response.status(200).json({ message: 'removido'});
    } else {
     await knex('favorites').insert({ recipe_id, user_id });

     return response.status(200).json({ message: 'adicionado'});
    }
   } catch(error) {
    console.error(error)
    throw new AppError('Erro ao favoritar/remover receita', 500);
   };
  };

  async addNotification(request, response) {
    const { token, user_id } = request.body;
    
    try { 
     const TokenExist = await knex('notifications').where({ token }).first();

     if (TokenExist) throw new AppError('Token já registrado', 401);

     await knex('notifications').insert({ token, user_id });

     return response.status(200).json({ message: 'dispositivo adicionado' });

    } catch(error) {
      console.error(error)
      throw new AppError('Erro ao adicionar dispositivo', 500);
    }
  };

  async toggleNotification(request, response) {
   const { user_id, token, permite } = request.body;

   try {
    if (!user_id) throw new AppError('Informações faltando', 400);

    const NotificationExist = await knex('notifications').where({ user_id, token }).first();

    if (!NotificationExist) throw new AppError('Informações não encontradas', 404);

    await knex('notifications').where({ user_id, token }).update({ permite });
   } catch(error) {
    console.error(error)
    throw new AppError('Erro ao favoritar/remover receita', 500);
   };
  };
};

module.exports = OthersController;
