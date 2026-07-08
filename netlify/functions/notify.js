exports.handler = async function (event) {
  console.log('--- notify function called ---');
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Méthode non autorisée' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    console.log('Erreur parsing payload:', e.message);
    return { statusCode: 400, body: 'Corps de requête invalide' };
  }

  const { pseudo, text } = payload;
  console.log('Payload reçu:', JSON.stringify(payload));
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

  console.log('Clés présentes ?', { hasKey: !!MJ_API_KEY, hasSecret: !!MJ_API_SECRET, fromEmail: FROM_EMAIL });

  if (!MJ_API_KEY || !MJ_API_SECRET) {
    console.log('ERREUR : clés Mailjet manquantes dans les variables d\'environnement');
    return { statusCode: 500, body: 'Clés Mailjet non configurées' };
  }

  // On ne notifie pas l'expéditeur du message lui-même
  const toList = RECIPIENTS.filter(r => r.Name.toLowerCase() !== pseudo.toLowerCase());
  console.log('Destinataires ciblés:', JSON.stringify(toList));
  if (toList.length === 0) {
    console.log('Aucun destinataire (l\'expéditeur est seul dans la liste)');
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

    const responseBody = await response.text();
    console.log('Statut réponse Mailjet:', response.status);
    console.log('Corps réponse Mailjet:', responseBody);

    if (!response.ok) {
      return { statusCode: 502, body: `Erreur Mailjet : ${responseBody}` };
    }

    return { statusCode: 200, body: 'Notification envoyée' };
  } catch (e) {
    console.log('ERREUR lors de l\'appel Mailjet:', e.message);
    return { statusCode: 500, body: `Erreur : ${e.message}` };
  }
};
