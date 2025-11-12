const { hash } = require("bcryptjs");

exports.up = async function(knex) {
    await knex.schema.createTable('users', function(table) {
      table.increments('id');
      table.string('img'); 
      table.string('provider'); 
      table.string('provider_id');
      table.string('name').notNullable();
      table.string('email').notNullable();
      table.string('password').notNullable();
      table.string('level');
    });
    const hashedPassword = hash(process.env.PASSWORD, 8);

      await knex('users').insert([
   {
    img: 'https://drive.google.com/uc?id=1KvoV-oftV0Y8SGdmJ3D30_Skvizwu6Q9',
    name: 'Cookly',
    provider: 'local',
    provider_id: '',
    email: 'cookly007@gmail.com',
    password: hashedPassword,
    level: 'Master Chef'
   },
   {
    img: 'https://drive.google.com/uc?id=19s7J2KjL7eH0DVaDnKr8n9GgIA9vd1Ul',
    name: 'IA Chef',
    provider: 'local',
    provider_id: '',
    email: 'cookly007IA@gmail.com',
    password: hashedPassword,
    level: 'Master Chef'
   }
  ])
  };


  
  exports.down = function(knex) {
    return knex.schema.dropTable('users');
  };