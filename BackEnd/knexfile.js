const path = require("path");

module.exports = {
 development: {
    client: 'pg',
    connection: {
      host: '127.0.0.1',
      port: 5432,
      user: process.env.DB_USER || 'cookly',
      password: process.env.DB_PASSWORD || '12345',
      database: 'cookly_db'
    },
    migrations: {
      directory: './src/database/migrations'
    },
    seeds: {
      directory: './src/database/seeds'
    }
 }
};
