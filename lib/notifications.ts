import { supabase } from '@/lib/supabase';
import * as Device from 'expo-device';

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import { Platform } from 'react-native';

// Configuration du comportement des notifications quand l'app est au premier plan
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function handleRegistrationError(errorMessage: string) {
  alert(errorMessage);
  throw new Error(errorMessage);
}

export async function registerForPushNotificationsAsync(userId: string) {
  if (!Device.isDevice) {
    console.log('Les notifications Push nécessitent un appareil physique.');
    return;
  }

  // 1. Demande de permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permission refusée pour les notifications Push.');
    return;
  }


  // Debug id project found or not
  const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  if (!projectId) {
    handleRegistrationError('ID du projet non trouvé');
  }

  try {

    // 2. Obtention du token Expo Push
    const tokenData = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    );
    const expoPushToken = tokenData.data;


    // 3. Sauvegarde / Mise à jour dans Supabase
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert(
        {
          user_id: userId,
          expo_push_token: expoPushToken,
          device_type: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'expo_push_token' }
      );

    if (error) {
      console.error('Erreur enregistrement token Supabase:', error.message);
    } else {
      console.log('Push Token enregistré avec succès:', expoPushToken);
    }
  } catch (err: any) {
    console.error('Erreur obtention Expo Push Token:', err);
  }

  // Configuration requise pour Android (Canal de notification)
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#25D366',
    });
  }
}