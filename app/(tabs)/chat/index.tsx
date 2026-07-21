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
        image?: string[];
    } | null;
}

export default function ChatsListScreen() {
    const router = useRouter();
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Charger la liste des conversations
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
    // Fonction de suppression de conversation avec cascade
    const handleDeleteConversation = (conversationId: string, otherUserName: string) => {
        Alert.alert(
            "Supprimer la conversation",
            `Voulez-vous vraiment supprimer la discussion avec ${otherUserName} ? Tous les messages seront également supprimés.`,
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Supprimer",
                    style: "destructive",
                    onPress: async () => {
                        // 1. Sauvegarde de la liste actuelle et retrait optimiste dans l'UI
                        const previousConversations = [...conversations];
                        setConversations(prev => prev.filter(c => c.id !== conversationId));

                        try {
                            // 2. Suppression dans Supabase (les messages associés sautent automatiquement via ON DELETE CASCADE)
                            const { error } = await supabase
                                .from('conversations')
                                .delete()
                                .eq('id', conversationId);

                            if (error) {
                                throw error;
                            }
                        } catch (err: any) {
                            console.error('Erreur lors de la suppression de la conversation:', err.message || err);

                            // 3. Alerte d'erreur et restauration de l'état précédent dans l'UI
                            Alert.alert(
                                'Erreur de suppression',
                                err.message || 'Impossible de supprimer cette conversation. Vérifiez votre connexion.'
                            );
                            setConversations(previousConversations);
                        }
                    }
                }
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

    const formatTime = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        if (isToday) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
    };

    const renderConversationItem = ({ item }: { item: ConversationItem }) => {
        const otherName = item.other_user?.full_name || 'Utilisateur';
        const listingTitle = item.listing?.title || 'Annonce';
        const listingImage = item.listing?.image;
        const hasUnread = (item.unread_count || 0) > 0;

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => router.push(`/chat/${item.id}`)}
                onLongPress={() => handleDeleteConversation(item.id, otherName)} // 
            >
                <View style={styles.avatarContainer}>
                    <View style={styles.avatarWrapper}>
                        {listingImage && (
                            <Image source={{ uri: listingImage }} style={styles.listingBadgeImage} />
                        )}

                    </View>
                </View>

                <View style={styles.contentContainer}>
                    <View style={styles.topRow}>
                        <Text style={styles.userName} numberOfLines={1}>
                            {otherName}
                        </Text>
                        <Text style={[styles.timeText, hasUnread && styles.unreadTimeText]}>
                            {formatTime(item.last_message_at)}
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
                <ActivityIndicator size="large" color="#09090B" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Messages</Text>
            </View>

            <FlatList
                data={conversations}
                keyExtractor={(item) => item.id}
                renderItem={renderConversationItem}
                contentContainerStyle={conversations.length === 0 ? styles.emptyListContainer : styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="chatbubbles-outline" size={56} color="#A1A1AA" />
                        <Text style={styles.emptyTitle}>Aucune conversation</Text>
                        <Text style={styles.emptySubtitle}>
                            Vos échanges avec les acheteurs et vendeurs apparaîtront ici.
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
    header: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F4F5',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#09090B',
        letterSpacing: -0.5,
    },
    listContent: {
        paddingVertical: 8,
    },
    emptyListContainer: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    card: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    avatarContainer: {

        marginRight: 14,
    },
    avatarWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    listingBadgeImage: {

        bottom: 0,
        right: 0,
        width: 48,
        height: 48,
        borderRadius: 50,
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
        fontSize: 15,
        fontWeight: '700',
        color: '#09090B',
        flex: 1,
    },
    timeText: {
        fontSize: 11,
        color: '#71717A',
        marginLeft: 8,
    },
    unreadTimeText: {
        color: '#DC2626',
        fontWeight: '600',
    },
    listingTag: {
        fontSize: 11,
        color: '#71717A',
        fontWeight: '500',
        marginTop: 2,
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    lastMessageText: {
        fontSize: 13,
        color: '#71717A',
        flex: 1,
        marginRight: 8,
    },
    unreadMessageText: {
        color: '#09090B',
        fontWeight: '700',
    },
    badge: {
        backgroundColor: '#DC2626',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800',
    },
    separator: {
        height: 1,
        backgroundColor: '#F4F4F5',
        marginLeft: 82,
    },
    emptyState: {
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#09090B',
        marginTop: 12,
    },
    emptySubtitle: {
        fontSize: 13,
        color: '#71717A',
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 18,
    },
});