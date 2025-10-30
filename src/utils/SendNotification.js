const admin = require('firebase-admin');
const axios = require('axios');

 admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIAL)),
});

const sendPushNotification = async (fcmToken, messaging, title, route, params) => {
  const message = {
    notification: { 
      title: title,
      body: messaging,
    },
    data: {
      screen: route, // nome da tela para navegar
      params: JSON.stringify(params), // parâmetros que você quer passar
    },
    token: fcmToken,
  };

  try {
    await admin.messaging().send(message);
    console.log('Notificação enviada com sucesso');
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
  }
};//enviar notificação

module.exports = sendPushNotification;

