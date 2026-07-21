import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

export function useStartConversation() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const startConversation = async (listingId: number, sellerId: string) => {
    try {
      setLoading(true);

      // 1. Récupérer l'utilisateur connecté
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      if (!currentUserId) {
        Alert.alert('Connexion requise', 'Vous devez être connecté pour contacter le vendeur.');
        return;
      }

      // Empêcher de contacter sa propre annonce
      if (currentUserId === sellerId) {
        Alert.alert('Action impossible', 'Vous ne pouvez pas envoyer de message sur votre propre annonce.');
        return;
      }

      // 2. Chercher si une conversation existe déjà
      const { data: existingChat, error: findError } = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listingId)
        .eq('buyer_id', currentUserId)
        .eq('seller_id', sellerId)
        .maybeSingle();

      if (findError) throw findError;

      if (existingChat) {
        // Redirection directe vers la conversation existante
        router.push(`/chat/${existingChat.id}`);
        return;
      }

      // 3. Sinon, créer la nouvelle conversation
      const { data: newChat, error: createError } = await supabase
        .from('conversations')
        .insert({
          listing_id: listingId,
          buyer_id: currentUserId,
          seller_id: sellerId,
        })
        .select('id')
        .single();

      if (createError) throw createError;

      // Redirection vers le nouvel écran de chat
      router.push(`/chat/${newChat.id}`);

    } catch (error: any) {
      console.error('Erreur démarrage conversation:', error.message);
      Alert.alert('Erreur', 'Impossible d\'ouvrir la discussion pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  return { startConversation, loading };
}