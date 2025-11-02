exports.up = function(knex) {
    return knex.schema.createTable('favorites', function(table) {
      table.increments('id');
      table.integer('user_id').unsigned().notNullable();
      table.integer('recipe_id').unsigned().notNullable();

      table.foreign('recipe_id').references('id').inTable('recipes').onDelete('CASCADE');
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTable('favorites');
  };