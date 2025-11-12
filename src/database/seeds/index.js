// seeds/001_initial_users.js
const { hash } = require('bcryptjs');

exports.seed = async function(knex) {
  const plain = process.env.PASSWORD || 'admin123';
  const hashedPassword = await hash(plain, 8);

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
  ]);
};
