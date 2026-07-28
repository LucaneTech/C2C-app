import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type NotificationType = 'NEW_LISTING' | 'ORDER_STATUS' | 'SYSTEM' | 'CHAT';

interface NotificationPayload {
  userIds?: string[];
  broadcast?: boolean;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoPushMessage {
  to: string;
  sound: 'default';
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface PushTokenRecord {
  user_id: string;
  expo_push_token: string;
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const jsonResponse = (data: unknown, status = 200): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};

Deno.serve(async (req: Request) => {
  try {
    const rawPayload = await req.json();

    // Normalisation du payload (Gère le format direct OU le format venant d'un Database Webhook)
    let payload: NotificationPayload;

    if (rawPayload.record && rawPayload.table) {
      // Déclenchement automatique par Webhook de BDD
      const record = rawPayload.record;
      const table = rawPayload.table;

      if (table === 'listings') {
        payload = {
          broadcast: true,
          type: 'NEW_LISTING',
          title: 'Nouvelle offre disponible !',
          body: record.title ? `Découvrez : ${record.title}` : 'Une nouvelle annonce vient d\'être publiée.',
          data: { listing_id: record.id },
        };
      } else if (table === 'orders') {
        payload = {
          userIds: [record.user_id],
          type: 'ORDER_STATUS',
          title: '🛒 Mise à jour de votre commande',
          body: `Votre commande #${record.id.slice(0, 8)} est maintenant : ${record.status || 'mise à jour'}.`,
          data: { order_id: record.id, status: record.status },
        };
      } else {
        return jsonResponse({ message: `Table non prise en charge: ${table}` }, 200);
      }
    } else {
      // Appel direct avec payload personnalisé
      payload = rawPayload;
    }

    const { userIds, broadcast, type, title, body, data } = payload;

    if (!title || !body) {
      return jsonResponse({ error: 'Le titre et le corps du message sont requis.' }, 400);
    }

    // 1. Récupération des tokens des destinataires
    let query = supabaseAdmin
      .from('user_push_tokens')
      .select('user_id, expo_push_token');

    if (!broadcast && userIds && userIds.length > 0) {
      query = query.in('user_id', userIds);
    }

    const { data: tokensData, error: tokensError } = await query;

    if (tokensError) throw new Error(`Erreur Supabase Tokens: ${tokensError.message}`);

    const pushTokensList = (tokensData as PushTokenRecord[]) || [];

    if (pushTokensList.length === 0) {
      return jsonResponse({ message: 'Aucun token trouvé pour les destinataires.' }, 200);
    }

    // 2. Enregistrement systématique des notifications In-App dans la BDD
    const targetUserIds = Array.from(new Set(pushTokensList.map((r) => r.user_id)));

    const inAppNotifications = targetUserIds.map((userId) => ({
      user_id: userId,
      type: type || 'SYSTEM',
      title,
      body,
      data: data || {},
      is_read: false,
    }));

    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(inAppNotifications);

    if (insertError) {
      console.error('Erreur enregistrement notification In-App:', insertError.message);
    }

    // 3. Préparation et envoi des notifications Push à Expo
    const messages: ExpoPushMessage[] = pushTokensList.map((record) => ({
      to: record.expo_push_token,
      sound: 'default',
      title,
      body,
      data: { ...data, type },
    }));

    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const expoResult = await expoResponse.json();

    return jsonResponse({ success: true, count: messages.length, expoResult }, 200);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return jsonResponse({ error: errorMessage }, 500);
  }
});