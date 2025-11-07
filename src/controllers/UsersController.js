const { OAuth2Client } = require('google-auth-library');//autenticação oauth
const { hash, compare } = require("bcryptjs");//criptografar senha e verificar senha
const AppError = require("../utils/AppError");//gerenciador de erros
const knex = require("../database");//banco de dados
const axios = require("axios");//conexão com outras apis
const { sendMail } = require('../utils/sendMail');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function checkUsefulTime(useFulTime) {
  const UseFulTime = new Date(useFulTime);
  const actualTime = new Date();

  const MinutesDiference = (actualTime - UseFulTime) / 1000 / 60;

  return MinutesDiference >= 15;
};

class UsersController {
  async localLogin(request, response) {
    const { identifier, password, method } = request.body;

      const UserExist = method == 'name' ?
      await knex('users').where({ name: identifier }).first()
      :
      await knex('users').where({ email: identifier }).first()
      ;

      if (!UserExist) throw new AppError('Usuário não encontrado', 404);

      const passwordMatched = await compare(password, UserExist.password);

      if (!passwordMatched) throw new AppError('Senha incorreta', 401);

      return response.status(202).json({ User: UserExist });
 
  };

  async localCreate(request, response) {
    const { name, email, password, level, check } = request.body;

    if (check == 'checar') {
     const EmailExist = await knex('users').where({ email }).first();
     const NameExist = await knex('users').where({ name }).first();

     if (EmailExist) throw new AppError('Este email já esta em uso', 406);
     if (NameExist) throw new AppError('Este nome já esta em uso', 406);

     return response.status(200).json({ message: 'OK'});
    }else {
     const EmailExist = await knex('users').where({ email }).first();
     const NameExist = await knex('users').where({ name }).first();

     if (EmailExist) throw new AppError('Este email já esta em uso', 406);
     if (NameExist) throw new AppError('Este nome já esta em uso', 406);

     const hashedPassword = await hash(password, 8);

     await knex('users')
          .insert({
            name,
            email,
            password: hashedPassword,
            level
          });

     return response.json({ message: 'Usuário criado com sucesso!'});
    };

  };

