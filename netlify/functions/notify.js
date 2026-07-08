exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Méthode non autorisée' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: 'Corps de requête invalide' };
  }

  const { pseudo, text } = payload;
  if (!pseudo || !text) {
    return { statusCode: 400, body: 'pseudo et text sont requis' };
  }

  // Liste des destinataires à notifier
  const RECIPIENTS = [
    { Email: 'jessie.harel@akaze.fr', Name: 'Jessie' },
    { Email: 'veilleakaze@gmail.com', Name: 'Manon' },
  ];

  const MJ_API_KEY = process.env.MAILJET_API_KEY;
  const MJ_API_SECRET = process.env.MAILJET_API_SECRET;
  const FROM_EMAIL = process.env.MAILJET_FROM_EMAIL || 'no-reply@akaze.fr';

  if (!MJ_API_KEY || !MJ_API_SECRET) {
    return { statusCode: 500, body: 'Clés Mailjet non configurées' };
  }

  // On ne notifie pas l'expéditeur du message lui-même
  const toList = RECIPIENTS.filter(r => r.Name.toLowerCase() !== pseudo.toLowerCase());
  if (toList.length === 0) {
    return { statusCode: 200, body: 'Aucun destinataire à notifier' };
  }

  const auth = Buffer.from(`${MJ_API_KEY}:${MJ_API_SECRET}`).toString('base64');

  try {
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: FROM_EMAIL, Name: 'Chat équipe Akaze' },
            To: toList,
            Subject: `Nouveau message de ${pseudo} sur le chat Akaze`,
            TextPart: `${pseudo} a écrit : ${text}`,
            HTMLPart: `<p><strong>${pseudo}</strong> a écrit :</p><p>${text}</p>`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { statusCode: 502, body: `Erreur Mailjet : ${errText}` };
    }

    return { statusCode: 200, body: 'Notification envoyée' };
  } catch (e) {
    return { statusCode: 500, body: `Erreur : ${e.message}` };
  }
};
