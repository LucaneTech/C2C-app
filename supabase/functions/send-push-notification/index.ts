import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';


// 1. Définition des types strictes
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

interface InAppNotificationRecord {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
}

// 2. Initialisation du client Supabase Admin dédié à l'Edge Function
// Note : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont automatiquement injectés par Supabase
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Helper pour retourner une réponse JSON standardisée
const jsonResponse = (data: unknown, status = 200): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
};

Deno.serve(async (req: Request) => {
  try {
    const payload: NotificationPayload = await req.json();
    const { userIds, broadcast, type, title, body, data } = payload;

    // Validation des données obligatoires
    if (!title || !body) {
      return jsonResponse({ error: 'Title and body are required.' }, 400);
    }

    // A. Récupération des tokens des destinataires
    let query = supabaseAdmin
      .from('user_push_tokens')
      .select('user_id, expo_push_token');

    if (!broadcast && userIds && userIds.length > 0) {
      query = query.in('user_id', userIds);
    }

    const { data: tokensData, error: tokensError } = await query;

    if (tokensError) {
      throw new Error(`Erreur Supabase Tokens: ${tokensError.message}`);
    }

    const pushTokensList = (tokensData as PushTokenRecord[]) || [];

    if (pushTokensList.length === 0) {
      return jsonResponse({ message: 'Aucun token trouvé pour les destinataires.' }, 200);
    }

    // B. Préparation des messages Expo Push
    const messages: ExpoPushMessage[] = pushTokensList.map((tokenRecord) => ({
      to: tokenRecord.expo_push_token,
      sound: 'default',
      title,
      body,
      data: { ...data, type },
    }));

    // C. Envoi des notifications via l'API Expo Push
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

    // D. Enregistrement des notifications In-App dans la table `notifications`
    // Déduplication des user_id si un utilisateur possède plusieurs appareils
    const targetUserIds: string[] = Array.from(
      new Set(pushTokensList.map((record) => record.user_id))
    );

    const inAppNotifications: InAppNotificationRecord[] = targetUserIds.map((userId) => ({
      user_id: userId,
      type,
      title,
      body,
      data: data || {},
      is_read: false,
    }));

    const { error: insertError } = await supabaseAdmin
      .from('notifications')
      .insert(inAppNotifications);

    if (insertError) {
      console.error('Erreur lors de l enregistrement in-app:', insertError.message);
    }

    return jsonResponse({ success: true, count: messages.length, expoResult }, 200);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: errorMessage }, 500);
  }
});