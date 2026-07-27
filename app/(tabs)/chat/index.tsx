import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ConversationItem {
  id: string;
  listing_id: number;
  buyer_id: string;
  seller_id: string;
  last_message: string;
  last_message_at: string;
  unread_count?: number;
  other_user?: {
    full_name: string | null;
  } | null;
  listing?: {
    title: string;
    image?: string[] | string;
  } | null;
}

export default function ChatsListScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // État pour la sélection multiple (Mode suppression type WhatsApp)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchConversations = useCallback(async (userId: string) => {
    try {
      const { data: convs, error } = await supabase
        .from('conversations')
        .select(`
          id, listing_id, buyer_id, seller_id, last_message, last_message_at,
          listing:listings(title, image)
        `)
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      if (!convs) return;

      const enrichedConversations = await Promise.all(
        convs.map(async (conv) => {
          const otherUserId = conv.buyer_id === userId ? conv.seller_id : conv.buyer_id;

          const { data: userData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', otherUserId)
            .single();

          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', userId)
            .eq('is_read', false);

          const rawListing = conv.listing;
          const listingObj = Array.isArray(rawListing) ? rawListing[0] : rawListing;

          return {
            ...conv,
            other_user: userData,
            listing: listingObj || null,
            unread_count: count || 0,
          } as ConversationItem;
        })
      );

      setConversations(enrichedConversations);
    } catch (err: any) {
      console.error('Erreur chargement discussions:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Gestion du clic sur un item
  const handleItemPress = (item: ConversationItem) => {
    if (selectedIds.length > 0) {
      // En mode sélection : ajouter ou retirer de la liste
      toggleSelectConversation(item.id);
    } else {
      // Navigation vers le chat
      router.push(`/chat/${item.id}`);
    }
  };

  // Basculer la sélection
  const toggleSelectConversation = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Suppression groupée ou individuelle
  const confirmDeleteSelected = () => {
    const count = selectedIds.length;
    if (count === 0) return;

    Alert.alert(
      count === 1 ? 'Supprimer la discussion ?' : `Supprimer les ${count} discussions ?`,
      'Les messages associés seront également effacés de manière irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const idsToDelete = [...selectedIds];
            const previousConversations = [...conversations];

            // Retrait optimiste dans l'UI
            setConversations((prev) => prev.filter((c) => !idsToDelete.includes(c.id)));
            setSelectedIds([]);

            try {
              const { error } = await supabase
                .from('conversations')
                .delete()
                .in('id', idsToDelete);

              if (error) throw error;
            } catch (err: any) {
              console.error('Erreur de suppression:', err.message);
              Alert.alert('Erreur', 'Impossible de supprimer la sélection.');
              setConversations(previousConversations);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    let convChannel: ReturnType<typeof supabase.channel> | null = null;
    let msgChannel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        setLoading(false);
        return;
      }
      setCurrentUserId(userId);

      await fetchConversations(userId);

      convChannel = supabase
        .channel(`user_conversations_${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'conversations' },
          () => fetchConversations(userId)
        )
        .subscribe();

      msgChannel = supabase
        .channel(`user_messages_${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          () => fetchConversations(userId)
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (convChannel) supabase.removeChannel(convChannel);
      if (msgChannel) supabase.removeChannel(msgChannel);
    };
  }, [fetchConversations]);

  const onRefresh = () => {
    setRefreshing(true);
    if (currentUserId) fetchConversations(currentUserId);
  };

  // Formatage de la date façon WhatsApp
  const formatWhatsAppTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();

    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (isYesterday) {
      return 'Hier';
    }
    if (diffInDays < 7) {
      // Nom du jour (ex: Lundi, Mardi)
      const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' });
      return dayName.charAt(0).toUpperCase() + dayName.slice(1);
    }
    // Date formaté courte (ex: 21/07/26)
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  };

  const renderConversationItem = ({ item }: { item: ConversationItem }) => {
    const otherName = item.other_user?.full_name || 'Utilisateur';
    const listingTitle = item.listing?.title || 'Annonce';
    
    // Extraction propre de l'image de l'annonce
    let listingImage: string | undefined = undefined;
    if (Array.isArray(item.listing?.image) && item.listing.image.length > 0) {
      listingImage = item.listing.image[0];
    } else if (typeof item.listing?.image === 'string') {
      listingImage = item.listing.image;
    }

    const hasUnread = (item.unread_count || 0) > 0;
    const isSelected = selectedIds.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.selectedCard]}
        activeOpacity={0.7}
        onPress={() => handleItemPress(item)}
        onLongPress={() => toggleSelectConversation(item.id)}
      >
        <View style={styles.avatarContainer}>
          {listingImage ? (
            <Image source={{ uri: listingImage }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{otherName.substring(0, 2).toUpperCase()}</Text>
            </View>
          )}
          {isSelected && (
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          )}
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.topRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {otherName}
            </Text>
            <Text style={[styles.timeText, hasUnread && styles.unreadTimeText]}>
              {formatWhatsAppTime(item.last_message_at)}
            </Text>
          </View>

          <Text style={styles.listingTag} numberOfLines={1}>
            {listingTitle}
          </Text>

          <View style={styles.bottomRow}>
            <Text
              style={[styles.lastMessageText, hasUnread && styles.unreadMessageText]}
              numberOfLines={1}
            >
              {item.last_message || 'Nouvelle conversation'}
            </Text>

            {hasUnread && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.unread_count! > 99 ? '99+' : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer} edges={['top']}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </SafeAreaView>
    );
  }

  const isSelectionMode = selectedIds.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* HEADER DYNAMIQUE TYPE WHATSAPP */}
      <View style={[styles.header, isSelectionMode && styles.selectionHeader]}>
        {isSelectionMode ? (
          <>
            <TouchableOpacity onPress={() => setSelectedIds([])} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.selectionCount}>{selectedIds.length}</Text>
            <TouchableOpacity onPress={confirmDeleteSelected} style={styles.headerBtn}>
              <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.headerTitle}>Discussion</Text>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.headerIconBtn}>
                <Ionicons name="search-outline" size={22} color="#000000" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* LISTE DES DISCUSSIONS */}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversationItem}
        contentContainerStyle={conversations.length === 0 ? styles.emptyListContainer : styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#25D366" />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Aucune discussion</Text>
            <Text style={styles.emptySubtitle}>
              Vos messages avec les vendeurs et acheteurs s'afficheront ici.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  // Header normal
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    padding: 4,
  },
  // Header mode sélection
  selectionHeader: {
    backgroundColor: '#f00000', // Vert style WhatsApp
  },
  headerBtn: {
    padding: 6,
  },
  selectionCount: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 16,
  },
  listContent: {
    paddingVertical: 4,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  // Carte Conversation
  card: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  selectedCard: {
    backgroundColor: '#E8F5E9', // Teinte verte claire de sélection
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E2E8F0',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#075E54',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  checkBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#25D366',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 8,
  },
  unreadTimeText: {
    color: '#25D366',
    fontWeight: '600',
  },
  listingTag: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },
  lastMessageText: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  unreadMessageText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#25D366',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 80,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
});