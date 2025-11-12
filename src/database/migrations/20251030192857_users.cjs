

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

  };


  
  exports.down = function(knex) {
    return knex.schema.dropTable('users');
  };