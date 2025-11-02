exports.up = function(knex) {
    return knex.schema.createTable('recipes', function(table) {
      table.increments('id');
      table.string('img').notNullable(); 
      table.string('name').notNullable();
      table.text('ingredients').notNullable();
      table.text('description').notNullable();
      table.string('difficult').notNullable();
      table.string('category').notNullable();
      table.string('utensils').notNullable();
      table.string('time').notNullable();
      table.text('steps').notNullable();
      table.text('IA_made').notNullable().defaultTo('false');

      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.integer('user_id').unsigned().notNullable();
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTable('recipes');
  };