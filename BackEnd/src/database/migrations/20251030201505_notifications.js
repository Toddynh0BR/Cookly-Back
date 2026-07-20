exports.up = function(knex) {
    return knex.schema.createTable('notifications', function(table) {
      table.increments('id');
      table.string('permite').defaultTo('permite');
      table.string('token').notNullable();
      
      table.integer('user_id').unsigned().notNullable();
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTable('notifications');
  };