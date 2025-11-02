exports.up = function(knex) {
    return knex.schema.createTable('codes', function(table) {
      table.increments('id')
      table.string('time');
      table.string('code')

      table.integer('user_id').unsigned().notNullable();
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTable('codes');
  };