  async login(request, response) {
    const { id_token, provider } = request.body;

    if (!id_token || !provider) throw new AppError('Informações faltando!');

    if (provider == 'google') {
     try {
      const ticket = await client.verifyIdToken({
        idToken: id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      const { email, name, picture, sub: google_id } = payload;

      const User = await knex('users').where({ email }).first();

      if (User) return response.json({ User: User });
      else return response.status(404).json({ message: 'Usuário não encontrado.' });;

     } catch(error) {
      console.error(error)
      throw new AppError(`Erro ao verificar usuário: ${error.message}`, 500);
     };

    } else {
      try {
       const fbResponse = await axios.get(
        `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${id_token}`
       );

       const { id: facebook_id, name, email, picture } = fbResponse.data;

       if (!email) throw new AppError('Usuário nao cadastrado ainda', 400);

       const User = await knex('users').where({ email }).first();

       if (User) return response.json({ User: User });
       else return response.status(404).json({ message: 'Usuário não encontrado.' });;
      } catch (error) {
       console.error(error)
       throw new AppError(`Erro ao verificar usuário: ${error.message}`, 500);
      };
    }
  };

  async create(request, response) {
     const { id_token, provider, password, level } = request.body;

    if (!id_token || !provider) throw new AppError('Informações faltando!');

    if (provider == 'google') {
     try {
      const ticket = await client.verifyIdToken({
        idToken: id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      const { email, name, picture, sub: google_id } = payload;

      const User = await knex('users').where({ email }).first();

      if (User) return response.json({ User: User, message: 'old' });
      else {
        if (!level) return response.json({ message: 'OK'});
        const hashedPassword = await hash(password, 8);

        const [NewUser] = await knex('users')
                               .insert({
                                name,
                                email,
                                password: hashedPassword,
                                provider,
                                provider_id: sub,
                                level,
                                img: picture || null,
                               })
                               .returning(['img', 'name', 'email', 'level']);

        return response.json({ User: NewUser, message: 'new' });
      };

     } catch(error) {
      console.error(error)
      throw new AppError(`Erro ao criar usuário: ${error.message}`, 500);
     };

    } else {
      try {
       const fbResponse = await axios.get(
        `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${id_token}`
       );

       const { id: facebook_id, name, email, picture } = fbResponse.data;

       if (!email) throw new AppError('Usuário nao cadastrado ainda', 400);

       const User = await knex('users').where({ email }).first();

      if (User) return response.json({ User: User, message: 'old' });
      else {
        if (!level) return response.json({ message: 'OK'});
        const hashedPassword = await hash(password, 8);

        const [NewUser] = await knex('users')
                               .insert({
                                name,
                                email,
                                password: hashedPassword,
                                provider,
                                provider_id: id,
                                level,
                                img: picture || null,
                               })
                               .returning(['img', 'name', 'email', 'level']);

        return response.json({ User: NewUser, message: 'new' });
      };

      } catch (error) {
       console.error(error)
       throw new AppError(`Erro ao verificar usuário: ${error.message}`, 500);
      };
    }
  };

  async update(request, response) {
    const { name, level, img } = request.body;
    const { id } = request.params;

    const User = await knex('users')
                       .where({ id })
                       .first();

    if (!User) throw new AppError('Usuário não encontrado')

    await knex('users')
         .where({ id })
         .first()
         .update(
          {
           name: name || User.name,
           level: level || User.level,
           img: img || User.img
          });

    return response.status(201).json();
  };

  async getinfo(request, response) {
   const { id } = request.params;

   const User = await knex('users').where({ id }).first();
   const Recipes = await knex('recipes').where({ user_id: id });
   const Favorites = await knex('favorites').where({ user_id: id }) 

   if (!User) return response.json([])

   return response.json({ User: User, Recipes: Recipes, Favorites: Favorites});
  };

  async forgotPassword(request, response) {
  const { email } = request.body;

  if (!email) throw new AppError('Email não fornecido', 400);

  console.log(`Enviando código único para: ${email}`);

  const user = await knex('users')
                    .where({ email })
                    .first();

  if (!user) throw new AppError("Usuário não encontrado", 400);
  
  try {
   const code = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
   const now = new Date();

   await knex("codes").insert({time: now, code, user_id: user.id});

   await sendMail({
      to: email,
      subject: `Seu código de uso único: ${code}`,
      html:`
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Seu código de uso único é:</h2>
          <p><strong>${code}</strong></p>
          <p>Ele expira em 15 minutos!</p>
        </div>
      `
   });

   return response.status(200).json('Código enviado com sucesso!');
   } catch(error) {
     console.error(error)
     throw new AppError(`Erro ao enviar código: ${error.message}`, 500)
   }

  };

  async resetPassword(request, response){
    const { code, newPassword, check, email } = request.body;

    if (check == 'checar') {
      const Code = await knex('codes')
                        .where({ code })
                        .first();
  
      if (!Code) throw new AppError('Código inválido', 404);
      if (checkUsefulTime(Code.time)) throw new AppError('Tempo limíte atingido', 408);

      return response.status(200).json('Código válido e útil!');

    } else {
      try {
       const Code = await knex('codes')
                        .where({ code })
                        .first();
  
       if (!Code) throw new AppError('Código inválido');
       if (checkUsefulTime(Code.time)) throw new AppError('Tempo limíte atingido', 408);
       await knex('codes').where({ code }).delete();
  
       const hashedPassword = await bcrypt.hash(newPassword, 8);

       await knex('users')
           .where({ email })
           .update({ password: hashedPassword });
  
      await transporter.sendMail({
       from: `Cookly`,
       to: email,
       subject: `Senha alterada com sucesso!`,
        html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
         <h2>Sua senha foi alterada com sucesso:</h2>
         <br/>
         <p>Caso não tenha sido vc, entre em contato conosco pelo email: <a href="cookly007@gmail.com">cookly007@gmail.com</a></p>
        </div>
       `,
      });
      
      return response.status(200).json({ message: "Senha redefinida com sucesso" });
  } catch (error) {
   console.error(error)
   throw new AppError(`Erro ao verificar/redefinir código/senha: ${error.message}`)
  }
    }

  };
};

module.exports = UsersController;
