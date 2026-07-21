import { supabase } from '@/lib/supabase';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface ListingInfo {
  id: number;
  title: string;
  price: number;
  images?: string[];
}

interface ConversationDetail {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing?: ListingInfo | null;
  other_user?: {
    full_name: string | null;
  } | null;
}

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const initChat = async () => {
      if (!conversationId) return;

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;
      setCurrentUserId(userId);

      // 1. Charger la conversation et l'annonce liée
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select(`
          id, buyer_id, seller_id,
          listing:listings(id, title, price, image)
        `)
        .eq('id', conversationId)
        .single();

      if (!convError && convData) {
        const otherId = convData.buyer_id === userId ? convData.seller_id : convData.buyer_id;

        // Charger les informations de l'interlocuteur
        const { data: userData } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', otherId)
          .single();

        // Extraire proprement l'annonce (si renvoyée sous forme de tableau par la jointure Supabase)
        const rawListing = convData.listing;
        const listingObj: ListingInfo | null = Array.isArray(rawListing)
          ? rawListing[0] || null
          : rawListing || null;

        setConversation({
          id: convData.id,
          buyer_id: convData.buyer_id,
          seller_id: convData.seller_id,
          listing: listingObj,
          other_user: userData,
        });
      }

      // 2. Charger l'historique des messages
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false });

      if (!msgError && msgData) {
        setMessages(msgData);
      }

      setLoading(false);

      // 3. Marquer les messages non lus reçus comme lus
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .eq('is_read', false);

      // 4. S'abonner aux événements Realtime
      channel = supabase
        .channel(`chat_room_${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages((prev) => [newMsg, ...prev]);

            if (newMsg.sender_id !== userId) {
              supabase
                .from('messages')
                .update({ is_read: true })
                .eq('id', newMsg.id);
            }
          }
        )
        .subscribe();
    };

    initChat();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Envoi d'un nouveau message
  const handleSendMessage = async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText || !currentUserId || !conversationId || sending) return;

    setSending(true);
    setInputText('');

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: trimmedText,
    });

    if (error) {
      console.error('Erreur envoi message:', error.message);
      setInputText(trimmedText);
    }

    setSending(false);
  };

  // Rendu des bulles de messages
  const renderMessageItem = useCallback(
    ({ item }: { item: Message }) => {
      const isMyMessage = item.sender_id === currentUserId;

      return (
        <View style={[styles.messageBubbleContainer, isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer]}>
          <View style={[styles.messageBubble, isMyMessage ? styles.myBubble : styles.otherBubble]}>
            <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText]}>
              {item.content}
            </Text>
            <Text style={[styles.timeText, isMyMessage ? styles.myTimeText : styles.otherTimeText]}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      );
    },
    [currentUserId]
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </SafeAreaView>
    );
  }

  const otherUserName = conversation?.other_user?.full_name || 'Utilisateur';
  const listingTitle = conversation?.listing?.title || 'Annonce';
  const listingPrice = conversation?.listing?.price;
  const listingImage = conversation?.listing?.images?.[0];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#09090B" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {otherUserName}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {listingTitle} {listingPrice !== undefined ? `• ${listingPrice} DH` : ''}
          </Text>
        </View>

        {listingImage && (
          <Image source={{ uri: listingImage }} style={styles.listingThumbnail} />
        )}
      </View>

      {/* ZONE DE CHAT & SAISIE */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          inverted={true}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Écrivez un message..."
            placeholderTextColor="#A1A1AA"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            disabled={!inputText.trim() || sending}
            onPress={handleSendMessage}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F5',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#09090B',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#71717A',
    marginTop: 2,
  },
  listingThumbnail: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#F4F4F5',
    marginLeft: 8,
  },
  chatArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageBubbleContainer: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: '#09090B',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#09090B',
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimeText: {
    color: '#A1A1AA',
  },
  otherTimeText: {
    color: '#A1A1AA',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F4F4F5',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F4F4F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
    color: '#09090B',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#09090B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#A1A1AA',
  },
});